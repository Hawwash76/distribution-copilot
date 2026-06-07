# Product Architecture — Distribution Copilot

This document defines _what_ Distribution Copilot is and _why_ it exists, so that every
technical decision can be traced back to a product reason. Read it before designing any
feature. For the engineering rules see the root [`CLAUDE.md`](../../CLAUDE.md).

---

## 1. What it is

**Distribution Copilot** is a copilot for founder-led distribution. It helps founders
find online conversations where their product is genuinely relevant, understand which of
those are worth engaging, gauge the risk of engaging in each community, and draft
context-aware replies — which the founder then reviews and posts themselves.

It is a **decision-support and drafting tool**, not an automation tool. The founder's
judgment is always in the loop.

### One-line description

> Find relevant online conversations and generate context-aware replies — with a human
> always deciding what to publish.

---

## 2. The problem

Founders know that authentic participation in communities (Reddit, X, Hacker News,
forums) is one of the best early distribution channels. But doing it well is hard:

- **Discovery is noisy.** Relevant threads are buried in millions of posts across many
  communities. Manual search is slow and misses things.
- **Relevance ≠ intent.** A thread can mention your space without being a real
  opportunity. High-intent discussions (someone actively looking for a solution) are
  rare and time-sensitive.
- **Communities have norms.** Each subreddit/forum has rules and culture. A tone-deaf or
  promotional reply gets removed, downvoted, or damages the brand. The _risk_ of
  engaging varies enormously by community and by thread.
- **Writing good replies is effortful.** A genuinely helpful, on-brand, non-spammy reply
  takes context and time the founder rarely has at the moment of opportunity.
- **Automation is a trap.** Tools that auto-post or mass-engage violate platform rules,
  get accounts banned, and destroy trust. The temptation to automate is exactly what
  makes most "growth hacking" tools harmful.

Distribution Copilot removes the toil (finding, ranking, risk-checking, drafting) while
keeping the human exactly where they must be (deciding and publishing).

---

## 3. Who it is for

- **Primary user: the founder / small founding team** doing their own distribution. They
  are time-poor, care deeply about brand and authenticity, and are often non-marketers.
- **Secondary: early growth / DevRel / community hires** at small startups doing the same
  work at slightly larger scale.

These users value: signal over volume, brand safety, speed-to-draft, and a tool that
keeps them on the right side of platform rules.

---

## 4. The core loop

Everything in the product — and therefore the codebase — serves this loop:

```
1. DISCOVER   Pull conversations from connected sources (Reddit first; X, HN later)
              that relate to the founder's product / space.

2. SCORE      Rank each discovered conversation by relevance and purchase/help intent,
              so the founder spends time only on the best opportunities.

3. ASSESS     Evaluate community-engagement risk: does this community welcome this kind
              of participation? What are the rules? How promotional is too promotional?

4. DRAFT      Generate a context-aware reply draft grounded in the conversation and the
              product — helpful first, never spammy.

5. REVIEW     The founder reads the conversation, the score, the risk assessment, and
              the draft. They edit the draft freely.

6. PUBLISH    The founder posts manually, on the platform, themselves. The Copilot never
              posts.
```

Steps 1–4 are where the product adds leverage. Steps 5–6 are where the human stays in
control. The boundary between them is sacred (see §6).

### How the loop maps to the system

| Loop step | Where it lives                                                             |
| --------- | -------------------------------------------------------------------------- |
| Discover  | `apps/worker` discovery jobs → source connectors → `database`              |
| Score     | `apps/worker` scoring jobs → `packages/ai` → `database`                    |
| Assess    | `apps/worker` risk jobs → `packages/ai` → `database`                       |
| Draft     | `apps/api` (on demand) or `apps/worker` (pre-draft) → `packages/ai`        |
| Review    | `apps/web` dashboard → REST API → `apps/api`                               |
| Publish   | **The user, manually, off-platform.** The product only provides the draft. |

---

## 5. What the product does and does not do

### Does

- Discovers relevant conversations from connected platforms.
- Scores relevance and intent so attention goes to the best opportunities.
- Assesses per-community and per-thread engagement risk.
- Generates editable, context-aware reply drafts.
- Presents everything in a review-first dashboard the founder controls.
- Tracks the founder's own products and the communities they care about.

### Does NOT (ever)

- **Auto-post** or publish content to any platform on the user's behalf.
- **Automate engagement** — no auto-likes, follows, votes, comments, or DMs.
- **Spam** communities or mass-distribute content.
- **Circumvent platform rules**, rate limits, captchas, or anti-bot measures.
- Make the publish decision for the user.

These are not deferred features — they are **explicit non-goals** and product
constraints. See §6.

---

## 6. The human-in-the-loop contract (non-negotiable)

Distribution Copilot is **human-in-the-loop by design.** This is simultaneously:

- a **product principle** (the founder's authentic voice and judgment are the point),
- a **trust principle** (users must never fear the tool acting without them),
- and a **compliance principle** (auto-engagement violates platform ToS and gets users
  banned).

**The rule:** AI outputs are _drafts and signals_. A human reviews and acts. The product
provides no path to automatic publishing or engagement.

For engineers and for Claude: if a feature request implies auto-posting, scheduled
posting on the user's behalf, automated voting/following, scraping in ways that
circumvent platform protections, or any "set it and forget it" engagement — **stop and
flag it.** It violates the core contract. There is no configuration that turns this off.

---

## 7. Product principles

1. **Signal over volume.** Surfacing 5 great opportunities beats 500 mediocre ones. The
   product's job is to _reduce_ what the founder has to look at.
2. **Brand safety first.** A bad reply is worse than no reply. Risk assessment is a
   first-class output, not an afterthought.
3. **Helpful, not promotional.** Drafts lead with genuine help. Promotion is incidental
   and contextual, never the opening move.
4. **The human is the author.** Drafts are starting points. The UI must make editing
   natural and never pressure the user toward one-click anything.
5. **Respect the platforms.** We operate within ToS and rate limits. We are guests in
   these communities.
6. **Transparency.** The founder sees _why_ something scored highly and _why_ a
   community is risky. No black-box ranking.

---

## 8. Success looks like

- Founders spend their distribution time only on high-quality opportunities.
- Replies posted via Copilot drafts are well-received (not removed/downvoted) because
  risk assessment steered them right.
- Founders trust the tool _because_ it never acts without them.
- The system scales to monitor many communities and millions of posts without changing
  this experience.

---

## 9. Boundaries with the rest of the docs

- The shared **vocabulary** of the loop (opportunity, community, score, risk, reply) is
  formalized in [`domain-model.md`](domain-model.md).
- How the loop is **built** is split across [`backend-architecture.md`](backend-architecture.md),
  [`frontend-architecture.md`](frontend-architecture.md),
  [`worker-architecture.md`](worker-architecture.md), and
  [`ai-architecture.md`](ai-architecture.md).
- The **order** in which the loop gets built is in [`roadmap.md`](roadmap.md).
- Why the **stack** was chosen to serve this product is in [`decisions.md`](decisions.md).
