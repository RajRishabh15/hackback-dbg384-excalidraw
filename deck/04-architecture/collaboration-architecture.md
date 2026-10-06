# Collaboration Architecture & Realtime Protocol

## 1. Collaboration System Design

Realtime collaboration is the defining capability of the platform. Unlike reference Excalidraw, which relies on version-based last-write-wins (LWW) with socket broadcast relays, this platform utilizes a formal **Conflict-Free Replicated Data Type (CRDT)** system built on **Yjs**.

```
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│ Client A (Peer) │             │  WS Server Node │             │ Client B (Peer) │
└────────┬────────┘             └────────┬────────┘             └────────┬────────┘
         │                               │                               │
         │ 1. Connect (WS + Auth Ticket) │                               │
         ├──────────────────────────────►│                               │
         │ 2. SyncStep 1 (State Vector)  │                               │
         ├──────────────────────────────►│ 3. SyncStep 1 (State Vector)  │
         │ 4. SyncStep 2 (Missing Deltas)│◄──────────────────────────────┤
         │◄──────────────────────────────┤ 5. SyncStep 2 (Missing Deltas)│
         │                               ├──────────────────────────────►│
         │                               │                               │
         │         === ROOM SYNCHRONIZED & COLLABORATING ===             │
         │                               │                               │
         │ 6. User draws rectangle       │                               │
         │    Y.Doc local transaction    │                               │
         │ 7. Binary Yjs Update frame    │                               │
         ├──────────────────────────────►│ 8. Broadcast update frame     │
         │                               ├──────────────────────────────►│
         │                               │                               │ 9. Y.Doc applies delta
         │                               │                               │    Multi-Layer canvas
         │                               │                               │    renders rectangle
         │ 10. Mouse moves (Awareness)   │                               │
         ├──────────────────────────────►│ 11. Ephemeral cursor frame    │
         │                               ├──────────────────────────────►│ 12. Remote cursor updates
         │                               │                               │
```

---

## 2. Connection Lifecycle & Handshake Flow

### Stage 1: Authentication & Authorization Ticket Exchange
1. Client requests a collaboration session ticket from REST API:
   `POST /api/v1/boards/:id/live-ticket`
2. Server verifies caller's RBAC role for the board (`OWNER`, `EDITOR`, or `VIEWER`).
3. Server returns a signed, short-lived JWT ticket (TTL: 60 seconds):
   ```json
   {
     "ticket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "endpoint": "wss://realtime.whiteboard.domain/boards/018f4a12-8e3b-7a2e-b6a1-94e85764d123"
   }
   ```

### Stage 2: WebSocket Upgrade & Handshake
1. Client establishes connection to the WebSocket endpoint:
   `wss://realtime.whiteboard.domain/boards/{boardId}?ticket={ticket}`
2. Hocuspocus server intercepts the upgrade event, decodes the ticket, verifies the HMAC-SHA256 signature, and binds session metadata to the connection socket (`userId`, `workspaceId`, `role`).
3. If invalid or expired, connection is rejected immediately with HTTP 401 / WebSocket close code 1008.

### Stage 3: Initial Synchronization (Yjs 2-Step Sync)
1. **SyncStep 1**: Client sends its current state vector `Y.encodeStateVector(yDoc)`. If client is opening board fresh, state vector is empty `[0]`.
2. **Server Computation**: Server compares the client's state vector with its document state vector and calculates precisely the missing updates.
3. **SyncStep 2**: Server transmits missing binary updates `Y.encodeStateAsUpdate(serverDoc, clientVector)` to the client.
4. Client applies the binary update to its local `Y.Doc`. Both client and server now share an identical document state.

### Stage 4: Continuous Transaction Streaming
- Any local modification (drawing, moving, editing text) wraps in a `yDoc.transact(() => { ... })`.
- Yjs computes a minimal diff update vector and fires an update event.
- The transport sends the binary update frame over the WebSocket.
- The server validates permissions (rejecting mutations if user has `VIEWER` role) and broadcasts the frame to all other connected room peers.

### Stage 5: Ephemeral Awareness (Presence & Cursors)
- Awareness updates are transmitted over a dedicated message type (`MSG_AWARENESS = 1`).
- Payload contains:
  ```json
  {
    "clientId": 34910294,
    "user": {
      "id": "usr-018f",
      "name": "Sarah Connor",
      "color": "#FF5722",
      "avatarUrl": "https://cdn.whiteboard.domain/avatars/sarah.png"
    },
    "cursor": { "x": 420.5, "y": 810.2 },
    "selectedElementIds": ["el-9042", "el-9043"],
    "activeTool": "rectangle"
  }
  ```
- Awareness frames are debounced at 30ms (up to ~33 updates/sec) and bypass persistent storage entirely.
- If a client disconnects or fails to send an awareness heartbeat within 10 seconds, the server broadcasts an awareness removal frame to clean up the cursor.

---

## 3. Wire Protocol Frame Specification

To achieve maximum performance and minimum serialization overhead, communication over the WebSocket uses a hybrid binary framing protocol:

| Byte 0 (Message Type) | Description | Payload Encoding |
|---|---|---|
| `0x00` (`SYNC_STEP_1`) | Initial sync handshake: client sends state vector | Binary (Yjs lib0 varuint) |
| `0x01` (`SYNC_STEP_2`) | Sync response: server sends missing document delta | Binary (Yjs lib0 varuint) |
| `0x02` (`SYNC_UPDATE`) | Incremental document transaction delta | Binary (Yjs update stream) |
| `0x03` (`AWARENESS`) | Live cursor positions, active tool, selections | Binary encoded JSON map |
| `0x04` (`PING` / `PONG`) | Transport liveness heartbeat | 0 bytes / empty |
| `0x05` (`ROOM_MESSAGE`) | High-level control signals (e.g., Board Locked, Permissions Changed) | UTF-8 JSON String |
| `0x06` (`ERROR`) | Operational or permission error frame | UTF-8 JSON String with error code |

---

## 4. Reconnection & Offline Recovery Engine

1. **Heartbeat & Dead Peer Detection**:
   - Client sends ping every 15 seconds. Server replies with pong.
   - If no message received for 30 seconds, client declares connection dead and transitions UI to `"Reconnecting..."` state.
2. **Exponential Backoff with Full Jitter**:
   $$\text{delay} = \min(10000, 1000 \times 2^{\text{retryCount}}) + \text{random}(0, 500) \text{ ms}$$
3. **Seamless Resynchronization**:
   - While offline, user continues editing locally. `Y.Doc` records all local operations in client IndexedDB.
   - Upon reconnection, client sends its current state vector.
   - Server provides any updates made by remote peers while the client was offline; client transmits all offline edits to the server.
   - Yjs merges both streams mathematically without conflicts or data loss.
