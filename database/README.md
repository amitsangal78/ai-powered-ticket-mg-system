# Database setup — Support Ticket Management System

This folder documents **PostgreSQL setup** for the project.  
**Runtime SQL migrations live in** [`../backend/migrations/`](../backend/migrations/) (not here). This README is the single place for “how do I get a working DB?”

Authoritative coding rules: [`.cursor/rules/database-standards.mdc`](../.cursor/rules/database-standards.mdc).  
All SQL, migrations, seed, and repository work must also respect the overview in [`.cursor/rules/coding-standards.mdc`](../.cursor/rules/coding-standards.mdc) and TypeScript/Zod wire rules in [`typescript-strict.mdc`](../.cursor/rules/typescript-strict.mdc).

---

## Related docs

| Doc | What it covers |
|-----|----------------|
| [`.cursor/rules/database-standards.mdc`](../.cursor/rules/database-standards.mdc) | Schema conventions, `pg_trgm`, seed/bcrypt, pool settings, no ORM |
| [`.cursor/rules/nodejs-backend-patterns.mdc`](../.cursor/rules/nodejs-backend-patterns.mdc) | Repositories, transactions, `FOR UPDATE` on status |
| [`.cursor/rules/`](../.cursor/rules/) | Full rule set used by Cursor during generation & review |
| [`../backend/README.md`](../backend/README.md) | API env vars, migrate/seed scripts, seed logins, testing notes |
| [`../README.md`](../README.md) | Project overview / how to run API + UI |
| [`../tool-specific/cursor-workflow/spec.md`](../tool-specific/cursor-workflow/spec.md) | Domain model, status machine, FR traces |
| [`../tool-specific/cursor-workflow/acceptance-criteria.md`](../tool-specific/cursor-workflow/acceptance-criteria.md) | FR-13 / persistence acceptance + rule touchpoints |
| [`../tool-workflow.md`](../tool-workflow.md) | Part A — how Cursor + rules are used |
| [`../docs/raw-requirements.md`](../docs/raw-requirements.md) | Original exercise requirements |
| [`../docs/design-notes.md`](../docs/design-notes.md) | Architecture / design decisions |

---

## Prerequisites

- **PostgreSQL 14+** (project tested against local Homebrew installs; 15/16/18 all fine)
- **Node.js 22+** (for migrate/seed scripts in `backend/`)
- Client tools: `psql`, `createdb` (optional but handy)

---

## 1. Start PostgreSQL

### macOS (Homebrew)

```bash
# Example: PostgreSQL 18 formula
brew services start postgresql@18

# Confirm something is listening
pg_isready -h localhost -p 5432
```

Other common formulas: `postgresql@16`, `postgresql@15`. Use whichever you installed.

### Check you can connect

```bash
# Password auth (replace user/password)
PGPASSWORD='your-password' psql -h localhost -U postgres -d postgres -c 'SELECT version();'

# Peer/trust auth (no password) — only if your local install allows it
psql -d postgres -c 'SELECT version();'
```

---

## 2. Create the application database

Default app DB name: **`tickets`**.

```bash
# With password
PGPASSWORD='your-password' createdb -h localhost -U postgres tickets

# Or via psql
PGPASSWORD='your-password' psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tickets;'
```

If you see `database "tickets" already exists`, you can continue.

Integration tests use a separate DB **`tickets_test`** (created automatically by the test helper if missing). You do **not** need to create it by hand for day-to-day app use.

---

## 3. Configure `DATABASE_URL`

Copy env in the backend package:

```bash
cd backend
cp .env.example .env
```

Set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/tickets
JWT_SECRET=replace-with-at-least-thirty-two-chars!!
FRONTEND_ORIGIN=http://localhost:5173
PORT=3000
NODE_ENV=development
```

### Connection string format

```text
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

Examples:

