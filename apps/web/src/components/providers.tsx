"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";

/**
 * Client-side providers: TanStack Query.
 *
 * Server state is fetched from the REST API via the typed client in
 * `@/lib/api-client` and cached by TanStack Query. No feature queries exist
 * yet — this wires the bridge for the future.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
