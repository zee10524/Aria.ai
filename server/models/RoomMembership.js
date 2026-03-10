const mongoose = require("mongoose");

const roomMembershipSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "member"],
      default: "member",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "left"],
      default: "active",
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
  },
  { timestamps: true }
);

roomMembershipSchema.index({ room: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("RoomMembership", roomMembershipSchema);
