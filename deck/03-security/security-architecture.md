# Security Architecture

## Security Design Principles

1. **Zero Trust**: Never trust client-provided data. All sensitive operations are validated and authorized server-side.
2. **Defense in Depth**: Multiple layers of security controls at every boundary.
3. **Least Privilege**: Users and services have minimum necessary permissions.
4. **Secure by Default**: Security features are enabled by default, not opt-in.
5. **Fail Closed**: On security check failure, deny access rather than allow.

## Identity & Authentication

### Authentication Architecture

```
Client → API Gateway → Auth Middleware → Route Handler
                          ↓
                    Token Validation
                          ↓
                ┌─────────┴──────────┐
                │   JWT Verification  │
                │   (RS256, short-   │
                │    lived access     │
                │    tokens)          │
                └─────────┬──────────┘
                          ↓
                    Session Store
                    (Redis / DB)
```

### Authentication Methods

| Method | Priority | Use Case |
|---|---|---|
| OAuth2/OIDC (Google, GitHub, Microsoft) | P0 | Primary login for most users |
| Email/password | P0 | Fallback for users without OAuth providers |
| Magic link (email) | P1 | Low-friction login |
| Passkeys (WebAuthn) | P2 | Passwordless, phishing-resistant |

### Token Strategy

**Access Token:**
- Format: JWT (RS256)
- Lifetime: 15 minutes
- Claims: `sub` (user ID), `iss`, `iat`, `exp`, `workspace_id`, `roles`
- Storage: In-memory (JavaScript variable, NOT localStorage)
- Sent via: `Authorization: Bearer <token>` header

**Refresh Token:**
- Format: Opaque token (random 256-bit)
- Lifetime: 7 days (sliding window)
- Storage: HTTP-only, Secure, SameSite=Strict cookie
- Rotation: New refresh token issued on each use (old one invalidated)
- Stored server-side: Hashed in PostgreSQL `refresh_tokens` table

**Why NOT localStorage for tokens:**
- XSS vulnerability: Any injected script can read localStorage
- HTTP-only cookies are inaccessible to JavaScript
- SameSite=Strict prevents CSRF

### Session Management

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 of token
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

**Session Security:**
- Refresh token rotation: Each use generates a new token and invalidates the old one
- Reuse detection: If a revoked refresh token is used, all tokens for that user are invalidated (potential token theft)
- Maximum concurrent sessions: 10 per user (configurable)
- Idle timeout: 30 days of inactivity
- Force logout: User can revoke all sessions

## Authorization Model

### Role-Based Access Control (RBAC)

```
Workspace Level:
  ├── workspace:admin  — Full control over workspace settings, members, boards
  ├── workspace:member — Create boards, join boards, manage own boards
  └── workspace:guest  — View boards shared with them (P2)

Board Level:
  ├── board:owner      — All permissions, can delete board
  ├── board:editor     — Draw, edit, delete elements, add comments
  ├── board:commenter  — View board, add comments (P1)
  └── board:viewer     — View board only, no modifications
```

### Permission Matrix

| Operation | Owner | Editor | Commenter | Viewer |
|---|---|---|---|---|
| View board | ✅ | ✅ | ✅ | ✅ |
| Draw/edit elements | ✅ | ✅ | ❌ | ❌ |
| Delete elements | ✅ | ✅ | ❌ | ❌ |
| Upload images | ✅ | ✅ | ❌ | ❌ |
| Add comments | ✅ | ✅ | ✅ | ❌ |
| Manage members | ✅ | ❌ | ❌ | ❌ |
| Change board settings | ✅ | ❌ | ❌ | ❌ |
| Delete board | ✅ | ❌ | ❌ | ❌ |
| Export board | ✅ | ✅ | ✅ | ✅ |
| View version history | ✅ | ✅ | ✅ | ✅ |
| Restore version | ✅ | ✅ | ❌ | ❌ |
| Share board | ✅ | ❌ | ❌ | ❌ |

### Authorization Enforcement

**Every** API request and WebSocket operation is authorized server-side:

```typescript
// Pseudocode: Authorization middleware
async function authorizeBoard(req: Request, requiredRole: BoardRole): Promise<void> {
  const userId = req.auth.userId;  // From JWT
  const boardId = req.params.boardId;
  
  const membership = await db.boardMembers.findOne({
    where: { userId, boardId }
  });
  
  if (!membership) {
    throw new ForbiddenError('Not a member of this board');
  }
  
  if (!hasPermission(membership.role, requiredRole)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  // Attach board context to request for downstream handlers
  req.boardContext = { boardId, role: membership.role };
}
```

