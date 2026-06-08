import { useQuery } from "@tanstack/react-query";
import { productSchema, type Product } from "@distribution-copilot/shared";
import { z } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchProducts(): Promise<Product[]> {
  const data = await apiFetch("/products");
  return z.array(productSchema).parse(data);
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}
