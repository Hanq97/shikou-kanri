# 認証 & 権限管理 — Backend Detail Design (BDD)

## Document Information

- **Feature ID**: F8-AUTH
- **Tên feature**: 認証 & 権限管理 (Authentication & Authorization)
- **Phiên bản**: 1.0.0
- **Tác giả**: DEHA Solutions (Hanq97)
- **Ngày tạo**: 2026-05-16
- **Module**: `backend/src/modules/auth/` + `backend/src/modules/notification/` + `backend/src/cli/`
- **Refs**: [SRS](./F8-AUTH-BASE-srs.md) | [BD](./F8-AUTH-BASE-basic-design.md) | [API Contracts](./F8-AUTH-BASE-api-contracts.md)

---

## 01 — Module Structure / Cấu trúc Module

### 1.1 Backend folder layout

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── index.ts                          # Public API barrel
│   │   ├── auth.module.ts                    # NestJS module class
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts            # /auth/* endpoints
│   │   │   └── users.controller.ts           # /users/* endpoints
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts               # Login, refresh, logout
│   │   │   ├── users.service.ts              # User CRUD
│   │   │   ├── invitations.service.ts        # Invite flow
│   │   │   └── account-lockout.service.ts    # Lockout tracking
│   │   │
│   │   ├── strategies/
│   │   │   ├── local.strategy.ts             # passport-local
│   │   │   └── jwt.strategy.ts               # passport-jwt
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   ├── project-membership.guard.ts   # stub for Phase 2
│   │   │   └── require-2fa.guard.ts
│   │   │
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── require-2fa.decorator.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── verify-2fa.dto.ts
│   │   │   ├── refresh.dto.ts
│   │   │   ├── password-reset-request.dto.ts
│   │   │   ├── password-reset.dto.ts
│   │   │   ├── change-password.dto.ts
│   │   │   ├── enroll-2fa.dto.ts
│   │   │   ├── verify-enrollment.dto.ts
│   │   │   ├── disable-2fa.dto.ts
│   │   │   ├── accept-invitation.dto.ts
│   │   │   ├── create-invitation.dto.ts
│   │   │   ├── change-role.dto.ts
│   │   │   ├── change-status.dto.ts
│   │   │   ├── update-profile.dto.ts
│   │   │   ├── emergency-disable-2fa.dto.ts
│   │   │   └── list-users-query.dto.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   ├── refresh-token.repository.ts
│   │   │   ├── password-reset.repository.ts
│   │   │   └── invitation.repository.ts
│   │   │
│   │   ├── domain/
│   │   │   ├── user.entity.ts                # Domain entity (rules)
│   │   │   ├── role.enum.ts
│   │   │   ├── status.enum.ts
│   │   │   ├── password-policy.ts            # Pure logic
│   │   │   └── auth-events.ts                # Event types
│   │   │
│   │   └── internal/
│   │       ├── password.service.ts           # argon2 wrap
│   │       ├── token.service.ts              # JWT sign/verify
│   │       ├── totp.service.ts               # otplib wrap
│   │       ├── intermediate-token.service.ts # Short-lived 2FA challenge token
│   │       └── audit-stub.service.ts         # AuditService (Phase 1 stub)
│   │
│   └── notification/
│       ├── index.ts
│       ├── notification.module.ts
│       ├── services/
│       │   └── email.service.ts              # SMTP wrapper
│       ├── templates/
│       │   ├── engine.ts                     # Handlebars wrapper
│       │   ├── invitation.hbs
│       │   ├── password-reset.hbs
│       │   ├── password-changed.hbs
│       │   ├── 2fa-enrolled.hbs
│       │   └── account-locked.hbs
│       └── dto/
│           └── send-email.dto.ts
│
├── shared/
│   ├── database/
│   │   ├── prisma.module.ts                  # Global Prisma module
│   │   ├── prisma.service.ts                 # Prisma client lifecycle
│   │   └── transactional.decorator.ts        # @Transactional() helper
│   │
│   ├── crypto/
│   │   ├── argon2.service.ts                 # Argon2id hash/verify
│   │   ├── aes.service.ts                    # AES-256-GCM encrypt/decrypt
│   │   ├── hash.service.ts                   # SHA-256 helpers
│   │   └── random.service.ts                 # Cryptographically secure random
│   │
│   ├── observability/
│   │   ├── logger.module.ts                  # Pino setup
│   │   ├── logger.service.ts                 # Wrapper với context
│   │   └── trace.middleware.ts               # TraceId injection
│   │
│   ├── exceptions/
│   │   ├── app-error.ts                      # Base AppError
│   │   ├── auth-errors.ts                    # AUTH_* error subclasses
│   │   ├── validation-error.ts
│   │   ├── not-found-error.ts
│   │   └── global-exception.filter.ts        # Global error mapper
│   │
│   └── http/
│       ├── cookie.service.ts                 # Cookie set/clear helpers
│       └── pipes.ts                          # ValidationPipe config
│
└── cli/
    ├── cli.module.ts
    └── bootstrap-create-admin.command.ts     # CLI command
```

### 1.2 Module Dependencies

```
auth module dependencies:
  ├── shared/database (PrismaService)
  ├── shared/crypto (ArgonService, AesService, HashService, RandomService)
  ├── shared/observability (LoggerService)
  ├── shared/exceptions (AppError types)
  ├── shared/http (CookieService)
  └── notification module (EmailService — public API)

notification module dependencies:
  └── shared/observability (LoggerService)

cli module dependencies:
  ├── shared/database
  ├── shared/crypto
  └── auth module (UsersService)
```

**ESLint boundaries**:
- Auth controllers chỉ import services from auth/services
- Services chỉ import repositories + internal + domain (within auth)
- Domain entities zero infra dependencies (pure logic)

---

## 02 — Service Layer Interfaces / Lớp Service

### 2.1 AuthService

**Vai trò**: Orchestration cho authentication flows.

```typescript
// backend/src/modules/auth/services/auth.service.ts

@Injectable()
export class AuthService {
  // === Login flow ===
  
  /**
   * Authenticate user với email + password.
   * @throws AuthInvalidCredentialsError, AuthAccountLockedError, AuthAccountSuspendedError
   */
  async login(input: LoginInput, ctx: RequestContext): Promise<LoginResult>;
  
  /**
   * Verify TOTP code or backup code sau bước password.
   * @throws AuthTokenExpiredError, Auth2FaInvalidError
   */
  async verify2Fa(input: Verify2FaInput, ctx: RequestContext): Promise<LoginResult>;
  
