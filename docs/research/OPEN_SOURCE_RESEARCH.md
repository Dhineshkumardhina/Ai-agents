# Open-Source AI Agent Research & Technical Evaluation
**Project:** XEROVA AI DEVFORCE  
**Phase:** 0A — Architectural Investigation and Source-Level Evaluation  
**Author:** Principal AI Systems Architect  
**Date:** March 2026  
**Status:** Complete  

---

## Executive Summary

To establish the architectural foundation for **XEROVA AI DEVFORCE**—an enterprise multi-agent software engineering workforce platform—we executed an in-depth source-code investigation of seven leading open-source agent projects. Rather than relying on README marketing copy, this research is grounded strictly in source code analysis, dependency tree audits, execution harness inspection, and security architecture dissection across the repositories:

1. **OpenHands** (`All-Hands-AI/OpenHands` & `OpenHands/software-agent-sdk`)
2. **MetaGPT** (`FoundationAgents/MetaGPT`)
3. **Paperclip** (`paperclipai/paperclip`)
4. **SWE-agent** (`SWE-agent/SWE-agent`)
5. **Open SWE** (`langchain-ai/open-swe`)
6. **OpenAI Codex** (`openai/codex`)
7. **Cline** (`cline/cline`)

### Architectural Blueprint Synthesis
The seven projects fall into four distinct functional tiers of an autonomous software engineering organization:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TIER 1: WORKFORCE CONTROL PLANE                       │
│  [Paperclip] - Org Hierarchy, Reporting Lines, Budgeting & Governance   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Orchestrates & Assigns Tasks
┌───────────────────────────────────▼────────────────────────────────────┐
│                  TIER 2: SPECIALIST PLANNING LAYER                     │
│  [MetaGPT] - SOP Role Decomposition: PM -> Architect -> Tasks -> QA    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Deploys to Coding Runtime
┌───────────────────────────────────▼────────────────────────────────────┐
│                   TIER 3: CORE CODING RUNTIMES                          │
│  [OpenHands] (Primary Python Runtime) | [OpenAI Codex] (Rust/OS Sandbox)│
│                 [Cline] (TypeScript/Bun Lightweight Engine)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Sandboxed Tool Execution & Feedback
┌───────────────────────────────────▼────────────────────────────────────┐
│             TIER 4: SPECIALIZED WORKFLOWS & DEBUGGING                  │
│  [Open SWE] (LangGraph Review Graph) | [SWE-agent] (Autonomous Patching)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. OpenHands (`All-Hands-AI/OpenHands` & `OpenHands/software-agent-sdk`)
*Primary Coding Runtime Candidate*

### 1.1 Source Code & Repository Structure
During direct code examination, a critical architectural transition was identified: OpenHands has decoupled its frontend canvas interface from its agent backend engine:
- `All-Hands-AI/OpenHands`: Now houses `@openhands/agent-canvas` (v1.37.0), a React/Vite/Tailwind and Electron desktop visual interface.
- `OpenHands/software-agent-sdk`: Contains the core Python agent SDK, workspace sandbox runtimes, tools, and the FastAPI/WebSocket agent server.

The SDK repository is managed as a high-performance **uv workspace** with four cohesive packages:
- `openhands-sdk/` (v1.60.1): Core runtime abstractions (`Agent`, `Conversation`, `LLM`, `EventStream`, `Tool`, `CancellationToken`, `CriticMixin`).
- `openhands-tools/` (v1.60.1): Production tools (`terminal`, `file_editor`, `task_tracker`, `browser_use`, `apply_patch`, `child_conversation`, `delegate`).
- `openhands-workspace/` (v1.60.1): Sandboxing backends (`docker`, `agent_sandbox` [k8s], `apptainer`, `cloud`, `remote_api`).
- `openhands-agent-server/` (v1.60.1): Production FastAPI server exposing REST and WebSocket endpoints for conversation lifecycles and runtime execution.

