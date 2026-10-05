# Verified Observations of the Original Codebase

This document compiles every verified fact extracted from the Excalidraw repository during reverse-engineering analysis.

---

## 1. Technology Stack & Dependencies

- The monorepo uses TypeScript version 5.9.3.
  Evidence: [package.json:37](file:///d:/Hackback-new/excalidraw/package.json#L37) [Confirmed]

- Node.js engine requirement is `>=18.0.0`.
  Evidence: [package.json:47](file:///d:/Hackback-new/excalidraw/package.json#L47) [Confirmed]

- The web application package (`excalidraw-app`) uses React 19.0.0 and React DOM 19.0.0.
  Evidence: [excalidraw-app/package.json:36-37](file:///d:/Hackback-new/excalidraw/excalidraw-app/package.json#L36-L37) [Confirmed]

- The `@excalidraw/excalidraw` core package supports React 17, 18, and 19 as peer dependencies.
  Evidence: [packages/excalidraw/package.json:77-78](file:///d:/Hackback-new/excalidraw/packages/excalidraw/package.json#L77-L78) [Confirmed]

- Vite version 5.0.12 is used for building and local development server hosting.
  Evidence: [package.json:38](file:///d:/Hackback-new/excalidraw/package.json#L38) [Confirmed]

- RoughJS version 4.6.4 is used for hand-drawn canvas rendering.
  Evidence: [packages/excalidraw/package.json:114](file:///d:/Hackback-new/excalidraw/packages/excalidraw/package.json#L114) [Confirmed]

- Jotai version 2.11.0 and jotai-scope 0.7.2 are used for state management.
  Evidence: [packages/excalidraw/package.json:100-101](file:///d:/Hackback-new/excalidraw/packages/excalidraw/package.json#L100-L101) [Confirmed]

- Firebase version 11.3.1 is used for remote persistence and cloud asset storage.
  Evidence: [excalidraw-app/package.json:32](file:///d:/Hackback-new/excalidraw/excalidraw-app/package.json#L32) [Confirmed]

- IndexedDB wrapper `idb-keyval` version 6.0.3 is used for browser-side local persistence.
  Evidence: [excalidraw-app/package.json:34](file:///d:/Hackback-new/excalidraw/excalidraw-app/package.json#L34) [Confirmed]

- Vitest version 3.0.6 and jsdom 22.1.0 are used for unit and integration testing.
  Evidence: [package.json:31, 43](file:///d:/Hackback-new/excalidraw/package.json#L31) [Confirmed]

- Precompiled WebAssembly binaries for font subsetting and WOFF2 conversion reside in `scripts/wasm/`.
  Evidence: [scripts/wasm/](file:///d:/Hackback-new/excalidraw/scripts/wasm) [Confirmed]

---

## 2. Local Execution & Scripts

- The local development server is started using `yarn start`.
  Evidence: [package.json:65](file:///d:/Hackback-new/excalidraw/package.json#L65) [Confirmed]

- Production build is produced using `yarn build`.
  Evidence: [package.json:63](file:///d:/Hackback-new/excalidraw/package.json#L63) [Confirmed]

- Test suites are executed using `yarn test`.
  Evidence: [package.json:74](file:///d:/Hackback-new/excalidraw/package.json#L74) [Confirmed]

- Required environment variables configure external WebSocket, AI, and Firebase endpoints.
  Evidence: [.env.development:1-56](file:///d:/Hackback-new/excalidraw/.env.development#L1-L56) [Confirmed]

---

## 3. Architecture & Routing

- Excalidraw is a client-side Single-Page Application (SPA) bootstrapping into the `#root` DOM element.
  Evidence: [excalidraw-app/index.tsx:10-17](file:///d:/Hackback-new/excalidraw/excalidraw-app/index.tsx#L10-L17) [Confirmed]

- Routing is executed via URL hash and query string parsing in `App.tsx`.
  Evidence: [excalidraw-app/App.tsx:226-231](file:///d:/Hackback-new/excalidraw/excalidraw-app/App.tsx#L226-L231) [Confirmed]

- Real-time collaboration rooms are identified by `#room=roomId,roomKey` URLs.
  Evidence: [excalidraw-app/App.tsx:250-257](file:///d:/Hackback-new/excalidraw/excalidraw-app/App.tsx#L250-L257) [Confirmed]

- Encrypted snapshot shares are identified by `#json=id,encryptionKey` URLs.
  Evidence: [excalidraw-app/App.tsx:228-230](file:///d:/Hackback-new/excalidraw/excalidraw-app/App.tsx#L228-L230) [Confirmed]

- External drawing links are imported via `#url=encodedUrl`.
  Evidence: [excalidraw-app/App.tsx:231, 304-327](file:///d:/Hackback-new/excalidraw/excalidraw-app/App.tsx#L231) [Confirmed]

---

## 4. Data Model & Entities

- `_ExcalidrawElementBase` defines canvas elements with positioning, dimensions, rough style, version, and fractional index.
  Evidence: [packages/element/src/types.ts:40-87](file:///d:/Hackback-new/excalidraw/packages/element/src/types.ts#L40-L87) [Confirmed]

- `frameId` stores parent frame relationships as an ID string.
  Evidence: [packages/element/src/types.ts:74](file:///d:/Hackback-new/excalidraw/packages/element/src/types.ts#L74) [Confirmed]

- `boundElements` stores arrow and text bindings as an embedded array of objects containing element ID and type.
  Evidence: [packages/element/src/types.ts:35-38, 76](file:///d:/Hackback-new/excalidraw/packages/element/src/types.ts#L35-L38) [Confirmed]

- `containerId` stores bound container relationships on text elements as an ID string.
  Evidence: [packages/element/src/types.ts:182](file:///d:/Hackback-new/excalidraw/packages/element/src/types.ts#L182) [Confirmed]

- `fileId` references binary image data as an ID string.
  Evidence: [packages/element/src/types.ts:251](file:///d:/Hackback-new/excalidraw/packages/element/src/types.ts#L251) [Confirmed]

- `Collaborator` defines presence state, username, avatar, and live cursor pointer coordinates.
  Evidence: [packages/excalidraw/types.ts:78-98](file:///d:/Hackback-new/excalidraw/packages/excalidraw/types.ts#L78-L98) [Confirmed]

- `viewModeEnabled` boolean governs read-only canvas interaction.
  Evidence: [packages/excalidraw/types.ts:524](file:///d:/Hackback-new/excalidraw/packages/excalidraw/types.ts#L524) [Confirmed]

---

## 5. Security, End-to-End Encryption & Storage Rules

- Shareable link export generates a client-side 128-bit key, deflates JSON, and uploads encrypted binary to the backend.
  Evidence: [excalidraw-app/data/index.ts:253-280](file:///d:/Hackback-new/excalidraw/excalidraw-app/data/index.ts#L253-L280) [Confirmed]

- Decryption keys remain strictly in URL fragments (`#json=...`) and are never dispatched to servers.
  Evidence: [excalidraw-app/data/index.ts:283-286](file:///d:/Hackback-new/excalidraw/excalidraw-app/data/index.ts#L283-L286) [Confirmed]

- Firestore security rules allow unrestricted public get and write operations on all document collections.
  Evidence: [firebase-project/firestore.rules:5](file:///d:/Hackback-new/excalidraw/firebase-project/firestore.rules#L5) [Confirmed]

- Firebase Storage rules allow unrestricted get and write on `/rooms/` and `/shareLinks/` storage paths.
  Evidence: [firebase-project/storage.rules:4-9](file:///d:/Hackback-new/excalidraw/firebase-project/storage.rules#L4-L9) [Confirmed]
