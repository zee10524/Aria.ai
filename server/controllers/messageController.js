const Message = require("../models/Message");
const RoomMembership = require("../models/RoomMembership");
const mongoose = require("mongoose");

// GET /api/rooms/:roomId/messages?before=<messageId>&limit=50
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before, limit = 50 } = req.query;

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

    const query = { room: roomId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      const beforeMsg = await Message.findById(before).lean();
      if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100))
      .populate("sender", "_id username")
      .populate("aiTriggeredBy", "_id username")
      .lean();

    return res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error("getMessages error:", err.message);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};