### 1.2 Agent Execution Architecture
OpenHands operates an **event-sourced state machine** orchestrated by `openhands.sdk.agent.Agent` (`openhands-sdk/openhands/sdk/agent/agent.py` L70-L350):
- **Event Sourcing:** Every interaction produces an immutable `Event` subclass (`ActionEvent`, `ObservationEvent`, `SystemPromptEvent`, `TokenEvent`, `AgentErrorEvent`).
- **Context Condensation:** The conversation history is compressed dynamically via `CondensationRequest` and `Condensation` algorithms (`openhands.sdk.event.condenser`) to prevent LLM context window overflow while preserving critical file diffs and tool returns.
- **Parallel Execution:** Implements `ParallelToolExecutor` (`openhands-sdk/openhands/sdk/agent/parallel_executor.py`) to dispatch independent tool calls concurrently.
- **Self-Correction & Reflection:** Features `CriticMixin` (`critic_mixin.py`) allowing secondary critique LLMs to audit diffs before final commit.

### 1.3 APIs & Integration Capabilities
OpenHands provides the most complete client-server and headless integration ecosystem:
- **FastAPI Agent Server:** Complete REST API (`openhands-agent-server/openhands/agent_server/api.py`) for session creation, conversation status, file exploration, and agent profile switching.
- **WebSocket Streaming:** Real-time bi-directional event stream (`sockets.py`, `session_socket.py`) for streaming tokens, shell output, and human confirmations.
- **Agent Client Protocol (ACP):** Full native implementation (`openhands-sdk/openhands/sdk/agent/acp_agent.py` and `acp_router.py`) enabling standardized communication with external IDEs and orchestrators.
- **Model Context Protocol (MCP):** First-class MCP tool discovery and client support via `fastmcp` (v4.0.3).
- **Python SDK:** Headless programmatic execution in under 10 lines of Python.

### 1.4 Execution Isolation
- **Docker Workspace:** Spawns dedicated ephemeral Docker containers (`openhands-workspace/openhands/workspace/docker`) per agent conversation, mounting workspace directories with customizable UID/GID mapping and memory/CPU limits.
- **Kubernetes Agent Sandbox:** Native support for `kubernetes-sigs/agent-sandbox` pods for enterprise cluster deployments (`openhands-workspace/openhands/workspace/agent_sandbox`).
- **Apptainer / Singularity:** Rootless container execution for HPC and restricted enterprise environments.

### 1.5 Supported Model Providers
Configured via LiteLLM (`litellm==1.105.1`) with custom router enhancements:
- Direct provider support: OpenAI, Anthropic, Google Vertex / Gemini, AWS Bedrock, Ollama, DeepSeek, Mistral, Azure OpenAI, OpenRouter.
- Built-in multi-model fallback and rate-limit retry routing (`openhands.sdk.llm.router.base.RouterLLM`).

### 1.6 Licence, Dependencies & Security
- **Licence:** Dual-repository MIT License: `All-Hands-AI/OpenHands` (canvas UI / monorepo) carries `Copyright (c) 2025 OpenHands contributors`, whereas the decoupled core `OpenHands/software-agent-sdk` carries `Copyright (c) 2026 OpenHands contributors`.
- **Compatibility:** Requires Python `>=3.12` (uv managed) and Node `>=24` (for canvas UI).
- **Security Guardrails:** Centralized security analyzer (`openhands.sdk.security.analyzer`) with risk level scoring (`risk.py`) and secret exposure prevention (`_secrets_exposure.py`). Automated credential redaction is implemented in the agent server layer (`openhands-agent-server/openhands/agent_server/_secret_redaction.py`).

---

## 2. MetaGPT (`FoundationAgents/MetaGPT`)
*Specialist Planning Architecture Reference*

