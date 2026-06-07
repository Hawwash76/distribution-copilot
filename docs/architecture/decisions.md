# Architecture Decision Records (ADRs)

This file records the significant architectural decisions for Distribution Copilot, in
the lightweight ADR format: **Context → Decision → Consequences**. The stack is
**locked** (see [`CLAUDE.md`](../../CLAUDE.md) §13) — these ADRs explain _why_, so future
work builds on the decisions instead of relitigating them.

## How to use this file

- Read the relevant ADR before proposing an alternative to a locked technology.
- To change a decision, **add a new ADR** that supersedes the old one (don't edit history
  in place); mark the old one `Superseded by ADR-XYZ`.
- Each ADR is immutable once `Accepted`. New context → new ADR.

| #   | Decision                                  | Status   |
| --- | ----------------------------------------- | -------- |
| 001 | Turborepo + pnpm monorepo                 | Accepted |
| 002 | NestJS for the backend                    | Accepted |
| 003 | PostgreSQL as the primary database        | Accepted |
| 004 | Prisma as the ORM                         | Accepted |
| 005 | pgvector for embeddings / semantic search | Accepted |
| 006 | tRPC for the API contract                 | Accepted |
| 007 | Better Auth for authentication            | Accepted |
| 008 | BullMQ + Redis for background jobs        | Accepted |
| 009 | TanStack Query for server state           | Accepted |
| 010 | Zustand for client UI state               | Accepted |
| 011 | shadcn/ui + Tailwind for the UI layer     | Accepted |
| 012 | Zod as the single validation source       | Accepted |
| 013 | Next.js App Router for the frontend       | Accepted |
| 014 | Provider-abstracted AI in `packages/ai`   | Accepted |
| 015 | Sentry + PostHog for monitoring           | Accepted |

---

## ADR-001 — Turborepo + pnpm workspaces for the monorepo

**Status:** Accepted

**Context.** The product spans a web frontend, a backend API, background workers, and
several shared libraries (types, schemas, API contract, UI, AI). These must share types
and validation with zero drift, build in the right order, and stay individually
deployable. We need fast, cached builds and strict dependency boundaries.

**Decision.** Use a **Turborepo + pnpm-workspaces** monorepo. Apps live in `apps/*`,
shared libraries in `packages/*`, build-time config in `tooling/*`. All internal packages
are namespaced `@distribution-copilot/*` and linked with `workspace:*`. Turborepo's
`^build` task ordering guarantees dependencies build before consumers; pnpm's
content-addressable store keeps installs fast and disk-light.

**Consequences.**

- _Positive:_ end-to-end type sharing (the frontend imports the API's `AppRouter` type
  directly); one place to enforce lint/tsconfig/prettier; cached, incremental builds;
  clear, lint-enforceable boundaries between packages.
- _Negative:_ monorepo tooling has a learning curve; internal packages compile to
  `dist/` so a dependency must be built before a consumer can type-check against it
  (mitigated by `pnpm dev` building packages first).
- _Constraint:_ never import another package's `src/` directly — import by package name.
  Dependencies flow apps → packages only.

---

## ADR-002 — NestJS for the backend

**Status:** Accepted

**Context.** The backend will grow many features (discovery, scoring, risk, replies,
billing, integrations) and must stay organized as it does. We want strong TypeScript
support, dependency injection for testability, a clear module system, and lifecycle
hooks for graceful shutdown (important when workers and queues are involved).

**Decision.** Use **NestJS**. Organize by **feature module** under `src/modules/<feature>`,
each with its controller/router, service, and repository. NestJS hosts the shared tRPC
router (mounted as middleware) and owns all business logic and auth.

**Consequences.**

- _Positive:_ opinionated, scalable structure; first-class DI makes services and
  repositories easy to test and swap; module boundaries map cleanly onto domain
  features; built-in `Logger`, config, and shutdown hooks.
- _Negative:_ heavier than a minimal Express/Fastify app; decorators/DI add a learning
  curve. Acceptable given the expected growth.
- _Constraint:_ business logic lives in services, DB access in repositories — controllers
  and tRPC procedures stay thin. See [`backend-architecture.md`](backend-architecture.md).

---

## ADR-003 — PostgreSQL as the primary database

**Status:** Accepted

**Context.** We need a reliable relational store for users, products, communities,
opportunities, scores, risk assessments, and replies — with strong consistency, rich
querying, JSON flexibility for semi-structured metadata, and a path to vector/semantic
search at scale.

