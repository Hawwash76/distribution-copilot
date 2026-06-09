import Link from "next/link";
import { type Opportunity } from "@distribution-copilot/shared";

/** Single row in an opportunities list, linking to the opportunity detail page. */
export function OpportunityRow({ opp, productId }: { opp: Opportunity; productId: string }) {
  const publishedAt = opp.publishedAt ? new Date(opp.publishedAt) : null;
  const ageDays = publishedAt
    ? Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const ageLabel =
    ageDays === null
      ? "—"
      : ageDays === 0
        ? "today"
        : ageDays === 1
          ? "yesterday"
          : `${String(ageDays)}d ago`;

  return (
    <Link
      href={`/dashboard/products/${productId}/opportunities/${opp.id}`}
      className="border-border hover:bg-accent/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
    >
      <ScorePill score={opp.overallScore} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{opp.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {opp.communityName ?? opp.communityId ?? opp.source} · {opp.author ?? "unknown"} ·{" "}
          {ageLabel}
        </p>
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-xs">
          <span>▲ {opp.score?.toLocaleString() ?? "—"}</span>
          <span>💬 {opp.commentCount?.toLocaleString() ?? "—"}</span>
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

export function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
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

export function ScorePill({ score }: { score: number | null }) {
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
