# XEROVA AI DEVFORCE — Execution Architecture Document
**System Name:** XEROVA AI DEVFORCE  
**Document Code:** XAD-ARCH-EXE-004  
**Version:** 1.0.0  
**Phase:** 0B — Complete System Architecture Design  
**Author:** Principal Software Architect & AI Agent Systems Engineer  
**Date:** March 2026  
**Status:** Approved for Implementation  

---

## 1. Execution Layer Mission & Security Baseline

The execution layer of **XEROVA AI DEVFORCE** is responsible for translating agent reasoning and tool invocations into real-world code modifications, compiler executions, and test runs. 

### 1.1 Non-Negotiable Operational Guardrails
1. **Zero Unrestricted Host Execution:** The DEVFORCE backend process never invokes `os.system()`, `subprocess.Popen()`, or arbitrary shell utilities directly on the host machine. All code operations occur within disposable, resource-constrained sandbox environments.
2. **Deterministic Evidence of Execution:** Every task completion claim must be corroborated by real runtime artifacts: process exit code `0`, parseable test runner outputs (Pytest, Vitest, Playwright), and a non-empty unified git diff.
3. **Replaceable Runtime Adapters:** The orchestrator remains completely decoupled from specific execution runtimes. Whether code is edited by the **OpenHands SDK**, **OpenAI Codex**, or **Cline**, DEVFORCE interacts with runtimes via the unified `IRuntimeAdapter` contract.

---

## 2. Runtime Adapter Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   RUNTIME ADAPTER ABSTRACTION                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌───────────────────────┐
                                    │    TASK SCHEDULER     │
                                    └───────────┬───────────┘
                                                │ Dispatches Task
                                                ▼
                                    ┌───────────────────────┐
                                    │   IRuntimeAdapter     │
                                    │      (Protocol)       │
                                    └───────────┬───────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐       ┌──────────────────────────────┐
│     OpenHands SDK Adapter    │       │     OpenAI Codex Adapter     │       │        Cline Adapter         │
├──────────────────────────────┤       ├──────────────────────────────┤       ├──────────────────────────────┤
│ - Primary Python runtime     │       │ - OS-level sandboxing (bwrap)│       │ - Headless Bun/TS runner     │
│ - Ephemeral Docker workspace │       │ - Fast Rust execution daemon │       │ - Agenda task manager        │
│ - EventStream observation    │       │ - Local OSS model support    │       │ - Webview RPC emulation      │
│ - Full ACI tool suite        │       │   via Ollama / LM Studio     │       │ - Direct file watcher feed   │
└──────────────┬───────────────┘       └──────────────┬───────────────┘       └──────────────┬───────────────┘
               │                                      │                                      │
               └──────────────────────────────────────┼──────────────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │  DOCKER SANDBOX WORKSPACE    │
                                       │  - Non-root devforce user    │
                                       │  - /workspace bind mount     │
                                       │  - Network egress firewall   │
                                       │  - Resource limits (cgroups) │
                                       └──────────────────────────────┘
```

### 2.1 The Unified `IRuntimeAdapter` Protocol

```python
from dataclasses import dataclass, field
from typing import AsyncGenerator, Callable, Protocol, Awaitable
from pydantic import BaseModel, Field

@dataclass
class WorkspaceConfig:
    workspace_id: str
    project_id: str
    task_id: str
    repo_path: str
    branch_name: str
    environment_variables: dict[str, str] = field(default_factory=dict)
    cpu_limit: float = 2.0
    memory_limit_mb: int = 4096
    pids_limit: int = 512

@dataclass
class WorkspaceHandle:
    session_id: str
    container_id: str
    workspace_path: str       # Internal container mount point (/workspace)
    worktree_path: str        # Host-level isolated git worktree path
    runtime_type: str         # OPENHANDS, CODEX, CLINE

class TaskContext(BaseModel):
    task_id: str
    plan_id: str
    title: str
    instruction: str
    target_files: list[str] = Field(default_factory=list)
    timeout_seconds: int = 600