### 2.1 Source Code & Repository Structure
MetaGPT is a mature Python codebase (~890 `.py` files) structured around **Standard Operating Procedures (SOPs)** modeled after software development organizations:
- `metagpt/roles/`: Specialized persona classes (`ProductManager`, `Architect`, `ProjectManager`, `Engineer`, `QaEngineer`).
- `metagpt/actions/`: Concrete action definitions (`WritePRD`, `DesignArchitecture`, `WriteTasks`, `WriteCode`, `RunCode`).
- `metagpt/environment/`: Multi-agent messaging bus (`Environment`, `MGXEnv`).
- `metagpt/team.py`: Main container orchestrating multi-agent collaboration, budget investments, and serialization.

### 2.2 Agent Execution Architecture
- **Message-Driven Pub/Sub:** Instead of an imperative controller, agents publish `Message` objects to a shared `Environment` message pool. Agents inspect messages using subscriptions (`metagpt/roles/role.py` L100-L280) and trigger relevant actions when dependent deliverables arrive.
- **Waterfall SOP Workflow:**
  1. User Idea $\rightarrow$ `ProductManager` (`WritePRD`) produces PRD with user stories and UI specs.
  2. PRD $\rightarrow$ `Architect` (`DesignArchitecture`) generates system design, APIs, data structures, and file layout.
  3. System Design $\rightarrow$ `ProjectManager` (`WriteTasks`) creates a directed task dependency graph.
  4. Task Graph $\rightarrow$ `Engineer` (`WriteCode`) writes concrete files.
  5. Code $\rightarrow$ `QaEngineer` (`WriteTest`, `RunCode`) validates implementation.

### 2.3 Reusable Assets for DEVFORCE
MetaGPT should **not** be used as the coding execution runtime due to poor sandbox isolation, but its **SOP prompt architecture and structured schemas** are world-class references:
- Structured Pydantic PRD and Architecture data contracts (`metagpt/schema.py`).
- Requirement decomposition prompts and system design graph definitions.
- Task breakdown algorithms mapping software requirements to discrete code files.

### 2.4 Licence, Dependencies & Limitations
- **Licence:** MIT License (Copyright 2024 Chenglin Wu).
- **Python Boundary & Mutual Runtime Conflict:** `setup.py` explicitly enforces `python_requires=">=3.9, <3.12"`. This creates a hard mutual runtime incompatibility with OpenHands' `python_requires=">=3.12"`, preventing any co-installation within the same Python virtual environment.
- **Execution Isolation Risk:** **Critical Vulnerability.** MetaGPT executes generated Python scripts directly on the host operating system (`metagpt/tools/libs/python_interpreter.py`). It lacks out-of-the-box containerization.
- **Dependency Bloat:** Extremely brittle dependency requirements in `requirements.txt`: pins legacy packages such as `aiohttp==3.8.6`, `faiss_cpu==1.7.4`, `pandas==2.1.1`, `numpy~=1.26.4`, `grpcio~=1.67.0`, and quantitative finance packages (`ta==0.10.2`).
- **Integration Recommendation:** Extract MetaGPT's prompt flows and role schema logic; do not install the monolithic `metagpt` package into the DEVFORCE runtime.

---

## 3. Paperclip (`paperclipai/paperclip`)
*Workforce Management Architecture Reference*

### 3.1 Source Code & Repository Structure
Paperclip is an enterprise-grade TypeScript/Node.js platform designed to run AI agents as an autonomous virtual company:
- Monorepo structured with `pnpm` workspaces:
  - `server/`: Fastify/Node.js backend with embedded or external PostgreSQL (`postgres@3.4.9`, `embedded-postgres@18.1.0`). Chat and channel integrations are organized directly in the server services: chat channels (Slack, Discord) reside in `server/src/services/chat-channels/` and external connectors reside in `server/src/services/connectors/` (rather than a separate `packages/plugins/`).
  - `ui/`: Modern React 19 dashboard with interactive Org Charts, Boards, Budgets, and Issue Detail views.
  - `cli/`: Local deployment and onboarding CLI (`npx paperclipai onboard`).
  - `packages/adapters/`: Pluggable agent harnesses (`claude-local`, `codex-local`, `gemini-local`, `cursor-local`, `opencode-local`).
  - `packages/adapter-utils/`: Adapter core execution runtimes, including ACP runner integration (`packages/adapter-utils/src/acpx-engine`).

