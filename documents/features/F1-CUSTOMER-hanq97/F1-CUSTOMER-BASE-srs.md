# F1-CUSTOMER — Software Requirements Specification (SRS)

**Feature**: F1 顧客・案件管理 (Customer + Property + Project Management)
**Version**: BASE — 2026-05-16
**Status**: SRS_CREATED
**Author**: hanq97
**Scope**: F1-01 → F1-06, Phase 1 MVP
**Phụ thuộc**: F8-AUTH (đã merge develop) — bảng `users`, JWT auth, RBAC

---

## 1. Mục đích & Phạm vi

### 1.1 Mục đích
Cung cấp khả năng quản lý xuyên suốt **顧客 (khách hàng) → 物件 (bất động sản) → 案件 (dự án thi công)** — bộ ba thực thể nền tảng của hệ thống. F1 là cốt lõi cho mọi luồng nghiệp vụ tiếp theo (F2 見積, F3 工程, F6 アフター).

Mục tiêu cụ thể:
- Quản lý 顧客マスタ (khách hàng OB + khách mới) với 検索 nhanh theo 氏名/フリガナ/電話/住所
- Lưu trữ thông tin 物件 (cấu trúc, 築年, 引渡日) gắn với khách
- Vận hành 案件 qua state machine 見積中→受注→着工→完成→引渡 với 担当者 + ステータス
- Cung cấp 履歴 (lịch sử công trình) per-customer cho アフター対応
- Migration data từ hệ thống cũ (~2,000 OB customers) qua CSV import

### 1.2 Trong phạm vi (In Scope)

| ID | Sub-feature | Phase |
|---|---|---|
| F1-01 | 顧客マスタ管理 — CRUD + search + CSV import | 1 |
| F1-02 | 物件情報管理 — CRUD, link customer 1:N, ảnh base64 max 3 | 1 |
| F1-03 | 案件登録・ステータス管理 — CRUD + state machine + Kanban board | 1 |
| F1-04 | 工事履歴の紐付け管理 — Timeline view in CustomerDetailPage | 1 |
| F1-05 | 担当者・権限管理 — project_members junction + invited_user constraint | 1 |
| F1-06 | 案件検索・絞り込み — Multi-criteria filter + CSV export + saved searches | 1 |

### 1.3 Ngoài phạm vi (Out of Scope)
- ❌ F2 見積管理 (branch riêng — F1 chỉ cung cấp project shell để quote link)
- ❌ F3 工程・現場 (Phase 2 — folder auto-create ở F1 nhưng KHÔNG upload/marker/Gantt)
- ❌ F4 コミュニケーション (Phase 2)
- ❌ F5 検査・品質 (Phase 2)
- ❌ F6 アフター (branch riêng — F1 emit event `property.handover_date_set`)
- ❌ F7 ダッシュボード (Phase 3)
- ❌ Postal code 郵便番号 lookup (Phase 2)
- ❌ S3 photo storage (defer F3 Phase 2 — F1 dùng base64 trong DB)
- ❌ Customer merge tool (Phase 2)
- ❌ Full FTS Japanese qua pg_bigm (Phase 1 dùng `'simple'` config + pg_trgm)

---

## 2. Stakeholders & Roles

| Role | Quyền F1 chính |
|---|---|
| **system_admin** | Full CRUD mọi entity, delete (soft) customer/property/project, reverse status transition, CSV import, emergency 2FA disable cho user khác |
| **manager** | Full CRUD customer/property, tạo project + assign member, KHÔNG delete customer, KHÔNG reverse status |
| **employee** | List/view customer/project, create + edit own customer/property/project, KHÔNG delete, KHÔNG CSV export |
| **invited** (職人/協力業者) | CHỈ xem projects được assign, KHÔNG list customer, KHÔNG mutation |

Chi tiết authorization matrix: xem domain-knowledge §7.1.

---

## 3. Functional Requirements

### 3.1 F1-01 顧客マスタ管理

