# License and Dependency Audit
**Project:** XEROVA AI DEVFORCE  
**Phase:** 0A — Architectural Investigation and Source-Level Evaluation  
**Author:** Principal AI Systems Architect  
**Date:** March 2026  
**Status:** Complete  

---

## 1. Executive Summary

This audit evaluates the licensing terms, dependency trees, language compatibility boundaries, security vulnerability surfaces, and vendor lock-in risks across the seven investigated open-source agent repositories:

1. **OpenHands** (`All-Hands-AI/OpenHands` & `OpenHands/software-agent-sdk`)
2. **MetaGPT** (`FoundationAgents/MetaGPT`)
3. **Paperclip** (`paperclipai/paperclip`)
4. **SWE-agent** (`SWE-agent/SWE-agent`)
5. **Open SWE** (`langchain-ai/open-swe`)
6. **OpenAI Codex** (`openai/codex`)
7. **Cline** (`cline/cline`)

All seven repositories utilize highly permissive open-source licenses (**5 MIT, 2 Apache-2.0**). There are **no copyleft (GPL, AGPL, LGPL)** licensing hazards that would force DEVFORCE to open-source proprietary components. However, significant dependency conflicts, runtime version disparities, and external vendor dependencies exist across the repositories.

---

## 2. Verified License Matrix

| Repository | Declared License | Copyright Holder(s) | Commercial Use | Modification & Distribution | Patent Grant | Attribution Required | Copyleft / Viral Terms |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenHands** | **MIT** | Copyright (c) 2025 OpenHands contributors (`OpenHands`);<br>Copyright (c) 2026 OpenHands contributors (`software-agent-sdk`) | **Permitted** | Permitted | Implicit | Yes (retain copyright notice) | None |
| **MetaGPT** | **MIT** | Copyright (c) 2024 Chenglin Wu | **Permitted** | Permitted | Implicit | Yes (retain copyright notice) | None |
| **Paperclip** | **MIT** | Copyright (c) 2025 Paperclip AI | **Permitted** | Permitted | Implicit | Yes (retain copyright notice) | None |
| **SWE-agent** | **MIT** | Copyright (c) 2024 John Yang, Carlos E. Jimenez, Alexander Wettig, Shunyu Yao, Karthik Narasimhan, Ofir Press | **Permitted** | Permitted | Implicit | Yes (retain copyright notice) | None |
| **Open SWE** | **MIT** (Root) | Copyright (c) LangChain, Inc.<br>(*Proprietary vendor disclaimer in `vendor/README.md`*) | **Permitted** (Root only) | Permitted (Root only) | Implicit | Yes (retain copyright notice) | Proprietary terms on vendored `managed-deepagents-sdk` |
| **OpenAI Codex** | **Apache-2.0** | Copyright 2025 OpenAI (Notice: includes code from Ratatui, MIT) | **Permitted** | Permitted | **Explicit (Section 3)** | Yes (NOTICE file & copyright) | None |
| **Cline** | **Apache-2.0** | Copyright 2026 Cline Bot Inc. | **Permitted** | Permitted | **Explicit (Section 3)** | Yes (copyright notice) | None |

### Legal Assessment & IP Compliance:
1. **Commercial Exploitation:** Both MIT and Apache-2.0 licenses permit commercial use, proprietary relicensing of derivative works, private deployment, and closed-source SaaS hosting.
2. **Attribution Obligations:** All source files, SDKs, or prompts adapted from any of these repositories must preserve the original copyright notice in documentation or license attribution files (`NOTICE` / `THIRD_PARTY_LICENSES.md`).
3. **Apache 2.0 Patent Grant:** Both OpenAI Codex and Cline provide an explicit patent grant (Section 3 of Apache-2.0), protecting DEVFORCE against patent infringement claims by contributors for code incorporated from their repositories.
4. **Vendored Code Licensing Hazard (Open SWE):** As revealed in `OpenSWE/vendor/README.md`, the vendored `managed-deepagents-sdk` is accompanied by an explicit reservation ("Vendoring grants no license to use, modify, or distribute outside the terms of the proprietary Managed Deep Agents agreement"). Incorporating Open SWE's live agent dependencies into DEVFORCE carries proprietary licensing liabilities.

---

## 3. Dependency & Environment Compatibility Audit

