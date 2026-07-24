# Cursor Rules & Instructions

How **`.cursor/rules/*.mdc`** were used during generation, validation, and review for this project.

> Companion to Part A [`tool-workflow.md`](../../tool-workflow.md) and persistent context in [`project-context.md`](./project-context.md).  
> **Implementation truth:** if a chat suggestion conflicts with a rule file, **the rule wins**.

---

## 1. Why rules exist in this repo

Cursor Pro can generate large diffs quickly. Without written standards, outputs drift (ORMs, `{ success }` envelopes, client-side status machines, dark-mode Tailwind, secrets in examples).

Rules turn preferences into **persistent, file-scoped instructions** the agent sees across chats — so I do not re-paste “use `pg`, not Prisma” every session.

Exercise mapping: Stretch evidence for reusable prompts/rules/specs (**FR-22**) and Part A “how you provide project context.”

---

## 2. Rule inventory

| File | `alwaysApply` / scope (intent) | Instructs the agent to… |
|------|--------------------------------|---------------------------|
| [`coding-standards.mdc`](../../.cursor/rules/coding-standards.mdc) | Overview / always-on | Layers, auth-in-scope, wire errors, security/UX summary, quality checklist |
| [`nodejs-backend-patterns.mdc`](../../.cursor/rules/nodejs-backend-patterns.mdc) | `backend/**` | Middleware order, JWT/bcrypt, rate limit, services, `FOR UPDATE`, Vitest+Supertest |
| [`database-standards.mdc`](../../.cursor/rules/database-standards.mdc) | SQL / migrations / repos / seed | Parameterized SQL, CHECKs, `pg_trgm`+ILIKE, pool, seed hashing |
| [`typescript-strict.mdc`](../../.cursor/rules/typescript-strict.mdc) | FE + BE TS | No `any`, Zod as source of truth, bare success bodies, `TRANSITIONS as const` |
| [`react19-standards.mdc`](../../.cursor/rules/react19-standards.mdc) | `frontend/**` | Zustand-first, `useActionState` / `useOptimistic`, API client, guards |
| [`tailwind-standards.mdc`](../../.cursor/rules/tailwind-standards.mdc) | UI / CSS | Single CSS entry, utility-only, status/priority maps, a11y focus |

**Precedence:** deeper scoped rule > overview on the same topic.  
**Exercise labels (Core vs Stretch):** prefer [`docs/raw-requirements.md`](../../docs/raw-requirements.md) over inventing scope.

---

## 3. How I attach rules in a Cursor session

### Session start

1. `@project-context.md` — stack, auth-in-scope, Do/Don’t.  
2. `@` the **wave/task** from `tasks.md` and FR from `spec.md`.  
3. `@` **only the rule files** for the area being changed (e.g. backend wave → `nodejs-backend-patterns.mdc` + `database-standards.mdc` + `typescript-strict.mdc`).  
4. Ask for a **small plan or single-task diff**, not “build the whole app.”

### Prompt template (reusable)

```text
Task: <tasks.md id> — <one sentence>
Follow .cursor/rules/<relevant>.mdc and coding-standards.mdc.
Constraints: no ORM, no { success } envelope, status only via TicketStatusService,
Zod at route boundary, parameterized SQL.
Deliver: <files / tests expected>. Afterward I’ll typecheck and run the relevant tests.
```

### When the model drifts

Paste the **violated rule section** (or `@`-mention the `.mdc`) and request a fix that restores compliance. Record the correction in [`docs/code-review-notes.md`](../../docs/code-review-notes.md) / reflection.

---

## 4. Validation loop tied to rules

After accepting a diff, run the same checks the rules encode:

| Check | Driven by |
|-------|-----------|
| `npm run typecheck` (FE + BE) | `typescript-strict.mdc` |
| Zod at routes; `z.infer` types | `typescript-strict.mdc` |
| Parameterized SQL; no `SELECT *` | `database-standards.mdc` |
| No `passwordHash` on wire / client User | coding + TS rules |
| Status only via `TicketStatusService` / `PATCH …/status` | backend + coding rules |
| Single Tailwind entry; no `@apply` / inline styles for components | `tailwind-standards.mdc` |
| Zustand-first loading; 409 optimistic rollback | `react19-standards.mdc` |
| Env Zod; no secret fallbacks | coding / backend rules |
| State-machine tests **without** mocking `TicketStatusService` | backend testing rules |

---

## 5. What rules deliberately forbid (anti-patterns)

Agents and humans should reject drafts that introduce:

- Prisma, Kysely, or other ORMs  
- `{ success: true, data }` response envelopes  
- Authoritative status logic only in the React client  
- `dangerouslySetInnerHTML` for ticket/comment content  
- Hardcoded `JWT_SECRET` / `DATABASE_URL` defaults  
- `any`, `@ts-ignore`, `@ts-expect-error`  
- Core dark-mode Tailwind themes or a second global CSS file for components  

These bans are documented in the `.mdc` files so Cursor does not “helpfully” invent them.

---

## 6. Relationship to other artifacts

| Artifact | Role vs rules |
|----------|----------------|
| `project-context.md` | Points at rules; states precedence |
| `spec.md` / `tasks.md` | *What* to build; rules say *how* |
| `acceptance-criteria.md` | Maps FRs to rule touchpoints |
| `tool-workflow.md` | Part A narrative of rule usage across lifecycle |
| `docs/code-review-notes.md` | Concrete AI drift → rule correction examples |
| `docs/design-notes.md` | Trade-offs that still obey rules |

---

## 7. Reuse

For another project: copy the **shape** (always-on overview + scoped API/DB/FE/TS rules), rewrite domain content, keep the same attach → generate → validate → correct loop. Version rules in git so humans, CI expectations, and the agent share one definition of “good.”
