# Attack Surface Analysis

## 1. Overview & Trust Boundaries

The Live Collaborative Whiteboard exposes multiple interaction interfaces: HTTP REST endpoints, persistent WebSocket connections, file upload/import facilities, and client-side rendering engines. Understanding the attack surface requires delineating the boundary between untrusted inputs and internal system invariants.

```
                    ┌───────────────────────────────────────────────┐
                    │             Untrusted Internet               │
                    └───────────────────────┬───────────────────────┘
                                            │ TLS 1.3 / WSS
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │               Cloudflare / WAF                │
                    │  (DDoS Shield, IP Throttling, Geo-IP, Bot Rep)│
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │           Reverse Proxy / Ingress             │
                    │      (Traefik / NGINX / TLS Termination)      │
                    └───────────────┬───────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │ Internal VPC                            │
               ▼                                         ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│       REST API Gateway       │        │  Realtime WebSocket Gateway  │
│      (Fastify HTTP/2)        │        │   (Hocuspocus / WS Server)   │
│  - JWT Bearer Authentication │        │  - Room Ticket Validation    │
│  - JSON Schema Validation    │        │  - Yjs Binary Frame Decoding │
│  - Rate Limit: 100 req/min   │        │  - Per-Conn Rate: 60 ops/sec │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │                                       │
               ├───────────────────┐                   │
               ▼                   ▼                   ▼
┌──────────────────────────────┐  ┌─────────────────────────────────────┐
│      PostgreSQL 16 DB        │  │              Redis 7                │
│  - Row Level Security (RLS)  │  │  - Pub/Sub Channel Broker           │
│  - Prepared Statements       │  │  - Ephemeral Presence Cache         │
│  - TLS Connection Encrypted  │  │  - Distributed Token Bucket Limiter │
└──────────────────────────────┘  └─────────────────────────────────────┘
```

---

## 2. Attack Vectors by Interface

### 2.1 HTTP REST API

| Endpoint Vector | Input Mechanism | Threat | Mitigation / Control |
|---|---|---|---|
| `POST /api/v1/auth/login` | Email, Password / OAuth code | Credential stuffing, brute force, timing attack | Argon2id password hashing, rate limiting (5 req/min/IP), account lockout, constant-time verification |
| `POST /api/v1/boards` | JSON Title, Workspace ID, Config | Parameter tampering, unauthorized workspace creation | JWT role authorization, TypeBox schema validation, slug sanitation |
| `GET /api/v1/boards/:id` | Route Param `id` | Insecure Direct Object Reference (IDOR), SQL injection | UUID v4 strictly validated via regex, PostgreSQL Row Level Security (RLS) enforcing tenant & user permissions |
| `POST /api/v1/boards/:id/assets` | Multipart Form (Image blobs) | Arbitrary file upload, malware distribution, zip bombs | Magic byte MIME verification (PNG, JPEG, WebP, SVG), 5 MB max file size, stripping EXIF, re-encoding raster assets, SVG DOMPurify sanitization, storage in isolated S3 bucket with `Content-Disposition: attachment` |
| `POST /api/v1/boards/:id/share` | Role, Expiry, Passcode | Privilege escalation, token brute-forcing | Minimum 128-bit cryptographically secure token generation (`crypto.randomBytes(32)`), time-limited URLs |

---

### 2.2 WebSocket Transport Layer

| Vector | Ingress Mechanism | Risk / Attack | Defense Mechanism |
|---|---|---|---|
| Handshake | HTTP `Upgrade: websocket` | Unauthorized room connection, session fixation | Ticket-based handshake: Client must provide ephemeral signed token `ticket` in query params. Ticket validated before upgrade completion. |
| Message Ingestion | Binary / JSON frame stream | Message tampering, schema fuzzing, prototype pollution | Max payload size 256 KB. Binary frames validated against Yjs update specification; JSON events strictly validated against typed schemas. Unknown fields discarded. |
| Broadcast Amplification | `OPERATION` or `CURSOR_UPDATE` broadcast | Resource exhaustion, network flooding to peer connections | Redis Pub/Sub backpressure; WebSocket write buffers monitored. Dropped frames for slow consumers with backpressure notifications. |
| Malicious Element Mutation | Element properties update | Client rendering crash via extreme coordinates or recursions | Boundary validation: coordinates clamped to $[-10^6, 10^6]$, stroke widths to $[0.5, 64]$, rotation to $[0, 2\pi]$. Group depths limited to max 5 nested levels. |

---

### 2.3 Client Canvas & Browser Context

| Vector | Surface | Threat | Defense Strategy |
|---|---|---|---|
| Malicious Hyperlinks | `element.link` click handler | `javascript:` or `vbscript:` URI execution | Strict scheme validation: Whitelist only `https:`, `http:`, `mailto:`. Intercepted with confirmation modal warning user of external navigation. |
| Clipboard Paste | Paste event handler | Pasting oversized binary buffers or poisoned JSON | Parse clipboard through safe schema validator; reject unrecognized element types; sanitize pasted text via text-node sanitization. |
| Font & Asset Injection | Custom SVG / font imports | CSS injection, SSRF / exfiltration via web fonts | Restrict fonts to local system fonts and pre-approved Google Fonts CDN. Content Security Policy `font-src https://fonts.gstatic.com`. |
| Browser Memory Exhaustion | Canvas rendering loop | Tab crashing with 100k complex paths | Canvas quadtree viewport culling. Only elements intersecting visible bounding box are passed to Canvas 2D context. Hard limit of 15,000 active elements per board. |

---

## 3. Defense-in-Depth Layers

1. **Edge Shield**: Cloudflare Managed Rules, DDoS mitigation, WAF blocking SQLi / XSS patterns, Rate Limiting per IP.
2. **Network Perimeter**: AWS Security Groups / Kubernetes NetworkPolicies ensuring database and Redis instances are inaccessible from public IP addresses.
3. **Application Transport**: Strict TLS 1.3 only, HSTS (`max-age=63072000; includeSubDomains; preload`).
4. **Identity & Auth**: Signed, short-lived JWTs (15 min expiry) with rotating refresh tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
5. **Data Layer**: PostgreSQL connection over TLS with mutual TLS (mTLS) in production environments; all queries parameterized using Prisma / Kysely query builders.
6. **Object Storage**: S3 bucket private by default; assets served exclusively via short-lived AWS CloudFront signed URLs with strict `Content-Security-Policy: default-src 'none'`.
