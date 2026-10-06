# Engineering Backlog & Task Breakdown

## Priority Classification
- **P0**: Core requirement for MVP / Alpha release.
- **P1**: Essential for Beta release and differentiation.
- **P2**: Post-launch enterprise enhancements.

---

## 1. Foundation & Engine (P0)

| Task ID | Title | Priority | Subsystem | Complexity | Description & Acceptance Criteria |
|---|---|:---:|---|:---:|---|
| **ENG-001** | Monorepo Setup & Tooling | P0 | Tooling | Medium | Scaffold Turborepo monorepo with apps (`web`, `api`, `realtime`) and packages (`editor`, `protocol`, `types`). Strict TypeScript configs. |
| **ENG-002** | Multi-Layer Canvas Viewport | P0 | Editor | High | Implement stacked HTML5 Canvas pipeline (`static`, `interaction`, `presence`). Viewport matrix math with smooth pan/zoom. |
| **ENG-003** | Spatial Quadtree Indexing | P0 | Editor | Medium | Build 2D spatial quadtree for sub-millisecond viewport culling of canvas elements. Query returns only visible bounding boxes. |
| **ENG-004** | Rough.js Path Memoization | P0 | Editor | Medium | Integrate Rough.js with deterministic random seed and LRU path caching to eliminate per-frame jitter. |
| **ENG-005** | Shape Primitives & Freehand | P0 | Editor | High | Implement Rectangle, Ellipse, Diamond, Line, Arrow, Freehand pen with pressure normalization. |

---

## 2. Realtime Synchronization & CRDT (P0)

| Task ID | Title | Priority | Subsystem | Complexity | Description & Acceptance Criteria |
|---|---|:---:|---|:---:|---|
| **ENG-010** | Yjs Document Store Integration | P0 | State | High | Map canvas elements to nested `Y.Map` and z-index ordering to `Y.Array`. Implement `Y.UndoManager` with local scope. |
| **ENG-011** | Hocuspocus Realtime Server | P0 | Realtime | High | Deploy Hocuspocus WebSocket server. Implement ticket-based auth handshake and 2-step synchronization protocol. |
| **ENG-012** | Redis Multi-Node Pub/Sub | P0 | Realtime | Medium | Connect Hocuspocus instances via Redis cluster adapter. Deliver cross-node document deltas with $< 20$ ms latency. |
| **ENG-013** | Ephemeral Presence & Cursors | P0 | Realtime | Medium | Stream cursor coordinates and active selections via Yjs awareness protocol at 30 Hz. Auto-clear cursors on disconnect. |

---

## 3. Backend, Persistence & Security (P0 / P1)

| Task ID | Title | Priority | Subsystem | Complexity | Description & Acceptance Criteria |
|---|---|:---:|---|:---:|---|
| **ENG-020** | PostgreSQL Relational Schema | P0 | Database | Medium | Define Prisma / Kysely schema for workspaces, boards, users, and snapshots. Add indexes and foreign keys. |
| **ENG-021** | Row-Level Security Policies | P0 | Security | High | Configure PostgreSQL RLS policies isolating boards strictly by workspace and user membership. |
| **ENG-022** | Fastify Authentication API | P0 | API | Medium | Implement user registration, Argon2id password hashing, JWT issue, and HttpOnly refresh token rotation cookies. |
| **ENG-023** | S3 Presigned Asset Pipeline | P0 | Storage | Medium | Implement `POST /assets/presign` endpoint. Validate MIME type magic bytes; direct upload to S3; resize to WebP. |
| **ENG-024** | DOMPurify SVG & URL Guard | P0 | Security | Medium | Sanitize imported SVG files and enforce scheme whitelists (`https:`, `http:`, `mailto:`) on element links. |

---

## 4. Collaboration, Productivity & Polish (P1 / P2)

| Task ID | Title | Priority | Subsystem | Complexity | Description & Acceptance Criteria |
|---|---|:---:|---|:---:|---|
| **ENG-030** | Smart Orthogonal Connectors | P1 | Editor | High | Implement A* obstacle-avoiding routing algorithm for arrows connecting shapes. Auto-reroute on shape move. |
| **ENG-031** | Follow Mode & Presentation Mode | P1 | UX | Medium | Allow users to lock camera viewport to presenter. Broadcast laser pointer trails with decaying opacity. |
| **ENG-032** | IndexedDB Offline Persistence | P1 | Storage | High | Cache `Y.Doc` binary updates locally in IndexedDB using `idb`. Allow offline editing and auto-reconciliation. |
| **ENG-033** | Canvas Accessible Subtree | P1 | Accessibility | High | Build virtual DOM subtree mirroring canvas shapes for screen readers with keyboard navigation (WCAG 2.2 AA). |
| **ENG-034** | Zero-Knowledge E2EE Mode | P2 | Security | High | Implement Web Crypto API AES-GCM client-side encryption for zero-knowledge end-to-end encrypted rooms. |
