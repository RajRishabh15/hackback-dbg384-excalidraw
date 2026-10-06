# Backend Architecture & Realtime Services

## 1. Architectural Style & Subsystems

The backend is architected as a high-performance **modular monolith** with dedicated processes for HTTP API and WebSocket collaboration services, sharing database access models and domain schemas.

```
                                  ┌──────────────────────────────┐
                                  │      Ingress / TLS Proxy     │
                                  └──────────────┬───────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │                                                 │
                        ▼ /api/*                                          ▼ /realtime/*
         ┌──────────────────────────────┐                  ┌──────────────────────────────┐
         │       Fastify REST API       │                  │  Hocuspocus Realtime Server  │
         │  - Identity & OAuth2 Auth    │                  │  - Yjs WebSocket Transport   │
         │  - Workspaces & Board CRUD   │                  │  - Room Lifecycle & Auth     │
         │  - Asset Upload / S3 Proxy   │                  │  - Ephemeral Presence Engine │
         │  - Export / PDF Rendering    │                  │  - Debounced Persistence     │
         └──────────────┬───────────────┘                  └──────────────┬───────────────┘
                        │                                                 │
                        ├────────────────────────┐                        │
                        ▼                        ▼                        ▼
         ┌──────────────────────────────┐  ┌─────────────────────────────────────┐
         │      PostgreSQL 16 DB        │  │              Redis 7                │
         │  - Structured Relational Data│  │  - Pub/Sub Multi-Node Relay         │
         │  - JSONB Scene Snapshots     │  │  - Awareness / Presence Store       │
         │  - Row-Level Security (RLS)  │  │  - Distributed Token Bucket Limiter │
         └──────────────────────────────┘  └─────────────────────────────────────┘
```

---

## 2. Fastify REST API Service

### 2.1 Technology Choice & Performance
- **Framework**: Fastify 5.x on Node.js 22 LTS.
- **Throughput**: 45,000+ req/sec on baseline benchmarks, leveraging `fast-json-stringify` and `@fastify/type-provider-typebox`.
- **Plugin Architecture**: Modular encapsulation isolating Auth, Workspaces, Boards, Comments, Assets, and Health plugins.

### 2.2 Core Middleware & Plugins
1. `@fastify/cors`: Strict origin validation against configured web domain.
2. `@fastify/helmet`: Automated security headers (CSP, HSTS, frame options).
3. `@fastify/rate-limit`: Redis-backed distributed rate limiting (IP-based and user-based).
4. `@fastify/jwt`: Asymmetric key verification for Bearer tokens.
5. `@fastify/multipart`: Streaming multipart file handler with magic-byte MIME checking.

---

## 3. Realtime Collaboration Server (Hocuspocus)

### 3.1 Server Architecture
Hocuspocus is an enterprise-ready WebSocket backend designed specifically for Yjs CRDT synchronization.
- **Connection Handshake**:
  1. Client initiates WebSocket connection with `?ticket=<signed_token>`.
  2. `onAuthenticate` hook validates token signature, expiration, and user permissions for the requested `boardId`.
  3. Rejects invalid connections with WebSocket close code `1008 (Policy Violation)`.
- **Room Loading & State Hydration**:
  1. `onLoadDocument`: Triggered when first user joins a board.
  2. Checks Redis cache for active `Y.Doc` binary. If absent, loads latest compacted snapshot and subsequent Yjs updates from PostgreSQL `board_snapshots` table.
  3. Hydrates in-memory `Y.Doc`.
- **Debounced Snapshot Persistence**:
  1. `onChange`: Triggered when peers write transactions to the board.
  2. Updates are kept in memory and published to Redis Pub/Sub for multi-node server clusters.
  3. Persistence writes to PostgreSQL are debounced by 2 seconds (or 100 accumulated updates) to prevent write-amplification on database disks.
- **Room Teardown**:
  1. `onDisconnect`: Cleans up peer awareness.
  2. When the last user leaves a board room, the server performs a final flush of all pending state to PostgreSQL, then evicts the room from memory after a 60-second grace period.

---

## 4. Multi-Node Cluster Scaling with Redis Pub/Sub

When scaling across multiple instances (e.g., in Kubernetes or ECS):
- **Room Affinity / Sharding**: Clients can connect to any WebSocket instance behind the load balancer.
- **Redis RedisPubSub Adapter**:
  - Each board room maps to a Redis Pub/Sub channel: `board:updates:{boardId}`.
  - When Instance A receives an update from Client 1, it broadcasts the binary delta over Redis.
  - Instance B receives the message and immediately delivers it to Client 2 connected to Instance B.
- **Presence & Ephemeral State**:
  - Cursor positions and selections are transmitted as lightweight Yjs awareness frames.
  - Awareness frames are not persisted to disk; they expire automatically in Redis after 10 seconds of silence.

---

## 5. Background Jobs & Worker Architecture

For CPU-intensive tasks, an asynchronous worker queue (BullMQ + Redis) processes background workloads:
1. **Asset Optimization**: Resizing and converting uploaded images into WebP format at multiple resolutions (thumbnail, medium, full).
2. **Server-Side Board Export**: Headless Chromium / Puppeteer pool rendering full-resolution PDF and SVG exports for automation or CLI export requests.
3. **Snapshot Compaction**: Background cron aggregating historical Yjs transaction rows into unified full-document binary blobs to keep database rows compact and fast to load.
4. **Audit Log Flushing**: Archiving system events to immutable cold storage (S3 Glacier).
