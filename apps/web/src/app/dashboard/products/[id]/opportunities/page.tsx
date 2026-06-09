"use client";

import { use } from "react";

import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { OpportunityRow } from "@/features/opportunities/components/opportunity-row";

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
            Click &ldquo;Find Opportunities&rdquo; on the Overview tab to start discovery.
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
