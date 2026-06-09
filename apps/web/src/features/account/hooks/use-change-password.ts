import { useMutation } from "@tanstack/react-query";
import { type ChangePasswordInput } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiFetch("/account/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}
