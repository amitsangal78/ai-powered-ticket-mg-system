# Support Ticket Management System - Specification

> **Sources of truth:** `docs/raw-requirements.md` (exercise scope) and `.cursor/rules/*.mdc` (implementation standards).  
> **Precedence:** coding/implementation detail → `.cursor/rules/`; exercise deliverables / Core vs Stretch labels in the guide → `docs/raw-requirements.md`.  
> **Project decision:** Authentication + RBAC are **in scope for Core delivery in this repo** even though the exercise lists them under Stretch (`coding-standards.mdc`).

---

## 1. Overview

### 1.1 Purpose

Build an internal **Support Ticket Management System** so authenticated agents and admins can create, update, comment on, search, and progress tickets through an **enforced status lifecycle**, with PostgreSQL persistence, backend validation, clear UI errors, and integration tests that prove the state machine.

### 1.2 Actors

| Actor | Role value | Capabilities |
|--------|------------|--------------|
| Agent | `agent` | Login; CRUD-like ticket ops (create/list/view/update fields); status transitions; comments; search/filter; list users for assignee picker |
| Admin | `admin` | Everything an agent can do, plus user write operations (create/update/delete users; Stretch UI) |
| Unauthenticated | — | `GET /api/health`, `POST /api/auth/login` only; frontend `/login` |

### 1.3 Authorization model

Any authenticated `agent` or `admin` may read/update **any** ticket and comment (internal tool — not per-ticket ACL). User **write** operations require `admin`. `GET /api/users` is available to both roles.

### 1.4 Scope tiers

| Tier | Meaning |
|------|---------|
| **Core** | Mandatory for a complete exercise submission |
| **Project-Core Auth** | Required by `.cursor/rules` for this repo (exercise Stretch, but implement) |
| **Stretch** | Optional; implement only after Core + lifecycle artifacts are solid |

### 1.5 Out of scope (unless Stretch explicitly adds)

- Per-ticket ownership ACLs  
- File uploads / Worker Threads  
- Dark mode  
- HTML storage / sanitizer libraries for ticket fields  
- Prisma / Kysely / ORM  
- `{ success: true \| false }` response envelopes  

---

## 2. Technology Stack

| Area | Standard |
|------|----------|
| Frontend | React 19, Vite 6, TypeScript 5.x, React Router v6/v7 |
| UI | Tailwind CSS 4 — single entry `frontend/src/index.css` with `@import "tailwindcss"`; utilities only; no `@apply` for components; no inline `style={{}}` |
| Client state | Zustand 5 — `authStore`, `ticketStore`, `userStore`, `filterStore`, `uiStore` |
| Forms | `useActionState` for login & create ticket; `useOptimistic` + rollback for comments & status |
| Backend | Node.js 22, Express 5, TypeScript 5.x |
| Validation / types | Zod; `z.infer`; FE/BE domain schemas duplicated but identical; camelCase on the wire |
| Data access | `pg` pool only; repositories map snake_case ↔ camelCase |
| Database | PostgreSQL; UUID PKs (`pgcrypto`); `timestamptz`; CHECK constraints; `pg_trgm` + `ILIKE` search |
| Auth | JWT Bearer 24h `{ sub, email, role, iat, exp }`; bcrypt cost 12; `sessionStorage` for token |
| Security | `helmet`, CORS = `FRONTEND_ORIGIN`, login rate limit 10/15min/IP, `express.json({ limit: '100kb' })` |
| Logging | pino / pino-http; never log passwords, JWTs, secrets, or credential bodies |
| Tests | Vitest + supertest (backend); colocated `*.test.ts` / `*.test.tsx` |
| Architecture | Backend: routes → services → repositories. Frontend: store-driven data loading |

---

## 3. Domain Model & Data Dictionary

### 3.1 Entity relationship (Core)

```
users 1──* tickets (created_by)
users 1──* tickets (assigned_to, nullable)
users 1──* comments (created_by)
tickets 1──* comments
```

### 3.2 `User` (API public shape — never includes password)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID string | PK | `gen_random_uuid()` |
| `name` | string | 1–100 chars; no `<` `>` | |
| `email` | string | email; unique on `LOWER(email)` | |
| `role` | `'agent' \| 'admin'` | CHECK | |
| `createdAt` | ISO-8601 | `timestamptz` | |
| `updatedAt` | ISO-8601 | `timestamptz` | |

**DB-only:** `password_hash` (bcrypt). Never returned from repositories that feed API responses. Never present on client `User` types.

**Seed (idempotent, hash at runtime):**

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `Admin123!` | `admin` |
| `agent@example.com` | `Agent123!` | `agent` |

