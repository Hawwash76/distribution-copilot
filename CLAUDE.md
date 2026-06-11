# CLAUDE.md — Distribution Copilot Engineering Guide

This is the **master source of truth** for engineering Distribution Copilot. Every
Claude Code session (and every human engineer) should read this file before making
changes. It encodes the product context, the architecture, the boundaries, and the
non-negotiable standards that keep this codebase scalable, readable, and maintainable
over years of development.

When this document and the code disagree, **the code wins** — but you must then update
this document in the same change. Documentation drift is treated as a bug.

> **Detailed references.** This file is the index and the rules. Deep dives live under
> [`docs/architecture/`](docs/architecture/), and each app/package has its own
> `CLAUDE.md` with local conventions. Read the relevant package guide before working in
> that package.

---

## 1. Product context

**Distribution Copilot** helps founders find relevant online conversations (Reddit, X,
Hacker News, …), identify high-intent discussions, assess community-engagement risk, and
generate context-aware draft replies.

The platform is **human-in-the-loop by design**. This is a product constraint, a trust
constraint, and a legal/ToS constraint — not a feature flag. The platform **never**:

- auto-posts or publishes anything on the user's behalf,
- automates engagement (likes, follows, votes, DMs),
- spams communities or mass-distributes content,
- circumvents platform rules, rate limits, or anti-bot measures.

**The user always decides what to publish.** Every AI output is a _draft_ or a _signal_
that a human reviews and acts on manually. If you are ever designing a feature that
posts, votes, or engages automatically, **stop** — it violates the product's core
contract. See [`docs/architecture/product.md`](docs/architecture/product.md).

### The core loop

```
Discover conversations  →  Score relevance & intent  →  Assess engagement risk
        →  Generate draft reply  →  Human reviews & edits  →  Human posts manually
```

Everything in the codebase serves this loop. The vocabulary of the loop —
**opportunity, community, score, risk, reply** — is the shared language of the domain
model. Use these terms consistently in code, types, schemas, and docs. See
[`docs/architecture/domain-model.md`](docs/architecture/domain-model.md).

---

## 2. Engineering principles

These are ordered. When two principles conflict, the earlier one wins.

1. **Readability over cleverness.** Code is read far more than it is written. Optimize
   for the next engineer (or Claude session) who has to understand it cold.
2. **Simplicity over abstraction.** Do not abstract until you have three concrete uses.
   Duplication is cheaper than the wrong abstraction.
3. **Explicitness over magic.** No hidden control flow, no implicit globals, no
   "clever" metaprogramming. A reader should be able to trace what happens.
4. **Maintainability over speed.** We optimize for the lifetime cost of the code, not
   the time-to-first-commit. Avoid premature optimization.
5. **Type safety everywhere.** The type system is our cheapest test suite. No `any`, no
   unchecked casts, no silencing the compiler.
6. **Predictable architecture.** Similar things live in similar places. A new engineer
   should be able to guess where code goes.
7. **Feature-oriented design.** Organize by domain feature, not by technical layer at
   the top level. Cohesion over a tidy taxonomy of file types.
8. **Clear ownership boundaries.** Each package and module owns a well-defined slice.
   Cross-boundary access goes through public interfaces only.

### What we actively avoid

- Premature optimization (measure first; the MVP does not need to be fast at scale).
- Deep inheritance hierarchies (prefer composition and plain functions).
- Over-engineering (build for the next milestone, not the imagined endgame).
- Excessive abstraction layers (every indirection must earn its keep).
- Generic `utils`/`helpers` dumping grounds (name things by what they do).
- Shared mutable state (state has one owner; pass data explicitly).

---

## 3. System architecture

Distribution Copilot is a **Turborepo + pnpm** monorepo. Apps are deployable units;
packages are shared libraries. All workspace packages are namespaced
`@distribution-copilot/*` and referenced with the `workspace:*` protocol.

