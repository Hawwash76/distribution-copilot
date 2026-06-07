# CLAUDE.md — `@distribution-copilot/database`

A thin wrapper around the generated **Prisma** client. The single entry point to
PostgreSQL (+ pgvector) for the API and worker.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/database.md`](../../docs/architecture/database.md) first.

---

## Responsibilities

- Export a **singleton Prisma client** (`prisma`) reused in dev to avoid exhausting
  connections on hot reload.
- Re-export Prisma's generated types/enums so consumers import everything from one place.
- Be the **only** package that depends on `@prisma/client`.

## Boundaries

**Depends on:** `@prisma/client`.

**Must NOT:** import any app, `ai`, or `ui`. It exposes the client and types —
nothing else.

**The schema lives once at the repo root** (`prisma/schema.prisma`); this package points at
it (`prisma.schema` config). Do **not** create a second schema here.

## What's here

```
src/index.ts        # prisma singleton + `export * from "@prisma/client"`
(package.json)      # prisma.schema → ../../prisma/schema.prisma; build = prisma generate && tsc
```

```ts
// the established pattern
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export * from "@prisma/client";
```

## Patterns

- **Import the client by package name:** `import { prisma } from "@distribution-copilot/database"`.
- **Run `pnpm db:generate` after any schema change** and before building — the client must
  exist for type-check. The package's `build` runs `prisma generate && tsc`.
- **Repositories are the only callers.** This package provides access; it does not contain
  queries or business logic.

## The repository boundary (enforced by consumers, reinforced here)

This package gives raw Prisma access. The architecture requires that access be confined to
**repositories** in the API/worker, which **map Prisma rows to `shared` domain types**.
Consequences for anyone using this package:

- **Prisma types must not cross the API boundary** — map to domain types in the repository.
- All vector/raw SQL (parameterized `$queryRaw` only) lives in repositories, so a future
  move off pgvector is an implementation change.
- User-scoped queries always filter by `userId` in the repository.

## Anti-patterns

- Creating a second Prisma schema (there is exactly one, at `/prisma`).
- Importing this package (or Prisma types) into `web`/`ui`/`ai`.
- Writing queries or business logic in this package.
- Instantiating `new PrismaClient()` elsewhere (use the singleton).
- Leaking `@prisma/client` types across the API contract.
- Raw SQL by string concatenation (use parameterized `$queryRaw`, in a repository).

## Implementation guidance

- **Add a model:** edit `prisma/schema.prisma` (follow the conventions in `database.md` §3:
  PascalCase model, `@@map` snake_case plural, UUID PK, timestamps, `userId` + index for
  business models), add the matching `shared` Zod schema, run `pnpm db:generate`, then add
  repository methods in the consuming app.
- **Migrations:** use `pnpm db:migrate` for shared/prod DBs; `db:push` for throwaway local
  iteration only. Review generated SQL like code.
- **pgvector:** the extension is enabled; add `vector` columns + an ANN index (HNSW/IVFFlat)
  when embeddings ship; access them via parameterized raw SQL in a repository.

## Commands

```bash
pnpm db:generate                                     # generate the client (root script)
pnpm db:migrate                                      # create + apply a dev migration
pnpm db:studio                                       # inspect data
pnpm --filter @distribution-copilot/database build
```

Key env: `DATABASE_URL` (PostgreSQL + pgvector).
