"use strict";

// Tests for the board domain.
// No database, no network, no server started.
//
// Part 1 -- pure helpers (unchanged from A-server):
//   MAX_BOARD_ELEMENTS, findLastOwnedElementId
//
// Part 2 -- validateElement (A-server-2 addition)
//
// Part 3 -- handler behaviour with models stubbed (A-server-2 addition):
//   membership refusals, owner-only clear, element cap, element validation,
//   valid add stamping and broadcast, undo of sender's last element only,
//   cursor cache.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Import models before the handler so Node's module cache gives the handler
// the same object references we monkey-patch here.
const Board = require("../models/Board");
const RoomMembership = require("../models/RoomMembership");
const Room = require("../models/Room");

const {
  MAX_BOARD_ELEMENTS,
  findLastOwnedElementId,
  validateElement,
} = require("../utils/boardHelpers");

const registerBoardHandlers = require("../socket/boardHandler");

// =============================================================================
// Part 1: Pure helpers
// =============================================================================

describe("MAX_BOARD_ELEMENTS", () => {
  it("is exactly 5000 per the spec", () => {
    assert.equal(MAX_BOARD_ELEMENTS, 5000);
  });
});

describe("findLastOwnedElementId: empty / no match", () => {
  const uid = "user-abc";

  it("returns null for an empty elements array", () => {
    assert.equal(findLastOwnedElementId([], uid), null);
  });

  it("returns null when no element belongs to the user", () => {
    const elements = [
      { id: "e1", createdBy: "other" },
      { id: "e2", createdBy: "other" },
    ];
    assert.equal(findLastOwnedElementId(elements, uid), null);
  });
});

describe("findLastOwnedElementId: single match", () => {
  const uid = "user-abc";

  it("returns the element id when the only element belongs to the user", () => {
    const elements = [{ id: "e1", createdBy: uid }];
    assert.equal(findLastOwnedElementId(elements, uid), "e1");
  });

  it("returns the element id when it is the last among others", () => {
    const elements = [
      { id: "e1", createdBy: "other" },
      { id: "e2", createdBy: uid },
    ];
    assert.equal(findLastOwnedElementId(elements, uid), "e2");
  });
});

describe("findLastOwnedElementId: multiple matches returns the last", () => {
  const uid = "user-abc";
  const other = "user-xyz";

  it("returns the last owned element, not the first", () => {
    const elements = [
      { id: "e1", createdBy: uid },
      { id: "e2", createdBy: uid },
    ];
    assert.equal(findLastOwnedElementId(elements, uid), "e2");
  });

  it("skips trailing elements by other users to find the user's last", () => {
    const elements = [
      { id: "e1", createdBy: uid },
      { id: "e2", createdBy: uid },
      { id: "e3", createdBy: other },
    ];
    assert.equal(findLastOwnedElementId(elements, uid), "e2");
  });

  it("returns the last when the user's elements are interleaved with others", () => {
    const elements = [
      { id: "e1", createdBy: uid },
      { id: "e2", createdBy: other },
      { id: "e3", createdBy: uid },
      { id: "e4", createdBy: other },
    ];
    assert.equal(findLastOwnedElementId(elements, uid), "e3");
  });
});

describe("findLastOwnedElementId: ObjectId-like values", () => {
  const uid = "user-abc";

  it("accepts userId as an object with toString() (simulates Mongoose ObjectId)", () => {
    const fakeObjectId = { toString: () => uid };
    const elements = [
      { id: "e1", createdBy: uid },
      { id: "e2", createdBy: uid },
    ];
    assert.equal(findLastOwnedElementId(elements, fakeObjectId), "e2");
  });

  it("accepts createdBy as an object with toString() (simulates stored ObjectId)", () => {
    const elements = [
      { id: "e1", createdBy: { toString: () => uid } },
      { id: "e2", createdBy: { toString: () => "other" } },
    ];
    assert.equal(findLastOwnedElementId(elements, uid), "e1");
  });

  it("matches when both userId and createdBy are objects with matching toString()", () => {
    const fakeId = { toString: () => uid };
    const elements = [
      { id: "e1", createdBy: { toString: () => "other" } },
      { id: "e2", createdBy: { toString: () => uid } },
    ];
    assert.equal(findLastOwnedElementId(elements, fakeId), "e2");
  });
});

// =============================================================================
// Part 2: validateElement
// =============================================================================

// Valid fixtures used across Part 2 and Part 3.
const validPen = {
  id: "e-pen",
  type: "pen",
  points: [{ x: 0, y: 0 }, { x: 10, y: 20 }],
  color: "#000000",
  width: 2,
};
const validRect = {
  id: "e-rect",
  type: "rect",
  x: 10,
  y: 20,
  w: 100,
  h: 50,
  color: "#ff0000",
  width: 1,
};
const validLine = {
  id: "e-line",
  type: "line",
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 100,
  color: "#0000ff",
  width: 1,
};