```
distribution-copilot/
├── apps/
│   ├── web/        Next.js (App Router) frontend — the founder's dashboard
│   ├── api/        NestJS backend — the REST API; owns business logic
│   └── worker/     BullMQ worker — background discovery/scoring/embedding jobs
│
├── packages/
│   ├── database/   Prisma client wrapper (schema lives at /prisma)
│   ├── shared/     Framework-free Zod schemas (the web↔api contract), domain types, pure utils
│   ├── ai/         AI prompts + provider abstraction + orchestration
│   ├── ui/         Shared shadcn/ui primitives (the `cn` helper today)
│   └── config/     Runtime config: app constants + env schema
│
├── tooling/        Build-time presets: eslint/, typescript/, prettier/
├── prisma/         schema.prisma (single source of DB truth) + migrations
└── docs/           Architecture documentation (see docs/architecture/)
```

### Request & data flow

```
Browser
  │  React Server/Client Components, TanStack Query
  ▼
apps/web  ──(REST over HTTP/JSON, shapes from @distribution-copilot/shared)──►  apps/api
                                                                          │
                                          Controller → Service → Repository → Prisma
                                                                          ▼
                                                              PostgreSQL + pgvector
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  apps/worker runs a three-queue SERP discovery pipeline:                    │
  │    "discovery" → SerpAPI → URLs → enqueues "extract" jobs (one per URL)     │
  │    "extract"   → fetches URL → upserts Discussion + Opportunity → enqueues  │
  │                  "scoring" job                                               │
  │    "scoring"   → AI scoring → saves scores; status advances to "scored"     │
  │  External APIs: SerpAPI (SERP), Reddit public JSON, Algolia HN API.         │
  └──────────────────────────────────────────────────────────────────────────────┘
```

- The **web app never talks to the database directly.** It calls the REST API over
  HTTP/JSON and validates responses with the shared Zod schemas — zero runtime coupling.
- The **API is the only writer of business logic and the owner of the REST endpoints.** It
  owns auth, validation, services, and repositories.
- The **worker** shares `database` and `shared`. It is triggered by
  enqueued jobs, not HTTP. Long or external-I/O-bound work belongs here, never in a
  request handler.
- **Heavy/async work is enqueued, not awaited in-request.** SERP search, URL extraction,
  and AI scoring all run in the worker.
- **`Discussion` holds raw fetched content** (source-agnostic, unique on `url`).
  **`Opportunity`** is the product-specific join to a Discussion, storing all
  scoring/risk/reply fields. This separation lets any future source flow through the same
  scoring pipeline unchanged.

For the full picture see
[`docs/architecture/backend-architecture.md`](docs/architecture/backend-architecture.md),
[`docs/architecture/frontend-architecture.md`](docs/architecture/frontend-architecture.md),
[`docs/architecture/worker-architecture.md`](docs/architecture/worker-architecture.md),
and [`docs/architecture/ai-architecture.md`](docs/architecture/ai-architecture.md).

---

## 4. Architecture boundaries (dependency rules)

Boundaries are enforced by what each package is _allowed to import_. Violating these is
the single fastest way to make the codebase unmaintainable.

| Package / app       | May depend on                            | Must NOT depend on                         |
| ------------------- | ---------------------------------------- | ------------------------------------------ |
| `apps/web`          | `shared`, `ui`, `config`                 | `database`, `api` internals, `worker`      |
| `apps/api`          | `database`, `shared`, `config`, `ai`     | `web`, `worker`, `ui`                      |
| `apps/worker`       | `database`, `shared`, `config`, `ai`     | `web`, `api` internals, `ui`               |
| `packages/database` | `@prisma/client`                         | any app, `ai`, `ui`                        |
| `packages/shared`   | `zod` only                               | every framework, every other workspace pkg |
| `packages/ai`       | `shared`, `config`                       | `database`, any app, `ui`                  |
| `packages/ui`       | `react`, `cva`, `clsx`, `tailwind-merge` | every other workspace pkg, business logic  |
| `packages/config`   | `zod`                                    | every other workspace pkg                  |

**Hard rules:**

- **Dependencies flow one way: apps → packages.** Packages never import from apps.
- **No app imports another app.** Cross-app contracts go through the REST API + shared
  schemas (web↔api) or the queue + database (api↔worker).
- **`shared` and `config` are leaves.** They must stay free of framework and
  cross-package dependencies so anything can import them.
- **The web app must never import `database` or Prisma types.** It only knows the REST
  endpoints and the shared schemas.
