import { Injectable } from '@nestjs/common';
import {
  MaintenanceSchedule,
  MaintenanceScheduleStatus,
  MaintenanceScheduleType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export interface ScheduleListFilter {
  customerId?: string;
  propertyId?: string;
  status?: MaintenanceScheduleStatus | MaintenanceScheduleStatus[];
  scheduleType?: MaintenanceScheduleType;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface ScheduleWithRelations extends MaintenanceSchedule {
  property: {
    id: string;
    address: string;
    customer: {
      id: string;
      name: string;
      nameKana: string | null;
      email: string | null;
      phone: string | null;
    };
  };
}

@Injectable()
export class MaintenanceScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: ScheduleListFilter,
  ): Promise<{ items: ScheduleWithRelations[]; total: number }> {
    const where: Prisma.MaintenanceScheduleWhereInput = {
      deletedAt: null,
    };
    if (filter.customerId) {
      where.property = { customerId: filter.customerId };
    }
    if (filter.propertyId) {
      where.propertyId = filter.propertyId;
    }
    if (filter.status) {
      where.status = Array.isArray(filter.status)
        ? { in: filter.status }
        : filter.status;
    }
    if (filter.scheduleType) {
      where.scheduleType = filter.scheduleType;
    }
    if (filter.scheduledFrom || filter.scheduledTo) {
      where.scheduledDate = {};
      if (filter.scheduledFrom) {
        where.scheduledDate.gte = filter.scheduledFrom;
      }
      if (filter.scheduledTo) {
        where.scheduledDate.lte = filter.scheduledTo;
      }
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceSchedule.findMany({
        where,
        orderBy: { scheduledDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          property: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  nameKana: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.maintenanceSchedule.count({ where }),
    ]);

    return { items: items as ScheduleWithRelations[], total };
  }

  async findById(id: string): Promise<ScheduleWithRelations | null> {
    const schedule = await this.prisma.maintenanceSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        property: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                nameKana: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    return (schedule as ScheduleWithRelations | null) ?? null;
  }

  async findDueWithinDays(today: Date, days: number) {
    const limit = new Date(today.getTime() + days * 86_400_000);
    return this.prisma.maintenanceSchedule.findMany({
      where: {
        deletedAt: null,
        status: 'pending',
        scheduledDate: { gte: today, lte: limit },
      },
      include: {
        property: {
          include: {
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  }

  async findOverdue(today: Date) {
    return this.prisma.maintenanceSchedule.findMany({
      where: {
        deletedAt: null,
        status: { in: ['pending', 'notified'] },
        scheduledDate: { lt: today },
      },
    });
  }

  async createMany(
    data: Prisma.MaintenanceScheduleCreateManyInput[],
  ): Promise<number> {
    const res = await this.prisma.maintenanceSchedule.createMany({ data });
    return res.count;
  }

  async update(
    id: string,
    data: Prisma.MaintenanceScheduleUpdateInput,
  ): Promise<MaintenanceSchedule> {
    return this.prisma.maintenanceSchedule.update({ where: { id }, data });
  }

  async deletePendingForProperty(propertyId: string): Promise<number> {
    const res = await this.prisma.maintenanceSchedule.deleteMany({
      where: {
        propertyId,
        status: { in: ['pending', 'notified'] },
        completedRecordId: null,
      },
    });
    return res.count;
  }

  /**
   * For OB list — earliest non-terminal schedule per customer.
   * Returns rows keyed by customerId.
   */
  async findNextMaintenanceForCustomers(
    customerIds: string[],
  ): Promise<Map<string, MaintenanceSchedule>> {
    if (customerIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      Array<{
        customer_id: string;
        id: string;
        scheduled_date: Date;
        schedule_type: MaintenanceScheduleType;
        status: MaintenanceScheduleStatus;
      }>
    >`
      WITH ranked AS (
        SELECT
          p.customer_id,
          s.id,
          s.scheduled_date,
          s.schedule_type,
          s.status,
          ROW_NUMBER() OVER (PARTITION BY p.customer_id ORDER BY s.scheduled_date ASC) AS rn
        FROM maintenance_schedules s
        JOIN properties p ON p.id = s.property_id
        WHERE s.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND s.status IN ('pending', 'notified', 'overdue')
          AND p.customer_id = ANY(${customerIds}::uuid[])
      )
      SELECT customer_id, id, scheduled_date, schedule_type, status FROM ranked WHERE rn = 1;
    `;

    const map = new Map<string, MaintenanceSchedule>();
    for (const r of rows) {
      map.set(r.customer_id, {
        id: r.id,
        propertyId: '',
        scheduleType: r.schedule_type,
        scheduledDate: r.scheduled_date,
        status: r.status,
        notifiedAt: null,
        completedAt: null,
        completedRecordId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdById: null,
        updatedById: null,
      } as MaintenanceSchedule);
    }
    return map;
  }

  async countPropertiesPerCustomer(
    customerIds: string[],
  ): Promise<Map<string, number>> {
    if (customerIds.length === 0) return new Map();
    const rows = await this.prisma.property.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, deletedAt: null },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.customerId, r._count._all);
    }
    return map;
  }
}
