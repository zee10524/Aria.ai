// Pure helpers for the message domain -- no mongoose, no I/O.
// Imported by chatHandler, messageController, and the test suite.

/**
 * Toggle a single user's reaction on a reactions array.
 *
 * @param {Array<{emoji: string, users: string[]}>} reactions - current reactions
 * @param {string} emoji - the emoji being toggled
 * @param {string|object} userId - the acting user's id (coerced to string)
 * @returns {Array<{emoji: string, users: string[]}>} new reactions array
 */
function toggleReaction(reactions, emoji, userId) {
  const uid = String(userId);
  const idx = reactions.findIndex((r) => r.emoji === emoji);

  if (idx === -1) {
    // No entry for this emoji yet -- add one.
    return [...reactions, { emoji, users: [uid] }];
  }

  const entry = reactions[idx];
  const hasUser = entry.users.some((u) => String(u) === uid);

  const newUsers = hasUser
    ? entry.users.filter((u) => String(u) !== uid)
    : [...entry.users, uid];

  if (newUsers.length === 0) {
    // Remove the emoji entry entirely when no users remain.
    return [...reactions.slice(0, idx), ...reactions.slice(idx + 1)];
  }

  return [
    ...reactions.slice(0, idx),
    { emoji, users: newUsers },
    ...reactions.slice(idx + 1),
  ];
}

/**
 * Ensure every message leaving the server carries reactions and replyTo,
 * even for documents saved before those fields existed.
 */
function normalizeMessage(msg) {
  return {
    ...msg,
    reactions: msg.reactions ?? [],
    replyTo: msg.replyTo ?? null,
  };
}

module.exports = { toggleReaction, normalizeMessage };