- **Prisma types stay behind the repository layer.** Do not leak `@prisma/client` types
  across the API boundary; map to Zod-derived domain types from `shared`.

---

## 5. Coding standards

The toolchain enforces most of this. Match the existing files; do not re-litigate
style.

### TypeScript

- **Strict mode, always.** The base tsconfig enables `strict`,
  `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitOverride`, and `noFallthroughCasesInSwitch`. Do not weaken these.
- **No `any`.** Use `unknown` + a type guard, or model the type properly. If you truly
  must escape the type system, isolate it and write a comment explaining why.
- **Explicit return types on exported functions.** Inference is fine for locals; public
  surfaces are documented by their signatures (see `getQueryClient(): QueryClient`,
  `check(): { status: string }`).
- **`type` imports are inline:** `import { type Foo, bar } from "..."` — enforced by
  `@typescript-eslint/consistent-type-imports`.
- **Derive, don't duplicate.** Domain types are inferred from Zod schemas
  (`z.infer<typeof fooSchema>`) in `shared`. The schema is the single source of truth.
- **Prefer `interface` for object shapes you extend, `type` for unions/aliases.** Match
  the surrounding file.

### Formatting (Prettier — do not hand-format)

Double quotes · semicolons · trailing commas (`all`) · `printWidth` 100 · 2-space
indent · `arrowParens: always` · LF line endings. Tailwind classes are auto-sorted by
`prettier-plugin-tailwindcss`. Run `pnpm format`.

### Comments & documentation

- **JSDoc on every exported symbol and every module.** Explain _why_, not _what_ the
  code already says. Match the density of the existing files — they lead with a module
  docstring describing intent and boundaries.
- Use `// TODO(context):` for known gaps, with enough context to act on later.
- Keep comments truthful: a comment that lies is worse than none.

### Imports & file order

Group and order imports: (1) node/stdlib, (2) third-party, (3) `@distribution-copilot/*`
workspace packages, (4) local `@/` or relative. Match the blank-line grouping already
present in the codebase.

---

## 6. Naming conventions

Consistency here is what lets you _guess_ where things are. These are derived from the
existing scaffold — follow them exactly.

| Thing                         | Convention                                              | Example                                               |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Files & folders               | `kebab-case`                                            | `use-app-store.ts`, `query-client.ts`                 |
| Workspace packages            | `@distribution-copilot/<kebab>`                         | `@distribution-copilot/shared`                        |
| React components (file)       | `kebab-case.tsx`                                        | `opportunity-table.tsx`                               |
| React components (identifier) | `PascalCase`                                            | `export function OpportunityTable()`                  |
| React hooks                   | `use-*.ts` / `useThing()`                               | `use-opportunities.ts` → `useOpportunities`           |
| Zustand stores                | `use-*-store.ts` / `useThingStore`                      | `use-app-store.ts` → `useAppStore`                    |
| NestJS modules                | `*.module.ts`                                           | `health.module.ts`                                    |
| NestJS controllers            | `*.controller.ts` / `<Feature>Controller`               | `opportunity.controller.ts` → `OpportunityController` |
| NestJS services               | `*.service.ts`                                          | `opportunity.service.ts`                              |
| Repositories                  | `*.repository.ts`                                       | `opportunity.repository.ts`                           |
| DTOs / input schemas          | `*.dto.ts` or `*.input.ts`                              | `create-product.input.ts`                             |
| Zod schemas (identifier)      | `<name>Schema`                                          | `opportunitySchema`, `opportunitySourceSchema`        |
| Types & interfaces            | `PascalCase`, **no `I` prefix**                         | `Opportunity`, `Paginated`, `AppState`                |
| Prisma models                 | `PascalCase` singular                                   | `model Opportunity { … }`                             |
| Prisma table mapping          | `snake_case` plural via `@@map`                         | `@@map("opportunities")`                              |
| DB columns                    | `camelCase` field → `@map` if needed                    | `createdAt`, mapped where useful                      |
| Constants                     | `SCREAMING_SNAKE_CASE`                                  | `APP_NAME`, `DEFAULT_PAGE_SIZE`                       |
| Enums (Zod)                   | `<name>Schema = z.enum([...])`                          | `opportunitySourceSchema`                             |
| BullMQ queues                 | `kebab-case` string + typed const                       | `"discovery"`, `DISCOVERY_QUEUE`                      |
| Env vars                      | `SCREAMING_SNAKE_CASE`; web public vars `NEXT_PUBLIC_*` | `DATABASE_URL`, `NEXT_PUBLIC_API_URL`                 |

