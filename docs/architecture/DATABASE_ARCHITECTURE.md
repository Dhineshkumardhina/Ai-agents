# XEROVA AI DEVFORCE — Database Architecture Document
**System Name:** XEROVA AI DEVFORCE  
**Document Code:** XAD-ARCH-DB-002  
**Version:** 1.0.0  
**Phase:** 0B — Complete System Architecture Design  
**Author:** Principal Software Architect & AI Agent Systems Engineer  
**Date:** March 2026  
**Status:** Approved for Implementation  

---

## 1. Database Overview & Technology Selection

The persistence layer for **XEROVA AI DEVFORCE** is built on **PostgreSQL 16+** using **SQLAlchemy 2.0 (Asyncio)** with `asyncpg` as the high-performance asynchronous driver, and **Alembic** as the schema migration engine.

### 1.1 Architectural Rationale
1. **Relational Integrity for Engineering Workflows:** Task dependency graphs (DAGs), multi-agent assignment rosters, organizational access control, and human approval gates require strict ACID guarantees and foreign-key constraints.
2. **Native Vector Search via `pgvector`:** Rather than managing an external vector database (such as Pinecone, Qdrant, or Milvus), DEVFORCE leverages PostgreSQL's native `pgvector` extension. This keeps code embeddings, architecture decision records (ADRs), and code files within the same transactional boundary.
3. **Structured & Semi-Structured Hybrid:** Tabular data (tasks, users, approvals) is strictly typed in relational tables, while dynamic execution evidence, tool parameters, and AST metadata are stored in indexed `JSONB` columns.
4. **Append-Only Auditing:** Governance, approvals, and execution traces are preserved in append-only tables to guarantee an unalterable history of agent actions.

---

## 2. Entity-Relationship (ER) Domain Model

The database is divided into eight logical domains:
1. **Organization & Multi-Tenancy:** Workspaces, Users, API Keys, Credentials.
2. **Projects & Repositories:** Projects, Repositories, Environment Variables, Settings.
3. **Agents & Personas:** Agent Personas, Agent Instances, Capabilities.
4. **Plans & Task DAG:** Plans, Goals, Tasks, Task Dependencies.
5. **Execution & Evidence:** Execution Runs, Tool Invocations, Step Logs, Evidence Records.
6. **Governance & Approvals:** Approval Requests, Governance Policies, Tamper-Evident Audit Trails.
7. **Project Memory & Knowledge:** Code Chunks, Embeddings, Architecture Decisions (ADRs), Guidelines.
8. **Events & Notifications:** Domain Events, Notification Logs.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ENTITY RELATIONSHIP OVERVIEW                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [organizations] 1───* [workspaces] 1───* [users]
                             │
                             1
                             │
                             *
                        [projects] 1───* [repositories]
                             │
                             ├───1───* [project_secrets]
                             ├───1───* [architecture_decisions]
                             ├───1───* [code_memory_chunks] (pgvector)
                             │
                             1
                             │
                             *
                          [plans]
                             │
                             1
                             │
                             *
                          [tasks] 1───* [task_dependencies] (DAG)
                             │
                             1
                             │
                             *
                     [execution_runs] 1───* [tool_invocations]
                             │        1───* [step_logs]
                             │        1───1 [execution_evidences] (Real Proof)
                             │
                             1
                             │
                             *
                    [approval_requests] 1───1 [governance_audits] (Hash Chain)
```

---

## 3. Comprehensive Schema Specification

### 3.1 Organization & Security Domain

```sql
-- Enables UUID and pgvector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Organizations (Top-level billing & enterprise entity)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Workspaces (Tenant isolation boundary)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    max_concurrent_sandboxes INT NOT NULL DEFAULT 4,
    monthly_token_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_workspace_slug_per_org UNIQUE (organization_id, slug)
);

-- Users
CREATE TYPE user_role_enum AS ENUM ('SUPERADMIN', 'ADMIN', 'DEVELOPER', 'VIEWER');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'DEVELOPER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_users_workspace_id ON users(workspace_id);
```

### 3.2 Projects & Repositories Domain

```sql
CREATE TYPE project_status_enum AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    status project_status_enum NOT NULL DEFAULT 'ACTIVE',
    default_runtime_adapter VARCHAR(50) NOT NULL DEFAULT 'OPENHANDS_SDK',
    max_parallel_tasks INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_project_slug_per_workspace UNIQUE (workspace_id, slug)
);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);

CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    remote_url VARCHAR(1024) NOT NULL,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    working_branch VARCHAR(255) NOT NULL DEFAULT 'devforce/work',
    clone_target_path VARCHAR(255) NOT NULL DEFAULT 'repo',
    auth_credential_id UUID, -- References project_secrets
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_repositories_project ON repositories(project_id);

-- Encrypted Secrets & Environment Variables (Envelope Encrypted)
CREATE TABLE project_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    encrypted_value BYTEA NOT NULL, -- AES-256-GCM ciphertext
    nonce BYTEA NOT NULL,           -- Initialization vector
    tag BYTEA NOT NULL,             -- Authentication tag
    key_version INT NOT NULL DEFAULT 1,
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_secret_key_per_project UNIQUE (project_id, key_name)
);
CREATE INDEX idx_project_secrets_project ON project_secrets(project_id);
```

### 3.3 Agent Personas & Capabilities Domain

```sql
CREATE TYPE agent_role_enum AS ENUM (
    'PRODUCT_MANAGER', 
    'SYSTEM_ARCHITECT', 
    'PROJECT_MANAGER', 
    'STAFF_ENGINEER', 
    'QA_ENGINEER', 
    'SECURITY_ENGINEER', 
    'DEVOPS_ENGINEER'
);

CREATE TABLE agent_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role agent_role_enum NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    system_prompt_template TEXT NOT NULL,
    preferred_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    fallback_model VARCHAR(100) NOT NULL DEFAULT 'claude-3-7-sonnet',
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.20,
    max_tokens_per_turn INT NOT NULL DEFAULT 4096,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE agent_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES agent_personas(id),
    status VARCHAR(50) NOT NULL DEFAULT 'IDLE', -- IDLE, ACTIVE, BLOCKED, TERMINATED
    total_tokens_consumed BIGINT NOT NULL DEFAULT 0,
    total_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    current_task_id UUID, -- Foreign key added below after tasks table creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_agent_instances_project ON agent_instances(project_id);
```

### 3.4 Plans, Tasks & Dependency DAG Domain

```sql
CREATE TYPE plan_status_enum AS ENUM ('DRAFTING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    objective TEXT NOT NULL,
    prd_document TEXT,                  -- Generated PRD markdown
    architecture_spec TEXT,              -- Generated Technical Blueprint markdown
    status plan_status_enum NOT NULL DEFAULT 'DRAFTING',
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_plans_project ON plans(project_id);

CREATE TYPE task_status_enum AS ENUM (
    'PENDING', 
    'QUEUED', 
    'RUNNING', 
    'AWAITING_APPROVAL', 
    'VERIFYING', 
    'COMPLETED', 
    'FAILED', 
    'BLOCKED'
);

CREATE TYPE task_priority_enum AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    assigned_role agent_role_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status task_status_enum NOT NULL DEFAULT 'PENDING',
    priority task_priority_enum NOT NULL DEFAULT 'MEDIUM',
    order_index INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    retry_count INT NOT NULL DEFAULT 0,
    blast_radius_score NUMERIC(3, 2) NOT NULL DEFAULT 0.10,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_plan ON tasks(plan_id);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);

-- Add delayed foreign key from agent_instances to tasks
ALTER TABLE agent_instances 
    ADD CONSTRAINT fk_agent_instances_task 
    FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- Task Dependencies (Explicit Directed Acyclic Graph Edges)
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_task_dependency UNIQUE (task_id, depends_on_task_id),
    CONSTRAINT chk_no_self_dependency CHECK (task_id != depends_on_task_id)
);
CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_parent ON task_dependencies(depends_on_task_id);
```

### 3.5 Execution & Real Evidence Domain

```sql
CREATE TYPE run_status_enum AS ENUM ('STARTING', 'EXECUTING', 'AWAITING_INPUT', 'VERIFYING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT');

CREATE TABLE execution_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_instance_id UUID NOT NULL REFERENCES agent_instances(id),
    runtime_adapter VARCHAR(50) NOT NULL, -- OPENHANDS, CODEX, CLINE
    container_id VARCHAR(128),
    git_worktree_path VARCHAR(512),       -- Host path to dedicated isolated git worktree
    status run_status_enum NOT NULL DEFAULT 'STARTING',
    exit_code INT,
    duration_ms BIGINT DEFAULT 0,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    cost_usd NUMERIC(10, 4) DEFAULT 0.0000,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_execution_runs_workspace ON execution_runs(workspace_id);
