"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { useProduct } from "@/features/products/hooks/use-product";
import { useArchiveProduct } from "@/features/products/hooks/use-archive-product";
import { useProductProfile } from "@/features/products/hooks/use-product-profile";
import { useGenerateProfile } from "@/features/products/hooks/use-generate-profile";
import { useDiscoverOpportunities } from "@/features/opportunities/hooks/use-discover-opportunities";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError } = useProduct(id);
  const { data: profile, isLoading: isProfileLoading } = useProductProfile(id);
  const { mutate: archiveProduct, isPending: isArchiving } = useArchiveProduct();
  const { mutate: generateProfile, isPending: isGenerating } = useGenerateProfile();
  const { mutate: discover, isPending: isDiscovering } = useDiscoverOpportunities(id);
  const [discoverQueued, setDiscoverQueued] = useState(false);

  function handleArchive() {
    if (!confirm("Archive this product? It will be hidden from your workspace.")) return;
    archiveProduct(id, {
      onSuccess: () => router.push("/dashboard/products"),
    });
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (isError || !product) {
    return <p className="text-destructive text-sm">Product not found.</p>;
  }

  const discoveryRecent =
    product.lastDiscoveredAt &&
    Date.now() - new Date(product.lastDiscoveredAt).getTime() < 5 * 60 * 1000;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/products/${id}/edit`}
          className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => {
            if (!profile?.keywords.length) return;
            discover({ keywords: profile.keywords }, { onSuccess: () => setDiscoverQueued(true) });
          }}
          disabled={isDiscovering || !profile || discoverQueued}
          title={!profile ? "Generate an AI profile first to unlock discovery" : undefined}
          className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isDiscovering
            ? "Queuing…"
            : discoverQueued
              ? "Discovery queued ✓"
              : "Find Opportunities"}
        </button>
        <button
          onClick={() => generateProfile(id)}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : profile ? "Regenerate Profile" : "Generate Profile"}
        </button>
        <button
          onClick={handleArchive}
          disabled={isArchiving}
          className="text-destructive hover:bg-destructive/10 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isArchiving ? "Archiving…" : "Archive"}
        </button>
      </div>

      {product.lastDiscoveredAt && (
        <p className="text-muted-foreground mb-4 text-xs">
          {discoveryRecent
            ? "Discovery running — check the Opportunities tab."
            : `Last discovery: ${new Date(product.lastDiscoveredAt).toLocaleString()}`}
        </p>
      )}

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
