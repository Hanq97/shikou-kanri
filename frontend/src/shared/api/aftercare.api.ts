import { apiClient } from './client';

export type MaintenanceScheduleType =
  | 'one_year'
  | 'three_year'
  | 'five_year'
  | 'ten_year'
  | 'custom';

export type MaintenanceScheduleStatus =
  | 'pending'
  | 'notified'
  | 'overdue'
  | 'completed'
  | 'cancelled';

export type AftercareRecordType = 'inspection' | 'repair' | 'inquiry' | 'complaint' | 'other';

export type AftercareRecordStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

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

export interface ListObCustomersParams {
  search?: string;
  nextMaintenanceFrom?: string;
  nextMaintenanceTo?: string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
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

export interface ListSchedulesParams {
  customerId?: string;
  propertyId?: string;
  status?: MaintenanceScheduleStatus | MaintenanceScheduleStatus[];
  scheduleType?: MaintenanceScheduleType;
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  pageSize?: number;
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

export interface CreateRecordPayload {
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

export interface UpdateRecordPayload {
  status?: AftercareRecordStatus;
  title?: string;
  description?: string;
  occurredAt?: string;
  handledById?: string;
  resolutionNotes?: string;
}

interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchRunResult {
  notifiedCount: number;
  emailsSent: number;
  overdueMarkedCount: number;
  ranAt: string;
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

export const aftercareApi = {
  async listOBCustomers(params: ListObCustomersParams): Promise<PageResponse<OBCustomerSummary>> {
    const { data } = await apiClient.get<PageResponse<OBCustomerSummary>>(
      '/aftercare/ob-customers',
      { params },
    );
    return data;
  },

  async listSchedules(
    params: ListSchedulesParams,
  ): Promise<PageResponse<MaintenanceScheduleSummary>> {
    const { data } = await apiClient.get<PageResponse<MaintenanceScheduleSummary>>(
      '/aftercare/schedules',
      { params },
    );
    return data;
  },

  async markScheduleCompleted(id: string, notes?: string): Promise<MaintenanceScheduleSummary> {
    const { data } = await apiClient.post<MaintenanceScheduleSummary>(
      `/aftercare/schedules/${id}/mark-completed`,
      { notes },
    );
    return data;
  },

  async cancelSchedule(id: string, reason?: string): Promise<MaintenanceScheduleSummary> {
    const { data } = await apiClient.post<MaintenanceScheduleSummary>(
      `/aftercare/schedules/${id}/cancel`,
      { reason },
    );
    return data;
  },

  async regenerateScheduleForProperty(
    propertyId: string,
  ): Promise<{ deleted: number; created: number }> {
    const { data } = await apiClient.post<{ deleted: number; created: number }>(
      `/aftercare/schedules/regenerate-for-property/${propertyId}`,
    );
    return data;
  },

  async listRecords(params: {
    customerId?: string;
    propertyId?: string;
    status?: AftercareRecordStatus;
    recordType?: AftercareRecordType;
    page?: number;
    pageSize?: number;
  }): Promise<PageResponse<AftercareRecordSummary>> {
    const { data } = await apiClient.get<PageResponse<AftercareRecordSummary>>(
      '/aftercare/records',
      { params },
    );
    return data;
  },

  async createRecord(payload: CreateRecordPayload): Promise<AftercareRecordSummary> {
    const { data } = await apiClient.post<AftercareRecordSummary>('/aftercare/records', payload);
    return data;
  },

  async updateRecord(id: string, payload: UpdateRecordPayload): Promise<AftercareRecordSummary> {
    const { data } = await apiClient.patch<AftercareRecordSummary>(
      `/aftercare/records/${id}`,
      payload,
    );
    return data;
  },

  async deleteRecord(id: string): Promise<void> {
    await apiClient.delete(`/aftercare/records/${id}`);
  },

  async customerTimeline(customerId: string): Promise<{ items: AftercareTimelineEntry[] }> {
    const { data } = await apiClient.get<{ items: AftercareTimelineEntry[] }>(
      `/aftercare/customers/${customerId}/timeline`,
    );
    return data;
  },

  async runBatch(): Promise<BatchRunResult> {
    const { data } = await apiClient.post<BatchRunResult>('/aftercare/batch/run');
    return data;
  },
};
