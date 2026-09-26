const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  validateRegisterInput,
  normalizeEmail,
  buildJwtPayload,
} = require("../utils/validation");

exports.register = async (req, res) => {
  const { email, username, password } = req.body;
  const errors = validateRegisterInput({ email, username, password });

  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = username.trim();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (existing) {
    if (existing.email === normalizedEmail) {
      return res.status(409).json({
        message: "Email already registered",
        errors: { email: "Email already registered" },
      });
    }
    return res.status(409).json({
      message: "Username taken",
      errors: { username: "Username taken" },
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  await User.create({
    email: normalizedEmail,
    username: normalizedUsername,
    password: hashed,
  });

  return res.status(201).json({ message: "Account created" });
};

exports.login = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    buildJwtPayload(req.user),
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
