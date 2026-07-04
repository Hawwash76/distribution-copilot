# API Design

Distribution Copilot's API is a **REST API** (ADR-006) built with NestJS controllers and
validated with Zod. The request/response shapes are defined as Zod schemas in
`@distribution-copilot/shared`, so the same definitions are reused by the API (to validate)
and the web app (to parse). This document covers the contract shape, route conventions,
validation, auth/authorization, errors, and pagination.

Related: [`backend-architecture.md`](backend-architecture.md) (how the API is built) and
[`frontend-architecture.md`](frontend-architecture.md) (how the client consumes it).

---

## 1. Contract topology

```
@distribution-copilot/shared        apps/api (host)              apps/web (client)
┌──────────────────────────┐       ┌─────────────────────┐ HTTP ┌───────────────────────┐
│ Zod request/response     │ ◄──── │ feature controllers │ ◄──► │ api-client (apiFetch)  │
│ schemas + domain types   │ ────► │ /<resource> routes  │ JSON │ + TanStack Query       │
│ Paginated<T>, enums      │       │ validate + delegate │      │ parse w/ shared schema │
└──────────────────────────┘       └─────────────────────┘      └───────────────────────┘
        ▲ both sides import the same schemas from shared (single source of truth)
```

- The **request/response contract lives in `packages/shared`** as Zod schemas —
  framework-free, importable by both the API and the web app.
- The **NestJS API is the only host.** Controllers expose REST routes, validate input
  against the shared schemas, delegate to services, and return domain types.
- The **web app has no runtime coupling to the backend.** It calls routes over HTTP/JSON
  via `apps/web/src/lib/api-client.ts` and validates responses with the same shared
  schemas.

> **Status.** Only `GET /health` exists today (returns `{ status: "ok" }`). The patterns
> below are the agreed conventions for when feature endpoints are added.

---

## 2. Resource & route structure

One **controller per domain feature**, defined inside the owning API module
(`apps/api/src/modules/<feature>/<feature>.controller.ts`). Routes are grouped under a
resource base path.

```ts
// opportunity.controller.ts (target shape)
@UseGuards(AuthGuard)
@Controller("opportunities")
export class OpportunityController {
  constructor(private readonly opportunities: OpportunityService) {}

  @Get() // GET /opportunities
  list(/* … */) {}

  @Post(":id/dismiss") // POST /opportunities/:id/dismiss
  dismiss(/* … */) {}
}
```

Resource paths are **plural nouns** (`/opportunities`, `/replies`); model URLs around
resources and reserve sub-paths for actions that aren't plain CRUD
(`POST /opportunities/:id/dismiss`). Keep the surface shallow — group by feature, not by
verb soup.

---

## 3. Route conventions

- **HTTP verbs carry intent:** `GET` reads, `POST` creates/actions, `PATCH` updates,
  `DELETE` removes. Never mutate on a `GET`.
- **Name non-CRUD actions by intent:** `POST /opportunities/:id/dismiss`,
  `POST /replies/:id/generate-draft`, `POST /opportunities/:id/mark-posted`.
- **Every route validates input with a Zod schema** from `shared` (body, params, query)
  via a validation pipe. No unvalidated input.
- **Return domain types** (`z.infer` from `shared`) — never Prisma rows.
- **Controllers stay thin:** validate → call one service method → return. No business
  logic, no Prisma calls in the controller (see
  [`backend-architecture.md`](backend-architecture.md)).

```ts
// opportunity.controller.ts (illustrative)
@UseGuards(AuthGuard)
@Controller("opportunities")
export class OpportunityController {
  constructor(private readonly opportunities: OpportunityService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listOpportunitiesInput)) query: ListOpportunitiesInput,
  ): Promise<Paginated<Opportunity>> {
    return this.opportunities.list(user.id, query);
  }

  @Post(":id/dismiss")
  dismiss(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Opportunity> {
    return this.opportunities.dismiss(user.id, id);
  }
}
```

---

## 4. Validation

- **Input validation is mandatory and happens at the controller boundary** via Zod
  (ADR-012), using a validation pipe. This is the trust boundary — never assume the client
  sent valid data.
- **Reuse shared schemas.** Compose route inputs from `@distribution-copilot/shared`
  schemas rather than redeclaring shapes. One definition, inferred everywhere.
- **Validate, then narrow.** After the pipe parses the input, it is fully typed; downstream
  code relies on that.
- Treat **all** external input as hostile: client payloads, and especially scraped content
  that flows through the API.

---

## 5. Authentication & authorization

**Authentication** is **Better Auth** (ADR-007), configured in the API
(`apps/api/src/config/auth.ts`) with the Prisma adapter. Its handler is mounted in the API;
an **auth guard resolves the authenticated session** from the request and attaches the
user.

