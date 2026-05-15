# SRS Innovation Selection: F8-AUTH

**Feature**: F8-AUTH (F8-01 認証 + F8-02 権限管理)
**Module**: auth
**Branch**: feature/f8-auth
**Sinh ngày**: 2026-05-16
**Trạng thái**: SRS_CREATED

---

## 1. Cách tiếp cận nghiệp vụ (SRS)

### Tóm tắt cấp cao
F8-AUTH thiết lập lớp authentication + authorization làm nền tảng cho Shikou-Kanri — đây là **closed system** (không có public signup; chỉ admin mời users). Xác thực qua email + password với policy mạnh + 2FA tùy chọn (mandatory cho system administrators). Phân quyền 4-tier role-based với khung per-project ACL sẵn sàng (full project membership active khi F1 features triển khai). Session management qua short-lived JWT access tokens (30min trong HttpOnly cookies) + rotating refresh tokens (7d). System admin đầu tiên bootstrap qua CLI command khi deploy.

---

## 2. Đáp án Interview (Step 1)

| Q | Câu hỏi | Đáp án |
|---|---|---|
| Q1 | Xác nhận scope | **Confirmed**: chỉ F8-01 + F8-02. F8-03 audit + F8-04 backup ở branches khác. SSO defer Phase 2 theo ADR-015. |
| Q2 | Invitation flow + email verification | **Implicit qua invite token**: user click email link → set password → activate. Email implicit verified qua việc nhận token. |
| Q3 | Password policy + forced rotation | **Tối thiểu 12 chars + complexity, KHÔNG forced rotation** (NIST SP 800-63B 2024 guidance). Rotation chỉ khi nghi compromise. |
| Q4 | Initial admin bootstrap | **CLI command** + temp password. Admin bắt buộc đổi pw + enroll 2FA ở lần login đầu. |

---

## 3. Quyết định SRS (Step 3)

### D1: Lifecycle states của user account
**Quyết định**: 4 states cho user accounts:
- `pending_invite`: đã invited nhưng chưa accept (chưa set password)
- `active`: tài khoản bình thường có thể dùng
- `suspended`: tạm thời disabled (vd cho review)
- `disabled`: deactivated (soft-delete qua `deleted_at`)

**Chuyển trạng thái**: pending_invite → active (accept invite) → [suspended ↔ active] → disabled (terminal).

### D2: Cấu trúc role (4-tier)
**Quyết định**: 4 roles theo architecture catalogs:
| Role | JP | Năng lực (tóm tắt) |
|---|---|---|
| `system_admin` | システム管理者 | Full CRUD trên mọi thứ, manage users/roles, audit log, backup. 2FA BẮT BUỘC. |
| `manager` | 社員(マネージャー) | CRUD trên operational data, approve quotes (F2-05), invite users. 2FA tùy chọn. |
| `employee` | 社員(一般) | Read+Create+Update trên assigned operational data. Không approve, không admin. |
| `invited` | 招待ユーザー(職人・協力業者) | Read trên assigned projects, Create trên photos/messages, không admin. |

**Per-project override**: sẵn sàng qua `project_members.role_on_project` (active khi F1/F4 features land — stub support trong F8-auth).

### D3: Luồng invitation
**Quyết định**: Email verification implicit qua invite token.
1. Admin/manager submit {email, role, optional project_ids}
2. Server tạo user `pending_invite` + row `invitation_tokens` (24h expiry)
3. Gửi email với link `<APP_URL>/accept-invite?token=<token>`
4. User click → frontend load info invitation (email, role display)
5. User submit password mới (validate theo policy)
6. Server: validate token (chưa expire/used) → set password_hash → status=`active` → consume token → tự động login (cấp tokens)
7. Nếu invitation expire → admin có thể resend (token mới, cùng user record)

### D4: Policy password
**Quyết định**:
- **Độ dài**: tối thiểu 12 ký tự
- **Complexity**: phải có uppercase + lowercase + digit + symbol
- **Hashing**: argon2id (timeCost=3, memoryCost=64MB, parallelism=4)
- **Không forced rotation** (NIST 2024 deprecate time-based rotation)
- **Không history check** Phase 1 (defer; add Phase 2 nếu compliance demand)
- **Reset window**: signed token, 1h expiry, single-use, invalidate tất cả sessions hiện tại

### D5: Enforcement 2FA (theo ADR-016)
**Quyết định**:
- **Chuẩn TOTP** (RFC 6238, 6-digit, 30s window, ±1 drift tolerance)
- **Role system_admin**: 2FA **BẮT BUỘC**. Sau khi login password, nếu chưa enroll → forced enrollment flow trước khi truy cập admin functions. Logged in nhưng admin actions block.
- **Roles khác**: 2FA **tùy chọn**. User tự enroll trong `/settings/2fa`.
- **Backup codes**: 10 codes generate khi enroll, encrypted at rest (AES-256-GCM), single-use, hiển thị 1 lần
- **Disable 2FA**: cần password hiện tại + TOTP hiện tại (hoặc backup code). Admin emergency disable cho user khác (audit logged).

