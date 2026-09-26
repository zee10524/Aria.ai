// Tests for rooms domain -- pure functions only; no database or network.
// Uses Node.js built-in test runner.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  ROOM_CODE_LENGTH,
  ROOM_CODE_ALPHABET,
  generateRoomCode,
  validateRoomFields,
  markMembership,
} = require("../utils/roomHelpers");

// ---------------------------------------------------------------------------
// generateRoomCode
// ---------------------------------------------------------------------------

describe("generateRoomCode", () => {
  test("produces a 6-character string", () => {
    const code = generateRoomCode();
    assert.equal(code.length, ROOM_CODE_LENGTH);
  });

  test("uses only alphabet characters", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateRoomCode();
      for (const ch of code) {
        assert.ok(
          ROOM_CODE_ALPHABET.includes(ch),
          `Unexpected character '${ch}' in code '${code}'`
        );
      }
    }
  });

  test("rarely produces the same code twice (birthday paradox sanity check)", () => {
    const codes = new Set(Array.from({ length: 100 }, generateRoomCode));
    // alphabet^6 = 32^6 ~ 10^9; collisions in 100 draws are astronomically rare
    assert.ok(codes.size > 90, "Too many collisions -- RNG may be broken");
  });
});

// ---------------------------------------------------------------------------
// validateRoomFields
// ---------------------------------------------------------------------------

describe("validateRoomFields", () => {
  test("returns null for valid fields", () => {
    assert.equal(
      validateRoomFields({ description: "Hello", tags: ["react", "node"] }),
      null
    );
  });

  test("rejects description longer than 300 chars", () => {
    const long = "x".repeat(301);
    const result = validateRoomFields({ description: long, tags: [] });
    assert.ok(result && result.includes("300"), `Expected 300-char message, got: ${result}`);
  });

  test("accepts description exactly 300 chars", () => {
    const ok = "y".repeat(300);
    assert.equal(validateRoomFields({ description: ok, tags: [] }), null);
  });

  test("rejects more than 8 tags", () => {
    const tags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
    const result = validateRoomFields({ description: "", tags });
    assert.ok(result && result.includes("8"), `Expected 8-tag message, got: ${result}`);
  });

  test("accepts exactly 8 tags", () => {
    const tags = Array.from({ length: 8 }, (_, i) => `tag${i}`);
    assert.equal(validateRoomFields({ description: "", tags }), null);
  });

  test("rejects a tag longer than 24 chars", () => {
    const tags = ["x".repeat(25)];
    const result = validateRoomFields({ description: "", tags });
    assert.ok(result && result.includes("24"), `Expected 24-char message, got: ${result}`);
  });

  test("accepts a tag of exactly 24 chars", () => {
    const tags = ["y".repeat(24)];
    assert.equal(validateRoomFields({ description: "", tags }), null);
  });

  test("allows omitting description and tags", () => {
    assert.equal(validateRoomFields({}), null);
  });
});

// ---------------------------------------------------------------------------
// markMembership
// ---------------------------------------------------------------------------

describe("markMembership", () => {
  const room1 = { _id: "aaa111", name: "Alpha" };
  const room2 = { _id: "bbb222", name: "Beta" };
  const room3 = { _id: "ccc333", name: "Gamma" };

  test("marks rooms the user belongs to as isMember true", () => {
    const memberIds = new Set(["aaa111", "ccc333"]);
    const result = markMembership([room1, room2, room3], memberIds);
    assert.equal(result[0].isMember, true);
    assert.equal(result[1].isMember, false);
    assert.equal(result[2].isMember, true);
  });

  test("marks all rooms false when the user has no memberships", () => {
    const result = markMembership([room1, room2], new Set());
    assert.equal(result[0].isMember, false);
    assert.equal(result[1].isMember, false);
  });

  test("does not mutate the original room objects", () => {
    const rooms = [{ _id: "xxx", name: "Test" }];
    markMembership(rooms, new Set(["xxx"]));
    assert.equal(rooms[0].isMember, undefined);
  });

  test("returns empty array for empty input", () => {
    const result = markMembership([], new Set(["aaa111"]));
    assert.deepEqual(result, []);
  });

  test("preserves all original fields on each room", () => {
    const rooms = [{ _id: "aaa111", name: "Alpha", tags: ["ts"], description: "desc" }];
    const result = markMembership(rooms, new Set(["aaa111"]));
    assert.equal(result[0].name, "Alpha");
    assert.deepEqual(result[0].tags, ["ts"]);
    assert.equal(result[0].description, "desc");
  });
});
