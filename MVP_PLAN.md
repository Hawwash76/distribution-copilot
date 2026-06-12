# Distribution Copilot — MVP Plan

> **Legend:** `[x]` done · `[~]` partial / needs work · `[ ]` not started
>
> Last updated: 2026-06-12

---

## Phase 1 — Auth & Session

**Status: ~ (mostly done, email gap)**

- [x] Email + password sign-up / sign-in
- [x] Forgot-password + reset-password flow (UI + API + Better Auth)
- [x] Sign-out
- [x] Session guard protecting all API routes and dashboard
- [x] `@CurrentUser()` decorator; all routes scope to authenticated user
- [x] Settings page: change display name, change password
- [~] Session expiry — Better Auth manages sessions; needs explicit 3-day `expiresIn` config verified
- [ ] Transactional email provider (Resend) — reset-password and verify-email currently `console.log` only
- [ ] Email verification on sign-up (mark `emailVerified = true` after link click)

---

## Phase 2 — Product Management

**Status: x (complete)**

- [x] Create / edit / delete product (name, website, description, audience, competitors)
- [x] Product list page with grid cards
- [x] Product detail page
- [x] AI-generated profile (painPoints, personas, keywords, competitors, useCases, valueProps)
- [x] Manual profile editing (inline on product detail page)
- [x] Profile regeneration
- [x] Products overview on dashboard (opportunity count, engagement rate, last-run time)

---

## Phase 3 — Opportunity Management

**Status: ~ (mostly done, archive + date-filter gap)**

- [x] Global opportunity list page with product selector
- [x] Per-product opportunity list
- [x] Status tabs: all / new / scored / reviewed / engaged / dismissed
- [x] Filters: source (reddit / hn / stackoverflow / lobsters / devto / web), signal type
- [x] Sort: score ↓, newest, oldest
- [x] Opportunity detail page — full scoring breakdown, risk, rationales
- [x] Mark as reviewed / engaged / dismissed
- [x] Engage action: record off-platform reply text
- [x] Delete opportunity
- [~] "Archive" — currently `dismissed` serves this role; decide if a separate `archived` status is needed or if `dismissed` is sufficient
- [ ] Date-range filter on opportunity list (filter by `publishedAt` or `createdAt`)
- [ ] Score-range filter (e.g. show only overallScore ≥ 60)

---

## Phase 4 — Scoring

**Status: x (complete)**

- [x] Engagement + recency scores (pure functions, no AI)
- [x] AI intent score (0–100) + rationale
- [x] AI relevance score (0–100) + rationale
- [x] AI signal-type classification (RECOMMENDATION_REQUEST, COMPETITOR_FRUSTRATION, ACTIVE_EVALUATION, PAIN_EXPRESSION, BUDGET_SIGNAL, CATEGORY_RESEARCH) + rationale
- [x] AI risk assessment (ruleViolation, promotion, link, moderation risks) + warnings + rationale
- [x] Overall score (weighted composite) + auto-dismiss below threshold 35
- [x] Partial scoring (engagement + recency only) when no product profile — auto-dismissed
- [x] Model tracking (which AI model produced each score)

---

## Phase 5 — Reply Generator

**Status: x (complete)**

- [x] AI draft reply generated automatically during scoring
- [x] On-demand regenerate endpoint + button on opportunity detail
- [x] Risk warnings injected into draft prompt (avoid_links, avoid_cta, avoid_product_mention)
- [x] Signal type and community context injected into draft prompt
- [x] Copy-to-clipboard on draft
- [x] Draft never auto-posted — human always reviews and posts manually off-platform

---

## Phase 6 — Dashboard & Analytics

**Status: ~ (stat cards done, charts missing)**

- [x] Stat cards: Total Opportunities, To Review, Engaged, Engagement Rate
- [x] Onboarding checklist (3-step: create product → generate profile → run discovery)
- [x] Products overview table (opp count, engaged count, rate, last-run time)
- [ ] Time-series chart: opportunities discovered per day (last 30 days)
- [ ] Source breakdown chart: which platforms yield the most scored opportunities
- [ ] Score distribution chart: histogram of overallScore for opportunities
- [ ] Signal-type breakdown: pie/donut of RECOMMENDATION_REQUEST vs PAIN_EXPRESSION etc.
- [ ] Per-product analytics: charts scoped to a single product (on product detail page)

---

## Phase 7 — Discovery Monitoring

**Status: [ ] (not started — replacing one-shot fetch with continuous monitoring)**

This replaces the "Find Opportunities" one-shot button with per-source monitoring toggles.
Each source can be independently enabled. First enable backfills 30 days; subsequent sweeps
fetch only what's new since `lastCheckedAt`.

**DB**

- [ ] `ProductMonitor` model: `(productId, source)` unique, `enabled`, `lastCheckedAt`
- [ ] Migration

**Shared**

- [ ] `ProductMonitor` Zod schema + `MonitorStatus` response shape

