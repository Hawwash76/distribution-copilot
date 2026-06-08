"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Find relevant conversations and draft replies for your products.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/products"
          className="border-border bg-card hover:bg-accent/50 rounded-lg border p-5 transition-colors"
        >
          <h2 className="font-semibold">Products</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage the products you want to distribute.
          </p>
        </Link>
      </div>
    </div>
  );
}
