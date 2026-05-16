# Evidence Report: F1-CUSTOMER

## Metadata

- **Feature**: F1-CUSTOMER (顧客・案件管理 — quản lý 顧客 + 物件 + 案件)
- **Task Type**: new
- **Module**: f1-customer
- **Scope**: F1-01 → F1-06 (6 sub-features, toàn bộ Phase 1)
- **Generated**: 2026-05-16
- **Developer**: hanq97
- **Branch**: feature/f1-customer
- **Phụ thuộc**: F8-AUTH (đã merge lên develop) — authentication, RBAC, bảng users

---

## Section 1: Business Context [SCOPE:SRS]

### E-SRS-01: Xác nhận scope 6 sub-features (toàn bộ Phase 1)

**Nguồn**: `藤和建設様_施工管理システム_統合ドキュメント.md` dòng 652-657

```
F1-01 顧客マスタ管理         【済】 高 Phase 1 effort=5
F1-02 物件情報管理           【済】 高 Phase 1 effort=4
F1-03 案件登録・ステータス管理 【済】 高 Phase 1 effort=6
F1-04 工事履歴の紐付け管理    【済】拡張 高 Phase 1 effort=4
F1-05 担当者・権限管理        【済】 高 Phase 1 effort=5
F1-06 案件検索・絞り込み       【新】 高 Phase 1 effort=3
```

**Hệ quả**: 5/6 features đánh dấu 【済】 (reusable từ project trước của DEHA), 1 mới (F1-06). Tổng effort 27 — nhưng reuse → effort thực ~15-18.

### E-SRS-02: F1-01 顧客マスタ — user story + acceptance criteria chi tiết

**Nguồn**: 統合ドキュメント dòng 704-717

- **Story**: 営業担当として、過去にお引渡しした顧客の情報と連絡先・物件情報をすぐに参照したいので、顧客マスタから氏名・電話番号・住所で検索して詳細画面を開きたい。
- **Accept criteria**:
  - 顧客一覧 50件/page pagination
  - Search theo 氏名 / 電話 / 住所 / 物件種別
  - Có màn detail customer
  - Edit/create flow cho cả 個人 và 法人
- **API surface**: `GET /customers`, `POST /customers`, `PUT /customers/:id`, `GET /customers/:id`
- **Roles**: system_admin, manager, employee (KHÔNG có invited_worker theo security matrix domain-knowledge §7.1)

### E-SRS-03: F1-02 物件情報 — 1 customer → N properties + handover_date trigger

**Nguồn**: 統合ドキュメント dòng 719-728 + entity-catalog §3

- 1 customer có thể sở hữu NHIỀU properties (戸建 + マンション + 賃貸 v.v.)
- `handover_date` là field quan trọng — set đồng hồ cho aftercare schedule (auto-notify năm 1/3/5/10)
- Upload max 3 ảnh ngoại quan per property (statement tại dòng 724-728)
- **Cần quyết ở /innovate**: backend storage cho ảnh (Phase 1 = local FS, hay S3 ngay từ đầu?)

### E-SRS-04: F1-03 案件 lifecycle + Kanban board view

**Nguồn**: 統合ドキュメント dòng 733-746

- **User story**: 工程管理者として、進行中の全案件のステータスを一画面で把握したいので、案件ボードで「見積中」「着工」「完了」のカード形式で確認できるようにしたい。
- **Accept criteria**:
  - 案件種別 enum: 新築/リフォーム/修繕/アフター
  - status enum (theo entity-catalog §4): quoting/received/construction/completed/handed_over/cancelled
  - **Toggle giữa table view VÀ board (Kanban) view** ← yêu cầu UI mới so với F8 chỉ có table đơn giản
  - 案件ID auto-numbered (format `YYYY-NNNN`)
- **Cần quyết**: drag-drop trong Kanban trigger đổi status? Hay chỉ click menu? (UX call ở /innovate)

### E-SRS-05: F1-04 工事履歴 timeline view — aggregate qua nhiều property

**Nguồn**: 統合ドキュメント dòng 748-760

- **Story**: アフター担当として、OB顧客から問合せが入った際、過去の工事履歴を即時に時系列で確認したいので、顧客詳細画面に履歴タイムラインを表示してほしい。
- **Display**: list chronological mọi project qua mọi property của customer
- Mỗi entry → 1-click navigate đến project detail
- Status 【済】拡張 — base có sẵn, cần enhancement aggregate theo customer

