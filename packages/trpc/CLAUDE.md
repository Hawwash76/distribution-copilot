# CLAUDE.md — `@distribution-copilot/trpc`

The **API contract**: the tRPC root router, context, and builders shared between the
NestJS API (host) and the Next.js web app (client). This is what gives the product
end-to-end type safety.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/api-design.md`](../../docs/architecture/api-design.md) first.

> **Status:** `appRouter` is empty (`router({})`); the context returns `{}`. The builders
> (`router`, `publicProcedure`, `middleware`, …) exist. Feature routers and a real context
> are added as the API grows.

---

## Responsibilities

- Define the **root `appRouter`** and export its type (`AppRouter`) for the client.
- Define the **request `Context`** shape and `createContext` factory (filled in by the API
  host).
- Export the reusable **builders**: `router`, `publicProcedure`, `middleware`,
  `createCallerFactory`, `mergeRouters`.

## Boundaries

**Depends on:** `@trpc/server`, `zod`, and `@distribution-copilot/shared`.

**Must NOT:** import `database`/Prisma, any app, framework runtimes (NestJS/Next), or a
concrete DB/session. It is the **framework-free contract**. The API _host_ injects the real
Prisma client and session into the context at runtime — this package only declares the
context's type.

**Two consumers, two roles:**

- The **API hosts** it (mounts the router at `/trpc`, builds the real context).
- The **web imports `AppRouter` as a type only** — full inference, zero runtime coupling.

## Folder conventions

```
src/
├── index.ts            # public surface: appRouter + AppRouter, context exports, builders
├── trpc.ts             # initTRPC instance + builders (router/procedure/middleware/…)
├── context.ts          # Context type + createContext factory
├── root.ts             # appRouter (merges feature routers) + AppRouter type
└── routers/            # feature routers live here (or in the API feature modules)
```

> **Where feature routers live:** routers are defined inside the owning API feature module
> (`apps/api/src/modules/<feature>/<feature>.router.ts`) and merged into `appRouter`. Keep
> this package's `routers/` for contract-level composition; don't put business logic here.

## Patterns

- **Compose by feature** into the root: `router({ opportunity: opportunityRouter, … })`.
- **Procedure tiers:** `publicProcedure` (no auth) and `protectedProcedure` (a public
  procedure + auth middleware that throws `UNAUTHORIZED` and narrows `ctx.user` to
  non-null).
- **Validate inputs with Zod schemas from `shared`** — reuse, don't redeclare shapes.
- **Procedures are thin** — they delegate to API services; this package defines the
  contract, not the logic. Outputs are **domain types** from `shared`, never Prisma rows.
- **Errors** are typed `TRPCError`s with correct codes (see `api-design.md` §6).
- **The context type declares dependencies** (`user`, `prisma`, services); the API host
  provides the concrete values.

## Anti-patterns

- Importing `@distribution-copilot/database`/Prisma or a framework runtime here.
- Putting business logic, DB queries, or service implementations in this package.
- Returning Prisma types from procedures (map to domain types in the API repository).
- Redeclaring input/domain shapes instead of reusing `shared` schemas.
- The web app importing anything but the **type** `AppRouter`.
- Deeply nested routers — group by feature, keep it shallow.

## Implementation guidance

- **New endpoint:** add the procedure to the feature's `*.router.ts` (in the API module),
  validate input with a `shared` schema, delegate to a service, merge the feature router
  into `appRouter` here.
- **Auth:** define `protectedProcedure` via `publicProcedure.use(authMiddleware)`; the
  middleware reads `ctx.user` (resolved by the host from Better Auth).
- **Evolving the contract:** prefer additive changes; breaking changes surface as type
  errors in the web app immediately — fix the client in the same change. This is internal,
  TS-to-TS; a public API would need a new ADR.

## Commands

```bash
pnpm --filter @distribution-copilot/trpc build       # tsc → dist/
pnpm --filter @distribution-copilot/trpc type-check
```
