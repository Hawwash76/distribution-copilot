# CLAUDE.md — `@distribution-copilot/shared`

Cross-cutting **Zod schemas, domain types, and pure utilities** shared by web, api, and
worker. This is the **single source of truth for the domain model's shape and validation.**

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/domain-model.md`](../../docs/architecture/domain-model.md) first.

---

## Responsibilities

- Define **domain schemas in Zod** and **infer the types** from them — one definition for
  validation _and_ types.
- Provide **transport-agnostic shared types** (e.g. `Paginated<T>`).
- Provide **pure utilities** with no I/O.
- Re-export a single, version-pinned `zod` instance so every consumer shares one.

## Boundaries

**Depends on:** `zod` only.

**Must NOT:** import any framework, any other workspace package, or anything with runtime
side effects / I/O. **Keep it a leaf** so literally anything can import it.

## Schema files (current)

| File                     | Exports                                                                                                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas/user.ts`        | `userSchema`, `User`, `userProfileSchema`, `UserProfile`, `updateUserSchema`                                                                                                                                                                                                                  |
| `schemas/product.ts`     | `productSchema`, `Product`, `createProductSchema`, `updateProductSchema`, `productProfileSchema`, `ProductProfile`, `generatedProductProfileSchema`, `GeneratedProductProfile`                                                                                                                |
| `schemas/opportunity.ts` | `opportunitySchema`, `Opportunity`, `opportunityStatusSchema`, `OpportunityStatus`, `signalTypeSchema`, `SignalType`, `riskLevelSchema`, `RiskLevel`, `riskWarningSchema`, `RiskWarning`, `markEngagedInputSchema`, `scoringAiResultSchema`, `riskAiResultSchema`, `replyDraftAiResultSchema` |
| `schemas/discussion.ts`  | `discussionSchema`, `Discussion`, `discussionSourceSchema`, `DiscussionSource`                                                                                                                                                                                                                |
| `schemas/community.ts`   | `communitySchema`, `Community`                                                                                                                                                                                                                                                                |
| `schemas/stats.ts`       | `dashboardStatsSchema`, `DashboardStats`, `productStatSchema`, `ProductStat`                                                                                                                                                                                                                  |
| `schemas/monitor.ts`     | `productMonitorSchema`, `ProductMonitor`, `monitorStatusSchema`, `MonitorStatus`                                                                                                                                                                                                              |
| `schemas/billing.ts`     | `subscriptionSchema`, `Subscription`, `subscriptionStatusSchema`, `SubscriptionStatus`, `billingStatusSchema`, `BillingStatus`                                                                                                                                                                |
| `schemas/pain-point.ts`  | `painPointSchema`, `PainPoint`, `painPointIntensitySchema`, `PainPointIntensity`, `aggregatedPainPointSchema`, `AggregatedPainPoint`                                                                                                                                                          |

## Folder conventions

```
src/
├── index.ts            # re-exports schemas, types, utils; re-exports z
├── schemas/            # one file per domain entity; <name>Schema + inferred type
│   ├── index.ts        # barrel
│   ├── user.ts
│   ├── product.ts
│   ├── opportunity.ts
│   ├── discussion.ts
│   ├── community.ts
│   ├── stats.ts
│   ├── monitor.ts
│   ├── billing.ts
│   └── pain-point.ts
├── types/              # inferred-type re-exports + non-schema shared types (Paginated<T>)
└── utils/              # pure, dependency-free helpers
```

## Patterns

- **Schema first, type inferred:** `export const fooSchema = z.object({…}); export type Foo
= z.infer<typeof fooSchema>;` — never hand-write a type that duplicates a schema.
- **Enums as Zod enums:** `export const xSchema = z.enum([...]); export type X = z.infer<…>`.
- **IDs are `z.string()`; dates are `z.coerce.date()`** — match existing schemas.
- **One file per entity** under `schemas/`, barrelled through `schemas/index.ts`.
- **Re-export `z` from the package** so consumers import the pinned instance.
- **Utilities are pure** — no fetch, no fs, no Date.now/Math.random.

## Anti-patterns

- Importing a framework or another workspace package (breaks the leaf invariant).
- Hand-written types that duplicate a Zod schema (infer instead).
- Side effects, I/O, or environment access at import time.
- Declaring a domain shape here _and_ again in the API/UI — declare once, here.

## Implementation guidance

- **New domain entity:** add `schemas/<entity>.ts` (`<entity>Schema` + inferred type),
  export via `schemas/index.ts`, keep it in sync with the Prisma model in `/prisma`.
  Schema and DB model change together.
- **Shared lifecycle/status enum:** add it here as a Zod enum so both DB and UI share
  one source.
- **Reusable shape across services** (e.g. pagination): add to `types/`; if it needs
  runtime validation, make it a schema in `schemas/`.

## Commands

```bash
pnpm --filter @distribution-copilot/shared build     # tsc → dist/
pnpm --filter @distribution-copilot/shared type-check
```
