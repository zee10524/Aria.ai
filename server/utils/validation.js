"use strict";

// Shared validation helpers. No DB, no network, no env vars.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function validateRegisterInput({ email, username, password }) {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = "Email must be a valid address";
  }

  if (!username || !username.trim()) {
    errors.username = "Username is required";
  } else if (!USERNAME_RE.test(username.trim())) {
    errors.username = "Username must be 3-20 characters: letters, digits, or underscore";
  }

  if (!password || password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function buildJwtPayload(user) {
  return { id: user._id, username: user.username };
}

module.exports = { validateRegisterInput, normalizeEmail, buildJwtPayload };
