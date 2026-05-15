# Domain Knowledge Base: Xác thực & Phân quyền (Authentication & Authorization)

**Feature**: F8-AUTH (F8-01 認証 + F8-02 権限管理)
**Module**: `auth`
**Sinh ngày**: 2026-05-16
**Nguồn**: Knowledge cơ bản của Claude + Architecture docs + ADR-015/016 + OWASP/NIST references

---

## 1. Workflow chuẩn ngành (業界標準ワークフロー)

### 1.1 Luồng đăng nhập (email/password)
```
1. User submit {email, password}
2. Server lookup user theo email (case-insensitive normalize trước)
3. Verify password hash (constant-time compare — argon2.verify)
4. Check trạng thái account (active / suspended / pending)
5. Nếu 2FA đã enable → return "2fa_required" + temp token
   Ngược lại → cấp access + refresh tokens
6. Log audit event (success / failure)
7. Update last_login_at
```

**Xử lý lỗi**:
- Cùng error message cho email không tồn tại vs sai password (tránh email enumeration)
- Rate limit: 5 attempts/15min → tạm khóa account + alert admin
- IP-level rate limit: 10 attempts/min/IP

### 1.2 Luồng challenge 2FA (TOTP)
```
1. Sau khi password OK, return 2fa_challenge với intermediate token ngắn hạn (5min)
2. User submit {2fa_code, intermediate_token}
3. Server validate TOTP code:
   - Decrypt 2fa_secret của user (AES-256-GCM)
   - Verify code so với cửa sổ 30 giây hiện tại (±1 window tolerance)
   - HOẶC accept backup code (mark as used)
4. Cấp full tokens
```

**Chi tiết TOTP (RFC 6238)**:
- Time-based: chu kỳ 30 giây
- 6 chữ số
- HMAC-SHA1 (chuẩn ngành; tương thích mọi authenticator app)
- Window tolerance: ±1 (60s drift)

### 1.3 Luồng refresh token
```
1. Access token hết hạn (30min theo doc §4.3)
2. Client gửi refresh token lên /auth/refresh
3. Server validate refresh token:
   - Lookup trong bảng refresh_tokens (đã hashed)
   - Check chưa expire (7 ngày)
   - Check chưa bị revoke
4. Rotate: invalidate refresh cũ, cấp pair mới
5. Return {access, refresh} mới
```

**Refresh token rotation** (best practice bảo mật):
- Detect reuse → tất cả refresh tokens của user bị revoke (nghi ngờ bị đánh cắp)
- Family tracking qua token "lineage" ID

### 1.4 Luồng reset password
```
1. User request reset với email
2. Server: LUÔN return success (tránh email enumeration)
3. Nếu email tồn tại → generate signed token (1h expiry), gửi email
4. User click link → nhập password mới
5. Server validate token, update password_hash, invalidate tất cả sessions
6. Gửi email xác nhận
```

### 1.5 Luồng mời user (招待ユーザー — F4-03 phụ thuộc)
```
1. Admin/Manager mời user qua email + role + (tùy chọn) project_ids
2. Server tạo pending user (chưa có password) + invitation_token (24h expiry)
3. Gửi email với invite link
4. User click → form set-password
5. User submit password → activate account, tự động login
6. Project memberships tự động được cấp
```

### 1.6 Gán role (F8-02)
```
1. Admin chọn user → dropdown role
2. Validate role mới (không demote được last admin)
3. Update users.role + ghi audit log
4. Tùy chọn: invalidate sessions hiện tại của user (buộc re-login với role mới)
```

### 1.7 Luồng SSO (Phase 2 — defer theo ADR-015)
- OIDC standard flow
- Account linking: user đã tồn tại với verified email khớp → tự động link

---

## 2. Entities chính + Business rules

### 2.1 Entities

