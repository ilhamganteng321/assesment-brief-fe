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
