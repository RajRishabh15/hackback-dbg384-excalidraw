# ◈ InkBoard — Real-Time Collaborative Whiteboard

An enterprise-grade, high-performance, real-time collaborative whiteboard featuring hand-drawn sketchy aesthetics, CRDT conflict-free synchronization, live multi-cursor presence, JWT-secured persistence, and vector/raster export capabilities.

![InkBoard](https://img.shields.io/badge/status-active-brightgreen.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.7-blue.svg)
![Yjs](https://img.shields.io/badge/sync-Yjs%20CRDT-orange.svg)
![Express](https://img.shields.io/badge/backend-Express%20%2B%20SQLite-darkblue.svg)

---

## ✨ Features

- ✏️ **Hand-Drawn & Sketchy Canvas Aesthetics**: Powered by `Rough.js` for authentic hand-drawn geometric primitives (rectangles, diamonds, ellipses, arrows, lines, freehand drawing, and rich text).
- 👥 **Real-Time Collaboration**: Sub-50ms synchronization via `Yjs` CRDTs over WebSockets with live collaborator cursor broadcasting and user presence avatars.
- ⚡ **Offline First & Auto-Save**: Dual-layer persistence with client-side `IndexedDB` caching and periodic server-side snapshot synchronization.
- 🔒 **Security & Authentication**: Production-ready JWT authentication, bcrypt password hashing, rate limiting, and board ownership/permission enforcement.
- 📐 **Vector & Raster Export / Import**:
  - Export to high-resolution **PNG**
  - Export to scalable vector graphics **SVG**
  - Export / Import native **JSON** canvas scenes
- 🎨 **Rich Property Customization**: Real-time adjustment of stroke colors, fills (hachure, solid, cross-hatch, zigzag), stroke width, roughness, and opacity.
- 🔍 **Smooth Infinite Canvas Navigation**: High-performance pan, wheel/pinch zoom (10% to 500%), box multi-selection, element resizing handles, and keyboard shortcuts.

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    InkBoard Client                      │
│  ┌─────────────────┐ ┌───────────────┐ ┌──────────────┐ │
│  │ Rough.js Canvas │ │ Zustand Store │ │ IndexedDB    │ │
│  │ 60 FPS Render   │ │ UI & State    │ │ Local Cache  │ │
│  └────────┬────────┘ └───────┬───────┘ └──────┬───────┘ │
│           │                  │                │         │
│           └──────────┬───────┴────────────────┘         │
│                      │                                  │
│              ┌───────▼────────┐                         │
│              │ Yjs CRDT State │                         │
│              │ & Awareness    │                         │
│              └───────┬────────┘                         │
└──────────────────────┼──────────────────────────────────┘
                       │ WebSocket / HTTP REST
┌──────────────────────┼──────────────────────────────────┐
│                      │                                  │
│              ┌───────▼────────┐                         │
│              │ Yjs WS Server  │                         │
│              │ Rooms & Sync   │                         │
│              └───────┬────────┘                         │
│                      │                                  │
│  ┌───────────────────┴──────────┐ ┌──────────────────┐  │
│  │ Express REST API             │ │ SQLite (sql.js)  │  │
│  │ Auth / JWT / Rate Limiting   │ │ User & Snapshots │  │
│  └──────────────────────────────┘ └──────────────────┘  │
│                    InkBoard Server                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/RajRishabh15/hackback-dbg384-excalidraw.git
cd hackback-dbg384-excalidraw

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Running Locally

**Terminal 1 — Backend Server:**
```bash
cd server
npm run dev
# Server running on http://localhost:3001
# WebSocket server running on ws://localhost:3001
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm run dev
# Frontend running on http://localhost:5173
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` | Select / Move / Resize Tool |
| `H` | Pan / Hand Tool |
| `R` | Rectangle |
| `O` | Ellipse |
| `D` | Diamond |
| `L` | Line |
| `A` | Arrow |
| `P` | Freehand Pen |
| `T` | Text Tool |
| `E` | Eraser |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + A` | Select All |
| `Delete` / `Backspace` | Delete Selected Elements |
| `Ctrl + Wheel` | Zoom in / Zoom out |

---

## 📡 API Reference

### Authentication
- `POST /api/auth/register` — Register a new user (`username`, `email`, `password`)
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Inspect authenticated user profile

### Boards & Snapshots
- `GET /api/boards` — List user's boards
- `POST /api/boards` — Create a new board
- `GET /api/boards/:id` — Get board metadata
- `GET /api/boards/:id/snapshot` — Get board elements snapshot
- `PUT /api/boards/:id/snapshot` — Save board elements snapshot
- `DELETE /api/boards/:id` — Delete board

### WebSocket Collaboration
- `ws://localhost:3001/yjs/:roomId` — Realtime Yjs CRDT room stream and awareness sync

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Rough.js, Zustand, Lucide Icons, Vite, IndexedDB (`idb-keyval`), Yjs, `y-websocket`
- **Backend**: Node.js, Express, TypeScript, `ws`, `sql.js` (SQLite), JWT, bcryptjs, Helmet, Express Rate Limit
- **Styling**: Modern dark mode UI with glassmorphism, responsive grid system, and micro-animations.
