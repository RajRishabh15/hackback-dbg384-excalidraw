# Storage Architecture & Asset Lifecycle

## 1. Storage Classification

The platform manages three distinct categories of persistent data, each with dedicated performance and retention characteristics:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Storage Architecture Tier                       │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│    Hot Relational   │      Binary Document     │     Blob Object       │
│    (PostgreSQL 16)  │       (PostgreSQL/S3)    │      (S3/MinIO)       │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ - Workspaces & Users│ - Compacted Yjs State    │ - Uploaded images     │
│ - Boards & Members  │ - Historical revisions   │ - Vector SVG assets   │
│ - Comments & RBAC   │ - Incremental deltas     │ - Rendered PDF exports│
│ Latency: < 5 ms     │ Latency: < 20 ms         │ Latency: < 50 ms (CDN)│
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 2. Object Storage Configuration (S3-Compatible / MinIO)

### 2.1 Bucket Partitioning & Key Hierarchy
All binary objects are stored in an S3-compatible object store partitioned by tenant and board:
```text
whiteboard-storage/
├── workspaces/{workspaceId}/
│   └── boards/{boardId}/
│       ├── assets/
│       │   ├── {assetId}.webp          <-- Optimized full image
│       │   ├── {assetId}_thumb.webp    <-- Thumbnail preview (256x256)
│       │   └── {assetId}_orig.bin      <-- Original uploaded file (encrypted)
│       ├── exports/
│       │   └── {exportId}.pdf          <-- Rendered document export
│       └── snapshots/
│           └── v_{version}.yjs.zst     <-- Zstandard compressed snapshot
```

### 2.2 Direct-to-S3 Upload via Presigned URLs
To avoid routing multi-megabyte image payloads through the API application servers:
1. Client requests upload authorization:
   `POST /api/v1/boards/:id/assets/presign`
   Payload: `{ filename: "diagram.png", mimeType: "image/png", sizeBytes: 2450123 }`
2. Server validates file extension, MIME type whitelist, and workspace storage quota.
3. Server generates AWS S3 Presigned `PUT` URL with a 5-minute expiration:
   ```json
   {
     "assetId": "018f4a12-8e3b-7a2e-b6a1-94e85764d999",
     "uploadUrl": "https://s3.amazonaws.com/whiteboard-storage/workspaces/...?",
     "s3Key": "workspaces/org-1/boards/b-1/assets/...",
     "requiredHeaders": {
       "Content-Type": "image/png",
       "x-amz-server-side-encryption": "AES256"
     }
   }
   ```
4. Client uploads directly to S3 via HTTP `PUT`.
5. Client calls `POST /api/v1/boards/:id/assets/complete` to trigger server-side thumbnail generation and asset registration.

---

## 3. Snapshot Compaction & Storage Pruning

Over time, long-lived collaborative sessions accumulate thousands of incremental Yjs update records. Left uncompacted, room hydration latency degrades.

### 3.1 The Compaction Algorithm
1. When `board_updates` count exceeds 200 rows or 1 hour has elapsed since last snapshot:
2. The background worker loads the latest `board_snapshots` row and all subsequent `board_updates`.
3. Loads into an ephemeral `Y.Doc` and executes:
   ```typescript
   const compactedBinary = Y.encodeStateAsUpdate(doc);
   ```
4. Compresses using **Zstandard (zstd)** level 3 compression (achieving 65–85% reduction in binary footprint).
5. Writes a new row to `board_snapshots` with incremented `version`.
6. Purges the compacted `board_updates` records in an atomic transaction.

---

## 4. Disaster Recovery & Retention Policy

- **Point-in-Time Recovery (PITR)**: PostgreSQL continuous archiving with WAL-G to S3 every 60 seconds, enabling database restoration to any second within the past 30 days.
- **S3 Object Versioning & Lifecycle Rules**:
  - Assets bucket has S3 Versioning enabled.
  - Temporary exports (`exports/`) automatically delete after 7 days.
  - Soft-deleted boards retain assets for 30 days before permanent deletion by garbage collector.
- **Cross-Region Replication**: All S3 assets and database WAL archives replicate asynchronously to a secondary cloud region (e.g., `us-east-1` $\rightarrow$ `us-west-2`) ensuring an RPO $< 5$ minutes and RTO $< 30$ minutes in catastrophic datacenter loss.
