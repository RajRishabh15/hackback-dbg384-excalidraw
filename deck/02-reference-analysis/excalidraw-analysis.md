# Excalidraw Reference Implementation Analysis

## Repository Overview

**Repository**: Excalidraw monorepo (MIT License)  
**Architecture**: Yarn workspaces monorepo  
**Runtime**: Node.js 18+, TypeScript 5.9, Vite 5, React 19

## Monorepo Structure

```
excalidraw/
├── excalidraw-app/          # Main application (Vite + React)
│   ├── App.tsx              # Root component (41KB, 1323 lines)
│   ├── collab/              # Collaboration layer
│   │   ├── Collab.tsx       # Core collaboration class (33KB, 1096 lines)
│   │   └── Portal.tsx       # WebSocket transport layer (7.4KB, 258 lines)
│   ├── data/                # Persistence layer
│   │   ├── firebase.ts      # Firebase Firestore + Storage (9KB)
│   │   ├── LocalData.ts     # localStorage + IndexedDB (8KB)
│   │   ├── FileManager.ts   # Binary file management (8KB)
│   │   └── index.ts         # Data utilities, link management (8.5KB)
│   └── share/               # Share link handling
│
├── packages/
│   ├── excalidraw/          # Core editor library (publishable)
│   │   ├── components/      # 157 files, 19 subdirs — UI layer
│   │   │   └── App.tsx      # Main editor component (424KB!)
│   │   ├── actions/         # 48 action files — user operations
│   │   ├── renderer/        # Canvas rendering (interactive + static)
│   │   ├── data/            # Serialization, encoding, encryption
│   │   ├── scene/           # Scene management
│   │   ├── history.ts       # Undo/redo (delta-based)
│   │   ├── types.ts         # Core types (56KB, 1618 lines)
│   │   └── tests/           # 60 test files
│   │
│   ├── element/             # Element model + operations
│   │   └── src/
│   │       ├── types.ts     # Element type definitions (15KB, 497 lines)
│   │       ├── store.ts     # Observable store + delta system (29KB)
│   │       ├── delta.ts     # Delta/change tracking (70KB)
│   │       ├── binding.ts   # Arrow binding logic (94KB)
│   │       ├── linearElementEditor.ts  # Line/arrow editing (83KB)
│   │       ├── fractionalIndex.ts      # Ordering system (15KB)
│   │       └── ... 52 source files total
│   │
│   ├── common/              # Shared utilities, constants
│   ├── math/                # Geometric math library
│   ├── fractional-indexing/  # Fractional indexing for element ordering
│   ├── laser-pointer/       # Laser pointer animation
│   └── utils/               # General utilities
│
├── firebase-project/        # Firebase configuration
│   ├── firestore.rules      # Firestore security rules
│   └── storage.rules        # Storage security rules
│
├── examples/                # Integration examples
└── dev-docs/                # Developer documentation
```

## Architecture Analysis

### Frontend Architecture

**Rendering Pipeline:**
```
User Input → Action System → State Mutation → Store → Renderer → Canvas
                                    ↓
                              History (Undo/Redo)
                                    ↓
                              Collaboration Sync
```

**Key observations:**

1. **Monolithic App component**: `packages/excalidraw/components/App.tsx` is **424KB / ~12,000 lines**. This is the single largest source of complexity. It handles:
   - All pointer events (mouse, touch, pen)
   - All keyboard events
   - Canvas rendering coordination
   - Text editing
   - Shape creation
   - Selection management
   - Drag operations
   - Clipboard operations
   - The component has been partially decomposed into mixin-like files (App.text.ts, App.pan.ts, etc.) but remains a God Object.

2. **Action system**: Well-designed command pattern with 48 action files. Each action is a self-contained operation with `perform`, `keyTest`, and UI rendering. This is a good pattern to retain.

3. **State management**: Uses Jotai atoms for global state (collaboration status, offline status) and React component state for editor state. The `Store` class in `packages/element/src/store.ts` implements a sophisticated delta-based change tracking system.

4. **Rendering**: Dual canvas rendering with `interactiveScene.ts` (60KB) and `staticScene.ts` (15KB). Interactive scene handles selection UI, transform handles, cursors. Static scene renders actual elements. SVG export via `staticSvgScene.ts` (30KB).

### Collaboration Architecture

**Current model:**
```
Client A ←→ Socket.IO Server ←→ Client B
                  ↓
            Firebase Firestore
            (persistent storage)
```

**Protocol:**
1. Client connects to Socket.IO server (`excalidraw-room`)
2. Joins a room identified by `roomId`
3. Room key (`roomKey`) is in the URL hash (never sent to server)
4. All messages are encrypted client-side with AES-128-GCM before transmission
5. Server blindly broadcasts encrypted payloads to room members