CREATE INDEX idx_execution_runs_project ON execution_runs(project_id);
CREATE INDEX idx_execution_runs_task ON execution_runs(task_id);

-- Discrete Tool Invocations
CREATE TABLE tool_invocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL, -- e.g. terminal, file_editor, pytest_runner
    parameters JSONB NOT NULL,
    raw_output TEXT,
    is_error BOOLEAN NOT NULL DEFAULT FALSE,
    duration_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_tool_invocations_run ON tool_invocations(execution_run_id);

-- Step Logs (ANSI Terminal Output & Streaming Tokens) — Range-Partitioned Monthly
CREATE TABLE step_logs (
    id BIGSERIAL,
    execution_run_id UUID NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
    stream_type VARCHAR(20) NOT NULL, -- stdout, stderr, thinking, agent_action
    sequence_num BIGINT NOT NULL,
    chunk TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partition examples:
CREATE TABLE step_logs_2026_03 PARTITION OF step_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE step_logs_2026_04 PARTITION OF step_logs
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE step_logs_default PARTITION OF step_logs DEFAULT;

CREATE INDEX idx_step_logs_run_seq ON step_logs(execution_run_id, sequence_num);

-- Empirical Execution Evidence (Proof of Work)
CREATE TABLE execution_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID UNIQUE NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    test_framework VARCHAR(50) NOT NULL,    -- pytest, vitest, playwright
    tests_total INT NOT NULL DEFAULT 0,
    tests_passed INT NOT NULL DEFAULT 0,
    tests_failed INT NOT NULL DEFAULT 0,
    tests_skipped INT NOT NULL DEFAULT 0,
    git_diff_stat TEXT,                     -- Summary diff (e.g., "5 files changed, 120 insertions")
    git_diff_patch TEXT,                    -- Full unified diff
    test_stdout TEXT,                       -- Verifiable raw test runner stdout
    test_stderr TEXT,                       -- Verifiable raw test runner stderr
    exit_code INT NOT NULL DEFAULT 0,       -- Process return code
    verification_hash VARCHAR(64) NOT NULL, -- SHA-256(canonical JSON of exit_code, framework, counts, stdout, stderr, diff)
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_execution_evidences_task ON execution_evidences(task_id);
```

### 3.6 Approval & Governance Domain (Tamper-Evident Hash Chain)

```sql
CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT');

CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    execution_run_id UUID REFERENCES execution_runs(id),
    operation_type VARCHAR(100) NOT NULL, -- e.g., GIT_PUSH, DB_MIGRATION, PKG_INSTALL
    command_payload TEXT NOT NULL,
    target_resource VARCHAR(500) NOT NULL,
    blast_radius_score NUMERIC(3, 2) NOT NULL,
    risk_summary TEXT NOT NULL,
    status approval_status_enum NOT NULL DEFAULT 'PENDING',
    resolved_by_user_id UUID REFERENCES users(id),
    user_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_task ON approval_requests(task_id);

-- Cryptographically Chained Governance Audit Trail (Per-Workspace Monotonic Chain)
CREATE TABLE governance_audits (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    workspace_sequence_num BIGINT NOT NULL,   -- Monotonic counter scoped to workspace
    approval_request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    actor_id UUID,                            -- User ID or Agent ID
    actor_type VARCHAR(50) NOT NULL,          -- HUMAN, AGENT, SYSTEM
    payload_hash VARCHAR(64) NOT NULL,        -- SHA-256(canonical_json(metadata))
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_record_hash VARCHAR(64) NOT NULL,    -- SHA-256 of previous workspace row (64 zeros for seq=1)
    current_record_hash VARCHAR(64) NOT NULL, -- SHA-256(prev_record_hash || workspace_id || workspace_sequence_num || actor_id || action || payload_hash || created_at)
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_governance_workspace_seq UNIQUE (workspace_id, workspace_sequence_num)
);
CREATE INDEX idx_governance_audits_workspace_seq ON governance_audits(workspace_id, workspace_sequence_num);
CREATE INDEX idx_governance_audits_chain ON governance_audits(workspace_id, current_record_hash);
```

### 3.7 Project Memory & Knowledge Domain (pgvector)

```sql
-- Architectural Decision Records (ADRs) & Institutional Rules
CREATE TABLE architecture_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    decision_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACCEPTED', -- PROPOSED, ACCEPTED, SUPERSEDED
    context_rationale TEXT NOT NULL,
    decision_outcome TEXT NOT NULL,
    consequences TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_adr_num_per_project UNIQUE (project_id, decision_number)
);
CREATE INDEX idx_adrs_project ON architecture_decisions(project_id);

