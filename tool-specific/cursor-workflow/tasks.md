# Support Ticket Management System — Tasks

| Field | Value |
|-------|--------|
| Document | `tool-specific/cursor-workflow/tasks.md` |
| Sources | `spec.md`, `project-context.md`, `docs/raw-requirements.md` |
| Implementation rules | **All tasks MUST follow** `.cursor/rules/` (`coding-standards.mdc`, `nodejs-backend-patterns.mdc`, `database-standards.mdc`, `typescript-strict.mdc`, `react19-standards.mdc`, `tailwind-standards.mdc`) |

## How to use this file

- Work **wave by wave**. Do not start Stretch waves (**4**, **5.6**, **8**) until Core waves **0–3**, Core UI **5.1–5.5**, and mandatory tests **6.1–6.2** meet their Definitions of Done.
- Check off sub-tasks as you go. Update prompt history / design notes when direction changes.
- Traceability: task IDs reference FRs / NFRs / properties (`P*`) from `spec.md`.
- Auth is **exercise-Stretch but Project-Core** for this repo (`coding-standards.mdc`) — implement in Wave 2 before Bearer-protected ticket APIs.
- Prefer lifecycle artifacts over expanding Stretch if timeboxed (~8–12h Core app).

### Current repo inventory (verified)

| Item | Status |
|------|--------|
| Top-level folders (`frontend/`, `backend/`, `database/`, `docs/`, `ai-prompts/`, `.cursor/rules/`, `.github/workflows/`, `tool-specific/cursor-workflow/`) | ✅ Present |
| `.cursor/rules/*.mdc` (all six) | ✅ Present |
| `docs/raw-requirements.md` | ✅ Present |
| `project-context.md`, `spec.md`, `tasks.md` | ✅ Present |
| Root `README.md`, `.gitignore` | ✅ Stub / basic — harden in Wave 0 / 7 |
| `backend/` / `frontend/` package contents (`package.json`, `src/`, configs) | ✅ Wave 0 scaffolding done |
| Migrations, seed, full API/UI | ❌ Not started (Wave 1+) |
| Health API + scaffold tests (Vitest/Supertest + Vitest/RTL) | ✅ Present |
| `acceptance-criteria.md`, `cursor-rules-or-instructions.md`, `tool-workflow.md`, `docs/design-notes.md` | ❌ Not started |
| CI workflow file under `.github/workflows/` | ❌ Folder only — add in Wave 8.4 |

### Rule quick-map (apply on every task)

| Working in… | Primary rules |
|-------------|----------------|
| `backend/**` routes, middleware, services | `nodejs-backend-patterns.mdc`, `typescript-strict.mdc`, `coding-standards.mdc` |
| `backend/**` repositories, SQL, migrations, seed | `database-standards.mdc`, `nodejs-backend-patterns.mdc` |
| `frontend/**` components, pages, stores | `react19-standards.mdc`, `typescript-strict.mdc`, `coding-standards.mdc` |
| `frontend/**` styling | `tailwind-standards.mdc` |

---

## Wave 0 — Scaffolding & Tooling

> Top-level folders already exist. This wave creates **real packages** and any missing root tooling files.

### Task 0.1 — Complete repository & package scaffolding

- [ ] 0.1.1 Audit skeleton; keep top-level `database/` as optional notes only — **runtime migrations live in `backend/migrations/`** (`database-standards.mdc`)
- [ ] 0.1.2 Create `backend/` Node **22** + TypeScript project (`package.json`, `tsconfig.json` with strict flags from `typescript-strict.mdc`)
- [ ] 0.1.3 Create `frontend/` Vite **6** + React **19** + TypeScript project with matching strict `tsconfig`
- [ ] 0.1.4 Add package scripts: `dev`, `build`, `test`, `migrate`, `seed` (as applicable)
- [ ] 0.1.5 Harden `.gitignore` for `node_modules/`, `dist/`, `coverage/`, `.env`, `*.log` (root + both packages)
- [ ] 0.1.6 Add `.env.example` for backend (`DATABASE_URL`, `JWT_SECRET` ≥32, `FRONTEND_ORIGIN`, `PORT`, `NODE_ENV`) and frontend (`VITE_API_URL`)
- [ ] 0.1.7 Pin Node via `.nvmrc` (`22`)
- [ ] 0.1.8 Ensure no secrets committed

**Definition of Done — Task 0.1**

