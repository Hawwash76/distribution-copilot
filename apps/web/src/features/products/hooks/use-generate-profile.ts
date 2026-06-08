import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productProfileSchema, type ProductProfile } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function generateProfile(productId: string): Promise<ProductProfile> {
  const data = await apiFetch(`/products/${productId}/generate-profile`, { method: "POST" });
  return productProfileSchema.parse(data);
}

export function useGenerateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateProfile,
    onSuccess: (profile, productId) => {
      queryClient.setQueryData(["product-profile", productId], profile);
    },
  });
}
