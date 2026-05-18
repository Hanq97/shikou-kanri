import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export interface AuditLogFilter {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface AuditLogWithActor extends AuditLog {
  actor: { id: string; name: string; email: string } | null;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: AuditLogFilter,
  ): Promise<{ items: AuditLogWithActor[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};
    if (filter.actorUserId) where.actorUserId = filter.actorUserId;
    if (filter.action) where.action = { contains: filter.action };
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.from || filter.to) {
      where.occurredAt = {};
      if (filter.from) where.occurredAt.gte = filter.from;
      if (filter.to) where.occurredAt.lte = filter.to;
    }
    if (filter.search) {
      where.OR = [
        { action: { contains: filter.search, mode: 'insensitive' } },
        {
          actor: {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items: items as AuditLogWithActor[], total };
  }

  async distinctActions(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
      take: 200,
    });
    return rows.map((r) => r.action);
  }
}