- [ ] `backend` and `frontend` each typecheck with the strict compiler options from `typescript-strict.mdc`
- [ ] `.env.example` documents all required vars; real `.env` is gitignored
- [ ] README stub lists how packages will be started (full setup filled in Wave 7)
- [ ] Trace: NFR-01, NFR-18, FR-13

---

### Task 0.2 — Backend Express skeleton

*Rules: `nodejs-backend-patterns.mdc`*

- [ ] 0.2.1 Install deps: `express`, `pg`, `zod`, `helmet`, `cors`, `pino`, `pino-http`, `bcrypt`, `jsonwebtoken`, `express-rate-limit`, **Vitest**, **supertest**, and TypeScript types
- [ ] 0.2.2 Create `src/config/env.ts` — Zod env validation; fail fast on boot (no hardcoded secret fallbacks)
- [ ] 0.2.3 Create `src/app.ts` — middleware order: `helmet` → CORS(`FRONTEND_ORIGIN`) → `express.json({ limit: '100kb' })` → pino-http → routes → 404 → global error handler
- [ ] 0.2.4 Create `src/index.ts` — validate env → create pool → listen; register graceful shutdown (`SIGTERM`/`SIGINT` → `await pool.end()`)
- [ ] 0.2.5 Implement `GET /api/health` → `{ status: 'ok' }` (no DB)
- [ ] 0.2.6 Export `app` for supertest (listen only in `index.ts`)
- [ ] 0.2.7 Scaffold folders: `routes/`, `services/`, `repositories/`, `middleware/`, `schemas/`, `db/`
- [ ] 0.2.8 Shared error helpers returning `{ error, code, details? }` wire shape (no `{ success }` envelope)

**Definition of Done — Task 0.2**

- [ ] Server starts only with valid env; invalid env exits `1` with a clear message
- [ ] `GET /api/health` returns **200**
- [ ] Unknown route returns **404** `{ error, code: 'NOT_FOUND' }`
- [ ] Unhandled errors return **500** `INTERNAL_ERROR` without stack traces / SQL in the body
- [ ] Layer folders exist; no business SQL in routes
- [ ] Trace: FR-01, NFR-03–NFR-07, NFR-16

---

### Task 0.3 — Frontend Vite / React / Tailwind skeleton

*Rules: `react19-standards.mdc`, `tailwind-standards.mdc`, `typescript-strict.mdc`*

- [ ] 0.3.1 Install deps: React 19, React Router, Zustand 5, Zod, Tailwind CSS 4; **Vitest + React Testing Library (+ jsdom)** for Wave 6
- [ ] 0.3.2 Create single CSS entry `src/index.css` with `@import "tailwindcss"` (only custom CSS file)
- [ ] 0.3.3 Wire `main.tsx` → import CSS → mount app
- [ ] 0.3.4 Scaffold folders: `app/`, `pages/`, `components/`, `stores/`, `api/`, `schemas/`, `lib/`
- [ ] 0.3.5 Add placeholder shell layout (`min-h-screen`, `max-w-7xl mx-auto` page container per Tailwind rules)
- [ ] 0.3.6 Add React Router with login + tickets placeholder routes
- [ ] 0.3.7 Confirm no `@apply`, no inline `style={{}}`, no extra CSS files, no Core `dark:` variants

**Definition of Done — Task 0.3**

- [ ] `frontend` dev server runs and renders the shell
- [ ] Tailwind utilities apply from the single CSS entry
- [ ] Folder structure matches `project-context.md` §3
- [ ] Typecheck passes with strict flags
- [ ] Trace: FR-15 (foundation), NFR-14–NFR-15

---

### Task 0.4 — Shared domain Zod schemas (duplicated, identical)

*Rules: `typescript-strict.mdc`*

- [ ] 0.4.1 Define `VALID_STATUSES`, `TRANSITIONS`, priority/role enums with `as const` in **both** packages (match `spec.md` §4)
- [ ] 0.4.2 Define `ticketSchema`, `commentSchema`, `userSchema` (no `passwordHash`), `apiErrorSchema`
- [ ] 0.4.3 Define request schemas (login, create/update ticket, status body, comment) with `.max(...)` + reject `<`/`>`
- [ ] 0.4.4 Export types via `z.infer` only — no hand-copied interfaces that drift

**Definition of Done — Task 0.4**

