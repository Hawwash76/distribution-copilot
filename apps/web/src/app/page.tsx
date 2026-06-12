import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME, APP_DESCRIPTION } from "@distribution-copilot/config";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_DESCRIPTION}`,
  description: APP_DESCRIPTION,
};

const FEATURES = [
  {
    title: "6 discovery sources",
    description:
      "Reddit, Hacker News, Stack Overflow, Software Recs, Lobsters, and Dev.to — all natively integrated. No API keys to manage.",
  },
  {
    title: "AI relevance scoring",
    description:
      "Every conversation is scored for intent, relevance, and urgency by an AI that understands your product and its competitors.",
  },
  {
    title: "Risk assessment",
    description:
      "Know before you reply. Each opportunity is assessed for community-rule risk, spam perception, and over-promotion likelihood.",
  },
  {
    title: "Draft replies",
    description:
      "Get a context-aware first draft that you can edit before posting — never a wall of text, never off-brand.",
  },
  {
    title: "Human-in-the-loop",
    description:
      "You review and post manually. We never auto-post, auto-vote, or engage on your behalf. This is a product constraint — by design.",
  },
  {
    title: "Per-source monitoring",
    description:
      "Toggle each source per product. Once enabled, the system continuously checks for new conversations and scores them for you.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Discover",
    description: "Search Reddit, HN, and more for relevant conversations.",
  },
  {
    number: "02",
    title: "Score",
    description: "AI scores each discussion for intent, relevance, and urgency.",
  },
  {
    number: "03",
    title: "Assess",
    description: "Risk assessment tells you if and how to engage safely.",
  },
  {
    number: "04",
    title: "Draft + Post",
    description: "Review a pre-written reply, edit it, and post it yourself.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    features: ["3 products", "All 6 sources", "AI scoring + risk", "Reply drafts", "Email support"],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    features: [
      "Unlimited products",
      "All 6 sources",
      "AI scoring + risk",
      "Reply drafts",
      "Priority support",
    ],
    cta: "Get started",
    highlighted: true,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Nav */}
      <header className="border-border border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-semibold">{APP_NAME}</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-24">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find customers in the conversations{" "}
            <span className="text-primary">they&apos;re already having</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg sm:text-xl">
            Distribution Copilot scans Reddit, Hacker News, Stack Overflow, and more to surface
            high-intent discussions — then drafts a reply for you to review and post manually.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-6 py-3 text-center text-base font-medium transition-colors sm:w-auto"
            >
              Start free — 3-day trial
            </Link>
            <Link
              href="/login"
              className="border-border hover:bg-accent w-full rounded-md border px-6 py-3 text-center text-base font-medium transition-colors sm:w-auto"
            >
              Sign in
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 text-xs">No credit card required for trial.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-border bg-muted/30 border-t px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-primary mb-3 text-3xl font-bold">{step.number}</div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-border border-t px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
            Everything you need to distribute with intent
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-border rounded-lg border p-5">
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-border bg-muted/30 border-t px-4 py-20">
        <div className="container mx-auto max-w-3xl">
          <h2 className="mb-3 text-center text-2xl font-bold tracking-tight">Simple pricing</h2>
          <p className="text-muted-foreground mb-12 text-center text-sm">
            Start with a 3-day free trial, no card required.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-6 ${plan.highlighted ? "border-primary bg-card shadow-md" : "border-border"}`}
              >
                {plan.highlighted && (
                  <div className="text-primary mb-3 text-xs font-semibold uppercase tracking-wide">
                    Most popular
                  </div>
                )}
                <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <span className="text-base text-green-600">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-border hover:bg-accent border"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border border-t px-4 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
