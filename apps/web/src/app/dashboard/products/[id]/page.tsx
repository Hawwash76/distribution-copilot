"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";

import { useProduct } from "@/features/products/hooks/use-product";
import { useDeleteProduct } from "@/features/products/hooks/use-delete-product";
import { useProductProfile } from "@/features/products/hooks/use-product-profile";
import { useGenerateProfile } from "@/features/products/hooks/use-generate-profile";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError } = useProduct(id);
  const { data: profile, isLoading: isProfileLoading } = useProductProfile(id);
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const { mutate: generateProfile, isPending: isGenerating } = useGenerateProfile();

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
            onClick={() => generateProfile(id)}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Generating…" : profile ? "Regenerate Profile" : "Generate Profile"}
          </button>
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

      {(isProfileLoading || isGenerating || profile) && (
        <div className="border-border mt-10 border-t pt-8">
          <h3 className="mb-6 text-lg font-semibold tracking-tight">AI Profile</h3>

          {(isProfileLoading || isGenerating) && !profile ? (
            <p className="text-muted-foreground text-sm">
              {isGenerating ? "Generating profile…" : "Loading…"}
            </p>
          ) : profile ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <ProfileSection title="Pain Points" items={profile.painPoints} />
              <ProfileSection title="Customer Personas" items={profile.personas} />
              <ProfileSection title="Keywords" items={profile.keywords} />
              <ProfileSection title="Competitors" items={profile.competitors} />
              <ProfileSection title="Use Cases" items={profile.useCases} />
              <ProfileSection title="Value Props" items={profile.valueProps} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProfileSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-muted-foreground flex gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
