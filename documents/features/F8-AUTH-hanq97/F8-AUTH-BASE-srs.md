# 認証 & 権限管理 - Software Requirements Specification

## 00 — Thông tin Tài liệu (Document Information)

- **Feature ID**: F8-AUTH
- **Tên feature**: 認証 & 権限管理 (Authentication & Authorization)
- **Phiên bản**: 1.0.0
- **Tác giả**: DEHA Solutions (Hanq97)
- **Ngày tạo**: 2026-05-16
- **Ngày cập nhật**: 2026-05-16
- **Trạng thái**: Draft
- **Module**: `auth`

## Phạm vi (Scope Level)

- **Scope Level**: Core (MVP Phase 1)
- **Expected Metrics**:
  - Functional Requirements: 25-30 FRs
  - Non-Functional Requirements: 10-12 NFRs
  - User Stories: 15-20 USs
  - Business Rules: 10-15 BRs
  - Acceptance Criteria: 30-40 ACs

## Tài liệu Tham chiếu (References)

- Innovation SRS Selection: `.claude/memory-bank/feature/f8-auth/F8-AUTH-hanq97/innovate-srs-selection.md`
- Innovation Technical Selection: `.claude/memory-bank/feature/f8-auth/F8-AUTH-hanq97/innovate-technical-selection.md`
- Architecture ADRs:
  - ADR-001 Modular Monolith
  - ADR-002 NestJS Backend
  - ADR-015 Identity Provider Strategy
  - ADR-016 2FA Policy
- Reference doc: `藤和建設様_施工管理システム_統合ドキュメント.md` (F8-01 + F8-02)
- Basic Design: [F8-AUTH-BASE-basic-design.md](./F8-AUTH-BASE-basic-design.md) (chưa có — sẽ sinh ở `/design --basic`)
- Detail Design: [F8-AUTH-BASE-frontend-detail-design.md](./F8-AUTH-BASE-frontend-detail-design.md) + [F8-AUTH-BASE-backend-detail-design.md](./F8-AUTH-BASE-backend-detail-design.md) (chưa có)

---

## 01 — Tổng quan / Overview

### 1.1 Mục đích (Purpose)

Tài liệu này mô tả Software Requirements Specification (SRS) cho feature **認証 & 権限管理** (F8-AUTH) — feature foundation của hệ thống 施工管理 (Construction Management System) cho 藤和建設株式会社 (Towa Construction). Tài liệu định nghĩa functional requirements, non-functional requirements, user stories, business rules, và acceptance criteria cần thiết để implement feature. Đây là baseline cho các giai đoạn thiết kế chi tiết (Basic Design + Detail Design) và implementation của module `auth`.

**Đối tượng đọc (Intended Audience):**

- **Developers (DEHA team)**: Hiểu requirements để implement module `auth`
- **Testers (QA)**: Tạo test cases dựa trên acceptance criteria + user stories
- **Business Analysts**: Validate requirements với stakeholders (Towa)
- **Architects**: Cross-check requirements với architectural decisions (ADRs)
- **Project Managers**: Estimate effort, plan sprint allocation
- **System Administrators (Towa)**: Hiểu các flow administrative (invite, role assignment, lockout recovery)

### 1.2 Phạm vi (Scope)

#### 1.2.1 Trong phạm vi (In-Scope)

Feature F8-AUTH bao gồm các chức năng sau:

1. **User Authentication**: Login bằng email + password với strong password policy, lockout protection
2. **Two-Factor Authentication (2FA)**: TOTP-based, bắt buộc cho `system_admin`, tùy chọn cho roles khác
3. **Session Management**: JWT access tokens (30min) + refresh token rotation (7 days), max 5 concurrent sessions/user
4. **Password Management**: Đổi password (authenticated), reset password qua email signed link (1h expiry)
5. **User Invitation Flow**: Admin/Manager mời user mới qua email, user accept và set password
6. **Role-Based Access Control (RBAC)**: 4-tier role (`system_admin` / `manager` / `employee` / `invited`), permission matrix chi tiết theo doc
7. **User Management (Admin)**: List, view, edit role, suspend, soft-delete, manual unlock
8. **Account Lockout Protection**: Progressive lockout (5 fail/15min → 15min lock; 10 fail/1h → manual unlock)
9. **Audit Stub Integration**: Mọi auth events ghi vào audit_logs table (full audit feature sẽ ở F8-03)
10. **Initial Admin Bootstrap**: CLI command tạo first admin khi fresh deployment

#### 1.2.2 Ngoài phạm vi (Out-of-Scope)

Các chức năng SAU KHÔNG nằm trong phạm vi F8-AUTH (sẽ ở features/branches khác):

- **Full Audit Log Feature** (F8-03): Audit log viewer UI, S3 archival lifecycle, BullMQ async queue. F8-AUTH chỉ có stub.
- **Backup & Restore Admin** (F8-04): Quản lý backup/restore qua UI.
- **Single Sign-On (SSO)**: Google Workspace / Microsoft 365 OIDC integration. Defer Phase 2 theo ADR-015.
- **Public Self-Signup**: Hệ thống là closed system, chỉ admin/manager mới mời được user. Không có self-registration.
- **Forced Password Rotation**: Theo NIST SP 800-63B 2024, time-based rotation đã deprecated. Không implement.
- **Password History Check**: Defer Phase 2 nếu compliance audit demand.
- **WebAuthn / FIDO2 / Passwordless**: Phase 3+ option, không nằm trong Phase 1.
- **SMS-based 2FA**: TOTP đủ, không add SMS để giảm cost + tránh SIM-swap risk.
- **Magic Link Login**: Không request bởi business.
- **LDAP/AD Integration**: Towa không dùng AD (dựa trên context Google Drive).
- **Email Change Flow** (re-verification 2-step): Defer Phase 2.
- **"Remember This Device" Cookie cho 2FA**: Defer Phase 2 UX enhancement.
- **Session Timeout Warning Popup**: Defer Phase 2 UX.
- **Suspicious Login Detection** (new IP/country alerts): Defer Phase 2.
- **Per-project ACL Full Enforcement**: Khung sẵn sàng nhưng chỉ active khi F1 (project management) triển khai.

### 1.3 Định nghĩa và Viết tắt (Definitions & Abbreviations)

#### Định nghĩa (Definitions)

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| 認証 / Authentication | Quá trình xác thực danh tính user (login với email + password + optional 2FA) |
| 権限管理 / Authorization | Quá trình kiểm soát quyền truy cập của user theo role + per-project ACL |
| Argon2id | Thuật toán password hashing chống cả side-channel + GPU brute force, OWASP top choice |
| Access Token | JWT ngắn hạn (30min) chứa identity + role; gửi mỗi request để authenticate |
| Refresh Token | Random token (128-bit), lifetime 7 ngày, dùng để rotate access token; rotating per-use |
| TOTP / Time-based OTP | One-Time Password tính theo thời gian (30s window), chuẩn RFC 6238, dùng cho 2FA |
| Recovery Code / Backup Code | 10 codes single-use generated khi enroll 2FA, dùng khi mất authenticator device |
| Invitation Token | Random signed token (24h expiry) gửi qua email để user mới accept invitation |
| Password Reset Token | Random signed token (1h expiry) gửi qua email khi user request reset password |
| Token Rotation | Mỗi lần refresh, cấp pair (access + refresh) mới, refresh cũ revoke |
| Token Family | Lineage of refresh tokens từ cùng 1 login; reuse 1 token đã revoked → revoke toàn bộ family |
| Account Lockout | Tạm thời chặn login khi quá nhiều failed attempts (progressive: 15min auto, sau đó manual) |
| Role | Vai trò của user trong hệ thống: `system_admin` / `manager` / `employee` / `invited` |
| OB顧客 / OB Customer | Old Buyer — khách hàng cũ của Towa (sẽ là feature F6 aftercare, không liên quan F8-AUTH) |
| Permission Matrix | Bảng quyền CRUD per-feature per-role (từ doc §04 ロール×機能, lines 1322-1368) |
| HttpOnly Cookie | Cookie chỉ accessible từ server-side, không expose qua JavaScript → chống XSS theft |
| `__Host-` Prefix | Cookie prefix bắt buộc Secure + Path=/ + không Domain, browser enforce, type cookie mạnh nhất |
| Bootstrap Admin | First admin được tạo qua CLI command khi fresh deployment (chicken-and-egg solution) |

#### Viết tắt (Abbreviations)

