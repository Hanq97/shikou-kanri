# Báo cáo Evidence: F8-AUTH

## Metadata
- **Feature**: F8-AUTH (F8-01 認証 + F8-02 権限管理)
- **Loại task**: new
- **Module**: auth
- **Branch**: feature/f8-auth
- **Sinh ngày**: 2026-05-16
- **Researcher**: Claude (DEHA Solutions architect)

---

## Phần 1: Bối cảnh nghiệp vụ [SCOPE:SRS]

### E-1.1: Spec chức năng F8-01 認証 (từ doc)
**Nguồn**: `藤和建設様_施工管理システム_統合ドキュメント.md` Part 2 §02, dòng 1217-1228
**Nội dung**:
> F8-01 ユーザー認証・SSO
> - 機能概要: メールアドレス／パスワード認証および将来的なSSO (Google Workspace等) 連携
> - ユーザーストーリー: システム管理者として、社員のログイン管理を簡素化したいので、Google アカウントでSSOログインできるようにしたい
> - 受入条件:
>   - メール認証＋強パスワードポリシー
>   - 2要素認証 (オプション)
>   - SSO (OAuth 2.0 / OIDC) 対応
> - 関連画面: ログイン画面 / プロファイル設定
> - 関連API: POST /auth/login, GET /auth/sso/callback
> - 対象ロール: 全ロール
> - 優先度: 高 | ステータス: 【済】 | Phase: Phase 1

### E-1.2: Spec chức năng F8-02 権限管理
**Nguồn**: cùng doc, dòng 1230-1241
**Nội dung**:
> F8-02 ロール・権限管理
> - 機能概要: 3階層のロール (システム管理者／社員／招待ユーザー) に基づいたアクセス制御
> - ユーザーストーリー: システム管理者として、ロールに応じて利用可能機能を制限したいので、ロール・権限マトリクスの定義と管理ができるようにしたい
> - 受入条件:
>   - 3階層ロール (管理者／社員／招待)
>   - ロール別の機能制御
>   - 案件単位の権限上書き設定
> - 関連画面: ユーザー管理 / ロール設定
> - 関連API: GET /users, PUT /users/:id/role
> - 対象ロール: システム管理者

### E-1.3: Stakeholder roles (4-tier, refined từ doc 3-tier)
**Nguồn**: `documents/architecture/06-security-architecture.md` §4.1; `architect/catalogs/stakeholder-roles.md`
**Nội dung**: Doc nói 3-tier nhưng catalog đã refine thành 4-tier:
1. `system_admin` (システム管理者): full CRUD, mandatory 2FA, là role duy nhất được revoke 2FA / restore backup
2. `manager` (社員 マネージャー): approve quotes, invite users, view sensitive dashboard (Phase 3)
3. `employee` (社員 一般): standard CRUD, không approve, không admin
4. `invited` (招待ユーザー — 職人/協力業者): per-project access only, limited CRUD

### E-1.4: Yêu cầu phi chức năng (liên quan auth)
**Nguồn**: doc §4.3 セキュリティ要件
**Nội dung**:
- Phương thức xác thực: メール／パスワード認証（強パスワードポリシー）。SSO（OAuth 2.0／OIDC）対応。2要素認証はオプション
- Session timeout 30分（無操作時）。再ログインで延長
- Tất cả traffic encrypt TLS 1.2+
- Lưu password: hash hóa (bcrypt等), cấm lưu plaintext
- Audit log: ログイン／顧客変更／見積承認／削除等 lưu trong 2 năm

### E-1.5: Permission matrix (per feature) — guide implement F8-02
**Nguồn**: doc Part 2 §04 ロール×機能 (dòng 1322-1368)
**Nội dung**: Full CRUD matrix cho 42 features × 4 roles. Quan trọng cho F8-02 làm policy spec.
Ví dụ:
| Feature | sys_admin | manager | employee | invited |
|---|---|---|---|---|
| F1-01 顧客マスタ | CRUD | RU | R | — |
| F1-03 案件 | CRUD | CRUD | CRU | R (own) |
| F2-05 見積承認 | CRUD | CRU | R | — |
| F8-02 ロール管理 | CRUD | R | — | — |
| F8-03 監査ログ | R | — | — | — |

