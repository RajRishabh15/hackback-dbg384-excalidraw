# ADR-003: Relational Persistence Engine

## Status
Accepted

## Context
Excalidraw OSS couples persistence directly to Firebase Firestore, introducing vendor lock-in, permissive security rules, and poor enterprise multi-tenancy querying capabilities.

## Decision
We select **PostgreSQL 16** with Prisma / Kysely ORM and Row-Level Security (RLS).

## Alternatives Considered
1. **Firebase Firestore (Status Quo)**:
   - *Rejected*: Vendor lock-in, client-side security vulnerability risks, lack of complex relational joins for workspace RBAC.
2. **MongoDB**:
   - *Rejected*: Lacks native Row-Level Security; ACID transactions across collections are heavier and less performant than Postgres.
3. **Pure S3 Key-Value Store**:
   - *Rejected*: Inadequate for querying boards by workspace, searching element text, managing users, or enforcing RBAC.

## Consequences
- ACID guarantees, enterprise compliance, easy self-hosting on Docker/Kubernetes or AWS RDS.
- Hybrid JSONB + relational schema allows flexible element modeling alongside strict relational constraints.
