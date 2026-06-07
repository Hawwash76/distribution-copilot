# Worker Architecture (Background Jobs)

`apps/worker` runs all background processing on **BullMQ + Redis** (ADR-008): discovery
(scraping), scoring, risk assessment, and embedding. Anything slow, external-I/O-bound,
rate-limited, or high-volume runs here — never inside an HTTP request. This is the service
that makes "millions of posts" tractable.

Related: [`backend-architecture.md`](backend-architecture.md) (who enqueues),
[`ai-architecture.md`](ai-architecture.md) (the AI it calls), and
[`apps/worker/CLAUDE.md`](../../apps/worker/CLAUDE.md).

> **Status.** The worker is a **scaffold**: `main.ts` logs on start and references the
> Redis connection config without opening it; `src/queues/` is empty. No queues or
> processors exist yet. This document is the design for when they're added.

---

## 1. Responsibilities & boundaries

**The worker owns:** long-running and recurring background work — pulling conversations
from source connectors, generating embeddings, scoring, risk assessment, and any batch AI.

**It does not:** expose HTTP or render UI. It is triggered by
**enqueued jobs**, not requests. It depends on `database`, `shared`, `config`, and `ai` —
**not** `web` or `ui`.

**Communication model:**

```
apps/api  ──enqueue job (BullMQ)──►  Redis  ──►  apps/worker (processes job)
                                                      │ writes results via repository
                                                      ▼
                                              PostgreSQL  ◄── apps/api reads results (REST query)
```

The API and worker communicate **through the queue and the database**, never by importing
each other. Recurring work (e.g. scheduled discovery) uses BullMQ repeatable jobs.

---

## 2. Structure

One folder per queue under `src/queues/<queue>/`, plus shared config and an entrypoint
that registers all workers:

```
apps/worker/src/
├── main.ts                          # bootstrap: register & start all workers; graceful shutdown
├── config/
│   └── redis.ts                     # RedisOptions for BullMQ (maxRetriesPerRequest: null)
└── queues/
    ├── discovery/
    │   ├── discovery.worker.ts      # the BullMQ Worker (wires processor + options)
    │   ├── discovery.processor.ts   # the job logic — PURE-ish, testable in isolation
    │   └── discovery.types.ts       # typed job payload + result (from shared where shared)
    ├── scoring/
    ├── risk-analysis/
    └── embedding/
```

Conventions: queue name is `kebab-case` (`"discovery"`); the worker file wires options
(connection, concurrency, retries); the **processor holds the logic and is the unit of
test**. Keep payload/result types typed (reuse `shared` where the shape is a domain type).

### Current state

`config/redis.ts` exports `redisConnection: RedisOptions` (host/port from env,
`maxRetriesPerRequest: null` as BullMQ requires). `main.ts` references it and logs
`"[worker] started — no queues registered yet"`. The worker runs via `tsx` in dev and
compiled `node dist/main.js` in prod.

---

## 3. Queues (target)

| Queue           | Job                                                                           | Calls                             |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| `discovery`     | Pull conversations from a source connector, store as opportunities (deduped). | source connectors, `database`     |
| `embedding`     | Embed products/conversations; write vectors.                                  | `ai.embed`, `database`            |
| `scoring`       | Score opportunities for relevance + intent.                                   | `ai.scoreOpportunity`, `database` |
| `risk-analysis` | Assess community-engagement risk per opportunity.                             | `ai.assessRisk`, `database`       |

Jobs are chained by enqueuing the next stage on completion (discover → embed → score →
assess), or driven by opportunity `status` transitions (see
[`domain-model.md`](domain-model.md) §4). Keep each queue single-purpose.

---

## 4. Job design rules (the important ones)

1. **Idempotent.** A job must be safe to run twice — retries and at-least-once delivery
   are normal. Use unique constraints (e.g. `(source, externalId)` on opportunities) and
   upserts so reprocessing doesn't duplicate data.
