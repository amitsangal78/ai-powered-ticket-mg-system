# Tool Workflow — Cursor Pro

Part A of the AI Capability Exercise for the **Support Ticket Management System** (Backend-Heavy option).

This document describes how I use **Cursor Pro** with persistent project context and custom [`.cursor/rules/*.mdc`](.cursor/rules/) files — not as a one-shot code generator, but as a partner across requirement analysis, planning, implementation, validation, testing, debugging, and review.

> **Completion check:** sections 1–7 map 1:1 to the Part A expected topics in [`docs/raw-requirements.md`](docs/raw-requirements.md). Artifact index is in §8.

---

## 1. Primary AI tool

**Cursor Pro**, used mainly through:

- **Agent / Chat** for multi-step work (scaffolding plans, specs, tasks, implementation waves)
- **`@`-mentions** to pull specific files into context
- **Project rules** in [`.cursor/rules/`](.cursor/rules/) (`.mdc` files with descriptions, globs, and `alwaysApply` where needed)
- **Inline edits / diffs** so I can accept, reject, or refine generated changes in small reviewable chunks

I treat the model as an assistant that must follow **written standards**, not as the source of those standards.

Detailed attach patterns: [`tool-specific/cursor-workflow/cursor-rules-or-instructions.md`](tool-specific/cursor-workflow/cursor-rules-or-instructions.md).

---

## 2. How I provide project context

I load context in layers so the tool sees the same constraints I use:

| Layer | Location | Role |
|--------|----------|------|
| Exercise + product scope | `docs/raw-requirements.md` | What Core/Stretch mean; acceptance bar; Cursor deliverables |
| Persistent project brief | `tool-specific/cursor-workflow/project-context.md` | Stack, folder intent, auth-in-scope decision, AI usage guidelines |
| Spec / tasks | `tool-specific/cursor-workflow/spec.md`, `tasks.md` | Detailed FRs, API contracts, wave order, Definitions of Done |
| Acceptance trace | `tool-specific/cursor-workflow/acceptance-criteria.md` | FR → API/UI/tests → rule touchpoints |
| Coding standards | [`.cursor/rules/*.mdc`](.cursor/rules/) | How code must be written (layers, Zod, SQL, React, Tailwind, TS) |

### Typical session start

1. Open or `@`-mention `project-context.md`.
2. Point at the relevant rule file(s) for the area I’m changing (e.g. `@nodejs-backend-patterns.mdc` for API work).
3. Cite the wave/task ID from `tasks.md` and the FR from `spec.md`.
4. Paste only the **slice** of `docs/raw-requirements.md` needed if the task is scope-sensitive (Core vs Stretch).

### Precedence I tell the agent

- **How to implement** → prefer [`.cursor/rules/`](.cursor/rules/)
- **What the exercise requires / Core vs Stretch labels** → prefer `docs/raw-requirements.md`
- **This repo’s deliberate choices** (e.g. JWT auth in scope) → `project-context.md` + `coding-standards.mdc`

I avoid dumping the whole repo into every prompt. Narrow context produces better, rule-aligned output.

---

## 3. Usage across the lifecycle

### 3.1 Requirement analysis

- Ask Cursor to extract entities, Core vs Stretch, and acceptance criteria from `docs/raw-requirements.md`.
- Cross-check against `.cursor/rules/coding-standards.mdc` for project decisions that **raise** Stretch items into delivery (auth/RBAC).
- Capture ambiguities as open questions (e.g. user-create route shape) instead of silently inventing product behavior.
- Output feeds `project-context.md`, later `spec.md`, and the checklist in `acceptance-criteria.md`.

### 3.2 Planning and design

- Use Agent mode to draft architecture that matches the rules: routes → services → repositories; Zustand stores; status machine ownership in `TicketStatusService`.
- Produce `spec.md` (domain model, transition matrix, API contracts, NFRs, correctness properties) and `tasks.md` (waves + DoD) **before** large code generation.
- Capture trade-offs in `docs/design-notes.md` with explicit pointers to which `.mdc` files constrain each choice.
- Prefer small waves (DB → auth → tickets → tests → UI → docs) over “build the entire app.”

### 3.3 Code generation

