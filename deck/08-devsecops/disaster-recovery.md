# Disaster Recovery & Business Continuity Plan

## 1. RTO & RPO Objectives

- **Recovery Point Objective (RPO)**: $< 1$ minute (Maximum allowable data loss in catastrophic disaster).
- **Recovery Time Objective (RTO)**: $< 15$ minutes (Maximum allowable downtime before service is restored).

---

## 2. Disaster Scenarios & Mitigation Playbooks

### 2.1 Scenario 1: Primary PostgreSQL Database Outage
- **Detection**: Automated health probes detect 3 consecutive connection timeouts. PagerDuty alert fires.
- **Failover Procedure**:
  1. AWS RDS / Patroni automatically promotes PostgreSQL read replica to primary.
  2. DNS / PgBouncer connection pool updates write endpoint within 30 seconds.
  3. API servers reconnect automatically. Pending Yjs updates buffered in Redis are flushed to new primary.

### 2.2 Scenario 2: Redis Cluster Partition / Crash
- **Behavior**:
  - Temporary loss of cross-node real-time broadcast and ephemeral cursor awareness.
  - Active WebSocket nodes continue running locally; rooms remain synchronized among clients connected to the same node.
  - Redis Sentinel / AWS ElastiCache restarts primary Redis node within 60 seconds.
  - Sockets resume pub/sub subscriptions seamlessly.

### 2.3 Scenario 3: Complete Datacenter / Regional Blackout
- **Recovery Procedure**:
  1. Failover DNS (Route 53 / Cloudflare) swings traffic to secondary hot-standby cloud region (`us-west-2`).
  2. Kubernetes cluster in secondary region spins up active pods using latest container images.
  3. Read replica in secondary region is promoted to primary.
  4. Services operational within 12 minutes.
