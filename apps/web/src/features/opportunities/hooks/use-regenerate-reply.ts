import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

async function regenerateReply(productId: string, opportunityId: string): Promise<void> {
  await apiFetch(`/products/${productId}/opportunities/${opportunityId}/regenerate-reply`, {
    method: "POST",
  });
}

export function useRegenerateReply(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId }: { opportunityId: string }) =>
      regenerateReply(productId, opportunityId),
    onSuccess: (_data, { opportunityId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["opportunity", productId, opportunityId],
      });
    },
  });
}
