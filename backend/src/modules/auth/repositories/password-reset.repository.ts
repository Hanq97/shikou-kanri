import { Injectable } from '@nestjs/common';
import { PasswordResetToken, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export type Tx = Prisma.TransactionClient | PrismaService;

export interface CreatePasswordResetInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    input: CreatePasswordResetInput,
    tx?: Tx,
  ): Promise<PasswordResetToken> {
    const client = tx ?? this.prisma;
    return client.passwordResetToken.create({ data: input });
  }

  findByHash(tokenHash: string, tx?: Tx): Promise<PasswordResetToken | null> {
    const client = tx ?? this.prisma;
    return client.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  markUsed(id: string, tx?: Tx): Promise<PasswordResetToken> {
    const client = tx ?? this.prisma;
    return client.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async countRecentForUser(userId: string, withinMs: number): Promise<number> {
    return this.prisma.passwordResetToken.count({
      where: { userId, createdAt: { gt: new Date(Date.now() - withinMs) } },
    });
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });
    return result.count;
  }
}
