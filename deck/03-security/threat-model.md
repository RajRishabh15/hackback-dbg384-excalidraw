# Threat Model

## Methodology

This threat model uses the **STRIDE** framework combined with data flow analysis and trust boundary identification.

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│  BOUNDARY 0: Internet                                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  BOUNDARY 1: CDN / Load Balancer                             │     │
│  │                                                               │     │
│  │  ┌───────────────────────────────────────────────────┐       │     │
│  │  │  BOUNDARY 2: Application Tier                       │       │     │
│  │  │                                                     │       │     │
│  │  │  ┌─────────────┐  ┌──────────────┐                │       │     │
│  │  │  │  API Server  │  │  WS Server   │                │       │     │
│  │  │  │  (Fastify)   │  │  (Hocuspocus) │                │       │     │
│  │  │  └──────┬───────┘  └──────┬────────┘                │       │     │
│  │  │         │                  │                         │       │     │
│  │  │  ┌──────┴──────────────────┴────────────┐           │       │     │
│  │  │  │  BOUNDARY 3: Data Tier                │           │       │     │
│  │  │  │  ┌────────────┐  ┌───────┐  ┌─────┐  │           │       │     │
│  │  │  │  │ PostgreSQL │  │ Redis │  │  S3  │  │           │       │     │
│  │  │  │  └────────────┘  └───────┘  └─────┘  │           │       │     │
│  │  │  └───────────────────────────────────────┘           │       │     │
│  │  └───────────────────────────────────────────────────┘       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  Clients (Browsers) — UNTRUSTED                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## STRIDE Analysis

### S — Spoofing

| Threat | Attack Vector | Affected Component | Impact | Mitigation |
|---|---|---|---|---|
| S-1: Session hijacking | Stolen JWT from XSS | API/WS Server | Account takeover | HTTP-only cookies for refresh tokens, short-lived JWTs, CSP |
| S-2: Token replay | Intercepted token reuse | API Server | Unauthorized access | Short token lifetime (15 min), TLS enforced |
| S-3: OAuth redirect manipulation | Modified redirect URI | Auth Server | Credential theft | Strict redirect URI validation, state parameter |
| S-4: Collaborator impersonation | Forged cursor/presence data | WS Server | Confusion | Server assigns socket IDs, validates user identity per connection |

### T — Tampering

| Threat | Attack Vector | Affected Component | Impact | Mitigation |
|---|---|---|---|---|
| T-1: Element manipulation | Malicious WS operations | WS Server | Board corruption | Server validates operation schema and permissions |
| T-2: Board data corruption | Direct DB access | Database | Data loss | DB access restricted to application, input validation |
| T-3: Operation replay | Re-sending old operations | WS Server | State confusion | CRDT handles idempotent operations by design |
| T-4: File content tampering | Modified upload | Object Storage | Malicious content delivery | Content-type validation, file integrity checks |

### R — Repudiation

| Threat | Attack Vector | Affected Component | Impact | Mitigation |
|---|---|---|---|---|
| R-1: Denied edits | User claims they didn't make changes | Audit System | Accountability loss | Server-side audit log with user ID, timestamp, operation |
| R-2: Denied account actions | User claims login was unauthorized | Auth System | Dispute | Login audit log with IP, user agent, timestamp |

### I — Information Disclosure

| Threat | Attack Vector | Affected Component | Impact | Mitigation |
|---|---|---|---|---|
| I-1: Board enumeration | Guessing board IDs | API Server | Unauthorized access | UUID v4 (122 bits entropy), require authentication |
| I-2: User enumeration | Probing email existence | Auth Server | Privacy breach | Generic "invalid credentials" error |
| I-3: Metadata leakage | Server error messages | API Server | Architecture exposure | Generic error messages in production |
| I-4: Clipboard exfiltration | XSS reading clipboard | Browser | Data theft | CSP, input sanitization |
| I-5: Image URL leakage | Unsigned storage URLs | Object Storage | Unauthorized file access | Signed URLs with expiration |

### D — Denial of Service

