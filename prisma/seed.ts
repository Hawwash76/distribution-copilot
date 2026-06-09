/**
 * Prisma seed — creates a demo user and a full set of sample data so the app
 * is immediately usable after `pnpm db:migrate && pnpm db:seed`.
 *
 * Demo credentials:
 *   Email:    demo@distribution.co
 *   Password: demo1234
 *
 * Creates: 1 user, 1 product, 1 product profile, 3 communities,
 * 10 discussions, 10 fully-scored opportunities with risk assessments and
 * draft replies.
 *
 * Idempotent: safe to re-run. Existing records are left unchanged (upsert with
 * stable IDs / unique keys). Delete manually if you want to reset.
 */
import "dotenv/config";

import { prisma } from "@distribution-copilot/database";
import { auth } from "../apps/api/src/config/auth";

const SEED_EMAIL = "demo@distribution.co";
const SEED_PASSWORD = "demo1234";
const SEED_NAME = "Alex Chen";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `n` days before 2026-06-09 (the reference seed date). */
function daysAgo(n: number): Date {
  const d = new Date("2026-06-09T12:00:00.000Z");
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  console.log("🌱  Seeding database…\n");

  // ── User ──────────────────────────────────────────────────────────────────
  let user = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });

  if (!user) {
    await auth.api.signUpEmail({
      body: { email: SEED_EMAIL, password: SEED_PASSWORD, name: SEED_NAME },
    });
    user = await prisma.user.findUniqueOrThrow({ where: { email: SEED_EMAIL } });
    console.log(`  ✓ Created user: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  } else {
    console.log(`  ✓ User already exists: ${SEED_EMAIL}`);
  }

  // ── Product ───────────────────────────────────────────────────────────────
  const product = await prisma.product.upsert({
    where: { id: "seed-product-flowdesk" },
    update: {},
    create: {
      id: "seed-product-flowdesk",
      userId: user.id,
      name: "FlowDesk",
      website: "https://flowdesk.io",
      description:
        "A lightweight CRM for indie founders and freelancers. Track leads, follow-ups, and deals without the complexity of enterprise tools.",
      audience:
        "Solo founders, freelancers, and small agencies managing 10–100 clients who need simple relationship tracking without bloated CRM software.",
      competitors: "HubSpot, Pipedrive, Monday.com, Notion CRM templates, Salesforce",
    },
  });

  console.log(`  ✓ Product: FlowDesk (id: ${product.id})`);

  // ── Product Profile ───────────────────────────────────────────────────────
  await prisma.productProfile.upsert({
    where: { productId: product.id },
    update: {},
    create: {
      productId: product.id,
      painPoints: [
        "Forgetting to follow up with potential clients",
        "Expensive enterprise CRM software designed for 50-person sales teams",
        "Client notes scattered across email, Notion, and spreadsheets",
        "No clear view of where each lead is in the pipeline",
        "Manual data entry eating into billable hours",
      ],
      personas: [
        "Solo freelance developer or designer with 5–20 active clients",
        "Bootstrapped SaaS founder managing their own sales before hiring a sales rep",
        "Independent consultant building a $200k–$500k/year practice",
        "Small agency owner (2–5 people) tracking proposals and retainers",
      ],
      keywords: [
        "simple crm",
        "freelancer crm",
        "lightweight crm",
        "client management",
        "indie crm",
        "solopreneur tools",
        "lead tracking",
        "sales pipeline",
        "deal tracking",
        "crm for consultants",
        "small business crm",
      ],
      competitors: ["HubSpot", "Pipedrive", "Zoho CRM", "Notion", "Airtable", "Monday.com"],
      useCases: [
        "Tracking which leads are in proposal, negotiation, or onboarding stages",
        "Setting follow-up reminders so no lead falls through the cracks",
        "Logging notes after client calls",
        "Tracking monthly recurring revenue from active clients",
        "Managing contract renewal dates",
      ],
      valueProps: [
        "Set up in 5 minutes, not 5 days",
        "Built for one-person businesses, not enterprise teams",
        "Flat monthly pricing under $20",
        "No training required — works the way you think",
        "Works alongside email and calendar, not against them",
      ],
      modelUsed: "mock-ai-v1",
    },
  });

  console.log(`  ✓ Product profile created`);

  // ── Communities ───────────────────────────────────────────────────────────
  const communityStartups = await prisma.community.upsert({
    where: { source_externalId: { source: "reddit", externalId: "startups" } },
    update: {},
    create: {
      source: "reddit",
      externalId: "startups",
      name: "startups",
      description:
        "The place for startup news, discussions, and resources. For entrepreneurs, founders, and investors.",
      subscriberCount: 1200000,
    },
  });

  const communityEntrepreneur = await prisma.community.upsert({
    where: { source_externalId: { source: "reddit", externalId: "entrepreneur" } },
    update: {},
    create: {
      source: "reddit",
      externalId: "entrepreneur",
      name: "entrepreneur",
      description:
        "A community of entrepreneurs sharing insights, ideas, and experiences about running a business.",
      subscriberCount: 1500000,
    },
  });

  const communitySaaS = await prisma.community.upsert({
    where: { source_externalId: { source: "reddit", externalId: "SaaS" } },
    update: {},
    create: {
      source: "reddit",
      externalId: "SaaS",
      name: "SaaS",
      description:
        "A subreddit for SaaS founders, product managers, and entrepreneurs to discuss building and growing software businesses.",
      subscriberCount: 95000,
    },
  });

  console.log(`  ✓ Communities: r/startups, r/entrepreneur, r/SaaS`);

  // ── Discussions + Opportunities ────────────────────────────────────────────
  // Each entry defines the Discussion (raw content) and the Opportunity
  // (product-specific scores + risk + reply). The Discussion is upserted on its
  // unique URL; the Opportunity is then upserted on (productId, discussionId).
  const records = [
    {
      discussion: {
        id: "seed-disc-01",
        source: "reddit" as const,
        externalId: "seed_startups_01",
        url: "https://www.reddit.com/r/startups/comments/seed_startups_01/",
        title: "What do you use to track client relationships as a solo founder?",
        body: "I've been freelancing for 3 years now and I've been through a few systems. Started with a spreadsheet, moved to Notion, tried HubSpot and found it way too complex for a one-person operation. Currently back to a spreadsheet but I feel like there has to be something better. What do you all use?",
        author: "indie_founder_alex",
        platformScore: 342,
        commentCount: 87,
        publishedAt: daysAgo(1),
        communityId: communityStartups.id,
      },
      opportunity: {
        id: "seed-opp-01",
        intentScore: 90,
        relevanceScore: 88,
        engagementScore: 84,
        recencyScore: 91,
        overallScore: 88,
        intentRationale:
          "The author is actively seeking alternatives to complex CRM tools, directly asking for recommendations. Clear high-intent signal for a lightweight CRM solution.",
        relevanceRationale:
          "The post mentions HubSpot (a FlowDesk competitor) being too complex, and is looking for a simpler client management tool — directly in FlowDesk's target market.",
        ruleViolationRisk: 12,
        promotionRisk: 18,
        linkRisk: 15,
        moderationRisk: 10,
        overallRisk: "low" as const,
        riskWarnings: [] as string[],
        riskRationale:
          "Standard recommendation thread. A helpful, product-focused reply is well within r/startups norms.",
        replyDraft:
          "Three years in, I've tried the same path — spreadsheet to Notion to HubSpot and back again. The insight that finally stuck: most solo founders don't need a CRM, they need a follow-up system.\n\nWhat actually works is keeping it embarrassingly simple: a short list of active leads with their last contact date and the agreed next step. That's it. No pipeline stages, no custom fields, no integrations.\n\nIf you want something purpose-built, look for tools specifically designed for 1–5 person operations, not lite versions of enterprise software. The interface should take less than 10 minutes to understand fully.",
      },
    },
    {
      discussion: {
        id: "seed-disc-02",
        source: "reddit" as const,
        externalId: "seed_entrepreneur_01",
        url: "https://www.reddit.com/r/entrepreneur/comments/seed_entrepreneur_01/",
        title: "I switched from HubSpot to a spreadsheet and I'm embarrassed it took me this long",
        body: "Running a solo consulting practice for 2 years. Finally admitted to myself that I was spending more time maintaining my CRM than it was saving me. HubSpot is a phenomenal product... for a 20-person sales team. I'm one person managing 15 clients. Switched to a simple Google Sheet last month and my stress level dropped significantly. Anyone else been through this CRM realization?",
        author: "bootstrapped_builder",
        platformScore: 891,
        commentCount: 213,
        publishedAt: daysAgo(2),
        communityId: communityEntrepreneur.id,
      },
      opportunity: {
        id: "seed-opp-02",
        intentScore: 85,
        relevanceScore: 92,
        engagementScore: 99,
        recencyScore: 82,
        overallScore: 90,
        intentRationale:
          "The author has identified exactly the problem FlowDesk solves: enterprise CRMs are bloated for solo operators. The post is generating active discussion about alternatives.",
        relevanceRationale:
          "High-signal thread — directly validates FlowDesk's core positioning that enterprise CRM features are overkill for small operations.",
        ruleViolationRisk: 28,
        promotionRisk: 62,
        linkRisk: 30,
        moderationRisk: 35,
        overallRisk: "medium" as const,
        riskWarnings: ["avoid_cta"] as string[],
        riskRationale:
          "Thread has high visibility (800+ upvotes). Promotional replies are likely to be flagged. Avoid direct calls to action.",
        replyDraft:
          "This is the CRM awakening almost every solo founder has — and it usually happens around the 12–18 month mark.\n\nHubSpot's free tier is an incredible product, but it's architected for pipeline management at scale. For a solo consultant, that architecture creates friction instead of reducing it.\n\nThe spreadsheet instinct is right. The key is being intentional about what three fields actually matter for your practice: who is the contact, when did you last reach out, and what's the concrete next action. Everything else is noise for a 15-client operation.",
      },
    },
    {
      discussion: {
        id: "seed-disc-03",
        source: "reddit" as const,
        externalId: "seed_saas_01",
        url: "https://www.reddit.com/r/SaaS/comments/seed_saas_01/",
        title: "How do you manage your sales pipeline as a solo SaaS founder?",
        body: "Building a B2B SaaS, currently doing outbound sales myself while also building the product. Finding it really hard to keep track of conversations, demos scheduled, proposals sent etc. Do you use a proper CRM or something simpler? Would love to know what's working for people at the 0-10 customer stage.",
        author: "saas_builder_dev",
        platformScore: 156,
        commentCount: 43,
        publishedAt: daysAgo(3),
        communityId: communitySaaS.id,
      },
      opportunity: {
        id: "seed-opp-03",
        intentScore: 88,
        relevanceScore: 85,
        engagementScore: 72,
        recencyScore: 74,
        overallScore: 82,
        intentRationale:
          "Direct ask about pipeline management tools at an early stage — exactly FlowDesk's target use case. The '0-10 customer stage' framing is ideal.",
        relevanceRationale:
          "Solo SaaS founder doing their own sales is a primary FlowDesk persona. Very high relevance.",
        ruleViolationRisk: 15,
        promotionRisk: 22,
        linkRisk: 18,
        moderationRisk: 14,
        overallRisk: "low" as const,
        riskWarnings: [] as string[],
        riskRationale:
          "r/SaaS is open to tool recommendations. A helpful, experience-focused reply fits naturally.",
        replyDraft:
          "At 0-10 customers, you're in the stage where speed of iteration matters more than process. Don't over-invest in CRM infrastructure yet.\n\nWhat works well at this stage: a simple list sorted by last contact date, with one sentence per lead summarizing where they stand. Add a follow-up date column and sort by it each morning.\n\nThe mistake most solo founders make is adding too many pipeline stages too early. You don't have enough data yet to know which stages matter for your specific sales motion.",
      },
    },
    {
      discussion: {
        id: "seed-disc-04",
        source: "reddit" as const,
        externalId: "seed_startups_02",
        url: "https://www.reddit.com/r/startups/comments/seed_startups_02/",
        title: "Just hit 50 freelance clients — how do you stay organized at this scale?",
        body: "When I was at 10-15 clients I could keep everything in my head. Now at 50 active relationships things are falling through the cracks. I've been using Airtable but it feels like I'm spending more time updating the CRM than doing actual work. Is there a point where a CRM becomes necessary vs overhead?",
        author: "scaling_freelancer",
        platformScore: 201,
        commentCount: 67,
        publishedAt: daysAgo(5),
        communityId: communityStartups.id,
      },
      opportunity: {
        id: "seed-opp-04",
        intentScore: 82,
        relevanceScore: 80,
        engagementScore: 78,
        recencyScore: 61,
        overallScore: 78,
        intentRationale:
          "50 clients at scale — the author is actively seeking a better solution. Pain point around 'spending more time updating the CRM' directly aligns with FlowDesk's value prop.",
        relevanceRationale:
          "Growing freelancer seeking lightweight client management — textbook FlowDesk target user.",
        ruleViolationRisk: 14,
        promotionRisk: 20,
        linkRisk: 16,
        moderationRisk: 12,
        overallRisk: "low" as const,
        riskWarnings: [] as string[],
        riskRationale:
          "Recommendation thread in r/startups — product mentions are expected and well-received.",
        replyDraft:
          "The jump from 15 to 50 clients is exactly when the 'keep it in my head' system breaks down — you're right on schedule.\n\nThe key at 50 relationships is information architecture, not more features. The two questions that need instant answers: who haven't I talked to in 30+ days, and who has a pending action item from our last conversation?\n\nAirtable has too much surface area for this — you end up maintaining the system rather than using it. Look for something where every interaction takes under 30 seconds to log.",
      },
    },
    {
      discussion: {
        id: "seed-disc-05",
        source: "reddit" as const,
        externalId: "seed_entrepreneur_02",
        url: "https://www.reddit.com/r/entrepreneur/comments/seed_entrepreneur_02/",
        title: "Best CRM under $30/month for freelancers? Tried them all and disappointed",
        body: "Tried: HubSpot (free but overwhelming), Pipedrive ($24/mo but overkill features), Zoho (free but terrible UX). Looking for something designed for a solo freelancer or consultant. Budget around $20-30/month. Main needs: track client conversations, set follow-up reminders, simple pipeline view.",
        author: "freelance_frustrated",
        platformScore: 445,
        commentCount: 128,
        publishedAt: daysAgo(4),
        communityId: communityEntrepreneur.id,
      },
      opportunity: {
        id: "seed-opp-05",
        intentScore: 95,
        relevanceScore: 90,
        engagementScore: 90,
        recencyScore: 67,
        overallScore: 89,
        intentRationale:
          "Extremely high intent — the author has already tried FlowDesk's main competitors and is still looking. Budget-qualified and has clear feature requirements.",
        relevanceRationale:
          "Perfect demographic: solo freelancer, defined budget, specific use cases that match FlowDesk exactly.",
        ruleViolationRisk: 45,
        promotionRisk: 62,
        linkRisk: 35,
        moderationRisk: 50,
        overallRisk: "medium" as const,
        riskWarnings: ["avoid_cta"] as string[],
        riskRationale:
          "Comparison/recommendation thread draws many product pitches. Community is sensitive to replies that feel like ads. Stay helpful rather than promotional.",
        replyDraft:
          "You've done the hard work already by eliminating the big names. The pattern you're describing — too complex, too expensive, bad UX — is why a lot of freelancers end up cycling through tools.\n\nFrom your requirements: conversation tracking, follow-up reminders, simple pipeline. You don't need most of what Pipedrive charges for. The key differentiator to look for is whether the tool treats you as a solo operator or as a small enterprise customer.\n\nA few things worth checking in any trial: How quickly can you log a new contact? Is there a clear 'who to follow up with today' view? Can you get started without watching a tutorial?",
      },
    },
    {
      discussion: {
        id: "seed-disc-06",
        source: "reddit" as const,
        externalId: "seed_saas_02",
        url: "https://www.reddit.com/r/SaaS/comments/seed_saas_02/",
        title: "Show r/SaaS: I built my own client management system because nothing fit",
        body: "Been freelancing as a designer for 4 years and tried every CRM. Finally gave up and built my own in Notion. Sharing the template because several friends asked. Main insight: for freelancers, the most important thing isn't pipeline stages — it's knowing who you haven't talked to recently.",
        author: "notionmaster_dev",
        platformScore: 312,
        commentCount: 89,
        publishedAt: daysAgo(7),
        communityId: communitySaaS.id,
      },
      opportunity: {
        id: "seed-opp-06",
        intentScore: 60,
        relevanceScore: 78,
        engagementScore: 84,
        recencyScore: 50,
        overallScore: 70,
        intentRationale:
          "The author has built their own solution, reducing direct purchase intent. However, the thread validates the exact problem FlowDesk solves and surfaces others in the target market.",
        relevanceRationale:
          "Strong signal of market pain — a designer built a DIY solution because commercial options didn't fit. Engaging adds value.",
        ruleViolationRisk: 20,
        promotionRisk: 32,
        linkRisk: 25,
        moderationRisk: 18,
        overallRisk: "low" as const,
        riskWarnings: [] as string[],
        riskRationale:
          "r/SaaS welcomes discussion of tools. The thread is about a DIY solution — a complementary perspective is welcome.",
        replyDraft:
          "Your insight about recency being more important than pipeline stages is exactly right — and it's something most CRM designers miss because they're building for sales managers, not solo practitioners.\n\nFor a freelance operation, the critical workflow is: open app → see who you haven't contacted in 14+ days → take action. Everything else in most CRMs is infrastructure for teams that don't exist in your business.\n\nCurious how you've handled the 'what was the last conversation about' problem in your Notion setup. That's usually where simple date-tracking solutions fall short.",
      },
    },
    {
      discussion: {
        id: "seed-disc-07",
        source: "reddit" as const,
        externalId: "seed_startups_03",
        url: "https://www.reddit.com/r/startups/comments/seed_startups_03/",
        title: "Anyone using Notion as a CRM? Worth it for early-stage?",
        body: "We're 2 founders, pre-revenue, starting to do outreach. Thinking about using Notion instead of a real CRM to keep things lightweight. Has anyone run a sales process on Notion? Is there a point where you switch to something dedicated?",
        author: "two_founder_startup",
        platformScore: 89,
        commentCount: 31,
        publishedAt: daysAgo(10),
        communityId: communityStartups.id,
      },
      opportunity: {
        id: "seed-opp-07",
        intentScore: 65,
        relevanceScore: 72,
        engagementScore: 66,
        recencyScore: 37,
        overallScore: 65,
        intentRationale:
          "Pre-revenue founders evaluating tools — medium intent. They're asking about Notion vs dedicated CRM, which opens the door for a comparison.",
        relevanceRationale:
          "Founders considering lightweight CRM options are the target audience. The question of 'when to switch' is an opportunity to discuss tradeoffs.",
        ruleViolationRisk: 18,
        promotionRisk: 28,
        linkRisk: 20,
        moderationRisk: 15,
        overallRisk: "low" as const,
        riskWarnings: [] as string[],
        riskRationale:
          "General discussion thread — recommendation responses are welcome and expected.",
        replyDraft:
          "Notion is a solid choice at 0 customers — you can move fast and it's flexible. The switch point is typically when you find yourself scrolling through a database looking for 'who haven't we followed up with' and the answer isn't obvious.\n\nFor two founders doing outreach together, the table-view limitation in Notion is usually the first friction point: who owns which lead, and is there a clear handoff when one of you takes a call?\n\nMy rule of thumb: use Notion until maintaining it starts costing you deals. Most two-founder teams hit that around 30–50 active conversations.",
      },
    },
    {
      discussion: {
        id: "seed-disc-08",
        source: "reddit" as const,
        externalId: "seed_entrepreneur_03",
        url: "https://www.reddit.com/r/entrepreneur/comments/seed_entrepreneur_03/",
        title: "Share your stack: what tools are you using to run your solo business in 2025?",
        body: "Curious what tools people are running their solo businesses on in 2025. Share your full stack! I'm currently using: Notion (planning), Wave (accounting), Calendly (scheduling), Gmail (everything else). What am I missing?",
        author: "solopreneur_stacker",
        platformScore: 1240,
        commentCount: 456,
        publishedAt: daysAgo(8),
        communityId: communityEntrepreneur.id,
      },
      opportunity: {
        id: "seed-opp-08",
        intentScore: 40,
        relevanceScore: 55,
        engagementScore: 100,
        recencyScore: 45,
        overallScore: 58,
        intentRationale:
          "Low direct purchase intent — general stack-sharing thread. However, the author's stack has no CRM, which surfaces an opening.",
        relevanceRationale:
          "The author manages client relationships in Gmail and Notion — a pain point FlowDesk addresses.",
        ruleViolationRisk: 35,
        promotionRisk: 62,
        linkRisk: 30,
        moderationRisk: 45,
        overallRisk: "medium" as const,
        riskWarnings: ["avoid_cta"] as string[],
        riskRationale:
          "High-visibility thread (1200+ upvotes) with many participants sharing their stacks. Product-focused replies risk looking promotional.",
        replyDraft:
          "Great stack! The gap I notice: no dedicated client relationship tracking. If your business involves selling or maintaining client relationships (consulting, services, partnerships), you'll eventually feel the pain of 'when did I last follow up with X' being buried in Gmail search.\n\nFor solo businesses, the CRM requirement is usually much simpler than software companies design for: a list of contacts, a date for last contact, and a field for the agreed next step. Before adding more tooling, try adding a simple 'clients' table to your existing Notion and see if the friction around tracking relationships is worth solving.",
      },
    },
    {
      discussion: {
        id: "seed-disc-09",
        source: "reddit" as const,
        externalId: "seed_saas_03",
        url: "https://www.reddit.com/r/SaaS/comments/seed_saas_03/",
        title: "What features would make you pay $20/mo for a CRM as a solo founder?",
        body: "Building a CRM focused on solo operators. Trying to understand what the minimum viable feature set is. Currently planning: contact management, basic pipeline, follow-up reminders, Gmail sync. What am I missing? What would you not pay for?",
        author: "crm_builder_2024",
        platformScore: 67,
        commentCount: 28,
        publishedAt: daysAgo(14),
        communityId: communitySaaS.id,
      },
      opportunity: {
        id: "seed-opp-09",
        intentScore: 20,
        relevanceScore: 45,
        engagementScore: 62,
        recencyScore: 25,
        overallScore: 38,
        intentRationale:
          "Low purchase intent — the author is building a competing CRM. The discussion reveals market insights but this user is unlikely to become a customer.",
        relevanceRationale:
          "Adjacent market discussion. Engaging helps understand competitor positioning and contributes to the community.",
        ruleViolationRisk: 22,
        promotionRisk: 35,
        linkRisk: 25,
        moderationRisk: 20,
        overallRisk: "low" as const,
        riskWarnings: [] as string[],
        riskRationale:
          "r/SaaS welcomes product discussions. Contributing as a user with experience with the problem is natural.",
        replyDraft:
          "As someone who has tried most CRMs in this space, the features you listed are mostly right. A few additions from experience:\n\nThe follow-up reminder is the most important feature — not a generic reminder, but one that surfaces 'this person hasn't heard from you in X days.' That's the problem most freelancers are actually trying to solve.\n\nWhat I would NOT pay for: email sync that requires full Gmail access. Too many solo operators are wary of granting those permissions. A manual 'log conversation' button is often enough.\n\nThe killer differentiator at $20: make the onboarding instant. No import wizard, no setup checklist — just start adding contacts immediately.",
      },
    },
    {
      discussion: {
        id: "seed-disc-10",
        source: "reddit" as const,
        externalId: "seed_startups_04",
        url: "https://www.reddit.com/r/startups/comments/seed_startups_04/",
        title: "The CRM market is broken and I'm tired of pretending it isn't",
        body: "Hot take: every CRM in existence was designed for VP of Sales at a 50-person startup, not the actual founders doing sales themselves. We have HubSpot, Salesforce, Pipedrive, Monday... all building features for managers to track their reps, not for founders to track their own deals. Am I missing something obvious?",
        author: "hot_take_founder",
        platformScore: 2103,
        commentCount: 412,
        publishedAt: daysAgo(21),
        communityId: communityStartups.id,
      },
      opportunity: {
        id: "seed-opp-10",
        intentScore: 30,
        relevanceScore: 65,
        engagementScore: 100,
        recencyScore: 13,
        overallScore: 55,
        intentRationale:
          "Low purchase intent — the author is venting about the market. High engagement surfaces others in the thread with actual intent.",
        relevanceRationale:
          "The post articulates FlowDesk's exact market positioning. Engaging is highly relevant for visibility among the target audience.",
        ruleViolationRisk: 72,
        promotionRisk: 78,
        linkRisk: 68,
        moderationRisk: 72,
        overallRisk: "high" as const,
        riskWarnings: ["avoid_links", "avoid_cta", "avoid_product_mention"] as string[],
        riskRationale:
          "2000+ upvote thread with active debate. Replies that mention specific products or link to external sites will be immediately flagged as marketing.",
        replyDraft:
          "You're not missing anything — you've correctly diagnosed why most founders bounce between CRMs every 6–12 months without finding one that sticks.\n\nThe fundamental design mismatch: enterprise CRM is about the manager's need to forecast and inspect rep performance. Founder CRM is about the founder's need to maintain momentum across 20–50 relationships personally.\n\nThose are genuinely different problems. The first requires hierarchy, quotas, and reporting. The second requires a quick answer to 'who do I need to reach out to today and what do I say?' The reason the market feels broken is that almost no one is solving the second problem at the product level — they're solving the first problem and marketing it to founders.",
      },
    },
  ];

  let count = 0;
  for (const record of records) {
    // Upsert Discussion (source-agnostic, unique on url)
    const discussion = await prisma.discussion.upsert({
      where: { url: record.discussion.url },
      update: {},
      create: {
        id: record.discussion.id,
        source: record.discussion.source,
        externalId: record.discussion.externalId,
        url: record.discussion.url,
        title: record.discussion.title,
        body: record.discussion.body,
        author: record.discussion.author,
        platformScore: record.discussion.platformScore,
        commentCount: record.discussion.commentCount,
        publishedAt: record.discussion.publishedAt,
        communityId: record.discussion.communityId,
      },
    });

    // Upsert Opportunity (product-specific scores + risk + reply)
    await prisma.opportunity.upsert({
      where: { id: record.opportunity.id },
      update: {},
      create: {
        id: record.opportunity.id,
        productId: product.id,
        discussionId: discussion.id,
        status: "scored",
        intentScore: record.opportunity.intentScore,
        relevanceScore: record.opportunity.relevanceScore,
        engagementScore: record.opportunity.engagementScore,
        recencyScore: record.opportunity.recencyScore,
        overallScore: record.opportunity.overallScore,
        scoringModel: "mock-ai-v1",
        intentRationale: record.opportunity.intentRationale,
        relevanceRationale: record.opportunity.relevanceRationale,
        ruleViolationRisk: record.opportunity.ruleViolationRisk,
        promotionRisk: record.opportunity.promotionRisk,
        linkRisk: record.opportunity.linkRisk,
        moderationRisk: record.opportunity.moderationRisk,
        overallRisk: record.opportunity.overallRisk,
        riskWarnings: record.opportunity.riskWarnings,
        riskRationale: record.opportunity.riskRationale,
        riskModel: "mock-ai-v1",
        replyDraft: record.opportunity.replyDraft,
        replyDraftModel: "mock-ai-v1",
      },
    });

    count++;
  }

  console.log(`  ✓ ${String(count)} discussions + opportunities created`);

  console.log("\n✅  Seed complete!");
  console.log("\n   Log in at http://localhost:3000");
  console.log("   Email:    demo@distribution.co");
  console.log("   Password: demo1234\n");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
