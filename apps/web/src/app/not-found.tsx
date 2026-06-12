import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-muted-foreground mb-4 text-sm font-medium uppercase tracking-wide">
          404
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
