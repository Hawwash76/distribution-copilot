# API Design

Distribution Copilot's API is **tRPC** (ADR-006), defined in
`@distribution-copilot/trpc` and hosted by the NestJS API. This document covers the
contract shape, procedure conventions, validation, auth/authorization, errors, and
pagination.

Related: [`backend-architecture.md`](backend-architecture.md) (how the API is built),
[`packages/trpc/CLAUDE.md`](../../packages/trpc/CLAUDE.md), and
[`frontend-architecture.md`](frontend-architecture.md) (how the client consumes it).

---

## 1. Contract topology

```
@distribution-copilot/trpc            apps/api (host)                 apps/web (client)
┌──────────────────────────┐   mount  ┌────────────────────┐  HTTP   ┌────────────────────┐
│ appRouter (root)         │ ───────► │ /trpc middleware   │ ◄─────► │ trpc (createTRPCReact)│
│ context factory          │          │ createContext():   │         │ imports AppRouter as  │
│ router/procedure builders│          │  session + prisma  │         │ a *type only*         │
│ feature routers          │          └────────────────────┘         └────────────────────┘
└──────────────────────────┘
        ▲ depends on @distribution-copilot/shared (Zod schemas / domain types)
```

- The **router definition lives in `packages/trpc`**, framework-free, depending only on
  `shared`.
- The **NestJS API is the only host.** It mounts the router as Express middleware at
  `/trpc` and builds the request context (session, Prisma, per-request services).
- The **web app imports `AppRouter` as a type** via `@trpc/react-query` — full inference,
  zero runtime coupling (`apps/web/src/lib/trpc.ts`).

> **Status.** `appRouter` is currently empty (`router({})`) and the context returns `{}`.
> The patterns below are the agreed conventions for when procedures are added.

---

## 2. Router structure

One **feature router per domain area**, merged into the root router. Feature routers are
defined inside the owning API module (`apps/api/src/modules/<feature>/<feature>.router.ts`)
and assembled into `appRouter`.

```ts
// packages/trpc root composition (target shape)
export const appRouter = router({
  opportunity: opportunityRouter,
  product: productRouter,
  reply: replyRouter,
  community: communityRouter,
});
export type AppRouter = typeof appRouter;
```

Naming: router identifier `<feature>Router`, namespace key the singular feature noun.
Keep routers shallow — group by feature, not by CRUD verb.

---

## 3. Procedure conventions

- **Queries read, mutations write.** Never mutate in a `query`.
- **Name procedures by intent**, camelCase: `list`, `byId`, `create`, `update`,
  `dismiss`, `generateDraft`, `markPosted`. Avoid generic `get`/`set`.
- **Every procedure validates input with a Zod schema** from `shared` (or a procedure-
  local input schema composed from shared pieces). No unvalidated input.
- **Declare output types via domain types** (`z.infer` from `shared`) — the procedure
  returns domain objects, never Prisma rows.
- **Procedures stay thin:** validate → call a service → return. No business logic, no
  Prisma calls in the procedure itself (see [`backend-architecture.md`](backend-architecture.md)).

```ts
// opportunity.router.ts (illustrative)
export const opportunityRouter = router({
  list: protectedProcedure
    .input(listOpportunitiesInput) // Zod, from shared/feature
    .query(({ ctx, input }) => ctx.opportunityService.list(ctx.user.id, input)),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.opportunityService.dismiss(ctx.user.id, input.id)),
});
```

---

## 4. Validation

- **Input validation is mandatory and happens at the procedure boundary** via Zod
  (ADR-012). This is the trust boundary — never assume the client sent valid data.
- **Reuse shared schemas.** Compose procedure inputs from `@distribution-copilot/shared`
  schemas rather than redeclaring shapes. One definition, inferred everywhere.
- **Validate, then narrow.** After `.parse`, the input is fully typed; downstream code
  relies on that.
- Treat **all** external input as hostile: client payloads, and especially scraped
  content that flows through the API.

---

## 5. Authentication & authorization

**Authentication** is **Better Auth** (ADR-007), configured in the API
(`apps/api/src/config/auth.ts`) with the Prisma adapter. Its handler is mounted in the
API; the **tRPC context resolves the authenticated session** from the request.

```ts
// trpc context (target shape) — packages/trpc context built by the API host
export interface Context {
  user: AuthenticatedUser | null; // resolved from the Better Auth session
  prisma: PrismaClient; // injected by the API host
  // per-request services attached by the host
}
```

