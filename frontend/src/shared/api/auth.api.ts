import { apiClient } from './client';
import type { AuthUser, LoginResponse, MeResponse } from './types';

export interface InvitationInfo {
  valid: true;
  email: string;
  role: string;
  name: string | null;
  expiresAt: string;
}

export interface InvitationAcceptResponse {
  user: AuthUser;
  message: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  async verify2Fa(intermediateToken: string, code: string, useBackupCode: boolean): Promise<{ user: AuthUser }> {
    const { data } = await apiClient.post<{ user: AuthUser }>('/auth/2fa/verify', {
      intermediateToken,
      code,
      useBackupCode,
    });
    return data;
  },

  async me(): Promise<MeResponse> {
    const { data } = await apiClient.get<MeResponse>('/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async logoutAll(): Promise<{ revokedCount: number }> {
    const { data } = await apiClient.post<{ revokedCount: number }>('/auth/logout-all');
    return data;
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/password/reset-request', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/password/reset', { token, newPassword });
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/password/change', { oldPassword, newPassword });
  },

  async getInvitation(token: string): Promise<InvitationInfo> {
    const { data } = await apiClient.get<InvitationInfo>(
      `/auth/invitations/${encodeURIComponent(token)}`,
    );
    return data;
  },

  async acceptInvitation(token: string, password: string): Promise<InvitationAcceptResponse> {
    const { data } = await apiClient.post<InvitationAcceptResponse>('/auth/invitations/accept', {
      token,
      password,
    });
    return data;
  },

  async start2FaEnroll(): Promise<{ secret: string; otpauthUri: string; qrCodeDataUrl: string }> {
    const { data } = await apiClient.post<{
      secret: string;
      otpauthUri: string;
      qrCodeDataUrl: string;
    }>('/auth/2fa/enroll');
    return data;
  },

  async verify2FaEnroll(code: string): Promise<{ backupCodes: string[] }> {
    const { data } = await apiClient.post<{ backupCodes: string[] }>('/auth/2fa/enroll/verify', {
      code,
    });
    return data;
  },

  async disable2Fa(password: string, code: string, useBackupCode: boolean): Promise<void> {
    await apiClient.post('/auth/2fa/disable', { password, code, useBackupCode });
  },
};
