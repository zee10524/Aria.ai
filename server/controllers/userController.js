'use strict';

const User = require("../models/User");
const Room = require("../models/Room");
const RoomMembership = require("../models/RoomMembership");
const Message = require("../models/Message");

exports.getMe = async (req, res) => {
  const userId = req.user._id;

  const [memberships, messagesSent, aiPrompts, recentMessages] =
    await Promise.all([
      // All active memberships (owned + joined), with room info populated
      RoomMembership.find({ user: userId, status: "active" })
        .populate("room", "name description createdAt")
        .sort({ joinedAt: -1 }),
      Message.countDocuments({ sender: userId, type: "user" }),
      Message.countDocuments({ aiTriggeredBy: userId, type: "ai" }),
      // Recent messages (sent + AI-triggered) for activity feed
      Message.find({
        $or: [
          { sender: userId, type: "user" },
          { aiTriggeredBy: userId, type: "ai" },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("room", "name"),
    ]);

  // Derive owned / joined counts from membership roles (no extra DB query)
  const roomsOwned = memberships.filter((m) => m.role === "owner").length;
  const roomsJoined = memberships.filter((m) => m.role === "member").length;

  const rooms = memberships
    .filter((m) => m.room) // room may be null if deleted
    .map((m) => ({
      id: m.room._id,
      name: m.room.name,
      description: m.room.description || "",
      createdAt: m.room.createdAt,
      role: m.role,
    }));

  // Build activity items from memberships and recent messages, newest first
  const membershipActivity = memberships
    .filter((m) => m.room)
    .slice(0, 5)
    .map((m) => ({
      type: m.role === "owner" ? "room_created" : "room_joined",
      label:
        m.role === "owner"
          ? `Created room "${m.room.name}"`
          : `Joined room "${m.room.name}"`,
      timestamp: m.joinedAt || m.createdAt,
    }));

  const messageActivity = recentMessages.map((msg) => ({
    type: msg.type === "user" ? "message_sent" : "ai_prompt",
    label:
      msg.type === "user"
        ? `Sent a message in ${msg.room ? msg.room.name : "a room"}`
        : `Asked AI in ${msg.room ? msg.room.name : "a room"}`,
    timestamp: msg.createdAt,
  }));

  const activity = [...membershipActivity, ...messageActivity]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  const user = req.user;

  res.json({
    id: user._id,
    username: user.username,
    email: user.email,
    bio: user.bio || "",
    skills: user.skills || [],
    joinedAt: user.createdAt,
    stats: {
      roomsOwned,
      roomsJoined,
      messagesSent,
      aiPrompts,
    },
    rooms,
    activity,
  });
};

exports.patchMe = async (req, res) => {
  const { bio, skills } = req.body;
  const updates = {};

  if (bio !== undefined) {
    if (typeof bio !== "string" || bio.length > 300) {
      return res
        .status(400)
        .json({ message: "Bio must be a string up to 300 characters" });
    }
    updates.bio = bio;
  }

  if (skills !== undefined) {
    if (
      !Array.isArray(skills) ||
      skills.length > 10 ||
      skills.some((s) => typeof s !== "string" || s.length > 30)
    ) {
      return res.status(400).json({
        message:
          "Skills must be an array of up to 10 strings, each up to 30 characters",
      });
    }
    updates.skills = skills;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.json({
    bio: user.bio || "",
    skills: user.skills || [],
  });
};
