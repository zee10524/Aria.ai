'use strict';

// Tests for the catch-up controller -- real code path, no database or network.
// The controller's RoomMembership and Message dependencies are stubbed by
// replacing their methods on the shared module reference (same pattern as
// userController.test.js).  Gemini is injected via the third argument to
// _catchUp.  Tests restore originals in a finally block.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// Load the model modules so their prototypes exist.  The controller required
// them at start-up and holds references to the same cached objects, so patching
// here is visible to the controller.
const RoomMembership = require("../models/RoomMembership");
const Message = require("../models/Message");

// The real controller under test.
const { _catchUp } = require("../controllers/catchUpController");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; };
  return res;
}

// Default valid ObjectId and user id so tests that do not care about them can
// omit them.
const VALID_ROOM_ID = "507f1f77bcf86cd799439011";
const USER_ID = "user-abc";

function makeReq(roomId, userId) {
  return {
    params: { roomId: roomId !== undefined ? roomId : VALID_ROOM_ID },
    user: { _id: userId !== undefined ? userId : USER_ID },
  };
}

function makeMembership(overrides) {
  return Object.assign({ previousLastReadAt: null, lastReadAt: null }, overrides);
}

function makeMessage(overrides) {
  return Object.assign(
    { type: "user", sender: { username: "alice" }, content: "hello", createdAt: new Date() },
    overrides
  );
}

// Returns a Gemini genAI stub whose generateContent resolves to summaryText.
function makeGenAI(summaryText) {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => ({ response: { text: () => summaryText } }),
    }),
  };
}

// Returns a chainable object that satisfies .sort().populate().lean().
function makeFindChain(messages) {
  const chain = {
    sort: () => chain,
    populate: () => chain,
    lean: async () => messages,
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("catchUp controller", () => {
  test("returns 400 for an invalid roomId", async () => {
    // No model stubs needed: the ObjectId check fires before any DB call.
    const req = makeReq("not-a-valid-id");
    const res = makeRes();
    await _catchUp(req, res, { genAI: makeGenAI("x") });
    assert.equal(res._status, 400);
    assert.equal(res._body.message, "Invalid room id");
  });

  test("returns 403 when user has no active membership", async () => {
    const origFindOne = RoomMembership.findOne;
    RoomMembership.findOne = async () => null;
    try {
      const req = makeReq();
      const res = makeRes();
      await _catchUp(req, res, { genAI: makeGenAI("x") });
      assert.equal(res._status, 403);
      assert.equal(res._body.message, "Access denied");
    } finally {
      RoomMembership.findOne = origFindOne;
    }
  });

  test("zero missed messages: returns fixed message and does not call Gemini", async () => {
    const origFindOne = RoomMembership.findOne;
    const origFind = Message.find;
    let geminiCalled = false;
    const trackingGenAI = {
      getGenerativeModel: () => ({
        generateContent: async () => {
          geminiCalled = true;
          return { response: { text: () => "must not appear" } };
        },
      }),
    };

    RoomMembership.findOne = async () => makeMembership({ previousLastReadAt: null });
    Message.find = () => makeFindChain([]);
    try {
      const req = makeReq();
      const res = makeRes();
      await _catchUp(req, res, { genAI: trackingGenAI });
      assert.equal(geminiCalled, false, "Gemini must not be called when messageCount is 0");
      assert.equal(res._body.messageCount, 0);
      assert.equal(res._body.summary, "Nothing new since your last visit.");
      assert.equal(res._body.since, null);
    } finally {
      RoomMembership.findOne = origFindOne;
      Message.find = origFind;
    }
  });

  test("N missed messages: returns Gemini summary and correct count", async () => {
    const since = new Date("2024-01-01T10:00:00.000Z");
    const origFindOne = RoomMembership.findOne;
    const origFind = Message.find;
    const messages = [
      makeMessage({ content: "We should use Redis." }),
      makeMessage({ content: "Agreed, let's go with it." }),
    ];

    RoomMembership.findOne = async () => makeMembership({ previousLastReadAt: since });
    Message.find = () => makeFindChain(messages);
    try {
      const req = makeReq();
      const res = makeRes();
      await _catchUp(req, res, { genAI: makeGenAI("Redis was discussed and agreed upon.") });
      assert.equal(res._body.messageCount, 2);
      assert.equal(res._body.summary, "Redis was discussed and agreed upon.");
      assert.equal(res._body.since, since.toISOString());
      assert.ok(!res._status || res._status === 200);
    } finally {
      RoomMembership.findOne = origFindOne;
      Message.find = origFind;
    }
  });

  test("since is the ISO string of previousLastReadAt when set", async () => {
    const since = new Date("2024-06-15T08:30:00.000Z");
    const origFindOne = RoomMembership.findOne;
    const origFind = Message.find;

    RoomMembership.findOne = async () => makeMembership({ previousLastReadAt: since });
    Message.find = () => makeFindChain([makeMessage()]);
    try {
      const req = makeReq();
      const res = makeRes();
      await _catchUp(req, res, { genAI: makeGenAI("One message was sent.") });
      assert.equal(res._body.since, since.toISOString());
    } finally {
      RoomMembership.findOne = origFindOne;
      Message.find = origFind;
    }
  });

  test("since is null when previousLastReadAt is absent", async () => {
    const origFindOne = RoomMembership.findOne;
    const origFind = Message.find;

    RoomMembership.findOne = async () => makeMembership({ previousLastReadAt: null });
    Message.find = () => makeFindChain([makeMessage()]);
    try {
      const req = makeReq();
      const res = makeRes();
      await _catchUp(req, res, { genAI: makeGenAI("One message was sent.") });
      assert.equal(res._body.since, null);
    } finally {
      RoomMembership.findOne = origFindOne;
      Message.find = origFind;
    }
  });
});
