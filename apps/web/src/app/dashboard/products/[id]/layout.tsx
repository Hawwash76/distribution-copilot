"use client";

import Link from "next/link";
import { use } from "react";
import { usePathname } from "next/navigation";

import { useProduct } from "@/features/products/hooks/use-product";

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Product workspace layout — wraps all /dashboard/products/[id]/* routes.
 * Renders the shared product header (name + back link) and the Overview /
 * Opportunities tab nav. Tabs are shown only on the overview and opportunities
 * list pages; sub-pages (edit, opportunity detail) inherit the header only.
 */
export default function ProductLayout({ children, params }: ProductLayoutProps) {
  const { id } = use(params);
  const { data: product } = useProduct(id);
  const pathname = usePathname();

  const overviewPath = `/dashboard/products/${id}`;
  const opportunitiesPath = `/dashboard/products/${id}/opportunities`;
  const isOverview = pathname === overviewPath;
  const isOpportunitiesList = pathname === opportunitiesPath;
  const showTabs = isOverview || isOpportunitiesList;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="text-muted-foreground hover:text-foreground mb-2 inline-block text-sm transition-colors"
        >
          ← Products
        </Link>
        <div>
          <Link
            href={overviewPath}
            className="text-foreground hover:text-foreground/80 text-2xl font-semibold tracking-tight transition-colors"
          >
            {product?.name ?? <span className="text-muted-foreground text-lg">Loading…</span>}
          </Link>
          {product?.website && (
            <a
              href={product.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-0.5 block text-sm hover:underline"
            >
              {product.website}
            </a>
          )}
        </div>
      </div>

      {showTabs && (
        <div className="border-border mb-6 border-b">
          <nav className="-mb-px flex gap-6">
            <Link
              href={overviewPath}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                isOverview
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              Overview
            </Link>
            <Link
              href={opportunitiesPath}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                isOpportunitiesList
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              Opportunities
            </Link>
          </nav>
        </div>
      )}

      {children}
    </div>
  );
}
