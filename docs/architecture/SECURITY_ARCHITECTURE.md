# XEROVA AI DEVFORCE — Security Architecture Document
**System Name:** XEROVA AI DEVFORCE  
**Document Code:** XAD-ARCH-SEC-005  
**Version:** 1.0.0  
**Phase:** 0B — Complete System Architecture Design  
**Author:** Principal Software Architect & AI Agent Systems Engineer  
**Date:** March 2026  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Security Posture

**XEROVA AI DEVFORCE** is an autonomous software engineering workforce system designed to operate with high operational autonomy while maintaining defense-in-depth security. Because DEVFORCE agents generate code, execute shell commands, and interact with external code repositories, traditional perimeter-only security is insufficient. 

DEVFORCE enforces a **Zero-Trust Agentic Architecture** governed by four foundational tenets:
1. **Assume Agent Compromise:** Treat all LLM outputs and generated code as untrusted input.
2. **Strict Containment:** Never allow agent execution to reach the host operating system.
3. **No Hardcoded Secrets & Dynamic Redaction:** Cryptographically protect credentials at rest and scrub them from all logging streams.
4. **Mandatory Human Governance:** Enforce cryptographic human sign-off for any action with significant organizational or infrastructural blast radius.

---

## 2. Threat Model: STRIDE Analysis for Autonomous Agent Workforces

| STRIDE Category | Threat Description | Agent-Specific Attack Vector | DEVFORCE Architectural Countermeasure |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates an agent persona or privileged administrator. | Prompt injection instructing an agent to claim it is `SUPERADMIN` and override safety policies. | Cryptographic JWT token validation, strict server-side RBAC enforcement, agent context isolation. |
| **Tampering** | Malicious alteration of task graphs, code diffs, or audit logs. | Agent modifying historical evidence or task status to bypass test failures. | SHA-256 hash chaining of audit logs, database foreign key constraints, backend-enforced state machine transitions. |
| **Repudiation** | User or agent denies executing an unauthorized deployment or commit. | Disputed git push to production or destructive database drop. | Tamper-evident append-only `governance_audits` table with cryptographic parent-hash chaining and user sign-offs. |
| **Information Disclosure** | Exfiltration of proprietary source code or infrastructure secrets. | Prompt injection causing agent to output environment variables via WebSocket stream or commit them to git. | AES-256-GCM envelope encryption, runtime stream secret redaction engine, restricted network bridge egress. |
| **Denial of Service** | Resource exhaustion crashing backend or host infrastructure. | Agent generating infinite recursion, fork bombs, or uncontrolled token spending loops. | cgroups v2 memory/CPU quotas, process limit (`PidsLimit=512`), hard token budget caps ($USD). |
| **Elevation of Privilege** | Agent breaks out of container to gain host OS root access. | Exploiting Docker socket mounts (`/var/run/docker.sock`) or host kernel vulnerabilities. | Strict ban on Docker socket mounting, unprivileged non-root user (`UID 1000`), dropped Linux capabilities (`CAP_DROP ALL`). |

---

## 3. Secrets Management Architecture

### 3.1 Zero Hardcoded Secrets Policy
- The DEVFORCE codebase, configuration files, and dockerfiles contain **zero** plaintext credentials, API keys, or private tokens.
- Development and production environments require a cryptographically random master key (`DEVFORCE_MASTER_KEY`, 256-bit base64) supplied via secure environment variables.

### 3.2 Envelope Encryption at Rest
All sensitive credentials (GitHub Personal Access Tokens, LLM API keys, database connection strings) stored in the `project_secrets` table are protected using **Envelope Encryption** with AES-256-GCM:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ENVELOPE ENCRYPTION WORKFLOW                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [Master Encryption Key (MEK)] ───► (Resides in Environment / Vault, never in DB)
                │
                ▼
   [Key Derivation Function (HKDF-SHA256)]
                │
                ▼
   [Project Data Encryption Key (DEK)]
                │
                ▼
   AES-256-GCM Encrypt(Plaintext Secret, Nonce, Associated Data: project_id)
                │
                ├──► [Ciphertext]  ──► Stored in project_secrets.encrypted_value
                ├──► [Nonce (IV)]  ──► Stored in project_secrets.nonce
                └──► [Auth Tag]    ──► Stored in project_secrets.tag
