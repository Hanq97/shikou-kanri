# 認証 & 権限管理 — API Contracts

## Document Information

- **Feature ID**: F8-AUTH
- **Tên feature**: 認証 & 権限管理 (Authentication & Authorization)
- **Phiên bản**: 1.0.0
- **Tác giả**: DEHA Solutions (Hanq97)
- **Ngày tạo**: 2026-05-16
- **API Version**: v1
- **Base URL**: `/api/v1`
- **Refs**: [SRS](./F8-AUTH-BASE-srs.md) | [Basic Design](./F8-AUTH-BASE-basic-design.md) | [FDD](./F8-AUTH-BASE-frontend-detail-design.md) | [BDD](./F8-AUTH-BASE-backend-detail-design.md)

---

## 01 — Conventions / Quy ước chung

### 1.1 URL Convention
- Base URL: `/api/v1`
- Resource paths plural lowercase: `/users`, `/auth/sessions`
- Sub-resources nested: `/users/{id}/sessions`
- Action endpoints với prefix verb: `/auth/login`, `/auth/refresh`, `/auth/2fa/enroll`

### 1.2 HTTP Methods
| Method | Usage |
|---|---|
| GET | Read resource(s) |
| POST | Create resource OR trigger action |
| PUT | Replace resource (full update) |
| PATCH | Partial update |
| DELETE | Remove resource |

### 1.3 Authentication
Mọi endpoint authenticated dùng JWT trong HttpOnly cookie. Cookie name:
- Production: `__Host-access_token` + `__Host-refresh_token`
- Dev: `access_token` + `refresh_token`

Public endpoints (không cần auth): login, refresh, password-reset-request, password-reset, invitation accept/verify.

### 1.4 Common Response Headers

| Header | Description |
|---|---|
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Trace-Id` | Request trace ID cho debugging |
| `Set-Cookie` | Set khi cấp/refresh/clear tokens |

### 1.5 Standard Error Response

```json
{
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "メールアドレスまたはパスワードが正しくありません",
  "traceId": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
  "details": {}
}
```

### 1.6 Error Code Catalog

| Code | HTTP | Meaning |
|---|---|---|
| AUTH_INVALID_CREDENTIALS | 401 | Sai email hoặc password |
| AUTH_2FA_REQUIRED | 401 | Cần 2FA challenge |
| AUTH_2FA_INVALID | 401 | Sai TOTP/backup code |
| AUTH_TOKEN_EXPIRED | 401 | JWT expired |
| AUTH_TOKEN_INVALID | 401 | JWT malformed/invalid |
| AUTH_REFRESH_INVALID | 401 | Refresh bad/revoked |
| AUTH_REFRESH_REUSE_DETECTED | 401 | Reuse → family revoked |
| AUTH_INSUFFICIENT_PERMISSION | 403 | Role không đủ |
| AUTH_ACCOUNT_SUSPENDED | 403 | User bị suspend/disable |
| AUTH_ACCOUNT_LOCKED | 423 | Quá failures |
| AUTH_2FA_ENROLLMENT_REQUIRED | 403 | Admin phải enroll 2FA |
| AUTH_FORCE_PASSWORD_CHANGE | 403 | Phải đổi pw trước |
| AUTH_INVITATION_EXPIRED | 410 | Invite token expired |
| AUTH_INVITATION_USED | 410 | Invite đã accepted |
| AUTH_INVITATION_INVALID | 404 | Invite không tìm thấy |
| AUTH_PASSWORD_RESET_EXPIRED | 410 | Reset token expired |
| AUTH_PASSWORD_RESET_INVALID | 404 | Reset token không tìm thấy |
| AUTH_PASSWORD_WEAK | 400 | Vi phạm policy |
| AUTH_USER_EXISTS | 409 | Email đã có |
| AUTH_LAST_ADMIN | 409 | Last admin protection |
| AUTH_RATE_LIMITED | 429 | Too many requests |
| VALIDATION_ERROR | 400 | Generic validation failed |
| NOT_FOUND | 404 | Resource không có |
| INTERNAL_ERROR | 500 | Server-side unexpected |

### 1.7 Common Type Definitions

```typescript
// Shared types (TypeScript notation cho clarity, không phải implementation)