### 3.2 Workforce Management Architecture
Paperclip provides the missing managerial layer for multi-agent systems:
- **Org Chart & Hierarchy:** Represents agents as employees with job titles, reporting managers, role scopes, and permission levels.
- **Board & Issue Management:** Hierarchical tasks, subtasks, checklists, status tracking, and dependency assignment.
- **Budgeting & Accounting:** Tracks token spend, API cost accumulation, and daily budget limits per agent and department.
- **Approval Gates:** Configurable human-in-the-loop signoff policies before code commits or production actions occur.
- **Bring Your Own Agent (BYOA):** Decouples managerial coordination from agent execution. Agents can run Claude Code, Codex, OpenHands, or custom LLM scripts while reporting back to Paperclip via standardized protocols.

### 3.3 APIs & Communication
- **Agent Client Protocol (ACP) Native Support:** Paperclip features first-class native Agent Client Protocol (ACP) integration via `@agentclientprotocol/claude-agent-acp: 0.73.0` and `@agentclientprotocol/codex-acp: 1.6.2`, driven by `packages/adapter-utils/src/acpx-engine` and documented in `doc/acp-run-lifecycle.md`. This means subagent protocol standardization between OpenHands (which natively exports ACP) and Paperclip is already solved out-of-the-box via ACP without custom protocol translation.
- REST API for boards, agents, company routines, and task claims.
- Real-time WebSocket connection for live execution streaming, logs, and interactive intervention.
- Agent Authentication via signed JWT tokens (`server/src/agent-auth-jwt.ts`).

### 3.4 Licence, Dependencies & Limitations
- **Licence:** MIT License (Copyright 2025 Paperclip AI).
- **Dependencies:** Node.js `>=24.11`, pnpm, PostgreSQL.
- **Isolation Limitations:** Paperclip coordinates agent execution but offloads execution sandboxing to individual adapters or runner plugins.
- **Integration Recommendation:** Primary architectural reference for DEVFORCE's organizational hierarchy, budgeting, and workforce orchestration tier.

---

## 4. SWE-agent (`SWE-agent/SWE-agent`)
*Autonomous Debugging Research*

### 4.1 Source Code & Architecture
Developed by Princeton NLP, SWE-agent focuses on autonomous issue resolution across real-world GitHub repositories:
- `sweagent/agent/`: ReAct agent loop (`agents.py`), problem statement parsers (`problem_statement.py`), and reviewer logic (`reviewer.py`).
- `sweagent/environment/`: Docker execution environment (`swe_env.py`) backed by `swerex` (`swe-rex>=1.4.0`).
- `sweagent/tools/`: Custom Agent-Computer Interface (ACI) tools designed to minimize LLM token consumption.

### 4.2 Agent-Computer Interface (ACI) Innovation
SWE-agent's primary contribution is demonstrating that standard bash shells overload LLM context windows. It replaces standard unix tools with optimized ACI commands:
- `open_file`: Opens a window of 100 lines rather than dumping the full file.
- `scroll_down` / `scroll_up`: Paginates through file content.
- `edit_lines`: Replaces specific line number spans with new content.
- `search_dir` / `find_file`: Token-thrifty search returning compact matches.

### 4.3 Execution Isolation
- Strong isolation via `swerex`: Runs inside dedicated Docker images (`python:3.11` baseline) with isolated bash sessions, non-root user execution, and strict command timeouts (`sweagent/environment/swe_env.py` L25-L65).

### 4.4 Licence & Integration Assessment
- **Licence:** MIT License (Copyright 2024 John Yang et al.).
- **Limitations:** Monolithic issue-solving loop; not designed for persistent multi-agent team communication or long-running interactive tasks.
- **Integration Recommendation:** Reusable asset: Port SWE-agent's token-efficient ACI file viewing and diff editing command paradigms into DEVFORCE tool definitions.

