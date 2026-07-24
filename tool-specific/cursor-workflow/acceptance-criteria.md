# Acceptance Criteria Checklist

Traceable checklist from exercise Core criteria + `spec.md` FRs to API, UI, tests, and **`.cursor/rules/`** constraints.

> **How to use:** Check an item only when verified locally (or in CI).  
> **Precedence:** coding detail → [`.cursor/rules/`](../../.cursor/rules/); exercise Core vs Stretch labels → [`docs/raw-requirements.md`](../../docs/raw-requirements.md); product contracts → [`spec.md`](./spec.md).

---

## A. Exercise Core acceptance (`docs/raw-requirements.md`)

| # | Criterion | API / behavior | UI | Tests | Rules touchpoint | Done |
|---|-----------|----------------|----|-------|------------------|:----:|
| C1 | Create a ticket via the UI | `POST /api/tickets` → status `Open` | Create form (`useActionState`) | API + RTL smoke | `nodejs-backend-patterns`, `react19-standards` | [x] |
| C2 | View all tickets from the database | `GET /api/tickets` | Ticket list page | Integration / RTL | `database-standards`, `react19-standards` | [x] |
| C3 | Open ticket detail | `GET /api/tickets/:id` (+ comments) | Detail route `/tickets/:id` | API + RTL | `coding-standards` | [x] |
| C4 | Update fields and reassign | `PATCH /api/tickets/:id` (no `status`) | Edit fields + assignee | API validation | `typescript-strict`, backend patterns | [x] |
| C5 | Add comments | `POST /api/tickets/:id/comments` | Comment form + optimistic UI | API + RTL | `react19-standards` | [x] |
| C6 | Valid status transitions succeed; invalid rejected | `PATCH …/status` → 200 / **409** | Buttons from UI `TRANSITIONS`; inline 409 | **State-machine integration** (mandatory) | `TicketStatusService` / `FOR UPDATE` in rules | [x] |
| C7 | Keyword search + status filter | `?search=` + `?status=` (combinable) | Filters + list | API integration | `database-standards` (`pg_trgm` + `ILIKE`) | [x] |
| C8 | Data survives restart | Postgres persistence | — | Manual / Docker volume | `database-standards` | [x] |
| C9 | Backend validation prevents invalid records | Zod 400 + DB CHECKs | Inline validation / alerts | Supertest validation suite | `typescript-strict`, `database-standards` | [x] |
| C10 | No secrets committed | `.env` gitignored; Compose env at runtime | — | Repo review | `coding-standards` / security summary | [x] |
| C11 | State-machine integration tests pass | Real `TicketStatusService` | — | `stateMachine.integration.test.ts` | **Do not mock** status service | [x] |

---

## B. Project-Core auth (in scope per `.cursor/rules/coding-standards.mdc`)

> Exercise lists auth as Stretch; **this repo treats JWT + RBAC as Project-Core**.

| FR | Criterion | Evidence | Rules | Done |
|----|-----------|----------|-------|:----:|
| FR-01 | Health check without DB | `GET /api/health` → `{ status: "ok" }` | backend patterns | [x] |
| FR-02 | Login returns `{ token, user }`; rate-limited | `POST /api/auth/login`; 429 after limit | JWT/bcrypt/rate-limit rules | [x] |
| FR-03 | Session restore | `GET /api/auth/me`; FE hydrate from `sessionStorage` | `react19-standards` | [x] |
| FR-04 | Protected routes + admin RBAC | Bearer middleware; `requireRole('admin')`; `ProtectedRoute` / `AdminRoute` | coding + react rules | [x] |
| FR-12 | Assignee list | `GET /api/users` for agent+admin | no `passwordHash` on wire | [x] |

---

## C. Core ticket FRs (FR-05–FR-15)

