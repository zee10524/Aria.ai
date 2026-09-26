"use strict";

const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");

const Board = require("../models/Board");
const RoomMembership = require("../models/RoomMembership");
const Room = require("../models/Room");
const {
  MAX_BOARD_ELEMENTS,
  findLastOwnedElementId,
  validateElement,
} = require("../utils/boardHelpers");

// Returns the active membership document or null.
async function getMembership(roomId, userId) {
  return RoomMembership.findOne({
    room: roomId,
    user: userId,
    status: "active",
  }).lean();
}

// Returns true when userId is the room's owner.
async function roomOwnedBy(roomId, userId) {
  const room = await Room.findById(roomId).select("owner").lean();
  return room != null && String(room.owner) === String(userId);
}

/**
 * Registers the board REST route and socket handlers.
 *
 * REST (members only):
 *   GET /api/rooms/:roomId/board  ->  { elements: BoardElement[] }
 *
 * Socket (client -> server, all carry roomId):
 *   board:add    { element }
 *   board:remove { elementIds }
 *   board:undo   {}
 *   board:clear  {}   (owner only)
 *   board:cursor { x, y }  (not persisted)
 *
 * Socket (server -> room):
 *   board:added   { element }        to others
 *   board:removed { elementIds }     to all
 *   board:cleared {}                 to all
 *   board:cursor  { userId, username, x, y }  to others
 *   error         { message }        to sender on refusal
 *
 * Call once during server startup, before registering the 404 middleware so
 * the board REST route is reachable.
 */
module.exports = function registerBoardHandlers(io, app) {
  // -------------------------------------------------------------------------
  // REST
  // -------------------------------------------------------------------------
  const requireAuth = passport.authenticate("jwt", { session: false });
  const boardRouter = express.Router();

  boardRouter.get("/:roomId/board", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: "Invalid room id" });
      }

      const membership = await getMembership(roomId, req.user._id);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const board = await Board.findOne({ room: roomId }).lean();
      return res.json({ elements: board ? board.elements : [] });
    } catch (err) {
      console.error("GET board error:", err.message);
      return res.status(500).json({ message: "Failed to fetch board" });
    }
  });

  app.use("/api/rooms", boardRouter);

  // -------------------------------------------------------------------------
  // Socket
  // -------------------------------------------------------------------------
  io.on("connection", (socket) => {
    // Per-socket cache of room IDs where this socket's membership has been
    // verified this session. Used to keep board:cursor cheap -- the cursor
    // event fires many times per second while someone draws, so after the
    // first DB lookup for a given room the cache is hit instead.
    const approvedRooms = new Set();

    // Verifies membership via DB and caches the approval. Returns the
    // membership document (truthy) or null (not a member).
    async function requireMembership(roomId) {
      const m = await getMembership(roomId, socket.user._id);
      if (m) approvedRooms.add(String(roomId));
      return m;
    }

    // board:add -- validate, persist, and broadcast the new element
    socket.on("board:add", async ({ roomId, element }) => {
      try {
        if (!await requireMembership(roomId)) {
          return socket.emit("error", { message: "Access denied" });
        }

        const validationError = validateElement(element);
        if (validationError) {
          return socket.emit("error", { message: validationError });
        }

        const board = await Board.findOne({ room: roomId })
          .select("elements")
          .lean();
        if (board && board.elements.length >= MAX_BOARD_ELEMENTS) {
          return socket.emit("error", { message: "Board element limit reached" });
        }

        // Server stamps createdBy and createdAt; any client-supplied values are
        // replaced.
        const stamped = {
          ...element,
          createdBy: socket.user._id,
          createdAt: new Date(),
        };

        await Board.findOneAndUpdate(
          { room: roomId },
          { $push: { elements: stamped } },
          { upsert: true }
        );

        socket.to(`room:${roomId}`).emit("board:added", { element: stamped });
      } catch (err) {
        console.error("board:add error:", err.message);
        socket.emit("error", { message: "Failed to add element" });
      }
    });

    // board:remove -- eraser; any member may remove any element
    socket.on("board:remove", async ({ roomId, elementIds }) => {
      try {
        if (!await requireMembership(roomId)) {
          return socket.emit("error", { message: "Access denied" });
        }

        await Board.findOneAndUpdate(
          { room: roomId },
          { $pull: { elements: { id: { $in: elementIds } } } }
        );

        io.in(`room:${roomId}`).emit("board:removed", { elementIds });
      } catch (err) {
        console.error("board:remove error:", err.message);
        socket.emit("error", { message: "Failed to remove elements" });
      }
    });

    // board:undo -- removes only the sender's most recent element
    socket.on("board:undo", async ({ roomId }) => {
      try {
        if (!await requireMembership(roomId)) {
          return socket.emit("error", { message: "Access denied" });
        }

        const board = await Board.findOne({ room: roomId }).lean();
        if (!board || !board.elements.length) return;

        const elementId = findLastOwnedElementId(
          board.elements,
          socket.user._id
        );
        if (!elementId) return;

        await Board.findOneAndUpdate(
          { room: roomId },
          { $pull: { elements: { id: elementId } } }
        );

        io.in(`room:${roomId}`).emit("board:removed", {
          elementIds: [elementId],
        });
      } catch (err) {
        console.error("board:undo error:", err.message);
        socket.emit("error", { message: "Failed to undo" });
      }
    });

    // board:clear -- owner only; wipes all elements
    socket.on("board:clear", async ({ roomId }) => {
      try {
        if (!await requireMembership(roomId)) {
          return socket.emit("error", { message: "Access denied" });
        }

        const owned = await roomOwnedBy(roomId, socket.user._id);
        if (!owned) {
          return socket.emit("error", {
            message: "Only the room owner can clear the board",
          });
        }

        await Board.findOneAndUpdate(
          { room: roomId },
          { $set: { elements: [] } }
        );

        io.in(`room:${roomId}`).emit("board:cleared", {});
      } catch (err) {
        console.error("board:clear error:", err.message);
        socket.emit("error", { message: "Failed to clear board" });
      }
    });

    // board:cursor -- ephemeral; forwarded to other room members, not persisted.
    // Membership is enforced via the per-socket approvedRooms cache to avoid
    // a DB lookup on every cursor event (which fires many times per second).
    // The first cursor from a given room does one DB check and caches the result;
    // all subsequent cursor events for that room are free.
    socket.on("board:cursor", async ({ roomId, x, y }) => {
      try {
        const rid = String(roomId);
        if (!approvedRooms.has(rid)) {
          const m = await getMembership(roomId, socket.user._id);
          if (!m) return socket.emit("error", { message: "Access denied" });
          approvedRooms.add(rid);
        }
        socket.to(`room:${roomId}`).emit("board:cursor", {
          userId: socket.user._id,
          username: socket.user.username,
          x,
          y,
        });
      } catch (err) {
        console.error("board:cursor error:", err.message);
      }
    });
  });
};
