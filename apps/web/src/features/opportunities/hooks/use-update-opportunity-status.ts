import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type OpportunityStatus } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function updateOpportunityStatus(
  productId: string,
  opportunityId: string,
  status: OpportunityStatus,
): Promise<void> {
  await apiFetch(`/products/${productId}/opportunities/${opportunityId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function useUpdateOpportunityStatus(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, status }: { opportunityId: string; status: OpportunityStatus }) =>
      updateOpportunityStatus(productId, opportunityId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", productId] });
    },
  });
}
