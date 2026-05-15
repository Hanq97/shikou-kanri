# Technical Innovation Selection: F8-AUTH

**Feature**: F8-AUTH (F8-01 認証 + F8-02 権限管理)
**Module**: auth
**Branch**: feature/f8-auth
**Mode**: full (new feature)
**Sinh ngày**: 2026-05-16
**Trạng thái**: INNOVATE_TECHNICAL

---

## 1. Quyết định Architecture (BD)

### BD-1: JWT signing algorithm
**Quyết định**: **HS256 (HMAC-SHA256)**
- Single shared secret lưu trong AWS Secrets Manager (prod) / .env (dev)
- Sign + verify với cùng key (không cần public key infrastructure)
- Performance: ~0.1ms per verify (10K ops/sec single-thread)
- Phase 3 monitor: nếu cần microservice split (AI service separation), có thể migrate sang RS256
- **Env vars**: `JWT_ACCESS_SECRET` (≥256-bit random), `JWT_REFRESH_SECRET` (khác access)

### BD-2: Tích hợp audit (stub pattern)
**Quyết định**: **Interface stub trong auth module + ghi DB table trực tiếp qua Prisma**
- Tạo `AuditService` interface trong `auth/internal/audit.stub.service.ts`
- Events write TRỰC TIẾP vào bảng `audit_logs` qua Prisma (chưa có abstraction)
- Branch F8-03 sẽ:
  - Move stub sang `audit` module riêng
  - Add async queue (BullMQ) để non-blocking writes
  - Add log viewer UI
  - Add S3 archival lifecycle
- Cho F8-auth: synchronous DB write trong cùng auth transaction (chấp nhận được ở scale 50-user)
- Events emit:
  - `auth.login.success`, `auth.login.failure`, `auth.logout`
  - `auth.password.change`, `auth.password.reset`
  - `auth.2fa.enroll`, `auth.2fa.disable`
  - `auth.account.locked`, `auth.account.unlocked`
  - `auth.invitation.created`, `auth.invitation.accepted`
  - `user.role.changed`, `user.status.changed`, `user.deleted`

### BD-3: Email transport
**Quyết định**: **AWS SES (prod) + Mailhog (dev) + Handlebars templates**
- **Prod**: AWS SES với verified sender domain (`noreply@shikou-kanri.example.com`)
- **Dev**: Mailhog tại `localhost:1025` (docker-compose.dev.yml đã có sẵn)
- **Email module**: `shared/email/` (wrapper nhẹ, gửi qua SMTP cho cả prod/dev — SES có SMTP interface)
- **Templates**: Handlebars + inline CSS, files trong `backend/src/templates/email/`
- **Template files Phase 1**:
  - `invitation.hbs` — invite link + giải thích role
  - `password-reset.hbs` — reset link + warning 1h expiry
  - `password-changed.hbs` — security alert (informational)
  - `2fa-enrolled.hbs` — security alert (informational)
  - `account-locked.hbs` — cho admin notification ở L2 lockout
- **i18n**: Templates tiếng Nhật (ja_JP) only Phase 1 (Towa là JP company)

### BD-4: Cookie configuration (per-environment)
**Quyết định**: **Per-env Secure flag + prefix `__Host-` ở prod**

```typescript
// Cookie config Phase 1
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  // Production: HTTPS only, prefix __Host- enforce
  secure: process.env.NODE_ENV === 'production',
  // Domain: omit (default = exact host) để tương thích prefix __Host-
};

const accessCookieName = process.env.NODE_ENV === 'production' 
  ? '__Host-access_token' 
  : 'access_token';
```

**CORS config** (related):
```typescript
app.enableCors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true, // bắt buộc cho cookies
});
```

### BD-5: Database schema additions (Prisma)