```

### 3.3 Ephemeral Runtime Injection
1. Secrets are decrypted **in-memory only** within the backend service at the exact instant an execution container is provisioned.
2. Credentials are piped into the container as transient environment variables or temporary RAM-disk files (`tmpfs`).
3. Upon container destruction, the `tmpfs` is wiped and all memory buffers are explicitly overwritten.

---

## 4. In-Flight Secret Redaction Engine

Any string transmitted over WebSockets, printed to the terminal console, or written to PostgreSQL `step_logs` passes through the **`SecretRedactionEngine`**.

```
                Raw Terminal Chunk / Agent Stream
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │       SecretRedactionEngine          │
            │  - Regex Token Scanners              │
            │  - High-Entropy String Detectors     │
            │  - Known Active Secrets Whitelist    │
            └──────────────────┬───────────────────┘
                               │
                               ▼
            Redacted Chunk ("ghp_****" -> "[REDACTED_GITHUB_TOKEN]")
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        [WebSocket Broadcast]       [Database Persistence]
```

### 4.1 Built-in High-Risk Redaction Signatures
- **OpenAI API Keys:** `sk-[a-zA-Z0-9]{20,}`
- **Anthropic API Keys:** `sk-ant-[a-zA-Z0-9]{20,}`
- **GitHub Tokens:** `(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}`
- **AWS Access Keys:** `AKIA[0-9A-Z]{16}`
- **SSH Private Keys:** `-----BEGIN [A-Z]+ PRIVATE KEY-----`
- **Dynamic Project Secrets:** All active plaintext secret values in the project are dynamically loaded into an exact-match Aho-Corasick automaton for instantaneous zero-latency replacement.

### 4.2 High-Throughput Streaming Redaction & Backpressure
Under high-throughput burst conditions (such as verbose build logs or test outputs exceeding 10,000 lines/sec):
- **Chunk Aggregation & Micro-Batching:** Terminal outputs from Docker stdout/stderr streams are aggregated into 50ms time windows (or max 64KB chunks) before ingestion by the redaction engine. This turns 10,000 micro-chunks/sec into ~20 composite batched frames/sec, eliminating WebSocket framing overhead and context-switching bottlenecks.
- **Aho-Corasick Scanning Latency:** The exact-match Aho-Corasick string matching algorithm operates in strictly $O(N + M)$ time complexity, where $N$ is the payload byte length and $M$ is the number of matching secret substrings. Its throughput is completely invariant to the number of configured project secrets (whether 5 or 50+ active secrets), sustaining over 120 MB/second scan speed per CPU core with sub-millisecond per-frame latency.
- **Memory Safety:** Redaction operates over streaming buffer slices without accumulating unbounded text buffers in memory.

---

## 5. Execution Sandboxing Guardrails & Escape Prevention

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CONTAINER SECURITY SPECIFICATION                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [LINUX NAMESPACES]        [LINUX CAPABILITIES]          [CGROUPS V2 RESOURCE LIMITS]            │
│  - PID Namespace           - CapDrop = ALL               - Memory = 4096 MB                      │
│  - Network Namespace       - CapAdd = SETUID, SETGID     - MemorySwap = 1024 MB                  │
│  - Mount Namespace         - NoNewPrivileges = TRUE      - NanoCPUs = 2000000000 (2.0 cores)     │
│  - IPC Namespace                                         - PidsLimit = 512                       │
│                                                                                                  │
│  [FILESYSTEM SECURITY]                                   [NETWORK POLICY]                        │
│  - System Root: Read-Only (`read_only: true`)            - Ingress: DROP ALL                     │
│  - Workspace: `/workspace` (rw, nosuid, nodev)           - Egress: Restrict to package registries │
│    Bound strictly to dedicated Git worktree              - Docker Socket: NEVER EXPOSED          │
│  - Tmpfs: `/tmp` (size=512m, noexec, nosuid)                                                     │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Prohibition of Docker-in-Docker Socket Mounting
- The backend configuration validates that `/var/run/docker.sock` is **never** added to the container's volume mounts.
- If an agent issues `docker run` or attempts to locate `/var/run/docker.sock`, the execution returns a permissions error.

### 5.2 Network Egress Filtering
- The sandbox container network interface is attached to a dedicated Docker bridge with `iptables` / `nftables` egress filtering:
  - Allowed outbound TCP ports: `80`, `443`.
  - Allowed outbound destinations: Whitelisted package registries (`registry.npmjs.org`, `pypi.org`, `github.com`).
  - Blocked: Local host private IPs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` cloud metadata endpoints).

