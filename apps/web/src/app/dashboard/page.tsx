"use client";

import { useRouter } from "next/navigation";

import { APP_NAME } from "@distribution-copilot/config";

import { signOut, useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-semibold">{APP_NAME}</span>
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

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-2">Dashboard — nothing here yet.</p>
        </div>
      </main>
    </div>
  );
}
