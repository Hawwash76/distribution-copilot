import Link from "next/link";
import {
  type Opportunity,
  type OpportunityStatus,
  type SignalType,
} from "@distribution-copilot/shared";

import { useUpdateOpportunityStatus } from "../hooks/use-update-opportunity-status";
import { useDeleteOpportunity } from "../hooks/use-delete-opportunity";

/** Single row in an opportunities list with inline status actions. */
export function OpportunityRow({ opp, productId }: { opp: Opportunity; productId: string }) {
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOpportunityStatus(productId);
  const { mutate: deleteOpp, isPending: isDeleting } = useDeleteOpportunity(productId);

  const isPending = isUpdating || isDeleting;

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
    <div className="border-border flex items-start gap-4 rounded-lg border p-4">
      <ScorePill score={opp.overallScore} />

      {/* Clickable content area */}
      <Link
        href={`/dashboard/products/${productId}/opportunities/${opp.id}`}
        className="hover:bg-accent/30 -m-2 min-w-0 flex-1 rounded-md p-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium leading-snug">{opp.title}</p>
          <StatusBadge status={opp.status} />
        </div>
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
          {opp.signalType !== null && <SignalTypeBadge type={opp.signalType} />}
          {opp.overallRisk !== null && <RiskBadge level={opp.overallRisk} />}
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-1">
        {opp.status !== "reviewed" && (
          <ActionButton
            disabled={isPending}
            onClick={() => updateStatus({ opportunityId: opp.id, status: "reviewed" })}
            title="Mark as reviewed"
          >
            ✓
          </ActionButton>
        )}
        {opp.status !== "dismissed" && (
          <ActionButton
            disabled={isPending}
            onClick={() => updateStatus({ opportunityId: opp.id, status: "dismissed" })}
            title="Dismiss"
          >
            ✕
          </ActionButton>
        )}
        <ActionButton
          disabled={isPending}
          onClick={() => deleteOpp(opp.id)}
          title="Delete"
          variant="destructive"
        >
          🗑
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  title,
  variant = "default",
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  title: string;
  variant?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded text-xs transition-colors disabled:opacity-40 ${
        variant === "destructive"
          ? "hover:bg-destructive/10 text-destructive"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  const styles: Record<OpportunityStatus, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    scored: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    reviewed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    engaged: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    dismissed: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
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

const SIGNAL_TYPE_CONFIG: Record<SignalType, { label: string; className: string }> = {
  RECOMMENDATION_REQUEST: {
    label: "Recommendation",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  COMPETITOR_FRUSTRATION: {
    label: "Competitor frustration",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  ACTIVE_EVALUATION: {
    label: "Active evaluation",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  PAIN_EXPRESSION: {
    label: "Pain expression",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  BUDGET_SIGNAL: {
    label: "Budget signal",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  CATEGORY_RESEARCH: {
    label: "Category research",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
  },
};

export function SignalTypeBadge({ type }: { type: SignalType }) {
  const config = SIGNAL_TYPE_CONFIG[type];
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${config.className}`}>{config.label}</span>
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