#### FR-CUS-001: Tạo khách hàng
- **Trigger**: User (admin/manager/employee) click 「顧客を新規登録」
- **Input**: `customer_type` (個人/法人), `name` (≤200), `name_kana` (≤200), `phone` (chuẩn hóa), `email` (optional, ≤255), `address`, `is_ob` (boolean), `acquired_at` (date, optional), `notes` (optional)
- **Business rules**:
  - `phone` normalize: strip `-`, ` `, `（）`, `()` trước khi save
  - **Duplicate detection**: nếu phone match customer hiện hữu → response 200 với `{ duplicateOf: { id, name, address } }` thay vì save. FE hiện modal confirm → retry với `?force=true` query param
  - Với 個人: name = 氏名, với 法人: name = 会社名
  - `is_ob = true` nghĩa khách đã từng có project handed_over (manual flag hoặc auto-derived qua event)
- **Output**: 201 Created với customer DTO
- **Audit**: event `customer.created`

#### FR-CUS-002: Cập nhật khách hàng
- **Trigger**: User click 「編集」 trong CustomerDetailPage
- **Input**: same as create, all fields optional (partial update)
- **Business rules**:
  - Phone re-normalize nếu thay đổi
  - Duplicate check apply tương tự create
  - employee chỉ update được customer họ tạo (created_by check); manager/admin update bất kỳ
- **Output**: 200 OK với updated customer DTO
- **Audit**: event `customer.updated` với list changed fields (KHÔNG capture PII values)

#### FR-CUS-003: Tìm kiếm khách hàng
- **Trigger**: User nhập keyword trong search bar / filter
- **Input**: `search` (FTS keyword), `is_ob` (boolean filter), `propertyType` (filter qua join properties)
- **Behavior**:
  - FTS query trên `customers.search_text` (tsvector generated từ name + name_kana + phone + address)
  - Combined với pg_trgm cho fuzzy match
  - Pagination 50/page mặc định
  - Sort `created_at desc` mặc định
- **Output**: list 50 customer + pagination metadata
- **Target performance**: <500ms với 10K customer (theo NFR 4.1)

#### FR-CUS-004: Xóa khách hàng (soft delete)
- **Trigger**: admin click 「削除」
- **Business rules**:
  - **Block** nếu còn project với `status NOT IN (handed_over, cancelled)` → response 409 `{ code: CUSTOMER_HAS_ACTIVE_PROJECTS, count, projectIds }`
  - FE hiện modal liệt kê active projects → user phải xử lý từng project trước
  - Set `deleted_at = NOW()`, KHÔNG cascade properties/projects (soft delete chỉ customer)
- **Audit**: event `customer.deleted` với reason (optional input)

#### FR-CUS-005: CSV Import (admin only)
- **Trigger**: admin truy cập `/admin/customer-import`, upload CSV file
- **Input**: CSV file (~2,000 rows expected), columns: `name, name_kana, phone, email, address, customer_type, is_ob, acquired_at, notes`
- **Behavior**:
  - Backend parse CSV (csv-parse lib)
  - Validate từng row (name required, phone format)
  - Skip duplicate theo phone (record skipped count)
  - Insert hợp lệ qua transaction batch
  - Output JSON `{ created: N, skipped: M, errors: [{ rowIndex, message }] }`
  - Nếu có errors → cho download error CSV để fix + retry
- **Audit**: event `customer.csv_imported` với count summary (KHÔNG log từng row)
- **Performance**: 2,000 rows nên hoàn tất <30s

### 3.2 F1-02 物件情報管理

#### FR-PRP-001: Tạo / cập nhật property
- **Trigger**: User click 「物件を追加」 trong CustomerDetailPage → mở PropertyFormModal
- **Input**: `address`, `property_type`, `structure`, `year_built` (int), `handover_date` (date, optional), `floor_area_sqm` (decimal, optional), `photo_urls` (array max 3 base64 strings), `notes` (optional)
- **Business rules**:
  - `customer_id` lấy từ context (URL `/customers/:customerId`)
  - Photo upload qua client-side resize: max-width 800px + JPEG quality 0.7 → ≤100KB per ảnh
  - Validation: max 3 ảnh, mỗi ảnh ≤150KB margin (encode base64)
  - **Khi `handover_date` thay đổi (set hoặc update)** → emit event `property.handover_date_set`
- **Output**: 201/200 với property DTO

#### FR-PRP-002: Xóa property (soft delete)
- **Trigger**: admin/manager click delete
- **Business rules**: Block nếu có project active reference property → 409
- **Audit**: event `property.deleted`

### 3.3 F1-03 案件登録・ステータス管理

