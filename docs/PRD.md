# Product Requirements Document (PRD)

## 1. Problem
Individuals and teams need an instant, frictionless visual whiteboard to communicate architecture, brainstorm ideas, and draft diagrams without complex account creation, heavy UI overhead, or data privacy risks.

## 2. Target User
- **Software Engineers & Architects:** Creating quick visual documentation, flowcharts, and system designs.
- **Designers & Product Managers:** Wireframing interfaces and collaborating with teammates in real time.
- **Developers (Integrators):** Embedding a lightweight, customizable sketch canvas into their web applications.

## 3. One-Line Problem Statement
For **developers and creators** who **struggle with heavyweight diagramming tools requiring mandatory logins and slow setups**, **our rebuild** does **instant, zero-account, end-to-end encrypted real-time sketching with local-first persistence**, unlike **traditional cloud whiteboards that lock drawings behind accounts and server-side tracking**.

---

## 4. Core User Flow (Step-by-Step)

1. **Visit Canvas:** User navigates to the app root (`/`) and instantly sees an interactive whiteboard ready for drawing without login barriers.
2. **Drafting:** User selects tools (rectangle, diamond, ellipse, arrow, text, free-draw) and sketches directly on the infinite canvas.
3. **Local Auto-Save:** Canvas state is automatically serialized and saved locally to browser IndexedDB after every stroke.
4. **Initiate Collaboration:** User clicks "Live Collaboration", generating an E2E encryption key and room ID.
5. **Share Room:** User shares the `#room=...` link; collaborators join without accounts, sharing live cursors and synchronizing shapes.
6. **Export & Share:** User exports the finished drawing to PNG/SVG or generates an immutable, encrypted snapshot link (`#json=...`).

---

## 5. Feature Prioritization (MoSCoW)

### Must Have
- Infinite 2D hand-drawn styled canvas with rough path rendering.
- Core geometric shapes (rectangle, ellipse, diamond, line, arrow, free-draw, text).
- Local-first auto-persistence in browser IndexedDB.
- Real-time multi-user collaboration with live cursor presence and room sharing.
- Client-side end-to-end encryption for share links and room synchronization.
- Export to PNG, SVG, and `.excalidraw` JSON format.

### Should Have
- Markdown & Mermaid diagram import (text-to-diagram).
- Shape library management (saving and importing custom asset packs).
- Snapping to grid, element centers, and geometric midpoints.
- View-only read-only mode for share links.

### Could Have
- Visual debug overlay for container bounding boxes.
- Dark mode theme toggle.
- Localized multi-language interface.

### Won't Have (Initial Release)
- Proprietary enterprise cloud billing portals.
- Mandatory user login/authentication systems.
- Video/audio chat hosting (signaling metadata only).

---

## 6. Out of Scope
- Server-side indexing or search across encrypted canvas payloads.
- Proprietary multi-workspace cloud file management suites.
- Desktop native Electron builds (web and PWA only).

---

## 7. Acceptance Criteria (Given / When / Then)

### Feature: Canvas Drawing
- **Given** an open canvas,
- **When** the user selects the rectangle tool and drags on the canvas,
- **Then** a hand-drawn rectangle element is created and rendered immediately.

### Feature: Local Persistence
- **Given** an active drawing session,
- **When** the user adds shapes and refreshes the browser,
- **Then** the drawing state is fully restored from browser storage.

### Feature: Real-Time Encrypted Collaboration (Killer Test 1)
- **Given** an active drawing session,
- **When** the host clicks "Live Collaboration" and shares the `#room=roomId,roomKey` URL with a peer,
- **Then** both users can see each other's live cursor movements and modify elements concurrently with changes synced within 100ms.

### Feature: End-to-End Encrypted Share Links (Killer Test 2)
- **Given** a finished diagram on the canvas,
- **When** the user clicks "Export to link",
- **Then** the payload is compressed and encrypted with a local 128-bit AES key, the encrypted ciphertext is saved to the server, and the generated URL contains the decryption key only in the URL hash `#json=...`.
