# XEROVA AI DEVFORCE — Agent Architecture Document
**System Name:** XEROVA AI DEVFORCE  
**Document Code:** XAD-ARCH-AGT-003  
**Version:** 1.0.0  
**Phase:** 0B — Complete System Architecture Design  
**Author:** Principal Software Architect & AI Agent Systems Engineer  
**Date:** March 2026  
**Status:** Approved for Implementation  

---

## 1. Agent Architecture Philosophy & Core Mandates

The agentic core of **XEROVA AI DEVFORCE** is modeled after high-performing software engineering teams. Rather than relying on a single, overburdened "super-agent" that attempts to simultaneously design, code, test, and manage its own work, DEVFORCE enforces **Role-Specialized Decomposition**, **Explicit State Handoffs**, and **Empirical Validation**.

### 1.1 Architectural Mandates
1. **Modular Agent Personas:** Each agent operates under a focused persona with dedicated system prompts, distinct capability whitelists, tailored temperature parameters, and strict behavioral boundaries.
2. **Empirical Evidence Over Narrative Assurance:** An agent cannot declare a task complete merely by claiming "I implemented the feature and tests pass." Completion requires cryptographically verified shell execution logs, zero non-zero exit codes, passing test runners, and clean git diffs.
3. **No Fabricated Agent Activity:** Every token, thought, tool call, and terminal response rendered in the system originates from live LLM inference and actual sandbox runtime execution. DEVFORCE strictly outlaws mock progress delays and synthetic loading animations.
4. **Architectural Memory Alignment:** Agents do not begin coding in a vacuum; they must inspect project guidelines, existing Architecture Decision Records (ADRs), and relevant code embeddings before generating code.

---

## 2. Agent Personas & Organizational Roster

DEVFORCE standardizes seven specialized agent roles spanning the entire software development lifecycle (SDLC):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DEVFORCE AGENT ROSTER                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ProductManagerAgent]
     │ (PRD, User Stories, Acceptance Criteria)
     ▼
   [SystemArchitectAgent]
     │ (System Design, Component Specs, Schema Definitions, ADRs)
     ▼
   [ProjectManagerAgent]
     │ (Task Breakdown, Dependency DAG, Priority & Blast-Radius Scoring)
     ▼
   ┌────────────────────────────────────────────────────────┐
   │                  EXECUTION SQUAD                       │
   │                                                        │
   │  [StaffEngineerAgent]     [QAEngineerAgent]            │
   │  - Writes Code            - Generates & Executes Tests │
   │  - Edits Files            - Evaluates Real Evidence    │
   │  - Shell in Container     - Regressions & Invariants   │
   │           │                           │                │
   │           └─────────────┬─────────────┘                │
   │                         ▼                              │
   │             [SecurityEngineerAgent]                    │
   │             - SAST, Dependency Risk, Secret Audit      │
   └─────────────────────────┬──────────────────────────────┘
                             │
                             ▼
                    [DevOpsEngineerAgent]
                    - Git Branching, Atomic Commits, PR Packaging
