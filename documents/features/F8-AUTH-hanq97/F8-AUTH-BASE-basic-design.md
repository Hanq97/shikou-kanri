# 認証 & 権限管理 — Basic Design / Thiết kế Cơ bản

## Thông tin Tài liệu (Document Information)

- **Feature ID**: F8-AUTH
- **Tên feature**: 認証 & 権限管理 (Authentication & Authorization)
- **Phiên bản**: 1.0.0
- **Tác giả**: DEHA Solutions (Hanq97)
- **Ngày tạo**: 2026-05-16
- **Trạng thái**: Draft
- **Module**: `auth`
- **SRS Reference**: [F8-AUTH-BASE-srs.md](./F8-AUTH-BASE-srs.md)
- **Reasoning JSON**: [reasoning.json](./reasoning.json)

---

## 01 — Architecture / Kiến trúc

### 1.1 Architecture Pattern / Mẫu Kiến trúc

**Lựa chọn**: **Modular Monolith** (kế thừa từ [ADR-001](../../../.claude/memory-bank/master/architecture-dehasol/architect/decisions/ADR-001-system-architecture-pattern.md))

| Aspect | Description |
|---|---|
| Pattern | Modular Monolith với clear module boundary |
| Deployment | 1 NestJS application, deploy as 1 unit (ECS Fargate) |
| Module boundary | Enforce qua `eslint-plugin-boundaries` (CI lint check) |
| Inter-module communication | Public API barrel (`module/index.ts` only) + Events qua EventEmitter2 cho loose coupling |
| Future evolution | Sẵn sàng tách microservice cho AI module Phase 3 nếu cần |

**Lý do chọn**:
- Scale 50 concurrent users không cần microservice
- Team DEHA 7 người không đủ capacity cho microservice ops
- Module boundary clean cho phép tách service sau này không cần refactor lớn

### 1.2 Architectural Layers / Tầng Kiến trúc

Mỗi module (bao gồm `auth`) tuân thủ pattern 4 tầng:

| Layer | Trách nhiệm | Vị trí trong auth module |
|---|---|---|
| **Presentation** | HTTP/REST endpoints, validation, serialization | `auth.controller.ts`, `users.controller.ts`, DTOs |
| **Application** | Use case orchestration, transactions, policy enforcement | `auth.service.ts`, `users.service.ts`, guards |
| **Domain** | Business rules, entities, value objects | `domain/` folder — User entity rules, password policy logic |
| **Infrastructure** | DB queries (Prisma), AWS adapters, crypto helpers | `repositories/`, `internal/` |

**Rule**: cross-layer direct call bị cấm. Layer `Domain` không import từ `Infrastructure` (Dependency Inversion). Repository implement interface defined in domain.

### 1.3 High-Level Architecture Diagram (ASCII)

```
┌────────────────────────────────────────────────────────────────┐
│                  Browser (React SPA + AntD)                    │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Login UI        │  │ User Mgmt UI     │  │ Settings UI   │  │
│  │ /login, /reset  │  │ /users (admin)   │  │ /settings/2fa │  │
│  └─────────────────┘  └──────────────────┘  └───────────────┘  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTPS + Cookies (HttpOnly)
                               ▼
┌────────────────────────────────────────────────────────────────┐
│            AWS ALB + AWS WAF (rate limit, geo)                 │
└──────────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│              NestJS API (ECS Fargate)                          │
│                                                                │
│  Cross-cutting (shared):                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ AuthGuard | RolesGuard | LoggingInterceptor             │  │
│   │ ExceptionFilter | ValidationPipe | RateLimiter (Redis)  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  Modules:                                                      │
│   ┌──────────────────────────┐  ┌────────────────────┐         │
│   │  auth module             │  │ notification mod   │         │
│   │  ├─ Auth (login/2FA/etc) │──→ Email service      │         │
│   │  ├─ Users (mgmt)         │  │ (transactional)    │         │
│   │  ├─ Guards/Decorators    │  └────────────────────┘         │
│   │  ├─ Audit stub           │                                 │
│   │  └─ Bootstrap CLI        │                                 │
│   └──────────────────────────┘                                 │
│                                                                │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ shared/ (database, crypto, observability, queue stub)   │  │
│   └─────────────────────────────────────────────────────────┘  │
└──────┬──────────────────────┬────────────────────┬─────────────┘
       │                      │                    │
       ▼                      ▼                    ▼
┌──────────────┐    ┌───────────────┐    ┌──────────────────┐
│ PostgreSQL   │    │  ElastiCache  │    │ AWS SES / Mail-  │
│ (RDS Multi-  │    │  Redis        │    │ hog (dev)        │
│  AZ)         │    │ (rate limit)  │    │                  │
│              │    │               │    │                  │
│ Tables:      │    │               │    │ Transactional    │
│  users       │    │               │    │ emails:          │
│  refresh_    │    │               │    │ - invitation     │
│   tokens     │    │               │    │ - reset password │
│  password_   │    │               │    │ - 2fa enrolled   │
│   reset_     │    │               │    │ - security alert │
│   tokens     │    │               │    └──────────────────┘
│  invitations │    │               │
│  audit_logs  │    │               │
└──────────────┘    └───────────────┘
```

### 1.4 Module Boundaries & Dependencies / Ranh giới Module

**auth module** dependency graph (Phase 1):

