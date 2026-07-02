import { useQuery } from "@tanstack/react-query";
import {
  z as zod,
  aggregatedPainPointSchema,
  type AggregatedPainPoint,
} from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchPainPoints(productId: string): Promise<AggregatedPainPoint[]> {
  const data = await apiFetch(`/products/${productId}/research/pain-points`);
  return zod.array(aggregatedPainPointSchema).parse(data);
}

export function usePainPoints(productId: string) {
  return useQuery({
    queryKey: ["research", "pain-points", productId],
    queryFn: () => fetchPainPoints(productId),
    enabled: Boolean(productId),
  });
}
