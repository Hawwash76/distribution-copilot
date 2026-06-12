# CLAUDE.md — `@distribution-copilot/ai`

The home for **all** AI in the product: capabilities, the provider abstraction, and
versioned prompts. Application code asks for a _capability_; this package decides the
provider. **No AI vendor SDK is imported anywhere else.**

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/ai-architecture.md`](../../docs/architecture/ai-architecture.md)
> first.

---

## Responsibilities

- Expose **capabilities** mapped to the core loop: `generateProductProfile`,
  `scoreOpportunity`, `assessRisk`, `generateReplyDraft`.
- Own the **provider abstraction** (vendor SDKs live only inside provider implementations).
- Own **prompt templates** (versioned, separate from logic) and output validation.
- Centralize AI cross-cutting concerns: timeouts, retries/backoff, rate limits, token/cost
  budgeting, usage logging.

## Capabilities (all implemented)

| Capability               | File                                       | Called by                                       | What it does                                                                                        |
| ------------------------ | ------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `generateProductProfile` | `capabilities/generate-product-profile.ts` | API (`products.service`)                        | Extracts painPoints, personas, keywords, competitors, useCases, valueProps from product description |
| `scoreOpportunity`       | `capabilities/score-opportunity.ts`        | Worker (`scoring.processor`)                    | Returns intentScore (0–100), relevanceScore (0–100), signalType, and rationales                     |
| `assessRisk`             | `capabilities/assess-risk.ts`              | Worker (`scoring.processor`)                    | Returns 4 risk dimensions (0–100 each), riskRationale                                               |
| `generateReplyDraft`     | `capabilities/generate-reply-draft.ts`     | Worker (`scoring.processor`) + API (regenerate) | Drafts a context-aware reply respecting riskWarnings and signalType                                 |

All capability functions share the signature pattern:

```ts
capability(inputs, provider: Provider): Promise<CapabilityResult>
// Result always includes: typed output fields + model: string
```

## Providers

| Provider           | File                           | Notes                                                       |
| ------------------ | ------------------------------ | ----------------------------------------------------------- |
| Anthropic (Claude) | `providers/create-provider.ts` | Production provider. Model configurable.                    |
| Mock               | `providers/mock.ts`            | Returns predictable deterministic output for tests and dev. |

`Provider` interface (`providers/provider.ts`) exposes `jsonCompletion(prompt, schema)`.
All capabilities accept a `Provider` parameter — never call the SDK directly in a capability.

## Boundaries

**Depends on:** `shared`, `config`.

**Must NOT:** import `database`, any app, or `ui`. It takes typed inputs and
returns typed outputs — **persistence is the caller's job.** It is framework-free.

## Folder conventions

```
src/
├── index.ts                      # public API: capability functions + provider factories + result types
├── capabilities/                 # one file per capability; each imports its prompt + provider interface
│   ├── generate-product-profile.ts
│   ├── score-opportunity.ts
│   ├── assess-risk.ts
│   └── generate-reply-draft.ts
├── providers/                    # Provider interface + concrete impls (SDKs live here ONLY)
│   ├── provider.ts               # Provider interface + JsonCompletion type
│   ├── create-provider.ts        # production Anthropic provider factory
│   └── mock.ts                   # deterministic mock for tests/dev
└── prompts/                      # versioned prompt templates, grouped by capability
    ├── scoring/index.ts
    └── reply-generation/index.ts
```

A capability function = build prompt (pure) → call `provider.jsonCompletion()` → **validate
output with Zod** → return a typed result (with `model` field).

## Patterns

- **Capability-oriented public surface.** Callers request a capability, never a vendor.
  Returns a typed result object — never raw provider output.
- **Provider interface** defines low-level ops (`jsonCompletion`); concrete providers
  implement it; selection is config-driven. Swapping or adding a provider is a change
  inside `providers/` only — callers are unaffected.
- **Prompts are pure functions** `(typed inputs) → prompt string`, stored under
  `prompts/<capability>/`, **separate from capability logic**.
- **Validate every model output with Zod** — never trust free-form text; handle parse
  failures explicitly (throw, don't silently return empty).
- **Treat untrusted content as a security boundary.** Scraped conversation text is hostile
  input — delimit/label it in prompts and guard against prompt injection; never let it
  override instructions.
- **Inject the provider** so capability/prompt logic is unit-testable without live calls;
  use `createMockProvider()` in tests.

## Anti-patterns

- A vendor SDK imported in `api`/`worker`/`web` (all AI flows through this package).
- Importing `database`/an app/`ui` here.
- Prompt text embedded in business logic instead of `prompts/` templates.
- Returning unvalidated model output.
- Interpolating raw scraped text into prompts without injection guards.
- **Any capability that posts/votes/follows/engages.** AI outputs are drafts and signals a
  human reviews — never autonomous actions (product §6).

## Implementation guidance

- **New capability:** add `capabilities/<name>.ts` exporting a typed function that accepts
  typed inputs + a `Provider`; add its prompt template under `prompts/<name>/`; define
  input/output Zod schemas in `shared` if they're domain types; export from `index.ts`.
  Don't overload an existing capability.
- **New provider:** implement the `Provider` interface in `providers/`; keep the vendor SDK
  import contained there; make it selectable via config. No caller changes.
- **Scaling:** batch embed/score jobs; cache embeddings keyed by content hash + model;
  enforce token/cost budgets here. Start with one provider per capability — the abstraction
  makes growth cheap.
- **Where it runs:** bulk AI in the worker; fast single-item user-triggered actions in the
  API (with a timeout). This package is callable from both.

## Commands

```bash
pnpm --filter @distribution-copilot/ai build         # tsc → dist/
pnpm --filter @distribution-copilot/ai type-check
```

Provider API keys are read from env here (never in callers); never log keys or prompt PII.
