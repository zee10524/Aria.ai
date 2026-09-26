# ARIA.ai: whiteboard and real-time extras

Run: "ARIA whiteboard + realtime extras". Monitor: http://localhost:7777
Base: branch `feat/industry-standard-rework`, clean tree at start.

## Goal

Developers in a room can think together, not just talk. A shared whiteboard lets any
member sketch an idea and everyone sees it appear as it is drawn. Chat gets
reactions and replies. Rooms show how much you missed, and Gemini can catch you up
on what was discussed while you were away.

## Scope

In:
- Whiteboard per room: pen, rectangle, ellipse, line, arrow, text, eraser; colour and
  stroke width; undo of your own last element; owner-only clear with confirmation;
  live cursors of other members with their username; export as PNG. Opened from a
  "Board" toggle in the room header that swaps the chat area for the canvas; the
  members panel stays. Board state persists per room and loads on open.
- Message reactions (emoji, toggle on/off, live for everyone) and reply-to (a
  message can quote the one it answers; the quote shows in the list).
- Unread counts: every room in the sidebar and on the dashboard shows how many
  messages arrived since the user last had the room open. Opening the room clears it.
  Counts refresh when those pages load; they do not need to tick live.
- AI "Catch me up": a control in the room; Gemini summarises the messages posted
  since the user's previous visit to that room (not the current one). Shows the
  summary and how many messages it covered. If nothing was missed, says so without
  calling Gemini.

Out:
- Infinite canvas, image paste, layers, board version history, offline sync.
- Threaded views for replies (reply is a quote, not a thread).
- Live-ticking unread badges outside the room.
- Any change to auth, rooms CRUD, profile, Explore.

## Acceptance

- Two members in the same room: one draws, the other sees the stroke within the
  same second, and sees the drawer's cursor with their name while they draw.
- Reload the room: the board is exactly as it was.
- Undo removes only the undoer's last element for everyone. Eraser removes any
  element it touches, for everyone. Clear is refused for non-owners and confirmed
  for the owner; afterwards everyone's board is empty.
- Export downloads a PNG of the current board.
- Reacting to a message shows the emoji and count to everyone at once; reacting
  again removes it. Replying shows the quoted message above the reply for everyone,
  and after reload.
- Sidebar and dashboard show an unread badge with the right number; opening the room
  then returning shows no badge.
- "Catch me up" returns a readable summary of exactly the messages since the user's
  previous visit; with no missed messages it says so and makes no Gemini call.
- Every board, reaction and read-tracking action is refused for non-members.
- Server tests pass with no database or network. Client lint and build pass.

## Fixed contracts

These are the only shapes the slices share. Everything else is the builder's call.

Existing, do not change: JWT `{ id, username }`; API errors `{ message }` with
4xx/5xx; socket auth and the existing events `room:join`, `room:leave`,
`message:send`, `message:new`, `room:history`, `room:onlineUsers`, `typing:*`,
`ai:typing`; membership rules (only active members may act in a room).

Board wire contract (slice A-server implements, slice A-client consumes):
- `GET /api/rooms/:roomId/board` → `{ elements: BoardElement[] }` (members only).
- Logical canvas is 1600 x 900 units; all coordinates are in those units. The client
  scales to its viewport.
- `BoardElement`: `{ id: string (client-generated, unique), type: "pen" | "rect" |
  "ellipse" | "line" | "arrow" | "text", points?: [{ x, y }] (pen), x?, y?, w?, h?
  (rect, ellipse, text), x1?, y1?, x2?, y2? (line, arrow), text?, color: string,
  width: number, createdBy: userId, createdAt: ISO string }`.
