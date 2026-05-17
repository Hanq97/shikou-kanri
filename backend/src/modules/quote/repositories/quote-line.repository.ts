import { Injectable } from '@nestjs/common';
import { Prisma, QuoteLine } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class QuoteLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByQuote(quoteId: string, tx?: Tx): Promise<QuoteLine[]> {
    const client = tx ?? this.prisma;
    return client.quoteLine.findMany({
      where: { quoteId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async replaceLines(
    quoteId: string,
    lines: Array<Omit<Prisma.QuoteLineUncheckedCreateInput, 'quoteId'>>,
    tx: Tx,
  ): Promise<QuoteLine[]> {
    await tx.quoteLine.deleteMany({ where: { quoteId } });
    if (lines.length === 0) return [];
    await tx.quoteLine.createMany({
      data: lines.map((line, idx) => ({
        ...line,
        quoteId,
        sortOrder: line.sortOrder ?? idx,
      })),
    });
    return this.findByQuote(quoteId, tx);
  }

  createMany(
    lines: Prisma.QuoteLineUncheckedCreateInput[],
    tx: Tx,
  ): Promise<{ count: number }> {
    return tx.quoteLine.createMany({ data: lines });
  }
}
