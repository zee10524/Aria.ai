'use strict';

// Tests for the connectDB retry logic in server/config/db.js.
// No database, no network, no real timers.
//
// The connect function and sleep (delay) are injected via the optional
// parameters connectDB accepts for testing.  process.exit is stubbed for the
// duration of tests that exhaust all attempts.
//
// Covered scenarios:
//   1. Succeeds on the first attempt -- no sleep, no exit.
//   2. Succeeds on a later attempt -- sleeps N-1 times, no exit.
//   3. Delay doubles each attempt and is capped by DB_RETRY_CAP_MS.
//   4. Exhausts all attempts -- calls process.exit(1), sleep count = attempts - 1.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const connectDB = require("../config/db");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Returns a connect stub that throws for the first `failCount` calls then resolves.
function makeConnect(failCount) {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= failCount) {
      throw new Error(`simulated failure ${calls}`);
    }
  };
}

// Returns a sleep stub that records every delay it receives.
function makeSleep() {
  const delays = [];
  const fn = async (ms) => {
    delays.push(ms);
  };
  fn.delays = delays;
  return fn;
}

// Runs `fn` with process.exit replaced by a stub that throws a tagged error.
// Returns { exitCode } after fn resolves or the stub fires.
async function withExitStub(fn) {
  const original = process.exit;
  let exitCode = null;
  process.exit = (code) => {
    exitCode = code;
    const err = new Error(`process.exit(${code})`);
    err.isExitStub = true;
    throw err;
  };
  try {
    await fn();
  } catch (err) {
    if (!err.isExitStub) {
      throw err;
    }
  } finally {
    process.exit = original;
  }
  return { exitCode };
}

// Temporarily sets env vars from an object, runs fn, then restores originals.
async function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k] of Object.entries(vars)) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("connectDB: succeeds on the first attempt", () => {
  it("returns without sleeping or exiting", async () => {
    const sleep = makeSleep();
    await connectDB(makeConnect(0), sleep);
    assert.equal(sleep.delays.length, 0, "no sleep when first attempt succeeds");
  });
});

describe("connectDB: succeeds on a later attempt", () => {
  it("retries and resolves when a later attempt succeeds", async () => {
    const sleep = makeSleep();
    await connectDB(makeConnect(2), sleep);
    assert.equal(sleep.delays.length, 2, "slept exactly twice before success");
  });

  it("each subsequent delay is greater than or equal to the previous", async () => {
    const sleep = makeSleep();
    await connectDB(makeConnect(3), sleep);
    for (let i = 1; i < sleep.delays.length; i++) {
      assert.ok(
        sleep.delays[i] >= sleep.delays[i - 1],
        `delay[${i}] should be >= delay[${i - 1}]`
      );
    }
  });
});

describe("connectDB: delay growth and cap", () => {
  it("doubles the base delay each attempt and caps at DB_RETRY_CAP_MS", async () => {
    // 6 failures, so we observe 6 sleep calls before success on attempt 7.
    // With base=1000 and cap=8000: 1000, 2000, 4000, 8000, 8000, 8000.
    const sleep = makeSleep();
    await withEnv(
      { DB_RETRY_ATTEMPTS: "8", DB_RETRY_BASE_MS: "1000", DB_RETRY_CAP_MS: "8000" },
      () => connectDB(makeConnect(6), sleep)
    );
    assert.equal(sleep.delays.length, 6);
    assert.equal(sleep.delays[0], 1000, "first retry delay");
    assert.equal(sleep.delays[1], 2000, "second retry delay");
    assert.equal(sleep.delays[2], 4000, "third retry delay");
    assert.equal(sleep.delays[3], 8000, "fourth retry delay hits cap");
    assert.equal(sleep.delays[4], 8000, "fifth retry delay stays at cap");
    assert.equal(sleep.delays[5], 8000, "sixth retry delay stays at cap");
  });
});

describe("connectDB: exhausts all attempts", () => {
  it("calls process.exit(1) after the final attempt fails", async () => {
    const sleep = makeSleep();
    const { exitCode } = await withEnv(
      { DB_RETRY_ATTEMPTS: "3" },
      () => withExitStub(() => connectDB(makeConnect(999), sleep))
    );
    assert.equal(exitCode, 1, "exits with code 1");
  });

  it("sleeps exactly maxAttempts-1 times before exiting", async () => {
    const sleep = makeSleep();
    await withEnv(
      { DB_RETRY_ATTEMPTS: "3" },
      () => withExitStub(() => connectDB(makeConnect(999), sleep))
    );
    // 3 attempts: sleep after attempt 1, sleep after attempt 2, exit after attempt 3
    assert.equal(sleep.delays.length, 2, "sleeps maxAttempts-1 times");
  });
});
