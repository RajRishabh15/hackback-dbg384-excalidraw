# Synchronization Model & CRDT Mathematical Convergence

## 1. Critique of Excalidraw's Reference Model vs. CRDTs

Reference Excalidraw employs a naive version-counter reconciliation algorithm:
- Every element holds a numeric `version` counter and a random `versionNonce`.
- When receiving a remote element, the client compares:
  $$\text{remote.version} > \text{local.version} \implies \text{overwrite local}$$
  If versions are equal, the higher `versionNonce` wins.

### Critical Limitations of the Reference Model:
1. **Granular Attribute Conflicts**: If User A changes the fill color of a rectangle while User B concurrently resizes the same rectangle, one user's entire edit is lost because the element is treated as an indivisible monolithic JSON object.
2. **Z-Index Layer Inversion**: Excalidraw uses array indices and fractional indexing keys. In concurrent reordering or batch grouping, race conditions result in element layering interleaving or corruption.
3. **Ghost Resurrection**: Deleted elements marked with `isDeleted: true` can be unintentionally resurrected if a peer reconnecting from a stale network sends a higher version number for the element.

---

## 2. Mathematical Formalism of Yjs CRDTs

To guarantee strong eventual consistency across all nodes without central locking, this platform models the whiteboard as a composition of **State-based Conflict-Free Replicated Data Types (CvRDT)**:

### 2.1 The Convergence Guarantee (Strong Eventual Consistency)
A system achieves Strong Eventual Consistency (SEC) if:
1. **Eventual Delivery**: An update executed at one replica is eventually delivered to all replicas.
2. **Equivalence**: Replicas that have applied the same set of updates are in identical states, regardless of the order in which updates were delivered.

Mathematically, updates form a Join-Semilattice $\langle S, \sqcup \rangle$:
- **Associativity**: $(a \sqcup b) \sqcup c = a \sqcup (b \sqcup c)$
- **Commutativity**: $a \sqcup b = b \sqcup a$
- **Idempotence**: $a \sqcup a = a$

Because state merges satisfy these properties, network latency, message reordering, and duplicate packets cannot cause divergent board states.

---

## 3. Whiteboard CRDT Data Structures

The whiteboard document is structured using Yjs shared types:

```typescript
// Root Document
const yDoc = new Y.Doc();

// 1. Elements Registry: Y.Map<Y.Map<any>>
// Maps element ID -> Nested Y.Map representing element properties
const yElements = yDoc.getMap<Y.Map<any>>("elements");

// 2. Visual Ordering (Z-Index): Y.Array<string>
// An ordered CRDT sequence of element IDs
const yElementOrder = yDoc.getArray<string>("elementOrder");

// 3. Comments: Y.Map<Y.Map<any>>
const yComments = yDoc.getMap<Y.Map<any>>("comments");
```

### 3.1 Granular Attribute Independence
Instead of storing elements as flat immutable blobs in a single map, each element is a **nested `Y.Map`**:
- When User A modifies the `backgroundColor` of element `el-1`:
  ```typescript
  yElements.get("el-1").set("backgroundColor", "#ff4444");
  ```
- When User B concurrently modifies the dimensions of `el-1`:
  ```typescript
  yElements.get("el-1").set("width", 350);
  ```
- **Result**: Both edits merge automatically. `el-1` preserves User A's color and User B's new width. No data is lost.

### 3.2 Ordering via Y.Array Sequence CRDT
Element layering (which object renders on top of which) is maintained in `yElementOrder`:
- Yjs sequence algorithms use internal logical timestamps (Lamport clocks + Client IDs) to insert items deterministically between existing items.
- Moving an element forward or backward executes as an atomic deletion and re-insertion at the target index.
- If two users concurrently move elements to the front, the sequence converges deterministically based on client ID tiebreakers without interleaving.

---

## 4. Concurrency Scenarios & Resolution Behavior

### Scenario A: Concurrent Edit of the Exact Same Property
- **Situation**: User A sets `strokeColor = "#00FF00"`, User B sets `strokeColor = "#0000FF"` at the exact same millisecond.
- **Resolution**: `Y.Map` resolves property collisions via Lamport logical timestamp. If Lamport timestamps are identical, the client with the numerically higher `clientId` wins.
- **Outcome**: Both clients converge deterministically to the identical color within one network roundtrip.

### Scenario B: Concurrent Delete vs. Edit
- **Situation**: User A deletes a shape while User B is adding text inside the shape.
- **Resolution**: The shape is removed from `yElementOrder` and marked with `isDeleted: true`. In CRDT semantics, delete wins (tombstone).
- **Outcome**: The deleted shape disappears from both canvases. If User A later executes "Undo", the tombstone is cleared, and the element re-appears with User B's text intact.

### Scenario C: Long-Lived Offline Edits (100+ Offline Changes)
- **Situation**: User A edits a board on an airplane for 4 hours while colleagues make 500 online changes to the same board.
- **Resolution**: Upon reconnection, Client A transmits its compacted update vector (typically < 100 KB).
- **Outcome**: Client A receives the 500 changes, server applies Client A's offline edits. Unmodified objects remain intact; overlapping modifications merge field-by-field. Canvas updates smoothly without page reload.