---

## 5. Open SWE (`langchain-ai/open-swe`)
*Coding Workflow & Sandbox Research*

### 5.1 Source Code & Architecture
Open SWE (Robin Agent) is LangChain's enterprise software engineering platform built on **LangGraph**:
- Multi-Agent Graphs (`langgraph.json` & `openswe/graphs/`):
  - `agent`: Architectural inspection reveals that `openswe.graphs.agent:traced_agent` is merely a 6-line read-only stub. The live production agent implementation has migrated entirely to Managed Deep Agents (`mda/agent.py` using `managed_deepagents`).
  - `reviewer`: Automated PR review graph (`openswe.graphs.reviewer:traced_reviewer_agent`).
  - `review-scout`: Incident triage and change impact scanner (`review_scout`).
- `openswe/sandboxes/`: Sandbox life-cycle management (`lifecycle.py`, `tool_runtime.py`, `providers/langsmith.py`).
- `openswe/merge_queue/`: Automated CI merge queue and rollback coordinator.

### 5.2 Agent Execution & Graph State
- **LangGraph Cycles:** Built on `langgraph>=1.2.20` with persistent state checkpointers (`langgraph.json` TTL checkpointer). Allows agents to pause execution, solicit human feedback via interrupts, and resume deterministically.
- **State Serialization:** Graph state channels store full history, current diffs, test logs, and reviewer remarks.

### 5.3 Licence, Dependencies & Critical Vendor Risks
- **Licence & Proprietary Vendored Code Risk:** While the root repository is under the MIT License (Copyright LangChain, Inc.), a critical legal limitation exists in `OpenSWE/vendor/README.md` for `managed-deepagents-sdk`. It carries an explicit proprietary disclaimer: *"Vendoring grants no license to use, modify, or distribute outside the terms of the proprietary Managed Deep Agents agreement"*, restricting commercial use without a commercial enterprise agreement.
- **Python Compatibility Constraint:** Requires cutting-edge Python `>=3.14` (`pyproject.toml` L6).
- **Vendor Lock-in Risk:** **High.** Open SWE depends tightly on proprietary LangSmith hosted cloud sandboxes (`openswe/sandboxes/providers/langsmith.py`) and the migrated `mda/agent.py` Managed Deep Agents runtime.
- **Integration Recommendation:** Do not integrate Open SWE as a monolithic engine due to Python 3.14, proprietary vendored SDK licensing, and LangSmith cloud dependency locks. Adapt its multi-agent graph workflows (Agent $\rightarrow$ Reviewer $\rightarrow$ Merge Queue) into DEVFORCE.

---

## 6. OpenAI Codex (`openai/codex`)
*Alternative Coding Runtime*

### 6.1 Source Code & Architecture
The official repository for the OpenAI Codex CLI and local execution engine:
- Monorepo with **Rust** (`codex-rs`, 5,944 `.rs` files) and **TypeScript** (`codex-cli`, `sdk/typescript`):
  - `codex-rs/sandboxing/`: Low-level OS kernel isolation.
  - `codex-rs/app-server/`: Background daemon communicating over Unix Domain Sockets (UDS) and JSON-RPC.
  - `codex-rs/rmcp-client/`: High-performance Rust Model Context Protocol (MCP) client.
  - `codex-rs/apply-patch/`: Blazing fast patch parsing and AST-aware hunk application.
  - `codex-rs/tui/`: Ratatui-based terminal interface.

### 6.2 Execution Isolation: Containerless OS Sandboxing
OpenAI Codex provides the most advanced native OS sandboxing discovered in this research:
- **Linux:** Utilizes Bubblewrap (`bwrap`) to create unprivileged user namespaces with read-only root filesystems, isolated tmpfs mounts, and network namespace restrictions, alongside Linux Landlock LSM sandboxing (`landlock.rs`) for robust in-process filesystem access enforcement.
- **Windows:** Leverages native Windows Sandbox APIs (`windows-sandbox-rs`).
- **macOS:** Implements `sandbox-exec` / Apple Seatbelt profiles restricting filesystem mutations strictly to the target repository directory.