class ExecutionEvent(BaseModel):
    event_id: str
    workspace_id: str
    project_id: str
    task_id: str
    event_type: str           # stdout, stderr, tool_call, tool_result, error, suspension
    stream: str               # stdout, stderr, thinking, agent_action
    payload: str
    sequence_num: int
    timestamp: str

class CommandResult(BaseModel):
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int

class ExecutionResult(BaseModel):
    task_id: str
    exit_code: int
    duration_ms: int
    raw_stdout: str
    raw_stderr: str
    diff_patch: str
    files_modified: list[str]
    success: bool
    error_message: str | None = None

class IRuntimeAdapter(Protocol):
    """Universal contract for pluggable coding agent execution engines."""

    async def provision_workspace(self, config: WorkspaceConfig) -> WorkspaceHandle:
        """Provisions an isolated container workspace with dedicated mounted git worktree."""
        ...

    async def execute_task(
        self, 
        handle: WorkspaceHandle, 
        task: TaskContext, 
        event_callback: Callable[[ExecutionEvent], Awaitable[None]]
    ) -> ExecutionResult:
        """Executes agent task loop inside isolated workspace, streaming real-time events."""
        ...

    async def run_command(
        self, 
        handle: WorkspaceHandle, 
        command: str, 
        timeout_seconds: int = 120
    ) -> CommandResult:
        """Directly executes a command (e.g. test runner) in the sandbox."""
        ...

    async def teardown_workspace(self, handle: WorkspaceHandle) -> None:
        """Destroys sandbox container, unmounts/prunes git worktrees, and purges credentials."""
        ...
