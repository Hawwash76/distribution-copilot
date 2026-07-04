"use client";

import { useEffect } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Something went wrong",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-muted-foreground mb-4 text-sm font-medium uppercase tracking-wide">
          Error
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          An unexpected error occurred. If the problem persists, please contact support.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
