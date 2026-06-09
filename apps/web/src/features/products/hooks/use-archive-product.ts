import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

async function archiveProduct(id: string): Promise<void> {
  await apiFetch(`/products/${id}`, { method: "DELETE" });
}

/** Soft-deletes (archives) a product. The product is hidden from all lists after this. */
export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProduct,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["products", id] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