### 6.3 Licence, Dependencies & Model Support
- **Licence:** Apache-2.0 License (OpenAI 2025).
- **Build Requirements:** Rust toolchain (`rust-toolchain.toml`), Bazel (`MODULE.bazel`), Node.js/pnpm.
- **Model Provider Ecosystem & Local OSS Support:** Codex is **not** locked strictly to OpenAI cloud APIs. In addition to OpenAI API endpoints (`gpt-4o`, `o1`, `o3-mini`, `codex-mini`), it possesses first-class native support for local open-source models via Ollama (`codex-rs/ollama/`) and LM Studio (`codex-rs/lmstudio/`), enabled via the `--oss` CLI flag (with `DEFAULT_OSS_MODEL = "gpt-oss:20b"` / `"openai/gpt-oss-20b"`). Direct third-party cloud routing (e.g. Anthropic Claude via LiteLLM) is not natively implemented.
- **Integration Recommendation:** Highly capable high-performance alternative coding runtime for enterprise deployments using OpenAI models or local self-hosted open-weights models (via Ollama/LM Studio with `--oss`).

---

## 7. Cline (`cline/cline`)
*Alternative Coding Runtime*

### 7.1 Source Code & Architecture
Cline is an autonomous coding agent written in TypeScript (2,686 `.ts`, 815 `.tsx` files), built on **Bun**:
- `sdk/packages/core/`: Headless agent execution core (`ClineCore.ts`).
- `sdk/packages/agents/`: Subagent personas and workflow delegates.
- `sdk/packages/llms/`: Exhaustive multi-model provider adapter.
- `sdk/packages/sdk/`: Standalone npm package for embedding Cline into NodeJS/Bun applications.
- `apps/cli/`: Headless terminal interface.
- `apps/vscode/`: Visual Studio Code extension.

### 7.2 Agent Execution & Task Management
- **Autonomous ReAct Loop:** Executes tool calls, observes standard output/errors, and iterates until the goal is achieved.
- **Agenda Task Manager:** Driven by `agenda-task-manager.ts` (`sdk/packages/core/src/tasks/agenda-task-manager.ts`), an SQLite-persisted autonomous workflow engine featuring live file watching that dynamically breaks user instructions into checklists and reacts to filesystem modifications in real time.
- **MCP Ecosystem:** Extensive Model Context Protocol client support allowing dynamic tool expansion.

### 7.3 Model Provider Flexibility
Cline has the most comprehensive native TypeScript provider suite (`@cline/llms`):
- Anthropic Claude (with prompt caching), OpenAI, AWS Bedrock, Google Vertex / Gemini, Ollama, OpenRouter, DeepSeek, Mistral, Grok, LM Studio.

### 7.4 Licence, Dependencies & Security Limitations
- **Licence:** Apache-2.0 License (Copyright 2026 Cline Bot Inc.).
- **Dependencies & Engine Constraints:** Strictly specifies Bun 1.4.2 and Node.js `>=22`, managed via `bun` workspaces.
- **Isolation Limitations:** By default, Cline executes commands directly on the host machine using Node/Bun child processes. It relies on **user approval dialogs** rather than sandboxing. If run in automated "headless" mode without external containers, it presents arbitrary command execution risks.
- **Integration Recommendation:** Excellent reference for TypeScript-first tool calling, agenda management, and multi-provider LLM adapters.

---

## 8. Architectural Comparison & Synthesis

