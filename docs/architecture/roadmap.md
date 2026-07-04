# Roadmap & Scaling Path

This document describes the **order in which the system is built** and **how it scales
without being over-engineered today**. It is a sequencing guide, not a dated commitment —
the goal is to make "what to build next" and "what _not_ to build yet" obvious.

Related: [`product.md`](product.md) (the loop), [`domain-model.md`](domain-model.md) (the
entities each phase adds), and the per-area architecture docs.

---

## 1. Guiding principle: scalable seams, simple insides

> **Keep the interfaces scalable; keep the implementations simple.**

The architecture already puts the seams in the right places — repositories, the queue, the
AI provider abstraction, the source-connector interface, the REST API contract. Because those
seams exist, we can ship a deliberately simple MVP and scale each piece _later_ as an
implementation change, not a rewrite.

So the rule for every phase: **build the simplest thing that works behind the right
boundary.** Don't pre-build scale. Document any "good enough for now" choice so the future
path is clear.

---

## 2. Current state (foundation — done)

The monorepo scaffold exists and is the foundation everything builds on:

- Turborepo + pnpm workspaces; strict ESLint/TS/Prettier; Husky + lint-staged.
- `apps/web` (Next.js shell, providers, `apiFetch` client, Zustand store, monitoring stubs).
- `apps/api` (NestJS `AppModule`, `ConfigModule`, `/health`, Better Auth + REST
  placeholders).
- `apps/worker` (BullMQ/Redis config scaffold, no queues).
- `packages/`: `database` (Prisma client wrapper,
  `User`/`Product` + pgvector enabled), `shared` (Zod schemas for user/product/opportunity,
  `Paginated`), `ai` (prompt folders only), `ui` (`cn` helper), `config` (constants + env
  schema).

No business logic, AI, scraping, or auth flows are implemented yet — by design.

---

## 3. Build sequence (phased)

Each phase is shippable and exercises the core loop a little more end-to-end.

### Phase 1 — Accounts & products

Make the app real for one user.

- Wire **Better Auth** in the API (Prisma adapter, email/password); resolve the session in
  NestJS guards on controller routes.
- Add the first feature controller(s) and verify end-to-end REST calls from the web app.
- Add the **`product` feature module** (controller + service + repository), scoped to `userId`;
  add product CRUD UI. Add `userId` to `Product`.
- _Outcome:_ a founder can sign in and describe their product(s).

### Phase 2 — Discovery (Reddit first)

Start filling the funnel.

- Define the **`Community` and full `Opportunity`** models (Prisma + Zod), with
  `(source, externalId)` uniqueness for idempotent ingestion and `userId`/`productId`
  scoping.