**API**

- [ ] `GET /products/:id/monitors` — returns all 6 sources with enabled + lastCheckedAt (auto-creates disabled rows)
- [ ] `PATCH /products/:id/monitors/:source` — toggle `{ enabled: boolean }`

**Worker — search client updates**

- [ ] Add `options?: { since?: Date }` to `DiscoverySource` interface
- [ ] HN: use `since` as `created_at_i >= epoch` (replaces static `MAX_AGE_MONTHS`)
- [ ] StackOverflow / SoftwareRecs: use `since` as `fromdate = epoch`
- [ ] Reddit: map `since` to nearest time bucket (`t=week` / `t=month` / `t=year`)
- [ ] Lobsters: `since` ignored — `order=newest` always returns latest; dedup handles overlap
- [ ] Dev.to: `since` ignored — `state=fresh` already returns recent; dedup handles overlap

**Worker — monitor sweep queue**

- [ ] New `"monitor"` BullMQ queue
- [ ] Repeatable job registered at startup (default every 30 min; `MONITOR_INTERVAL_MINUTES` env)
- [ ] Processor: query all enabled `ProductMonitor` rows → run keyword + competitor queries per source with `since` → feed URLs into existing `"extract"` queue → stamp `lastCheckedAt`
- [ ] Skip products without a profile (same gate as current discovery)

**Frontend**

- [ ] "Monitoring" section on product detail page (below profile)
- [ ] Per-source toggle cards showing enabled state + "Last checked X min ago" / "Never"
- [ ] Disabled with tooltip if product has no profile
- [ ] `useProductMonitors` + `useToggleMonitor` hooks

**Cleanup**

- [ ] Remove "Find Opportunities" one-shot button (replaced by monitoring)
- [ ] Update `apps/worker/CLAUDE.md` (remove stale SerpAPI references)
- [ ] Remove `SERP_API_KEY` from `packages/config/src/env.ts` and `.env.example` files

---

## Phase 8 — User Plans & Billing

**Status: [ ] (not started)**

3-day free trial → paid plan. Locked out after trial expires if no active subscription.

**DB**

- [ ] `Plan` model: name, monthlyPrice, limits (opportunitiesPerMonth, productsLimit, etc.)
- [ ] `Subscription` model: userId, planId, stripeCustomerId, stripeSubscriptionId, status, trialEndsAt, currentPeriodEnd
- [ ] Seed 3 plans: Free Trial (3 days), Starter, Pro

**API**

