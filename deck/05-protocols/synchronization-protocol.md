# Synchronization Protocol Specification

## 1. Protocol Primitives

The synchronization protocol establishes state convergence across distributed peers and the central storage layer using Yjs CRDT binary streams.

### 1.1 State Vectors
A State Vector summarizes the continuous sequence of updates known to a particular client or server:
$$SV = \{ c_1 \mapsto v_1, c_2 \mapsto v_2, \dots, c_k \mapsto v_k \}$$
Where each $c_i$ is a unique 53-bit unsigned Client Identifier and $v_i$ is the monotonically increasing Lamport clock of updates authored by that client.

---

## 2. Synchronization Exchange Algorithms

### 2.1 Two-Step Synchronization Handshake
When a client connects or recovers from an offline state:

```
Client                                                   Server
  │                                                        │
  │ 1. Encode local state:                                 │
  │    localSV = Y.encodeStateVector(yDoc)                 │
  │                                                        │
  │ 2. Send SyncStep1 [0x00, ...localSV]                   │
  │───────────────────────────────────────────────────────►│
  │                                                        │ 3. Server computes missing deltas:
  │                                                        │    diff = Y.encodeStateAsUpdate(serverDoc, localSV)
  │                                                        │
  │                                                        │ 4. Send SyncStep2 [0x01, ...diff]
  │◄───────────────────────────────────────────────────────│
  │                                                        │
  │ 5. Apply server diff:                                  │
  │    Y.applyUpdate(yDoc, diff)                           │
  │                                                        │
  │ 6. If client had local offline updates:                │
  │    clientDiff = Y.encodeStateAsUpdate(yDoc, serverSV)  │
  │    Send SyncUpdate [0x02, ...clientDiff]               │
  │───────────────────────────────────────────────────────►│
  │                                                        │ 7. Apply client diff to serverDoc
  │                                                        │    Y.applyUpdate(serverDoc, clientDiff)
  │                                                        │    Broadcast to other room peers
```

---

## 3. Client Transaction Batching & Debouncing

High-frequency drawing operations (e.g., stylus sketching at 120 FPS or mouse dragging) must not overwhelm the network:

1. **Transaction Granularity**:
   - While drawing a stroke: points are appended to the local element model continuously, rendering at full display refresh rate on `<canvas id="interaction">`.
   - Network updates are batched into micro-transactions dispatched at a maximum rate of **30 FPS (33ms interval)**.
2. **Stroke Finalization**:
   - On `pointerup`, the interaction layer commits the final complete path to the static scene layer.
   - A final atomic Yjs transaction marks the stroke as committed.

---

## 4. Conflict Resolution & Attribute Merging Invariants

1. **Primitive Attributes**: Scalar fields (`strokeColor`, `strokeWidth`, `opacity`) merge using Last-Write-Wins (LWW) based on Lamport clock timestamps with client ID tiebreakers.
2. **Compound Collections (Element Order)**: Visual z-index layering stored in `Y.Array` maintains deterministic relative ordering using fractional identifier sequence algorithms.
3. **Deletions**: Element deletions append tombstone markers (`isDeleted: true`). Deletions take precedence over concurrent property modifications.
4. **Idempotence**: Repeated application of the same binary update produces identical state:
   $$\text{applyUpdate}(\text{applyUpdate}(S, U), U) = \text{applyUpdate}(S, U)$$
