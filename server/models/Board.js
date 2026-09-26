"use strict";

const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  { x: Number, y: Number },
  { _id: false }
);

// Shape matches the brief's BoardElement contract.
// id is client-generated; createdBy and createdAt are stamped server-side on write.
const boardElementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["pen", "rect", "ellipse", "line", "arrow", "text"],
    },
    // pen only
    points: { type: [pointSchema], default: undefined },
    // rect, ellipse, text
    x: Number,
    y: Number,
    w: Number,
    h: Number,
    // line, arrow
    x1: Number,
    y1: Number,
    x2: Number,
    y2: Number,
    // text only
    text: String,
    color: { type: String, required: true },
    width: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true,
      index: true,
    },
    elements: { type: [boardElementSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);