  // === Token management ===
  
  /**
   * Rotate refresh + access tokens.
   * Detect reuse → revoke entire family.
   * @throws AuthRefreshInvalidError, AuthRefreshReuseDetectedError
   */
  async refreshTokens(refreshToken: string, ctx: RequestContext): Promise<TokenPair>;
  
  /**
   * Revoke current refresh token.
   */
  async logout(refreshToken: string, ctx: RequestContext): Promise<void>;
  
  /**
   * Revoke all refresh tokens của user.
   * @returns Số tokens revoked
   */
  async logoutAll(userId: string, ctx: RequestContext): Promise<{ revokedCount: number }>;
  
  // === Password management ===
  
  /**
   * Always returns success (no enumeration).
   * Background: if email exists → generate reset token + send email.
   */
  async requestPasswordReset(email: string, ctx: RequestContext): Promise<void>;
  
  /**
   * Reset password với signed token.
   * @throws AuthPasswordResetExpiredError, AuthPasswordResetInvalidError, AuthPasswordWeakError
   */
  async resetPassword(input: ResetPasswordInput, ctx: RequestContext): Promise<void>;
  
  /**
   * Change password (authenticated, requires old password).
   * Revokes other refresh tokens.
   * @throws AuthInvalidCredentialsError, AuthPasswordWeakError
   */
  async changePassword(userId: string, input: ChangePasswordInput, ctx: RequestContext): Promise<TokenPair>;
  
  // === 2FA management ===
  
  /**
   * Start 2FA enrollment — generate temp secret + QR.
   */
  async enroll2FaStart(userId: string): Promise<Enroll2FaStartResult>;
  
  /**
   * Verify first TOTP code, finalize enrollment, generate backup codes.
   * @throws Auth2FaInvalidError
   */
  async enroll2FaVerify(userId: string, code: string, ctx: RequestContext): Promise<Enroll2FaCompleteResult>;
  
  /**
   * Disable 2FA (user-initiated, requires password + TOTP/backup).
   * @throws AuthInvalidCredentialsError, Auth2FaInvalidError, AuthInsufficientPermissionError (admin self-disable)
   */
  async disable2Fa(userId: string, input: Disable2FaInput, ctx: RequestContext): Promise<void>;
  
  /**
   * Use backup code during 2FA challenge.
   */
  async useBackupCode(intermediateToken: string, code: string, ctx: RequestContext): Promise<LoginResult>;
  
  // === Profile ===
  
  /**
   * Get current user.
   */
  async getCurrentUser(userId: string): Promise<AuthUser>;
}

// === Input types ===

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  kind: 'success' | 'requires2fa';
  user?: AuthUser;
  tokens?: TokenPair;
  intermediateToken?: string;
  intermediateTokenExpiresIn?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;   // seconds
  refreshExpiresIn: number;  // seconds
}

interface RequestContext {
  ipAddress: string;
  userAgent: string;
  traceId: string;
}

interface Enroll2FaStartResult {
  secret: string;             // base32
  otpauthUri: string;
  qrCodeDataUrl: string;      // base64 image
  enrollmentExpiresAt: Date;  // 10 min
}

interface Enroll2FaCompleteResult {
  backupCodes: string[];      // 10 codes
}
```

### 2.2 UsersService

```typescript
// backend/src/modules/auth/services/users.service.ts

@Injectable()
export class UsersService {
  
  /**
   * List users với filter + pagination.
   */
  async listUsers(query: ListUsersQuery, currentUser: AuthUser): Promise<PaginatedResult<User>>;
  
  /**
   * Get user detail.
   * @throws NotFoundError, AuthInsufficientPermissionError
   */
  async findById(id: string, currentUser: AuthUser): Promise<User>;
  
  /**
   * Change user role.
   * @throws NotFoundError, AuthLastAdminError, AuthInsufficientPermissionError
   */
  async changeRole(userId: string, newRole: UserRole, actor: AuthUser, ctx: RequestContext): Promise<User>;
  
  /**
   * Change user status (suspend/activate/disable).
   * Revokes refresh tokens nếu status != 'active'.
   */
  async changeStatus(userId: string, newStatus: UserStatus, actor: AuthUser, ctx: RequestContext): Promise<User>;
  
  /**
   * Update profile.
   */
  async updateProfile(userId: string, input: UpdateProfileInput, actor: AuthUser, ctx: RequestContext): Promise<User>;
  
  /**
   * Manual unlock sau lockout.
   */
  async unlockUser(userId: string, actor: AuthUser, ctx: RequestContext): Promise<User>;
  
  /**
   * Emergency disable 2FA cho user khác (NOT self).
   * @throws AuthInsufficientPermissionError nếu self
   */
  async emergencyDisable2Fa(userId: string, reason: string, actor: AuthUser, ctx: RequestContext): Promise<User>;
  
  /**
   * Soft-delete user.
   * Revokes tất cả refresh tokens.
   * @throws AuthLastAdminError
   */
  async softDelete(userId: string, actor: AuthUser, ctx: RequestContext): Promise<void>;
  
  // === Helpers (used by other modules) ===
  
  /**
   * Check user exists + return basic info (cho permission checks).
   * Cached request-lifetime.
   */
  async findByIdInternal(id: string): Promise<User | null>;
  
  /**
   * Count active admins (cho last-admin protection).
   */
  async countActiveAdmins(): Promise<number>;
}

