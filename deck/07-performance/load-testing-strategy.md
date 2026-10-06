# Load Testing Strategy & Benchmarking

## 1. Objectives & Scenarios

The load testing strategy verifies that backend services, WebSocket relays, and database persistence can withstand peak collaborative loads without memory exhaustion or degradation of user experience.

---

## 2. Load Testing Scenarios (k6 & Artillery)

### 2.1 Scenario 1: Multi-User Collaboration Storm (High Concurrency / Single Room)
- **Scale**: 100 simulated WebSocket clients joined to a single board room.
- **Behavior**:
  - Each client transmits 5 pointer movements/sec (awareness updates).
  - 10 clients concurrently author new shapes at 1 shape/sec.
- **Verification Criteria**:
  - P95 WebSocket round-trip broadcast latency $< 50$ ms.
  - Server CPU utilization $< 60\%$.
  - Zero dropped WebSocket frames.

### 2.2 Scenario 2: Distributed Multi-Room Scale (Horizontal Scaling)
- **Scale**: 5,000 concurrent WebSocket connections spread across 500 active rooms (10 users/room).
- **Cluster**: 4 Hocuspocus WebSocket nodes behind Traefik load balancer + Redis 7 cluster.
- **Verification Criteria**:
  - Cross-node update delivery via Redis Pub/Sub averages $< 25$ ms.
  - Node memory remains steady at $< 400$ MB per node over 2-hour soak test (no memory leaks).
  - PostgreSQL snapshot persistence queue maintains zero lag.

---

## 3. Automated k6 Load Test Script Example (`load-tests/ws-collaboration.js`)

```javascript
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp-up to 50 users
    { duration: '3m', target: 100 }, // Hold at 100 users
    { duration: '1m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    'ws_connecting': ['p(95)<200'], // Handshake within 200ms
  },
};

export default function () {
  const boardId = '018f4a12-8e3b-7a2e-b6a1-94e85764d123';
  const url = `ws://localhost:4000/boards/${boardId}?ticket=test-load-ticket`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Send initial ping
      socket.send(JSON.stringify({ type: 'PING' }));

      // Periodic awareness updates
      socket.setInterval(() => {
        socket.send(JSON.stringify({
          type: 'AWARENESS',
          cursor: { x: Math.random() * 2000, y: Math.random() * 1000 }
        }));
      }, 100); // 10 Hz
    });

    socket.on('message', (data) => {
      // Verify message received
    });

    socket.setTimeout(() => {
      socket.close();
    }, 60000); // Stay connected 60s
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```