**Message types (WS_SUBTYPES):**
- `SCENE_INIT` — full scene sent to new joiners
- `SCENE_UPDATE` — incremental element updates
- `MOUSE_LOCATION` — cursor position (volatile)
- `IDLE_STATUS` — user activity state (volatile)
- `USER_VISIBLE_SCENE_BOUNDS` — viewport for follow mode (volatile)

**Reconciliation algorithm (`reconcile.ts`):**
```typescript
// For each remote element:
// 1. If local element is being actively edited → keep local
// 2. If local version > remote version → keep local
// 3. If versions equal → keep the one with lower versionNonce (deterministic tiebreaker)
// 4. Otherwise → take remote
// Then: merge remaining local-only elements
// Then: reorder by fractional index
```

**Critical limitation**: This is NOT a CRDT. It's a version-counter-based reconciliation that can lose intermediate edits. If User A makes edit v3 and User B makes edit v3 independently, the one with the lower `versionNonce` wins — the other edit is silently discarded.

### Persistence Architecture

**Local persistence:**
- `localStorage`: AppState, elements (non-deleted only), settings
- `IndexedDB` (via `idb-keyval`): Binary files, library data
- Debounced save every 300ms

**Remote persistence (Firebase):**
- Firestore document per room: `scenes/{roomId}` — encrypted scene blob
- Firebase Storage: `files/rooms/{roomId}/{fileId}` — encrypted binary files
- Firebase Storage: `files/shareLinks/{linkId}/{fileId}` — share link files
- Backend V2: `json-dev.excalidraw.com` — shareable link data (POST/GET)

**Firebase persistence flow:**
1. On scene change, throttled save (every 20 seconds)
2. Load existing scene from Firestore
3. Reconcile local elements with stored elements
4. Encrypt reconciled result with room key
5. Write back to Firestore (transactional)

### Encryption System

**Algorithm**: AES-128-GCM (Web Crypto API)
- Key generation: `crypto.subtle.generateKey({name: "AES-GCM", length: 128})`
- Key format: JWK, exported as `k` field (base64url)
- IV: Random 12 bytes per encryption operation
- Key distribution: Embedded in URL hash fragment (never sent to server)

**What's encrypted:**
- All WebSocket messages (scene updates, cursor positions)
- Firestore scene documents
- Firebase Storage files (via compression + encryption)

**What's NOT encrypted:**
- Room ID (visible to server)
- Socket connection metadata
- File sizes and counts (visible to Firebase)

### Element Type System

15 element types defined in `packages/element/src/types.ts`:
- `selection`, `rectangle`, `diamond`, `ellipse` (generic)
- `stickynote` (auto-resizing)
- `text` (rich text properties)
- `line`, `arrow` (linear, with points array)
- `freedraw` (freehand strokes with pressure)
- `image` (with crop, scale, fileId)
- `frame`, `magicframe` (grouping containers)
- `iframe`, `embeddable` (external content)

**Element properties (shared base):**
- `id`, `x`, `y`, `width`, `height`, `angle`
- `strokeColor`, `backgroundColor`, `fillStyle`, `strokeWidth`, `strokeStyle`
- `roughness`, `opacity`, `seed` (roughjs seed)
- `version`, `versionNonce` (for reconciliation)
- `index` (fractional index for ordering)
- `isDeleted` (soft deletion)
- `groupIds`, `frameId`, `boundElements`
- `updated`, `created`, `link`, `locked`
- `customData` (extensible metadata)

### Undo/Redo System

**Delta-based history** (`history.ts` + `delta.ts`):
- Store observes state changes and emits `DurableIncrement` events
- History records `HistoryDelta` objects (inverse of the change)
- Undo pops from undo stack, applies inverse delta, pushes to redo stack
- Remote changes (CaptureUpdateAction.NEVER) bypass history
- History deltas exclude `version` and `versionNonce` to avoid conflicts with collaboration

### Build System

- **Vite 5** for development and production builds
- **TypeScript 5.9** with strict mode
- **Vitest** for testing (with coverage via v8)
- **ESLint** + **Prettier** for code quality
- **Husky** + **lint-staged** for pre-commit hooks
- **Docker** multi-stage build: Node build → Nginx serve

### Test Coverage

60 test files in `packages/excalidraw/tests/`:
- History tests (171KB — most comprehensive)
- Interaction tests (50KB)
- Selection tests (40KB)
- Scroll constraint tests (40KB)
- Many component-level tests
- No WebSocket/collaboration integration tests in the OSS version
- No security-specific tests

### Third-Party Dependencies (Key)

| Dependency | Purpose | Version |
|---|---|---|
| React | UI framework | 19.x |
| socket.io-client | WebSocket transport | 3.x |
| firebase (app, firestore, storage) | Backend persistence | Modular v9+ |
| pako | Compression (deflate/inflate) | - |
| idb-keyval | IndexedDB wrapper | - |
| roughjs | Hand-drawn rendering (indirect) | - |
| lodash.throttle | Throttling utility | - |
| jotai | State management (atoms) | - |
| clsx | CSS class composition | - |