interface ListUsersQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface UpdateProfileInput {
  name?: string;
  nameKana?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 2.3 InvitationsService

```typescript
// backend/src/modules/auth/services/invitations.service.ts

@Injectable()
export class InvitationsService {
  
  /**
   * Send invitation. Creates pending user + token + sends email.
   * @throws AuthUserExistsError, AuthInsufficientPermissionError
   */
  async sendInvitation(input: CreateInvitationInput, inviter: AuthUser, ctx: RequestContext): Promise<Invitation>;
  
  /**
   * Cancel pending invitation.
   * @throws NotFoundError
   */
  async cancelInvitation(id: string, actor: AuthUser, ctx: RequestContext): Promise<void>;
  
  /**
   * Verify invitation token (cho frontend display).
   * @throws AuthInvitationInvalidError, AuthInvitationExpiredError, AuthInvitationUsedError
   */
  async verifyToken(token: string): Promise<InvitationMetadata>;
  
  /**
   * Accept invitation + set password + auto-login.
   * @throws AuthInvitationInvalidError, AuthInvitationExpiredError, AuthInvitationUsedError, AuthPasswordWeakError
   */
  async acceptInvitation(input: AcceptInvitationInput, ctx: RequestContext): Promise<LoginResult>;
}

interface CreateInvitationInput {
  email: string;
  role: UserRole;
  name?: string;
}

interface AcceptInvitationInput {
  token: string;
  password: string;
}

interface InvitationMetadata {
  email: string;
  role: UserRole;
  inviterName: string;
  expiresAt: Date;
}
```

### 2.4 AccountLockoutService

```typescript
// backend/src/modules/auth/services/account-lockout.service.ts

@Injectable()
export class AccountLockoutService {
  
  /**
   * Track failed login attempt + apply lockout if needed.
   * @returns { layer1Lock: boolean, layer2Lock: boolean, lockedUntil?: Date }
   */
  async recordFailedAttempt(userId: string, ctx: RequestContext): Promise<LockoutResult>;
  
  /**
   * Reset attempts on successful login.
   */
  async resetAttempts(userId: string): Promise<void>;
  
  /**
   * Check if user currently locked.
   * @throws AuthAccountLockedError nếu locked
   */
  async checkNotLocked(userId: string): Promise<void>;
  
  /**
   * Manual unlock (admin only).
   */
  async unlock(userId: string, actor: AuthUser): Promise<void>;
}

interface LockoutResult {
  layer1Lock: boolean;       // 5 fail / 15min
  layer2Lock: boolean;       // 10 fail / 1h — requires admin unlock
  lockedUntil?: Date;
}
```

---

## 03 — Internal Services / Services Nội bộ

### 3.1 PasswordService (argon2 wrap)

```typescript
// backend/src/modules/auth/internal/password.service.ts

@Injectable()
export class PasswordService {
  
  /**
   * Hash password using Argon2id.
   * Params: timeCost=3, memoryCost=64MB, parallelism=4.
   * @returns PHC string (~150ms compute on modern CPU)
   */
  async hash(plaintext: string): Promise<string>;
  
  /**
   * Verify password constant-time.
   */
  async verify(hash: string, plaintext: string): Promise<boolean>;
  
  /**
   * Validate password meets policy.
   * @throws AuthPasswordWeakError với details which rule failed
   */
  validatePolicy(plaintext: string): void;
}
```

Policy implementation (pure logic in `domain/password-policy.ts`):
```typescript
// backend/src/modules/auth/domain/password-policy.ts

export class PasswordPolicy {
  static readonly MIN_LENGTH = 12;
  static readonly REGEX_UPPERCASE = /[A-Z]/;
  static readonly REGEX_LOWERCASE = /[a-z]/;
  static readonly REGEX_DIGIT = /[0-9]/;
  static readonly REGEX_SYMBOL = /[^A-Za-z0-9]/;
  
  static validate(password: string): PolicyValidationResult;
}

interface PolicyValidationResult {
  valid: boolean;
  failures: PolicyRuleFailure[];
}

interface PolicyRuleFailure {
  rule: 'min_length' | 'uppercase' | 'lowercase' | 'digit' | 'symbol';
  message: string;
}
```

### 3.2 TokenService

```typescript
// backend/src/modules/auth/internal/token.service.ts

@Injectable()
export class TokenService {
  
  /**
   * Sign JWT access token (HS256).
   * Claims: { sub, email, role, jti, iat, exp, aud, iss }
   * TTL: 30 minutes
   */
  signAccessToken(payload: AccessTokenPayload): string;
  
  /**
   * Generate opaque refresh token (random 128-bit base64url).
   * @returns { plaintext, hash } — plaintext sent to client, hash stored in DB
   */
  generateRefreshToken(): Promise<{ plaintext: string; hash: string }>;
  
  /**
   * Verify access token signature + expiry.
   * @throws AuthTokenExpiredError, AuthTokenInvalidError
   */
  verifyAccessToken(token: string): AccessTokenPayload;
  
  /**
   * Hash refresh token plaintext (SHA-256) cho DB lookup.
   */
  hashRefreshToken(plaintext: string): string;
  
  /**
   * Issue full token pair (access + refresh) cho user.
   * Persists refresh trong DB.
   * Enforces max 5 active refresh tokens per user.
   */
  async issueTokenPair(userId: string, role: UserRole, ctx: RequestContext, familyId?: string, lineageSeq?: number): Promise<TokenPair>;
  
  /**
   * Rotate token pair: revoke current refresh, issue new pair với same family.
   * Detect reuse → revoke entire family.
   * @throws AuthRefreshInvalidError, AuthRefreshReuseDetectedError
   */
  async rotateTokenPair(currentRefreshPlaintext: string, ctx: RequestContext): Promise<TokenPair>;
  
  /**
   * Revoke single refresh token.
   */
  async revokeRefreshToken(plaintextOrHash: string, reason: RevokedReason): Promise<void>;
  
  /**
   * Revoke all refresh tokens của user.
   */
  async revokeAllForUser(userId: string, reason: RevokedReason): Promise<number>;
}

interface AccessTokenPayload {
  sub: string;          // user id
  email: string;
  role: UserRole;
  jti: string;          // token id
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

type RevokedReason = 'logout' | 'rotated' | 'reuse_detected' | 'admin_revoke' | 'family_revoked' | 'password_change';
```

### 3.3 TotpService

```typescript
// backend/src/modules/auth/internal/totp.service.ts

@Injectable()
export class TotpService {
  
  /**
   * Generate base32 secret (32 chars = 160 bits).
   */
  generateSecret(): string;
  
  /**
   * Build otpauth URI cho QR rendering.
   * Format: otpauth://totp/<issuer>:<accountName>?secret=<base32>&issuer=<issuer>
   */
  buildOtpauthUri(email: string, secret: string): string;
  
  /**
   * Render QR code as base64 PNG data URL.
   */
  async generateQrCode(otpauthUri: string): Promise<string>;
  
  /**
   * Verify TOTP code với window tolerance ±1.
   * @returns true nếu valid
   */
  verify(code: string, secret: string): boolean;
  
  /**
   * Generate 10 backup codes (10-char alphanumeric, single-use).
   */
  generateBackupCodes(): string[];
  
  /**
   * Verify backup code (constant-time) against encrypted list.
   * @returns { valid, remainingCodes (decrypted, with this one marked used) }
   */
  verifyBackupCode(plaintext: string, encryptedCodes: Buffer): { valid: boolean; updatedEncryptedCodes?: Buffer; remainingCount: number };
}
```

### 3.4 IntermediateTokenService

```typescript
// backend/src/modules/auth/internal/intermediate-token.service.ts

@Injectable()
export class IntermediateTokenService {
  
  /**
   * Issue short-lived (5min) signed token cho 2FA challenge.
   * Claims: { sub, type: '2fa_challenge', jti, exp }
   */
  issue(userId: string): string;
  
  /**
   * Verify intermediate token + return userId.
   * @throws AuthTokenExpiredError, AuthTokenInvalidError
   */
  verify(token: string): { userId: string };
}
```

### 3.5 AuditStubService

```typescript
// backend/src/modules/auth/internal/audit-stub.service.ts

/**
 * Phase 1 stub for F8-03 audit module.
 * Writes synchronously to audit_logs table.
 * Full features (async queue, log viewer, S3 archive) in F8-03 branch.
 */
@Injectable()
export class AuditStubService {
  
  async log(event: AuditEventInput, tx?: PrismaTransactionClient): Promise<void>;
  
  // === Convenience methods ===
  async logLoginSuccess(userId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logLoginFailure(emailAttempted: string, reason: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logLogout(userId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logPasswordChange(userId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async log2FaEnroll(userId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async log2FaDisable(userId: string, reason: '2fa_self_disable' | 'admin_emergency', ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logRoleChange(userId: string, fromRole: UserRole, toRole: UserRole, actorId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logStatusChange(userId: string, fromStatus: UserStatus, toStatus: UserStatus, actorId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logAccountLocked(userId: string, layer: 1 | 2, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logInvitationCreated(invitationId: string, email: string, inviterId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
  async logInvitationAccepted(invitationId: string, userId: string, ctx: RequestContext, tx?: PrismaTransactionClient): Promise<void>;
}

interface AuditEventInput {
  actorUserId?: string;          // null cho system events (CLI bootstrap)
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, { from: any; to: any }>;
  ipAddress?: string;
  userAgent?: string;
}
```

---

## 04 — Repository Layer

### 4.1 UserRepository

```typescript
// backend/src/modules/auth/repositories/user.repository.ts

@Injectable()
export class UserRepository {
  
  constructor(private prisma: PrismaService) {}
  
  // === Read ===
  
  async findById(id: string, options?: { includeDeleted?: boolean }): Promise<User | null>;
  
  async findByEmail(email: string, options?: { includeDeleted?: boolean }): Promise<User | null>;
  
  async findByExternalId(provider: AuthProvider, externalId: string): Promise<User | null>;
  
  async list(query: ListUsersQuery): Promise<PaginatedResult<User>>;
  
  async countByRole(role: UserRole, options?: { activeOnly?: boolean }): Promise<number>;
  
  // === Write ===
  
  async create(input: CreateUserInput, tx?: PrismaTransactionClient): Promise<User>;
  
  async update(id: string, input: UpdateUserInput, tx?: PrismaTransactionClient): Promise<User>;
  
  async softDelete(id: string, actorId: string, tx?: PrismaTransactionClient): Promise<User>;
  
  async incrementFailedAttempts(id: string, tx?: PrismaTransactionClient): Promise<{ count: number; lockedUntil?: Date }>;
  
  async resetFailedAttempts(id: string, tx?: PrismaTransactionClient): Promise<User>;
  
  async setLockedUntil(id: string, lockedUntil: Date | null, tx?: PrismaTransactionClient): Promise<User>;
  
  async updatePasswordHash(id: string, passwordHash: string, tx?: PrismaTransactionClient): Promise<User>;
  
  async update2FaState(id: string, input: Update2FaStateInput, tx?: PrismaTransactionClient): Promise<User>;
  
  async setForceFlags(id: string, flags: { forcePasswordChange?: boolean; forceTwoFaEnrollment?: boolean }, tx?: PrismaTransactionClient): Promise<User>;
  
  async setLastLoginAt(id: string, timestamp: Date, tx?: PrismaTransactionClient): Promise<User>;
}

interface CreateUserInput {
  email: string;
  name: string;
  nameKana?: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;          // NULL cho pending_invite
  forcePasswordChange?: boolean;
  forceTwoFaEnrollment?: boolean;
  createdBy?: string;
}

interface UpdateUserInput {
  name?: string;
  nameKana?: string;
  role?: UserRole;
  status?: UserStatus;
  updatedBy: string;
}

interface Update2FaStateInput {
  twoFaEnabled: boolean;
  twoFaSecret?: Buffer | null;
  twoFaRecoveryCodes?: Buffer | null;
}
```

### 4.2 RefreshTokenRepository

```typescript
// backend/src/modules/auth/repositories/refresh-token.repository.ts

@Injectable()
export class RefreshTokenRepository {
  
  constructor(private prisma: PrismaService) {}
  
  async create(input: CreateRefreshTokenInput, tx?: PrismaTransactionClient): Promise<RefreshToken>;
  
  async findByHash(tokenHash: string): Promise<RefreshToken | null>;
  
  async findActiveByUser(userId: string): Promise<RefreshToken[]>;
  
  async revoke(id: string, reason: RevokedReason, tx?: PrismaTransactionClient): Promise<RefreshToken>;
  
  async revokeFamily(familyId: string, reason: RevokedReason, tx?: PrismaTransactionClient): Promise<number>;
  
  async revokeAllForUser(userId: string, reason: RevokedReason, tx?: PrismaTransactionClient): Promise<number>;
  
  async countActiveByUser(userId: string, tx?: PrismaTransactionClient): Promise<number>;
  
  async revokeOldestIfExceeded(userId: string, maxActive: number, reason: RevokedReason, tx?: PrismaTransactionClient): Promise<number>;
  
  // === Maintenance ===
  
  async cleanupExpired(): Promise<number>;  // Daily cron
}

interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  familyId: string;
  lineageSeq: number;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}
```

### 4.3 PasswordResetRepository

```typescript
// backend/src/modules/auth/repositories/password-reset.repository.ts

@Injectable()
export class PasswordResetRepository {
  
  constructor(private prisma: PrismaService) {}
  
  async create(input: CreatePasswordResetInput, tx?: PrismaTransactionClient): Promise<PasswordResetToken>;
  
  async findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  
  async markUsed(id: string, tx?: PrismaTransactionClient): Promise<PasswordResetToken>;
  
  async cleanupExpired(): Promise<number>;
  
  async countRecentForEmail(email: string, withinHours: number): Promise<number>;  // Rate limit check
}
```

### 4.4 InvitationRepository

```typescript
// backend/src/modules/auth/repositories/invitation.repository.ts

@Injectable()
export class InvitationRepository {
  
  constructor(private prisma: PrismaService) {}
  
  async create(input: CreateInvitationInput, tx?: PrismaTransactionClient): Promise<Invitation>;
  
  async findByHash(tokenHash: string): Promise<Invitation | null>;
  
  async findActiveByEmail(email: string): Promise<Invitation | null>;
  
  async markUsed(id: string, tx?: PrismaTransactionClient): Promise<Invitation>;
  
  async cancel(id: string, tx?: PrismaTransactionClient): Promise<Invitation>;
  
  async listPending(inviterId?: string): Promise<Invitation[]>;
  
  async cleanupExpired(): Promise<number>;
}
```

---

## 05 — Controllers / HTTP Endpoints

### 5.1 AuthController

```typescript
// backend/src/modules/auth/controllers/auth.controller.ts

@Controller('auth')
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  constructor(
    private auth: AuthService,
    private invitations: InvitationsService,
    private cookies: CookieService,
  ) {}
  
  // === Login flow ===
  
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })  // 5/15min
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    // Behavior:
    // 1. Build RequestContext from req
    // 2. Call authService.login(dto, ctx)
    // 3. If success + no 2FA → cookies.setAuthCookies(res, tokens); return user
    // 4. If requires2fa → return intermediateToken (no cookies yet)
    // 5. If error → throw (filter handles response)
  }
  
  @Public()
  @Throttle({ default: { limit: 5, ttl: 300_000 } })  // 5/5min
  @Post('2fa/verify')
  async verify2Fa(...);
  
  @Public()
  @Post('2fa/backup-code')
  async useBackupCode(...);
  
  // === Token management ===
  
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    // Behavior:
    // 1. Extract refresh from cookie
    // 2. authService.refreshTokens(refresh, ctx)
    // 3. Set new cookies
    // 4. Return success
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  async logout(...);
  
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(...);
  
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser);
  
  // === Password management ===
  
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600_000 } })  // 3/h per IP
  @Post('password/reset-request')
  async requestPasswordReset(...);
  
  @Public()
  @Post('password/reset')
  async resetPassword(...);
  
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 3600_000 } })
  @Post('password/change')
  async changePassword(...);
  
  // === 2FA ===
  
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enroll')
  async enroll2FaStart(...);
  
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enroll/verify')
  async enroll2FaVerify(...);
  
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  async disable2Fa(...);
  
  // === Invitation flow ===
  
  @Public()
  @Get('invitations/:token')
  async verifyInvitationToken(@Param('token') token: string);
  
  @Public()
  @Post('invitations/accept')
  async acceptInvitation(...);
  
  // === Sessions (self) ===
  
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(@CurrentUser() user: AuthenticatedUser);
  
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(204)
  async revokeSession(...);
}
```

### 5.2 UsersController

```typescript
// backend/src/modules/auth/controllers/users.controller.ts

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  
  constructor(
    private users: UsersService,
    private invitations: InvitationsService,
  ) {}
  
  // === List & detail ===
  
  @Roles('system_admin', 'manager')
  @Get()
  async list(@Query() query: ListUsersQueryDto, @CurrentUser() user: AuthenticatedUser);
  
  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser);
  // Note: AuthService kiểm permission (admin || self) trong service layer
  
  // === Invitations ===
  
  @Roles('system_admin', 'manager')
  @Post('invitations')
  async createInvitation(...);
  
  @Roles('system_admin', 'manager')
  @Delete('invitations/:id')
  @HttpCode(204)
  async cancelInvitation(...);
  
  // === Admin actions ===
  
  @Roles('system_admin')
  @Put(':id/role')
  async changeRole(...);
  
  @Roles('system_admin')
  @Put(':id/status')
  async changeStatus(...);
  
  @Put(':id/profile')
  async updateProfile(...);
  // Service layer: admin || self
  
  @Roles('system_admin')
  @Post(':id/unlock')
  async unlock(...);
  
  @Roles('system_admin')
  @Post(':id/2fa/disable')
  async emergencyDisable2Fa(...);
  
  @Roles('system_admin')
  @Delete(':id')
  @HttpCode(204)
  async softDelete(...);
}
```

---

## 06 — Guards / Decorators / Pipes

### 6.1 Guards

```typescript
// backend/src/modules/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Extract JWT from HttpOnly cookie via cookieExtractor
  // If @Public() decorator → skip
  // Inject AuthenticatedUser into request
}

// backend/src/modules/auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  // Read @Roles() decorator from handler
  // Compare with request.user.role
  // Throw AuthInsufficientPermissionError if mismatch
}

// backend/src/modules/auth/guards/project-membership.guard.ts
@Injectable()
export class ProjectMembershipGuard implements CanActivate {
  // Phase 1 stub: always pass (no projects yet)
  // Phase 2: read project_id param + verify user in project_members
}

// backend/src/modules/auth/guards/require-2fa.guard.ts
@Injectable()
export class Require2FaGuard implements CanActivate {
  // If user.requires2faEnrollment → throw AuthTwoFaEnrollmentRequiredError
  // Used on admin endpoints
}
```

### 6.2 Decorators

```typescript
// @CurrentUser() — extract authenticated user from request
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as AuthenticatedUser;
});

// @Public() — skip JwtAuthGuard
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// @Roles(...) — declare required roles
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// @Require2FA() — declare admin endpoint requiring 2FA enrollment
export const REQUIRE_2FA_KEY = 'require2fa';
export const Require2FA = () => SetMetadata(REQUIRE_2FA_KEY, true);
```

### 6.3 Global Validation Pipe

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // strip unknown properties
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  errorHttpStatusCode: 400,
  exceptionFactory: (errors) => new ValidationError(formatErrors(errors)),
}));
```

---

## 07 — DTOs (Data Transfer Objects)

### 7.1 LoginDto

```typescript
// backend/src/modules/auth/dto/login.dto.ts

