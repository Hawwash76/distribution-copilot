# Frontend Architecture (Next.js Web App)

`apps/web` is the founder-facing dashboard: **Next.js App Router** (ADR-013), React 19,
TypeScript, Tailwind + shadcn/ui (ADR-011), TanStack Query for server state (ADR-009),
Zustand for UI state (ADR-010), and a typed REST client (ADR-006).

Related: [`api-design.md`](api-design.md) (the contract it consumes),
[`packages/ui/CLAUDE.md`](../../packages/ui/CLAUDE.md), and
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md).

---

## 1. Responsibilities & boundaries

**The web app owns:** rendering the dashboard, the review-first UX of the core loop
(discover → review → draft → the human posts), and client-side state.

**It must not:** touch the database or Prisma, contain business logic that belongs in the
API, hold secrets, or import another app. It depends on `shared`, `ui`, and `config`.

**The publishing line:** the UI presents drafts and signals; the human edits and posts
**off-platform, manually**. There is no "post" button that publishes to Reddit/X — the UI
never automates engagement (see [`product.md`](product.md) §6). A "Mark as posted" action
records what the human did; it never posts.

---

## 2. App Router structure

```
apps/web/src/
├── app/
│   ├── layout.tsx              # root layout: metadata, <Providers>, global styles
│   ├── page.tsx                # landing/home
│   ├── globals.css             # Tailwind layers + design tokens
│   └── (dashboard)/            # route group for the authenticated app
│       ├── layout.tsx          # dashboard shell (nav/sidebar)
│       ├── opportunities/
│       │   └── page.tsx        # opportunity list (server component shell)
│       └── opportunities/[id]/
│           └── page.tsx        # opportunity detail + draft review
├── features/                   # feature-scoped client code (hooks, components, view models)
│   └── opportunities/
│       ├── components/         # opportunity-table.tsx, score-badge.tsx, …
│       └── hooks/              # use-opportunities.ts (wraps api-client + TanStack Query)
├── components/                 # cross-feature app components (not generic enough for ui/)
│   └── providers.tsx           # "use client": TanStack Query provider
├── lib/
│   ├── api-client.ts           # apiFetch() — typed REST calls to the API
│   ├── query-client.ts         # server/browser QueryClient factory
│   ├── monitoring.ts           # PostHog (env-gated, opt-in)
│   └── utils.ts                # cn() etc.
└── store/
    └── use-app-store.ts        # Zustand: ephemeral UI state only
```

Conventions: routes and route-specific UI live under `app/`; reusable feature logic lives
in `features/<feature>/`; truly cross-feature app components in `components/`; generic
presentational primitives belong in `packages/ui` (not here). The `@/*` path alias maps to
`src/*`.

---

## 3. Server vs. client components

- **Server Components are the default.** Pages and layouts are server components unless
  they need interactivity, browser APIs, hooks, or client state.
- **Client Components are opt-in** with `"use client"`, kept as **leaves** of the tree.
  Push the `"use client"` boundary as far down as possible so most of the page stays
  server-rendered. `providers.tsx` is a client boundary because it instantiates the
  TanStack Query client.
- **Never import server-only code or secrets into client components.** Anything in a
  client component (and anything `NEXT_PUBLIC_*`) ships to the browser.
- Use server components for data-dependent shells and client components for the
  interactive pieces (tables, forms, the draft editor).

---

## 4. Data fetching — TanStack Query + REST

**Server state is owned entirely by TanStack Query**, fed by the REST API. Never fetch into
`useState`/`useEffect` by hand, and never put server data in Zustand.