```

---

### 2.2 OpenHands SDK Adapter (Primary Coding Runtime)
- **Integration Mechanism:** DEVFORCE interfaces directly with the `openhands-sdk` and `openhands-workspace` Python packages.
- **Session Architecture:** 
  - An `openhands.sdk.agent.Agent` instance is instantiated per task run.
  - The runtime utilizes `openhands.workspace.docker.DockerWorkspace` to bind the task to an isolated container.
  - The internal `EventStream` is tapped to multiplex real-time `ActionEvent` and `ObservationEvent` objects directly into the DEVFORCE internal event bus and database `step_logs`.
- **Tool Suite Utilization:** Leverages OpenHands tools (`terminal`, `file_editor`, `task_tracker`) mapped directly to the container environment.

---

### 2.3 OpenAI Codex Adapter (High-Performance Engine)
- **Integration Mechanism:** Interacts with the compiled OpenAI Codex daemon (`codex-rs`) via JSON-RPC over Unix Domain Sockets (UDS) or TCP loopback.
- **Cross-Platform Sandboxing Strategy:**
  - **Linux Host OS:** Codex utilizes OS-level sandboxing via Bubblewrap (`bwrap`) and Landlock LSM (`landlock.rs`), providing sub-second startup times and kernel-level filesystem whitelisting.
  - **Windows, macOS & Cloud Container Hosts:** Codex daemon executes **inside** the Linux-based `xerova/devforce-sandbox` Docker container. The backend communicates with the in-container Codex daemon via RPC, guaranteeing identical security isolation, Landlock sandboxing, and non-root execution across all developer workstations.
- **Local Model Routing (`--oss`):** DEVFORCE routes tasks to local, privately hosted open-source models via Codex's native Ollama (`codex-rs/ollama/`) and LM Studio integrations, eliminating external API costs for routine syntax editing, lint fixes, and formatting.

---

### 2.4 Cline Adapter (Lightweight Headless Engine)
- **Integration Mechanism:** Communicates with Cline's headless runtime (`@cline/sdk`) via standard input/output JSON-RPC protocols.
- **Execution Containment Mandate:** In compliance with Architectural Principle 5 ("No unrestricted host execution"), the Cline headless Bun runtime (`bun >= 1.4.2`) is launched **strictly inside** the `xerova/devforce-sandbox` Docker container. It is never permitted to execute as a bare host process.
- **Persistent Agenda Engine:** Employs Cline's SQLite-persisted `agenda-task-manager` for tracking sub-task completion during long-running coding loops.
- **Security Interception:** Intercepts Cline's tool-execution approval events, bridging them into DEVFORCE's centralized `ApprovalEngine` rather than relying on interactive VS Code popups.

---

### 2.5 Token-Efficient Agent-Computer Interface (ACI) Tools (SWE-agent Paradigm)
Direct source code analysis from Phase 0A demonstrated that standard bash shells overload LLM context windows when agents read entire large files or pipe unconstrained command outputs. DEVFORCE adapts **SWE-agent's Agent-Computer Interface (ACI)** into the execution layer:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TOKEN-THRIFTY ACI TOOL ENGINE                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   STANDARD BASH (Context Overload)              DEVFORCE ACI TOOLS (Token Thrifty)               │
│   `cat large_file.py` (2,500 lines)      ──►    `open_file(path, line_number=120, window=100)`   │
│   ==> 18,000 tokens consumed in 1 turn          ==> 650 tokens consumed (96% reduction)          │
│                                                                                                  │
│   `sed -i 's/.../...' file.py`           ──►    `edit_lines(path, start_line=145, end_line=152,  │
│   ==> Brittle, prone to bash escapes             replacement_text="...")`                        │
│                                                 ==> Precise AST-aligned hunk application         │
│                                                                                                  │
│   `grep -rn "pattern" .` (Dump 500 lines)──►    `search_dir(pattern, max_results=10)`            │
│   ==> Massive context pollution                 ==> Compact file:line summary                    │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **`open_file(file_path: str, line_number: int = 1, window: int = 100)`:**  
   Renders a bounded view window centered at `line_number` with explicit line number prefixes, preventing large source files from exceeding LLM context boundaries.
2. **`scroll_up(file_path: str, lines: int = 100)` & `scroll_down(file_path: str, lines: int = 100)`:**  
   Paginates through active buffers while maintaining track of current viewport state in the agent's scratchpad memory.
3. **`edit_lines(file_path: str, start_line: int, end_line: int, replacement: str)`:**  
   Surgically replaces a slice of lines, returning an immediate 10-line post-modification context snippet and running a background syntax check.
4. **`search_dir(query: str, path: str = ".", max_results: int = 20)`:**  
   Token-capped regex search returning structured, compact matches (`file:line:preview`), avoiding runaway terminal dumps.

---

## 3. Execution Isolation Architecture

### 3.1 Hardened Dockerfile Base (`xerova/devforce-sandbox`)
Sandbox containers run an engineered Ubuntu 24.04 LTS minimal base image configured for secure multi-language development:

```dockerfile
FROM ubuntu:24.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install essential build toolchains and runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    xvfb \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install modern package managers
RUN npm install -g pnpm vite
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Create non-root unprivileged execution user
RUN groupadd -g 1000 devforce && \
    useradd -u 1000 -g devforce -m -s /bin/bash devforce

# Set up clean workspace mount point
RUN mkdir -p /workspace && chown -R devforce:devforce /workspace

