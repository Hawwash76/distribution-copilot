"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";
import { PostHogProvider } from "./posthog-provider";

/**
 * Client-side providers: TanStack Query + PostHog analytics.
 *
 * Server state is fetched from the REST API via the typed client in
 * `@/lib/api-client` and cached by TanStack Query.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider>{children}</PostHogProvider>
    </QueryClientProvider>
  );
}
