"use client";

import { useState } from "react";
import Link from "next/link";

import { changePassword, updateUser, useSession } from "@/lib/auth-client";
import { useBillingStatus, useCreatePortal } from "@/features/billing/hooks/use-billing-status";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account preferences.</p>
      </div>

      <div className="space-y-8">
        <ProfileSection currentName={session?.user?.name ?? ""} />
        <PasswordSection />
        <BillingSection />
      </div>
    </div>
  );
}

function ProfileSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");

    const { error: err } = await updateUser({ name });

    if (err) {
      setError(err.message ?? "Failed to update profile.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2_000);
  }

  return (
    <section>
      <h3 className="mb-4 text-base font-semibold">Profile</h3>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Display name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
            placeholder="Your name"
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          disabled={status === "saving" || name === currentName}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setStatus("saving");

    const { error: err } = await changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: false,
    });

    if (err) {
      setError(err.message ?? "Failed to change password.");
      setStatus("error");
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2_000);
  }

  return (
    <section className="border-border border-t pt-8">
      <h3 className="mb-4 text-base font-semibold">Change password</h3>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          disabled={status === "saving" || !current || !next || !confirm}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {status === "saving"
            ? "Updating…"
            : status === "saved"
              ? "Password updated ✓"
              : "Update password"}
        </button>
      </form>
    </section>
  );
}

function BillingSection() {
  const { data: billing, isLoading } = useBillingStatus();
  const portal = useCreatePortal();

  function handleManage() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
    portal.mutate(`${base}/dashboard/settings`);
  }

  const statusLabel: Record<string, string> = {
    trialing: "Free trial",
    active: "Active",
    past_due: "Payment overdue",
    canceled: "Canceled",
    expired: "Trial expired",
  };

  return (
    <section className="border-border border-t pt-8">
      <h3 className="mb-4 text-base font-semibold">Billing</h3>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="border-border flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">
                {billing ? (statusLabel[billing.status] ?? billing.status) : "—"}
              </p>
              {billing?.status === "trialing" && billing.daysRemaining !== null && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {billing.daysRemaining} day{billing.daysRemaining === 1 ? "" : "s"} remaining
                </p>
              )}
              {billing?.status === "active" && billing.currentPeriodEnd && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Renews {billing.currentPeriodEnd.toLocaleDateString()}
                </p>
              )}
            </div>

            {billing?.status === "active" ? (
              <button
                onClick={handleManage}
                disabled={portal.isPending}
                className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {portal.isPending ? "Loading…" : "Manage"}
              </button>
            ) : (
              <Link
                href="/dashboard/upgrade"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
