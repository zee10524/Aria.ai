'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Load models so their prototypes exist; queries are mocked below before any
// controller call touches them.
const User = require('../models/User');
const Room = require('../models/Room');
const RoomMembership = require('../models/RoomMembership');
const Message = require('../models/Message');

// Controller loads the same model references.
const ctrl = require('../controllers/userController');

// Minimal res builder
function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; };
  return res;
}

// ─── patchMe validation ───────────────────────────────────────────────────────

test('patchMe: rejects bio longer than 300 chars', async () => {
  const req = {
    user: { _id: 'u1' },
    body: { bio: 'x'.repeat(301) },
  };
  const res = makeRes();
  await ctrl.patchMe(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.message, /bio/i);
});

test('patchMe: rejects non-string bio', async () => {
  const req = {
    user: { _id: 'u1' },
    body: { bio: 42 },
  };
  const res = makeRes();
  await ctrl.patchMe(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.message, /bio/i);
});

test('patchMe: rejects skills array longer than 10', async () => {
  const req = {
    user: { _id: 'u1' },
    body: { skills: Array(11).fill('js') },
  };
  const res = makeRes();
  await ctrl.patchMe(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.message, /skills/i);
});

test('patchMe: rejects skill string longer than 30 chars', async () => {
  const req = {
    user: { _id: 'u1' },
    body: { skills: ['x'.repeat(31)] },
  };
  const res = makeRes();
  await ctrl.patchMe(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.message, /skills/i);
});

test('patchMe: rejects non-array skills', async () => {
  const req = {
    user: { _id: 'u1' },
    body: { skills: 'not-an-array' },
  };
  const res = makeRes();
  await ctrl.patchMe(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.message, /skills/i);
});

test('patchMe: accepts empty body (no-op patch)', async () => {
  const orig = User.findByIdAndUpdate;
  User.findByIdAndUpdate = async () => ({ bio: '', skills: [] });
  try {
    const req = { user: { _id: 'u1' }, body: {} };
    const res = makeRes();
    await ctrl.patchMe(req, res);
    assert.equal(res._status, 200);
    assert.deepEqual(res._body, { bio: '', skills: [] });
  } finally {
    User.findByIdAndUpdate = orig;
  }
});

test('patchMe: accepts valid bio and skills', async () => {
  const orig = User.findByIdAndUpdate;
  User.findByIdAndUpdate = async (id, update, opts) => {
    assert.equal(update.$set.bio, 'Hello world');
    assert.deepEqual(update.$set.skills, ['js', 'ts']);
    return { bio: 'Hello world', skills: ['js', 'ts'] };
  };
  try {
    const req = { user: { _id: 'u1' }, body: { bio: 'Hello world', skills: ['js', 'ts'] } };
    const res = makeRes();
    await ctrl.patchMe(req, res);
    assert.equal(res._status, 200);
    assert.equal(res._body.bio, 'Hello world');
    assert.deepEqual(res._body.skills, ['js', 'ts']);
  } finally {
    User.findByIdAndUpdate = orig;
  }
});

// ─── getMe helpers ────────────────────────────────────────────────────────────

// Build a mock RoomMembership.find chain that resolves to `items`.
function mockMembershipFind(items) {
  return () => ({
    populate: () => ({
      sort: async () => items,
    }),
  });
}

// Build a mock Message.find chain that resolves to `items`.
function mockMessageFind(items) {
  return () => ({
    sort: () => ({
      limit: () => ({
        populate: async () => items,
      }),
    }),
  });
}

// ─── getMe ───────────────────────────────────────────────────────────────────

