import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AftercareRecordRepository } from '../repositories/aftercare-record.repository';
import { MaintenanceScheduleRepository } from '../repositories/maintenance-schedule.repository';
import type {
  OBCustomerNextMaintenance,
  OBCustomerSummary,
  OBCustomersList,
} from '../domain/types';

export interface ListObCustomersInput {
  search?: string;
  nextMaintenanceFrom?: Date;
  nextMaintenanceTo?: Date;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ObCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedules: MaintenanceScheduleRepository,
    private readonly records: AftercareRecordRepository,
  ) {}

  async list(input: ListObCustomersInput): Promise<OBCustomersList> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;

    // Step 1: candidate customers — those who own >=1 property with handover_date
    const candidates = await this.prisma.customer.findMany({
      where: {
        deletedAt: null,
        properties: { some: { handoverDate: { not: null }, deletedAt: null } },
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { nameKana: { contains: input.search, mode: 'insensitive' } },
                { phone: { contains: input.search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        nameKana: true,
        phone: true,
        email: true,
        isOb: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (candidates.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const ids = candidates.map((c) => c.id);
    const [propCountMap, nextMap, openCountMap] = await Promise.all([
      this.schedules.countPropertiesPerCustomer(ids),
      this.schedules.findNextMaintenanceForCustomers(ids),
      this.records.countOpenForCustomers(ids),
    ]);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    let items: OBCustomerSummary[] = candidates.map((c) => {
      const sched = nextMap.get(c.id);
      let nextMaintenance: OBCustomerNextMaintenance | null = null;
      if (sched) {
        const diffDays = Math.floor(
          (sched.scheduledDate.getTime() - todayMs) / 86_400_000,
        );
        nextMaintenance = {
          scheduleId: sched.id,
          scheduledDate: sched.scheduledDate.toISOString().slice(0, 10),
          scheduleType: sched.scheduleType,
          status: sched.status,
          isOverdue: diffDays < 0 || sched.status === 'overdue',
          daysUntil: diffDays,
        };
      }
      return {
        id: c.id,
        name: c.name,
        nameKana: c.nameKana,
        phone: c.phone,
        email: c.email,
        isOb: c.isOb,
        propertyCount: propCountMap.get(c.id) ?? 0,
        nextMaintenance,
        openRecordCount: openCountMap.get(c.id) ?? 0,
      };
    });

    // Step 2: filter
    if (input.overdueOnly) {
      items = items.filter((it) => it.nextMaintenance?.isOverdue);
    }
    if (input.nextMaintenanceFrom || input.nextMaintenanceTo) {
      items = items.filter((it) => {
        if (!it.nextMaintenance) return false;
        const d = it.nextMaintenance.scheduledDate;
        if (
          input.nextMaintenanceFrom &&
          d < input.nextMaintenanceFrom.toISOString().slice(0, 10)
        ) {
          return false;
        }
        if (
          input.nextMaintenanceTo &&
          d > input.nextMaintenanceTo.toISOString().slice(0, 10)
        ) {
          return false;
        }
        return true;
      });
    }

    // Step 3: sort by nextMaintenance asc (overdue first, then by date)
    items.sort((a, b) => {
      const aDate = a.nextMaintenance?.scheduledDate ?? '9999-12-31';
      const bDate = b.nextMaintenance?.scheduledDate ?? '9999-12-31';
      return aDate.localeCompare(bDate);
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  }
}
