# Project Context — Support Ticket Management System

> **Persistent context for Cursor.** Keep this file open or `@`-mention it when planning, implementing, testing, or reviewing.  
> **Sources of truth:** `docs/raw-requirements.md` (exercise + product requirements) and `.cursor/rules/*.mdc` (implementation standards).  
> If this document and a rule file disagree on **how to code**, prefer `.cursor/rules/`. If they disagree on **exercise deliverables / Core vs Stretch scope**, prefer `docs/raw-requirements.md`.

---

## 1. Project Overview & Business Context

### What this is

This repository is the **Backend-Heavy** option of an AI Capability Exercise: build a small full-stack **Support Ticket Management System** while making an AI-assisted engineering workflow visible end-to-end (requirements → design → implementation → tests → review → reflection).

It is **not a graded exam**. Feedback focuses on how AI was used across the lifecycle, ownership of the solution, and engineering judgment — not only whether the app runs.

### Exercise structure (from `docs/raw-requirements.md`)

| Part | Focus | Emphasis |
|------|--------|----------|
| Part A | AI Workflow Foundation (`tool-workflow.md`) | ~20% |
| Part B | Full-stack mini project (Core + optional Stretch) | ~60% |
| Part C | Submission & reflection (form + artifacts) | ~20% |

- **Timebox:** ~1 week self-paced; Core app ~**8–12 focused hours**. Do **not** expand the app at the expense of lifecycle artifacts.
- **Primary AI tool:** Cursor. Expected artifacts in this folder: `project-context.md` (this file), `spec.md`, `tasks.md`, `acceptance-criteria.md`, `cursor-rules-or-instructions.md`.

### Business problem

A small internal team needs a simple system to manage support tickets: create work items, assign them, discuss via comments, find tickets by keyword/status, and move them through a defined lifecycle **without invalid status jumps**.

### Entities (Core)

```
User        (seeded only for Core — no user-management UI required)
- id, name, email, role
(+ password_hash in DB; never exposed in API responses)

Ticket
- id, title, description, priority, status,
  assignedTo, createdBy, createdAt, updatedAt

Comment
- id, ticketId, message, createdBy, createdAt
```

### Core features (mandatory)

1. Create a ticket  
2. List tickets  
3. View ticket detail (with comments)  
4. Update ticket fields (title, description, priority, assignee) — **not** status via the general update endpoint  
5. Change ticket status through the enforced state machine  
6. Add comments  
7. Keyword search + filter by status (combinable)  
8. Persist all data (survives restart)  
9. Backend validation; reject invalid input  
10. Meaningful error states in the UI  

### Status state machine (signature Core piece)

```
Open         → In Progress | Cancelled
In Progress  → Resolved    | Cancelled
Resolved     → Closed
Closed       → (terminal — no transitions)
Cancelled    → (terminal — no transitions)
```

- Invalid transitions must be **rejected by the backend** (HTTP **409**) and handled clearly in the frontend (inline error, no full page reload).
- Status changes go **only** through `TicketStatusService` / `PATCH .../status` — never as a field on the general ticket PATCH.

### Mandatory test tier

Integration tests that prove the state-machine rules: valid transitions succeed; invalid transitions are rejected (and leave status unchanged).

### Scope decisions for *this* repo

| Topic | Exercise default (`raw-requirements.md`) | This project (per `.cursor/rules`) |
|--------|------------------------------------------|-------------------------------------|
| Authentication / RBAC | Optional Stretch | **In scope** — JWT + `agent` / `admin` |
| User management UI | Not required in Core (users seeded) | Seeded users for Core; admin user CRUD is Stretch |
| Persistent Cursor rules | Stretch evidence | Present in `.cursor/rules/` |

**Authorization model:** any authenticated `agent` or `admin` may read/update any ticket and comment (internal tool). User write operations require `admin`. `GET /api/users` is available to both roles (assignee picker).

### Core acceptance criteria