Booleans read as predicates (`isOpen`, `hasScore`, `canReply`). Functions are verbs
(`scoreOpportunity`, `generateReply`). Avoid abbreviations except universally understood
ones (`id`, `url`, `db`).

---

## 7. Folder structure & organization

### Apps organize by **feature**, packages by **capability**

**`apps/api` (NestJS):** one module per domain feature under `src/modules/<feature>/`.
A feature module is self-contained:

```
apps/api/src/
├── modules/
│   └── opportunity/
│       ├── opportunity.module.ts        # wires the feature together
│       ├── opportunity.controller.ts    # REST endpoints (the public surface)
│       ├── opportunity.service.ts       # business logic / orchestration
│       ├── opportunity.repository.ts    # all Prisma access for this feature
│       └── dto/
│           └── list-opportunities.input.ts
├── common/                              # cross-cutting: guards, filters, decorators
└── config/                              # typed configuration factory
```

**`apps/web` (Next.js App Router):** routes under `src/app/`, feature UI co-located:

```
apps/web/src/
├── app/                        # routes, layouts, route groups
│   └── (dashboard)/opportunities/page.tsx
├── components/                 # shared app components (feature ones co-locate w/ route)
├── features/<feature>/         # hooks, components, view-models for one feature
├── lib/                        # client setup: api-client, query-client, monitoring, utils
└── store/                      # Zustand stores (ephemeral UI state only)
```

**`apps/worker` (BullMQ):** one folder per queue under `src/queues/<queue>/`:

```
apps/worker/src/
├── queues/
│   └── discovery/
│       ├── discovery.worker.ts          # the BullMQ Worker + processor
│       ├── discovery.processor.ts       # the job logic (testable in isolation)
│       └── discovery.types.ts           # job payload/result types
├── config/                              # redis connection, etc.
└── main.ts                              # registers and starts all workers
```

**Where new code goes — decision rules:**

- Reusable across services & framework-free → `packages/shared`.
- A new API endpoint → a route in the owning feature's `*.controller.ts`.
- DB access → a repository method (never query Prisma outside a repository).
- A prompt or AI provider call → `packages/ai`.
- A long/external/async job → an `apps/worker` queue processor.
- A reusable, presentational component → `packages/ui`; an app-specific one →
  `apps/web` co-located with its feature.
- App constants or env shape → `packages/config`.

See [`docs/architecture/`](docs/architecture/) for the per-area deep dives.

---

## 8. Security standards

Security is a first-class requirement; this product handles user accounts, third-party
tokens, and scraped content.

- **Validate all input at the boundary.** Every controller route validates its input with
  a Zod schema (via a validation pipe). Never trust client data. Never trust scraped
  content (treat it as
  hostile — sanitize before rendering, never `eval`/interpolate it into prompts without
  guardrails).
- **Authentication via Better Auth only.** Do not hand-roll sessions, tokens, or
  password hashing. Auth is configured in the API; see `apps/api/src/config/auth.ts`.
- **Authorization is explicit and server-side.** Enforce per-user ownership in the
  service/repository layer (scope every query by the authenticated `userId`). Never
  rely on the client to filter what a user can see.
- **Secrets live in env vars, never in code or git.** Use `.env` (git-ignored) from
  `.env.example`. Validate required env at startup with the `shared`/`config` env
  schema. Never log secrets.
- **No secrets in `NEXT_PUBLIC_*`.** Anything prefixed `NEXT_PUBLIC_` ships to the
  browser. Only non-sensitive config goes there.
- **Least privilege for third-party platforms.** Request the minimum scopes. Store
  third-party tokens encrypted at rest. Respect every platform's ToS and rate limits.
