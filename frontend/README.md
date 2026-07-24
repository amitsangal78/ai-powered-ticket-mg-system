# Frontend — Support Ticket Management System

React 19 + Vite 6 SPA for the Support Ticket Management System. Zustand owns server state; Tailwind CSS 4 handles styling; React Router guards authenticated routes. Talks to the Express API with Bearer JWT.

This package **strictly follows**:

| Rule | Path |
|------|------|
| React 19 / Zustand / routing | [`../.cursor/rules/react19-standards.mdc`](../.cursor/rules/react19-standards.mdc) |
| Tailwind CSS 4 | [`../.cursor/rules/tailwind-standards.mdc`](../.cursor/rules/tailwind-standards.mdc) |
| TypeScript / Zod | [`../.cursor/rules/typescript-strict.mdc`](../.cursor/rules/typescript-strict.mdc) |

Also respect the overview in [`../.cursor/rules/coding-standards.mdc`](../.cursor/rules/coding-standards.mdc).

**Do not:**

- Put authoritative status-machine logic in the client (server enforces; UI only renders `TRANSITIONS[currentStatus]` buttons)
- Use `dangerouslySetInnerHTML` for ticket/comment content
- Add a second custom CSS file, `@apply` for components, or inline `style={{}}`
- Add Core `dark:` variants
- Use `any`, `@ts-ignore`, or hand-written domain interfaces that drift from Zod
- Duplicate pending flags in both `useActionState` and a store for the same submit

---

## Prerequisites

- Node.js **22**
- Backend API running (see [`../backend/README.md`](../backend/README.md))
- npm

---

## Setup

```bash
cd frontend
cp .env.example .env    # set VITE_API_URL
npm install
npm run dev
```

Open **http://localhost:5173**. Ensure the backend `FRONTEND_ORIGIN` matches this app’s URL so CORS allows requests.

### Environment

| Variable | Example | Notes |
|----------|---------|--------|
| `VITE_API_URL` | `http://localhost:3000` | API base URL (no trailing slash required) |

Never commit real `.env` files.