- [ ] Frontend and backend domain schemas match field-for-field (camelCase)
- [ ] No `any`; public `User` has no password fields
- [ ] `TRANSITIONS` matches `spec.md` §4.1 exactly
- [ ] Trace: FR-14, P12, P15

---

## Wave 1 — Database (Migrations + Seed)

*Rules: `database-standards.mdc`*  
*Spec: FR-13, P7, P11, P14*

### Task 1.1 — Migration runner & schema

- [x] 1.1.1 Implement apply-once migration runner + `schema_migrations` table under `backend/`
- [x] 1.1.2 `001_enable_pgcrypto.sql` — `CREATE EXTENSION IF NOT EXISTS pgcrypto`
- [x] 1.1.3 `002_create_users.sql` — users table, role CHECK, name length, `timestamptz`
- [x] 1.1.4 `003_create_tickets.sql` — tickets + FKs (`assigned_to` SET NULL, `created_by` RESTRICT) + CHECKs + default `'Open'`
- [x] 1.1.5 `004_create_comments.sql` — comments + CASCADE on ticket delete
- [x] 1.1.6 `005_create_indexes.sql` — FK indexes, `status`, `LOWER(email)` unique, `pg_trgm` GIN on title/description
- [x] 1.1.7 npm script `migrate` runs full sequence on empty DB without error
- [x] 1.1.8 Optionally mirror SQL notes into top-level `database/` **only if** runner remains sole source of truth in `backend/migrations/`

**Definition of Done — Task 1.1**

- [x] Fresh DB + migrate yields complete Core schema with all CHECKs and indexes
- [x] Re-running migrate is safe (apply-once; no duplicate objects)
- [x] Migrations live in one place (`backend/migrations/`)
- [x] Trace: FR-13, NFR-10, P7, P11

---

### Task 1.2 — Connection pool

- [x] 1.2.1 Create `db/pool.ts` from `DATABASE_URL` only
- [x] 1.2.2 Set pool `max: 20`, `statement_timeout: '30s'`
- [x] 1.2.3 Production SSL (`rejectUnauthorized: true`) when `NODE_ENV=production`
- [x] 1.2.4 Log pool errors without printing full connection string; prefer **503** when exhausted

**Definition of Done — Task 1.2**

- [x] App obtains clients from pool; shutdown ends pool cleanly
- [x] Failures do not leak `DATABASE_URL` in logs
- [x] Trace: NFR-07–NFR-09, NFR-16

---

### Task 1.3 — Seed script

- [x] 1.3.1 Idempotent seed: `admin@example.com` / `Admin123!` (`admin`), `agent@example.com` / `Agent123!` (`agent`)
- [x] 1.3.2 Hash passwords with `await bcrypt.hash(..., 12)` at runtime
- [x] 1.3.3 `ON CONFLICT DO NOTHING` (or equivalent) — re-run safe
- [x] 1.3.4 Document credentials in README only (not code comments)

**Definition of Done — Task 1.3**

- [x] Seed creates exactly the two users on empty DB; second run does not duplicate
- [x] No plaintext or precomputed password hashes committed in SQL
- [x] Trace: FR-13, P5, P14, NFR-18

---

## Wave 2 — Backend Auth & Users (list)

*Rules: `nodejs-backend-patterns.mdc`, `database-standards.mdc`, `typescript-strict.mdc`*  
*Spec: FR-02–FR-04, FR-12 | Project-Core Auth*

### Task 2.1 — User repository

- [ ] 2.1.1 `findByEmail` (case-insensitive) including hash for login only (internal use)
- [ ] 2.1.2 `findById` / `listUsers` with **explicit columns** — never `password_hash` in public mappers
- [ ] 2.1.3 `toUser()` mapper snake_case → camelCase + ISO timestamps
- [ ] 2.1.4 Translate PG errors (`23505` → 409, `23503` → 409, `23502`/`23514` → 400)

**Definition of Done — Task 2.1**

- [ ] Public user DTOs never include password fields
- [ ] Parameterized queries only; no `SELECT *`
- [ ] Trace: FR-12, P5, P7, P12

---

### Task 2.2 — Auth middleware & JWT

- [ ] 2.2.1 `authenticateToken` — Bearer verify with `JWT_SECRET`; attach `{ sub, email, role }`; else **401**
- [ ] 2.2.2 `requireRole('admin')` — else **403**
- [ ] 2.2.3 Sign JWT with `{ sub, email, role, iat, exp }`, **24h** expiry
- [ ] 2.2.4 Never log raw tokens or `JWT_SECRET`

