import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

async function deleteOpportunity(productId: string, opportunityId: string): Promise<void> {
  await apiFetch(`/products/${productId}/opportunities/${opportunityId}`, { method: "DELETE" });
}

export function useDeleteOpportunity(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (opportunityId: string) => deleteOpportunity(productId, opportunityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", productId] });
    },
  });
}
