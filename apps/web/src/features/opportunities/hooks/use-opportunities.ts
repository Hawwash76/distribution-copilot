import { useQuery } from "@tanstack/react-query";
import { z as zod, opportunitySchema, type Paginated } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

export interface UseOpportunitiesOptions {
  page?: number;
  pageSize?: number;
  includeDismissed?: boolean;
  refetchInterval?: number | false;
}

const paginatedOpportunitySchema = zod.object({
  items: zod.array(opportunitySchema),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

async function fetchOpportunities(
  productId: string,
  options: UseOpportunitiesOptions,
): Promise<Paginated<zod.infer<typeof opportunitySchema>>> {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  if (options.includeDismissed) params.set("includeDismissed", "true");

  const qs = params.toString();
  const data = await apiFetch(`/products/${productId}/opportunities${qs ? `?${qs}` : ""}`);
  return paginatedOpportunitySchema.parse(data);
}

export function useOpportunities(productId: string, options: UseOpportunitiesOptions = {}) {
  const { refetchInterval, ...queryOptions } = options;
  return useQuery({
    queryKey: ["opportunities", productId, queryOptions],
    queryFn: () => fetchOpportunities(productId, queryOptions),
    enabled: Boolean(productId),
    refetchInterval: refetchInterval ?? false,
  });
}
