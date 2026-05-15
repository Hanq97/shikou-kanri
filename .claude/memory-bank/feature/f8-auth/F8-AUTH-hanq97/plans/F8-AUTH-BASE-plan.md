# 認証 & 権限管理 — Implementation Plan

## Document Information

- **Feature ID**: F8-AUTH
- **Tên feature**: 認証 & 権限管理 (Authentication & Authorization)
- **Phiên bản**: 1.0.0 (Plan v2.5 format)
- **Tác giả**: DEHA Solutions (Hanq97)
- **Ngày tạo**: 2026-05-16
- **Branch**: feature/f8-auth
- **Estimated total**: ~11 人日 (Phase 1 MVP scope)
- **Refs**:
  - [SRS](../../../../documents/features/F8-AUTH-hanq97/F8-AUTH-BASE-srs.md)
  - [Basic Design](../../../../documents/features/F8-AUTH-hanq97/F8-AUTH-BASE-basic-design.md)
  - [FDD](../../../../documents/features/F8-AUTH-hanq97/F8-AUTH-BASE-frontend-detail-design.md)
  - [API Contracts](../../../../documents/features/F8-AUTH-hanq97/F8-AUTH-BASE-api-contracts.md)
  - [BDD](../../../../documents/features/F8-AUTH-hanq97/F8-AUTH-BASE-backend-detail-design.md)

---

## 01 — Plan Overview / Tổng quan kế hoạch

### 1.1 Strategy / Chiến lược

**Approach**: Bottom-up incremental — build foundation trước (DB schema, shared services, errors, logger), sau đó từng feature flow theo dependency.

**Phases trong F8-AUTH plan**:

| Phase | Mô tả | Effort | Duration (1 BE + 1 FE) |
|---|---|---|---|
| **P0: Foundation** | Shared infra (Prisma, crypto, logger, errors, cookies, CORS) | 1.5d | ~1 day parallel |
| **P1: Schema + Migrations** | 5 DB migrations + Prisma client regen | 0.5d | 0.5 day |
| **P2: Core Services** | PasswordService, TokenService, TotpService, AuditStub, Repositories | 2.0d | 1-1.5 days |
| **P3: Auth API** | Login + 2FA + Refresh + Logout + /me endpoints | 2.0d | 1.5 days |
| **P4: User Management API** | List + CRUD users, role/status change, unlock, 2FA disable | 1.5d | 1 day |
| **P5: Invitation Flow** | Send + accept invitation, password reset, 2FA enroll | 1.5d | 1 day |
| **P6: Bootstrap CLI** | bootstrap:create-admin command + seed script | 0.5d | 0.5 day |
| **P7: Frontend Auth** | Login, 2FA challenge, password reset, accept invite pages | 2.0d | 1.5 days FE |
| **P8: Frontend Settings + User Mgmt** | Profile, 2FA settings, sessions, users list/detail | 2.0d | 1.5 days FE |
| **P9: Integration & E2E Testing** | E2E flows + bug fixes + UAT prep | 2.0d | 1-2 days |
| **Total** | | **~15.5d effort** (with QA buffer) | ~2 weeks calendar (parallel BE/FE) |

> Note: ~11 人日 baseline + ~4.5d test/integration buffer = realistic estimate.

### 1.2 Dependencies Graph

```
P0 Foundation
  ↓
P1 Schema/Migrations  ←─────────┐
  ↓                              │
P2 Core Services                 │ (P7+P8 frontend can start after P3 API stable)
  ↓                              │
P3 Auth API ─────────────────────┤
  ↓                              │
P4 User Mgmt API ────────────────┤
  ↓                              │
P5 Invitation Flow ──────────────┘
  ↓
P6 Bootstrap CLI
  ↓
P7 Frontend Auth          (parallel with backend P3+)
  ↓
P8 Frontend Settings+User (parallel with backend P4-P5)
  ↓
P9 Integration & E2E
```

### 1.3 Parallelization Strategy

- **BE & FE devs work in parallel after P3 API stable** (BE moves to P4-P5, FE starts P7)
- P6 bootstrap CLI có thể do bất kỳ BE dev nào sau P2
- E2E tests start sau khi minimum vertical slice ready (login + /me + logout)
- QA can prepare test scripts in parallel với development

### 1.4 Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| R-P-001 Argon2 tune sai params làm login chậm | M | M | Benchmark P2 ngay, calibrate trước P3 |
| R-P-002 Race condition refresh token rotation | M | H | Unit test concurrent + interactive transaction lock từ P2 |
| R-P-003 Cookie cross-domain CORS bug | M | M | Test trên staging-like env trong P3 |
| R-P-004 2FA library compat issue | L | M | Validate otplib ở P2 với simple unit test trước build full flow |
| R-P-005 FE/BE contract mismatch | M | M | API contracts là source-of-truth; generate types từ openapi spec Phase 2 |
| R-P-006 Test coverage <85% target | M | M | Test-driven cho services security-critical; coverage report mỗi PR |
| R-P-007 Prisma migration drift between devs | M | L | Single dev lead migrations; commit migration files với each PR |
| R-P-008 Email template render issue | L | L | Test với Mailhog trong P5 |

---

## 02 — Phase 0: Foundation / Cơ sở hạ tầng

**Effort**: 1.5 ngày | **Owner**: 1 BE dev

### Tasks

#### T-P0-01: Setup PrismaModule + PrismaService global

**Mô tả**: Tạo global Prisma module với lifecycle (onModuleInit connect, beforeApplicationShutdown disconnect). Inject vào toàn bộ ứng dụng.

**Files to create**:
- `backend/src/shared/database/prisma.module.ts`
- `backend/src/shared/database/prisma.service.ts`
- `backend/src/shared/database/transactional.decorator.ts` (optional helper)

**Acceptance**:
- AC-P0-01-a: PrismaService injectable từ bất kỳ module nào
- AC-P0-01-b: App start/stop không log error connection
- AC-P0-01-c: $transaction available qua interactive API

