import { useQuery } from "@tanstack/react-query";
import { z, monitorStatusSchema, type MonitorStatus } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchMonitors(productId: string): Promise<MonitorStatus[]> {
  const data = await apiFetch(`/products/${productId}/monitors`);
  return z.array(monitorStatusSchema).parse(data);
}

export function useProductMonitors(productId: string) {
  return useQuery({
    queryKey: ["monitors", productId],
    queryFn: () => fetchMonitors(productId),
    enabled: Boolean(productId),
  });
}
