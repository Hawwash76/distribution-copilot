# Backend Architecture (NestJS API)

`apps/api` is the **NestJS** backend (ADR-002). It exposes the REST API, owns all
business logic and authorization, and is the only service that exposes an HTTP interface
to the web app. This document defines its layering, module structure, and conventions.

Related: [`api-design.md`](api-design.md) (the REST contract), [`database.md`](database.md)
(the data layer), and [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md).

---

## 1. Responsibilities & boundaries

**The API owns:**

- The REST API surface (feature controllers) and request handling.
- Authentication (Better Auth) and authorization (per-user scoping).
- Business logic (services) and database access (repositories).
- Enqueuing background work to the worker (it does **not** run heavy work itself).

**The API does not:**

- Render UI (that's `web`).
- Run long/external-I/O/high-volume jobs inline (that's `worker`).
- Call AI vendors directly (that's `packages/ai`).
- Reach into another app. It depends on `database`, `shared`, `config`, `ai`.

---

## 2. Layered architecture

A request flows through clear layers, each with one job:

```
HTTP → feature controller
        │
        ▼
   Controller route          validate input (Zod), check auth guard, delegate. THIN.
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

- Controllers never touch Prisma or hold logic.
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
├── main.ts                         # bootstrap: ExpressAdapter, Better Auth handler, CORS, listen
├── app.module.ts                   # root module; imports all feature modules + ConfigModule
├── config/
│   ├── configuration.ts            # typed config factory for @nestjs/config
│   └── auth.ts                     # Better Auth setup (Prisma adapter, email hooks, databaseHooks)
├── common/                         # cross-cutting: guards, filters, pipes, decorators
│   ├── prisma.service.ts           # Injectable Prisma wrapper (singleton)
│   ├── session.guard.ts            # SessionGuard — protects all non-public routes
│   ├── session.decorator.ts        # @CurrentUser() — extracts authenticated user from request
│   └── zod-validation.pipe.ts      # ZodValidationPipe — used by controllers for body/query/param
└── modules/
    ├── health/                     # GET /health → { status: "ok" }
    ├── auth/                       # Better Auth handler proxied at /api/auth/*
    ├── products/                   # CRUD for products + AI profile generation
    ├── opportunities/              # Opportunity list, detail, status, engage, delete, regenerate-reply
    ├── discovery/                  # POST /products/:id/discover — enqueues discovery job
    ├── stats/                      # GET /stats/dashboard — aggregated dashboard analytics
    ├── billing/                    # Stripe checkout, portal, webhook; subscription status
    └── monitors/                   # Per-product source monitor toggle + status list
```

New features add a module here and register their controller (see
[`api-design.md`](api-design.md) §2). Cross-cutting concerns (auth guards, exception
filters) live in `common/`, not duplicated per feature.

---

## 4. Layer responsibilities in detail

### Controllers (the HTTP layer)

- Live in `<feature>.controller.ts`. Validate input with Zod, apply the auth guard for
  protected routes, call exactly one service method, return its result. No logic, no
  Prisma, no try/catch-and-swallow.
- Every HTTP endpoint is a controller route — feature resources, health probes, the Better
  Auth handler, and webhooks alike.

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

- Throw **typed `HttpException` subclasses** from controllers/services with correct status
  codes (see [`api-design.md`](api-design.md) §6). Expected failures are typed errors, not
  500s.
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
- **Controllers:** test end-to-end via Nest's testing module (HTTP), asserting auth guards
  and error statuses.
- Push pure logic (scoring math, validation helpers) into `shared`/`ai` where it's
  trivially unit-testable. See [`CLAUDE.md`](../../CLAUDE.md) §11.

---

## 10. Anti-patterns (do not do)

- Prisma calls in a controller, or a service-doing-something-else.
- Business logic in a controller or repository.
- Returning Prisma types across the API boundary.
- Reading `process.env` directly outside config.
- Running scraping / bulk AI / long loops inside a request.
- Accepting `userId` from the client for ownership instead of the session.
- A "manager"/"helper" service that owns everything (god object) — keep services
  feature-scoped and cohesive.
- Swallowing errors or logging secrets/PII.
