import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  billingStatusSchema,
  checkoutUrlSchema,
  type BillingStatus,
} from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

/** Fetches the current user's billing/trial status. */
export function useBillingStatus(): { data: BillingStatus | undefined; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["billing", "status"],
    queryFn: async () => {
      const raw = await apiFetch("/billing/status");
      return billingStatusSchema.parse(raw);
    },
    staleTime: 60_000,
  });

  return { data, isLoading };
}

/** Creates a Stripe Checkout session and returns the redirect URL. */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (params: { priceId: string; successUrl: string; cancelUrl: string }) => {
      const raw = await apiFetch("/billing/checkout", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return checkoutUrlSchema.parse(raw);
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

/** Opens the Stripe Customer Portal. */
export function useCreatePortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (returnUrl: string) => {
      const raw = await apiFetch("/billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl }),
      });
      return checkoutUrlSchema.parse(raw);
    },
    onSuccess: ({ url }) => {
      void qc.invalidateQueries({ queryKey: ["billing"] });
      window.location.href = url;
    },
  });
}