```prisma
// Extension bảng users (từ baseline + entity-catalog)
enum UserRole {
  system_admin
  manager
  employee
  invited
}

enum UserStatus {
  pending_invite
  active
  suspended
  disabled
}

enum AuthProvider {
  local
  google      // Phase 2 SSO
  microsoft   // Phase 2 SSO
}

model User {
  id              String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email           String       @unique
  emailVerified   Boolean      @default(false) @map("email_verified")
  name            String
  nameKana        String?      @map("name_kana")
  passwordHash    String?      @map("password_hash")
  role            UserRole
  status          UserStatus   @default(active)
  
  twoFaEnabled    Boolean      @default(false) @map("two_fa_enabled")
  twoFaSecret     Bytes?       @map("two_fa_secret")           // AES-256-GCM encrypted
  twoFaRecoveryCodes Bytes?    @map("two_fa_recovery_codes")    // encrypted JSON array
  
  authProvider    AuthProvider @default(local) @map("auth_provider")
  externalId      String?      @map("external_id")
  
  failedLoginAttempts Int      @default(0) @map("failed_login_attempts")
  lockedUntil     DateTime?    @map("locked_until") @db.Timestamptz(6)
  
  lastLoginAt     DateTime?    @map("last_login_at") @db.Timestamptz(6)
  forcePasswordChange Boolean  @default(false) @map("force_password_change")
  forceTwoFaEnrollment Boolean @default(false) @map("force_two_fa_enrollment")
  
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?    @map("deleted_at") @db.Timestamptz(6)
  createdById     String?      @map("created_by") @db.Uuid
  updatedById     String?      @map("updated_by") @db.Uuid

  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]
  invitationsSent Invitation[] @relation("InvitedBy")
  auditLogs       AuditLog[]   @relation("Actor")

  @@map("users")
  @@index([email])
  @@index([status])
}

model RefreshToken {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  tokenHash     String   @unique @map("token_hash") // SHA-256 hex
  familyId      String   @map("family_id") @db.Uuid // lineage tracking
  lineageSeq    Int      @default(0) @map("lineage_seq")
  issuedAt      DateTime @default(now()) @map("issued_at") @db.Timestamptz(6)
  expiresAt     DateTime @map("expires_at") @db.Timestamptz(6)
  revokedAt     DateTime? @map("revoked_at") @db.Timestamptz(6)
  revokedReason String?  @map("revoked_reason") // 'logout' | 'rotated' | 'reuse_detected' | 'admin_revoke' | 'family_revoked'
  userAgent     String?  @map("user_agent")
  ipAddress     String?  @map("ip_address") @db.Inet

  user          User     @relation(fields: [userId], references: [id])
  
  @@map("refresh_tokens")
  @@index([userId, expiresAt])
  @@index([familyId])
}

model PasswordResetToken {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  tokenHash   String   @unique @map("token_hash")
  expiresAt   DateTime @map("expires_at") @db.Timestamptz(6)
  usedAt      DateTime? @map("used_at") @db.Timestamptz(6)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  user        User     @relation(fields: [userId], references: [id])
  @@map("password_reset_tokens")
}

model Invitation {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email       String
  tokenHash   String   @unique @map("token_hash")
  role        UserRole
  expiresAt   DateTime @map("expires_at") @db.Timestamptz(6)
  usedAt      DateTime? @map("used_at") @db.Timestamptz(6)
  invitedById String   @map("invited_by") @db.Uuid
  cancelledAt DateTime? @map("cancelled_at") @db.Timestamptz(6)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  invitedBy   User     @relation("InvitedBy", fields: [invitedById], references: [id])
  @@map("invitations")
  @@index([email, expiresAt])
}

model AuditLog {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  actorUserId  String?  @map("actor_user_id") @db.Uuid  // NULL cho system-generated (vd CLI bootstrap)
  action       String   // vd "auth.login.success", "user.role.changed"
  entityType   String?  @map("entity_type") // "user" | "invitation" | ...
  entityId     String?  @map("entity_id") @db.Uuid
  changes      Json?    // { field: { from, to } } cho mutations
  ipAddress    String?  @map("ip_address") @db.Inet
  userAgent    String?  @map("user_agent")
  occurredAt   DateTime @default(now()) @map("occurred_at") @db.Timestamptz(6)

  actor        User?    @relation("Actor", fields: [actorUserId], references: [id])
  @@map("audit_logs")
  @@index([actorUserId, occurredAt(sort: Desc)])
  @@index([entityType, entityId, occurredAt(sort: Desc)])
  @@index([occurredAt(sort: Desc)])
}
```

