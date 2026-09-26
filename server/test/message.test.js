// Tests for the message domain helpers -- pure functions only; no database or network.
// Uses Node.js built-in test runner.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { toggleReaction, normalizeMessage } = require("../utils/messageHelpers");

// ---------------------------------------------------------------------------
// toggleReaction
// ---------------------------------------------------------------------------

describe("toggleReaction", () => {
  test("adds a new emoji entry when none exists", () => {
    const result = toggleReaction([], "👍", "user1");
    assert.deepEqual(result, [{ emoji: "👍", users: ["user1"] }]);
  });

  test("adds the user to an existing emoji entry", () => {
    const reactions = [{ emoji: "👍", users: ["user1"] }];
    const result = toggleReaction(reactions, "👍", "user2");
    assert.deepEqual(result, [{ emoji: "👍", users: ["user1", "user2"] }]);
  });

  test("removes the user when they already reacted (toggle off)", () => {
    const reactions = [{ emoji: "👍", users: ["user1", "user2"] }];
    const result = toggleReaction(reactions, "👍", "user1");
    assert.deepEqual(result, [{ emoji: "👍", users: ["user2"] }]);
  });

  test("removes the emoji entry when the last user toggles off", () => {
    const reactions = [{ emoji: "👍", users: ["user1"] }];
    const result = toggleReaction(reactions, "👍", "user1");
    assert.deepEqual(result, []);
  });

  test("does not affect other emoji entries", () => {
    const reactions = [
      { emoji: "👍", users: ["user1"] },
      { emoji: "❤️", users: ["user2"] },
    ];
    const result = toggleReaction(reactions, "👍", "user2");
    assert.equal(result.length, 2);
    const heart = result.find((r) => r.emoji === "❤️");
    assert.deepEqual(heart.users, ["user2"]);
  });

  test("coerces userId objects to strings for comparison", () => {
    // Mongoose ObjectIds have a toString() method
    const fakeId = { toString: () => "user1" };
    const reactions = [{ emoji: "🎉", users: ["user1"] }];
    const result = toggleReaction(reactions, "🎉", fakeId);
    assert.deepEqual(result, []);
  });

  test("does not mutate the original reactions array", () => {
    const reactions = [{ emoji: "👍", users: ["user1"] }];
    toggleReaction(reactions, "👍", "user2");
    assert.deepEqual(reactions, [{ emoji: "👍", users: ["user1"] }]);
  });

  test("adding a different emoji creates a separate entry", () => {
    const reactions = [{ emoji: "👍", users: ["user1"] }];
    const result = toggleReaction(reactions, "🚀", "user1");
    assert.equal(result.length, 2);
    assert.ok(result.some((r) => r.emoji === "👍"));
    assert.ok(result.some((r) => r.emoji === "🚀"));
  });

  test("handles empty string emoji (treated as a distinct key)", () => {
    const reactions = [];
    const result = toggleReaction(reactions, "", "user1");
    assert.equal(result.length, 1);
    assert.equal(result[0].emoji, "");
  });
});

// ---------------------------------------------------------------------------
// normalizeMessage
// ---------------------------------------------------------------------------

describe("normalizeMessage", () => {
  test("adds reactions: [] when field is absent", () => {
    const msg = { _id: "abc", content: "hi" };
    const result = normalizeMessage(msg);
    assert.deepEqual(result.reactions, []);
  });

  test("adds replyTo: null when field is absent", () => {
    const msg = { _id: "abc", content: "hi" };
    const result = normalizeMessage(msg);
    assert.equal(result.replyTo, null);
  });

  test("preserves existing reactions", () => {
    const reactions = [{ emoji: "👍", users: ["u1"] }];
    const msg = { _id: "abc", content: "hi", reactions };
    const result = normalizeMessage(msg);
    assert.deepEqual(result.reactions, reactions);
  });

  test("preserves existing replyTo", () => {
    const replyTo = { _id: "xyz", content: "original" };
    const msg = { _id: "abc", content: "reply", replyTo };
    const result = normalizeMessage(msg);
    assert.deepEqual(result.replyTo, replyTo);
  });

  test("does not mutate the original message", () => {
    const msg = { _id: "abc", content: "hi" };
    normalizeMessage(msg);
    assert.equal(msg.reactions, undefined);
    assert.equal(msg.replyTo, undefined);
  });
});