| Viết tắt | Đầy đủ |
|----------|--------|
| 2FA | Two-Factor Authentication |
| AC | Acceptance Criteria |
| APPI | 個人情報保護法 (Act on Protection of Personal Information — Japan) |
| BR | Business Rule |
| CRUD | Create, Read, Update, Delete |
| FR | Functional Requirement |
| HMAC | Hash-based Message Authentication Code |
| HS256 | HMAC + SHA-256 (JWT signing algorithm) |
| JWT | JSON Web Token |
| MFA | Multi-Factor Authentication |
| NFR | Non-Functional Requirement |
| NIST | National Institute of Standards and Technology (USA) |
| OIDC | OpenID Connect |
| OWASP | Open Worldwide Application Security Project |
| PHC | Password Hashing Competition (Argon2 = winner 2015) |
| PII | Personally Identifiable Information |
| RBAC | Role-Based Access Control |
| RFC | Request For Comments (Internet standards) |
| SRS | Software Requirements Specification |
| SSO | Single Sign-On |
| TOTP | Time-based One-Time Password (RFC 6238) |
| TTL | Time To Live |
| US | User Story |
| UUID | Universally Unique Identifier |

### 1.4 Tài liệu Tham khảo (References)

#### Tài liệu Nội bộ (Internal Documents)

**Architecture Documents** (`documents/architecture/`):
- `00-overview.md` — Tổng quan architecture toàn project
- `02-module-architecture.md` — Cấu trúc 16 modules trong monolith
- `05-backend-architecture.md` — NestJS pattern + cross-cutting concerns
- `06-security-architecture.md` — Toàn bộ auth/authz/encryption/compliance strategy
- `08-mvp-scope-and-roadmap.md` — MVP scope + sprint plan

**Architecture Decision Records (ADRs)** (`.claude/memory-bank/master/architecture-dehasol/architect/decisions/`):
- ADR-001 System Architecture Pattern — Modular Monolith
- ADR-002 Backend Framework — NestJS
- ADR-003 Frontend Framework — React + TS + Ant Design
- ADR-004 Database — PostgreSQL 16 + pgvector
- ADR-005 Cloud Platform — AWS Tokyo
- ADR-015 Identity Provider — Email/PW Phase 1, SSO Phase 2
- ADR-016 2FA Policy — Optional + Admin-mandatory

**Catalogs** (`.claude/memory-bank/master/architecture-dehasol/architect/catalogs/`):
- `stakeholder-roles.md` — 4-tier role definitions + permission matrix
- `entity-catalog.md` — User entity baseline + auth tables
- `module-catalog.md` — `auth` module contract

**Feature Context** (`.claude/memory-bank/feature/f8-auth/F8-AUTH-hanq97/`):
- `evidence.md` — 27 evidence pieces (SRS / BD / DD scope)
- `domain-knowledge.md` — 8-section domain knowledge base
- `innovate-srs-selection.md` — 8 SRS decisions + function list
- `innovate-technical-selection.md` — 18 technical decisions (BD + DD)

**Reference Document**:
- `藤和建設様_施工管理システム_統合ドキュメント.md`:
  - Part 1 §4.3 Security Requirements
  - Part 2 §02 (F8-01 + F8-02 functional specs)
  - Part 2 §04 Role × Feature Permission Matrix (lines 1322-1368)

#### Tài liệu Bên ngoài (External References)

**Security Standards**:
- **OWASP Top 10 (2021)** — A07:2021 Identification and Authentication Failures
- **OWASP Authentication Cheat Sheet** — login flow, email enumeration prevention
- **OWASP Password Storage Cheat Sheet** — Argon2id parameters
- **OWASP Session Management Cheat Sheet** — token storage, cookie config
- **NIST SP 800-63B (2024)** — Digital Identity Guidelines, no forced password rotation
- **RFC 6238** — TOTP (Time-Based One-Time Password Algorithm)
- **RFC 7519** — JSON Web Token (JWT)
- **RFC 7807** — Problem Details for HTTP APIs (considered, not chosen)

**Legal & Compliance (Japan)**:
- **個人情報保護法 (APPI)** — Personal Information Protection Act
- **電子帳簿保存法 2024 reform** — Electronic Bookkeeping (audit log retention reference)
- **建築基準法 + 住宅瑕疵担保履行法** — Construction Defect Liability Law (10-year retention context)

**Industry References**:
- ANDPAD (Japanese construction SaaS) — 2FA admin-only pattern
- Stripe Dashboard — tiered 2FA pattern
- GitHub Enterprise — refresh token rotation
- Auth0 best practices — token rotation, family revocation
- NestJS Official Documentation — `https://docs.nestjs.com/security/authentication`

---

## 02 — Functional Requirements / Yêu cầu Chức năng

Mục này định nghĩa các functional requirements (FR) cho F8-AUTH. Mỗi FR có ID duy nhất, tag priority (High/Medium/Low), evidence trace, business rules liên quan, và validation rules.

### 2.1 Authentication / Xác thực

#### FR-AUTH-001: Đăng nhập bằng email + password (User Login)

**Mô tả**: Hệ thống phải cho phép user đăng nhập sử dụng email + password. Sau khi xác thực password thành công, nếu user có 2FA enabled, hệ thống chuyển sang flow 2FA challenge. Nếu không có 2FA, hệ thống cấp access token + refresh token.

**Priority**: High (MVP critical)

**Evidence**:
- Function List FN-01 (innovate-srs-selection §4.1)
- Doc reference §3.2 F8-01 (lines 1217-1228)

**Business Rules**:
- BR-AUTH-001: Email comparison case-insensitive
- BR-AUTH-002: Password verify dùng constant-time compare (chống timing attack)
- BR-AUTH-003: Trả về cùng error message cho email không tồn tại VÀ sai password (chống email enumeration)

**Validation Rules**:
- Email format: RFC 5322 compliant
- Password: tối thiểu 1 ký tự (validation chi tiết ở registration/reset, không enforce strict ở login để legacy users vẫn login được)

---

#### FR-AUTH-002: Xác thực 2FA challenge (TOTP Verification)

**Mô tả**: Khi user có 2FA enabled login thành công bước password, hệ thống yêu cầu nhập TOTP code (6 chữ số). User submit code + intermediate token (5min lifetime). Hệ thống verify TOTP với secret đã lưu (encrypted) và cấp full session tokens nếu hợp lệ.

**Priority**: High

**Evidence**: FN-02; doc §4.3 (2FA optional spec); ADR-016

**Business Rules**:
- BR-AUTH-004: TOTP window tolerance ±1 (allow ±30s clock drift)
- BR-AUTH-005: Intermediate token (sau password OK, trước 2FA) sống 5 phút, single-use
- BR-AUTH-006: User có thể dùng backup code thay TOTP — code dùng rồi mark used

**Validation Rules**:
- TOTP: chính xác 6 chữ số
- Backup code: format alphanumeric, độ dài cố định (10 ký tự khuyến nghị)

---

#### FR-AUTH-003: Refresh access token (Token Refresh)

**Mô tả**: Khi access token hết hạn (30 phút), client gửi refresh token để xin pair tokens mới. Hệ thống verify refresh token, mark token cũ revoked (rotation), cấp pair mới.

**Priority**: High

**Evidence**: FN-03; ADR-015 § Phase 1 implementation

**Business Rules**:
- BR-AUTH-007: Mỗi refresh request rotate token — refresh cũ revoke, cấp pair mới
- BR-AUTH-008: Nếu refresh token đã revoke được present (reuse detected) → revoke toàn bộ family + alert security event
- BR-AUTH-009: Refresh token expiry 7 ngày
- BR-AUTH-010: Tối đa 5 active refresh tokens/user (oldest auto-revoke khi cấp cái thứ 6)

**Validation Rules**:
- Refresh token: signed, chưa expire, chưa revoke, match lineage

---

#### FR-AUTH-004: Logout — revoke session hiện tại (Single Logout)

**Mô tả**: User submit logout request. Hệ thống revoke refresh token hiện tại + clear cookies (cả access + refresh). Session khác của user (trên device khác) không bị ảnh hưởng.

**Priority**: High

**Evidence**: FN-04

**Business Rules**:
- BR-AUTH-011: Sau logout, access token vẫn valid cho đến khi expire (30min) — nhưng không refresh được nữa vì refresh đã revoke
- BR-AUTH-012: Logout audit event được log

---

#### FR-AUTH-005: Logout-all — revoke toàn bộ sessions của user (Logout All Devices)

**Mô tả**: User có thể logout khỏi tất cả devices/sessions cùng lúc. Hệ thống revoke toàn bộ refresh tokens active của user.

**Priority**: Medium (Supporting feature)

**Evidence**: FN-05

**Business Rules**:
- BR-AUTH-013: Logout-all audit event log riêng (khác với single logout)
- BR-AUTH-014: User được notify (Phase 2: email alert) khi logout-all được trigger từ device khác

---

#### FR-AUTH-006: Lấy thông tin user hiện tại (Get Current User)

**Mô tả**: Authenticated user có thể query thông tin của chính mình (id, email, name, role, status, 2FA enabled flag, ...).

**Priority**: High

**Evidence**: FN-06

**Business Rules**:
- BR-AUTH-015: Endpoint chỉ trả về thông tin của user gọi (không cho query user khác qua endpoint này)
- BR-AUTH-016: Sensitive fields không bao giờ trả về: `password_hash`, `2fa_secret`, `2fa_recovery_codes`

---

### 2.2 Password Management / Quản lý mật khẩu

