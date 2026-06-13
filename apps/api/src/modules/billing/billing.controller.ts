import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  type RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import {
  type BillingStatus,
  type CheckoutUrl,
  type CreateCheckoutInput,
  type CreatePortalInput,
  createCheckoutInputSchema,
  createPortalInputSchema,
} from "@distribution-copilot/shared";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { BillingService } from "./billing.service";

/**
 * Billing endpoints for subscription management.
 *
 * GET  /billing/status       → current trial/subscription state
 * POST /billing/checkout     → create Stripe Checkout session
 * POST /billing/portal       → create Stripe Customer Portal session
 * POST /billing/webhook      → Stripe webhook (no session guard; verified by signature)
 */
@Controller("billing")
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get("status")
  @UseGuards(SessionGuard)
  getStatus(@CurrentUser() user: { id: string }): Promise<BillingStatus> {
    return this.service.getStatus(user.id);
  }

  @Post("checkout")
  @UseGuards(SessionGuard)
  createCheckout(
    @Body(new ZodValidationPipe(createCheckoutInputSchema)) dto: CreateCheckoutInput,
    @CurrentUser() user: { id: string },
  ): Promise<CheckoutUrl> {
    return this.service.createCheckout(user.id, dto.priceId, dto.successUrl, dto.cancelUrl);
  }

  @Post("portal")
  @UseGuards(SessionGuard)
  createPortal(
    @Body(new ZodValidationPipe(createPortalInputSchema)) dto: CreatePortalInput,
    @CurrentUser() user: { id: string },
  ): Promise<CheckoutUrl> {
    return this.service.createPortal(user.id, dto.returnUrl);
  }

  /** Stripe sends webhooks here. No session guard — verified by Stripe signature. */
  @Post("webhook")
  @HttpCode(200)
  @SkipThrottle()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") sig: string,
  ): Promise<void> {
    const rawBody = req.rawBody;
    if (!rawBody) return;
    await this.service.handleWebhook(rawBody, sig);
  }
}