```

### 2.1 Detailed Persona Specifications

#### 1. `ProductManagerAgent`
- **Primary Mission:** Ingest user objectives; resolve ambiguities; formulate detailed Product Requirement Documents (PRDs), user stories, edge cases, and deterministic acceptance criteria.
- **Tools Whitelist:** `memory_search`, `read_file`, `web_search` (documentation lookup).
- **Output Artifacts:** `PRD.md`, Acceptance Criteria JSON schema.

#### 2. `SystemArchitectAgent`
- **Primary Mission:** Formulate high-level component diagrams, database schemas, REST/WebSocket API contracts, and technology selections. Ensures alignment with existing project architecture.
- **Tools Whitelist:** `memory_search`, `read_file`, `list_directory`, `adr_recorder`.
- **Output Artifacts:** `SYSTEM_DESIGN.md`, `API_SPEC.yaml`, `ADR-xxxx.md`.

#### 3. `ProjectManagerAgent`
- **Primary Mission:** Ingest the PRD and Architectural Blueprint; synthesize an executable, dependency-aware Task Graph (DAG). Assigns tasks to engineering personas, assigns priority levels, and calculates initial blast-radius scores.
- **Tools Whitelist:** `dag_builder`, `cycle_detector`, `task_estimator`.
- **Output Artifacts:** Validated Task DAG persisted into the `tasks` and `task_dependencies` database tables.

#### 4. `StaffEngineerAgent`
- **Primary Mission:** Autonomous, surgical code implementation within isolated Docker sandbox workspaces mapped to dedicated Git worktrees. Inspects existing codebase patterns, edits files, executes compilers, linters, and incremental build checks. Possesses automated merge-conflict resolution capabilities when reconciling branch changes.
- **Tools Whitelist:** `terminal_exec`, `file_editor`, `ast_grep`, `git_diff`, `read_file`.
- **Output Artifacts:** Working branch source code modifications, unified git diff patches, conventional commits.

#### 5. `QAEngineerAgent`
- **Primary Mission:** Authors unit tests, integration tests, and Playwright end-to-end tests based on acceptance criteria. Dispatches test runners inside the sandbox, captures real stdout/stderr and exit codes, and evaluates verification evidence.
- **Tools Whitelist:** `terminal_exec`, `test_runner` (Pytest/Vitest/Playwright), `file_editor`, `evidence_validator`.
- **Output Artifacts:** `test_*.py` / `*.spec.ts` test suites, `ExecutionEvidence` database record.

#### 6. `SecurityEngineerAgent`
- **Primary Mission:** Audits proposed git diffs for introduced vulnerabilities (SQL injection, XSS, unescaped shell commands), supply-chain risks in newly introduced package dependencies, and accidental credential leakage.
- **Tools Whitelist:** `sast_scanner`, `dependency_auditor`, `secret_leak_detector`.
- **Output Artifacts:** Security audit verdict (`PASSED` | `FLAGGED_FOR_HUMAN_REVIEW`).

#### 7. `DevOpsEngineerAgent`
- **Primary Mission:** Manages git operations and release lifecycle: orchestrates isolated Git worktrees (`devforce/task-{id}`), manages branch integration queues, authors clear conventional commit messages, ensures clean fast-forward/squash merges, and pushes PRs to remote GitHub repositories upon human approval.
- **Tools Whitelist:** `git_commit`, `git_push`, `github_pr_creator`, `docker_build`.
- **Output Artifacts:** Remote GitHub Pull Request with detailed description linking PRD and empirical test evidence.

---

## 3. OpenAI Agents SDK & Provider-Independent AI Abstraction

DEVFORCE is architected to leverage the core multi-agent patterns popularized by the **OpenAI Agents SDK** (Agents, Runners, Hand-offs, Guardrails, Function Calling) while preserving absolute provider independence.

### 3.1 Architecture Overview
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AI PROVIDER ABSTRACTION LAYER                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [Agent Execution Layer]
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │                   IAIProvider Interface                │
   │  - complete(prompt, options)                           │
   │  - stream(prompt, options)                             │
   │  - generate_structured(prompt, schema, options)        │
   └──────────┬──────────────────────────────────┬──────────┘
              │                                  │
              ▼                                  ▼
   ┌──────────────────────┐           ┌─────────────────────────────────────┐
   │   Native OpenAI API  │           │   LiteLLM Universal Proxy Router    │
   │   - gpt-4o           │           │   - Claude 3.7 Sonnet (Anthropic)   │
   │   - o1 / o3-mini     │           │   - Gemini 2.0 Flash (Google)       │
   │   - Structured Output│           │   - Local Ollama / vLLM (Open-Source│
   └──────────────────────┘           └─────────────────────────────────────┘
```

### 3.2 Concrete Python Provider Contract (`IAIProvider`)

```python
from typing import AsyncGenerator, Protocol, Type, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T", bound=BaseModel)

class CompletionOptions(BaseModel):
    model: str = "gpt-4o"
    temperature: float = 0.2
    max_tokens: int = 4096
    top_p: float = 1.0
    timeout_seconds: float = 60.0
    stop_sequences: list[str] = Field(default_factory=list)
    seed: int | None = 42

class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float

class CompletionResult(BaseModel):
    content: str
    usage: TokenUsage
    finish_reason: str

class IAIProvider(Protocol):
    """Universal interface for LLM inference across all providers."""

    async def complete(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        options: CompletionOptions
    ) -> CompletionResult: ...

    async def stream(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        options: CompletionOptions
    ) -> AsyncGenerator[str, None]: ...

    async def generate_structured(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        response_model: Type[T], 
        options: CompletionOptions
    ) -> T: ...
```