**Refs**: BDD §8.1; ADR-002

**Effort**: 0.25d

---

#### T-P0-02: Setup logger module (Pino + redaction)

**Mô tả**: Cấu hình Pino với JSON output, traceId injection middleware, redaction rules cho sensitive fields.

**Files**:
- `backend/src/shared/observability/logger.module.ts`
- `backend/src/shared/observability/logger.service.ts`
- `backend/src/shared/observability/trace.middleware.ts`

**Acceptance**:
- AC-P0-02-a: TraceId xuất hiện trong mọi log entry
- AC-P0-02-b: password/token/secret fields show `[REDACTED]`
- AC-P0-02-c: Log level configurable qua env LOG_LEVEL

**Refs**: BDD §14.3; FDD §5.3

**Effort**: 0.25d

---

#### T-P0-03: Setup error hierarchy + GlobalExceptionFilter

**Mô tả**: Tạo AppError base + 23 typed error classes + global filter map to standardized JSON response.

**Files**:
- `backend/src/shared/exceptions/app-error.ts`
- `backend/src/shared/exceptions/auth-errors.ts` (23 error classes)
- `backend/src/shared/exceptions/validation-error.ts`
- `backend/src/shared/exceptions/not-found-error.ts`
- `backend/src/shared/exceptions/global-exception.filter.ts`

**Acceptance**:
- AC-P0-03-a: 23 error codes match API contracts §1.6 catalog
- AC-P0-03-b: Filter maps AppError → JSON `{code, message, traceId, details}`
- AC-P0-03-c: Unknown errors → 500 với generic message + full stack logged

**Refs**: BDD §9; API Contracts §1.6

**Effort**: 0.5d

---

#### T-P0-04: Setup crypto helpers

**Mô tả**: Wrapper services cho argon2, AES-256-GCM, SHA-256, random token gen.

**Files**:
- `backend/src/shared/crypto/argon2.service.ts`
- `backend/src/shared/crypto/aes.service.ts`
- `backend/src/shared/crypto/hash.service.ts`
- `backend/src/shared/crypto/random.service.ts`

**Acceptance**:
- AC-P0-04-a: Argon2 hash/verify với params (timeCost=3, memoryCost=64MB, parallelism=4)
- AC-P0-04-b: Argon2 benchmark trên dev hardware ~100-200ms compute
- AC-P0-04-c: AES encrypt/decrypt round-trip với env key
- AC-P0-04-d: Random token base64url 128-bit

**Refs**: BDD §3.1; SRS NFR-SEC-001/003

**Effort**: 0.25d

---

#### T-P0-05: Setup cookie + CORS + helmet

**Mô tả**: Cấu hình cookie-parser, CORS với credentials, helmet security headers, global ValidationPipe.

**Files**:
- `backend/src/main.ts` (update)
- `backend/src/shared/http/cookie.service.ts`
- `backend/src/shared/http/pipes.ts`

**Acceptance**:
- AC-P0-05-a: Cookies parsed automatically (req.cookies available)
- AC-P0-05-b: CORS origin from env FRONTEND_URL, credentials true
- AC-P0-05-c: ValidationPipe whitelist + forbidNonWhitelisted active
- AC-P0-05-d: helmet HSTS, X-Content-Type-Options, CSP applied

**Refs**: BDD §14.2; FDD §5.1

**Effort**: 0.25d

---

### Phase 0 Deliverables checkpoint

- [ ] T-P0-01 PrismaService global module
- [ ] T-P0-02 Logger + traceId middleware
- [ ] T-P0-03 23 error classes + GlobalExceptionFilter
- [ ] T-P0-04 Crypto helpers (argon2, AES, hash, random)
- [ ] T-P0-05 Cookie + CORS + helmet + global pipes

---

## 03 — Phase 1: Schema + Migrations

**Effort**: 0.5 ngày | **Owner**: 1 BE dev (single lead to avoid drift)

### Tasks

#### T-P1-01: Migration 0002 - User auth fields

**Mô tả**: Extend `users` table với role, status, 2FA fields, lockout fields, force flags, SSO ready fields, audit fields.

**Generated via**: `pnpm --filter backend run prisma:migrate:dev --name user_auth_fields`

**Acceptance**:
- AC-P1-01-a: All columns from BDD §15 added
- AC-P1-01-b: Enums (UserRole, UserStatus, AuthProvider) defined
- AC-P1-01-c: Existing User baseline row migrate gracefully (default role/status set)
- AC-P1-01-d: Indexes: email UNIQUE, status

**Refs**: BDD §15; Innovate Technical BD-5

**Effort**: 0.1d

---

#### T-P1-02: Migration 0003 - refresh_tokens table

**Files affected**: `prisma/schema.prisma` (add RefreshToken model)

**Acceptance**:
- AC-P1-02-a: Schema match BDD entity definition
- AC-P1-02-b: Indexes: token_hash UNIQUE, (user_id, expires_at), family_id
- AC-P1-02-c: FK to users with onDelete: Restrict

**Effort**: 0.1d

---

#### T-P1-03: Migration 0004 - password_reset_tokens table

**Acceptance**:
- AC-P1-03-a: Token_hash UNIQUE, user_id FK
- AC-P1-03-b: Index on expires_at cho cleanup batch

**Effort**: 0.1d

---

#### T-P1-04: Migration 0005 - invitations table

**Acceptance**:
- AC-P1-04-a: Email + token_hash + role + expires_at + invited_by
- AC-P1-04-b: Index on (email, expires_at) cho lookup pending
- AC-P1-04-c: FK invitedBy to users

**Effort**: 0.1d

---

#### T-P1-05: Migration 0006 - audit_logs table

**Acceptance**:
- AC-P1-05-a: actor_user_id nullable (cho system events)
- AC-P1-05-b: action varchar + entity_type/id + changes JSONB
- AC-P1-05-c: 3 indexes per BDD spec

