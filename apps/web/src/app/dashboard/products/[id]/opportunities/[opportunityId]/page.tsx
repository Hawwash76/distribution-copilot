"use client";

import Link from "next/link";
import { use } from "react";

import { useOpportunity } from "@/features/opportunities/hooks/use-opportunity";

interface OpportunityDetailPageProps {
  params: Promise<{ id: string; opportunityId: string }>;
}

export default function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { id, opportunityId } = use(params);
  const { data: opp, isLoading, isError } = useOpportunity(id, opportunityId);

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (isError || !opp) return <p className="text-destructive text-sm">Opportunity not found.</p>;

  const publishedAt = new Date(opp.publishedAt);
  const ageDays = Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
  const ageLabel =
    ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${String(ageDays)} days ago`;

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
                <span className="text-foreground font-medium">r/{opp.communityId}</span>
                <span>·</span>
                <span>u/{opp.author}</span>
                <span>·</span>
                <span>{ageLabel}</span>
              </div>
            </div>
          </div>

          {/* Conversation context */}
          <div className="border-border mb-5 flex items-center gap-6 rounded-lg border px-4 py-3 text-sm">
            <span>
              <span className="font-medium">▲ {opp.score.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">upvotes</span>
            </span>
            <span>
              <span className="font-medium">💬 {opp.commentCount.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">comments</span>
            </span>
            <a
              href={opp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary ml-auto hover:underline"
            >
              View on Reddit ↗
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
              <ScoreBar label="Engagement" score={opp.engagementScore} />
              <ScoreBar label="Recency" score={opp.recencyScore} />
            </div>
          </div>

          {/* AI explanation */}
          {(opp.intentRationale ?? opp.relevanceRationale) && (
            <div className="border-border rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-medium">AI Explanation</h3>
              <div className="space-y-3">
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
