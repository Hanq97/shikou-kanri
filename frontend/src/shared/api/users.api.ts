import { apiClient } from './client';
import type { UserRole, UserStatus } from './types';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  nameKana: string | null;
  role: UserRole;
  status: UserStatus;
  twoFaEnabled: boolean;
  lockedUntil: string | null;
  requireAdminUnlock: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'name' | 'email' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListUsersResponse {
  data: UserSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export const usersApi = {
  async list(params: ListUsersParams = {}): Promise<ListUsersResponse> {
    const { data } = await apiClient.get<ListUsersResponse>('/users', { params });
    return data;
  },

  async get(id: string): Promise<UserSummary> {
    const { data } = await apiClient.get<{ user: UserSummary }>(`/users/${id}`);
    return data.user;
  },

  async invite(payload: {
    email: string;
    role: UserRole;
    name?: string;
  }): Promise<{ invitation: InvitationDto; message: string }> {
    const { data } = await apiClient.post<{ invitation: InvitationDto; message: string }>(
      '/users/invitations',
      payload,
    );
    return data;
  },

  async cancelInvitation(id: string): Promise<void> {
    await apiClient.delete(`/users/invitations/${id}`);
  },

  async changeRole(id: string, role: UserRole): Promise<UserSummary> {
    const { data } = await apiClient.put<{ user: UserSummary }>(`/users/${id}/role`, { role });
    return data.user;
  },

  async changeStatus(id: string, status: UserStatus): Promise<UserSummary> {
    const { data } = await apiClient.put<{ user: UserSummary }>(`/users/${id}/status`, { status });
    return data.user;
  },

  async updateProfile(
    id: string,
    payload: { name?: string; nameKana?: string },
  ): Promise<UserSummary> {
    const { data } = await apiClient.put<{ user: UserSummary }>(`/users/${id}/profile`, payload);
    return data.user;
  },

  async unlock(id: string): Promise<UserSummary> {
    const { data } = await apiClient.post<{ user: UserSummary }>(`/users/${id}/unlock`);
    return data.user;
  },

  async emergencyDisable2Fa(id: string, reason: string): Promise<UserSummary> {
    const { data } = await apiClient.post<{ user: UserSummary }>(`/users/${id}/2fa/disable`, {
      reason,
    });
    return data.user;
  },

  async softDelete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