**Definition of Done — Task 2.2**

- [ ] Missing/malformed/expired tokens → 401
- [ ] Non-admin on admin route → 403
- [ ] Trace: FR-04, P8, NFR-02, NFR-06

---

### Task 2.3 — Auth routes & login rate limit

- [ ] 2.3.1 `POST /api/auth/login` — Zod validate; `bcrypt.compare`; return `{ token, user }`
- [ ] 2.3.2 Invalid credentials → **401** (generic message)
- [ ] 2.3.3 `express-rate-limit`: **10 req / 15 min / IP** on login (all attempts) → **429** `RATE_LIMITED`
- [ ] 2.3.4 `GET /api/auth/me` — Bearer → current public user
- [ ] 2.3.5 Document / set `trust proxy` when behind a reverse proxy

**Definition of Done — Task 2.3**

- [ ] Seed admin/agent can log in; bad password → 401
- [ ] 11th login attempt within window → 429
- [ ] `/api/auth/me` works with token; fails without
- [ ] Trace: FR-02–FR-03, P10, NFR-04

---

### Task 2.4 — Users list API (assignee picker)

- [ ] 2.4.1 `GET /api/users` — Bearer (`agent` + `admin`) → `User[]`
- [ ] 2.4.2 Confirm no password fields in response

**Definition of Done — Task 2.4**

- [ ] Authenticated agent receives both seed users
- [ ] Unauthenticated → 401
- [ ] Trace: FR-12, P5

---

## Wave 3 — Backend Tickets, Status Machine & Comments

*Rules: `nodejs-backend-patterns.mdc`, `database-standards.mdc`, `typescript-strict.mdc`*  
*Spec: FR-05–FR-11, §4, P1–P4, P7*

### Task 3.1 — Ticket & comment repositories

- [ ] 3.1.1 Ticket CRUD queries with explicit columns + `toTicket()` mapper (ISO dates)
- [ ] 3.1.2 List with optional `search` (`ILIKE` title OR description) AND optional `status`
- [ ] 3.1.3 Find by id; update fields (title/description/priority/assigned_to); bump `updated_at`
- [ ] 3.1.4 Comments: insert + list by `ticket_id` ordered by `created_at` ascending
- [ ] 3.1.5 Status update helper used only inside transactional transition

**Definition of Done — Task 3.1**

- [ ] Search + status combine with AND
- [ ] Mapping correct; no `password_hash` leakage via joins
- [ ] All queries parameterized; no `SELECT *`
- [ ] Trace: FR-06–FR-08, FR-10–FR-11, P7, P12

---

### Task 3.2 — `TicketStatusService` (state machine)

- [ ] 3.2.1 Implement transition check from `TRANSITIONS` map
- [ ] 3.2.2 `transition(ticketId, toStatus)` — `BEGIN` → `SELECT … FOR UPDATE` → validate → `UPDATE` → `COMMIT` / `ROLLBACK`
- [ ] 3.2.3 Invalid → domain error mapped to **409** `INVALID_TRANSITION`
- [ ] 3.2.4 Service callable with no HTTP server
- [ ] 3.2.5 No status mutation elsewhere in codebase (grep-enforced)

**Definition of Done — Task 3.2**

- [ ] Allowed edges succeed; illegal edges leave status unchanged
- [ ] Concurrent-safe design uses row lock
- [ ] Trace: FR-09, P1–P3, NFR-10

---

### Task 3.3 — Ticket service & routes

- [ ] 3.3.1 `POST /api/tickets` — force `Open`; `createdBy` from `req.user.sub`; reject client-supplied `status`
- [ ] 3.3.2 `GET /api/tickets` — Zod query for `search`/`status`; Core returns all matches (no pagination)
- [ ] 3.3.3 `GET /api/tickets/:id` — include comments; **404** if missing
- [ ] 3.3.4 `PATCH /api/tickets/:id` — field updates only; **400 if `status` present**
- [ ] 3.3.5 `PATCH /api/tickets/:id/status` — delegate solely to `TicketStatusService`
- [ ] 3.3.6 All ticket routes behind `authenticateToken`

**Definition of Done — Task 3.3**

- [ ] Smoke path: create → list → detail → patch fields → valid status → invalid status 409
- [ ] General PATCH cannot change status (P4)
- [ ] Trace: FR-05–FR-09, FR-11, FR-14

---

### Task 3.4 — Comment routes

