"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
              Error
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