Document credentials in README only — not in code comments.

### 3.3 `Ticket`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID string | PK | |
| `title` | string | 1–200; no `<` `>` | |
| `description` | string | 1–5000; no `<` `>` | |
| `priority` | `'low' \| 'medium' \| 'high'` | CHECK | |
| `status` | see §4 | DEFAULT `'Open'` | Mutated only via status endpoint / `TicketStatusService` |
| `assignedTo` | UUID \| `null` | FK → users; ON DELETE SET NULL | |
| `createdBy` | UUID | FK → users; ON DELETE RESTRICT | Set from JWT `sub` on create |
| `createdAt` | ISO-8601 | | |
| `updatedAt` | ISO-8601 | Updated on field/status changes | |

### 3.4 `Comment`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID string | PK | |
| `ticketId` | UUID | FK → tickets; ON DELETE CASCADE | |
| `message` | string | 1–2000; no `<` `>` | |
| `createdBy` | UUID | FK → users; ON DELETE RESTRICT | From JWT `sub` |
| `createdAt` | ISO-8601 | | |

### 3.5 Stretch entity — `TicketTag` (richer data model)

Optional third entity for Stretch “richer data model”:

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | PK |
| `ticketId` | UUID | FK → tickets ON DELETE CASCADE |
| `label` | string | 1–50; no `<` `>`; unique per ticket (`ticket_id`, `LOWER(label)`) |
| `createdBy` | UUID | FK → users |
| `createdAt` | ISO-8601 | |

### 3.6 Naming

- API / TypeScript / Zod: **camelCase** (`assignedTo`, `createdAt`).  
- PostgreSQL: **snake_case**. Mapping only in repositories.

---

## 4. State Machine

Owned exclusively by `TicketStatusService.transition(ticketId, toStatus)`.  
Executed in a DB transaction with `SELECT … FOR UPDATE` on the ticket row.  
UI may filter buttons using a read-only `TRANSITIONS` map; **server is authoritative**.

### 4.1 Valid transitions

| From | Allowed next statuses |
|------|------------------------|
| `Open` | `In Progress`, `Cancelled` |
| `In Progress` | `Resolved`, `Cancelled` |
| `Resolved` | `Closed` |
| `Closed` | _(none — terminal)_ |
| `Cancelled` | _(none — terminal)_ |

```
Open ──────────────► In Progress ──────────────► Resolved ──────────────► Closed
 │                         │
 └──► Cancelled ◄──────────┘
```

### 4.2 Transition matrix (✓ valid / ✗ invalid)

| From \ To | Open | In Progress | Resolved | Closed | Cancelled |
|-----------|:----:|:-----------:|:--------:|:------:|:---------:|
| **Open** | ✗ | ✓ | ✗ | ✗ | ✓ |
| **In Progress** | ✗ | ✗ | ✓ | ✗ | ✓ |
| **Resolved** | ✗ | ✗ | ✗ | ✓ | ✗ |
| **Closed** | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Cancelled** | ✗ | ✗ | ✗ | ✗ | ✗ |

### 4.3 Rules

1. WHEN a client requests a transition not marked ✓, THE SYSTEM SHALL respond **409** with `code: 'INVALID_TRANSITION'` and SHALL leave `status` unchanged.  
2. WHEN `PATCH /api/tickets/:id` includes a `status` field, THE SYSTEM SHALL respond **400** (`VALIDATION_ERROR` or explicit reject) and SHALL not change status.  
3. IF two concurrent valid transitions race, THE SYSTEM SHALL serialize via `FOR UPDATE` so at most one winning transition applies; the loser SHALL receive 409 if no longer valid.  
4. THE UI SHALL render transition buttons only for ✓ targets; for `Closed` / `Cancelled` THE UI SHALL show a badge only (no buttons).

---

## 5. Functional Requirements

EARS patterns used: **WHEN** / **IF** / **WHILE** / **WHERE** + **THE SYSTEM SHALL**.  
Each FR includes a user story and testable acceptance criteria.

### FR-01 — Health check *(Core)*

**User story:** As an operator, I want a public health endpoint so I can verify the API process is up without hitting the database.

**Acceptance criteria**

1. WHEN a client sends `GET /api/health`, THE SYSTEM SHALL respond **200** with body `{ "status": "ok" }` without querying PostgreSQL.  
2. WHEN the database is unavailable, THE SYSTEM SHALL still return **200** for `/api/health`.

---

### FR-02 — Login *(Project-Core Auth / exercise Stretch)*

**User story:** As an agent or admin, I want to log in with email and password so I receive a JWT for subsequent API calls.

**Acceptance criteria**