### D6: Session management
**Quyết định**:
- **Access token**: JWT, lifetime 30 phút (theo doc §4.3 session timeout)
- **Refresh token**: opaque random (128 bits), lifetime 7 ngày, **rotating** (mỗi refresh cấp pair mới)
- **Storage**: cả 2 trong HttpOnly Secure SameSite=Lax cookies (prefix `__Host-` khi HTTPS)
- **Tối đa 5 active refresh tokens/user** (oldest auto-revoked khi login thứ 6)
- **Refresh reuse detection**: nếu refresh đã revoked được present → revoke toàn bộ family (nghi theft)
- **Idle timeout**: implicit qua TTL 30min của access (refresh extend; full logout sau 7d nếu không dùng)

### D7: Account lockout policy
**Quyết định**: Progressive lockout:
- **Layer 1 (auto-recover)**: 5 failed login trong 15 phút → khóa account 15 phút
- **Layer 2 (manual unlock)**: 10 failed attempts trong 1 giờ → admin-only manual unlock
- **Rate limit (IP-level)**: 10 attempts/phút per IP (Phase 1 qua @nestjs/throttler)
- **Notifications**: alert tất cả admins khi layer 2 lockout trigger (email channel; defer SMS đến Phase 3)

### D8: Bootstrap admin đầu tiên
**Quyết định**: CLI command pattern.

```bash
# DEHA ops chạy 1 lần sau deployment:
npx nest start --command bootstrap:create-admin \
  --email=admin@towa-kensetsu.example.com \
  --name="管理者"
# Output: temporary password (hiển thị 1 lần)
```

Hành vi:
1. CLI verify chưa có admin nào tồn tại (idempotent)
2. Tạo user với role=`system_admin`, status=`active`, temp password đã hash
3. Mark `force_password_change=true` và `force_2fa_enrollment=true`
4. In temp password ra stdout (chỉ 1 lần; không log)
5. Tạo audit log entry

Login đầu tiên:
1. Admin login với email + temp password
2. Bắt buộc đổi password (không skip được)
3. Bắt buộc enroll 2FA (không truy cập admin functions cho đến khi enroll)
4. Backup codes hiển thị (phải download/save)
5. Bây giờ là admin đầy đủ

---

## 4. Function List (Step 4)

### 4.1 Core — Authentication APIs (15)

| FN | Endpoint | Mô tả |
|---|---|---|
| FN-01 | POST /auth/login | Xác thực email + password |
| FN-02 | POST /auth/2fa/verify | TOTP challenge sau pw success |
| FN-03 | POST /auth/refresh | Rotate access + refresh tokens |
| FN-04 | POST /auth/logout | Revoke refresh token hiện tại |
| FN-05 | POST /auth/logout-all | Revoke tất cả tokens của user |
| FN-06 | GET /auth/me | Thông tin user hiện tại |
| FN-07 | POST /auth/password/reset-request | Gửi reset email (luôn return 200) |
| FN-08 | POST /auth/password/reset | Reset với signed token |
| FN-09 | POST /auth/password/change | Đổi pw (authenticated, cần old+new) |
| FN-10 | POST /auth/2fa/enroll | Bắt đầu 2FA enrollment (return QR + secret) |
| FN-11 | POST /auth/2fa/enroll/verify | Confirm enrollment với TOTP code đầu |
| FN-12 | POST /auth/2fa/disable | Disable 2FA (cần pw + TOTP) |
| FN-13 | GET /auth/invitations/:token | Verify invite token, get email/role |
| FN-14 | POST /auth/invitations/accept | Accept invite, set password, auto-login |
| FN-15 | POST /auth/2fa/backup-code | Dùng backup code khi login |

### 4.2 Core — User Management APIs (10)

| FN | Endpoint | Mô tả |
|---|---|---|
| FN-16 | GET /users | Paginated user list với filter |
| FN-17 | GET /users/:id | Chi tiết user |
| FN-18 | POST /users/invitations | Gửi invitation email |
| FN-19 | DELETE /users/invitations/:id | Cancel pending invite |
| FN-20 | PUT /users/:id/role | Đổi role user |
| FN-21 | PUT /users/:id/status | Suspend/disable user |
| FN-22 | PUT /users/:id/profile | Update profile |
| FN-23 | POST /users/:id/unlock | Manual unlock sau lockout |
| FN-24 | POST /users/:id/2fa/disable | Emergency disable 2FA |
| FN-25 | DELETE /users/:id | Soft delete user |

### 4.3 Cross-cutting Infrastructure