| Repository | Primary Language | License | Primary Role in DEVFORCE | Strengths | Vulnerabilities & Risks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenHands** | Python (>=3.12) / TS | MIT (2025/2026) | **Primary Coding Runtime** | Event-sourced, Docker/K8s sandboxing, FastAPI/WebSocket, ACP/MCP | Large monorepo, active refactoring between SDK & UI |
| **MetaGPT** | Python (>=3.9, <3.12) | MIT | **Planning Reference** | SOP role decomposition, structured PRD/architecture schemas | Direct host execution, python <3.12 conflict with OpenHands |
| **Paperclip** | TypeScript / Node | MIT | **Workforce Management Reference** | Org chart, reporting lines, budgets, native ACP (`acpx-engine`), BYOA | Offloads execution sandboxing to external runners |
| **SWE-agent** | Python (>=3.11) | MIT | **Debugging Research** | Token-efficient ACI tools, swerex Docker isolation | Single-task issue loop, not a multi-agent team engine |
| **Open SWE** | Python (>=3.14) / TS | MIT / Proprietary vendored code | **Workflow Research** | LangGraph cyclic workflows, MDA architecture (`mda/agent.py`) | Hard Python 3.14 lock, LangSmith cloud dependency, vendor license disclaimer |
| **OpenAI Codex** | Rust / TypeScript | Apache-2.0 | **Alternative Runtime** | Native OS sandboxing (Bubblewrap & Landlock LSM), local OSS models via Ollama/LM Studio (`--oss`), fast | Complex Bazel/Rust build, lacks Anthropic cloud adapter |
| **Cline** | TypeScript / Bun (1.4.2 / Node >=22) | Apache-2.0 (2026 Cline Bot Inc.) | **Alternative Runtime** | Headless SDK, SQLite-persisted agenda task manager with live file watching, multi-provider | No native container sandbox; relies on prompt approval |

---

## 9. Final Integration Recommendation for XEROVA AI DEVFORCE

Based on source code analysis, the recommended target architecture for XEROVA AI DEVFORCE is a **Four-Tier Hybrid Architecture**:

1. **Managerial Tier (Adopt Paperclip Architecture):**  
   Implement the organizational hierarchy, agent employee personas, issue delegation, budget tracking, and human-in-the-loop approval workflows based on Paperclip's TypeScript control plane. Standardize subagent orchestration via Paperclip's native Agent Client Protocol (ACP) engine (`packages/adapter-utils/src/acpx-engine`), cleanly linking Paperclip's managerial plane to OpenHands ACP agents without custom protocol shims.

2. **Specialist Planning Tier (Adopt MetaGPT SOP Paradigms):**  
   Port MetaGPT's Standard Operating Procedure (SOP) role contracts into DEVFORCE. Before any code is generated, run specialized agents:
   - `ProductManagerAgent` $\rightarrow$ Generates structured PRD.
   - `ArchitectAgent` $\rightarrow$ Generates system design, API schemas, and component structure.
   - `ProjectManagerAgent` $\rightarrow$ Compiles task dependency graphs.

3. **Core Coding Runtime (Adopt OpenHands SDK as Primary Engine):**  
   Standardize on `openhands-sdk`, `openhands-workspace`, and `openhands-tools`:
   - Run the agent execution loop on OpenHands' event-sourced architecture.
   - Utilize OpenHands' Docker container and Kubernetes `agent-sandbox` runners to guarantee complete execution isolation.
   - Support ACP and MCP protocols for tool and IDE interoperability.
   - Expose the FastAPI / WebSocket server for programmatic multi-agent orchestration.

4. **Secondary / Specialized Runtimes:**  
   - Incorporate **SWE-agent's ACI command set** (`scroll_up`, `scroll_down`, `edit_lines`) into the OpenHands tool catalog to optimize token consumption during debugging tasks.
   - Support **OpenAI Codex** as an optional high-performance execution engine for secure enterprise environments requiring Bubblewrap and Landlock LSM OS sandboxing, supporting both OpenAI models and local open-source models via Ollama/LM Studio (`--oss`).
   - Utilize **Open SWE's LangGraph review flow** pattern for PR review and merge queue gatekeeping.
