import { Injectable } from "@nestjs/common";
import { type User, type UpdateAccountInput } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for the account feature.
 * Operates on the Better Auth User table; extra columns are ignored by Better Auth.
 */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({ where: { id: userId } });
    return row ? this.toUser(row) : null;
  }

  async update(userId: string, input: UpdateAccountInput): Promise<User> {
    const row = await this.prisma.db.user.update({
      where: { id: userId },
      data: input,
    });
    return this.toUser(row);
  }

  async softDelete(userId: string): Promise<void> {
    await this.prisma.db.$transaction([
      this.prisma.db.user.update({
        where: { id: userId },
        data: { isDeleted: true },
      }),
      this.prisma.db.session.deleteMany({ where: { userId } }),
    ]);
  }

  private toUser(row: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      emailVerified: row.emailVerified,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
