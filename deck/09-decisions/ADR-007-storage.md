# ADR-007: Object Storage & Asset Ingestion Architecture

## Status
Accepted

## Context
Whiteboard canvases frequently embed multi-megabyte bitmap images, vector graphics, and generated export files. Routing binary file uploads directly through API gateway servers causes memory pressure and blocks request worker threads.

## Decision
We select **S3-Compatible Object Storage (AWS S3 / Cloudflare R2 / MinIO)** utilizing **Direct-to-S3 Presigned URLs** with CloudFront CDN distribution.

## Alternatives Considered
1. **Direct Upload Through Fastify API**:
   - *Rejected*: Incurs double-hop network latency; consumes Node.js server RAM on concurrent large file uploads.
2. **PostgreSQL Large Objects (BLOBs in DB)**:
   - *Rejected*: Causes rapid database disk bloat, degrades backup/restore performance, and prevents CDN caching.
3. **Local File System Storage**:
   - *Rejected*: Prevents horizontal container scaling in stateless Kubernetes / cloud environments.

## Consequences
- Zero bandwidth and memory load on backend servers during file uploads.
- Global CDN edge caching delivers $< 50$ ms image asset load times for global collaborators.
