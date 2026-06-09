import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  opportunitySchema,
  type Opportunity,
  type UpdateOpportunityStatusInput,
} from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function updateOpportunityStatus(
  productId: string,
  opportunityId: string,
  input: UpdateOpportunityStatusInput,
): Promise<Opportunity> {
  const data = await apiFetch(`/products/${productId}/opportunities/${opportunityId}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return opportunitySchema.parse(data);
}

export function useUpdateOpportunityStatus(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      opportunityId,
      status,
    }: {
      opportunityId: string;
      status: "reviewed" | "dismissed";
    }) => updateOpportunityStatus(productId, opportunityId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", productId] });
    },
  });
}