| Scenario | Example |
|----------|---------|
| Local user `postgres` / password `postgres` | `postgresql://postgres:postgres@localhost:5432/tickets` |
| Password contains `@` (e.g. `welcome@123`) | Encode `@` as `%40` → `postgresql://postgres:welcome%40123@localhost:5432/tickets` |
| No password (trust/peer) | `postgresql://localhost:5432/tickets` or `postgresql://USER@localhost:5432/tickets` |

**Important:** special characters in the password must be [percent-encoded](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) (`@` → `%40`, `#` → `%23`, etc.).

Optional for tests:

```env
TEST_DATABASE_URL=postgresql://postgres:welcome%40123@localhost:5432/tickets_test
```

If unset, backend integration tests default to `tickets_test` on localhost with the same style of credentials documented in helpers.

---

## 4. Migrate (apply schema)

Migrations are **apply-once** via `schema_migrations` (see database standards — not “IF NOT EXISTS for every table”).

```bash
cd backend
npm install          # first time
npm run migrate
```

Runner: [`../backend/src/db/migrate.ts`](../backend/src/db/migrate.ts)  
SQL files: [`../backend/migrations/`](../backend/migrations/)

| File | Purpose |
|------|---------|
| `001_enable_pgcrypto.sql` | `pgcrypto` for `gen_random_uuid()` |
| `002_create_users.sql` | `users` (roles `agent` \| `admin`, `password_hash`) |
| `003_create_tickets.sql` | `tickets` (status/priority CHECKs, FKs) |
| `004_create_comments.sql` | `comments` |
| `005_create_indexes.sql` | Unique email (lower), FKs indexes, **`pg_trgm` + GIN** on title/description |

Re-running `npm run migrate` skips already-applied files.

---

## 5. Seed users

```bash
cd backend
npm run seed
```

- Runtime **bcrypt cost 12** (never commit plaintext or precomputed hashes in SQL).
- Idempotent: skips emails that already exist.

### Login credentials (document in README only — not in code comments)

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `Admin123!` | `admin` |
| `agent@example.com` | `Agent123!` | `agent` |

---

## 6. Optional: demo tickets

For local UI scenarios (filters, status buttons, pagination, comments):

```bash
cd backend
npm run seed:tickets
```

- Inserts up to **50** demo tickets (mixed status/priority/assignee) plus sample comments.
- Skips if the DB already has ≥ 50 tickets.

Script: [`../backend/src/db/seedTickets.ts`](../backend/src/db/seedTickets.ts).

---

## 7. Verify

```bash
PGPASSWORD='your-password' psql -h localhost -U postgres -d tickets -c "\dt"
PGPASSWORD='your-password' psql -h localhost -U postgres -d tickets -c \
  "SELECT email, role FROM users ORDER BY email;"
PGPASSWORD='your-password' psql -h localhost -U postgres -d tickets -c \
  "SELECT status, COUNT(*) FROM tickets GROUP BY status ORDER BY 1;"
```

Then start the API:

```bash
cd backend
npm run dev
# → http://localhost:3000
```

Frontend (separate terminal):

```bash
cd frontend
# ensure VITE_API_URL=http://localhost:3000 in frontend/.env
npm run dev
# → http://localhost:5173
```

---

## Schema overview (snake_case in DB)

```text
users
  id (uuid PK), name, email, role, password_hash, created_at, updated_at

tickets
  id (uuid PK), title, description, priority, status,
  assigned_to → users, created_by → users,
  created_at, updated_at
  CHECKs: status ∈ Open | In Progress | Resolved | Closed | Cancelled
           priority ∈ low | medium | high

comments
  id (uuid PK), ticket_id → tickets, message, created_by → users, created_at

schema_migrations
  id (migration filename), applied_at
```

Wire JSON uses **camelCase** (`assignedTo`, `createdAt`); mapping happens only in repositories.

### Status transitions (enforced in `TicketStatusService`, not only in the UI)

| From | Allowed next |
|------|----------------|
| Open | In Progress, Cancelled |
| In Progress | Resolved, Cancelled |
| Resolved | Closed |
| Closed | *(none)* |
| Cancelled | *(none)* |