**User** (mở rộng từ baseline trong entity-catalog):
```
id              uuid PK
email           varchar(255) UNIQUE NOT NULL (lookup case-insensitive)
email_verified  boolean default false
name            varchar(100) NOT NULL
name_kana       varchar(100) NULL (フリガナ cho tên JP)
password_hash   varchar(255) NULL (NULL nếu mới invited chưa set)
role            enum('system_admin','manager','employee','invited')
status          enum('pending_invite','active','suspended','disabled')
2fa_enabled     boolean default false
2fa_secret      bytea NULL (encrypted AES-256-GCM)
2fa_recovery_codes bytea[] NULL (encrypted, có flag used)
auth_provider   enum('local','google','microsoft') default 'local'
external_id     varchar(255) NULL (SSO subject)
last_login_at   timestamptz NULL
failed_login_attempts int default 0
locked_until    timestamptz NULL
created_at, updated_at, deleted_at, created_by, updated_by (audit chuẩn)
```

**RefreshToken**:
```
id              uuid PK
user_id         uuid FK
token_hash      varchar(64) UNIQUE (SHA-256 của token)
family_id       uuid (lineage rotation)
issued_at       timestamptz
expires_at      timestamptz
revoked_at      timestamptz NULL
revoked_reason  varchar(50) NULL ('logout', 'reuse_detected', 'admin_revoke')
user_agent      text NULL
ip_address      inet NULL
```

**PasswordResetToken**:
```
id              uuid PK
user_id         uuid FK
token_hash      varchar(64) UNIQUE
expires_at      timestamptz
used_at         timestamptz NULL
created_at      timestamptz
```

**InvitationToken**:
```
id              uuid PK
email           varchar(255)
token_hash      varchar(64) UNIQUE
role            enum (role mục tiêu cho user mời)
expires_at      timestamptz
used_at         timestamptz NULL
invited_by      uuid FK users.id
created_at      timestamptz
```

**ProjectMember** (đã có trong entity-catalog — cho per-project ACL của 招待ユーザー):
```
project_id, user_id, role_on_project, folder_access_override
```

### 2.2 Business rules

**R-AUTH-01**: Email unique (case-insensitive) trong active users. Soft-deleted users (deleted_at IS NOT NULL) loại trừ khỏi uniqueness.

**R-AUTH-02**: Yêu cầu password (theo ADR-015):
- Tối thiểu 12 ký tự
- Phải bao gồm: chữ hoa + chữ thường + số + ký tự đặc biệt
- Reject common passwords (have-i-been-pwned dict nếu khả thi; tối thiểu: check với top 10K)
- Không trùng 5 password cũ (bảng password history, defer Phase 2 nếu cần)

**R-AUTH-03**: System admin role BẮT BUỘC phải có 2FA enabled trước khi truy cập admin functions (theo ADR-016). Block admin actions nếu 2FA chưa enroll.

**R-AUTH-04**: Không được xóa hoặc demote `system_admin` cuối cùng. Validation ở service layer.

**R-AUTH-05**: Token rotation: mỗi refresh cấp pair mới, refresh cũ mark used. Reuse của refresh đã used = đáng ngờ → revoke toàn bộ family.

**R-AUTH-06**: Giới hạn session: tối đa 5 active refresh tokens/user (cái cũ nhất auto-revoke khi cấp cái thứ 6).

**R-AUTH-07**: Đổi email cần re-verification (cả email hiện tại + email mới confirm).

**R-AUTH-08**: Account auto-lock sau 5 lần fail trong 15 min → khóa 15min. Sau 10 lần fail trong 1h → admin manual unlock required.

**R-AUTH-09**: 招待ユーザー chỉ có thể truy cập projects mà họ có trong `project_members`. Enforce ở mọi query.

**R-AUTH-10**: Permission matrix theo role (theo stakeholder-roles catalog):
- system_admin: full CRUD trên tất cả
- manager: CRUD trên assigned, approve quotes (F2-05), invite users
- employee: CRUD trên assigned, không approve, không admin tools
- invited: Read trên assigned projects, Create trên photos/messages, không admin