describe("validateElement: valid elements pass", () => {
  it("accepts a valid pen element", () => {
    assert.equal(validateElement(validPen), null);
  });

  it("accepts a valid rect element", () => {
    assert.equal(validateElement(validRect), null);
  });

  it("accepts a valid ellipse element", () => {
    assert.equal(
      validateElement({ id: "e", type: "ellipse", x: 0, y: 0, w: 10, h: 10, color: "#000", width: 1 }),
      null
    );
  });

  it("accepts a valid line element", () => {
    assert.equal(validateElement(validLine), null);
  });

  it("accepts a valid arrow element", () => {
    assert.equal(
      validateElement({ id: "e", type: "arrow", x1: 0, y1: 0, x2: 1, y2: 1, color: "#000", width: 1 }),
      null
    );
  });

  it("accepts a valid text element", () => {
    assert.equal(
      validateElement({ id: "e", type: "text", x: 0, y: 0, w: 50, h: 20, text: "hello", color: "#000", width: 1 }),
      null
    );
  });
});

describe("validateElement: invalid elements are rejected", () => {
  it("rejects null", () => {
    assert.ok(validateElement(null));
  });

  it("rejects a non-object (string)", () => {
    assert.ok(validateElement("pen"));
  });

  it("rejects an array", () => {
    assert.ok(validateElement([]));
  });

  it("rejects a missing id", () => {
    assert.ok(validateElement({ type: "pen", points: [{ x: 0, y: 0 }], color: "#000", width: 1 }));
  });

  it("rejects an empty-string id", () => {
    assert.ok(validateElement({ id: "", type: "pen", points: [{ x: 0, y: 0 }], color: "#000", width: 1 }));
  });

  it("rejects an unknown type", () => {
    assert.ok(validateElement({ id: "e", type: "circle", color: "#000", width: 1 }));
  });

  it("rejects a non-string color", () => {
    assert.ok(
      validateElement({ id: "e", type: "rect", x: 0, y: 0, w: 1, h: 1, color: 0xff0000, width: 1 })
    );
  });

  it("rejects a non-numeric width", () => {
    assert.ok(
      validateElement({ id: "e", type: "rect", x: 0, y: 0, w: 1, h: 1, color: "#000", width: "2" })
    );
  });

  it("rejects a pen element with no points array", () => {
    assert.ok(validateElement({ id: "e", type: "pen", color: "#000", width: 1 }));
  });

  it("rejects a pen element with an empty points array", () => {
    assert.ok(validateElement({ id: "e", type: "pen", points: [], color: "#000", width: 1 }));
  });

  it("rejects a pen point with a non-numeric x", () => {
    assert.ok(
      validateElement({ id: "e", type: "pen", points: [{ x: "0", y: 0 }], color: "#000", width: 1 })
    );
  });

  it("rejects a pen point with a non-numeric y", () => {
    assert.ok(
      validateElement({ id: "e", type: "pen", points: [{ x: 0, y: null }], color: "#000", width: 1 })
    );
  });

  it("rejects a rect element missing x, y, w, h", () => {
    assert.ok(validateElement({ id: "e", type: "rect", color: "#000", width: 1 }));
  });

  it("rejects an ellipse element missing coordinates", () => {
    assert.ok(validateElement({ id: "e", type: "ellipse", x: 0, color: "#000", width: 1 }));
  });

  it("rejects a line element missing x1, y1, x2, y2", () => {
    assert.ok(validateElement({ id: "e", type: "line", color: "#000", width: 1 }));
  });

  it("rejects an arrow element missing coordinates", () => {
    assert.ok(validateElement({ id: "e", type: "arrow", x1: 0, color: "#000", width: 1 }));
  });
});

// =============================================================================
// Part 3: Handler behaviour (models stubbed, no DB, no network)
// =============================================================================

// -- Stub helpers --

// Returns a chainable object that satisfies both:
//   model.findX(...).lean()
//   model.findX(...).select(...).lean()
function leanChain(result) {
  return {
    select: () => leanChain(result),
    lean: () => Promise.resolve(result),
  };
}

// Tracks the most recent Board.findOneAndUpdate call.
let updateCallCount = 0;
let lastUpdateArgs = null;

function stubMembership(result) {
  RoomMembership.findOne = () => leanChain(result);
}

function stubRoom(result) {
  Room.findById = () => leanChain(result);
}

function stubBoardRead(result) {
  Board.findOne = () => leanChain(result);
}

function stubBoardWrite() {
  updateCallCount = 0;
  lastUpdateArgs = null;
  Board.findOneAndUpdate = (...args) => {
    updateCallCount++;
    lastUpdateArgs = args;
    return Promise.resolve(null);
  };
}

