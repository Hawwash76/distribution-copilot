import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/products/${id}`, { method: "DELETE" });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["products", id] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