- [ ] `GET /billing/status` — current plan, trial days remaining, subscription status
- [ ] `POST /billing/checkout` — create Stripe Checkout session
- [ ] `POST /billing/portal` — create Stripe Customer Portal session
- [ ] `POST /billing/webhook` — Stripe webhook: handle `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- [ ] Trial gate middleware: if subscription `status = expired` or `trialEndsAt < now` and no active subscription → 402 on discovery/scoring/reply routes

**Frontend**

- [ ] Trial banner in dashboard layout (days remaining; upgrade CTA)
- [ ] Billing section in settings: current plan, payment method, upgrade/cancel button
- [ ] "Plan locked" overlay/page when trial expired and no subscription
- [ ] Pricing display on locked page + link to landing page pricing

---

## Phase 9 — Landing Page

**Status: [ ] (currently just redirects to /dashboard)**

- [ ] Public layout (no dashboard nav)
- [ ] Hero section: headline, sub-headline, CTA → sign up
- [ ] Feature highlights section (find conversations, score intent, draft replies)
- [ ] Pricing section: 3 plan tiers with features and monthly price
- [ ] Sign in / Sign up CTA in nav
- [ ] Root `page.tsx`: show landing page for unauthenticated; redirect to `/dashboard` for authenticated
- [ ] Basic SEO: title, description, Open Graph tags

---

## Phase 10 — Cleanup & Launch Prep

**Status: [ ] (ongoing)**

- [ ] Resend (or similar) email provider wired into Better Auth for reset + verification emails
- [ ] Email templates: password reset, email verification, trial expiry warning
- [ ] Sentry DSN configured in web + API (error tracking)
- [ ] PostHog key configured in web (product analytics — no PII)
- [ ] Environment variable audit: all `.env.example` files accurate and complete
- [ ] Stale CLAUDE.md files updated (worker references SerpAPI)
- [ ] 404 and error pages in Next.js (`not-found.tsx`, `error.tsx`)
- [ ] API rate limiting (simple per-user throttle on discovery + scoring endpoints)
- [ ] `robots.txt` and `sitemap.xml` for landing page

---

---

## Phase 11 — Mass Cleanup & Code Quality

**Status: [ ] (post-feature, pre-public-launch)**

A dedicated pass over the entire codebase once all features are built. Goal: remove
dead code, tighten consistency, and ensure every piece earns its place.

**Stale documentation**

- [ ] Update root `CLAUDE.md` — domain model section, architecture diagram, env table
- [ ] Update `docs/architecture/worker-architecture.md` — remove SerpAPI references, add monitor queue
- [ ] Update `docs/architecture/backend-architecture.md` — add monitors + billing modules
- [ ] Audit all other `docs/architecture/` files for accuracy

**Dead code removal**

- [ ] Remove `SERP_API_KEY` from `packages/config/src/env.ts` and all `.env.example` files
- [ ] Remove any leftover placeholder/scaffold comments ("TODO(context): replace this")
- [ ] Remove unused imports across all packages (run `pnpm lint --fix`)
- [ ] Identify and remove any orphaned utility files or types that nothing imports

**Worker & pipeline**

- [ ] Rename `sourceTitle`/`sourceSnippet` fields in extract job payload to cleaner names if needed
- [ ] Audit discovery processor for any unused variables or dead branches
- [ ] Ensure all BullMQ job removal policies are consistent (completed/failed counts)
- [ ] Verify all queue workers have consistent error logging format

**API**

- [ ] Audit all repositories for N+1 query patterns; add `include` or batch where appropriate
- [ ] Ensure all controllers have consistent response shapes (no accidental Prisma type leaks)
- [ ] Verify all routes have appropriate HTTP status codes (201 for creates, 204 for deletes, etc.)
- [ ] Review and tighten Zod validation on all input DTOs

**Frontend**

- [ ] Audit for any `useEffect` data-fetching anti-patterns (should all be TanStack Query)
- [ ] Remove any hardcoded magic strings/numbers — extract to named constants
- [ ] Ensure consistent loading/error/empty states across all list pages
- [ ] Audit and fix any missing `key` props or React warnings
- [ ] Check all `<Link>` and navigation hrefs for correctness

**AI package**

- [ ] Audit prompt templates for injection-guard consistency (all scraped content delimited)
- [ ] Verify all capability output schemas are fully strict (no passthrough/strip that could hide bugs)
- [ ] Ensure mock provider covers all capabilities with realistic-looking outputs

**Type system**

- [ ] Run `pnpm type-check` across all packages; fix all warnings
- [ ] Audit for any `as unknown as X` escape hatches — replace with proper type guards
- [ ] Ensure `z.coerce.date()` vs `z.string()` is consistent for date fields across schemas

**Performance**

- [ ] Add database indexes for common query patterns (e.g. `opportunities.status + productId`)
- [ ] Review Prisma `include` depth — avoid fetching more than needed per endpoint
- [ ] Ensure worker processors don't hold open DB connections unnecessarily

**Security**

- [ ] Audit all API endpoints for missing auth guards
- [ ] Verify all user-scoped queries have `userId` filter (no cross-user data leaks possible)
- [ ] Review Stripe webhook signature verification (Phase 8 dependency)
- [ ] Ensure no secrets appear in logs (Sentry breadcrumbs, structured log fields)

**Test coverage (targeted)**

- [ ] Unit tests for all pure scoring functions (`computeEngagementScore`, `computeRecencyScore`, `computeOverallScore`, `computeOverallRiskLevel`, `computeRiskWarnings`)
- [ ] Unit tests for all Zod schemas (happy path + known-invalid inputs)
- [ ] Unit tests for discovery processor logic (mock clients + mock queue)
- [ ] Integration test: discovery → extract → scoring happy path with test DB

---

## Implementation Order

Phases are sequenced by dependency and MVP-blocking priority:

| #   | Phase                       | Blocking?                            |
| --- | --------------------------- | ------------------------------------ |
| 7   | Discovery Monitoring        | Yes — core product loop improvement  |
| 6   | Dashboard Analytics         | Desirable before showing to users    |
| 8   | Plans & Billing             | Yes — needed before public launch    |
| 9   | Landing Page                | Yes — entry point for new users      |
| 1   | Auth Email                  | Yes — verification + reset must work |
| 3   | Opportunity gaps            | Small — archive + date filter        |
| 10  | Cleanup & Launch Prep       | Before launch                        |
| 11  | Mass Cleanup & Code Quality | Final pre-launch quality pass        |

---

## Current Progress

```
Phase 1  — Auth & Session          [=======   ] 75%   email provider + verification pending
Phase 2  — Product Management      [==========] 100%  complete
Phase 3  — Opportunity Management  [========  ] 80%   archive status + date filter pending
Phase 4  — Scoring                 [==========] 100%  complete
Phase 5  — Reply Generator         [==========] 100%  complete
Phase 6  — Dashboard Analytics     [====      ] 40%   stat cards done, charts missing
Phase 7  — Discovery Monitoring    [          ] 0%    not started
Phase 8  — Plans & Billing         [          ] 0%    not started
Phase 9  — Landing Page            [          ] 0%    not started
Phase 10 — Cleanup & Launch Prep   [=         ] 10%   Sentry/PostHog partially wired
Phase 11 — Mass Cleanup & Quality  [          ] 0%    post-feature pass
```
