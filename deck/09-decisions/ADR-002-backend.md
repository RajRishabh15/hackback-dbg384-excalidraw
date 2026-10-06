# ADR-002: Backend Runtime & API Framework

## Status
Accepted

## Context
The platform needs a high-throughput, low-latency backend supporting REST APIs, WebSocket connections, binary CRDT parsing, and shared TypeScript domain types with the frontend.

## Decision
We select **Node.js 22 LTS with Fastify 5.x**.

## Alternatives Considered
1. **Go (Golang)**:
   - *Rejected*: Excellent networking performance, but lacks seamless type sharing with frontend TypeScript codebase and requires maintaining a separate Yjs CRDT engine in Go.
2. **Rust (Actix-web / Axum)**:
   - *Rejected*: High operational and development velocity friction; Yjs Rust bindings (yrs) are less mature in full server ecosystems than native Node.js Yjs/Hocuspocus.
3. **Express.js**:
   - *Rejected*: Slower JSON serialization and routing throughput; lacking modern schema-first validation (TypeBox/Zod integration).

## Consequences
- Single language across entire stack enables 100% type sharing for domain models, validation schemas, and protocol messages.
- Fastify provides 4x higher throughput than Express with native async/await hooks and built-in encapsulation.