| FN | Component |
|---|---|
| FN-26 | Guards: JwtAuthGuard, RolesGuard, ProjectMembershipGuard (stub) |
| FN-27 | Decorators: @Public, @Roles, @CurrentUser, @Require2FA |
| FN-28 | CLI command: `bootstrap:create-admin` |
| FN-29 | Audit integration stub (called từ auth, full impl trong branch F8-03) |

### 4.4 Frontend Screens (10)

| SC | Path | Role |
|---|---|---|
| SC-01 | `/login` | Public |
| SC-02 | `/login/2fa` (challenge) | Mid-auth |
| SC-03 | `/forgot-password` | Public |
| SC-04 | `/reset-password?token=` | Public |
| SC-05 | `/accept-invite?token=` | Public |
| SC-06 | `/settings/profile` | Authenticated |
| SC-07 | `/settings/2fa` | Authenticated |
| SC-08 | `/settings/sessions` | Authenticated |
| SC-09 | `/users` (list, new, detail, edit) | admin/manager |
| SC-10 | Auth guards UI layer | Tất cả routes |

### 4.5 Supporting (Phase 1, priority thấp hơn)

- Backup codes hiển thị sau enrollment + option regenerate
- Session list với revoke per-session (`/settings/sessions`)
- Profile name update với audit
- Admin emergency 2FA reset (out-of-band recovery)

### 4.6 Optional (defer F8-03 hoặc Phase 2)

- Full audit log feature → **F8-03 branch** (riêng)
- Email change với re-verification → Phase 2
- Cookie "Remember this device" 2FA → Phase 2 UX enhancement
- Session timeout warning popup → Phase 2 UX
- Suspicious login detection → Phase 2

### 4.7 Excluded (KHÔNG trong scope, có roadmap)

| Item | Lý do | Tương lai |
|---|---|---|
| SSO / OIDC | ADR-015 defer | Phase 2 |
| Public self-signup | Closed system theo business | Never |
| Forced password rotation | NIST 2024 deprecate | Never |
| Password history | Defer Phase 2 | Phase 2 nếu compliance |
| WebAuthn / FIDO2 | Không phải Phase 1 priority | Phase 3+ |
| LDAP / AD integration | Towa không dùng AD (theo context Google Drive) | Không plan |
| Magic link login | Không request | Không plan |
| SMS 2FA | TOTP đủ, không cost SMS | Không plan |

---

## 5. Convention codes (cho downstream SRS doc)

- **Feature ID**: F8-AUTH (match branch + EPS context)
- **Function ID prefix**: FN-01 → FN-29 (functions) + SC-01 → SC-10 (screens)
- **Module folder**: `src/modules/auth/`
- **DB tables**: `users`, `refresh_tokens`, `password_reset_tokens`, `invitation_tokens`
- **API prefix**: `/auth/*` và `/users/*` (mount tại root `/api/v1` global prefix)

---

## 6. Tóm tắt Acceptance Criteria (cấp cao)

Các tiêu chí acceptance MVP cho F8-auth. AC chi tiết per function sẽ expand trong SRS document (step tiếp theo).

1. ✅ Admin có thể bootstrap qua CLI command trên fresh deployment
2. ✅ User có thể login với email + password; failed login return generic error (no enumeration)
3. ✅ User có 2FA enabled hoàn thành TOTP challenge để nhận tokens
4. ✅ User role admin không truy cập được admin functions cho đến khi enroll 2FA
5. ✅ Token refresh hoạt động; refresh rotation ngăn reuse
6. ✅ Password reset qua signed email link hoạt động (1h expiry, single-use)
7. ✅ Luồng invitation: admin invite → email → user accept → activated
8. ✅ Account auto-lock sau 5 failures, escalate đến admin manual unlock tại 10
9. ✅ Permission matrix enforce: role-based access trên tất cả endpoints
10. ✅ Audit events emit (stub cho F8-03) cho tất cả auth operations

---

## 7. Items mở cho /innovate Part 2 (Technical)

Forward sang Part 2 (BD+DD decisions):

1. JWT algorithm (HS256 vs RS256) — Phase 1
2. Cấu trúc JWT claims (embed gì)
3. Chi tiết cookie config (Secure flag cho local dev edge case)
4. Email transport (SES Phase 1+ cho invite emails — đã decide trong architecture)
5. Rate limit storage (Redis cho distributed — đã decide trong architecture)
6. Chiến lược test users seed (chỉ seed dev)
7. Structured logger fields cho auth events

---

## Trạng thái

- ✅ Interview (4 câu hỏi đã trả lời)
- ✅ Evidence synthesis
- ✅ 8 quyết định SRS đã chốt
- ✅ Function list approved (29 functions + 10 screens)
- ✅ Tóm tắt acceptance criteria

**State transition**: RESEARCHED → INNOVATE_SRS → SRS_CREATED

**Tiếp**: `/innovate Part 2` (Technical) — BD + DD decisions.