type UserRole = 'system_admin' | 'manager' | 'employee' | 'invited';

type UserStatus = 'pending_invite' | 'active' | 'suspended' | 'disabled';

type AuthProvider = 'local' | 'google' | 'microsoft';

interface AuthUser {
  id: string;                     // UUID
  email: string;
  name: string;
  nameKana?: string;
  role: UserRole;
  status: UserStatus;
  twoFaEnabled: boolean;
  forcePasswordChange: boolean;
  requires2faEnrollment: boolean;
  lastLoginAt?: string;           // ISO 8601
  createdAt: string;
}

interface User extends AuthUser {
  emailVerified: boolean;
  authProvider: AuthProvider;
  externalId?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;           // ISO 8601, nullable
  updatedAt: string;
  deletedAt?: string;
}

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  issuedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## 02 — Authentication APIs

### 2.1 POST /auth/login

**Mô tả**: User login với email + password. Trả về tokens nếu không cần 2FA, hoặc intermediate token nếu cần 2FA challenge.

**Authentication**: Public
**Rate limit**: 5/15min per (IP + email)

#### Request

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password1!"
}
```

#### Request Body Schema

| Field | Type | Required | Validation |
|---|---|---|---|
| email | string | yes | RFC 5322 email format, max 255 chars |
| password | string | yes | Min 1 char (real policy validated server-side at registration) |

#### Success Response (200) — No 2FA Required

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=eyJ...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800
Set-Cookie: __Host-refresh_token=eyJ...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
Content-Type: application/json

{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "山田太郎",
    "nameKana": "ヤマダタロウ",
    "role": "employee",
    "status": "active",
    "twoFaEnabled": false,
    "forcePasswordChange": false,
    "requires2faEnrollment": false,
    "lastLoginAt": "2026-05-16T08:30:00+09:00",
    "createdAt": "2026-04-01T10:00:00+09:00"
  },
  "requires2fa": false
}
```

#### Success Response (200) — 2FA Required

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "requires2fa": true,
  "intermediateToken": "eyJhbGciOiJIUzI1NiIs...",  // 5-min lifetime, signed
  "expiresIn": 300
}
```

#### Error Responses

```http
HTTP/1.1 401 Unauthorized
{
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "メールアドレスまたはパスワードが正しくありません",
  "traceId": "..."
}
```

```http
HTTP/1.1 423 Locked
{
  "code": "AUTH_ACCOUNT_LOCKED",
  "message": "アカウントがロックされました。15分後に再試行してください。",
  "traceId": "...",
  "details": {
    "unlockAt": "2026-05-16T08:45:00+09:00"
  }
}
```

```http
HTTP/1.1 403 Forbidden
{
  "code": "AUTH_ACCOUNT_SUSPENDED",
  "message": "アカウントが停止されています。",
  "traceId": "..."
}
```

```http
HTTP/1.1 429 Too Many Requests
{
  "code": "AUTH_RATE_LIMITED",
  "message": "操作が多すぎます。後でお試しください。",
  "traceId": "..."
}
```

---

### 2.2 POST /auth/2fa/verify

**Mô tả**: Submit TOTP code (hoặc backup code) sau khi login password OK và 2FA required.

**Authentication**: Intermediate token (in Authorization header hoặc cookie tạm thời)
**Rate limit**: 5/5min per intermediate token

#### Request

```http
POST /api/v1/auth/2fa/verify
Content-Type: application/json
Authorization: Bearer <intermediateToken>

{
  "code": "123456",
  "useBackupCode": false
}
```

#### Request Body Schema

| Field | Type | Required | Validation |
|---|---|---|---|
| code | string | yes | 6 digits (TOTP) hoặc 10 alphanumeric (backup) |
| useBackupCode | boolean | yes | true = backup code, false = TOTP |

#### Success Response (200)

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800
Set-Cookie: __Host-refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800

{
  "user": { /* AuthUser */ }
}
```

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_2FA_INVALID | 401 | Sai TOTP/backup code |
| AUTH_TOKEN_EXPIRED | 401 | Intermediate token >5min expired |
| AUTH_TOKEN_INVALID | 401 | Intermediate token invalid |

