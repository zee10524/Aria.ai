'use strict';
const mongoose = require("mongoose");

// Initial-connection retry configuration.
// The server retries a failed first connect with exponential backoff rather
// than exiting immediately.  Once connected, the existing "error" and
// "disconnected" listeners handle later drops (unchanged).
//
// Environment variables (all optional):
//   DB_RETRY_ATTEMPTS  total connection attempts before the process exits (default 8)
//   DB_RETRY_BASE_MS   delay before the second attempt, in ms; doubles each time (default 1000)
//   DB_RETRY_CAP_MS    maximum delay between any two attempts, in ms (default 30000)
//
// With the defaults the backoff series is (ms): 1000, 2000, 4000, 8000, 16000,
// 30000, 30000, then exit -- up to roughly 90 seconds of retries.

const DEFAULT_ATTEMPTS = 8;
const DEFAULT_BASE_MS = 1000;
const DEFAULT_CAP_MS = 30000;

function envInt(name, def) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : def;
}

// connectDB initiates the MongoDB connection with exponential-backoff retries.
//
// The first two parameters are injectable for testing and should be omitted
// in production:
//   _connect  async function that opens the connection (throws on error)
//   _sleep    async function that waits ms milliseconds
async function connectDB(_connect, _sleep) {
  const connect = _connect || (() => mongoose.connect(process.env.MONGODB_URI));
  const sleep =
    _sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  const maxAttempts = envInt("DB_RETRY_ATTEMPTS", DEFAULT_ATTEMPTS);
  const baseMs = envInt("DB_RETRY_BASE_MS", DEFAULT_BASE_MS);
  const capMs = envInt("DB_RETRY_CAP_MS", DEFAULT_CAP_MS);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await connect();
      console.log("MongoDB Connected");
      mongoose.connection.on("error", (err) => {
        console.error("MongoDB runtime error:", err.message);
      });
      mongoose.connection.on("disconnected", () => {
        console.error("MongoDB disconnected");
      });
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(
          `MongoDB: all ${maxAttempts} connect attempt(s) failed. Last error: ${err.message}`
        );
        process.exit(1);
        return; // unreachable in production
      }
      const delay = Math.min(baseMs * Math.pow(2, attempt - 1), capMs);
      console.error(
        `MongoDB connect attempt ${attempt}/${maxAttempts} failed (${err.message}). Retrying in ${delay} ms.`
      );
      await sleep(delay);
    }
  }
}

module.exports = connectDB;