---

## 3. Yêu cầu pháp lý / Regulatory

### 3.1 個人情報保護法 (APPI)
- Email + tên là PII → encrypted at rest (RDS default OK)
- Session timeout 30min (theo doc §4.3) ngăn abuse session bị bỏ rơi
- Audit log mọi auth events (theo F8-03 — feature riêng nhưng required cho compliance)
- Quyền xóa: anonymize dữ liệu user khi có deletion request (không thể xóa hoàn toàn do audit trail)

### 3.2 Lưu trữ password
- NIST SP 800-63B 2024 guidance: ưu tiên Argon2id (đã chọn) HOẶC bcrypt cost 12+
- Salt là per-user automatic trong argon2/bcrypt
- KHÔNG BAO GIỜ log password plaintext (Pino redaction)

### 3.3 Session management (NIST SP 800-63B)
- Session timeout 30min (idle) — match doc requirement
- Absolute timeout: 12h (buộc re-auth dù có activity)
- Re-authentication required cho sensitive actions (Phase 2: đổi password, enable/disable 2FA, đổi role)

### 3.4 JWT best practices (RFC 7519 + OWASP)
- Algorithm: RS256 (asymmetric) > HS256 — ưu tiên cho FE/BE separation
  - Phase 1: HS256 chấp nhận được (single backend) — đơn giản hơn ops; revisit nếu multi-service Phase 3
- Claims:
  - `sub` (user id)
  - `email` (cho FE display, KHÔNG cho authz decisions)
  - `role` (cached; verify với DB ở sensitive actions)
  - `jti` (token id, cho revocation)
  - `iat`, `exp`
  - `aud`, `iss`
- KHÔNG đặt sensitive data trong JWT (nó base64 encoded, KHÔNG phải encrypted)
- Access token ngắn hạn (30min) bù trừ cho việc không revoke được

### 3.5 OAuth 2.0 (Phase 2 SSO — tham khảo)
- Dùng Authorization Code flow + PKCE
- State parameter (chống CSRF)
- Nonce trong OIDC (chống replay)

---

## 4. Reference Architectures

### 4.1 NestJS auth patterns

**Stack chuẩn** (đề xuất cho project này):
- `@nestjs/passport` — strategy abstraction
- `passport-local` — email/password
- `passport-jwt` — JWT validation
- `@nestjs/jwt` — JWT signing/verifying

**Cấu trúc module**:
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts          # endpoints /auth/*
├── auth.service.ts             # business logic
├── strategies/
│   ├── local.strategy.ts       # passport-local
│   └── jwt.strategy.ts         # passport-jwt
├── guards/
│   ├── jwt-auth.guard.ts       # @UseGuards(JwtAuthGuard)
│   ├── roles.guard.ts          # @Roles('admin')
│   ├── project-membership.guard.ts  # @ProjectMembership('projectId')
│   └── two-fa.guard.ts         # @Require2FA()
├── decorators/
│   ├── current-user.decorator.ts  # @CurrentUser()
│   ├── roles.decorator.ts         # @Roles(...)
│   └── public.decorator.ts        # @Public() — skip auth
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts (invite-based, không self-signup)
│   ├── refresh.dto.ts
│   ├── change-password.dto.ts
│   ├── enable-2fa.dto.ts
│   └── verify-2fa.dto.ts
├── repositories/
│   ├── user.repository.ts
│   ├── refresh-token.repository.ts
│   ├── password-reset.repository.ts
│   └── invitation.repository.ts
└── internal/                   # không export
    ├── password.service.ts     # argon2 wrap
    ├── token.service.ts        # JWT sign/verify
    ├── totp.service.ts         # 2FA secret gen + verify
    └── email-verifier.service.ts
