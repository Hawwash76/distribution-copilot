import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

interface DiscoverInput {
  keywords: string[];
  subreddits?: string[];
}

interface DiscoverResult {
  jobId: string;
  status: "queued";
}

/**
 * Enqueues a discovery job for a product. The job runs in the background —
 * newly discovered opportunities appear once scoring completes.
 */
export function useDiscoverOpportunities(productId: string) {
  return useMutation({
    mutationFn: (input: DiscoverInput) =>
      apiFetch(`/products/${productId}/discover`, {
        method: "POST",
        body: JSON.stringify(input),
      }) as Promise<DiscoverResult>,
  });
}
