# Product Vision

## The Problem

Visual collaboration is fundamental to how teams think, design, and communicate. Yet existing tools fall into two extremes:

1. **Enterprise whiteboard tools** (Miro, Mural, FigJam) are feature-rich but expensive, slow, opaque, and require vendor trust for data sovereignty.
2. **Open-source alternatives** (Excalidraw, tldraw) are fast and delightful but lack server-side security, proper authentication, scalable persistence, and enterprise-readiness.

Teams need a collaborative whiteboard that is:
- **Instant** — no loading spinners, no lag on draw
- **Trustworthy** — server-side authorization, encrypted storage, audit trails
- **Self-hostable** — full control over data, no vendor lock-in
- **Real-time** — true concurrent editing with conflict-free convergence
- **Resilient** — offline-first, recoverable, no data loss
- **Accessible** — keyboard navigable, screen-reader friendly, reduced motion support

## The Vision

**Build the most reliable, secure, and performant open-source collaborative whiteboard platform — one that engineering teams trust for production use and enterprises trust for sensitive data.**

The platform combines the speed and hand-drawn aesthetic of Excalidraw with:
- Proper identity and access control
- Server-authoritative security boundaries
- CRDT-based conflict-free collaboration
- Offline-first architecture with deterministic sync
- PostgreSQL-backed durable persistence
- Observable, scalable infrastructure

## Mission Statement

To be the **default visual collaboration platform for technical teams** — the tool developers, architects, and educators reach for because it respects their intelligence, their data, and their time.

## Core Principles

### 1. Security is Not Optional
Every collaboration feature is designed with the assumption that clients can be malicious. Server-side validation is the norm, not the exception.

### 2. Performance is a Feature
Canvas interaction must feel instantaneous. Collaboration latency must be imperceptible. The editor must handle thousands of elements without jank.

### 3. Offline is the Default Mode
The platform works offline. Network is a bonus, not a requirement. Sync is automatic and conflict-free when connectivity returns.

### 4. Simplicity Over Complexity
Every architectural decision must justify its complexity. A monolithic backend is preferred over microservices unless distribution is genuinely required.

### 5. Open Standards, Open Source
The platform uses open protocols (WebSocket, OAuth2/OIDC, OpenTelemetry), open data formats (JSON, SVG, PNG), and is fully open-source.

## Success Metrics

| Metric | Target |
|---|---|
| Canvas interaction latency (p99) | < 16ms (60fps) |
| Collaboration sync latency (p95) | < 100ms |
| Cold start to interactive | < 2 seconds |
| Board recovery after disconnect | < 5 seconds |
| Concurrent editors per board | 50+ |
| Total boards in system | 1,000,000+ |
| Crash-free session rate | > 99.9% |
| Uptime (SaaS deployment) | 99.95% |
