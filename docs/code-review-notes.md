# Code Review Notes

Review evidence for the AI Capability Exercise: how diffs were checked against [`.cursor/rules/`](../.cursor/rules/), and how AI output was corrected.

Related: [`reflection.md`](./reflection.md), [`cursor-rules-or-instructions.md`](../tool-specific/cursor-workflow/cursor-rules-or-instructions.md), [`tool-workflow.md`](../tool-workflow.md).

---

## 1. Review checklist used on every wave

Reviewers (human + Cursor-as-second-pass) asked:

1. **Layers:** routes call services only; repositories own SQL (`nodejs-backend-patterns.mdc`, `coding-standards.mdc`).  
2. **Wire contract:** success = bare resource; errors = `{ error, code, details? }` — no `{ success }` (`typescript-strict.mdc`).  
3. **Auth/security:** bcrypt cost 12; JWT claims; no `password_hash` selected for responses; rate limit on login (`nodejs-backend-patterns.mdc`).  
4. **Status:** only `TicketStatusService` / `PATCH …/status`; general PATCH rejects `status` (`coding-standards.mdc`).  
5. **SQL:** parameterized; no `SELECT *`; snake↔camel only in repos (`database-standards.mdc`).  
6. **Frontend:** Zustand-first; optimistic rollback on 409; no authoritative client state machine (`react19-standards.mdc`).  
7. **Tailwind:** single `index.css` entry; utilities only; focus rings (`tailwind-standards.mdc`).  
8. **Tests:** state-machine suite does **not** mock `TicketStatusService`.  
9. **Secrets:** no `.env` committed; Docker/CI inject runtime env.

Cursor prompt used for advisory review:

```text
Review this diff only against .cursor/rules/*.mdc and tool-specific/cursor-workflow/spec.md.
List rule violations, missing tests, and auth/error-code gaps. Do not rewrite unrelated files.
```

Human still owns the merge decision.

---

## 2. AI drift → correction examples

### Example A — Response envelope

| | |
|--|--|
| **Symptom** | Draft wrapped list endpoints as `{ success: true, data: tickets }`. |
| **Rule** | `typescript-strict.mdc` / `coding-standards.mdc` — bare resources on success. |
| **Correction** | Reverted to `Ticket[]` / bare objects; updated OpenAPI and FE Zod parse accordingly. |
| **Lesson** | Envelope “best practices” from general training conflict with this repo’s wire contract — rules must win. |

### Example B — ORM suggestion

| | |
|--|--|
| **Symptom** | Suggestion to add Prisma for faster CRUD. |
| **Rule** | `database-standards.mdc` — `pg` only; repositories with parameterized SQL. |
| **Correction** | Kept `pg` pool + explicit SQL; rejected dependency. |
| **Lesson** | Speed of generation ≠ correct stack for the exercise or the rules. |

### Example C — Client-authoritative status

| | |
|--|--|
| **Symptom** | UI draft blocked buttons *and* claimed invalid transitions without calling the API. |
| **Rule** | `react19-standards.mdc` + coding standards — UI filters buttons via `TRANSITIONS`; server enforces. |
| **Correction** | Buttons filtered for UX; every change still `PATCH …/status`; 409 shown inline with optimistic rollback. |
| **Lesson** | Filtering UX ≠ replacing the state machine. |

### Example D — Integration test races

| | |
|--|--|
| **Symptom** | Flaky failures when state-machine and API integration suites ran in parallel on one DB. |
| **Rule** | Backend testing guidance: real DB, real `TicketStatusService`, stable isolation. |
| **Correction** | Disabled file parallelism / constrained to single thread for backend Vitest; truncate helpers between cases. |
| **Lesson** | AI-generated tests need harness ownership; green locally once is not enough. |

### Example E — Migrate CLI under Docker

| | |
|--|--|
| **Symptom** | `isDirectRun` compared resolved `argv[1]` to unresolved `import.meta.url` path forms inconsistently. |
| **Rule** | Operational correctness for migrations (`database-standards` + Docker FR-20). |
| **Correction** | `path.resolve` both sides so `node dist/db/migrate.js` in the container actually applies migrations. |
| **Lesson** | Edge environments (Docker cwd/argv) expose assumptions unit tests on host may miss. |

---

## 3. Security / correctness focus areas

| Area | Finding | Resolution |
|------|---------|------------|
| Password fields | Ensure User Zod/public types omit hash | Types + repository column lists audited |
| Status PATCH body | Reject `status` on general PATCH | Explicit 400 `VALIDATION_ERROR` |
| Login abuse | Missing limit in early draft | 10 / 15 min / IP → 429 `RATE_LIMITED` |
| CORS | Over-broad origin | Locked to `FRONTEND_ORIGIN` |
| XSS | HTML in tickets | Plain-text Zod (no `<>`); text nodes only; no `dangerouslySetInnerHTML` |

---

## 4. What still deserves scrutiny in future PRs

- FE/BE Zod drift on shared domain fields  
- Any new Stretch that weakens Core transition tests  
- Secrets accidentally added to compose defaults beyond local-dev placeholders  
- Pagination API (FR-17) if added — must not invent `{ success }` page wrappers; document envelope explicitly per rules  

---

## 5. Sign-off stance

Code review for this exercise is **rules + tests + ownership**:

1. Diff complies with [`.cursor/rules/`](../.cursor/rules/).  
2. Mandatory state-machine integration tests pass.  
3. Author can explain trade-offs (see [`design-notes.md`](./design-notes.md) and [`reflection.md`](./reflection.md)).

AI review comments are advisory; unverified claims are treated as TODO until confirmed in code.