export class LoginDto {
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  @MaxLength(255)
  email: string;
  
  @IsString()
  @MinLength(1, { message: 'パスワードを入力してください' })
  @MaxLength(256)  // Practical limit
  password: string;
}
```

### 7.2 Verify2FaDto

```typescript
export class Verify2FaDto {
  @IsString()
  @Length(6, 10)
  code: string;
  
  @IsBoolean()
  useBackupCode: boolean;
}
```

### 7.3 ChangePasswordDto

```typescript
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  oldPassword: string;
  
  @IsString()
  @MinLength(12, { message: '12文字以上必要です' })
  @MaxLength(256)
  @Matches(/[A-Z]/, { message: '大文字を含める必要があります' })
  @Matches(/[a-z]/, { message: '小文字を含める必要があります' })
  @Matches(/[0-9]/, { message: '数字を含める必要があります' })
  @Matches(/[^A-Za-z0-9]/, { message: '記号を含める必要があります' })
  newPassword: string;
}
```

### 7.4 CreateInvitationDto

```typescript
export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
  
  @IsEnum(UserRole)
  role: UserRole;
  
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
```

### 7.5 ListUsersQueryDto

```typescript
export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
  
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
  
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
  
  @IsOptional()
  @IsIn(['createdAt', 'lastLoginAt', 'name'])
  sortBy?: 'createdAt' | 'lastLoginAt' | 'name' = 'createdAt';
  
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
  
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
  
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}
```

### 7.6 EmergencyDisable2FaDto

```typescript
export class EmergencyDisable2FaDto {
  @IsString()
  @MinLength(10, { message: '理由を10文字以上で記入してください' })
  @MaxLength(500)
  reason: string;
}
```

---

## 08 — Transactions / Database Patterns

### 8.1 Transaction Boundaries

Mọi business operations with side effects (audit log + state change) phải wrap trong DB transaction:

```typescript
// Example: AuthService.login (high-level structure)
async login(input: LoginInput, ctx: RequestContext): Promise<LoginResult> {
  return this.prisma.$transaction(async (tx) => {
    // 1. Find user
    const user = await this.users.findByEmail(input.email, { tx });
    
    // 2. Check lockout BEFORE password verify (timing safety)
    if (user) await this.lockoutService.checkNotLocked(user.id);
    
    // 3. Verify password (constant-time, runs even if user null)
    const passwordValid = user 
      ? await this.passwordService.verify(user.passwordHash, input.password)
      : await this.passwordService.verify(DUMMY_HASH, input.password); // timing parity
    
    if (!user || !passwordValid) {
      if (user) await this.lockoutService.recordFailedAttempt(user.id, ctx, tx);
      await this.audit.logLoginFailure(input.email, 'invalid_credentials', ctx, tx);
      throw new AuthInvalidCredentialsError();
    }
    
    // 4. Check account status
    if (user.status !== 'active') {
      throw new AuthAccountSuspendedError();
    }
    
    // 5. Reset failed attempts on success
    await this.lockoutService.resetAttempts(user.id, tx);
    
    // 6. Check 2FA
    if (user.twoFaEnabled) {
      const intermediateToken = this.intermediateTokens.issue(user.id);
      await this.audit.logLoginSuccess(user.id, ctx, tx);  // log success-pending-2fa
      return { kind: 'requires2fa', intermediateToken, intermediateTokenExpiresIn: 300 };
    }
    
    // 7. Issue tokens
    const tokens = await this.tokenService.issueTokenPair(user.id, user.role, ctx, undefined, undefined, tx);
    
    // 8. Update last login
    await this.users.setLastLoginAt(user.id, new Date(), tx);
    
    // 9. Audit success
    await this.audit.logLoginSuccess(user.id, ctx, tx);
    
    return { kind: 'success', user: this.toAuthUser(user), tokens };
  });
}
```

### 8.2 Concurrent Refresh Token Race Handling

```typescript
// Example: rotateTokenPair với row lock
async rotateTokenPair(currentRefreshPlaintext: string, ctx: RequestContext): Promise<TokenPair> {
  return this.prisma.$transaction(async (tx) => {
    const hash = this.hashRefreshToken(currentRefreshPlaintext);
    
    // SELECT ... FOR UPDATE — prevent race
    const current = await tx.refreshToken.findUnique({
      where: { tokenHash: hash },
      // Implicitly locks the row in PostgreSQL via Prisma's interactive transaction
    });
    
    if (!current) throw new AuthRefreshInvalidError();
    
    if (current.revokedAt) {
      // REUSE DETECTED — revoke entire family
      await this.refreshTokens.revokeFamily(current.familyId, 'reuse_detected', tx);
      await this.audit.logSecurityEvent('refresh.reuse_detected', { familyId: current.familyId }, ctx, tx);
      throw new AuthRefreshReuseDetectedError();
    }
    
    if (current.expiresAt < new Date()) {
      throw new AuthTokenExpiredError();
    }
    
    // Mark current revoked + issue new pair
    await this.refreshTokens.revoke(current.id, 'rotated', tx);
    
    const user = await this.users.findById(current.userId, undefined, tx);
    const newPair = await this.tokenService.issueTokenPair(
      current.userId, user.role, ctx, current.familyId, current.lineageSeq + 1, tx
    );
    
    return newPair;
  });
}
```

### 8.3 Last Admin Protection

```typescript
async changeRole(userId: string, newRole: UserRole, actor: AuthUser, ctx: RequestContext): Promise<User> {
  return this.prisma.$transaction(async (tx) => {
    const user = await this.users.findById(userId, undefined, tx);
    if (!user) throw new NotFoundError('user');
    
    // Check last admin protection
    if (user.role === 'system_admin' && newRole !== 'system_admin') {
      const adminCount = await this.users.countByRole('system_admin', { activeOnly: true, tx });
      if (adminCount <= 1) throw new AuthLastAdminError();
    }
    
    const updated = await this.users.update(userId, { role: newRole, updatedBy: actor.id }, tx);
    
    await this.audit.logRoleChange(userId, user.role, newRole, actor.id, ctx, tx);
    
    return updated;
  });
}
```

---

## 09 — Error Handling

### 9.1 AppError Hierarchy

```typescript
// backend/src/shared/exceptions/app-error.ts

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
  }
}