#### FR-AUTH-007: Yêu cầu reset password (Password Reset Request)

**Mô tả**: User không nhớ password có thể request reset bằng cách submit email. Hệ thống LUÔN return success (chống email enumeration). Nếu email tồn tại trong hệ thống, gửi email với signed token (1h expiry, single-use).

**Priority**: High

**Evidence**: FN-07; OWASP Authentication Cheat Sheet

**Business Rules**:
- BR-AUTH-017: Response time response luôn nhất quán (no timing leak)
- BR-AUTH-018: Token expire 1h
- BR-AUTH-019: Maximum 3 reset requests/email/hour (rate limit)

---

#### FR-AUTH-008: Thực hiện reset password (Password Reset Execute)

**Mô tả**: User click link từ email reset, submit password mới. Hệ thống verify token, hash password mới, update `users.password_hash`, mark token used, revoke tất cả refresh tokens hiện tại của user (force re-login on all devices).

**Priority**: High

**Evidence**: FN-08

**Business Rules**:
- BR-AUTH-020: Token chỉ dùng 1 lần (single-use)
- BR-AUTH-021: Sau reset thành công, gửi email confirmation cho user
- BR-AUTH-022: Tất cả refresh tokens hiện tại của user bị revoke

**Validation Rules**:
- Password mới phải đạt password policy (xem FR-AUTH-009)

---

#### FR-AUTH-009: Đổi password (Authenticated Password Change)

**Mô tả**: User đã login có thể đổi password bằng cách submit old password + new password. Hệ thống verify old password đúng, validate new password theo policy, hash + update.

**Priority**: High

**Evidence**: FN-09

**Business Rules**:
- BR-AUTH-023: Phải nhập đúng old password (chống session hijack tận dụng cookie để đổi password)
- BR-AUTH-024: New password không được trùng old password (basic check)
- BR-AUTH-025: Tất cả refresh tokens khác của user bị revoke (giữ session hiện tại)
- BR-AUTH-026: Gửi email notification security alert

**Password Policy Validation Rules**:
- Tối thiểu 12 ký tự
- Phải có ít nhất 1 chữ hoa (A-Z)
- Phải có ít nhất 1 chữ thường (a-z)
- Phải có ít nhất 1 chữ số (0-9)
- Phải có ít nhất 1 ký tự đặc biệt (non-alphanumeric)
- KHÔNG có forced rotation theo thời gian (NIST 2024 guidance)

---

### 2.3 Two-Factor Authentication / Xác thực 2 yếu tố

#### FR-AUTH-010: Bắt đầu enroll 2FA (2FA Enrollment Start)

**Mô tả**: Authenticated user request bắt đầu enroll 2FA. Hệ thống generate random secret base32, lưu tạm (chưa enable), trả về secret + otpauth URI (cho QR code render trên frontend).

**Priority**: High

**Evidence**: FN-10; RFC 6238; ADR-016

**Business Rules**:
- BR-AUTH-027: Secret base32, 32 ký tự (160 bits)
- BR-AUTH-028: Secret tạm thời chỉ valid khi user complete enrollment trong vòng 10 phút
- BR-AUTH-029: otpauth URI format chuẩn RFC 6238: `otpauth://totp/Shikou-Kanri:<email>?secret=<base32>&issuer=Shikou-Kanri`

---

#### FR-AUTH-011: Hoàn tất enroll 2FA (2FA Enrollment Verify)

**Mô tả**: Sau khi user scan QR code và nhập TOTP code đầu tiên, hệ thống verify code đúng → mark `2fa_enabled=true`, encrypt + store secret vĩnh viễn, generate 10 backup codes (encrypted), trả về backup codes (hiển thị 1 lần cho user save).

**Priority**: High

**Evidence**: FN-11; ADR-016 § backup codes

**Business Rules**:
- BR-AUTH-030: Verify TOTP code đầu tiên trước khi enable 2FA chính thức
- BR-AUTH-031: 10 backup codes generate, mỗi code 10 ký tự alphanumeric, single-use
- BR-AUTH-032: Secret và recovery codes encrypt AES-256-GCM tại rest
- BR-AUTH-033: Audit event `auth.2fa.enroll` log

---

#### FR-AUTH-012: Disable 2FA (User-initiated)

**Mô tả**: Authenticated user có thể disable 2FA bằng cách submit current password + current TOTP code (hoặc backup code). Hệ thống verify cả 2, clear 2fa_secret và recovery_codes, set `2fa_enabled=false`.

**Priority**: Medium

**Evidence**: FN-12

**Business Rules**:
- BR-AUTH-034: Yêu cầu CẢ password + TOTP để confirm danh tính
- BR-AUTH-035: Audit event `auth.2fa.disable` log với user_id và lý do (user-initiated vs admin-initiated)
- BR-AUTH-036: Email security alert gửi user
- BR-AUTH-037: Không thể disable 2FA cho `system_admin` role (vi phạm BR-AUTH-039) — sẽ throw error nếu admin tự disable

---

#### FR-AUTH-013: Verify backup code (Backup Code Usage)

**Mô tả**: Khi user không có access TOTP authenticator (mất device), có thể dùng 1 trong 10 backup codes để authenticate. Backup code dùng rồi mark used, không reuse được.

**Priority**: Medium

**Evidence**: FN-15

**Business Rules**:
- BR-AUTH-038: Mỗi backup code single-use
- BR-AUTH-039: Notify user qua email khi backup code dùng (security alert)
- BR-AUTH-040: Khi dùng hết backup codes, user phải re-enroll 2FA

---

### 2.4 Invitation Flow / Mời người dùng

#### FR-AUTH-014: Verify invitation token (Get Invitation Info)

**Mô tả**: User nhận email invitation và click link. Frontend submit token để query thông tin invitation (email mục tiêu, role, người mời). Hệ thống verify token chưa expire/used, trả về metadata (không trả về token hash).

**Priority**: High

**Evidence**: FN-13

**Business Rules**:
- BR-AUTH-041: Token expire 24h
- BR-AUTH-042: Token single-use, mark used khi accept
- BR-AUTH-043: Nếu token expired/used/invalid → trả về error rõ ràng (có thể enumerate vì người attack đã có token rồi)

---

#### FR-AUTH-015: Accept invitation và set password

**Mô tả**: User submit invitation token + password mới. Hệ thống verify token, hash password, set vào user record với `password_hash`, đổi `status` từ `pending_invite` sang `active`, mark token used, tự động login (cấp tokens).

**Priority**: High

**Evidence**: FN-14

**Business Rules**:
- BR-AUTH-044: Password phải đạt password policy (xem FR-AUTH-009)
- BR-AUTH-045: Audit event `auth.invitation.accepted` log
- BR-AUTH-046: Email implicit verified (vì user đã access email để click invite link)
- BR-AUTH-047: Sau accept thành công, gửi welcome email với link đến dashboard

---

### 2.5 User Management / Quản lý người dùng

#### FR-USER-001: List users với filter và pagination

**Mô tả**: Admin và Manager có thể xem danh sách users, lọc theo role/status, sắp xếp theo created_at/last_login_at, paginate (default 50/page).

**Priority**: High

**Evidence**: FN-16

**Business Rules**:
- BR-USER-001: `system_admin` thấy tất cả users
- BR-USER-002: `manager` thấy tất cả users (read), không thấy 2FA secrets/recovery codes
- BR-USER-003: `employee` và `invited` không thấy được endpoint này (403 Forbidden)
- BR-USER-004: Soft-deleted users không hiển thị mặc định, có toggle "show deleted" cho admin

---

#### FR-USER-002: Xem chi tiết user (User Detail)

**Mô tả**: Admin hoặc user chính nó có thể xem chi tiết. Manager thấy được users không phải admin (không leak admin identities cho manager nếu cần). Trả về thông tin profile, role, status, last_login_at, audit info, KHÔNG trả về sensitive fields.

**Priority**: High

**Evidence**: FN-17

**Business Rules**:
- BR-USER-005: User truy cập chính mình → trả về full profile
- BR-USER-006: Admin truy cập user khác → trả về full profile (không sensitive)
- BR-USER-007: Manager truy cập user khác → trả về limited profile (chỉ public fields)
- BR-USER-008: Soft-deleted users vẫn xem được bởi admin (với deletion flag)

---

#### FR-USER-003: Gửi invitation (Send Invitation)

**Mô tả**: Admin/Manager có thể mời user mới bằng cách submit email + role (+ optional project_ids cho Phase 2). Hệ thống generate token, tạo user record `pending_invite`, gửi email.

**Priority**: High

**Evidence**: FN-18

**Business Rules**:
- BR-USER-009: Manager chỉ có thể invite với role `manager`/`employee`/`invited` (KHÔNG invite admin)
- BR-USER-010: Admin có thể invite với mọi role (bao gồm admin)
- BR-USER-011: Email phải unique — nếu đã tồn tại user (bất kỳ status nào), reject
- BR-USER-012: Audit event `auth.invitation.created` log

---