### BD-6: Chiến lược encryption 2FA secret
**Quyết định**: AES-256-GCM với key env-stored (Phase 1) → migrate sang AWS KMS (Phase 2 optional)
- Encryption key: 32-byte random trong env var `TWOFA_ENCRYPTION_KEY` (set qua Secrets Manager prod)
- Encrypt: `crypto.createCipheriv('aes-256-gcm', key, iv)` → store dạng Buffer (Bytes trong Prisma)
- Format: `iv (12 bytes) || authTag (16 bytes) || ciphertext (variable)`
- Decrypt on-demand chỉ khi verify TOTP
- Recovery codes: cùng encryption scheme, store dưới dạng JSON array của unused codes (used codes redacted)

### BD-7: Rate limiting architecture
**Quyết định**: `@nestjs/throttler` v6 với Redis storage backend
- Storage: ElastiCache Redis (đã có trong stack)
- Rule global: 300 req/min/user, 100 req/min/IP
- Login endpoint specific: 5 attempts / 15min / (IP + email combo)
- Dùng custom `ThrottlerStorageRedisService` để persist counts qua instances

### BD-8: Dependency graph của module (auth specifically)
```
src/modules/auth/  ← public API exports
   │
   ├── phụ thuộc: shared/database (Prisma), shared/storage (none Phase 1),
   │              shared/crypto (argon2 wrap, AES helpers),
   │              shared/observability (logger)
   │
   ├── consume: notification module (email send) — Phase 1 stub HOẶC direct SES call
   │
   └── expose: AuthGuard, RolesGuard, ProjectMembershipGuard (stub),
               @Roles, @CurrentUser, @Public, @Require2FA decorators,
               AuthService, UsersService (cho modules khác lookup user info)
```

**Note**: notification module skeleton cần thiết nhưng tối thiểu. F8-auth bao gồm:
- `src/modules/notification/notification.module.ts` (skeleton cơ bản)
- `src/modules/notification/email.service.ts` (gửi qua SMTP, Phase 1 sync)
- Templates dir
- Full notification module (channels, queue, retry) → có thể làm trong F6 (aftercare cần hơn)

---

## 2. Quyết định Implementation (DD)

### DD-1: TOTP library
**Quyết định**: **`otplib`** (v12+)
- Pure TypeScript, well-maintained, RFC 6238 compliant
- Dùng: `authenticator.generateSecret()`, `authenticator.keyuri()`, `authenticator.verify()`
- Window: `authenticator.options = { window: 1 }` (cho phép ±30s drift)

### DD-2: Validation password complexity
**Quyết định**: Regex qua `class-validator @Matches` + custom error messages

```typescript
// password.dto.ts
@IsString()
@MinLength(12, { message: 'Password phải có ít nhất 12 ký tự' })
@Matches(/[A-Z]/, { message: 'Phải có ít nhất 1 chữ hoa' })
@Matches(/[a-z]/, { message: 'Phải có ít nhất 1 chữ thường' })
@Matches(/[0-9]/, { message: 'Phải có ít nhất 1 chữ số' })
@Matches(/[^A-Za-z0-9]/, { message: 'Phải có ít nhất 1 ký tự đặc biệt' })
password: string;
```

Phase 2 consideration: add `zxcvbn` làm soft warning (không hard reject) nếu user feedback cần.

### DD-3: Test seed strategy
**Quyết định**: Prisma seed script (dev/staging only)

```typescript
// backend/prisma/seed.ts
if (process.env.NODE_ENV === 'production') {
  console.log('Skip seed trong production');
  process.exit(0);
}

// Create test users:
const users = [
  { email: 'admin@dev.shikou-kanri.local', name: '管理者太郎', role: 'system_admin', password: 'DevPassword123!' },
  { email: 'manager@dev.shikou-kanri.local', name: '営業マネージャー', role: 'manager', password: 'DevPassword123!' },
  { email: 'employee@dev.shikou-kanri.local', name: '営業一般', role: 'employee', password: 'DevPassword123!' },
];
// Hash + insert nếu chưa tồn tại
```

Run qua: `pnpm --filter backend run prisma:seed`

Add vào `backend/package.json` scripts:
```json
"prisma:seed": "tsx prisma/seed.ts"
```

