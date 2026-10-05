# Reverse-Engineering and Agent Interaction Log

This document records the sequence of key prompts, investigation stages, and verification corrections performed during the reverse-engineering analysis.

---

## 1. Key Prompts and Inquiry Stages

1. **Repository Discovery & Tech Stack Extraction:**
   - *Goal:* Identify the exact languages, frameworks, database systems, and dependencies from config files without guessing.
   - *Findings:* Monorepo powered by Yarn workspaces, TypeScript 5.9.3, React 19.0.0, Vite 5.0.12, RoughJS 4.6.4, Jotai 2.11.0, and Firebase 11.3.1.
2. **Product Summary & User Role Analysis:**
   - *Goal:* Summarize product purpose, user roles, main features, and doc claims strictly from repo contents.
   - *Findings:* Zero-account hand-drawn whiteboard with local-first persistence, E2E encrypted share links, and WebSocket room collaboration.
3. **Architecture & State Analysis:**
   - *Goal:* Map the architecture into a Mermaid flowchart and identify every storage layer.
   - *Findings:* State resides in React/Jotai memory, IndexedDB (`idb-keyval`), Firestore encrypted documents, Firebase Storage buckets, and WebSocket server memory.
4. **Route & Entry Point Inventory:**
   - *Goal:* Categorize all entry points into backend endpoints and frontend routed screens.
   - *Findings:* Single SPA router handling `/`, `/#room=...`, `/#json=...`, and `/#url=...`.
5. **Data Model & Entity-Relationship Mapping:**
   - *Goal:* Construct ER diagram and detail how relationships (foreign keys, embedded docs, ID strings) are stored.
   - *Findings:* `EXCALIDRAW_ELEMENT` models core shapes; `frameId`, `containerId`, and `fileId` store relationships as raw string IDs.
6. **End-to-End Feature Tracing:**
   - *Goal:* Trace the complete creation, compression, encryption, upload, and restoration flow for shareable links.
   - *Findings:* Fully zero-knowledge AES-GCM encryption with key residing strictly in the URL hash.
7. **Senior Code Review & Gap Analysis:**
   - *Goal:* Identify at least 8 gaps spanning security, race conditions, storage exhaustion, and documentation drift.
   - *Findings:* High-risk unauthenticated Firestore rules, race conditions on room join, and missing storage quota recovery.
8. **Verification & Correction Audit:**
   - *Goal:* Re-verify every cited file path and line number against actual repository source code and classify as `[Confirmed]`.

---

## 2. Corrections and Adjustments Made

1. **Element Type Definitions File Path:**
   - *Original assumption:* `packages/element/types.ts`
   - *Correction:* Corrected to `packages/element/src/types.ts:40-87` because `@excalidraw/element` isolates TypeScript source files under the `src/` directory.
2. **Firestore Security Rules Line Numbers:**
   - *Original assumption:* Lines 1–12 in `firebase-project/firestore.rules`
   - *Correction:* Verified exact rule file length is 11 lines, with `allow get, write: if true;` on line 5 and `allow list: if false;` on line 7.
3. **Firebase Storage Security Rules Line Numbers:**
   - *Original assumption:* Lines 1–10 in `firebase-project/storage.rules`
   - *Correction:* Verified exact rule file length is 12 lines, with room/shareLink rules located at lines 4–9.