test('getMe: returns user with stats, rooms, and activity', async () => {
  const origMemberFind = RoomMembership.find;
  const origMsgCount = Message.countDocuments;
  const origMsgFind = Message.find;

  const ownedRoom = {
    _id: 'r1',
    name: 'General',
    description: 'A general room',
    createdAt: new Date('2025-03-01'),
  };
  const joinedRoom = {
    _id: 'r2',
    name: 'Lounge',
    description: '',
    createdAt: new Date('2025-04-01'),
  };

  const memberships = [
    { role: 'owner', status: 'active', joinedAt: new Date('2025-03-01'), room: ownedRoom },
    { role: 'member', status: 'active', joinedAt: new Date('2025-04-01'), room: joinedRoom },
  ];

  RoomMembership.find = mockMembershipFind(memberships);
  Message.countDocuments = async (filter) =>
    filter.type === 'user' ? 20 : 7;
  Message.find = mockMessageFind([
    {
      type: 'user',
      createdAt: new Date('2025-06-01'),
      room: { name: 'General' },
    },
  ]);

  try {
    const req = {
      user: {
        _id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        bio: 'I code',
        skills: ['js'],
        createdAt: new Date('2025-01-01'),
      },
    };
    const res = makeRes();
    await ctrl.getMe(req, res);

    const body = res._body;
    assert.equal(body.username, 'alice');
    assert.equal(body.email, 'alice@example.com');
    assert.equal(body.bio, 'I code');
    assert.deepEqual(body.skills, ['js']);

    // Stats
    assert.equal(body.stats.roomsOwned, 1);
    assert.equal(body.stats.roomsJoined, 1);
    assert.equal(body.stats.messagesSent, 20);
    assert.equal(body.stats.aiPrompts, 7);

    // Rooms: both owned and joined
    assert.equal(body.rooms.length, 2);
    assert.ok(body.rooms.some((r) => r.name === 'General'));
    assert.ok(body.rooms.some((r) => r.name === 'Lounge'));

    // Activity present and is an array
    assert.ok(Array.isArray(body.activity));
    assert.ok(body.activity.length > 0);
  } finally {
    RoomMembership.find = origMemberFind;
    Message.countDocuments = origMsgCount;
    Message.find = origMsgFind;
  }
});

test('getMe: roomsOwned counts only owner memberships', async () => {
  const origMemberFind = RoomMembership.find;
  const origMsgCount = Message.countDocuments;
  const origMsgFind = Message.find;

  const fakeRoom = { _id: 'r1', name: 'R', description: '', createdAt: new Date() };
  const memberships = [
    { role: 'owner', status: 'active', joinedAt: new Date(), room: fakeRoom },
    { role: 'member', status: 'active', joinedAt: new Date(), room: { ...fakeRoom, _id: 'r2', name: 'R2' } },
    { role: 'member', status: 'active', joinedAt: new Date(), room: { ...fakeRoom, _id: 'r3', name: 'R3' } },
  ];

  RoomMembership.find = mockMembershipFind(memberships);
  Message.countDocuments = async () => 0;
  Message.find = mockMessageFind([]);

  try {
    const req = {
      user: { _id: 'u1', username: 'bob', email: 'b@b.com', createdAt: new Date() },
    };
    const res = makeRes();
    await ctrl.getMe(req, res);

    assert.equal(res._body.stats.roomsOwned, 1);
    assert.equal(res._body.stats.roomsJoined, 2);
  } finally {
    RoomMembership.find = origMemberFind;
    Message.countDocuments = origMsgCount;
    Message.find = origMsgFind;
  }
});

test('getMe: rooms includes joined rooms, not only owned', async () => {
  const origMemberFind = RoomMembership.find;
  const origMsgCount = Message.countDocuments;
  const origMsgFind = Message.find;

  const memberships = [
    {
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
      room: { _id: 'r99', name: 'Joined Only', description: '', createdAt: new Date() },
    },
  ];

  RoomMembership.find = mockMembershipFind(memberships);
  Message.countDocuments = async () => 0;
  Message.find = mockMessageFind([]);

  try {
    const req = {
      user: { _id: 'u1', username: 'carol', email: 'c@c.com', createdAt: new Date() },
    };
    const res = makeRes();
    await ctrl.getMe(req, res);

    const rooms = res._body.rooms;
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].name, 'Joined Only');
    assert.equal(rooms[0].role, 'member');
  } finally {
    RoomMembership.find = origMemberFind;
    Message.countDocuments = origMsgCount;
    Message.find = origMsgFind;
  }
});

