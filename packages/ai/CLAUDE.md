# CLAUDE.md — `@distribution-copilot/ai`

The home for **all** AI in the product: capabilities, the provider abstraction, and
versioned prompts. Application code asks for a _capability_; this package decides the
provider. **No AI vendor SDK is imported anywhere else.**

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/ai-architecture.md`](../../docs/architecture/ai-architecture.md)
> first.

> **Status:** structure only. Prompt folders exist (`discovery/`, `scoring/`,
> `reply-generation/`, `risk-analysis/`); `src/index.ts` is empty. No providers, prompts,
> or logic yet.

---

## Responsibilities

- Expose **capabilities** mapped to the loop: `embed`, `scoreOpportunity`, `assessRisk`,
  `generateReplyDraft`.
- Own the **provider abstraction** (vendor SDKs live only inside provider implementations).
- Own **prompt templates** (versioned, separate from logic) and output validation.
- Centralize AI cross-cutting concerns: timeouts, retries/backoff, rate limits, token/cost
  budgeting, usage logging.

## Boundaries

**Depends on:** `shared`, `config`.

**Must NOT:** import `database`, `trpc`, any app, or `ui`. It takes typed inputs and
returns typed outputs — **persistence is the caller's job.** It is framework-free.

## Folder conventions

```
src/
├── index.ts                      # public API: the capability functions + result types
├── capabilities/                 # one file per capability (embed, scoring, risk, reply)
├── providers/                    # Provider interface + concrete impls (SDKs live here ONLY)
└── prompts/  (top-level today)   # versioned prompt templates, grouped by capability
prompts/
├── discovery/        reply-generation/
├── scoring/          risk-analysis/
```

A capability function = build prompt (pure) → call configured provider → **validate output
with Zod** → return a typed result (with `rationale` + `model`).

## Patterns

- **Capability-oriented public surface.** Callers request a capability, never a vendor.
  Returns a typed result object — never raw provider output.
- **Provider interface** defines low-level ops (`complete`, `embed`); concrete providers
  implement it; selection is config-driven (route capabilities to models).
- **Prompts are pure functions** `(typed inputs) → prompt`, stored as templates under
  `prompts/<capability>/`, **separate from logic**, and **versioned**. Record which
  prompt/model produced an output.
- **Validate every model output with Zod** — never trust free-form text; handle parse
  failures explicitly.
- **Treat untrusted content as a security boundary.** Scraped conversation text is hostile
  input — delimit/label it and guard against prompt injection; never let it dictate the
  instruction.
- **Inject the provider** so capability/prompt logic is unit-testable without live calls;
  mock at the provider boundary only.

## Anti-patterns

- A vendor SDK imported in `api`/`worker`/`web` (all AI flows through this package).
- Importing `database`/`trpc`/an app/`ui` here.
- Prompt text embedded in business logic instead of `prompts/` templates.
- Returning unvalidated model output.
- Interpolating raw scraped text into prompts without injection guards.
- **Any capability that posts/votes/follows/engages.** AI outputs are drafts and signals a
  human reviews — never autonomous actions (product §6).

## Implementation guidance

- **New capability:** add `capabilities/<name>.ts` exporting a typed function; add its
  prompt template(s) under `prompts/<name>/`; define input/output Zod schemas (in `shared`
  if they're domain types); export from `index.ts`. Don't overload an existing capability.
- **New provider:** implement the `Provider` interface in `providers/`; keep the vendor SDK
  import contained there; make it selectable via config. No caller changes.
- **Scaling:** batch embed/score jobs; cache embeddings keyed by content hash + model;
  enforce token/cost budgets here. Start with one provider per capability — the abstraction
  makes growth cheap; don't pre-build multi-provider routing.
- **Where it runs:** bulk AI in the worker; only fast single-item actions in the API (with
  a timeout). This package is callable from both.

## Commands

```bash
pnpm --filter @distribution-copilot/ai build         # tsc → dist/
pnpm --filter @distribution-copilot/ai type-check
```

Provider API keys are read from env here (never in callers); never log keys or prompt PII.
