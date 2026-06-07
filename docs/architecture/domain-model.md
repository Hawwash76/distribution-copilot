# Domain Model — Distribution Copilot

This is the **shared vocabulary** of the product. Every entity name here should be used
verbatim in code, Zod schemas, Prisma models, controller routes, and UI copy. A consistent
ubiquitous language is what keeps a growing codebase legible.

> **Status.** Today only `User` and `Product` exist in `prisma/schema.prisma` and as Zod
> schemas in `packages/shared`. The rest of this document is the **target model** — the
> shape the system grows into. Each entity below notes whether it exists yet. When you
> implement one, add its Prisma model and its Zod schema together, and update the
> "Status" notes here.

See [`product.md`](product.md) for the loop these entities serve, and
[`database.md`](database.md) for the persistence details.

---

## 1. Where the model lives (single source of truth)

| Concern                   | Source of truth                                                               |
| ------------------------- | ----------------------------------------------------------------------------- |
| Persistent shape (tables) | `prisma/schema.prisma`                                                        |
| Domain types & validation | Zod schemas in `packages/shared/src/schemas/*`                                |
| Application/runtime types | `z.infer<typeof xSchema>` re-exported from `shared`                           |
| API contract              | NestJS controllers in `apps/api` (use the Zod schemas from `packages/shared`) |

**Rule:** a domain type is declared once, as a Zod schema in `shared`, and inferred
everywhere else. Prisma model shape and Zod schema must be kept in agreement, but Prisma
types **do not cross the API boundary** — repositories map Prisma rows to domain types.
See [`CLAUDE.md`](../../CLAUDE.md) §4 and §6.

---

## 2. Entity overview

```
User ──owns──► Product ──targets──► Community
  │                │                    │
  │                └───────┐            │
  ▼                        ▼            ▼
(account)            Opportunity ◄──belongs to── Community
                         │
        ┌────────────────┼───────────────┐
        ▼                ▼                ▼
      Score        RiskAssessment       Reply (draft)
                                           │
                                           ▼
                                     (human posts manually — tracked, never automated)
```

---

## 3. Entities

### User — _exists_

A platform account. Owned by Better Auth (see [`api-design.md`](api-design.md)). Today
minimal; extend with plan/role/settings as auth matures.

| Field       | Type             | Notes  |
| ----------- | ---------------- | ------ |
| `id`        | `string` (uuid)  | PK     |
| `email`     | `string` (email) | unique |
| `name`      | `string \| null` |        |
| `createdAt` | `Date`           |        |
| `updatedAt` | `Date`           |        |

Schema: `packages/shared/src/schemas/user.ts`. Every other entity that is user-scoped
carries a `userId` and is **always queried scoped to the authenticated user**.

### Product — _exists_