#### FR-PRJ-001: Tạo project
- **Trigger**: User click 「案件を新規登録」
- **Input**:
  - `customer_id` (uuid, required UNLESS pre-acquisition flag)
  - `pre_acquisition` (boolean, optional) — nếu true: backend tự tạo placeholder customer
  - `property_id` (uuid, optional)
  - `project_type` (enum: new_construction/remodel/repair/aftercare)
  - `name` (varchar 200, required)
  - `description` (text, optional)
  - `owner_user_id` (uuid, required, role ∈ admin/manager/employee)
  - `schedule_start`, `schedule_end` (date, optional)
- **Business rules**:
  - **Auto-generate `project_code`**: format `YYYY-NNNN` qua DB sequence `project_code_seq_<YYYY>` (auto-create on demand)
  - Status mặc định `quoting`
  - **Pre-acquisition flow**: nếu `pre_acquisition=true`:
    - Auto-create customer với `name="TBD - 土地仕入れ - {project_code}"`, `customer_type=individual`, `phone="TBD"`, `is_ob=false`
    - Link project với placeholder customer
    - Trong cùng transaction
  - **Folder auto-create**: 6 folder mặc định (文書/図面/工程/写真/黒板/検査) tạo trong cùng transaction với project
  - **Owner auto-add to members**: insert `project_members` row với `role_on_project=owner`
- **Output**: 201 với project DTO (kèm folders + initial member)
- **Audit**: event `project.created`

#### FR-PRJ-002: State machine transition
- **Trigger**: User click status change (drag-drop Kanban OR menu)
- **Input**: `newStatus` (enum)
- **Business rules — Forward transitions**:
  ```
  quoting → received  (yêu cầu amount_total ≥ 0)
  received → construction  (set actual_start = today nếu chưa có)
  construction → completed  (set actual_end = today)
  completed → handed_over  (yêu cầu property linked + property.handover_date set)
  ANY → cancelled  (yêu cầu reason ≥5 chars)
  ```
- **Validation chi tiết**:
  - `quoting → received`: nếu chưa có `amount_total`, request phải kèm `amount_total` trong body
  - `completed → handed_over`: backend check `property.handover_date IS NOT NULL`; nếu null, response 400 với hướng dẫn
- **Endpoint**: `POST /projects/:id/status` body `{ newStatus, reason?, amountTotal? }`
- **Frontend UX**: drag-drop hiển thị confirm modal trước khi gọi API (D-SRS-08)
- **Audit**: event `project.status_changed` với `{ from, to, reason? }`

#### FR-PRJ-003: Reverse status transition (admin only)
- **Trigger**: admin click "Reverse status" trong "Advanced" dropdown
- **Endpoint**: `POST /projects/:id/status/reverse` body `{ newStatus, reason }` (reason ≥5 chars required)
- **Business rules**:
  - Chỉ `system_admin` được phép
  - Cho phép any → any (admin trách nhiệm)
  - Audit event `project.status.reversed` với old + new + reason
- **UI**: ẩn trong dropdown advanced để tránh accidental click

#### FR-PRJ-004: Xóa project (soft delete, admin only)
- **Trigger**: admin click delete
- **Business rules**: Block nếu có quote linked (Phase 2 check khi F2 implement; Phase 1 luôn allow)
- **Audit**: event `project.deleted`

### 3.4 F1-04 工事履歴の紐付け管理

#### FR-HIS-001: Customer timeline view
- **Trigger**: User mở CustomerDetailPage → tab 「履歴」
- **API**: `GET /customers/:customerId/projects?sortBy=createdAt&sortOrder=desc&pageSize=50`
- **Output**: list project sort by createdAt desc, kèm `project_code`, `project_type`, `status`, `name`, `schedule_start/end`, `owner.name`
- **Behavior**:
  - Hiển thị vertical timeline (Antd Timeline component)
  - Mỗi item icon theo `project_type`, badge theo `status`
  - 1-click → navigate `/projects/:id`
  - Pagination nếu >50 projects (rare)

### 3.5 F1-05 担当者・権限管理

#### FR-MEM-001: List members của project
- **API**: `GET /projects/:id/members`
- **Output**: array `{ userId, user: { name, email, role }, roleOnProject, invitedAt, revokedAt }`

