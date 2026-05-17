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
   * Returns version history across the entire quoteNumber lineage (v1, v2, ...).
   * Used by the detail page to show full audit trail regardless of which version
   * the user is currently viewing.
   */
  findByQuoteNumber(
    quoteNumber: string,
    tx?: Tx,
  ): Promise<QuoteVersionWithUser[]> {
    const client = tx ?? this.prisma;
    return client.quoteVersion.findMany({
      where: { quote: { quoteNumber } },
      orderBy: [{ versionNo: 'desc' }, { changedAt: 'desc' }],
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