- **Parameterized queries only.** Use Prisma's query API; never build raw SQL by string
  concatenation. If raw SQL is unavoidable, use Prisma's tagged-template `$queryRaw`.
- **PII discipline.** Minimize what we store. Don't put PII or secrets in logs, Sentry
  breadcrumbs, or PostHog events.
- **Output safety.** AI-generated replies are drafts shown to a human — never posted
  automatically (see §1). Surface risk assessments prominently.

See [`docs/architecture/api-design.md`](docs/architecture/api-design.md) for the
auth/authorization patterns at the API layer.

---

## 9. Scalability requirements

Design so the system _can_ scale to millions of posts and many platforms — **without
building that scale into the MVP today.** The skill is keeping the seams in the right
places so scaling later is a change of implementation, not architecture.

**Design for:**

- **High-volume ingestion** (millions of Reddit/X posts): all ingestion, scraping,
  scoring, and embedding run as **idempotent, retryable background jobs** in the worker
  — never in a request. Process in batches; paginate everything.
- **Background processing**: BullMQ + Redis. Jobs must be idempotent (safe to retry),
  carry minimal payloads (IDs, not blobs), and be observable.
- **Multiple AI providers**: all model access goes through the `ai` package's provider
  abstraction. Application code asks for a _capability_ (embed, score, draft), not a
  vendor. Swapping/adding a provider is a change inside `ai`.
- **Future platform integrations**: model sources behind a common "source connector"
  shape. The `OpportunitySource` enum and connector interface are the extension point;
  adding X or Hacker News should not touch scoring or reply logic.
- **Semantic search at scale**: pgvector today; the repository boundary lets us move to
  a dedicated vector store later without touching callers.

**Do NOT over-engineer the MVP:**

- Single Postgres, single Redis, single worker process are fine to start.
- No microservices, no event-sourcing, no CQRS, no Kafka. The monorepo + queue is the
  architecture.
- Add caching, read replicas, sharding, and horizontal worker scaling **only when a
  measured bottleneck demands it** — and the boundaries above mean you can.

The rule: **keep the interfaces scalable, keep the implementations simple.** Document
any deliberate "good enough for now" decision so the future scaling path is obvious. See
[`docs/architecture/roadmap.md`](docs/architecture/roadmap.md).

---

## 10. Error handling

- **Fail loud at boundaries, degrade gracefully in the UI.** Validate inputs and throw
  early in services; present recoverable, friendly states to the user.
- **Use typed HTTP errors.** Throw NestJS `HttpException` subclasses with the right
  status (`UnauthorizedException` 401, `ForbiddenException` 403, `NotFoundException` 404,
  `BadRequestException` 400, `ConflictException` 409, 429 for rate limits,
  `InternalServerErrorException` 500). A global exception filter shapes the JSON response;
  the client maps the status to UX. Never leak stack traces or internal messages to users.
- **Never swallow errors.** No empty `catch {}`. Either handle meaningfully, attach
  context and rethrow, or let it propagate to the global handler. Don't convert errors
  into silent `null`s that hide failures downstream.
- **Distinguish expected from unexpected.** Expected outcomes (not found, validation
  failed) are typed results/errors. Unexpected ones go to Sentry.
- **Worker jobs:** rely on BullMQ retries with backoff for transient failures; make
  processors idempotent so retries are safe; route permanent failures to a dead-letter
  queue and log enough context to diagnose. Never let one bad job crash the worker.
- **External calls** (platforms, AI providers) get timeouts, bounded retries with
  backoff, and explicit handling of rate limits (`429`). Treat third-party APIs as
  unreliable.
- **Observability:** report unexpected errors to **Sentry** with request/job context
  (but no PII/secrets). Use structured logging (NestJS `Logger`). Product events go to
  **PostHog**, never errors-as-analytics.
- **Validate env at startup**, not lazily at first use — fail fast on misconfiguration.

---

## 11. Testing philosophy

We test for **confidence per unit of maintenance cost**, not coverage numbers. The
scaffold has no tests yet; when you add behavior, add the tests that would catch it
breaking.

- **The type system is the first line of defense.** Lean on it; many "tests" are
  unnecessary because the types make the bug impossible.
- **Test behavior, not implementation.** Tests should survive refactors that preserve
  behavior. Avoid asserting on internal call order or private structure.
