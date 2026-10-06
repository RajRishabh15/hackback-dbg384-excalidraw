# Delivery Milestones & Release Schedule

## 1. Milestone Timeline Overview

| Milestone | Target Date | Primary Focus | Release Target |
|---|---|---|---|
| **M0: Foundation** | Month 1, Week 2 | Monorepo scaffolding, CI/CD, build tooling | Internal Dev |
| **M1: Canvas Core** | Month 1, Week 4 | Multi-layer canvas, shapes, pan/zoom, Rough.js | Private Alpha |
| **M2: CRDT Engine** | Month 2, Week 2 | Yjs local store, granular property merges, undo | Private Alpha |
| **M3: Realtime Relay** | Month 2, Week 4 | WebSocket sync, live cursors, Redis pub/sub | Team Alpha |
| **M4: Auth & Persistence**| Month 3, Week 2 | PostgreSQL, RLS, JWT auth, S3 assets | Public Beta |
| **M5: Enterprise Collab**| Month 3, Week 4 | RBAC, Follow Mode, comments, accessibility | Public Beta |
| **M6: Offline Durability**| Month 4, Week 2 | IndexedDB cache, offline editing, backoff | Release Candidate |
| **M7: Security & Scale**| Month 4, Week 4 | Pen-testing, k6 load testing, container hardening | Production 1.0 |

---

## 2. Beta Testing Program & Success Criteria

1. **Alpha Gate**: 50 internal team members stress-test simultaneous drawing sessions. Zero canvas crashes over 5 days.
2. **Beta Gate**: 500 invite-only beta users create over 2,000 collaborative boards.
   - P95 WebSocket sync latency $< 30$ ms.
   - 99.9% uptime across 30 days.
   - Zero data loss incidents reported.
