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

## 2. What We Will Build: One Fix, One New Feature

### Fix: Lock Down the Open Firebase Security Rules (Gap #1)
- **What was wrong in the original:** `firestore.rules:5` grants `allow get, write: if true;` on every document. In Firestore, `write` covers create, update **and delete**, so anyone holding a room ID can overwrite or wipe that room's scene, and there is no payload size limit. `storage.rules:4-9` leave `/rooms` and `/shareLinks` just as open.
- **Our solution:** Replace the wildcard rule with per-collection rules:
  - Split `write` into `create` and `update`; `delete` and `list` are denied to clients.
  - Schema check: a scene document may only contain `sceneVersion`, `iv` and `ciphertext`.
  - Size cap: `ciphertext` must be under 2 MB; Storage uploads are create-only and size-capped.
  - No rollbacks: an update must not lower `sceneVersion`.
  - End-to-end encryption is unchanged; the server still only ever sees ciphertext.
- **Why it matters to our target user:** A shared room link can no longer be used to silently destroy or vandalise a team's diagram, and the backend can't be abused as free unbounded blob storage.

### New Feature: Burn-After-Read Sketches
- **What it is:** End-to-end encrypted share links that self-destruct after N views or a time limit (1 view, 5 views, 1 hour, 24 hours), chosen at export time.
- **How it works:**
  1. The scene is deflated and AES-GCM encrypted in the browser using the existing share-link pipeline; the key lives only in the URL fragment (`#burn=id,key`).
  2. The ciphertext is stored with `viewsLeft` and `expiresAt` in a collection clients cannot read or write directly (`allow read, write: if false`).
  3. Opening the link calls a Cloud Function that runs a Firestore transaction: check expiry, decrement `viewsLeft`, return the ciphertext, and delete the document when the count reaches zero. A Firestore TTL policy removes expired links.
  4. The recipient decrypts locally and the scene opens in view-only mode (`viewModeEnabled`). Late visitors see "This sketch has burned."
- **Why it depends on the fix:** With the locked-down rules, the Cloud Function is the only way to reach a burn link, so nobody can read the ciphertext directly or reset the view counter.
- **Why it matters to our target user:** Disappearing chat exists; disappearing diagrams that the server can't read don't. Teams can share incident post-mortems, interview whiteboards and sensitive architecture knowing the server copy is gone afterwards.
- **Limitation:** It cannot prevent screenshots or copies made by a viewer; the guarantee is server-side deletion.
