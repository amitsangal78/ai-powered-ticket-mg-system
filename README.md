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

Open **two terminals**.

### Backend API

```bash
cd backend
npm run dev
# → http://localhost:3000
# Health: GET http://localhost:3000/api/health → { "status": "ok" }
```

### Frontend SPA

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

Log in with a seed user above. Ensure `FRONTEND_ORIGIN` matches the Vite URL and `VITE_API_URL` points at the API.

### Tests

```bash
# Backend — Vitest + Supertest (includes state-machine integration tests)
cd backend && npm test

# Frontend — Vitest + React Testing Library
cd frontend && npm test
```

### Production-style build (optional)

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

---

## Project structure (overview)

```
ai-powered-ticket-mg-system/
├── backend/                      # Express API, migrations, seed, tests
├── frontend/                     # React SPA
├── docs/                         # raw-requirements, design-notes, …
├── tool-specific/cursor-workflow/  # project-context, spec, tasks, …
├── .cursor/rules/                # coding standards (must follow)
├── tool-workflow.md              # Part A — how Cursor is used
└── README.md
```

See [`docs/design-notes.md`](docs/design-notes.md) for architecture diagrams and [`tool-specific/cursor-workflow/spec.md`](tool-specific/cursor-workflow/spec.md) for full requirements.

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

## License / exercise note

Built for an internal AI capability exercise — feedback focuses on workflow and ownership as much as on a running app.
