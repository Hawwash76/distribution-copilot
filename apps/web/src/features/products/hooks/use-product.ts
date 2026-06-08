import { useQuery } from "@tanstack/react-query";
import { productSchema, type Product } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchProduct(id: string): Promise<Product> {
  const data = await apiFetch(`/products/${id}`);
  return productSchema.parse(data);
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id),
    enabled: Boolean(id),
  });
}
