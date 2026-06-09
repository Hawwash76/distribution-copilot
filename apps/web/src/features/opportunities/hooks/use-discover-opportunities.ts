import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

interface DiscoverResult {
  jobId: string;
  status: "queued";
}

/**
 * Enqueues a SERP discovery job for a product. Keywords are loaded from the
 * product's AI profile inside the worker — no input needed from the client.
 * Newly discovered opportunities appear once scoring completes.
 */
export function useDiscoverOpportunities(productId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(`/products/${productId}/discover`, {
        method: "POST",
      }) as Promise<DiscoverResult>,
  });
}