// backend/src/shared/exceptions/auth-errors.ts

export class AuthInvalidCredentialsError extends AppError {
  constructor() {
    super('AUTH_INVALID_CREDENTIALS', 401, 'メールアドレスまたはパスワードが正しくありません');
  }
}

export class AuthAccountLockedError extends AppError {
  constructor(unlockAt: Date) {
    super('AUTH_ACCOUNT_LOCKED', 423, `アカウントがロックされました。${formatTime(unlockAt)}後に再試行してください。`, { unlockAt });
  }
}

// ... 23 total error classes (matching API contracts §1.6)
```

### 9.2 Global Exception Filter

```typescript
// backend/src/shared/exceptions/global-exception.filter.ts

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = request.headers['x-trace-id'] || generateTraceId();
    
    if (exception instanceof AppError) {
      // Map AppError to standardized response
      this.logger.warn({ code: exception.code, message: exception.message, traceId });
      return response.status(exception.statusCode).json({
        code: exception.code,
        message: exception.message,
        traceId,
        details: exception.details,
      });
    }
    
    if (exception instanceof HttpException) {
      // NestJS validation errors etc.
      const status = exception.getStatus();
      this.logger.warn({ exception: exception.message, traceId });
      return response.status(status).json({
        code: 'VALIDATION_ERROR',
        message: exception.message,
        traceId,
      });
    }
    
    // Unknown error
    this.logger.error({ exception, traceId, stack: (exception as Error).stack });
    return response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'サーバーエラーが発生しました。',
      traceId,
    });
  }
}
```

---

## 10 — CLI Commands

### 10.1 bootstrap:create-admin

```typescript
// backend/src/cli/bootstrap-create-admin.command.ts