test('getMe: activity is sorted newest first', async () => {
  const origMemberFind = RoomMembership.find;
  const origMsgCount = Message.countDocuments;
  const origMsgFind = Message.find;

  const older = new Date('2025-01-01');
  const newer = new Date('2025-06-01');

  const memberships = [
    {
      role: 'owner',
      status: 'active',
      joinedAt: older,
      room: { _id: 'r1', name: 'OldRoom', description: '', createdAt: older },
    },
  ];

  RoomMembership.find = mockMembershipFind(memberships);
  Message.countDocuments = async () => 0;
  Message.find = mockMessageFind([
    { type: 'user', createdAt: newer, room: { name: 'NewRoom' } },
  ]);

  try {
    const req = {
      user: { _id: 'u1', username: 'dave', email: 'd@d.com', createdAt: new Date() },
    };
    const res = makeRes();
    await ctrl.getMe(req, res);

    const activity = res._body.activity;
    assert.ok(activity.length >= 2);
    // Newest timestamp should come first
    assert.ok(
      new Date(activity[0].timestamp) >= new Date(activity[1].timestamp),
      'Activity not sorted newest first'
    );
  } finally {
    RoomMembership.find = origMemberFind;
    Message.countDocuments = origMsgCount;
    Message.find = origMsgFind;
  }
});

test('getMe: activity includes room_created, room_joined, message_sent, ai_prompt types', async () => {
  const origMemberFind = RoomMembership.find;
  const origMsgCount = Message.countDocuments;
  const origMsgFind = Message.find;

  const ts = new Date('2025-05-01');

  const memberships = [
    {
      role: 'owner',
      status: 'active',
      joinedAt: ts,
      room: { _id: 'r1', name: 'Alpha', description: '', createdAt: ts },
    },
    {
      role: 'member',
      status: 'active',
      joinedAt: ts,
      room: { _id: 'r2', name: 'Beta', description: '', createdAt: ts },
    },
  ];

  RoomMembership.find = mockMembershipFind(memberships);
  Message.countDocuments = async () => 0;
  Message.find = mockMessageFind([
    { type: 'user', createdAt: ts, room: { name: 'Alpha' } },
    { type: 'ai', createdAt: ts, room: { name: 'Alpha' } },
  ]);

  try {
    const req = {
      user: { _id: 'u1', username: 'eve', email: 'e@e.com', createdAt: new Date() },
    };
    const res = makeRes();
    await ctrl.getMe(req, res);

    const types = res._body.activity.map((a) => a.type);
    assert.ok(types.includes('room_created'), 'missing room_created');
    assert.ok(types.includes('room_joined'), 'missing room_joined');
    assert.ok(types.includes('message_sent'), 'missing message_sent');
    assert.ok(types.includes('ai_prompt'), 'missing ai_prompt');
  } finally {
    RoomMembership.find = origMemberFind;
    Message.countDocuments = origMsgCount;
    Message.find = origMsgFind;
  }
});

test('getMe: falls back to empty bio and skills when not set', async () => {
  const origMemberFind = RoomMembership.find;
  const origMsgCount = Message.countDocuments;
  const origMsgFind = Message.find;

  RoomMembership.find = mockMembershipFind([]);
  Message.countDocuments = async () => 0;
  Message.find = mockMessageFind([]);

  try {
    const req = {
      user: {
        _id: 'u2',
        username: 'bob',
        email: 'bob@example.com',
        bio: undefined,
        skills: undefined,
        createdAt: new Date(),
      },
    };
    const res = makeRes();
    await ctrl.getMe(req, res);

    assert.equal(res._body.bio, '');
    assert.deepEqual(res._body.skills, []);
    assert.deepEqual(res._body.rooms, []);
    assert.deepEqual(res._body.activity, []);
  } finally {
    RoomMembership.find = origMemberFind;
    Message.countDocuments = origMsgCount;
    Message.find = origMsgFind;
  }
});
