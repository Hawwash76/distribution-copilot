"use client";

import { use, useState } from "react";

import { useProduct } from "@/features/products/hooks/use-product";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { OpportunityRow } from "@/features/opportunities/components/opportunity-row";

interface OpportunitiesPageProps {
  params: Promise<{ id: string }>;
}

const PAGE_SIZE = 20;

export default function OpportunitiesPage({ params }: OpportunitiesPageProps) {
  const { id } = use(params);
  const { data: product } = useProduct(id);

  const [page, setPage] = useState(1);
  const [includeDismissed, setIncludeDismissed] = useState(false);

  const discoveryRecent =
    product?.lastDiscoveredAt &&
    Date.now() - new Date(product.lastDiscoveredAt).getTime() < 5 * 60 * 1000;

  const {
    data: result,
    isLoading,
    isError,
  } = useOpportunities(id, {
    page,
    pageSize: PAGE_SIZE,
    includeDismissed,
    refetchInterval: discoveryRecent ? 5_000 : false,
  });

  const opportunities = result?.items ?? [];
  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;

  return (
    <div>
      {discoveryRecent && (
        <p className="text-muted-foreground mb-4 text-sm">
          Discovery is running — this list updates automatically.
        </p>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDismissed}
            onChange={(e) => {
              setIncludeDismissed(e.target.checked);
              setPage(1);
            }}
            className="rounded"
          />
          Show dismissed
        </label>
        {result && (
          <span className="text-muted-foreground text-xs">
            {result.total} {result.total === 1 ? "opportunity" : "opportunities"}
          </span>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">Failed to load opportunities. Please try again.</p>
      )}

      {!isLoading && !isError && opportunities.length === 0 && (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No scored opportunities yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Click &ldquo;Find Opportunities&rdquo; on the Overview tab to start discovery.
          </p>
        </div>
      )}

      {opportunities.length > 0 && (
        <>
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <OpportunityRow key={opp.id} opp={opp} productId={id} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
