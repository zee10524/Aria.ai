const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    description: { type: String, default: "", maxlength: 300, trim: true },
    tags: {
      type: [{ type: String, maxlength: 24, trim: true }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 8,
        message: "A room can have at most 8 tags",
      },
    },
    isPrivate: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
