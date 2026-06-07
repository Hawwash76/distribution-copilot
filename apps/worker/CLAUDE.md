# CLAUDE.md — `@distribution-copilot/worker`

The background-jobs service. **BullMQ + Redis.** Runs all slow, external-I/O-bound,
rate-limited, high-volume work: discovery (scraping), embedding, scoring, risk assessment.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/worker-architecture.md`](../../docs/architecture/worker-architecture.md)
> first.

---

## Responsibilities

- Process **BullMQ queues** for the heavy stages of the loop (discover → embed → score →
  assess), and any batch AI.
- Talk to platforms through **source connectors**; persist results via repositories.
- Run recurring work (scheduled discovery/refresh) via BullMQ repeatable jobs.

## Boundaries

**Depends on:** `database`, `shared`, `config`, `ai`.

**Must NOT:** expose HTTP; host the tRPC router; render UI; import `trpc`/`web`/`ui` or the
API. It is triggered by **enqueued jobs**, never requests.

**Communication:** the API and worker talk **through the queue and the database** —
never by importing each other.

## Folder conventions

```
src/
├── main.ts                       # bootstrap: register & start all workers; graceful shutdown
├── config/
│   └── redis.ts                  # RedisOptions for BullMQ (maxRetriesPerRequest: null)
└── queues/<queue>/               # one folder per queue (kebab-case queue name)
    ├── <queue>.worker.ts          # the BullMQ Worker: wires processor + options
    ├── <queue>.processor.ts       # the job LOGIC — the unit of test
    └── <queue>.types.ts           # typed job payload + result (reuse shared shapes)
```

Today: `config/redis.ts` (connection options) + `main.ts` (logs on start, no queues).
Runs via `tsx` in dev, compiled `node dist/main.js` in prod.

## Patterns

- **One queue per capability** (`discovery`, `embedding`, `scoring`, `risk-analysis`);
  chain stages by enqueuing the next on completion, or advance by opportunity `status`.
- **Processor holds the logic; worker file wires options** (connection, concurrency,
  retries/backoff, timeout). Test the processor in isolation with injected deps.
- **Validate the job payload** with Zod at the start of the processor (enqueued data is
  still input).
- **Call `ai` for model work** (`embed`/`scoreOpportunity`/`assessRisk`) and **persist via
  repositories** — the worker never calls vendor SDKs or holds Prisma queries inline.
- **Per-queue concurrency** tuned to platform/AI rate limits; explicit `429`/backoff
  handling.
- **Errors:** transient → BullMQ retry with backoff; permanent → dead-letter queue +
  logged context; report unexpected failures to Sentry. One bad job never crashes the
  process.

## Job design rules (non-negotiable)

1. **Idempotent** — safe to run twice (use unique constraints + upserts; e.g.
   `(source, externalId)` for opportunities).
2. **Minimal payloads** — pass IDs/small params; re-read from the DB. No blobs in Redis.
3. **Typed payloads & results** — `*.types.ts` per queue; validate on entry.
4. **Bounded & observable** — timeout + retry policy; structured logs with job id (no
   PII/secrets).
5. **Respect external limits** — honor platform/provider rate limits; never circumvent
   rate limits or anti-bot measures.

## Anti-patterns

- Running discovery/scoring/embedding inside an HTTP request (that's the API's mistake to
  avoid; here, never accept such work synchronously).
- Large job payloads instead of IDs.
- Non-idempotent jobs that duplicate data on retry.
- Importing `trpc`/`web`/`ui` or the API; calling AI vendor SDKs directly.
- Swallowing job errors; letting one job crash the worker.
- **Any auto-engagement capability** — the worker discovers/scores/assesses/pre-drafts; it
  never posts, votes, follows, or engages. None may be added (product §6).

## Implementation guidance

- **New queue:** create `queues/<queue>/` (worker + processor + types), register/start it in
  `main.ts`, set concurrency for the relevant rate limits. Make the processor idempotent.
- **New platform:** implement the common **source-connector interface** (normalize to the
  `Opportunity`/`Community` domain shape + `OpportunitySource` enum). Downstream stages
  should not need changes.
- **Scheduled work:** use BullMQ repeatable jobs; keep cadence conservative to respect
  platforms.

## Commands

```bash
pnpm --filter @distribution-copilot/worker dev       # tsx watch; logs on start
pnpm --filter @distribution-copilot/worker build
pnpm --filter @distribution-copilot/worker type-check
```

Key env: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional), `DATABASE_URL`,
plus AI provider keys (read by `packages/ai`).
