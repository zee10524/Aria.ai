const Room = require("../models/Room");
const RoomMembership = require("../models/RoomMembership");
const mongoose = require("mongoose");
const {
  generateRoomCode,
  validateRoomFields,
  markMembership,
} = require("../utils/roomHelpers");

const createUniqueRoomCode = async () => {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const code = generateRoomCode();
    const existing = await Room.findOne({ code }).lean();
    if (!existing) return code;
  }
  throw new Error("Unable to generate unique room code");
};

exports.createRoom = async (req, res) => {
  try {
    const { name, description, tags, isPrivate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const parsedTags = Array.isArray(tags) ? tags : [];
    const validationError = validateRoomFields({ description, tags: parsedTags });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const roomCode = await createUniqueRoomCode();

    const room = await Room.create({
      name: name.trim(),
      code: roomCode,
      owner: req.user._id,
      description: typeof description === "string" ? description.trim() : "",
      tags: parsedTags.map((t) => String(t).trim()).filter(Boolean),
      isPrivate: isPrivate !== false,
    });

    try {
      await RoomMembership.create({
        room: room._id,
        user: req.user._id,
        role: "owner",
        status: "active",
      });
    } catch (membershipError) {
      await Room.deleteOne({ _id: room._id });
      throw membershipError;
    }

    return res.status(201).json({
      message: "Room created",
      room,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Room already exists" });
    }
    return res.status(500).json({ message: "Failed to create room" });
  }
};

exports.listMyRooms = async (req, res) => {
  try {
    const memberships = await RoomMembership.find({
      user: req.user._id,
      status: "active",
    })
      .populate({
        path: "room",
        match: { isActive: true },
        populate: { path: "owner", select: "_id username email" },
      })
      .sort({ updatedAt: -1 });

    const rooms = memberships
      .filter((membership) => membership.room)
      .map((membership) => ({
        ...membership.room.toObject(),
        membershipRole: membership.role,
      }));

    return res.json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

exports.getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    // Ensure requester is a member
    const requesterMembership = await RoomMembership.findOne({
      room: roomId,
      user: req.user._id,
      status: "active",
    });
    if (!requesterMembership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const memberships = await RoomMembership.find({
      room: roomId,
      status: "active",
    })
      .populate("user", "_id username email")
      .sort({ joinedAt: 1 })
      .lean();

    const members = memberships
      .filter((m) => m.user)
      .map((m) => ({
        userId: m.user._id,
        username: m.user.username,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    return res.json({ members });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch members" });
  }
};

exports.getRoomById = async (req, res) => {
  try {
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

    const room = await Room.findOne({ _id: roomId, isActive: true }).populate(
      "owner",
      "_id username email"
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.json({
      room: {
        ...room.toObject(),
        membershipRole: membership.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch room" });
  }
};

exports.joinRoomByCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: "Room code is required" });
    }

    const normalizedCode = code.trim().toUpperCase();
    const room = await Room.findOne({ code: normalizedCode, isActive: true });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const membership = await RoomMembership.findOneAndUpdate(
      { room: room._id, user: req.user._id },
      {
        $set: {
          status: "active",
          leftAt: null,
          role: room.owner.toString() === req.user._id.toString() ? "owner" : "member",
        },
        $setOnInsert: {
          joinedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    room.lastActiveAt = new Date();
    await room.save();

    return res.json({
      message: "Joined room successfully",
      room,
      membership,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to join room" });
  }
};

exports.listPublicRooms = async (req, res) => {
  try {
    const [publicRooms, memberships] = await Promise.all([
      Room.find({ isPrivate: false, isActive: true })
        .populate("owner", "_id username")
        .sort({ lastActiveAt: -1 })
        .lean(),
      RoomMembership.find({ user: req.user._id, status: "active" })
        .select("room")
        .lean(),
    ]);

    const memberRoomIds = new Set(memberships.map((m) => String(m.room)));
    const rooms = markMembership(publicRooms, memberRoomIds);

    return res.json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch public rooms" });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ message: "Room not found" });
    }

    const membership = await RoomMembership.findOne({
      room: roomId,
      user: req.user._id,
      status: "active",
    });

    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    if (membership.role === "owner") {
      return res.status(400).json({ message: "Owner cannot leave room" });
    }

    membership.status = "left";
    membership.leftAt = new Date();
    await membership.save();

    return res.json({ message: "Left room successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to leave room" });
  }
};
