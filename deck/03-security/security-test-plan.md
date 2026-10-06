# Security Test Plan & Verification Procedures

## 1. Scope & Objectives

This test plan defines the testing methodology, automated regression tests, and manual verification procedures to ensure that all vulnerabilities identified in the reference analysis are resolved and that the new security posture remains uncompromised throughout the software lifecycle.

Testing covers:
1. **Authentication & Session Security**
2. **Authorization & Multi-Tenancy (RBAC & IDOR)**
3. **Realtime WebSocket Security & DoS Resilience**
4. **Input Sanitization, XSS & SVG Exploits**
5. **Data Protection, Cryptography & Storage Boundaries**

---

## 2. Automated Security Test Matrix

| Test Suite ID | Test Case Title | Target Component | Threat / Vuln Ref | Automation Tool | Assertion / Acceptance Criteria |
|---|---|---|---|---|---|
| **SEC-TEST-001** | Password Policy & Timing Attack Check | `POST /auth/login` | Credential Brute Force | Jest / Supertest | Response time variance between existing/non-existing users < 50ms; Argon2id enforced; lockout on 5 failures |
| **SEC-TEST-002** | Token Forgery & Expiration Validation | API Auth Guard | Session Hijacking | Vitest | Tampered signature fails with `401 Unauthorized`; expired token fails immediately |
| **SEC-TEST-003** | IDOR Cross-Tenant Board Isolation | `GET /boards/:id` | VULN-001 / IDOR | Supertest + RLS | User A cannot query, update, or delete User B's board; returns `404 Not Found` (no metadata leak) |
| **SEC-TEST-004** | Role Boundary Violation (Viewer Write) | WebSocket Gateway | VULN-002 / RBAC | WS Test Runner | Viewer role attempting to send element mutation frame receives immediate socket termination `1008 Policy Violation` |
| **SEC-TEST-005** | WebSocket Malformed Payload Injection | Hocuspocus Sync | VULN-003 / DoS | Playwright + WS fuzz | Injection of `__proto__`, `NaN` coords, or non-schema JSON is dropped with error; server memory remains flat |
| **SEC-TEST-006** | SVG Script & External Entity Injection | `POST /boards/:id/assets` | VULN-004 / Stored XSS | Vitest + DOMPurify | SVG containing `<script>`, `onload`, or `<!ENTITY>` is stripped clean before persisting to S3 |
| **SEC-TEST-007** | Element Hyperlink Protocol Validation | Canvas Click Handler | VULN-004 / XSS | Playwright E2E | Links with `javascript:` or `data:` are neutralized; clicking them triggers safe warning modal, zero execution |
| **SEC-TEST-008** | High-Frequency Operation Flooding | WebSocket Ingest | VULN-005 / DoS | k6 / Artillery | Client sending > 60 ops/sec is rate-limited; socket throttled or closed with `1008`; no peer latency degradation |
| **SEC-TEST-009** | URL Cryptographic Key Isolation | Client Router & History | VULN-006 / Key Leak | Playwright E2E | `window.location.href` and referrers do not expose private decryption keys or persistent passwords |
| **SEC-TEST-010** | Content Security Policy Enforcement | Web Client Response | Script Injection | Playwright / curl | HTTP header check: `frame-ancestors 'none'`, `script-src 'self'`, no `unsafe-inline` permitted |

---

## 3. Regression Test Implementations (Automated Code Samples)

### 3.1 IDOR Cross-Tenant Access Test (`tests/security/idor.test.ts`)
```typescript
import request from "supertest";
import { app } from "../../apps/api/src/server";
import { createTestUser, createTestBoard } from "../fixtures";

describe("Security: IDOR & Tenant Isolation", () => {
  it("prevents unauthorized users from reading private boards across workspaces", async () => {
    const userA = await createTestUser("org-alpha");
    const userB = await createTestUser("org-beta");
    const boardA = await createTestBoard(userA.workspaceId, userA.id, { isPublic: false });

    // User B attempts to access User A's board
    const response = await request(app.server)
      .get(`/api/v1/boards/${boardA.id}`)
      .set("Authorization", `Bearer ${userB.token}`);

    // Must return 404 rather than 403 to prevent board ID enumeration
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("ResourceNotFound");
  });
});
```

### 3.2 WebSocket Malformed Frame Injection (`tests/security/ws-fuzz.test.ts`)
```typescript
import WebSocket from "ws";
import { getViewerToken } from "../fixtures";

describe("Security: Realtime Ingest Validation", () => {
  it("terminates connection or drops corrupted geometry payload", (done) => {
    const token = getViewerToken("board-123");
    const ws = new WebSocket(`ws://localhost:4000/realtime?ticket=${token}`);

    ws.on("open", () => {
      // Malicious payload attempting prototype pollution & NaN coordinates
      const maliciousPayload = JSON.stringify({
        type: "UPDATE_ELEMENT",
        payload: {
          __proto__: { isAdmin: true },
          id: "element-evil",
          x: NaN,
          y: Infinity,
          width: 1e12,
          height: -500,
        },
      });

      ws.send(maliciousPayload);
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "ERROR") {
        expect(msg.code).toBe("INVALID_OPERATION_PAYLOAD");
        ws.close();
        done();
      }
    });

    ws.on("close", (code) => {
      expect([1008, 1000]).toContain(code);
      done();
    });
  });
});
```

---

## 4. Periodic Security Audits & Penetration Testing

1. **Pre-Release SAST/DAST Gate**:
   - SAST (Semgrep / CodeQL) must have zero unresolved High/Critical issues to merge into `main`.
   - DAST (OWASP ZAP) executed against the staging environment covering API endpoints before each milestone release.
2. **Third-Party Penetration Testing**:
   - Annual blackbox and greybox penetration test conducted by an external accredited security firm.
   - Specific focus on CRDT synchronization deserialization attacks and WebSocket state poisoning.
3. **Bug Bounty Program**:
   - Responsible disclosure policy published at `/.well-known/security.txt`.
   - Managed bug bounty program scoped to API endpoints, realtime engine, and authentication flows.
