"use client";

import Link from "next/link";
import { use, useState } from "react";
import { type SignalType } from "@distribution-copilot/shared";

import { useOpportunity } from "@/features/opportunities/hooks/use-opportunity";
import { useEngageOpportunity } from "@/features/opportunities/hooks/use-engage-opportunity";
import { useRegenerateReply } from "@/features/opportunities/hooks/use-regenerate-reply";

interface OpportunityDetailPageProps {
  params: Promise<{ id: string; opportunityId: string }>;
}

export default function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { id, opportunityId } = use(params);
  const { data: opp, isLoading, isError } = useOpportunity(id, opportunityId);
  const engageMutation = useEngageOpportunity(id);
  const regenerateMutation = useRegenerateReply(id);

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (isError || !opp) return <p className="text-destructive text-sm">Opportunity not found.</p>;

  const publishedAt = opp.publishedAt ? new Date(opp.publishedAt) : null;
  const ageDays = publishedAt
    ? Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const ageLabel =
    ageDays === null
      ? "unknown age"
      : ageDays === 0
        ? "today"
        : ageDays === 1
          ? "yesterday"
          : `${String(ageDays)} days ago`;

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <Link
        href={`/dashboard/products/${id}/opportunities`}
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm transition-colors"
      >
        ← Opportunities
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Left: Reddit post */}
        <div className="min-w-0">
          <div className="mb-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold leading-snug">{opp.title}</h2>
              <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-foreground font-medium">
                  {opp.communityName ?? opp.communityId ?? opp.source}
                </span>
                <span>·</span>
                <span>{opp.author ?? "unknown"}</span>
                <span>·</span>
                <span>{ageLabel}</span>
              </div>
            </div>
          </div>

          {/* Conversation context */}
          <div className="border-border mb-5 flex items-center gap-6 rounded-lg border px-4 py-3 text-sm">
            <span>
              <span className="font-medium">▲ {opp.score?.toLocaleString() ?? "—"}</span>
              <span className="text-muted-foreground ml-1">upvotes</span>
            </span>
            <span>
              <span className="font-medium">💬 {opp.commentCount?.toLocaleString() ?? "—"}</span>
              <span className="text-muted-foreground ml-1">comments</span>
            </span>
            <a
              href={opp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary ml-auto hover:underline"
            >
              View source ↗
            </a>
          </div>

          {/* Post body */}
          {opp.body ? (
            <div className="border-border rounded-lg border p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{opp.body}</p>
            </div>
          ) : (
            <div className="border-border rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-sm">
                No post body — link or title-only post.
              </p>
            </div>
          )}
        </div>

        {/* Right: Scores & AI explanation */}
        <div className="space-y-6">
          {/* Overall score */}
          <div className="border-border rounded-lg border p-4 text-center">
            <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
              Overall Score
            </p>
            <div className={`mx-auto mb-1 text-5xl font-bold ${overallColor(opp.overallScore)}`}>
              {opp.overallScore ?? "—"}
            </div>
            <p className="text-muted-foreground text-xs">/100</p>
          </div>

          {/* Score breakdown */}
          <div className="border-border rounded-lg border p-4">
            <h3 className="mb-4 text-sm font-medium">Score Breakdown</h3>
            <div className="space-y-3">
              <ScoreBar label="Intent" score={opp.intentScore} />
              <ScoreBar label="Relevance" score={opp.relevanceScore} />
              <ScoreBar label="Pain" score={opp.painScore} />
              <ScoreBar label="Urgency" score={opp.urgencyScore} />
              <ScoreBar label="Engagement" score={opp.engagementScore} />
              <ScoreBar label="Recency" score={opp.recencyScore} />
            </div>
          </div>

          {/* AI explanation */}
          {(opp.intentRationale ?? opp.relevanceRationale ?? opp.signalType) && (
            <div className="border-border rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-medium">AI Explanation</h3>
              <div className="space-y-3">
                {opp.signalType && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                      Signal
                    </p>
                    <SignalTypeBadge type={opp.signalType} />
                    {opp.signalRationale && (
                      <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                        {opp.signalRationale}
                      </p>
                    )}
                  </div>
                )}
                {opp.intentRationale && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                      Intent
                    </p>
                    <p className="text-sm leading-relaxed">{opp.intentRationale}</p>
                  </div>
                )}
                {opp.relevanceRationale && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                      Relevance
                    </p>
                    <p className="text-sm leading-relaxed">{opp.relevanceRationale}</p>
                  </div>
                )}
              </div>
              {opp.scoringModel && (
                <p className="text-muted-foreground mt-3 text-xs">Model: {opp.scoringModel}</p>
              )}
            </div>
          )}

          {/* Draft reply */}
          {opp.replyDraft !== null && (
            <DraftReplyCard
              draft={opp.replyDraft}
              model={opp.replyDraftModel}
              isRegenerating={regenerateMutation.isPending}
              onRegenerate={() => regenerateMutation.mutate({ opportunityId: opp.id })}
            />
          )}

          {/* Engagement tracking */}
          <EngagementCard
            opportunityId={opp.id}
            engagedAt={opp.engagedAt}
            engagedReply={opp.engagedReply}
            isPending={engageMutation.isPending}
            onSubmit={(reply) => engageMutation.mutate({ opportunityId: opp.id, reply })}
          />

          {/* Risk assessment */}
          {opp.overallRisk !== null && (
            <div className="border-border rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium">Engagement Risk</h3>
                <RiskLevelBadge level={opp.overallRisk} />
              </div>

              <div className="mb-4 space-y-3">
                <RiskBar label="Rule violation" score={opp.ruleViolationRisk} />
                <RiskBar label="Promotion" score={opp.promotionRisk} />
                <RiskBar label="Link" score={opp.linkRisk} />
                <RiskBar label="Moderation" score={opp.moderationRisk} />
              </div>

              {opp.riskWarnings.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {opp.riskWarnings.map((w) => (
                    <WarningPill key={w} warning={w} />
                  ))}
                </div>
              )}

              {opp.riskRationale && (
                <p className="text-muted-foreground text-xs leading-relaxed">{opp.riskRationale}</p>
              )}

              {opp.riskModel && (
                <p className="text-muted-foreground mt-3 text-xs">Model: {opp.riskModel}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function overallColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score ?? 0;
  const barColor =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
        ? "bg-yellow-500"
        : pct >= 40
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score ?? "—"}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${score !== null ? barColor : "bg-muted"}`}
          style={{ width: `${String(pct)}%` }}
        />
      </div>
    </div>
  );
}

/** Like ScoreBar but colors are inverted — higher score means higher risk. */
function RiskBar({ label, score }: { label: string; score: number | null }) {
  const pct = score ?? 0;
  const barColor = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score ?? "—"}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${score !== null ? barColor : "bg-muted"}`}
          style={{ width: `${String(pct)}%` }}
        />
      </div>
    </div>
  );
}

function RiskLevelBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels = { low: "Low", medium: "Medium", high: "High" };

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

const WARNING_LABELS: Record<string, string> = {
  avoid_links: "Avoid links",
  avoid_cta: "Avoid CTAs",
  avoid_product_mention: "Avoid product mention",
};

function WarningPill({ warning }: { warning: string }) {
  return (
    <span className="bg-destructive/10 text-destructive rounded px-2 py-0.5 text-xs font-medium">
      ⚠ {WARNING_LABELS[warning] ?? warning}
    </span>
  );
}

const SIGNAL_TYPE_CONFIG: Record<SignalType, { label: string; className: string }> = {
  RECOMMENDATION_REQUEST: {
    label: "Recommendation request",
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

function SignalTypeBadge({ type }: { type: SignalType }) {
  const config = SIGNAL_TYPE_CONFIG[type];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function DraftReplyCard({
  draft,
  model,
  isRegenerating,
  onRegenerate,
}: {
  draft: string;
  model: string | null;
  isRegenerating: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border-border rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Draft Reply</h3>
        <div className="flex gap-1.5">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="border-border hover:bg-accent rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            onClick={handleCopy}
            className="border-border hover:bg-accent rounded px-2 py-1 text-xs font-medium transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      <p className="border-border bg-muted/40 mb-3 whitespace-pre-wrap rounded border p-3 text-sm leading-relaxed">
        {draft}
      </p>

      <p className="text-muted-foreground text-xs">Review and edit before posting manually.</p>

      {model && <p className="text-muted-foreground mt-1 text-xs">Model: {model}</p>}
    </div>
  );
}

function EngagementCard({
  opportunityId: _opportunityId,
  engagedAt,
  engagedReply,
  isPending,
  onSubmit,
}: {
  opportunityId: string;
  engagedAt: Date | null;
  engagedReply: string | null;
  isPending: boolean;
  onSubmit: (reply: string) => void;
}) {
  const [reply, setReply] = useState(engagedReply ?? "");

  if (engagedAt) {
    const engagedDate = new Date(engagedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return (
      <div className="border-border rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-medium">Engagement</h3>
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            Engaged
          </span>
          <span className="text-muted-foreground ml-auto text-xs">{engagedDate}</span>
        </div>
        {engagedReply && (
          <p className="border-border bg-muted/40 whitespace-pre-wrap rounded border p-3 text-sm leading-relaxed">
            {engagedReply}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border-border rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-medium">Mark as Engaged</h3>
      <p className="text-muted-foreground mb-3 text-xs">
        After you post your reply manually, record it here to track your outreach.
      </p>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={4}
        placeholder="Paste the reply you posted…"
        className="border-border bg-background text-foreground placeholder:text-muted-foreground mb-3 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
      />
      <button
        type="button"
        disabled={reply.trim().length === 0 || isPending}
        onClick={() => onSubmit(reply.trim())}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Mark as engaged"}
      </button>
    </div>
  );
}
