import { Injectable } from '@nestjs/common';
import { Prisma, UnitPrice } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';
import { ListUnitPricesFilter } from '../domain/types';

@Injectable()
export class UnitPriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<UnitPrice | null> {
    const client = tx ?? this.prisma;
    return client.unitPrice.findFirst({ where: { id, deletedAt: null } });
  }

  findByCode(code: string, tx?: Tx): Promise<UnitPrice | null> {
    const client = tx ?? this.prisma;
    return client.unitPrice.findFirst({ where: { code, deletedAt: null } });
  }

  async list(
    filter: ListUnitPricesFilter,
    tx?: Tx,
  ): Promise<{ data: UnitPrice[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.UnitPriceWhereInput = {
      deletedAt: null,
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    };
    if (filter.search) {
      const cleaned = filter.search.trim();
      if (cleaned.length > 0) {
        where.OR = [
          { code: { contains: cleaned, mode: 'insensitive' as const } },
          { itemName: { contains: cleaned, mode: 'insensitive' as const } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      client.unitPrice.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.unitPrice.count({ where }),
    ]);
    return { data, total };
  }

  create(
    input: Prisma.UnitPriceUncheckedCreateInput,
    tx?: Tx,
  ): Promise<UnitPrice> {
    const client = tx ?? this.prisma;
    return client.unitPrice.create({ data: input });
  }

  update(
    id: string,
    data: Prisma.UnitPriceUpdateInput,
    tx?: Tx,
  ): Promise<UnitPrice> {
    const client = tx ?? this.prisma;
    return client.unitPrice.update({ where: { id }, data });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<UnitPrice> {
    const client = tx ?? this.prisma;
    return client.unitPrice.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorId,
        isActive: false,
      },
    });
  }
}