#### FR-MEM-002: Add member
- **Trigger**: project owner / admin / manager click 「メンバー追加」
- **Input**: `userId` (uuid), `roleOnProject` (enum: owner/contributor/inspector/invited_worker)
- **Business rules**:
  - User phải tồn tại + status = active
  - Không cho phép duplicate (project_id + user_id UNIQUE constraint)
  - `roleOnProject = owner` → đồng thời update `projects.owner_user_id`
  - **Hybrid invite flow** (D-SRS-04): với user mới chưa account → admin tạo qua F8 invitation flow trước, sau đó assign vào project
- **Output**: 201 với member DTO
- **Audit**: event `project.member_added`

#### FR-MEM-003: Update role on project
- **API**: `PUT /projects/:id/members/:userId` body `{ roleOnProject }`
- **Business rules**:
  - Cannot demote last owner — nếu chỉ còn 1 `role_on_project=owner`, block change
- **Audit**: event `project.member_role_changed`

#### FR-MEM-004: Remove member
- **API**: `DELETE /projects/:id/members/:userId`
- **Business rules**:
  - Soft delete: set `revoked_at = NOW()`, KHÔNG hard delete (audit trail)
  - Cannot remove last owner
- **Audit**: event `project.member_removed`

#### FR-MEM-005: Invited_worker access restriction
- **Behavior cross-cutting**:
  - Mọi `GET /projects` query phải filter `WHERE user_id ∈ project_members WHERE user_id = current_user.id AND revoked_at IS NULL` nếu `current_user.role = invited`
  - `GET /projects/:id` 403 nếu invited_worker không là member
  - `GET /customers/*` 403 hoàn toàn cho invited_worker

### 3.6 F1-06 案件検索・絞り込み

#### FR-SCH-001: Multi-criteria filter
- **Trigger**: User mở filter panel trong ProjectsListPage
- **Input** (all optional):
  - `search` (FTS keyword qua project.search_text)
  - `status` (array enum)
  - `customerId` (uuid)
  - `ownerUserId` (uuid)
  - `projectType` (array enum)
  - `from`, `to` (date range trên `schedule_start`)
- **Behavior**: AND của các điều kiện. Pagination 50/page. Sort default `created_at desc`.
- **Output**: list project DTOs + count

#### FR-SCH-002: CSV export
- **API**: `GET /projects/export.csv?<same filters>`
- **Output**: text/csv với columns: project_code, name, customer_name, property_address, status, project_type, owner_name, schedule_start, schedule_end, actual_start, actual_end, amount_total, created_at
- **Authorization**: admin/manager only (NOT employee, NOT invited)
- **Audit**: event `project.csv_exported` với `{ rowCount, filterCriteria }` (NOT row data)
- **Performance**: 5K rows max — stream response, no in-memory accumulation

#### FR-SCH-003: Saved searches (per-user)
- **APIs**:
  - `GET /saved-searches?scope=projects|customers` → list user's saved searches
  - `POST /saved-searches` body `{ name, scope, filterJson }`
  - `DELETE /saved-searches/:id`
- **DB**: bảng `saved_searches (id, user_id, name, scope, filter_json, created_at)`
- **FE**: dropdown「保存した検索」trong ProjectFiltersPanel — chọn → auto-populate filter, hoặc click「保存」để save current filter với name

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Customer search: <500ms tại 10K customer (NFR theo unified doc §4.1)
- Project list filter: <1s tại 5K project
- Timeline view (FR-HIS-001): <800ms cho customer có ≤50 projects
- CSV export 5K rows: <30s
- CSV import 2K rows: <30s

### 4.2 Reliability
- Soft delete: KHÔNG hard delete trừ admin maintenance script
- Audit log: persist tất cả mutation + status transition (D-DD-03)
- Project status transitions: bảo đảm atomic (transaction)
- Project creation: folders + member + customer placeholder (nếu pre-acq) tất cả trong cùng 1 transaction — rollback nếu fail bước nào

### 4.3 Security
- Phone/email/address → PII, KHÔNG log plaintext (Pino redaction)
- CSV export audit log có rowCount + filters, KHÔNG có row data
- Invited_worker access: enforce ở service layer (mọi query có membership filter)
- Cross-customer access: employee chỉ update customer mình tạo (created_by check)

### 4.4 Internationalization
- UI mặc định 日本語; switcher cho EN + VI (D-DD-FE từ F8)
- Backend error codes → FE map qua i18n key (đã có pattern F8)
- Date format theo Antd locale (ja_JP/en_US/vi_VN)

