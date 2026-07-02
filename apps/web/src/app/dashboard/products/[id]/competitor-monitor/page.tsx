"use client";

import { use } from "react";

import { useCompetitorMonitor } from "@/features/competitor-monitor/hooks/use-competitor-monitor";
import { OpportunityRow } from "@/features/opportunities/components/opportunity-row";
import { useProductProfile } from "@/features/products/hooks/use-product-profile";

interface CompetitorMonitorPageProps {
  params: Promise<{ id: string }>;
}

export default function CompetitorMonitorPage({ params }: CompetitorMonitorPageProps) {
  const { id } = use(params);
  const { data: opportunities, isLoading, isError } = useCompetitorMonitor(id);
  const { data: profile } = useProductProfile(id);

  return (
    <div className="space-y-6">
      {profile && profile.competitors.length > 0 && (
        <div className="border-border rounded-lg border p-4">
          <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
            Tracking competitors
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.competitors.map((name) => (
              <span
                key={name}
                className="bg-muted text-foreground rounded px-2 py-0.5 text-sm font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-4 text-sm">
          Conversations where someone is frustrated with a competitor or actively comparing
          alternatives — the highest-conversion moments to engage.
        </p>

        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {isError && <p className="text-destructive text-sm">Failed to load competitor signals.</p>}

        {!isLoading && !isError && opportunities?.length === 0 && (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No competitor signals yet. Run discovery to find conversations mentioning your
              competitors.
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
    </div>
  );
}
