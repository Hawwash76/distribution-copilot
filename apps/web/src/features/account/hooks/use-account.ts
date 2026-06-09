import { useQuery } from "@tanstack/react-query";
import { userSchema, type User } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchAccount(): Promise<User> {
  const data = await apiFetch("/account");
  return userSchema.parse(data);
}

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
  });
}