| Threat | Attack Vector | Affected Component | Impact | Mitigation |
|---|---|---|---|---|
| D-1: WS connection exhaustion | Excessive connections | WS Server | Service unavailable | Per-IP and per-user connection limits |
| D-2: Message flooding | High-rate WS messages | WS Server | CPU/bandwidth exhaustion | Per-connection rate limiting |
| D-3: Large payload | Oversized WS messages | WS Server | Memory exhaustion | Max payload size (1MB) |
| D-4: Board bloat | Creating excessive elements | Database/WS | Slow rendering, storage cost | Element count limits |
| D-5: Storage exhaustion | Excessive file uploads | Object Storage | Storage cost, quota exceeded | Per-workspace storage quotas |
| D-6: API abuse | High-rate API calls | API Server | Service degradation | Rate limiting per user/IP |

### E — Elevation of Privilege

| Threat | Attack Vector | Affected Component | Impact | Mitigation |
|---|---|---|---|---|
| E-1: Role escalation | Modifying own board membership | API Server | Unauthorized editing | Server-side role checks, only owners can change roles |
| E-2: Cross-board access | Accessing another user's board | API/WS Server | Data breach | Board membership check on every operation |
| E-3: Admin escalation | Manipulating workspace role | API Server | Full workspace control | Role changes require admin, logged |
| E-4: IDOR on board operations | Guessing board/element IDs | API Server | Unauthorized modification | Ownership/membership verification on every mutation |

## Attack Scenarios

### Scenario 1: Malicious Collaborator
**Attacker**: Invited editor with valid credentials  
**Goal**: Corrupt or destroy board data  
**Attack Path**:
1. Join board as editor
2. Send rapid element deletions via WebSocket
3. Or: Create elements with malicious SVG content
4. Or: Upload oversized files to exhaust storage

**Mitigations**:
- Element operations are tracked with user ID in audit log
- Rate limiting on operations (100 ops/second)
- File size limits enforced server-side
- SVG content sanitized before storage
- Board owners can remove editors and restore versions

### Scenario 2: Unauthorized Board Access
**Attacker**: External user without board access  
**Goal**: View or modify a private board  
**Attack Path**:
1. Obtain or guess board UUID
2. Attempt WebSocket connection to board room
3. Or: Call API endpoints with board ID

**Mitigations**:
- Board ID is UUID v4 (unguessable with 122 bits entropy)
- WebSocket connection requires valid JWT + board membership
- API endpoints verify board membership
- No board data returned for unauthorized requests (404, not 403)

### Scenario 3: XSS via Element Content
**Attacker**: Any user who can edit  
**Goal**: Execute JavaScript in other users' browsers  
**Attack Path**:
1. Create a text element with `<script>` or event handlers
2. Or: Upload an SVG with embedded JavaScript
3. Or: Set element link to `javascript:alert(1)`

**Mitigations**:
- Text content is rendered on Canvas (not DOM) — no HTML injection possible
- SVG files sanitized with DOMPurify before storage/rendering
- URL validation: only `http://`, `https://`, and internal protocols allowed
- CSP prevents inline script execution

### Scenario 4: Token Theft and Session Hijacking
**Attacker**: External attacker or XSS exploit  
**Goal**: Take over user's session  
**Attack Path**:
1. XSS exploit reads access token from memory
2. Or: Network MITM intercepts token (mitigated by TLS)
3. Use token to make API calls as the user

**Mitigations**:
- Access tokens expire in 15 minutes (limits window)
- Refresh tokens in HTTP-only cookies (inaccessible to JS)
- Refresh token rotation detects theft
- CSP prevents XSS vectors
- HTTPS enforced (HSTS)

## Residual Risks

| Risk | Likelihood | Impact | Residual Status |
|---|---|---|---|
| Zero-day in dependencies | Low | High | Mitigated by dependency scanning, SBOM |
| Browser extension snooping | Low | Medium | Out of scope (client device security) |
| Insider threat (admin) | Low | High | Mitigated by audit logging, role separation |
| CRDT state explosion | Very Low | Medium | Mitigated by compaction and element limits |
| DNS hijacking | Very Low | High | Mitigated by DNSSEC (deployment concern) |
