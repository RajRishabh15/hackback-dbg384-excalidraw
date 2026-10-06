# Scalability & Concurrency Architecture

## 1. Concurrency Tiers & System Behavior

| Concurrent Load | Active Collaborators / Board | Architectural Behavior & Bottleneck Defenses |
|---|---|---|
| **10 Users** | 10 in single room | Single Node handles smoothly. Zero Redis pub/sub needed. In-memory Yjs doc footprint $< 5$ MB. Sub-10ms delivery. |
| **100 Users** | 100 in single room | Broadcast fan-out: 1 update generates 99 outbound WS frames. Awareness frames throttled to 20 FPS. WebSocket frame compression (permessage-deflate) enabled. |
| **1,000 Concurrent Users** | 10–50 across 50 boards | Multi-node WebSocket cluster (3 instances) behind Envoy / Traefik load balancer. Redis Pub/Sub brokers cross-node board updates. |
| **10,000 Concurrent Users** | 500 active board rooms | Autoscaling group of 12–16 Hocuspocus nodes. Redis Cluster (3 shards). PostgreSQL read-replica handles board list queries. |
| **100,000 Boards** | Storage & DB scale | Total PostgreSQL table size ~20 GB. B-tree indexes guarantee $O(\log N)$ board lookups in $< 2$ ms. S3 handles all asset blobs. |

---

## 2. Horizontal Scaling Topology

```
                                 ┌─────────────────────────┐
                                 │     Anycast DNS / CDN   │
                                 └────────────┬────────────┘
                                              │
                                 ┌────────────▼────────────┐
                                 │   AWS ALB / Traefik     │
                                 │  - SSL Termination      │
                                 │  - Path Routing         │
                                 └──────┬────────────┬─────┘
                                        │            │
                     ┌──────────────────┘            └──────────────────┐
                     ▼                                                  ▼
        ┌─────────────────────────┐                        ┌─────────────────────────┐
        │  Hocuspocus WS Pod 1    │                        │  Hocuspocus WS Pod N    │
        │  - In-Memory Y.Docs     │                        │  - In-Memory Y.Docs     │
        │  - 2,000 WS Conns       │                        │  - 2,000 WS Conns       │
        └────────────┬────────────┘                        └────────────┬────────────┘
                     │                                                  │
                     └──────────────────┐            ┌──────────────────┘
                                        ▼            ▼
                                 ┌─────────────────────────┐
                                 │   Redis 7 Cluster       │
                                 │  - Channel: board:{id}  │
                                 │  - Pub/Sub Relay        │
                                 └────────────┬────────────┘
                                              │
                                 ┌────────────▼────────────┐
                                 │  PostgreSQL 16 Primary  │
                                 │   (Write Pool PgBouncer)│
                                 └────────────┬────────────┘
                                              │ Streaming Replication
                                 ┌────────────▼────────────┐
                                 │  PostgreSQL 16 Replica  │
                                 │   (Read Pool PgBouncer) │
                                 └─────────────────────────┘
```

---

## 3. High-Density Board Optimization (10,000+ Elements)

Boards containing tens of thousands of complex paths face distinct performance ceilings:

1. **Client Viewport Virtualization**:
   - The client never iterates through the entire 10,000 elements during a frame render.
   - The spatial Quadtree prunes 95%+ of elements outside the visible viewport in $< 0.5$ ms.
2. **Yjs State Vector Compaction**:
   - Every 1,000 operations, the document is compacted into a single snapshot update.
   - Eliminates transaction garbage collection overhead and keeps client memory below 60 MB even after hours of editing.
3. **Delta Broadcast Throttling**:
   - While a user is actively dragging an element (high-frequency pointer movement), the client broadcasts at 30 FPS.
   - When the user releases the pointer, a final authoritative transaction is committed.
4. **Broadcast Backpressure Handling**:
   - If a peer's network degrades (slow consumer), the server detects a growing TCP write buffer.
   - Awareness frames (cursors) are dropped immediately for that connection to preserve critical document update deltas.