-- Code Memory Chunks (Semantic Vector Indexing)
CREATE TABLE code_memory_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path VARCHAR(1024) NOT NULL,
    chunk_index INT NOT NULL,
    symbol_name VARCHAR(255),          -- Class name, function name, or module
    symbol_type VARCHAR(50),          -- CLASS, FUNCTION, INTERFACE, CONFIG
    start_line INT NOT NULL,
    end_line INT NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of content to detect modifications
    embedding vector(1536),           -- OpenAI text-embedding-3-small (1536 dimensions)
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_code_chunks_project ON code_memory_chunks(project_id);
CREATE INDEX idx_code_chunks_file ON code_memory_chunks(project_id, file_path);

-- HNSW Vector Index for Sub-Millisecond Cosine Similarity Search
CREATE INDEX idx_code_memory_hnsw_embedding 
ON code_memory_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 4. Alembic Migration & Versioning Strategy

### 4.1 Migration File Organization
Alembic migrations reside in `backend/alembic/versions/` and use strictly ordered, timestamp-prefixed filenames:
```
backend/
├── alembic.ini
└── alembic/
    ├── env.py
    ├── script.py.mako
    └── versions/
        ├── 20261109_001_initial_core_schema.py
        ├── 20261109_002_enable_pgvector_and_memory.py
        ├── 20261109_003_add_governance_hash_chain.py
        └── 20261109_004_add_real_evidence_tables.py
```

### 4.2 Migration Execution Guidelines
- All migrations run automatically in the CI pipeline against a staging PostgreSQL instance before any deployment.
- Zero-downtime schema evolution:
  - Adding columns must include default values or allow `NULL`.
  - Column deprecations follow a two-step cycle: mark `deprecated` in application code first, then drop in a subsequent migration release.
- Alembic `env.py` is configured with `target_metadata = Base.metadata` to ensure all SQLAlchemy declarative models match the migration state.

### 4.3 Alembic pgvector & Custom Index Autogeneration Handling
Alembic `--autogenerate` does not natively register PostgreSQL extension types like `vector` without explicit comparator hooks. To eliminate false diffs (such as Alembic repeatedly attempting to drop or re-create vector columns and HNSW indexes):
1. In `backend/alembic/env.py`, import `pgvector.sqlalchemy` and configure `compare_type=True`.
2. Register custom type comparators:
```python
from pgvector.sqlalchemy import Vector

def compare_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    if isinstance(metadata_type, Vector) and isinstance(inspected_type, Vector):
        return inspected_type.dim != metadata_type.dim
    return None
```
3. Declare HNSW operator classes directly in SQLAlchemy declarative index declarations to guarantee deterministic Alembic autogeneration:
```python
Index(
    "idx_code_memory_hnsw_embedding",
    CodeMemoryChunk.embedding,
    postgresql_using="hnsw",
    postgresql_ops={"embedding": "vector_cosine_ops"},
    postgresql_with={"m": 16, "ef_construction": 64},
)
```

---

## 5. Performance, Indexing & Partitioning Strategy

### 5.1 Connection Pooling
- Using `asyncpg` within SQLAlchemy `create_async_engine`:
  - `pool_size`: 20 connections per API instance.
  - `max_overflow`: 10 connections during traffic spikes.
  - `pool_timeout`: 30 seconds.
  - `pool_recycle`: 1800 seconds (prevents stale TCP connections).

### 5.2 Table Partitioning for Execution Logs
The `step_logs` table accumulates high-frequency terminal and streaming token events. To maintain query performance and avoid index bloat:
- `step_logs` is natively range-partitioned monthly by `created_at` with a composite primary key `PRIMARY KEY (id, created_at)`.
- Pre-provisioning: A scheduled maintenance cron runs on the 25th of each month creating the partition for $T+1$ month.
- Cold Archival: Partitions older than 90 days are exported to cold object storage (Parquet format) and detached via `ALTER TABLE step_logs DETACH PARTITION` before truncation.

### 5.3 JSONB Indexing
Columns storing structured tool calls and agent capabilities use GIN (Generalized Inverted Index) indexing where key-value searches are executed:
```sql
CREATE INDEX idx_tool_invocations_params_gin ON tool_invocations USING gin (parameters);
CREATE INDEX idx_agent_capabilities_gin ON agent_personas USING gin (capabilities);
```