### 5.3 Host Platform Independence & Universal Containerization
To enforce Principle 5 ("No unrestricted host execution") across all development operating systems:
- On Linux hosts, runtime adapters may leverage either Docker containers or OS-level sandboxing (Bubblewrap + Landlock LSM).
- On Windows and macOS hosts, all execution harnesses (including OpenAI Codex and Cline headless engines) run **strictly inside the Linux-based `xerova/devforce-sandbox` Docker container**. Host OS process execution is completely prohibited.

---

## 6. Human-in-the-Loop Governance & Blast-Radius Policy Engine

DEVFORCE ensures human developers retain complete operational sovereignty through the **Blast-Radius Policy Engine**.

### 6.1 Blast-Radius Calculation Formula
$$\text{BlastRadius} = \min\left(1.0, \sum w_i \cdot c_i\right)$$

Where factors $c_i$ include:
- Modifying critical infrastructure files (`Dockerfile`, `docker-compose.yml`, `k8s/`): $+0.40$
- Executing database schema migrations (`alembic upgrade`, `ALTER TABLE`): $+0.50$
- Modifying security/auth files (`security.py`, `auth.ts`, `jwt`): $+0.30$
- Adding external third-party dependencies (`package.json`, `pyproject.toml`): $+0.25$
- Git push or branch management operations: $+0.60$

### 6.2 Governance Action Tiers

```
   Blast Radius Score
   
   0.0 ────────────── 0.3 ────────────── 0.7 ────────────── 1.0
   │   AUTO-APPROVE    │   SOFT APPROVE   │  MANDATORY HITL  │
   │   - Read files    │   - Edit code    │  - Git push      │
   │   - Run linters   │   - Run tests    │  - DB migration  │
   │   - Format code   │   - Add internal │  - Infra change  │
   │                   │     helpers      │  - Package add   │
```

### 6.3 Tamper-Evident Governance Audit Trail (Per-Workspace Monotonic Hash Chain)
To prevent cross-tenant concurrency collisions and guarantee tamper-evident non-repudiation in multi-tenant environments, the audit log computes a cryptographically chained hash sequence scoped per workspace:

$$\text{current\_record\_hash} = \text{SHA256}(\text{prev\_record\_hash} \parallel \text{workspace\_id} \parallel \text{workspace\_sequence\_num} \parallel \text{actor\_id} \parallel \text{action} \parallel \text{payload\_hash} \parallel \text{created\_at})$$

1. **Monotonic Workspace Sequence:** Each record in `governance_audits` is assigned a strictly increasing `workspace_sequence_num` guaranteed unique per workspace (`UNIQUE(workspace_id, workspace_sequence_num)`).
2. **Genesis Block:** For `workspace_sequence_num = 1`, `prev_record_hash` is initialized to 64 ASCII zeros (`0000000000000000000000000000000000000000000000000000000000000000`).
3. **Payload Hash:** $\text{payload\_hash} = \text{SHA256}(\text{CanonicalJSON}(\text{metadata}))$, ensuring complex metadata objects are hashed deterministically.
4. **Tamper Detection:** If an unauthorized actor modifies any historical audit row or deletes a record, the subsequent hashes fail verification. The audit validator flags the tamper event immediately, alerting administrators and locking workspace operations.

---

## 7. Authentication, Authorization & RBAC

### 7.1 JWT Token Architecture
- Authentication uses short-lived JWT access tokens (15-minute expiration) with rotating refresh tokens (7-day expiration).
- JWT claims include:
  - `sub`: User UUID
  - `org_id`: Organization UUID
  - `workspace_id`: Workspace UUID
  - `role`: Role (`SUPERADMIN`, `ADMIN`, `DEVELOPER`, `VIEWER`)