```
auth module
  │
  ├─ depends on:
  │   ├─ shared/database (Prisma client)
  │   ├─ shared/crypto (argon2, AES helpers)
  │   ├─ shared/observability (logger)
  │   └─ notification module (public API: EmailService.send)
  │
  ├─ depended by (Phase 1):
  │   └─ (no other modules yet — F1 customer/project sẽ depend sau)
  │
  └─ public exports (index.ts):
      ├─ AuthModule (NestJS module class)
      ├─ AuthService (lookup user, check permission)
      ├─ UsersService (basic queries)
      ├─ Guards: JwtAuthGuard, RolesGuard, ProjectMembershipGuard (stub)
      ├─ Decorators: @Public, @Roles, @CurrentUser, @Require2FA
      ├─ Types: AuthenticatedUser, UserRole, UserStatus
      └─ Events: 'auth.login.success', 'user.role.changed' (cho future subscribers)
```

**Enforcement**: ESLint rule cấm cross-module internal imports. Chỉ import từ `'@/modules/auth'` (resolves to index.ts barrel).

### 1.5 Deployment Topology / Topology Triển khai

| Environment | Compute | Database | Cache | Email |
|---|---|---|---|---|
| Local Dev | docker-compose | PostgreSQL 16 (container) | Redis 7 (container) | Mailhog (container) |
| Dev | ECS Fargate (1 task) | RDS db.t4g.small | ElastiCache t4g.micro | AWS SES (sandbox) |
| Staging | ECS Fargate (2 tasks) | RDS db.t4g.medium Multi-AZ | ElastiCache t4g.micro | AWS SES (sandbox) |
| Production | ECS Fargate (2 tasks, autoscale → 6) | RDS db.t4g.medium Multi-AZ | ElastiCache t4g.micro | AWS SES (production verified) |

**Region**: ap-northeast-1 (Tokyo). DR backup → ap-northeast-3 (Osaka) qua S3 CRR.

---

## 02 — Components / Thành phần

### 2.1 Component Inventory / Danh sách Components

#### 2.1.1 auth module components

| Component ID | Component | Trách nhiệm | Tier |
|---|---|---|---|
| C-AUTH-01 | **AuthController** | HTTP endpoints cho login/logout/refresh/password mgmt/2FA | Presentation |
| C-AUTH-02 | **UsersController** | HTTP endpoints cho admin user mgmt | Presentation |
| C-AUTH-03 | **AuthService** | Orchestration cho authentication flows | Application |
| C-AUTH-04 | **UsersService** | Orchestration cho user CRUD + role assignment | Application |
| C-AUTH-05 | **InvitationsService** | Orchestration cho invitation flow | Application |
| C-AUTH-06 | **PasswordService** | Hash + verify password (argon2 wrap) | Domain |
| C-AUTH-07 | **TokenService** | JWT sign/verify, refresh rotation, lineage tracking | Domain |
| C-AUTH-08 | **TotpService** | 2FA secret generate, TOTP verify, backup codes | Domain |
| C-AUTH-09 | **AccountLockoutService** | Track failed attempts, manage lockout state | Domain |
| C-AUTH-10 | **UserRepository** | Persistence cho User entity | Infrastructure |
| C-AUTH-11 | **RefreshTokenRepository** | Persistence cho RefreshToken | Infrastructure |
| C-AUTH-12 | **PasswordResetRepository** | Persistence cho PasswordResetToken | Infrastructure |
| C-AUTH-13 | **InvitationRepository** | Persistence cho Invitation | Infrastructure |
| C-AUTH-14 | **AuditStubService** | Write audit events to DB (stub for F8-03) | Infrastructure |
| C-AUTH-15 | **LocalStrategy** | passport-local strategy cho email/password | Presentation (auth) |
| C-AUTH-16 | **JwtStrategy** | passport-jwt strategy cho JWT validation | Presentation (auth) |
| C-AUTH-17 | **JwtAuthGuard** | Global guard kiểm JWT validity | Presentation (guard) |
| C-AUTH-18 | **RolesGuard** | Kiểm role match @Roles decorator | Presentation (guard) |
| C-AUTH-19 | **ProjectMembershipGuard** (stub) | Sẵn sàng cho Phase 2 — Phase 1 chỉ check user existence | Presentation (guard) |
| C-AUTH-20 | **BootstrapAdminCommand** | CLI command create-admin | Ops/CLI |

#### 2.1.2 notification module (minimal)

| Component ID | Component | Trách nhiệm | Tier |
|---|---|---|---|
| C-NOTIF-01 | **EmailService** | Send email qua SMTP (SES/Mailhog) | Application |
| C-NOTIF-02 | **TemplateEngine** | Render Handlebars templates với data | Domain |
| C-NOTIF-03 | **Email templates** | invitation.hbs, password-reset.hbs, security-alert.hbs, 2fa-enrolled.hbs | Static assets |

#### 2.1.3 shared utilities

| Component ID | Component | Trách nhiệm |
|---|---|---|
| C-SHARED-01 | **PrismaService** | Prisma client singleton, lifecycle management |
| C-SHARED-02 | **CryptoHelpers** | AES-256-GCM encrypt/decrypt, random token gen |
| C-SHARED-03 | **AppLogger** | Pino wrap với traceId, redaction |
| C-SHARED-04 | **ErrorTypes** | Hierarchy: AppError → NotFoundError, PermissionError, ValidationError, ... |
| C-SHARED-05 | **GlobalExceptionFilter** | Map errors to standardized JSON response |
| C-SHARED-06 | **GlobalValidationPipe** | class-validator + whitelist + transform |

