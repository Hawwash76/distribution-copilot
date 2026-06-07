# Backend Architecture (NestJS API)

`apps/api` is the **NestJS** backend (ADR-002). It hosts the tRPC router, owns all
business logic and authorization, and is the only service that exposes an HTTP interface
to the web app. This document defines its layering, module structure, and conventions.

Related: [`api-design.md`](api-design.md) (the tRPC contract), [`database.md`](database.md)
(the data layer), and [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md).

---

## 1. Responsibilities & boundaries

**The API owns:**

- The tRPC router host (mounted at `/trpc`) and request context.
- Authentication (Better Auth) and authorization (per-user scoping).
- Business logic (services) and database access (repositories).
- Enqueuing background work to the worker (it does **not** run heavy work itself).

**The API does not:**

- Render UI (that's `web`).
- Run long/external-I/O/high-volume jobs inline (that's `worker`).
- Call AI vendors directly (that's `packages/ai`).
- Reach into another app. It depends on `trpc`, `database`, `shared`, `config`, `ai`.

---

## 2. Layered architecture

A request flows through clear layers, each with one job:

```
HTTP → /trpc middleware
        │
        ▼
   tRPC procedure (router)   validate input (Zod), check auth tier, delegate. THIN.
        │
        ▼
      Service                business logic, orchestration, authorization decisions
        │                    (may enqueue worker jobs, call packages/ai)
        ▼
    Repository               ALL Prisma access for the feature; maps rows → domain types
        │
        ▼
  @distribution-copilot/database → PostgreSQL
```

**The golden rule: each layer only talks to the one below it.**

- Procedures never touch Prisma or hold logic.
- Services never touch Prisma directly — they go through repositories.
- Repositories never hold business logic — they read/write and map types.

This keeps logic testable (services with mocked repos / real test DB), the contract clean
(domain types out), and scaling localized (DB concerns in repositories).

---

## 3. Module structure (feature-oriented)

One NestJS module per domain feature under `src/modules/<feature>/`. A module is
self-contained and wires its own router, service(s), and repository:

```
apps/api/src/
├── main.ts                         # bootstrap: create app, shutdown hooks, listen
├── app.module.ts                   # root module; imports feature modules + ConfigModule
├── config/
│   ├── configuration.ts            # typed config factory for @nestjs/config
│   └── auth.ts                     # Better Auth setup
├── common/                         # cross-cutting: guards, filters, interceptors, decorators
└── modules/
    ├── health/                     # exists: liveness probe
    │   ├── health.module.ts
    │   └── health.controller.ts
    └── opportunity/                # target shape of a real feature
        ├── opportunity.module.ts
        ├── opportunity.router.ts   # tRPC procedures (the public surface)
        ├── opportunity.service.ts  # business logic
        ├── opportunity.repository.ts
        └── dto/
            └── list-opportunities.input.ts   # Zod input schema (composed from shared)
```

New features add a module here and merge their router into the root `appRouter` (see
[`api-design.md`](api-design.md) §2). Cross-cutting concerns (auth guards, exception
filters) live in `common/`, not duplicated per feature.

### Current state

`AppModule` imports `ConfigModule.forRoot({ isGlobal: true, load: [configuration] })` and
the `HealthModule`. `main.ts` creates the app, enables shutdown hooks, reads the port from
config (default 4000), and listens. `GET /health` returns `{ status: "ok" }`. The tRPC
middleware and Better Auth handler are placeholders to be wired up (see
`apps/api/src/trpc/README.md` and `config/auth.ts`).

---

## 4. Layer responsibilities in detail

### tRPC procedures (the controller layer)

- Live in `<feature>.router.ts`. Validate input with Zod, select the auth tier
  (`publicProcedure`/`protectedProcedure`), call exactly one service method, return its
  result. No logic, no Prisma, no try/catch-and-swallow.
- NestJS REST controllers (`*.controller.ts`) are used only for non-tRPC HTTP endpoints
  (health probes, the Better Auth handler, webhooks). Business endpoints are tRPC.

### Services

- Hold the business logic and orchestration: validation of invariants, authorization
  decisions, composing repository calls, calling `packages/ai`, enqueuing worker jobs.
- Receive the authenticated `userId` and enforce ownership.
- Are injected (NestJS DI) and depend on repositories and other services via their
  constructors — never instantiate dependencies directly.
- Return **domain types** (from `shared`), never Prisma rows.

### Repositories

- The **only** place Prisma is imported in the API. One repository per aggregate.
- Methods are named for intent (`listForUser`, `findByIdForUser`, `create`, `dismiss`),
  always scope user data by `userId`, and **map Prisma rows to domain types**.
- Hold no business logic — just queries + mapping. See [`database.md`](database.md) §4.

---

## 5. Dependency injection

- Use NestJS DI for services and repositories. Declare dependencies in constructors;
  register providers in the feature module.
- DI is what makes services unit-testable (inject fakes) and integration-testable (inject
  real repos against a test DB).
- The shared Prisma client comes from `@distribution-copilot/database`; wrap it in an
  injectable provider so repositories receive it via DI rather than importing the
  singleton ad hoc.
- Avoid service locator / global singletons for app logic — prefer explicit injection.

---

## 6. Configuration

- Config is read through `@nestjs/config` from the typed `configuration()` factory
  (`config/configuration.ts`), exposed globally. Read values via `ConfigService`, not
  `process.env` scattered across the codebase.
- **Validate environment at startup** against the `shared`/`config` `envSchema` so the
  app fails fast on misconfiguration rather than at first use.
- Secrets only via env (`.env`, git-ignored). Never log them.

---

## 7. Error handling

- Throw **typed `TRPCError`s** from procedures/services with correct codes (see
  [`api-design.md`](api-design.md) §6). Expected failures are typed errors, not 500s.
- Use a **global exception filter** (in `common/`) to map uncaught errors to safe
  responses and report unexpected ones to **Sentry** with request context (no PII).
- Use the NestJS **`Logger`** for structured logging. No `console.log` in the API.
- **Never swallow errors.** No empty catches; attach context and rethrow or let it
  propagate to the filter.
- External calls (AI via `ai`, platform APIs, enqueue to Redis) get timeouts and bounded
  retries; treat them as unreliable.

---

## 8. Async work: enqueue, don't block

The API must stay responsive. Heavy work is **enqueued**, not awaited:

- Discovery, scoring, risk assessment, embedding, and batch drafting are **BullMQ jobs**
  the API enqueues (it shares the queue/Redis config concept with the worker).
- A mutation that triggers such work returns quickly (e.g. a job handle); the client
  reads results later via queries.
- The API may call `packages/ai` directly **only** for fast, interactive operations
  (e.g. drafting a single reply on demand) where a synchronous response is the right UX —
  with a timeout. Bulk/background AI work goes to the worker.

See [`worker-architecture.md`](worker-architecture.md).

---

## 9. Testing

- **Services:** unit-test logic with fake repositories; integration-test against a real
  test Postgres for anything query-dependent.
- **Repositories:** integration-test against a test DB (don't mock Prisma).
- **Procedures:** test end-to-end with a tRPC caller and a built context, asserting auth
  tiers and error codes.
- Push pure logic (scoring math, validation helpers) into `shared`/`ai` where it's
  trivially unit-testable. See [`CLAUDE.md`](../../CLAUDE.md) §11.

---

## 10. Anti-patterns (do not do)

- Prisma calls in a procedure, controller, or service-doing-something-else.
- Business logic in a procedure or repository.
- Returning Prisma types across the tRPC boundary.
- Reading `process.env` directly outside config.
- Running scraping / bulk AI / long loops inside a request.
- Accepting `userId` from the client for ownership instead of the session.
- A "manager"/"helper" service that owns everything (god object) — keep services
  feature-scoped and cohesive.
- Swallowing errors or logging secrets/PII.
