# CLAUDE.md — `@distribution-copilot/web`

The founder-facing dashboard. **Next.js App Router**, React 19, TypeScript, Tailwind +
shadcn/ui, TanStack Query (server state), Zustand (UI state), and a typed REST client.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/frontend-architecture.md`](../../docs/architecture/frontend-architecture.md)
> first. This file is the local quick-reference.

---

## Responsibilities

- Render the dashboard and the **review-first** UX of the core loop (discover → review →
  draft → the human posts manually).
- Own **client state** (TanStack Query for server data; Zustand for ephemeral UI).
- Consume the **REST API** via a typed `apiFetch` client; parse responses with shared Zod
  schemas.

## Boundaries

**Depends on:** `@distribution-copilot/shared`, `ui`, `config`.

**Must NOT:** import `@distribution-copilot/database` or Prisma types; contain business
logic that belongs in the API; hold secrets; import another app (`api`/`worker`).

**The publishing line:** the UI shows drafts and signals. The human edits and posts
**manually, off-platform**. There is no button that publishes to a platform and no
automated engagement — ever (see product §6).

## Folder conventions

```
src/
├── app/              # App Router: routes, layouts, route groups (kebab-case)
├── features/<f>/     # feature-scoped hooks + components + view models
│   ├── components/   # opportunity-table.tsx (kebab file, PascalCase export)
│   └── hooks/        # use-opportunities.ts → useOpportunities (wraps api-client)
├── components/       # cross-feature app components (providers.tsx, …)
├── lib/              # api-client.ts, query-client.ts, monitoring.ts, utils.ts
└── store/            # use-*-store.ts → useXStore (Zustand, UI state only)
```

`@/*` aliases `src/*`. Routes/route-specific UI go under `app/`; reusable feature logic in
`features/`; generic presentational primitives belong in `packages/ui`, not here.

## Patterns

- **Server Components by default.** Add `"use client"` only at interactive leaves; push the
  boundary as far down as possible.
- **Data fetching = TanStack Query + `apiFetch`.** Build hooks on `useQuery`/`useMutation`
  that call `apiFetch` and parse with shared schemas. Wrap feature access in a `use-*.ts`
  hook. Invalidate or optimistically update on mutation.
- **No runtime coupling to the API** — `lib/api-client.ts` talks REST over HTTP/JSON; the
  contract is the shared Zod schemas.
- **State decision tree:** server data → Query · shareable/navigational → URL search
  params · ephemeral UI → Zustand · component-local → `useState`.
- **Validate forms with shared Zod schemas** (same definitions the API uses).
- **Styling:** Tailwind tokens (`bg-background`, `text-foreground`); `cn()` for conditional
  classes; class order auto-sorted by Prettier (don't hand-sort).
- **TanStack Table** for data-dense lists, typed against domain types from `shared`, using
  the `Paginated<T>` contract.
- **Map HTTP error statuses to UX** (`401` → sign-in, `429` → backoff); `apiFetch` throws
  `ApiError` carrying the status.

## Anti-patterns

- Importing `database`/Prisma types in the web app.
- Server data in Zustand, or fetching with bare `useEffect`/`useState`.
- Business logic in components (presentation logic only).
- Secrets in client components or `NEXT_PUBLIC_*` (these ship to the browser).
- A "post to platform" or auto-engagement action of any kind.
- Reaching for a global store when URL state or `useState` fits.
- Hand-sorting Tailwind classes; raw hex colors instead of tokens.

## Implementation guidance

- New screen → add a route under `app/` (server component shell) + a `features/<f>/` hook
  for data + presentational components.
- Need a generic primitive (button, dialog)? Add it to `packages/ui` (shadcn), then use it
  here. App-specific compositions stay here, co-located with the feature.
- New API data? Add the route + shared schema in the API first (it's the contract), then a
  feature hook that fetches and parses with that schema.
- Keep `lib/` for client wiring only (api-client, query client, monitoring, utils).

## Commands

```bash
pnpm --filter @distribution-copilot/web dev          # http://localhost:3000
pnpm --filter @distribution-copilot/web build
pnpm --filter @distribution-copilot/web type-check
pnpm --filter @distribution-copilot/web lint
```

Key env: `NEXT_PUBLIC_API_URL` (API base URL), `NEXT_PUBLIC_POSTHOG_KEY/HOST`,
`NEXT_PUBLIC_SENTRY_DSN`. Only non-secret values belong under `NEXT_PUBLIC_*`.
