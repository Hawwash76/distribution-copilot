import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { Auth } from "../../config/auth";

type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { session?: Session }>();
  return req.session?.user;
});
