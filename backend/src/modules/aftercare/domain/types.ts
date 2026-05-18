import type {
  AftercareRecordStatus,
  AftercareRecordType,
  MaintenanceScheduleStatus,
  MaintenanceScheduleType,
} from '@prisma/client';

export interface OBCustomerNextMaintenance {
  scheduleId: string;
  scheduledDate: string;
  scheduleType: MaintenanceScheduleType;
  status: MaintenanceScheduleStatus;
  isOverdue: boolean;
  daysUntil: number;
}

export interface OBCustomerSummary {
  id: string;
  name: string;
  nameKana: string | null;
  phone: string | null;
  email: string | null;
  isOb: boolean;
  propertyCount: number;
  nextMaintenance: OBCustomerNextMaintenance | null;
  openRecordCount: number;
}

export interface OBCustomersList {
  items: OBCustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MaintenanceScheduleSummary {
  id: string;
  propertyId: string;
  propertyAddress: string;
  customerId: string;
  customerName: string;
  scheduleType: MaintenanceScheduleType;
  scheduledDate: string;
  status: MaintenanceScheduleStatus;
  notifiedAt: string | null;
  completedAt: string | null;
  completedRecordId: string | null;
  daysUntil: number;
  notes: string | null;
}

export interface MaintenanceSchedulesList {
  items: MaintenanceScheduleSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AftercareRecordSummary {
  id: string;
  customerId: string;
  customerName: string;
  propertyId: string | null;
  propertyAddress: string | null;
  scheduleId: string | null;
  recordType: AftercareRecordType;
  status: AftercareRecordStatus;
  occurredAt: string;
  title: string;
  description: string;
  handledById: string | null;
  handledByName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface AftercareRecordsList {
  items: AftercareRecordSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AftercareTimelineEntry {
  kind: 'project' | 'schedule' | 'record';
  id: string;
  date: string;
  title: string;
  status: string;
  subtitle: string | null;
  meta: Record<string, unknown>;
}
