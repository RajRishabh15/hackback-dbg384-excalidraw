# Live Collaborative Whiteboard — Architecture & Product Documentation

> **Status**: Documentation Phase (Pre-Implementation)
> **Version**: 1.0.0
> **Date**: 2026-10-06

## Executive Summary

This documentation package defines the product vision, architecture, security model, collaboration protocol, and implementation roadmap for a **production-grade Live Collaborative Whiteboard platform**. The platform is designed to surpass Excalidraw in reliability, security, scalability, and collaboration capabilities while retaining the hand-drawn aesthetic and developer-friendly DNA that makes Excalidraw beloved.

The platform targets engineering teams, educators, designers, distributed organizations, and startups who need a real-time collaborative visual thinking tool that is **trustworthy enough for enterprise use** without sacrificing the speed and simplicity of a lightweight drawing tool.

## Product Positioning

This platform is meaningfully better than Excalidraw because it replaces Excalidraw's trust-everyone, client-only security model with server-side authorization and proper RBAC; its Firebase-coupled persistence with a portable PostgreSQL-based backend; its version-counter reconciliation with CRDT-based convergence (via Yjs); and its lack of authentication with OAuth2/OIDC identity. The result is a system that can be self-hosted with confidence, scaled horizontally, audited for compliance, and used in enterprise environments where data governance matters.

## Documentation Structure

| Directory | Contents |
|---|---|
| [`01-product/`](./01-product/) | Product vision, personas, user stories, competitive analysis, feature prioritization |
| [`02-reference-analysis/`](./02-reference-analysis/) | Deep technical audit of the Excalidraw reference implementation |
| [`03-security/`](./03-security/) | Security architecture, threat model, vulnerability assessment, security test plan |
| [`04-architecture/`](./04-architecture/) | System, frontend, backend, collaboration, database, and storage architecture |
| [`05-protocols/`](./05-protocols/) | REST API specification, WebSocket protocol, synchronization protocol, error model |
| [`06-ux/`](./06-ux/) | UX architecture, user flows, collaboration flows, accessibility |
| [`07-performance/`](./07-performance/) | Performance architecture, budgets, and load testing strategy |
| [`08-devsecops/`](./08-devsecops/) | CI/CD, testing strategy, observability, deployment, disaster recovery |
| [`09-decisions/`](./09-decisions/) | Architecture Decision Records (ADRs) for all major technology choices |
| [`10-roadmap/`](./10-roadmap/) | Implementation roadmap, engineering backlog, milestones, definition of done |
| [`diagrams/`](./diagrams/) | Mermaid diagrams for architecture, flows, ERD, deployment, security |

## Final Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend Framework | React 19 + TypeScript 5.x | Ecosystem maturity, component model, Excalidraw compatibility |
| Build Tool | Vite 6 | Fast HMR, ESM-native, proven in current codebase |
| Canvas Engine | HTML5 Canvas 2D (custom) | Direct pixel control, GPU-composited, proven performance |
| State Management | Zustand + Yjs bindings | Lightweight, TypeScript-first, integrates with CRDT layer |
| CRDT / Sync | Yjs | Mature, battle-tested CRDT, built-in awareness protocol, offline-first |
| WebSocket Transport | Hocuspocus (Yjs server) | Purpose-built Yjs WebSocket backend with auth hooks, rooms, persistence |
| Backend Runtime | Node.js 22 LTS + TypeScript | Developer velocity, shared types with frontend, async I/O |
| API Framework | Fastify | High throughput, schema validation, plugin system |
| Database | PostgreSQL 16 | ACID, JSONB for flexible element storage, proven at scale |
| Object Storage | S3-compatible (MinIO / AWS S3) | Blob storage for images/attachments, CDN-friendly |
| Cache / Presence | Redis 7 | Pub/sub for multi-node WS, ephemeral presence, session store |
| Authentication | OAuth2/OIDC (self-hosted or external) | Standards-based, supports SSO, magic links, passkeys |
| Observability | OpenTelemetry + Grafana stack | Vendor-neutral, traces + metrics + logs |
| Deployment | Docker + Kubernetes (optional) | Portable, horizontally scalable |

## How to Use This Documentation

1. **Product managers**: Start with `01-product/` for vision, personas, and roadmap.
2. **Frontend engineers**: Read `04-architecture/frontend-architecture.md` and `05-protocols/`.
3. **Backend engineers**: Read `04-architecture/backend-architecture.md` and `04-architecture/database-architecture.md`.
4. **Distributed systems engineers**: Read `04-architecture/collaboration-architecture.md` and `04-architecture/synchronization-model.md`.
5. **Security engineers**: Read the complete `03-security/` section.
6. **DevOps engineers**: Read `08-devsecops/` and `04-architecture/scalability.md`.
7. **QA engineers**: Read `08-devsecops/testing-strategy.md` and `03-security/security-test-plan.md`.

---

*This documentation was generated as the authoritative specification for implementation. The next phase will use these documents to build the platform.*