```ts
// resolved by the auth guard, exposed to handlers via a @CurrentUser() decorator
export interface AuthenticatedUser {
  id: string;
  // …other non-sensitive session fields
}
```

**Two route tiers:**

- **Public routes** — no auth required (health, sign-in-adjacent, public metadata).
- **Protected routes** — guarded by an `AuthGuard` that throws `UnauthorizedException` when
  there is no valid session and exposes the non-null user (via `@CurrentUser()`) to the
  handler.

```ts
@UseGuards(AuthGuard)
@Controller("opportunities")
export class OpportunityController {
  /* … */
}
```

**Authorization is server-side and explicit:**

- Every user-scoped route passes `user.id` into the service, and the **repository filters
  by `userId`** (see [`database.md`](database.md) §4). A user can only ever read/write their
  own data.
- **Never trust the client to scope data.** Don't accept a `userId` from the body/input for
  ownership; derive it from the session.
- Ownership checks live in the service/repository, not the UI.

---

## 6. Errors

Throw NestJS `HttpException` subclasses so the framework serializes a consistent JSON error
and the client can map the status to UX:

| Exception (status)                   | When                                            |
| ------------------------------------ | ----------------------------------------------- |
| `UnauthorizedException` (401)        | No/invalid session.                             |
| `ForbiddenException` (403)           | Authenticated but not allowed (not the owner).  |
| `NotFoundException` (404)            | Resource doesn't exist (or isn't the user's).   |
| `BadRequestException` (400)          | Validation/semantic input error.                |
| `ConflictException` (409)            | Uniqueness / state conflict (e.g. duplicate).   |
| Rate-limit (429)                     | Throttled requests.                             |
| `InternalServerErrorException` (500) | Unexpected failure (Sentry reporting deferred). |

Rules:

- **Never leak internal details** (stack traces, SQL, provider errors) to the client. A
  global exception filter maps to a safe status + message; log the detail server-side.
- **Expected outcomes are typed errors, not 500s.** "Not found" is a `NotFoundException`,
  not a thrown internal error.
- **Unexpected errors surface as `500`** and are logged with request context
  (no PII/secrets). Sentry reporting is deferred — not currently wired.
- Zod validation failures map to `400 Bad Request` with field information from the Zod
  error.

---

## 7. Pagination & list conventions

- **Everything that lists is paginated.** Return the shared `Paginated<T>` wrapper
  (`{ items, total, page, pageSize }`) from `@distribution-copilot/shared`.
- Default page size is `DEFAULT_PAGE_SIZE` (20) from `@distribution-copilot/config`.
- Query params accept `page`/`pageSize` (and filters/sort as typed fields). Validate bounds
  in Zod (positive ints, capped `pageSize`).
- For very large/streamed datasets, prefer **cursor-based** pagination (keyset on
  `createdAt`/`id`) over offset — decide per endpoint based on volume.
- **Filtering and sorting are explicit, validated fields** — never accept arbitrary query
  objects from the client.

---

## 8. Long-running & async work

The API request path is for **fast, transactional** operations. Anything slow,
external-I/O-bound, rate-limited, or high-volume (discovery, scoring, embedding, batch
drafting) is **enqueued to the worker**, not awaited in the request:

```
POST /discovery  →  service adds a BullMQ job  →  returns { jobId } immediately
                                                  (worker processes async)
client polls / refetches results via GET requests
```

The API enqueues and reads results; the worker does the heavy lifting. See
[`worker-architecture.md`](worker-architecture.md).

---

## 9. Versioning & evolution

- The REST API is **internal** — consumed only by our own web app. Both sides import the
  same Zod schemas from `shared`, so a shape change surfaces at both ends; keep the web
  client in sync in the same change.
- **Additive changes are safe** (new routes, optional fields). For breaking changes, prefer
  adding a new route/field and migrating callers over silently changing semantics.
- If we ever need a **public/third-party API**, we add an explicitly versioned surface
  (e.g. `/v1`, documented with OpenAPI) via a new ADR — we do not expose the internal
  routes directly.

---

## 10. Checklist for a new endpoint

1. Does a service method exist for this, or do I add one? (Controllers don't hold logic.)
2. Input validated with a Zod schema reused from `shared` (body/params/query)?
3. Public vs protected (guarded) chosen correctly?
4. Is the data scoped to `user.id` in the repository?
5. HTTP verb correct (GET reads; POST/PATCH/DELETE write)?
6. Returns domain types (not Prisma rows)?
7. Lists paginated with `Paginated<T>`?
8. Errors thrown as the right `HttpException` subclasses?
9. Heavy work enqueued to the worker rather than awaited?
10. Did the web client get updated to match (no caller left behind)?