### E-1.6: User flows (cấp cao)
**Nguồn**: `documents/architecture/03-frontend-architecture.md` §5.1; `domain-knowledge.md` §1
**Nội dung**:
- Login (email+pw) → optional 2FA challenge → JWT cấp
- Reset password qua signed link trong email (1h expiry)
- Invitation flow: admin invite qua email → invite token → user set password → activate
- Gán role qua admin (có audit trail)
- 2FA enrollment self-service cho mọi user; mandatory cho admin role khi login lần đầu

---

## Phần 2: Architecture Patterns [SCOPE:BD]

### E-2.1: Module placement (theo ADR-001 Modular Monolith)
**Nguồn**: `documents/architecture/02-module-architecture.md`; `architect/catalogs/module-catalog.md`
**Nội dung**:
```
src/modules/auth/                  # F8-01, F8-02, cũng F4-03 invite (Phase 2)
├── index.ts                       # public API barrel
├── auth.module.ts
├── auth.controller.ts             # endpoints /auth/*
├── auth.service.ts                # business logic orchestration
├── strategies/
│   ├── local.strategy.ts          # email/pw qua passport-local
│   └── jwt.strategy.ts            # JWT validation qua passport-jwt
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── project-membership.guard.ts
├── decorators/
│   ├── current-user.decorator.ts  # @CurrentUser()
│   ├── roles.decorator.ts         # @Roles(...)
│   └── public.decorator.ts        # @Public() để skip auth
├── dto/
│   ├── login.dto.ts, refresh.dto.ts, password-reset.dto.ts,
│   ├── change-password.dto.ts, enable-2fa.dto.ts, verify-2fa.dto.ts
│   └── invitation.dto.ts
├── repositories/
│   ├── user.repository.ts
│   ├── refresh-token.repository.ts
│   ├── password-reset.repository.ts
│   └── invitation.repository.ts
└── internal/
    ├── password.service.ts        # argon2 wrap
    ├── token.service.ts           # JWT sign + refresh rotation
    ├── totp.service.ts            # 2FA secret + verification
    └── email.adapter.ts           # gọi notification module
```

### E-2.2: Chiến lược identity (ADR-015)
**Nguồn**: `architect/decisions/ADR-015-identity-provider.md`
**Nội dung**: 
- Phase 1: email/password native với argon2 hash + JWT
- Session: 30min access token + 7-day refresh token (rotation)
- Cookie storage: HttpOnly Secure SameSite=Lax
- Phase 2 (defer): SSO qua Google Workspace OIDC (giả định)

### E-2.3: Policy 2FA (ADR-016)
**Nguồn**: `architect/decisions/ADR-016-2fa-policy.md`
**Nội dung**:
- TOTP (RFC 6238) chuẩn — tương thích Google Authenticator, 1Password, Authy
- BẮT BUỘC cho `system_admin` role (block admin actions nếu chưa enroll)
- TÙY CHỌN cho roles khác
- 10 backup codes generate khi enroll
- 2FA secret encrypt AES-256-GCM at rest

### E-2.4: Baseline entity User
**Nguồn**: `architect/catalogs/entity-catalog.md` §1
**Nội dung**: Đã map trong entity-catalog. F8-auth extend thêm:
- `email_verified`, `name_kana`, `password_hash`, `role`, `status`
- `2fa_enabled`, `2fa_secret` (encrypted), `2fa_recovery_codes` (encrypted array)
- `auth_provider`, `external_id` (NULL Phase 1, dùng Phase 2 SSO)
- `failed_login_attempts`, `locked_until`
- `last_login_at`

Tables auth bổ sung:
- `refresh_tokens` (hash, family lineage, revocation)
- `password_reset_tokens`
- `invitation_tokens`
- Audit events write vào `audit_logs` (cross-module qua F8-03)

### E-2.5: Stack NestJS auth (theo ADR-002)
**Nguồn**: `documents/architecture/05-backend-architecture.md` §5.1; backend/package.json
**Nội dung**: Stack đã có sẵn trong dependencies (verify qua codebase scan):
- `@nestjs/passport@10` — strategy abstraction
- `passport@0.7`, `passport-jwt@4`, `passport-local@1`
- `@nestjs/jwt@10`
- `argon2@0.41` (PHC string output, time/memory tunable)
- `class-validator` + `class-transformer`

