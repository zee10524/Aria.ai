"use strict";

// Socket authentication logic, extracted so the classification function
// can be unit-tested without a database or network.

const jwt = require("jsonwebtoken");

// Maps a caught error to { type, message }.
// type "auth"         -> the user's credential is invalid; client should go to /login.
// type "server_error" -> a transient server-side fault; client should retry.
function classifyAuthError(err) {
  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError
  ) {
    return { type: "auth", message: "Invalid or expired token" };
  }
  return { type: "server_error", message: "Server error, please retry" };
}

// Returns a Socket.IO middleware function.
// findUser(id) is called with the JWT payload id and must return the user
// document or null. Callers inject it so tests can pass a stub.
function makeSocketAuthMiddleware(findUser) {
  return async function authenticateSocket(socket, next) {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      const err = new Error("Authentication required");
      err.data = { type: "auth" };
      return next(err);
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      const classified = classifyAuthError(jwtErr);
      const err = new Error(classified.message);
      err.data = { type: classified.type };
      return next(err);
    }

    try {
      const user = await findUser(payload.id);
      if (!user) {
        const err = new Error("User not found");
        err.data = { type: "auth" };
        return next(err);
      }
      socket.user = user;
      next();
    } catch (dbErr) {
      console.error("Socket auth DB error:", dbErr.message);
      const classified = classifyAuthError(dbErr);
      const err = new Error(classified.message);
      err.data = { type: classified.type };
      return next(err);
    }
  };
}

module.exports = { classifyAuthError, makeSocketAuthMiddleware };
