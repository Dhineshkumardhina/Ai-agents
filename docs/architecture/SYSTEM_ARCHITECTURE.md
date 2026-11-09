# XEROVA AI DEVFORCE — System Architecture Document
**System Name:** XEROVA AI DEVFORCE  
**Document Code:** XAD-ARCH-SYS-001  
**Version:** 1.0.0  
**Phase:** 0B — Complete System Architecture Design  
**Author:** Principal Software Architect & AI Agent Systems Engineer  
**Date:** March 2026  
**Status:** Approved for Implementation  

---

## 1. Executive Overview & Architectural Principles

### 1.1 Executive Overview
**XEROVA AI DEVFORCE** is an autonomous, enterprise-grade multi-agent software engineering workforce platform. DEVFORCE models an elite engineering department consisting of specialized AI agents—ranging from Product Managers and Lead Architects to Full-Stack Engineers, QA Automation Specialists, and DevOps Engineers. 

DEVFORCE is architected as an **independent, self-hosted, modular software system** capable of planning, decomposing, implementing, testing, verifying, and delivering production-ready software across multi-repository workspaces. It bridges high-level human product objectives with isolated, sandboxed execution runtimes, backing every line of written code with empirical test and execution evidence.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     XEROVA AI DEVFORCE CORE                                     │
│                                                                                                  │
│   Human Objective ──► [Master Orchestrator] ──► [Task Scheduler (DAG)] ──► [Specialized Agents]   │
│                                │                              │                     │            │
│                                ▼                              ▼                     ▼            │
│                       [Approval Engine]             [Event Stream (Pub/Sub)]  [Runtime Adapters] │
│                                │                              │                     │            │
│                                ▼                              ▼                     ▼            │
│                       [Governance Audit]             [Real-Time UI Feed]     [Docker Sandboxes]  │
│                                                                                     │            │
│                                                                                     ▼            │
│                                                                           [Real Execution Output]│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Architectural Principles

1. **Independent Application Sovereignty:** DEVFORCE operates as a self-contained platform with zero mandatory dependencies on proprietary closed orchestrators or vendor-locked SaaS agent portals. All state, memory, databases, and logs remain under user-controlled infrastructure.
2. **Modular & Loosely Coupled Architecture:** Subsystems (frontend, API gateway, task scheduler, agent runtime, execution environments, memory, and database) communicate strictly over well-defined, versioned programmatic contracts (Pydantic models, JSON-RPC, REST, and WebSocket streams).
3. **Replaceable External Integrations:** AI model providers, execution sandboxes, version control providers, and issue trackers are abstracted behind stable interface boundaries (`IModelProvider`, `IRuntimeAdapter`, `IVCSProvider`).
4. **Zero Hardcoded Secrets & Dynamic Credential Scoping:** Secrets are encrypted at rest using AES-256-GCM envelope encryption, injected only into ephemeral container environments at execution time, and scrubbed from all streams.
5. **No Unrestricted Host Execution:** Agent-generated commands never execute directly on the host operating system. All execution takes place within disposable, resource-constrained, network-firewalled Docker containers or OS-level kernel sandboxes.
6. **Human Approval for Sensitive Operations:** Operations carrying significant blast radius (git pushes to protected branches, destructive database migrations, external network requests, infrastructure provisioning) require explicit cryptographic human sign-off.
7. **Empirical Execution Evidence (Zero Fabricated Agent Activity):** Agent progress is validated solely through real shell return codes, deterministic test runners (Pytest, Vitest, Playwright), git diffs, and lint outputs. DEVFORCE explicitly forbids simulated progress bars, placeholder mock logs, or synthetic success states.

---

## 2. Technology Stack Architecture

| Layer | Selected Technologies | Architectural Role & Justification |
| :--- | :--- | :--- |
| **Frontend UI** | **React 19, TypeScript 5.8+, Vite 6, Tailwind CSS v4** | High-performance single-page application (SPA). Fast HMR, type-safe event parsing, responsive layout for complex agent status graphs, streaming logs, and approval consoles. |
| **Backend API** | **Python 3.12+, FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0 (Asyncio)** | High-throughput async ASGI backend. Fast native validation with Pydantic v2, asynchronous ORM queries via `asyncpg`, native WebSocket streaming for real-time agent output. |
| **Database** | **PostgreSQL 16+, `pgvector`, Alembic** | ACID-compliant relational core for organizational hierarchies, tasks, and audit trails. `pgvector` enables native vector similarity search for repository memory without auxiliary vector databases. |
| **Agent Orchestration** | **OpenAI Agents SDK / Agent Patterns, Custom Async Event Bus, NetworkX (DAG)** | Deterministic task breakdown, dynamic dependency resolution, agent role handoffs, and event-sourced state transitions. |
| **Model Abstraction** | **OpenAI API, LiteLLM Universal Proxy** | Unified, provider-agnostic interface supporting OpenAI (o1, o3-mini, GPT-4o), Anthropic (Claude 3.7 Sonnet), Google (Gemini 2.0 Flash), and local OSS models (Ollama/vLLM). |
| **Coding Runtime** | **OpenHands SDK, OpenAI Codex Adapter, Cline Adapter** | Pluggable runtime execution adapters capable of executing tool loops, terminal sessions, and workspace file editing across different runtime paradigms. |
| **Execution Sandboxes** | **Docker Engine SDK (Python), Rootless Docker, Linux Namespaces** | Strictly isolated, disposable container workspaces. Resource capping (cgroups v2), network ingress/egress policies, non-root user execution (`uid 1000`). |
| **Quality & Verification** | **Pytest (Backend), Vitest (Frontend), Playwright (End-to-End)** | Automated verification engine executing real tests in sandboxes to produce empirical verification evidence prior to task completion. |

---

## 3. High-Level System Architecture & Component Interactions

