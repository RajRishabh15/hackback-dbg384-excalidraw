# Security Controls & Policy Baseline

## 1. Identity, Authentication & Session Controls

### 1.1 Password & Credential Policy
- **Hashing Algorithm**: Argon2id (`m=65536` (64 MiB), `t=3`, `p=4`, minimum 16-byte cryptographically secure salt).
- **Password Strength**: Minimum 12 characters, checked against `HaveIBeenPwned` top 100,000 breached password list via k-anonymity API.
- **MFA / 2FA**: Time-based One-Time Password (TOTP, RFC 6238) support and WebAuthn / FIDO2 Passkeys.
- **Account Lockout**: After 5 failed consecutive attempts from the same IP/account, enforce 15-minute exponential backoff and dispatch security alert email.

### 1.2 Session Lifecycle & Token Management
- **Access Tokens**: Short-lived JSON Web Tokens (JWT) with 15-minute expiration, signed with asymmetric Ed25519 (EdDSA) or RS256 keys rotated bi-weekly.
- **Refresh Tokens**: Cryptographically random 256-bit strings stored in a revocable PostgreSQL table with client fingerprint (SHA-256 hash of User-Agent and IP subnet). Rotated on every use (token rotation with family revocation detection).
- **Cookie Flags**:
  ```http
  Set-Cookie: __Host-refresh_token=...; Path=/api/v1/auth; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000
  ```
- **Session Revocation**: Instant invalidation across all nodes via Redis blacklist (`revoked_tokens:{jti}` with TTL matching token expiry).

---

## 2. Authorization & Multi-Tenancy (RBAC Model)

### 2.1 Role Matrix

| Resource | Action | System Admin | Workspace Owner | Board Owner | Editor | Commenter | Viewer | Anonymous Guest |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Workspace** | Delete / Rename | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Workspace** | Invite Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Board** | Delete Board | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Board** | Change Permissions / Roles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Board** | Generate Share Link | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Elements** | Create, Update, Delete | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Allowed if link grants Editor |
| **Presence** | Broadcast Cursor / Ephemeral | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Allowed if link grants Viewer |
| **Comments** | Create, Reply, Resolve | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Board** | View Canvas & Elements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Allowed if link exists |
| **Export** | Download PNG / SVG / JSON | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Configurable (Owner can disable) |

### 2.2 PostgreSQL Row-Level Security (RLS) Implementation
Database operations execute within an active transaction where session parameters are set:
```sql
-- Set authenticated context
SET LOCAL app.current_user_id = '018f4a12-8e3b-7a2e-b6a1-94e85764d123';
SET LOCAL app.current_workspace_id = '018f4a12-8e3b-7a2e-b6a1-94e85764d000';

-- Enforce RLS on boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_access_policy ON boards
  FOR ALL
  USING (
    workspace_id = current_setting('app.current_workspace_id')::uuid
    AND (
      owner_id = current_setting('app.current_user_id')::uuid
      OR EXISTS (
        SELECT 1 FROM board_members bm
        WHERE bm.board_id = boards.id
        AND bm.user_id = current_setting('app.current_user_id')::uuid
      )
      OR boards.is_public = TRUE
    )
  );
```

---

## 3. Cryptography & Data Protection

### 3.1 Data in Transit
- Strict Transport Security: TLS 1.3 enforced, TLS 1.2 accepted with forward secrecy cipher suites only (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
- WebSockets: Encrypted over `wss://` exclusively; non-TLS `ws://` connections rejected immediately.

### 3.2 Data at Rest
- Database: PostgreSQL volumes encrypted using AES-256-XTS via AWS EBS encryption or dm-crypt/LUKS.
- S3 Object Storage: Server-Side Encryption with KMS Managed Keys (SSE-KMS) with automatic annual key rotation.
- Sensitive Columns: Column-level encryption for OAuth tokens and API secrets using AES-256-GCM with application-layer keys stored in Vault.

### 3.3 Zero-Knowledge End-to-End Encryption (Optional E2EE Mode)
For classified boards, users can activate Zero-Knowledge E2EE:
- **Key Generation**: 256-bit symmetric key generated via `window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])`.
- **Payload Encryption**: Elements and CRDT update vectors are serialized and encrypted in client memory using AES-256-GCM with a unique 96-bit IV per transaction before being sent across the WebSocket.
- **Server Knowledge**: The server, database, and relays only see opaque ciphertext byte blobs (`iv` + `ciphertext` + `tag`). The server is cryptographically incapable of viewing or inspecting board contents.

---

## 4. Input Sanitization & Browser Security Headers

### 4.1 Content Security Policy (CSP)
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://*.s3.amazonaws.com https://cdn.whiteboard.domain;
  connect-src 'self' wss://realtime.whiteboard.domain https://api.whiteboard.domain;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
```

### 4.2 Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## 5. DevSecOps & Supply Chain Security

1. **Automated Dependency Scanning**: Dependabot + Snyk running on all PRs. Immediate block on any dependency introducing High or Critical CVEs.
2. **Static Application Security Testing (SAST)**: Semgrep and SonarQube analyzing code during CI runs.
3. **Secret Detection**: Gitleaks integrated into pre-commit hooks and GitHub Actions to prevent accidental API key leaks.
4. **Container Image Hardening**: Base images use Alpine / Distroless Node 22 runtime; non-root user execution (`USER node`), read-only root filesystems where applicable. Trivy scans image vulnerabilities in CI before push.
