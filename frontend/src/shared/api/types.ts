export type UserRole = 'system_admin' | 'manager' | 'employee' | 'invited';
export type UserStatus = 'pending_invite' | 'active' | 'suspended' | 'disabled';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  twoFaEnabled: boolean;
  forcePasswordChange: boolean;
  forceTwoFaEnrollment: boolean;
}

export interface User extends AuthUser {
  nameKana: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  traceId?: string;
  details?: Record<string, unknown>;
}

export interface LoginSuccessResponse {
  user: AuthUser;
  requires2fa: false;
}

export interface LoginRequires2faResponse {
  requires2fa: true;
  intermediateToken: string;
  expiresIn: number;
}

export type LoginResponse = LoginSuccessResponse | LoginRequires2faResponse;

export interface MeResponse {
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
