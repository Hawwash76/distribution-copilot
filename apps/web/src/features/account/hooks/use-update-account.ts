import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userSchema, type User, type UpdateAccountInput } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function updateAccount(input: UpdateAccountInput): Promise<User> {
  const data = await apiFetch("/account", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return userSchema.parse(data);
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (updated) => {
      queryClient.setQueryData(["account"], updated);
    },
  });
}
