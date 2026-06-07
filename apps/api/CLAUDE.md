# CLAUDE.md — `@distribution-copilot/api`

The **NestJS** backend. Hosts the tRPC router, owns all business logic and authorization,
and is the only service exposing HTTP to the web app.

> Read the root [`CLAUDE.md`](../../CLAUDE.md),
> [`docs/architecture/backend-architecture.md`](../../docs/architecture/backend-architecture.md),
> and [`docs/architecture/api-design.md`](../../docs/architecture/api-design.md) first.

---

## Responsibilities

- Host the **tRPC router** (`@distribution-copilot/trpc`) at `/trpc` and build the request
  context (session + Prisma + services).
- **Authentication** (Better Auth) and **authorization** (per-user scoping).
- **Business logic** (services) and **database access** (repositories).
- **Enqueue** background work to the worker (does not run heavy work itself).

## Boundaries

**Depends on:** `trpc`, `database`, `shared`, `config`, `ai`.

**Must NOT:** render UI; run long/external/high-volume jobs inline (enqueue to `worker`);
call AI vendor SDKs directly (go through `ai`); import `web`/`worker`/`ui`; return Prisma
types across the tRPC boundary.

## Layering (each layer talks only to the one below)

```
/trpc procedure  → thin: validate (Zod) + auth tier + call one service + return domain type
   Service       → business logic, authorization, orchestration; may enqueue jobs / call ai
   Repository     → the ONLY place Prisma is used; maps rows → domain types; scopes by userId
   @distribution-copilot/database → PostgreSQL
```

## Folder conventions

```
src/
├── main.ts                       # bootstrap: create app, shutdown hooks, listen (port from config)
├── app.module.ts                 # root module; imports ConfigModule + feature modules
├── config/                       # configuration.ts (typed factory), auth.ts (Better Auth)
├── common/                       # cross-cutting: guards, exception filters, interceptors, decorators
└── modules/<feature>/            # one module per domain feature
    ├── <feature>.module.ts
    ├── <feature>.router.ts        # tRPC procedures (public surface)
    ├── <feature>.service.ts       # business logic
    ├── <feature>.repository.ts    # Prisma access + mapping
    └── dto/<input>.input.ts       # Zod input schemas (composed from shared)
```

File naming: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`,
`*.router.ts`, `*.input.ts` — all kebab-case. Today: `AppModule` + `ConfigModule` +
`HealthModule` (`GET /health` → `{ status: "ok" }`); tRPC + Better Auth are placeholders.

## Patterns

- **Feature module per domain area**; merge its `<feature>Router` into the root `appRouter`.
- **Procedures stay thin:** validate input with shared Zod schemas, pick
  `publicProcedure`/`protectedProcedure`, call one service method, return domain types.
- **Services hold logic**, receive the authenticated `userId`, enforce ownership, are
  wired by **NestJS DI** (constructor injection) — never `new` your dependencies.
- **Repositories are the only Prisma callers**; named for intent; always scope user data by
  `userId`; map Prisma rows → `shared` domain types.
- **Config via `ConfigService`** from the typed `configuration()` factory; validate env at
  startup against the shared `envSchema`. Never read `process.env` ad hoc.
- **Errors:** throw typed `TRPCError`s with correct codes; a global exception filter maps
  uncaught errors and reports unexpected ones to Sentry (no PII). Use NestJS `Logger`.
- **Enqueue heavy work** (discovery/scoring/embedding/batch drafting) to BullMQ; the API
  may call `ai` directly only for fast, single-item, user-triggered actions (with timeout).

## Anti-patterns

- Prisma calls in a procedure/controller/non-repository service.
- Business logic in a procedure or repository.
- Returning `@prisma/client` types across tRPC (map to domain types).
- Reading `process.env` outside `config`.
- Running scraping / bulk AI / long loops inside a request.
- Accepting `userId` from client input for ownership (derive from the session).
- A god "manager" service; swallowing errors; logging secrets/PII.
- Any endpoint that posts/engages on a platform on the user's behalf.

## Implementation guidance

- **New feature:** scaffold `modules/<feature>/` (module, router, service, repository, dto),
  register providers in the module, merge the router into `appRouter`, scope everything to
  `userId`.
- **New endpoint:** add a service method first, then a thin procedure (see the new-procedure
  checklist in `api-design.md` §10).
- **DB shape change:** edit `prisma/schema.prisma` + the `shared` Zod schema together, run
  `pnpm db:generate`, update the repository (see `database.md`).
- **Auth:** configure Better Auth in `config/auth.ts`, resolve the session in the tRPC
  context, gate procedures with `protectedProcedure`. Never hand-roll sessions/hashing.

## Commands

```bash
pnpm --filter @distribution-copilot/api dev          # http://localhost:4000
pnpm --filter @distribution-copilot/api build
pnpm --filter @distribution-copilot/api type-check
```

Key env: `PORT` (default 4000), `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`REDIS_HOST`/`REDIS_PORT`, `SENTRY_DSN`.
