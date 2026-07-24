# Backend — Support Ticket Management System

Express 5 + TypeScript API for the Support Ticket Management System. PostgreSQL persistence via **`pg`**, Zod validation at the route boundary, JWT auth, and a dedicated `TicketStatusService` for the ticket lifecycle.

This package **strictly follows**:

| Rule | Path |
|------|------|
| Node / Express patterns | [`../.cursor/rules/nodejs-backend-patterns.mdc`](../.cursor/rules/nodejs-backend-patterns.mdc) |
| Database / SQL / seed | [`../.cursor/rules/database-standards.mdc`](../.cursor/rules/database-standards.mdc) |
| TypeScript / Zod wire types | [`../.cursor/rules/typescript-strict.mdc`](../.cursor/rules/typescript-strict.mdc) |

Also respect the overview in [`../.cursor/rules/coding-standards.mdc`](../.cursor/rules/coding-standards.mdc).

**Do not** use Prisma/Kysely, `{ success: true }` envelopes, `any`, `@ts-ignore`, sync crypto in the request path, or status updates outside `TicketStatusService`.

---

## Prerequisites

- Node.js **22**
- PostgreSQL **14+**
- npm

---

## Setup

```bash
cd backend
cp .env.example .env    # fill in values below
npm install

# Create an empty database, then:
npm run migrate         # apply-once SQL in migrations/
npm run seed            # idempotent admin + agent (bcrypt cost 12 at runtime)
npm run dev
```

### Environment (Zod-validated before listen)

Missing or invalid env → process exits with code `1`. **No hardcoded secret fallbacks.**

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Min **32** characters |
| `FRONTEND_ORIGIN` | yes | CORS allowlist (e.g. `http://localhost:5173`) |
| `PORT` | no | Default `3000` |
| `NODE_ENV` | no | `development` \| `test` \| `production` (default `development`) |

Example `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tickets
JWT_SECRET=replace-with-at-least-32-characters-long
FRONTEND_ORIGIN=http://localhost:5173
PORT=3000
NODE_ENV=development
```

### Seed credentials (README only — not in code comments)

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `Admin123!` | `admin` |
| `agent@example.com` | `Agent123!` | `agent` |

Point the frontend `VITE_API_URL` at this origin and `FRONTEND_ORIGIN` at the Vite URL so CORS succeeds.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start API in watch/dev mode |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server |
| `npm run migrate` | Apply pending migrations (`001`…`005`) once |
| `npm run seed` | Idempotent seed users (runtime bcrypt) |
| `npm test` | **Vitest + Supertest** (export `app` without listen) |
| `npm run typecheck` | `tsc --noEmit` with strict flags |

### OpenAPI / Swagger (FR-19)

