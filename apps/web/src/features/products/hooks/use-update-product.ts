import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productSchema, type UpdateProductInput, type Product } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const data = await apiFetch(`/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return productSchema.parse(data);
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["products", id], updated);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
