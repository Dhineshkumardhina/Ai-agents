# XEROVA AI DEVFORCE — Development Architecture Document
**System Name:** XEROVA AI DEVFORCE  
**Document Code:** XAD-ARCH-DEV-006  
**Version:** 1.0.0  
**Phase:** 1A — Complete Project Initialization  
**Author:** Principal Software Architect & AI Agent Systems Engineer  
**Date:** March 2026  
**Status:** Approved for Implementation  

---

## 1. Development Architecture Overview

This document defines the operational architecture and engineering standards for developers contributing to **XEROVA AI DEVFORCE**. DEVFORCE is constructed as a decoupled monorepo adhering strictly to clean architecture principles:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   XEROVA AI DEVFORCE MONOREPO                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  frontend/        React 19 + TypeScript (Strict) + Vite 6 + Tailwind CSS v4 + React Router v7   │
│  backend/         Python 3.12+ + FastAPI + Pydantic v2 + SQLAlchemy 2.0 (asyncpg) + Alembic     │
│  infrastructure/  Dockerfiles, Nginx configurations, Sandbox base images, compose definitions   │
│  scripts/         Cross-platform dev and verification scripts (PowerShell & Bash)               │
│  docs/            Architecture blueprints, domain models, research matrices, and security specs │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Local Environment Requirements & Toolchains

| Component | Minimum Version | Verified Active Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10/11 (WSL2), Linux, or macOS | Windows 11 with WSL2 Ubuntu | Host developer environment |
| **Python** | `>= 3.12` | Python 3.14.7 | FastAPI backend, Alembic, Pytest |
| **Node.js** | `>= 22` | Node.js v24.21.0 | Frontend build toolchain, Vitest |
| **npm** | `>= 10` | npm 11.19.0 | Frontend package management |
| **PostgreSQL** | `>= 16.0` | PostgreSQL 18.6 (WSL2) / Docker Compose | Relational persistence with `pgvector` |
| **Docker** | `>= 24.0` | Docker 29.8.2 / Compose v5.5.1 | Isolated execution sandboxes & container services |

---

## 3. Backend Development Architecture

### 3.1 Async-First Architecture
The backend is built around Python's native `asyncio` event loop:
- All database I/O is performed via asynchronous SQLAlchemy 2.0 with the `asyncpg` driver.
- Route handlers must use `async def` and `await` all asynchronous operations.
- Direct synchronous blocking calls (e.g. `time.sleep()`, synchronous `requests`, or raw blocking file I/O) are strictly forbidden in route handlers.

### 3.2 Structured Logging & Observability
All logging is channeled through `app.core.logging.logger`:
- Emits single-line structured JSON logs with ISO 8601 timestamps, log level, module, line number, and contextual extra attributes (`extra={"extra_data": {...}}`).
- Production and test environments automatically serialize all logs to structured JSON.

### 3.3 Centralized Exception Handling
- Domain exceptions extend `app.core.exceptions.AppException`.
- All unhandled exceptions and validation errors are intercepted by global handlers and transformed into standard JSON response envelopes:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project with id '...' does not exist.",
    "details": null
  }
}
```

### 3.4 API Versioning & Endpoints
- **Root Health:** `GET /health` — lightweight response for load balancer and Docker health probes.
- **Versioned API:** `GET /api/v1/health` — comprehensive system health check performing real-time database latency measurement.
- All subsequent business domain routers are aggregated under `app/api/v1/router.py`.

---

## 4. Frontend Development Architecture

### 4.1 Strict TypeScript & Bundler Configuration
The frontend enforces strict TypeScript safety:
- `"strict": true`
- `"noImplicitAny": true`
- `"strictNullChecks": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noUncheckedIndexedAccess": true`

Code must pass `tsc -b` with zero type errors before any commit or PR merge.

### 4.2 State Management Separation of Concerns
1. **Server State (TanStack Query v5):** All API fetches, cache invalidations, and real-time polling intervals are handled via TanStack Query hooks (e.g. `useHealthCheck`).
2. **Client State (Zustand):** Pure client UI state (sidebar toggles, active modal overlays, transient filters) is stored in Zustand stores (`useAppStore`).
3. **No Fabricated Data:** Frontend components render exact data payloads returned by the API or WebSocket stream; synthetic progress delays and fake progress indicators are prohibited.

---

## 5. Verification Architecture & Testing Standards

DEVFORCE adheres to empirical verification across all layers:

### 5.1 Backend Verification (Pytest)
```bash
cd backend
python -m pytest
```
- Tests reside in `backend/tests/`.
- Shared async test fixtures and ASGI test clients are defined in `conftest.py`.
- Tests run with `asyncio_mode = auto` and `filterwarnings = ignore::DeprecationWarning`.

### 5.2 Frontend Verification (Vitest & React Testing Library)
```bash
cd frontend
npm run test
```
- Component unit tests reside in `src/test/` or next to components (`*.test.tsx`).
- Runs in `jsdom` environment with `@testing-library/jest-dom` assertions.

### 5.3 End-to-End Verification (Playwright)
```bash
cd frontend
npm run test:e2e
```
- End-to-end user journey tests reside in `frontend/e2e/`.
- Validates real rendering, client-side routing, and DOM assertions.

---

## 6. Docker & Container Infrastructure

DEVFORCE services are declared in `docker-compose.yml`:
- **`postgres`:** Uses `pgvector/pgvector:pg16` with healthcheck probe `pg_isready`.
- **`backend`:** Builds from `infrastructure/docker/backend.Dockerfile`, depends on healthy postgres.
- **`frontend`:** Multi-stage build (`infrastructure/docker/frontend.Dockerfile`) served via Nginx reverse proxy routing `/api/`, `/health`, and `/ws/` to the backend.

To validate compose syntax:
```bash
docker compose config
```

To run with Docker:
```bash
docker compose up -d
```

