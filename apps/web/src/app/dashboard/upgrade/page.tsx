"use client";

import { useRouter } from "next/navigation";
import {
  useBillingStatus,
  useCreateCheckout,
  useCreatePortal,
} from "@/features/billing/hooks/use-billing-status";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For founders validating product-market fit.",
    features: [
      "3 products",
      "All 6 discovery sources",
      "AI scoring + risk assessment",
      "Draft reply generation",
      "Email support",
    ],
    priceIdEnv: "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "For teams scaling distribution across multiple products.",
    features: [
      "Unlimited products",
      "All 6 discovery sources",
      "AI scoring + risk assessment",
      "Draft reply generation",
      "Priority support",
    ],
    priceIdEnv: "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID",
    highlighted: true,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const { data: billing } = useBillingStatus();
  const checkout = useCreateCheckout();
  const portal = useCreatePortal();

  const isActive = billing?.status === "active";

  function handleUpgrade(planId: string) {
    const priceId =
      planId === "starter"
        ? (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "")
        : (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "");

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
    checkout.mutate({
      priceId,
      successUrl: `${base}/dashboard?upgraded=1`,
      cancelUrl: `${base}/dashboard/upgrade`,
    });
  }

  function handleManage() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
    portal.mutate(`${base}/dashboard/settings`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 text-center">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight">Choose your plan</h2>
        <p className="text-muted-foreground">
          {isActive
            ? "You're on an active plan. Manage your subscription below."
            : billing?.status === "trialing"
              ? `Your trial has ${billing.daysRemaining ?? 0} day${(billing.daysRemaining ?? 0) === 1 ? "" : "s"} remaining.`
              : "Your trial has ended. Select a plan to continue."}
        </p>
      </div>

      {isActive ? (
        <div className="text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            Current plan: <strong>{billing?.planName ?? "paid"}</strong>
            {billing?.currentPeriodEnd && (
              <> &mdash; renews {billing.currentPeriodEnd.toLocaleDateString()}</>
            )}
          </p>
          <button
            onClick={handleManage}
            disabled={portal.isPending}
            className="border-border hover:bg-accent rounded-md border px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {portal.isPending ? "Loading…" : "Manage subscription"}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg border p-6 ${plan.highlighted ? "border-primary shadow-md" : "border-border"}`}
            >
              {plan.highlighted && (
                <div className="text-primary mb-3 text-xs font-semibold uppercase tracking-wide">
                  Most popular
                </div>
              )}
              <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
              <div className="mb-3">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <p className="text-muted-foreground mb-5 text-sm">{plan.description}</p>
              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={checkout.isPending}
                className={`w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border hover:bg-accent border"
                }`}
              >
                {checkout.isPending ? "Redirecting…" : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          &larr; Back
        </button>
      </div>
    </div>
  );
}
