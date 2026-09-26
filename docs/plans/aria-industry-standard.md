# ARIA.ai: industry-standard rework

Run: "ARIA auth rewrite + dead UI cleanup". Monitor: http://localhost:7777

## Goal

ARIA.ai becomes an honest product. A user signs up with one form (email, username,
password) and signs in with email and password. Every visible control does something
real. Every number and list on screen comes from the database, never from hardcoded
values or mock JSON.

## Scope

In:
- Direct registration and login (passport local + JWT). The OTP flow, its fields, and
  its endpoints are gone.
- Server-side validation on every write. Inline errors and loading states in the
  client, never `alert()`. Any 401 from the API clears the stored token and sends the
  user to `/login`.
- Rooms get a public/private flag, a description, and tags. Public rooms are listed on
  a new Explore page with one-click join. Private rooms are join-by-code only.
- Profile shows the real user: username, email, joined date, editable bio and skills,
  real counts (rooms owned, rooms joined, messages sent, AI prompts asked), the real
  room list, and real recent activity.
- Header "Search rooms" filters the dashboard room list live.
- Every dead control is wired or removed: sidebar "Recent Activity" and "Settings",
  header bell, chat header Search/Pin/Help, landing nav/footer `#` links and the
  href-less "Get Started", the disabled GitHub button, the "coming soon" room fields.
- Landing page marketing numbers (50k+ developers, 200+ integrations, 99.9% uptime)
  are removed. Unused `client/src/data/*.json` files are deleted.

Out:
- GitHub OAuth, notifications, real email delivery, password reset, avatar upload.
- Restyling anything that already works.

## Acceptance

- A new user can register on `/signup` in one step, is taken to `/login`, signs in,
  and lands on `/dashboard`. Bad input shows an inline message next to the form.
- Registering with an existing email or username returns 409 with a clear message.
- Any protected page with an expired or missing token ends up at `/login`.
- Creating a room with description, tags and public/private saves all four fields;
  they show on the room card and in the chat header.
- `/explore` lists public rooms only; joining one from there opens it.
- Private rooms never appear on `/explore`; they can still be joined by code.
- `/profile` shows the signed-in user's real data; bio and skills can be edited and
  persist across reload. Counts match what the database holds.
- No control in the client is a no-op. No `href="#"`. No `disabled` "coming soon".
- `grep -rn "pravatar\|50k+\|142\|Alex Chen\|coming soon" client/src` finds nothing.
- Client lint and build pass. Server tests pass and need no database or network.

## Fixed contracts

These are the only shapes the slices share. Everything else is the builder's call.

- JWT payload stays `{ id, username }`, signed with `JWT_SECRET`, 7 day expiry,
  sent as `Authorization: Bearer <token>`. Stored in `localStorage` under `token`.
- API errors are `{ message: string }` with a 4xx/5xx status. Validation errors may
  add `errors: { [field]: string }`.
- `User` model (owned by slice A) has: `email`, `username`, `password` (bcrypt hash),
  `bio` (string, default "", max 300), `skills` (array of strings, max 10, each max
  30), and `timestamps: true`. No verification fields.
- `Room` model (owned by slice B) adds: `description` (string, default "", max 300),
  `tags` (array of strings, max 8, each max 24), `isPrivate` (boolean, default true).
  A room with no `isPrivate` field is treated as private.
- Route mounting in `server/index.js` is touched only by slice C (to add
  `/api/users`). `/api/auth` and `/api/rooms` prefixes do not change.
- `server/package.json` is touched only by slice A (adds the `test` script). Other
  slices put tests under `server/test/*.test.js` and rely on that script.
- `client/src/lib/api.js` is owned by slice A. Other slices call `API` and rely on its
  401 handling; they do not add their own redirect-on-401.
- Socket events and `useSocket.js` do not change.
- Existing route paths in `client/src/App.jsx`: slice B adds `/explore`; nothing else
  changes there.

## Verification commands