- **The testing pyramid:**
  - _Unit_ — pure logic: scoring, risk heuristics, prompt builders, `shared` utils,
    Zod schemas. Fast, no I/O. The bulk of tests.
  - _Integration_ — services + repositories against a real (test) Postgres; controller
    routes end-to-end via Nest's testing module; worker processors against a test Redis.
  - _E2E_ — a thin layer over the few critical user flows (discover → review → draft).
- **Pure functions are the unit-test sweet spot.** Push logic into pure functions
  (especially in `shared` and `ai`) precisely because they are trivial to test.
- **Mock at boundaries only** (AI providers, platform APIs, time/randomness). Do not
  mock your own repositories in service integration tests — use a real test DB.
- **Determinism:** never call `Date.now()`/`Math.random()` directly in testable logic;
  inject clocks/ids so tests are deterministic.
- **A bug fix starts with a failing test** that reproduces it.

---

## 12. AI-assisted development rules (read this, future Claude)

This repository is built primarily with Claude Code. These rules exist to keep
AI-assisted change _additive and safe_ rather than entropy-increasing.

1. **Understand before you change.** Read this file, the relevant
   `docs/architecture/*` doc, and the target package's `CLAUDE.md` before writing code.
   Read the neighboring files and match their patterns.
2. **Respect the boundaries in §4.** Never introduce a dependency that violates the
   table. If you think a boundary is wrong, propose changing it explicitly — don't quietly
   cross it.
3. **Minimize surface-area changes.** Make the smallest change that fully solves the
   problem. Don't reformat unrelated code, rename things drive-by, or "improve" code you
   weren't asked to touch. A focused diff is reviewable.
4. **Prefer extension over rewrites.** Add to the existing structure. Do not rewrite a
   working module to suit a new feature when you can extend it. Rewrites must be
   justified and called out.
5. **No duplicate implementations.** Before writing a helper, schema, type, or
   component, **search for an existing one.** If something close exists, extend it. Two
   implementations of the same concept is a bug.
6. **One source of truth.** Domain types come from Zod schemas in `shared`. DB shape
   comes from `prisma/schema.prisma`. The API contract is the REST endpoints, with
   request/response shapes defined by the `shared` schemas. Don't re-declare these
   elsewhere.
7. **Update docs alongside code.** If you change architecture, boundaries, the domain
   model, or a convention, update this file and the relevant `docs/architecture/*` and
   package `CLAUDE.md` **in the same change.** Stale docs are bugs.
8. **Preserve the human-in-the-loop contract.** Never add auto-posting, auto-engagement,
   or ToS-circumventing behavior — even if asked casually. Flag it instead.
9. **Don't guess at facts you can verify.** Check the actual schema, package versions,
   and exports rather than assuming. The stack is locked (§13) — don't introduce
   alternatives.
10. **Leave the codebase more consistent than you found it.** When you touch an area,
    align it with these conventions; don't add a second style.
11. **State uncertainty.** If a design decision is ambiguous, surface the trade-off and
    your recommendation rather than silently picking and hiding it.

### Refactoring rules

- Refactor in **small, behavior-preserving steps**, each independently reviewable.
- **Separate refactors from feature changes.** Never mix a rename/move with new
  behavior in the same diff — it makes review impossible.
- Have a safety net first (types + tests). Refactor _toward_ the conventions in this
  doc, never away from them.