**Deps thiếu** cần add cho F8-auth đầy đủ:
- `cookie-parser` (Express cookie middleware)
- `otplib` (TOTP standard library, well-maintained, RFC 6238 compliant)
- `qrcode` (QR code generation cho TOTP enrollment)
- `@nestjs/throttler` (rate limiting cho login endpoint)

### E-2.6: Authorization tiers (3-level)
**Nguồn**: `documents/architecture/06-security-architecture.md` §4.1; `domain-knowledge.md` §7.3
**Nội dung**:
1. **Role-based (RBAC)** qua decorator `@Roles('admin')` + `RolesGuard`
2. **Resource-based** qua guard `@ProjectMembership('projectId')` (query `project_members`)
3. **Folder visibility** ở query level (F3-06 `is_public_for_invited` flag — phụ thuộc Phase 2)

Cho scope F8-auth (Phase 1, chưa có projects): Tier 1 + Tier 2 framework implement. Tier 3 hook sẵn nhưng chưa active.

### E-2.7: Chiến lược Cookie + CSRF
**Nguồn**: `documents/architecture/06-security-architecture.md` §7.3-7.4; `domain-knowledge.md` §7.3
**Nội dung**:
- Cả access + refresh tokens trong HttpOnly Secure SameSite=Lax cookies
- Prefix `__Host-` cho cookies (browser enforce Secure + path=/)
- CSRF: SameSite=Lax đủ cho Phase 1; revisit Phase 2 nếu cần cross-site embed
- CORS config: chỉ allow origin `https://app.shikou-kanri.example` (domain FE deploy)

### E-2.8: Tích hợp logging + audit (note dependency F8-03)
**Nguồn**: `architect/catalogs/module-catalog.md` (audit module spec)
**Nội dung**: 
- `auth` module emit events vào `audit` module mỗi auth action
- F8-03 audit module là **feature riêng** (branch tiếp theo sau f8-auth)
- Cho F8-auth: integrate stub `AuditService` (write logs nhưng full feature ở F8-03)
- Events: login_success, login_failure, logout, password_change, role_change, account_lock, 2fa_enroll, 2fa_disable, invitation_create

### E-2.9: Baseline performance (theo doc §4.1)
**Nguồn**: doc §4.1 + `domain-knowledge.md` §6
**Nội dung**:
- 50 concurrent users peak → ~10 logins/min sustained, ~50/min peak
- Login latency target: <500ms p95 (argon2 hash ~150ms dominant)
- Token validation: <10ms p95 (HS256 ~0.1ms; cached trong request lifetime)
- Refresh: <50ms p95 (1 DB lookup + sign mới)

### E-2.10: Integration points Frontend
**Nguồn**: `documents/architecture/03-frontend-architecture.md`
**Nội dung**:
- Routes cần: `/login`, `/forgot-password`, `/reset-password?token=`, `/set-password?invite_token=`, `/settings/profile`, `/settings/2fa`, `/users` (admin), `/users/:id` (admin)
- Global state: `authStore` (Zustand) — current user, role, expiry
- Axios interceptor: auto-attach token (qua cookie, không header thủ công), handle 401 → redirect login
- Route guards: `<AuthGuard>`, `<RoleGuard role="...">`

---

## Phần 3: Tham chiếu implement [SCOPE:DD]

### E-3.1: Tham số Argon2 (production-grade)
**Nguồn**: OWASP Password Storage Cheat Sheet 2025; NIST SP 800-63B
**Nội dung**: Argon2id params đề xuất 2025:
- type: argon2id (chống cả side-channel + GPU attacks)
- memoryCost: 65536 (64 MB)
- timeCost: 3 (iterations)
- parallelism: 4 (threads)
- hashLength: 32 (256 bits)
- saltLength: 16 (128 bits, automatic per-password)

Hash result: PHC string format, ~150ms compute trên CPU hiện đại.

**Code reference**:
```typescript
import * as argon2 from 'argon2';
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});
const ok = await argon2.verify(hash, password);
```

