"use strict";

// Pure unit tests for auth validation logic.
// No database, no network, no Express, no imports that require env vars.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateRegisterInput,
  normalizeEmail,
  buildJwtPayload,
} = require("../utils/validation");

describe("validateRegisterInput", () => {
  it("returns no errors for valid input", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "alice123",
      password: "secret123",
    });
    assert.deepEqual(errs, {});
  });

  it("flags missing email", () => {
    const errs = validateRegisterInput({
      email: "",
      username: "alice123",
      password: "secret123",
    });
    assert.ok("email" in errs);
  });

  it("flags syntactically invalid email", () => {
    const errs = validateRegisterInput({
      email: "notanemail",
      username: "alice123",
      password: "secret12",
    });
    assert.ok("email" in errs);
  });

  it("flags email without domain", () => {
    const errs = validateRegisterInput({
      email: "user@",
      username: "alice123",
      password: "secret12",
    });
    assert.ok("email" in errs);
  });

  it("flags missing username", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "  ",
      password: "secret123",
    });
    assert.ok("username" in errs);
  });

  it("flags username shorter than 3 characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "ab",
      password: "secret12",
    });
    assert.ok("username" in errs);
  });

  it("flags username longer than 20 characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "a".repeat(21),
      password: "secret12",
    });
    assert.ok("username" in errs);
  });

  it("flags username with disallowed characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "alice!",
      password: "secret12",
    });
    assert.ok("username" in errs);
  });

  it("accepts username of exactly 3 characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "abc",
      password: "secret12",
    });
    assert.equal("username" in errs, false);
  });

  it("accepts username of exactly 20 characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "a".repeat(20),
      password: "secret12",
    });
    assert.equal("username" in errs, false);
  });

  it("accepts username with underscore and digits", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "alice_99",
      password: "secret12",
    });
    assert.equal("username" in errs, false);
  });

  it("flags password shorter than 8 characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "alice123",
      password: "1234567",
    });
    assert.ok("password" in errs);
  });

  it("accepts password of exactly 8 characters", () => {
    const errs = validateRegisterInput({
      email: "user@example.com",
      username: "alice123",
      password: "abcdefgh",
    });
    assert.equal("password" in errs, false);
  });

  it("flags all three fields when all are empty", () => {
    const errs = validateRegisterInput({ email: "", username: "", password: "" });
    assert.ok("email" in errs);
    assert.ok("username" in errs);
    assert.ok("password" in errs);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims email", () => {
    assert.equal(normalizeEmail("  Alice@Example.COM  "), "alice@example.com");
  });
});

describe("buildJwtPayload", () => {
  it("contains id and username", () => {
    const payload = buildJwtPayload({ _id: "abc123", username: "alice" });
    assert.equal(payload.id, "abc123");
    assert.equal(payload.username, "alice");
  });

  it("does not include email or password", () => {
    const payload = buildJwtPayload({
      _id: "abc123",
      username: "alice",
      email: "alice@example.com",
      password: "hashed",
    });
    assert.equal("email" in payload, false);
    assert.equal("password" in payload, false);
  });
});
