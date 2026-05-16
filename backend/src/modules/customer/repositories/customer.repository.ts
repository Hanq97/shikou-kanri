import { Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';
import { ListCustomersFilter } from '../domain/types';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<Customer | null> {
    const client = tx ?? this.prisma;
    return client.customer.findFirst({ where: { id, deletedAt: null } });
  }

  /** Match exact normalized phone. Returns oldest match (createdAt asc) for stable dedup display. */
  findByPhone(phone: string, tx?: Tx): Promise<Customer | null> {
    const client = tx ?? this.prisma;
    return client.customer.findFirst({
      where: { phone, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async list(
    filter: ListCustomersFilter,
    tx?: Tx,
  ): Promise<{ data: Customer[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
    };
    if (filter.isOb !== undefined) where.isOb = filter.isOb;

    // FTS — combined search_text tsvector via Prisma's `search` op (PostgreSQL full-text)
    // Falls back to LIKE on name/phone if `search` mode unavailable.
    if (filter.search) {
      const cleanedSearch = filter.search.trim();
      if (cleanedSearch.length > 0) {
        // Combine: tsvector search OR LIKE-style on phone (exact normalized) / name (substring)
        where.OR = [
          { name: { contains: cleanedSearch, mode: 'insensitive' } },
          { nameKana: { contains: cleanedSearch, mode: 'insensitive' } },
          { phone: cleanedSearch.replace(/[\s\-()]/g, '') },
          { address: { contains: cleanedSearch, mode: 'insensitive' } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      client.customer.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.customer.count({ where }),
    ]);
    return { data, total };
  }

  create(input: Prisma.CustomerCreateInput, tx?: Tx): Promise<Customer> {
    const client = tx ?? this.prisma;
    return client.customer.create({ data: input });
  }

  update(
    id: string,
    data: Prisma.CustomerUpdateInput,
    tx?: Tx,
  ): Promise<Customer> {
    const client = tx ?? this.prisma;
    return client.customer.update({ where: { id }, data });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<Customer> {
    const client = tx ?? this.prisma;
    return client.customer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }
}