---

### 2.3 POST /auth/refresh

**Mô tả**: Rotate access + refresh tokens. Refresh token gửi qua cookie.

**Authentication**: Refresh token cookie required
**Rate limit**: 60/min per user (generous, FE auto-retry)

#### Request

```http
POST /api/v1/auth/refresh
Cookie: __Host-refresh_token=eyJ...
```

(No request body)

#### Success Response (200)

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=NEW...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800
Set-Cookie: __Host-refresh_token=NEW...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800

{
  "success": true
}
```

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_REFRESH_INVALID | 401 | Token không tồn tại / không hợp lệ |
| AUTH_REFRESH_REUSE_DETECTED | 401 | Token đã revoke → revoke family |
| AUTH_TOKEN_EXPIRED | 401 | Token >7d expired |

---

### 2.4 POST /auth/logout

**Mô tả**: Revoke current refresh token + clear cookies.

**Authentication**: Required

#### Request

```http
POST /api/v1/auth/logout
Cookie: __Host-access_token=...; __Host-refresh_token=...
```

#### Success Response (204)

```http
HTTP/1.1 204 No Content
Set-Cookie: __Host-access_token=; Max-Age=0; ...
Set-Cookie: __Host-refresh_token=; Max-Age=0; ...
```

---

### 2.5 POST /auth/logout-all

**Mô tả**: Revoke tất cả refresh tokens của user (logout khỏi mọi thiết bị).

**Authentication**: Required

#### Request

```http
POST /api/v1/auth/logout-all
Cookie: __Host-access_token=...
```

#### Success Response (200)

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=; Max-Age=0; ...
Set-Cookie: __Host-refresh_token=; Max-Age=0; ...

{
  "success": true,
  "revokedCount": 3
}
```

---

### 2.6 GET /auth/me

**Mô tả**: Lấy thông tin user hiện tại.

**Authentication**: Required

#### Request

```http
GET /api/v1/auth/me
Cookie: __Host-access_token=...
```

#### Success Response (200)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user": {
    "id": "550e8400-...",
    "email": "user@example.com",
    "name": "山田太郎",
    "nameKana": "ヤマダタロウ",
    "role": "employee",
    "status": "active",
    "twoFaEnabled": true,
    "forcePasswordChange": false,
    "requires2faEnrollment": false,
    "lastLoginAt": "2026-05-16T08:30:00+09:00",
    "createdAt": "2026-04-01T10:00:00+09:00"
  }
}
```

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_TOKEN_EXPIRED | 401 | Access token expired |
| AUTH_TOKEN_INVALID | 401 | Token invalid |

---

### 2.7 POST /auth/password/reset-request

**Mô tả**: Yêu cầu reset password. LUÔN return 200 (no enumeration).

**Authentication**: Public
**Rate limit**: 3/h per email

#### Request

```http
POST /api/v1/auth/password/reset-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "success": true,
  "message": "登録されたメールアドレスの場合、パスワードリセットリンクをお送りしました。"
}
```

(Same response cho email tồn tại hay không.)

---

### 2.8 POST /auth/password/reset

**Mô tả**: Thực hiện reset password với token từ email.

**Authentication**: Public (token-based)

#### Request

```http
POST /api/v1/auth/password/reset
Content-Type: application/json

{
  "token": "abc123...",
  "newPassword": "NewPassword1!"
}
```

#### Request Body Schema

| Field | Type | Required | Validation |
|---|---|---|---|
| token | string | yes | Signed reset token |
| newPassword | string | yes | Min 12 chars + 4 complexity rules |

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "success": true,
  "message": "パスワードを変更しました。再度ログインしてください。"
}
```

#### Error Responses

| Code | HTTP |
|---|---|
| AUTH_PASSWORD_RESET_EXPIRED | 410 |
| AUTH_PASSWORD_RESET_INVALID | 404 |
| AUTH_PASSWORD_WEAK | 400 |

---

### 2.9 POST /auth/password/change

**Mô tả**: User đã login đổi password (cần old password + new password).

