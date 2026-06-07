# Database Architecture

How Distribution Copilot stores and accesses data. The stack is **PostgreSQL + pgvector**
via **Prisma** (ADR-003/004/005). This document covers the schema location, conventions,
the repository boundary, migrations, and the scaling path.

Related: [`domain-model.md`](domain-model.md) (the entities), the data-layer rules in
[`CLAUDE.md`](../../CLAUDE.md), and [`packages/database/CLAUDE.md`](../../packages/database/CLAUDE.md).

---

## 1. Topology

```
apps/api      ─┐
apps/worker   ─┤── import @distribution-copilot/database (Prisma client singleton)
               │        │
               │        ▼
               │   prisma/schema.prisma  ──generates──►  @prisma/client
               │
               ▼
        PostgreSQL 16+  ( + pgvector extension )
```

- **One database**, accessed only via `@distribution-copilot/database`.
- **The web app never touches the database** — it goes through the API over tRPC.
- The Prisma client is a **singleton**, reused in development to avoid exhausting
  connections on hot reload (`packages/database/src/index.ts`).

---

## 2. Schema location & ownership

The schema is the **single source of database truth**, living once at the repo root:

```
prisma/
└── schema.prisma     # the only schema; generator + datasource + all models
```

`packages/database` points at it via its `prisma.schema` config and re-exports the
generated client and types. **Do not create a second schema.** Run `pnpm db:generate`
after any schema change (and before building — the client must exist to type-check).

### Current schema (placeholder)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]   // required to manage pgvector via Prisma
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]                        // pgvector enabled; no vector columns yet
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("users")
}

model Product {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("products")
}
```

Only `User` and `Product` exist today. Feature models (`Community`, `Opportunity`,
`Score`, `RiskAssessment`, `Reply`) are added as those systems are built — see
[`domain-model.md`](domain-model.md) for their target shape.

---

## 3. Schema conventions

Follow the patterns already in the schema — consistency matters more than preference.

| Convention           | Rule                                                                  | Example                  |
| -------------------- | --------------------------------------------------------------------- | ------------------------ |
| Model name           | `PascalCase`, **singular**                                            | `model Opportunity`      |
| Table name           | `snake_case`, **plural**, via `@@map`                                 | `@@map("opportunities")` |
| Primary key          | UUID: `String @id @default(uuid()) @db.Uuid`                          | every model              |
| Timestamps           | `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` | every mutable model      |
| Field names          | `camelCase` (Prisma maps to columns; use `@map` if a column differs)  | `createdAt`, `userId`    |
| Foreign keys         | `<relation>Id` + a relation field                                     | `userId String @db.Uuid` |
| Nullability          | explicit `?`; default to NOT NULL unless genuinely optional           | `name String?`           |
| Enums                | mirror the Zod enum in `shared`; Prisma `enum` or `String` + Zod      | `OpportunitySource`      |
| Semi-structured data | `Json` (`@db.JsonB`) for flexible metadata, not a bag for everything  | `metadata Json`          |
| User scoping         | every business model carries `userId` and indexes it                  | `@@index([userId])`      |

**Indexing:** add an `@@index` for every column you filter or sort by in a hot path
(`userId`, `status`, `createdAt`, source ids). Add unique constraints to prevent
duplicate ingestion (e.g. `@@unique([source, externalId])` on `Opportunity`). Index
deliberately — don't guess; add indexes for the queries repositories actually run.

---

## 4. The repository boundary (critical)

**All database access goes through a repository.** No Prisma calls in controllers, tRPC
procedures, services-doing-other-things, the web app, or ad hoc scripts.

```
tRPC procedure / worker processor
        │  (validated input, domain types)
        ▼
     Service            business logic, orchestration, authorization
        │
        ▼
   Repository           the ONLY place that imports prisma & builds queries
        │
        ▼
  @distribution-copilot/database  →  PostgreSQL