### 7.2 Role-Based Access Control (RBAC) Matrix

| Operation | SUPERADMIN | ADMIN | DEVELOPER | VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Workspaces & Billing** | Yes | No | No | No |
| **Manage Users & RBAC Roles** | Yes | Yes | No | No |
| **Manage Project Secrets** | Yes | Yes | No | No |
| **Create & Dispatch Plans** | Yes | Yes | Yes | No |
| **Approve High-Blast Operations** | Yes | Yes | Yes (Configurable) | No |
| **Trigger Agent Execution Runs** | Yes | Yes | Yes | No |
| **View Real-Time Terminal & Code Diffs**| Yes | Yes | Yes | Yes |
| **Export Audit Logs** | Yes | Yes | No | No |

---

## 8. Supply Chain Security & Dependency Hardening

Incorporating the concrete findings from the **Phase 0A Repository & Dependency Audit**, DEVFORCE enforces stringent supply-chain protections:

1. **Dependency Age Guardrail (`exclude-newer`):**
   Package installers (`uv`, `npm`) are configured with a mandatory 7-day publication delay. This ensures newly published malicious packages or hijacked PyPI/npm accounts cannot immediately infect agent sandboxes.
2. **eMudhra CA Distrust Protection (GHSA-6q48-6c7w-9gw2):**
   Explicitly pins `certifi >= 2026.10.19` across all base environments to prevent man-in-the-middle attacks via compromised root certificates.
3. **Regular Expression DOS Guardrail:**
   Enforces `rich >= 14.3.3` to eliminate catastrophic regex backtracking vulnerabilities in terminal logging.
4. **Automated Dependency Vulnerability Scanning:**
   Before any newly introduced dependency is installed, the `SecurityEngineerAgent` runs `pip-audit` or `npm audit` inside the sandbox. Any package with a known CVE rated High or Critical is automatically rejected.

---

## 9. Platform Testing & Quality Assurance Architecture

To guarantee platform stability, verify security boundaries, and validate that zero fabricated evidence or fake progress indicators exist in DEVFORCE, the testing architecture is divided into three coordinated testing tiers:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PLATFORM TESTING ARCHITECTURE                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [TIER 1: BACKEND (Pytest)]         [TIER 2: FRONTEND (Vitest)]      [TIER 3: E2E (Playwright)] │
│   - Unit Tests: Domain logic, DAG    - Component Tests: Radix UI,     - End-to-End User Journeys │
│     topological sort, cycles           diff viewer, approval modal    - Real-time WebSocket flow │
│   - Integration: FastAPI endpoints,  - Hook Tests: useWebSocketStream, - HITL Approval Modals    │
│     SQLAlchemy ORM, Alembic            useTaskDag, useGovernance     - Live Terminal Streaming  │
│   - Security: Sandbox containment,   - Store Tests: Zustand buffers,  - Empirical Evidence Hash  │
│     cgroups limits, egress rules       optimistic UI updates            Verification             │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.1 Backend Testing Architecture (Pytest)
- **Framework & Tooling:** `pytest >= 8.3`, `pytest-asyncio`, `pytest-mock`, `pytest-cov`, and `httpx` (for async FastAPI ASGI client testing).
- **Test Suite Partitioning:**
  1. `tests/unit/`:
     - Pydantic v2 data contract serialization and boundary validation.
     - NetworkX DAG topological sorting, cycle detection, and in-degree resolution.
     - Blast-radius formula calculation and policy rule evaluation.
     - Secret redaction regex performance and Aho-Corasick exact-match speed benchmark with 50+ project secrets.
     - Canonical JSON deterministic serialization and SHA-256 evidence verification hashing.
  2. `tests/integration/`:
     - Database persistence tests using isolated ephemeral PostgreSQL test containers (`testcontainers-python`).
     - Alembic migration forward/rollback idempotency tests with `pgvector` HNSW indexes.
     - Git worktree lifecycle: verifying `git worktree add`, concurrent branch modifications across separate containers, and clean removal without primary repo corruption.
     - Git merge conflict simulation: asserting the orchestrator passes conflict markers to `StaffEngineerAgent` for self-correction.
     - FastAPI REST endpoints with authentication and RBAC permission checks.
     - Asynchronous event bus pub/sub dispatch and dead-letter queue behavior.
  3. `tests/security/`:
     - Docker sandbox containment tests: asserting non-root UID 1000 execution, read-only rootfs (`/`), blocked `/var/run/docker.sock`, dropped Linux capabilities, and blocked local metadata IP egress (`169.254.169.254`).
     - Tamper-evident audit trail tests: injecting direct SQL mutations into `governance_audits` and verifying that per-workspace hash chain validation immediately detects corruption and locks the workspace.
