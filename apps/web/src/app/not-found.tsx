import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This page doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/dashboard"
          className="text-primary mt-6 inline-block text-sm font-medium hover:underline"
        >
          Go to dashboard →
        </Link>
      </div>
    </div>
  );
}
