"use client";

import { use } from "react";

import { usePainPoints } from "@/features/research/hooks/use-pain-points";
import { PainPointCard } from "@/features/research/components/pain-point-card";

interface ResearchPageProps {
  params: Promise<{ id: string }>;
}

export default function ResearchPage({ params }: ResearchPageProps) {
  const { id } = use(params);
  const { data: painPoints, isLoading, isError } = usePainPoints(id);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted h-32 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive text-sm">Failed to load research data.</p>;
  }

  if (!painPoints || painPoints.length === 0) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        <p className="font-medium">No pain points yet.</p>
        <p className="mt-1">
          Run discovery to find discussions — pain points are extracted automatically as
          opportunities are scored.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-5 text-sm">
        Pain points extracted from {String(painPoints.length)} theme
        {painPoints.length === 1 ? "" : "s"} across scored discussions, ranked by frequency ×
        intensity.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {painPoints.map((pp) => (
          <PainPointCard key={pp.theme} painPoint={pp} />
        ))}
      </div>
    </div>
  );
}
