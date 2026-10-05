# Gaps and Planned Rebuild Improvements

This document lists verified gaps found in the original Excalidraw codebase and specifies the **two key architectural improvements** we will implement in our rebuild.

---

## 1. Gaps Found in Original Codebase

| # | Type | What is Wrong | Evidence (path:line) |
| :--- | :--- | :--- | :--- |
| **1** | **Security** | Firestore rules allow unauthenticated write operations globally on any document ID without payload size validation. | [firebase-project/firestore.rules:5](file:///d:/Hackback-new/excalidraw/firebase-project/firestore.rules#L5) [Confirmed] |
| **2** | **Correctness** | Simultaneous multi-user room entry can race on local storage state without atomic server reconciliation gates. | [excalidraw-app/App.tsx:332-345](file:///d:/Hackback-new/excalidraw/excalidraw-app/App.tsx#L332-L345) [Confirmed] |
| **3** | **Data Validation** | External scene URL loader (`#url=...`) fetches remote URLs directly without HTTPS scheme enforcement or size guardrails. | [excalidraw-app/App.tsx:307-310](file:///d:/Hackback-new/excalidraw/excalidraw-app/App.tsx#L307-L310) [Confirmed] |
| **4** | **UX / Error Handling** | Corrupted or mismatched decryption keys silently fall back to legacy decryption and trigger generic alerts. | [excalidraw-app/data/index.ts:230-241](file:///d:/Hackback-new/excalidraw/excalidraw-app/data/index.ts#L230-L241) [Confirmed] |
| **5** | **Storage** | Client storage exhaustion errors lack an automated export/recovery trigger for unsaved scene data. | [excalidraw-app/data/LocalData.ts:129-131](file:///d:/Hackback-new/excalidraw/excalidraw-app/data/LocalData.ts#L129-L131) [Confirmed] |

---

## 2. Two Key Improvements We Will Build

### Improvement 1: Atomic Multiplayer Conflict Resolution with Version Nonce Handshakes
- **What was wrong in the original:** When two clients join an existing room simultaneously or reconnect after offline editing, their local IndexedDB elements race against remote Firestore snapshots without an atomic handshake gate, risking temporary element clobbering.
- **Our solution:** Implement a strict **two-phase synchronization protocol** in the collaboration gateway. When connecting to `#room=...`, the client requests the authoritative version vector and pauses local reconciliation broadcasts until the initial room state is acknowledged and merged.
- **Why it matters to our target user:** Engineers and architects collaborating during live design sprints will never lose strokes or experience snapping jitter when multiple teammates open a meeting link at the exact same second.

### Improvement 2: Automated Local Emergency Backup on Storage Quota Exhaustion
- **What was wrong in the original:** If a canvas contains large embedded images and exceeds the browser's IndexedDB / LocalStorage quota, the app sets `localStorageQuotaExceededAtom` but leaves the unsynced changes in memory without an automated backup prompt.
- **Our solution:** Add an **active storage supervisor** that monitors quota headroom. If a storage write fails, the UI instantly triggers an automated offline `.excalidraw` JSON file download and renders an alert offering to offload large images to cloud storage.
- **Why it matters to our target user:** Prevents catastrophic data loss for complex visual diagrams and long brainstorming sessions even on low-memory mobile devices or restricted browser profiles.