```

### 4.2 Chiến lược lưu token

**Các phương án ngành**:

| Strategy | Ưu điểm | Nhược điểm |
|---|---|---|
| **HttpOnly Secure Cookie** (đề xuất) | Miễn nhiễm với XSS theft | Concern về CSRF → SameSite + token trong header |
| LocalStorage | Dễ dùng SPA | XSS = full compromise |
| Memory only | An toàn nhất | UX tệ (logout khi refresh) |
| In-memory + refresh trong HttpOnly cookie | Tốt nhất | Phức tạp hơn |

**Lý do quyết định**: Dùng HttpOnly Secure SameSite=Lax cookie cho cả access + refresh. CSRF được mitigate bởi:
- SameSite=Lax (default protection của browser)
- Custom CSRF token cho state-changing operations (Phase 2 review nếu cần)
- Hoặc dùng cookie prefix `__Host-`

### 4.3 Permission/RBAC patterns

**NestJS guard pattern** (chọn theo ADR-001):
```typescript
@Roles('system_admin', 'manager')
@UseGuards(JwtAuthGuard, RolesGuard)
async createCustomer(...) { ... }
```

**Per-resource authorization (project membership)**:
```typescript
@UseGuards(JwtAuthGuard, ProjectMembershipGuard)
@Get('projects/:projectId/photos')
async listPhotos(@Param('projectId') id, @CurrentUser() user) {
  // ProjectMembershipGuard check user có trong project_members của :projectId
}
```

**Tham khảo**: Casbin / Oso là overkill ở scale này. Custom guards là đủ.

### 4.4 Các system production tương đương

| System | Auth approach | Bài học |
|---|---|---|
| **Stripe Dashboard** | Email + 2FA bắt buộc cho sensitive ops | Tiered 2FA per action |
| **GitHub** | Email + 2FA + WebAuthn options | Flexibility đa nhân tố |
| **Notion** | Email + Google SSO + magic link | Magic link UX low-friction |
| **ANDPAD** (SaaS xây dựng Nhật) | Email + 2FA chỉ cho admin | Match lựa chọn 2FA của ta |
| **Microsoft Office** | Azure AD SSO heavy | Mirror cho SSO Phase 2 nếu Towa dùng M365 |

---

## 5. Edge Cases đặc thù domain

### 5.1 Pending invitation users
- User tồn tại trong DB với `status='pending_invite'`, `password_hash=NULL`
- Không thể login bình thường
- Chỉ qua flow "set-password" đặc biệt
- Nếu invitation token expire trước khi user dùng → admin có thể invite lại (token mới, cùng user record)

### 5.2 Email collision khi mời
- User đã tồn tại với email → không thể invite (return error cho admin)
- Admin phải đổi role của user hiện có thay vì invite

### 5.3 Bảo vệ last admin
- Không thể delete HOẶC demote `system_admin` duy nhất
- UI grey out option; backend enforce (race condition: 2 admins demote nhau cùng lúc → DB constraint hoặc service-layer check với row lock)

### 5.4 2FA recovery — admin mất device + backup codes
- Không thể recover qua system riêng (không có 2FA bypass qua email — như vậy defeats 2FA)
- Out-of-band recovery: admin khác manual disable 2FA sau khi verify identity
- Nếu chỉ có 1 admin → DEHA support can thiệp (process đã document)

### 5.5 Kịch bản token bị đánh cắp
- Detect refresh token reuse → revoke toàn bộ family + alert user
- Detect suspicious activity (đổi IP, đổi country) → require re-auth (Phase 2 enhancement)

### 5.6 Concurrent password change
- Session cũ dùng password cũ — có nên giữ?
- **Quyết định**: invalidate tất cả sessions khác khi đổi password. Current session giữ. User được thông báo rõ ràng.

### 5.7 Đổi email
- Two-step: confirm với email hiện tại + email mới
- Email cũ có thể recover account trong 24h (rollback nếu compromised)
- Defer Phase 2 nếu MVP đơn giản hơn cần.

### 5.8 Browser back button sau logout
- Access token trong HttpOnly cookie bị clear khi logout
- SPA cached pages có thể hiện UI cũ vài giây — React Query refetch + 401 redirect xử lý

### 5.9 Mobile session (Phase 2 PWA)
- Cùng tokens hoạt động
- Hơi dài hơn cho access token (60min)? Hoặc dựa vào refresh
- Background sync cho photo upload vẫn cần valid token — phối hợp với refresh flow

### 5.10 Audit log volume
- Mỗi login attempt được log → volume cao (5K projects × nhiều users × nhiều logins/ngày)
- Plan cho log rotation: aggregate "5+ failed attempts" thành 1 suspicious_activity event

---

## 6. Performance Patterns

### 6.1 Hot path: token validation
- Mọi authenticated request validate JWT
- Cost: ~0.1ms (HS256) hoặc ~1ms (RS256) per request
- Optimization: cache validated user object trong request lifetime
- Không query DB mọi request — JWT chứa đủ (`sub`, `role`)
- DB lookup chỉ cho sensitive operations (admin actions, role check chưa chắc chắn)

### 6.2 Password hashing
- argon2id: cố tình chậm (~50-500ms tunable)
- Tradeoff: server CPU vs security
- **Tune Phase 1**: time-cost=3, memory-cost=65536 (64MB), parallelism=4 → ~150ms trên CPU hiện đại
- Acceptable: login là event hiếm

### 6.3 Rate limiting
- @nestjs/throttler với Redis backing (ElastiCache)
- Login endpoint: 5 attempts/15min per IP+email combo
- Endpoint khác: 300 req/min/user (theo ADR-005)

### 6.4 Session lookup
- Refresh tokens lưu hashed trong DB
- Index: `token_hash` UNIQUE — O(1) lookup
- Cleanup expired refresh tokens hàng ngày (BullMQ cron)

---

## 7. Security Patterns

### 7.1 Password security
- **Hash**: argon2id (Argon2 winner của Password Hashing Competition 2015; OWASP top choice hiện tại)
- **Salt**: tự động bởi argon2 library (per-password)
- **Pepper**: optional secret thứ hai trong env (defense in depth) — defer
- **No max length**: Argon2 handle arbitrary length

### 7.2 Bảo vệ chống brute force
- Account lock sau N failed (5 → 15min, 10 → manual unlock)
- IP rate limit (10/min)
- CAPTCHA sau 3 fails (Phase 2 nếu observed abuse)

### 7.3 CSRF
- SameSite=Lax cookie (browser modern default protection)
- Cho mutation endpoints: optional custom CSRF token trong header
- API-style architecture ít vulnerable hơn traditional form posts

### 7.4 Token security
- Access token: 30min, HttpOnly Secure cookie, không có PII
- Refresh token: 7d, HttpOnly Secure cookie, single-use rotating
- Server lưu chỉ hash (token plaintext discarded sau khi issue)
- Khi logout: revoke token server-side + clear cookie client-side

### 7.5 2FA security
- 2FA secret encrypted at rest (AES-256-GCM với KMS-managed key)
- Recovery codes encrypted, mark single-use
- TOTP verification window ±1 (60s drift tolerance)
- Backup codes: generate 10, hiển thị 1 lần, encrypted at rest

### 7.6 Ngăn email enumeration
- Login: cùng error message cho email không tồn tại vs sai password
- Password reset: luôn "nếu email tồn tại, link đã gửi" — không xác nhận tích cực
- Registration không applicable (invite-only)

### 7.7 Logging & monitoring
- Tất cả auth events log (login, logout, password change, 2FA change, role change, account lock, ...)
- Redacted: không bao giờ log password / token / 2FA secret / recovery codes
- Alert thresholds:
  - >10 failed attempts trong 5min cho 1 user → admin notify
  - >100 failed attempts trong 5min global → DDOS alert
  - Admin role change → notify các admin khác

### 7.8 Các vector tấn công thường gặp đã xử lý

| Attack | Mitigation |
|---|---|
| Credential stuffing | Rate limit + account lock + breach password check |
| Brute force password | Argon2 cost + rate limit + lockout |
| Token replay | Refresh rotation + jti tracking |
| Session hijacking (XSS) | HttpOnly cookie + CSP |
| Session fixation | Token rotation khi login |
| Account enumeration | Cùng error messages |
| Password reset abuse | Always-success response + signed token + 1h expiry |
| Privilege escalation | Service-layer role check + audit |
| Insecure direct object refs | Service-layer ownership check |

### 7.9 Đối chiếu OWASP Top 10

| OWASP A07:2021 | Identification and Authentication Failures | Đã xử lý |
|---|---|---|
| Weak passwords | Argon2 + policy + breach check |
| Credential stuffing | Rate limit + 2FA |
| Default creds | Không có default users |
| Brute force | Lockout + rate limit |
| Thiếu session timeout | 30min idle + 12h absolute |
| Recovery flaw | Signed token + chống email enumeration |

---

## 8. Integration Patterns

### 8.1 Email integration (Phase 1)
- Service: AWS SES (theo ADR-005)
- Use cases:
  - Welcome / invitation email
  - Password reset email
  - 2FA enrollment confirmation
  - Security alerts (new login từ IP mới — defer Phase 2)
- Template engine: Handlebars + mjml (responsive email)
- Local dev: Mailhog (port 1025 SMTP, 8025 UI)

### 8.2 SSO Providers (Phase 2, defer)
- Primary: Google Workspace (giả định theo ADR-015)
- Alternative: Microsoft 365 (Azure AD) — swap passport strategy đơn giản
- OIDC flow chuẩn

### 8.3 TOTP authenticators
- Tương thích với mọi app RFC 6238:
  - Google Authenticator
  - Authy
  - 1Password
  - Microsoft Authenticator
  - Bitwarden
- QR code generation: npm package `qrcode`
- otpauth URI format: `otpauth://totp/<issuer>:<user_email>?secret=<base32>&issuer=<issuer>`