- `lib/api-client.ts` exports `apiFetch(path, init?)`, which calls the API at
  `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) and returns `unknown`. Callers
  parse the body with the relevant `@distribution-copilot/shared` Zod schema — one
  definition shared with the server, zero runtime coupling to the backend.
- `providers.tsx` wires the `QueryClient` (TanStack Query) for the client tree.
- `lib/query-client.ts` returns a **request-scoped** client on the server and a
  **singleton** in the browser (the standard App Router pattern); default `staleTime` is
  60s.
- Components call typed hooks built on `useQuery`/`useMutation` + `apiFetch`. Wrap feature
  data access in a `features/<feature>/hooks/use-*.ts` hook rather than calling `apiFetch`
  inline everywhere.
- Use Query's tools for the loop UX: `staleTime`/`refetch` for freshness, mutations with
  `invalidateQueries` (or optimistic updates) to keep the dashboard live, and the shared
  `Paginated<T>` shape for lists.

```ts
// features/opportunities/hooks/use-opportunities.ts (illustrative)
export function useOpportunities(input: ListOpportunitiesInput) {
  return useQuery({
    queryKey: ["opportunities", input],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(input.page) });
      return paginatedOpportunitySchema.parse(await apiFetch(`/opportunities?${params}`));
    },
    staleTime: 60_000,
  });
}
```

---

## 5. Client state — Zustand

- Zustand holds **ephemeral UI state only**: sidebar open, modals, selections, wizard
  steps, filters not worth putting in the URL. The existing `useAppStore` is the model.
- **No server data in Zustand.** If it comes from the API, it lives in TanStack Query.
- Stores are `store/use-*-store.ts` exporting `useXStore`. Keep them small and focused;
  prefer multiple small stores over one global blob. No shared mutable state beyond UI.
- Prefer URL state (search params) for things that should be shareable/bookmarkable
  (current filter, selected tab) over Zustand.

**The state decision tree:** server data → TanStack Query · shareable/navigational state →
URL · ephemeral UI → Zustand · component-local → `useState`.

---

## 6. UI, styling & components

- **Tailwind CSS** for styling; class order is auto-managed by
  `prettier-plugin-tailwindcss` — don't hand-sort. Use design tokens
  (`bg-background`, `text-foreground`) from the theme, not raw hex.
- **shadcn/ui** components: generic, reusable primitives live in
  `@distribution-copilot/ui` (the web app's `components.json` points its `ui` alias
  there). App-specific compositions live in `apps/web` co-located with their feature.
- Use the `cn()` helper for conditional classes (from `ui`/`lib/utils`).
- Components: file `kebab-case.tsx`, identifier `PascalCase`. Keep components focused;
  lift data fetching into feature hooks, keep components presentational where possible.
- **TanStack Table** powers data-dense views (opportunity lists): headless, typed, with
  our own shadcn-styled cells. Keep column defs typed against domain types from `shared`.

---

## 7. Forms & validation

- Validate form input with the **same Zod schemas** from `@distribution-copilot/shared`
  that the API uses — one definition, client and server agree.
- Show friendly, recoverable errors; map HTTP error statuses (see
  [`api-design.md`](api-design.md) §6) to UX (e.g. `401` → redirect to sign-in, `429` →
  backoff message). `apiFetch` throws an `ApiError` carrying the status.
- The draft editor is the heart of the review step: it must make editing effortless and
  never nudge toward one-click publishing.

---

## 8. Monitoring

- `lib/monitoring.ts` holds **opt-in, env-gated** PostHog setup that no-ops until its env
  var is present. PostHog `capture_pageview` is off by default (capture deliberately).
- **PostHog = product events.** Never log PII or secrets to it. `NEXT_PUBLIC_*` vars are
  public — no secrets there. Sentry error reporting was removed pending a real DSN — see
  root `CLAUDE.md` §13; `error.tsx` currently `console.error`s instead of reporting.

---

## 9. Performance

- Favor server components and streaming for fast first paint; keep client bundles small
  by pushing `"use client"` down the tree.
- Lean on TanStack Query caching/dedup instead of refetching; paginate lists.
- Don't prematurely optimize — measure (React profiler, Lighthouse) before adding
  memoization or splitting bundles. Correctness and readability first.

---

## 10. Anti-patterns (do not do)

- Importing `@distribution-copilot/database` or Prisma types in the web app.
- Putting server data in Zustand, or fetching with bare `useEffect` instead of Query.
- Business logic in components (belongs in the API; presentation logic only here).
- Secrets in client components or `NEXT_PUBLIC_*`.
- A "post to platform" / auto-engagement action — the product never publishes for the
  user.
- Reaching for a global store when URL state or component state fits.
- Hand-sorting Tailwind classes or using raw colors instead of tokens.
