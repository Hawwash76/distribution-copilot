import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { Auth } from "../../config/auth";

type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;
type SessionUser = NonNullable<Session>["user"];

/**
 * Extracts the authenticated user (or a specific field) from the request session.
 *
 * Usage:
 *   @CurrentUser() user: SessionUser          — full user object
 *   @CurrentUser("id") userId: string         — single field shorthand
 */
export const CurrentUser = createParamDecorator(
  (field: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request & { session?: Session }>();
    const user = req.session?.user;
    if (field && user) return user[field];
    return user;
  },
);