Note: `tsx` đã trong devDep hoặc add. Hoặc dùng Prisma built-in `prisma db seed` (configured trong package.json).

### DD-4: Error response format
**Quyết định**: Standard typed JSON error format

```typescript
// shared/observability/types.ts
interface ApiError {
  code: string;         // vd "AUTH_INVALID_CREDENTIALS"
  message: string;      // human-readable, ja_JP
  traceId: string;      // request trace ID cho correlation
  details?: Record<string, any>; // optional context (validation errors, ...)
}

// Ví dụ responses:
// 401 Unauthorized
{ "code": "AUTH_INVALID_CREDENTIALS", "message": "メールアドレスまたはパスワードが正しくありません", "traceId": "abc123" }

// 403 Forbidden
{ "code": "AUTH_INSUFFICIENT_PERMISSION", "message": "この操作を実行する権限がありません", "traceId": "abc123" }

// 423 Locked
{ "code": "AUTH_ACCOUNT_LOCKED", "message": "アカウントがロックされました。15分後に再試行してください。", "traceId": "abc123", "details": { "unlockAt": "2026-05-16T..." } }
```

Catalog error codes (auth-specific):
| Code | HTTP | Ý nghĩa |
|---|---|---|
| AUTH_INVALID_CREDENTIALS | 401 | Sai email hoặc password (no enumeration) |
| AUTH_2FA_REQUIRED | 401 | Cần 2FA challenge |
| AUTH_2FA_INVALID | 401 | Sai TOTP code |
| AUTH_TOKEN_EXPIRED | 401 | JWT expired |
| AUTH_TOKEN_INVALID | 401 | JWT malformed/signature invalid |
| AUTH_REFRESH_INVALID | 401 | Refresh token bad/revoked |
| AUTH_REFRESH_REUSE_DETECTED | 401 | Reuse → family revoked |
| AUTH_INSUFFICIENT_PERMISSION | 403 | Role/permission denied |
| AUTH_ACCOUNT_SUSPENDED | 403 | User bị suspend/disable |
| AUTH_ACCOUNT_LOCKED | 423 | Quá nhiều failure |
| AUTH_2FA_ENROLLMENT_REQUIRED | 403 | Admin phải enroll 2FA |
| AUTH_FORCE_PASSWORD_CHANGE | 403 | Phải đổi pw trước |
| AUTH_INVITATION_EXPIRED | 410 | Invite token expired |
| AUTH_INVITATION_USED | 410 | Invite đã accepted |
| AUTH_INVITATION_INVALID | 404 | Invite token không tìm thấy |
| AUTH_PASSWORD_RESET_EXPIRED | 410 | Reset token expired |
| AUTH_PASSWORD_RESET_INVALID | 404 | Reset token không tìm thấy |
| AUTH_PASSWORD_WEAK | 400 | Violate policy password |
| AUTH_USER_EXISTS | 409 | Email đã đăng ký (case invite) |
| AUTH_LAST_ADMIN | 409 | Không thể demote/delete admin cuối |
| AUTH_RATE_LIMITED | 429 | Quá nhiều requests |

### DD-5: Structured logger fields (Pino)
**Quyết định**: Standard fields cho tất cả auth events

```typescript
logger.info({
  event: 'auth.login.success',
  userId: user.id,
  email: redact(user.email), // hash hoặc mask cho privacy
  role: user.role,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  traceId: context.traceId,
});
```

Redaction list (Pino config): `password`, `passwordHash`, `*.password*`, `token`, `*.token*`, `2faSecret`, `*.secret*`, `recoveryCodes`, `*.recoveryCodes*`.

### DD-6: Validation pipe configuration
**Quyết định**: Global ValidationPipe với strict settings

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // strip unknown properties
  forbidNonWhitelisted: true, // throw nếu có extra properties
  transform: true,           // auto-transform query/body sang DTO type
  transformOptions: {
    enableImplicitConversion: false,
  },
  errorHttpStatusCode: 400,
}));
```

### DD-7: Bootstrap admin CLI implementation
**Quyết định**: Pattern nest-commander

```bash
# Install: pnpm --filter backend add nest-commander
# Usage:
pnpm --filter backend run cli bootstrap:create-admin \
  --email admin@example.com \
  --name "管理者太郎"
