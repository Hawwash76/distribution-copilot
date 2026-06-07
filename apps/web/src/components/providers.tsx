"use client";

import { useState } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";

import { getQueryClient } from "@/lib/query-client";
import { trpc } from "@/lib/trpc";

/**
 * Client-side providers: TanStack Query + the tRPC client.
 *
 * The tRPC client points at the API service; since the router is empty there
 * are no queries to call yet — this just wires the bridge for the future.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_TRPC_URL ?? "http://localhost:4000/trpc",
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
