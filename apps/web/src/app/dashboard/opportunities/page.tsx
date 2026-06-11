"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type OpportunityStatus } from "@distribution-copilot/shared";

import { useProducts } from "@/features/products/hooks/use-products";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { OpportunityRow } from "@/features/opportunities/components/opportunity-row";

type SortKey = "score" | "date-desc" | "date-asc";

const STATUS_TABS: { value: "all" | OpportunityStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "scored", label: "Scored" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score ↓" },
  { value: "date-desc", label: "Newest" },
  { value: "date-asc", label: "Oldest" },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  const [activeStatus, setActiveStatus] = useState<"all" | OpportunityStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const { data: products, isLoading: isLoadingProducts } = useProducts();
  const {
    data: opportunities,
    isLoading: isLoadingOpportunities,
    isError,
  } = useOpportunities(productId ?? "");

  // Default to the first product when none is selected
  useEffect(() => {
    if (!productId && products && products.length > 0 && products[0]) {
      router.replace(`/dashboard/opportunities?productId=${products[0].id}`);
    }
  }, [productId, products, router]);

  const selectedProduct = products?.find((p) => p.id === productId);
  const isLoading = isLoadingProducts || (Boolean(productId) && isLoadingOpportunities);

  const filtered = useMemo(() => {
    if (!opportunities) return [];
    const byStatus =
      activeStatus === "all"
        ? opportunities
        : opportunities.filter((o) => o.status === activeStatus);
    return [...byStatus].sort((a, b) => {
      if (sortKey === "score") return (b.overallScore ?? -1) - (a.overallScore ?? -1);
      if (sortKey === "date-desc")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [opportunities, activeStatus, sortKey]);

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
      <div className="mb-6">
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

      {/* Filters + sort */}
      {!isLoading && opportunities && opportunities.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {/* Status tabs */}
          <div className="border-border flex rounded-md border p-0.5">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? opportunities.length
                  : opportunities.filter((o) => o.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveStatus(tab.value)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    activeStatus === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-60">{String(count)}</span>
                </button>
              );
            })}
          </div>

          {/* Sort select */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-offset-1"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Opportunities list */}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">Failed to load opportunities. Please try again.</p>
      )}

      {!isLoading && !isError && productId && opportunities && opportunities.length === 0 && (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No opportunities yet.</p>
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

      {!isLoading &&
        !isError &&
        productId &&
        filtered.length === 0 &&
        opportunities &&
        opportunities.length > 0 && (
          <div className="border-border rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No opportunities with status &ldquo;{activeStatus}&rdquo;.
            </p>
          </div>
        )}

      {!isLoading && filtered.length > 0 && productId && (
        <div className="space-y-3">
          {filtered.map((opp) => (
            <OpportunityRow key={opp.id} opp={opp} productId={productId} />
          ))}
        </div>
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
