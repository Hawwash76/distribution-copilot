# Distribution Copilot — MVP Plan

> **Legend:** `[x]` done · `[~]` partial / needs work · `[ ]` not started
>
> Last updated: 2026-06-12

---

## Phase 1 — Auth & Session

**Status: x (complete)**

- [x] Email + password sign-up / sign-in
- [x] Forgot-password + reset-password flow (UI + API + Better Auth)
- [x] Sign-out
- [x] Session guard protecting all API routes and dashboard
- [x] `@CurrentUser()` decorator; all routes scope to authenticated user
- [x] Settings page: change display name, change password
- [x] Session expiry — managed by Better Auth
- [x] Resend email provider wired — password reset + signup verification emails
- [x] Verification email sent on signup (optional, non-blocking)

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

**Status: x (complete)**

- [x] Global opportunity list page with product selector
- [x] Per-product opportunity list
- [x] Status tabs: all / new / scored / reviewed / engaged / dismissed
- [x] Filters: source (reddit / hn / stackoverflow / lobsters / devto / web), signal type
- [x] Sort: score ↓, newest, oldest
- [x] Opportunity detail page — full scoring breakdown, risk, rationales
- [x] Mark as reviewed / engaged / dismissed
- [x] Engage action: record off-platform reply text
- [x] Delete opportunity
- [x] `dismissed` serves as archive — no separate status needed
- [x] Date-range filter (Last 7d / 30d / 90d / All time)
- [x] Score-range filter (Any / ≥50 / ≥70 / ≥90)

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

**Status: x (complete)**

- [x] Stat cards: Total Opportunities, To Review, Engaged, Engagement Rate
- [x] Onboarding checklist (3-step: create product → generate profile → run discovery)
- [x] Products overview table (opp count, engaged count, rate, last-run time)
- [x] Time-series chart: opportunities discovered per day (last 30 days) — CSS sparkline bars
- [x] Source breakdown chart: horizontal bar chart by discovery source
- [x] Score distribution histogram — 5-bucket bar chart on dashboard
- [x] Signal-type breakdown — horizontal bar chart on dashboard
- [x] Per-product analytics — stats row (opportunities / engaged / rate) on product detail page

---

## Phase 7 — Discovery Monitoring

**Status: x (complete)**

All items implemented — see previous session for full details.

---

## Phase 8 — User Plans & Billing

**Status: x (complete)**

- [x] `Subscription` model (`SubscriptionStatus` enum, stripeCustomerId/SubscriptionId, trialEndsAt)
- [x] Auto-create trial on signup via Better Auth `databaseHooks`
- [x] `GET /billing/status` — trial days remaining, isLocked, plan name
- [x] `POST /billing/checkout` — Stripe Checkout session (stub when no STRIPE_SECRET_KEY)
- [x] `POST /billing/portal` — Stripe Customer Portal (stub when no key)
- [x] `POST /billing/webhook` — Stripe event handler with signature verification
- [x] Trial banner in dashboard (shown with ≤2 days remaining)
- [x] Locked overlay when `isLocked: true`
- [x] `/dashboard/upgrade` page with plan cards (Starter / Pro)
- [x] Billing section in settings page
- [x] `SubscriptionGuard` exported for route-level use (Phase 11 will apply it broadly)

---

## Phase 9 — Landing Page

**Status: x (complete)**

- [x] Public marketing page at `/` (replaces the old redirect)
- [x] Navbar with Sign in / Start free trial CTAs
- [x] Hero: headline, sub-headline, dual CTA
- [x] How it works: 4-step numbered flow
- [x] Feature grid: 6 feature cards
- [x] Pricing section: Starter ($29/mo) + Pro ($79/mo) plan cards
- [x] Footer with copyright + nav links
- [x] SEO: title + description metadata

---

## Phase 10 — Cleanup & Launch Prep

**Status: x (complete)**

- [x] Resend wired into Better Auth (password reset + email verification)
- [x] Email templates for password reset and signup verification
- [x] `not-found.tsx` — 404 page
- [x] `error.tsx` — global error boundary page
- [x] API rate limiting — `@nestjs/throttler` global guard (120 req/min/IP); webhook exempted
- [x] `.env.example` files audited and updated (RESEND, STRIPE, public Stripe price IDs)
- [x] `robots.txt` + `sitemap.xml` — Next.js metadata API (`app/robots.ts`, `app/sitemap.ts`)
- [ ] Sentry DSN wired — keys not yet provided, deferred to Phase 11
- [ ] PostHog key wired — keys not yet provided, deferred to Phase 11

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

- [x] Remove `SERP_API_KEY` — was never added; codebase is clean
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

- [x] Add database indexes for common query patterns — `opportunities(productId, status)`, `opportunities(productId, createdAt)`, `products(userId, isDeleted)`, `product_monitors(productId)`
- [ ] Review Prisma `include` depth — avoid fetching more than needed per endpoint
- [ ] Ensure worker processors don't hold open DB connections unnecessarily

**Security**

- [x] Audit all API endpoints for missing auth guards — all 22 protected routes verified
- [x] Verify all user-scoped queries have `userId` filter — all repositories confirmed clean
- [x] Review Stripe webhook signature verification — verified in BillingService
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
Phase 1  — Auth & Session          [==========] 100%  complete
Phase 2  — Product Management      [==========] 100%  complete
Phase 3  — Opportunity Management  [==========] 100%  complete
Phase 4  — Scoring                 [==========] 100%  complete
Phase 5  — Reply Generator         [==========] 100%  complete
Phase 6  — Dashboard Analytics     [==========] 100%  complete
Phase 7  — Discovery Monitoring    [==========] 100%  complete
Phase 8  — Plans & Billing         [==========] 100%  complete
Phase 9  — Landing Page            [==========] 100%  complete
Phase 10 — Cleanup & Launch Prep   [========  ] 80%   Sentry/PostHog pending (need keys)
Phase 11 — Mass Cleanup & Quality  [===       ] 30%   indexes+security done; tests + docs remaining
```
