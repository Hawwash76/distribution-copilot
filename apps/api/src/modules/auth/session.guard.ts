import { Injectable, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";

import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { auth } from "../../config/auth";

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    (req as Request & { session: typeof session }).session = session;
    return true;
  }
}
