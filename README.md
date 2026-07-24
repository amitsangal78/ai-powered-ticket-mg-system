# AI-Powered Support Ticket Management System

Internal full-stack **Support Ticket Management System** built as the Backend-Heavy option of an AI Capability Exercise. Authenticated agents and admins create, update, comment on, search, and progress tickets through an **enforced status lifecycle**, with PostgreSQL persistence and integration tests for the state machine.

This project was planned and is implemented with **Cursor Pro** using Spec-Driven Development (`tool-specific/cursor-workflow/`) and **strictly follows the coding standards in [`.cursor/rules/`](.cursor/rules/)**.

| Rule file | Focus |
|-----------|--------|
| [`coding-standards.mdc`](.cursor/rules/coding-standards.mdc) | Architecture overview, auth-in-scope, API/UX summary |
| [`nodejs-backend-patterns.mdc`](.cursor/rules/nodejs-backend-patterns.mdc) | Express middleware, auth, rate limits, services |
| [`database-standards.mdc`](.cursor/rules/database-standards.mdc) | Schema, migrations, `pg`, seed |
| [`typescript-strict.mdc`](.cursor/rules/typescript-strict.mdc) | Zod types, strict TS, wire formats |
| [`react19-standards.mdc`](.cursor/rules/react19-standards.mdc) | Zustand, React 19 patterns, routing |
| [`tailwind-standards.mdc`](.cursor/rules/tailwind-standards.mdc) | Tailwind CSS 4 utilities & UI maps |

Do not introduce patterns that conflict with these rules (e.g. Prisma/Kysely, `{ success: true }` envelopes, client-authoritative status transitions, or `dangerouslySetInnerHTML` for ticket content).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, TypeScript 5.x, Zustand 5, React Router, Tailwind CSS 4 |
| Backend | Node.js 22, Express 5, TypeScript 5.x, Zod, `pg`, Pino, Helmet, CORS |
| Database | PostgreSQL (UUID PKs, `pgcrypto`, `pg_trgm` + `ILIKE` search) |
| Auth | JWT (Bearer), bcrypt (cost 12), roles `agent` \| `admin` |
| Tests | Backend: Vitest + Supertest · Frontend: Vitest + React Testing Library |

---

## Prerequisites

- **Node.js 22** (see `.nvmrc` when present)
- **PostgreSQL** 14+ (local or Docker)
- npm (or compatible package manager)

---

## Setup instructions

### 1. Clone and install

```bash
cd ai-powered-ticket-mg-system

# Backend
cd backend
cp .env.example .env   # create from example when available
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
cd ..
```

### 2. Configure environment

**Backend** (`backend/.env`) — required values (validated with Zod at boot):

| Variable | Example | Notes |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/tickets` | PostgreSQL connection string |
| `JWT_SECRET` | long random string (≥ 32 chars) | Required |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowlist |
| `PORT` | `3000` | API port (default 3000) |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |

**Frontend** (`frontend/.env`):

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `http://localhost:3000` |

Never commit real `.env` files or secrets.

### 3. Database — migrate & seed

Create an empty database, then from `backend/`:

```bash
cd backend
npm run migrate    # apply-once migrations in backend/migrations/
npm run seed       # idempotent admin + agent users (bcrypt at runtime)
```

Migrations and seed follow [`.cursor/rules/database-standards.mdc`](.cursor/rules/database-standards.mdc).

---

## Default credentials

Documented here only (not in source comments). Change before any shared or production-like deployment.

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `Admin123!` | `admin` |
| `agent@example.com` | `Agent123!` | `agent` |

---

## How to run

Open **two terminals** for host-based Node, **or** use Docker for API + Postgres.

### Backend API (host)

```bash
cd backend
npm run dev
# → http://localhost:3000
# Health: GET http://localhost:3000/api/health → { "status": "ok" }
# OpenAPI: http://localhost:3000/api/docs
```

### Frontend SPA (host)

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

Log in with a seed user above. Ensure `FRONTEND_ORIGIN` matches the Vite URL and `VITE_API_URL` points at the API.