Client (run in `client/`):
- Lint: `npm run lint`
- Build: `npm run build`

Server (run in `server/`):
- Syntax: `node --check <file>` per changed file
- Tests: `npm test` (Node built-in runner, `node --test`; slice A adds the script).
  Tests must run with no database and no network.

The dev servers are already running (client :5173, server :3000). Builders do not
start, stop, or restart them, and do not run tests.

## Slices

### A. Auth
Delivers: one-step register, login, User model cleanup, validation, axios 401
handling, server test runner.
Owns: the register/login flow end to end, the `User` model, `client/src/lib/api.js`,
the signup and login pages, `server/package.json`.

### B. Rooms
Delivers: public/private rooms, description and tags, Explore page, dashboard search
filter, dashboard shell cleanup (sidebar, header).
Owns: the rooms domain (model, controller, routes), the create-room form, room cards,
the Explore page and its route, the dashboard page, sidebar and header.

### C. Profile and cleanup
Delivers: real profile with `GET/PATCH /api/users/me` and stats, landing page and
chat header cleanup, deletion of mock JSON.
Owns: the users API and its mounting in `server/index.js`, the profile page, the
landing page, the chat header, `client/src/data/`.

## Log

### Slice A, attempt 1: DONE, sent back (76k tokens)
Delivered register/login, User model, api.js 401 interceptor, signup/login pages,
`node --test` script, `server/test/auth.test.js`.
Reviewed. Sent back as A2 for:
- A failed login returns 401, which the new global interceptor turns into a page
  reload to `/login`, so the inline "Invalid credentials" message is never seen.
- Validation is weaker than industry standard: no email format check, no username
  rules, password floor 6. Decision: email must be a valid address, username 3-20
  chars of letters/digits/underscore, password min 8.
- Tests exercise copies of the validation logic, not the real code.
### Slice A2: DONE, accepted (69k tokens)
Validation moved to `server/utils/validation.js` (email format, username 3-20
`[A-Za-z0-9_]`, password min 8), mirrored inline in the signup form; login 401 no
longer triggers the global redirect; tests import the real module.
Note for later: a duplicate-key race on register would surface as 500 rather than
409. Accepted as is.

### Slice C, attempt 1: DONE, sent back (99k tokens)
Delivered `GET/PATCH /api/users/me` with stats, profile rewrite (initial avatar,
editable bio/skills, stats, room list), landing cleanup (stats row gone, nav and
footer links real), chat header icons removed, mock JSON deleted, 9 controller tests
against the real controller with mocked models.
Reviewed. Sent back as C2 for:
- Profile room list links to `/chat/:id`; the app's route is `/room/:id`. Dead link.
- Room list shows only rooms the user owns; it must show every room the user is an
  active member of.
- "Recent activity" is missing entirely (acceptance requires it).
- "Rooms Joined" counts the user's own rooms too. Decision: joined = active
  memberships with role member; owned = role owner.
- Chat header must show the room description (acceptance). `chatRoom.jsx` was
  unassigned; C2 owns it for this purpose. Socket events still do not change.

### Slice B, attempt 1: DONE, sent back (118k tokens)
Delivered Room fields, `GET /rooms/explore`, Explore page, create-room form with
description/tags/privacy, dashboard search filter, sidebar/header cleanup, room
card badges, 11 tests for room code generation and field validation.
Reviewed. Sent back as B2 for:
- The room invite code was removed from the room card and now appears nowhere, so
  the owner of a private room has no way to share it. Decision: members see the
  code on the card with a copy action.
- The header search box renders on the profile page with no handler: a dead control.
- Explore shows "Join" for rooms the user already belongs to. Decision: show "Open".

### Slice B2: DONE, accepted (token count not reported)
Invite code with one-click copy on private room cards; header search renders only
when a handler is passed; `GET /rooms/explore` annotates `isMember` and Explore shows
"Open Room" for those. Room helpers moved to `server/utils/roomHelpers.js` and the
tests import the real module. Compile clean.