### E-3.2: Pattern implement TOTP
**Nguồn**: RFC 6238; documentation `otplib`
**Nội dung**:
```typescript
import { authenticator } from 'otplib';

// Setup phase (enrollment)
const secret = authenticator.generateSecret();  // base32, 32 chars
const otpauth = authenticator.keyuri(user.email, 'Shikou-Kanri', secret);
// otpauth: otpauth://totp/Shikou-Kanri:user@example.com?secret=XXXX&issuer=Shikou-Kanri
// Hiển thị dưới dạng QR code → user scan vào authenticator app

// Verify phase (login challenge)
const isValid = authenticator.verify({ token: userCode, secret });
// authenticator.options = { window: 1 } cho phép ±30s drift tolerance
```

**Library chính**: `otplib` (https://github.com/yeojz/otplib) — well-maintained, RFC 6238 compliant.

### E-3.3: NestJS Passport JWT strategy (boilerplate)
**Nguồn**: NestJS official docs (https://docs.nestjs.com/security/authentication)
**Nội dung**:
```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.['__Host-access_token'],
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // payload.sub = user id, .role, .jti, .iat, .exp
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### E-3.4: Pattern refresh token rotation (chuẩn ngành)
**Nguồn**: Auth0 best practices; OWASP Session Management Cheat Sheet
**Nội dung**:
```
1. Issue: { access_token, refresh_token, family_id, lineage_seq=0 }
2. Client dùng access đến khi 401
3. POST /auth/refresh với refresh_token
4. Server validate:
   a. Lookup refresh by token_hash
   b. Nếu revoked → REUSE DETECTED → revoke toàn bộ family (defense)
   c. Nếu valid → mark refresh hiện tại revoked
                 cấp pair mới { access, refresh } với cùng family_id, lineage+1
                 return pair mới
5. Lặp
```

**DB design** (theo E-2.4): bảng `refresh_tokens` với `family_id` cho lineage tracking.

### E-3.5: Cookie config (Express + NestJS)
**Nguồn**: MDN Web Docs Cookies; OWASP Session Management
**Nội dung**:
```typescript
// main.ts
import cookieParser from 'cookie-parser';
app.use(cookieParser());
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,  // bắt buộc cho cookies
});

// Ví dụ cấp cookie
res.cookie('__Host-access_token', token, {
  httpOnly: true,
  secure: true,         // bắt buộc HTTPS — local dev dùng SameSite=Lax + insecure dev cookie
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 60 * 1000, // 30min
});
```

Note: prefix `__Host-` yêu cầu `Secure` + `Path=/` + không Domain. Browser enforce. Cookie type mạnh nhất.

### E-3.6: Rate limiting (login endpoint)
**Nguồn**: docs `@nestjs/throttler`; OWASP Brute Force Cheat Sheet
**Nội dung**:
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// app.module.ts
ThrottlerModule.forRoot([{
  name: 'short', ttl: 1000, limit: 3, // 3 req/sec global
}, {
  name: 'medium', ttl: 60000, limit: 50, // 50 req/min global
}]),

// Login-specific decorator
@Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts / 15min
@Post('login')
async login(...) { }
```

Kết hợp với account-level lockout để defense in depth.

### E-3.7: Pattern ngăn email enumeration
**Nguồn**: OWASP Authentication Cheat Sheet
**Nội dung**:
- Login error: "Email hoặc password không đúng" (cùng message cho email không tồn tại VÀ sai password)
- Password reset: luôn return 200 "Nếu email đã đăng ký, link đã được gửi"
- Registration: không applicable (invite-only system)
- Cùng response time: pad với random sleep nếu cần (Phase 2 nếu attacker đo timing)

### E-3.8: State management auth Frontend
**Nguồn**: Patterns TanStack Query + Zustand; `documents/architecture/03-frontend-architecture.md` §4
**Nội dung**:
```typescript
// authStore.ts (Zustand)
interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email, password) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// useAuth() hook → typed access vào authStore
// <AuthGuard> wrap protected routes; redirect /login nếu !user
// Axios interceptor:
//   request: nothing (cookie tự gửi với `withCredentials: true`)
//   response: khi 401 → try refresh 1 lần → nếu fail → logout + redirect
```