**Decision.** Use **PostgreSQL** as the single primary datastore, with the **pgvector**
extension (ADR-005) for embeddings. JSON columns hold semi-structured metadata where a
rigid schema isn't warranted.

**Consequences.**

- _Positive:_ battle-tested reliability; relational integrity for the
  user/product/opportunity graph; `JSONB` for flexible metadata; pgvector gives us
  semantic search _in the same database_, avoiding a separate vector store for the MVP.
- _Negative:_ a single relational DB needs deliberate indexing/partitioning as post
  volume grows (millions of rows). Addressed via the repository boundary and the scaling
  path in [`roadmap.md`](roadmap.md).
- _Constraint:_ one database, accessed only through the repository layer; no second
  datastore added without an ADR.

---

## ADR-004 — Prisma as the ORM

**Status:** Accepted

**Context.** We want type-safe database access that stays in sync with the schema, a
clear migration workflow, and good DX for a TypeScript team — without hand-writing SQL
for the common path.

**Decision.** Use **Prisma**. The schema is the single source of DB truth at
`prisma/schema.prisma`; the generated client is wrapped by
`@distribution-copilot/database` (a singleton, reused in dev to avoid connection
exhaustion). Prisma's `postgresqlExtensions` preview feature manages the pgvector
extension.

**Consequences.**

- _Positive:_ generated, fully-typed client; declarative schema + migration history;
  one place to evolve the data model; pleasant DX.
- _Negative:_ generated types are Prisma-shaped; some advanced vector queries need raw
  SQL (`$queryRaw`). We accept selective raw SQL behind repositories for vector search.
- _Constraint:_ **Prisma types never cross the tRPC boundary** — repositories map rows
  to Zod-derived domain types from `shared`. Run `pnpm db:generate` before building.

---

## ADR-005 — pgvector for embeddings and semantic search

**Status:** Accepted

**Context.** Discovery and matching need semantic similarity (embed conversations and
products, find related content). At MVP scale, standing up a dedicated vector database
is unjustified operational overhead, but we must not paint ourselves into a corner.

**Decision.** Use **pgvector** inside the existing PostgreSQL instance for embedding
storage and similarity search. The extension is enabled in the schema today
(`extensions = [vector]`); `vector` columns and indexes are added when embeddings ship.

**Consequences.**

- _Positive:_ one datastore to operate; transactional consistency between rows and their
  embeddings; no extra infra for the MVP; good enough for millions of vectors with proper
  indexing (HNSW/IVFFlat).
- _Negative:_ at very large scale a specialized vector store may outperform pgvector.
- _Constraint:_ all vector access goes through the repository layer, so migrating to a
  dedicated store later is an implementation change, not an architectural one (see
  [`database.md`](database.md) and [`roadmap.md`](roadmap.md)).

---

## ADR-006 — tRPC for the API contract

**Status:** Accepted

**Context.** Frontend and backend are both TypeScript in one monorepo. We want
**end-to-end type safety** with no codegen step and no schema duplication, and tight
integration with TanStack Query on the client.

**Decision.** Use **tRPC** as the API contract, defined in `@distribution-copilot/trpc`
and hosted by the NestJS API (mounted as Express middleware at `/trpc`). The web app
imports `AppRouter` **as a type only** via `@trpc/react-query`, giving full type
inference with zero runtime coupling. Procedure inputs/outputs are validated with Zod
(ADR-012).

**Consequences.**

- _Positive:_ change a procedure and the frontend's types update instantly; no OpenAPI
  codegen; Zod gives runtime validation + inferred types in one definition; great
  TanStack Query integration.
- _Negative:_ tRPC couples client and server to TypeScript (fine — both are TS) and is
  not a public REST API. If we later need a public/3rd-party API, we add REST/GraphQL
  alongside via a new ADR.
- _Constraint:_ the router lives in `packages/trpc`; the API is its only host; the web
  imports only the type. See [`api-design.md`](api-design.md).

---

## ADR-007 — Better Auth for authentication

**Status:** Accepted

**Context.** We need secure authentication (email/password and, later, OAuth providers
and platform connections), session management, and a Prisma adapter — without hand-rolling
auth, which is a recurring source of security bugs.