// -- Mock socket / io factories --

function makeSocket(userId = "user-1", username = "alice") {
  const emitted = [];
  const broadcast = [];
  const handlers = {};
  return {
    user: { _id: userId, username },
    emitted,
    broadcast,
    emit(event, data) {
      emitted.push({ event, data });
    },
    to(room) {
      return {
        emit: (ev, data) => broadcast.push({ room, ev, data }),
      };
    },
    on(event, fn) {
      handlers[event] = fn;
    },
    handlers,
  };
}

function makeIo() {
  const roomBroadcast = [];
  const connHandlers = [];
  return {
    roomBroadcast,
    connHandlers,
    on(event, fn) {
      if (event === "connection") connHandlers.push(fn);
    },
    in(room) {
      return {
        emit: (ev, data) => roomBroadcast.push({ room, ev, data }),
      };
    },
  };
}

const mockApp = { use: () => {} };

// Wire up a fresh io+socket pair and trigger the connection handler.
function setup(userId = "user-1", username = "alice") {
  const io = makeIo();
  registerBoardHandlers(io, mockApp);
  const socket = makeSocket(userId, username);
  for (const fn of io.connHandlers) fn(socket);
  return { io, socket };
}

// Invoke a named socket event handler and await it.
async function invoke(socket, event, payload) {
  return socket.handlers[event](payload);
}

// -- Handler tests --

describe("board:add: non-member is refused", () => {
  it("emits error { message } and persists nothing", async () => {
    stubMembership(null);
    stubBoardRead({ elements: [] });
    stubBoardWrite();
    const { socket } = setup();

    await invoke(socket, "board:add", { roomId: "room-1", element: validPen });

    assert.equal(socket.emitted[0]?.event, "error");
    assert.equal(updateCallCount, 0);
  });
});

describe("board:add: element cap is refused", () => {
  it("emits error and persists nothing when board is at max capacity", async () => {
    stubMembership({ _id: "m1" });
    const full = new Array(MAX_BOARD_ELEMENTS).fill({ id: "x", createdBy: "u" });
    stubBoardRead({ elements: full });
    stubBoardWrite();
    const { socket } = setup();

    await invoke(socket, "board:add", { roomId: "room-1", element: validPen });

    const err = socket.emitted.find((e) => e.event === "error");
    assert.ok(err, "error event was emitted");
    assert.match(err.data.message, /limit/i);
    assert.equal(updateCallCount, 0);
  });
});

describe("board:add: invalid element is refused", () => {
  it("emits error and persists nothing when id is missing", async () => {
    stubMembership({ _id: "m1" });
    stubBoardRead({ elements: [] });
    stubBoardWrite();
    const { socket } = setup();

    const noId = { type: "rect", x: 0, y: 0, w: 10, h: 10, color: "#000", width: 1 };
    await invoke(socket, "board:add", { roomId: "room-1", element: noId });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
    assert.equal(updateCallCount, 0);
  });

  it("emits error and persists nothing when type is unknown", async () => {
    stubMembership({ _id: "m1" });
    stubBoardRead({ elements: [] });
    stubBoardWrite();
    const { socket } = setup();

    const badType = { id: "e1", type: "hexagon", color: "#000", width: 1 };
    await invoke(socket, "board:add", { roomId: "room-1", element: badType });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
    assert.equal(updateCallCount, 0);
  });

  it("emits error and persists nothing when line is missing coordinate fields", async () => {
    stubMembership({ _id: "m1" });
    stubBoardRead({ elements: [] });
    stubBoardWrite();
    const { socket } = setup();

    const badLine = { id: "e1", type: "line", color: "#000", width: 1 };
    await invoke(socket, "board:add", { roomId: "room-1", element: badLine });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
    assert.equal(updateCallCount, 0);
  });
});

describe("board:add: valid element is persisted and broadcast", () => {
  it("stamps createdBy/createdAt from the socket user and broadcasts to others only", async () => {
    stubMembership({ _id: "m1" });
    stubBoardRead({ elements: [] });
    stubBoardWrite();
    const { socket } = setup("user-42", "bob");

    await invoke(socket, "board:add", { roomId: "room-1", element: validRect });

    // No errors emitted
    assert.equal(socket.emitted.filter((e) => e.event === "error").length, 0);

    // Persisted once
    assert.equal(updateCallCount, 1);

    // Server stamps
    const pushed = lastUpdateArgs[1].$push.elements;
    assert.equal(String(pushed.createdBy), "user-42");
    assert.ok(pushed.createdAt instanceof Date, "createdAt should be a Date");

    // Broadcast to others via socket.to (not io.in -- excludes sender)
    const added = socket.broadcast.find((b) => b.ev === "board:added");
    assert.ok(added, "board:added broadcast to others");
    assert.equal(String(added.data.element.createdBy), "user-42");
  });
});