| URL | Purpose |
|-----|---------|
| [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Swagger UI |
| [http://localhost:3000/api/openapi.yaml](http://localhost:3000/api/openapi.yaml) | Committed OpenAPI 3 YAML |
| [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json) | Same document as JSON |

Source file: [`openapi/openapi.yaml`](./openapi/openapi.yaml) — documents all implemented endpoints, Bearer JWT, and the `{ error, code, details? }` error shape.

### Testing notes

- Unit/API route tests mock services/repos where appropriate.
- **State-machine + broader API integration** suites use a real Postgres DB (`tickets_test` by default). Override with `TEST_DATABASE_URL` if needed (same credentials style as `DATABASE_URL`).
- Helpers under `src/__tests__/helpers/` create the DB if missing, migrate, seed admin/agent, and truncate tickets between cases.
- **Do not mock `TicketStatusService`** in state-machine integration tests (`stateMachine.integration.test.ts`).
- **Docker:** see repo-root `docker-compose.yml` and `backend/Dockerfile` (migrate + seed on container start).
- **CI:** `.github/workflows/ci.yml` provides Postgres 16 and sets `TEST_DATABASE_URL`.

---

## Architecture

### Layers (`nodejs-backend-patterns.mdc` + `coding-standards.mdc`)

```
Request
  → helmet → CORS → express.json(100kb) → pino → routes
  → Zod validate (route)
  → service (business logic)
  → repository (parameterized SQL + snake↔camel map)
  → PostgreSQL
```

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP + Zod only; call services |
| **Services** | Use-cases; `TicketStatusService` owns the status machine |
| **Repositories** | `pg` queries (`$1`, `$2`, …); explicit columns; **never** `SELECT *`; never return `password_hash` |
| **Middleware** | `authenticateToken`, `requireRole('admin')`, rate limit, 404, global errors |

Never skip a layer (no SQL in routes).

### TypeScript / Zod (`typescript-strict.mdc`)

- Domain types (`User`, `Ticket`, `Comment`, `ApiError`) from **`z.infer`** — keep schemas identical to `frontend/` (camelCase on the wire).
- Success body = bare resource / list / `{ token, user }`.
- Error body = `{ error: string, code: string, details?: unknown }`.
- `strict` + `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`, etc.
- No `any`; no `@ts-ignore` / `@ts-expect-error`.
- Status map: `TRANSITIONS` / `VALID_STATUSES` as `as const` + `readonly`.

### Database (`database-standards.mdc`)

- Tables: `users`, `tickets`, `comments` — UUID PKs (`pgcrypto`), `timestamptz`, CHECK constraints.
- Migrations in **`backend/migrations/`** only: `001_enable_pgcrypto.sql` … `005_create_indexes.sql`.
- Search: `pg_trgm` + GIN + case-insensitive `ILIKE` on title OR description (combinable with `status`).
- Pool: `max: 20` (dev), `statement_timeout: '30s'`; production SSL `rejectUnauthorized: true`.
- Status updates: short transaction + `SELECT … FOR UPDATE`.

### Folder layout

```
backend/
├── migrations/           # apply-once SQL
├── src/
│   ├── index.ts          # boot, listen, graceful shutdown (pool.end)
│   ├── app.ts            # Express app export for supertest
│   ├── config/           # env Zod schema
│   ├── db/               # pool, migrate runner
│   ├── middleware/       # auth, errors, rate limit
│   ├── routes/           # HTTP + Zod
│   ├── services/         # business logic; TicketStatusService
│   ├── repositories/     # SQL + DTO mappers
│   ├── schemas/          # Zod domain + request schemas
│   └── __tests__/        # and/or *.test.ts colocated
├── package.json
├── tsconfig.json
└── .env.example
```

### Middleware order

1. `helmet()`  
2. `cors({ origin: FRONTEND_ORIGIN, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'], credentials: false })`  
3. `express.json({ limit: '100kb' })`  
4. pino-http (or equivalent)  
5. Routes  
6. 404 → `{ error, code: 'NOT_FOUND' }`  
7. Global error handler → 500 `INTERNAL_ERROR` (no stacks/SQL in client body)

Behind a reverse proxy: `app.set('trust proxy', 1)` so login rate limiting sees the real IP.

### Auth & crypto

- JWT Bearer, claims `{ sub, email, role, iat, exp }`, **24h** expiry.
- Passwords: `await bcrypt.hash(..., 12)` / `await bcrypt.compare(...)` only.
- UUIDs / non-password randomness: `node:crypto`.
- Login rate limit: **10 requests / 15 minutes / IP** (all attempts) → **429** `RATE_LIMITED`.

### Status machine

Only `TicketStatusService.transition` mutates status. Invalid → **409** `INVALID_TRANSITION`.  
`PATCH /api/tickets/:id` must **400** if `status` is present in the body.

```
Open → In Progress | Cancelled
In Progress → Resolved | Cancelled
Resolved → Closed
Closed / Cancelled → (none)
```

---

## API list

**Conventions:** camelCase JSON · success = bare DTO · errors = `{ error, code, details? }` · `Authorization: Bearer <token>` where noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | `{ status: 'ok' }` — no DB |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` (rate-limited) |
| `GET` | `/api/auth/me` | Bearer | Current user (no password fields) |
| `POST` | `/api/tickets` | Bearer | Create ticket; status defaults to `Open` |
| `GET` | `/api/tickets` | Bearer | List; `?search=` and `?status=` combinable; Core returns all matches |
| `GET` | `/api/tickets/:id` | Bearer | Detail including comments |
| `PATCH` | `/api/tickets/:id` | Bearer | Update `title` / `description` / `priority` / `assignedTo` only |
| `PATCH` | `/api/tickets/:id/status` | Bearer | State machine; **409** if invalid |
| `POST` | `/api/tickets/:id/comments` | Bearer | Create comment |
| `GET` | `/api/users` | Bearer | Assignee list (`agent` + `admin`) |
| `POST` | `/api/users` | Bearer + admin | Create user *(Stretch)* |
| `PATCH` | `/api/users/:id` | Bearer + admin | Update user *(Stretch)* |
| `DELETE` | `/api/users/:id` | Bearer + admin | Delete user *(Stretch)* |

Unknown routes → **404** `{ error, code: 'NOT_FOUND' }`.

### Common error codes

| HTTP | `code` | When |
|------|--------|------|
| 400 | `VALIDATION_ERROR` | Zod failure; `status` on general PATCH |
| 401 | `UNAUTHORIZED` | Missing/invalid token or bad login |
| 403 | `FORBIDDEN` | Authenticated but not admin |
| 404 | `NOT_FOUND` | Missing route or resource |
| 409 | `INVALID_TRANSITION` | Illegal status change |
| 409 | `CONFLICT` | Unique / FK conflicts (PG `23505` / `23503`) |
| 429 | `RATE_LIMITED` | Login rate limit |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

### Example: login

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com","password":"Agent123!"}'
```

### Example: list tickets

```bash
curl -s 'http://localhost:3000/api/tickets?search=login&status=Open' \
  -H "Authorization: Bearer $TOKEN"
```

---

## Related docs

Implementation and reviews must follow [`.cursor/rules/`](../.cursor/rules/) (see table at top). Lifecycle artifacts:

- Root [`../README.md`](../README.md) — full-stack setup  
- [`../docs/design-notes.md`](../docs/design-notes.md) — architecture diagrams  
- [`../tool-specific/cursor-workflow/spec.md`](../tool-specific/cursor-workflow/spec.md) — full API / FR contracts  
- [`../tool-specific/cursor-workflow/acceptance-criteria.md`](../tool-specific/cursor-workflow/acceptance-criteria.md) — FR → API/UI/tests → rules  
- [`../tool-specific/cursor-workflow/cursor-rules-or-instructions.md`](../tool-specific/cursor-workflow/cursor-rules-or-instructions.md) — how rules are attached in Cursor  
- [`../docs/code-review-notes.md`](../docs/code-review-notes.md) — AI drift corrections against rules  
- [`../tool-workflow.md`](../tool-workflow.md) — Part A workflow  
- [`../database/README.md`](../database/README.md) — Postgres setup  