### Seed logins (from root / backend README)

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `Admin123!` | `admin` |
| `agent@example.com` | `Agent123!` | `agent` |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server (default port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | **Vitest + React Testing Library** |
| `npm run typecheck` | `tsc --noEmit` with strict flags |

---

## Stack (aligned with rules)

| Concern | Choice |
|---------|--------|
| UI | React **19**, Vite **6** |
| State | Zustand **5** — five stores |
| Routing | React Router v6/v7 + `ProtectedRoute` |
| Forms | `useActionState` (login / create ticket); `useOptimistic` (comments / status) |
| Styling | Tailwind CSS **4** — single `src/index.css` with `@import "tailwindcss"` |
| Types | Zod schemas + `z.infer`; camelCase wire types matching backend |
| Auth token | JWT in `sessionStorage` via `authStore` |

---

## Folder layout

```
frontend/
├── src/
│   ├── main.tsx              # entry; import index.css once
│   ├── index.css             # ONLY custom CSS — Tailwind v4 entry
│   ├── app/                  # router, layout, ProtectedRoute
│   ├── pages/                # Login, TicketList, TicketDetail (+ AdminUsers Stretch)
│   ├── components/           # named exports; one non-trivial component per file
│   ├── stores/               # authStore, ticketStore, userStore, filterStore, uiStore
│   ├── api/                  # fetch wrapper, Bearer header, Zod parse
│   ├── schemas/              # Zod mirrors of backend domain (keep identical)
│   └── lib/                  # TRANSITIONS (UI filter), STATUS_STYLES / PRIORITY_STYLES
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## Component & state patterns

### 1. Zustand-first data loading (`react19-standards.mdc`)

Stores hold server data, loading/error, and async API actions. Pages trigger fetches with `useEffect` — do not invent ad-hoc `useState` + `fetch` when a store action exists. Do not mix Suspense/`use(Promise)` as a second source of truth for the same list.

```tsx
// Canonical list pattern
function TicketListPage(): React.JSX.Element {
  const { tickets, loading, error, fetchTickets } = useTicketStore();
  const status = useFilterStore((s) => s.status);
  const search = useFilterStore((s) => s.search);

  useEffect(() => {
    void fetchTickets({ status, search });
  }, [status, search, fetchTickets]);

  if (loading) return <TicketListSkeleton />;
  if (error) return <p role="alert">{error}</p>;
  return (
    <ul>
      {tickets.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}
```

| Store | Role |
|-------|------|
| `authStore` | JWT in `sessionStorage`, login/logout, hydrate via `/api/auth/me` |
| `ticketStore` | Ticket list/detail, CRUD, status, comments |
| `userStore` | Assignee picker (+ admin CRUD Stretch) |
| `filterStore` | `search`, `status` (drives list refetch) |
| `uiStore` | Optional cross-cutting UI errors |

### 2. API client

- Base URL: `import.meta.env.VITE_API_URL`
- Attach `Authorization: Bearer` from `authStore` when present
- On **401**: clear auth, redirect to `/login`
- On **409**: surface inline / `uiStore`; roll back optimistic UI
- Parse success with domain Zod schemas; parse errors with `apiErrorSchema`
- Success bodies are bare resources (no `{ success: true }` wrapper) — map to an internal `ClientResult<T>` if useful (`typescript-strict.mdc`)

### 3. Forms — `useActionState`

Prefer for **login** and **create ticket**. One pending source for that submit (not also a store flag).

```tsx
const [state, formAction, isPending] = useActionState(createTicketAction, initialState);

return (
  <form action={formAction} className="space-y-4">
    {/* labeled inputs + Tailwind utilities */}
    <button
      type="submit"
      disabled={isPending}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Create Ticket
    </button>
    {state.error ? <p role="alert">{state.error}</p> : null}
  </form>
);
```

### 4. Optimistic UI — `useOptimistic`

Use for **comments** and **status transitions**. On failure (especially **409**), roll back; keep the store as the committed source of truth after the server responds.

### 5. Routing & components

- `ProtectedRoute` → redirect to `/login` if unauthenticated
- Admin nav/routes: **hide** (don’t disable) unless `role === 'admin'`; wait for auth hydration
- **Named exports** only; one non-trivial component per file
- Colocate tests as `ComponentName.test.tsx` (Vitest + RTL)
- Error boundaries around route-level pages
- Prefer Zustand over React Context for app data

### 6. Status buttons (UI filter only)

```ts
// lib/transitions.ts — mirrors server; not authoritative
export const TRANSITIONS = {
  Open: ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed'],
  Closed: [],
  Cancelled: [],
} as const;
```

- Render buttons only for `TRANSITIONS[current]`
- `Closed` / `Cancelled` → badge only, no buttons
- Pending: `disabled:opacity-50 disabled:cursor-not-allowed`
- Show **409** inline; no full-page reload

### 7. Tailwind patterns (`tailwind-standards.mdc`)

**Single CSS entry** (`src/index.css`):

```css
@import "tailwindcss";
```

Import once from `main.tsx`. Utilities only in components.

**Layout:** mobile-first; page shell `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`; root `min-h-screen`.

**Centralize badge colors** (exact maps):

| Status | Classes |
|--------|---------|
| Open | `bg-gray-100 text-gray-800` |
| In Progress | `bg-yellow-100 text-yellow-800` |
| Resolved | `bg-green-100 text-green-800` |
| Closed | `bg-purple-100 text-purple-800` |
| Cancelled | `bg-red-100 text-red-800` |

| Priority | Classes |
|----------|---------|
| low | `bg-blue-100 text-blue-800` |
| medium | `bg-yellow-100 text-yellow-800` |
| high | `bg-red-100 text-red-800` |

Primary actions: `bg-blue-600 hover:bg-blue-700 text-white`.  
Cards: `rounded-lg border border-gray-200 bg-white p-6 shadow-sm`.  
Skeletons: `animate-pulse`. Never `outline-none` without `focus:ring-*`.

### 8. TypeScript patterns (`typescript-strict.mdc`)

- Domain schemas in `src/schemas/` must match backend field-for-field
- Public `User` type **must not** include `passwordHash`
- Exported functions / components: explicit return types
- Narrow API JSON with Zod before writing into stores — no `as Ticket` without a successful parse

---

## Routes (intended)

| Path | Access | Page |
|------|--------|------|
| `/login` | public | Login form |
| `/tickets` | authenticated | List + search/status filters |
| `/tickets/:id` | authenticated | Detail, edit fields, comments, status |
| `/users` | `admin` only (Stretch) | User management (`AdminRoute`) |

---

## Related docs

Implementation and reviews must follow [`.cursor/rules/`](../.cursor/rules/) (see table at top). Lifecycle artifacts:

- Root [`../README.md`](../README.md) — full-stack setup  
- [`../backend/README.md`](../backend/README.md) — API list & CORS  
- [`../docs/design-notes.md`](../docs/design-notes.md) — frontend architecture diagrams  
- [`../tool-specific/cursor-workflow/spec.md`](../tool-specific/cursor-workflow/spec.md) — FRs & acceptance criteria  
- [`../tool-specific/cursor-workflow/acceptance-criteria.md`](../tool-specific/cursor-workflow/acceptance-criteria.md) — FR → UI/tests → rules  
- [`../tool-specific/cursor-workflow/cursor-rules-or-instructions.md`](../tool-specific/cursor-workflow/cursor-rules-or-instructions.md) — how rules are attached in Cursor  
- [`../docs/reflection.md`](../docs/reflection.md) / [`../docs/code-review-notes.md`](../docs/code-review-notes.md)  
- [`../tool-workflow.md`](../tool-workflow.md) — Part A workflow  