WORKDIR /workspace
USER devforce
```

### 3.2 Container Isolation Guardrails

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DOCKER CONTAINER ISOLATION BOUNDARY                               │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [HOST ENVIRONMENT]                                                                              │
│  - Host IP & System Daemons (Protected)                                                          │
│  - /var/run/docker.sock (NEVER MOUNTED)                                                          │
│                                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════════════════════  │
│  [CONTAINER SANDBOX] (ID: dforce-sbx-987f6543)                                                   │
│                                                                                                  │
│  ├─ User: devforce (UID: 1000, GID: 1000)                                                        │
│  ├─ Security Opts: `no-new-privileges:true`, `cap-drop: ALL`, `cap-add: SETUID, SETGID`          │
│  ├─ Mounts:                                                                                      │
│  │   ├── Target Repo: `/workspace` (rw, nosuid, nodev)                                           │
│  │   ├── System Root: `/` (read-only root overlay)                                               │
│  │   └── Ephemeral Tmp: `/tmp` (tmpfs, size=512M, noexec)                                        │
│  ├─ Resource Constraints (cgroups v2):                                                           │
│  │   ├── CPU Quota: 2.0 cores (`NanoCPUs: 2000000000`)                                           │
│  │   ├── Memory Limit: 4096 MB (`Memory: 4294967296`, `MemorySwap: 1073741824`)                 │
│  │   └── Process Limit: 512 PIDs (`PidsLimit: 512`)                                              │
│  └─ Network Policy:                                                                              │
│      ├── Ingress: DENY ALL                                                                       │
│      └── Egress: RESTRICTED BRIDGE (Egress allowed only to npmjs, pypi.org, github.com)          │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Git & GitHub Integration Architecture

### 4.1 Git Worktree Isolation & Concurrency Strategy
A critical vulnerability in multi-agent execution arises when concurrent tasks attempt to modify the same repository working directory simultaneously. Standard `git checkout` switches the active working branch across all processes sharing that path, causing catastrophic file collisions and race conditions.

To achieve true zero-collision concurrency across parallel tasks (`max_parallel_tasks > 1`), DEVFORCE mandates **Git Worktree Isolation**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                GIT WORKTREE ISOLATION TOPOLOGY                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [Central Bare/Primary Repo] (/var/devforce/repos/{project_id}/primary.git)
                 │
                 ├──► Provision Worktree A ──► `/var/devforce/worktrees/{task_1}`
                 │                             └── Bind-Mounted to Container 1: `/workspace`
                 │                                 (Branch: `devforce/task-1`)
                 │
                 └──► Provision Worktree B ──► `/var/devforce/worktrees/{task_2}`
                                               └── Bind-Mounted to Container 2: `/workspace`
                                                   (Branch: `devforce/task-2`)
```

1. **Dedicated Worktree Provisioning:** Prior to launching a sandbox container for a task, the backend Git Manager provisions an isolated worktree linked to the primary repository:
   ```bash
   git -C /var/devforce/repos/{project_id} worktree add \
       -b devforce/task-{task_id} \
       /var/devforce/worktrees/{task_id} \
       devforce/work
   ```
2. **Container Bind-Mount:** Only `/var/devforce/worktrees/{task_id}` is bind-mounted to the container's `/workspace` mount point. Containers cannot see or mutate sibling worktrees or the primary `.git` administrative root.
3. **Atomic Conventional Commits:** Changes within the container are authored incrementally using conventional commits with explicit task and agent persona scoping:
   ```bash
   git config user.name "Xerova Devforce (StaffEngineerAgent)"
   git config user.email "agents+staff-engineer@xerova.dev"
   git commit -m "feat(auth): implement jwt token generation service [devforce-task-{task_id}]"
   ```
4. **Integration Queue & Merge Conflict Resolution:**
   - When a task completes and passes empirical verification, its branch is submitted to the **Git Integration Queue**.
   - The integration worker attempts a fast-forward or squash merge into the project working branch (`devforce/work`).
   - **Automated Conflict Resolution via Self-Correction:** If git reports a merge conflict, the task is NOT aborted. Instead, the task transitions to the `SELF_CORRECTION` state (sub-state: `MERGE_CONFLICT_RESOLUTION`). The worktree is updated with conflict markers, and the `StaffEngineerAgent` is supplied with the conflicting hunks and instructions to reconcile the conflicting edits, re-run verification tests, and re-commit.
5. **Worktree Lifecycle Teardown:** Once integrated and verified, the worktree is cleanly removed and pruned:
   ```bash
   git -C /var/devforce/repos/{project_id} worktree remove --force /var/devforce/worktrees/{task_id}
   git -C /var/devforce/repos/{project_id} worktree prune
   ```