1. WHEN a client posts valid credentials to `POST /api/auth/login`, THE SYSTEM SHALL respond **200** with `{ token, user }` where `user` matches the public `User` shape (no password fields).  
2. WHEN email or password is wrong, THE SYSTEM SHALL respond **401** with `code: 'UNAUTHORIZED'` (or equivalent auth failure code) and SHALL NOT issue a token.  
3. WHEN the request body fails Zod validation, THE SYSTEM SHALL respond **400** with `code: 'VALIDATION_ERROR'` and `details` field errors.  
4. WHEN more than **10** login attempts from the same IP occur within **15 minutes** (counting all attempts), THE SYSTEM SHALL respond **429** with `code: 'RATE_LIMITED'`.  
5. THE SYSTEM SHALL verify passwords only via `await bcrypt.compare(...)`.  
6. WHEN login succeeds in the UI, THE SYSTEM SHALL store the JWT in `sessionStorage` via `authStore` and SHALL redirect to the ticket list.

---

### FR-03 — Session restore & current user *(Project-Core Auth)*

**User story:** As a returning user, I want my session restored from `sessionStorage` so I stay logged in for the tab session.

**Acceptance criteria**

1. WHEN the SPA loads with a JWT in `sessionStorage`, THE SYSTEM SHALL call `GET /api/auth/me` with `Authorization: Bearer <token>`.  
2. WHEN the token is valid, THE SYSTEM SHALL populate `authStore` with the public user and SHALL allow access to protected routes.  
3. WHEN the token is missing/invalid, THE SYSTEM SHALL clear auth state and SHALL redirect to `/login`.  
4. WHILE auth hydration is in progress, THE SYSTEM SHALL NOT render admin-only nav based on a stale or unknown role.

---

### FR-04 — Protected routes & RBAC *(Project-Core Auth)*

**User story:** As a security-conscious team, I want unauthenticated users blocked from the app and admin UI hidden from agents.

**Acceptance criteria**

1. WHEN an unauthenticated user navigates to a protected page, THE UI SHALL redirect to `/login`.  
2. WHEN a request to a Bearer-protected API lacks a valid token, THE SYSTEM SHALL respond **401**.  
3. WHEN an `agent` calls an admin-only write endpoint, THE SYSTEM SHALL respond **403**.  
4. IF `role !== 'admin'`, THE UI SHALL **hide** (not merely disable) admin nav/routes.

---

### FR-05 — Create ticket *(Core)*

**User story:** As an authenticated user, I want to create a ticket with title, description, priority, and optional assignee so work is tracked from status `Open`.

**Acceptance criteria**

1. WHEN a valid body is posted to `POST /api/tickets`, THE SYSTEM SHALL persist a ticket with `status = 'Open'`, `createdBy = JWT.sub`, and respond **201** (or **200**) with the `Ticket` resource.  
2. WHEN required fields are missing, empty, over max length, contain `<`/`>`, or priority is invalid, THE SYSTEM SHALL respond **400** `VALIDATION_ERROR` and SHALL NOT insert a row.  
3. WHEN `assignedTo` references a non-existent user, THE SYSTEM SHALL reject the write (409 FK or 400 after validation) and SHALL NOT create an orphan assignment.  
4. THE create-ticket form SHALL use `useActionState` for pending/error without duplicating the same pending flag in a store.  
5. WHEN creation succeeds, THE UI SHALL show the new ticket in the list (store refreshed or optimistically reconciled).

---

### FR-06 — List tickets *(Core)*

**User story:** As an authenticated user, I want to see all matching tickets so I can browse workload.

**Acceptance criteria**

1. WHEN `GET /api/tickets` is called with a valid Bearer token, THE SYSTEM SHALL return **200** and a `Ticket[]` (bare array; Core: all matches, no pagination).  
2. WHEN unauthenticated, THE SYSTEM SHALL respond **401**.  
3. THE UI SHALL load tickets via `ticketStore` actions triggered from `useEffect` (Zustand-first; no dual Suspense source of truth for the same list).  
4. WHILE loading, THE UI SHALL show a loading/skeleton state; WHEN the request fails, THE UI SHALL show an error with `role="alert"` (or equivalent accessible error).

---

### FR-07 — View ticket detail *(Core)*

**User story:** As an authenticated user, I want to open a ticket and see its fields and comments.

**Acceptance criteria**

1. WHEN `GET /api/tickets/:id` is called for an existing id, THE SYSTEM SHALL return **200** with the ticket **including comments** (ordered by `createdAt` ascending unless otherwise documented).  
2. WHEN the id does not exist or is not a UUID, THE SYSTEM SHALL respond **404** `NOT_FOUND` or **400** `VALIDATION_ERROR` respectively.  
3. THE detail page SHALL render title, description, priority, status, assignee, timestamps, and comments as React text children (never `dangerouslySetInnerHTML`).

