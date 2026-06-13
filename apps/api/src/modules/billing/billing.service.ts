import Stripe from "stripe";
import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { ConfigService } from "@nestjs/config";
import { type BillingStatus, type CheckoutUrl } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { BillingRepository, type SubscriptionRow } from "./billing.repository";
import type { AppConfig } from "../../config/configuration";

/** HTTP 402 Payment Required — used when the subscription is locked. */
class PaymentRequiredException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}

/**
 * Billing and subscription management.
 *
 * Wraps Stripe (when configured) for checkout sessions, customer portal, and
 * webhook processing. Falls back to stub responses when STRIPE_SECRET_KEY is
 * absent — useful in local development without Stripe credentials.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;
  private readonly frontendUrl: string;

  constructor(
    private readonly billing: BillingRepository,
    private readonly config: ConfigService<AppConfig>,
  ) {
    const secretKey = this.config.get("stripe.secretKey", { infer: true });
    this.frontendUrl = this.config.get("frontendUrl", { infer: true }) ?? "http://localhost:3847";
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  /** Compute billing status for a user. Creates a trial if no subscription exists. */
  async getStatus(userId: string): Promise<BillingStatus> {
    let sub = await this.billing.findByUserId(userId);
    if (!sub) {
      sub = await this.billing.upsert(userId, {});
    }
    return this.toStatus(sub);
  }

  /** Returns true when the user's access is locked (expired trial, no active subscription). */
  async isLocked(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status.isLocked;
  }

  /** Creates a Stripe Checkout session. Returns a stub URL if Stripe is not configured. */
  async createCheckout(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutUrl> {
    if (!this.stripe) {
      this.logger.warn("Stripe not configured — returning stub checkout URL");
      return { url: `${this.frontendUrl}/dashboard/settings` };
    }

    let sub = await this.billing.findByUserId(userId);
    if (!sub) sub = await this.billing.upsert(userId, {});

    let customerId = sub.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ metadata: { userId } });
      customerId = customer.id;
      await this.billing.update(userId, { stripeCustomerId: customerId });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });

    return { url: session.url ?? successUrl };
  }

  /** Creates a Stripe Customer Portal session for managing/canceling subscriptions. */
  async createPortal(userId: string, returnUrl: string): Promise<CheckoutUrl> {
    if (!this.stripe) {
      this.logger.warn("Stripe not configured — returning stub portal URL");
      return { url: returnUrl };
    }

    const sub = await this.billing.findByUserId(userId);
    if (!sub?.stripeCustomerId) {
      throw new PaymentRequiredException("No active subscription found.");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Handles incoming Stripe webhooks. Verifies the signature and updates subscription state.
   * Idempotent — safe to call multiple times for the same event.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) {
      this.logger.warn("Stripe not configured — ignoring webhook");
      return;
    }

    const webhookSecret = this.config.get("stripe.webhookSecret", { infer: true }) ?? "";
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`Webhook signature verification failed: ${msg}`);
      throw new PaymentRequiredException("Invalid webhook signature.");
    }

    await this.processEvent(event);
  }

  // ---------------------------------------------------------------------------

  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata["userId"];
        if (!userId) break;

        const status = this.mapStripeStatus(sub.status);
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;
        const priceId = sub.items.data[0]?.price.id ?? null;

        await this.billing.update(userId, {
          status,
          planName: priceId ? "paid" : "trial",
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          currentPeriodEnd,
          trialEndsAt: null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata["userId"];
        if (!userId) break;

        await this.billing.update(userId, {
          status: "canceled",
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodEnd: null,
        });
        break;
      }

      default:
        break;
    }
  }

  private toStatus(sub: SubscriptionRow): BillingStatus {
    const now = Date.now();
    let { status } = sub;

    // Promote trialing → expired when the trial window has closed
    if (status === "trialing" && sub.trialEndsAt && sub.trialEndsAt.getTime() < now) {
      status = "expired";
    }

    const isLocked = status === "expired" || status === "canceled";

    const daysRemaining =
      status === "trialing" && sub.trialEndsAt
        ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24)))
        : null;

    return {
      status,
      planName: sub.planName,
      trialEndsAt: sub.trialEndsAt,
      daysRemaining,
      currentPeriodEnd: sub.currentPeriodEnd,
      isLocked,
    };
  }

  private mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): "active" | "past_due" | "canceled" | "trialing" | "expired" {
    switch (stripeStatus) {
      case "active":
        return "active";
      case "trialing":
        return "trialing";
      case "past_due":
        return "past_due";
      case "canceled":
      case "unpaid":
      case "incomplete_expired":
        return "canceled";
      default:
        return "past_due";
    }
  }
}
