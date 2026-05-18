import { Injectable } from '@nestjs/common';
import {
  MaintenanceScheduleStatus,
  MaintenanceScheduleType,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  MaintenanceScheduleInvalidTransitionError,
  MaintenanceScheduleNotFoundError,
  PropertyHasNoHandoverDateError,
} from '../../../shared/exceptions/aftercare-errors';
import { PropertyNotFoundError } from '../../../shared/exceptions/customer-errors';
import type { AuthenticatedUser } from '../../auth/domain/types';
import type {
  MaintenanceScheduleSummary,
  MaintenanceSchedulesList,
} from '../domain/types';
import { ScheduleGeneratorService } from '../internal/schedule-generator.service';
import {
  MaintenanceScheduleRepository,
  ScheduleListFilter,
  ScheduleWithRelations,
} from '../repositories/maintenance-schedule.repository';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: MaintenanceScheduleRepository,
    private readonly generator: ScheduleGeneratorService,
  ) {}

  async list(filter: ScheduleListFilter): Promise<MaintenanceSchedulesList> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;
    const { items, total } = await this.repo.list({
      ...filter,
      page,
      pageSize,
    });
    return {
      items: items.map((s) => this.toSummary(s)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<MaintenanceScheduleSummary> {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new MaintenanceScheduleNotFoundError(id);
    return this.toSummary(schedule);
  }

  async markCompleted(
    id: string,
    user: AuthenticatedUser,
    notes?: string,
  ): Promise<MaintenanceScheduleSummary> {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new MaintenanceScheduleNotFoundError(id);
    if (
      schedule.status === MaintenanceScheduleStatus.completed ||
      schedule.status === MaintenanceScheduleStatus.cancelled
    ) {
      throw new MaintenanceScheduleInvalidTransitionError(
        schedule.status,
        'completed',
      );
    }
    await this.repo.update(id, {
      status: MaintenanceScheduleStatus.completed,
      completedAt: new Date(),
      notes: notes ?? schedule.notes,
      updatedBy: { connect: { id: user.id } },
    });
    return this.findById(id);
  }

  async cancel(
    id: string,
    user: AuthenticatedUser,
    reason?: string,
  ): Promise<MaintenanceScheduleSummary> {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new MaintenanceScheduleNotFoundError(id);
    if (
      schedule.status === MaintenanceScheduleStatus.completed ||
      schedule.status === MaintenanceScheduleStatus.cancelled
    ) {
      throw new MaintenanceScheduleInvalidTransitionError(
        schedule.status,
        'cancelled',
      );
    }
    await this.repo.update(id, {
      status: MaintenanceScheduleStatus.cancelled,
      notes: reason
        ? `${schedule.notes ?? ''}\n[Cancelled] ${reason}`.trim()
        : schedule.notes,
      updatedBy: { connect: { id: user.id } },
    });
    return this.findById(id);
  }

  async regenerateForProperty(
    propertyId: string,
    user: AuthenticatedUser,
  ): Promise<{ deleted: number; created: number }> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) throw new PropertyNotFoundError(propertyId);
    if (!property.handoverDate) {
      throw new PropertyHasNoHandoverDateError(propertyId);
    }

    const deleted = await this.repo.deletePendingForProperty(propertyId);
    const milestones = this.generator.generateFromHandoverDate(
      property.handoverDate,
    );
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const created = await this.repo.createMany(
      milestones.map((m) => ({
        propertyId,
        scheduleType: m.scheduleType,
        scheduledDate: m.scheduledDate,
        status:
          m.scheduledDate < today
            ? MaintenanceScheduleStatus.overdue
            : MaintenanceScheduleStatus.pending,
        createdById: user.id,
        updatedById: user.id,
      })),
    );

    return { deleted, created };
  }

  /**
   * Create the 4 auto schedules for a freshly-saved property with a handover date.
   * Idempotent: if any non-cancelled schedules already exist for this property, no-op.
   * Called by event listeners or property service.
   */
  async ensureSchedulesForProperty(
    propertyId: string,
    handoverDate: Date,
    actorUserId: string,
  ): Promise<number> {
    const existing = await this.prisma.maintenanceSchedule.count({
      where: {
        propertyId,
        deletedAt: null,
        status: { not: MaintenanceScheduleStatus.cancelled },
      },
    });
    if (existing > 0) return 0;

    const milestones = this.generator.generateFromHandoverDate(handoverDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.repo.createMany(
      milestones.map((m) => ({
        propertyId,
        scheduleType: m.scheduleType,
        scheduledDate: m.scheduledDate,
        status:
          m.scheduledDate < today
            ? MaintenanceScheduleStatus.overdue
            : MaintenanceScheduleStatus.pending,
        createdById: actorUserId,
        updatedById: actorUserId,
      })),
    );
  }

  private toSummary(s: ScheduleWithRelations): MaintenanceScheduleSummary {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const daysUntil = Math.floor(
      (s.scheduledDate.getTime() - today.getTime()) / 86_400_000,
    );
    return {
      id: s.id,
      propertyId: s.propertyId,
      propertyAddress: s.property.address,
      customerId: s.property.customer.id,
      customerName: s.property.customer.name,
      scheduleType: s.scheduleType as MaintenanceScheduleType,
      scheduledDate: s.scheduledDate.toISOString().slice(0, 10),
      status: s.status,
      notifiedAt: s.notifiedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      completedRecordId: s.completedRecordId,
      daysUntil,
      notes: s.notes,
    };
  }
}