@Command({ name: 'bootstrap:create-admin', description: 'Create initial system administrator' })
export class BootstrapCreateAdminCommand extends CommandRunner {
  constructor(
    private users: UsersService,
    private password: PasswordService,
    private audit: AuditStubService,
  ) {
    super();
  }
  
  async run(passedParams: string[], options: BootstrapAdminOptions): Promise<void> {
    // Validate options
    if (!options.email || !options.name) {
      console.error('--email and --name required');
      process.exit(1);
    }
    
    // Idempotent check
    const adminCount = await this.users.countByRole('system_admin', { activeOnly: true });
    if (adminCount > 0 && !options.force) {
      console.error('System administrator already exists. Use --force to create another.');
      process.exit(1);
    }
    
    // Generate temp password
    const tempPassword = this.generateTempPassword(16);
    const passwordHash = await this.password.hash(tempPassword);
    
    // Create user
    const user = await this.users.create({
      email: options.email.toLowerCase(),
      name: options.name,
      role: 'system_admin',
      status: 'active',
      passwordHash,
      forcePasswordChange: true,
      forceTwoFaEnrollment: true,
    });
    
    // Audit log (actor=null = system)
    await this.audit.log({
      actorUserId: null,
      action: 'auth.user.bootstrap',
      entityType: 'user',
      entityId: user.id,
    });
    
    console.log(`✅ Admin created: ${user.email}`);
    console.log(`📋 Temporary password: ${tempPassword}`);
    console.log(`⚠️  User MUST change password and enroll 2FA on first login.`);
  }
  
