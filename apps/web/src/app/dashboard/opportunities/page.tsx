"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type OpportunitySource,
  type OpportunityStatus,
  type SignalType,
} from "@distribution-copilot/shared";

import { useProducts } from "@/features/products/hooks/use-products";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { OpportunityRow } from "@/features/opportunities/components/opportunity-row";

type SortKey = "score" | "date-desc" | "date-asc";
type SignalFilter = "all" | SignalType;
type SourceFilter = "all" | OpportunitySource;

const SIGNAL_FILTER_OPTIONS: { value: SignalFilter; label: string }[] = [
  { value: "all", label: "All signals" },
  { value: "RECOMMENDATION_REQUEST", label: "Recommendation" },
  { value: "COMPETITOR_FRUSTRATION", label: "Competitor frustration" },
  { value: "ACTIVE_EVALUATION", label: "Active evaluation" },
  { value: "PAIN_EXPRESSION", label: "Pain expression" },
  { value: "BUDGET_SIGNAL", label: "Budget signal" },
  { value: "CATEGORY_RESEARCH", label: "Category research" },
];

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "reddit", label: "Reddit" },
  { value: "hackernews", label: "Hacker News" },
  { value: "stackoverflow", label: "Stack Overflow" },
  { value: "lobsters", label: "Lobsters" },
  { value: "devto", label: "DEV.to" },
  { value: "web", label: "Web" },
];

const STATUS_TABS: { value: "all" | OpportunityStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "scored", label: "Scored" },
  { value: "reviewed", label: "Reviewed" },
  { value: "engaged", label: "Engaged" },
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
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
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

  const isProcessing = Boolean(opportunities?.some((o) => o.status === "new"));

  const filtered = useMemo(() => {
    if (!opportunities) return [];
    const byStatus =
      activeStatus === "all"
        ? opportunities
        : opportunities.filter((o) => o.status === activeStatus);
    const bySignal =
      signalFilter === "all" ? byStatus : byStatus.filter((o) => o.signalType === signalFilter);
    const bySource =
      sourceFilter === "all" ? bySignal : bySignal.filter((o) => o.source === sourceFilter);
    return [...bySource].sort((a, b) => {
      if (sortKey === "score") return (b.overallScore ?? -1) - (a.overallScore ?? -1);
      if (sortKey === "date-desc")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [opportunities, activeStatus, signalFilter, sourceFilter, sortKey]);

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

      {/* Processing banner — visible while the scoring pipeline is running */}
      {isProcessing && (
        <div className="bg-primary/5 border-primary/20 mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
          <span className="bg-primary inline-block h-2 w-2 animate-pulse rounded-full" />
          <span className="text-foreground font-medium">
            Discovery is running — scoring opportunities in the background.
          </span>
          <span className="text-muted-foreground ml-auto text-xs">Refreshes automatically</span>
        </div>
      )}

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

          <div className="flex items-center gap-2">
            {/* Source filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-offset-1"
            >
              {SOURCE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Signal type filter */}
            <select
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value as SignalFilter)}
              className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-offset-1"
            >
              {SIGNAL_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

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