#### FR-USER-004: Cancel pending invitation

**Mô tả**: Admin/Manager (người gửi hoặc admin khác) có thể cancel invitation chưa accept. Hệ thống mark `cancelled_at`, token không còn valid.

**Priority**: Medium

**Evidence**: FN-19

**Business Rules**:
- BR-USER-013: Chỉ invitation chưa used mới cancel được
- BR-USER-014: User invited không bị xóa khỏi DB, chỉ token invalid

---

#### FR-USER-005: Đổi role của user

**Mô tả**: Admin có thể đổi role của user (vd promote employee → manager, demote manager → employee). Hệ thống validate constraint (không demote last admin), update, log audit event.

**Priority**: High

**Evidence**: FN-20

**Business Rules**:
- BR-USER-015: Chỉ `system_admin` có thể đổi role
- BR-USER-016: Không thể đổi role của `system_admin` cuối cùng (single-admin protection)
- BR-USER-017: Audit event `user.role.changed` log với from/to role
- BR-USER-018: Sau đổi role, optional: invalidate refresh tokens của user (force re-login với role mới — Phase 2 decision)

---

#### FR-USER-006: Đổi status của user (Suspend/Disable/Activate)

**Mô tả**: Admin có thể đổi status user (active ↔ suspended; active → disabled). Suspend tạm thời chặn login, disable là soft-delete (set `deleted_at`).

**Priority**: High

**Evidence**: FN-21

**Business Rules**:
- BR-USER-019: Chỉ `system_admin` có thể đổi status
- BR-USER-020: Không thể disable `system_admin` cuối cùng
- BR-USER-021: Khi user bị suspend hoặc disabled → revoke tất cả refresh tokens active
- BR-USER-022: Audit event `user.status.changed` log

---

#### FR-USER-007: Cập nhật profile (Self or Admin)

**Mô tả**: User có thể update profile của chính mình (name, name_kana). Admin có thể update của user khác.

**Priority**: Medium

**Evidence**: FN-22

**Business Rules**:
- BR-USER-023: User không thể tự đổi role hoặc status (chỉ admin)
- BR-USER-024: User không thể tự đổi email Phase 1 (defer Phase 2)
- BR-USER-025: Audit event log mọi profile changes

---

#### FR-USER-008: Manual unlock account sau lockout

**Mô tả**: Khi user bị Layer 2 lockout (10 fail/1h), chỉ admin mới unlock được. Admin truy cập user detail, click unlock, hệ thống reset `failed_login_attempts=0`, clear `locked_until`.

**Priority**: High (Critical cho Layer 2 recovery)

**Evidence**: FN-23

**Business Rules**:
- BR-USER-026: Chỉ `system_admin` có thể manual unlock
- BR-USER-027: Audit event `auth.account.unlocked` log với reason
- BR-USER-028: Optional: gửi email security alert cho user về việc unlock

---

#### FR-USER-009: Admin emergency disable 2FA (Out-of-band Recovery)

**Mô tả**: Khi user mất device authenticator + mất hết backup codes, admin có thể disable 2FA của user đó để user re-enroll. Required: admin verify identity user out-of-band (qua phone, video call, ...).

**Priority**: Medium

**Evidence**: FN-24

**Business Rules**:
- BR-USER-029: Chỉ `system_admin` có thể trigger
- BR-USER-030: Audit event `auth.2fa.disable` log với `reason='admin_emergency'`
- BR-USER-031: Email security alert MUST gửi cho user
- BR-USER-032: User được force `force_two_fa_enrollment=true` để buộc re-enroll trong lần login tiếp theo

---

#### FR-USER-010: Soft-delete user

**Mô tả**: Admin có thể soft-delete user (set `deleted_at`). User không thể login. Dữ liệu giữ lại cho audit. Hard-delete không có UI, chỉ qua maintenance script + audit logged.

**Priority**: Medium

**Evidence**: FN-25

**Business Rules**:
- BR-USER-033: Chỉ `system_admin` có thể soft-delete
- BR-USER-034: Không thể delete `system_admin` cuối cùng
- BR-USER-035: Email của user soft-deleted KHÔNG được reuse trong invite mới (cho đến khi hard-delete sau N years)
- BR-USER-036: Audit event `user.deleted` log

---

### 2.6 Cross-Cutting Functions

#### FR-INFRA-001: Authentication Guard

**Mô tả**: Hệ thống phải có một global authentication guard kiểm tra valid access token cho mọi protected endpoint. Endpoint có thể đánh dấu `@Public` để skip auth.

**Priority**: High

**Evidence**: FN-26

**Business Rules**:
- BR-INFRA-001: Guard extract token từ cookie `__Host-access_token` (prod) hoặc `access_token` (dev)
- BR-INFRA-002: Verify JWT signature + expiry; nếu fail → 401 Unauthorized
- BR-INFRA-003: Inject AuthenticatedUser vào request context để service tầng dưới sử dụng

---

#### FR-INFRA-002: Role-Based Authorization Guard

**Mô tả**: Endpoint có thể chỉ định required roles bằng decorator `@Roles('admin', 'manager')`. Guard kiểm tra user's role nằm trong allowed list.

**Priority**: High

**Evidence**: FN-26

**Business Rules**:
- BR-INFRA-004: User role không trong allowed list → 403 Forbidden
- BR-INFRA-005: `@Public` decorator override `@Roles` (cho public endpoints như login, password-reset-request)

---

#### FR-INFRA-003: Bootstrap admin CLI command

**Mô tả**: Hệ thống cung cấp CLI command `bootstrap:create-admin` cho fresh deployment. DEHA ops chạy lần 1 sau deploy để tạo first system administrator.

**Priority**: High (deployment-critical)

**Evidence**: FN-28; SRS D8

**Business Rules**:
- BR-INFRA-006: Command idempotent — refuse nếu đã có admin (trừ khi `--force`)
- BR-INFRA-007: Generate temp password random 16 ký tự, hiển thị 1 lần qua stdout
- BR-INFRA-008: User được mark `force_password_change=true` + `force_two_fa_enrollment=true`
- BR-INFRA-009: Audit event log với `actor=null` (system-generated)

---

#### FR-INFRA-004: Audit event emission (stub for F8-03)

**Mô tả**: Mọi auth/user operations sinh audit event được ghi vào bảng `audit_logs`. Bao gồm: who (actor), what (action), when (timestamp), where (IP/UA), changes (before/after).

**Priority**: High

**Evidence**: FN-29; BD-2

**Business Rules**:
- BR-INFRA-010: Sync ghi vào DB trong cùng transaction với operation chính (Phase 1; async qua queue ở F8-03)
- BR-INFRA-011: Sensitive fields (password, token, secret) không bao giờ log
- BR-INFRA-012: Audit retention: 2 năm minimum (theo doc §4.3)

---

### 2.7 Force Flows / Luồng bắt buộc

#### FR-AUTH-016: Force password change on first login

**Mô tả**: User mới (bootstrap admin hoặc admin reset password) có `force_password_change=true`. Khi login lần đầu, hệ thống chỉ trả về intermediate token + flag, frontend redirect sang password-change screen, sau khi đổi xong mới cấp full tokens.

**Priority**: High

**Evidence**: BR-INFRA-008; D8

**Business Rules**:
- BR-AUTH-048: Trong khi `force_password_change=true`, mọi API call khác bị block (chỉ allow password-change endpoint)
- BR-AUTH-049: Sau đổi password thành công, clear flag, cấp full tokens

---

#### FR-AUTH-017: Force 2FA enrollment cho admin

**Mô tả**: User với role `system_admin` có `force_two_fa_enrollment=true` (default mới tạo). Sau khi login + password OK, nếu 2FA chưa enable, hệ thống force enrollment trước khi admin có thể truy cập admin functions.

**Priority**: High

**Evidence**: D5; ADR-016

**Business Rules**:
- BR-AUTH-050: Admin được tokens nhưng cờ `requires_2fa_enrollment=true` trong session
- BR-AUTH-051: API calls đến admin-restricted endpoints trả 403 với `code=AUTH_2FA_ENROLLMENT_REQUIRED`
- BR-AUTH-052: Frontend redirect admin sang `/settings/2fa` để enroll
- BR-AUTH-053: Sau enroll thành công, clear flag

---

### 2.8 Tóm tắt Functional Requirements

**Tổng FRs**: 31 functional requirements

| Group | FRs | Count |
|---|---|---|
| Authentication | FR-AUTH-001 → FR-AUTH-006 | 6 |
| Password Management | FR-AUTH-007 → FR-AUTH-009 | 3 |
| 2FA | FR-AUTH-010 → FR-AUTH-013 | 4 |
| Invitation Flow | FR-AUTH-014 → FR-AUTH-015 | 2 |
| User Management | FR-USER-001 → FR-USER-010 | 10 |
| Cross-Cutting | FR-INFRA-001 → FR-INFRA-004 | 4 |
| Force Flows | FR-AUTH-016 → FR-AUTH-017 | 2 |