- Generate against a **single task** (e.g. Task 1.1 migrations) with rule files `@`-mentioned.
- Require the agent to follow [`.cursor/rules/`](.cursor/rules/) explicitly in the prompt when starting a wave (see prompt template in `cursor-rules-or-instructions.md`).
- Accept diffs in reviewable sizes; reject inventing ORMs, `{ success: true }` envelopes, dark mode, or client-side status enforcement as authoritative logic.

### 3.4 Validation of AI-generated code

I do not trust first output. Checklist (aligned with rule “quality checks”):

- Typecheck both packages (`strict` + flags from `typescript-strict.mdc`)
- Confirm Zod at route boundaries; types from `z.infer`
- Confirm parameterized SQL; snake_case ↔ camelCase only in repositories
- Confirm no `passwordHash` / `password_hash` on wire or client types
- Confirm status changes only via `TicketStatusService` / `PATCH .../status`
- Confirm Tailwind single CSS entry; no `@apply` / inline styles for components
- Confirm env-only secrets; no hardcoded `JWT_SECRET` / `DATABASE_URL` fallbacks
- Manually compare FE/BE Zod domain schemas for drift

When output violates a rule, I paste the rule snippet and ask for a fix — then note that correction in [`docs/code-review-notes.md`](docs/code-review-notes.md) / [`docs/reflection.md`](docs/reflection.md).

### 3.5 Testing

- Ask Cursor to write **Vitest + Supertest** integration tests for the state machine (Core mandatory), without mocking `TicketStatusService` (required by backend rules).
- Ask for **property / table-driven** tests for transition matrix correctness (`spec.md` §11).
- Ask for **Vitest + React Testing Library** coverage for ProtectedRoute, status button filtering, and 409 optimistic rollback (`react19-standards.mdc`).
- I run the suites locally; CI (`.github/workflows/ci.yml` + Postgres service) is a Stretch gate, not a substitute for reading assertions.

### 3.6 Debugging

- Paste **reproducible** failures (test output, HTTP status + `ApiError` body, stack from server logs — never secrets).
- Ask for hypotheses ordered by likelihood against architecture (validation vs service vs SQL vs CORS), constrained by [`.cursor/rules/`](.cursor/rules/).
- Prefer minimal reproductions and targeted fixes over broad rewrites.
- After a fix, re-run the failing test and one nearby regression (e.g. valid transition still works).
- Record notable fixes (e.g. Vitest DB races, Docker migrate `isDirectRun`) in `docs/code-review-notes.md`.

### 3.7 Code review

- Use Cursor as a **second reviewer** with instructions: “Review this diff only against `.cursor/rules/` and `spec.md`; list violations and missing tests.”
- I still own the merge decision: I check authorization gaps, error-code consistency, and whether Stretch leaked into Core prematurely.
- Treat AI review as advisory; I verify claims by reading the code.
- Keep lasting notes in [`docs/code-review-notes.md`](docs/code-review-notes.md); use [`docs/pr-description.md`](docs/pr-description.md) when opening the submission PR.

---

## 4. How `.cursor/rules/` enforce standards

Rules turn preferences into **persistent, file-scoped instructions** the agent sees without me retyping them every chat.

| File | Enforcement focus |
|------|-------------------|
| [`coding-standards.mdc`](.cursor/rules/coding-standards.mdc) | Always-on overview: layers, auth-in-scope, wire errors, security summary, UX expectations |
| [`nodejs-backend-patterns.mdc`](.cursor/rules/nodejs-backend-patterns.mdc) | Middleware order, helmet/CORS/rate limit, pino, JWT/bcrypt, `FOR UPDATE` transitions, Vitest+supertest |
| [`database-standards.mdc`](.cursor/rules/database-standards.mdc) | Parameterized SQL, schema/CHECKs, migrations, `pg_trgm`+ILIKE, pool, seed hashing |
| [`typescript-strict.mdc`](.cursor/rules/typescript-strict.mdc) | No `any`, Zod as source of truth, wire formats, `TRANSITIONS` `as const`, strict `tsconfig` |
| [`react19-standards.mdc`](.cursor/rules/react19-standards.mdc) | Zustand-first loading, `useActionState` / `useOptimistic`, API client, ProtectedRoute |
| [`tailwind-standards.mdc`](.cursor/rules/tailwind-standards.mdc) | Single CSS entry, utility-only styling, status/priority color maps, a11y focus patterns |

