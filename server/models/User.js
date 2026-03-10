const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  username: { type: String, unique: true, sparse: true },
  password: String,
  isVerified: { type: Boolean, default: false },
  verificationCode: String,
  verificationCodeExpiresAt: Date,
  verificationAttempts: { type: Number, default: 0 },
  verificationLastSentAt: Date,
  verificationLockUntil: Date,
});

module.exports = mongoose.model("User", userSchema);