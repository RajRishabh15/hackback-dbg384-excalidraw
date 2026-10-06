# System Architecture

## Architecture Overview

The system follows a **modular monolith** architecture — a single deployable application with clearly separated internal modules. This avoids the operational complexity of microservices while maintaining the modularity needed for testing, scaling individual components, and eventual extraction.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Editor       │  │  Collab      │  │  Persistence │  │  Auth          │  │
│  │  Engine       │  │  Engine      │  │  Layer       │  │  Client        │  │
│  │  (Canvas +    │  │  (Yjs +      │  │  (IndexedDB  │  │  (OAuth +      │  │
│  │   Actions)    │  │   Awareness) │  │   + API)     │  │   Token Mgmt)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                  │                  │                   │           │
│         └──────────────────┼──────────────────┼───────────────────┘           │
│                            │ WebSocket (WSS)  │ HTTP/S (REST)                │
└────────────────────────────┼──────────────────┼──────────────────────────────┘
                             │                  │
┌────────────────────────────┼──────────────────┼──────────────────────────────┐
│                        LOAD BALANCER / CDN                                    │
│                    (Nginx / Cloudflare / ALB)                                 │
└────────────────────────────┼──────────────────┼──────────────────────────────┘
                             │                  │
┌────────────────────────────┼──────────────────┼──────────────────────────────┐
│                         SERVER (Node.js)                                      │
│                                                                               │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────────┐       │
│  │  Hocuspocus       │  │  Fastify         │  │  Background Workers    │       │
│  │  (WebSocket)      │  │  (REST API)      │  │  (Snapshots, Cleanup)  │       │
│  │                   │  │                  │  │                        │       │
│  │  • Room mgmt      │  │  • Auth endpoints│  │  • Periodic snapshots  │       │
│  │  • Yjs sync       │  │  • Board CRUD    │  │  • File cleanup        │       │
│  │  • Auth hooks     │  │  • User mgmt     │  │  • CRDT compaction     │       │
│  │  • Authz hooks    │  │  • File upload   │  │  • Metrics aggregation │       │
│  │  • Persistence    │  │  • Comments      │  │                        │       │
│  │    hooks          │  │  • Export         │  │                        │       │
│  │  • Awareness      │  │  • Search        │  │                        │       │
│  └────────┬──────────┘  └───────┬──────────┘  └───────────┬────────────┘       │
│           │                     │                          │                   │
│  ┌────────┴─────────────────────┴──────────────────────────┴───────────┐       │
│  │                        Shared Services Layer                         │       │
│  │  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐     │       │
│  │  │ Auth       │  │ Board      │  │ File     │  │ Observability│     │       │
│  │  │ Service    │  │ Service    │  │ Service  │  │ (OTel)       │     │       │
│  │  └─────┬─────┘  └─────┬──────┘  └────┬─────┘  └──────────────┘     │       │
│  └────────┼───────────────┼──────────────┼─────────────────────────────┘       │
│           │               │              │                                     │
└───────────┼───────────────┼──────────────┼─────────────────────────────────────┘
            │               │              │
┌───────────┼───────────────┼──────────────┼─────────────────────────────────────┐
│           ▼               ▼              ▼           DATA TIER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ PostgreSQL   │  │ Redis        │  │ S3-Compatible│  │ (Optional)   │       │
│  │              │  │              │  │ Object Store │  │ Elasticsearch│       │
│  │ • Users      │  │ • Pub/Sub    │  │              │  │ for search   │       │
│  │ • Boards     │  │ • Presence   │  │ • Images     │  │ (P2)         │       │
│  │ • Members    │  │ • Rate limits│  │ • Exports    │  │              │       │
│  │ • Comments   │  │ • Sessions   │  │ • Attachments│  │              │       │
│  │ • Snapshots  │  │ • WS room    │  │              │  │              │       │
│  │ • Audit log  │  │   registry   │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Client-Side Components

| Component | Responsibility | Key Technologies |
|---|---|---|
| **Editor Engine** | Canvas rendering, element manipulation, user input, actions, undo/redo | React, Canvas 2D API, custom action system |
| **Collaboration Engine** | Yjs document sync, awareness (cursors/presence), operation application | Yjs, y-websocket provider, awareness protocol |
| **Persistence Layer** | Local-first storage, API sync, offline queue | IndexedDB (via idb-keyval), y-indexeddb |
| **Auth Client** | Token management, OAuth flow, session refresh | Custom auth client library |
| **UI Shell** | Dashboard, dialogs, toolbar, sidebar, settings | React components |

