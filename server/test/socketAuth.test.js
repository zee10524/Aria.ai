"use strict";

// Unit tests for socket authentication classification.
// No database, no network, no Express server started.

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const SECRET = "test-secret";

// Set JWT_SECRET before requiring socketAuth so that jwt.verify uses it.
before(() => {
  process.env.JWT_SECRET = SECRET;
});

const {
  classifyAuthError,
  makeSocketAuthMiddleware,
} = require("../utils/socketAuth");

// ---------------------------------------------------------------------------
// classifyAuthError
// ---------------------------------------------------------------------------

describe("classifyAuthError", () => {
  it("classifies JsonWebTokenError as auth", () => {
    const err = new jwt.JsonWebTokenError("invalid signature");
    const result = classifyAuthError(err);
    assert.equal(result.type, "auth");
    assert.equal(typeof result.message, "string");
  });

  it("classifies TokenExpiredError as auth", () => {
    const err = new jwt.TokenExpiredError("jwt expired", new Date());
    const result = classifyAuthError(err);
    assert.equal(result.type, "auth");
  });

  it("classifies a generic database error as server_error", () => {
    const err = new Error("MongoNetworkError: connection timed out");
    const result = classifyAuthError(err);
    assert.equal(result.type, "server_error");
  });

  it("classifies an ECONNRESET error as server_error", () => {
    const err = new Error("ECONNRESET");
    err.code = "ECONNRESET";
    const result = classifyAuthError(err);
    assert.equal(result.type, "server_error");
  });
});

// ---------------------------------------------------------------------------
// makeSocketAuthMiddleware - bad / missing token
// ---------------------------------------------------------------------------

describe("makeSocketAuthMiddleware: bad token", () => {
  // findUser stub that should never be reached for bad-token cases
  const unreachable = async () => {
    throw new Error("findUser should not be called");
  };

  it("calls next with auth error for a missing token", async () => {
    const mw = makeSocketAuthMiddleware(unreachable);
    const socket = { handshake: { auth: {}, headers: {} } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.ok(err instanceof Error, "expected an error");
        assert.equal(err.data?.type, "auth");
        resolve();
      });
    });
  });

  it("calls next with auth error for a malformed JWT", async () => {
    const mw = makeSocketAuthMiddleware(unreachable);
    const socket = { handshake: { auth: { token: "not.a.real.token" } } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.ok(err instanceof Error, "expected an error");
        assert.equal(err.data?.type, "auth");
        resolve();
      });
    });
  });

  it("calls next with auth error for a JWT signed with the wrong secret", async () => {
    const wrongToken = jwt.sign({ id: "abc" }, "wrong-secret");
    const mw = makeSocketAuthMiddleware(unreachable);
    const socket = { handshake: { auth: { token: wrongToken } } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.ok(err instanceof Error, "expected an error");
        assert.equal(err.data?.type, "auth");
        resolve();
      });
    });
  });

  it("calls next with auth error for an expired JWT", async () => {
    // expiresIn: 0 produces a token that is immediately expired
    const expiredToken = jwt.sign({ id: "abc" }, SECRET, { expiresIn: 0 });
    // Advance the exp check by signing with a date far in the past
    const pastToken = jwt.sign({ id: "abc", iat: Math.floor(Date.now() / 1000) - 3600 }, SECRET, { expiresIn: 1 });
    // Simpler: use a token with expiresIn: -1 equivalent
    const alreadyExpired = jwt.sign({ id: "abc" }, SECRET, { expiresIn: "1ms" });

    const mw = makeSocketAuthMiddleware(unreachable);
    const socket = { handshake: { auth: { token: expiredToken } } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.ok(err instanceof Error, "expected an error");
        assert.equal(err.data?.type, "auth");
        resolve();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// makeSocketAuthMiddleware - server failure
// ---------------------------------------------------------------------------

describe("makeSocketAuthMiddleware: server failure", () => {
  it("calls next with server_error when findUser throws", async () => {
    const validToken = jwt.sign({ id: "abc123" }, SECRET);
    const mw = makeSocketAuthMiddleware(async () => {
      throw new Error("MongoNetworkError: connection timed out");
    });
    const socket = { handshake: { auth: { token: validToken } } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.ok(err instanceof Error, "expected an error");
        assert.equal(err.data?.type, "server_error");
        resolve();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// makeSocketAuthMiddleware - user not found
// ---------------------------------------------------------------------------

describe("makeSocketAuthMiddleware: user not found", () => {
  it("calls next with auth error when findUser returns null", async () => {
    const validToken = jwt.sign({ id: "abc123" }, SECRET);
    const mw = makeSocketAuthMiddleware(async () => null);
    const socket = { handshake: { auth: { token: validToken } } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.ok(err instanceof Error, "expected an error");
        assert.equal(err.data?.type, "auth");
        resolve();
      });
    });
  });

  it("attaches the user to socket and calls next without error for valid token + found user", async () => {
    const validToken = jwt.sign({ id: "abc123" }, SECRET);
    const fakeUser = { _id: "abc123", username: "alice", email: "a@b.com" };
    const mw = makeSocketAuthMiddleware(async () => fakeUser);
    const socket = { handshake: { auth: { token: validToken } } };
    await new Promise((resolve) => {
      mw(socket, (err) => {
        assert.equal(err, undefined, "should not pass an error");
        assert.equal(socket.user, fakeUser);
        resolve();
      });
    });
  });
});
