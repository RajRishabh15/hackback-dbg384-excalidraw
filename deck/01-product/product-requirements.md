# Product Requirements Document

## 1. Functional Requirements

### 1.1 Drawing & Canvas (P0)

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Freehand drawing with pressure sensitivity | P0 |
| FR-002 | Geometric shapes: rectangle, ellipse, diamond, line, arrow | P0 |
| FR-003 | Text elements with inline editing | P0 |
| FR-004 | Sticky notes with auto-resize | P0 |
| FR-005 | Connectors with endpoint binding | P0 |
| FR-006 | Image insertion (drag-drop, paste, upload) | P0 |
| FR-007 | Grouping and ungrouping elements | P0 |
| FR-008 | Copy, paste, duplicate operations | P0 |
| FR-009 | Undo/redo with unlimited history | P0 |
| FR-010 | Canvas pan and zoom (scroll, pinch, keyboard) | P0 |
| FR-011 | Element selection (click, box, lasso) | P0 |
| FR-012 | Element resize and rotate | P0 |
| FR-013 | Z-index ordering (bring forward, send back) | P0 |
| FR-014 | Frames for grouping content regions | P0 |
| FR-015 | Grid and snap-to-grid | P1 |
| FR-016 | Smart alignment guides (snap to edges/centers) | P0 |
| FR-017 | Element locking/unlocking | P0 |
| FR-018 | Elbow (right-angle) arrows | P1 |
| FR-019 | Eraser tool | P0 |
| FR-020 | Laser pointer (ephemeral, for presentations) | P1 |

### 1.2 Collaboration (P0)

| ID | Requirement | Priority |
|---|---|---|
| FR-100 | Real-time concurrent editing (CRDT-based) | P0 |
| FR-101 | Live cursor positions with usernames | P0 |
| FR-102 | Presence indicators (online/idle/away) | P0 |
| FR-103 | User avatars in collaborator list | P0 |
| FR-104 | Follow mode (view follows another user's viewport) | P1 |
| FR-105 | Board-level permissions (owner, editor, viewer) | P0 |
| FR-106 | Invite via link with role assignment | P0 |
| FR-107 | Guest access (view-only, no account required) | P1 |
| FR-108 | Threaded comments on elements | P1 |
| FR-109 | @mentions in comments | P2 |
| FR-110 | Activity/change feed | P2 |

### 1.3 Persistence & Data (P0)

| ID | Requirement | Priority |
|---|---|---|
| FR-200 | Autosave (every change persisted) | P0 |
| FR-201 | Version history with restore | P1 |
| FR-202 | Local-first with IndexedDB persistence | P0 |
| FR-203 | Server-side board persistence (PostgreSQL) | P0 |
| FR-204 | Board snapshots at intervals | P1 |
| FR-205 | Export: PNG, SVG, PDF, JSON | P0 |
| FR-206 | Import from JSON / Excalidraw format | P0 |
| FR-207 | Copy to clipboard as image | P0 |
| FR-208 | Shareable read-only links | P0 |
| FR-209 | Board templates | P2 |

### 1.4 Authentication & Identity (P0)

| ID | Requirement | Priority |
|---|---|---|
| FR-300 | Email/password authentication | P0 |
| FR-301 | OAuth2/OIDC (Google, GitHub, Microsoft) | P0 |
| FR-302 | Magic link authentication | P1 |
| FR-303 | Session management (token refresh, revocation) | P0 |
| FR-304 | User profiles (name, avatar) | P0 |
| FR-305 | Workspaces for team organization | P1 |

### 1.5 Workspace & Organization (P1)

| ID | Requirement | Priority |
|---|---|---|
| FR-400 | Dashboard with board list | P0 |
| FR-401 | Board search and filtering | P1 |
| FR-402 | Board favorites/pinning | P2 |
| FR-403 | Board folders/collections | P2 |
| FR-404 | Workspace member management | P1 |
| FR-405 | Workspace-level roles (admin, member) | P1 |

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Canvas rendering FPS | ≥ 60 FPS |
| NFR-002 | Input-to-render latency | < 16ms |
| NFR-003 | Collaboration sync latency (p95) | < 100ms |
| NFR-004 | Initial page load (TTI) | < 2s (cached), < 4s (cold) |
| NFR-005 | Board with 10,000 elements — render time | < 100ms |
| NFR-006 | Memory usage for 5,000 element board | < 200MB |
| NFR-007 | WebSocket message size (p99) | < 64KB |

### 2.2 Scalability

| ID | Requirement | Target |
|---|---|---|
| NFR-100 | Concurrent editors per board | 50 |
| NFR-101 | Concurrent boards (active WebSocket rooms) | 10,000 |
| NFR-102 | Total boards stored | 1,000,000+ |
| NFR-103 | Total users | 100,000+ |
| NFR-104 | Board elements | 50,000+ per board |
| NFR-105 | Image uploads per board | 100 images, 4MB each |

### 2.3 Reliability & Availability

| ID | Requirement | Target |
|---|---|---|
| NFR-200 | Uptime SLA | 99.95% |
| NFR-201 | Recovery Time Objective (RTO) | 15 minutes |
| NFR-202 | Recovery Point Objective (RPO) | 1 minute |
| NFR-203 | Crash-free session rate | > 99.9% |
| NFR-204 | Data durability | 99.999% |
| NFR-205 | Reconnect success rate | > 99% |

### 2.4 Security

| ID | Requirement | Target |
|---|---|---|
| NFR-300 | All API endpoints authenticated | 100% (except health/public) |
| NFR-301 | Server-side authorization on all mutations | 100% |
| NFR-302 | Data encrypted at rest | AES-256 |
| NFR-303 | Data encrypted in transit | TLS 1.3 |
| NFR-304 | Dependency vulnerability scanning | Every CI run |
| NFR-305 | OWASP Top 10 compliance | Full |
| NFR-306 | Secrets rotation capability | Yes |

### 2.5 Accessibility

| ID | Requirement | Target |
|---|---|---|
| NFR-400 | WCAG 2.1 Level AA compliance | All non-canvas UI |
| NFR-401 | Keyboard navigation for all controls | 100% |
| NFR-402 | Screen reader support for UI controls | 100% |
| NFR-403 | Reduced motion support | Yes |
| NFR-404 | Color contrast (AA) | All text/controls |
| NFR-405 | Focus indicators | Visible on all interactive elements |

### 2.6 Browser Compatibility

| Browser | Minimum Version |
|---|---|
| Chrome | 100+ |
| Firefox | 100+ |
| Safari | 16+ |
| Edge | 100+ |
| Mobile Chrome | 100+ |
| Mobile Safari | 16+ |

### 2.7 Observability

| ID | Requirement | Target |
|---|---|---|
| NFR-500 | Structured logging (JSON) | All services |
| NFR-501 | Distributed tracing | All request paths |
| NFR-502 | Metrics collection | All key operations |
| NFR-503 | Alerting on critical failures | < 1 minute detection |
| NFR-504 | Dashboard visibility | Grafana or equivalent |
