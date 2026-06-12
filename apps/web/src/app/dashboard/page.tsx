"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth-client";
import { useDashboardStats } from "@/features/stats/hooks/use-dashboard-stats";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = useDashboardStats();

  const toReview = (stats?.scoredCount ?? 0) + (stats?.reviewedCount ?? 0);
  const engageable = toReview + (stats?.engagedCount ?? 0);
  const engagementRate =
    engageable > 0 ? Math.round(((stats?.engagedCount ?? 0) / engageable) * 100) : null;

  // Onboarding state — derived from stats
  const hasProducts = (stats?.products.length ?? 0) > 0;
  const firstProduct = stats?.products[0];
  const firstProductHasProfile = firstProduct?.hasProfile ?? false;
  const hasRunDiscovery =
    (firstProduct?.opportunityCount ?? 0) > 0 ||
    (firstProduct?.lastDiscoveredAt !== null && firstProduct?.lastDiscoveredAt !== undefined);
  const showOnboarding =
    !isLoading && (!hasProducts || !firstProductHasProfile || !hasRunDiscovery);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Find relevant conversations and draft replies for your products.
        </p>
      </div>

      {/* Onboarding checklist — shown until the pipeline has run at least once */}
      {showOnboarding && (
        <div className="border-border bg-card mb-8 rounded-lg border p-6">
          <h2 className="mb-1 text-base font-semibold">Get started in 3 steps</h2>
          <p className="text-muted-foreground mb-5 text-sm">
            Complete these steps to start finding customers.
          </p>
          <ol className="space-y-4">
            <OnboardingStep
              done={hasProducts}
              number={1}
              title="Create your product"
              description="Tell the system what you're distributing."
              action={
                hasProducts
                  ? undefined
                  : { href: "/dashboard/products/new", label: "Create product →" }
              }
            />
            <OnboardingStep
              done={firstProductHasProfile}
              number={2}
              title="Generate an AI profile"
              description="The AI extracts your keywords, competitors, and target personas."
              action={
                hasProducts && !firstProductHasProfile
                  ? { href: `/dashboard/products/${firstProduct?.id}`, label: "Generate profile →" }
                  : undefined
              }
            />
            <OnboardingStep
              done={hasRunDiscovery}
              number={3}
              title="Run your first discovery"
              description="Search Reddit, HN, dev.to, and more for relevant conversations."
              action={
                firstProductHasProfile && !hasRunDiscovery
                  ? {
                      href: `/dashboard/products/${firstProduct?.id}`,
                      label: "Find Opportunities →",
                    }
                  : undefined
              }
            />
          </ol>
        </div>
      )}

      {/* Stat cards */}
      {!showOnboarding && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Opportunities"
            value={isLoading ? null : (stats?.totalOpportunities ?? 0)}
            href="/dashboard/opportunities"
          />
          <StatCard
            label="To Review"
            value={isLoading ? null : toReview}
            href="/dashboard/opportunities"
            highlight={toReview > 0}
          />
          <StatCard
            label="Engaged"
            value={isLoading ? null : (stats?.engagedCount ?? 0)}
            href="/dashboard/opportunities"
            accent="emerald"
          />
          <StatCard
            label="Engagement Rate"
            value={isLoading ? null : engagementRate}
            suffix="%"
            placeholder="—"
            accent={
              engagementRate !== null
                ? engagementRate >= 30
                  ? "emerald"
                  : engagementRate >= 10
                    ? "yellow"
                    : "default"
                : "default"
            }
          />
        </div>
      )}

      {/* Products overview */}
      {!isLoading && stats && stats.products.length > 0 && (
        <div className="border-border rounded-lg border">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-medium">Products</h2>
            <Link href="/dashboard/products" className="text-primary text-xs hover:underline">
              Manage →
            </Link>
          </div>
          <div className="divide-border divide-y">
            {stats.products.map((product) => {
              const lastRun = product.lastDiscoveredAt
                ? new Date(product.lastDiscoveredAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Never";
              const rate =
                product.opportunityCount > 0
                  ? Math.round((product.engagedCount / product.opportunityCount) * 100)
                  : null;

              return (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                >
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="hover:text-primary min-w-0 flex-1 truncate font-medium transition-colors"
                  >
                    {product.name}
                  </Link>
                  {!product.hasProfile && (
                    <span className="text-muted-foreground shrink-0 rounded bg-yellow-100 px-1.5 py-0.5 text-xs dark:bg-yellow-900/30">
                      No profile
                    </span>
                  )}
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {String(product.opportunityCount)} opp.
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {String(product.engagedCount)} engaged
                    {rate !== null && <span className="ml-1 opacity-60">({String(rate)}%)</span>}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    Last run: {lastRun}
                  </span>
                  <Link
                    href={`/dashboard/opportunities?productId=${product.id}`}
                    className="text-primary shrink-0 text-xs hover:underline"
                  >
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingStep({
  done,
  number,
  title,
  description,
  action,
}: {
  done: boolean;
  number: number;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <li className="flex items-start gap-4">
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "✓" : String(number)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
          {title}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        {action && !done && (
          <Link
            href={action.href}
            className="text-primary mt-1 inline-block text-xs hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
    </li>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
  placeholder = "0",
  href,
  highlight = false,
  accent = "default",
}: {
  label: string;
  value: number | null;
  suffix?: string;
  placeholder?: string;
  href?: string;
  highlight?: boolean;
  accent?: "default" | "emerald" | "yellow";
}) {
  const valueStr = value === null ? placeholder : `${String(value)}${suffix}`;
  const valueColor =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "yellow"
        ? "text-yellow-600 dark:text-yellow-400"
        : highlight
          ? "text-primary"
          : "text-foreground";

  const card = (
    <div
      className={`border-border bg-card rounded-lg border p-5 ${href ? "hover:bg-accent/50 transition-colors" : ""}`}
    >
      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      {value === null && !valueStr ? (
        <div className="bg-muted h-8 w-16 animate-pulse rounded" />
      ) : (
        <p className={`text-3xl font-bold ${valueColor}`}>{valueStr}</p>
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