**Effort**: 0.1d

---

### Phase 1 Deliverables

- [ ] 5 migrations applied successfully
- [ ] Prisma client regenerated
- [ ] Test DB `shikou_kanri_test` setup với same migrations

---

## 04 — Phase 2: Core Services

**Effort**: 2.0 ngày | **Owner**: 1-2 BE devs (parallelize internal services)

### Tasks

#### T-P2-01: PasswordService (argon2)

**Files**: `backend/src/modules/auth/internal/password.service.ts` + `domain/password-policy.ts`

**Implementation outline**:
- `hash(plaintext)` → argon2.hash với tuned params
- `verify(hash, plaintext)` → argon2.verify
- `validatePolicy(plaintext)` → throw AuthPasswordWeakError nếu fail
- `PasswordPolicy` class với 5 rules

**Tests**:
- TS-P2-01-a: Hash sản sinh PHC string
- TS-P2-01-b: Verify true cho cùng plaintext
- TS-P2-01-c: Verify false cho khác plaintext
- TS-P2-01-d: validatePolicy throw cho password yếu
- TS-P2-01-e: Benchmark hash ~150ms ±50% trên dev hardware

**Refs**: BDD §3.1

**Effort**: 0.3d

---

#### T-P2-02: TokenService (JWT + refresh)

**Files**: `backend/src/modules/auth/internal/token.service.ts` + `intermediate-token.service.ts`

**Implementation outline**:
- `signAccessToken(payload)` → JWT HS256 với 30min TTL
- `verifyAccessToken(token)` → JwtPayload hoặc throw AuthTokenExpired/Invalid
- `generateRefreshToken()` → { plaintext, hash }
- `issueTokenPair(userId, role, ctx)` → tx-aware, persist refresh, return pair
- `rotateTokenPair(currentPlaintext, ctx)` → reuse detection logic, revoke family
- `revokeRefreshToken(plaintext/hash, reason)` → mark revoked
- `revokeAllForUser(userId, reason)` → return count
- IntermediateTokenService: short-lived 2FA challenge token

**Tests**:
- TS-P2-02-a: Sign + verify round-trip
- TS-P2-02-b: Verify rejects expired token
- TS-P2-02-c: Refresh rotation creates new pair với same family
- TS-P2-02-d: Reuse detected → entire family revoked
- TS-P2-02-e: Max 5 active refresh tokens enforced (oldest revoked on 6th)
- TS-P2-02-f: Intermediate token expires in 5min

**Refs**: BDD §3.2

**Effort**: 0.6d

---

#### T-P2-03: TotpService (otplib wrap)

**Files**: `backend/src/modules/auth/internal/totp.service.ts`

**Implementation outline**:
- `generateSecret()` → base32 32-char
- `buildOtpauthUri(email, secret)` → otpauth:// URI
- `generateQrCode(uri)` → data URL base64 PNG (qrcode lib)
- `verify(code, secret)` → bool với window ±1
- `generateBackupCodes()` → 10 random codes
- `verifyBackupCode(plaintext, encryptedCodes)` → constant-time match, mark used

**Tests**:
- TS-P2-03-a: Secret base32 format valid
- TS-P2-03-b: Verify accepts current TOTP
- TS-P2-03-c: Verify accepts ±30s window
- TS-P2-03-d: Verify rejects ±2 window
- TS-P2-03-e: Backup codes single-use enforced

**Refs**: BDD §3.3

**Effort**: 0.3d

---

#### T-P2-04: AuditStubService

**Files**: `backend/src/modules/auth/internal/audit-stub.service.ts`

**Implementation outline**:
- `log(event, tx?)` → insert vào audit_logs
- 12 convenience methods: logLoginSuccess, logLoginFailure, logLogout, logPasswordChange, log2FaEnroll/Disable, logRoleChange, logStatusChange, logAccountLocked, logInvitationCreated/Accepted, logSecurityEvent

**Tests**:
- TS-P2-04-a: Insert succeeded
- TS-P2-04-b: Sensitive fields KHÔNG xuất hiện trong audit_logs.changes
- TS-P2-04-c: tx parameter respects DB transaction

**Refs**: BDD §3.5

**Effort**: 0.2d

---

#### T-P2-05: Repositories (4 files)

**Files**:
- `backend/src/modules/auth/repositories/user.repository.ts`
- `backend/src/modules/auth/repositories/refresh-token.repository.ts`
- `backend/src/modules/auth/repositories/password-reset.repository.ts`
- `backend/src/modules/auth/repositories/invitation.repository.ts`

**Implementation outline** (per BDD §4):
- Each repository has Prisma client injected
- Methods support optional `tx?: PrismaTransactionClient` for compose-with-transaction
- No business logic — pure data access

**Tests**:
- TS-P2-05-a: CRUD operations work (each repo)
- TS-P2-05-b: tx parameter rollback works
- TS-P2-05-c: Pagination queries return correct counts
- TS-P2-05-d: Soft-delete filter applied automatically

**Refs**: BDD §4

**Effort**: 0.6d

---

### Phase 2 Deliverables

- [ ] T-P2-01 PasswordService với benchmarked argon2
- [ ] T-P2-02 TokenService với rotation + family detection
- [ ] T-P2-03 TotpService với otplib + QR
- [ ] T-P2-04 AuditStubService với 12 events
- [ ] T-P2-05 4 repositories với tx-aware
- [ ] Unit tests coverage ≥90% for internal services

---

## 05 — Phase 3: Auth API

**Effort**: 2.0 ngày | **Owner**: 1 BE dev

### Tasks

#### T-P3-01: AccountLockoutService + AuthService.login

**Mô tả**: Login orchestration với password verify + 2FA branching + lockout tracking.

