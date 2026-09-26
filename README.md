# Frontend — Project Management Portal

Next.js 16 (App Router) + React 19 + TypeScript, talking to the Hono API in
`../backend`.

The frontend is a **client of the API, not a second implementation of it**. It
mirrors the server's rules so the interface never offers an action the API will
refuse, but every button it hides is also a check the API makes on its own. A
reviewer who ignores the UI and calls the endpoints directly gets exactly the
same answers.

---

## Quick start

```bash
pnpm install            # or: bun install
cp .env.example .env.local
```

`.env.local`:

```
NEXT_PUBLIC_BE_URL=http://localhost:3000
```

```bash
pnpm dev                # http://localhost:3001
```

The API must be running and seeded — see `../backend/README.md` for the demo
accounts.

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_BE_URL` | yes | Base URL of the deployed API. Must be `https` in production, except for loopback |

There is no hardcoded backend URL anywhere in the app. `lib/api/env.ts` reads
`NEXT_PUBLIC_BE_URL` and **rejects** a value that would be unsafe in production
— plain `http` to a non-loopback host, embedded credentials, a query string or a
fragment. If the variable is missing or unusable the API client refuses every
request with an `INVALID_CONFIGURATION` error rather than quietly falling back to
a same-origin or development URL, so a misconfigured deployment fails loudly
instead of appearing to work against the wrong host.

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server on port 3001 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | `next typegen` then `tsc --noEmit` |
| `pnpm lint` | ESLint then Biome |
| `pnpm test` | Unit tests (222) |
| `pnpm check` | typecheck + lint + test |
| `pnpm test:auth:integration` | Drives the real auth API end to end |
| `pnpm test:projects:integration` | Drives the real project API end to end |

---

## Demo walkthrough

A recorded demo that touches every rule the assessment is built around, in the
order the rules build on each other. Frontend only; the API is doing the enforcing
the whole time.

**Before recording**, put the database back to the seeded state so the numbers
match the script. The seed is idempotent, so this is safe to re-run:

```bash
cd ../backend && bun run seed
```

### The cast

| Role | Email | Password | Owns |
| --- | --- | --- | --- |
| Product Manager | `pm@aurora.demo` | `DemoPass#2026` | Priya Sharma |
| Internal — Backend | `backend@aurora.demo` | `DemoPass#2026` | Tomas Oliveira |
| Internal — Frontend | `frontend@aurora.demo` | `DemoPass#2026` | Maya Chen |
| Internal — UI/UX | `uiux@aurora.demo` | `DemoPass#2026` | Leo Nguyen |
| Client Guest | `client@aurora.demo` | `DemoPass#2026` | Grace Kim |

One project, **Aurora Retail Replatform** (client: Aurora Retail), with five
tasks arranged as a diamond:

```
UI Design (Home & Checkout)   DONE     Leo        client-visible
Backend API Integration       TODO     Tomas      client-visible
        └──────────┬──────────┘
           Frontend Slicing    BLOCKED  Maya       client-visible
QA & Testing                  IN_PROGRESS  Leo     client-visible
Deployment Prep               TODO     Tomas      internal only
```

Frontend Slicing depends on **both** UI Design and Backend API Integration, so
completing one prerequisite is not enough to unblock it. That is the point of
the walkthrough.

### 1 — Signed out

Open `/login`. The form is the first thing on screen and nothing else is
reachable: type `/dashboard` or `/projects` into the address bar and you land
back here with the path you wanted preserved.

### 2 — Product Manager (the owner)

Sign in as `pm@aurora.demo`.

1. **Dashboard** — greeting plus totals: All projects / Active / Completed /
   Archived.
2. **Projects → Aurora Retail Replatform** — the project dashboard. This is the
   densest screen; point at *Project progress*, *Task metrics* and *Task status
   distribution* (server-computed, not derived in the browser), then *My tasks*,
   *Department progress* and *Recent activity*.
   **Point out:** the task list shows **five** tasks, including *Deployment
   Prep* — the client-visible flag is a PM-only concept.
3. **Tasks** — the board. Demonstrate the query contract live: search
   "design", switch *Status* to `IN_PROGRESS`, switch *Block state* to
   `Blocked only`, change the sort, then page. One screen, every filtering,
   searching, sorting and pagination rule the API implements.