The thing the founder is distributing. Provides the context for matching and reply
generation (what it is, who it's for, how it helps).

| Field         | Type             | Notes                                      |
| ------------- | ---------------- | ------------------------------------------ |
| `id`          | `string` (uuid)  | PK                                         |
| `name`        | `string`         |                                            |
| `description` | `string \| null` | used as AI context; grows richer over time |
| `createdAt`   | `Date`           |                                            |
| `updatedAt`   | `Date`           |                                            |

Schema: `packages/shared/src/schemas/product.ts`. _Target additions:_ `userId` (owner),
plus positioning fields (audience, value props, keywords) that feed discovery and
drafting.

### Opportunity — _schema exists, model pending_

A discovered online conversation (a Reddit thread, an X post, an HN item) that may be
worth replying to. This is the central object of the product.

| Field       | Type                | Notes                                |
| ----------- | ------------------- | ------------------------------------ |
| `id`        | `string` (uuid)     | PK                                   |
| `source`    | `OpportunitySource` | `reddit \| x \| hackernews \| other` |
| `url`       | `string` (url)      | canonical link to the conversation   |
| `title`     | `string \| null`    |                                      |
| `createdAt` | `Date`              | when we discovered it                |

Schema: `packages/shared/src/schemas/opportunity.ts`. _Target additions:_ `userId`,
`productId`, `communityId`, source-native ids/permalinks, author handle, body/excerpt,
`status` (lifecycle — see §4), the embedding vector, and timestamps for source-created
vs. discovered. Relations to `Score`, `RiskAssessment`, and `Reply`.

### OpportunitySource — _exists (enum)_

The platform an opportunity came from: `reddit | x | hackernews | other`. This enum is
the **extension point for new platforms** — adding one is a connector + an enum member,
ideally without touching scoring/risk/reply logic. See
[`worker-architecture.md`](worker-architecture.md).

### Community — _target_

A place where conversations happen and where the founder might engage: a subreddit, an X
topic/list, an HN section. Communities carry the **rules and culture** that drive risk
assessment.

| Field        | Type                | Notes                                          |
| ------------ | ------------------- | ---------------------------------------------- |
| `id`         | `string` (uuid)     | PK                                             |
| `source`     | `OpportunitySource` | which platform                                 |
| `externalId` | `string`            | e.g. subreddit name; unique per source         |
| `name`       | `string`            | human label                                    |
| `rules`      | `string \| null`    | scraped/declared rules used in risk assessment |
| `metadata`   | `json`              | members, activity, promo-tolerance signals     |

A `Product` _targets_ communities; an `Opportunity` _belongs to_ a community.

### Score — _target_

The result of scoring an opportunity for relevance and intent. Separated from
`Opportunity` so scoring can be re-run, versioned, and explained without mutating the
source record.

| Field           | Type            | Notes                                           |
| --------------- | --------------- | ----------------------------------------------- |
| `id`            | `string` (uuid) | PK                                              |
| `opportunityId` | `string`        | FK                                              |
| `relevance`     | `number` 0–1    | how related to the product/space                |
| `intent`        | `number` 0–1    | how high the help/purchase intent is            |
| `overall`       | `number` 0–1    | composite used for ranking                      |
| `rationale`     | `string`        | human-readable "why" (transparency principle)   |
| `model`         | `string`        | which AI model/version produced it (versioning) |
| `createdAt`     | `Date`          |                                                 |

### RiskAssessment — _target_

The community-engagement risk of replying to an opportunity. A first-class output
(brand-safety principle), not a flag tucked into the score.

| Field           | Type                    | Notes                                 |
| --------------- | ----------------------- | ------------------------------------- |
| `id`            | `string` (uuid)         | PK                                    |
| `opportunityId` | `string`                | FK                                    |
| `level`         | `low \| medium \| high` | headline risk band                    |
| `factors`       | `json`                  | rule conflicts, promo-tolerance, tone |
| `rationale`     | `string`                | why this level (shown to the user)    |
| `model`         | `string`                | model/version                         |
| `createdAt`     | `Date`                  |                                       |

### Reply — _target_

An AI-generated **draft** reply for an opportunity, which the human edits and then posts
manually. The model tracks drafts and the human's edits/decisions — it never tracks
automated posting, because there is none.

| Field           | Type             | Notes                         |
| --------------- | ---------------- | ----------------------------- |
| `id`            | `string` (uuid)  | PK                            |
| `opportunityId` | `string`         | FK                            |
| `userId`        | `string`         | owner                         |
| `draft`         | `string`         | AI-generated text             |
| `editedText`    | `string \| null` | the human's edited version    |
| `status`        | `ReplyStatus`    | see §4                        |
| `model`         | `string`         | model/version that drafted it |
| `createdAt`     | `Date`           |                               |
| `updatedAt`     | `Date`           |                               |

**`status` values capture human action, not automation:** e.g. `draft → reviewed →
edited → marked_posted | dismissed`. `marked_posted` means _the user told us they posted
it_ — the system never posts. There is intentionally no "scheduled" or "auto-post"
status.

---

## 4. Lifecycles

**Opportunity status** (target): `discovered → scored → assessed → drafted → reviewed →
(actioned | dismissed | snoozed)`. Status advances as worker jobs complete and as the
human reviews. Keep it an explicit enum so the UI can filter and the worker can pick up
the next stage.

**Reply status** (target): `draft → reviewed → edited → marked_posted | dismissed`. The
human owns every transition past `draft`.

Model lifecycle states as **Zod enums in `shared`** (like `opportunitySourceSchema`) so
they are the single source for both DB and UI.

---

## 5. Relationships (target)

- `User` 1—N `Product`
- `User` 1—N `Opportunity` (everything is user-scoped)
- `Product` N—N `Community` (a product targets communities)
- `Community` 1—N `Opportunity`
- `Opportunity` 1—1 (latest) `Score`, 1—N historical scores
- `Opportunity` 1—1 (latest) `RiskAssessment`, 1—N historical
- `Opportunity` 1—N `Reply` (a founder may draft more than one)

Keep historical `Score`/`RiskAssessment` rows rather than overwriting — it preserves the
"why" and supports model-version comparison. Expose the latest via a query, not by
deleting old rows.

---

## 6. Modelling rules

1. **Declare each entity as a Zod schema in `shared` first**, infer the type, then add
   the matching Prisma model. Keep the two in agreement.
2. **All IDs are UUIDs** (`@db.Uuid`, `z.string().uuid()`), matching existing models.
3. **All business records are user-scoped.** Carry `userId` and always filter by it in
   repositories.
4. **Separate derived data (Score, RiskAssessment) from source data (Opportunity).**
   Derived data is re-runnable and versioned; never mutate source records to store it.
5. **Persist the "why."** Scores and risk assessments carry a `rationale` (transparency
   principle). Persist the `model` that produced AI outputs for auditability and
   migration.
6. **Lifecycle is an explicit enum**, defined once in `shared`.
7. **Never model auto-posting/auto-engagement.** There is no schema for it because the
   product does not do it (see [`product.md`](product.md) §6).

---

## 7. Glossary

| Term              | Meaning                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| Opportunity       | A discovered conversation that may be worth a reply.                          |
| Source            | The platform an opportunity comes from (`reddit`, `x`, `hackernews`, …).      |
| Community         | A subreddit/topic/section with its own rules and culture.                     |
| Score             | Relevance + intent ranking of an opportunity.                                 |
| Relevance         | How related the conversation is to the founder's product/space (0–1).         |
| Intent            | How strong the help/purchase signal is in the conversation (0–1).             |
| Risk assessment   | The engagement risk of replying in this community/thread.                     |
| Reply             | An AI **draft** reply the human edits and posts manually.                     |
| Discovery         | The background process of pulling and storing opportunities from sources.     |
| Human-in-the-loop | The invariant that a person reviews and publishes everything (no automation). |
