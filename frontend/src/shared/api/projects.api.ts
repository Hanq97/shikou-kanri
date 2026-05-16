import { apiClient } from './client';

export type ProjectStatus =
  | 'quoting'
  | 'received'
  | 'construction'
  | 'completed'
  | 'handed_over'
  | 'cancelled';

export type ProjectType = 'new_construction' | 'remodel' | 'repair' | 'aftercare';

export type ProjectMemberRole = 'owner' | 'contributor' | 'inspector' | 'invited_worker';

export type FolderType =
  | 'document'
  | 'drawing'
  | 'schedule'
  | 'photo'
  | 'chalkboard'
  | 'inspection'
  | 'custom';

export interface ProjectSummary {
  id: string;
  projectCode: string;
  customerId: string;
  propertyId: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  name: string;
  description: string | null;
  ownerUserId: string;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  amountTotal: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
  customer: { id: string; name: string; nameKana: string | null };
  property: { id: string; address: string } | null;
  owner: { id: string; name: string; email: string };
}

export interface ListProjectsParams {
  search?: string;
  status?: ProjectStatus[];
  customerId?: string;
  ownerUserId?: string;
  projectType?: ProjectType[];
  from?: string;
  to?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'scheduleStart' | 'projectCode';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListProjectsResponse {
  data: ProjectSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateProjectInput {
  customerId?: string;
  propertyId?: string;
  projectType: ProjectType;
  name: string;
  description?: string;
  ownerUserId: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  preAcquisition?: boolean;
}

export interface UpdateProjectInput {
  projectType?: ProjectType;
  name?: string;
  description?: string;
  ownerUserId?: string;
  propertyId?: string | null;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
}

export interface ChangeStatusInput {
  status: Exclude<ProjectStatus, 'quoting'>;
  amountTotal?: number;
  reason?: string;
}

export interface ReverseStatusInput {
  status: 'quoting' | 'received' | 'construction' | 'completed';
  reason: string;
}

export interface FolderSummary {
  id: string;
  projectId: string;
  name: string;
  folderType: FolderType;
  isPublicForInvited: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  roleOnProject: ProjectMemberRole;
  folderAccessOverride: unknown;
  invitedAt: string;
  revokedAt: string | null;
}

function buildSearch(params: ListProjectsParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.status?.length) sp.set('status', params.status.join(','));
  if (params.customerId) sp.set('customerId', params.customerId);
  if (params.ownerUserId) sp.set('ownerUserId', params.ownerUserId);
  if (params.projectType?.length) sp.set('projectType', params.projectType.join(','));
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.sortOrder) sp.set('sortOrder', params.sortOrder);
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  return sp;
}

export const projectsApi = {
  async list(params: ListProjectsParams = {}): Promise<ListProjectsResponse> {
    const { data } = await apiClient.get<ListProjectsResponse>('/projects', {
      params: buildSearch(params),
    });
    return data;
  },

  async get(id: string): Promise<ProjectSummary> {
    const { data } = await apiClient.get<{ project: ProjectSummary }>(`/projects/${id}`);
    return data.project;
  },

  async listFolders(id: string): Promise<FolderSummary[]> {
    const { data } = await apiClient.get<{ data: FolderSummary[] }>(`/projects/${id}/folders`);
    return data.data;
  },

  async create(input: CreateProjectInput): Promise<ProjectSummary> {
    const { data } = await apiClient.post<{ project: ProjectSummary }>('/projects', input);
    return data.project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<ProjectSummary> {
    const { data } = await apiClient.put<{ project: ProjectSummary }>(`/projects/${id}`, input);
    return data.project;
  },

  async softDelete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async changeStatus(id: string, input: ChangeStatusInput): Promise<ProjectSummary> {
    const { data } = await apiClient.post<{ project: ProjectSummary }>(
      `/projects/${id}/status`,
      input,
    );
    return data.project;
  },

  async reverseStatus(id: string, input: ReverseStatusInput): Promise<ProjectSummary> {
    const { data } = await apiClient.post<{ project: ProjectSummary }>(
      `/projects/${id}/status/reverse`,
      input,
    );
    return data.project;
  },
};

export const projectMembersApi = {
  async list(projectId: string): Promise<ProjectMember[]> {
    const { data } = await apiClient.get<{ data: ProjectMember[] }>(
      `/projects/${projectId}/members`,
    );
    return data.data;
  },

  async add(
    projectId: string,
    userId: string,
    roleOnProject: ProjectMemberRole,
  ): Promise<ProjectMember> {
    const { data } = await apiClient.post<{ member: ProjectMember }>(
      `/projects/${projectId}/members`,
      { userId, roleOnProject },
    );
    return data.member;
  },

  async updateRole(
    projectId: string,
    userId: string,
    roleOnProject: ProjectMemberRole,
  ): Promise<ProjectMember> {
    const { data } = await apiClient.put<{ member: ProjectMember }>(
      `/projects/${projectId}/members/${userId}`,
      { roleOnProject },
    );
    return data.member;
  },

  async remove(projectId: string, userId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },
};
