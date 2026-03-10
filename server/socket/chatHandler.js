const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Room = require("../models/Room");
const RoomMembership = require("../models/RoomMembership");
const Message = require("../models/Message");

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyCud4PpmMLv_73VlfCkGfiBDfcYj51mHu8"
);

const AI_MODEL = "gemma-3-1b-it";

// Authenticate socket connection via JWT in handshake
async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Authentication required"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("_id username email");
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}

// Get AI response from Gemini with retry logic
async function getAIResponse(userMessage, roomName, chatHistory) {
  const model = genAI.getGenerativeModel({ model: AI_MODEL });

  const historyContext =
    chatHistory.length > 0
      ? chatHistory
          .slice(-10)
          .map(
            (m) =>
              `${m.type === "ai" ? "AI" : m.senderName || "User"}: ${m.content}`
          )
          .join("\n")
      : "";

  const prompt = `You are a helpful AI assistant in a collaborative developer chat room called "${roomName}". 
Keep your responses concise, technical, and relevant to software development. 
Use markdown formatting for code blocks when appropriate.

${historyContext ? `Recent chat context:\n${historyContext}\n\n` : ""}User asked: ${userMessage}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.error(`Gemini attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) {
        // Extract retryDelay from error message (429 responses include it)
        const retryMatch = err.message?.match(/(\d+)\s*second/i);
        const delay = retryMatch
          ? parseInt(retryMatch[1]) * 1000
          : Math.pow(2, attempt) * 2000; // 2s, 4s fallback
        console.log(`Retrying Gemini in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return "Sorry, I'm unable to process that request right now. Please try again later.";
}

module.exports = function registerChatHandlers(io) {
  // Middleware for authentication
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user.username} (${socket.id})`);

    // Join a room channel
    socket.on("room:join", async ({ roomId }) => {
      try {
        const membership = await RoomMembership.findOne({
          room: roomId,
          user: socket.user._id,
          status: "active",
        });

        if (!membership) {
          socket.emit("error", { message: "Access denied to this room" });
          return;
        }

        const room = await Room.findOne({ _id: roomId, isActive: true });
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Leave any previously joined rooms
        const prevRooms = Array.from(socket.rooms).filter(
          (r) => r !== socket.id
        );
        prevRooms.forEach((r) => socket.leave(r));

        const channelName = `room:${roomId}`;
        socket.join(channelName);
        socket.currentRoom = roomId;
        socket.currentRoomName = room.name;

        // Fetch last 50 messages for history
        const messages = await Message.find({ room: roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("sender", "_id username")
          .populate("aiTriggeredBy", "_id username")
          .lean();

        socket.emit("room:history", {
          messages: messages.reverse(),
          roomName: room.name,
        });

        // Notify others in the room
        socket.to(channelName).emit("room:userJoined", {
          userId: socket.user._id,
          username: socket.user.username,
        });

        // Emit current online users in this room
        const socketsInRoom = await io.in(channelName).fetchSockets();
        const onlineUsers = socketsInRoom.map((s) => ({
          userId: s.user._id,
          username: s.user.username,
        }));
        io.in(channelName).emit("room:onlineUsers", { users: onlineUsers });

        console.log(
          `${socket.user.username} joined room channel ${channelName}`
        );
      } catch (err) {
        console.error("room:join error:", err.message);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Send a chat message
    socket.on("message:send", async ({ roomId, content }) => {
      try {
        if (!content || !content.trim()) return;

        const membership = await RoomMembership.findOne({
          room: roomId,
          user: socket.user._id,
          status: "active",
        });

        if (!membership) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        const trimmedContent = content.trim();

        // Save user message
        const message = await Message.create({
          room: roomId,
          sender: socket.user._id,
          content: trimmedContent,
          type: "user",
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "_id username")
          .lean();

        const channelName = `room:${roomId}`;
        io.in(channelName).emit("message:new", { message: populatedMessage });

        // Update room's lastActiveAt
        await Room.findByIdAndUpdate(roomId, { lastActiveAt: new Date() });

        // Check if message triggers AI (starts with @ai or @gemini)
        const aiTriggerRegex = /^@(ai|gemini)\s+/i;
        if (aiTriggerRegex.test(trimmedContent)) {
          const userQuery = trimmedContent.replace(aiTriggerRegex, "").trim();

          // Emit typing indicator for AI
          io.in(channelName).emit("ai:typing", { isTyping: true });

          // Fetch recent history for context
          const recentMessages = await Message.find({ room: roomId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("sender", "username")
            .lean();

          const history = recentMessages.reverse().map((m) => ({
            type: m.type,
            content: m.content,
            senderName: m.sender?.username || "User",
          }));

          const roomDoc = await Room.findById(roomId);
          const aiResponse = await getAIResponse(
            userQuery,
            roomDoc?.name || "Dev Room",
            history
          );

          const aiMessage = await Message.create({
            room: roomId,
            sender: null,
            content: aiResponse,
            type: "ai",
            aiTriggeredBy: socket.user._id,
          });

          const populatedAiMessage = await Message.findById(aiMessage._id)
            .populate("aiTriggeredBy", "_id username")
            .lean();

          io.in(channelName).emit("ai:typing", { isTyping: false });
          io.in(channelName).emit("message:new", {
            message: populatedAiMessage,
          });
        }
      } catch (err) {
        console.error("message:send error:", err.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing:start", ({ roomId }) => {
      socket.to(`room:${roomId}`).emit("typing:update", {
        userId: socket.user._id,
        username: socket.user.username,
        isTyping: true,
      });
    });

    socket.on("typing:stop", ({ roomId }) => {
      socket.to(`room:${roomId}`).emit("typing:update", {
        userId: socket.user._id,
        username: socket.user.username,
        isTyping: false,
      });
    });

    // Leave a room channel
    socket.on("room:leave", async ({ roomId }) => {
      const channelName = `room:${roomId}`;
      socket.leave(channelName);
      socket.currentRoom = null;

      socket.to(channelName).emit("room:userLeft", {
        userId: socket.user._id,
        username: socket.user.username,
      });

      const socketsInRoom = await io.in(channelName).fetchSockets();
      const onlineUsers = socketsInRoom.map((s) => ({
        userId: s.user._id,
        username: s.user.username,
      }));
      io.in(channelName).emit("room:onlineUsers", { users: onlineUsers });
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.user?.username} (${socket.id})`);

      if (socket.currentRoom) {
        const channelName = `room:${socket.currentRoom}`;
        socket.to(channelName).emit("room:userLeft", {
          userId: socket.user._id,
          username: socket.user.username,
        });

        const socketsInRoom = await io.in(channelName).fetchSockets();
        const onlineUsers = socketsInRoom.map((s) => ({
          userId: s.user._id,
          username: s.user.username,
        }));
        io.in(channelName).emit("room:onlineUsers", { users: onlineUsers });
      }
    });
  });
};