**Business Rules**: 53 business rules (BR-AUTH-001 → BR-AUTH-053, BR-USER-001 → BR-USER-036, BR-INFRA-001 → BR-INFRA-012, một số đã trùng/overlap)

---

## 03 — Non-Functional Requirements / Yêu cầu Phi chức năng

### 3.1 Performance / Hiệu năng

#### NFR-PERF-001: Login response time

**Mô tả**: Login endpoint response time ≤ 500ms p95 dưới load 50 concurrent users. Argon2 password hash là phần chiếm thời gian chủ yếu (~150ms).

**Evidence**: Doc §4.1 page response p95 <2s; Domain KB §6.2

**Acceptance Threshold**: 500ms p95 / 1000ms p99

---

#### NFR-PERF-002: Token validation latency

**Mô tả**: JWT validation (per request) ≤ 10ms p95. Cached trong request lifetime, không query DB.

**Acceptance Threshold**: 10ms p95 / 25ms p99

---

#### NFR-PERF-003: Refresh token latency

**Mô tả**: Refresh endpoint ≤ 50ms p95 (1 DB lookup + revoke + sign new pair).

**Acceptance Threshold**: 50ms p95 / 100ms p99

---

#### NFR-PERF-004: 2FA enrollment latency

**Mô tả**: Enroll-start (generate secret + QR data) ≤ 300ms p95.

**Acceptance Threshold**: 300ms p95 / 500ms p99

---

### 3.2 Security / Bảo mật

#### NFR-SEC-001: Password storage

**Mô tả**: Mọi password phải hash bằng Argon2id với parameters: timeCost=3, memoryCost=64MB, parallelism=4. KHÔNG bao giờ store password plaintext, KHÔNG log password.

**Evidence**: Doc §4.3 "ハッシュ化 (bcrypt等) して保管", upgraded sang Argon2 per OWASP 2025; ADR-015

**Acceptance Criteria**:
- Password ở DB là PHC string format
- Hash compute time ~150ms (verify với benchmark)

---

#### NFR-SEC-002: Token storage

**Mô tả**: Access + refresh tokens lưu trong HttpOnly Secure SameSite=Lax cookies. Trong production, dùng prefix `__Host-` (yêu cầu Secure + Path=/ + no Domain). KHÔNG store tokens trong localStorage hoặc memory accessible từ JavaScript.

**Evidence**: OWASP Session Management Cheat Sheet; ADR-015

**Acceptance Criteria**:
- Inspect browser DevTools confirm cookies có HttpOnly + Secure (prod) flags
- JavaScript `document.cookie` không trả về access_token

---

#### NFR-SEC-003: Encryption at rest cho secrets

**Mô tả**: 2FA secret và recovery codes phải được encrypt bằng AES-256-GCM với key (32 bytes random) lưu trong AWS Secrets Manager (prod) / `.env` (dev). Database cluster phải có encryption at rest (RDS default OK).

**Evidence**: Doc §4.3 "保存暗号化 AES-256相当"; ADR-015

**Acceptance Criteria**:
- 2fa_secret trong DB là Buffer encrypted (không readable)
- TWOFA_ENCRYPTION_KEY env var có ≥32 bytes random

---

#### NFR-SEC-004: TLS encryption

**Mô tả**: Mọi traffic giữa client và server phải dùng TLS 1.2 trở lên. Production dùng ACM certificate + HTTPS only. Local dev có thể HTTP nhưng cookies dev không có Secure flag.

**Evidence**: Doc §4.3 "TLS 1.2以上"

**Acceptance Criteria**:
- Production endpoints chỉ accessible qua HTTPS
- HTTP requests redirect 301 sang HTTPS

---

#### NFR-SEC-005: Rate limiting

**Mô tả**: Login endpoint rate limit 5 attempts / 15 phút / (IP + email combo). Global rate limit 300 req/min/user, 100 req/min/IP.

**Evidence**: Domain KB §6.3; OWASP Brute Force Cheat Sheet

**Acceptance Criteria**:
- 6th login attempt trong 15min trả 429 Rate Limited
- Storage backend ElastiCache Redis (distributed across app instances)

---

#### NFR-SEC-006: Account lockout policy

**Mô tả**: Progressive account lockout:
- Layer 1: 5 failed attempts trong 15 phút → khóa account 15 phút (auto-recover)
- Layer 2: 10 failed attempts trong 1 giờ → admin manual unlock required
- Alert admin via email khi layer 2 trigger

**Evidence**: SRS D7

**Acceptance Criteria**:
- Counter `failed_login_attempts` increment chính xác
- `locked_until` set khi reach threshold
- Email notification sent khi Layer 2 lockout

---

#### NFR-SEC-007: Audit logging

**Mô tả**: Mọi auth/user operations sinh audit event log vào DB. Retention tối thiểu 2 năm. Sensitive fields redacted (password, token, secret, recovery codes).

**Evidence**: Doc §4.3 "監査ログ 2年間保持"

**Acceptance Criteria**:
- Audit log entry tạo trong cùng transaction với operation chính
- No PII redaction violations khi inspect audit_logs table

---

#### NFR-SEC-008: 2FA enforcement cho admin

**Mô tả**: User với role `system_admin` BẮT BUỘC enable 2FA trước khi truy cập admin functions. System enforce bằng `force_two_fa_enrollment` flag và 403 Forbidden cho admin endpoints khi chưa enroll.

**Evidence**: ADR-016; SRS D5

**Acceptance Criteria**:
- Admin user mới tạo có `force_two_fa_enrollment=true`
- Admin actions block với error code `AUTH_2FA_ENROLLMENT_REQUIRED`

---

### 3.3 Availability / Khả dụng

#### NFR-AVAIL-001: Service uptime

**Mô tả**: Auth endpoints phải có uptime 99.5% trong giờ business (theo doc §4.2). Tính từ availability của ECS task + ALB + RDS Multi-AZ.

**Evidence**: Doc §4.2 SLA 99.5%

**Acceptance Criteria**:
- Multi-AZ RDS auto-failover (~1-2 phút)
- ECS task health check pass

---

#### NFR-AVAIL-002: Session persistence across server restart

**Mô tả**: Refresh tokens lưu trong DB, không trong memory → user không bị logout khi ECS task restart.

**Acceptance Criteria**:
- Sau rolling deploy, user có valid refresh token vẫn refresh được

---

### 3.4 Usability / Tính dùng được

#### NFR-USAB-001: Error message clarity

**Mô tả**: Mọi error response trả về structure standard `{ code, message, traceId, details? }`. Message bằng tiếng Nhật (ja_JP) cho user-facing errors. Code English để FE map.

**Evidence**: DD-4

**Acceptance Criteria**:
- 401 errors có message tiếng Nhật cụ thể
- Trace ID có thể tra ngược log

---

#### NFR-USAB-002: Login UX target

**Mô tả**: User login flow đơn giản: 1 trang nhập email+pw, optional 1 trang 2FA. Tối đa 2 trang để đến dashboard.

**Acceptance Criteria**:
- Login form hiển thị < 2s
- Auto-focus vào field email

---

### 3.5 Maintainability / Khả bảo trì

#### NFR-MAINT-001: Test coverage

**Mô tả**: Module `auth` phải có code coverage ≥85% (security-critical module).

**Evidence**: DD-9

**Acceptance Criteria**:
- Jest coverage report ≥85% cho `src/modules/auth/**`
- Critical paths (login, 2FA verify, password reset) coverage 100%

---

#### NFR-MAINT-002: Migration reversibility

**Mô tả**: Mọi migration phải có rollback script hoặc kế hoạch revert documented. Migrations phải additive (new columns nullable hoặc với default) để support rolling deploy.

**Evidence**: ADR-004 + Database Design §6.3

**Acceptance Criteria**:
- Mỗi migration có comment explain rollback approach
- Migration không drop column trong cùng deploy đổi schema lớn

---

### 3.6 Compliance / Tuân thủ pháp lý

#### NFR-COMP-001: APPI compliance (個人情報保護法)

**Mô tả**: Hệ thống tuân thủ APPI Nhật Bản. PII (email, name) encrypt at rest. Audit log mọi PII access. Support data subject rights (export, anonymize on deletion request).

**Evidence**: Architecture doc 06-security §8.1; Doc §4.7

**Acceptance Criteria**:
- DB RDS encryption at rest enabled
- Audit log cover PII access (read events optional Phase 1)

---

#### NFR-COMP-002: Audit log retention 2 years

**Mô tả**: Audit events lưu trữ tối thiểu 2 năm theo doc §4.3. Phase 2+: archive sang S3 Glacier sau 90 ngày để giảm DB cost.

**Acceptance Criteria**:
- Không hard-delete audit_logs trong vòng 2 năm
- Retention policy documented

---

### 3.7 Tóm tắt Non-Functional Requirements

**Tổng NFRs**: 16 non-functional requirements