  @Option({ flags: '--email <email>', description: 'Admin email' })
  parseEmail(val: string) { return val; }
  
  @Option({ flags: '--name <name>', description: 'Admin display name' })
  parseName(val: string) { return val; }
  
  @Option({ flags: '--force', description: 'Create even if admin exists' })
  parseForce() { return true; }
  
  private generateTempPassword(length: number): string {
    // Cryptographically secure random password meeting policy
    // Format: Mix of upper + lower + digit + symbol
  }
}

interface BootstrapAdminOptions {
  email?: string;
  name?: string;
  force?: boolean;
}
```

---

## 11 — Configuration Management

### 11.1 Environment Variables

```typescript
// backend/src/config/env.schema.ts

const EnvSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TZ: z.string().default('Asia/Tokyo'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis (rate limit + future BullMQ)
  REDIS_URL: z.string().url(),
  
  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('30m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_TTL: z.string().default('7d'),
  
  // 2FA
  TWOFA_ENCRYPTION_KEY: z.string().length(64),  // 32 bytes hex
  
  // Cookies
  COOKIE_DOMAIN: z.string().optional(),  // undefined for __Host- prefix
  FRONTEND_URL: z.string().url(),  // CORS origin
  
  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email(),
  
  // AWS (Phase 1: optional, Phase 2+ required for S3 etc.)
  AWS_REGION: z.string().default('ap-northeast-1'),
});

export type AppConfig = z.infer<typeof EnvSchema>;
```

### 11.2 ConfigService

```typescript
@Injectable()
export class AppConfigService {
  private config: AppConfig;
  
  constructor() {
    this.config = EnvSchema.parse(process.env);
  }
  
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }
}
```

---

## 12 — Testing Approach (Backend)

### 12.1 Test Layers

| Layer | Tool | Target | Coverage |
|---|---|---|---|
| Unit | Jest | Pure functions, domain logic, services with mocked repos | 90%+ |
| Integration | Jest + test PG (testcontainers OR docker compose) | Service + repository + DB | 80%+ |
| E2E | Jest + supertest | Full HTTP flows | Critical paths 100% |

### 12.2 Test Doubles

```typescript
// Example: mock repository
class MockUserRepository implements UserRepository {
  private users = new Map<string, User>();
  
  async findById(id: string) { return this.users.get(id) || null; }
  async findByEmail(email: string) { /* ... */ }
  async create(input: CreateUserInput) { /* ... */ }
  // ...
}
```

### 12.3 Test DB Strategy

- Separate DB: `shikou_kanri_test` trong docker-compose.dev.yml
- Migrations applied before test suite
- Each test: transaction wrap + rollback (Prisma `$transaction` with manual rollback)
- Seed data: minimal — test data per test

### 12.4 Sample Test (AuthService.login)

```typescript
describe('AuthService.login', () => {
  it('returns tokens for valid credentials', async () => {
    const user = await seed.user({ email: 'test@example.com', password: 'Test1234!@#$' });
    
    const result = await authService.login(
      { email: 'test@example.com', password: 'Test1234!@#$' },
      mockCtx
    );
    
    expect(result.kind).toBe('success');
    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toMatch(/^eyJ/);  // JWT format
  });
  
  it('throws AuthInvalidCredentialsError for wrong password', async () => {
    const user = await seed.user();
    await expect(
      authService.login({ email: user.email, password: 'wrong' }, mockCtx)
    ).rejects.toThrow(AuthInvalidCredentialsError);
  });
  
  it('increments failed attempts on failed login', async () => {
    const user = await seed.user();
    await expect(
      authService.login({ email: user.email, password: 'wrong' }, mockCtx)
    ).rejects.toThrow();
    
    const updated = await userRepo.findById(user.id);
    expect(updated.failedLoginAttempts).toBe(1);
  });
  
  it('locks account after 5 failed attempts', async () => { /* ... */ });
  it('returns intermediate token if 2FA enabled', async () => { /* ... */ });
  // ... more tests
});
```

---

## 13 — Performance Considerations

### 13.1 Critical Paths Latency Budget

| Endpoint | Budget | Bottleneck | Mitigation |
|---|---|---|---|
| POST /auth/login | 500ms p95 | argon2 (~150ms) | Tuned params; DB query indexed |
| POST /auth/refresh | 50ms p95 | DB query + JWT sign | Index `token_hash`; HS256 fast |
| GET /auth/me | 20ms p95 | JWT verify | Cached request lifetime |
| POST /users (any mutation) | 100ms p95 | DB transaction | Single INSERT + single audit |
| GET /users (list) | 200ms p95 | Query + count | Index sortBy + pagination |

### 13.2 N+1 Prevention

Prisma queries should use `select` để limit fields, `include` cho relations (avoid N+1):

```typescript
// Bad
const users = await prisma.user.findMany();
for (const u of users) {
  u.sessions = await prisma.refreshToken.findMany({ where: { userId: u.id } });  // N+1!
}