### E-SRS-06: F1-05 案件メンバー — RBAC + ràng buộc invited_user

**Nguồn**: 統合ドキュメント dòng 762-772 + entity-catalog §5

- Mỗi 案件: assign 営業担当 / 工程担当 / 職人
- Role `invited_worker`: CHỈ thấy project được mời (enforce qua membership filter ở mọi project query)
- API: `GET /projects/:id/members`, `POST /projects/:id/invite`
- **Tích hợp với F8-AUTH**: reuse User entity + invitation flow đã có (`POST /users/invitations` đã implement)
- **Cần quyết ở /innovate**: project-level invite reuse invitation global HAY flow riêng "invite to specific project"?

### E-SRS-07: F1-06 多条件検索 — item duy nhất 【新】, gồm CSV export + saved searches

**Nguồn**: 統合ドキュメント dòng 775-786

- AND search nhiều điều kiện: customer × 期間 × status × owner × property_type
- CSV export (audit log PII required theo domain §3.2 / §7.2)
- お気に入り検索条件の保存 — bảng saved filter per-user (nice-to-have Phase 2? Confirm ở /innovate)

### E-SRS-08: Non-functional — performance target liên quan F1

**Nguồn**: 統合ドキュメント §4.1 dòng 319-327

- 同時 50 user: 95%ile response <2s normal, <3s search
- Volume data: 10,000 customers, 5,000 projects target
- → Drives index strategy ở domain-knowledge §6 (pg_bigm cho kana, pg_trgm cho address, B-tree composite cho project filter)

### E-SRS-09: Reminder out of scope

- ❌ F2 見積管理 (branch riêng — F1 chỉ cung cấp project shell để quote link vào)
- ❌ F3 工程・現場 (Phase 2 — folder auto-create ở đây nhưng KHÔNG upload/marker/Gantt)
- ❌ F6 アフター (branch riêng — chỉ emit event `property.handover_date_set`; module aftercare subscribe)
- ❌ 後工程 (検査, 写真, チャット) — toàn bộ Phase 2+

---

## Section 2: Architecture Patterns [SCOPE:BD]

### E-BD-01: Modular Monolith — F1 thêm 2 module mới vào structure

**Nguồn**: `documents/architecture/02-module-architecture.md` §2 dòng 22-23

```
backend/src/modules/
├── auth/          # ✅ Done (F8-AUTH on develop)
├── notification/  # ✅ Done (F8-AUTH)
├── customer/      # ⬅️ NEW (F1-01 + F1-02 + F1-04 home cho customer + property)
├── project/       # ⬅️ NEW (F1-03 + F1-05 + F1-06)
```

- Module `customer` sở hữu: entity customers + properties (1 module, 2 entities — co-located vì property không có vòng đời độc lập)
- Module `project` sở hữu: projects + project_members + folders

### E-BD-02: Module dependency matrix — xác nhận F1 dependencies

**Nguồn**: `documents/architecture/02-module-architecture.md` §4 dòng 73-93

```
Module       │ shared │ auth │ audit │ customer │ project │
customer     │   ✓    │  ✓   │  ✓    │    -     │         │
project      │   ✓    │  ✓   │  ✓    │    ✓     │    -    │
```

- `customer` phụ thuộc `auth` (cho `created_by`/`updated_by` user FK + permission check)
- `project` phụ thuộc `customer` (cho customer FK + customer service lookup)
- **Không reverse dependency**: customer KHÔNG được import project (sẽ tạo cycle khi aftercare subscribe sau này)

### E-BD-03: Reusable infrastructure từ F8-AUTH

**Nguồn**: Codebase scan `backend/src/shared/`
| Reuse | Từ | Dùng cho F1 |
|---|---|---|
| Prisma service | `shared/database/prisma.service.ts` | Giống — inject vào customer/project repo |
| Crypto Argon2/AES/Hash/Random | `shared/crypto/` | Không cần Phase 1 |
| Cookie service | `shared/http/cookie.service.ts` | Không cần |
| AppError + GlobalExceptionFilter | `shared/exceptions/` | Subclass: `CustomerNotFoundError`, `ProjectInvalidStatusTransitionError`, `ProjectOwnerCannotBeRemovedError` |
| Pino logger + trace middleware | `shared/observability/` | Giống — auto-apply cho endpoint mới |
| JWT guard + Roles guard + decorators | `modules/auth/guards/` `decorators/` | Reuse `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('system_admin', 'manager', 'employee')` |
| AuditStubService | `modules/auth/internal/audit-stub.service.ts` | Wire mọi customer/project mutation qua audit |

