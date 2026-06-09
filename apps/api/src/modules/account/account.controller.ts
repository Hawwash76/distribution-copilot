import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  updateAccountSchema,
  changePasswordSchema,
  type UpdateAccountInput,
  type ChangePasswordInput,
  type User,
} from "@distribution-copilot/shared";
import type { Request } from "express";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { AccountService } from "./account.service";

@Controller("account")
@UseGuards(SessionGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  getAccount(@CurrentUser() user: { id: string }): Promise<User> {
    return this.accountService.getAccount(user.id);
  }

  @Patch()
  updateAccount(
    @Body(new ZodValidationPipe(updateAccountSchema)) dto: UpdateAccountInput,
    @CurrentUser() user: { id: string },
  ): Promise<User> {
    return this.accountService.updateAccount(user.id, dto);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordInput,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ): Promise<void> {
    void user;
    return this.accountService.changePassword(dto, req);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser() user: { id: string }): Promise<void> {
    return this.accountService.deleteAccount(user.id);
  }
}