### Server-Side Components

| Component | Responsibility | Key Technologies |
|---|---|---|
| **Hocuspocus Server** | WebSocket connections, Yjs document sync, room management, auth/authz hooks, persistence hooks | @hocuspocus/server |
| **Fastify API Server** | REST API for auth, boards, users, comments, files, export | Fastify, @fastify/jwt |
| **Auth Service** | User registration, login, OAuth2 flow, token issuance/refresh, session management | Custom, using jose for JWT |
| **Board Service** | Board CRUD, membership management, permission checks, snapshot creation | Custom service |
| **File Service** | Image/attachment upload, S3 operations, signed URL generation | @aws-sdk/client-s3 |
| **Background Workers** | Periodic snapshots, CRDT compaction, file garbage collection, metrics | node-cron or bull queue |

### Data Tier

| Component | Responsibility |
|---|---|
| **PostgreSQL** | Primary data store — users, boards, memberships, comments, snapshots, audit log, Yjs document state |
| **Redis** | Pub/sub for multi-node WS broadcasting, presence cache, rate limiting counters, session store |
| **S3-Compatible Storage** | Binary file storage — images, attachments, exports, board thumbnails |

## Key Design Decisions

### Why Modular Monolith (Not Microservices)

**Context**: The system has three main server processes (API, WebSocket, Background Workers), but they share the same codebase and can be deployed together or separately.

**Rationale**:
1. **Operational simplicity**: One codebase, one deployment unit, one debugging context
2. **Type safety**: Shared TypeScript types across all modules
3. **Latency**: No inter-service network calls for common operations
4. **Team size**: Microservices are justified for large teams (50+); this is designed for a team of 5-15
5. **Scalability path**: WebSocket server can be extracted and scaled independently when needed (stateless with Redis pub/sub)

**Scaling strategy**: Deploy multiple instances behind a load balancer. WebSocket connections are sticky (via cookie/IP hash). Redis pub/sub enables cross-instance message routing.

### Why Separate WebSocket and API Servers

**Rationale**:
1. WebSocket connections are long-lived and stateful; HTTP requests are short-lived
2. Different scaling characteristics: WS server scales by connection count, API by request rate
3. Different failure modes: WS server crash requires reconnection; API server crash is retried per-request
4. Hocuspocus provides purpose-built WebSocket handling for Yjs

**Deployment**: Both run in the same Node.js process by default (different ports). Can be separated into distinct processes/containers for independent scaling.

## Data Flow: Drawing an Element

```
1. User draws on canvas
   ↓
2. Editor Engine creates element in local Yjs document
   ↓
3. Yjs generates update (binary diff)
   ↓
4. y-websocket provider sends update to Hocuspocus server
   ↓
5. Hocuspocus:
   a. Validates connection is authenticated + authorized
   b. Applies update to server-side Yjs document
   c. Broadcasts update to all other room connections
   d. Triggers persistence hook (debounced)
   ↓
6. Persistence hook:
   a. Encodes Yjs document state as binary
   b. Stores in PostgreSQL (boards.yjs_state column)
   ↓
7. Other clients:
   a. Receive Yjs update via WebSocket
   b. Apply to local Yjs document
   c. Yjs notifies observers (React state update)
   d. Editor Engine re-renders affected elements on canvas
```

## Data Flow: Reconnecting After Offline

```
1. Client detects online status
   ↓
2. y-websocket provider reconnects to Hocuspocus
   ↓
3. Hocuspocus authenticates/authorizes connection
   ↓
4. Yjs sync protocol:
   a. Client sends its state vector (what it knows)
   b. Server sends missing updates (what client missed)
   c. Client sends its pending updates (offline edits)
   d. Server applies and broadcasts to other clients
   ↓
5. All clients converge to identical state (CRDT guarantee)
   ↓
6. No conflicts — CRDT merge is automatic and deterministic
```

## Deployment Architecture

### Minimum Viable Deployment (Single Server)