### E-BD-04: Frontend reusable từ F8-AUTH P7+P8

**Nguồn**: Codebase scan `frontend/src/`
| Reuse | Từ | Dùng cho F1 |
|---|---|---|
| AppLayout (sidebar + header) | `shared/components/layout/AppLayout.tsx` | Đã có nav item 案件管理 / 顧客管理 — sẽ thành link thật |
| Antd theme + design tokens | `app/providers.tsx` + `styles/design-tokens.css` | Giống — brand-500 primary, shadow soft |
| i18n (ja/en/vi) | `shared/i18n/` + `locales/*.json` | Extend với namespace F1: `customer.*`, `property.*`, `project.*` |
| Axios client + 401 refresh | `shared/api/client.ts` | Giống — thêm `customersApi`, `projectsApi` module |
| Auth guards | `shared/components/guards/` | Reuse `AuthGuard` + `RoleGuard` |
| Form pattern: RHF + Zod + Antd Controller | `features/auth/pages/LoginPage.tsx` v.v. | Cùng pattern — Zod schema per form |
| Status pill component | `features/admin/components/StatusTag.tsx` | Pattern reused: `ProjectStatusTag`, `CustomerTypeTag` |
| Modal pattern | `features/admin/components/InviteUserModal.tsx` | Pattern reused cho customer/project create modal |

### E-BD-05: Event-driven integration với module downstream

**Nguồn**: `documents/architecture/02-module-architecture.md` §5.2 dòng 128-136
| Event F1 emit | Subscribers (Phase 1) | Subscribers (Phase 2+) |
|---|---|---|
| `customer.created` | audit, (dashboard sau) | dashboard stats |
| `property.handover_date_set` | (aftercare chưa build) | aftercare (regen maintenance_schedules) |
| `project.created` | audit | dashboard |
| `project.status_changed` | audit | notification (báo stakeholder) |
| `project.member_added` | audit | notification (welcome invitee) |

- NestJS `EventEmitter2` sync in-process Phase 1
- BullMQ async qua Redis Phase 2 khi load cần

### E-BD-06: Database schema strategy

**Nguồn**: `documents/architecture/04-database-design.md` §3-5 + entity-catalog §2-§6

- Tables: `customers`, `properties`, `projects`, `project_members`, `folders` (5 bảng mới)
- Naming: snake_case plural; FK = `<table_singular>_id`
- Mọi entity có audit field: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`
- Pattern soft delete (`deleted_at IS NULL` filter qua Prisma middleware)
- Index theo §5.1 (db design doc):
  - `customers`: GIN bigm trên `name` + `name_kana`, B-tree trên `phone`, GIN trgm trên `address`
  - `projects`: B-tree composite `(status, schedule_start)`, B-tree `(customer_id, created_at desc)`, GIN trên `search_text`
  - Mọi FK index thủ công (PostgreSQL không auto-index FK)

### E-BD-07: Auto-numbering pattern (project_code)

**Nguồn**: domain-knowledge §2.3 + DB design §3.2

- Format: `YYYY-NNNN` (VD: `2026-0001`), reset 0001 mỗi năm
- Options implementation cần quyết ở /innovate:
  - **Option A**: DB sequence per năm (`CREATE SEQUENCE project_code_2026_seq`) — race-safe, đổi năm cần migration
  - **Option B**: App-side `SELECT MAX(...)` trong transaction + retry on conflict — đơn giản, có chút race risk
  - **Option C**: Single global sequence + format ở app — đơn giản nhất, không reset năm (project_code dạng `2026-0042` nhưng là counter toàn cục)

### E-BD-08: Quyết định storage backend (Phase 1)

**Nguồn**: ADR-006 (object storage) + unified doc §4.1 + entity catalog `photo_urls text[]`

- Ảnh ngoại quan property tối đa 3/property
- ADR-006: S3-compatible (AWS S3 prod, MinIO dev/test)
- **Hệ quả Phase 1**: cần quyết F1 có ship với S3 integration HAY defer sang local FS / DB BLOB cho MVP
- **Khuyến nghị innovate**: **defer S3 sang F3 (Phase 2 photo module)** — Phase 1 F1 dùng placeholder ảnh HOẶC file nhỏ lưu base64 trong DB (max 3 ảnh nhỏ/property là quản lý được)

---

## Section 3: Implementation References [SCOPE:DD]

### E-DD-01: NestJS module structure pattern (đã proven ở F8-AUTH)

**Nguồn**: `backend/src/modules/auth/` (trên develop sau khi F8 merge)

```
modules/customer/
├── customer.module.ts              # @Module imports, providers, exports
├── controllers/
│   ├── customers.controller.ts      # @Controller('customers') — thin
│   └── properties.controller.ts     # @Controller('properties')
├── services/
│   ├── customers.service.ts
│   └── properties.service.ts
├── repositories/
│   ├── customer.repository.ts       # Prisma calls only
│   └── property.repository.ts
├── dto/
│   ├── create-customer.dto.ts       # class-validator
│   ├── update-customer.dto.ts
│   ├── list-customers-query.dto.ts
│   └── ... (property DTOs)
└── domain/
    └── types.ts                      # CustomerType, PropertyType enums (mirror Prisma)
