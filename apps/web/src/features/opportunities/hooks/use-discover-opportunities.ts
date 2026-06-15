import { useMutation } from "@tanstack/react-query";
import { type DiscussionSource } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

interface DiscoverResult {
  jobId: string;
  status: "queued";
}

/**
 * Enqueues a SERP discovery job for a product. Keywords are loaded from the
 * product's AI profile inside the worker — no input needed from the client.
 * Pass a source to limit the run to a single platform (useful for testing).
 * Newly discovered opportunities appear once scoring completes.
 */
export function useDiscoverOpportunities(productId: string) {
  return useMutation({
    mutationFn: (source?: DiscussionSource) =>
      apiFetch(`/products/${productId}/discover`, {
        method: "POST",
        body: source ? JSON.stringify({ source }) : undefined,
      }) as Promise<DiscoverResult>,
  });
}
