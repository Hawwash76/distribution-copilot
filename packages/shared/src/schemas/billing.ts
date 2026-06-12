import { z } from "zod";

export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
]);

export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** Shape returned by GET /billing/status. */
export const billingStatusSchema = z.object({
  status: subscriptionStatusSchema,
  planName: z.string(),
  trialEndsAt: z.coerce.date().nullable(),
  /** Days remaining in trial; null when not trialing. */
  daysRemaining: z.number().int().nullable(),
  currentPeriodEnd: z.coerce.date().nullable(),
  /** True when the subscription is expired/canceled and access should be blocked. */
  isLocked: z.boolean(),
});

export type BillingStatus = z.infer<typeof billingStatusSchema>;

export const createCheckoutInputSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;

export const checkoutUrlSchema = z.object({
  url: z.string().url(),
});

export type CheckoutUrl = z.infer<typeof checkoutUrlSchema>;

export const createPortalInputSchema = z.object({
  returnUrl: z.string().url(),
});

export type CreatePortalInput = z.infer<typeof createPortalInputSchema>;
