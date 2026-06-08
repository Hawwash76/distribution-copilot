import { useQuery } from "@tanstack/react-query";
import { z as zod, opportunitySchema, type Opportunity } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchOpportunities(productId: string): Promise<Opportunity[]> {
  const data = await apiFetch(`/products/${productId}/opportunities`);
  return zod.array(opportunitySchema).parse(data);
}

export function useOpportunities(productId: string) {
  return useQuery({
    queryKey: ["opportunities", productId],
    queryFn: () => fetchOpportunities(productId),
    enabled: Boolean(productId),
  });
}
