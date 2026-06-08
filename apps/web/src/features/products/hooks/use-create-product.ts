import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productSchema, type CreateProductInput, type Product } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function createProduct(input: CreateProductInput): Promise<Product> {
  const data = await apiFetch("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return productSchema.parse(data);
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
