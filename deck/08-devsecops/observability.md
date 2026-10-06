# Observability, Metrics & Telemetry Architecture

## 1. Observability Pillars

Production reliability demands comprehensive visibility across distributed WebSocket connections, database transactions, background workers, and client-side canvas frame rates.

```
┌────────────────────────────────────────────────────────┐
│             OpenTelemetry Collector Gateway            │
├───────────────────┬───────────────────┬────────────────┤
│      Metrics      │       Logs        │     Traces     │
│   (Prometheus)    │   (Loki / ELK)    │    (Tempo)     │
├───────────────────┼───────────────────┼────────────────┤
│ - WS Conn Count   │ - Structured JSON │ - Trace spans  │
│ - Ops / second    │ - Contextual IDs  │ - HTTP -> DB   │
│ - DB Query P95    │ - Error exceptions│ - WS Relay RPC │
└───────────────────┴───────────────────┴────────────────┘
```

---

## 2. Core Prometheus Metrics

| Metric Name | Type | Description | Alert Threshold |
|---|---|---|---|
| `whiteboard_active_ws_connections` | Gauge | Total active WebSocket connections across cluster | $> 15,000$ (trigger autoscaling) |
| `whiteboard_active_rooms` | Gauge | Number of active whiteboard rooms currently in memory | N/A (capacity planning) |
| `whiteboard_operation_rate_total` | Counter | Total CRDT operations processed per second | $> 5,000$ ops/sec |
| `whiteboard_ws_sync_duration_seconds` | Histogram | Latency to complete initial SyncStep1/SyncStep2 | P95 $> 200$ ms |
| `whiteboard_redis_pubsub_lag_seconds` | Gauge | Time delay for cross-node Redis messages | $> 50$ ms (Critical) |
| `whiteboard_db_snapshot_write_duration_seconds` | Histogram | Duration to write compressed snapshot to PostgreSQL | P99 $> 1.0$ s |
| `whiteboard_client_fps` | Histogram | Real-user client canvas render frame rate | $< 45$ FPS on $> 5\%$ sessions |

---

## 3. Distributed Tracing & Correlation IDs

Every incoming HTTP request or WebSocket connection is injected with a `x-request-id` / `traceparent` (W3C Trace Context):
- Propagated through Fastify request context $\rightarrow$ Database queries (tagged with query comments `/* trace_id=... */`) $\rightarrow$ Redis Pub/Sub messages.
- Correlates errors in frontend browser telemetry directly with backend database queries and worker jobs.