---

### FR-08 — Update ticket fields *(Core)*

**User story:** As an authenticated user, I want to update title, description, priority, and assignee without changing status through this endpoint.

**Acceptance criteria**

1. WHEN `PATCH /api/tickets/:id` receives a valid partial body of `{ title?, description?, priority?, assignedTo? }`, THE SYSTEM SHALL update those fields, bump `updatedAt`, and return the updated `Ticket`.  
2. WHEN the body contains `status`, THE SYSTEM SHALL respond **400** and SHALL NOT change status.  
3. WHEN the ticket id is unknown, THE SYSTEM SHALL respond **404**.  
4. WHEN validation fails (length, HTML chars, invalid priority/UUID), THE SYSTEM SHALL respond **400** `VALIDATION_ERROR`.

---

### FR-09 — Change ticket status *(Core — signature)*

**User story:** As an authenticated user, I want to move a ticket only along allowed lifecycle edges so invalid jumps are impossible.

**Acceptance criteria**

1. WHEN `PATCH /api/tickets/:id/status` requests a ✓ transition, THE SYSTEM SHALL update status inside a `FOR UPDATE` transaction and return the updated `Ticket`.  
2. WHEN the transition is ✗, THE SYSTEM SHALL respond **409** `INVALID_TRANSITION` and the persisted status SHALL remain unchanged (assertable in integration tests).  
3. THE SYSTEM SHALL perform status mutation **only** via `TicketStatusService` (not via general PATCH or ad-hoc SQL in routes).  
4. THE UI SHALL offer buttons only for ✓ next statuses; WHEN a 409 occurs, THE UI SHALL show an inline error, roll back `useOptimistic` state, and SHALL NOT full-page reload.  
5. Integration tests SHALL cover every ✓ edge and a representative set of ✗ edges without mocking `TicketStatusService`.

---

### FR-10 — Add comment *(Core)*

**User story:** As an authenticated user, I want to add a plain-text comment on a ticket.

**Acceptance criteria**

1. WHEN `POST /api/tickets/:id/comments` receives a valid `{ message }`, THE SYSTEM SHALL create a comment with `createdBy = JWT.sub` and return the `Comment` (or ticket-with-comments, consistently documented).  
2. WHEN `message` is empty, >2000 chars, or contains `<`/`>`, THE SYSTEM SHALL respond **400**.  
3. WHEN the ticket does not exist, THE SYSTEM SHALL respond **404**.  
4. THE UI SHALL use `useOptimistic` for the new comment and roll back on failure.

---

### FR-11 — Keyword search & status filter *(Core)*

**User story:** As an authenticated user, I want to find tickets by keyword and/or status.

**Acceptance criteria**

1. WHEN `GET /api/tickets?search=<q>` is called, THE SYSTEM SHALL return tickets whose `title` OR `description` matches `q` case-insensitively via parameterized `ILIKE` (backed by `pg_trgm` indexes).  
2. WHEN `?status=<Status>` is provided, THE SYSTEM SHALL return only tickets with that exact status.  
3. WHEN both `search` and `status` are provided, THE SYSTEM SHALL apply **both** filters (AND).  
4. WHEN `status` is not a valid enum value, THE SYSTEM SHALL respond **400** `VALIDATION_ERROR`.  
5. THE UI `filterStore` SHALL drive list refetch on search/status changes.

---

### FR-12 — Assignee user list *(Core)*

**User story:** As an authenticated user, I want a list of users so I can assign tickets.

**Acceptance criteria**

1. WHEN `GET /api/users` is called with a valid Bearer token (`agent` or `admin`), THE SYSTEM SHALL return **200** and a public `User[]` with **no** password fields.  
2. WHEN unauthenticated, THE SYSTEM SHALL respond **401**.

---

### FR-13 — Persistence, migrations, seed *(Core)*

**User story:** As a developer, I want migrations and seed data so a fresh environment reproduces the schema and demo users.

**Acceptance criteria**

1. WHEN migrations `001`–`005` run on an empty database, THE SYSTEM SHALL create the complete Core schema (extensions, tables, indexes, CHECKs).  
2. WHEN the seed script runs twice, THE SYSTEM SHALL remain idempotent (no duplicate users).  
3. WHEN the API and DB restart, previously created tickets/comments SHALL still be readable.  
4. THE SYSTEM SHALL read `DATABASE_URL` / `JWT_SECRET` only from env (Zod-validated at boot); README SHALL document setup without committing secrets.

---

