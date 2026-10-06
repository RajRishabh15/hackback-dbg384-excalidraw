# Feature Prioritization

## Prioritization Framework

Features are classified using the following criteria:

- **P0 (Essential)**: Required for the first production release. Without these, the product is not viable.
- **P1 (High Value)**: Strong differentiators that significantly improve the product. Should be implemented in the first 3 months post-launch.
- **P2 (Future)**: Valuable features that can wait. Planned for subsequent releases.

Each feature must satisfy at least one of:
- Improves collaboration reliability
- Improves user productivity
- Improves system reliability
- Improves security posture
- Improves accessibility
- Improves scalability
- Solves a known workflow problem

## P0 — Essential (MVP)

| Feature | Justification |
|---|---|
| Canvas with freehand, shapes, text, arrows, images | Core drawing functionality |
| Real-time collaboration (CRDT-based) | Core differentiator |
| Live cursors and presence | Collaboration awareness |
| Authentication (OAuth2/OIDC) | Security baseline |
| Server-side authorization (RBAC) | Security baseline |
| Board persistence (PostgreSQL) | Data durability |
| Autosave (IndexedDB + server) | Data safety |
| Offline editing with sync | Reliability |
| Board sharing with permissions (Owner/Editor/Viewer) | Collaboration governance |
| Export (PNG, SVG, JSON) | Data portability |
| Import (JSON, Excalidraw format) | Migration from existing tools |
| Copy/paste (internal and clipboard) | Basic productivity |
| Undo/redo (local-only history) | Basic usability |
| Keyboard shortcuts | Power user productivity |
| Snap alignment guides | Drawing accuracy |
| Element locking/unlocking | Collaboration safety |
| Dashboard with board list | Navigation |
| User profile (name, avatar) | Identity |
| Docker deployment | Self-hosting |
| Structured logging + basic metrics | Observability baseline |

## P1 — High Value (Month 1-3 Post-Launch)

| Feature | Justification |
|---|---|
| Threaded comments on elements | Async collaboration |
| Version history with restore | Data recovery |
| Follow mode (viewport sync) | Presentation/teaching |
| Guest access (view-only links) | External sharing |
| Magic link authentication | Reduced friction login |
| Workspace member management | Team organization |
| Board search and filtering | Navigation at scale |
| PDF export | Professional deliverables |
| Sticky notes with auto-resize | Workshop/brainstorming |
| Elbow (right-angle) arrows | Technical diagrams |
| Laser pointer tool | Presentations |
| Board templates | Productivity |
| Presentation mode | Teaching/demos |
| Rate limiting and abuse prevention | Security hardening |
| Comprehensive E2E test suite | Quality assurance |
| Load testing infrastructure | Performance confidence |

## P2 — Future (Month 3-6+)

| Feature | Justification |
|---|---|
| @mentions in comments | Collaboration depth |
| Activity/change feed | Awareness |
| Board favorites and folders | Organization |
| Voting/reactions on elements | Workshop tooling |
| Minimap | Navigation on large boards |
| Board analytics (view count, edit activity) | Insights |
| Markdown text support | Technical users |
| Mermaid diagram import | Developer workflow |
| Version comparison (visual diff) | Change tracking |
| Custom component library sharing | Reusability |
| Webhook integrations | Automation |
| SAML SSO | Enterprise |
| Audit log export | Compliance |
| Mobile-optimized touch interface | Mobile users |
| Embeddable widget (iframe API) | Integration |

## Differentiating Features (Evaluated)

### Candidate List

| # | Feature | Problem Solved | Complexity | Security Impact | Perf Impact | Value | Priority |
|---|---|---|---|---|---|---|---|
| 1 | Smart snapping to diagram patterns | Faster diagramming | Medium | None | Low | High | P1 |
| 2 | Automatic layout (force-directed) | Messy diagrams | High | None | Medium | Medium | P2 |
| 3 | Diagram-to-code (Mermaid export) | Developer workflow | Medium | Low | None | Medium | P2 |
| 4 | AI-assisted organization | Layout cleanup | High | Medium (API keys) | Medium | Medium | P2 |
| 5 | Presentation mode with slides | Meetings/teaching | Medium | None | Low | High | P1 |
| 6 | Version visual diff | Change tracking | High | None | Medium | Medium | P2 |
| 7 | Guided workshop mode | Structured collaboration | Medium | None | Low | Medium | P2 |
| 8 | Board-to-board linking | Connected knowledge | Low | Low | None | Medium | P2 |
| 9 | Element-level permissions | Fine-grained control | High | Medium | Low | Low | P2 |
| 10 | Real-time voice/video | Richer collaboration | Very High | High | High | Medium | P2 |
| 11 | Smart connector routing | Better diagrams | Medium | None | Low | High | P1 |
| 12 | Bulk operations (multi-select actions) | Productivity | Low | None | None | High | P0 |
| 13 | Command palette | Power user productivity | Low | None | None | High | P0 |
| 14 | Keyboard-first element creation | Speed | Low | None | None | Medium | P1 |
| 15 | Session recovery (browser crash) | Data safety | Medium | None | None | High | P0 |

### Selected Top 5 Differentiators

1. **CRDT-based collaboration with true offline-first** — No conflicts, no data loss, deterministic convergence
2. **Server-side authorization with proper RBAC** — Enterprise-ready security, not just client-side checks
3. **Presentation mode with follow-me** — Makes the tool useful for teaching and meetings
4. **Threaded comments** — Enables async collaboration, bridges sync and async workflows
5. **Version history with visual snapshots** — Data recovery and change tracking