Illegal transitions → HTTP **409** `INVALID_TRANSITION`; DB row unchanged.

---

## Search & indexes

Core search approach (database standards):

- Extension: `pg_trgm`
- GIN indexes on `tickets.title` and `tickets.description`
- App query: case-insensitive `ILIKE` on title **OR** description, combinable with `status`

---

## Pool / connection settings (backend)

Configured in [`../backend/src/db/pool.ts`](../backend/src/db/pool.ts):

- `DATABASE_URL` from env only (no hardcoded secrets)
- Pool `max: 20` in development
- `statement_timeout: 30s`
- Production SSL: `rejectUnauthorized: true` when `NODE_ENV=production`

---

## Testing database

```bash
cd backend
npm test
```

- Unit/route tests: mostly mocked services/repos.
- **Integration** suites (`stateMachine.integration.test.ts`, `api.integration.test.ts`):
  - Real Postgres DB (default `tickets_test`)
  - Real `TicketStatusService` — **do not mock it** in those tests
  - Auto-create DB → migrate → seed admin/agent → truncate tickets between cases

Helpers: [`../backend/src/__tests__/helpers/`](../backend/src/__tests__/helpers/).

---

## Docker Compose (Postgres + API)

From the **repository root**:

```bash
cp .env.example .env   # optional
docker compose up --build
```

| Service | Image / build | Host access |
|---------|---------------|-------------|
| `postgres` | `postgres:16-alpine` | `localhost:${POSTGRES_PORT:-5432}` |
| `backend` | `backend/Dockerfile` | `localhost:${API_PORT:-3000}` |

Default DB credentials in Compose: user/password/db = `postgres` / `postgres` / `tickets`.  
Backend container URL uses hostname **`postgres`** (service name), not `localhost`.

Entrypoint runs `migrate` → `seed` → `node dist/index.js`. No secrets are copied into the image.

See also the root [`README.md`](../README.md) Docker section.

---

## Quick checklist

1. [ ] PostgreSQL running on `localhost:5432`
2. [ ] Database `tickets` created
3. [ ] `backend/.env` has a working `DATABASE_URL` (encode special chars in password)
4. [ ] `npm run migrate` in `backend/`
5. [ ] `npm run seed` in `backend/`
6. [ ] (Optional) `npm run seed:tickets`
7. [ ] `npm run dev` in `backend/` and `frontend/`

---

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| `ECONNREFUSED` / `connection refused` | Start Postgres (`brew services start postgresql@…`); check port **5432** |
| `fe_sendauth: no password supplied` | Use `PGPASSWORD=…` or put user+password in `DATABASE_URL` |
| `password authentication failed` | Wrong password; confirm with `psql -U postgres -h localhost` |
| `database "tickets" does not exist` | Run `createdb` / `CREATE DATABASE tickets` |
| `DATABASE_URL` parse / Zod env fail | Fix URL encoding; ensure `JWT_SECRET` ≥ 32 chars |
| Migration “already applied” then missing tables | You may be pointing at a different database than you think — check `DATABASE_URL` |
| Seed “already present” | Expected / safe; users were inserted earlier |
| `seed:tickets` skipped | Already ≥ 50 tickets; delete some or leave as-is |
| Integration tests fail connecting | Ensure Postgres is up; set `TEST_DATABASE_URL`; run with network/local DB access |
| Homebrew `postgresql@18` shows `error` but another version answers | `pg_isready` / `SELECT version()` — connect to the instance that is actually listening |
| Special char in password breaks URL | Percent-encode (`@` → `%40`) |

---

## What this folder is *not*

- **Not** the migration directory — do not put production schema DDL only here.
- **Not** a second source of truth for status rules — those live in code (`TRANSITIONS` + `TicketStatusService`) and are checked by Postgres CHECKs for allowed status *values*.

Scratch SQL experiments can live under `database/` if useful; keep apply-once migrations in `backend/migrations/`.