**Files**:
- `backend/src/modules/auth/services/account-lockout.service.ts`
- `backend/src/modules/auth/services/auth.service.ts` (partial — login method)
- `backend/src/modules/auth/controllers/auth.controller.ts` (POST /auth/login)
- `backend/src/modules/auth/dto/login.dto.ts`
- `backend/src/modules/auth/strategies/local.strategy.ts`

**Acceptance** (cross-ref AC-021, AC-022, AC-023 từ SRS):
- AC-P3-01-a: Happy path returns user + sets cookies
- AC-P3-01-b: Wrong password returns generic error + increment counter
- AC-P3-01-c: Unknown email returns same generic error + same timing
- AC-P3-01-d: 5 fails → 15min lock
- AC-P3-01-e: 10 fails → admin unlock required + alert email
- AC-P3-01-f: 2FA enabled → return intermediate token instead of full tokens
- AC-P3-01-g: Force flags trigger appropriate response

**Tests**:
- TS-P3-01: 8 test cases covering all branches (happy + 7 error paths)

**Effort**: 0.6d

---

#### T-P3-02: AuthService.verify2Fa + backup code endpoint

**Files**:
- `auth.service.ts` (verify2Fa method)
- `auth.controller.ts` (POST /auth/2fa/verify, POST /auth/2fa/backup-code)
- DTOs

**Acceptance**:
- AC-P3-02-a: Valid TOTP code → cấp tokens
- AC-P3-02-b: Invalid code → error + log
- AC-P3-02-c: Expired intermediate token → error
- AC-P3-02-d: Backup code valid → consume + cấp tokens + email alert

**Tests**: 5 test cases

**Effort**: 0.3d

---

#### T-P3-03: AuthService.refreshTokens + endpoint

**Files**:
- `auth.service.ts` (refreshTokens — wrap TokenService.rotateTokenPair)
- `auth.controller.ts` (POST /auth/refresh)

**Acceptance**:
- AC-P3-03-a: Valid refresh → new pair + revoke old
- AC-P3-03-b: Revoked refresh reuse → family revoke + 401
- AC-P3-03-c: Expired refresh → 401
- AC-P3-03-d: Cookies set with new tokens

**Tests**: 4 test cases (including concurrent refresh race)

**Effort**: 0.3d

---

#### T-P3-04: Logout + logout-all + /me endpoints

**Files**:
- `auth.service.ts` (logout, logoutAll, getCurrentUser)
- `auth.controller.ts` (POST /auth/logout, /logout-all, GET /auth/me)
- `backend/src/modules/auth/guards/jwt-auth.guard.ts`
- `backend/src/modules/auth/strategies/jwt.strategy.ts`
- `backend/src/modules/auth/decorators/current-user.decorator.ts`
- `decorators/public.decorator.ts`

**Acceptance**:
- AC-P3-04-a: Logout revokes refresh + clears cookies
- AC-P3-04-b: Logout-all returns revoked count
- AC-P3-04-c: /me returns user info, không sensitive fields
- AC-P3-04-d: Expired token on /me → 401

**Tests**: 4 test cases + JwtAuthGuard unit tests

**Effort**: 0.4d

---

#### T-P3-05: Setup AuthModule + wire up