| FR | Acceptance (testable) | Primary test / check | Rules | Done |
|----|----------------------|----------------------|-------|:----:|
| FR-05 | Create sets `Open`; Zod rejects bad body | API tests | Zod at route boundary | [x] |
| FR-06 | List returns tickets; Core returns full match set | API + list UI | bare resource arrays | [x] |
| FR-07 | Detail includes comments | API + detail page | layered services | [x] |
| FR-08 | PATCH rejects `status` in body (**400**) | API tests (P4) | status only via status route | [x] |
| FR-09 | Only matrix transitions; else **409** `INVALID_TRANSITION` | Integration matrix P1–P4 | `TicketStatusService` | [x] |
| FR-10 | Comment requires auth + non-empty plain text | API + UI | plain-text / no HTML | [x] |
| FR-11 | Search ∩ status works | `api.integration.test.ts` | `pg_trgm` + `ILIKE` | [x] |
| FR-13 | Migrations apply-once; seed idempotent; bcrypt at runtime | `npm run migrate` / `seed` | `database-standards` | [x] |
| FR-14 | Plain text (no `<>`); lengths/enums dual Zod+CHECK | Validation tests | `typescript-strict`, DB CHECKs | [x] |
| FR-15 | Loading, inline errors, 401→login, 409 no full reload | RTL + manual | `react19-standards`, `tailwind-standards` | [x] |

---

## D. Stretch delivered in this repo

| FR | Criterion | Evidence | Rules | Done |
|----|-----------|----------|-------|:----:|
| FR-16 | Admin user CRUD API + UI | `/api/users` write routes; `/users` page | `requireRole('admin')` | [x] |
| FR-19 | OpenAPI / Swagger | `/api/docs`, `openapi/openapi.yaml` | error shape matches wire contract | [x] |
| FR-20 | Docker + CI | `docker-compose.yml`, `backend/Dockerfile`, `.github/workflows/ci.yml` + Postgres service | no secrets in images | [x] |
| FR-21 | Extra test tiers (partial) | Broader API integration + FE RTL beyond mandatory SM tests | Vitest tooling in rules | [x] |
| FR-22 | Cursor workflow artifacts | This folder + `.cursor/rules/` + `tool-workflow.md` | persistent standards | [x] |

### Stretch not claimed (optional remaining)

| FR | Status |
|----|--------|
| FR-17 | API pagination/sort/priority filters — **not** fully implemented (client-side page slice / title debounce only) |
| FR-18 | Ticket tags entity — **not** implemented |

---

## E. Correctness properties (`spec.md` §11) — smoke map

| ID | Property | How verified | Done |
|----|----------|--------------|:----:|
| P1–P4 | Status authority / matrix / 409 stability / PATCH isolation | State-machine + API integration | [x] |
| P5 | No password leakage | Types + API responses + review | [x] |
| P6 | Plain-text store / text-node render | Zod + no `dangerouslySetInnerHTML` | [x] |
| P7 | Parameterized SQL; no `SELECT *` | Repos + `database-standards` review | [x] |
| P8–P10 | Authz / CORS / login rate limit | Middleware + tests | [x] |
| P11–P16 | Dual schema, naming boundary, optimistic honesty, seed idempotency, TS strict, layering | Rules + tests + review notes | [x] |

---

## F. `.cursor/rules/` compliance gate

Before calling the submission “complete,” confirm:

- [x] No Prisma/Kysely/ORM
- [x] No `{ success: true }` envelopes
- [x] No `any` / `@ts-ignore` / `@ts-expect-error`
- [x] Status UI is a filter only — server is authoritative
- [x] Single Tailwind entry (`frontend/src/index.css`); no Core `dark:` theme
- [x] Env secrets Zod-validated; no hardcoded `JWT_SECRET` / `DATABASE_URL` fallbacks
- [x] Seed passwords documented in README only; bcrypt cost 12 at seed runtime

---

## G. Artifact completeness (Part A / C)

| Artifact | Path | Done |
|----------|------|:----:|
| Tool workflow (Part A) | [`tool-workflow.md`](../../tool-workflow.md) | [x] |
| Project context | [`project-context.md`](./project-context.md) | [x] |
| Spec | [`spec.md`](./spec.md) | [x] |
| Tasks | [`tasks.md`](./tasks.md) | [x] |
| Acceptance criteria | this file | [x] |
| Cursor rules instructions | [`cursor-rules-or-instructions.md`](./cursor-rules-or-instructions.md) | [x] |
| Design notes | [`docs/design-notes.md`](../../docs/design-notes.md) | [x] |
| Reflection | [`docs/reflection.md`](../../docs/reflection.md) | [x] |
| PR description | [`docs/pr-description.md`](../../docs/pr-description.md) | [x] |
| Code review notes | [`docs/code-review-notes.md`](../../docs/code-review-notes.md) | [x] |
| README setup | root / backend / frontend / database READMEs | [x] |

---

*Update checkboxes when behavior changes. Keep FR traces aligned with `tasks.md` Definitions of Done.*