// Good
const users = await prisma.user.findMany({
  include: { refreshTokens: { where: { revokedAt: null } } },
});
```

### 13.3 Connection Pooling

- Prisma default pool: 10 connections/instance
- 2 ECS tasks × 10 = 20 concurrent connections to RDS
- RDS db.t4g.medium max ~85 connections → comfortable
- Phase 2+: consider PgBouncer if scale beyond

---

## 14 — Security Implementation Notes

### 14.1 Constant-Time Operations

```typescript
// PasswordService.verify uses argon2.verify (constant-time internally)
// TotpService.verify uses crypto.timingSafeEqual for backup code comparison
// Email lookup: rely on argon2 dummy hash if user not found (timing parity)
```

### 14.2 Cookie Security Helper

```typescript
// backend/src/shared/http/cookie.service.ts

@Injectable()
export class CookieService {
  constructor(private config: AppConfigService) {}
  
  setAuthCookies(res: Response, tokens: TokenPair): void {
    const isProd = this.config.isProduction();
    const baseOpts: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    };
    
    const accessName = isProd ? '__Host-access_token' : 'access_token';
    const refreshName = isProd ? '__Host-refresh_token' : 'refresh_token';
    
    res.cookie(accessName, tokens.accessToken, { ...baseOpts, maxAge: tokens.accessExpiresIn * 1000 });
    res.cookie(refreshName, tokens.refreshToken, { ...baseOpts, maxAge: tokens.refreshExpiresIn * 1000 });
  }
  
  clearAuthCookies(res: Response): void { /* ... */ }
  
  extractAccessToken(req: Request): string | null { /* ... */ }
  
  extractRefreshToken(req: Request): string | null { /* ... */ }
}
```

### 14.3 Sensitive Field Redaction (Pino)

```typescript
// backend/src/shared/observability/logger.module.ts

LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'req.body.password',
        'req.body.oldPassword',
        'req.body.newPassword',
        'req.headers.cookie',
        'req.headers.authorization',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.tokenHash',
        '*.secret',
        '*.twoFaSecret',
        '*.recoveryCodes',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        traceId: req.headers['x-trace-id'],
      }),
    },
  },
});
```

---

## 15 — Migration Sequence

Migrations cần tạo trong `prisma/migrations/`:

1. **0002_user_auth_fields** — extend `users`:
   - Add columns: `role`, `status`, `2fa_*`, `failed_login_attempts`, `locked_until`, `force_*`, `auth_provider`, `external_id`, `last_login_at`, `email_verified`, `name_kana`, `password_hash`, `created_by`, `updated_by`, `deleted_at`
   - Convert default User to baseline (existing data: set role=employee, status=active, etc.)

2. **0003_refresh_tokens_table** — create `refresh_tokens` với indexes

3. **0004_password_reset_tokens_table** — create `password_reset_tokens`

4. **0005_invitations_table** — create `invitations`

5. **0006_audit_logs_table** — create `audit_logs` (used by stub)

Generated qua: `pnpm --filter backend run prisma:migrate:dev --name <name>` trong terminal.

---

## 16 — Module Exports (Public API)

```typescript
// backend/src/modules/auth/index.ts

// NestJS module class
export { AuthModule } from './auth.module';

// Services (for other modules to use)
export { AuthService } from './services/auth.service';
export { UsersService } from './services/users.service';
export { InvitationsService } from './services/invitations.service';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';
export { ProjectMembershipGuard } from './guards/project-membership.guard';
export { Require2FaGuard } from './guards/require-2fa.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles } from './decorators/roles.decorator';
export { Public } from './decorators/public.decorator';
export { Require2FA } from './decorators/require-2fa.decorator';

// Types (for other modules + frontend type sync)
export type {
  AuthenticatedUser,
  AuthUser,
  User,
  UserRole,
  UserStatus,
  TokenPair,
  Session,
  Invitation,
  AuthEventName,
} from './domain';

// NO export of:
// - Repositories (internal — use service public API)
// - Internal services (PasswordService, TokenService — wrap in AuthService)
// - DTOs (internal — use TS types instead)
// - Strategies (NestJS internal)
```

---

## Summary / Tóm tắt BDD

| Metric | Count |
|---|---|
| Services | 4 (Auth, Users, Invitations, AccountLockout) |
| Internal services | 5 (Password, Token, Totp, IntermediateToken, AuditStub) |
| Controllers | 2 (Auth, Users) |
| Repositories | 4 (User, RefreshToken, PasswordReset, Invitation) |
| Guards | 4 (JwtAuth, Roles, ProjectMembership stub, Require2Fa) |
| Decorators | 4 (CurrentUser, Roles, Public, Require2FA) |
| DTOs | 16 |
| CLI commands | 1 (bootstrap:create-admin) |
| Migrations | 5 |
| Error classes | 23 |

**Patterns**:
- Modular Monolith (ADR-001)
- Repository pattern + Service layer + Controller
- Dependency Injection
- Interactive transactions for write operations
- Stub interface pattern (Audit Phase 1)

**Performance targets all met theo SRS NFRs**.

**Test coverage target**: 85%+ for `auth/*`, 100% for security-critical paths.

---

*F8-AUTH-BASE-backend-detail-design.md*
*Backend Detail Design — 認証 & 権限管理*
*Generated by EPS Framework /design --detail v5.0*
*DEHA Solutions, 2026-05-16*