**WebSocket authorization:**
```typescript
// On WebSocket connection:
// 1. Validate JWT from connection query/header
// 2. Verify board membership and role
// 3. Store authorized context in connection metadata
// 4. Reject connection if unauthorized

// On each WebSocket operation:
// 1. Check operation type against role permissions
// 2. Validate operation payload (schema + business rules)
// 3. Reject invalid operations with error message
```

## Input Validation

### Trust Boundaries

```
┌─────────────────────────────────────────────┐
│                  UNTRUSTED                   │
│  Client-provided data:                       │
│  - Element properties (x, y, width, etc.)    │
│  - Element IDs (user-generated UUIDs)        │
│  - Board names, descriptions                 │
│  - Comments, text content                    │
│  - Image files                               │
│  - WebSocket operation payloads              │
│  - URL parameters, query strings             │
│  - Authentication tokens (until verified)    │
└──────────────────────┬──────────────────────┘
                       ↓ VALIDATION BOUNDARY
┌──────────────────────┴──────────────────────┐
│                  TRUSTED                     │
│  Server-validated data:                      │
│  - Verified user identity                    │
│  - Authorized board membership               │
│  - Schema-validated element operations       │
│  - Sanitized text content                    │
│  - Size-checked file uploads                 │
└─────────────────────────────────────────────┘
```

### Validation Rules

| Input | Validation |
|---|---|
| Element ID | UUID v4 format, max 36 chars |
| Board ID | UUID v4 format |
| Element coordinates | Finite numbers, within [-1M, 1M] range |
| Element dimensions | Positive finite numbers, max 100,000 |
| Text content | Max 100,000 chars, HTML stripped/escaped |
| Board name | Max 255 chars, trimmed |
| Comment text | Max 10,000 chars, HTML stripped |
| Image upload | Max 4MB, validated MIME type (PNG, JPEG, SVG, GIF, WebP) |
| SVG content | Sanitized (no scripts, no external references) |
| URL/link values | Valid URL format, no `javascript:` protocol |
| Color values | Hex format or named color, validated |
| WebSocket payload | Max 1MB, schema-validated JSON |

## Encryption

### At Rest
- **Database**: PostgreSQL Transparent Data Encryption (TDE) or volume encryption (LUKS/EBS encryption)
- **Object storage**: S3 SSE-S3 or SSE-KMS encryption
- **Backups**: Encrypted with separate key

### In Transit
- **HTTPS**: TLS 1.3 enforced, HSTS header
- **WebSocket**: WSS (TLS-encrypted WebSocket)
- **Internal services**: mTLS between services (in production)

### Optional End-to-End Encryption (E2EE)
- For sensitive boards, optional client-side encryption (AES-256-GCM)
- Key derived from user-provided passphrase or room secret
- Server stores only ciphertext
- **Trade-off**: E2EE boards cannot have server-side search, AI features, or server-rendered thumbnails

## Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  connect-src 'self' wss://*.ourplatform.com https://*.ourplatform.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

## Security Headers

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

## Rate Limiting

| Endpoint | Rate Limit | Window |
|---|---|---|
| Login attempts | 5 per IP | 15 minutes |
| Token refresh | 30 per user | 1 minute |
| API requests (authenticated) | 1000 per user | 1 minute |
| API requests (unauthenticated) | 30 per IP | 1 minute |
| WebSocket connections | 10 per user | 1 minute |
| WebSocket messages (operations) | 100 per connection | 1 second |
| WebSocket messages (cursor) | 30 per connection | 1 second |
| File uploads | 10 per user | 1 minute |
| Board creation | 20 per user | 1 hour |
| Comment creation | 30 per user | 1 minute |

## Abuse Prevention

- **Connection exhaustion**: Max 10 concurrent WebSocket connections per user
- **Message flooding**: Rate limit per message type, throttle at server
- **Payload limits**: Max 1MB per WebSocket message, max 4MB per file upload
- **Room size**: Max 50 concurrent connections per board room
- **Board element limit**: Soft limit at 50,000 elements (warning), hard limit at 100,000
- **Storage quota**: Per-workspace quotas for file storage
