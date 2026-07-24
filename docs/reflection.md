# Reflection — Support Ticket Management System

Honest reflection on AI-assisted delivery with **Cursor Pro** and persistent standards in [`.cursor/rules/`](../.cursor/rules/).

Related: [`tool-workflow.md`](../tool-workflow.md) (Part A), [`cursor-rules-or-instructions.md`](../tool-specific/cursor-workflow/cursor-rules-or-instructions.md), [`code-review-notes.md`](./code-review-notes.md), [`acceptance-criteria.md`](../tool-specific/cursor-workflow/acceptance-criteria.md).

---

## 1. What went well

- **Spec before code paid off.** Writing `project-context.md`, `spec.md`, and `tasks.md` (waves + Definitions of Done) kept scope visible and made Cursor prompts smaller and more accurate.
- **`.cursor/rules/` reduced rework.** Once layered backend, Zod wire formats, `pg` + `pg_trgm`, and React/Zustand patterns were written down, the agent mostly stayed inside the rails. Pointing at a named `.mdc` was faster than restating constraints.
- **State machine as Core signature.** Keeping transitions in `TicketStatusService` with `FOR UPDATE`, and refusing to mock that service in integration tests, produced evidence that matches the exercise’s intent.
- **Auth as Project-Core.** Exercise labeled auth Stretch; rules made JWT + RBAC in-scope early. That forced protected routes and 401/403 paths into the design instead of bolting them on later.
- **Stretch that supported the workflow.** OpenAPI, Docker Compose, and CI with a Postgres service made the README and local story stronger without abandoning Core tests.

---

## 2. What was harder than expected

- **Integration-test isolation.** Parallel Vitest workers racing on one `tickets_test` DB caused flaky failures until file parallelism was constrained — a classic “AI wrote tests, humans own the harness” moment.
- **Dual Zod schemas (FE + BE).** Rules forbid a premature shared package; keeping schemas identical required discipline and occasional manual drift checks.
- **Local Postgres reality.** Password URL encoding (`@` → `%40`), multiple Homebrew Postgres versions, and port conflicts with Docker all burned time that was not “AI generation” time.
- **Scope pressure.** Stretch features (admin users, Docker, CI, OpenAPI) are tempting; the exercise explicitly values artifacts. Finishing Wave 7 docs after the app was runnable required deliberate stopping.

---

## 3. Where AI helped most

| Lifecycle stage | How Cursor helped | Guardrail |
|-----------------|-------------------|-----------|
| Requirements | Extract Core vs Stretch from `raw-requirements.md` | Cross-check with `coding-standards.mdc` (auth-in-scope) |
| Design | Layer diagrams, API tables, transition matrix | `spec.md` + rules for ownership of status |
| Implementation | Migrations, Express layers, Zustand stores, UI pages | `@`-mention scoped `.mdc` files; small tasks |
| Tests | Supertest matrices, RTL for guards/409 | Do not mock `TicketStatusService` |
| Ops | Dockerfile, compose, CI Postgres service | No secrets in images (rules + README) |
| Review | Diff review against rules | Human owns merge; verify claims in code |

---

## 4. Where AI drifted (and how rules fixed it)

Concrete examples live in [`code-review-notes.md`](./code-review-notes.md). Themes:

1. Inventing response envelopes (`{ success, data }`) → rejected via `typescript-strict.mdc` / coding standards.  
2. Suggesting Prisma or query builders → rejected via `database-standards.mdc`.  
3. Putting authoritative status checks only in the client → rejected; UI `TRANSITIONS` is a button filter only.  
4. Racey test config / overly clever mocks → fixed by re-reading backend testing rules and simplifying the harness.

Lesson: **rules are useful only if I enforce them**. First drafts are drafts.

---

## 5. Trade-offs I own

| Trade-off | Choice | Why |
|-----------|--------|-----|
| Auth | JWT in `sessionStorage` | Matches rules; simpler than httpOnly cookies for this exercise SPA |
| Types | Duplicate Zod in FE/BE | Avoid monorepo package complexity; accept drift risk |
| Search | `pg_trgm` + `ILIKE` | Rule-mandated approach; good enough for Core |
| Pagination | Client-side slice (+ title debounce) vs full FR-17 API | Preferred shipping Core + artifacts over unfinished API pagination |
| Stretch | OpenAPI, Docker, CI, admin users; **not** tags (FR-18) or full FR-17 | Highest evidence per hour for ops + auth story |

---

## 6. What I would reuse on a real project

1. Always-on overview rule + scoped API/DB/FE/TS rules in git.  
2. Spec → tasks (waves) → implement → validate against rules + CI.  
3. Mandatory integration tests for the “judgment” feature (here: status machine).  
4. Explicit “do not share secrets/PII” section in the workflow doc.  
5. PR description that traces FRs and rule compliance, not only file lists.

I would also add formatter/linter config next to Cursor rules so local tooling and the agent agree.

---

## 7. What I would do differently

- Start Wave 7 artifacts **earlier** (acceptance checklist draft after Wave 1), updating checkboxes as features land.  
- Add a tiny shared Zod package *only if* drift became painful — after Core, not before.  
- Document Postgres encoding and Docker port conflicts in the first README pass (we learned them the hard way).  
- Keep a dated prompt-history log file from day one for clearer feedback evidence.

---

## 8. Closing

The app is a vehicle; the point was a **visible, rule-enforced AI workflow**. Cursor accelerated delivery; [`.cursor/rules/`](../.cursor/rules/), tests, and human review enforced quality. I am comfortable explaining the architecture, the state machine, and every deliberate Stretch omission above.