```

`modules/project/` shape tương tự (với thêm `services/project-members.service.ts`).

### E-DD-02: API contract pattern (đã proven ở F8-AUTH api-contracts.md)

**Nguồn**: `documents/features/F8-AUTH-hanq97/F8-AUTH-BASE-api-contracts.md` — pattern để follow

- Convention REST: `GET /resources`, `POST /resources`, `GET /resources/:id`, `PUT /resources/:id`, `DELETE /resources/:id`
- Pagination: `?page=1&pageSize=50` query param + response `{ data: [], total, page, pageSize }`
- Sorting: `?sortBy=createdAt&sortOrder=desc`
- Search: `?search=keyword` (server-side FTS qua pg_bigm)
- Filter: query param per-field (`?status=construction&customerId=...`)
- Error response: `{ code: 'CUSTOMER_NOT_FOUND', message: '...', traceId: '...' }`

Endpoint dự kiến F1 (~25 total, sketch — chi tiết ở /design --detail):

```
# Customers
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id     (soft delete; admin only)
GET    /api/v1/customers/:id/properties      # nested
GET    /api/v1/customers/:id/projects        # timeline view cho F1-04
POST   /api/v1/customers/import-csv          # admin migration

# Properties
GET    /api/v1/properties?customerId=...
POST   /api/v1/properties
GET    /api/v1/properties/:id
PUT    /api/v1/properties/:id
DELETE /api/v1/properties/:id

# Projects
GET    /api/v1/projects                       # filter+search+pagination (F1-06)
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
POST   /api/v1/projects/:id/status            # status transition (validated)
GET    /api/v1/projects/export.csv            # F1-06 CSV export (audited)

# Project members (F1-05)
GET    /api/v1/projects/:id/members
POST   /api/v1/projects/:id/members           # assign user
DELETE /api/v1/projects/:id/members/:userId   # remove (soft qua revoked_at)
PUT    /api/v1/projects/:id/members/:userId   # đổi role_on_project
```

### E-DD-03: Frontend routes + feature folders

**Nguồn**: pattern `frontend/src/app/routes.tsx` + nav item AppLayout

```
frontend/src/features/
├── customer/
│   ├── pages/
│   │   ├── CustomersListPage.tsx        # /customers (search + table + pagination)
│   │   ├── CustomerDetailPage.tsx       # /customers/:id (tabs: 概要 / 物件 / 履歴)
│   │   └── CustomerFormPage.tsx         # /customers/new + /customers/:id/edit
│   ├── components/
│   │   ├── CustomerSearchBar.tsx
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyFormModal.tsx
│   │   └── ProjectTimeline.tsx          # F1-04
│   └── schemas/
│       ├── customer.schema.ts            # Zod
│       └── property.schema.ts
├── project/
│   ├── pages/
│   │   ├── ProjectsListPage.tsx          # /projects (toggle table+board, F1-03 + F1-06)
│   │   ├── ProjectDetailPage.tsx         # /projects/:id (tabs: 概要 / メンバー / 工事フォルダ Phase 2)
│   │   └── ProjectFormPage.tsx
│   ├── components/
│   │   ├── ProjectStatusTag.tsx
│   │   ├── ProjectBoardKanban.tsx        # F1-03 board view
│   │   ├── ProjectMembersTab.tsx         # F1-05
│   │   ├── AddMemberModal.tsx
│   │   └── ProjectFiltersPanel.tsx       # F1-06 multi-criteria
│   └── schemas/
│       └── project.schema.ts
```

Route thêm vào `routes.tsx` wrap trong `<AuthGuard>` (và `<RoleGuard>` cho endpoint admin-only).

### E-DD-04: Kanban board — tham chiếu implementation

**Nguồn**: External — pattern phổ biến trong React ecosystem

- Options: `@dnd-kit/core` (modern, accessible, nhỏ hơn) vs `react-beautiful-dnd` (legacy, maintenance mode)
- **Khuyến nghị**: `@dnd-kit` cho code mới (quyết ở /innovate)
- Pattern: 6 cột match enum `status`, card = project item
- Drag-drop call `PUT /projects/:id/status` với status mới → optimistic UI update với rollback on error

### E-DD-05: Prisma schema additions

**Nguồn**: entity-catalog §2-§6 + pattern schema.prisma hiện có

```prisma
// Enum mới
enum CustomerType { individual corporate }
enum PropertyType { new_construction remodel single_family multi_family commercial other }
enum PropertyStructure { wood steel rc other }
enum ProjectType { new_construction remodel repair aftercare }
enum ProjectStatus { quoting received construction completed handed_over cancelled }
enum ProjectMemberRole { owner contributor inspector invited_worker }
enum FolderType { document drawing schedule photo chalkboard inspection custom }

