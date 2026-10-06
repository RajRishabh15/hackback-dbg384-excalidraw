# Limitation & Gap Analysis

## Architectural Limitations

### L-001: No Authentication System
**Severity**: Critical  
**Description**: The OSS Excalidraw has no authentication. Collaboration rooms are identified by a random room ID in the URL. Anyone with the URL can join and edit. There is no concept of "user" — only ephemeral socket connections with optional usernames stored in localStorage.  
**Impact**: Cannot be used for any sensitive content. No audit trail, no accountability, no access control.  
**Gap**: Full identity system with OAuth2/OIDC, user accounts, session management.

### L-002: No Server-Side Authorization
**Severity**: Critical  
**Description**: The collaboration server (`excalidraw-room`) is a pure relay. It broadcasts encrypted messages without any authorization checks. The Firebase Firestore rules allow `get` and `write` for ALL documents (`allow get, write: if true`). Firebase Storage allows `get` and `write` for all rooms and share links.  
**Impact**: Any client can read/write any room's data in Firestore. There is zero tenant isolation. A malicious client could overwrite another room's data if they knew the room ID (even though they couldn't decrypt it without the key).  
**Gap**: Server-side RBAC, board-level permission enforcement, tenant isolation.

### L-003: Firebase Vendor Lock-In
**Severity**: High  
**Description**: Persistence is tightly coupled to Firebase (Firestore for scene data, Firebase Storage for files). Self-hosting requires running Firebase emulators or replacing the entire persistence layer.  
**Impact**: Cannot truly self-host. Data is stored on Google infrastructure. Migration to another backend requires rewriting the data layer.  
**Gap**: PostgreSQL-based persistence with S3-compatible object storage.

### L-004: Version-Based Reconciliation (Not CRDT)
**Severity**: High  
**Description**: Excalidraw uses version counters and `versionNonce` for conflict resolution. When two clients edit the same element concurrently, the reconciliation picks one based on version number and nonce comparison. The losing edit is silently discarded.  
**Impact**: Data loss during concurrent edits. Users may not notice their changes were overwritten. No guarantee of convergence in all scenarios.  
**Gap**: CRDT-based synchronization (Yjs) that guarantees conflict-free convergence.

### L-005: Monolithic App Component
**Severity**: Medium  
**Description**: `packages/excalidraw/components/App.tsx` is 424KB / ~12,000 lines. It handles all pointer events, keyboard events, rendering coordination, text editing, shape creation, drag operations, and more. While partially decomposed into mixin files, it remains a God Object.  
**Impact**: Difficult to maintain, test, and extend. New features require understanding a massive codebase. Risk of regressions is high.  
**Gap**: Modular architecture with focused components and clear boundaries.

### L-006: No Version History
**Severity**: Medium  
**Description**: There is no version history. The Firebase document stores only the latest scene state. Undo/redo is local-only and lost on page refresh.  
**Impact**: Accidental deletions or edits are unrecoverable once the page is refreshed. No way to review board evolution.  
**Gap**: Snapshot-based version history with point-in-time restore.

### L-007: No Comments System
**Severity**: Medium  
**Description**: There is no commenting feature. All collaboration is synchronous (real-time cursor + drawing).  
**Impact**: Teams that work across time zones cannot leave feedback asynchronously. No way to discuss design decisions on the board.  
**Gap**: Threaded comments attached to elements or canvas positions.

### L-008: Limited Offline Support
**Severity**: Medium  
**Description**: Offline mode exists only for non-collaborative use (localStorage save). When collaborating, going offline means losing the connection, and reconnecting requires re-syncing the entire scene. There is no operation queue or conflict reconciliation for offline edits.  
**Impact**: Network interruptions can cause confusion. Offline-then-online flow is fragile.  
**Gap**: CRDT-based offline-first with automatic, conflict-free sync on reconnect.

### L-009: No Structured API
**Severity**: Medium  
**Description**: There is no REST API. The only backend endpoints are Firebase and the share-link backend (`json-dev.excalidraw.com`). There is no programmatic way to create boards, manage users, or query data.  
**Impact**: No integration with CI/CD, project management tools, or custom workflows. Cannot build automations around the platform.  
**Gap**: Comprehensive REST API for all operations.

### L-010: No Workspace/Organization Model
**Severity**: Medium  
**Description**: Boards are isolated entities with no organizational structure. There is no concept of workspace, team, or project. The dashboard is a simple list of recently opened boards from localStorage.  
**Impact**: Scaling to many boards is difficult. No way to manage team access at a workspace level.  
**Gap**: Workspace → Board hierarchy with team management.

### L-011: Socket.IO Broadcast Scaling
**Severity**: Medium  
**Description**: The collaboration model broadcasts the entire scene to all room members periodically (every 20 seconds via `SYNC_FULL_SCENE_INTERVAL_MS`). For large boards, this means sending the complete element array across the network.  
**Impact**: Bandwidth-intensive for large boards. Scaling to many concurrent users per room is limited by the full-scene broadcast.  
**Gap**: CRDT incremental updates that only transmit deltas.

### L-012: No Observability
**Severity**: Medium  
**Description**: The application has Sentry for error tracking but no structured logging, metrics collection, or distributed tracing. There is analytics tracking (via `trackEvent`) but no operational observability.  
**Impact**: Difficult to diagnose issues in production. No visibility into performance, error rates, or system health.  
**Gap**: OpenTelemetry-based observability with structured logging, metrics, and tracing.

## Security Gaps

| Gap | Current State | Required State |
|---|---|---|
| Authentication | None | OAuth2/OIDC + session management |
| Authorization | None (client trust) | Server-side RBAC per board |
| Input validation | Minimal (client-side) | Server-side validation of all mutations |
| Rate limiting | None | Per-user, per-room rate limiting |
| WebSocket auth | None (room ID only) | Token-based connection auth |
| Message validation | None (encrypted relay) | Server validates operation structure |
| Audit logging | None | All mutations logged with actor/timestamp |
| Dependency scanning | Manual | Automated per CI run |
| CORS | Not configured (SPA) | Strict origin whitelisting |
| CSP | Basic | Strict Content Security Policy |

## Performance Gaps

| Gap | Current Behavior | Target |
|---|---|---|
| Large board rendering | No viewport culling | Only render visible elements |
| Full-scene sync | Every 20 seconds | CRDT incremental sync |
| Image loading | Lazy but unbounded | Prioritized by viewport proximity |
| Memory management | Elements accumulate | Periodic memory optimization |
| Worker threads | Font subsetting only | Offload rendering, sync to workers |
