# CLAUDE.md — `@distribution-copilot/worker`

The background-jobs service. **BullMQ + Redis.** Runs all slow, external-I/O-bound,
rate-limited, and AI-heavy work: multi-source discussion discovery, content extraction,
AI scoring, and risk assessment.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/worker-architecture.md`](../../docs/architecture/worker-architecture.md)
> first.

---

## Responsibilities

- Process **five BullMQ queues** that form the discovery pipeline:
  `discovery` → `extract` → `scoring`, plus `monitor` (scheduled sweep) and `notification`
  (Slack/Telegram alerts on high-score opportunities).
- Call platform APIs through the **`clients/`** layer; persist results via repositories.
- Run recurring monitoring work via BullMQ repeatable jobs (`monitor` queue).

## The pipeline

```
"discovery" queue  (one-shot, user-triggered)
  Payload: { productId }
  Processor: loads product profile keywords → queries all 6 platform clients →
             deduplicates URLs → enqueues one "extract" job per URL
  Concurrency: 1

"extract" queue
  Payload: { url, productId, sourceTitle, sourceSnippet }
  Processor: calls extractContent → upserts Community? → upserts Discussion →
             upserts Opportunity (status="new") → enqueues "scoring" job (deduped by productId)
  Concurrency: 3 (I/O-bound URL fetches)

"scoring" queue
  Payload: { productId }
  Processor: scores all status="new" opportunities with AI (or partial if no profile) →
             saves scores + risk + draft reply → advances status to "scored" →
             for opportunities clearing AUTO_DISMISS_THRESHOLD, extracts pain points
             (once per Discussion, shared across products) → enqueues "notification" job
  Concurrency: 1 (AI provider rate limits)

"monitor" queue  (scheduled, repeatable)
  Payload: none (global sweep)
  Processor: queries all enabled ProductMonitor rows → runs per-source keyword +
             competitor queries filtered by lastCheckedAt (or 30 days ago for first run) →
             feeds URLs into "extract" queue → stamps lastCheckedAt
  Schedule: every MONITOR_INTERVAL_MINUTES (default 30 min)
  Concurrency: 1

"notification" queue
  Payload: { opportunityId }
  Processor: pushes a high-score opportunity alert to the user's configured Slack/Telegram
             webhook, if any
  Concurrency: 3
```

## Platform clients

All discovery uses **native platform APIs** — no third-party search proxy.

| Client            | File                                            | Notes                                                                                                      |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Hacker News       | `clients/hn/hn-search.ts`                       | Algolia HN API. Free, no key. Supports `created_at_i>=epoch` date filter.                                  |
| Reddit            | `clients/reddit/reddit-search.ts`               | Public Atom RSS feed. No auth. Time-bucket filter via `t=week/month/year`.                                 |
| Stack Overflow    | `clients/stackoverflow/stackoverflow-search.ts` | SE API v2.3. Free tier 300 req/day; `STACK_EXCHANGE_KEY` env raises to 10k/day. Supports `fromdate=epoch`. |
| Software Recs     | `clients/stackoverflow/stackoverflow-search.ts` | Same SE factory, `site=softwarerecs`. Highest-intent source.                                               |
| Lobsters          | `clients/lobsters/lobsters-search.ts`           | Public RSS search feed. No date filter; `order=newest` + dedup handles overlap.                            |
| Dev.to            | `clients/devto/devto-search.ts`                 | Public articles API. No auth; `state=fresh` returns recent articles.                                       |
| Content extractor | `clients/extract/content-extractor.ts`          | Fetches and parses Reddit JSON, HN Algolia item, or uses source snippet as fallback.                       |

All clients implement the `DiscoverySource` interface (`clients/discovery-source.ts`):

```ts
interface DiscoverySource {
  readonly name: string;
  search(query: string, limit: number, options?: { since?: Date }): Promise<DiscoveryResult[]>;
}
```

The `since` option is honored by HN, StackOverflow/SoftwareRecs, and Reddit (approximate);
ignored by Lobsters and Dev.to (deduplication prevents redundant work).

## Boundaries

**Depends on:** `database`, `shared`, `config`, `ai`.

**Must NOT:** expose HTTP or render UI; import `web`/`ui` or the API. Triggered by
**enqueued jobs**, never HTTP requests.

**Communication:** the API and worker talk **through the queue and the database** —
never by importing each other.

## Folder conventions

```
src/
├── main.ts                              # bootstrap: register & start all workers; graceful shutdown
├── config/
│   └── redis.ts                         # RedisOptions for BullMQ (maxRetriesPerRequest: null)
├── clients/                             # thin API clients (no business logic)
│   ├── discovery-source.ts              # DiscoverySource interface + DiscoveryResult type
│   ├── hn/hn-search.ts                  # Hacker News via Algolia API
│   ├── reddit/reddit-search.ts          # Reddit via public Atom RSS
│   ├── stackoverflow/stackoverflow-search.ts  # Stack Overflow + Software Recs via SE API
│   ├── lobsters/lobsters-search.ts      # Lobsters via RSS search
│   ├── devto/devto-search.ts            # Dev.to via public articles API
│   └── extract/content-extractor.ts    # extractContent dispatch (Reddit / HN / web fallback)
├── queues/<queue>/                      # one folder per queue (kebab-case queue name)
│   ├── <queue>.worker.ts                # BullMQ Worker: wires processor + options
│   ├── <queue>.processor.ts             # the job LOGIC — the unit to test
│   └── <queue>.types.ts                 # typed job payload + result
└── repositories/
    ├── extract.repository.ts            # upsertCommunity, upsertDiscussion, upsertOpportunity
    └── scoring.repository.ts            # findNewByProduct, findProductProfile, saveScores
