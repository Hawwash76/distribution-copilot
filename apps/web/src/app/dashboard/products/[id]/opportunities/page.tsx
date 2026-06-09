"use client";

import Link from "next/link";
import { use } from "react";
import { type Opportunity } from "@distribution-copilot/shared";

import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";

interface OpportunitiesPageProps {
  params: Promise<{ id: string }>;
}

export default function OpportunitiesPage({ params }: OpportunitiesPageProps) {
  const { id } = use(params);
  const { data: opportunities, isLoading, isError } = useOpportunities(id);

  return (
    <div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">Failed to load opportunities. Please try again.</p>
      )}

      {opportunities && opportunities.length === 0 && (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No scored opportunities yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Trigger discovery from the product page to find conversations.
          </p>
        </div>
      )}

      {opportunities && opportunities.length > 0 && (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <OpportunityRow key={opp.id} opp={opp} productId={id} />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityRow({ opp, productId }: { opp: Opportunity; productId: string }) {
  const ageDays = Math.floor(
    (Date.now() - new Date(opp.publishedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const ageLabel =
    ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${String(ageDays)}d ago`;

  return (
    <Link
      href={`/dashboard/products/${productId}/opportunities/${opp.id}`}
      className="border-border hover:bg-accent/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
    >
      <ScorePill score={opp.overallScore} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{opp.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          r/{opp.communityName ?? opp.communityId} · u/{opp.author} · {ageLabel}
        </p>
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-xs">
          <span>▲ {opp.score.toLocaleString()}</span>
          <span>💬 {opp.commentCount.toLocaleString()}</span>
          {opp.intentScore !== null && (
            <span className="text-foreground/60">
              Intent {opp.intentScore} · Relevance {opp.relevanceScore}
            </span>
          )}
          {opp.overallRisk !== null && <RiskBadge level={opp.overallRisk} />}
        </div>
      </div>
    </Link>
  );
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels = { low: "Low risk", medium: "Med risk", high: "High risk" };

  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${styles[level]}`}>{labels[level]}</span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        —
      </div>
    );
  }

  const colorClass =
    score >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : score >= 60
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
        : score >= 40
          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {score}
    </div>
  );
}
