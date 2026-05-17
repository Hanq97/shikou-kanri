import { Injectable } from '@nestjs/common';
import { Prisma, QuoteVersion, User } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

export type QuoteVersionWithUser = QuoteVersion & {
  changedBy: Pick<User, 'id' | 'name'>;
};

@Injectable()
export class QuoteVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByQuote(quoteId: string, tx?: Tx): Promise<QuoteVersionWithUser[]> {
    const client = tx ?? this.prisma;
    return client.quoteVersion.findMany({
      where: { quoteId },
      orderBy: { changedAt: 'desc' },
      include: { changedBy: { select: { id: true, name: true } } },
    });
  }

  /**
   * Append-only insert. No update/delete exposed.
   */
  create(
    input: Prisma.QuoteVersionUncheckedCreateInput,
    tx: Tx,
  ): Promise<QuoteVersion> {
    return tx.quoteVersion.create({ data: input });
  }

  countByQuote(quoteId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.quoteVersion.count({ where: { quoteId } });
  }
}
