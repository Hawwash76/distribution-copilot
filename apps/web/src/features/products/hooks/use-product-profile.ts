import { useQuery } from "@tanstack/react-query";
import { productProfileSchema, type ProductProfile } from "@distribution-copilot/shared";

import { apiFetch, ApiError } from "@/lib/api-client";

async function fetchProductProfile(id: string): Promise<ProductProfile | null> {
  try {
    const data = await apiFetch(`/products/${id}/profile`);
    return productProfileSchema.parse(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function useProductProfile(id: string) {
  return useQuery({
    queryKey: ["product-profile", id],
    queryFn: () => fetchProductProfile(id),
    enabled: Boolean(id),
  });
}
