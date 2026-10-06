# ADR-004: Realtime Transport & WebSocket Server

## Status
Accepted

## Context
A bidirectional, sub-20ms communication transport is required to stream drawing operations, cursor coordinates, and room presence across connected users.

## Decision
We select **WebSockets managed via Hocuspocus** (a dedicated Yjs WebSocket server) backed by **Redis 7 Pub/Sub**.

## Alternatives Considered
1. **Server-Sent Events (SSE) + HTTP POST**:
   - *Rejected*: Half-duplex. High overhead of repeated HTTP headers on frequent pointer updates; lacks binary frame streaming efficiency.
2. **WebRTC DataChannels**:
   - *Rejected*: Peer-to-peer mesh networking breaks down at $> 8$ peers per room due to $O(N^2)$ bandwidth fanout. Complex NAT/STUN/TURN infrastructure required.
3. **Socket.io (Excalidraw OSS baseline)**:
   - *Rejected*: Proprietary framing wrapper; lacks native awareness protocol and deep integration with CRDT state vector handshakes.

## Consequences
- Full-duplex binary streaming with minimal packet overhead.
- Native Yjs sync hooks (`onAuthenticate`, `onLoadDocument`, `onChange`) simplify room persistence and lifecycle management.
