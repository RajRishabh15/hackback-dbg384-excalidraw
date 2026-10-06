# HACKBACK code review · DBG-384 · Live Collaborative Whiteboard
- Reviewed at: 2026-10-06T08:27:09Z (2026-10-06T13:57:09 IST)
- Judged commit: bfb85d790a83ed1782beef6e4bed9c3f83ed3872 (2026-10-06T12:57:02+05:30) · the last commit before the code freeze
- Reviewer: AI agent run by a HACKBACK judge

| Section | Score | Why (path:line) |
|---|---|---|
| A. Core flow | 20/30 | Drawing, sync, and cursors work (client/src/engine.ts:518). Rooms exist (server/src/yjs-ws.ts:22). End-to-end encryption is missing (server/src/yjs-ws.ts:60). |
| B. Killer Tests | 20/30 | Tests 1 and 2 pass. Test 3 fails. |
| C. Two improvements | 5/20 | Firebase fix was attempted by rewriting the backend, but size limits/rollbacks are missing (server/src/routes/boards.ts:102). Burn-after-read not built. |
| D. Built from their docs | 0/10 | The code uses Express/SQLite/Yjs instead of Firebase/E2E/REST specified in the docs (docs/API.md:10 vs server/src/yjs-ws.ts:105). |
| E. Engineering | 5/10 | Added auth checks (server/src/routes/boards.ts:10), but has a hardcoded JWT secret (server/src/auth.ts:7) and lacks input size validation on snapshots. |
| Total | 50/100 | |

Killer Tests:
1. READY · 10/10 · Uses WebSockets and Yjs to push updates in real-time (server/src/yjs-ws.ts:117).
2. READY · 10/10 · Uses Yjs CRDT for deterministic merging of conflicting edits (server/src/yjs-ws.ts:3).
3. MISSING · 0/10 · Server reads and saves elements as plaintext JSON instead of encrypted ciphertext (server/src/yjs-ws.ts:60).

Improvements:
1. Lock Down the Open Firebase Security Rules (Gap #1) · 5/10 · Replaced Firebase entirely with Express and added ownership checks (server/src/routes/boards.ts:54), but missing size limits and rollback prevention (server/src/routes/boards.ts:102).
2. Burn-After-Read Sketches · 0/10 · Feature is entirely missing. No logic found in client or server for `burn` or `viewsLeft`.

Flags:
- Committed secrets: `server/src/auth.ts:7` contains a hardcoded fallback `JWT_SECRET`.

3 questions for the judges to ask this team in their Defence, aimed at the weakest spots you found:
1. You completely abandoned the architecture described in your DATA_MODEL and API docs, switching to an Express/SQLite/Yjs backend. Why did you switch stacks entirely, and why weren't the docs updated?
2. The core problem requires "rooms the server itself cannot read", but your backend parses and stores the room state as plaintext JSON (`elements_json`). Why was end-to-end encryption dropped?
3. You promised a "Burn-After-Read" feature in your GAPS.md, but it is completely missing from the codebase. Did you run out of time, or was there a technical blocker?

SCORE core=20 kt=20 imp=5 docs=0 eng=5 total=50
