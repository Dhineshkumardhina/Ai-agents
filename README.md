# XEROVA AI DEVFORCE

> **Autonomous Multi-Agent Software Engineering Workforce Platform**  
> Empirical Execution • Isolated Container Sandboxing • Zero-Trust Governance

---

## 1. Overview

**XEROVA AI DEVFORCE** is an enterprise multi-agent software engineering workforce platform. DEVFORCE models an elite engineering department consisting of specialized AI agents—Product Managers, Lead Architects, Staff Engineers, QA Automation Specialists, and DevOps Engineers. 

DEVFORCE operates as an independent, modular system that plans, decomposes, executes, tests, verifies, and delivers production-grade software within isolated Docker sandboxes—backing every change with empirical execution evidence.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 19
- **Language:** TypeScript 5.8+ (Strict mode)
- **Tooling & Bundler:** Vite 6
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Server State:** TanStack Query v5
- **Client State:** Zustand v5
- **Unit Testing:** Vitest 3 + React Testing Library + jsdom
- **E2E Testing:** Playwright

### Backend
- **Runtime:** Python 3.12+ (Tested on Python 3.14)
- **Framework:** FastAPI
- **Data Validation:** Pydantic v2 & Pydantic-Settings
- **ORM:** SQLAlchemy 2.0 (Asyncio)
- **Database Driver:** `asyncpg`
- **Migrations:** Alembic
- **Unit Testing:** Pytest + Pytest-Asyncio + HTTPX

### Database & Infrastructure
- **Database:** PostgreSQL 16+ with `pgvector`
- **Orchestration:** Docker Compose
- **Sandboxing:** Docker Engine SDK (Ephemeral non-root execution containers)
- **Reverse Proxy:** Nginx (in production Docker containers)

---

## 3. Project Directory Structure

```
.
├── .env.example                     # Environment variable template
├── .env                             # Local development environment configuration
├── docker-compose.yml               # Multi-service container orchestration
├── README.md                        # Platform documentation & setup guide
├── backend/                         # FastAPI Python Backend
│   ├── alembic.ini                  # Alembic migration configuration
│   ├── pyproject.toml               # Python project configuration & pytest settings
│   ├── requirements.txt             # Direct dependencies
│   ├── alembic/                     # Database migration scripts
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py        # API v1 router aggregation
│   │   │       └── endpoints/
│   │   │           └── health.py    # System & database health probes
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic BaseSettings configuration
│   │   │   ├── logging.py           # Structured JSON logging
│   │   │   └── exceptions.py       # Centralized exception handling & responses
│   │   ├── db/
│   │   │   ├── base.py              # SQLAlchemy DeclarativeBase
│   │   │   └── session.py           # Async sessionmaker & connection pool
│   │   └── schemas/
│   │       └── health.py            # Pydantic health request/response models
│   └── tests/
│       ├── conftest.py              # Shared async test fixtures
│       └── test_health.py           # Health endpoint test suite
├── frontend/                        # React 19 TypeScript Frontend
│   ├── package.json                 # Node.js dependencies & scripts
│   ├── tsconfig.json                # Strict TypeScript configuration
│   ├── vite.config.ts               # Vite 6 configuration & API reverse proxy
│   ├── vitest.config.ts             # Vitest unit test configuration
│   ├── playwright.config.ts         # Playwright E2E configuration
│   ├── index.html                   # HTML entrypoint
│   ├── src/
│   │   ├── main.tsx                 # React DOM mount point
│   │   ├── App.tsx                  # Root application component
│   │   ├── index.css                # Tailwind CSS v4 entrypoint
│   │   ├── app/
│   │   │   ├── providers.tsx        # TanStack QueryClientProvider wrapper
│   │   │   └── routes.tsx           # React Router v7 routes
│   │   ├── components/              # Layout and UI primitives
│   │   ├── hooks/                   # Custom React hooks (useHealthCheck)
│   │   ├── stores/                  # Zustand client stores
│   │   └── types/                   # TypeScript interfaces and API schemas
│   └── e2e/                         # Playwright end-to-end tests
├── docs/                            # Architectural Blueprints & Research
│   ├── architecture/
│   │   ├── SYSTEM_ARCHITECTURE.md
│   │   ├── DATABASE_ARCHITECTURE.md
│   │   ├── AGENT_ARCHITECTURE.md
│   │   ├── EXECUTION_ARCHITECTURE.md
│   │   ├── SECURITY_ARCHITECTURE.md
│   │   └── DEVELOPMENT_ARCHITECTURE.md
│   └── research/
│       ├── OPEN_SOURCE_RESEARCH.md
│       ├── REPOSITORY_INTEGRATION_MATRIX.md
│       └── LICENCE_AND_DEPENDENCY_AUDIT.md
├── infrastructure/                  # Containerization & Deployment
│   └── docker/
│       ├── backend.Dockerfile       # Backend container definition
│       ├── frontend.Dockerfile      # Multi-stage frontend container definition
│       └── nginx.conf               # Production reverse proxy configuration
└── scripts/                         # Cross-Platform Developer Scripts
    ├── dev.ps1                      # Start dev stack (PowerShell)
    ├── dev.sh                       # Start dev stack (Bash)
    ├── run_tests.ps1                # Run full test suite (PowerShell)
    └── run_tests.sh                 # Run full test suite (Bash)
```

---

## 4. Quickstart & Local Setup

### Prerequisites
- **Python:** `>= 3.12` (Python 3.14 verified)
- **Node.js:** `>= 22.0.0` (Node 24 verified)
- **npm:** `>= 10.0.0`
- **PostgreSQL:** `>= 16.0` (or Docker)
- **Docker & Docker Compose:** Optional for local dev, required for containerized deployment.

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```
Review `.env` to verify your PostgreSQL connection settings (`POSTGRES_HOST`, `POSTGRES_USER`, etc.).

### 2. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run test
npm run build
```

### 4. Running the Development Platform

Using PowerShell (Windows):
```powershell
.\scripts\dev.ps1
```

Using Bash (Linux / macOS / WSL):
```bash
./scripts/dev.sh
```

Or start individually:
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 5. Access Points
- **Mission Control UI:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Interactive Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **FastAPI ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **System Health Probe:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Root Health Probe:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 5. Running with Docker Compose

To validate and launch the entire stack via Docker:

```bash
# Validate compose syntax
docker compose config

# Build and start services in background
docker compose up -d

# Check service health
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/health
```

---

## 6. Testing & Quality Verification

Run the full cross-platform verification suite:

```powershell
.\scripts\run_tests.ps1
```
Or with Bash:
```bash
./scripts/run_tests.sh
```

- **Backend Unit Tests:** Pytest running against FastAPI endpoints with async database connectivity tests.
- **Frontend Unit Tests:** Vitest testing React 19 components and TanStack Query hooks.
- **Frontend Build:** Strict TypeScript compilation (`tsc -b`) and Vite production bundle.

---

## 7. Architectural Principles

1. **Independent Sovereignty:** Self-hosted platform with zero mandatory proprietary orchestrator lock-in.
2. **Deterministic Evidence:** Tasks are marked complete strictly through real exit codes and passing test runners.
3. **Zero Host Execution:** All agent-generated code runs in isolated Docker containers with non-root privileges.
4. **Zero Hardcoded Secrets:** Envelope encryption at rest; in-flight regex secret redaction.
5. **No Fabricated Data:** Zero fake loaders, simulated delays, or synthetic progress states.

