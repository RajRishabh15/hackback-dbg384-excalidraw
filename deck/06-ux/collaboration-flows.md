# Realtime Collaboration Flows & Conflict Scenarios

## 1. Flow 1: Live Multi-User Concurrent Editing

```
[Peer A: London]                                     [Peer B: Tokyo]
       │                                                    │
       │─── 1. Draws "System Architecture" Box ────────────►│ (Instantly appears on Tokyo canvas)
       │                                                    │
       │◄── 2. Moves cursor near Box ───────────────────────│ (London sees Tokyo's live cursor dot)
       │                                                    │
       │    === CONCURRENT CONFLICT TEST ===                │
       │                                                    │
       │ 3. Changes color to #3b82f6 (Blue)                 │ 4. Concurrently changes width to 450px
       │    Local Y.Map.set('backgroundColor', '#3b82f6')   │    Local Y.Map.set('width', 450)
       │                                                    │
       │─── 5. Dispatches binary delta ────────────────────►│ 6. Applies Peer A's delta to Y.Doc
       │                                                    │    (Color becomes blue)
       │                                                    │
       │◄── 7. Dispatches binary delta ─────────────────────│ 8. Applies Peer B's delta to Y.Doc
       │    (Width becomes 450px)                           │
       │                                                    │
       │    === FINAL CONVERGED RESULT ===                  │
       │    Both London and Tokyo screens display:          │
       │    Box with Color = #3b82f6 AND Width = 450px      │
       │    Zero data loss. Zero conflict popups.           │
```

---

## 2. Flow 2: Temporary Disconnect & Offline Reconnection

```
[User A (Laptop)]                                   [Realtime Server]
       │                                                    │
       │ 1. Actively collaborating in room                  │
       │─── Sends operations normally ─────────────────────►│
       │                                                    │
       │ 2. WiFi drops (Airplane / Tunnel)                  │
       │    Socket enters CLOSED state                      │
       │    UI displays Amber pill: "Offline - Saving local"│
       │                                                    │
       │ 3. User draws 5 new shapes offline                 │
       │    Y.Doc commits updates to local IndexedDB        │
       │                                                    │
       │ 4. Network Restored (WiFi reconnected)            │
       │    Triggers exponential backoff reconnect          │
       │─── WS Handshake with ticket ──────────────────────►│
       │─── SYNC_STEP_1 (Sends local state vector) ────────►│
       │                                                    │ 5. Calculates peer deltas missed
       │◄── SYNC_STEP_2 (Receives missing peer deltas) ─────│
       │                                                    │
       │ 6. Transmits local offline deltas                  │
       │─── SYNC_UPDATE (Binary 5 shapes) ─────────────────►│ 7. Applies deltas to server Y.Doc;
       │                                                    │    broadcasts to all other peers
       │ 8. UI displays Green pill: "All changes synced"    │
```

---

## 3. Flow 3: Follow Mode & Presentation Broadcast

```
[Presenter (Alice)]                                  [Audience (Bob, Carol)]
       │                                                    │
       │ 1. Clicks "Start Presentation" in header           │
       │    Awareness broadcasts { isPresenting: true }     │
       │                                                    │
       │                                                    │ 2. Banner appears: "Alice started presenting"
       │                                                    │    Bob clicks "Follow Alice"
       │                                                    │
       │ 3. Alice zooms in on Database Cluster              │
       │    Awareness broadcasts { scrollX, scrollY, zoom } │
       │                                                    │ 4. Bob's viewport smoothly animates
       │                                                    │    camera position to match Alice's view
       │                                                    │
       │ 5. Alice activates Laser Pointer tool              │
       │    Draws circular emphasis trail around element    │
       │                                                    │ 6. Bob's presence canvas renders red
       │                                                    │    laser beam that fades out over 1.5s
```
