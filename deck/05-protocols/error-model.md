# Error Model & Failure Codes

## 1. Error Representation Standards

All error responses across HTTP REST APIs and WebSocket control channels conform to **RFC 7807 (Problem Details for HTTP APIs)** to ensure unambiguous, actionable client handling.

```json
{
  "type": "https://api.whiteboard.domain/errors/RATE_LIMIT_EXCEEDED",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "You have exceeded the maximum allowed operation frequency of 60 operations/second.",
  "instance": "/api/v1/boards/018f4a12-8e3b-7a2e-b6a1-94e85764d123/operations",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 15
}
```

---

## 2. Canonical Error Code Registry

| Error Code | HTTP Status | WS Code | Description & Client Handling |
|---|:---:|:---:|---|
| `UNAUTHENTICATED` | 401 | 4001 | Access token missing, invalid, or expired. Client triggers silent token refresh; redirects to login on failure. |
| `FORBIDDEN` | 403 | 1008 | User lacks required RBAC permission (e.g., Viewer attempting to edit). Display banner explaining role limitations. |
| `RESOURCE_NOT_FOUND` | 404 | 4004 | Board, workspace, or element does not exist. (Used in place of 403 for private boards to prevent enumeration). |
| `BOARD_LOCKED` | 423 | 4002 | Board locked by owner for editing. Client sets canvas into read-only mode and disables editing toolbars. |
| `ELEMENT_QUOTA_EXCEEDED` | 422 | 4022 | Board element count reached maximum plan tier limit (15,000). Show upgrade prompt dialog. |
| `PAYLOAD_TOO_LARGE` | 413 | 1009 | Payload or image asset exceeded maximum allowed size. Client cancels upload and alerts user with size ceiling. |
| `RATE_LIMIT_EXCEEDED` | 429 | 4029 | Excessive operations sent within time window. Client throttles background sync queue and displays transient warning toast. |
| `CORRUPTED_DOCUMENT_STATE` | 500 | 1011 | CRDT binary failed deserialization or integrity checks. Client resets to latest verified snapshot. |
| `SERVICE_UNAVAILABLE` | 503 | 1013 | Upstream database or Redis partition detected. Client engages exponential backoff offline mode. |

---

## 3. Client Graceful Degradation & Toast Notification Matrix

| Scenario | Severity | Visual Presentation | Retry Policy |
|---|---|---|---|
| **Network Offline** | Warning | Amber status pill in header: `"Offline — changes saved locally"` | Silent background probe every 3s via `navigator.onLine` and ping |
| **Viewer Role Write Attempt** | Info | Subtle shake animation on tool + tooltip: `"You have view-only access"` | No retry; feature disabled |
| **Sync Server Failure** | Critical | Toast banner: `"Connection interrupted. Retrying in Xs..."` | Exponential backoff (1s, 2s, 4s, 8s, max 10s) with jitter |
| **Document State Reset** | Error | Modal alert: `"Board state resynchronized from server snapshot"` | Client re-hydrates canvas from server snapshot |