**Decision.** Use **Better Auth**, configured in the API (`apps/api/src/config/auth.ts`)
with the Prisma adapter against our PostgreSQL database. Auth is owned by the backend;
the tRPC context carries the authenticated session.

**Consequences.**

- _Positive:_ batteries-included, secure session/token handling; native Prisma adapter
  fits our stack; extensible to OAuth and platform integrations; we never hand-roll
  password hashing or sessions.
- _Negative:_ a newer library than some incumbents; we track its releases.
- _Constraint:_ all auth flows go through Better Auth — no custom session/token logic.
  Authorization (per-user scoping) is enforced server-side in services/repositories. See
  [`api-design.md`](api-design.md).

---

## ADR-008 — BullMQ + Redis for background jobs

**Status:** Accepted

**Context.** Discovery (scraping), scoring, risk assessment, and embedding are slow,
external-I/O-bound, rate-limited, and high-volume (millions of posts). They must never
run inside an HTTP request. We need reliable queues with retries, backoff, scheduling,
and concurrency control.

**Decision.** Use **BullMQ** backed by **Redis** for all background processing, run by a
dedicated `apps/worker` service. Queues are defined per capability (`discovery`,
`scoring`, …). Redis is configured with `maxRetriesPerRequest: null` as BullMQ requires
for blocking commands.

**Consequences.**

- _Positive:_ reliable retries with exponential backoff; delayed/repeatable jobs for
  scheduled discovery; concurrency limits to respect platform rate limits; horizontal
  scaling by adding worker processes; clean separation of request path from heavy work.
- _Negative:_ adds Redis as infrastructure and a separate deployable. Justified by the
  workload.
- _Constraint:_ jobs must be **idempotent** (safe to retry), carry **minimal payloads**
  (IDs, not blobs), and be observable. The worker does not depend on `trpc`; it shares
  `database` and `shared`. See [`worker-architecture.md`](worker-architecture.md).

---

## ADR-009 — TanStack Query for server state

**Status:** Accepted

**Context.** The frontend needs caching, background refetching, request dedup,
pagination, and loading/error state for data fetched from the API — without a hand-rolled
fetching layer or stuffing server data into a global store.

**Decision.** Use **TanStack Query** as the single owner of **server state**, integrated
with tRPC via `@trpc/react-query`. A request-scoped `QueryClient` on the server and a
singleton in the browser (the standard App Router pattern) are configured in
`apps/web/src/lib/query-client.ts`.

**Consequences.**

- _Positive:_ caching, dedup, background refresh, and pagination for free; tRPC
  integration gives typed hooks; clear separation from UI state.
- _Negative:_ two state tools to learn (with Zustand) — but they own disjoint concerns.
- _Constraint:_ **server data lives in TanStack Query, never in Zustand.** See
  [`frontend-architecture.md`](frontend-architecture.md) and ADR-010.

---

## ADR-010 — Zustand for client UI state

**Status:** Accepted

**Context.** Some state is purely client-side and ephemeral (sidebar open, modals,
selections, wizard steps). It doesn't belong in the URL, the server, or TanStack Query.

**Decision.** Use **Zustand** for **ephemeral client UI state only**. Stores live in
`apps/web/src/store/` as `use-*-store.ts` (e.g. the existing `useAppStore`).

**Consequences.**

- _Positive:_ tiny, simple, hook-based; no boilerplate; no provider tree; perfect for
  ephemeral UI state.
- _Negative:_ easy to misuse as a dumping ground for server data — explicitly forbidden.
- _Constraint:_ **no server data in Zustand**, no shared mutable state beyond UI
  concerns. Server state → TanStack Query (ADR-009). See
  [`frontend-architecture.md`](frontend-architecture.md).

---

## ADR-011 — shadcn/ui + Tailwind CSS for the UI layer

**Status:** Accepted

**Context.** We need an accessible, consistent, fully-ownable component layer with a fast
styling workflow and no heavyweight runtime dependency or opaque theming.

**Decision.** Use **Tailwind CSS** for styling and **shadcn/ui** for components. shadcn
components are generated into our codebase (we own the source), shared primitives live in
`@distribution-copilot/ui` (the `cn` helper + CVA/clsx/tailwind-merge today), and the web
app's `components.json` points its `ui` alias at that package.

**Consequences.**

- _Positive:_ we own and can modify every component (no black-box library); accessible
  Radix primitives underneath; Tailwind keeps styling colocated and fast; class ordering
  auto-managed by `prettier-plugin-tailwindcss`.
