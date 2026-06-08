"use client";

import Link from "next/link";

import { ProductCard } from "@/features/products/components/product-card";
import { useProducts } from "@/features/products/hooks/use-products";

export default function ProductsPage() {
  const { data: products, isLoading, isError } = useProducts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage the products you want to distribute.
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Add product
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">Failed to load products. Please try again.</p>
      )}

      {products && products.length === 0 && (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No products yet.</p>
          <Link
            href="/dashboard/products/new"
            className="text-primary mt-2 inline-block text-sm font-medium hover:underline"
          >
            Add your first product
          </Link>
        </div>
      )}

      {products && products.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
