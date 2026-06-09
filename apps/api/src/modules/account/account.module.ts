import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { AccountRepository } from "./account.repository";

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepository, PrismaService],
})
export class AccountModule {}
