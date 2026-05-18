import { Injectable } from '@nestjs/common';
import type { AuditLogsList, AuditLogSummary } from '../domain/types';
import {
  AuditLogFilter,
  AuditLogRepository,
  AuditLogWithActor,
} from '../repositories/audit-log.repository';

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogRepository) {}

  async list(filter: AuditLogFilter): Promise<AuditLogsList> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;
    const [{ items, total }, distinctActions] = await Promise.all([
      this.repo.list({ ...filter, page, pageSize }),
      this.repo.distinctActions(),
    ]);
    return {
      items: items.map((r) => this.toSummary(r)),
      total,
      page,
      pageSize,
      distinctActions,
    };
  }

  private toSummary(log: AuditLogWithActor): AuditLogSummary {
    return {
      id: log.id,
      actorUserId: log.actorUserId,
      actorName: log.actor?.name ?? null,
      actorEmail: log.actor?.email ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changes:
        log.changes &&
        typeof log.changes === 'object' &&
        !Array.isArray(log.changes)
          ? (log.changes as Record<string, unknown>)
          : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      occurredAt: log.occurredAt.toISOString(),
    };
  }
}