**Files**:
- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/auth/index.ts` (public exports)
- `backend/src/app.module.ts` (register AuthModule)

**Acceptance**:
- AC-P3-05-a: AuthModule khởi tạo thành công
- AC-P3-05-b: Routes /auth/* được mount tại /api/v1/auth/*
- AC-P3-05-c: Global pipes + filter active

**Effort**: 0.2d

---

#### T-P3-06: Throttler setup (rate limiting)

**Files**:
- `app.module.ts` (ThrottlerModule.forRoot với Redis storage)
- Custom storage adapter cho ElastiCache
- `@Throttle` decorators trên login/refresh endpoints

**Acceptance**:
- AC-P3-06-a: Login 5/15min per IP+email combo
- AC-P3-06-b: 6th attempt → 429 Rate Limited
- AC-P3-06-c: Reset counter sau TTL

**Tests**: 2 test cases

**Effort**: 0.2d

---

### Phase 3 Deliverables

- [ ] 7 Auth API endpoints working: login, 2fa/verify, 2fa/backup-code, refresh, logout, logout-all, /me
- [ ] AuthService methods: login, verify2Fa, refreshTokens, logout, logoutAll, getCurrentUser
- [ ] JwtAuthGuard + LocalStrategy + JwtStrategy
- [ ] AccountLockoutService
- [ ] Rate limiting active
- [ ] Integration tests pass cho full login → refresh → logout flow

---

## 06 — Phase 4: User Management API

**Effort**: 1.5 ngày | **Owner**: 1 BE dev

### Tasks

#### T-P4-01: UsersService + UsersController setup

**Files**:
- `backend/src/modules/auth/services/users.service.ts`
- `backend/src/modules/auth/controllers/users.controller.ts`
- `decorators/roles.decorator.ts`, `guards/roles.guard.ts`

**Acceptance**:
- AC-P4-01-a: @Roles + RolesGuard work end-to-end
- AC-P4-01-b: AuthInsufficientPermissionError thrown for role mismatch

**Effort**: 0.3d

---

#### T-P4-02: GET /users (list) + GET /users/:id

**Acceptance** (cross-ref FR-USER-001/002):
- AC-P4-02-a: Pagination + filter work
- AC-P4-02-b: Search trên name/email fuzzy
- AC-P4-02-c: Self can access own profile
- AC-P4-02-d: Sensitive fields filtered out
- AC-P4-02-e: Soft-deleted users hidden by default

**Tests**: 6 test cases

**Effort**: 0.3d

---

#### T-P4-03: PUT /users/:id/role (change role)

**Acceptance** (cross-ref FR-USER-005, AC-008, AC-009):
- AC-P4-03-a: Admin có thể change role
- AC-P4-03-b: Last admin protection: 409 LAST_ADMIN error
- AC-P4-03-c: Audit log with from/to role
- AC-P4-03-d: Non-admin → 403

**Tests**: 4 test cases (including race condition cho concurrent demote)

**Effort**: 0.3d

---

#### T-P4-04: PUT /users/:id/status (suspend/disable/activate)

**Acceptance** (cross-ref FR-USER-006, AC-010, AC-011):
- AC-P4-04-a: Suspended → revoke refresh tokens
- AC-P4-04-b: Suspended user không login được (AUTH_ACCOUNT_SUSPENDED)
- AC-P4-04-c: Last admin protection cho disable
- AC-P4-04-d: Audit log

**Tests**: 5 test cases

**Effort**: 0.3d

---

#### T-P4-05: PUT /users/:id/profile

**Acceptance** (cross-ref FR-USER-007):
- AC-P4-05-a: Self update OK
- AC-P4-05-b: Admin update other OK
- AC-P4-05-c: Cannot self-change role/status qua endpoint này
- AC-P4-05-d: Audit log

**Effort**: 0.15d

---

#### T-P4-06: POST /users/:id/unlock

**Acceptance** (cross-ref FR-USER-008, AC-012, AC-013):
- AC-P4-06-a: failed_login_attempts reset to 0
- AC-P4-06-b: locked_until cleared
- AC-P4-06-c: Audit log
- AC-P4-06-d: Non-admin → 403

**Effort**: 0.15d

---

#### T-P4-07: POST /users/:id/2fa/disable (emergency)

**Acceptance** (cross-ref FR-USER-009, AC-014, AC-015):
- AC-P4-07-a: Reason required (min 10 chars)
- AC-P4-07-b: 2fa_enabled=false, secret cleared
- AC-P4-07-c: Cannot self-disable qua endpoint này (AUTH_INSUFFICIENT_PERMISSION)
- AC-P4-07-d: Email security alert
- AC-P4-07-e: Admin gets force_two_fa_enrollment=true

**Effort**: 0.15d

---

#### T-P4-08: DELETE /users/:id (soft-delete)

**Acceptance** (cross-ref FR-USER-010):
- AC-P4-08-a: deleted_at set
- AC-P4-08-b: Refresh tokens revoked
- AC-P4-08-c: Last admin protection
- AC-P4-08-d: Email không được reuse cho invite ngay (DB constraint via UNIQUE WHERE deleted_at IS NULL)

**Effort**: 0.15d

---

### Phase 4 Deliverables

- [ ] 8 User management endpoints
- [ ] UsersService with all methods
- [ ] RolesGuard active
- [ ] Last admin protection in 4 places (role, status, delete, self-emergency-2fa)
- [ ] Integration tests pass

---

## 07 — Phase 5: Invitation Flow + Password Reset + 2FA Enrollment

**Effort**: 1.5 ngày | **Owner**: 1 BE dev

### Tasks

#### T-P5-01: InvitationsService + Send Invitation

**Files**:
- `backend/src/modules/auth/services/invitations.service.ts`
- `backend/src/modules/notification/notification.module.ts` (skeleton)
- `backend/src/modules/notification/services/email.service.ts`
- `backend/src/modules/notification/templates/engine.ts`
- `backend/src/modules/notification/templates/invitation.hbs`
- POST /users/invitations endpoint

**Acceptance** (cross-ref FR-USER-003, AC-005-007):
- AC-P5-01-a: Token generated, hashed, persisted
- AC-P5-01-b: Email sent với Handlebars template
- AC-P5-01-c: Pending user created with status=pending_invite
- AC-P5-01-d: Manager cannot invite admin (role validation)
- AC-P5-01-e: Email exists check
- AC-P5-01-f: Audit log

**Tests**: 6 test cases + email template snapshot tests

**Effort**: 0.4d

---

#### T-P5-02: Cancel Invitation + Verify Token endpoints

**Acceptance**:
- AC-P5-02-a: DELETE /users/invitations/:id mark cancelled
- AC-P5-02-b: GET /auth/invitations/:token return metadata
- AC-P5-02-c: Expired/used/cancelled → appropriate 4xx response

**Effort**: 0.2d

---

#### T-P5-03: Accept Invitation

**Acceptance** (cross-ref FR-AUTH-015, AC-019, AC-020):
- AC-P5-03-a: Password policy validation
- AC-P5-03-b: User activated (status=active, password_hash set)
- AC-P5-03-c: Token marked used
- AC-P5-03-d: Auto-login (cookies set)
- AC-P5-03-e: Welcome email
- AC-P5-03-f: Audit log

**Tests**: 5 test cases

**Effort**: 0.25d

---

#### T-P5-04: Password Reset Request + Execute

**Files**:
- `auth.service.ts` (requestPasswordReset, resetPassword)
- `auth.controller.ts` endpoints
- `templates/password-reset.hbs`

**Acceptance** (cross-ref FR-AUTH-007/008, AC-025/026):
- AC-P5-04-a: Always 200 response (no enumeration)
- AC-P5-04-b: Email sent only if email exists
- AC-P5-04-c: Token 1h expiry, single-use
- AC-P5-04-d: Reset revokes all refresh tokens
- AC-P5-04-e: Audit log
- AC-P5-04-f: Rate limit 3/h per email

**Tests**: 6 test cases

**Effort**: 0.3d

---

#### T-P5-05: Change Password (authenticated)

**Acceptance** (cross-ref FR-AUTH-009, AC-024):
- AC-P5-05-a: Old password verify required
- AC-P5-05-b: New password policy
- AC-P5-05-c: Revoke other sessions (keep current)
- AC-P5-05-d: New tokens issued
- AC-P5-05-e: Security alert email
- AC-P5-05-f: Force_password_change flag cleared

**Effort**: 0.15d

---

#### T-P5-06: 2FA Enrollment Flow

**Files**:
- `auth.service.ts` (enroll2FaStart, enroll2FaVerify, disable2Fa)
- `auth.controller.ts` endpoints
- `qrcode` lib integration

**Acceptance** (cross-ref FR-AUTH-010/011/012, AC-027/028):
- AC-P5-06-a: Enroll start returns secret + otpauthUri + qrCodeDataUrl
- AC-P5-06-b: Verify with first TOTP code → enable + return backup codes
- AC-P5-06-c: Backup codes encrypted at rest
- AC-P5-06-d: Disable requires password + TOTP/backup
- AC-P5-06-e: Admin cannot self-disable (returns 403)

**Tests**: 6 test cases

**Effort**: 0.2d

---

### Phase 5 Deliverables

- [ ] Invitation flow end-to-end (send, accept, cancel)
- [ ] Password reset flow end-to-end
- [ ] 2FA enrollment + disable flows
- [ ] 4 email templates (Handlebars)
- [ ] Email service tested với Mailhog locally

---

## 08 — Phase 6: Bootstrap CLI + Dev Seed

**Effort**: 0.5 ngày | **Owner**: Any BE dev

### Tasks

#### T-P6-01: bootstrap:create-admin CLI command

**Files**:
- `backend/src/cli/cli.module.ts`
- `backend/src/cli/bootstrap-create-admin.command.ts`
- `backend/package.json` (add `cli` script)
- Install `nest-commander`

**Acceptance** (cross-ref AC-001, AC-002):
- AC-P6-01-a: Idempotent check (refuse if admin exists, allow with --force)
- AC-P6-01-b: Temp password 16 chars, secure random
- AC-P6-01-c: force_password_change + force_two_fa_enrollment = true
- AC-P6-01-d: stdout output temp password
- AC-P6-01-e: Audit log (actor=null)

**Tests**: 4 test cases

**Effort**: 0.3d

---

#### T-P6-02: Prisma seed script (dev/staging only)

**Files**:
- `backend/prisma/seed.ts`
- `backend/package.json` (add `prisma:seed` script + Prisma seed config)

**Acceptance** (cross-ref DD-3):
- AC-P6-02-a: Skip if NODE_ENV=production
- AC-P6-02-b: 4 test users created với known passwords (admin/manager/employee/invited)
- AC-P6-02-c: Idempotent (skip if user exists)
- AC-P6-02-d: All users active, 2FA disabled, force flags off

**Effort**: 0.2d

---

### Phase 6 Deliverables

- [ ] CLI command available: `pnpm --filter backend cli bootstrap:create-admin`
- [ ] Seed script: `pnpm --filter backend prisma:seed`
- [ ] README updated với usage examples

---

## 09 — Phase 7: Frontend Auth Pages

**Effort**: 2.0 ngày | **Owner**: 1 FE dev (parallel với BE Phase 3+)

### Tasks

#### T-P7-01: Setup shared/api + authStore + AuthGuard

**Files**:
- `frontend/src/shared/api/client.ts`
- `frontend/src/shared/api/interceptors/auth.interceptor.ts`
- `frontend/src/shared/api/interceptors/error.interceptor.ts`
- `frontend/src/shared/stores/authStore.ts` (Zustand)
- `frontend/src/shared/components/guards/AuthGuard.tsx`
- `frontend/src/shared/components/guards/RoleGuard.tsx`
- `frontend/src/shared/components/guards/PublicOnly.tsx`
- `frontend/src/shared/hooks/useAuth.ts`

**Acceptance**:
- AC-P7-01-a: API client với withCredentials=true
- AC-P7-01-b: 401 interceptor singleton refresh + retry
- AC-P7-01-c: Error toast với Japanese messages
- AC-P7-01-d: AuthGuard redirect /login khi unauthenticated
- AC-P7-01-e: Refresh interceptor không infinite loop

**Tests**: Unit tests cho interceptors

**Effort**: 0.5d

---

#### T-P7-02: LoginPage + 2FA challenge

**Files**:
- `frontend/src/features/auth/pages/LoginPage.tsx`
- `frontend/src/features/auth/pages/TwoFaChallengePage.tsx`
- `frontend/src/features/auth/components/AuthLayout.tsx`
- `frontend/src/features/auth/components/PasswordInputField.tsx`
- `frontend/src/features/auth/components/TwoFaCodeInput.tsx`
- `frontend/src/features/auth/schemas/login.schema.ts`
- `frontend/src/features/auth/hooks/useLogin.ts`
- Zod schemas, validation

**Acceptance** (cross-ref FDD §2.1-2.2):
- AC-P7-02-a: Form validation Zod, errors inline
- AC-P7-02-b: Submit calls API, handles all error codes mapping
- AC-P7-02-c: 2FA required → navigate to /login/2fa with intermediate token
- AC-P7-02-d: TwoFaCodeInput 6-digit auto-advance
- AC-P7-02-e: Backup code toggle UI works
- AC-P7-02-f: Countdown timer cho intermediate token (5min)

**Tests**: Component + integration tests

**Effort**: 0.5d

---

#### T-P7-03: ForgotPasswordPage + ResetPasswordPage

**Acceptance** (cross-ref FDD §2.3-2.4):
- AC-P7-03-a: Always success message (no enumeration)
- AC-P7-03-b: Reset token verify on mount
- AC-P7-03-c: Password strength meter realtime
- AC-P7-03-d: Match confirmation
- AC-P7-03-e: Submit → success toast → redirect /login

**Effort**: 0.4d

---

#### T-P7-04: AcceptInvitePage

**Acceptance** (cross-ref FDD §2.5):
- AC-P7-04-a: Token verify hiển thị invitation info
- AC-P7-04-b: Password set form với policy validation
- AC-P7-04-c: Auto-login sau accept → redirect /home
- AC-P7-04-d: Error UX cho expired/used/invalid token

**Effort**: 0.3d

---

#### T-P7-05: Routes setup + i18n + theme

**Files**:
- `frontend/src/app/routes.tsx`
- `frontend/src/app/providers.tsx` (QueryClient + Theme + i18n)
- `frontend/src/locales/ja/common.json`, `auth.json`, `errors.json`

**Acceptance**:
- AC-P7-05-a: All auth routes accessible
- AC-P7-05-b: Code splitting (lazy load pages)
- AC-P7-05-c: Japanese error messages from i18n
- AC-P7-05-d: AntD locale jaJP applied

**Effort**: 0.3d

---

### Phase 7 Deliverables

- [ ] 5 public auth pages working end-to-end với backend
- [ ] Auth state management (Zustand) functional
- [ ] API client with interceptors
- [ ] Route guards working
- [ ] Initial bundle size <300KB gzip

---

## 10 — Phase 8: Frontend Settings + User Management

**Effort**: 2.0 ngày | **Owner**: 1 FE dev

### Tasks

#### T-P8-01: ProfileSettingsPage (profile + password change)

**Acceptance** (cross-ref FDD §2.6):
- AC-P8-01-a: Profile form save với mutation
- AC-P8-01-b: Password change form với policy validation
- AC-P8-01-c: Force password change banner if applicable
- AC-P8-01-d: Tabs UI

**Effort**: 0.4d

---

#### T-P8-02: TwoFaSettingsPage (3-step wizard)

**Acceptance** (cross-ref FDD §2.7):
- AC-P8-02-a: Step 1: QR display + manual secret
- AC-P8-02-b: Step 2: Verify TOTP code
- AC-P8-02-c: Step 3: Backup codes display + download + copy
- AC-P8-02-d: Disable flow với password + TOTP confirmation

**Effort**: 0.5d

---

#### T-P8-03: SessionsPage

**Acceptance** (cross-ref FDD §2.8):
- AC-P8-03-a: List active sessions với user-agent parsing
- AC-P8-03-b: Current session highlighted
- AC-P8-03-c: Revoke per-session confirmation modal
- AC-P8-03-d: Revoke all button

**Effort**: 0.3d

---

#### T-P8-04: UsersListPage + filters + table

**Acceptance** (cross-ref FDD §2.9):
- AC-P8-04-a: Pagination + filters work
- AC-P8-04-b: Search debounce
- AC-P8-04-c: Sortable columns
- AC-P8-04-d: Action dropdown per row

**Effort**: 0.4d

---

#### T-P8-05: UserDetailPage + admin actions

**Acceptance** (cross-ref FDD §2.10):
- AC-P8-05-a: Profile sections
- AC-P8-05-b: Change role (confirm modal)
- AC-P8-05-c: Change status (confirm modal)
- AC-P8-05-d: Manual unlock
- AC-P8-05-e: Emergency disable 2FA (reason input)
- AC-P8-05-f: Soft delete (double confirm)
- AC-P8-05-g: Last admin protection — UI disables options

**Effort**: 0.3d

---

#### T-P8-06: UserInvitePage

**Acceptance** (cross-ref FDD §2.11):
- AC-P8-06-a: Email format validation
- AC-P8-06-b: Role selector limited by current user's role
- AC-P8-06-c: Submit → success toast → redirect /users
- AC-P8-06-d: Email exists error message

**Effort**: 0.2d

---

### Phase 8 Deliverables

- [ ] All settings pages working
- [ ] User management UI complete (list, detail, invite, edit)
- [ ] All role-based UI restrictions enforced
- [ ] 2FA enrollment wizard tested với real authenticator app

---

## 11 — Phase 9: Integration & E2E Testing

**Effort**: 2.0 ngày | **Owner**: 1 QA + dev support

### Tasks

#### T-P9-01: Backend E2E test suite

**Files**: `backend/test/auth.e2e-spec.ts`, `users.e2e-spec.ts`, `invitations.e2e-spec.ts`

**Test scenarios**:
- Full login + refresh + logout flow
- 2FA enrollment + verification
- Invitation send + accept + auto-login
- Password reset request + execute
- Admin: invite manager → change role → suspend → unlock
- Rate limiting: 5 failed logins → 429
- Account lockout: 5 fails → 15min lock; 10 fails → admin unlock
- Token rotation + reuse detection
- Concurrent refresh race (parallel requests)

**Acceptance**: All E2E scenarios pass, coverage 85%+ overall

**Effort**: 0.6d

---

#### T-P9-02: Frontend E2E (Playwright)

**Test scenarios**:
- Happy path: invite → accept → login → setup 2FA → change password → logout
- Admin: list users → change role → emergency 2FA disable
- Error UX: locked account, expired invite, weak password
- Mobile responsive (verify Phase 1 desktop ok, no broken)

**Effort**: 0.5d

---

#### T-P9-03: Performance benchmarking

**Targets**:
- Login p95 ≤ 500ms
- Token validate p95 ≤ 10ms
- Refresh p95 ≤ 50ms
- 2FA enroll p95 ≤ 300ms

**Tools**: k6 or Apache Bench, run trên staging-like env

**Acceptance**: All targets met OR document deviation with mitigation

**Effort**: 0.3d

---

#### T-P9-04: Security audit (pre-launch)

**Checklist**:
- [ ] No password/token/secret in logs (review Pino redaction)
- [ ] HttpOnly cookies confirmed in browser DevTools
- [ ] CORS configured correctly
- [ ] Rate limits effective
- [ ] SQL injection: review Prisma queries
- [ ] XSS: review React output
- [ ] Audit log entries for all sensitive ops

**Effort**: 0.4d

---

#### T-P9-05: UAT prep + documentation

**Deliverables**:
- UAT test cases document (from AC-001 → AC-032)
- README user guide (admin bootstrap, dev seed)
- Postman collection or OpenAPI spec exported

**Effort**: 0.2d

---

### Phase 9 Deliverables

- [ ] All E2E tests pass on staging
- [ ] Performance targets met
- [ ] Security audit checklist completed
- [ ] UAT scripts ready
- [ ] Production deployment runbook

---

## 12 — Effort Summary

| Phase | Tasks | Effort (人日) |
|---|---|---|
| P0 Foundation | 5 | 1.5 |
| P1 Schema/Migrations | 5 | 0.5 |
| P2 Core Services | 5 | 2.0 |
| P3 Auth API | 6 | 2.0 |
| P4 User Mgmt API | 8 | 1.5 |
| P5 Invitation/Reset/2FA | 6 | 1.5 |
| P6 Bootstrap CLI | 2 | 0.5 |
| P7 Frontend Auth | 5 | 2.0 |
| P8 Frontend Settings + User Mgmt | 6 | 2.0 |
| P9 Integration & E2E | 5 | 2.0 |
| **Total Tasks** | **53** | **15.5 人日** |

### 12.1 Effort vs Baseline

- **Baseline từ Feature Map**: F8-01 (5d) + F8-02 (6d) = **11 人日**
- **Plan total**: 15.5 人日
- **Difference**: +4.5 人日 (~40% overhead)

**Overhead bao gồm**:
- Foundation setup (P0): 1.5d (one-time, không phải feature-specific)
- Bootstrap CLI + seed (P6): 0.5d (operational tool)
- Integration & E2E (P9): 2.0d (typically not in feature estimates)
- Notification module skeleton: ~0.5d (cần thiết cho invitation/reset emails)

→ Adjusted baseline (foundation + notification + ops included): ~13-14 人日. Plan 15.5d = ~10% buffer trên realistic baseline.

### 12.2 Calendar Time (with 1 BE + 1 FE parallel)

- **BE work**: P0 + P1 + P2 + P3 + P4 + P5 + P6 + P9 (BE portion) = ~10.5d → ~2 weeks 1 BE dev
- **FE work**: P7 + P8 + P9 (FE portion) = ~5d → ~1 week 1 FE dev (can start sau P3)
- **Combined calendar**: ~2-2.5 weeks với parallel work

### 12.3 Critical Path

```
P0 → P1 → P2 → P3 (Auth API) → P4 → P5
                ↓
                P7 (FE Auth can start here) → P8 (FE Settings/Users)
                ↓
                P9 (Integration after P5 + P8 stable)
