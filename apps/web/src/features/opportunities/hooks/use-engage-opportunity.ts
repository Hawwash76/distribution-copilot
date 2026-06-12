import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

async function engageOpportunity(
  productId: string,
  opportunityId: string,
  reply: string,
): Promise<void> {
  await apiFetch(`/products/${productId}/opportunities/${opportunityId}/engage`, {
    method: "POST",
    body: JSON.stringify({ reply }),
  });
}

export function useEngageOpportunity(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, reply }: { opportunityId: string; reply: string }) =>
      engageOpportunity(productId, opportunityId, reply),
    onSuccess: (_data, { opportunityId }) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", productId] });
      void queryClient.invalidateQueries({
        queryKey: ["opportunity", productId, opportunityId],
      });
    },
  });
}
