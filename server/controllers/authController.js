const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 15;

exports.sendCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const now = new Date();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) user = new User({ email: normalizedEmail });

    if (user.verificationLastSentAt) {
      const secondsSinceLastSend = Math.floor(
        (now - user.verificationLastSentAt) / 1000
      );
      if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
        const retryAfter = OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend;
        return res.status(429).json({
          message: `Please wait ${retryAfter} seconds before requesting a new code`,
        });
      }
    }

    await sendEmail(normalizedEmail, code);

    user.verificationCode = code;
    user.verificationCodeExpiresAt = new Date(
      now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000
    );
    user.verificationAttempts = 0;
    user.verificationLastSentAt = now;
    user.verificationLockUntil = null;
    await user.save();

    return res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("sendCode error:", error.message);
    return res.status(500).json({ message: "Failed to send verification code" });
  }
};

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();
  const now = new Date();

  const user = await User.findOne({ email: normalizedEmail });

  if (!user)
    return res.status(400).json({ message: "Invalid code" });

  if (user.verificationLockUntil && user.verificationLockUntil > now) {
    return res.status(429).json({ message: "Too many failed attempts. Try again later" });
  }

  if (!user.verificationCode || user.verificationCode !== normalizedCode) {
    const nextAttempts = (user.verificationAttempts || 0) + 1;
    user.verificationAttempts = nextAttempts;

    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      user.verificationLockUntil = new Date(
        now.getTime() + OTP_LOCK_MINUTES * 60 * 1000
      );
      user.verificationAttempts = 0;
    }

    await user.save();
    return res.status(400).json({ message: "Invalid code" });
  }

  if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < now) {
    return res.status(400).json({ message: "Code expired. Please request a new code" });
  }

  user.isVerified = true;
  user.verificationCode = null;
  user.verificationCodeExpiresAt = null;
  user.verificationAttempts = 0;
  user.verificationLockUntil = null;
  await user.save();

  res.json({ message: "Verified successfully" });
};

exports.completeSignup = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ message: "Email, username and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.isVerified)
    return res.status(400).json({ message: "Email not verified" });

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername)
    return res.status(400).json({ message: "Username taken" });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.username = normalizedUsername;
  user.verificationCode = null;
  user.verificationCodeExpiresAt = null;
  user.verificationAttempts = 0;
  user.verificationLockUntil = null;

  await user.save();

  res.json({ message: "Signup complete" });
};

exports.login = (req, res) => {
  if (!req.user) {
    return res.status(400).json({
      message: "No user exists, please sign up"
    });
  }

  const token = jwt.sign(
    { id: req.user._id, username: req.user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: req.user._id,
      email: req.user.email,
      username: req.user.username,
    },
  });
};