2. **Minimal payloads.** Pass **IDs and small params**, not large blobs. The job re-reads
   what it needs from the database. Keeps Redis small and jobs cheap to serialize.
3. **Typed payloads & results.** Define `*.types.ts` per queue; validate the payload at
   the start of the processor (Zod) — enqueued data is still input.
4. **Bounded & observable.** Every job has a timeout and a retry policy with exponential
   backoff. Log start/finish with job id + context (no PII/secrets); report unexpected
   failures to Sentry.
5. **Respect external limits.** Set per-queue **concurrency** to honor platform and AI
   provider rate limits. Handle `429`/backoff explicitly. We are guests on these
   platforms (see [`product.md`](product.md)) — never circumvent rate limits or anti-bot
   measures.
6. **Fail safely.** Transient errors → retry with backoff. Permanent failures → a
   **dead-letter queue** + a logged, diagnosable record. One bad job must never crash the
   worker process.

---

## 5. Source connectors (the platform extension point)

Discovery talks to platforms through a **common source-connector interface** so adding a
platform is additive:

- Each connector (Reddit first; X, Hacker News later) implements the same shape: fetch
  recent/relevant items for a community, return normalized records mapped to the
  `Opportunity`/`Community` domain shape and the `OpportunitySource` enum.
- Scoring, risk, and reply logic depend on the **normalized domain shape**, not on any
  platform's API — so adding `x`/`hackernews` is a new connector + an enum member, ideally
  without touching downstream stages (scalability requirement).
- Connectors live with the worker (or a dedicated package if they grow); they **respect
  ToS, rate limits, and robots/anti-bot rules**. No circumvention — ever.

---

## 6. Scheduling & triggering

- **On-demand:** the API enqueues a job in response to a user action (e.g. "find
  opportunities for this product") and returns immediately; the user sees results when the
  job completes (poll/refetch).
- **Recurring:** BullMQ **repeatable jobs** drive periodic discovery/refresh. Keep
  schedules conservative to respect platform limits.
- **Pipelined:** a completed stage enqueues the next (discover → embed → score → assess),
  or a small scheduler advances opportunities by `status`.

---

## 7. The human-in-the-loop boundary

The worker **discovers, scores, assesses, and may pre-draft** — it does the leverage work.
It **never posts, votes, follows, or engages** on any platform. There is no queue, job, or
connector capability for outbound engagement, and none may be added (see
[`product.md`](product.md) §6). Drafts produced in the background are surfaced for human
review; publishing is always a manual human action off-platform.

---

## 8. Scaling (don't build it yet)

The MVP runs a **single worker process** against one Redis. The design scales without
re-architecting:

- **Horizontal scale:** run more worker processes — BullMQ distributes jobs across them.
- **Per-queue concurrency & rate limiting:** tune throughput vs. platform/provider limits.
- **Batching:** embed/score in batches to amortize AI calls and respect rate limits.
- **Prioritization & separate queues** for latency-sensitive vs. bulk work, when needed.

Until a metric demands it, keep it simple: one worker, idempotent jobs, sensible
concurrency, good logging. See [`roadmap.md`](roadmap.md).

---

## 9. Testing

- **Processors are the unit of test:** write them so the core logic is a pure-ish function
  of (payload, injected dependencies). Test with fakes for connectors/`ai`/repositories.
- **Integration-test** a worker against a test Redis + test Postgres for the
  enqueue→process→persist path.
- Mock external boundaries (platform APIs, AI providers) only; use real test
  infrastructure for queue/DB behavior.

---

## 10. Anti-patterns (do not do)

- Running discovery/scoring/embedding inside an HTTP request instead of a job.
- Large payloads in jobs (pass IDs; re-read from the DB).
- Non-idempotent jobs that duplicate data on retry.
- Importing `web`/`ui` into the worker, or importing the API.
- Swallowing job errors or letting one job crash the process.
- Ignoring platform rate limits or adding any auto-engagement capability.
