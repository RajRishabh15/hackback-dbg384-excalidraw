# WebSocket Protocol Specification

## 1. Connection Handshake & Lifecycle

- **Protocol Scheme**: `wss://` (Encrypted TLS WebSocket)
- **Base Endpoint**: `wss://realtime.whiteboard.domain/boards/:boardId`
- **Query Parameters**:
  - `ticket`: Single-use JWT generated via `POST /api/v1/boards/:id/live-ticket`

```
Client                                                  Server
  │                                                       │
  │─── HTTP GET /boards/:id?ticket=xyz ──────────────────►│
  │    Upgrade: websocket                                 │
  │    Connection: Upgrade                                │
  │    Sec-WebSocket-Version: 13                          │
  │                                                       │
  │◄── HTTP 101 Switching Protocols ──────────────────────│
  │    Sec-WebSocket-Accept: ...                          │
  │                                                       │
  │─── [Binary Frame: SYNC_STEP_1 (State Vector)] ───────►│
  │                                                       │
  │◄── [Binary Frame: SYNC_STEP_2 (Missing Updates)] ─────│
  │                                                       │
  │◄── [Binary Frame: AWARENESS (Initial Peers)] ─────────│
  │                                                       │
  │─── [Binary Frame: AWARENESS (Local Presence)] ───────►│
  │                                                       │
  │                   === STREAM ACTIVE ===               │
  │                                                       │
  │─── [Binary Frame: PING] ─────────────────────────────►│
  │◄── [Binary Frame: PONG] ──────────────────────────────│
```

---

## 2. Frame Encoding & Types

Every WebSocket frame starts with an unsigned 8-bit integer (`uint8`) identifying the message type:

```typescript
export enum MessageType {
  SyncStep1 = 0,    // Client sends state vector
  SyncStep2 = 1,    // Server returns missing updates
  SyncUpdate = 2,   // Incremental CRDT delta update
  Awareness = 3,    // Ephemeral presence (cursor, tool, selection)
  Ping = 4,         // Liveness probe from client
  Pong = 5,         // Liveness probe acknowledgment from server
  Control = 6,      // Room control signals (lock board, role downgrade)
  Error = 7         // Operational/validation error
}
```

### 2.1 Sync Message Payloads (`0x00`, `0x01`, `0x02`)
Payloads are encoded using Yjs `lib0/encoding` and `lib0/decoding` protocols:
- `SyncStep1`: Encodes client state vector `[0x00, ...varUintStateVector]`.
- `SyncStep2`: Encodes server missing updates `[0x01, ...varUintUpdateBlob]`.
- `SyncUpdate`: Encodes standard Yjs transaction update `[0x02, ...varUintUpdateBlob]`.

### 2.2 Awareness Message Payload (`0x03`)
Encoded using Yjs Awareness protocol. Serializes a client map containing:
```json
{
  "clientId": 901248,
  "clock": 14,
  "user": {
    "name": "Alex Mercer",
    "color": "#10b981",
    "avatar": "https://..."
  },
  "cursor": { "x": 1240.25, "y": 800.5 },
  "activeTool": "pen",
  "selection": ["elem-1", "elem-2"]
}
```

### 2.3 Control Message Payload (`0x06`)
Encoded as UTF-8 JSON string following byte `0x06`:
```json
{
  "event": "BOARD_LOCKED",
  "payload": {
    "lockedBy": "018f4a12-8e3b-7a2e-b6a1-94e85764d001",
    "reason": "Admin review in progress"
  }
}
```

---

## 3. Disconnect Codes & Error Handling

Standard WebSocket status codes (RFC 6455) are utilized:

| Code | Name | Trigger Condition | Client Reaction |
|---|---|---|---|
| `1000` | Normal Closure | User closed tab, navigated away, or logged out. | None; clean teardown. |
| `1008` | Policy Violation | Invalid/expired ticket, unauthorized room access, viewer attempting writes. | Do not auto-reconnect. Display permission error dialog. |
| `1009` | Message Too Big | Message payload exceeded 256 KB. | Drop pending transaction; alert user. |
| `1011` | Server Error | Internal unhandled server exception. | Exponential backoff reconnect (up to 5 attempts). |
| `4001` | Unauthorized | Session revoked or expired during active connection. | Refresh auth token via REST API, then reconnect. |
| `4002` | Board Locked | Board owner toggled locked state. | Switch UI to read-only view. |
