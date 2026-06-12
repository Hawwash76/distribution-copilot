import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { Auth } from "../config/auth";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { BillingService } from "../modules/billing/billing.service";

type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

/**
 * Blocks routes when a user's trial has expired and they have no active subscription.
 * Must be applied AFTER SessionGuard (which sets `req.session`).
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly billing: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { session?: Session }>();
    const userId = req.session?.user?.id;

    if (!userId) return false;

    const locked = await this.billing.isLocked(userId);
    if (locked) {
      throw new HttpException(
        "Your trial has expired. Please upgrade to continue.",
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