### 4.2 GitHub API Automation
- **Automated Pull Request Generation:** When all tasks in a Plan are verified, the `DevOpsEngineerAgent` opens a GitHub Pull Request via the GitHub API (PyGithub / Octokit).
- **PR Description Template:** The PR description is automatically populated with:
  - Executive Goal Summary.
  - Linked User Stories and PRD acceptance criteria.
  - Full Test Execution Results (Pytest / Vitest / Playwright output).
  - List of affected files and dependency updates.
- **Status Checks:** DEVFORCE registers GitHub status checks (`xerova/devforce-verification`), ensuring PRs cannot be merged until human approval is finalized.

---

## 5. Empirical Evidence Collection & Verification Engine

DEVFORCE rejects the notion of "assumed completion." A task is marked `COMPLETED` if and only if empirical execution evidence passes automated evaluation.

```
                               ┌───────────────────────────┐
                               │   AGENT DECLARES READY    │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │  DISPATCH TEST HARNESS    │
                               │  (Pytest/Vitest/Playwright│
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ CAPTURE EMPIRICAL OUTPUT  │
                               │ - raw_stdout / raw_stderr │
                               │ - process exit code       │
                               │ - unified git diff patch  │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │   CRYPTOGRAPHIC HASHING   │
                               │ SHA-256(canonical JSON)   │
                               └─────────────┬─────────────┘
                                             │
                         ┌───────────────────┴───────────────────┐
                         │                                       │
                         ▼                                       ▼
             [Exit Code == 0 AND                     [Exit Code != 0 OR
              Tests Passed > 0 AND                    Tests Failed > 0 OR
              Tests Failed == 0]                      Empty Diff]
                         │                                       │
                         ▼                                       ▼
             ┌───────────────────────┐               ┌───────────────────────┐
             │  EVIDENCE VERIFIED    │               │  EVIDENCE REJECTED    │
             │ - Persist to DB       │               │ - Trigger retry loop  │
             │ - Mark task COMPLETED │               │ - Provide traceback   │
             └───────────────────────┘               └───────────────────────┘
```

### 5.1 Test Harness Integrations

#### 1. Pytest Integration (Python Backend)
```bash
pytest tests/ -v --tb=short --junitxml=/tmp/pytest_report.xml
```
- The validator parses the JUnit XML output to extract exact counts for `tests_total`, `tests_passed`, `tests_failed`, and `tests_skipped`.

#### 2. Vitest Integration (React Frontend)
```bash
vitest run --reporter=json --outputFile=/tmp/vitest_report.json
```
- Validates component render tests, hook tests, and state transitions.

#### 3. Playwright Integration (End-to-End Tests)
```bash
xvfb-run -a playwright test --reporter=json
```
- Dispatches headless Chromium/Firefox browsers within the sandbox using `xvfb-run` to verify full user workflows end-to-end.

### 5.2 Cryptographic Evidence Signing
To guarantee that verification evidence was not altered or synthesized, DEVFORCE computes a deterministic SHA-256 digest over the canonical JSON serialization of the verification payload:

$$\text{verification\_hash} = \text{SHA256}(\text{CanonicalJSON}(\mathbf{E}))$$

Where the evidence tuple $\mathbf{E}$ contains:
```json
{
  "exit_code": 0,
  "git_diff_patch": "diff --git a/app/auth.py...",
  "raw_stderr": "",
  "raw_stdout": "PASSED tests/test_auth.py::test_login\n...",
  "test_framework": "pytest",
  "tests_failed": 0,
  "tests_passed": 12,
  "tests_skipped": 0,
  "tests_total": 12
}
```

**Canonicalization Rules:**
1. Keys are sorted lexicographically in ascending order.
2. UTF-8 encoded with no superfluous whitespace or indentations (`separators=(',', ':')`).
3. This cryptographic hash is persisted into `execution_evidences.verification_hash` and stamped into the commit metadata and GitHub PR check run.