```
┌─────────────────────────────┐
│  Docker Host                │
│                             │
│  ┌──────────────────────┐   │
│  │  Node.js Process      │   │
│  │  ├── Fastify (3000)   │   │
│  │  └── Hocuspocus (3001)│   │
│  └──────────┬────────────┘   │
│             │                │
│  ┌──────────┴────────────┐   │
│  │  PostgreSQL (5432)    │   │
│  └───────────────────────┘   │
│                             │
│  ┌───────────────────────┐   │
│  │  Redis (6379)          │   │
│  └───────────────────────┘   │
│                             │
│  ┌───────────────────────┐   │
│  │  MinIO (9000)          │   │
│  │  (S3-compatible)       │   │
│  └───────────────────────┘   │
│                             │
│  ┌───────────────────────┐   │
│  │  Nginx (80/443)        │   │
│  │  (Reverse proxy + TLS) │   │
│  └───────────────────────┘   │
└─────────────────────────────┘
```

### Production Deployment (Kubernetes)

```
┌───────────────────────────────────────────────────────────┐
│  Kubernetes Cluster                                        │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  API Pods     │  │  WS Pods     │  │  Worker Pods │    │
│  │  (2-4 replicas│  │  (2-4 replicas│  │  (1-2 replicas│  │
│  │   HPA)        │  │   HPA)        │  │   )           │  │
│  └──────┬────────┘  └──────┬────────┘  └──────┬────────┘  │
│         │                  │                   │           │
│  ┌──────┴──────────────────┴───────────────────┘           │
│  │  Ingress Controller (sticky sessions for WS)           │
│  └─────────────────────────────────────────────┘           │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL   │  │  Redis       │  │  S3           │    │
│  │  (managed or  │  │  (managed or │  │  (AWS S3 or   │    │
│  │   operator)   │  │   operator)  │  │   MinIO)      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────────────────────────────────────┘
```

## Repository Structure (Target)

```
/
├── apps/
│   ├── web/                  # Frontend application (Vite + React)
│   │   ├── src/
│   │   │   ├── editor/       # Canvas editor engine
│   │   │   ├── collaboration/ # Yjs integration, awareness
│   │   │   ├── auth/         # Authentication client
│   │   │   ├── dashboard/    # Board list, workspace UI
│   │   │   ├── components/   # Shared UI components
│   │   │   ├── hooks/        # React hooks
│   │   │   ├── stores/       # Zustand stores
│   │   │   └── utils/        # Client utilities
│   │   └── public/
│   │
│   ├── server/               # Backend application (Fastify + Hocuspocus)
│   │   ├── src/
│   │   │   ├── api/          # REST API routes
│   │   │   ├── ws/           # Hocuspocus configuration, hooks
│   │   │   ├── services/     # Business logic (auth, board, file)
│   │   │   ├── middleware/   # Auth, rate limiting, validation
│   │   │   ├── db/           # Database queries, migrations
│   │   │   └── workers/      # Background jobs
│   │   └── migrations/       # SQL migrations
│   │
│   └── e2e/                  # End-to-end tests (Playwright)
│
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── protocol/             # Message types, schemas, validation
│   ├── editor-core/          # Framework-agnostic editor logic
│   ├── crdt/                 # Yjs document schema, operations
│   └── config/               # Shared configuration
│
├── infrastructure/
│   ├── docker/               # Dockerfiles, docker-compose
│   ├── k8s/                  # Kubernetes manifests
│   └── terraform/            # Infrastructure as code (optional)
│
├── docs/                     # This documentation
├── scripts/                  # Build, deploy, maintenance scripts
└── tests/                    # Shared test utilities
```

### Package Responsibilities

| Package | Responsibility |
|---|---|
| `apps/web` | Browser application — editor UI, collaboration UI, dashboard |
| `apps/server` | API server + WebSocket server + background workers |
| `apps/e2e` | End-to-end tests using Playwright |
| `packages/types` | Shared TypeScript interfaces and types (Element, Board, User, etc.) |
| `packages/protocol` | WebSocket message schemas, REST API schemas, validation |
| `packages/editor-core` | Pure functions for element manipulation, hit testing, rendering math |
| `packages/crdt` | Yjs document schema definition, operations, snapshot utilities |
| `packages/config` | Shared configuration (env vars, constants, feature flags) |
