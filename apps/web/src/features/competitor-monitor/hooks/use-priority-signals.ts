import { useQuery } from "@tanstack/react-query";
import { z as zod, opportunitySchema, type Opportunity } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchPrioritySignals(limit: number): Promise<Opportunity[]> {
  const data = await apiFetch(`/competitor-monitor/priority?limit=${String(limit)}`);
  return zod.array(opportunitySchema).parse(data);
}

/** Top competitor-signal opportunities across all of the user's products. */
export function usePrioritySignals(limit = 3) {
  return useQuery({
    queryKey: ["competitor-monitor", "priority", limit],
    queryFn: () => fetchPrioritySignals(limit),
    staleTime: 30_000,
  });
}