| Category | NFRs | Count |
|---|---|---|
| Performance | NFR-PERF-001 → NFR-PERF-004 | 4 |
| Security | NFR-SEC-001 → NFR-SEC-008 | 8 |
| Availability | NFR-AVAIL-001 → NFR-AVAIL-002 | 2 |
| Usability | NFR-USAB-001 → NFR-USAB-002 | 2 |
| Maintainability | NFR-MAINT-001 → NFR-MAINT-002 | 2 |
| Compliance | NFR-COMP-001 → NFR-COMP-002 | 2 |

---

## 04 — User Stories / Câu chuyện người dùng

### 4.1 Stories cho System Administrator (システム管理者)

#### US-ADMIN-001: Bootstrap admin đầu tiên

**As a** DEHA Ops engineer
**I want** chạy CLI command để tạo first system administrator cho Towa khi fresh deployment
**So that** Towa có account admin đầu tiên để bắt đầu cấu hình hệ thống

**Acceptance Criteria**: AC-001, AC-002

**Priority**: High
**Dependencies**: None

---

#### US-ADMIN-002: Login admin lần đầu

**As a** Towa system administrator (vừa nhận temp password từ DEHA)
**I want** login với temp password và được prompt đổi password + setup 2FA ngay
**So that** account của tôi an toàn ngay từ lần dùng đầu tiên

**Acceptance Criteria**: AC-003, AC-004

**Priority**: High
**Dependencies**: US-ADMIN-001

---

#### US-ADMIN-003: Mời nhân viên mới

**As a** Towa system administrator
**I want** mời nhân viên/manager mới qua email với role được chỉ định
**So that** họ có thể setup account và bắt đầu dùng hệ thống

**Acceptance Criteria**: AC-005, AC-006, AC-007

**Priority**: High
**Dependencies**: US-ADMIN-002

---

#### US-ADMIN-004: Quản lý role của users

**As a** Towa system administrator
**I want** đổi role của user (vd promote employee → manager)
**So that** team có quyền truy cập phù hợp với trách nhiệm hiện tại

**Acceptance Criteria**: AC-008, AC-009

**Priority**: High
**Dependencies**: US-ADMIN-003

---

#### US-ADMIN-005: Suspend / disable user

**As a** Towa system administrator
**I want** suspend hoặc disable user khi cần (vd: nhân viên nghỉ việc, account bị compromise)
**So that** ngăn truy cập trái phép vào hệ thống

**Acceptance Criteria**: AC-010, AC-011

**Priority**: High
**Dependencies**: US-ADMIN-003

---

#### US-ADMIN-006: Manual unlock account

**As a** Towa system administrator
**I want** unlock account của user bị Layer 2 lockout (10 fail/1h)
**So that** user hợp lệ có thể login lại sau khi xác minh danh tính

**Acceptance Criteria**: AC-012, AC-013

**Priority**: High
**Dependencies**: NFR-SEC-006 lockout policy

---

#### US-ADMIN-007: Emergency disable 2FA cho user

**As a** Towa system administrator
**I want** disable 2FA cho user mất authenticator device + hết backup codes
**So that** user có thể login lại và re-enroll 2FA

**Acceptance Criteria**: AC-014, AC-015

**Priority**: Medium
**Dependencies**: FR-AUTH-013 (backup codes)

---

### 4.2 Stories cho Manager (社員 マネージャー)

#### US-MGR-001: Mời employee mới

**As a** sales/operations manager (Towa)
**I want** mời nhân viên vào hệ thống với role `employee` hoặc `invited` (cho 職人)
**So that** team có thể truy cập dự án + dữ liệu cần thiết

**Acceptance Criteria**: AC-016, AC-017

**Priority**: High
**Dependencies**: US-ADMIN-003 (admin invitation pattern)

---

#### US-MGR-002: Cancel invitation nếu sai

**As a** manager
**I want** cancel invitation mà tôi gửi nhầm (vd sai email)
**So that** invitation token không còn valid và tôi gửi lại đúng email

**Acceptance Criteria**: AC-018

**Priority**: Medium
**Dependencies**: US-MGR-001

---

### 4.3 Stories cho Employee (社員 一般)

#### US-EMP-001: Accept invitation và setup account

**As a** new employee (vừa nhận invite email)
**I want** click link, set password và login ngay
**So that** tôi có thể bắt đầu công việc trên hệ thống

**Acceptance Criteria**: AC-019, AC-020

**Priority**: High
**Dependencies**: US-ADMIN-003 hoặc US-MGR-001

---

#### US-EMP-002: Đăng nhập hàng ngày

**As a** active employee
**I want** login bằng email + password (và optionally 2FA nếu tôi đã enable)
**So that** truy cập vào dashboard và làm việc

**Acceptance Criteria**: AC-021, AC-022, AC-023

**Priority**: High
**Dependencies**: US-EMP-001

---

#### US-EMP-003: Đổi password định kỳ (tự nguyện)

**As a** active employee security-conscious
**I want** đổi password bất kỳ lúc nào khi muốn
**So that** giữ account an toàn (không bị system ép buộc theo thời gian)

**Acceptance Criteria**: AC-024

**Priority**: Medium
**Dependencies**: US-EMP-002

---

#### US-EMP-004: Reset password khi quên

**As a** employee quên password
**I want** request reset password qua email và set password mới
**So that** không bị block khỏi hệ thống

**Acceptance Criteria**: AC-025, AC-026

**Priority**: High
**Dependencies**: None

---

#### US-EMP-005: Enable 2FA tự nguyện

**As a** security-conscious employee
**I want** enable 2FA cho account của mình
**So that** thêm layer protection chống credential theft

**Acceptance Criteria**: AC-027, AC-028

**Priority**: Medium
**Dependencies**: US-EMP-002

---

#### US-EMP-006: Logout khỏi current device

**As a** employee sử dụng máy chung hoặc kết thúc ngày làm
**I want** logout để clear session trên thiết bị này
**So that** người khác không access được account của tôi

**Acceptance Criteria**: AC-029

**Priority**: High
**Dependencies**: US-EMP-002

---

#### US-EMP-007: Logout khỏi tất cả devices (khi nghi compromise)

**As a** employee nghi ngờ account bị compromise (vd phát hiện login lạ)
**I want** logout toàn bộ sessions trên mọi devices
**So that** chấm dứt mọi truy cập đáng ngờ

**Acceptance Criteria**: AC-030

**Priority**: Medium
**Dependencies**: US-EMP-006

---

#### US-EMP-008: Xem profile của mình

**As a** authenticated user
**I want** xem profile thông tin của mình (email, name, role, 2FA status, last login)
**So that** confirm account đang ở trạng thái mong muốn

**Acceptance Criteria**: AC-031

**Priority**: Medium
**Dependencies**: US-EMP-002

---

### 4.4 Stories cho Invited User (招待ユーザー — 職人 / 協力業者)

#### US-INV-001: Accept invitation từ Towa

**As a** 職人 hoặc 協力業者 nhận invitation từ Towa
**I want** accept invitation đơn giản và setup password
**So that** tôi có thể tham gia projects mà Towa giao

**Acceptance Criteria**: AC-019, AC-020 (cùng pattern employee accept)

**Priority**: High (Phase 1 vì F4-03 sẽ extend cho project invite — base flow đã ở F8-auth)
**Dependencies**: US-MGR-001 hoặc US-ADMIN-003

---

#### US-INV-002: Đăng nhập đơn giản

**As a** 職人 (có thể IT-literacy thấp)
**I want** login UX đơn giản, chữ to, ít field
**So that** tôi không bị frustrated khi dùng

**Acceptance Criteria**: AC-021, AC-022, AC-032

**Priority**: High
**Dependencies**: US-INV-001

---

### 4.5 Tóm tắt User Stories

**Tổng User Stories**: 18

| Role | Stories | Count |
|---|---|---|
| System Administrator | US-ADMIN-001 → US-ADMIN-007 | 7 |
| Manager | US-MGR-001 → US-MGR-002 | 2 |
| Employee | US-EMP-001 → US-EMP-008 | 8 |
| Invited User | US-INV-001 → US-INV-002 | 2 (-1 overlap with EMP) |

---

## 05 — Acceptance Criteria / Tiêu chí Nghiệm thu

### 5.1 Bootstrap & Admin Setup

#### AC-001: CLI bootstrap admin happy path

**Given** chưa có user `system_admin` nào trong DB
**When** DEHA ops chạy `npx nest start --command bootstrap:create-admin --email=admin@towa.example --name="管理者太郎"`
**Then** 
- Hệ thống tạo user với role=`system_admin`, status=`active`
- `force_password_change=true`, `force_two_fa_enrollment=true`
- Temp password (16 ký tự random) hiển thị qua stdout
- Audit event log với `action='auth.user.bootstrap'`
- Exit code 0

---

#### AC-002: CLI bootstrap khi đã có admin

**Given** đã có ≥1 user `system_admin` active
**When** DEHA ops chạy bootstrap command (không `--force`)
**Then**
- Hệ thống refuse với error message rõ ràng
- Không tạo user mới
- Exit code 1

