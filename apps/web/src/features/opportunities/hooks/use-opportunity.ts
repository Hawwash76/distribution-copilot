import { useQuery } from "@tanstack/react-query";
import { opportunitySchema, type Opportunity } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchOpportunity(productId: string, opportunityId: string): Promise<Opportunity> {
  const data = await apiFetch(`/products/${productId}/opportunities/${opportunityId}`);
  return opportunitySchema.parse(data);
}

export function useOpportunity(productId: string, opportunityId: string) {
  return useQuery({
    queryKey: ["opportunities", productId, opportunityId],
    queryFn: () => fetchOpportunity(productId, opportunityId),
    enabled: Boolean(productId) && Boolean(opportunityId),
  });
}