- Build the **Reddit source connector** and the **`discovery` worker queue** (respecting
  Reddit's API + rate limits). Enqueue from the API on demand and on a conservative
  schedule.
- Add the **opportunities list UI** (TanStack Table) with the `Paginated<T>` contract.
- _Outcome:_ discovered Reddit conversations appear in the dashboard.

### Phase 3 — Scoring & embeddings

Turn volume into signal.

- Add **pgvector columns/indexes** for product + conversation embeddings; add the
  **`embedding`** queue calling `ai.embed`.
- Implement the **`scoring`** queue (`ai.scoreOpportunity`) and the `Score` model; rank the
  list by `overall`. Surface the rationale (transparency).
- _Outcome:_ founders see the best opportunities first, and why.

### Phase 4 — Risk assessment

Make engagement safe.

- Capture **community rules/metadata** during discovery; add the `RiskAssessment` model and
  the **`risk-analysis`** queue (`ai.assessRisk`).
- Surface risk prominently in the review UI (level + factors + rationale).
- _Outcome:_ founders know where it's safe to engage and why.

### Phase 5 — Reply drafting & review

Close the loop (to the human).

- Add the `Reply` model and **`generateReplyDraft`** (interactive in the API, or
  pre-drafted in the worker); build the **draft editor** review experience.
- Implement reply/opportunity **lifecycle status** transitions (incl. "mark as posted" —
  which records the human's action and never posts).
- _Outcome:_ the full loop — discover → score → assess → draft → human edits → human posts
  manually.

### Phase 6 — Polish & additional sources (done)

- Added **Hacker News, Stack Overflow, Software Recs, Lobsters, Dev.to** connectors
  alongside Reddit (new connector + `DiscussionSource` member each; downstream stages
  unchanged).
- Refined prompts/scoring with real usage; added product-positioning fields that improve
  matching and drafting.

### Phase 7 — Scheduled monitoring (done)

- Added the `ProductMonitor` model + `monitors` module (per-source enable/disable toggles)
  and the worker's `monitor` queue: a scheduled, repeatable sweep across enabled monitors
  that feeds discovered URLs into the existing `extract` queue.

### Phase 8 — Billing (done)

- Added the `Subscription` model (auto-created on signup via Better Auth
  `databaseHooks`), the `billing` module (Stripe Checkout + portal + webhook), and a
  3-day trial. Stripe is optional — the app runs without `STRIPE_SECRET_KEY` (stubbed).
- **Open gap:** `SubscriptionGuard` exists (`apps/api/src/common/subscription.guard.ts`)
  but is not yet applied to any controller — paid gating is not enforced server-side.
  Applying it is the direct blocker between "billing exists" and "billing is enforced."

### Phase 9 — Landing page & launch prep (done)

- Marketing site, `robots.ts`/`sitemap.ts`, PostHog wired in `apps/web`.
- Sentry error reporting was scaffolded then removed — deliberately deferred until it's
  actually configured with a DSN (see root `CLAUDE.md` §13). Errors are logged via
  `console.error` (web) / NestJS `Logger` (api/worker) in the meantime.

### Phase 10 — Real-time alerts (done)

- Added the worker's `notification` queue: Slack/Telegram push when a scored opportunity
  clears the alert threshold. Second delivery channel beyond the dashboard — see
  `docs/IDEAS.md` "Build next" #1.

### Phase 11 — Pain-point synthesis / research mode (done)

- Added the `PainPoint` model (linked to `Discussion`, shared across products), the
  `extractPainPoints` AI capability (runs once per discussion during scoring, past the
  auto-dismiss threshold), and two new dashboard surfaces: `research` (pain points
  aggregated by frequency × intensity per product) and `competitor-monitor`
  (opportunities flagged as competitor frustration/evaluation signals). Delivers
  `docs/IDEAS.md` "Build next" #2.

---

## 4. Scaling path (apply only when measured)

Designed-for, **not built yet**. Add each only when a metric demands it.

### Database (see [`database.md`](database.md) §8)

1. Indexing & query tuning (first and biggest lever).
2. Connection pooling (PgBouncer) as api + worker connections grow.
3. Read replicas for heavy read/analytics paths.
4. Partition high-volume tables (opportunities / raw posts) by time or source at millions
   of rows.
5. Archive/tier cold raw content.
6. Dedicated vector store only if pgvector becomes the bottleneck (swapped behind the
   repository).

### Workers (see [`worker-architecture.md`](worker-architecture.md) §8)

1. Horizontal scale (more worker processes; BullMQ distributes).
2. Per-queue concurrency + rate limiting tuned to platform/provider limits.
3. Batch AI calls (embed/score in batches).
4. Separate/prioritized queues for latency-sensitive vs. bulk work.

### AI (see [`ai-architecture.md`](ai-architecture.md) §7)

1. Route capabilities to different providers/models via config.
2. Cache embeddings (content-hash + model keyed); avoid re-embedding unchanged content.
3. Token/cost budgeting and selective re-scoring on model upgrades.

### Frontend / API

1. Cursor pagination for very large lists.
2. Caching/CDN for static assets; streaming RSC for fast first paint.
3. Rate limiting on expensive endpoints.

---

## 5. Explicit "not yet" list (do not build for the MVP)

To keep the MVP simple and focused, we deliberately are **not** building:

- Microservices, event sourcing, CQRS, or a message bus beyond BullMQ.
- A dedicated vector database.
- Multi-region / sharded Postgres.
- A _public/versioned_ external API (the current REST API is internal; a public one needs a new ADR).
- Multi-provider AI routing before there's a second provider to route to.
- Team/multi-seat features before single-user value is proven.

If you find yourself building one of these without a measured need, **stop** — it
contradicts the engineering principles in [`CLAUDE.md`](../../CLAUDE.md) §2/§9.

---

## 6. Permanent non-goals (never on the roadmap)

These are not "later" — they are **never**, because they violate the product's core
contract (see [`product.md`](product.md) §6):

- Auto-posting or scheduled posting on the user's behalf.
- Automated engagement (likes, follows, votes, comments, DMs).
- Spamming or mass-distribution.
- Circumventing platform rules, rate limits, or anti-bot measures.

No phase, feature, or config ever introduces these. The human always decides what to
publish.
