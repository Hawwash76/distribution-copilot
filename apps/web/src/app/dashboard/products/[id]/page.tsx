"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { type DiscussionSource, type MonitorStatus } from "@distribution-copilot/shared";

import { useProduct } from "@/features/products/hooks/use-product";
import { useDeleteProduct } from "@/features/products/hooks/use-delete-product";
import { useProductProfile } from "@/features/products/hooks/use-product-profile";
import { useGenerateProfile } from "@/features/products/hooks/use-generate-profile";
import { useProductMonitors } from "@/features/products/hooks/use-product-monitors";
import { useToggleMonitor } from "@/features/products/hooks/use-toggle-monitor";
import { ProfileForm } from "@/features/products/components/profile-form";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

const SOURCE_LABELS: Record<DiscussionSource, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  stackoverflow: "Stack Overflow",
  lobsters: "Lobsters",
  devto: "Dev.to",
  web: "Web",
};

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError } = useProduct(id);
  const { data: profile, isLoading: isProfileLoading } = useProductProfile(id);
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const { mutate: generateProfile, isPending: isGenerating } = useGenerateProfile();
  const { data: monitors, isLoading: isMonitorsLoading } = useProductMonitors(id);
  const { mutate: toggleMonitor, isPending: isToggling } = useToggleMonitor(id);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/products/${id}/edit`}
          className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => setIsEditingProfile(true)}
          className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          {profile ? "Edit Profile" : "Set Profile Manually"}
        </button>
        <button
          onClick={() => generateProfile(id)}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : profile ? "Regenerate with AI" : "Generate with AI"}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:bg-destructive/10 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
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

      {/* Profile section */}
      {(isProfileLoading || isGenerating || isEditingProfile || profile) && (
        <div className="border-border mt-10 border-t pt-8">
          <h3 className="mb-6 text-lg font-semibold tracking-tight">Profile</h3>

          {(isProfileLoading || isGenerating) && !profile && !isEditingProfile ? (
            <p className="text-muted-foreground text-sm">
              {isGenerating ? "Generating profile…" : "Loading…"}
            </p>
          ) : isEditingProfile ? (
            <ProfileForm
              productId={id}
              existing={profile ?? null}
              onCancel={() => setIsEditingProfile(false)}
              onSaved={() => setIsEditingProfile(false)}
            />
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

      {/* Monitoring section */}
      <div className="border-border mt-10 border-t pt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Monitoring</h3>
          {!profile && (
            <span className="text-muted-foreground text-xs">
              Generate a profile to enable monitoring
            </span>
          )}
        </div>
        <p className="text-muted-foreground mb-5 text-sm">
          Toggle which platforms to monitor. When enabled, the worker searches for new discussions
          every 30 minutes. The first run backfills the last 30 days.
        </p>

        {isMonitorsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded-md" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(monitors ?? []).map((monitor) => (
              <MonitorRow
                key={monitor.source}
                monitor={monitor}
                disabled={!profile || isToggling}
                onToggle={(enabled) =>
                  toggleMonitor({ source: monitor.source as DiscussionSource, enabled })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MonitorRow({
  monitor,
  disabled,
  onToggle,
}: {
  monitor: MonitorStatus;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const label = SOURCE_LABELS[monitor.source as DiscussionSource] ?? monitor.source;

  const lastChecked = monitor.lastCheckedAt
    ? formatRelativeTime(new Date(monitor.lastCheckedAt))
    : "Never";

  return (
    <div className="border-border flex items-center justify-between rounded-md border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">Last checked: {lastChecked}</p>
      </div>
      <button
        onClick={() => onToggle(!monitor.enabled)}
        disabled={disabled}
        aria-label={monitor.enabled ? `Disable ${label}` : `Enable ${label}`}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          monitor.enabled ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            monitor.enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  return `${String(Math.floor(diffHours / 24))}d ago`;
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
