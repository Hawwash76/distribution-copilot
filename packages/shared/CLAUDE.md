# CLAUDE.md — `@distribution-copilot/shared`

Cross-cutting **Zod schemas, domain types, and pure utilities** shared by web, api, and
worker. This is the **single source of truth for the domain model's shape and validation.**

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/domain-model.md`](../../docs/architecture/domain-model.md) first.

---

## Responsibilities

- Define **domain schemas in Zod** (user, product, opportunity, …) and **infer the types**
  from them — one definition for validation _and_ types.
- Provide **transport-agnostic shared types** (e.g. `Paginated<T>`).
- Provide **pure utilities** with no I/O (`isDefined`, `assertNever`, …).
- Re-export a single, version-pinned `zod` instance so every consumer shares one.

## Boundaries

**Depends on:** `zod` only.

**Must NOT:** import any framework, any other workspace package, or anything with runtime
side effects / I/O. **Keep it a leaf** so literally anything can import it. This is what
lets web, api, and worker all share one definition without coupling.

## Folder conventions

```
src/
├── index.ts            # re-exports schemas, types, utils; re-exports z
├── schemas/            # one file per domain entity; <name>Schema + inferred type
│   ├── index.ts        # barrel
│   ├── user.ts         # userSchema → User
│   ├── product.ts      # productSchema → Product
│   └── opportunity.ts  # opportunitySchema, opportunitySourceSchema → Opportunity, OpportunitySource
├── types/              # inferred-type re-exports + non-schema shared types (Paginated<T>)
└── utils/              # pure, dependency-free helpers
```

## Patterns

- **Schema first, type inferred:** `export const fooSchema = z.object({…}); export type Foo
= z.infer<typeof fooSchema>;` — never hand-write a type that duplicates a schema.
- **Enums as Zod enums:** `export const xSchema = z.enum([...]); export type X = z.infer<…>`
  (see `opportunitySourceSchema`). Use these for lifecycle/status enums too.
- **IDs are `z.string().uuid()`; dates are `z.coerce.date()`** — match existing schemas.
- **One file per entity** under `schemas/`, barrelled through `schemas/index.ts`.
- **Re-export `z` from the package** so consumers import the pinned instance, not their own.
- **Utilities are pure** — no fetch, no fs, no Date.now/Math.random in logic that needs to
  be testable; pass those in.

## Anti-patterns

- Importing a framework or another workspace package (breaks the leaf invariant).
- Hand-written types that duplicate a Zod schema (infer instead).
- Side effects, I/O, or environment access at import time.
- A generic `utils` dumping ground — name helpers by what they do; if it's domain logic,
  it probably belongs nearer the feature.
- Declaring a domain shape here _and_ again in the API/UI — declare once, here.

## Implementation guidance

- **New domain entity:** add `schemas/<entity>.ts` (`<entity>Schema` + inferred type),
  export via `schemas/index.ts`, and keep it in agreement with the Prisma model in
  `/prisma` (see `domain-model.md` / `database.md`). These two change together.
- **Shared lifecycle/status enum:** add it here as a Zod enum so both DB and UI use one
  source.
- **Reusable shape across services** (e.g. a new pagination/result wrapper): add it to
  `types/`. If it needs runtime validation, make it a schema in `schemas/`.
- Consumers: tRPC procedures validate inputs with these schemas; the web app validates
  forms with the same ones; repositories map Prisma rows _to_ these types.

## Commands

```bash
pnpm --filter @distribution-copilot/shared build     # tsc → dist/
pnpm --filter @distribution-copilot/shared type-check
```