### FR-14 — Backend validation & plain text *(Core)*

**User story:** As a platform owner, I want invalid or HTML-like input rejected at the API boundary.

**Acceptance criteria**

1. WHEN any route body/query/param fails Zod parse, THE SYSTEM SHALL respond **400** `{ error, code: 'VALIDATION_ERROR', details }` and SHALL strip unknown keys.  
2. WHEN `title`, `description`, or `message` contains `<` or `>`, THE SYSTEM SHALL reject the request.  
3. THE SYSTEM SHALL use parameterized SQL only (`$1`, `$2`, …); no string-interpolated user input in queries; no `SELECT *` in application queries.

---

### FR-15 — Frontend error & loading UX *(Core)*

**User story:** As a user, I want clear loading and error states so failures are understandable.

**Acceptance criteria**

1. WHEN any store-driven fetch is in flight, THE UI SHALL expose loading state (store or `uiStore`).  
2. WHEN an API error occurs, THE UI SHALL show a meaningful message (validation details, 409 transition, network failure).  
3. WHEN the API returns **401**, THE UI SHALL clear auth, remove the JWT, and redirect to `/login`.  
4. Interactive controls SHALL be keyboard-accessible, inputs labeled, errors announced (`aria-live` or `role="alert"`), and focus trapped in modals; status/priority badges SHALL use the Tailwind maps in `tailwind-standards.mdc`.

---

### FR-16 — User CRUD API & admin UI *(Stretch)*

**User story:** As an admin, I want to create, update, and delete users and manage roles.

**Acceptance criteria**

1. WHEN an admin sends `POST /api/users` with `{ name, email, role, password }`, THE SYSTEM SHALL hash the password with bcrypt cost ≥10 (project standard **12**), persist the user, and return the public `User` (**201**).  
2. WHEN an admin sends `PATCH /api/users/:id` with allowed fields, THE SYSTEM SHALL update and return the public `User`.  
3. WHEN an admin sends `DELETE /api/users/:id`, THE SYSTEM SHALL delete if FKs allow; IF `created_by RESTRICT` blocks deletion, THE SYSTEM SHALL respond **409**.  
4. WHEN an `agent` calls these endpoints, THE SYSTEM SHALL respond **403**.  
5. WHEN email conflicts (`23505`), THE SYSTEM SHALL respond **409**.  
6. THE admin UI SHALL be reachable only when `role === 'admin'` (hidden otherwise) and SHALL not display password hashes.

---

### FR-17 — Extended filters, sort, pagination *(Stretch)*

**User story:** As an agent, I want to filter by priority/assignee, sort results, and page through large lists.

**Acceptance criteria**

1. WHEN `GET /api/tickets` includes `priority` and/or `assignedTo` query params, THE SYSTEM SHALL filter accordingly (combinable with Core `search`/`status`).  
2. WHEN `sortBy` + `sortDir` are provided (allowlist: `createdAt`, `updatedAt`, `priority`, `status`), THE SYSTEM SHALL order results stably.  
3. WHEN `page` + `pageSize` are provided, THE SYSTEM SHALL return a documented page object **or** items + `totalCount` (choose one envelope for Stretch and use it consistently — still no `{ success }` wrapper).  
4. THE UI SHALL expose controls for these filters and SHALL keep `filterStore` as the source of filter state.

---

### FR-18 — Ticket tags (third entity) *(Stretch)*

**User story:** As an agent, I want to attach labels to tickets for lightweight categorization.

**Acceptance criteria**

1. WHEN an authenticated user posts `POST /api/tickets/:id/tags` with `{ label }`, THE SYSTEM SHALL create a `TicketTag` and return it.  
2. WHEN a duplicate label exists on the same ticket, THE SYSTEM SHALL respond **409**.  
3. WHEN `DELETE /api/tickets/:id/tags/:tagId` is called, THE SYSTEM SHALL remove the tag.  
4. Ticket detail SHALL list tags; migrations SHALL be additive and apply-once.

---

### FR-19 — OpenAPI documentation *(Stretch)*

**User story:** As a consumer of the API, I want OpenAPI/Swagger docs describing endpoints and schemas.

**Acceptance criteria**

1. WHEN the OpenAPI artifact is opened (file or `/api/docs`), THE SYSTEM SHALL document all Core (+ implemented Stretch) endpoints, auth scheme (Bearer JWT), and `ApiError` shape.  
2. Schemas SHALL match Zod domain types (camelCase).

---

### FR-20 — Docker & CI *(Stretch)*

**User story:** As a teammate, I want Docker and CI so the app installs and tests reproducibly.

**Acceptance criteria**

