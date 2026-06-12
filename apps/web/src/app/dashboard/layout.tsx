"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import { APP_NAME } from "@distribution-copilot/config";
import { signOut, useSession } from "@/lib/auth-client";
import { useBillingStatus } from "@/features/billing/hooks/use-billing-status";

const NAV_LINKS = [
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/opportunities", label: "Opportunities" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: billing } = useBillingStatus();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const isLocked = billing?.isLocked ?? false;
  const showTrialBanner = billing?.status === "trialing" && (billing.daysRemaining ?? 0) <= 2;

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              {APP_NAME}
            </Link>
            <nav className="flex items-center gap-4">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    pathname.startsWith(href)
                      ? "text-foreground text-sm font-medium"
                      : "text-muted-foreground hover:text-foreground text-sm transition-colors"
                  }
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <span className="text-muted-foreground text-sm">{session.user.email}</span>
            )}
            <button
              onClick={() => void handleSignOut()}
              className="border-border hover:bg-accent hover:text-accent-foreground rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {showTrialBanner && !isLocked && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <div className="container mx-auto flex items-center justify-between">
            <p className="text-sm text-amber-800">
              {billing?.daysRemaining === 0
                ? "Your free trial expires today."
                : `Your free trial expires in ${billing?.daysRemaining ?? 0} day${(billing?.daysRemaining ?? 0) === 1 ? "" : "s"}.`}
            </p>
            <Link
              href="/dashboard/upgrade"
              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-800"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">{isLocked ? <LockedOverlay /> : children}</main>
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl">&#128274;</div>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">Trial expired</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Your 3-day free trial has ended. Upgrade to continue discovering and scoring
          opportunities.
        </p>
        <Link
          href="/dashboard/upgrade"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
