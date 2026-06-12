# CLAUDE.md — `@distribution-copilot/api`

The **NestJS** backend. Exposes the REST API, owns all business logic and authorization,
and is the only service exposing HTTP to the web app.

> Read the root [`CLAUDE.md`](../../CLAUDE.md),
> [`docs/architecture/backend-architecture.md`](../../docs/architecture/backend-architecture.md),
> and [`docs/architecture/api-design.md`](../../docs/architecture/api-design.md) first.

---

## Responsibilities

- Expose the **REST API** (feature controllers); validate inputs and resolve the
  authenticated user per request.
- **Authentication** (Better Auth) and **authorization** (per-user scoping on every query).
- **Business logic** (services) and **database access** (repositories).
- **Enqueue** background work to the worker (does not run heavy work itself).

## Boundaries

**Depends on:** `database`, `shared`, `config`, `ai`.

**Must NOT:** render UI; run long/external/high-volume jobs inline (enqueue to `worker`);
call AI vendor SDKs directly (go through `ai`); import `web`/`worker`/`ui`; return Prisma
types across the API boundary.

## Layering (each layer talks only to the one below)

```
Controller route → thin: validate (Zod) + auth guard + call one service + return domain type
   Service       → business logic, authorization, orchestration; may enqueue jobs / call ai
   Repository     → the ONLY place Prisma is used; maps rows → domain types; scopes by userId
   @distribution-copilot/database → PostgreSQL
```

## Modules (all implemented)

| Module                 | Routes                                                                                                                             | Notes                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `health`               | `GET /health`                                                                                                                      | `{ status: "ok" }` — liveness check                  |
| `auth`                 | `POST /auth/sign-in`, `/sign-up`, `/sign-out`, `/forget-password`, `/reset-password`                                               | Delegates to Better Auth; session guard lives here   |
| `products`             | `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `POST /products/:id/generate-profile`                                      | Full product + profile CRUD                          |
| `opportunities`        | `GET /products/:id/opportunities`, `GET/PATCH/DELETE /products/:id/opportunities/:oid`, `POST …/engage`, `POST …/regenerate-reply` | Opportunity lifecycle + AI reply regeneration        |
| `discovery`            | `POST /products/:id/discover`                                                                                                      | Enqueues a one-shot discovery job for a product      |
| `stats`                | `GET /stats`                                                                                                                       | Aggregate dashboard stats for the authenticated user |
| `monitors` _(Phase 7)_ | `GET /products/:id/monitors`, `PATCH /products/:id/monitors/:source`                                                               | Per-source monitoring toggles (not yet built)        |
| `billing` _(Phase 8)_  | `GET /billing/status`, `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/webhook`                                   | Stripe + trial management (not yet built)            |

## Folder conventions

```
src/
├── main.ts                       # bootstrap: create app, shutdown hooks, listen (port from config)
├── app.module.ts                 # root module; imports ConfigModule + feature modules
├── config/                       # configuration.ts (typed factory), auth.ts (Better Auth)
├── common/                       # cross-cutting: guards, exception filters, interceptors, decorators
└── modules/<feature>/            # one module per domain feature
    ├── <feature>.module.ts
    ├── <feature>.controller.ts    # REST endpoints (public surface)
    ├── <feature>.service.ts       # business logic
    ├── <feature>.repository.ts    # Prisma access + mapping
    └── dto/<input>.input.ts       # Zod input schemas (composed from shared)
```

## Patterns

- **Feature module per domain area**; register its `<Feature>Controller` in the module.
- **Controllers stay thin:** validate input with shared Zod schemas, apply the auth guard
  for protected routes, call one service method, return domain types.
- **Services hold logic**, receive the authenticated `userId`, enforce ownership, are
  wired by **NestJS DI** (constructor injection) — never `new` your dependencies.
- **Repositories are the only Prisma callers**; named for intent; always scope user data by
  `userId`; map Prisma rows → `shared` domain types.
- **Config via `ConfigService`** from the typed `configuration()` factory; validate env at
  startup against the shared `envSchema`. Never read `process.env` ad hoc.
- **Errors:** throw typed `HttpException` subclasses with correct status codes; a global
  exception filter maps uncaught errors and reports unexpected ones to Sentry (no PII). Use
  NestJS `Logger`.
- **Enqueue heavy work** (discovery/scoring) to BullMQ; the API may call `ai` directly only
  for fast, single-item, user-triggered actions (e.g. regenerate-reply, generate-profile)
  with a timeout.

## Anti-patterns

- Prisma calls in a controller or non-repository location.
- Business logic in a controller or repository.
- Returning `@prisma/client` types across the API boundary (map to domain types).
- Reading `process.env` outside `config`.
- Running scraping / bulk AI / long loops inside a request handler.
- Accepting `userId` from client input for ownership (always derive from the session).
- Swallowing errors; logging secrets/PII.
- Any endpoint that posts/engages on a platform on the user's behalf.

## Implementation guidance

- **New feature:** scaffold `modules/<feature>/` (module, controller, service, repository,
  dto), register providers in the module, scope everything to `userId`.
- **New endpoint:** add a service method first, then a thin controller route (see the
  new-endpoint checklist in `api-design.md` §10).
- **DB shape change:** edit `prisma/schema.prisma` + the `shared` Zod schema together, run
  `pnpm db:generate`, update the repository (see `database.md`).
- **Auth:** configured in `config/auth.ts` via Better Auth. Session resolved in the
  `SessionGuard` + `@CurrentUser()` decorator. Never hand-roll sessions/hashing.

## Commands

```bash
pnpm --filter @distribution-copilot/api dev          # http://localhost:3848
pnpm --filter @distribution-copilot/api build
pnpm --filter @distribution-copilot/api type-check
```

Key env: `PORT` (default 3848), `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`REDIS_HOST`/`REDIS_PORT`, `SENTRY_DSN`.
