"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";

import { useProduct } from "@/features/products/hooks/use-product";
import { useDeleteProduct } from "@/features/products/hooks/use-delete-product";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError } = useProduct(id);
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  function handleDelete() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteProduct(id, {
      onSuccess: () => router.push("/dashboard/products"),
    });
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (isError || !product) {
    return <p className="text-destructive text-sm">Product not found.</p>;
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/products"
            className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm transition-colors"
          >
            ← Back to products
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">{product.name}</h2>
          {product.website && (
            <a
              href={product.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-0.5 inline-block text-sm hover:underline"
            >
              {product.website}
            </a>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/dashboard/products/${id}/edit`}
            className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:bg-destructive/10 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <dl className="space-y-5">
        {product.description && (
          <div>
            <dt className="text-sm font-medium">Description</dt>
            <dd className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">
              {product.description}
            </dd>
          </div>
        )}
        {product.audience && (
          <div>
            <dt className="text-sm font-medium">Target Audience</dt>
            <dd className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">
              {product.audience}
            </dd>
          </div>
        )}
        {product.competitors && (
          <div>
            <dt className="text-sm font-medium">Competitors</dt>
            <dd className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">
              {product.competitors}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
