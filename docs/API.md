# API and Protocol Specification

This document defines all external REST endpoints, WebSocket message schemas, and client actions used across the application.

---

## 1. REST / HTTP Endpoints

### 1. Upload Encrypted Scene Snapshot
- **Method:** `POST`
- **Path:** `/api/v2/post/` (Configured via `VITE_APP_BACKEND_V2_POST_URL`)
- **Caller:** Anyone (Public client)
- **Input:**
  - Headers: `Content-Type: application/octet-stream`
  - Body: Binary ArrayBuffer containing deflated, AES-GCM encrypted scene JSON. Max body size 2MB.
- **Output:**
  - `200 OK`: `JSON { "id": "hexDocumentId" }`
  - `413 Payload Too Large`: `JSON { "error_class": "RequestTooLargeError" }`
  - `500 Internal Server Error`: `JSON { "error": "Internal error" }`

### 2. Fetch Encrypted Scene Snapshot
- **Method:** `GET`
- **Path:** `/api/v2/:id` (Configured via `VITE_APP_BACKEND_V2_GET_URL`)
- **Caller:** Anyone with document ID
- **Input:**
  - Path parameter: `:id` (String identifier)
- **Output:**
  - `200 OK`: Binary ArrayBuffer containing the encrypted scene bytes.
  - `404 Not Found`: Empty or error JSON.

### 3. Fetch Shape Library Collection
- **Method:** `GET`
- **Path:** `/libraries` (Configured via `VITE_APP_LIBRARY_BACKEND`)
- **Caller:** Anyone
- **Input:**
  - Query parameters: `?search=query`
- **Output:**
  - `200 OK`: `JSON { "items": [ { "id": "...", "name": "...", "elements": [...] } ] }`

### 4. Text-to-Diagram AI Generation
- **Method:** `POST`
- **Path:** `/v1/ai/pipeline` (Configured via `VITE_APP_AI_BACKEND`)
- **Caller:** Anyone
- **Input:**
  - Body: `JSON { "prompt": "System architecture diagram with database and cache", "type": "mermaid" }`
- **Output:**
  - `200 OK`: `JSON { "elements": [ ...ExcalidrawElement[] ] }`
  - `400 Bad Request`: `JSON { "error": "Invalid diagram schema" }`

---

## 2. WebSocket Real-Time Protocols

All real-time messages are dispatched over `Socket.io` connections to `VITE_APP_WS_SERVER_URL`.

### 1. `SERVER_BROADCAST: SCENE_UPDATE`
- **Direction:** Client $\rightarrow$ Server $\rightarrow$ Other Clients in Room
- **Payload:**
  ```json
  {
    "type": "WS_SCENE_UPDATE",
    "payload": {
      "elements": [
        {
          "id": "elem123",
          "version": 42,
          "versionNonce": 839218,
          "index": "a0",
          "x": 120,
          "y": 240
        }
      ]
    }
  }
  ```

### 2. `SERVER_BROADCAST: MOUSE_LOCATION`
- **Direction:** Client $\rightarrow$ Server $\rightarrow$ Other Clients in Room
- **Payload:**
  ```json
  {
    "type": "WS_MOUSE_LOCATION",
    "payload": {
      "socketId": "socket_abc123",
      "pointer": { "x": 512, "y": 340, "tool": "pointer" },
      "button": "up",
      "selectedElementIds": { "elem123": true },
      "username": "Alex"
    }
  }
  ```

### 3. `SERVER_BROADCAST: IDLE_STATUS`
- **Direction:** Client $\rightarrow$ Server $\rightarrow$ Other Clients in Room
- **Payload:**
  ```json
  {
    "type": "WS_IDLE_STATUS",
    "payload": {
      "socketId": "socket_abc123",
      "userState": "idle",
      "username": "Alex"
    }
  }
  ```
