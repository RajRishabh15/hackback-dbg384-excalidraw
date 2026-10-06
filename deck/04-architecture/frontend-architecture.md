# Frontend Architecture & Canvas Engine

## 1. Architectural Philosophy & Technology Stack

The frontend application is built around high-performance interactive graphics, deterministic CRDT state synchronization, and an ergonomic user experience.

| Layer | Technology | Rationale |
|---|---|---|
| **Core Framework** | React 19 + TypeScript 5.9 | Component lifecycle, JSX ergonomics, strict type safety |
| **Bundler & Build Tool** | Vite 6 | ESM native development, sub-second HMR, optimized roll-up production bundle |
| **Canvas Engine** | Custom Multi-Layer HTML5 Canvas 2D | Direct GPU-accelerated 2D pipeline; avoids virtual DOM overhead on high-frequency pointer updates |
| **State Management** | Zustand + Yjs CRDT bindings (`y-zustand`) | Decoupled UI state (modals, active tools) from shared document state; zero unnecessary React re-renders |
| **Styling & Theming** | Vanilla CSS + CSS Variables | Maximum performance, zero runtime CSS-in-JS compilation, seamless dynamic dark/light themes |
| **Offline Storage** | IndexedDB via `idb` | Client-side durable caching of Yjs binary updates and board assets |

---

## 2. Multi-Layer Canvas Rendering Pipeline

Rendering thousands of elements at 60–120 FPS during active pan, zoom, and live drawing necessitates separating rendering concerns into distinct HTML5 `<canvas>` layers stacked in CSS grid/absolute layout.

```
┌────────────────────────────────────────────────────────┐
│ UI Overlay Layer (HTML / React DOM)                    │
│ - Modals, context menus, property toolbars, alerts      │
├────────────────────────────────────────────────────────┤
│ Collaborative Presence Layer (<canvas id="presence">)  │
│ - Remote cursors, participant tags, laser pointer trails│
│ - Redrawn on remote cursor update (up to 60 FPS)       │
├────────────────────────────────────────────────────────┤
│ Interactive Interaction Layer (<canvas id="interaction">│
│ - Active bounding boxes, selection marquee, drag handles│
│ - In-progress drawing stroke (live draft pen / shape)   │
│ - Redrawn every mousemove/pointermove during gestures   │
├────────────────────────────────────────────────────────┤
│ Static Scene Layer (<canvas id="static">)              │
│ - All committed whiteboard elements                     │
│ - Quadtree spatial indexed & viewport culled           │
│ - Redrawn ONLY when scene elements mutate, pan, or zoom│
└────────────────────────────────────────────────────────┘
```

### 2.1 Viewport Culling & Quadtree Indexing
Instead of iterating through all $N$ elements on every frame, elements are stored in a spatial **Quadtree**:
- When the user pans or zooms, the camera viewport calculates an Axis-Aligned Bounding Box (AABB) in world coordinates:
  $$V_{\text{world}} = [x_{\min}, y_{\min}, x_{\max}, y_{\max}]$$
- The Quadtree executes an intersection query in $O(\log N)$ time, returning only visible elements.
- Elements with dimensions outside the viewport are skipped prior to calling path generation methods.

### 2.2 Path Caching & Rough.js Optimization
Hand-drawn sketch aesthetics (using a modernized Rough.js engine) require calculating bezier offsets. To prevent re-calculating rough paths on every frame:
1. Each element generates a cached `RoughGenerator` path stored on the element object.
2. The path cache is keyed by `(element.id, element.version, element.roughness, element.seed)`.
3. The static canvas simply replays the cached path unless properties change.

---

## 3. State Management Architecture

State is divided strictly into two tiers: **Ephemeral Local UI State** and **Shared Synchronized Scene State**.

```
                ┌──────────────────────────────────────────────────┐
                │               User Input / Mouse / Pen           │
                └────────────────────────┬─────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│        Local UI Store           │             │       CRDT Document Store       │
│        (Zustand Store)          │             │         (Y.Doc / Y.Map)         │
│  - Active tool (Select, Pen)    │             │  - Elements Map (Y.Map<Element>)│
│  - Active color, stroke width   │             │  - Ordering Array (Y.Array)     │
│  - Zoom, scrollX, scrollY       │             │  - Comments Map                 │
│  - Selected element IDs         │             │  - UndoManager (local scope)    │
└────────────────┬────────────────┘             └────────────────┬────────────────┘
                 │                                               │
                 │              ┌─────────────────┐              │
                 └─────────────►│ Multi-Layer     │◄─────────────┘
                                │ Canvas Renderer │
                                └─────────────────┘
```

### 3.1 Local UI Store (Zustand)
Manages fast-changing, purely local parameters:
- `activeTool`: `'selection' | 'rectangle' | 'ellipse' | 'pen' | 'arrow' | 'text' | 'eraser'`
- `viewTransform`: `{ scrollX: number, scrollY: number, zoom: number }`
- `selectedElementIds`: `Set<string>`
- `isDragging`, `isResizing`, `isRotating`: Boolean gesture flags.

### 3.2 Shared Collaborative Store (Yjs `Y.Doc`)
Manages data that must converge across peers:
- `yElements`: `Y.Map<ExcalidrawElement>` — Map of element ID to element state.
- `yElementOrder`: `Y.Array<string>` — Array of element IDs representing z-index layering.
- `yAwareness`: Ephemeral presence provider broadcasting `{ user: { name, color, avatar }, cursor: { x, y }, activeTool }`.

---

## 4. Input & Gesture Handling Pipeline

Handling stylus pressure, trackpad pinch-to-zoom, and mouse operations without lag:

1. **Pointer Event Normalization**: Use `PointerEvent` standard with `setPointerCapture` on pointer down, ensuring events are received even if the cursor leaves the browser window.
2. **Pressure Sensitivity**: Uses `event.pressure` normalized for pen tablets (Apple Pencil, Wacom, Surface Pen) to modulate stroke width dynamically.
3. **Pinch-to-Zoom**: Listens to passive `wheel` events with `ctrlKey=true` (trackpad pinch) and calculates zoom centered on cursor world position:
   $$\text{worldX} = \frac{\text{clientX} - \text{scrollX}}{\text{zoom}}$$
   $$\text{newZoom} = \text{clamp}(\text{zoom} \times (1 - \Delta y \times 0.01), 0.1, 10.0)$$
   $$\text{newScrollX} = \text{clientX} - \text{worldX} \times \text{newZoom}$$

---

## 5. Offline Durability & Sync Engine

1. **IndexedDB Local Replication**:
   Every update transaction on `Y.Doc` fires `yDoc.on('update', (update) => storeInIndexedDB(boardId, update))`.
   When loading a board offline, the application initializes the Yjs doc directly from IndexedDB without network requests.
2. **Optimistic Local Edits**:
   Edits are rendered instantly to the local canvas. Yjs queues updates locally until the WebSocket connection re-establishes, then sends compressed update vectors to the Hocuspocus backend.
3. **Conflict-Free Reconciliation**:
   Because state mutations operate via CRDT deltas, concurrent edits merge without data loss or user-facing conflict modal prompts.