### 4.5 Accessibility
- Form labels có proper `<label>` association
- Kanban drag-drop support keyboard (qua @dnd-kit accessibility features)
- Status badges có sufficient color contrast (≥4.5:1)

### 4.6 Scalability (Phase 1 target)
- 10K customers
- 12K properties (~1.2 per customer)
- 5K projects active + historical
- 30K project_members (~6 members avg)
- DB instance: db.t4g.medium (2 vCPU, 4GB RAM) — đủ cho Phase 1

---

## 5. Use Cases / User Stories

### UC-01: 営業 Tìm khách OB qua điện thoại
**Actor**: employee (営業担当)
**Goal**: Mở customer detail để xem 履歴 khi khách OB gọi điện
1. 営業 vào `/customers`, nhập số điện thoại trong search bar
2. Hệ thống FTS qua `phone` field, match exact (đã normalize)
3. Hiện ≤5 kết quả; nếu chỉ 1 → tự động navigate detail
4. CustomerDetailPage hiện tab 履歴 → 営業 thấy danh sách projects với 引渡日, status
5. 営業 click vào project gần nhất để xem chi tiết

### UC-02: 工程管理者 Kéo case từ 着工 sang 完成
**Actor**: manager (工程管理者)
**Goal**: Update status nhanh qua Kanban board
1. Manager vào `/projects` toggle sang board view
2. Drag card project từ cột `construction` sang `completed`
3. Modal confirm: 「案件「{name}」を 完了 にしますか？actual_endが今日に設定されます」
4. Confirm → API call → optimistic UI update
5. Audit log entry tạo

### UC-03: Admin Migration 2,000 OB customers
**Actor**: system_admin
**Goal**: Import legacy CSV
1. Admin vào `/admin/customer-import`
2. Upload `customers.csv` (export từ 顧客管理ソフト cũ)
3. Preview 10 rows → confirm format đúng
4. Submit → spinner
5. Result: `{ created: 1873, skipped: 127, errors: 0 }`
6. Skipped 127 do duplicate phone → admin download report để verify

### UC-04: 土地仕入れ trước khi có khách thực
**Actor**: manager (営業マネージャー)
**Goal**: Track cơ hội mua đất trước khi khách ký
1. Manager click 「案件を新規登録」
2. Chọn checkbox 「土地仕入れ中（顧客未確定）」
3. Form ẩn customer picker
4. Submit → backend tự tạo placeholder customer + project link
5. 2 tuần sau khách thực ký → admin vào CustomerDetailPage của placeholder → 編集 → đổi tên + phone + address → save
6. Project tiếp tục dùng customer_id cũ (không cần migrate)

### UC-05: Invited_worker 職人 access constraint
**Actor**: invited (職人 ngoài)
**Goal**: Chỉ thấy project mình được mời
1. 職人 login bằng account đã được admin mời
2. AppLayout sidebar KHÔNG hiện nav "顧客管理" (RoleGuard check)
3. Click "案件管理" → list chỉ hiện projects được assign
4. Cố gắng `/customers/<id>` URL trực tiếp → 403 + redirect /home
5. Cố gắng `/projects/<not-assigned-id>` → 403

---

## 6. Business Rules Reference

| BR ID | Rule | Source |
|---|---|---|
| BR-CUS-001 | Phone always normalize trước save | D-SRS-02 |
| BR-CUS-002 | Duplicate phone → warn, không block | D-SRS-02 |
| BR-CUS-003 | Customer soft-delete block nếu còn active project | D-BD-03 |
| BR-CUS-004 | OB flag derived từ project.status=handed_over (event-driven) | domain §2.1 |
| BR-PRP-001 | Property luôn link customer (NOT NULL) | entity-catalog §3 |
| BR-PRP-002 | handover_date thay đổi → emit event aftercare module subscribe | domain §2.2 |
| BR-PRP-003 | Photo max 3, base64 ≤150KB/ảnh, total ≤450KB/property | D-SRS-06 |
| BR-PRJ-001 | project_code format YYYY-NNNN, reset 0001 mỗi năm | D-BD-02 |
| BR-PRJ-002 | Project state machine forward 1 chiều theo enum order | FR-PRJ-002 |
| BR-PRJ-003 | Reverse transition chỉ admin + reason ≥5 chars | D-SRS-09 |
| BR-PRJ-004 | Pre-acquisition: placeholder customer, customer_id NOT NULL | D-SRS-03 |
| BR-PRJ-005 | 6 folders auto-create on project insert | F3-06 unified doc |
| BR-PRJ-006 | owner_user_id ↔ project_members(role=owner) đồng bộ | FR-MEM-002 |
| BR-MEM-001 | UNIQUE(project_id, user_id) | entity-catalog §5 |
| BR-MEM-002 | Cannot demote/remove last owner | FR-MEM-003 |
| BR-MEM-003 | invited_worker query filter by membership | FR-MEM-005 |
| BR-SCH-001 | Saved searches per-user | D-SRS-01 |
| BR-SCH-002 | CSV export audit log có rowCount + filter, KHÔNG có row data | NFR 4.3 |

