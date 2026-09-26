const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    bio: { type: String, default: "", maxlength: 300 },
    skills: {
      type: [{ type: String, maxlength: 30 }],
      validate: {
        validator: (v) => v.length <= 10,
        message: "Maximum 10 skills allowed",
      },
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
