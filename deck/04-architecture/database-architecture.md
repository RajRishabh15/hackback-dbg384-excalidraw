# Database Architecture & Relational Schema

## 1. Database Engine Selection: PostgreSQL 16

PostgreSQL 16 is chosen as the primary system of record for the following architectural reasons:
1. **Hybrid Relational + Semi-Structured Storage**: First-class JSONB indexing and operators enable storing dynamic element metadata alongside strictly typed relational foreign keys.
2. **ACID Transactions**: Guarantees atomic workspace billing, board access granting, and snapshot generation.
3. **Row-Level Security (RLS)**: Enforces enterprise-grade tenant isolation at the database engine level, neutralizing IDOR vulnerabilities.
4. **Binary Large Object Support (`BYTEA`)**: Directly stores compressed Yjs CRDT snapshot blobs with zero transformation overhead.

---

## 2. Complete SQL DDL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER', 'GUEST');
CREATE TYPE board_role AS ENUM ('OWNER', 'EDITOR', 'COMMENTER', 'VIEWER');
CREATE TYPE plan_tier AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- 1. Organizations / Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    tier plan_tier DEFAULT 'FREE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable for SSO / OAuth users
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Workspace Memberships
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'MEMBER' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- 4. Whiteboard Canvas Documents
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) DEFAULT 'Untitled Board' NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE NOT NULL,
    e2ee_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    element_count INT DEFAULT 0 NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ -- Soft deletion
);

-- 5. Board Member Permissions (RBAC)
CREATE TABLE board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role board_role DEFAULT 'EDITOR' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(board_id, user_id)
);

-- 6. Board Snapshots (CRDT Document Versions)
CREATE TABLE board_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    version INT NOT NULL,
    crdt_binary BYTEA NOT NULL, -- Compressed Yjs state vector + updates
    element_count INT NOT NULL,
    elements_json JSONB, -- Optional human-readable / exportable cached JSON
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(board_id, version)
);

-- 7. Incremental CRDT Operations (Audit & Disaster Recovery)
CREATE TABLE board_updates (
    id BIGSERIAL PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    update_data BYTEA NOT NULL, -- Yjs binary delta
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Board Comments & Annotations
CREATE TABLE board_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    x NUMERIC(10, 2) NOT NULL,
    y NUMERIC(10, 2) NOT NULL,
    text TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    parent_comment_id UUID REFERENCES board_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. File Attachments / Assets
CREATE TABLE board_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    s3_key VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for Fast Lookups
CREATE INDEX idx_boards_workspace ON boards(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_boards_owner ON boards(owner_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_board_snapshots_board_ver ON board_snapshots(board_id, version DESC);
CREATE INDEX idx_board_updates_board ON board_updates(board_id);
CREATE INDEX idx_board_comments_board ON board_comments(board_id) WHERE resolved IS FALSE;
CREATE INDEX idx_board_assets_board ON board_assets(board_id);
```

---

## 3. Migration Strategy & Zero-Downtime Deployment
- **Migration Tooling**: Prisma Migrate / Kysely migration files checked into version control.
- **Backward-Compatible Changes**: Additive migrations only (never drop column in single step; use deprecate $\rightarrow$ ignore $\rightarrow$ drop workflow).
- **Read Replicas**: Write operations execute against primary Postgres node; dashboard board listings and read-only searches query read replicas.