### 3.3 Dynamic Multi-Provider Routing & Resiliency
- **Automatic Fallbacks:** If the primary model (e.g. `gpt-4o`) experiences rate-limiting (HTTP 429) or downtime (HTTP 503), the engine automatically falls back to secondary configurations (e.g. `claude-3-7-sonnet` via LiteLLM) without interrupting the workflow.
- **Structured Outputs via JSON Schema:** All planning, task synthesis, and evidence evaluation steps enforce native JSON Schema validation (`response_format={"type": "json_object"}` or OpenAI Structured Outputs) to ensure deterministic parsing by Pydantic v2.

---

## 4. Agent State Machine & Execution Lifecycle

Every active agent instance runs on an event-driven finite state machine (FSM).

```
               ┌────────────────────────┐
               │      INITIALIZING      │
               └───────────┬────────────┘
                           │ Task assigned
                           ▼
               ┌────────────────────────┐
               │   ANALYZING_CONTEXT    │ (Query Vector Memory & ADRs)
               └───────────┬────────────┘
                           │
                           ▼
               ┌────────────────────────┐
               │    FORMULATING_PLAN    │ (Reasoning turn)
               └───────────┬────────────┘
                           │ Tool call required
                           ▼
               ┌────────────────────────┐
    ┌─────────►│     EXECUTING_TOOL     │ (Command sent to sandbox)
    │          └───────────┬────────────┘
    │                      │ Sandbox return
    │                      ▼
    │          ┌────────────────────────┐
    │          │    EVALUATING_OUTPUT   │ (Inspect exit code & stdout)
    │          └───────────┬────────────┘
    │                      │
    │         ┌────────────┴────────────┐
    │         │ More tools needed       │ Task objective complete
    └─────────┘                         ▼
                               ┌────────────────────────┐
                               │   AWAITING_VERIFY      │ (QA test execution)
                               └───────────┬────────────┘
                                           │
                           ┌───────────────┴───────────────┐
                           │ [Verification Succeeded]      │ [Verification Failed]
                           ▼                               ▼
               ┌────────────────────────┐      ┌────────────────────────┐
               │   AWAITING_APPROVAL    │      │    SELF_CORRECTION     │
               │ (If high blast-radius) │      │  (Retry up to 3 times) │
               └───────────┬────────────┘      └───────────┬────────────┘
                           │                               │
                           │ [Approved]                    │ [Exhausted]
                           ▼                               ▼
               ┌────────────────────────┐      ┌────────────────────────┐
               │       COMPLETED        │      │    BLOCKED / FAILED    │
               └────────────────────────┘      └────────────────────────┘
```

---

## 5. Multi-Tier Project Memory Architecture

Autonomous software engineering requires distinct memory tiers to balance fast responsiveness, deep semantic code awareness, and institutional rule enforcement.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     PROJECT MEMORY SUBSYSTEM                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [TIER 1: WORKING CONTEXT]          [TIER 2: SEMANTIC CODE INDEX]       [TIER 3: DURABLE ADRs]  │
│   - Transient in-memory state        - pgvector embeddings               - PostgreSQL relational │
│   - Token-aware sliding window       - AST-parsed chunking               - Explicit design rules │
│   - Context Condensation engine      - Tree-sitter symbol indexing       - Architectural guard-  │
│   - Real-time tool outputs           - Cosine similarity HNSW queries      rails & conventions   │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Tier 1: Working Memory & Context Condensation
- **The Context Window Problem:** Long tool-execution logs, verbose compiler messages, and test outputs quickly exceed the effective reasoning capacity of modern LLMs.
- **Condensation Algorithm:** DEVFORCE implements an active condensation engine. When conversation token length exceeds 65% of the model's context window:
  1. Historical tool outputs that did not alter workspace state are pruned.
  2. Sequential file edits are squashed into an updated cumulative git diff.
  3. Intermediate reasoning steps are summarized into an immutable `ContextSnapshot`.