```
                                    ┌────────────────────────┐
                                    │      WEB BROWSER       │
                                    │   React + TypeScript   │
                                    └───────────┬────────────┘
                                                │ HTTPS / WSS
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FASTAPI BACKEND GATEWAY                                       │
│                                                                                                  │
│   ┌────────────────────┐   ┌───────────────────────────┐   ┌────────────────────────────────┐   │
│   │ REST API Endpoints │   │ WebSocket Stream Manager  │   │ Auth & Policy Middleware (JWT) │   │
│   │ /api/v1/projects   │   │ /ws/projects/{id}/events  │   │ Role-Based Access Control      │   │
│   │ /api/v1/tasks      │   │ Real-time terminal/diffs  │   │ Secret Redaction Engine        │   │
│   └─────────┬──────────┘   └─────────────┬─────────────┘   └───────────────┬────────────────┘   │
└─────────────┼────────────────────────────┼─────────────────────────────────┼────────────────────┘
              │                            │                                 │
              ▼                            ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     CORE ORCHESTRATION PLANE                                     │
│                                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                   MASTER ORCHESTRATOR                                    │   │
│   │ - Objective Decomposition          - Agent Lifecycle Management                          │   │
│   │ - Multi-Agent State Machine        - Dynamic Agent Delegation & Handoffs                 │   │
│   └──────────────────────────────┬───────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│         ┌────────────────────────┴────────────────────────┐                                      │
│         ▼                                                 ▼                                      │
│   ┌───────────────────────────┐                     ┌───────────────────────────┐                │
│   │    TASK SCHEDULER (DAG)   │                     │      APPROVAL ENGINE      │                │
│   │ - Dependency Graph        │◄────────────────────┤ - Blast-Radius Calculator │                │
│   │ - Topological Sorter      │  (Gate Resumption)  │ - Interactive Prompts     │                │
│   │ - Priority Queue Dispatch │                     │ - Cryptographic Audit Log │                │
│   └─────────────┬─────────────┘                     └───────────────────────────┘                │
│                 │                                                                                │
│                 ▼                                                                                │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                    INTERNAL EVENT BUS                                    │   │
│   │ Topics: `task.*`, `agent.*`, `execution.*`, `approval.*`, `memory.*`, `metrics.*`        │   │
│   └─────────────┬────────────────────────────────────────────────────────────┬───────────────┘   │
└─────────────────┼────────────────────────────────────────────────────────────┼───────────────────┘
                  │                                                            │
                  ▼                                                            ▼
┌───────────────────────────────────┐                        ┌─────────────────────────────────────┐
│       AGENT POOL (SPECIALIZED)    │                        │          PERSISTENCE LAYER          │
│                                   │                        │                                     │
│  - ProductManagerAgent (PRD/Specs)│                        │  ┌───────────────────────────────┐  │
│  - SystemArchitectAgent (Design)  │                        │  │ PostgreSQL 16 + pgvector      │  │
│  - ProjectManagerAgent (DAG Plan) │                        │  │ - Projects & Workspace Config │  │
│  - StaffEngineerAgent (Coding)    │                        │  │ - Task State & Dependencies   │  │
│  - QAEngineerAgent (Test/Verify)  │                        │  │ - Agent Event Logs & Traces   │  │
│  - SecurityAgent (Vulnerability)  │                        │  │ - Vector Memory (Embeddings)  │  │
│  - DevOpsAgent (CI/CD, Release)   │                        │  │ - Immutable Audit Trail       │  │
│                                   │                        │  └───────────────────────────────┘  │
└─────────────────┬─────────────────┘                        └─────────────────────────────────────┘
                  │ Dispatches Commands
                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     EXECUTION RUNTIME LAYER                                      │
│                                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                             UNIFIED RUNTIME ADAPTER INTERFACE                            │   │
│   │                             (`IRuntimeAdapter` Contract)                                 │   │
│   └───────────────┬──────────────────────────┬─────────────────────────────┬─────────────────┘   │
│                   │                          │                             │                     │
│                   ▼                          ▼                             ▼                     │
│        ┌─────────────────────┐    ┌─────────────────────┐       ┌────────────────────┐           │
│        │ OpenHands SDK       │    │ OpenAI Codex        │       │ Cline Adapter      │           │
│        │ Adapter             │    │ Adapter             │       │ (TS/Bun Headless)  │           │
│        └──────────┬──────────┘    └──────────┬──────────┘       └──────────┬─────────┘           │
│                   │                          │                             │                     │
│                   └──────────────────────────┼─────────────────────────────┘                     │
│                                              ▼                                                   │
│                                 [WORKSPACE ISOLATION MANAGER]                                    │
│                                              │                                                   │
│                        ┌─────────────────────┴─────────────────────┐                             │
│                        ▼                                           ▼                             │
│        ┌───────────────────────────────┐           ┌───────────────────────────────┐             │
│        │   Docker Sandbox Container 1  │           │   Docker Sandbox Container N  │             │
│        │ - Ephemeral bind mounts       │           │ - Network Isolated            │             │
│        │ - Non-root execution          │           │ - Resource constrained (2C/4G)│             │
│        │ - Real Bash / Git / Linters   │           │ - Live output capture         │             │
│        └───────────────────────────────┘           └───────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend Architecture

### 4.1 Overview & Tech Stack
The DEVFORCE frontend is constructed with **React 19**, **TypeScript 5.8+**, **Vite 6**, and **Tailwind CSS v4**. It is engineered specifically for mission-control visibility, low latency, and zero artificial delays.

- **Vite 6:** Sub-second cold startup, ES-module native development, and optimized code-splitting.
- **Zustand & TanStack Query v5:** Zustand manages transient real-time state (streaming logs, terminal buffers, active websocket connections), while TanStack Query manages asynchronous server state caching, pagination, and invalidation.
- **Tailwind CSS v4:** Hardware-accelerated styling with dynamic theme variables and high-density information displays.
- **Lucide Icons & @xyflow/react (React Flow):** Visual rendering of the task dependency DAG and multi-agent interaction graph.

### 4.2 Component Architecture & Tree

```
src/
├── app/
│   ├── routes.tsx                   # Route definitions (React Router v7)
│   ├── App.tsx                      # Root provider wrapper (Auth, QueryClient, Theme)
│   └── main.tsx                     # React DOM entrypoint
├── components/
│   ├── common/                      # Reusable UI primitives (Button, Modal, Input, Badge)
│   ├── layout/                      # Navigation, Sidebar, WorkspaceHeader, StatusBar
│   ├── graph/                       # Interactive DAG visualization (React Flow)
│   │   ├── TaskDagGraph.tsx         # Node-edge renderer for dependency trees
│   │   ├── TaskNode.tsx             # Custom node with status indicators & progress
│   │   └── AgentBadgeNode.tsx       # Live active agent assignment overlay
│   ├── execution/                   # Real-time execution monitors
│   │   ├── TerminalConsole.tsx      # Xterm.js ANSI terminal feed from Docker sandbox
│   │   ├── DiffViewer.tsx           # Side-by-side / inline syntax-highlighted git diffs
│   │   ├── ExecutionEvidence.tsx    # Empirical verification logs, test runs, exit codes
│   │   └── ToolInvocationFeed.tsx   # Discrete tool calls and structured outputs
│   ├── governance/                  # Human-in-the-loop controls
│   │   ├── ApprovalModal.tsx        # High-impact operation prompt with blast-radius summary
│   │   ├── PolicyAuditList.tsx      # Immutable record of decisions and approvals
│   │   └── SecretConfigModal.tsx    # Secure environment variable inputs
│   └── memory/                      # Project memory viewer
│       ├── ArchitectureDecisions.tsx# Rendered Architecture Decision Records (ADRs)
│       └── VectorSearchWidget.tsx   # Real-time semantic query test utility
├── hooks/
│   ├── useWebSocketStream.ts        # Typed WebSocket hook with exponential reconnect
│   ├── useTaskDag.ts                # Real-time task graph synchronization
│   ├── useTerminalStream.ts         # Direct terminal buffer accumulator
│   └── useApprovalGate.ts           # Approval request listener and responder
├── stores/
│   ├── useWorkspaceStore.ts         # Active project, workspace configs, selected repo
│   ├── useExecutionStore.ts         # Active runs, stdout/stderr streams, exit statuses
│   └── useGovernanceStore.ts        # Pending human approvals and security alerts
└── types/
    ├── api.ts                       # Direct OpenAPI generated schema types
    ├── events.ts                    # WebSocket payload signatures
    └── tasks.ts                     # Task DAG models
