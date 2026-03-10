const Room = require("../models/Room");
const RoomMembership = require("../models/RoomMembership");
const mongoose = require("mongoose");

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRoomCode = () => {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[index];
  }
  return code;
};

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
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const roomCode = await createUniqueRoomCode();

    const room = await Room.create({
      name: name.trim(),
      code: roomCode,
      owner: req.user._id,
    });

    await RoomMembership.create({
      room: room._id,
      user: req.user._id,
      role: "owner",
      status: "active",
    });

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

    const members = memberships.map((m) => ({
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