```

**Critical milestones**:
- End of P3: Login flow working end-to-end (BE)
- End of P5: All auth + user mgmt + email flows complete (BE)
- End of P7: Login UX complete (FE) — UAT ready cho basic flows
- End of P8: All UI complete
- End of P9: Production-ready

---

## 13 — Implementation Checklist (master)

### Sprint 1 (Week 1)
- [ ] P0 Foundation complete
- [ ] P1 Migrations applied
- [ ] P2 Core services with unit tests ≥90% coverage
- [ ] P3 Auth API working end-to-end (BE)

### Sprint 2 (Week 2)
- [ ] P4 User Management API complete
- [ ] P5 Invitation + Password Reset + 2FA flows complete
- [ ] P6 Bootstrap CLI + Seed working
- [ ] P7 Frontend Auth pages working (parallel)

### Sprint 3 (Week 3, integration)
- [ ] P8 Frontend Settings + User Mgmt complete
- [ ] P9 Integration tests passing
- [ ] Performance benchmarks met
- [ ] Security audit clean
- [ ] UAT ready

---

## 14 — Definition of Done (per Phase)

Mỗi phase phải đạt:

- [ ] Tất cả tasks implemented theo BDD/FDD specs
- [ ] Acceptance criteria của tasks pass
- [ ] Unit tests written + pass (coverage targets per phase)
- [ ] Integration tests pass cho cross-component flows
- [ ] Code review approved (1+ reviewer)
- [ ] ESLint + TypeScript strict pass
- [ ] No security warnings (npm audit, snyk if available)
- [ ] Docs updated (README sections relevant)
- [ ] Audit log entries verified for new operations
- [ ] Manual smoke test trên local dev env

---

## 15 — Confidence Score

**Phương pháp**: Weighted by phase risk + dependency stability + team experience.

| Factor | Score | Weight | Weighted |
|---|---|---|---|
| Design completeness (SRS + BD + FDD + BDD + API) | 95% | 30% | 28.5% |
| Tech stack familiarity (NestJS, React, Prisma) | 90% | 25% | 22.5% |
| Dependencies clear (no external blockers Phase 1) | 95% | 15% | 14.25% |
| Team experience | 85% | 15% | 12.75% |
| Risk mitigation (R-P-001 to R-P-008 addressed) | 85% | 10% | 8.5% |
| Effort estimate realism (15% buffer over baseline) | 80% | 5% | 4.0% |
| **Total confidence** | | | **90.5%** |

**Status**: ✅ **READY** (threshold 90%)

---

## 16 — Plan Approval

This plan is ready for review and execution upon:
- [x] All design documents complete (SRS + BD + FDD + API + BDD)
- [x] All ADRs referenced
- [x] Risks identified with mitigation
- [x] Effort estimates with overhead acknowledged
- [x] Acceptance criteria cross-mapped to SRS

**State transition target**: PLAN_CREATED → PLAN_REVIEWED → EXECUTE_READY

**Next**: 
1. `/plan-review` (auto-chain)
2. After approval: `/execute` để bắt đầu implementation

---

## Summary / Tóm tắt Plan

| Metric | Value |
|---|---|
| Total phases | 10 (P0-P9) |
| Total tasks | 53 |
| Total acceptance criteria | 100+ |
| Total effort | 15.5 人日 |
| Calendar time (parallel) | 2-3 weeks |
| Confidence | 90.5% |
| Test coverage target | 85%+ (90%+ for security-critical) |

**Refs all design documents + ADRs**. **Cross-mapped to all SRS FRs + NFRs + ACs.**

---

*F8-AUTH-BASE-plan.md*
*Implementation Plan — 認証 & 権限管理*
*Generated by EPS Framework /plan v2.5*
*DEHA Solutions, 2026-05-16*