```

### 4.3 Real-Time Streaming & Zero Fabricated Activity
- **WebSocket Protocol & Multiplexing:** The frontend maintains a dedicated WebSocket connection per project (`/ws/projects/{project_id}/events`).
- **High-Throughput Backpressure & Decoupled Rendering:** Under intense compiler output or test execution bursts (>10,000 lines/sec):
  - The backend stream aggregator packages terminal chunks into 50ms / 64KB micro-batched frames before sending over WebSockets, preventing network framing overhead.
  - The frontend `TerminalConsole` pipes ANSI chunks directly to the imperative Xterm.js instance (`terminal.write()`) decoupled from React state, avoiding continuous React re-render cascades. React state only updates for discrete task transitions and tool invocation cards.
  - `useExecutionStore` maintains an in-memory circular ring buffer capped at 5,000 lines to guarantee bounded client memory usage.
- **Verification of Evidence:** The UI never displays synthetic loaders or arbitrary percentages (e.g., "75% completed"). Progress is strictly discrete:
  - Task Status: `PENDING` ➔ `QUEUED` ➔ `RUNNING` ➔ `AWAITING_APPROVAL` ➔ `VERIFYING` ➔ `COMPLETED` / `FAILED`.
  - Evidence Block: Displays the exact exit code, command line invocation, raw stderr/stdout, unit test pass/fail breakdown, and deterministic verification SHA-256 hash before a task transitions to `COMPLETED`.

---

## 5. Backend Architecture

### 5.1 Overview & Design Patterns
The DEVFORCE backend is built on **Python 3.12+** using **FastAPI** as the ASGI web framework. The backend adheres to the **Clean Architecture / Layered Domain-Driven Design (DDD)** pattern:

```
┌────────────────────────────────────────────────────────┐
│               PRESENTATION LAYER (FastAPI)              │
│       Routers, Request/Response Schemas, WebSockets    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                APPLICATION / SERVICE LAYER              │
│  Orchestrator, Task Scheduler, Approval Policy Engine   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    DOMAIN MODEL LAYER                  │
│   Entities, Value Objects, Domain Events, Enums        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                INFRASTRUCTURE ADAPTERS                 │
│  SQLAlchemy Repositories, Docker SDK, LiteLLM, Redis    │
└────────────────────────────────────────────────────────┘
```

### 5.2 Module Layout

```
backend/
├── app/
│   ├── api/                         # Presentation Layer
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── projects.py      # Project & Workspace CRUD
│   │   │   │   ├── tasks.py         # Task DAG creation, execution, and queries
│   │   │   │   ├── approvals.py     # Approval review and resolution
│   │   │   │   ├── agents.py        # Agent registry and status
│   │   │   │   ├── execution.py     # Live execution logs, diffs, terminal
│   │   │   │   └── memory.py        # Semantic memory queries and ADRs
│   │   │   └── router.py            # API V1 router aggregation
│   │   ├── websockets/
│   │   │   ├── connection_mgr.py    # Multi-client WebSocket connection manager
│   │   │   └── event_streams.py     # Event dispatchers for frontend topics
│   │   └── dependencies.py          # FastApi Depends (DB session, current user, repo)
│   ├── core/                        # Cross-cutting infrastructure
│   │   ├── config.py                # Pydantic BaseSettings (ENV configuration)
│   │   ├── security.py              # JWT token generation, password hashing, cryptography
│   │   ├── secret_store.py          # Envelope encryption (AES-256-GCM)
│   │   ├── stream_aggregator.py     # Micro-batching 50ms terminal buffer aggregator
│   │   ├── exceptions.py            # Domain-level exception hierarchies
│   │   └── logging.py               # Structured JSON logging with trace correlation
│   ├── domain/                      # Enterprise Business Rules & Models
│   │   ├── models/                  # Pure Python / Pydantic domain models
│   │   ├── events/                  # Domain event declarations
│   │   └── interfaces/              # Abstract Protocol definitions
│   │       ├── runtime.py           # IRuntimeAdapter protocol
│   │       ├── ai_provider.py       # IAIProvider protocol
│   │       └── repository.py        # Abstract generic repository interfaces
│   ├── services/                    # Application Business Rules
│   │   ├── orchestrator/            # Master Orchestration Engine
│   │   │   ├── coordinator.py       # Multi-agent coordinator
│   │   │   ├── state_machine.py     # Agent state transitions
│   │   │   └── handoffs.py          # Context handoff protocols
│   │   ├── scheduler/               # Task Scheduling & DAG
│   │   │   ├── dag_engine.py        # Dependency graph resolution
│   │   │   └── queue_worker.py      # Async task execution loop
│   │   ├── git/                     # Git Worktree & Release Automation
│   │   │   ├── worktree_manager.py  # Isolated task worktree provisioning
│   │   │   ├── commit_manager.py    # Conventional commit authoring
│   │   │   └── github_client.py     # PR creation and check runs
│   │   ├── governance/              # Approvals & Policies
│   │   │   ├── policy_engine.py     # Blast radius & sensitivity classification
│   │   │   └── audit_service.py     # Tamper-evident logging
│   │   ├── memory/                  # Project Memory Management
│   │   │   ├── vector_store.py      # pgvector semantic search & indexing
│   │   │   └── adr_manager.py       # Architecture decision record tracking
│   │   └── verification/            # Evidence Verification Engine
│   │       └── evidence_eval.py     # Validates test output, exit codes, and diffs
│   ├── runtimes/                    # Execution Infrastructure
│   │   ├── docker/                  # Docker container lifecycle management
│   │   ├── adapters/                # Concrete IRuntimeAdapter implementations
│   │   │   ├── openhands_adapter.py # OpenHands SDK wrapper
│   │   │   ├── codex_adapter.py     # OpenAI Codex adapter
│   │   │   └── cline_adapter.py     # Cline headless adapter
│   │   └── sandbox_pool.py          # Warm container pooling & cleanup
│   └── db/                          # Database Persistence
│       ├── base.py                  # SQLAlchemy declarative base
│       ├── session.py               # Async engine & sessionmaker (asyncpg)
│       ├── models/                  # SQLAlchemy ORM table definitions
│       └── repositories/            # Concrete CRUD repositories
```

---

## 6. Master Orchestrator Architecture

### 6.1 Purpose & Role
The **Master Orchestrator** is the central nervous system of DEVFORCE. It translates ambiguous, high-level user goals into structured, deterministic engineering campaigns. It decomposes goals into specialized domains, allocates tasks to dedicated agent personas, monitors execution, resolves blocked dependencies, and enforces governance gates.

### 6.2 Orchestration Lifecycle State Machine

```
              ┌───────────────────────────┐
              │      OBJECTIVE INPUT      │ (User submits natural language goal)
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    REQUIREMENT ANALYSIS   │ (ProductManagerAgent produces PRD & acceptance criteria)
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    SYSTEM ARCHITECTURE    │ (SystemArchitectAgent creates component & schema plan)
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    TASK GRAPH SYNTHESIS   │ (ProjectManagerAgent builds dependency DAG)
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │     GOVERNANCE REVIEW     │ (Audit plan; require human approval if high blast radius)
              └─────────────┬─────────────┘
                            │ [Approved]
                            ▼
     ┌────────────────► [TASK DISPATCH] ◄────────────────┐
     │                      │                            │
     │                      ▼                            │
     │        ┌───────────────────────────┐              │
     │        │     AGENT EXECUTION       │              │
     │        │  (Coding in Sandbox)      │              │
     │        └─────────────┬─────────────┘              │
     │                      │                            │
     │                      ▼                            │
     │        ┌───────────────────────────┐              │
     │        │  EMPIRICAL VERIFICATION   │              │
     │        │  (Run Pytest/Vitest/Lint) │              │
     │        └─────────────┬─────────────┘              │
     │                      │                            │
     │          ┌───────────┴───────────┐                │
     │          │ [Passed]              │ [Failed]       │
     │          ▼                       ▼                │
     │   [Mark Node Done]      [Self-Correction Loop]    │
     │          │              (Max 3 retries; else human)
     │          │                       │                │
     └──────────┼───────────────────────┘                │
                ▼                                        │
     {All DAG Nodes Complete?} ──[No: Next Ready Node]───┘
                │
                │ [Yes]
                ▼
  ┌───────────────────────────┐
  │     FINAL CI & PR PUSH    │ (DevOpsAgent creates PR, pushes branch, awaits final human merge)
  └───────────────────────────┘
