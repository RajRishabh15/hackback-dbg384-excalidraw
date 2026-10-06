# REST API Specification (OpenAPI 3.1 Aligned)

## 1. Authentication & Base Conventions

- **Base URL**: `https://api.whiteboard.domain/api/v1`
- **Authentication**: `Authorization: Bearer <jwt_access_token>`
- **Content-Type**: `application/json` (except multipart asset endpoints)
- **Error Standard**: RFC 7807 Problem Details (`application/problem+json`)

---

## 2. API Endpoints

### 2.1 Authentication & User Management

#### `POST /auth/register`
- **Description**: Registers a new user account.
- **Request Body**:
  ```json
  {
    "email": "alex@company.com",
    "password": "SecurePassword123!",
    "name": "Alex Mercer"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "user": { "id": "018f4a12-8e3b-7a2e-b6a1-94e85764d001", "email": "alex@company.com", "name": "Alex Mercer" },
    "accessToken": "eyJhbGciOi..."
  }
  ```

#### `POST /auth/login`
- **Description**: Authenticates user and issues access token + HttpOnly refresh cookie.
- **Request Body**: `{ "email": "alex@company.com", "password": "SecurePassword123!" }`
- **Response** (`200 OK`): `{ "accessToken": "eyJhbGciOi...", "expiresIn": 900 }`

---

### 2.2 Workspaces

#### `GET /workspaces`
- **Description**: Lists all workspaces accessible by the authenticated user.
- **Response** (`200 OK`):
  ```json
  [
    { "id": "018f4a12-8e3b-7a2e-b6a1-94e85764d010", "name": "Design Systems Team", "slug": "design-systems", "role": "OWNER" }
  ]
  ```

---

### 2.3 Whiteboard Management

#### `POST /workspaces/:workspaceId/boards`
- **Description**: Creates a new whiteboard canvas.
- **Request Body**:
  ```json
  {
    "title": "Q3 Microservice Architecture",
    "description": "System design for new billing engine",
    "isPublic": false,
    "e2eeEnabled": false
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "018f4a12-8e3b-7a2e-b6a1-94e85764d123",
    "title": "Q3 Microservice Architecture",
    "workspaceId": "018f4a12-8e3b-7a2e-b6a1-94e85764d010",
    "ownerId": "018f4a12-8e3b-7a2e-b6a1-94e85764d001",
    "elementCount": 0,
    "createdAt": "2026-10-06T10:00:00Z"
  }
  ```

#### `GET /boards/:id`
- **Description**: Retrieves board metadata and user permission role.
- **Response** (`200 OK`):
  ```json
  {
    "id": "018f4a12-8e3b-7a2e-b6a1-94e85764d123",
    "title": "Q3 Microservice Architecture",
    "role": "EDITOR",
    "isLocked": false,
    "e2eeEnabled": false,
    "version": 42,
    "updatedAt": "2026-10-06T10:25:00Z"
  }
  ```

#### `POST /boards/:id/live-ticket`
- **Description**: Exchanges authorization for a single-use WebSocket connection ticket.
- **Response** (`200 OK`):
  ```json
  {
    "ticket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30...",
    "wsEndpoint": "wss://realtime.whiteboard.domain/boards/018f4a12-8e3b-7a2e-b6a1-94e85764d123",
    "role": "EDITOR",
    "expiresAt": "2026-10-06T10:31:00Z"
  }
  ```

---

### 2.4 Collaboration & Share Links

#### `POST /boards/:id/shares`
- **Description**: Generates an external share link.
- **Request Body**:
  ```json
  {
    "role": "VIEWER",
    "passcode": "OptionalSecret99!",
    "expiresAt": "2026-10-13T10:00:00Z"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "shareUrl": "https://whiteboard.domain/s/7f9a2b1c4e8d...",
    "role": "VIEWER",
    "expiresAt": "2026-10-13T10:00:00Z"
  }
  ```

---

### 2.5 Assets & File Uploads

#### `POST /boards/:id/assets/presign`
- **Description**: Generates a presigned S3 URL for direct client-to-storage upload.
- **Request Body**:
  ```json
  {
    "filename": "screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 1420500
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "assetId": "018f4a12-8e3b-7a2e-b6a1-94e85764d999",
    "uploadUrl": "https://s3.amazonaws.com/whiteboard-storage/workspaces/...?",
    "s3Key": "workspaces/org-1/boards/b-1/assets/...",
    "expiresInSeconds": 300
  }
  ```