### Slice C2: DONE, accepted (token count pending)
Profile links fixed to `/room/:id`; room list is every active membership with a
role badge; stats derived from membership roles; real activity feed (room created,
room joined, message sent, AI prompt) newest first; chat header shows description
and tags fetched via `GET /rooms/:id`; six new controller tests. Compile clean.

### Gate 2 (user decisions)
- Code accepted; run tests, lint, build and the live Atlas walk-through.
- `server/passport.js` `isVerified` guard: user explicitly authorized its removal.
  Removed by the orchestrator (one-line seam fix).
- Pre-existing lint errors in 4 untouched UI/config files: user chose a cleanup
  slice D (owns exactly those 4 files, no rule weakening).

### Verification, round 1
- `npm test` (server): 46/46 pass.
- API walk-through: validation 400 with per-field errors, register 201, duplicate
  409, wrong password 401, login OK, private and public room created with all
  fields, explore lists only the public room.
- Found: an Atlas TLS flake during `GET /users/me` surfaced as Express's default
  HTML error page with a stack trace (500). No JSON error handler exists. Sent as
  slice E (owns `server/index.js` and controller error paths).
- UI walk-through: one-step signup with inline per-field errors, redirect to
  `/login`, wrong password stays on page with inline error, login lands on
  dashboard, Explore lists only the public room. Joining it hit repeated Atlas
  TLS drops; the server survived (db.js listeners) and the room page showed the
  failure inline. Retry pending on network.

### Slice D: BLOCKED (70k tokens)
The brief listed 4 files; lint actually reports a 6th error in
`client/src/components/ui/BitFlipText.jsx`. Decision: widen the boundary to 5
files. Respawned as D2.

### Verification, round 2
- Server restarted with slice E: unknown `/api` route returns JSON 404; 54/54 tests.
- Found live: socket authentication reports any failure, including a DB drop during
  user lookup, as "Invalid token". Users with a valid session are told their token
  is bad. Sent as slice F (socket auth classification + client handling).
- Atlas is dropping the TLS session every few seconds on this network; the server
  now survives it, but the browser walk-through of the room page cannot complete
  until it settles. REST calls succeed on retry.
- UI verified between drops: create-room form saves name, description, two tags
  and private flag; new room opened with "1 online"; dashboard shows Private/Owner
  badges, description, tags, "Invite code: HKCT5N" with copy control; profile shows
  0 owned / 1 joined, the joined room with role, and a real activity entry.
- Not verified in the browser (pane stopped drawing, Atlas dropping): room header
  description/tags, bio editor click-through. Both verified at the API level
  (`GET /rooms/:id` returns description/tags; `PATCH /users/me` persists and
  re-reads).

### Slice D2: DONE, accepted (77k tokens)
Five files, no behaviour change, no rule weakening. `npm run lint`: 0 problems.

### Verification, final
- Server `npm test`: 65/65 pass. Client `npm run lint`: 0 problems. Client
  `npm run build`: pass.
- Server restarted with all slices: JSON 404 on unknown route, login OK,
  `rooms/mine` returns both rooms with `isPrivate`, `users/me` returns real stats
  (1 owned, 1 joined) and room list, bad token 401.
- Note, accepted as is: on a socket auth error the client goes to `/login` but does
  not clear the stored token; the REST 401 interceptor clears it on the next call.

### Slice F: DONE, accepted
`server/utils/socketAuth.js`: bad/expired/missing token and unknown user are
`type: "auth"`; any failure during user lookup is `type: "server_error"`. Client
sends auth errors to `/login` and stops reconnecting; server errors show a
"temporarily unavailable, retrying" banner and let Socket.IO reconnect. 11 tests.

### Slice E: DONE, accepted
`server/utils/errorMiddleware.js`: JSON 404 for unknown `/api` routes, JSON 500
with a generic message for unexpected errors, full error logged server-side, no
stack in responses. 7 tests.