```

### 6.3 Dynamic Agent Handoff Protocol
Agents do not communicate via free-form unconstrained chat. Instead, DEVFORCE enforces **Structured Context Handoffs**:
- **Artifact-Driven Handoff:** Agents pass immutable artifacts (PRD document, Architectural Blueprint, Task Node, Code Patch, Test Report) stored in PostgreSQL.
- **Handoff Schema Contract:** Each handoff event contains:
  1. `source_agent_id` & `target_agent_id`
  2. `task_id` & `workspace_id`
  3. `context_summary`: Condensed summary of decisions made.
  4. `active_artifact_ids`: References to exact database entities produced.
  5. `required_action`: Specific next step expected from the recipient.

---

## 7. Task Scheduling Architecture

### 7.1 Dependency-Aware DAG Execution
Engineering workflows are fundamentally directed acyclic graphs (DAGs). DEVFORCE implements a **Dependency-Aware Task Scheduler** powered by `NetworkX` and persisted in PostgreSQL.

- **Nodes:** Individual discrete tasks (e.g., `Setup Auth Schema`, `Generate JWT Utilities`, `Create Login API Endpoint`, `Implement Login UI Screen`, `Write Playwright E2E Tests`).
- **Edges:** Strict precedence dependencies (`Task B cannot execute until Task A is VERIFIED_COMPLETED`).
- **Parallel Dispatch:** Any tasks whose upstream dependencies evaluate to `COMPLETED` enter the `READY` state simultaneously and are dispatched concurrently across available sandbox workers.

```
       ┌────────────────────────┐
       │   Setup Auth Schema    │ (Database Migration)
       └───────────┬────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐ ┌──────────────────┐
│ Generate JWT Lib │ │  Create Models   │
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         └─────────┬──────────┘
                   ▼
       ┌────────────────────────┐
       │ Implement Login API    │ (FastAPI Route)
       └───────────┬────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐ ┌──────────────────┐
│  Unit Test Route │ │ Implement UI Page│
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         └─────────┬──────────┘
                   ▼
       ┌────────────────────────┐
       │ Playwright E2E Test    │ (End-to-End Verification)
       └────────────────────────┘
```

### 7.2 Concurrency, Git Worktree Management & Failure Recovery
- **Resource Balancing:** The scheduler tracks active CPU and memory consumption across Docker sandboxes, throttling concurrent task execution when host capacity thresholds are reached.
- **Git Worktree Isolation:** To support concurrent tasks without git branch collisions, each running task is provisioned an independent Git worktree (`git worktree add -b devforce/task-{task_id}`). Containers bind-mount only their dedicated worktree to `/workspace`. Completed branches are merged via an atomic integration queue.
- **Merge Conflict Self-Correction:** If concurrent tasks produce merge conflicts upon branch integration, the task enters `SELF_CORRECTION` (sub-state: `MERGE_CONFLICT_RESOLUTION`). The conflicting worktree with conflict markers is passed to the `StaffEngineerAgent` to reconcile edits, verify tests, and commit.
- **Deadlock & Cycle Detection:** When a task graph is synthesized by the `ProjectManagerAgent`, the backend runs Tarjan's cycle detection algorithm before persisting the graph. Cycles trigger an immediate regeneration request.
- **Idempotent Retry & Failure Recovery:** If a task fails verification, it enters a `RETRY` state with an incremented attempt counter (up to a configurable maximum, default 3). Upon final failure, downstream dependent tasks are automatically set to `BLOCKED`, and an incident notification is routed to the human operator.

---

## 8. Runtime Adapter Architecture

DEVFORCE decouples the agent decision logic from the execution environment by introducing the **`IRuntimeAdapter`** abstraction. This guarantees that DEVFORCE can execute coding tasks via **OpenHands SDK**, **OpenAI Codex**, or **Cline** without altering orchestrator code.

```
                 ┌────────────────────────────────┐
                 │       IRuntimeAdapter          │
                 │      (Abstract Protocol)       │
                 └───────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ OpenHandsAdapter │    │   CodexAdapter   │    │   ClineAdapter   │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ - Docker sandbox │    │ - Linux Landlock │    │ - Headless Bun   │
