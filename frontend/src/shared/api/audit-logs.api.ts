import { apiClient } from './client';

export interface AuditLogSummary {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: string;
}

export interface ListAuditLogsParams {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogsResponse {
  items: AuditLogSummary[];
  total: number;
  page: number;
  pageSize: number;
  distinctActions: string[];
}

export const auditLogsApi = {
  async list(params: ListAuditLogsParams): Promise<AuditLogsResponse> {
    const { data } = await apiClient.get<AuditLogsResponse>('/audit-logs', {
      params,
    });
    return data;
  },
};