- [ ] 3.4.1 `POST /api/tickets/:id/comments` — Zod `message`; `createdBy` from JWT; **404** if ticket missing
- [ ] 3.4.2 Reject empty / too long / `<>` messages with **400**

**Definition of Done — Task 3.4**

- [ ] Comment appears on subsequent detail fetch
- [ ] Trace: FR-10, P6

---

## Wave 4 — Backend User Management API *[Stretch]*

*Spec: FR-16 — after Core backend + mandatory tests preferred; API may land before admin UI*

### Task 4.1 — Admin user CRUD API

- [ ] 4.1.1 `POST /api/users` — admin only; bcrypt hash cost **12**; unique email
- [ ] 4.1.2 `PATCH /api/users/:id` — admin only; optional password rotate
- [ ] 4.1.3 `DELETE /api/users/:id` — admin only; **409** on `created_by` RESTRICT conflicts
- [ ] 4.1.4 Agent calling write routes → **403**

**Definition of Done — Task 4.1**

- [ ] Admin can create/update/delete users; agent cannot write
- [ ] Responses never include password hashes
- [ ] Trace: FR-16, P5, P8

---

## Wave 5 — Frontend (React 19, Zustand, Tailwind)

*Rules: `react19-standards.mdc`, `tailwind-standards.mdc`, `typescript-strict.mdc`, `coding-standards.mdc`*  
*Spec: FR-02–FR-15*

### Task 5.1 — API client & stores

- [ ] 5.1.1 API client using `import.meta.env.VITE_API_URL`; attach Bearer from `authStore`
- [ ] 5.1.2 Parse successes with Zod; errors with `apiErrorSchema`
- [ ] 5.1.3 On **401**: clear auth + redirect `/login`
- [ ] 5.1.4 Implement stores: `authStore`, `ticketStore`, `userStore`, `filterStore`, `uiStore`
- [ ] 5.1.5 Stores hold data + async actions + loading/error — **no** authoritative status-machine rules (UI may use read-only `TRANSITIONS` for buttons only)

**Definition of Done — Task 5.1**

- [ ] Zustand is the source of truth for ticket/user lists (no dual Suspense ownership)
- [ ] 401 path clears session
- [ ] Trace: FR-03, FR-15, P13, P16

---

### Task 5.2 — Auth UI & route guards *[Project-Core Auth]*

- [ ] 5.2.1 Login page — `<form action>` + `useActionState`; no duplicate pending flags in store
- [ ] 5.2.2 Persist JWT in `sessionStorage`; hydrate via `GET /api/auth/me`
- [ ] 5.2.3 `ProtectedRoute` → unauthenticated users to `/login`
- [ ] 5.2.4 Hide admin nav until role resolved; show admin links only when `role === 'admin'`
- [ ] 5.2.5 Logout clears session

**Definition of Done — Task 5.2**

- [ ] Agent/admin can log in; refresh restores session for the tab
- [ ] No admin UI flash for agent
- [ ] Trace: FR-02–FR-04, NFR-14

---

### Task 5.3 — Ticket list, search, filter

- [ ] 5.3.1 Ticket list page — `useEffect` triggers `ticketStore.fetchTickets` from `filterStore`
- [ ] 5.3.2 Search input + status filter controls (combinable)
- [ ] 5.3.3 Loading skeleton (`animate-pulse`) and error `role="alert"`
- [ ] 5.3.4 Status/priority badges using exact Tailwind maps from `tailwind-standards.mdc` (`STATUS_STYLES` const)
- [ ] 5.3.5 Error boundary around route page

**Definition of Done — Task 5.3**

- [ ] List shows DB tickets; search + status filter work end-to-end
- [ ] Mobile-first layout; focus rings on controls
- [ ] Trace: FR-06, FR-11, FR-15, NFR-14–NFR-15

---

### Task 5.4 — Create & update ticket forms

- [ ] 5.4.1 Create ticket form — `useActionState`; fields title/description/priority/assignee
- [ ] 5.4.2 Load users into assignee select via `userStore`
- [ ] 5.4.3 Edit fields on detail — validation feedback, labeled inputs
- [ ] 5.4.4 Named exports; one non-trivial component per file

**Definition of Done — Task 5.4**

- [ ] User can create and update tickets from UI; data persists after refresh
- [ ] Trace: FR-05, FR-08, FR-12

---

### Task 5.5 — Ticket detail, comments, status transitions