| Repository | Primary Runtime | Minimum Engine Version | Package Manager | Package Count (Direct) | Workspace Architecture | Critical Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenHands** | Python (Backend)<br>Node.js (Canvas UI) | Python `>=3.12`<br>Node.js `>=24` | `uv`<br>`npm` / `pnpm` | ~25 direct Python<br>~35 direct TS | 4-package uv workspace monorepo | `litellm==1.105.1`, `fastmcp>=4.0.3`, `fastapi>=0.104`, `pydantic>=2.13.5`, `docker>=7.2.0`, `agent-client-protocol` |
| **MetaGPT** | Python | Python `>=3.9, <3.12`<br>(`setup.py` enforced conflict) | `pip` / `setuptools` | ~60 direct Python | Monolithic flat package | `aiohttp==3.8.6`, `pandas==2.1.1`, `numpy~=1.26.4`, `faiss_cpu==1.7.4`, `lancedb==0.4.0`, `grpcio~=1.67.0`, `ta==0.10.2` |
| **Paperclip** | TypeScript / Node.js | Node.js `>=24.11` | `pnpm` (v10) | ~40 direct TS | Multi-package pnpm workspace + Turbo | `postgres@3.4.9`, `embedded-postgres@18.1.0-beta.16`, `fastify`, `react@19.2.8`, `@agentclientprotocol/claude-agent-acp: 0.73.0`, `@agentclientprotocol/codex-acp: 1.6.2` |
| **SWE-agent** | Python | Python `>=3.11` | `pip` / `setuptools` | ~20 direct Python | Single Python package | `swe-rex>=1.4.0`, `litellm>=1.44.12`, `pydantic`, `GitPython`, `ghapi`, `flask`, `docker` |
| **Open SWE** | Python (Backend)<br>TypeScript (UI) | Python `>=3.14`<br>Node.js `>=26` | `uv`<br>`pnpm` (v11) | ~35 direct Python<br>~25 direct TS | Hybrid uv + pnpm workspace | `managed-deepagents>=0.10.1` (vendored proprietary SDK), `langgraph>=1.2.20`, `langsmith>=0.14.17`, `fastapi` |
| **OpenAI Codex** | Rust (Engine)<br>TypeScript (CLI) | Rust 2024 / MSRV 1.83+<br>Node.js `>=20` | Cargo<br>Bazel<br>`pnpm` | ~120 Rust crates<br>~15 TS packages | 40+ crate Cargo workspace + Bazel | `tokio`, `axum`, `ratatui`, `bubblewrap` (bwrap), `landlock` LSM, `windows-sandbox-rs`, `serde`, `rmcp-client`, Ollama & LM Studio clients |
| **Cline** | TypeScript / JavaScript | Bun `1.4.2`<br>Node.js `>=22` | `bun` (1.4.2) | ~30 direct TS | Multi-package Bun workspace | `@biomejs/biome`, `vitest`, `better-sqlite3` (agenda task manager), `@cline/llms`, MCP SDK |

---

## 4. Deep-Dive Security & Vulnerability Analysis

### 4.1 Host Execution Security & Sandbox Escape
- **MetaGPT (Severe Risk):** Executes code via local host subprocess without container isolation. If an LLM writes `os.system("rm -rf /")` or downloads malware, the host is compromised immediately.
- **Cline (Moderate Risk in Headless Mode):** Designed primarily as a desktop/VS Code extension requiring manual developer clicks to approve shell commands. If run in an autonomous headless CI/CD pipeline with auto-approval enabled, it executes commands directly on the host without sandboxing.
- **OpenHands & SWE-agent (Low Risk):** Enforces Docker container sandboxing. Commands are executed inside isolated container environments. However, host volume mounting must specify read-only permissions where appropriate, and Docker socket passthrough (`/var/run/docker.sock`) must be prohibited to prevent container escape.
- **OpenAI Codex (Very Low Risk):** Utilizes kernel-level Bubblewrap (`bwrap`) and Linux Landlock LSM sandboxing (`landlock.rs`) on Linux, Windows Sandbox APIs on Windows, and Seatbelt profiles on macOS. Provides fine-grained path whitelisting and network namespace isolation without heavy Docker daemons.