│ - EventStream    │    │ - Windows/Mac    │    │ - Inside Sandbox │
│ - Tool suite     │    │   in-container   │    │ - Agenda task mgr│
│ - ACI tools      │    │ - Local OSS      │    │ - RPC bridge     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

Each adapter implements the following core contract:
```python
class IRuntimeAdapter(Protocol):
    """Universal contract for pluggable coding agent execution engines."""

    async def provision_workspace(self, config: WorkspaceConfig) -> WorkspaceHandle:
        """Provisions an isolated container workspace with mounted git worktree."""
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

## 9. Execution Isolation Architecture

### 9.1 Container Sandboxing Principles
1. **Never Execute on Host:** Direct invocation of `subprocess.Popen` or shell commands on the host machine running the DEVFORCE backend is strictly prevented by code and container boundaries across all host platforms (Linux, Windows, macOS).
2. **Dedicated Workspace Containers & Git Worktrees:** Each concurrent task execution runs in an isolated Docker container spun up on-demand from a hardened base image (`xerova/devforce-sandbox:latest`). The container bind-mounts a task-specific Git worktree at `/workspace`.
3. **Non-Root Execution:** The container runs as an unprivileged user (`devforce:1000:1000`).
4. **Filesystem Confinement:** Host system paths (`/`, `/home`, `/etc`) are never mounted into containers. System root is mounted read-only with ephemeral `tmpfs` mounts for `/tmp`.
5. **No Docker Socket Mounting:** The Docker daemon socket (`/var/run/docker.sock`) is explicitly blocked from being mounted inside any sandbox container, completely eliminating container breakout vectors.
6. **Cross-Platform Container Parity:** On Windows and macOS hosts, Codex and Cline run strictly inside the Linux Docker container, guaranteeing identical security, non-root execution, and network isolation regardless of developer workstation OS.

### 9.2 Resource Limits & Network Security
- **Resource Constraints (cgroups v2):**
  - CPU Limit: Default 2.0 cores per container.
  - Memory Limit: Default 4.0 GB RAM + 1.0 GB Swap.
  - PIDs Limit: Maximum 512 processes (prevents fork bombs).
- **Network Egress Filtering:** Sandbox containers are connected to an internal bridge network. Egress traffic is restricted via iptables/nftables to allowed external package registries (npm, PyPI, GitHub), preventing exfiltration of source code to unauthorized endpoints.

---

## 10. Project Memory Architecture

Autonomous engineering requires both ephemeral session reasoning and long-term institutional knowledge. DEVFORCE implements a **Multi-Tier Memory Architecture**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PROJECT MEMORY ARCHITECTURE                                    │
│                                                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │   TIER 1: WORKING       │  │   TIER 2: REPOSITORY    │  │   TIER 3: INSTITUTIONAL          │  │
│  │   MEMORY (EPHEMERAL)    │  │   SEMANTIC INDEX        │  │   ARCHITECTURAL MEMORY (DURABLE) │  │
│  ├─────────────────────────┤  ├─────────────────────────┤  ├──────────────────────────────────┤  │
│  │ - Current task prompt   │  │ - AST code chunking     │  │ - Architecture Decision Records  │  │
│  │ - Shell execution logs  │  │ - pgvector embeddings   │  │ - Code conventions & styleguides │  │
│  │ - Active file diffs     │  │ - Hybrid keyword search │  │ - Dependency & security rules    │  │
│  │ - Tool return values    │  │ - Cross-file symbols    │  │ - Historical post-mortems        │  │
│  └─────────────────────────┘  └─────────────────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Tier 1 (Working Memory):** Resides in-memory during agent execution. Dynamically summarized via token-aware context condensation algorithms to prevent context window overflow.
- **Tier 2 (Repository Semantic Index):** Every repository linked to a project is parsed using `tree-sitter`, chunked along semantic boundaries (classes, functions), and embedded using text-embedding-3-small into `pgvector`. Agents query this index to locate relevant files before making edits.
- **Tier 3 (Institutional Architecture Memory):** Persisted in PostgreSQL. Stores user-defined rules, previous architectural decisions (ADRs), prohibited libraries, and coding patterns that agents must respect.

---

## 11. Approval & Governance Architecture

### 11.1 Human-in-the-Loop (HITL) Philosophy
DEVFORCE enforces automated safety without blocking autonomous engineering flow. Operations are graded on a calculated **Blast-Radius Score** ($0.0$ to $1.0$).

### 11.2 Blast-Radius & Sensitivity Classification
| Blast Radius | Operation Type | Approval Policy | Action Taken |
| :--- | :--- | :--- | :--- |
| **Low (0.0 - 0.3)** | Read files, run linters, execute local unit tests, format code | **Auto-Approved** | Executed immediately; logged to audit stream. |
| **Medium (0.4 - 0.6)** | Install new npm/PyPI dependencies, edit existing source files, create local git commits | **Configurable** | Auto-approved if within pre-authorized project budget; otherwise prompts developer. |
| **High (0.7 - 0.9)** | Execute database schema migrations, modify configuration or docker files, access external APIs | **Mandatory Approval** | Task paused; UI displays modal with exact command, diff, and potential risk assessment. |
| **Critical (1.0)** | Git push to protected branch, force push, delete files/branches, modify production secrets | **Strict Cryptographic Sign-Off** | Hard block. Requires authenticated human administrator approval with optional MFA/token. |

### 11.3 Interactive Approval Flow
When a high-risk operation is flagged:
1. The execution engine issues a `SuspensionEvent`.
2. The task enters `AWAITING_APPROVAL`.
3. The frontend displays the exact command, targeted file/branch, and reasoning.
4. The user can **Approve**, **Reject with Feedback**, or **Modify Command**.
5. Upon approval, an immutable record is stamped into the `governance_audits` database table.

---

## 12. Event Communication Architecture

### 12.1 Internal Event Bus
DEVFORCE uses an asynchronous, typed in-memory event bus (backed by async queues with optional Redis Pub/Sub backend for multi-instance scaling). All system components emit domain events implementing `BaseEvent`.

```
                    ┌───────────────────────────────┐
                    │       INTERNAL EVENT BUS      │
                    └───────────────┬───────────────┘
                                    │
    ┌────────────────┬──────────────┼───────────────┬────────────────┐
    ▼                ▼              ▼               ▼                ▼