1. WHEN `docker compose up` (or documented equivalent) is run, THE SYSTEM SHALL start PostgreSQL + API (+ optional frontend) with env samples.  
2. WHEN the CI workflow runs on PR/push, THE SYSTEM SHALL install, migrate/test-db, and run Vitest state-machine tests; failing tests SHALL fail the pipeline.  
3. Secrets SHALL come from CI secrets / env — never committed.

---

### FR-21 — Additional test tiers *(Stretch)*

**User story:** As a maintainer, I want unit and edge-case tests beyond the Core state-machine suite.

**Acceptance criteria**

1. Unit tests SHALL cover pure helpers (e.g. transition map lookups, mappers) without requiring HTTP.  
2. Edge/failure tests SHALL cover rate limit 429, validation 400, auth 401/403, not found 404, and FK/unique 409 paths.  
3. Frontend tests (Vitest + Testing Library) SHALL cover at least: protected redirect, status button filtering, and 409 inline handling for a status change.

---

### FR-22 — Persistent AI workflow artifacts *(Stretch / Cursor deliverable)*

**User story:** As a reviewer of the AI exercise, I want reusable context, specs, tasks, and rules.

**Acceptance criteria**

1. THE repository SHALL contain `tool-specific/cursor-workflow/project-context.md`, `spec.md`, `tasks.md`, `acceptance-criteria.md`, and `cursor-rules-or-instructions.md`.  
2. `.cursor/rules/*.mdc` SHALL remain the enforceable coding standards for generation.  
3. Prompt/workflow history and reflection artifacts SHALL exist per `docs/raw-requirements.md` completion checklist.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Security | Env validated with Zod before listen; no hardcoded secrets/fallbacks |
| NFR-02 | Security | Passwords hashed with async bcrypt cost **12**; JWT secret ≥32 chars |
| NFR-03 | Security | CORS allowlist exactly `FRONTEND_ORIGIN`; `credentials: false` |
| NFR-04 | Security | Login rate limit 10 req / 15 min / IP; `trust proxy` when behind a proxy |
| NFR-05 | Security | `helmet()` enabled; JSON body limit `100kb` |
| NFR-06 | Security | Never log passwords, JWTs, `JWT_SECRET`, full `DATABASE_URL`, or credential bodies |
| NFR-07 | Reliability | Graceful shutdown on `SIGTERM`/`SIGINT`: stop accepting, `await pool.end()`, exit |
| NFR-08 | Reliability | Pool `max: 20` (dev), `statement_timeout: '30s'`; prefer **503** when pool exhausted |
| NFR-09 | Reliability | Production DB SSL `rejectUnauthorized: true` |
| NFR-10 | Data integrity | Status changes and multi-step writes use short transactions; no external HTTP inside transactions |
| NFR-11 | Performance | Core list returns all matches (acceptable for exercise scale); Stretch adds pagination |
| NFR-12 | Maintainability | Layered backend; explicit return types on exports; `strict` + listed TS compiler flags |
| NFR-13 | Maintainability | FE/BE Zod domain schemas kept identical; fix drift immediately |
| NFR-14 | Accessibility | WCAG 2.1 AA contrast targets; labeled inputs; focus rings; no `outline-none` without `focus:ring-*` |
| NFR-15 | UX | Mobile-first Tailwind layout; status/priority color maps centralized |
| NFR-16 | Operability | Structured JSON logs (pino) with levels error/warn/info/debug and `reqId` when available |
| NFR-17 | Event loop | No sync `fs`/crypto in request path; no file uploads or Worker Threads in Core |
| NFR-18 | Privacy | No secrets in git; seed passwords only in README |

---

## 7. API Contracts

**Conventions**

- Base path: `/api`  
- Success: bare resource / array / `{ token, user }` — **no** `{ success: true }` wrapper  
- Error: `{ error: string, code: string, details?: unknown }`  
- Auth header: `Authorization: Bearer <jwt>`  
- Timestamps: ISO-8601 strings  

### 7.1 Endpoint summary

