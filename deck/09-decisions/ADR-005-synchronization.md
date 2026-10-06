# ADR-005: Synchronization Engine — CRDT (Yjs) vs. Operational Transformation (OT)

## Status
Accepted

## Context
Concurrent multi-user whiteboard editing requires a deterministic mechanism to resolve conflicts, guarantee convergence, support offline edits, and handle network disconnections without data loss.

## Decision
We select **Yjs (CRDT)** as the core synchronization and document engine.

## Alternatives Considered
1. **Version Counters + LWW (Excalidraw OSS baseline)**:
   - *Rejected*: Suffers from monolithic element overwrites, layer interleaving bugs, and ghost element resurrections.
2. **Operational Transformation (OT)**:
   - *Rejected*: Requires a single authoritative central sequencer; extremely complex transformation matrices for non-linear graphic attributes; cannot gracefully support long offline disconnected editing sessions.
3. **Automerge (CRDT)**:
   - *Rejected*: Automerge is powerful but has historically exhibited higher memory footprint and slower binary encoding benchmarks compared to Yjs in high-frequency interactive canvas contexts.

## Consequences
- Guarantees Strong Eventual Consistency (SEC) across all peers mathematically.
- Seamless offline editing and automatic reconciliation on reconnect.
- Granular property merging allows concurrent edits to different attributes of the same shape without conflict.
