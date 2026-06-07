# AI Architecture

All AI in Distribution Copilot is centralized in **`@distribution-copilot/ai`** behind a
**capability-oriented, provider-abstracted** interface (ADR-014). Application code asks
for a _capability_ — never a vendor. This document defines the capabilities, the provider
abstraction, prompt management, and the safety rules.

Related: [`product.md`](product.md) (the loop AI serves), [`worker-architecture.md`](worker-architecture.md)
(where bulk AI runs), and [`packages/ai/CLAUDE.md`](../../packages/ai/CLAUDE.md).

> **Status.** `packages/ai` is **structure only** today: prompt folders
> (`discovery/`, `scoring/`, `reply-generation/`, `risk-analysis/`) and an empty
> `index.ts`. No prompts, providers, or logic are implemented. This document is the
> agreed design for when they are.

---

## 1. Why an AI package (the core idea)

Model vendors, prices, and capabilities change monthly. If application code calls a vendor
SDK directly, every change ripples everywhere. Instead:

- **Application code (api, worker) calls a capability**: `embed(...)`, `scoreOpportunity(...)`,
  `assessRisk(...)`, `generateReplyDraft(...)`.
- **`packages/ai` decides which provider/model serves that capability**, owns the prompts,
  and handles retries, timeouts, rate limits, and cost controls.
- **Swapping or adding a provider is a change inside `ai`** — callers don't move.

`ai` depends only on `shared` and `config`. It must **not** import `database` or
any app — it takes inputs and returns typed outputs; persistence is the caller's job.

---

## 2. Capabilities (the public surface)

The package exposes a small set of capabilities mapped to the core loop. Each takes
typed, validated inputs (from `shared`) and returns a typed result with a `rationale` and
the `model` used (for transparency and auditability — see [`domain-model.md`](domain-model.md)).

| Capability           | Purpose                                                   | Loop step |
| -------------------- | --------------------------------------------------------- | --------- |
| `embed`              | Produce vector embeddings for products/conversations.     | Discover  |
| `scoreOpportunity`   | Score relevance + intent, with a rationale.               | Score     |
| `assessRisk`         | Assess community-engagement risk (level + factors + why). | Assess    |
| `generateReplyDraft` | Draft a context-aware, helpful, on-brand reply.           | Draft     |

Capabilities are the contract. Add a capability when a genuinely new AI task appears;
don't overload an existing one. Each returns a result object — never raw provider output.

---

## 3. Provider abstraction

```
api / worker
   │  calls a capability (embed / score / assess / draft)
   ▼
packages/ai  ── capability functions ──► Provider interface
                                            ├── (provider A: embeddings)
                                            ├── (provider B: chat/completions)
                                            └── … selectable per capability
```

- A **`Provider` interface** defines the low-level operations a capability needs
  (e.g. `complete(prompt, opts)`, `embed(texts)`).
- Concrete providers implement it. **Vendor SDKs are imported only inside their
  provider implementation**, never elsewhere.
- A capability function builds the prompt, calls the configured provider, validates the
  output (Zod), and returns a typed result. Provider selection is config-driven so we can
  route capabilities to different models.
- Cross-cutting concerns live here once: timeouts, bounded retries with backoff,
  rate-limit (`429`) handling, token/cost budgeting, and structured logging of
  usage (no PII).

This is the seam that makes "support multiple AI providers" (a scalability requirement)
a config + implementation change rather than an architecture change.

---

## 4. Prompt management

Prompts are **versioned templates**, stored separately from logic, grouped by capability:

```
packages/ai/prompts/
├── discovery/         finding relevant conversations
├── scoring/           ranking opportunities by relevance/intent
├── reply-generation/  drafting context-aware replies
└── risk-analysis/     flagging risky/off-brand replies
```

Rules:

- **Prompt content is separate from application logic** (the existing prompts README
  states this). A prompt builder is a **pure function**: `(typed inputs) → prompt
string/messages`. Pure functions are trivially unit-testable — test the builder, not the
  model.
- **Version prompts.** When a prompt changes meaningfully, version it; record which
  prompt/model produced a given Score/RiskAssessment/Reply so outputs are auditable and
  re-runnable.
- **Never interpolate untrusted content into prompts naively.** Scraped conversation text
  is hostile input — treat prompt construction as a security boundary (guard against
  prompt injection; clearly delimit and label external content; constrain what the model
  is asked to do).
- **Validate model output with Zod.** Don't trust free-form model text — parse it into the
  expected typed shape and handle parse failures explicitly.

---

## 5. Where AI runs

- **Bulk / background AI runs in the worker** (ADR-008): discovery embeddings, scoring,
  and risk assessment over many opportunities are BullMQ jobs — never inline in a request.
  This is required for the millions-of-posts scale.
- **Interactive AI may run in the API** only for fast, single-item, user-triggered actions
  (e.g. drafting one reply on demand) where a synchronous response is the right UX, always
  with a timeout. If it's slow or batched, enqueue it.
- Either way, the caller is responsible for **persisting** results through repositories
  (`ai` never touches the database).

See [`worker-architecture.md`](worker-architecture.md).

---

## 6. Safety & the human-in-the-loop contract

AI is generative leverage, never an autonomous actor. This is non-negotiable (see
[`product.md`](product.md) §6):

- **Every AI output is a draft or a signal a human reviews.** `generateReplyDraft`
  produces text the founder edits and posts manually. There is **no capability that
  posts, votes, follows, or engages.** Do not add one.
- **Surface the "why."** Scores and risk assessments carry rationales shown to the user;
  the product never presents a black-box verdict.
- **Risk assessment is a safety feature** — its job is to steer the human away from
  brand-damaging or ToS-violating engagement. Treat it as first-class, not optional.
- **Cost & abuse controls** (token budgets, rate limits, batch sizing) live in `ai` so
  one place governs spend and protects against runaway loops.
- **Determinism in tests:** inject the provider so capability/prompt logic is testable
  without live model calls; mock at the provider boundary only.

---

## 7. Scaling considerations

- **Multiple providers / models:** route capabilities to providers via config; add a new
  provider by implementing the interface. No caller changes (scalability requirement met
  by the abstraction).
- **Throughput:** batch embedding/scoring jobs; respect provider rate limits via
  worker concurrency + backoff; cache embeddings (don't re-embed unchanged content —
  keyed by content hash + model).
- **Model upgrades:** because outputs record their `model`/prompt version, we can
  re-score/re-embed selectively when upgrading, behind the repository.
- **Don't over-build the MVP:** start with one provider per capability and simple prompts.
  The abstraction's value is that growing into more is cheap — not that we build it all now.

---

## 8. Anti-patterns (do not do)

- Calling a vendor SDK from `api`, `worker`, or `web` directly (all AI goes through `ai`).
- Importing `database`/an app into `packages/ai`.
- Embedding prompt text inside business logic instead of the `prompts/` templates.
- Trusting raw model output without Zod validation.
- Interpolating untrusted scraped text into prompts without injection guards.
- Running bulk AI inside an HTTP request.
- Adding any capability that posts or engages on a platform automatically.
