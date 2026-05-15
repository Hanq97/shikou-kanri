export type UserRoleName = 'system_admin' | 'manager' | 'employee' | 'invited';
export type UserStatusName = 'pending_invite' | 'active' | 'suspended' | 'disabled';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleName;
  status: UserStatusName;
  twoFaEnabled: boolean;
  forcePasswordChange: boolean;
  forceTwoFaEnrollment: boolean;
}

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  traceId: string;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRoleName;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}