```

## Patterns

- **One queue per stage** (`discovery`, `extract`, `scoring`, `monitor`); chain stages by
  enqueuing the next on completion.
- **Processor holds the logic; worker file wires options** (connection, concurrency,
  retries/backoff, timeout). Test the processor in isolation with injected deps.
- **Validate the job payload** with Zod at the start of every processor.
- **Call `ai` for model work** and **persist via repositories** — processors never call
  vendor SDKs or hold Prisma queries inline.
- **Per-queue concurrency** tuned to external rate limits.
- **Errors:** transient → BullMQ retry with backoff; permanent → dead-letter queue +
  logged context. One bad job never crashes the process. (Sentry reporting for
  unexpected failures is deferred — not currently wired, see root `CLAUDE.md` §13.)

## Job design rules (non-negotiable)

1. **Idempotent** — safe to run twice. Use unique constraints + upserts.
   - Discussion: unique on `url`.
   - Opportunity: unique on `(productId, discussionId)`.
   - Scoring: `status="new"` check means re-running finds zero candidates.
   - Monitor: `lastCheckedAt` stamp prevents double-processing the same window.
2. **Minimal payloads** — pass IDs/small params; re-read from DB. No blobs in Redis.
3. **Typed payloads & results** — `*.types.ts` per queue; validate on entry.
4. **Bounded & observable** — timeout + retry policy; structured logs with job id (no
   PII/secrets).
5. **Respect platform limits** — honor Reddit, HN, and StackExchange rate limits and ToS;
   never circumvent anti-bot measures. All clients handle 429 gracefully (return `[]`).

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
- **New platform source:** implement `DiscoverySource`, add to `SOURCES` array in
  `discovery.processor.ts`, add the new `DiscussionSource` enum value in
  `packages/shared` and `prisma/schema.prisma`. Downstream stages (scoring, API, frontend)
  require no changes — they read from `Discussion`.
- **Date-filtered monitoring:** pass `{ since }` to `source.search()`. Sources that support
  epoch filters (HN, StackOverflow) use it precisely; Reddit maps to a time bucket; others
  ignore it (safe because deduplication prevents re-scoring seen URLs).
- **Scheduled work:** use BullMQ repeatable jobs; keep cadence conservative to respect
  platform rate limits.

## Commands

```bash
pnpm --filter @distribution-copilot/worker dev       # tsx watch; logs on start
pnpm --filter @distribution-copilot/worker build
pnpm --filter @distribution-copilot/worker type-check
```

Key env: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional), `DATABASE_URL`,
`STACK_EXCHANGE_KEY` (optional — free tier 300 req/day without it),
`MONITOR_INTERVAL_MINUTES` (optional — default 30).
AI provider keys are read by `packages/ai`.