- [ ] 5.5.1 Detail page loads ticket + comments
- [ ] 5.5.2 Comment form — `useOptimistic` + rollback on failure
- [ ] 5.5.3 Status buttons only for `TRANSITIONS[current]`; none for `Closed` / `Cancelled`
- [ ] 5.5.4 Status change — `useOptimistic`; on **409** show inline error + rollback (no full reload)
- [ ] 5.5.5 Pending buttons use `disabled:opacity-50 disabled:cursor-not-allowed`
- [ ] 5.5.6 Render user content as text children only — never `dangerouslySetInnerHTML`

**Definition of Done — Task 5.5**

- [ ] UI transition buttons match `spec.md` §4; 409 handled inline
- [ ] Comments appear without losing thread context
- [ ] Trace: FR-07, FR-09–FR-10, P6, P13

---

### Task 5.6 — Admin user management UI *[Stretch]*

- [ ] 5.6.1 Admin-only users page (create/edit/delete)
- [ ] 5.6.2 Wired to Wave 4 APIs; agent cannot navigate (hidden + route guard)
- [ ] 5.6.3 Tailwind form patterns + accessible errors

**Definition of Done — Task 5.6**

- [ ] Admin can manage users from UI; agent cannot access
- [ ] Trace: FR-16

---

## Wave 6 — Testing (Integration + Property + Frontend)

*Rules: `nodejs-backend-patterns.mdc` § Testing; Spec §9, §11*  
*Tooling: **Backend = Vitest + Supertest**; **Frontend = Vitest + React Testing Library (RTL)***  
*Core mandatory before claiming Core complete*

### Task 6.1 — Backend test harness (Vitest + Supertest)

- [ ] 6.1.1 Vitest config for backend; script `test`
- [ ] 6.1.2 Test DB (or transactional rollback) + migrate/seed strategy documented
- [ ] 6.1.3 Helper to create authenticated agent/admin tokens for supertest
- [ ] 6.1.4 Export `app` without listening

**Definition of Done — Task 6.1**

- [ ] Backend `npm test` runs cleanly against isolated test data
- [ ] Trace: Spec §9.1, FR-09

---

### Task 6.2 — State-machine integration tests (Core mandatory)

- [ ] 6.2.1 Allowed transitions: Open→In Progress→Resolved→Closed; Open→Cancelled; In Progress→Cancelled — each succeeds and persists
- [ ] 6.2.2 Illegal transitions return **409**; status unchanged (assert DB row)
- [ ] 6.2.3 `Closed` and `Cancelled` reject all transition attempts (**409**)
- [ ] 6.2.4 `PATCH /api/tickets/:id` with `status` → **400**; status unchanged
- [ ] 6.2.5 Do **not** mock `TicketStatusService` in these tests
- [ ] 6.2.6 Sequential conflicting transitions demonstrate consistent outcomes with `FOR UPDATE`

**Definition of Done — Task 6.2**

- [ ] All Core state-machine tests green locally
- [ ] Trace: FR-09, Spec §9.4, P1–P4

---

### Task 6.3 — Broader API integration tests (Vitest + Supertest)

- [ ] 6.3.1 Validation: empty title, oversized fields, `<>` in text → **400**
- [ ] 6.3.2 Search / status / combined AND filter cases
- [ ] 6.3.3 Comments create + appear on detail
- [ ] 6.3.4 Auth: no token → **401**; bad login → **401**; agent on admin write → **403**
- [ ] 6.3.5 Login rate limit → **429** (may be isolated / slow-test tagged)

**Definition of Done — Task 6.3**

- [ ] Suite covers FR-02, FR-05–FR-08, FR-10–FR-12, FR-14 smoke paths
- [ ] Trace: Spec §9.1–9.2

---

### Task 6.4 — Property / correctness tests (backend)

*Encode `spec.md` §11 Correctness Properties as automated checks*

- [ ] 6.4.1 Property: every successful create yields `status === 'Open'` (create invariant / P1)
- [ ] 6.4.2 Table-driven: for all status pairs, API allows iff edge is ✓ in §4.2 (P2)
- [ ] 6.4.3 Property: invalid transition leaves row snapshot equal (P3)
- [ ] 6.4.4 Property: no response body key matches `/password/i` on user/auth payloads (P5)
- [ ] 6.4.5 Property: `search` ∩ `status` results equal intersection of separate queries
- [ ] 6.4.6 Unit table test for pure `TRANSITIONS` helper
- [ ] 6.4.7 Optional: property-based library (e.g. fast-check) for random illegal edges → always 409