describe("board:remove: non-member is refused", () => {
  it("emits error and persists nothing", async () => {
    stubMembership(null);
    stubBoardWrite();
    const { socket } = setup();

    await invoke(socket, "board:remove", { roomId: "room-1", elementIds: ["e1"] });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
    assert.equal(updateCallCount, 0);
  });
});

describe("board:undo: non-member is refused", () => {
  it("emits error", async () => {
    stubMembership(null);
    const { socket } = setup();

    await invoke(socket, "board:undo", { roomId: "room-1" });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
  });
});

describe("board:undo: removes only the sender's last element", () => {
  it("pulls the most recent element owned by the sender and broadcasts board:removed to all", async () => {
    stubMembership({ _id: "m1" });
    stubBoardRead({
      elements: [
        { id: "e1", createdBy: "user-2" },
        { id: "e2", createdBy: "user-1" },
        { id: "e3", createdBy: "user-1" },
      ],
    });
    stubBoardWrite();
    const { io, socket } = setup("user-1");

    await invoke(socket, "board:undo", { roomId: "room-1" });

    // e3 is user-1's most recent element; e2 must not be pulled
    assert.equal(lastUpdateArgs[1].$pull.elements.id, "e3");

    // board:removed broadcast to all in the room (io.in, not socket.to)
    const removed = io.roomBroadcast.find((b) => b.ev === "board:removed");
    assert.ok(removed, "board:removed was broadcast");
    assert.deepEqual(removed.data.elementIds, ["e3"]);
  });

  it("does not broadcast when the sender has no elements", async () => {
    stubMembership({ _id: "m1" });
    stubBoardRead({
      elements: [
        { id: "e1", createdBy: "user-2" },
      ],
    });
    stubBoardWrite();
    const { io, socket } = setup("user-1");

    await invoke(socket, "board:undo", { roomId: "room-1" });

    assert.equal(updateCallCount, 0);
    assert.equal(io.roomBroadcast.length, 0);
  });
});

describe("board:clear: non-member is refused", () => {
  it("emits error and persists nothing", async () => {
    stubMembership(null);
    stubBoardWrite();
    const { socket } = setup();

    await invoke(socket, "board:clear", { roomId: "room-1" });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
    assert.equal(updateCallCount, 0);
  });
});

describe("board:clear: non-owner member is refused", () => {
  it("emits error mentioning owner and persists nothing", async () => {
    stubMembership({ _id: "m1" });
    stubRoom({ owner: "other-user" }); // not user-1
    stubBoardWrite();
    const { socket } = setup("user-1");

    await invoke(socket, "board:clear", { roomId: "room-1" });

    const err = socket.emitted.find((e) => e.event === "error");
    assert.ok(err, "error was emitted");
    assert.match(err.data.message, /owner/i);
    assert.equal(updateCallCount, 0);
  });
});

describe("board:cursor: non-member is refused", () => {
  it("emits error and does not forward the cursor", async () => {
    stubMembership(null);
    const { socket } = setup();

    await invoke(socket, "board:cursor", { roomId: "room-1", x: 10, y: 20 });

    assert.ok(socket.emitted.some((e) => e.event === "error"));
    assert.equal(socket.broadcast.length, 0);
  });
});

describe("board:cursor: member's cursor is forwarded", () => {
  it("emits board:cursor to others with userId, username, x, y", async () => {
    stubMembership({ _id: "m1" });
    const { socket } = setup("user-42", "alice");

    await invoke(socket, "board:cursor", { roomId: "room-1", x: 100, y: 200 });

    assert.equal(socket.emitted.filter((e) => e.event === "error").length, 0);
    const bc = socket.broadcast.find((b) => b.ev === "board:cursor");
    assert.ok(bc, "board:cursor was broadcast");
    assert.equal(String(bc.data.userId), "user-42");
    assert.equal(bc.data.username, "alice");
    assert.equal(bc.data.x, 100);
    assert.equal(bc.data.y, 200);
  });
});

describe("board:cursor: cache avoids repeated DB lookups", () => {
  it("calls RoomMembership.findOne only once across multiple cursor events from the same room", async () => {
    let findOneCalls = 0;
    RoomMembership.findOne = () => {
      findOneCalls++;
      return leanChain({ _id: "m1" });
    };
    const { socket } = setup("user-42", "alice");

    await invoke(socket, "board:cursor", { roomId: "room-1", x: 1, y: 1 });
    await invoke(socket, "board:cursor", { roomId: "room-1", x: 2, y: 2 });
    await invoke(socket, "board:cursor", { roomId: "room-1", x: 3, y: 3 });

    assert.equal(findOneCalls, 1, "DB called once, cached for subsequent events");
    assert.equal(socket.broadcast.filter((b) => b.ev === "board:cursor").length, 3);
  });
});