4. Open **Frontend Slicing** — *Dependencies* lists both prerequisites;
   *Status* shows the transitions the PM may perform and why the others are not
   available.
5. **The rule that sells the RBAC:** open **QA & Testing**, which is in progress
   and assigned to Leo. The *Status* panel lists its transitions; `DONE` is
   disabled and a line underneath reads
   `Done: Only the assignee can mark this task done.` A PM can start, reassign
   and re-prioritise other people's work, but cannot close it. The reason is
   printed rather than left as a tooltip on a greyed-out button, because a
   disabled control with no explanation reads as a bug rather than a rule.
6. Open the edit dialog on QA & Testing — as PM every field is editable,
   including description, department and client visibility.
7. *Activity* at the bottom of the task — the audit trail: who, which column,
   the old value, the new value, and when.
8. Sign out.

### 3 — Internal Backend (does the work, owns less)

Sign in as `backend@aurora.demo`.

1. **Dashboard / Projects** — scoped to the projects this engineer is a member
   of.
2. **Tasks** — open **Backend API Integration** (his own, currently `TODO`).
3. Move it to `IN_PROGRESS`, then to `DONE`. Two transitions, two audit rows.
4. Upload an attachment to the task — the *Attachments* panel.
5. Open the edit dialog: title is editable, **description, department, priority,
   assignee and client visibility are disabled**. This is the PM-only half of
   RBAC, shown in the UI; the API refuses the same fields regardless.
6. *Activity* now shows his own two transitions with timestamps.
7. Sign out.

### 4 — Internal Frontend (the unblock)

Sign in as `frontend@aurora.demo`.

1. **Tasks**, set *Block state* to `Blocked only` → **Frontend Slicing**.
   With *Backend API Integration* now done and *UI Design* already done, both
   prerequisites are satisfied.
2. The *Status* panel offers `IN_PROGRESS` and it is no longer blocked — the
   reason string is gone.
3. Move it to `IN_PROGRESS`. This is the moment the dependency graph pays off.
4. Upload an attachment here too.
5. Sign out.

### 5 — Client Guest (tenant isolation)

Sign in as `client@aurora.demo`.

1. Signing in lands on the client dashboard: a progress bar per project and a
   count of client-visible work. No internal metrics, no departments, no
   assignee, no version, no priority.
2. **The nav is visibly different** — there is no *Tasks* entry, because the
   flat task API refuses a client guest outright.
3. **Projects → Aurora Retail Replatform** — only the four client-visible tasks.
   **Deployment Prep is absent.**
4. Open a task — the detail route is a different component reading a different
   endpoint. No *Dependencies*, no *Activity*, no *Attachments*, no status
   control: the client portal is a restricted surface end to end, not the
   internal page with fields hidden.
5. **The direct-access check:** type `/tasks` into the address bar. The route
   guard redirects to the dashboard — and the point is that the server would
   have returned `403` regardless, so ignoring the redirect gains nothing.
6. Sign out.

### 6 — Optimistic locking (two windows)

1. Open the same task in two browser windows side by side.
2. In **window A**, edit the description and save. The version advances.
3. In **window B**, still holding the version it read, make an edit and save.
4. The request is rejected: the API answers `409 CONCURRENT_MODIFICATION` and
   the UI shows the server's conflict message and refetches instead of
   overwriting. Window A's text is still there.
5. Worth saying: the write is whole-row, so changing a *different* field still
   conflicts. Two people editing two different fields do not merge — the second
   writer is told to retry. The losing write leaves no audit row, because the
   audit write shares the transaction.

### 7 — Settings

Sign back in as any role and open **Settings** for the account details. Ends the
demo on the one screen that is the same for every role.

### Resetting between takes

`bun run seed` is idempotent and never overwrites work in progress, so to get
back to the exact starting state above, reset the database and re-seed:

```bash
cd ../backend && bun run verify:clean-database
```

That builds a scratch database from the migrations, seeds it and drops it again.

---

## Architecture

