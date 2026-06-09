"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import { APP_NAME } from "@distribution-copilot/config";
import { signOut, useSession } from "@/lib/auth-client";

const NAV_LINKS = [
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/opportunities", label: "Opportunities" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

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
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