### 2.2 Component Responsibilities / Trách nhiệm chính

#### AuthService (C-AUTH-03)
- Use case `login`: verify password → check 2FA → generate tokens
- Use case `refresh`: validate refresh → rotate → revoke old, issue new
- Use case `logout` + `logoutAll`: revoke refresh token(s)
- Use case `changePassword`: verify old → hash new → revoke other sessions
- Use case `requestPasswordReset`: generate token → send email (always 200)
- Use case `resetPassword`: validate token → update hash → revoke all sessions
- Use case `enroll2fa` + `verify2faEnrollment`: TOTP secret lifecycle
- Use case `disable2fa`: verify identity (pw + TOTP) → clear secret
- Coordinates với AuditStubService cho mọi auth events

#### UsersService (C-AUTH-04)
- Use case `list`, `findById`, `update`, `changeRole`, `changeStatus`, `unlock`, `emergencyDisable2fa`, `softDelete`
- Validates business rules: no demote last admin, role hierarchy constraints
- Coordinates với InvitationsService cho mời user

#### InvitationsService (C-AUTH-05)
- Use case `sendInvitation`: validate email uniqueness → create pending user → generate token → send email
- Use case `verifyInvitationToken`: lookup token, check expiry/used status
- Use case `acceptInvitation`: validate token + password → activate user → auto-login

#### TokenService (C-AUTH-07)
- Sign access token (HS256, 30min TTL, claims: sub, role, jti, iat, exp)
- Sign opaque refresh token (random 128-bit, hashed in DB)
- Verify access token signature + expiry
- Rotate refresh: revoke current, issue new pair with same family_id
- Detect reuse: revoked refresh present → revoke entire family

#### TotpService (C-AUTH-08)
- Generate base32 secret (160-bit)
- Generate otpauth URI cho QR rendering
- Encrypt + persist secret AES-256-GCM
- Verify TOTP code với window tolerance ±1
- Manage backup codes (encrypted, single-use, marked when consumed)

### 2.3 Frontend Components / Components Phía giao diện

#### Pages / Trang

| Component ID | Page | Path | Mục đích |
|---|---|---|---|
| C-FE-01 | LoginPage | `/login` | Form email + password input |
| C-FE-02 | TwoFaChallengePage | `/login/2fa` | Form nhập TOTP code (sau pw OK) |
| C-FE-03 | ForgotPasswordPage | `/forgot-password` | Form yêu cầu reset link |
| C-FE-04 | ResetPasswordPage | `/reset-password?token=` | Form nhập password mới |
| C-FE-05 | AcceptInvitePage | `/accept-invite?token=` | Form set password lần đầu |
| C-FE-06 | ProfileSettingsPage | `/settings/profile` | Xem + edit profile |
| C-FE-07 | TwoFaSettingsPage | `/settings/2fa` | Enroll/disable 2FA |
| C-FE-08 | SessionsPage | `/settings/sessions` | List active sessions, revoke per-session |
| C-FE-09 | UsersListPage | `/users` | Admin: list, filter users |
| C-FE-10 | UserDetailPage | `/users/:id` | Admin: xem chi tiết user, change role/status |
| C-FE-11 | UserInvitePage | `/users/new` | Admin: gửi invitation form |

#### Reusable Components

| Component ID | Component | Mục đích |
|---|---|---|
| C-FE-20 | AuthLayout | Layout cho public auth pages (centered card, no sidebar) |
| C-FE-21 | AppLayout | Layout cho authenticated pages (with sidebar + topbar) |
| C-FE-22 | PasswordInputField | Reusable password input với strength indicator |
| C-FE-23 | TwoFaCodeInput | 6-digit code input với auto-advance |
| C-FE-24 | QrCodeDisplay | Render otpauth URI thành QR code |
| C-FE-25 | BackupCodesDisplay | Hiển thị 10 backup codes (1 lần), download as text |
| C-FE-26 | RoleSelector | Dropdown chọn role, restricted by current user's role |
| C-FE-27 | UserStatusBadge | Badge hiển thị status (active/suspended/pending/disabled) |

#### Guards & Hooks

| Component ID | Component | Mục đích |
|---|---|---|
| C-FE-30 | AuthGuard | Wrap protected routes, redirect /login nếu chưa auth |
| C-FE-31 | RoleGuard | Wrap admin routes, redirect /home nếu insufficient role |
| C-FE-32 | useAuth | Hook lấy current user + auth actions từ Zustand store |
| C-FE-33 | usePermission | Hook check permission specific cho UI conditional render |

### 2.4 Component Interactions Overview / Tương tác giữa Components

Phần này mô tả interactions ở mức cao (không phải sequence diagram chi tiết, đó là Detail Design).

**Login flow (high-level)**:
1. FE LoginPage submit credentials → Auth API
2. AuthController validate + delegate AuthService
3. AuthService uses PasswordService (verify) + UserRepository (lookup)
4. AuthService uses TotpService (check 2FA enabled) → return intermediate state nếu cần
5. AuthService uses TokenService (issue pair) → RefreshTokenRepository (persist)
6. AuditStubService log event
7. Response → set cookies → FE redirect