[task.*]        [agent.*]     [execution.*]    [approval.*]     [memory.*]
- created       - assigned    - stdout_chunk   - requested      - indexed
- started       - thinking    - stderr_chunk   - granted        - recalled
- completed     - tool_call   - diff_generated - rejected
- failed        - tool_return - exit_code
```

### 12.2 WebSocket Streaming to Frontend
Events are routed through the `WebSocketConnectionManager`, which multiplexes streams by `workspace_id` and `project_id`. The client receives a single bi-directional WebSocket feed with structured JSON payloads conforming to the Canonical Event Envelope:

```json
{
  "event_id": "evt_987f6543-a21b-43de-9f12-000000000001",
  "workspace_id": "wks_01931a54-6821-789a-bcde-123456789abc",
  "project_id": "prj_123e4567-e89b-12d3-a456-426614174000",
  "task_id": "tsk_456e789a-b12c-34d5-e678-901234567890",
  "topic": "execution.stdout_chunk",
  "timestamp": "2026-11-09T17:20:00.000Z",
  "payload": {
    "stream": "stdout",
    "text": "PASSED tests/test_auth.py::test_login_success\n",
    "is_terminal": false
  }
}
```

---

## 13. Multi-Project Architecture

### 13.1 Workspace & Project Isolation
DEVFORCE natively supports multi-tenant, multi-project workflows:
- **Tenant & Workspace Scoping:** Every user belongs to an organization/workspace. All projects, tasks, execution sandboxes, and audit logs are strictly scoped by foreign keys to `workspace_id`.
- **Repository Isolation:** Projects may contain multiple repositories (e.g., a monorepo or separated frontend/backend repositories). Repositories are cloned into separate subdirectory workspaces within the sandbox.
- **Context Boundaries:** Memory indices and vector embeddings are partitioned per project. Agent queries in Project A cannot access code snippets, ADRs, or secrets from Project B.

---

## 14. AI Provider Architecture

### 14.1 Unified Model Abstraction
DEVFORCE interfaces with AI models exclusively via a provider-independent interface. While native OpenAI API endpoints (such as `gpt-4o`, `o1`, and `o3-mini`) serve as primary reasoning engines, DEVFORCE supports Anthropic, Google Gemini, and local models via a unified abstraction:

```python
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

### 14.2 Failover, Rate-Limit Retries & Budget Control
- **Dynamic Failover:** If an API provider returns a 429 (Rate Limit) or 503 (Overloaded), the router seamlessly falls back to a secondary pre-configured model (e.g., OpenAI o3-mini ➔ Claude 3.7 Sonnet).
- **Token Budget Caps:** Projects define strict token and currency spend limits ($USD). The orchestrator enforces hard cutoffs when spend thresholds are reached.

---

## 15. Security Architecture

### 15.1 Zero Secrets in Source & Redaction Engine
- **Storage:** Secrets (GitHub tokens, cloud provider keys) are stored in the PostgreSQL database encrypted via AES-256-GCM using an application master key.
- **In-Flight Redaction:** Before any terminal output, log line, or LLM payload is broadcast over WebSockets or stored in persistent logs, it passes through the `SecretRedactionEngine` (Aho-Corasick + regex scanners), which replaces sensitive tokens with `[REDACTED_API_KEY]` with sub-millisecond per-chunk latency.

### 15.2 Tamper-Proof Audit Logging
All human approvals, policy overrides, agent tool calls, and branch push operations write to an append-only `governance_audits` table. To support multi-tenant concurrency and non-repudiation, audit records are chained per-workspace using monotonic sequence numbers:
$$\text{current\_record\_hash} = \text{SHA256}(\text{prev\_record\_hash} \parallel \text{workspace\_id} \parallel \text{workspace\_sequence\_num} \parallel \text{actor\_id} \parallel \text{action} \parallel \text{payload\_hash} \parallel \text{created\_at})$$
Any unauthorized mutation or deletion invalidates the chain and immediately alerts security administrators.

---

## 16. Implementation Dependency Graph & Recommended Development Sequence

To ensure systematic, deterministic, and defect-free implementation without regressions or circular dependencies, the construction of XEROVA AI DEVFORCE is structured around a strict topological build order.

### 16.1 Implementation Dependency Graph

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    IMPLEMENTATION DEPENDENCY GRAPH                                     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 [Phase 1: Persistence & Schemas]
  - PostgreSQL 16 + pgvector
  - SQLAlchemy 2.0 Async Models
  - Alembic Migrations
  - Pydantic v2 Data Contracts
           │
           ├─────────────────────────────────────────┐
           ▼                                         ▼
 [Phase 2: Core API & Event Bus]           [Phase 4A: Repository Memory Core]
  - FastAPI ASGI Framework                  - Tree-sitter AST Parser
  - JWT Auth & RBAC Security                - text-embedding-3-small Embeddings
  - In-Flight Secret Redactor               - pgvector HNSW Vector Store
  - In-Memory / Redis Event Bus             - ADR Durable Knowledge Store
  - WebSocket Connection Multiplexer                 │
           │                                         │
           ├─────────────────────────────────────────┼────────────────────────────────────────┐
           ▼                                         ▼                                        ▼
 [Phase 3: Execution Isolation]            [Phase 4B: AI Provider Abstraction]      [Phase 7A: UI Shell]
  - Hardened Sandbox Base Image             - IAIProvider Protocol (LiteLLM)         - React 19 + Vite 6
  - Docker SDK / cgroups v2 Limits          - Token Cost Accounting Engine           - Tailwind CSS v4 Tokens
  - OpenHands SDK Adapter                   - Rate-Limit Retry & Model Failovers     - Zustand / TanStack Query
  - Codex & Cline Adapter Harnesses                  │                               - App Layout & Navigation
           │                                         │                                        │
           └──────────────────┬──────────────────────┘                                        │
                              ▼                                                               │
                    [Phase 5: Master Orchestration Engine]                                    │
                     - Multi-Agent Personas (PM, Architect, Planner, Engineer, QA)            │
                     - OpenAI Agents SDK Structured Handoff Protocols                         │
                     - NetworkX Task DAG Dependency Scheduler                                 │
                     - Concurrency Dispatcher & Deadlock Detection                            │
                     - Self-Correction Retry Loops                                            │
                              │                                                               │
                              ▼                                                               │
                    [Phase 6: Governance, Approval & Git Automation]                          │
                     - Blast-Radius Calculation Engine                                        │
                     - Human-in-the-Loop Suspension Interceptor                               │
                     - Cryptographic Tamper-Evident Hash Chain                                │
                     - Git Branching & Conventional Commit Engine                             │
                     - Real Execution Evidence Collection (SHA-256 Receipts)                  │
                     - GitHub API Pull Request Integration                                    │
                              │                                                               │
                              ├───────────────────────────────────────────────────────────────┘
                              ▼
                    [Phase 7B: Interactive Mission-Control UI]
                     - React Flow Interactive DAG Visualizer
                     - Xterm.js ANSI Real-Time Terminal Console
                     - Monaco Editor Side-by-Side Diff Viewer
                     - Human Approval Gate Modal with Blast-Radius Scoring
                     - Real Evidence Telemetry Badges (Zero Synthetic Indicators)
                              │
                              ▼
                    [Phase 8: End-to-End Verification & Hardening]
                     - Pytest Backend Test Suite (Unit, Integration, Sandboxes)
                     - Vitest Frontend Test Suite (Components, Hooks, Stores)
                     - Playwright E2E User Journey & Approval Workflow Suite
                     - Container Escape Penetration & Network Egress Auditing
                     - Supply-Chain Security & Pinned Dependency Enforcement