---

## 7. Data Model (high-level)

```
┌──────────────┐
│  customers   │ 1 ──── N ┐
│ id, name,    │           │
│ phone, ...   │           │
└──────────────┘           ▼
       │ 1            ┌──────────────┐
       │              │  properties  │
       │              │ id, address, │
       │              │ handover_..  │
       │              └──────────────┘
       │ N                  │ 0..1
       │                    │
       ▼                    ▼
┌──────────────┐
│   projects   │ 1 ──── N ┌──────────────────┐
│ id, code,    │           │ project_members  │
│ status, ...  │           │ user_id+role     │
└──────────────┘           └──────────────────┘
       │ 1                            │ N
       │                              ▼
       │ N                       ┌─────────┐
       ▼                         │  users  │
┌──────────────┐                 └─────────┘
│   folders    │
│ 6/project    │
└──────────────┘

┌─────────────────┐
│ saved_searches  │ N ──── 1 users
│ user_id, scope, │
│ filter_json     │
└─────────────────┘
```

Chi tiết schema xem `F1-CUSTOMER-BASE-basic-design.md` §3.

---

## 8. UI/UX Requirements

### 8.1 Pages mới
| Path | Page | Role |
|---|---|---|
| `/customers` | CustomersListPage | admin/manager/employee |
| `/customers/new` | CustomerFormPage (create) | admin/manager/employee |
| `/customers/:id` | CustomerDetailPage (tabs: 概要/物件/履歴) | admin/manager/employee |
| `/customers/:id/edit` | CustomerFormPage (edit) | admin/manager/employee (own only for employee) |
| `/admin/customer-import` | CustomerImportPage | system_admin only |
| `/projects` | ProjectsListPage (table/board toggle) | all auth (invited filtered) |
| `/projects/new` | ProjectFormPage | admin/manager/employee |
| `/projects/:id` | ProjectDetailPage (tabs: 概要/メンバー/フォルダ) | per membership |
| `/projects/:id/edit` | ProjectFormPage (edit) | owner+admin+manager |

### 8.2 Components mới
- `CustomerSearchBar` — search input + FTS query
- `CustomerTypeTag` — pill badge cho 個人/法人
- `PropertyCard` — display block + ảnh preview
- `PropertyFormModal` — upload ảnh client-side resize
- `ProjectStatusTag` — pill badge với màu per status
- `ProjectBoardKanban` — @dnd-kit drag-drop, 6 cột
- `ProjectMembersTab` — list + add modal
- `AddMemberModal` — 2 tab (pick existing / invite new link sang F8)
- `ProjectFiltersPanel` — multi-criteria + saved searches dropdown
- `SaveSearchModal` — save current filter
- `ProjectTimeline` — Antd Timeline component cho F1-04
- `ConfirmStatusChangeModal` — drag-drop confirm

### 8.3 Wireframe key (xem F1-CUSTOMER-BASE-frontend-detail-design.md cho detail)
- CustomerDetailPage: header + tabs nav + tab content
- ProjectsListPage: filter bar + table/board toggle + (table | board) + pagination
- ProjectBoardKanban: 6 cột vertical, mỗi cột header status + count + cards

### 8.4 Empty states & loading
- Empty customers: illustration + CTA「最初の顧客を登録」
- Empty projects: illustration + CTA「最初の案件を登録」
- Loading: skeleton table rows (no spinner)
- Photo upload progress: indeterminate bar trong modal

---

## 9. Acceptance Criteria (golden paths)