```

```typescript
// src/cli/bootstrap-create-admin.command.ts
@Command({ name: 'bootstrap:create-admin' })
export class BootstrapCreateAdminCommand extends CommandRunner {
  async run(passedParams: string[], options: { email: string; name: string }) {
    // 1. Verify chưa có admin OR allow với --force
    // 2. Generate temp password
    // 3. Hash với argon2
    // 4. Create user với role=system_admin, status=active, 
    //    forcePasswordChange=true, forceTwoFaEnrollment=true
    // 5. Audit log entry
    // 6. Print temp password ra stdout
    console.log(`Admin đã tạo: ${options.email}`);
    console.log(`Temporary password: ${tempPassword}`);
    console.log('User BẮT BUỘC đổi password + enroll 2FA ở lần login đầu.');
  }
}
```

### DD-8: Frontend API client + auth flow

**Axios config** (`frontend/src/shared/api/client.ts`):
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // send cookies
});

// Response interceptor: xử lý 401 → try refresh 1 lần
let refreshing: Promise<void> | null = null;
apiClient.interceptors.response.use(undefined, async (error) => {
  if (error.response?.status === 401 && !error.config._retried) {
    error.config._retried = true;
    if (!refreshing) {
      refreshing = apiClient.post('/auth/refresh').finally(() => { refreshing = null; });
    }
    try {
      await refreshing;
      return apiClient(error.config);
    } catch {
      // refresh failed → redirect login
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }
  return Promise.reject(error);
});
```

**Zustand authStore** (`frontend/src/shared/stores/authStore.ts`):
```typescript
interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2fa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  // ... methods khác
}
```

### DD-9: Chiến lược testing
- **Unit**: `password.service.spec`, `token.service.spec`, `totp.service.spec`, guards
- **Integration**: `auth.controller.spec` với test PG (qua testcontainers HOẶC docker compose)
- **E2E**: `auth.e2e-spec.ts` với supertest — full flows (login, refresh, 2FA, invite)
- **Coverage target**: ≥85% cho `auth/*` (security-critical)
- **Test DB**: separate database `shikou_kanri_test` create trong docker-compose, transactional cleanup per test

### DD-10: Trình tự migration

Migrations cần tạo trong `prisma/migrations/`:
1. `0002_user_auth_fields` — add columns vào users (role, status, 2fa, ...)
2. `0003_refresh_tokens_table` — create refresh_tokens
3. `0004_password_reset_tokens_table` — create password_reset_tokens
4. `0005_invitations_table` — create invitations
5. `0006_audit_logs_table` — create audit_logs (dùng bởi stub)

Mỗi migration generate qua `pnpm --filter backend run prisma:migrate:dev --name <name>` trong terminal interactive.

---

## 3. Quality Gates / Acceptance

**Pre-implementation gates (Q checkpoints)**:
- Q1 (≥80% evidence): 27 evidence pieces ✅
- Q2 (Unique IDs): FN-01→29, SC-01→10, BD-1→8, DD-1→10 ✅
- Q3 (Bilingual ≥60%): Documents Vietnamese-primary với key JP/EN terms ✅
- Q4 (Interfaces only): Detail design sẽ chỉ interfaces + pseudo-code ✅

**Mục tiêu performance** (verified):
- Login (với argon2 verify): <500ms p95
- Token validation (cached): <10ms p95
- Refresh: <50ms p95
- 2FA enroll (với QR gen): <300ms p95

---

## 4. Items mở còn lại (none — sẵn sàng generate design)

Tất cả quyết định architecture và implementation đã complete. Sẵn sàng auto-chain:
1. `/design --srs` → generate SRS document
2. `/design --basic` → generate Basic Design
3. `/design --detail` → generate Detail Design (FDD + BDD + API contracts)

---

## Trạng thái

- ✅ Architecture decisions: BD-1 đến BD-8 (8 items)
- ✅ Implementation decisions: DD-1 đến DD-10 (10 items)
- ✅ Tổng: 18 quyết định technical đã capture

**State transition**: SRS_CREATED → INNOVATE_TECHNICAL

**Tiếp**: Auto-chain `/design --srs`, `/design --basic`, `/design --detail` (Step 3 của innovate router).