**Authentication**: Required
**Rate limit**: 5/h per user

#### Request

```http
POST /api/v1/auth/password/change
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "oldPassword": "OldPassword1!",
  "newPassword": "NewPassword2!"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=NEW...; ...
Set-Cookie: __Host-refresh_token=NEW...; ...

{
  "success": true,
  "message": "パスワードを変更しました。"
}
```

Side effects:
- Tất cả refresh tokens KHÁC của user revoke (giữ session hiện tại)
- Force flags clear nếu có
- Email security alert gửi user

#### Error Responses

| Code | HTTP |
|---|---|
| AUTH_INVALID_CREDENTIALS | 401 (old password sai) |
| AUTH_PASSWORD_WEAK | 400 (new password vi phạm policy) |

---

### 2.10 POST /auth/2fa/enroll

**Mô tả**: Bắt đầu 2FA enrollment, generate secret + QR.

**Authentication**: Required

#### Request

```http
POST /api/v1/auth/2fa/enroll
Cookie: __Host-access_token=...
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauthUri": "otpauth://totp/Shikou-Kanri:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Shikou-Kanri",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Notes**:
- Secret stored temporarily (10 min)
- Not yet enabled; user must verify với code đầu tiên

---

### 2.11 POST /auth/2fa/enroll/verify

**Mô tả**: Verify TOTP code đầu tiên để complete enrollment.

**Authentication**: Required

#### Request

```http
POST /api/v1/auth/2fa/enroll/verify
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "code": "123456"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "success": true,
  "backupCodes": [
    "A1B2C3D4E5",
    "F6G7H8I9J0",
    "K1L2M3N4O5",
    "P6Q7R8S9T0",
    "U1V2W3X4Y5",
    "Z6A7B8C9D0",
    "E1F2G3H4I5",
    "J6K7L8M9N0",
    "O1P2Q3R4S5",
    "T6U7V8W9X0"
  ],
  "message": "2要素認証が有効になりました。バックアップコードを安全に保管してください。"
}
```

**IMPORTANT**: Backup codes chỉ hiển thị 1 lần. User MUST save (download/print).

---

### 2.12 POST /auth/2fa/disable

**Mô tả**: User-initiated 2FA disable. Cần password + TOTP (hoặc backup code).

**Authentication**: Required

#### Request

```http
POST /api/v1/auth/2fa/disable
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "password": "Password1!",
  "code": "123456",
  "useBackupCode": false
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "success": true,
  "message": "2要素認証が無効になりました。"
}
```

Side effects:
- Email security alert gửi user
- Audit log

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_INVALID_CREDENTIALS | 401 | Sai password |
| AUTH_2FA_INVALID | 401 | Sai TOTP/backup |
| AUTH_INSUFFICIENT_PERMISSION | 403 | Admin role không được self-disable |

---

### 2.13 GET /auth/invitations/{token}

**Mô tả**: Verify invitation token, get metadata để hiển thị accept screen.

**Authentication**: Public (token-based)

#### Request

```http
GET /api/v1/auth/invitations/abc123...
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "valid": true,
  "email": "newuser@example.com",
  "role": "employee",
  "inviterName": "山田管理者",
  "expiresAt": "2026-05-17T08:30:00+09:00"
}
```

#### Error Responses

| Code | HTTP |
|---|---|
| AUTH_INVITATION_INVALID | 404 |
| AUTH_INVITATION_EXPIRED | 410 |
| AUTH_INVITATION_USED | 410 |

---

### 2.14 POST /auth/invitations/accept

**Mô tả**: Accept invitation + set password + auto-login.

**Authentication**: Public (token-based)

#### Request

```http
POST /api/v1/auth/invitations/accept
Content-Type: application/json

