"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useProducts } from "@/features/products/hooks/use-products";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { OpportunityRow } from "@/features/opportunities/components/opportunity-row";

const PAGE_SIZE = 20;

export default function OpportunitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  const [page, setPage] = useState(1);
  const [includeDismissed, setIncludeDismissed] = useState(false);

  const { data: products, isLoading: isLoadingProducts } = useProducts();
  const {
    data: result,
    isLoading: isLoadingOpportunities,
    isError,
  } = useOpportunities(productId ?? "", { page, pageSize: PAGE_SIZE, includeDismissed });

  // Default to the first product when none is selected
  useEffect(() => {
    if (!productId && products && products.length > 0 && products[0]) {
      router.replace(`/dashboard/opportunities?productId=${products[0].id}`);
    }
  }, [productId, products, router]);

  // Reset to page 1 when product or filter changes
  useEffect(() => {
    setPage(1);
  }, [productId, includeDismissed]);

  const opportunities = result?.items ?? [];
  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const selectedProduct = products?.find((p) => p.id === productId);
  const isLoading = isLoadingProducts || (Boolean(productId) && isLoadingOpportunities);

  // ── No products ─────────────────────────────────────────────────────────
  if (!isLoadingProducts && products && products.length === 0) {
    return (
      <div>
        <PageHeader />
        <div className="border-border mt-6 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No products yet.</p>
          <Link
            href="/dashboard/products/new"
            className="text-primary mt-2 inline-block text-sm hover:underline"
          >
            Create your first product →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader />

      {/* Product selector */}
      <div className="mb-4">
        {isLoadingProducts ? (
          <div className="bg-muted h-9 w-64 animate-pulse rounded-md" />
        ) : (
          <select
            value={productId ?? ""}
            onChange={(e) => {
              router.replace(`/dashboard/opportunities?productId=${e.target.value}`);
            }}
            className="border-border bg-background text-foreground w-full max-w-xs rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
          >
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filter bar */}
      {productId && (
        <div className="mb-4 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDismissed}
              onChange={(e) => setIncludeDismissed(e.target.checked)}
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
      )}

      {/* Opportunities list */}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">Failed to load opportunities. Please try again.</p>
      )}

      {!isLoading && !isError && productId && opportunities.length === 0 && (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No scored opportunities yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Go to the{" "}
            <Link
              href={`/dashboard/products/${productId}`}
              className="text-primary hover:underline"
            >
              {selectedProduct?.name ?? "product page"}
            </Link>{" "}
            and click &ldquo;Find Opportunities&rdquo; to start discovery.
          </p>
        </div>
      )}

      {!isLoading && opportunities.length > 0 && productId && (
        <>
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <OpportunityRow key={opp.id} opp={opp} productId={productId} />
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

function PageHeader() {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight">Opportunities</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Ranked conversations worth engaging with.
      </p>
    </div>
  );
}