### 4.2 Known Vulnerabilities & Dependency Guardrails in Inspected Repositories
Source code inspection of `OpenHands-SDK/pyproject.toml` revealed proactive enterprise guardrails that DEVFORCE should adopt:
1. **eMudhra CA Distrust Vulnerability (GHSA-6q48-6c7w-9gw2):** OpenHands explicitly pins `certifi>=2026.10.19` and `pip>=2026.10.21` to block untrusted certificates.
2. **Rich Library Denial-of-Service Vulnerability (#3958):** OpenHands enforces `rich>=14.3.3` to avoid a critical regex DOS vulnerability in Rich 14.3.2.
3. **LiteLLM / MCP Importer Incompatibility (#6088):** OpenHands restricts LiteLLM to `<1.106` because LiteLLM 1.106+ introduced a breaking MCP 2.x import error when MCP 1.x is present.
4. **Dependency Age Guardrail:** OpenHands configures `uv` with `exclude-newer = "7 days"` to shield against immediate supply-chain package hijacking on PyPI.

### 4.3 Secret Redaction & Credential Exposure
- **OpenHands:** Centralized secret exposure scanning is located in `openhands.sdk.security.analyzer` (`_secrets_exposure.py`), while automated secret redaction for persisted streams and logs is implemented in the agent server layer (`openhands-agent-server/openhands/agent_server/_secret_redaction.py`). All LLM event streams and logging outputs are scanned against known API key patterns (OpenAI, Anthropic, AWS, GitHub) before persistence or WebSocket broadcast.
- **Paperclip:** Implements `server/src/log-redaction.ts` and signed JWT bearer tokens for agent runs (`server/src/agent-auth-jwt.ts`), ensuring agents cannot impersonate administrative roles.

---

## 5. Commercial & Vendor Lock-in Audit

### 5.1 Open SWE (High Vendor Lock-in & Proprietary Licensing Hazard)
While the root repository is under the MIT License, deep architectural and licensing risks exist upon source inspection:
- **Proprietary Vendored SDK Disclaimer:** The vendored directory `OpenSWE/vendor/README.md` explicitly specifies for `managed-deepagents-sdk`: *"Vendoring grants no license to use, modify, or distribute outside the terms of the proprietary Managed Deep Agents agreement"*. Distributing or executing this code within DEVFORCE without a commercial agreement poses strict legal liability.
- **Agent Architecture Migration:** The legacy graph entrypoint `openswe.graphs.agent:traced_agent` is merely a 6-line read-only stub; production agent logic has migrated entirely to Managed Deep Agents (`mda/agent.py` using `managed_deepagents`).
- **Cloud Infrastructure Lock-in:** Sandbox execution is tightly coupled to LangSmith remote sandboxes (`openswe/sandboxes/providers/langsmith.py`).
- **Python Version Lock:** Requires Python `>=3.14` (`pyproject.toml` L6), preventing deployment on standard LTS distributions.
- **Audit Verdict:** Do not adopt Open SWE or its vendored SDK directly into DEVFORCE; extract only clean architectural graph flow designs.

### 5.2 OpenAI Codex (Moderate Model Scope & Native Local OSS Model Support)
- Source code in `codex-rs/` is **not** locked strictly to OpenAI APIs. In addition to first-class OpenAI cloud endpoints (`gpt-4o`, `o1`, `o3-mini`, `codex-mini`), Codex includes first-class native support for local open-source models via Ollama (`codex-rs/ollama/`) and LM Studio (`codex-rs/lmstudio/`) using the `--oss` flag (`DEFAULT_OSS_MODEL = "gpt-oss:20b"` / `"openai/gpt-oss-20b"`).
- While direct third-party cloud routing (such as Anthropic Claude via LiteLLM) is not natively implemented without external adapters, local open-source model execution is fully supported out-of-the-box.
- **Audit Verdict:** Highly viable high-performance alternative runtime for OpenAI-backed enterprise environments and offline/local open-source model deployments.

### 5.3 OpenHands, Paperclip, and Cline (Zero Vendor Lock-in)
- **OpenHands:** Fully self-hosted, supports any LLM provider via LiteLLM, uses open Docker containers or local environments, zero proprietary cloud service dependencies.
- **Paperclip:** Fully self-hosted, embedded or external PostgreSQL, Bring-Your-Own-Agent (BYOA) architecture.
- **Cline:** Fully self-hosted, multi-provider TypeScript LLM adapter (`@cline/llms`).

---

## 6. Supply Chain & Packaging Strategy for DEVFORCE

To prevent dependency conflicts and supply chain contamination, DEVFORCE must enforce the following rules:

1. **No Monolithic Repo Ingestion:** Do not clone external repositories into the DEVFORCE codebase.
2. **Decoupled Python / TypeScript Architecture & Runtime Isolation:**
   - **Control Plane & Workforce Tier:** Built in TypeScript / Node.js (inspired by Paperclip), managing state in PostgreSQL. Standardizes subagent orchestration with native Agent Client Protocol (ACP) via `@agentclientprotocol/claude-agent-acp: 0.73.0` and `@agentclientprotocol/codex-acp: 1.6.2` (`packages/adapter-utils/src/acpx-engine`), perfectly mating with OpenHands ACP agents. Chat channels and connectors reside cleanly in server services (`server/src/services/chat-channels/` and `connectors/`).
   - **Agent Execution Engine:** Built in Python `>=3.12` utilizing `openhands-sdk`, `openhands-tools`, and `openhands-workspace` packages as clean library dependencies via `uv`.
   - **Strict Python Boundary Isolation:** MetaGPT's `setup.py` enforces `python_requires=">=3.9, <3.12"`, which creates a fatal mutual runtime conflict with OpenHands' `python_requires=">=3.12"`. Under no circumstances should MetaGPT be installed in the DEVFORCE Python runtime; only its Pydantic schemas and SOP prompts should be ported.
3. **Execution Isolation:** Never execute agent-generated code on the host machine. All code execution must occur inside ephemeral Docker containers (via `openhands-workspace`) or OS sandboxes (via Bubblewrap and Linux Landlock LSM).
4. **Supply Chain Guardrails:** Replicate OpenHands' `uv.toml` guardrails:
   ```toml
   [tool.uv]
   exclude-newer = "7 days"
   constraint-dependencies = [
       "certifi>=2026.10.19",
       "rich>=14.3.3",
       "pydantic>=2.13.5",
       "fastapi>=0.104",
   ]
   ```
5. **Licensing Compliance File:** Maintain a `THIRD_PARTY_NOTICES.md` acknowledging the MIT licenses of OpenHands, Paperclip, MetaGPT, SWE-agent, and Open SWE, and the Apache-2.0 licenses of OpenAI Codex and Cline.
