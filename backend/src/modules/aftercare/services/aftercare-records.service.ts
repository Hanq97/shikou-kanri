import { Injectable } from '@nestjs/common';
import {
  AftercareRecordStatus,
  AftercareRecordType,
  MaintenanceScheduleStatus,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AftercareRecordNotFoundError } from '../../../shared/exceptions/aftercare-errors';
import type { AuthenticatedUser } from '../../auth/domain/types';
import type {
  AftercareRecordSummary,
  AftercareRecordsList,
  AftercareTimelineEntry,
} from '../domain/types';
import {
  AftercareRecordRepository,
  RecordListFilter,
  RecordWithRelations,
} from '../repositories/aftercare-record.repository';

export interface CreateRecordInput {
  customerId: string;
  propertyId?: string;
  scheduleId?: string;
  recordType: AftercareRecordType;
  status?: AftercareRecordStatus;
  occurredAt: string;
  title: string;
  description: string;
  handledById?: string;
}

export interface UpdateRecordInput {
  status?: AftercareRecordStatus;
  title?: string;
  description?: string;
  occurredAt?: string;
  handledById?: string;
  resolutionNotes?: string;
}

@Injectable()
export class AftercareRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AftercareRecordRepository,
  ) {}

  async list(filter: RecordListFilter): Promise<AftercareRecordsList> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;
    const { items, total } = await this.repo.list({
      ...filter,
      page,
      pageSize,
    });
    return {
      items: items.map((r) => this.toSummary(r)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<AftercareRecordSummary> {
    const record = await this.repo.findById(id);
    if (!record) throw new AftercareRecordNotFoundError(id);
    return this.toSummary(record);
  }

  async create(
    input: CreateRecordInput,
    user: AuthenticatedUser,
  ): Promise<AftercareRecordSummary> {
    const occurred = new Date(input.occurredAt);
    const created = await this.repo.create({
      customer: { connect: { id: input.customerId } },
      property: input.propertyId
        ? { connect: { id: input.propertyId } }
        : undefined,
      schedule: input.scheduleId
        ? { connect: { id: input.scheduleId } }
        : undefined,
      recordType: input.recordType,
      status: input.status ?? AftercareRecordStatus.open,
      occurredAt: occurred,
      title: input.title,
      description: input.description,
      handledBy: input.handledById
        ? { connect: { id: input.handledById } }
        : undefined,
      createdBy: { connect: { id: user.id } },
      updatedBy: { connect: { id: user.id } },
    });

    // Auto-mark linked schedule as completed
    if (input.scheduleId) {
      await this.prisma.maintenanceSchedule.update({
        where: { id: input.scheduleId },
        data: {
          status: MaintenanceScheduleStatus.completed,
          completedAt: new Date(),
          completedRecordId: created.id,
        },
      });
    }

    return this.findById(created.id);
  }

  async update(
    id: string,
    input: UpdateRecordInput,
    user: AuthenticatedUser,
  ): Promise<AftercareRecordSummary> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AftercareRecordNotFoundError(id);

    const becomingResolved =
      (input.status === 'resolved' || input.status === 'closed') &&
      existing.status !== 'resolved' &&
      existing.status !== 'closed';

    await this.repo.update(id, {
      status: input.status,
      title: input.title,
      description: input.description,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      resolutionNotes: input.resolutionNotes,
      handledBy: input.handledById
        ? { connect: { id: input.handledById } }
        : undefined,
      resolvedAt: becomingResolved ? new Date() : undefined,
      updatedBy: { connect: { id: user.id } },
    });
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AftercareRecordNotFoundError(id);
    await this.repo.softDelete(id);
  }

  /**
   * Customer aftercare timeline: combined schedules + records, sorted desc by date.
   */
  async timelineForCustomer(
    customerId: string,
  ): Promise<AftercareTimelineEntry[]> {
    const [records, schedules] = await Promise.all([
      this.prisma.aftercareRecord.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { occurredAt: 'desc' },
        include: {
          property: { select: { address: true } },
          handledBy: { select: { name: true } },
        },
      }),
      this.prisma.maintenanceSchedule.findMany({
        where: {
          deletedAt: null,
          property: { customerId, deletedAt: null },
        },
        orderBy: { scheduledDate: 'desc' },
        include: {
          property: { select: { address: true } },
        },
      }),
    ]);

    const entries: AftercareTimelineEntry[] = [];
    for (const r of records) {
      entries.push({
        kind: 'record',
        id: r.id,
        date: r.occurredAt.toISOString().slice(0, 10),
        title: r.title,
        status: r.status,
        subtitle: r.property?.address ?? null,
        meta: {
          recordType: r.recordType,
          handledByName: r.handledBy?.name ?? null,
          description: r.description,
        },
      });
    }
    for (const s of schedules) {
      entries.push({
        kind: 'schedule',
        id: s.id,
        date: s.scheduledDate.toISOString().slice(0, 10),
        title: `${s.scheduleType} 点検`,
        status: s.status,
        subtitle: s.property.address,
        meta: { scheduleType: s.scheduleType },
      });
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }

  private toSummary(r: RecordWithRelations): AftercareRecordSummary {
    return {
      id: r.id,
      customerId: r.customerId,
      customerName: r.customer.name,
      propertyId: r.propertyId,
      propertyAddress: r.property?.address ?? null,
      scheduleId: r.scheduleId,
      recordType: r.recordType as AftercareRecordType,
      status: r.status,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
      title: r.title,
      description: r.description,
      handledById: r.handledById,
      handledByName: r.handledBy?.name ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      resolutionNotes: r.resolutionNotes,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