| Method | Path | Auth | Tier | Success |
|--------|------|------|------|---------|
| `GET` | `/api/health` | public | Core | `{ status: 'ok' }` |
| `POST` | `/api/auth/login` | public | Project-Core Auth | `{ token, user }` |
| `GET` | `/api/auth/me` | Bearer | Project-Core Auth | `User` |
| `POST` | `/api/tickets` | Bearer | Core | `Ticket` |
| `GET` | `/api/tickets` | Bearer | Core (+ Stretch query) | `Ticket[]` or Stretch page |
| `GET` | `/api/tickets/:id` | Bearer | Core | `Ticket` + comments |
| `PATCH` | `/api/tickets/:id` | Bearer | Core | `Ticket` |
| `PATCH` | `/api/tickets/:id/status` | Bearer | Core | `Ticket` |
| `POST` | `/api/tickets/:id/comments` | Bearer | Core | `Comment` |
| `GET` | `/api/users` | Bearer | Core | `User[]` |
| `POST` | `/api/users` | Bearer + admin | Stretch | `User` |
| `PATCH` | `/api/users/:id` | Bearer + admin | Stretch | `User` |
| `DELETE` | `/api/users/:id` | Bearer + admin | Stretch | `204` empty or deleted `User` |
| `POST` | `/api/tickets/:id/tags` | Bearer | Stretch | `TicketTag` |
| `DELETE` | `/api/tickets/:id/tags/:tagId` | Bearer | Stretch | `204` |
| — | unknown route | — | Core | `404` `{ error, code: 'NOT_FOUND' }` |

> Note: `.cursor/rules/nodejs-backend-patterns.mdc` compresses admin user writes as `POST/PATCH/DELETE /api/users/:id`. This spec standardizes **create** as `POST /api/users` (no id) and **update/delete** as `/api/users/:id`.

### 7.2 Request / response sketches

**`POST /api/auth/login`**

```json
// request
{ "email": "agent@example.com", "password": "Agent123!" }

// 200
{ "token": "<jwt>", "user": { "id": "...", "name": "...", "email": "...", "role": "agent", "createdAt": "...", "updatedAt": "..." } }
```

**`POST /api/tickets`**

```json
// request
{ "title": "...", "description": "...", "priority": "medium", "assignedTo": null }

// response Ticket (status always "Open" on create)
```

**`PATCH /api/tickets/:id/status`**

```json
// request
{ "status": "In Progress" }
```

**`GET /api/tickets` query (Core)**

| Param | Type | Notes |
|-------|------|-------|
| `search` | string | optional; ILIKE title/description |
| `status` | TicketStatus | optional |

**`GET /api/tickets` query (Stretch additions)**

| Param | Type | Notes |
|-------|------|-------|
| `priority` | `low\|medium\|high` | optional |
| `assignedTo` | UUID \| `unassigned` | optional |
| `sortBy` | allowlist | optional |
| `sortDir` | `asc\|desc` | default `desc` |
| `page` | int ≥ 1 | optional |
| `pageSize` | int 1–100 | optional |

### 7.3 Middleware order

1. `helmet()`  
2. `cors({ origin: FRONTEND_ORIGIN, methods: [GET,POST,PATCH,DELETE,OPTIONS], allowedHeaders: [Content-Type, Authorization], credentials: false })`  
3. `express.json({ limit: '100kb' })`  
4. Request logger (pino-http)  
5. Routes  
6. 404 handler  
7. Global error handler → **500** `{ error: 'Internal server error', code: 'INTERNAL_ERROR' }` (no stacks/SQL in client body)

---

## 8. Error Handling

### 8.1 Wire shape

```typescript
type ApiError = {
  error: string;
  code: string;
  details?: unknown;
};
```

### 8.2 Standard codes

| HTTP | `code` | When |
|------|--------|------|
| 400 | `VALIDATION_ERROR` | Zod failure; `status` on general PATCH; bad enums/UUIDs |
| 401 | `UNAUTHORIZED` | Missing/invalid JWT; bad login credentials |
| 403 | `FORBIDDEN` | Authenticated but role insufficient |
| 404 | `NOT_FOUND` | Unknown route or resource id |
| 409 | `INVALID_TRANSITION` | Illegal status change |
| 409 | `CONFLICT` | Unique email, duplicate tag, FK conflict (map PG `23505`/`23503`) |
| 429 | `RATE_LIMITED` | Login rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server error |
| 503 | `SERVICE_UNAVAILABLE` | Pool exhausted (preferred over crash) |

### 8.3 PostgreSQL → HTTP

| PG code | Meaning | HTTP |
|---------|---------|------|
| `23505` | unique_violation | 409 |
| `23503` | foreign_key_violation | 409 |
| `23502` | not_null_violation | 400 |
| `23514` | check_violation | 400 |

### 8.4 Frontend mapping

| Status | UI behavior |
|--------|-------------|
| 400 | Show field errors from `details` on forms |
| 401 | Clear `authStore` + `sessionStorage`; redirect `/login` |
| 403 | Show forbidden message; no admin chrome |
| 404 | Not-found page or inline message |
| 409 | Inline error; rollback optimistic UI |
| 429 | “Too many login attempts” messaging |
| 5xx | Generic error; do not show stack traces |

---

## 9. Testing Strategy

### 9.1 Core (mandatory)