**Invite flow (high-level)**:
1. Admin in UserInvitePage submit form → Users API
2. UsersController → UsersService → InvitationsService
3. InvitationsService: validate email unique → create User (pending) + Invitation (token)
4. NotificationModule.EmailService: render template + send via SES
5. AuditStubService log
6. Response success

---

## 03 — Dataflow / Luồng dữ liệu

### 3.1 High-Level Data Flow / Luồng dữ liệu cấp cao

Phần này mô tả flow ở cấp cao. Sequence diagrams chi tiết sẽ ở Detail Design.

#### 3.1.1 Authentication Flow

```
[User Input] → [Validation] → [Business Logic] → [Persistence] → [Audit] → [Response]

Input domain:
- email, password (form)
- TOTP code (challenge)
- refresh token (cookie)

Validation gates:
- Input format (email RFC, password policy)
- Account status (active vs locked/suspended)
- Credentials match (constant-time)
- 2FA requirement check

Business logic:
- Token issuance with proper TTL
- Rotation lineage tracking
- Lockout state management

Persistence layer:
- User table (read for verify)
- Refresh tokens (write new, revoke old)
- Audit logs (write event)

Output:
- HTTP response với cookies
- Audit event in DB
- (Optional) Email notification
```

#### 3.1.2 Invitation Flow

```
Admin/Manager → Submit invite form
       ↓
[Validation: email format, role allowed, email unique]
       ↓
[Create pending User record]
       ↓
[Generate invitation token + hash + expiry]
       ↓
[Insert Invitation record]
       ↓
[Render email template với invite link]
       ↓
[Send email via SES/Mailhog]
       ↓
[Audit log event]
       ↓
[Response success]

----- User journey -----

User opens email → click link
       ↓
[Frontend extract token từ URL]
       ↓
[Backend verify token (lookup, expiry, not used)]
       ↓
[Display invite info: email, role, inviter name]
       ↓
[User submits new password]
       ↓
[Backend: validate password policy → hash → update User → mark token used]
       ↓
[Activate User: status = active]
       ↓
[Issue tokens (auto-login)]
       ↓
[Send welcome email]
       ↓
[Audit log]
       ↓
[Response with cookies set]
```

#### 3.1.3 Password Reset Flow

```
User → Submit email at /forgot-password
       ↓
[Always return 200 OK với generic message]
       ↓
[Background: if email exists]
       ↓
       [Generate reset token + hash + 1h expiry]
       ↓
       [Insert PasswordResetToken record]
       ↓
       [Render email template]
       ↓
       [Send email via SES/Mailhog]
       ↓
       [Audit log]

----- User journey -----

User clicks email link → /reset-password?token=...
       ↓
[Backend verify token (lookup, expiry, not used)]
       ↓
[User submits new password]
       ↓
[Backend: validate policy → hash → update User.password_hash]
       ↓
[Mark token used]
       ↓
[Revoke ALL current refresh tokens (logout other sessions)]
       ↓
[Send confirmation email]
       ↓
[Audit log]
       ↓
[Redirect /login với success message]
```

#### 3.1.4 Refresh Token Rotation Flow

```
Frontend → axios interceptor catches 401
       ↓
[POST /auth/refresh với refresh cookie]
       ↓
[Backend: lookup refresh by token_hash]
       ↓
[Validate: not expired, not revoked, lineage valid]
       ↓
[Decision tree]
   ├─ If revoked → REUSE DETECTED → revoke entire family → 401 force re-login
   └─ If valid:
       ├─ Mark current refresh revoked_at=now, revoked_reason='rotated'
       ├─ Issue new pair (access + refresh) with same family_id, lineage+1
       ├─ Insert new RefreshToken record
       ├─ Set new cookies
       └─ Return success
       ↓
[Frontend: retry original request with new cookies]
```

#### 3.1.5 2FA Enrollment Flow

```
User in /settings/2fa → Click "Enable 2FA"
       ↓
[POST /auth/2fa/enroll]
       ↓
[Backend: TotpService.generateSecret() → base32 32-char]
       ↓
[Build otpauth URI: otpauth://totp/Shikou-Kanri:<email>?secret=<...>&issuer=...]
       ↓
[Store temp secret (in-memory or short-lived cache, 10min expiry)]
       ↓
[Response: { secret, otpauthUri }]
       ↓
[Frontend: render QR code from otpauthUri]
       ↓
[User scans QR vào authenticator app]
       ↓
[User enters first TOTP code]
       ↓
[POST /auth/2fa/enroll/verify với code]
       ↓
[Backend: verify code với temp secret]
   ├─ Invalid → return error
   └─ Valid:
       ├─ Encrypt secret AES-256-GCM
       ├─ Generate 10 backup codes (encrypted)
       ├─ Update User: 2fa_enabled=true, 2fa_secret, 2fa_recovery_codes
       ├─ Audit log
       └─ Return backup codes (display 1 time)
       ↓
[Frontend: display backup codes, force user save/download]
```

### 3.2 Cross-cutting Data Flows / Luồng xuyên suốt

#### Audit Logging Flow

Mọi auth/user operations sinh audit event:

```
[Service method execution]
       ↓
[Begin transaction]
       ↓
[Primary operation (e.g., update user role)]
       ↓
[Within same transaction: AuditStubService.log({actor, action, entityType, entityId, changes})]
       ↓
[Insert AuditLog record với occurred_at=now]
       ↓
[Commit transaction]
       ↓
[Operation result returned]
```

Phase 1 sync; Phase F8-03 sẽ async qua BullMQ.

#### Rate Limiting Flow

```
HTTP request inbound
       ↓
[Throttler middleware]
       ↓
[Look up counter trong Redis (key = IP+endpoint hoặc user+endpoint)]
       ↓
[Check counter < limit]
   ├─ Exceeded → return 429 Too Many Requests
   └─ OK:
       ├─ Increment counter
       ├─ Set TTL on key
       └─ Pass through to handler
```

Login endpoint có thêm IP+email composite key cho stricter limiting.

### 3.3 Error Flows / Luồng lỗi

```
[Any exception thrown]
       ↓
[GlobalExceptionFilter catches]
       ↓
[Decision]
   ├─ AppError subtype → use predefined code + status
   ├─ Validation error → map to AUTH_PASSWORD_WEAK etc, 400
   ├─ Prisma error → map to DB conflict (409) or generic 500
   └─ Unknown → 500 với generic message + log full stack
       ↓
[Log error với Pino (full context, redacted sensitive)]
       ↓
[Return standardized JSON response]
   { code, message, traceId, details? }
```

---

## 04 — Data Model / Mô hình Dữ liệu

### 4.1 Entity Overview / Tổng quan Entities

Phần này mô tả entities ở cấp Basic Design. Schema chi tiết (column types, constraints, indexes) sẽ ở Detail Design + Prisma migrations.

#### 4.1.1 Entities chính của F8-AUTH

| Entity | Mục đích | Lifecycle |
|---|---|---|
| **User** | Tài khoản người dùng (mở rộng từ baseline với auth-specific fields) | Created qua invitation/bootstrap; soft-delete |
| **RefreshToken** | Token lưu trong DB để rotate access tokens | Created on login; revoked on logout/rotation/reuse |
| **PasswordResetToken** | Signed token cho password reset flow | Created on request; consumed once or expired |
| **Invitation** | Token cho user mới accept invitation | Created by admin; consumed when user accepts |
| **AuditLog** | Lưu trữ events cho compliance + debugging | Append-only; retention 2+ years |

#### 4.1.2 Entity Relationships / Quan hệ

```
                       ┌──────────────┐
                       │   User       │
                       │  (1)         │
                       └──┬─────┬──┬──┘
              1:N        │     │  │
       ┌─────────────────┘     │  │
       │                       │  │
       ▼                       │  │
┌───────────────┐              │  │
│ RefreshToken  │              │  │
│ (N per user,  │              │  │
│  max 5 active)│              │  │
└───────────────┘              │  │
                               │  │
                  1:N (resets) │  │  1:N (audits as actor)
                               │  │
                               ▼  ▼
                  ┌──────────────────────┐
                  │ PasswordResetToken   │ ┌─────────┐
                  │ (N over time)        │ │AuditLog │
                  └──────────────────────┘ │(append) │
                                           └─────────┘
                       ┌──────────────┐
                       │  Invitation  │
                       │ (1 per pend  │
                       │  user)       │
                       │  invitedBy   │──→ User
                       └──────────────┘
```

### 4.2 Entity: User

**Mục đích**: Tài khoản người dùng trong hệ thống. Mở rộng từ baseline với auth-specific fields.

**Key attributes** (mô tả conceptual, không phải schema):

| Attribute group | Mô tả |
|---|---|
| Identity | id (UUID), email (unique, case-insensitive lookup), name, name_kana |
| Authentication | password_hash (Argon2 PHC string, nullable cho pending invites) |
| Authorization | role (enum: system_admin / manager / employee / invited), status (enum: pending_invite / active / suspended / disabled) |
| 2FA | 2fa_enabled (bool), 2fa_secret (encrypted), 2fa_recovery_codes (encrypted array) |
| Lockout | failed_login_attempts (int), locked_until (timestamptz, nullable) |
| Force flows | force_password_change (bool), force_two_fa_enrollment (bool) |
| SSO (Phase 2 ready) | auth_provider (enum: local / google / microsoft), external_id (nullable) |
| Audit | created_at, updated_at, deleted_at, created_by, updated_by, last_login_at |

**Business rules** (links to SRS):
- BR-AUTH-001 to BR-AUTH-053 (xem SRS §2)
- BR-USER-001 to BR-USER-036

### 4.3 Entity: RefreshToken

**Mục đích**: Lưu trạng thái refresh tokens (hash, không plaintext) cho session management.

**Key attributes**:

| Attribute group | Mô tả |
|---|---|
| Identity | id (UUID) |
| Ownership | user_id (FK to User) |
| Token storage | token_hash (SHA-256 hex of plaintext token) |
| Lineage | family_id (UUID — groups rotated tokens of single login), lineage_seq (int — sequence in family) |
| Lifecycle | issued_at, expires_at, revoked_at (nullable), revoked_reason (enum: logout / rotated / reuse_detected / admin_revoke / family_revoked) |
| Audit trail | user_agent, ip_address |

