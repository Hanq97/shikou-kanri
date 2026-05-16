import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByHash(tokenHash: string, tx?: Tx): Promise<RefreshToken | null> {
    const client = tx ?? this.prisma;
    return client.refreshToken.findUnique({ where: { tokenHash } });
  }

  findActiveByUser(userId: string, tx?: Tx): Promise<RefreshToken[]> {
    const client = tx ?? this.prisma;
    return client.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  countActiveByUser(userId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    return result.count;
  }
}
