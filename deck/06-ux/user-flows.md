# Core User Flows & Step-by-Step Interactions

## 1. Flow 1: Create Board & Draw First Diagram

```
User Action: Clicks "New Board" button on Workspace Dashboard
  │
  ▼
Client: Generates optimistic local board in state; issues POST /api/v1/workspaces/:id/boards
  │
  ▼
Server: Generates UUID v4 board record, associates user as OWNER, returns board metadata
  │
  ▼
Client: Navigates to /boards/:boardId; establishes WebSocket connection via ticket exchange
  │
  ▼
User Action: Presses key "2" (Rectangle tool) and drags cursor from (100, 100) to (300, 250)
  │
  ▼
Client: Interactive canvas layer (<canvas id="interaction">) draws live dragging preview at 60 FPS
  │
  ▼
User Action: Releases pointer (pointerup)
  │
  ▼
Client: Commits new RectangleElement to local Y.Doc; static layer renders element; 
        dispatches binary Yjs update frame over WebSocket
  │
  ▼
Server: Broadcasts update to room; debounces persistence write to PostgreSQL
```

---

## 2. Flow 2: Smart Connector Creation & Auto-Routing

```
User Action: Selects Arrow tool (key "5") and hovers over Rectangle A
  │
  ▼
Client: Canvas detects bounding box proximity (< 15px); snaps start point to shape anchor dot; 
        visual focus halo appears
  │
  ▼
User Action: Drags arrow toward Rectangle B
  │
  ▼
Client: Calculates live orthogonal route around intermediate obstacles using A* pathfinding
  │
  ▼
User Action: Releases cursor over Rectangle B
  │
  ▼
Client: Binds arrow startBinding = { elementId: "rectA", focus: 0 } and 
        endBinding = { elementId: "rectB", focus: 0 }; commits to Y.Doc
  │
  ▼
Result: When Rectangle A is dragged or moved subsequently, the connector dynamically reroutes
```

---

## 3. Flow 3: Asset Upload & Inline Embedding

```
User Action: Drags image file (PNG/JPEG) from local desktop and drops onto canvas
  │
  ▼
Client: Intercepts drop event; reads dimensions via ImageBitmap; shows skeleton placeholder box
  │
  ▼
Client: Requests presigned upload URL: POST /api/v1/boards/:id/assets/presign
  │
  ▼
Server: Validates MIME type & workspace storage quota; generates presigned S3 PUT URL
  │
  ▼
Client: Streams file bytes directly to S3 via HTTP PUT
  │
  ▼
Client: Calls POST /api/v1/boards/:id/assets/complete; receives permanent assetId
  │
  ▼
Client: Commits ImageElement to Y.Doc referencing assetId; image renders seamlessly on all peer screens
```

---

## 4. Flow 4: Export Canvas (SVG / High-Res PNG / PDF)

```
User Action: Presses Cmd/Ctrl + E or clicks "Export" in header
  │
  ▼
Client: Opens Export Dialog with live preview:
        - Options: Scale (1x, 2x, 3x), Background (Transparent / White / Dark), Scope (All / Selection)
  │
  ▼
User Action: Selects "PNG 2x (Retina)" and clicks "Export to File"
  │
  ▼
Client: Computes scene AABB bounding box; allocates offscreen canvas at 2x pixel ratio;
        replays all visible element paths to offscreen context;
        calls canvas.toBlob('image/png')
  │
  ▼
Client: Triggers native browser download dialog saving "architecture-export-2026.png"
```