### 8.4 Integrations tương lai
- WebAuthn / FIDO2 (passwordless) — Phase 3+ option
- SAML 2.0 nếu Towa khách enterprise yêu cầu — khó xảy ra
- LDAP nếu integrate Towa AD — case-by-case

---

## Tóm tắt

**Độ phức tạp domain**: Trung bình-Cao (regulatory + multi-role + 2FA + nhiều flows)

**Quyết định quan trọng đã chốt qua ADRs**:
- ✅ Email/PW Phase 1 (ADR-015)
- ✅ 2FA optional + admin-mandatory (ADR-016)
- ✅ Argon2id cho password (NIST + ADR-015)
- ✅ NestJS Passport cho strategies (theo ADR-002)
- ✅ HttpOnly Secure cookie cho tokens (security best practice)
- ✅ Refresh token rotation (chuẩn ngành)

**Quyết định mở cho phase /innovate**:
1. JWT algorithm: HS256 vs RS256 (đề xuất HS256 cho Phase 1 đơn giản)
2. Email change flow: full 2-step verification vs simple change with confirmation (đề xuất simple defer)
3. CSRF strategy: SameSite=Lax only vs CSRF tokens explicit (đề xuất SameSite only)
4. Session limit per user (đề xuất 5 active refresh tokens)
5. Password history (đề xuất defer Phase 2)
6. Initial admin user bootstrap (seed CLI command vs setup wizard)

**Mục tiêu performance**:
- Login: <500ms p95 (chủ yếu là Argon2 hash ~150ms)
- Token validation: <10ms p95
- Refresh: <50ms p95

**Mục tiêu capacity** (theo doc §4.1):
- 50 concurrent users → ~10 logins/min sustained, ~50/min peak → thoải mái