---

#### AC-003: Admin login đầu tiên — force password change

**Given** admin có `force_password_change=true`, vừa login với temp password đúng
**When** admin try gọi API khác (ngoài password-change endpoint)
**Then**
- API trả 403 Forbidden với `code='AUTH_FORCE_PASSWORD_CHANGE'`
- Frontend redirect sang screen đổi password

---

#### AC-004: Admin login đầu tiên — force 2FA enrollment

**Given** admin đã đổi password (clear `force_password_change`), nhưng `force_two_fa_enrollment=true`
**When** admin try truy cập admin endpoint
**Then**
- API trả 403 với `code='AUTH_2FA_ENROLLMENT_REQUIRED'`
- Frontend redirect sang `/settings/2fa`
- Sau enroll thành công, flag clear, admin truy cập được admin functions

---

### 5.2 Invitation Flow

#### AC-005: Admin gửi invitation thành công

**Given** authenticated admin
**When** admin submit `POST /users/invitations` với `{email: "new@towa.example", role: "employee"}`
**Then**
- User record mới tạo với `status='pending_invite'`
- Invitation token tạo với 24h expiry
- Email gửi đến new@towa.example với link accept-invite + token
- Audit event log

---

#### AC-006: Invitation duplicate email

**Given** đã có user với email "exists@towa.example" (bất kỳ status)
**When** admin submit invitation với cùng email
**Then**
- API trả 409 Conflict với `code='AUTH_USER_EXISTS'`
- Không tạo invitation
- Không gửi email

---

#### AC-007: Manager không thể invite admin

**Given** authenticated manager (không phải admin)
**When** manager submit invitation với `role: "system_admin"`
**Then**
- API trả 403 với `code='AUTH_INSUFFICIENT_PERMISSION'`
- Audit event log với `actor=manager_id`, `action='auth.invitation.attempted_admin'`

---

#### AC-008: Admin đổi role thành công

**Given** authenticated admin, có user khác với role `employee`
**When** admin submit `PUT /users/:id/role` với `{role: "manager"}`
**Then**
- User's role update thành `manager`
- Audit event log với `changes={role: {from: "employee", to: "manager"}}`
- HTTP 200 OK

---

#### AC-009: Không thể demote last admin

**Given** chỉ có 1 admin active trong system
**When** admin đó submit `PUT /users/<chính-mình>/role` với `{role: "manager"}` (hoặc admin khác submit cho admin này)
**Then**
- API trả 409 Conflict với `code='AUTH_LAST_ADMIN'`
- Role không thay đổi

---

### 5.3 User Management

#### AC-010: Suspend user

**Given** authenticated admin, user khác `status='active'`
**When** admin submit `PUT /users/:id/status` với `{status: "suspended"}`
**Then**
- User's status update thành `suspended`
- Tất cả refresh tokens active của user bị revoke
- Audit event log

---

#### AC-011: Suspended user không login được

**Given** user có `status='suspended'`
**When** user thử login với email + password đúng
**Then**
- API trả 403 với `code='AUTH_ACCOUNT_SUSPENDED'`
- Không cấp tokens

---

#### AC-012: Manual unlock account

**Given** user có `locked_until` set trong tương lai (đang lockout Layer 2)
**When** admin submit `POST /users/:id/unlock`
**Then**
- User's `failed_login_attempts=0`, `locked_until=null`
- Audit event log
- User có thể login bình thường

---

#### AC-013: Tự động lockout sau 5 fails

**Given** user đăng nhập với password sai 5 lần liên tiếp trong 15 phút
**When** lần thử thứ 5 trả về
**Then**
- API trả 423 Locked với `code='AUTH_ACCOUNT_LOCKED'`, details `{unlockAt: timestamp}`
- `locked_until` = now + 15min
- Audit event log với severity high

---

#### AC-014: Emergency 2FA disable bởi admin

**Given** authenticated admin, user khác có 2FA enabled
**When** admin submit `POST /users/:id/2fa/disable` với reason
**Then**
- User's `2fa_enabled=false`, `2fa_secret=null`, `2fa_recovery_codes=null`
- `force_two_fa_enrollment=true` (nếu user là admin role)
- Audit event log với `reason='admin_emergency'`
- Email security alert gửi user

---

#### AC-015: Admin không thể emergency disable 2FA của chính mình

**Given** authenticated admin với 2FA enabled
**When** admin submit emergency disable cho chính mình
**Then**
- API trả 400 Bad Request với explanation
- Phải dùng self-disable flow (yêu cầu password + TOTP)

---

### 5.4 Authentication Flow

#### AC-016, AC-017: (Pattern same as AC-005 + AC-008 cho manager — see User Stories)

---

#### AC-018: Cancel invitation

**Given** invitation tạo bởi manager A, chưa accept, chưa expire
**When** manager A submit `DELETE /users/invitations/:id`
**Then**
- Invitation mark `cancelled_at=now`
- Token không còn valid
- User record vẫn ở trạng thái `pending_invite` nhưng không accept được nữa

---

#### AC-019: Accept invitation thành công

**Given** invitation token valid (chưa expire, chưa used)
**When** user submit `POST /auth/invitations/accept` với `{token, password: "Strong1Pass!"}`
**Then**
- User status đổi thành `active`
- Password hash lưu
- Token mark `used_at=now`
- Tokens (access + refresh) cấp ngay (auto-login)
- Audit event log
- Welcome email gửi user

---

#### AC-020: Accept với password không đạt policy

**Given** invitation token valid
**When** user submit accept với `password: "weak"` (8 ký tự, không complexity)
**Then**
- API trả 400 với `code='AUTH_PASSWORD_WEAK'` và details (which rule failed)
- User không được activate

---

### 5.5 Login & Session

#### AC-021: Login success không có 2FA

**Given** user `active`, password đúng, 2FA disabled
**When** user submit `POST /auth/login` với email + password
**Then**
- API trả 200 OK với data `{user: {...}, requires2fa: false}`
- Set cookies access_token (30min TTL) + refresh_token (7d TTL), HttpOnly
- Tạo refresh_token record trong DB
- Audit event `auth.login.success` log

---

#### AC-022: Login với password sai

**Given** user `active`, password sai
**When** user submit login
**Then**
- API trả 401 với `code='AUTH_INVALID_CREDENTIALS'`, message generic
- Increment `failed_login_attempts`
- Audit event `auth.login.failure` log

---

#### AC-023: Login với email không tồn tại

**Given** email "nonexistent@example.com" không trong DB
**When** user submit login
**Then**
- API trả 401 với CÙNG `code='AUTH_INVALID_CREDENTIALS'` và message như AC-022
- Response time tương đương AC-022 (pad timing nếu cần)

---

#### AC-024: Đổi password authenticated

**Given** authenticated user, old password đúng
**When** user submit `POST /auth/password/change` với `{oldPassword, newPassword}`
**Then**
- `password_hash` update thành hash của newPassword
- Tất cả refresh tokens khác bị revoke (giữ session hiện tại)
- Email security alert gửi
- HTTP 200 OK

---

#### AC-025: Request password reset thành công

**Given** email "user@towa.example" tồn tại trong DB
**When** user submit `POST /auth/password/reset-request` với email này
**Then**
- API trả 200 với message generic (không xác nhận email tồn tại)
- Reset token tạo với 1h expiry
- Email gửi user với link `/reset-password?token=...`

---

#### AC-026: Request password reset với email không tồn tại

**Given** email "fake@example.com" không trong DB
**When** user submit reset request
**Then**
- API trả 200 với CÙNG message như AC-025 (no enumeration)
- Không tạo token, không gửi email
- Response time tương đương

---

### 5.6 2FA Flow

#### AC-027: 2FA enrollment start

**Given** authenticated user chưa enable 2FA
**When** user submit `POST /auth/2fa/enroll`
**Then**
- API trả 200 với `{secret, otpauthUri, qrCodeDataUrl}`
- Secret tạm thời stored, chưa enable
- Có 10 phút để user complete

---

#### AC-028: 2FA enrollment verify

**Given** user đã start enrollment trong 10 phút, đã scan QR
**When** user submit `POST /auth/2fa/enroll/verify` với TOTP code valid
**Then**
- `2fa_enabled=true`, secret encrypt + persist
- 10 backup codes generate (encrypted), trả về 1 lần
- Audit event log
- HTTP 200 với `{backupCodes: [...]}`

---

### 5.7 Logout

#### AC-029: Single logout

**Given** authenticated user
**When** user submit `POST /auth/logout`
**Then**
- Refresh token hiện tại mark revoked
- Cookies clear
- HTTP 204 No Content
- Audit event log

---

#### AC-030: Logout all sessions

**Given** authenticated user có 3 active refresh tokens
**When** user submit `POST /auth/logout-all`
**Then**
- Tất cả 3 refresh tokens revoke
- Cookies clear
- HTTP 204
- Audit event log với count revoked

---

### 5.8 Profile

#### AC-031: Get current user