**Definition of Done — Task 6.4**

- [ ] Properties P2, P3, P5 (and create→Open) have automated coverage
- [ ] Pure transition map unit tests pass
- [ ] Trace: Spec §11

---

### Task 6.5 — Frontend tests (Vitest + RTL)

- [ ] 6.5.1 Configure Vitest + jsdom + `@testing-library/react` / `user-event` in `frontend/`
- [ ] 6.5.2 `ProtectedRoute`: unauthenticated user redirected to `/login`
- [ ] 6.5.3 Status button set: only valid next statuses rendered; none for `Closed` / `Cancelled`
- [ ] 6.5.4 Status change: on mocked **409**, optimistic UI rolls back and inline error appears (no navigation)
- [ ] 6.5.5 Login form: pending/error via `useActionState` path (or store-backed action) is testable
- [ ] 6.5.6 Colocate as `ComponentName.test.tsx`

**Definition of Done — Task 6.5**

- [ ] Frontend `npm test` runs green for the cases above
- [ ] Trace: FR-04, FR-09, FR-15, Spec §9.2 / FR-21 (frontend portion)

---

## Wave 7 — Documentation & Exercise Artifacts

*Spec: FR-22; `docs/raw-requirements.md` “What Counts as Complete” / Cursor expectations*

### Task 7.1 — README & env docs

- [ ] 7.1.1 Prerequisites (Node 22, PostgreSQL)
- [ ] 7.1.2 Setup: install, `.env`, migrate, seed, run API, run UI, run backend tests, run frontend tests
- [ ] 7.1.3 Seed credentials table (README only)
- [ ] 7.1.4 Architecture sketch (layers + state machine pointer to `spec.md`)

**Definition of Done — Task 7.1**

- [ ] A clean machine can run the app from README alone
- [ ] Trace: FR-13, NFR-18, raw-requirements completion checklist

---

### Task 7.2 — Cursor workflow & lifecycle docs

- [ ] 7.2.1 Keep `project-context.md`, `spec.md`, `tasks.md` (this file) current as behavior ships
- [ ] 7.2.2 Write `acceptance-criteria.md` (trace FR → API/UI/tests)
- [ ] 7.2.3 Write `cursor-rules-or-instructions.md` (how `.cursor/rules/` are used during generation)
- [ ] 7.2.4 Maintain prompt history / requirement analysis / design notes / reflection / PR description per exercise
- [ ] 7.2.5 Write root `tool-workflow.md` (Part A)
- [ ] 7.2.6 Optionally capture reusable prompts under `ai-prompts/`

**Definition of Done — Task 7.2**

- [ ] Cursor submission folder complete per `raw-requirements.md` Tool-Specific Expectations
- [ ] Artifacts show iteration and ownership, not only final code
- [ ] Trace: FR-22, Part A/C of exercise

---

### Task 7.3 — Design / debugging notes *(exercise artifacts)*

- [ ] 7.3.1 `docs/design-notes.md` — key decisions (JWT in sessionStorage, `pg_trgm`+ILIKE, duplicated Zod, layered backend)
- [ ] 7.3.2 Short debugging / review notes with at least one example of correcting AI output against rules

**Definition of Done — Task 7.3**

- [ ] Design and review evidence exists in-repo for feedback review
- [ ] Trace: raw-requirements “What Good Looks Like”

---

## Wave 8 — Remaining Stretch Features

> Optional. Only after Waves **0–3**, Core UI (**5.1–5.5**), mandatory tests (**6.1–6.2**), and Wave **7** essentials. Prefer artifacts over gold-plating the app.

### Task 8.1 — Pagination, sorting, extra filters *[Stretch]*

*Spec: FR-17*

- [ ] 8.1.1 API: `priority`, `assignedTo` filters; allowlisted `sortBy`/`sortDir`; `page`/`pageSize` (documented page envelope — no `{ success }` wrapper)
- [ ] 8.1.2 Frontend controls wired to `filterStore`
- [ ] 8.1.3 Supertest coverage for pagination boundaries and combined filters

**Definition of Done — Task 8.1**

- [ ] FR-17 satisfied; Core unfiltered list behavior remains documented or default-compatible
- [ ] Trace: FR-17

---

### Task 8.2 — OpenAPI / Swagger *[Stretch]*

*Spec: FR-19*

