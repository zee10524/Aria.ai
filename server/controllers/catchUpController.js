const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const RoomMembership = require("../models/RoomMembership");
const Message = require("../models/Message");

const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Exported for testing: accepts an injected genAI instance so tests can stub it.
async function catchUp(req, res, { genAI } = {}) {
  const { roomId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).json({ message: "Invalid room id" });
  }

  const membership = await RoomMembership.findOne({
    room: roomId,
    user: req.user._id,
    status: "active",
  });

  if (!membership) {
    return res.status(403).json({ message: "Access denied" });
  }

  // previousLastReadAt is the end of the user's last visit
  const since = membership.previousLastReadAt || null;

  const query = {
    room: roomId,
    sender: { $ne: req.user._id },
  };
  if (since) {
    query.createdAt = { $gt: since };
  }

  const missedMessages = await Message.find(query)
    .sort({ createdAt: 1 })
    .populate("sender", "username")
    .lean();

  const messageCount = missedMessages.length;

  if (messageCount === 0) {
    return res.json({
      summary: "Nothing new since your last visit.",
      messageCount: 0,
      since: since ? since.toISOString() : null,
    });
  }

  // Build Gemini instance from env if not injected
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured" });
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  const model = genAI.getGenerativeModel({ model: AI_MODEL });

  const transcript = missedMessages
    .map((m) => {
      const name = m.type === "ai" ? "AI" : (m.sender?.username || "Unknown");
      return `${name}: ${m.content}`;
    })
    .join("\n");

  const prompt = `You are summarising a developer chat room for a user who was away.
Provide a concise, readable summary (3-5 sentences) of what was discussed.
Focus on decisions, questions asked, and key topics.
Chat since last visit:\n${transcript}`;

  let summary;
  try {
    const result = await model.generateContent(prompt);
    summary = result.response.text();
  } catch (err) {
    console.error("Gemini catch-up failed:", err.message);
    return res.status(500).json({ message: "Failed to generate summary" });
  }

  return res.json({
    summary,
    messageCount,
    since: since ? since.toISOString() : null,
  });
}

exports.catchUp = async (req, res) => {
  try {
    return await catchUp(req, res);
  } catch (err) {
    console.error("catch-up error:", err.message);
    return res.status(500).json({ message: "Failed to process catch-up request" });
  }
};

// Exported for testing
exports._catchUp = catchUp;