**Given** authenticated user
**When** user submit `GET /auth/me`
**Then**
- API trả 200 với `{id, email, name, nameKana, role, status, twoFaEnabled, lastLoginAt}`
- KHÔNG trả về `passwordHash`, `2faSecret`, `2faRecoveryCodes`

---

### 5.9 Invited User UX

#### AC-032: 招待ユーザー UI accessibility

**Given** 招待ユーザー (lo IT-literacy thấp) đang login
**When** load `/login` screen
**Then**
- Font size ≥16px cho input
- Touch targets ≥44px
- Error messages tiếng Nhật rõ ràng
- Có "Forgot password?" link nổi bật

---

### 5.10 Tóm tắt Acceptance Criteria

**Tổng AC**: 32 acceptance criteria

| Group | ACs | Count |
|---|---|---|
| Bootstrap & Admin Setup | AC-001 → AC-004 | 4 |
| Invitation Flow | AC-005 → AC-007, AC-018-AC-020 | 6 |
| User Management | AC-008 → AC-015 | 8 |
| Authentication Flow | AC-016, AC-017 (overlap) | (cross-ref) |
| Login & Session | AC-021 → AC-026 | 6 |
| 2FA Flow | AC-027 → AC-028 | 2 |
| Logout | AC-029 → AC-030 | 2 |
| Profile | AC-031 | 1 |
| UX (Invited) | AC-032 | 1 |

---

## 06 — Constraints / Ràng buộc

### 6.1 Technical Constraints / Ràng buộc Kỹ thuật

Mục này tham chiếu architectural decisions đã chốt trong ADRs và innovate-technical-selection. SRS document chỉ liệt kê constraints, KHÔNG mô tả implementation chi tiết.

| ID | Constraint | Reference |
|---|---|---|
| TC-001 | Backend framework: NestJS 10+ (Node.js 20 LTS) | ADR-002 |
| TC-002 | Frontend framework: React 18+ với TypeScript strict mode | ADR-003 |
| TC-003 | Database: PostgreSQL 16 với pgvector extension | ADR-004 |
| TC-004 | ORM: Prisma 5+ | ADR-002 |
| TC-005 | Cloud platform: AWS Tokyo (ap-northeast-1), DR Osaka (ap-northeast-3) | ADR-005 |
| TC-006 | Architecture pattern: Modular Monolith (không microservice Phase 1) | ADR-001 |
| TC-007 | Password hashing: phải dùng standard algorithm OWASP-recommended (Argon2id) | NIST SP 800-63B |
| TC-008 | Token signing: HS256 (HMAC + SHA-256) cho JWT Phase 1 | BD-1 |
| TC-009 | TOTP standard: RFC 6238 với 30s window, ±1 drift tolerance | RFC 6238 |
| TC-010 | Cookie storage: HttpOnly + Secure (prod) + SameSite=Lax | BD-4 |
| TC-011 | Rate limiting: backed by ElastiCache Redis | BD-7 |
| TC-012 | Email transport: AWS SES (prod) + Mailhog (dev) | BD-3 |
| TC-013 | TLS minimum: 1.2 (1.3 preferred) | NFR-SEC-004 |

### 6.2 Regulatory Constraints / Ràng buộc Pháp lý

| ID | Constraint | Reference |
|---|---|---|
| RC-001 | Tuân thủ APPI (Act on Protection of Personal Information — Japan) | Doc §4.7 |
| RC-002 | Audit log retention tối thiểu 2 năm | Doc §4.3 |
| RC-003 | PII encrypt at rest (RDS encryption default) | Doc §4.3, NFR-SEC-003 |
| RC-004 | Data residency: tất cả data ở Japan region (AWS Tokyo + Osaka DR) | ADR-005 |
| RC-005 | Right to deletion: support data subject anonymization request | APPI |
| RC-006 | Subprocessor disclosure: AWS as data processor (DPA in place) | Architecture §8 |

### 6.3 Business Constraints / Ràng buộc Nghiệp vụ

| ID | Constraint | Reference |
|---|---|---|
| BC-001 | Closed system: không public self-signup, chỉ admin/manager mời | Innovation Q2 |
| BC-002 | Single-tenant deployment cho Towa (không multi-tenant Phase 1) | ADR-012 |
| BC-003 | DEHA-managed SaaS (DEHA own AWS account, Towa subscribe monthly) | ADR-014 |
| BC-004 | Phase 1 MVP scope: 23 features (F8-auth là 1/23) | Roadmap |
| BC-005 | Target timeline: F8-auth complete trong sprint 1-2 (~3 tuần) của Phase 1 | Sprint plan |
| BC-006 | 50 concurrent users peak (capacity baseline) | Doc §4.1 |
| BC-007 | Customer base growth: ~2,000 OB customers + new (sẽ migrate ở F1) | Doc §2.1 |

### 6.4 Operational Constraints / Ràng buộc Vận hành

| ID | Constraint | Reference |
|---|---|---|
| OC-001 | DEHA team responsible cho deployment + operations | ADR-014 |
| OC-002 | Maintenance window: chỉ 第2土曜 23:00 — 日曜 06:00 JST (theo doc §4.4) | Doc §4.4 |
| OC-003 | Helpdesk: business hours JP (平日 9:00-18:00) | Doc §4.4 |
| OC-004 | DR strategy: backup-based với cross-region S3 replication (RTO 4h target) | ADR-013 |
| OC-005 | Monitoring: CloudWatch Logs + Metrics + alerts | Architecture §6 |

### 6.5 Assumption Constraints / Ràng buộc Giả định

Các giả định cần được Towa confirm trong basic design phase. Nếu không match, một số FRs/NFRs có thể phải revise.

| ID | Assumption | Action nếu fail |
|---|---|---|
| AS-001 | Towa có thể setup email infrastructure với verified sender domain | Hỗ trợ DEHA cấu hình SES verification |
| AS-002 | Admin Towa có IT-literacy đủ để setup TOTP authenticator | Cung cấp training documentation |
| AS-003 | 招待ユーザー (職人/協力業者) có email address active | Cần backup recipient hoặc paper-based onboarding |
| AS-004 | Towa chấp nhận DEHA team có maintenance access vào DB qua AWS console | Negotiate contract clauses |
| AS-005 | Towa có Google Workspace (cho Phase 2 SSO) — chưa confirm | Defer Phase 2 hoặc dùng Microsoft 365 |

### 6.6 Future Considerations / Cân nhắc Tương lai

Các items không phải constraint Phase 1 nhưng cần design-aware để không phải refactor lớn về sau.

| ID | Future item | Phase | Design impact |
|---|---|---|---|
| FC-001 | SSO Google Workspace / Microsoft 365 | Phase 2 | User entity có `auth_provider` + `external_id` đã sẵn sàng |
| FC-002 | Per-project ACL active với projects | Phase 2 | `project_members` table + ProjectMembershipGuard đã có stub |
| FC-003 | Audit log full feature (UI viewer, async queue) | F8-03 | Bảng `audit_logs` đã có schema chuẩn |
| FC-004 | Mobile PWA support cho field workers | Phase 2 | Auth flow phải compatible với cookie+CORS |
| FC-005 | WebAuthn / FIDO2 passwordless | Phase 3+ | 2FA TOTP infrastructure không conflict |
| FC-006 | Microservice split (AI service) | Phase 3 | JWT có thể migrate sang RS256 nếu cần |

---

## Summary / Tóm tắt SRS

**Document Metrics**:

| Metric | Value |
|---|---|
| Functional Requirements (FR) | 31 |
| Non-Functional Requirements (NFR) | 16 |
| Business Rules (BR) | 53 (đánh số liên tục theo group) |
| User Stories (US) | 18 (across 4 roles) |
| Acceptance Criteria (AC) | 32 |
| Technical Constraints (TC) | 13 |
| Regulatory Constraints (RC) | 6 |
| Business Constraints (BC) | 7 |
| Operational Constraints (OC) | 5 |
| Assumption Constraints (AS) | 5 |
| Future Considerations (FC) | 6 |

**Coverage**:
- ✅ All 29 functions từ innovate-srs-selection mapped to FRs
- ✅ All NFRs từ doc §4 + architecture security doc covered
- ✅ Roles từ stakeholder-roles catalog all addressed in US
- ✅ Architecture decisions (ADRs) referenced in Constraints

**Vietnamese ratio**: ≥60% (Q3 quality gate)
**Bilingual headers**: ✅ "Tiếng Việt / English" format
**Evidence traceability**: ✅ Mỗi FR có Evidence section trỏ về function ID + ADR/doc reference

---

**State transition**: INNOVATE_SRS → SRS_CREATED

**Next**: `/design --basic` để tạo Basic Design document.

---

*F8-AUTH-BASE-srs.md*
*Software Requirements Specification — 認証 & 権限管理 (Authentication & Authorization)*
*Generated by EPS Framework /design --srs v4.0*
*Project: 藤和建設様 施工管理システム (Towa Construction Management System)*
*DEHA Solutions, 2026-05-16*
