import { useQuery } from "@tanstack/react-query";
import { z as zod, opportunitySchema, type Opportunity } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchCompetitorSignals(productId: string): Promise<Opportunity[]> {
  const data = await apiFetch(`/products/${productId}/competitor-monitor`);
  return zod.array(opportunitySchema).parse(data);
}

export function useCompetitorMonitor(productId: string) {
  return useQuery({
    queryKey: ["competitor-monitor", productId],
    queryFn: () => fetchCompetitorSignals(productId),
    enabled: Boolean(productId),
    // Poll while unscored opportunities are still being processed
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.length === 0) return 5_000;
      const hasUnscored = data.some((o) => o.status === "new");
      return hasUnscored ? 5_000 : false;
    },
  });
}