- [ ] Create ticket via UI  
- [ ] View all tickets from DB  
- [ ] Open ticket detail  
- [ ] Update fields + reassign  
- [ ] Add comments  
- [ ] Valid status transitions succeed; invalid rejected  
- [ ] Keyword search + status filter work  
- [ ] Data survives restart  
- [ ] Backend validation prevents invalid records  
- [ ] No secrets committed  
- [ ] State-machine integration tests pass  

### Stretch (optional — after Core + artifacts)

Richer data model; full user CRUD UI; extra filters/sorting/pagination; more test tiers; OpenAPI; Docker + CI; reusable prompts/rules/specs.

---

## 2. Full Technology Stack

Aligned with `.cursor/rules/coding-standards.mdc` and scoped rule files.

| Layer | Choice |
|--------|--------|
| Frontend | React **19**, Vite **6**, TypeScript **5.x** |
| Styling | Tailwind CSS **4** (utility-first; single CSS entry with `@import "tailwindcss"`) |
| Client state | Zustand **5** — `authStore`, `ticketStore`, `userStore`, `filterStore`, `uiStore` |
| Routing | React Router (v6/v7) with `ProtectedRoute` |
| Forms / UX | React 19 `useActionState` (login / create ticket); `useOptimistic` (comments / status) with rollback on 409 |
| Backend | Node.js **22**, Express **5**, TypeScript **5.x** |
| Validation | Zod at every route boundary; types via `z.infer`; domain schemas duplicated (kept identical) in FE + BE |
| Data access | `pg` pool only (no Prisma/Kysely); repositories map `snake_case` ↔ `camelCase` |
| Database | PostgreSQL — UUID PKs (`pgcrypto`), `timestamptz`, CHECK constraints, `pg_trgm` + `ILIKE` search |
| Auth | JWT Bearer (`{ sub, email, role, iat, exp }`, 24h); bcrypt cost **12**; roles `agent` \| `admin` |
| Security middleware | `helmet`, CORS allowlist = `FRONTEND_ORIGIN`, login rate limit **10 / 15 min / IP**, `express.json` 100kb |
| Logging | pino (JSON); never log passwords, JWTs, secrets, or credential-bearing bodies |
| Testing (backend) | Vitest + supertest; state-machine integration tests required |
| Env | Backend: Zod-validated `DATABASE_URL`, `JWT_SECRET` (≥32), `FRONTEND_ORIGIN`, `PORT`, `NODE_ENV`. Frontend: `VITE_API_URL` |

**Architecture reminders**

- Backend layers: **routes → services → repositories** (never skip a layer; never query DB from a route).
- Wire format: success = bare resource/list; errors = `{ error, code, details? }`.
- Plain-text ticket/comment fields only; no `dangerouslySetInnerHTML` for user content; no `passwordHash` on the wire.

---

## 3. Project Folder Structure (`backend/` and `frontend/` only)

Intended layout when implementing (packages start empty; grow into this shape).

### `backend/`

```
backend/
├── migrations/              # 001_enable_pgcrypto.sql … 005_create_indexes.sql (apply-once)
├── src/
│   ├── index.ts             # boot, listen, graceful shutdown (SIGTERM/SIGINT → pool.end)
│   ├── app.ts               # Express app export for supertest (no listen)
│   ├── config/              # env Zod schema
│   ├── db/                  # pg pool, migrate runner
│   ├── middleware/          # authenticateToken, requireRole, errors, rate limit
│   ├── routes/              # HTTP + Zod validation only
│   ├── services/            # business logic; TicketStatusService owns status machine
│   ├── repositories/        # parameterized SQL + DTO mappers (never return password_hash)
│   ├── schemas/             # Zod domain + request schemas
│   └── __tests__/           # and/or *.test.ts colocated
├── package.json
├── tsconfig.json
└── .env.example
```

### `frontend/`