```
app/                 routes only — a page composes feature components
features/<area>/
    components/      presentational + interaction for one area
    api.ts           request functions for that area
    hooks.ts         TanStack Query hooks (queries + mutations)
    schemas.ts       Zod schemas shared by forms and tests
    types.ts         the shapes the API returns
    permissions.ts   advisory mirror of the server policy
lib/
    api/             the axios client, token storage, error normalisation,
                      and the query-string serializer
    query/           the shared TanStack Query client
components/ui/       presentational primitives
components/layout/   page chrome
providers/           React Query + auth providers
```

Two rules hold throughout:

**Pages hold no business logic.** A page composes feature components; anything
that decides *what may happen* lives in a policy, schema or query hook, where it
can be unit tested.

**Permissions are advisory and say so.** `features/tasks/permissions.ts` mirrors
the server's named rules one for one so they can be compared directly. Hiding a
button is never what enforces a rule — `canChangeStatusTo` returning `false` is a
usability measure, and the API refusing the request is the enforcement.

### Data fetching

TanStack Query owns all server state. Mutations invalidate the narrowest affected
query keys, and a `409 CONCURRENT_MODIFICATION` invalidates the task lists so the
UI refetches the state the server actually holds rather than keeping a value it
knows is stale.

The query-string serializer in `lib/api/query/` builds the `filters` /
`searchFilters` / `rangedFilters` / `page` / `rows` / `orderKey` / `orderRule`
contract the API defines, so every list on every screen sends the same shape.

### State

- **Zustand** — session and UI state that must survive a re-render but is not
  server state.
- **React Hook Form + Zod** — every form, with the same schemas the tests use.

### Route protection

`features/auth/route-guard.tsx` provides three guards:

| Guard | Behaviour |
| --- | --- |
| `ProtectedRoute` | Unauthenticated visitors are redirected to `/login`, remembering where they were going. Sign-out returns them there. |
| `PublicOnlyRoute` | Signed-in users on `/login` or `/register` are sent onward |
| `InternalOnlyRoute` | A client guest who types an internal URL is redirected to their dashboard |

These are **usability, not security**. The flat task API and the internal
project endpoints refuse a `CLIENT` outright, so a client guest who ignores the
redirect still receives a `403` from the server and nothing else. The client
portal reads a different, sanitised endpoint set all the way down rather than
hiding fields on the internal one.

### Loading, empty, error and success states

Every screen handles all four. `QueryErrorState` offers a retry,
`EmptyState` explains why there is nothing to show, and the skeletons
(`project-grid-skeleton`, `task-list-skeleton`, `project-detail-skeleton`) keep
the layout from jumping. A failed session check is distinguished from a missing
one: a network error offers a retry and explicitly does **not** clear the
session, while a `401` redirects to sign in.

### A note on the shadcn primitives

`components/ui/*` and `components.json` are **not** stock shadcn output. They
carry local changes the app depends on — a `ButtonLink` that renders a real
anchor, `muted` and `accent` variants, and Phosphor rather than another icon
library.

Running the `shadcn` CLI can overwrite all of that. shadcn v4 changed its
default icon library, so a regeneration also rewrites `components.json` and adds
an icon dependency, which quietly breaks four feature components.

If that happens, `git checkout -- components package.json components.json` and
then add anything genuinely missing by hand. `bun run typecheck` catches it
immediately (`next build` fails on type errors too), so a regeneration cannot
reach a deployment unnoticed.

---

## Security notes

Response headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, and HSTS in production) are set in
`next.config.ts`.

A `Content-Security-Policy` is deliberately not set here. Next.js hydrates with
inline scripts, so a policy worth having needs per-request nonces threaded
through the framework; `unsafe-inline` would defeat the point. Set a real CSP at
the edge in front of the deployment.

The access token is kept in **`sessionStorage`** behind a single accessor
(`lib/api/token-storage.ts`) so the session can be cleared from one place — for
example when the API reports the token is no longer valid. Two consequences are
deliberate:

- `sessionStorage` is per-tab and dies with the tab, so closing the browser ends
  the session without a server-side revocation list.
- It is still readable by any script on the page, so it is not a defence against
  XSS. An `httpOnly` cookie would be, but it would move session ownership out of
  the API and require CSRF protection. Given the API is the single owner of the
  session, the token-in-header model is the simpler trade; it is recorded here
  rather than left implicit.
