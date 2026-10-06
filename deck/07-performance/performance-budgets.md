# Performance Budgets & SLO Targets

## 1. Measurable Performance Targets (SLOs)

All application builds must strictly pass automated performance budget audits before deployment to staging or production.

| Metric | Target (P95) | Target (P99) | Measurement Tool | Enforcement Mechanism |
|---|---|---|---|---|
| **Input-to-Paint Latency** | $< 8$ ms | $< 16$ ms | Chrome DevTools Tracing | Automated Playwright input test; fail PR if $> 16$ ms |
| **Canvas Frame Rate (FPS)** | $\ge 60$ FPS | $\ge 55$ FPS | `requestAnimationFrame` monitor | Continuous telemetry; alert if dropped frames $> 5\%$ |
| **Initial Board Load (1,000 elems)**| $< 600$ ms | $< 1,200$ ms | Lighthouse / Web Vitals | CI WebPageTest gate; bundle size limits |
| **Realtime Sync Latency (LAN)** | $< 15$ ms | $< 30$ ms | WebSocket timestamp ping | Synthetic end-to-end telemetry |
| **Realtime Sync Latency (WAN)** | $< 100$ ms | $< 250$ ms | WebSocket timestamp ping | Multi-region probe monitors |
| **Memory Footprint (5,000 elems)** | $< 120$ MB | $< 200$ MB | Chrome Memory Profiler | Memory leak automated test running 10k ops |
| **JavaScript Initial Bundle Size** | $< 250$ KB (gzip)| $< 300$ KB (gzip)| Bundlesize / Vite analyzer | CI hard-fail on bundle size regression |

---

## 2. Resource Allocation Limits

- **Maximum Elements per Board**: 15,000 for standard workspaces; 50,000 for enterprise workspaces.
- **Maximum Active Collaborators per Room**: 100 simultaneous concurrent users.
- **Maximum Asset Upload Size**: 10 MB per image asset; 50 MB total board asset storage limit on free tier.
- **WebSocket Frame Size**: Hard cap at 256 KB.
- **Local Storage Quota (IndexedDB)**: 500 MB maximum offline cache per client device.
