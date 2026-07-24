# Pull Request Description

Draft PR body for the Backend-Heavy **Support Ticket Management System** (AI Capability Exercise).

> Implementation must follow [`.cursor/rules/`](../.cursor/rules/). Product contracts: [`tool-specific/cursor-workflow/spec.md`](../tool-specific/cursor-workflow/spec.md). Acceptance trace: [`acceptance-criteria.md`](../tool-specific/cursor-workflow/acceptance-criteria.md).

---

## Summary

- Deliver a full-stack Support Ticket Management System: React 19 + Vite SPA, Express 5 + TypeScript API, PostgreSQL via `pg`, JWT auth/RBAC (Project-Core per coding standards).
- Enforce the ticket status lifecycle in `TicketStatusService` only (`PATCH /api/tickets/:id/status`); invalid transitions return **409** and leave DB status unchanged.
- Ship Core ticket CRUD, comments, keyword search + status filter, seed users, Vitest+Supertest state-machine integration tests, and Vitest+RTL frontend coverage.
- Stretch delivered: admin user CRUD, OpenAPI/Swagger, Docker Compose (Postgres + API), GitHub Actions CI with Postgres service, and Cursor workflow artifacts under `tool-specific/cursor-workflow/` + root `tool-workflow.md`.

## Motivation

Exercise Parts A–C require a working Core app **and** visible AI lifecycle artifacts. This PR (or submission branch) packages the runnable system with README setup, rule-backed standards, acceptance checklist, reflection, and review notes so feedback can evaluate workflow and ownership—not only the demo.

## Key design decisions (rule-aligned)

| Decision | Rule / doc |
|----------|------------|
| Routes → services → repositories; no SQL in routes | `nodejs-backend-patterns.mdc`, `coding-standards.mdc` |
| Zod at boundaries; bare success bodies; `{ error, code, details? }` errors | `typescript-strict.mdc` |
| Parameterized SQL; `pg_trgm` + `ILIKE`; apply-once migrations | `database-standards.mdc` |
| Zustand-first; `useActionState` / `useOptimistic`; UI transitions are non-authoritative | `react19-standards.mdc` |
| Single Tailwind CSS 4 entry; status/priority color maps | `tailwind-standards.mdc` |
| No secrets in images; Compose/CI inject `DATABASE_URL` / `JWT_SECRET` | `coding-standards.mdc`, FR-20 |

## What is intentionally out of scope

- FR-17 full API pagination/sort/priority filters (client-side pagination / title debounce only).
- FR-18 ticket tags entity.

## Test plan

- [ ] `cd backend && npm run typecheck && npm test` (Postgres up; `tickets_test` or `TEST_DATABASE_URL`)
- [ ] `cd frontend && npm run typecheck && npm test`
- [ ] Manual: login as seed agent → create ticket → search/filter → comment → walk Open → In Progress → Resolved → Closed
- [ ] Manual: attempt invalid transition → UI shows inline error; status unchanged
- [ ] Manual: admin `/users` CRUD; agent cannot access admin write APIs
- [ ] Optional: `docker compose up --build` → health + `/api/docs`
- [ ] Optional: push branch and confirm `.github/workflows/ci.yml` green

## Docs / artifacts included

- Root / backend / frontend / database **README**s  
- [`tool-workflow.md`](../tool-workflow.md)  
- [`tool-specific/cursor-workflow/`](../tool-specific/cursor-workflow/) (`project-context`, `spec`, `tasks`, `acceptance-criteria`, `cursor-rules-or-instructions`)  
- [`docs/design-notes.md`](./design-notes.md), [`docs/reflection.md`](./reflection.md), [`docs/code-review-notes.md`](./code-review-notes.md)

## Risk / review focus

- Status machine and `FOR UPDATE` transactions  
- No `passwordHash` leakage  
- CORS/`FRONTEND_ORIGIN` and login rate limit  
- FE/BE Zod schema parity  
- CI Postgres service env (`TEST_DATABASE_URL`)

---

*Paste into GitHub when opening the PR; adjust checklist after local verification.*