**Indexes**:
- `token_hash` UNIQUE (lookup khi refresh request)
- `(user_id, expires_at)` composite (list user's active sessions)
- `family_id` (revoke family on reuse detection)

### 4.4 Entity: PasswordResetToken

**Mục đích**: Signed tokens cho password reset email flow.

**Key attributes**:

| Attribute group | Mô tả |
|---|---|
| Identity | id (UUID) |
| Ownership | user_id (FK) |
| Token storage | token_hash (SHA-256 hex) |
| Lifecycle | expires_at (1h after creation), used_at (nullable) |
| Audit | created_at |

**Constraint**: token single-use (used_at set after consume).

### 4.5 Entity: Invitation

**Mục đích**: Signed tokens cho invitation flow (admin mời user mới).

**Key attributes**:

| Attribute group | Mô tả |
|---|---|
| Identity | id (UUID) |
| Target | email (lowercase), role (UserRole) |
| Token storage | token_hash |
| Lifecycle | expires_at (24h), used_at, cancelled_at |
| Audit | invited_by (FK to User), created_at |

**Index**: `(email, expires_at)` cho lookup pending invitations theo email.

### 4.6 Entity: AuditLog

**Mục đích**: Append-only log của events cho compliance + forensic.

**Key attributes**:

| Attribute group | Mô tả |
|---|---|
| Identity | id (UUID) |
| Actor | actor_user_id (FK, nullable for system events) |
| Action | action (string, e.g., 'auth.login.success', 'user.role.changed') |
| Target | entity_type (string), entity_id (UUID) |
| Changes | changes (JSON: { field: { from, to } } for mutations) |
| Context | ip_address, user_agent |
| Timestamp | occurred_at |

**Indexes**:
- `(actor_user_id, occurred_at DESC)` cho admin view
- `(entity_type, entity_id, occurred_at DESC)` cho entity history
- `occurred_at DESC` cho retention sweep

### 4.7 Data Volume Estimates / Ước lượng Volume

| Entity | Phase 1 estimate | Growth assumption |
|---|---|---|
| User | 50-200 records | Slow growth (~10-30/month after launch) |
| RefreshToken | ~500-1000 active | High churn (rotate hàng giờ) |
| PasswordResetToken | <10/day | Cleanup expired daily |
| Invitation | <20 active | Cleanup expired weekly |
| AuditLog | 5-20K/month | High volume; partition theo month sau khi >100K rows |

### 4.8 Data Migration / Migration data

**Phase 1 migrations** (Prisma migrate sequential):
1. `0002_user_auth_fields` — extend `users` với role, status, 2FA, lockout fields
2. `0003_refresh_tokens_table`
3. `0004_password_reset_tokens_table`
4. `0005_invitations_table`
5. `0006_audit_logs_table`

**Migration policy** (theo Database Design §6):
- Forward-only, never edit applied migrations
- Backward-compatible cho rolling deploy (additive columns nullable hoặc default)
- Generated qua `pnpm --filter backend run prisma:migrate:dev --name <name>` trong terminal

---

## 05 — State Management / Quản lý Trạng thái

### 5.1 Server-Side State / Trạng thái phía Server

#### 5.1.1 Session State

**Lựa chọn**: **Hybrid stateless + stateful**

| State element | Storage | TTL | Rationale |
|---|---|---|---|
| Access token (auth state) | JWT in HttpOnly cookie | 30min | Stateless — verify by signature only, no DB lookup |
| Refresh token | DB record (`refresh_tokens` table, hash only) | 7 days | Stateful — needed cho revocation, rotation tracking |
| User profile (for FE display) | Frontend client-side (Zustand) + GET /auth/me on mount | Until logout/refresh | Cache fresh data via TanStack Query |
| Logged-in user count / stats | Computed on-demand (no aggregate cache Phase 1) | — | Low frequency query |

**Why hybrid**:
- Stateless access token: high performance (no DB lookup per request)
- Stateful refresh: cho phép revocation, multi-device session tracking, reuse detection
- Best of both: speed + security

#### 5.1.2 Rate Limit State

**Storage**: Redis (ElastiCache) — distributed across ECS instances

| Key pattern | TTL | Purpose |
|---|---|---|
| `throttle:ip:<ip>:<endpoint>` | 1min - 1h depending on rule | Global per-IP limits |
| `throttle:user:<userId>:<endpoint>` | 1min - 1h | Per-user limits (authenticated) |
| `throttle:login:<ip>:<email>` | 15min | Login-specific composite key |

Counters increment atomically (Redis INCR), TTL refreshed on first hit only.

#### 5.1.3 Lockout State

**Storage**: PostgreSQL (users.failed_login_attempts + locked_until)

- Tăng `failed_login_attempts` mỗi failed login
- Reset về 0 on successful login OR admin manual unlock
- Set `locked_until` khi reach Layer 1 threshold (5 fails/15min)
- Layer 2 (10 fails/1h) đặt `locked_until=null` nhưng require admin unlock — separate flag hoặc semantic ngầm

#### 5.1.4 Force Flags State

| Flag | Purpose | Cleared when |
|---|---|---|
| `force_password_change` | Bootstrap admin hoặc reset-by-admin user | User completes password change successfully |
| `force_two_fa_enrollment` | Admin role mới (chưa enroll 2FA) | User completes 2FA enrollment |

Both flags persistent in User record (DB). Checked at every authenticated API call (cached in JWT claims).

#### 5.1.5 Token Family State (Refresh Token Rotation)

Tracked qua `refresh_tokens.family_id` + `lineage_seq`:
- Mỗi login mới sinh ra family_id mới
- Refresh rotation tạo record mới với same family_id, lineage_seq+1
- Reuse detection: nếu refresh đã revoked được present → revoke toàn bộ family (UPDATE all với family_id)

### 5.2 Client-Side State / Trạng thái phía Client

#### 5.2.1 Global Auth State (Zustand)

**Store**: `authStore`

| State property | Type | Initial | Updated by |
|---|---|---|---|
| user | AuthUser \| null | null | Login success, GET /auth/me, logout |
| isLoading | boolean | true | Initial load + auth actions |
| isInitialized | boolean | false | After first /auth/me call completes |
| requires2faEnrollment | boolean | false | Login response if admin and not enrolled |
| forcePasswordChange | boolean | false | Login response if flag set |

**Actions**:
- `login(email, password)` → returns `{requires2fa: boolean}` or sets user
- `verify2fa(code)` → completes login if 2FA challenge active
- `logout()` → clear store, call POST /auth/logout
- `loadCurrentUser()` → fetch GET /auth/me, update store
- `clearUser()` → reset store (used on logout, 401 from interceptor)

**Persistence**: 
- Auth state NOT persisted to localStorage (security; rely on HttpOnly cookie)
- Theme/locale preferences DO persist to localStorage

#### 5.2.2 Server State (TanStack Query)

Cache strategy cho queries liên quan auth/user mgmt:

| Query key pattern | StaleTime | CacheTime | Invalidation triggers |
|---|---|---|---|
| `['auth', 'me']` | 5min | 30min | On login, logout, profile update |
| `['users', 'list', filters]` | 30s | 5min | On user mutation (role/status change, invite) |
| `['users', userId]` | 30s | 5min | On mutation of that user |
| `['users', userId, 'sessions']` | 0 (always fresh) | 1min | On logout, session revoke |
| `['users', 'invitations']` | 30s | 5min | On invitation send/cancel |

**Optimistic updates**: skip Phase 1 cho auth (correctness > UX nicety). Phase 2 review.

#### 5.2.3 Form State (React Hook Form)

Mỗi form là local state, không global:
- LoginForm
- ResetPasswordForm
- ChangePasswordForm
- Enroll2FAForm
- InviteUserForm
- UserRoleChangeForm

Validation: Zod schema (shared types với BE nếu possible Phase 2; Phase 1 maintain trong FE only).

#### 5.2.4 Route State

| State | Location | Note |
|---|---|---|
| Current route | React Router | Hooks: useLocation, useNavigate |
| Auth-required redirect | AuthGuard | Reads route from location, redirects /login với `?from=` param |
| 2FA mid-flow | URL param/state on /login/2fa | Short-lived (5min temp token) |

### 5.3 State Transitions / Chuyển trạng thái

#### 5.3.1 User Status State Machine

```
[pending_invite] ──(accept invite)──→ [active]
                                         │
                                         ├──(admin suspend)──→ [suspended]
                                         │                         │
                                         │     ┌─(admin activate)──┘
                                         ▼     ▼
                                       [active]
                                         │
                                         └──(admin disable / soft-delete)──→ [disabled] (terminal)
```

#### 5.3.2 RefreshToken Lifecycle

```
[issued]  ──(used in refresh)──→ [revoked: rotated]  →  new token issued
   │
   ├──(user logout)──→ [revoked: logout]
   │
   ├──(7d TTL)──→ [expired]
   │
   ├──(reuse detected)──→ [family-revoked: all family members]
   │
   └──(admin revoke OR password change)──→ [revoked: admin_revoke | password_change]
```

#### 5.3.3 Invitation Lifecycle

```
[created]  ──(user accepts)──→ [used]
    │
    ├──(24h TTL)──→ [expired]  (cannot accept)
    │
    └──(admin cancels)──→ [cancelled]  (cannot accept)
```

### 5.4 State Persistence Strategy / Chiến lược Persistence

| State category | Persistent | Volatile | Notes |
|---|---|---|---|
| User profile, role, status | ✅ DB (users table) | — | Source of truth |
| Active sessions | ✅ DB (refresh_tokens) | — | Stateful for revocation |
| Rate limit counters | — | ✅ Redis | OK to lose on restart (just resets counters) |
| Force flags | ✅ DB | — | Survives restart |
| Audit log | ✅ DB | — | Compliance retention |
| FE auth UI state | — | ✅ Zustand (memory) | Lost on refresh, rebuilt via /auth/me |
| FE cached data | — | ✅ TanStack Query (memory) | Refetch on stale |

---

## 06 — Non-Functional Requirements Addressing / Đáp ứng Yêu cầu Phi chức năng

Phần này map NFRs từ SRS sang design approach trong Basic Design.

### 6.1 Performance / Hiệu năng

| NFR | Target | Design Approach |
|---|---|---|
| NFR-PERF-001 Login p95 <500ms | 50 concurrent | Argon2id tune-3-64MB-4 (~150ms); index `users.email`; cached request lifetime |
| NFR-PERF-002 Token validate <10ms | per request | HS256 ~0.1ms; request-scope cache; không DB lookup |
| NFR-PERF-003 Refresh <50ms | per request | 1 DB lookup (token_hash unique index) + 1 sign + 1 insert |
| NFR-PERF-004 2FA enroll <300ms | enrollment | TOTP secret gen ~0.5ms, otpauth URI build ~1ms; rest là network |

**Patterns applied**:
- Connection pooling Prisma (default 10/instance)
- Read replica strategy: skip Phase 1 (Multi-AZ chỉ); add nếu cần
- Compute caching: argon2 cost calibrated; JWT verify in request scope

### 6.2 Security / Bảo mật

| NFR | Design Approach |
|---|---|
| NFR-SEC-001 Password hashing | Argon2id qua argon2@0.41 lib; params calibrated to ~150ms |
| NFR-SEC-002 Token storage | HttpOnly Secure SameSite=Lax cookies; `__Host-` prefix prod; CORS với credentials |
| NFR-SEC-003 Secrets encryption | 2FA secret + recovery codes encrypt AES-256-GCM với env key; RDS at-rest encryption (default) |
| NFR-SEC-004 TLS | ALB TLS termination, ACM cert; HTTPS only prod |
| NFR-SEC-005 Rate limiting | @nestjs/throttler + Redis storage; tiered (IP, user, IP+email combo) |
| NFR-SEC-006 Account lockout | Progressive: 5/15min auto, 10/1h admin-only; counter trong users table |
| NFR-SEC-007 Audit logging | Stub service writes synchronously to audit_logs; covered events listed in BD-2 |
| NFR-SEC-008 2FA admin-mandatory | force_two_fa_enrollment flag + admin endpoint guard checking |

### 6.3 Availability / Khả dụng

| NFR | Design Approach |
|---|---|
| NFR-AVAIL-001 Uptime 99.5% biz hours | Multi-AZ RDS auto-failover; ECS task health checks; ALB target group health |
| NFR-AVAIL-002 Session persists across restart | Refresh tokens trong DB (not memory); access token JWT stateless |

### 6.4 Usability / Tính dùng được

| NFR | Design Approach |
|---|---|
| NFR-USAB-001 Error message clarity | Standard JSON error format `{code, message, traceId}`; messages ja_JP |
| NFR-USAB-002 Login UX 2 pages max | LoginPage → optional TwoFaChallengePage → dashboard |

### 6.5 Maintainability / Khả bảo trì

| NFR | Design Approach |
|---|---|
| NFR-MAINT-001 Coverage 85%+ | Test pyramid: Unit (services, guards), Integration (controllers + test DB), E2E (full flows) |
| NFR-MAINT-002 Migration reversibility | Prisma migrate forward-only; document rollback in PR descriptions; additive columns |

### 6.6 Compliance / Tuân thủ

| NFR | Design Approach |
|---|---|
| NFR-COMP-001 APPI | PII encrypted at rest (RDS); Pino redaction for PII in logs; audit log; soft-delete with anonymization on request |
| NFR-COMP-002 Audit retention 2 years | No hard-delete audit_logs Phase 1; partition strategy ready cho Phase 2+ |

### 6.7 Cross-cutting Concerns / Mối quan tâm xuyên suốt

#### Logging
- Structured JSON logs via Pino
- TraceId per request (UUID v4 generated at entry)
- Context propagation qua async_hooks
- Redaction rule cho sensitive fields

#### Monitoring (delegated to architecture-level)
- CloudWatch Logs aggregation
- Metrics: request count, latency p50/p95/p99, error rate, queue depth
- Alarms: error rate >5% (P1), p95 latency >3s (P2)

#### Error Handling
- Typed AppError hierarchy
- GlobalExceptionFilter to standardize response
- 5xx always log full stack; 4xx info-level
- Never leak internal details in production responses

#### i18n
- API messages ja_JP only Phase 1
- Templates email ja_JP only
- Future: support vi/en if needed (template engine ready)

---

## Tóm tắt Basic Design / Summary

**Document Metrics**:

| Section | Components | Count |
|---|---|---|
| Architecture | Pattern + Layers + Topology | 1 pattern, 4 layers, 4 environments |
| Components (backend) | C-AUTH, C-NOTIF, C-SHARED | 20 backend components |
| Components (frontend) | C-FE | 17 frontend components |
| Dataflows | High-level | 5 main flows + 3 cross-cutting |
| Entities | New + Extended | 5 entities (4 new + 1 extended) |
| State storage | Server + Client | 6 server states + 4 client state types |
| NFR mappings | from SRS | 16 NFRs all addressed |

**Vietnamese ratio**: ≥60% (Q3 quality gate)
**Bilingual headers**: ✅ Tiếng Việt + English
**Prohibited content**: ✅ No sequence diagrams, no SQL schemas, no API method signatures, no code

**Coverage**:
- ✅ All SRS FRs reflected trong components + dataflows
- ✅ All SRS NFRs có design approach trong §6
- ✅ All ADRs referenced
- ✅ Architecture invariants tuân thủ (modular monolith, single DB, no client-direct-DB)

---

**State transition**: INNOVATE_BD → BD_CREATED

**Next**: `/design --detail` để tạo Frontend Detail Design + Backend Detail Design + API Contracts.

---

*F8-AUTH-BASE-basic-design.md*
*Basic Design — 認証 & 権限管理 (Authentication & Authorization)*
*Generated by EPS Framework /design --basic v6.0*
*Project: 藤和建設様 施工管理システム (Towa Construction Management System)*
*DEHA Solutions, 2026-05-16*