```
frontend/
├── src/
│   ├── main.tsx
│   ├── index.css            # ONLY custom CSS — Tailwind v4 entry (`@import "tailwindcss"`)
│   ├── app/                 # router, layout, ProtectedRoute
│   ├── pages/               # Login, TicketList, TicketDetail (+ AdminUsers Stretch)
│   ├── components/          # named exports; one non-trivial component per file
│   ├── stores/              # authStore, ticketStore, userStore, filterStore, uiStore
│   ├── api/                 # fetch wrapper, Bearer header, Zod parse
│   ├── schemas/             # Zod mirrors of backend domain (camelCase)
│   └── lib/                 # TRANSITIONS map (UI button filter), STATUS_STYLES
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## 4. Reference — `.cursor/rules/` (must follow)

Always follow these coding standards when generating or editing code. Do not invent alternate patterns that conflict with them.

| File | When it applies | What it governs |
|------|-----------------|-----------------|
| [`.cursor/rules/coding-standards.mdc`](../../.cursor/rules/coding-standards.mdc) | Always (overview) | Architecture, auth-in-scope, security/API summary, frontend UX summary, quality checklist |
| [`.cursor/rules/nodejs-backend-patterns.mdc`](../../.cursor/rules/nodejs-backend-patterns.mdc) | `backend/**` | API surface, middleware order, pino, JWT/bcrypt, Zod errors, rate limit, `FOR UPDATE` transitions, Vitest/supertest, graceful shutdown |
| [`.cursor/rules/database-standards.mdc`](../../.cursor/rules/database-standards.mdc) | SQL / repos / migrations / seed | Schema, CHECKs, indexes, `pg_trgm` + `ILIKE`, pool settings, snake↔camel mapping, PG error → HTTP |
| [`.cursor/rules/typescript-strict.mdc`](../../.cursor/rules/typescript-strict.mdc) | All `frontend`/`backend` TS | No `any`, Zod as source of truth, wire formats, `as const` transitions, strict `tsconfig` flags |
| [`.cursor/rules/react19-standards.mdc`](../../.cursor/rules/react19-standards.mdc) | `frontend/**` | Zustand-first loading, API client, `useActionState` / `useOptimistic`, routing, error boundaries |
| [`.cursor/rules/tailwind-standards.mdc`](../../.cursor/rules/tailwind-standards.mdc) | Frontend UI / CSS | Single CSS entry, utilities only, status/priority color maps, a11y focus/contrast, no dark mode in Core |

**Precedence:** scoped rule (e.g. backend/database/react) wins over the overview when it goes deeper on the same topic.

---

## 5. AI Assistance Guidelines

Use AI as a **workflow partner**, not a blind code generator. Make thinking visible for the exercise.

### Do

- **Load context first:** `@`-mention this file, `docs/raw-requirements.md`, and the relevant `.cursor/rules/*.mdc` before planning or implementing a task.
- **Plan before large edits:** prefer small, reviewable steps (schema → API → UI → tests) over one-shot “build the app.”
- **Respect Core timebox:** finish Core + lifecycle artifacts before Stretch. Do not expand features at the expense of tests, prompt history, design notes, or reflection.
- **Validate AI output:** run typecheck/tests; verify status transitions against the state machine; confirm no secrets, no `passwordHash` leakage, parameterized SQL, and Zod at route boundaries.
- **Correct and iterate:** when the model invents wrappers, ORMs, pagination, or dark mode against the rules, push back with the rule file and fix the code.
- **Keep artifacts in sync:** if implementation diverges from `spec.md` / `tasks.md`, update those docs in the same change set when practical.
- **Own the result:** be able to explain trade-offs (e.g. JWT in `sessionStorage`, duplicated Zod schemas, `pg_trgm` + `ILIKE`).

### Don’t

- Paste secrets, production credentials, or real PII into prompts.
- Skip layers (route → DB) or move status rules into the client as authoritative logic.
- Add `{ success: true }` envelopes, Prisma/Kysely, HTML sanitizer libraries for stored fields, or `dangerouslySetInnerHTML` for ticket/comment content.
- Mock `TicketStatusService` out of the mandatory state-machine integration tests.
- Treat first AI draft as final — review for rule compliance, security, and acceptance criteria.

### Suggested prompt habit

1. State the **wave/task** and acceptance criteria.  
2. Cite **requirements** + **which rule file(s)** apply.  
3. Ask for a short plan or diff-sized change.  
4. After generation: typecheck, run relevant tests, and note corrections in prompt history / reflection.