- Client → server (all carry `roomId`):
  `board:add { element }`; `board:remove { elementIds }` (eraser, any member);
  `board:undo {}` (server removes the sender's most recent element);
  `board:clear {}` (owner only); `board:cursor { x, y }` (not persisted).
- Server → room: `board:added { element }` to others; `board:removed { elementIds }`
  to all; `board:cleared {}` to all; `board:cursor { userId, username, x, y }` to
  others; `error { message }` to the sender on refusal.
- At most 5000 elements per board; `board:add` beyond that is refused.

Messages (slice B):
- `Message` gains `replyTo` (message id or null) and `reactions`
  `[{ emoji: string, users: [userId] }]`.
- `message:send` accepts optional `replyTo`. Every message the client receives
  (`message:new`, `room:history`, `GET /rooms/:roomId/messages`) carries
  `reactions` and, when set, `replyTo` populated as `{ _id, content, type, sender:
  { _id, username } }`.
- New: client → server `message:react { roomId, messageId, emoji }` toggles the
  sender's reaction; server → room `message:reactions { messageId, reactions }`.

Read tracking (slice C):
- `RoomMembership` gains `lastReadAt`. Joining a room (socket `room:join`), leaving
  it and disconnecting from it set it to now.
- `GET /rooms/mine` items gain `unreadCount`: messages in that room newer than
  `lastReadAt`, excluding the user's own. Missing `lastReadAt` means everything is
  unread.
- `POST /api/rooms/:roomId/catch-up` → `{ summary: string, messageCount: number,
  since: ISO string | null }`. Covers messages since the user's previous visit.
  `messageCount` 0 returns a fixed message and does not call Gemini. Uses
  `GEMINI_API_KEY` and `GEMINI_MODEL` as the chat AI already does.

Shared files: `server/socket/chatHandler.js`, `client/src/pages/chatRoom.jsx`,
`client/src/hooks/useSocket.js` are touched by more than one slice. Each slice keeps
its edits confined to its own feature and adds new handlers in its own module where
that is natural. Slice A-server registers board handlers from its own module, wired
in `server/index.js`, and does not edit `chatHandler.js`.

## Verification commands

Client (in `client/`): `npm run lint`, `npm run build`.
Server (in `server/`): `node --check <file>` per changed file; `npm test`
(`node --test`, tests under `server/test/*.test.js`, no database, no network).

Dev servers are already running (client :5173, server :3000). Builders do not
start, stop or restart them and do not run tests.

## Slices

Phase 1, in parallel:

### A-server. Board backend
Delivers: board persistence, the board REST read, and the board socket events per
the wire contract, with membership and owner checks.
Owns: the board domain on the server (its own model, module and tests) and one line
of wiring in `server/index.js`.

### B. Reactions and replies
Delivers: reactions and reply-to end to end: storage, socket events, history and
REST payloads, and the chat UI (react control on a message, reply control, quoted
message in the list, reply state in the composer).
Owns: the message domain (model, message controller), the `message:*` socket
handling, the message list and composer, and the reaction/reply parts of the socket
hook.

### C. Unread and catch-up
Delivers: read tracking, unread counts on sidebar and dashboard, the catch-up
endpoint and its control and result view in the room's members panel.
Owns: `RoomMembership`, the read-tracking touches in `room:join` / `room:leave` /
`disconnect`, the rooms listing response, the sidebar and dashboard badges, the
catch-up endpoint, and the members panel.

Phase 2, after B and C are accepted:

### A-client. Whiteboard UI
Delivers: the Board toggle in the room header, the canvas with all tools, live
strokes and cursors, undo, eraser, owner clear with confirmation, PNG export,
loading the persisted board on open.
Owns: the whiteboard UI, the room page's chat/board switch, the room header's Board
toggle, and the board parts of the socket hook.

## Log

### A-server, attempt 1: DONE, sent back (token count not reported)
Delivered `Board` model, `GET /rooms/:roomId/board`, `board:add/remove/undo/clear/
cursor` in `server/socket/boardHandler.js`, server-stamped `createdBy`/`createdAt`,
12 tests on the pure helpers.
Reviewed. Sent back as A-server-2 for:
- `board:cursor` forwards to the room with no membership check; a non-member
  socket can broadcast cursors into any room. Acceptance requires refusal.
- `board:add` stores whatever `element` the client sends; type, id and required
  fields are not validated before persisting.
- Tests cover only the pure helpers; the refusal paths (non-member, non-owner
  clear, element cap) are untested.

### A-server-2: DONE, accepted (token count not reported)
`validateElement` enforces the `BoardElement` contract before persisting; all
board events go through a membership check, cursors via a per-socket approved-room
cache (one lookup per socket and room); 40 handler and helper tests with stubbed
models. Note, accepted as is: the cursor cache is not invalidated if a membership
is revoked mid-session; the socket's next reconnect clears it.

### Gate 2 (user decision)
Code accepted; run tests, lint, build, restart the server and do the live
two-tab check on Atlas.

### Verification, round 1
- `npm test`: 140/140. Client lint 0 problems, build passes.
- Server start failed three times in a row on the initial Atlas connect (TLS
  alert 80), each time exiting via `process.exit(1)` in `db.js`. Decision: this
  is a product defect on a flaky network, not just an environment problem. Sent
  as slice D (retry initial connect with backoff, keep listening, exit only after
  the last attempt).
- Noted, for a later slice: with the API unreachable, the login page says
  "Invalid email or password." because a network error has no response body.

### D: DONE, accepted (65k tokens)
`db.js` retries the initial connect with exponential backoff (defaults 8 attempts,
1s base, 30s cap; `DB_RETRY_*` env overrides), exits only after the last attempt.
6 tests with connect and sleep injected. Suite now 146/146.

### Verification, round 2
- Server up after a manual retry. API: `rooms/mine` carries `unreadCount` (2 in
  the room with missed messages, 0 elsewhere); `GET /rooms/:id/board` 200 for a
  member, 403 for a non-member; catch-up with 0 missed returns the fixed reply;
  catch-up with 2 missed returned a real Gemini summary, `messageCount: 2`.
- UI: dashboard shows the unread badge; room header shows description, tags and
  the Board toggle; the board opens with the full toolbar; "Catch me up" sits in
  the members panel. Atlas drops kept the socket in "temporarily unavailable,
  retrying" for part of the check.

### Verification, round 3 (live, two clients)
- Persistence: rectangle drawn in one tab, room reloaded in another tab, board
  shows the rectangle; API returns it in logical units with server-stamped
  `createdBy`/`createdAt`.
- Live delivery: an independent socket client in the room logged `board:cursor`
  events during a drag and `board:added ellipse` on release.
- Undo: the drawer's last element (ellipse) removed, rectangle kept.
- Owner clear: "Clear all?" confirmation shown; after Yes the API returns no
  elements.
- Chat: message, reply with quote, and a 🚀 reaction (count 1) appeared on a
  second socket that was on the board at the time.
- Not exercised: PNG export (a download; client-side canvas only) and the eraser
  and text tools by hand. Their logic is unit-tested on the server side where it
  exists.
- Environment: Atlas dropped the TLS session repeatedly throughout; slice D's
  startup retry is in place, the process survives later drops, and the UI shows
  "temporarily unavailable, retrying" while a socket is down.

### A-client: DONE, accepted (116k tokens)
`WhiteBoard.jsx` (Canvas 2D, no new dependency): pen, rect, ellipse, line, arrow,
text (overlay input), eraser by hit-test, colour and width, undo, owner clear with
confirmation, PNG export; live cursors with username; optimistic local add;
board fetched from REST on every open; 50 ms cursor throttle in the socket hook;
Board/Chat toggle in the header. Note, accepted as is: other members see a stroke
when it completes, not mid-stroke; remote cursors linger at their last position
until that member disconnects (no cursor-left event in the contract).

### B: DONE, accepted (90k tokens)
`Message` gains `replyTo` and `reactions`; `message:react` toggles with membership
and room checks and broadcasts `message:reactions`; history and REST payloads
normalised; hook holds reply state; list shows quote, reactions bar, 6-emoji
picker; composer shows reply preview. 13 tests on the real helpers.

### C, attempt 1: DONE, sent back (91k tokens)
Delivered `lastReadAt`/`previousLastReadAt`, read tracking on join/leave/
disconnect, `unreadCount` on `/rooms/mine`, badges, `POST /rooms/:id/catch-up`
with Gemini injected, catch-up card in the members panel.
Reviewed. Sent back as C2 for:
- `test/catchUp.test.js` re-implements the controller's logic inline and tests
  the copy (the file says so). Tests must exercise the real controller.
- Unread counts load every message's timestamp for every room into memory on
  each dashboard load. Counting must happen in the database.
Decision: C2 is server-only, so A-client starts now in parallel.

### C2: DONE, accepted (token count not reported)
Catch-up tests call the real `_catchUp` with stubbed models and injected Gemini
(5 tests). Unread counts now come from one `countDocuments` per room, honouring
each membership's `lastReadAt` and excluding own messages (7 tests). Compile clean.