model Customer { ... }
model Property { ... }
model Project { ... }
model ProjectMember { ... }
model Folder { ... }
```

Migration: `pnpm --filter backend prisma:migrate:dev --name add_f1_customer_project`. Gồm seed amend để thêm customer/property/project test.

### E-DD-06: Mở rộng namespace i18n

**Nguồn**: pattern `frontend/src/locales/ja.json` hiện có
Key mới (preview):

```json
{
  "customer": { "title": "顧客管理", "list": { ... }, "form": { ... }, "type": { "individual": "個人", "corporate": "法人" } },
  "property": { "title": "物件", "type": { ... }, "structure": { ... }, "handoverDate": "引渡日" },
  "project": { "title": "案件管理", "code": "案件番号", "type": { ... }, "status": { ... }, "board": { ... }, "members": { ... } }
}
```

Add vào cả 3 locale (ja primary, en + vi) cùng lúc theo rule project-conventions.

### E-DD-07: State management (pattern TanStack Query)

**Nguồn**: `frontend/src/features/admin/pages/UsersListPage.tsx` (pattern đã proven P8)

- Query key per entity + scope: `['customers', 'list', filters]`, `['customers', 'detail', id]`
- Mutation invalidate scope: `useMutation({ onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }) })`
- Optimistic update cho status transition (Kanban drag)
- Stale time 30s (match config hiện có ở `providers.tsx`)

### E-DD-08: Test strategy (post-MVP, plan từ đầu)

- Backend unit: `*.spec.ts` cạnh service file. Mock PrismaService.
- Backend e2e: `test/customer.e2e-spec.ts` chạy với test DB schema
- Frontend: Vitest cho hook/util, Playwright E2E cho golden path (defer giống F8 P9)
- F1 không add test ở implementation đầu nhưng architecture support thêm sau

---

## Validation

Mỗi section ≥2 evidence với source citation. ✅

| Section     | Số evidence |
| ----------- | ----------- |
| [SCOPE:SRS] | 9           |
| [SCOPE:BD]  | 8           |
| [SCOPE:DD]  | 8           |
| **Total**   | **25**      |

**Nguồn tổng**:

- `藤和建設様_施工管理システム_統合ドキュメント.md` (business spec unified)
- `documents/architecture/02-module-architecture.md` (modular monolith + dependency)
- `documents/architecture/04-database-design.md` (schema + index)
- `.claude/memory-bank/master/architecture-dehasol/architect/catalogs/entity-catalog.md`
- Codebase scan: `backend/src/modules/auth/`, `backend/src/shared/`, `frontend/src/`, `backend/prisma/schema.prisma`
- F8-AUTH artifacts (merged develop): pattern module/service/repo, layout frontend feature-slice

---

_Tiếp theo: `/innovate` (Part 1 SRS decisions + Part 2 BD+DD technical decisions)_
