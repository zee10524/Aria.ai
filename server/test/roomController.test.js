'use strict';

// Tests for listMyRooms unread counting -- real controller code, no database.
// RoomMembership.find and Message.countDocuments are stubbed using the same
// property-replacement pattern as userController.test.js.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const RoomMembership = require("../models/RoomMembership");
const Message = require("../models/Message");

const ctrl = require("../controllers/roomController");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; };
  return res;
}

function makeReq(userId) {
  return { user: { _id: userId || "user-1" } };
}

// A membership stub whose .room.toObject() returns a plain object.
function makeMembership(roomId, overrides) {
  const room = {
    _id: roomId,
    name: "Room " + roomId,
    isActive: true,
    toObject() { return { _id: this._id, name: this.name }; },
  };
  return Object.assign({ room, role: "member", lastReadAt: null }, overrides);
}

// Build a RoomMembership.find stub that resolves to `memberships` via the
// .populate().sort() chain used in listMyRooms.
function mockMembershipFind(memberships) {
  return () => ({
    populate: () => ({
      sort: async () => memberships,
    }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listMyRooms: unread counting", () => {
  test("returns unreadCount 0 when countDocuments returns 0", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;

    RoomMembership.find = mockMembershipFind([makeMembership("r1")]);
    Message.countDocuments = async () => 0;
    try {
      const req = makeReq();
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      assert.equal(res._body.rooms.length, 1);
      assert.equal(res._body.rooms[0].unreadCount, 0);
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });

  test("returns correct unreadCount when countDocuments returns N", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;

    RoomMembership.find = mockMembershipFind([makeMembership("r1")]);
    Message.countDocuments = async () => 7;
    try {
      const req = makeReq();
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      assert.equal(res._body.rooms[0].unreadCount, 7);
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });

  test("when lastReadAt is null, countDocuments query has no createdAt filter", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;
    const capturedQueries = [];

    RoomMembership.find = mockMembershipFind([makeMembership("r1", { lastReadAt: null })]);
    Message.countDocuments = async (query) => { capturedQueries.push(query); return 0; };
    try {
      const req = makeReq();
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      assert.equal(capturedQueries.length, 1);
      assert.equal(capturedQueries[0].createdAt, undefined,
        "no createdAt filter when lastReadAt is null (all messages are unread)");
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });

  test("when lastReadAt is set, countDocuments query includes createdAt $gt filter", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;
    const capturedQueries = [];
    const lastReadAt = new Date("2024-03-01T00:00:00.000Z");

    RoomMembership.find = mockMembershipFind([makeMembership("r1", { lastReadAt })]);
    Message.countDocuments = async (query) => { capturedQueries.push(query); return 3; };
    try {
      const req = makeReq();
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      assert.equal(capturedQueries.length, 1);
      assert.deepEqual(capturedQueries[0].createdAt, { $gt: lastReadAt });
      assert.equal(res._body.rooms[0].unreadCount, 3);
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });

  test("countDocuments query excludes the requesting user's own messages", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;
    const capturedQueries = [];

    RoomMembership.find = mockMembershipFind([makeMembership("r1")]);
    Message.countDocuments = async (query) => { capturedQueries.push(query); return 0; };
    try {
      const req = makeReq("my-user-id");
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      assert.deepEqual(capturedQueries[0].sender, { $ne: "my-user-id" });
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });

  test("multiple rooms each get their own unread count", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;
    const lastReadAt = new Date("2024-06-01T00:00:00.000Z");

    RoomMembership.find = mockMembershipFind([
      makeMembership("r1", { lastReadAt }),
      makeMembership("r2", { lastReadAt: null }),
    ]);
    // Room r1 has 2 unread; room r2 has 5 unread.
    Message.countDocuments = async (query) => {
      const roomId = String(query.room);
      if (roomId === "r1") return 2;
      if (roomId === "r2") return 5;
      return 0;
    };
    try {
      const req = makeReq();
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      const rooms = res._body.rooms;
      assert.equal(rooms.length, 2);
      const r1 = rooms.find((r) => String(r._id) === "r1");
      const r2 = rooms.find((r) => String(r._id) === "r2");
      assert.equal(r1.unreadCount, 2);
      assert.equal(r2.unreadCount, 5);
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });

  test("rooms with no membership populate result (inactive room) are omitted", async () => {
    const origFind = RoomMembership.find;
    const origCount = Message.countDocuments;

    // The populate match filter sets .room to null for inactive rooms.
    const memberships = [
      makeMembership("r1"),
      { room: null, role: "member", lastReadAt: null },
    ];
    RoomMembership.find = mockMembershipFind(memberships);
    Message.countDocuments = async () => 0;
    try {
      const req = makeReq();
      const res = makeRes();
      await ctrl.listMyRooms(req, res);
      assert.equal(res._body.rooms.length, 1, "inactive room should be filtered out");
    } finally {
      RoomMembership.find = origFind;
      Message.countDocuments = origCount;
    }
  });
});