- Deleting code is a valid, valuable change. Remove dead code rather than commenting it
  out. (The current scaffold intentionally keeps illustrative placeholders — replace
  them with real implementations, don't accumulate more.)
- If a refactor reveals a boundary violation, fix the boundary, not just the symptom.

---

## 13. Locked technology stack

These are **decided**. Do not introduce alternatives without a new ADR in
[`docs/architecture/decisions.md`](docs/architecture/decisions.md).

| Area            | Technology                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| Monorepo        | Turborepo + pnpm workspaces                                                    |
| Frontend        | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui                      |
| Frontend state  | TanStack Query (server state), Zustand (UI state), TanStack Table              |
| Backend         | NestJS                                                                         |
| API contract    | REST (NestJS controllers) + Zod                                                |
| Database        | PostgreSQL + pgvector, Prisma ORM                                              |
| Background jobs | BullMQ + Redis                                                                 |
| AI              | Provider-abstracted in `packages/ai`                                           |
| Auth            | Better Auth                                                                    |
| Monitoring      | Sentry (errors) + PostHog (product analytics)                                  |
| Tooling         | ESLint (strict flat config), Prettier, TypeScript (strict), Husky, lint-staged |

Versions are pinned per workspace `package.json`; Node `>= 20` (Node 22 via `.nvmrc`),
pnpm `>= 10`.

---

## 14. Monorepo rules

- **Internal packages use `workspace:*`** and the `@distribution-copilot/*` namespace.
- **Internal libraries compile with `tsc` to `dist/`** and expose `main`/`types`/`exports`.
  Turborepo's `^build` ordering builds dependencies before consumers — never import a
  package's `src/` directly across package boundaries; import the package by name.
- **Run tasks through Turborepo from the root:** `pnpm build`, `pnpm lint`,
  `pnpm type-check`, `pnpm format`. Use `pnpm --filter <pkg>` to scope.
- **Add a dependency in the workspace that uses it**, not the root. Root `devDependencies`
  are repo-wide tooling only.
- **`tooling/` is build-time config; `packages/config` is runtime config.** Keep them
  separate (see the README for the rationale).
- **Prisma schema lives once at `/prisma`.** `packages/database` points at it; don't
  create a second schema.
- **Don't break the dependency graph for convenience.** If two packages need to share
  something, it belongs in `shared` (or `config`), not a back-reference.
- Husky + lint-staged run ESLint and Prettier on staged files pre-commit. Keep commits
  green; do not bypass hooks (`--no-verify`) without explicit reason.

---

## 15. Common commands

```bash
pnpm install          # install all workspaces
pnpm dev              # build internal packages, then run all dev servers
pnpm build            # build every app and package (respects dep graph)
pnpm lint             # strict ESLint across the monorepo
pnpm type-check       # tsc --noEmit everywhere
pnpm format           # Prettier write

pnpm db:generate      # generate the Prisma client
pnpm db:migrate       # create + apply a dev migration
pnpm db:push          # push schema without a migration (early dev only)
pnpm db:studio        # open Prisma Studio

pnpm --filter @distribution-copilot/web dev   # scope a task to one workspace
```

Local services: web → `http://localhost:3847`, api → `http://localhost:3848`
(`GET /health` → `{ "status": "ok" }`), worker → logs on start.

---

## 16. Documentation map

| Topic                           | File                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Product, users, principles      | [`docs/architecture/product.md`](docs/architecture/product.md)                             |
| Architecture decisions (ADRs)   | [`docs/architecture/decisions.md`](docs/architecture/decisions.md)                         |
| Domain model & vocabulary       | [`docs/architecture/domain-model.md`](docs/architecture/domain-model.md)                   |
| Database & data layer           | [`docs/architecture/database.md`](docs/architecture/database.md)                           |
| API design (REST) & auth        | [`docs/architecture/api-design.md`](docs/architecture/api-design.md)                       |
| Backend (NestJS) architecture   | [`docs/architecture/backend-architecture.md`](docs/architecture/backend-architecture.md)   |
| Frontend (Next.js) architecture | [`docs/architecture/frontend-architecture.md`](docs/architecture/frontend-architecture.md) |
| AI architecture & providers     | [`docs/architecture/ai-architecture.md`](docs/architecture/ai-architecture.md)             |
| Worker / background jobs        | [`docs/architecture/worker-architecture.md`](docs/architecture/worker-architecture.md)     |
| Roadmap & scaling path          | [`docs/architecture/roadmap.md`](docs/architecture/roadmap.md)                             |

**Per-package guides** (read before working in a package): `apps/web/CLAUDE.md`,
`apps/api/CLAUDE.md`, `apps/worker/CLAUDE.md`, `packages/ai/CLAUDE.md`,
`packages/database/CLAUDE.md`, `packages/ui/CLAUDE.md`, `packages/shared/CLAUDE.md`.

---

_Keep this file current. When the architecture changes, this file changes in the same
commit._
