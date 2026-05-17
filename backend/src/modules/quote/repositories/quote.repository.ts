import { Injectable } from '@nestjs/common';
import { Prisma, Quote } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { QuoteConflictError } from '../../../shared/exceptions/quote-errors';
import { Tx } from '../../auth/internal/audit-stub.service';
import {
  ListQuotesFilter,
  QuoteWithLines,
  QuoteWithRelations,
} from '../domain/types';

const DETAIL_INCLUDE = {
  lines: { orderBy: { sortOrder: 'asc' as const } },
  project: {
    select: { id: true, projectCode: true, name: true, customerId: true },
  },
  approvedBy: { select: { id: true, name: true } },
} as const;

const LIST_INCLUDE = {
  project: {
    select: { id: true, projectCode: true, name: true, customerId: true },
  },
} as const;

@Injectable()
export class QuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<Quote | null> {
    const client = tx ?? this.prisma;
    return client.quote.findFirst({ where: { id, deletedAt: null } });
  }

  findByIdWithLines(id: string, tx?: Tx): Promise<QuoteWithLines | null> {
    const client = tx ?? this.prisma;
    return client.quote.findFirst({
      where: { id, deletedAt: null },
      include: DETAIL_INCLUDE,
    });
  }

  findByQuoteNumber(quoteNumber: string, tx?: Tx): Promise<Quote | null> {
    const client = tx ?? this.prisma;
    return client.quote.findFirst({
      where: { quoteNumber, deletedAt: null },
    });
  }

  async list(
    filter: ListQuotesFilter,
    tx?: Tx,
  ): Promise<{ data: QuoteWithRelations[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      ...(filter.status?.length ? { status: { in: filter.status } } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.from || filter.to
        ? {
            issuedAt: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
      ...(filter.minAmount !== undefined || filter.maxAmount !== undefined
        ? {
            amountTotal: {
              ...(filter.minAmount !== undefined
                ? { gte: filter.minAmount }
                : {}),
              ...(filter.maxAmount !== undefined
                ? { lte: filter.maxAmount }
                : {}),
            },
          }
        : {}),
      ...(filter.counterPartySearch
        ? {
            counterPartyName: {
              contains: filter.counterPartySearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    if (filter.search) {
      const cleaned = filter.search.trim();
      if (cleaned.length > 0) {
        where.OR = [
          {
            quoteNumber: { contains: cleaned, mode: 'insensitive' as const },
          },
          {
            counterPartyName: {
              contains: cleaned,
              mode: 'insensitive' as const,
            },
          },
          { notes: { contains: cleaned, mode: 'insensitive' as const } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      client.quote.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.quote.count({ where }),
    ]);
    return { data, total };
  }

  create(input: Prisma.QuoteCreateInput, tx?: Tx): Promise<Quote> {
    const client = tx ?? this.prisma;
    return client.quote.create({ data: input });
  }

  /**
   * Optimistic locking update — throws QuoteConflictError on version mismatch.
   */
  async update(
    id: string,
    expectedVersion: number,
    data: Prisma.QuoteUpdateInput,
    tx?: Tx,
  ): Promise<Quote> {
    const client = tx ?? this.prisma;
    const result = await client.quote.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: {
        ...(data as Prisma.QuoteUncheckedUpdateInput),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new QuoteConflictError(id);
    }
    const updated = await this.findById(id, tx);
    if (!updated) throw new QuoteConflictError(id);
    return updated;
  }

  /**
   * Non-locking update (for status transitions where caller controls flow).
   */
  updateUnlocked(
    id: string,
    data: Prisma.QuoteUpdateInput,
    tx?: Tx,
  ): Promise<Quote> {
    const client = tx ?? this.prisma;
    return client.quote.update({
      where: { id },
      data: {
        ...(data as Prisma.QuoteUncheckedUpdateInput),
        version: { increment: 1 },
      },
    });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<Quote> {
    const client = tx ?? this.prisma;
    return client.quote.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorId,
        version: { increment: 1 },
      },
    });
  }

  countWonByProject(projectId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.quote.count({
      where: { projectId, status: 'won', deletedAt: null },
    });
  }
}
