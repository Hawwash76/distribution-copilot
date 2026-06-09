import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import {
  type User,
  type UpdateAccountInput,
  type ChangePasswordInput,
} from "@distribution-copilot/shared";
import type { Request } from "express";

import { auth } from "../../config/auth";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { AccountRepository } from "./account.repository";

/** Business logic for account settings. All operations are scoped to the authenticated user. */
@Injectable()
export class AccountService {
  constructor(private readonly account: AccountRepository) {}

  async getAccount(userId: string): Promise<User> {
    const user = await this.account.findById(userId);
    if (!user) throw new NotFoundException("Account not found");
    return user;
  }

  async updateAccount(userId: string, input: UpdateAccountInput): Promise<User> {
    await this.getAccount(userId);
    return this.account.update(userId, input);
  }

  async changePassword(input: ChangePasswordInput, req: Request): Promise<void> {
    const result = await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
      headers: fromNodeHeaders(req.headers),
    });

    if (result.error) {
      throw new BadRequestException(result.error.message ?? "Password change failed");
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.getAccount(userId);
    await this.account.softDelete(userId);
  }
}