- **Execution Target:** `pytest tests/ -v --tb=short --cov=app --cov-report=term-missing --cov-fail-under=85`

### 9.2 Frontend Testing Architecture (Vitest)
- **Framework & Tooling:** `vitest >= 3.0`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`.
- **Test Suite Partitioning:**
  1. **Component Testing (`src/**/*.test.tsx`):**
     - `ApprovalModal.test.tsx`: Verifies that blast-radius badge colors render accurately (Low/Medium/High/Critical), that diff previews format correctly, and that clicking "Approve" dispatches signed payloads.
     - `TerminalConsole.test.tsx`: Verifies ANSI rendering via Xterm.js without dropping chunks during high-frequency throughput.
     - `DiffViewer.test.tsx`: Asserts unified and split Monaco diff view rendering.
     - `TaskDagGraph.test.tsx`: Verifies React Flow node state updates from `PENDING` to `RUNNING` to `COMPLETED`.
  2. **Hook & Store Testing:**
     - `useWebSocketStream.test.ts`: Simulates WebSocket disconnections, asserting automatic exponential backoff reconnection and message resynchronization.
     - `useExecutionStore.test.ts`: Asserts circular ring buffer bounding (max 5,000 lines) and frame micro-batching preventing memory leaks during extreme stdout volume (>10,000 lines/sec).
  3. **Anti-Fabrication Audit Test:**
     - Static code analysis test scanning the frontend repository for synthetic timers (`setInterval` with simulated progress, mock percentage increments). Any artificial delay or fake loader fails the build.
- **Execution Target:** `vitest run --coverage`

### 9.3 End-to-End Testing Architecture (Playwright)
- **Framework & Tooling:** `@playwright/test >= 1.50`, running headless across Chromium, Firefox, and WebKit under virtual display (`xvfb-run` in Linux CI).
- **End-to-End Multi-Agent Lifecycle Scenario:**
  1. **Authentication:** User logs into the DEVFORCE portal, receives JWT token, and selects the target project workspace.
  2. **Goal Submission:** User enters a natural language objective: *"Implement JWT authentication with refresh token rotation and write comprehensive unit tests"*.
  3. **DAG Generation Verification:** Playwright asserts the interactive DAG appears with nodes: PRD Specification ➔ Schema Migration ➔ Service Logic ➔ Route Handler ➔ Pytest Verification.
  4. **Live Execution Streaming:** Asserts Xterm.js console streams real shell logs from the Docker sandbox.
  5. **Governance Interception:** When the agent executes a database migration command with blast-radius $> 0.7$, Playwright verifies the execution pauses, the HITL Approval Modal pops up, and the user must click "Approve" to proceed.
  6. **Evidence Receipt & Completion:** Asserts the task completes only after real Pytest passes ($100\%$ green), displays the cryptographic verification hash, and displays the created GitHub Pull Request.
- **Execution Target:** `npx playwright test --project=chromium`

### 9.4 Continuous Integration & Quality Gates
- All PRs must pass the tri-tier test pipeline before merge authorization:
  $$\text{CI Gate} = \text{Pytest (100\% pass)} \land \text{Vitest (100\% pass)} \land \text{Playwright (100\% pass)} \land \text{Security Audit (0 Critical CVEs)}$$
- Flaky test detection: Playwright tests are executed 3 times in parallel on staging branches to guarantee zero test non-determinism.