### E-3.9: Migration script cho admin đầu tiên (bootstrap)
**Nguồn**: Pattern ngành — NestJS CLI commands; bootstrap seed
**Nội dung**: Cần cách tạo first admin user (vấn đề chicken-and-egg):
```typescript
// CLI command: npx nest start --command bootstrap:create-admin -- --email=admin@example.com
class BootstrapCommand {
  async createAdmin(email: string, name: string) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new Error('User đã tồn tại');
    
    const tempPassword = randomString(16);
    const hash = await argon2.hash(tempPassword, { ... });
    await this.users.create({
      email, name, role: 'system_admin', status: 'active',
      password_hash: hash,
    });
    console.log(`Admin đã tạo. Temporary password: ${tempPassword}`);
    console.log('User BẮT BUỘC đổi password ở lần login đầu. 2FA enrollment cũng required.');
  }
}
```

### E-3.10: Chiến lược testing
**Nguồn**: NestJS testing docs; pattern Jest
**Nội dung**:
- **Unit**: `password.service.spec.ts`, `token.service.spec.ts`, `totp.service.spec.ts` — pure logic
- **Integration**: `auth.controller.spec.ts` — với test DB, real argon2
- **E2E**: `auth.e2e-spec.ts` — full login flow với supertest

Coverage target: 85%+ cho auth/* (module security-critical).

### E-3.11: Reference open-source tương đương
**Nguồn**: GitHub OSS projects (training data)
**Nội dung**:
- **NestJS Auth tutorial**: https://docs.nestjs.com/security/authentication (official)
- **Strapi** (Node CMS): full auth gồm roles + invitations — reference cho invite flow
- **Supabase Auth**: row-level-security patterns — reference cho project-level ACL
- **Auth0**: best-in-class refresh token rotation behavior

---

## Tóm tắt validation

| Section | Số evidence | Min required | Status |
|---|---|---|---|
| [SCOPE:SRS] | 6 (E-1.1 → E-1.6) | 2 | ✅ Pass |
| [SCOPE:BD] | 10 (E-2.1 → E-2.10) | 2 | ✅ Pass |
| [SCOPE:DD] | 11 (E-3.1 → E-3.11) | 2 | ✅ Pass |

**Tổng**: 27 evidence pieces qua 3 scopes. Tất cả có nguồn citation (không có claim không nguồn).

---

## Câu hỏi mở cho phase /innovate

Cần quyết trong `/innovate` trước khi `/design --srs`:

1. **JWT algorithm**: HS256 (đơn giản, 1 shared secret) vs RS256 (asymmetric, phức tạp hơn nhưng sẵn sàng service split tương lai)
   - Đề xuất: HS256 cho Phase 1 (single monolith)

2. **Email verification khi register**: Required cho invited users (current invite flow) hay assumed verified qua invitation token (không cần step verify riêng)?
   - Đề xuất: Email implicit verified qua việc nhận + click invitation token

3. **Cookie "Remember this device" cho 2FA**: Skip 2FA cho 30 days trên trusted device cookie. UX win vs security risk.
   - Đề xuất: Add (Phase 2). Phase 1 skip cho đơn giản.

4. **Concurrent sessions**: Cho phép multi-device login (hiện tại: yes), max # active refresh tokens?
   - Đề xuất: 5 active refresh tokens, oldest auto-revoked

5. **Password change frequency policy**: Force change mỗi N days?
   - Đề xuất: No forced rotation (NIST SP 800-63B updated guidance — rotation chỉ khi nghi compromise)

6. **Initial admin bootstrap**: CLI command vs setup wizard vs seed?
   - Đề xuất: CLI command (E-3.9). Document trong README.

7. **Session timeout warning**: Notify user 1-2min trước idle timeout để refresh?
   - Đề xuất: Phase 2 enhancement. Phase 1: silent timeout, user re-login.

8. **Test users cho dev**: Seed sample users (admin, manager, employee) cho dev env?
   - Đề xuất: Add Prisma seed script chỉ cho dev (không staging/prod).

---

## Trạng thái

- Phase 1: Domain KB ✅ (domain-knowledge.md saved)
- Phase 2: Codebase scan ✅ (skeleton trống, deps phần lớn sẵn sàng, cần add 4 deps)
- Phase 3: External refs ✅ (27 evidence pieces với citations)

Tiếp: `/innovate` để decide 8 câu hỏi mở trên + finalize architecture cho SRS/BD/DD.