| AC | Description |
|---|---|
| AC-01 | Tạo customer 個人 với required fields → 201 + customer hiện trong list |
| AC-02 | Search customer theo phone exact match → 1 kết quả |
| AC-03 | Tạo property cho customer hiện hữu với handover_date → 201 + audit event |
| AC-04 | Tạo project mới → project_code auto-gen `2026-NNNN` + 6 folders + 1 member (owner) |
| AC-05 | Drag-drop status quoting→received với amount_total → success + audit |
| AC-06 | admin reverse cancelled→quoting với reason ≥5 chars → success + audit `reversed` event |
| AC-07 | Pre-acq project: placeholder customer auto-created với tên `TBD - 土地仕入れ - 2026-NNNN` |
| AC-08 | Customer detail tab 履歴 → list projects sort desc by createdAt + 1-click navigate |
| AC-09 | Add invited_worker member → user thấy được project + list /projects filtered |
| AC-10 | CSV export với filter status=construction → file CSV download + audit log có rowCount |
| AC-11 | CSV import 2K row với 5 duplicate → response `{ created: 1995, skipped: 5, errors: 0 }` |
| AC-12 | Saved search save+load: filter restore exact state |
| AC-13 | Soft-delete customer có active project → 409 + UI hiện list project blockers |
| AC-14 | invited_worker `/customers` → 403 redirect /home |

---

## 10. Risks & Assumptions

### Risks
- **R1**: pg_bigm performance khi 10K customer + Japanese search — Phase 1 dùng `'simple'` FTS có thể không tối ưu cho Japanese partial match. **Mitigation**: pg_trgm bổ sung cho fuzzy; Phase 2 cài pg_bigm nếu cần
- **R2**: Photo base64 phình DB — 3 GB tối đa nếu mọi property có ảnh đầy đủ. **Mitigation**: client-side resize ≤100KB; Phase 2 migrate S3
- **R3**: Concurrent project_code gen race — đã mitigate qua DB sequence per-year
- **R4**: Customer placeholder pollution — pre-acq projects nhiều mà không rename → list customer bị nhiễu. **Mitigation**: filter `name LIKE 'TBD%'` cho admin view "pending customers"; cron reminder Phase 2

### Assumptions
- Backend F8-AUTH đã merge develop, JWT cookie auth + RBAC hoạt động
- PostgreSQL extensions `uuid-ossp`, `pgcrypto`, `pg_trgm` đã enabled (cài Phase 1 migration đầu)
- Frontend i18n stack (i18next + dayjs locale) đã có (F8)
- Docker compose dev (postgres + redis + mailhog) đang chạy
- Dev có authenticator app (Google/Microsoft Authenticator) để test 2FA flow F8

---

## 11. Dependencies

### Upstream (F1 cần)
- F8-AUTH ✅ users table, JWT auth, RBAC, AuditService (đã merge develop)
- ADR-001 Modular Monolith, ADR-002 NestJS, ADR-003 React, ADR-004 PostgreSQL+Prisma, ADR-007 search strategy

### Downstream (sẽ depend on F1)
- F2 見積管理: dùng `projects.id` + `customer_name` snapshot + (Phase 1 simple integration)
- F3 工程・現場 (Phase 2): F3 photo module migrate ảnh từ base64 sang S3
- F6 アフター (separate branch): subscribe event `property.handover_date_set`
- F7 ダッシュボード (Phase 3): aggregate projects + customers stats

---

## 12. Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| 顧客 (kokyaku) | Khách hàng — individual hoặc corporate |
| 物件 (bukken) | Bất động sản — nhà/đất link với customer |
| 案件 (anken) | Dự án thi công — new construction / remodel / repair / aftercare |
| 引渡日 (hikiwatashi-bi) | Ngày bàn giao công trình — trigger cho aftercare schedule |
| OB顧客 | Old Buyer customer — đã từng có project handed_over |
| 工程 (kōtei) | Quy trình thi công — Phase 2 (Gantt + photo + drawing) |
| 担当者 (tantōsha) | Người phụ trách (営業/工程/職人) — gắn với project qua project_members |
| 招待ユーザー | Invited user (職人 / 協力業者) — restricted access to assigned projects only |
| 履歴 (rireki) | Lịch sử — timeline view của projects per customer |
| Kanban (ja: カンバン) | Board view với status columns + drag-drop |

---

*Generated by /design --srs as part of /innovate auto-chain — EPS Framework v9.0*
*Next: F1-CUSTOMER-BASE-basic-design.md (BD)*
