import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

async function deleteAccount(): Promise<void> {
  await apiFetch("/account", { method: "DELETE" });
}

/** Soft-deletes the account and revokes all sessions. Signs the user out immediately. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
