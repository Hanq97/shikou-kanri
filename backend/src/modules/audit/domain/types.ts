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

export interface AuditLogsList {
  items: AuditLogSummary[];
  total: number;
  page: number;
  pageSize: number;
  distinctActions: string[];
}