### Docker (Postgres + backend)

Local stack for API + database (frontend still runs on the host with Vite by default):

```bash
# From repo root
cp .env.example .env   # optional overrides; defaults work for local compose

docker compose up --build
# API  → http://localhost:3000
# Docs → http://localhost:3000/api/docs
# DB   → localhost:5432 (user/pass/db: postgres/postgres/tickets)
```

On first start the backend container **migrates** and **seeds** admin/agent users, then listens.

```bash
# Stop
docker compose down

# Stop and wipe DB volume
docker compose down -v
```

If host port **5432** is already taken by a local Postgres:

```bash
POSTGRES_PORT=5433 docker compose up --build
```

Point a host-run frontend at the container API with `VITE_API_URL=http://localhost:3000`.

Images do **not** bake in secrets — `DATABASE_URL` / `JWT_SECRET` come from Compose environment (see `.env.example`).

### Tests

```bash
# Backend — Vitest + Supertest (includes state-machine integration tests)
cd backend && npm test

# Frontend — Vitest + React Testing Library
cd frontend && npm test
```

CI (GitHub Actions): [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck + tests for backend and frontend. Backend jobs use a **Postgres 16** service (`tickets_test`).

### Production-style build (optional)

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

---

## Project structure (overview)

```
ai-powered-ticket-mg-system/
├── backend/                        # Express API, migrations, seed, Dockerfile
├── frontend/                       # React SPA
├── database/                       # DB setup docs (README)
├── docker-compose.yml              # Local Postgres + backend
├── .github/workflows/ci.yml        # CI with Postgres service
├── docs/                           # raw-requirements, design-notes, reflection, PR, review
├── tool-specific/cursor-workflow/  # project-context, spec, tasks, acceptance, rules guide
├── .cursor/rules/                  # coding standards (must follow on every change)
├── tool-workflow.md                # Part A — how Cursor + rules are used
└── README.md
```

See [`docs/design-notes.md`](docs/design-notes.md) for architecture diagrams and [`tool-specific/cursor-workflow/spec.md`](tool-specific/cursor-workflow/spec.md) for full requirements. Every implementation change must stay compatible with [`.cursor/rules/`](.cursor/rules/).

---

## Status machine (Core)

```
Open         → In Progress | Cancelled
In Progress  → Resolved    | Cancelled
Resolved     → Closed
Closed / Cancelled → (terminal)
```

Invalid transitions are rejected by the backend with **409**; the UI shows an inline error without a full reload. Status changes go only through `TicketStatusService` / `PATCH /api/tickets/:id/status`.

---

## Documentation & exercise artifacts

All planning and lifecycle artifacts reference **how** code must be written via [`.cursor/rules/`](.cursor/rules/).

| Artifact | Path |
|----------|------|
| Part A — Cursor workflow | [`tool-workflow.md`](tool-workflow.md) |
| Project context / spec / tasks | [`tool-specific/cursor-workflow/`](tool-specific/cursor-workflow/) |
| Acceptance checklist (FR → tests → rules) | [`tool-specific/cursor-workflow/acceptance-criteria.md`](tool-specific/cursor-workflow/acceptance-criteria.md) |
| How `.cursor/rules/` are used | [`tool-specific/cursor-workflow/cursor-rules-or-instructions.md`](tool-specific/cursor-workflow/cursor-rules-or-instructions.md) |
| Design notes | [`docs/design-notes.md`](docs/design-notes.md) |
| Reflection | [`docs/reflection.md`](docs/reflection.md) |
| PR description | [`docs/pr-description.md`](docs/pr-description.md) |
| Code review notes | [`docs/code-review-notes.md`](docs/code-review-notes.md) |
| Database setup | [`database/README.md`](database/README.md) |
| Backend API | [`backend/README.md`](backend/README.md) |
| Frontend SPA | [`frontend/README.md`](frontend/README.md) |

---

## License / exercise note

Built for an internal AI capability exercise — feedback focuses on workflow and ownership as much as on a running app.
