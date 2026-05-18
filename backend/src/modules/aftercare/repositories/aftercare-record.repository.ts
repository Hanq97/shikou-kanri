import { Injectable } from '@nestjs/common';
import {
  AftercareRecord,
  AftercareRecordStatus,
  AftercareRecordType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export interface RecordListFilter {
  customerId?: string;
  propertyId?: string;
  status?: AftercareRecordStatus | AftercareRecordStatus[];
  recordType?: AftercareRecordType;
  page?: number;
  pageSize?: number;
}

export interface RecordWithRelations extends AftercareRecord {
  customer: { id: string; name: string };
  property: { id: string; address: string } | null;
  handledBy: { id: string; name: string } | null;
}

@Injectable()
export class AftercareRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: RecordListFilter,
  ): Promise<{ items: RecordWithRelations[]; total: number }> {
    const where: Prisma.AftercareRecordWhereInput = { deletedAt: null };
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.propertyId) where.propertyId = filter.propertyId;
    if (filter.status) {
      where.status = Array.isArray(filter.status)
        ? { in: filter.status }
        : filter.status;
    }
    if (filter.recordType) where.recordType = filter.recordType;

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.aftercareRecord.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { id: true, name: true } },
          property: { select: { id: true, address: true } },
          handledBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.aftercareRecord.count({ where }),
    ]);
    return { items: items as RecordWithRelations[], total };
  }

  async findById(id: string): Promise<RecordWithRelations | null> {
    const record = await this.prisma.aftercareRecord.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true } },
        property: { select: { id: true, address: true } },
        handledBy: { select: { id: true, name: true } },
      },
    });
    return (record as RecordWithRelations | null) ?? null;
  }

  async create(
    data: Prisma.AftercareRecordCreateInput,
  ): Promise<AftercareRecord> {
    return this.prisma.aftercareRecord.create({ data });
  }

  async update(
    id: string,
    data: Prisma.AftercareRecordUpdateInput,
  ): Promise<AftercareRecord> {
    return this.prisma.aftercareRecord.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.aftercareRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countOpenForCustomers(
    customerIds: string[],
  ): Promise<Map<string, number>> {
    if (customerIds.length === 0) return new Map();
    const rows = await this.prisma.aftercareRecord.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        deletedAt: null,
        status: { in: ['open', 'in_progress'] },
      },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.customerId, r._count._all);
    }
    return map;
  }
}
