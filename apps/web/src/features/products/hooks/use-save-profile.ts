import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  productProfileSchema,
  type GeneratedProductProfile,
  type ProductProfile,
} from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function saveProfile(
  productId: string,
  data: GeneratedProductProfile,
): Promise<ProductProfile> {
  const body = await apiFetch(`/products/${productId}/profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return productProfileSchema.parse(body);
}

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: GeneratedProductProfile }) =>
      saveProfile(productId, data),
    onSuccess: (profile, { productId }) => {
      queryClient.setQueryData(["product-profile", productId], profile);
    },
  });
}