### 5.2 Tier 2: Repository Semantic Index (`pgvector`)
- **AST-Aware Chunking:** Files are parsed using `tree-sitter` to respect semantic boundaries (classes, functions, interfaces) rather than naive character slicing.
- **Embedding Pipeline:** Chunks are embedded using `text-embedding-3-small` (1536 dimensions) and indexed using an HNSW index in PostgreSQL.
- **Hybrid Retrieval:** Agent code exploration combines semantic vector similarity with exact symbol matching (e.g. `symbol_name = "UserService"`).

### 5.3 Tier 3: Institutional Architecture Memory & ADRs
- Persistent Architectural Decision Records (ADRs) define strict project mandates (e.g., "All endpoints must use Pydantic v2 schemas; ORM queries must use SQLAlchemy 2.0 select syntax; Direct raw SQL is forbidden").
- During the `ANALYZING_CONTEXT` phase, the agent is supplied with active ADR summaries as non-negotiable system constraints.

---

## 6. Agent Collaboration, Delegation & Structured Handoffs

DEVFORCE utilizes structured handoffs between specialized personas to ensure clean separation of concerns:

### 6.1 Handoff Contract Schema
```python
class AgentHandoffPackage(BaseModel):
    source_role: str
    target_role: str
    task_id: str
    objective: str
    context_summary: str
    produced_artifact_paths: list[str]
    verification_criteria: list[str]
    notes_and_caveats: str
```

### 6.2 Supervision & Escalation Protocol
- **Test Failure Self-Correction:** When a task fails verification (e.g. Pytest returns exit code 1), the orchestrator automatically re-engages the `StaffEngineerAgent` with the raw test failure traceback and failing test assertions.
- **Merge Conflict Self-Correction:** When an integrated branch encounters git merge conflicts against concurrent changes landed on `devforce/work`, the orchestrator re-dispatches the `StaffEngineerAgent` with git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). The agent inspects both sets of changes, produces a unified resolution, verifies that tests continue to pass, and commits the resolved merge.
- **Max Retries Threshold:** If an agent fails to resolve test failures or merge conflicts within three iterations, the task transitions to `BLOCKED`, and the orchestrator escalates the issue to a human developer with a full incident report.

---

## 7. Tool Definitions & Function Calling Architecture

Agents interact with the world strictly through typed, registered tools. Tools are exposed to LLMs via standardized JSON Schemas and executed against the isolated container sandbox.

### 7.1 Core Tool Suite
1. **`BashExecutionTool`:**
   - *Parameters:* `command: str`, `timeout_seconds: int = 60`, `working_directory: str = "/workspace"`.
   - *Behavior:* Dispatches command inside Docker container against the mounted git worktree; returns exact exit code, stdout, and stderr.
2. **`FileEditorTool`:**
   - *Parameters:* `file_path: str`, `operation: "create" | "view" | "str_replace" | "insert"`, `content: str`, `target_string: str | None`.
   - *Behavior:* Modifies files strictly within `/workspace`; rejects path traversal attempts (`../`) and enforces absolute path confinement.
3. **`TestRunnerTool`:**
   - *Parameters:* `framework: "pytest" | "vitest" | "playwright"`, `test_path: str | None`.
   - *Behavior:* Runs test suite inside container; captures XML/JSON test reports and exit codes for empirical verification.
4. **`GitTool`:**
   - *Parameters:* `action: "status" | "diff" | "commit" | "branch" | "resolve_conflict"`, `commit_message: str | None`.
   - *Behavior:* Performs version control operations inside the sandbox repository worktree.
5. **`MemorySearchTool`:**
   - *Parameters:* `query: str`, `top_k: int = 5`, `filter_symbol: str | None`.
   - *Behavior:* Executes HNSW vector query against `code_memory_chunks` table and returns matched code snippets.

### 7.2 Model Context Protocol (MCP) Client Integration
For external extensibility, DEVFORCE integrates a native MCP client powered by `fastmcp`. This allows custom enterprise tool servers (e.g., internal issue trackers, cloud API clients) to be mounted dynamically into the agent toolset without modifying core DEVFORCE codebase.