### Why this helps

- **Consistency:** Same stack and patterns across sessions and chats.
- **Less prompt bloat:** I reference a rule file instead of restating “use pg not Prisma” every time.
- **Faster correction:** When the model drifts, pointing at a named `.mdc` is enough to realign.
- **Reviewable standards:** Rules live in git; teammates (and feedback reviewers) can see what “good” meant for this repo.

I still review rule quality myself (contradictions, vagueness, gaps) so the agent isn’t locked into bad guidance. Full usage guide: [`cursor-rules-or-instructions.md`](tool-specific/cursor-workflow/cursor-rules-or-instructions.md).

---

## 5. What information I avoid sharing unnecessarily

I do **not** put the following into prompts, commits, or rule examples that could leak:

- Real production secrets (`JWT_SECRET`, DB passwords, cloud keys)
- Full production `DATABASE_URL` connection strings with credentials
- Customer / real-user PII (use seed emails like `agent@example.com` only)
- Proprietary third-party code or credentials from other employers’ systems
- Unnecessary personal data unrelated to the exercise

When debugging auth, I share **shapes** (`{ error, code }`, status 401) and redacted logs — not raw JWTs or password values.

Seed passwords are documented in **README only**, hashed at seed runtime, and never pasted into rules as production credentials. Docker images do not bake secrets — Compose/CI inject env at runtime (aligned with security notes in `coding-standards.mdc`).

---

## 6. How I would reuse this workflow in a real project

I would reuse this workflow by copying the **shape**, not blindly the ticket-domain content:

1. **Start with thin always-on overview rules** + scoped rules (API, DB, frontend, types) under `.cursor/rules/`.
2. **Keep a living `project-context.md`** (or equivalent) that states stack decisions and precedence vs rules.
3. **Spec → tasks → implement by wave**, with Definition of Done per major task and an acceptance checklist that traces FRs → tests → rules.
4. **Validate against rules + tests** before expanding scope (especially “nice-to-have” Stretch).
5. **Version the rules in the repo** so CI and humans share one definition of done for generated code.
6. **Periodically audit rules** for contradictions and vagueness (same review I did before locking standards).

In a real team repo I would also:

- Add lint/format rules next to Cursor rules so local tooling and the agent agree
- Gate merges on the same tests the agent is asked to write
- Keep task IDs and rule compliance notes in PR descriptions for traceability without leaking secrets
- Keep a short “AI drift → fix” log like `docs/code-review-notes.md`

---

## 7. Summary

I use **Cursor Pro** with **`docs/raw-requirements.md`**, **`project-context.md`**, **`spec.md` / `tasks.md` / `acceptance-criteria.md`**, and **[`.cursor/rules/*.mdc`](.cursor/rules/)** as a stacked context system. AI accelerates analysis, design, generation, tests, debugging, and review; **rules and tests enforce quality**. I avoid sharing secrets and PII, correct the model when it drifts, and would reuse the same context → spec → wave → validate loop on other projects.

---

## 8. Artifact index (Parts A–C)

| Topic (exercise) | Where it lives |
|------------------|----------------|
| Part A workflow | this file |
| Persistent Cursor context | `tool-specific/cursor-workflow/project-context.md` |
| Spec / tasks / acceptance / rules guide | `tool-specific/cursor-workflow/` |
| Design notes | `docs/design-notes.md` |
| Reflection | `docs/reflection.md` |
| PR description | `docs/pr-description.md` |
| Code review / debugging notes | `docs/code-review-notes.md` |
| Coding standards (enforcement) | [`.cursor/rules/`](.cursor/rules/) |
| README setup | root, `backend/`, `frontend/`, `database/` |

Part A expected coverage map:

| Expected topic | Section |
|----------------|---------|
| Primary AI tool | §1 |
| How I provide project context | §2 |
| Requirement analysis | §3.1 |
| Planning and design | §3.2 |
| Code generation | §3.3 |
| Validate AI-generated code | §3.4 |
| Testing | §3.5 |
| Debugging | §3.6 |
| Code review | §3.7 |
| What I avoid sharing | §5 |
| Reuse in a real project | §6 |
