import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  monitorStatusSchema,
  type DiscussionSource,
  type MonitorStatus,
} from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function toggleMonitor(
  productId: string,
  source: DiscussionSource,
  enabled: boolean,
): Promise<MonitorStatus> {
  const data = await apiFetch(`/products/${productId}/monitors/${source}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
  return monitorStatusSchema.parse(data);
}

export function useToggleMonitor(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ source, enabled }: { source: DiscussionSource; enabled: boolean }) =>
      toggleMonitor(productId, source, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monitors", productId] });
    },
  });
}