{
  "token": "abc123...",
  "password": "NewPassword1!"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=...; ...
Set-Cookie: __Host-refresh_token=...; ...

{
  "user": { /* AuthUser */ },
  "message": "アカウントが有効化されました。"
}
```

#### Error Responses

| Code | HTTP |
|---|---|
| AUTH_INVITATION_INVALID | 404 |
| AUTH_INVITATION_EXPIRED | 410 |
| AUTH_INVITATION_USED | 410 |
| AUTH_PASSWORD_WEAK | 400 |

---

### 2.15 POST /auth/2fa/backup-code

**Mô tả**: Use backup code during 2FA challenge (alternative to TOTP).

**Authentication**: Intermediate token

#### Request

```http
POST /api/v1/auth/2fa/backup-code
Content-Type: application/json
Authorization: Bearer <intermediateToken>

{
  "code": "A1B2C3D4E5"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access_token=...; ...
Set-Cookie: __Host-refresh_token=...; ...

{
  "user": { /* AuthUser */ },
  "remainingBackupCodes": 9
}
```

(Email security alert sent.)

---

## 03 — User Management APIs

### 3.1 GET /users

**Mô tả**: List users với filter + pagination.

**Authentication**: Required
**Roles**: system_admin, manager (limited fields)

#### Request

```http
GET /api/v1/users?page=1&pageSize=50&search=yamada&role=employee&status=active&sortBy=createdAt&sortOrder=desc
Cookie: __Host-access_token=...
```

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| page | number | 1 | Page (1-indexed) |
| pageSize | number | 50 | Max 100 |
| search | string | (empty) | Search name/email (fuzzy) |
| role | UserRole | (any) | Filter by role |
| status | UserStatus | (any) | Filter by status |
| sortBy | enum | createdAt | createdAt / lastLoginAt / name |
| sortOrder | enum | desc | asc / desc |

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "data": [
    {
      "id": "550e8400-...",
      "email": "user1@example.com",
      "name": "山田太郎",
      "nameKana": "ヤマダタロウ",
      "role": "employee",
      "status": "active",
      "twoFaEnabled": true,
      "lastLoginAt": "2026-05-16T08:30:00+09:00",
      "createdAt": "2026-04-01T10:00:00+09:00"
    }
  ],
  "total": 27,
  "page": 1,
  "pageSize": 50
}
```

---

### 3.2 GET /users/{id}

**Mô tả**: Chi tiết user.

**Authentication**: Required
**Roles**: system_admin (any user), manager (limited fields), self (own profile)

#### Request

```http
GET /api/v1/users/550e8400-...
Cookie: __Host-access_token=...
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "user": { /* full User object */ }
}
```

(Sensitive fields như `passwordHash`, `2faSecret`, `2faRecoveryCodes` KHÔNG bao giờ trong response.)

#### Error Responses

| Code | HTTP |
|---|---|
| NOT_FOUND | 404 |
| AUTH_INSUFFICIENT_PERMISSION | 403 |

---

### 3.3 POST /users/invitations

**Mô tả**: Gửi invitation email.

**Authentication**: Required
**Roles**: system_admin (any role), manager (manager/employee/invited only — NOT admin)
**Rate limit**: 20/hr per user

#### Request

```http
POST /api/v1/users/invitations
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "email": "newuser@example.com",
  "role": "employee",
  "name": "新田花子"
}
```

#### Success Response (201)

```http
HTTP/1.1 201 Created

{
  "invitation": {
    "id": "660e8400-...",
    "email": "newuser@example.com",
    "role": "employee",
    "expiresAt": "2026-05-17T08:30:00+09:00",
    "createdAt": "2026-05-16T08:30:00+09:00"
  },
  "message": "招待メールを送信しました。"
}
```

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_USER_EXISTS | 409 | Email đã có user |
| AUTH_INSUFFICIENT_PERMISSION | 403 | Manager invite admin |
| VALIDATION_ERROR | 400 | Email invalid |

---

### 3.4 DELETE /users/invitations/{id}

**Mô tả**: Cancel pending invitation.

**Authentication**: Required
**Roles**: system_admin, manager (own invites only)

#### Request

```http
DELETE /api/v1/users/invitations/660e8400-...
Cookie: __Host-access_token=...
```

#### Success Response (204)

```http
HTTP/1.1 204 No Content
```

---

### 3.5 PUT /users/{id}/role

**Mô tả**: Đổi role của user.

**Authentication**: Required
**Roles**: system_admin only

#### Request

```http
PUT /api/v1/users/550e8400-.../role
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "role": "manager"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "user": { /* updated User */ }
}
```

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_INSUFFICIENT_PERMISSION | 403 |
| AUTH_LAST_ADMIN | 409 | Last admin protection |
| NOT_FOUND | 404 |

---

### 3.6 PUT /users/{id}/status

**Mô tả**: Đổi status (suspend / activate / disable).

**Authentication**: Required
**Roles**: system_admin only

#### Request

```http
PUT /api/v1/users/550e8400-.../status
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "status": "suspended"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "user": { /* updated User */ }
}
```

Side effect: Tất cả refresh tokens của user revoke nếu status != 'active'.

---

### 3.7 PUT /users/{id}/profile

**Mô tả**: Update profile (name, nameKana).

**Authentication**: Required
**Roles**: system_admin (any user), self (own profile)

#### Request

```http
PUT /api/v1/users/550e8400-.../profile
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "name": "山田太郎 (updated)",
  "nameKana": "ヤマダタロウ"
}
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "user": { /* updated */ }
}
```

---

### 3.8 POST /users/{id}/unlock

**Mô tả**: Manual unlock account sau Layer 2 lockout.

**Authentication**: Required
**Roles**: system_admin only

#### Request

```http
POST /api/v1/users/550e8400-.../unlock
Cookie: __Host-access_token=...
```

(No request body)

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "success": true,
  "user": { /* updated User (failed_login_attempts reset, locked_until null) */ }
}
```

---

### 3.9 POST /users/{id}/2fa/disable

**Mô tả**: Admin emergency disable 2FA cho user khác (out-of-band recovery).

**Authentication**: Required
**Roles**: system_admin only (KHÔNG self — admin phải dùng self-disable flow)

#### Request

```http
POST /api/v1/users/550e8400-.../2fa/disable
Content-Type: application/json
Cookie: __Host-access_token=...

{
  "reason": "User mất authenticator device và hết backup codes"
}
```

#### Request Body Schema

| Field | Type | Required | Validation |
|---|---|---|---|
| reason | string | yes | Min 10 chars, max 500 |

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "success": true,
  "user": { /* updated User (2fa_enabled=false) */ }
}
```

Side effects:
- User's `force_two_fa_enrollment` set lại true nếu role admin
- Email security alert gửi user
- Audit log với reason

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| AUTH_INSUFFICIENT_PERMISSION | 403 | Self-disable không phép |

---

### 3.10 DELETE /users/{id}

**Mô tả**: Soft-delete user.

**Authentication**: Required
**Roles**: system_admin only

#### Request

```http
DELETE /api/v1/users/550e8400-...
Cookie: __Host-access_token=...
```

#### Success Response (204)

```http
HTTP/1.1 204 No Content
```

Side effects:
- `deleted_at` set
- Tất cả refresh tokens revoke
- User không login được nữa
- Email KHÔNG được reuse (cho đến khi hard-delete sau N years)

#### Error Responses

| Code | HTTP |
|---|---|
| AUTH_LAST_ADMIN | 409 |

---

## 04 — Sessions Management APIs (Phase 1, supporting)

### 4.1 GET /auth/sessions

**Mô tả**: List active sessions (refresh tokens) của user.

**Authentication**: Required (self only)

#### Request

```http
GET /api/v1/auth/sessions
Cookie: __Host-access_token=...
```

#### Success Response (200)

```http
HTTP/1.1 200 OK

{
  "sessions": [
    {
      "id": "770e8400-...",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/...",
      "ipAddress": "203.0.113.42",
      "issuedAt": "2026-05-16T08:30:00+09:00",
      "expiresAt": "2026-05-23T08:30:00+09:00",
      "isCurrent": true
    },
    {
      "id": "880e8400-...",
      "userAgent": "Mozilla/5.0 (iPhone...) Safari/...",
      "ipAddress": "198.51.100.10",
      "issuedAt": "2026-05-14T15:00:00+09:00",
      "expiresAt": "2026-05-21T15:00:00+09:00",
      "isCurrent": false
    }
  ]
}
```

---

### 4.2 DELETE /auth/sessions/{id}

**Mô tả**: Revoke specific session.

**Authentication**: Required (self only)

#### Request

```http
DELETE /api/v1/auth/sessions/880e8400-...
Cookie: __Host-access_token=...
```

#### Success Response (204)

```http
HTTP/1.1 204 No Content
```

#### Error Responses

| Code | HTTP | Reason |
|---|---|---|
| NOT_FOUND | 404 | Session không tồn tại hoặc không thuộc user |
| VALIDATION_ERROR | 400 | Revoke current session — yêu cầu dùng /auth/logout |

---

## 05 — Endpoint Summary

| # | Method | Path | Auth | Roles |
|---|---|---|---|---|
| 1 | POST | /auth/login | Public | All |
| 2 | POST | /auth/2fa/verify | Intermediate | All |
| 3 | POST | /auth/2fa/backup-code | Intermediate | All |
| 4 | POST | /auth/refresh | Refresh cookie | All |
| 5 | POST | /auth/logout | Required | All |
| 6 | POST | /auth/logout-all | Required | All |
| 7 | GET | /auth/me | Required | All |
| 8 | POST | /auth/password/reset-request | Public | All |
| 9 | POST | /auth/password/reset | Token | All |
| 10 | POST | /auth/password/change | Required | All |
| 11 | POST | /auth/2fa/enroll | Required | All |
| 12 | POST | /auth/2fa/enroll/verify | Required | All |
| 13 | POST | /auth/2fa/disable | Required | All |
| 14 | GET | /auth/invitations/{token} | Public | (token-based) |
| 15 | POST | /auth/invitations/accept | Public | (token-based) |
| 16 | GET | /auth/sessions | Required | Self |
| 17 | DELETE | /auth/sessions/{id} | Required | Self |
| 18 | GET | /users | Required | admin, manager |
| 19 | GET | /users/{id} | Required | admin, self |
| 20 | POST | /users/invitations | Required | admin, manager |
| 21 | DELETE | /users/invitations/{id} | Required | admin, manager (own) |
| 22 | PUT | /users/{id}/role | Required | admin |
| 23 | PUT | /users/{id}/status | Required | admin |
| 24 | PUT | /users/{id}/profile | Required | admin, self |
| 25 | POST | /users/{id}/unlock | Required | admin |
| 26 | POST | /users/{id}/2fa/disable | Required | admin (not self) |
| 27 | DELETE | /users/{id} | Required | admin |

**Total**: 27 endpoints (15 auth + 12 users — `sessions` added 2 supporting)

---

## 06 — OpenAPI 3.0 Stub (Optional)

For tooling integration, generate OpenAPI spec from NestJS via `@nestjs/swagger`:

```yaml
openapi: 3.0.0
info:
  title: F8-AUTH API
  version: 1.0.0
  description: Authentication & Authorization APIs cho Shikou-Kanri
servers:
  - url: /api/v1
components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: __Host-access_token
    intermediateTokenAuth:
      type: http
      scheme: bearer
  schemas:
    AuthUser: { ... }    # Defined trong shared types section
    User: { ... }
    Session: { ... }
    ApiError: { ... }
paths:
  /auth/login:
    post: { ... }
  # ... other paths
```

Full OpenAPI spec sẽ auto-gen từ NestJS `@ApiOperation`, `@ApiResponse` decorators during BDD implementation phase.

---

## Summary / Tóm tắt API Contracts

| Metric | Count |
|---|---|
| Total endpoints | 27 |
| Authentication endpoints | 15 |
| User management endpoints | 10 |
| Session management endpoints | 2 |
| Error codes catalog | 23 |
| Rate-limited endpoints | 6+ |

**Auth strategy**: HttpOnly Secure cookies với refresh rotation
**Error format**: Standardized `{code, message, traceId, details}`
**i18n messages**: ja_JP responses
**Authorization tiers**: Public / Token / Required (role-based)

---

*F8-AUTH-BASE-api-contracts.md*
*API Contracts — 認証 & 権限管理*
*Generated by EPS Framework /design --detail v5.0*
*DEHA Solutions, 2026-05-16*