- [ ] 8.2.1 Generate or hand-maintain OpenAPI 3 doc for all implemented endpoints
- [ ] 8.2.2 Serve Swagger UI in development (optional) or commit `openapi.yaml`
- [ ] 8.2.3 Schemas match Zod domain types; errors match `spec.md` §8 wire contract

**Definition of Done — Task 8.2**

- [ ] An external reader can call the API from the document alone
- [ ] Trace: FR-19

---

### Task 8.3 — Docker *[Stretch]*

*Spec: FR-20*

- [ ] 8.3.1 `Dockerfile` for backend (and optional frontend)
- [ ] 8.3.2 `docker-compose.yml` — Postgres + API (+ UI optional)
- [ ] 8.3.3 Document compose up / migrate / seed in README
- [ ] 8.3.4 No secrets baked into images

**Definition of Done — Task 8.3**

- [ ] `docker compose up` yields a working stack per README
- [ ] Trace: FR-20

---

### Task 8.4 — CI workflow *[Stretch]*

*Spec: FR-20*  
*Note: `.github/workflows/` folder already exists — add the workflow file*

- [ ] 8.4.1 `.github/workflows/ci.yml` — install, typecheck, backend Vitest+Supertest, frontend Vitest+RTL
- [ ] 8.4.2 Postgres service container for integration tests
- [ ] 8.4.3 Fail CI on test or type errors

**Definition of Done — Task 8.4**

- [ ] Push/PR runs green on the main path
- [ ] Trace: FR-20

---

### Task 8.5 — Richer data model — Ticket tags *[Stretch]*

*Spec: FR-18*

- [ ] 8.5.1 Migration + repository + routes for `TicketTag`
- [ ] 8.5.2 Minimal UI on ticket detail
- [ ] 8.5.3 Tests for create/list/delete + duplicate **409**

**Definition of Done — Task 8.5**

- [ ] FR-18 delivered without breaking Core ticket lifecycle
- [ ] Trace: FR-18

---

### Task 8.6 — Additional Stretch test tiers *[Stretch]*

*Spec: FR-21*

- [ ] 8.6.1 Extra unit tests for mappers / pure helpers beyond Wave 6.4
- [ ] 8.6.2 Edge/failure matrix expanded (pool 503 path mocked if practical)
- [ ] 8.6.3 Expand RTL coverage for create-ticket form validation display

**Definition of Done — Task 8.6**

- [ ] Stretch test tier evidence exists beyond Core mandatory suite
- [ ] Trace: FR-21

---

## Wave completion checklist

### Core release gate (Waves 0–3, 5.1–5.5, 6.1–6.2, README essentials)

- [ ] Core FRs FR-01, FR-05–FR-15 demonstrable in UI + API
- [ ] Project-Core Auth FR-02–FR-04 working
- [ ] State-machine integration tests green (Task 6.2)
- [ ] Property/correctness tests for key `P*` invariants green (Task 6.4) — strongly recommended with Core
- [ ] Frontend Vitest+RTL smoke for guards/status/409 (Task 6.5) — recommended before calling UI “done”
- [ ] No secrets in repo; README setup works
- [ ] Code follows `.cursor/rules/` (layers, Zod, Tailwind entry, wire errors, no `passwordHash` leak)

### Exercise submission gate (Wave 7)

- [ ] Cursor workflow docs complete (`acceptance-criteria.md`, `cursor-rules-or-instructions.md`, etc.)
- [ ] Prompt history, reflection, PR description, `tool-workflow.md` present

### Stretch gate (Wave 4, 5.6, 8.x)

- [ ] Each Stretch task has its own DoD checked
- [ ] Core still passes after Stretch merges

---

## Suggested order (calendar)

| Order | Wave | Focus |
|------:|------|--------|
| 1 | 0 | Fill package scaffolding (folders already exist) |
| 2 | 1 | DB migrate + seed |
| 3 | 2 | Auth + GET users |
| 4 | 3 | Tickets + state machine + comments |
| 5 | 6.1–6.2 | State-machine tests **before** polishing UI |
| 6 | 5.1–5.5 | Frontend end-to-end |
| 7 | 6.3–6.5 | Broader API + property + frontend RTL tests |
| 8 | 7 | Docs / artifacts |
| 9 | 4, 5.6, 8 | Stretch as time allows |

---

*End of tasks. Update checkboxes as work completes; sync `acceptance-criteria.md` when behavior ships.*