**Two procedure tiers:**

- `publicProcedure` — no auth required (health, sign-in-adjacent, public metadata).
- `protectedProcedure` — a `publicProcedure` extended with middleware that throws
  `UNAUTHORIZED` when `ctx.user` is null, and narrows `ctx.user` to non-null for the
  resolver.

```ts
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } }); // user is now non-null
});
```

**Authorization is server-side and explicit:**

- Every user-scoped procedure passes `ctx.user.id` into the service, and the
  **repository filters by `userId`** (see [`database.md`](database.md) §4). A user can
  only ever read/write their own data.
- **Never trust the client to scope data.** Don't accept a `userId` from input for
  ownership; derive it from the session.
- Ownership checks live in the service/repository, not the UI.

---

## 6. Errors

Use tRPC's typed errors so the client can map them to UX. Throw `TRPCError` with the
right code:

| Code                    | When                                           |
| ----------------------- | ---------------------------------------------- |
| `UNAUTHORIZED`          | No/invalid session.                            |
| `FORBIDDEN`             | Authenticated but not allowed (not the owner). |
| `NOT_FOUND`             | Resource doesn't exist (or isn't the user's).  |
| `BAD_REQUEST`           | Validation/semantic input error.               |
| `CONFLICT`              | Uniqueness / state conflict (e.g. duplicate).  |
| `TOO_MANY_REQUESTS`     | Rate limited.                                  |
| `INTERNAL_SERVER_ERROR` | Unexpected failure (also reported to Sentry).  |

Rules:

- **Never leak internal details** (stack traces, SQL, provider errors) to the client.
  Map to a safe code + message; log the detail server-side.
- **Expected outcomes are typed errors, not 500s.** "Not found" is `NOT_FOUND`, not a
  thrown internal error.
- **Unexpected errors go to Sentry** with request context (no PII/secrets) and surface
  as `INTERNAL_SERVER_ERROR`.
- Zod validation failures map to `BAD_REQUEST` with field information tRPC provides.

---

## 7. Pagination & list conventions

- **Everything that lists is paginated.** Return the shared `Paginated<T>` wrapper
  (`{ items, total, page, pageSize }`) from `@distribution-copilot/shared`.
- Default page size is `DEFAULT_PAGE_SIZE` (20) from `@distribution-copilot/config`.
- Inputs accept `page`/`pageSize` (and filters/sort as typed fields). Validate bounds in
  Zod (positive ints, capped `pageSize`).
- For very large/streamed datasets, prefer **cursor-based** pagination (keyset on
  `createdAt`/`id`) over offset — decide per endpoint based on volume.
- **Filtering and sorting are explicit, validated fields** — never accept arbitrary
  query objects from the client.

---

## 8. Long-running & async work

The API request path is for **fast, transactional** operations. Anything slow,
external-I/O-bound, rate-limited, or high-volume (discovery, scoring, embedding,
batch drafting) is **enqueued to the worker**, not awaited in the request:

```
mutation enqueueDiscovery  →  service adds a BullMQ job  →  returns { jobId } immediately
                                                          (worker processes async)
client polls / subscribes for status, or refetches results via a query
```

The API enqueues and reads results; the worker does the heavy lifting. See
[`worker-architecture.md`](worker-architecture.md).

---

## 9. Versioning & evolution

- tRPC + the monorepo give us **compile-time contract safety**: a breaking change to a
  procedure surfaces as a type error in the web app immediately. Use that — fix the
  client in the same change.
- **Additive changes are safe** (new procedures, optional inputs). For breaking changes,
  prefer adding a new procedure and migrating callers over silently changing semantics.
- tRPC is an **internal, TypeScript-to-TypeScript** contract, not a public API. If we
  ever need a public/3rd-party API, we add REST/GraphQL alongside via a new ADR — we do
  not contort tRPC into that role.

---

## 10. Checklist for a new procedure

1. Does a service method exist for this, or do I add one? (Procedures don't hold logic.)
2. Input validated with a Zod schema reused from `shared`?
3. `publicProcedure` vs `protectedProcedure` chosen correctly?
4. Is the data scoped to `ctx.user.id` in the repository?
5. Query vs mutation correct?
6. Returns domain types (not Prisma rows)?
7. Lists paginated with `Paginated<T>`?
8. Errors mapped to the right `TRPCError` codes?
9. Heavy work enqueued to the worker rather than awaited?
10. Did the web app's types stay green (no client breakage left behind)?
