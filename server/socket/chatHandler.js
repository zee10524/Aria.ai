const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Room = require("../models/Room");
const RoomMembership = require("../models/RoomMembership");
const Message = require("../models/Message");
const { makeSocketAuthMiddleware } = require("../utils/socketAuth");
const { toggleReaction, normalizeMessage } = require("../utils/messageHelpers");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Tracks in-flight @ai/@gemini requests per room channel so the typing
// indicator only clears once every concurrent request has finished.
const aiTypingCounters = new Map();

function incrementAiTyping(channelName) {
  aiTypingCounters.set(channelName, (aiTypingCounters.get(channelName) || 0) + 1);
}

function decrementAiTyping(channelName) {
  const count = Math.max((aiTypingCounters.get(channelName) || 0) - 1, 0);
  if (count === 0) {
    aiTypingCounters.delete(channelName);
  } else {
    aiTypingCounters.set(channelName, count);
  }
  return count;
}

// De-duplicates by userId so a user connected from multiple tabs/devices
// only appears once in the online users list.
function getOnlineUsers(sockets) {
  const usersByUserId = new Map();
  sockets.forEach((s) => {
    usersByUserId.set(s.user._id.toString(), {
      userId: s.user._id,
      username: s.user.username,
    });
  });
  return Array.from(usersByUserId.values());
}

const authenticateSocket = makeSocketAuthMiddleware(
  (id) => User.findById(id).select("_id username email")
);

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

        // Read-tracking: record previous lastReadAt then update to now
        const now = new Date();
        await RoomMembership.updateOne(
          { _id: membership._id },
          {
            $set: {
              previousLastReadAt: membership.lastReadAt,
              lastReadAt: now,
            },
          }
        );

        const room = await Room.findOne({ _id: roomId, isActive: true });
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Leave any previously joined rooms
        const prevRooms = Array.from(socket.rooms).filter(
          (r) => r !== socket.id
        );
        for (const prevRoom of prevRooms) {
          socket.leave(prevRoom);

          socket.to(prevRoom).emit("room:userLeft", {
            userId: socket.user._id,
            username: socket.user.username,
          });

          const prevRoomSockets = await io.in(prevRoom).fetchSockets();
          io.in(prevRoom).emit("room:onlineUsers", {
            users: getOnlineUsers(prevRoomSockets),
          });
        }

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
          .populate({
            path: "replyTo",
            select: "_id content type sender",
            populate: { path: "sender", select: "_id username" },
          })
          .lean();

        socket.emit("room:history", {
          messages: messages.reverse().map(normalizeMessage),
          roomName: room.name,
        });

        // Notify others in the room
        socket.to(channelName).emit("room:userJoined", {
          userId: socket.user._id,
          username: socket.user.username,
        });

        // Emit current online users in this room
        const socketsInRoom = await io.in(channelName).fetchSockets();
        io.in(channelName).emit("room:onlineUsers", {
          users: getOnlineUsers(socketsInRoom),
        });

        console.log(
          `${socket.user.username} joined room channel ${channelName}`
        );
      } catch (err) {
        console.error("room:join error:", err.message);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Send a chat message
    socket.on("message:send", async ({ roomId, content, replyTo }) => {
      try {
        if (!content || !content.trim()) return;

        const membership = await RoomMembership.findOne({
          room: roomId,
          user: socket.user._id,
          status: "active",
        });

        if (!membership) {
          socket.emit("error", { message: "Access denied to this room" });
          return;
        }

        const trimmedContent = content.trim();

        // Save user message
        const message = await Message.create({
          room: roomId,
          sender: socket.user._id,
          content: trimmedContent,
          type: "user",
          replyTo: replyTo || null,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "_id username")
          .populate({
            path: "replyTo",
            select: "_id content type sender",
            populate: { path: "sender", select: "_id username" },
          })
          .lean();

        const channelName = `room:${roomId}`;
        io.in(channelName).emit("message:new", {
          message: normalizeMessage(populatedMessage),
        });

        // Update room's lastActiveAt
        await Room.findByIdAndUpdate(roomId, { lastActiveAt: new Date() });

        // Check if message triggers AI (starts with @ai or @gemini)
        const aiTriggerRegex = /^@(ai|gemini)\s+/i;
        if (aiTriggerRegex.test(trimmedContent)) {
          const userQuery = trimmedContent.replace(aiTriggerRegex, "").trim();

          // Emit typing indicator for AI
          incrementAiTyping(channelName);
          io.in(channelName).emit("ai:typing", { isTyping: true });

          try {
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

            io.in(channelName).emit("message:new", {
              message: normalizeMessage(populatedAiMessage),
            });
          } finally {
            if (decrementAiTyping(channelName) === 0) {
              io.in(channelName).emit("ai:typing", { isTyping: false });
            }
          }
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

    // Toggle a reaction on a message
    socket.on("message:react", async ({ roomId, messageId, emoji }) => {
      try {
        if (!roomId || !messageId || !emoji) return;

        const membership = await RoomMembership.findOne({
          room: roomId,
          user: socket.user._id,
          status: "active",
        });

        if (!membership) {
          socket.emit("error", { message: "Access denied to this room" });
          return;
        }

        const msg = await Message.findById(messageId).lean();
        if (!msg || String(msg.room) !== String(roomId)) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        const newReactions = toggleReaction(
          msg.reactions || [],
          emoji,
          socket.user._id
        );

        await Message.findByIdAndUpdate(messageId, { reactions: newReactions });

        io.in(`room:${roomId}`).emit("message:reactions", {
          messageId,
          reactions: newReactions,
        });
      } catch (err) {
        console.error("message:react error:", err.message);
        socket.emit("error", { message: "Failed to update reaction" });
      }
    });

    // Leave a room channel
    socket.on("room:leave", async ({ roomId }) => {
      const channelName = `room:${roomId}`;
      socket.leave(channelName);
      socket.currentRoom = null;

      // Read-tracking: mark last read on leave
      RoomMembership.updateOne(
        { room: roomId, user: socket.user._id, status: "active" },
        { $set: { lastReadAt: new Date() } }
      ).catch(() => {});

      socket.to(channelName).emit("room:userLeft", {
        userId: socket.user._id,
        username: socket.user.username,
      });

      const socketsInRoom = await io.in(channelName).fetchSockets();
      io.in(channelName).emit("room:onlineUsers", {
        users: getOnlineUsers(socketsInRoom),
      });
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.user?.username} (${socket.id})`);

      if (socket.currentRoom) {
        // Read-tracking: mark last read on disconnect
        RoomMembership.updateOne(
          { room: socket.currentRoom, user: socket.user._id, status: "active" },
          { $set: { lastReadAt: new Date() } }
        ).catch(() => {});

        const channelName = `room:${socket.currentRoom}`;
        socket.to(channelName).emit("room:userLeft", {
          userId: socket.user._id,
          username: socket.user.username,
        });

        const socketsInRoom = await io.in(channelName).fetchSockets();
        io.in(channelName).emit("room:onlineUsers", {
          users: getOnlineUsers(socketsInRoom),
        });
      }
    });
  });
};
