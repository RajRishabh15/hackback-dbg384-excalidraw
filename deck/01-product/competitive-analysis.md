# Competitive Analysis

## Comparison Matrix

| Capability | Excalidraw (OSS) | Miro | FigJam | tldraw | **Proposed Platform** |
|---|---|---|---|---|---|
| **Drawing** |
| Freehand drawing | ✅ Hand-drawn aesthetic | ✅ | ✅ | ✅ | ✅ Hand-drawn + pressure |
| Geometric shapes | ✅ 6 types | ✅ 20+ | ✅ 10+ | ✅ 8+ | ✅ 10+ types |
| Connectors/arrows | ✅ With elbow | ✅ Smart | ✅ Basic | ✅ | ✅ Smart + elbow |
| Text | ✅ Rich | ✅ Rich | ✅ Rich | ✅ | ✅ Rich + markdown (P2) |
| Images | ✅ Paste/upload | ✅ | ✅ | ✅ | ✅ |
| Sticky notes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Frames | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Canvas** |
| Infinite canvas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Zoom/Pan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Minimap | ❌ | ✅ | ❌ | ❌ | ✅ P2 |
| Grid/snap | ✅ | ✅ | ✅ | ✅ | ✅ |
| Smart alignment | ✅ Basic | ✅ Advanced | ✅ | ✅ | ✅ Advanced |
| **Collaboration** |
| Real-time editing | ✅ Socket.IO + reconcile | ✅ OT | ✅ CRDT | ✅ CRDT (Yjs) | ✅ CRDT (Yjs) |
| Live cursors | ✅ | ✅ | ✅ | ✅ | ✅ |
| Presence | ✅ Basic (idle state) | ✅ Rich | ✅ | ✅ | ✅ Rich |
| Follow mode | ✅ | ✅ | ✅ | ❌ | ✅ |
| Comments | ❌ | ✅ Threaded | ✅ | ❌ | ✅ Threaded |
| Voting/reactions | ❌ | ✅ | ✅ | ❌ | P2 |
| **Security** |
| Authentication | ❌ None (OSS) | ✅ | ✅ (Figma) | ❌ | ✅ OAuth2/OIDC |
| Authorization/RBAC | ❌ | ✅ | ✅ | ❌ | ✅ Server-side |
| E2E encryption | ✅ Client-side AES | ❌ | ❌ | ❌ | ✅ Optional E2E |
| Server-side authz | ❌ | ✅ | ✅ | ❌ | ✅ |
| Audit logging | ❌ | ✅ (Enterprise) | ❌ | ❌ | ✅ |
| SSO/SAML | ❌ | ✅ (Enterprise) | ✅ (Figma) | ❌ | ✅ |
| **Persistence** |
| Autosave | ✅ localStorage | ✅ Cloud | ✅ Cloud | ✅ localStorage | ✅ IndexedDB + server |
| Version history | ❌ | ✅ | ✅ | ❌ | ✅ |
| Offline mode | ✅ Basic | ❌ | ❌ | ✅ | ✅ Full CRDT-based |
| **Export** |
| PNG | ✅ | ✅ | ✅ | ✅ | ✅ |
| SVG | ✅ | ❌ | ❌ | ✅ | ✅ |
| PDF | ❌ | ✅ | ✅ | ❌ | ✅ P1 |
| JSON (portable) | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Infrastructure** |
| Self-hostable | ✅ Docker | ❌ | ❌ | ✅ | ✅ Docker/K8s |
| Open source | ✅ MIT | ❌ | ❌ | ✅ AGPL | ✅ |
| API | ❌ | ✅ REST | ❌ | ❌ | ✅ REST |
| Pricing | Free | $8-16/user/mo | $3-5/user/mo | Free | Free (self-host) |
| **Accessibility** |
| Keyboard navigation | ✅ Partial | ✅ | ✅ | ✅ Partial | ✅ Full |
| Screen reader | ❌ | ✅ Partial | ❌ | ❌ | ✅ For UI controls |
| Reduced motion | ❌ | ❌ | ❌ | ❌ | ✅ |

## Key Differentiators vs. Excalidraw

### What Excalidraw Does Well (Retain)
1. **Hand-drawn aesthetic** — uniquely charming, reduces intimidation, makes diagrams feel approachable
2. **Instant startup** — no login, no onboarding, just draw
3. **Keyboard shortcuts** — power-user friendly
4. **Library system** — reusable component sets
5. **Client-side encryption** — privacy-respecting for shared links
6. **Lightweight** — minimal dependencies, fast load
7. **Open source** — MIT licensed, strong community

### Where Excalidraw Falls Short (Replace/Improve)

| Limitation | Impact | Our Improvement |
|---|---|---|
| No authentication | Anyone with a room link can edit | OAuth2/OIDC with role-based access |
| Firebase dependency | Vendor lock-in, limited self-hosting | PostgreSQL + S3 (portable) |
| Version-based reconciliation | Can lose data under concurrent edits | CRDT-based (Yjs) — no conflicts |
| No server-side authorization | Firestore rules allow any read/write | API-level RBAC enforcement |
| No version history | Lost edits are unrecoverable | Snapshot-based version history |
| No comments | No async collaboration | Threaded comments on elements |
| No workspace/organization | Boards are isolated, no dashboard | Workspace → Board hierarchy |
| Monolithic App.tsx (423KB) | Hard to maintain, test, extend | Modular architecture |
| No structured API | Can't integrate with other tools | REST API for all operations |
| Limited offline support | Only for non-collab mode | Full CRDT offline-first |
| No audit trail | Can't meet compliance requirements | Server-side audit logging |
| Socket.IO broadcast model | All clients get all updates (no filtering) | Yjs-aware selective sync |

## Market Position

```
                    Enterprise-Ready
                         ↑
                         |
           Miro ●        |        ● Our Platform
                         |
                         |    ● FigJam
        ─────────────────┼─────────────────→
        Closed Source     |         Open Source
                         |
                ● tldraw |
                         |    ● Excalidraw
                         |
                    Developer Tool
```

Our platform occupies the **upper-right quadrant**: open-source AND enterprise-ready. This is a gap in the market — existing open-source whiteboard tools lack enterprise features, and existing enterprise tools are closed-source.