- _Negative:_ generated components are copied in (must be maintained as our code).
- _Constraint:_ reusable, presentational primitives → `packages/ui`; app-specific
  components → `apps/web` co-located with their feature. No business logic in `ui`. See
  [`packages/ui/CLAUDE.md`](../../packages/ui/CLAUDE.md).

---

## ADR-012 — Zod as the single validation + type source

**Status:** Accepted

**Context.** We want one definition that provides **both** runtime validation and a
static type, shared across web, api, and worker — eliminating drift between "the type"
and "the validator."

**Decision.** Use **Zod**. Domain schemas live in `@distribution-copilot/shared/schemas`;
types are `z.infer`-ed from them. tRPC procedures validate inputs with these schemas. A
single, version-pinned `zod` is re-exported from `shared` so all consumers share one
instance.

**Consequences.**

- _Positive:_ one source of truth for shape + validation; inferred types stay in sync
  automatically; validation at every boundary; reusable schemas across all services.
- _Negative:_ runtime validation has a small cost (negligible and worth it at
  boundaries).
- _Constraint:_ declare a domain type **once** as a Zod schema in `shared`; infer it
  everywhere. Keep `shared` framework-free. See [`domain-model.md`](domain-model.md).

---

## ADR-013 — Next.js App Router for the frontend

**Status:** Accepted

**Context.** The dashboard needs server-side rendering, streaming, a modern routing model,
React Server Components, and first-class React 19 support.

**Decision.** Use **Next.js with the App Router** (`src/app/`), React 19, server
components by default and client components where interactivity demands. Providers
(TanStack Query + tRPC client) are wired in a client boundary; the `@/*` path alias maps
to `src/*`.

**Consequences.**

- _Positive:_ RSC + streaming for fast first loads; nested layouts and route groups for
  the dashboard; co-location of routes and UI; SEO-ready.
- _Negative:_ the server/client component split is a real mental model to maintain (what
  can run where).
- _Constraint:_ default to server components; mark client components `"use client"`
  deliberately; keep server-only secrets out of client code (no secrets in
  `NEXT_PUBLIC_*`). See [`frontend-architecture.md`](frontend-architecture.md).

---

## ADR-014 — Provider-abstracted AI in `packages/ai`

**Status:** Accepted

**Context.** The product depends on AI for scoring, risk assessment, embeddings, and
reply drafting. Model vendors, prices, and capabilities change quickly; we must be able
to swap or add providers without rewriting application logic, and keep prompts versioned
and testable.

**Decision.** Centralize all AI access in **`@distribution-copilot/ai`** behind a
**capability-oriented provider abstraction**. Application code requests a _capability_
(embed, score, assess-risk, draft-reply), not a vendor. Prompts are stored as versioned
templates under `packages/ai/prompts/<capability>/`, separate from logic.

**Consequences.**

- _Positive:_ provider-agnostic application code; swap/add models in one package; prompts
  versioned and unit-testable as pure functions; one place for tokens, retries, rate
  limits, and cost controls.
- _Negative:_ an abstraction layer to maintain — kept thin and capability-shaped to earn
  its keep.
- _Constraint:_ no direct vendor SDK calls outside `ai`; `ai` stays free of
  `database`/`trpc`/app deps (depends only on `shared`/`config`). AI outputs are drafts
  — never auto-published. See [`ai-architecture.md`](ai-architecture.md).

---

## ADR-015 — Sentry + PostHog for monitoring

**Status:** Accepted

**Context.** We need error tracking across web/api/worker and product analytics to
understand usage — with a clean separation between "something broke" and "a user did
something."

**Decision.** Use **Sentry** for error/exception tracking and performance, and **PostHog**
for product analytics. Both are wired as opt-in placeholders today
(`apps/web/src/lib/monitoring.ts`) that no-op until their env vars are set, so local dev
and CI need no monitoring config.

**Consequences.**

- _Positive:_ unexpected errors surface with context; product decisions are data-informed;
  env-gated so non-prod environments stay quiet.
- _Negative:_ two third-party services to configure and keep free of PII.
- _Constraint:_ **errors → Sentry, product events → PostHog** (never errors-as-analytics);
  **no PII or secrets** in either; nothing initializes without its env var. See
  [`CLAUDE.md`](../../CLAUDE.md) §10.