| Layer | Tooling | Must prove |
|-------|---------|------------|
| Integration | Vitest + supertest against exported `app` | Every ✓ transition succeeds; ✗ transitions return 409 and leave DB status unchanged; sequential conflicting transitions behave safely with `FOR UPDATE` |
| Data | Test DB or per-test rolled-back transactions | Real `TicketStatusService` — **do not mock** it in these tests |

### 9.2 Stretch

| Layer | Focus |
|-------|-------|
| Unit | Transition map, repository mappers, Zod schemas |
| Integration | Auth 401/403, validation 400, rate limit 429, user CRUD conflicts |
| Frontend | ProtectedRoute, status button set, optimistic rollback on 409 |
| CI | Migrate + test job on PR |

### 9.3 Test layout

- Colocate `*.test.ts` next to units, or under `backend/src/__tests__/`  
- Frontend: `ComponentName.test.tsx` colocated  

### 9.4 Definition of done for Core tests

1. Create ticket → Open.  
2. Walk Open → In Progress → Resolved → Closed.  
3. Cancel from Open and from In Progress.  
4. Assert Open → Resolved, Resolved → Open, Closed → anything, etc. return 409.  
5. Assert general PATCH with `status` returns 400.

---

## 10. Stretch Goals

Mapped from `docs/raw-requirements.md` Stretch list + concrete specs above:

| # | Stretch item | Spec coverage |
|---|--------------|---------------|
| S1 | Third entity / richer model | FR-18 `TicketTag` |
| S2 | Full user CRUD + role management | FR-16 |
| S3 | Authentication, protected routes, API authz | FR-02–FR-04 (**also Project-Core**) |
| S4 | Filter priority/assignee; sorting; pagination | FR-17 |
| S5 | Extra test tiers | FR-21, §9.2 |
| S6 | Swagger / OpenAPI | FR-19 |
| S7 | Docker + CI | FR-20 |
| S8 | Reusable prompts/rules/specs | FR-22, `.cursor/rules/`, this file |

**Delivery rule:** implement Stretch only after Core features, Core tests, and lifecycle artifacts (prompt history, design notes, reflection, README) meet the exercise bar.

---

## 11. Correctness Properties

These are invariants the implementation **must** preserve. Prefer encoding them as tests.

| ID | Property |
|----|----------|
| P1 | **Single status authority:** Ticket `status` changes if and only if `TicketStatusService.transition` succeeds inside a transaction. |
| P2 | **Transition closure:** For all tickets, the only allowed status changes are the ✓ cells in §4.2. |
| P3 | **409 stability:** An `INVALID_TRANSITION` response implies the row’s `status` column equals its pre-request value. |
| P4 | **PATCH isolation:** `PATCH /api/tickets/:id` never mutates `status`. |
| P5 | **No password leakage:** No HTTP 2xx body, log line, or client TypeScript type exposes `password` / `passwordHash` / `password_hash`. |
| P6 | **Plain-text store:** Persisted `title`, `description`, and `message` never contain `<` or `>` and are rendered only as text nodes. |
| P7 | **Parameterized SQL:** Every user-influenced query uses bind parameters; repositories never use `SELECT *`. |
| P8 | **Authz:** Admin write routes require `role === 'admin'`; ticket routes require a valid Bearer user. |
| P9 | **CORS least privilege:** Browser calls from origins other than `FRONTEND_ORIGIN` are denied. |
| P10 | **Rate limit:** An 11th login from the same IP within 15 minutes receives 429. |
| P11 | **Schema dual control:** Enum/length rules enforced by both Zod and PostgreSQL CHECK constraints. |
| P12 | **Naming boundary:** Wire JSON is camelCase; DB columns are snake_case; mapping occurs only in repositories. |
| P13 | **Optimistic honesty:** Failed comment/status mutations roll UI back to the last server-committed store state. |
| P14 | **Seed idempotency:** Re-running seed does not create duplicate emails. |
| P15 | **Type safety:** No `any`, no `@ts-ignore` / `@ts-expect-error`; domain types derived from Zod. |
| P16 | **Layering:** Routes do not import `pg` pool queries directly; UI stores do not authorize status transitions. |

---

## Document control

| Item | Value |
|------|--------|
| Spec location | `tool-specific/cursor-workflow/spec.md` |
| Requirements source | `docs/raw-requirements.md` |
| Coding standards | `.cursor/rules/coding-standards.mdc`, `nodejs-backend-patterns.mdc`, `database-standards.mdc`, `typescript-strict.mdc`, `react19-standards.mdc`, `tailwind-standards.mdc` |
| Related context | `tool-specific/cursor-workflow/project-context.md` |