```

Why this boundary is strict:

- **Prisma types must not leak across the tRPC boundary.** Repositories map Prisma rows
  to Zod-derived domain types from `shared`. The API contract speaks domain types, not
  `@prisma/client` shapes (see [`CLAUDE.md`](../../CLAUDE.md) §4).
- **It localizes scaling work.** When pgvector needs raw SQL, or a query needs
  partitioning/caching, or we move vectors to a dedicated store, only the repository
  changes — callers don't.
- **It enforces authorization.** Every user-scoped query filters by the authenticated
  `userId` _in the repository_, so it can't be forgotten in a controller.

A repository method is small, named for intent, and returns domain types:

```ts
// opportunity.repository.ts (illustrative)
async function listForUser(userId: string, page: PageParams): Promise<Paginated<Opportunity>> {
  const [rows, total] = await Promise.all([
    prisma.opportunity.findMany({ where: { userId }, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.opportunity.count({ where: { userId } }),
  ]);
  return { items: rows.map(toOpportunity), total, page: page.page, pageSize: page.pageSize };
}
```

---

## 5. pgvector & semantic search

pgvector is enabled in the schema today; **no `vector` columns exist yet**. When
embeddings ship:

- Add a `vector` column to the embedded entity (e.g. `Opportunity.embedding`,
  `Product.embedding`) with the embedding model's dimensionality.
- Add an **approximate-nearest-neighbour index** (HNSW or IVFFlat) sized for the expected
  volume.
- Some vector operations aren't expressible in Prisma's query API — use Prisma's
  parameterized `$queryRaw` **inside the repository only**. Never build vector SQL by
  string concatenation; always parameterize.
- Embeddings are produced by **worker jobs** via `packages/ai` (provider-abstracted), not
  inline in requests. The embedding `model`/dimension is recorded so we can re-embed on a
  model change.

Keep all of this behind the repository so a future move to a dedicated vector store is an
implementation change. See [`ai-architecture.md`](ai-architecture.md) and ADR-005.

---

## 6. Migrations

| Command            | Use                                                                          |
| ------------------ | ---------------------------------------------------------------------------- |
| `pnpm db:generate` | Regenerate the Prisma client after editing the schema (always).              |
| `pnpm db:migrate`  | Create + apply a dev migration (records history under `prisma/migrations/`). |
| `pnpm db:push`     | Push schema with no migration history — **early prototyping only.**          |
| `pnpm db:studio`   | Open Prisma Studio to inspect data.                                          |

Rules:

- **Use migrations (`db:migrate`), not `db:push`, for anything that reaches a shared or
  production database.** `db:push` is for throwaway local iteration only.
- **Migrations are forward-only and reviewed.** Treat a generated migration as code:
  read the SQL, check it's safe (no accidental data loss), commit it with the schema
  change.
- **Plan destructive changes.** Renames/drops can lose data — stage them (add new,
  backfill, switch, remove) rather than dropping in place.
- Keep migrations in lockstep with the Zod schema changes in `shared` and the relevant
  repository updates, in the same change.

---

## 7. Data integrity & safety

- **UUID primary keys** everywhere (non-enumerable, safe to expose).
- **Foreign keys with explicit `onDelete`** behavior — decide cascade vs. restrict per
  relation; default to restrict unless cascade is clearly correct.
- **Unique constraints prevent duplicate ingestion** (e.g. one opportunity per
  `(source, externalId)`), which also makes discovery jobs idempotent.
- **Timestamps on every mutable row** for auditability and time-based queries.
- **Never store secrets in plain columns.** Third-party platform tokens are encrypted at
  rest.
- **Treat scraped content as untrusted** when it lands in the DB and when it's read back
  out (sanitize before render; never interpolate raw into prompts without guardrails).
- **No PII in logs** when logging queries or errors.

---

## 8. Scaling path (don't build it yet)

The MVP runs a **single Postgres instance**. The boundaries above mean we can scale
without re-architecting. The likely order, applied only when measured (see
[`roadmap.md`](roadmap.md)):

1. **Indexing & query tuning** — the first and biggest lever; add indexes for the actual
   hot queries, paginate everything.
2. **Connection pooling** (PgBouncer) when concurrent connections from api + workers grow.
3. **Read replicas** for heavy read/analytics paths.
4. **Partitioning** the high-volume tables (opportunities, raw posts) by time or source
   once they reach millions of rows.
5. **Archival/tiering** of cold raw content out of the hot path.
6. **Dedicated vector store** only if pgvector becomes the bottleneck — swapped behind the
   repository.

Until a metric demands one of these, **keep it simple**: one database, good indexes,
everything through repositories.