```

---

### 16.2 Recommended Development Sequence

The development lifecycle proceeds through eight disciplined, sequential milestones. Each milestone requires passing all automated exit criteria before advancing to the subsequent phase.

#### Milestone 1: Persistence Layer, Core Models & Migration Foundation
- **Objectives:** Establish the database schema, relational constraints, and core Pydantic data contracts.
- **Key Deliverables:**
  - `backend/app/db/base.py`: DeclarativeBase with UUID primary keys and timestamp mixins.
  - `backend/app/db/models/`: SQLAlchemy 2.0 async models for Organizations, Workspaces, Users, Projects, Repositories, Tasks, Dependencies, Execution Runs, Tool Invocations, and Governance Audits.
  - `backend/alembic/`: Complete Alembic migration pipeline with `pgvector` extension provisioning, HNSW indexes, custom Vector type comparators, and monthly range partitions for `step_logs`.
  - `backend/app/domain/models/`: Deduplicated Pydantic v2 schemas defining input, output, and domain entities.
- **Exit Criteria:** `alembic upgrade head` executes with zero errors against clean PostgreSQL 16; zero false diffs reported on `alembic check` / `--autogenerate`; all tables, constraints, foreign keys, and indexes verified via automated schema introspection tests.

#### Milestone 2: API Gateway, Security Foundations & Event Streaming
- **Objectives:** Construct the asynchronous HTTP/WebSocket server, user authentication, and real-time event distribution backbone.
- **Key Deliverables:**
  - `backend/app/main.py`: FastAPI application factory with lifespan handlers and CORS configuration.
  - `backend/app/core/security.py`: Argon2 password hashing, short-lived JWT access tokens, and refresh token rotation.
  - `backend/app/core/redaction.py`: `SecretRedactionEngine` scanning all outbound streams with regex signatures and exact-match Aho-Corasick tables.
  - `backend/app/core/stream_aggregator.py`: High-throughput 50ms / 64KB micro-batching backpressure engine for stdout/stderr streaming.
  - `backend/app/core/events.py`: Typed async event bus supporting publish-subscribe pattern with topic filtering.
  - `backend/app/api/v1/websockets/`: Multiplexed WebSocket connection manager routing events by `workspace_id` and `project_id`.
- **Exit Criteria:** 100% test coverage on authentication endpoints; verified real-time event dispatch over WebSockets; secret redaction benchmark proving sub-millisecond replacement of sensitive tokens across 50+ project secrets.

#### Milestone 3: Execution Sandboxing & Pluggable Runtime Adapters
- **Objectives:** Implement secure, isolated execution environments, Git worktree isolation, and swappable runtime harnesses.
- **Key Deliverables:**
  - `docker/sandbox/Dockerfile`: Hardened Ubuntu 24.04 image with non-root user (`UID 1000`), Python 3.12, Node.js, and pre-installed test tools.
  - `backend/app/runtimes/docker/manager.py`: Docker container lifecycle manager enforcing cgroups v2 (CPU 2.0, RAM 4GB, PIDs 512), read-only root filesystems, and network egress rules.
  - `backend/app/services/git/worktree_manager.py`: Git worktree lifecycle manager provisioning dedicated isolated worktrees (`/var/devforce/worktrees/{task_id}`) per concurrent task.
  - `backend/app/runtimes/adapters/openhands_adapter.py`: Primary Python coding runtime adapter utilizing `openhands-sdk` and `openhands-workspace`.
  - `backend/app/runtimes/adapters/codex_adapter.py`: OpenAI Codex adapter supporting native Bubblewrap/Landlock on Linux and containerized execution on Windows/macOS with local OSS model support via `--oss`.
  - `backend/app/runtimes/adapters/cline_adapter.py`: Headless Cline adapter running Bun-backed task execution strictly inside the Docker sandbox.
- **Exit Criteria:** Zero host escape capability confirmed by automated penetration test; zero branch collisions across 4 parallel task executions verified via git worktrees; container teardown cleans up 100% of ephemeral resources; shell commands execute cleanly with exact exit code and stdout/stderr capture.

#### Milestone 4: AI Provider Abstraction & Repository Memory Engine
- **Objectives:** Build the model routing layer and intelligent repository indexing subsystem.
- **Key Deliverables:**
  - `backend/app/services/ai/provider.py`: Universal `IAIProvider` protocol with LiteLLM proxy, OpenAI API client, and local Ollama routing.
  - `backend/app/services/ai/cost_tracker.py`: Real-time token usage and USD spend accounting with hard budget cutoffs.
  - `backend/app/services/memory/ast_parser.py`: Tree-sitter AST parser segmenting code along semantic class/function boundaries.
  - `backend/app/services/memory/vector_store.py`: HNSW vector index search against `code_memory_chunks` using `text-embedding-3-small`.
  - `backend/app/services/memory/adr_manager.py`: Architectural Decision Record retrieval and prompt injection manager.
- **Exit Criteria:** Sub-20ms semantic search across 10,000 code chunks; automated model failover tested against simulated 429 rate-limit responses; token accounting accurate within $0.0001 USD.

#### Milestone 5: Master Orchestrator & Multi-Agent Workforce
- **Objectives:** Implement the central multi-agent coordination brain, task DAG scheduler, and specialized personas.
- **Key Deliverables:**
  - `backend/app/services/orchestrator/personas/`: Specialized implementations for Product Manager, System Architect, Project Manager, Staff Engineer, QA Engineer, Security Auditor, and DevOps Engineer.
  - `backend/app/services/orchestrator/handoffs.py`: Structured artifact handoff protocol modeled on OpenAI Agents SDK.
  - `backend/app/services/scheduler/dag_engine.py`: NetworkX-powered dependency DAG compiler, topological sorter, and cycle detector.
  - `backend/app/services/scheduler/worker.py`: Concurrency pool dispatcher executing ready tasks up to project limits.
  - `backend/app/services/orchestrator/self_correction.py`: Automated retry loop routing test failure tracebacks and merge conflict markers back to engineering agents (max 3 retries).
- **Exit Criteria:** Autonomous decomposition of high-level prompt into a valid 5+ node DAG; parallel execution of independent tasks across isolated worktrees; successful self-correction of an intentionally injected syntax bug and merge conflict.

#### Milestone 6: Governance, Approval Gates & VCS Integration
- **Objectives:** Implement safety policy controls, cryptographic audit logging, and Git/GitHub lifecycle management.
- **Key Deliverables:**
  - `backend/app/services/governance/policy_engine.py`: Blast-radius calculation engine scoring operations from 0.0 to 1.0.
  - `backend/app/services/governance/interceptor.py`: Asynchronous suspension interceptor pausing execution for High/Critical actions.
  - `backend/app/services/governance/audit_chain.py`: Append-only audit logger computing SHA-256 hash chains over historical events scoped per workspace with monotonic sequence numbers.
  - `backend/app/services/git/manager.py`: Git worktree manager authoring conventional commits on isolated `devforce/task-{id}` branches and managing atomic branch integrations.
  - `backend/app/services/verification/evidence_eval.py`: Verifiable receipt collector calculating `SHA256(CanonicalJSON(evidence))`.
  - `backend/app/services/git/github_client.py`: Automated Pull Request generation with linked PRD criteria and verification receipts.
- **Exit Criteria:** High-blast command successfully pauses execution and resumes only upon cryptographic user approval; per-workspace audit hash chain detects any injected DB alteration; empirical evidence hash validates deterministically against raw outputs.

#### Milestone 7: Mission-Control Frontend Application
- **Objectives:** Deliver the high-density React 19 single-page application with real-time streaming interfaces.
- **Key Deliverables:**
  - `frontend/src/features/dashboard/`: Workspace fleet overview and active run monitors.
  - `frontend/src/features/board/`: Interactive React Flow DAG graph rendering live task statuses and active agent assignments.
  - `frontend/src/components/terminal/`: Xterm.js terminal console consuming live stdout/stderr streams with zero synthetic delay.
  - `frontend/src/components/diff/`: Monaco Editor side-by-side diff viewer with syntax highlighting and file tree navigation.
  - `frontend/src/features/governance/`: Interactive Approval Modal presenting blast-radius score, exact command payload, and diff preview.
  - `frontend/src/components/agent/`: Spend indicators, token counters, and empirical verification receipt badges.
- **Exit Criteria:** Frontend passes all Vitest component tests; sub-16ms render performance maintained during high-frequency terminal streaming; zero fabricated progress indicators present in codebase.

#### Milestone 8: Comprehensive Verification, Security Hardening & E2E Testing
- **Objectives:** Validate the complete integrated platform under production loads, security attacks, and multi-repository workflows.
- **Key Deliverables:**
  - `tests/backend/`: Full Pytest suite covering unit, integration, and sandbox execution layers.
  - `tests/frontend/`: Full Vitest suite covering React components, custom hooks, and Zustand stores.
  - `tests/e2e/`: Full Playwright test suite validating end-to-end user workflows: login ➔ project creation ➔ goal submission ➔ DAG visualization ➔ real-time terminal streaming ➔ approval gate signoff ➔ PR generation.
  - Container breakout and host vulnerability penetration tests.
  - Supply-chain dependency audit with pinned versions and publication age limits.
- **Exit Criteria:** 100% green test passes across Pytest, Vitest, and Playwright; zero security vulnerabilities rated High or Critical; confirmed zero host filesystem mutation during execution.

---

### 16.3 Critical Path & Resource Bottleneck Analysis

1. **The Critical Path:**
   $$\text{Persistence (Phase 1)} \longrightarrow \text{Event Bus / API (Phase 2)} \longrightarrow \text{Sandbox (Phase 3)} \longrightarrow \text{Orchestrator (Phase 5)} \longrightarrow \text{Governance (Phase 6)} \longrightarrow \text{Frontend (Phase 7)} \longrightarrow \text{E2E (Phase 8)}$$
   - Total estimated implementation velocity is strictly bounded by this 7-step sequence.

2. **Parallelizable Off-Path Workstreams:**
   - **Phase 4A & 4B (Repository Memory & AI Provider Abstraction):** Can proceed entirely in parallel with Phase 3 (Execution Sandboxing) once Phase 1 (Data Contracts) and Phase 2 (Core Config) are established.
   - **Phase 7A (Frontend Shell & Design Tokens):** Can proceed in parallel with Phase 3-5 using mocked contract schemas derived directly from Milestone 1 Pydantic models.

3. **Key Architectural De-risking Gates:**
   - **Gate 1 (End of Phase 3):** Must prove Docker sandboxing completely contains file mutations and executes Pytest within 3 seconds before writing any agent orchestration logic.
   - **Gate 2 (End of Phase 5):** Must prove the Master Orchestrator can detect a task failure and recover via self-correction before integrating human approval gates or UI controls.
   - **Gate 3 (End of Phase 6):** Must prove empirical execution receipts are tamper-proof before presenting them in the frontend.

---

## 17. Architectural Verification & Summary
This system architecture fulfills every core design tenet of DEVFORCE:
- Independent, modular, and unencumbered by proprietary orchestrator lock-in.
- Ephemeral, secure Docker sandbox execution with non-root security.
- Transparent, empirical verification based on actual test results and real shell outputs.
- Comprehensive human-in-the-loop governance for all high-impact actions.
