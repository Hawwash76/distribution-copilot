# CLAUDE.md — `@distribution-copilot/worker`

The background-jobs service. **BullMQ + Redis.** Runs all slow, external-I/O-bound,
rate-limited, high-volume work: SERP discovery, URL extraction, AI scoring, and risk
assessment.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/worker-architecture.md`](../../docs/architecture/worker-architecture.md)
> first.

---

## Responsibilities

- Process three **BullMQ queues** that form the SERP discovery pipeline:
  `discovery` → `extract` → `scoring`.
- Call platform APIs through the **`clients/`** layer; persist results via repositories.
- Run recurring work (scheduled discovery/refresh) via BullMQ repeatable jobs.

## The pipeline

```
"discovery" queue
  Payload: { productId }
  Processor: loads product profile keywords → calls SerpClient → collects URLs →
             enqueues one "extract" job per URL
  Concurrency: 1 (SERP rate limits)

"extract" queue
  Payload: { url, productId, serpTitle, serpSnippet }
  Processor: calls extractContent → upserts Community? → upserts Discussion →
             upserts Opportunity (status="new") → enqueues "scoring" job (deduped by productId)
  Concurrency: 3 (I/O-bound URL fetches)

"scoring" queue
  Payload: { productId }
  Processor: scores all status="new" opportunities with AI (or partial if no profile) →
             saves scores + risk + draft reply → advances status to "scored"
  Concurrency: 1 (AI provider rate limits)
```

## External APIs

| Client         | File                                   | Notes                                                                                      |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| SerpAPI        | `clients/serp/serp.client.ts`          | `GET /search.json` with `engine=google`. Returns no-op when `SERP_API_KEY` is unset (dev). |
| Reddit JSON    | `clients/extract/content-extractor.ts` | Public `url+".json"` endpoint — no auth.                                                   |
| Algolia HN API | `clients/extract/content-extractor.ts` | `https://hn.algolia.com/api/v1/items/<id>`                                                 |
| Generic web    | `clients/extract/content-extractor.ts` | Falls back to SERP snippet (no extra fetch).                                               |

## Boundaries

**Depends on:** `database`, `shared`, `config`, `ai`.

**Must NOT:** expose HTTP or render UI; import `web`/`ui` or the API. Triggered by
**enqueued jobs**, never HTTP requests.

**Communication:** the API and worker talk **through the queue and the database** —
never by importing each other.

## Folder conventions

```
src/
├── main.ts                          # bootstrap: register & start all workers; graceful shutdown
├── config/
│   └── redis.ts                     # RedisOptions for BullMQ (maxRetriesPerRequest: null)
├── clients/                         # thin API clients (no business logic)
│   ├── serp/
│   │   └── serp.client.ts           # SerpClient factory + SerpResult type
│   └── extract/
│       └── content-extractor.ts     # extractContent dispatch (Reddit / HN / web fallback)
├── queues/<queue>/                  # one folder per queue (kebab-case queue name)
│   ├── <queue>.worker.ts            # BullMQ Worker: wires processor + options
│   ├── <queue>.processor.ts         # the job LOGIC — the unit to test
│   └── <queue>.types.ts             # typed job payload + result
└── repositories/
    ├── extract.repository.ts        # upsertCommunity, upsertDiscussion, upsertOpportunity
    └── scoring.repository.ts        # findNewByProduct, findProductProfile, saveScores
```

## Patterns

- **One queue per stage** (`discovery`, `extract`, `scoring`); chain stages by enqueuing
  the next on completion.
- **Processor holds the logic; worker file wires options** (connection, concurrency,
  retries/backoff, timeout). Test the processor in isolation with injected deps.
- **Validate the job payload** with Zod at the start of every processor.
- **Call `ai` for model work** and **persist via repositories** — processors never call
  vendor SDKs or hold Prisma queries inline.
- **Per-queue concurrency** tuned to external rate limits.
- **Errors:** transient → BullMQ retry with backoff; permanent → dead-letter queue +
  logged context; unexpected failures reported to Sentry. One bad job never crashes the
  process.

## Job design rules (non-negotiable)

1. **Idempotent** — safe to run twice. Use unique constraints + upserts.
   - Discussion: unique on `url`.
   - Opportunity: unique on `(productId, discussionId)`.
   - Scoring: `status="new"` check means re-running finds zero candidates.
2. **Minimal payloads** — pass IDs/small params; re-read from DB. No blobs in Redis.
3. **Typed payloads & results** — `*.types.ts` per queue; validate on entry.
4. **Bounded & observable** — timeout + retry policy; structured logs with job id (no
   PII/secrets).
5. **Respect external limits** — honor SerpAPI, Reddit, and HN rate limits and ToS; never
   circumvent anti-bot measures.

## Anti-patterns

- Running discovery/scoring inside an HTTP request.
- Large job payloads instead of IDs.
- Non-idempotent jobs that duplicate data on retry.
- Importing `web`/`ui` or calling AI vendor SDKs directly.
- Swallowing job errors; letting one job crash the worker.
- **Any auto-engagement capability** — the worker discovers/scores/assesses/pre-drafts; it
  never posts, votes, follows, or engages. None may ever be added (product §6).

## Implementation guidance

- **New queue:** create `queues/<queue>/` (worker + processor + types), register/start it in
  `main.ts`, set concurrency for the relevant rate limits. Make the processor idempotent.
- **New platform source:** add dispatch logic to `content-extractor.ts`; ensure the
  `DiscussionSource` enum in `packages/shared` covers the new value; update `prisma/schema.prisma`.
  Downstream stages (scoring, API, frontend) require no changes — they read from Discussion.
- **Scheduled work:** use BullMQ repeatable jobs; keep cadence conservative to respect
  platform rate limits.

## Commands

```bash
pnpm --filter @distribution-copilot/worker dev       # tsx watch; logs on start
pnpm --filter @distribution-copilot/worker build
pnpm --filter @distribution-copilot/worker type-check
```

Key env: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional), `DATABASE_URL`,
`SERP_API_KEY` (optional — worker runs without it, but finds no opportunities).
AI provider keys are read by `packages/ai`.
