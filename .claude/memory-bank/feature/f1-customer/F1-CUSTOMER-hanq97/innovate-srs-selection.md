# Innovate Part 1: SRS Decisions — F1-CUSTOMER

**Feature**: F1-CUSTOMER (顧客 + 物件 + 案件 management)
**Generated**: 2026-05-16
**Decisions**: 11 quyết định business approach cho SRS
**State transition**: RESEARCHED → INNOVATE_SRS

---

## Tóm tắt quyết định

| #   | Decision                    | Lựa chọn                                         | Phase |
| --- | --------------------------- | ------------------------------------------------ | ----- |
| 1   | F1-06 saved search per-user | **Phase 1** (làm luôn)                           | 1     |
| 2   | Customer dedup              | **Warn on phone match** (không block)            | 1     |
| 3   | Pre-acquisition project     | **Placeholder customer `TBD - 土地仕入れ`**      | 1     |
| 4   | Member invite flow          | **Hybrid: reuse F8 invitation + project-assign** | 1     |
| 5   | CSV import customer         | **UI upload (simple), admin only**               | 1     |
| 6   | Photo storage               | **Base64 trong DB → migrate S3 Phase 2**         | 1     |
| 7   | Audit log scope             | **Mọi mutation + status transition**             | 1     |
| 8   | Kanban UX                   | **Drag-drop + click menu (cả hai)**              | 1     |
| 9   | Reverse status transition   | **Cho phép admin + reason ≥5 chars**             | 1     |
| 10  | F1-04 timeline location     | **Tab 「履歴」 trong CustomerDetailPage**        | 1     |
| 11  | List page default           | **Sort createdAt desc, no filter, 50/page**      | 1     |

---

## Chi tiết quyết định

### D-SRS-01: F1-06 saved searches per-user — Phase 1

**Vấn đề**: User Story F1-06 yêu cầu "お気に入り検索条件の保存". MVP scope question.

**Quyết định**: Làm Phase 1.

**Lý do**:

- 工程管理者 review tháng + 営業 dùng filter hàng ngày → ROI cao
- Bảng đơn `saved_searches (id, user_id, name, filter_json, created_at)` — ~30 phút implementation
- Frontend: dropdown "保存した検索" trong filter panel + save modal

**Tác động**:

- DB: 1 bảng mới `saved_searches`
- API: 3 endpoint `GET /saved-searches`, `POST /saved-searches`, `DELETE /saved-searches/:id`
- FE: dropdown + save dialog trong ProjectFiltersPanel + CustomerSearchBar

### D-SRS-02: Customer duplicate detection — Warn on phone, không block

**Vấn đề**: Domain edge case §5.3 — 同居家族 cùng phone hợp lệ.

**Quyết định**: Khi save customer với phone trùng → hiện modal confirm:

```
「同じ電話番号の顧客が既に存在します：
{existing_customer.name} ({existing_customer.address})
このまま登録しますか？」
```

User confirm → save bình thường. KHÔNG block. Phone KHÔNG phải unique constraint.

**Lý do**:

- 父+息子 cùng nhà, cùng số điện thoại bàn — case nghiệp vụ hợp lệ
- 法人 nhiều người liên hệ cùng đại diện số văn phòng
- Block tuyệt đối → user phải fake phone format → data sai

**Tác động**:

- Endpoint `POST /customers` + `PUT /customers/:id` thực hiện kiểm tra phone trùng → trả về `200 + { duplicateOf: customer_id }` nếu cần confirm, hoặc save thẳng nếu có flag `force=true`
- FE: handle response 200 với duplicateOf → show confirm dialog → retry với `?force=true`

### D-SRS-03: Pre-acquisition project — Placeholder customer

**Vấn đề**: 営業 muốn tạo 案件 cho 土地仕入れ TRƯỚC khi có customer thực.

**Quyết định**: Giữ `projects.customer_id NOT NULL`. Khi user tạo project với checkbox 「土地仕入れ中（顧客未確定）」:

- Backend tự động tạo placeholder customer:
  - `name = "TBD - 土地仕入れ - {project_code}"`
  - `customer_type = individual`
  - `phone = "TBD"`
  - `address = project.notes hoặc empty`
  - `is_ob = false`
- Project link với placeholder customer
- Admin rename placeholder sau khi có customer thực (UPDATE customer.name + các field khác)

**Lý do**:

- Schema clean, không NULL FK
- Audit trail rõ ràng (mỗi placeholder = 1 customer row)
- Migrate sang customer thực = đơn giản (UPDATE row hiện hữu)

**Tác động**:

- FE: ProjectFormPage có checkbox 「土地仕入れ中」 → ẩn customer picker + auto-generate placeholder backend
- BE: trong `createProject` service, nếu request không có customerId + flag preAcquisition=true → tạo placeholder trong cùng transaction

### D-SRS-04: Member invite flow — Hybrid

**Vấn đề**: Project owner muốn add 職人 ngoài (chưa có user trong hệ thống).

**Quyết định**:

- **User mới** (chưa account): admin/manager qua F8 invitation flow (`POST /users/invitations`) — tạo user trước, user nhận email accept, có account
- **Assign user vào project**: `POST /projects/:id/members { userId, roleOnProject }` — chỉ assign user đã tồn tại

UI flow:

```
ProjectMembersTab → click "メンバー追加"
  → Modal: 「ユーザーを選択 / 招待」
    → Tab 1: Pick existing user (autocomplete from /users)
    → Tab 2: Send new invitation (admin only) → after user accepts, manually assign
```

**Lý do**:

- Giữ logic F8 invitation, không duplicate
- Tách bach: tạo user là quyền admin; assign vào project là quyền project owner
- Đơn giản về API contract

**Tác động**:

- Không thêm endpoint mới ngoài `POST /projects/:id/members`
- FE: AddMemberModal có 2 tab — Pick + Invite (link sang F8 InviteUserModal đã có)

### D-SRS-05: CSV import customer — Simple UI upload

**Vấn đề**: 藤和 có ~2,000 OB customers trong hệ cũ. Onboarding bằng tay sẽ tốn nhiều ngày.

**Quyết định**:

- Endpoint `POST /customers/import-csv` (admin only)
- UI: page `/admin/customer-import` với:
  - Drag-drop file upload
  - Preview 10 row đầu (column header detection)
  - Submit → server validate + import + return JSON `{ created, skipped, errors[] }`
  - Error CSV download nếu có row fail
- CSV format: `name, name_kana, phone, email, address, customer_type, is_ob, acquired_at, notes`

**Lý do**:

- Onboarding cho 2,000 OB customers cần tool — không thể manual
- UI đơn giản hơn CLI (admin không cần dev env)
- Phase 2 có thể bổ sung CLI nếu cần (tái sử dụng cùng service)

**Tác động**:

- BE: thêm `customer.import.service.ts` + `CustomerImportController`
- BE: dependency `csv-parse` (lightweight)
- FE: thêm page `/admin/customer-import` (admin only route)
- Time effort: ~0.5 ngày

### D-SRS-06: Property photo storage — Base64 in DB → migrate S3 Phase 2

**Vấn đề**: F1-02 yêu cầu lưu ảnh ngoại quan (max 3/property). Cần lưu ở đâu?

**Quyết định**:

- **Phase 1 (F1)**: `photo_urls text[]` chứa data URI base64 dạng `data:image/jpeg;base64,...`
- **Phase 2 (F3 photo module)**: migrate sang S3 — script đọc base64 từ DB → upload S3 → replace với URL → cleanup

**Constraint**:

- Client-side resize trước upload: `canvas.toDataURL('image/jpeg', 0.7)` với max-width 800px → file ≤100KB
- Max 3 ảnh/property × 10K properties × 100KB = **3 GB tối đa** (chấp nhận được)
- Query list customer/property KHÔNG select `photo_urls` (chỉ load khi detail)

**Lý do**:

- Tránh setup S3 infra phức tạp cho Phase 1 MVP
- Field abstraction friendly: `photo_urls text[]` chứa base64 hoặc URL đều OK
- Migration Phase 2 đơn giản: 1 script chạy 1 lần

**Tác động**:

- BE: thêm validation max 3 element, max 150KB per string (margin safety)
- FE: PropertyFormModal có UploadButton (multiple, max 3) + canvas resize client-side
- DB: `photo_urls` không cần GIN index (không search trong ảnh)

### D-SRS-07: Audit scope — Mutation + status transition

**Vấn đề**: Audit volume vs trail completeness.

**Quyết định**: Audit events:

- ✅ Create customer / property / project → `entity.created` event
- ✅ Update field nào của customer / property / project → `entity.updated` event (capture changed field names, KHÔNG values với PII)
- ✅ Delete (soft) → `entity.deleted` event
- ✅ Status transition project → `project.status_changed` event (old + new status, reason if reverse)
- ✅ Add/remove member → `project.member.changed` event
- ✅ CSV export → 1 event với row count + filter criteria (NO row data)
- ❌ Read access (list/detail) — KHÔNG audit (volume quá cao)
- ❌ Search query — KHÔNG audit content

**Lý do**:

- Match 電帳法 (giữ history 7 năm cho quote, gián tiếp cho customer/project linked)
- Match 個人情報保護法 (audit bulk PII export)
- Volume bearable: ~10-50 events/day Phase 1 (50 users × 1-5 mutation/day)

**Tác động**:

- Reuse `AuditStubService` từ F8-AUTH → wire vào mọi customer/project service mutation
- Thêm event types vào `audit-stub.service.ts` (audit nhiều hơn các event auth-only)
- Update Prisma `audit_logs` table — đã có schema sẵn

### D-SRS-08: Kanban UX — Drag-drop + click menu

**Vấn đề**: F1-03 board view UX.

**Quyết định**:

- **Drag-drop**: Card có thể kéo sang cột khác → trigger confirm modal:
  ```
  「ステータスを '{from_status}' から '{to_status}' に変更しますか？」
  [キャンセル] [変更する]
  ```
- **Click menu**: Trong project detail page và project card menu (3 dots) → "Change status" dropdown → confirm

Cả 2 cách đều available. Mobile (Phase 2 PWA): chỉ click menu (drag khó trên touch).

**Lý do**:

- Drag-drop hợp với Kanban paradigm — 工程管理者 quen dùng
- Click menu là fallback an toàn cho accidental drag
- Confirm modal tránh sai sót (status change irreversible cho non-admin)

**Tác động**:

- Library: `@dnd-kit/core` (quyết định sau ở Part 2 BD+DD)
- FE: ProjectBoardKanban component có DnD context + ConfirmStatusChangeModal
- API: cùng endpoint `POST /projects/:id/status` cho cả 2 UX

### D-SRS-09: Reverse status transition — Admin + reason

**Vấn đề**: User cancel project nhầm, muốn rollback.

**Quyết định**:

- Forward transition: theo state machine (quoting → received → ... → handed_over). Không cho ngược.
- Reverse transition: **CHỈ `system_admin` mới được phép**, qua endpoint riêng `POST /projects/:id/status/reverse { newStatus, reason }`
  - Reason ≥ 5 chars required
  - Audit log entry với event `project.status.reversed` chứa old + new + reason
  - UI: button "Reverse status" ẩn trong "Advanced" dropdown của project detail (admin role only)

**Lý do**:

- Operational reality (clicks nhầm, customer đổi ý)
- Audit trail bảo vệ accountability
- Admin-only tránh lạm dụng

**Tác động**:

- BE: `ProjectsController.reverseStatus()` endpoint, validate role admin + reason
- FE: button trong ProjectDetailPage với RoleGuard, modal nhập reason

### D-SRS-10: F1-04 工事履歴 timeline — Tab trong CustomerDetailPage

**Vấn đề**: Nơi hiển thị timeline lịch sử công trình.

**Quyết định**:

- Trang `/customers/:id` có 3 tab: **概要 (Overview) / 物件 (Properties) / 履歴 (History)**
- Tab 履歴:
  - Query `GET /customers/:id/projects?sort=createdAt&order=desc&pageSize=50`
  - Hiển thị vertical timeline (Antd Timeline component hoặc Tailwind custom)
  - Mỗi item: project_code, project_type icon, status badge, name, schedule_start/end, owner avatar
  - 1-click navigate `/projects/:projectId`

**Lý do**:

- Match unified doc dòng 756: 「顧客詳細（履歴タブ）」
- Context tự nhiên (đang xem customer → xem lịch sử của họ)
- Tab UI quen thuộc, không cần page riêng

**Tác động**:

- FE: CustomerDetailPage có Antd Tabs
- BE: endpoint `GET /customers/:id/projects` đã có trong API contract sketch (chỉ filter theo customer_id)

### D-SRS-11: Default list state — Sort createdAt desc, no filter, 50/page

**Vấn đề**: User mở `/customers` hoặc `/projects` lần đầu → thấy gì?

**Quyết định**:

- Customer list: sort `createdAt desc`, no filter, 50/page → mới nhất trên đầu
- Project list: sort `createdAt desc`, no filter, 50/page
- Filter panel đóng mặc định (toggle hiện khi click filter icon)
- Search bar luôn visible
- Saved filter (D-SRS-01) ở dropdown bên cạnh — user manually load

**Lý do**:

- Phù hợp với F8 users list pattern (đã đỡ user quen)
- Không surprise (filter active mặc định gây confused "why không thấy data nào")
- Saved filter là opt-in (đã decision D-SRS-01)

**Tác động**:

- Code FE: default query state khởi tạo trong useState với sort=createdAt&order=desc
- localStorage save: chỉ saved searches (D-SRS-01), không tự lưu last filter

---

## Function list (mapped sang sub-features)

| Sub                            | Endpoints                                                                                                                                                                     | FE pages                                                                                                                      | DB                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **F1-01 顧客マスタ**           | `GET /customers`, `POST /customers`, `GET /customers/:id`, `PUT /customers/:id`, `DELETE /customers/:id`, `POST /customers/import-csv`                                        | `/customers` (list), `/customers/:id` (detail with 3 tabs), `/customers/new`, `/customers/:id/edit`, `/admin/customer-import` | `customers`              |
| **F1-02 物件情報**             | `GET /properties?customerId=`, `POST /properties`, `GET /properties/:id`, `PUT /properties/:id`, `DELETE /properties/:id`                                                     | Tab 「物件」 trong CustomerDetailPage + PropertyFormModal                                                                     | `properties`             |
| **F1-03 案件登録・ステータス** | `GET /projects`, `POST /projects`, `GET /projects/:id`, `PUT /projects/:id`, `DELETE /projects/:id`, `POST /projects/:id/status`, `POST /projects/:id/status/reverse` (admin) | `/projects` (list/board toggle), `/projects/:id` (detail), `/projects/new`                                                    | `projects`               |
| **F1-04 工事履歴**             | `GET /customers/:id/projects`                                                                                                                                                 | Tab 「履歴」 trong CustomerDetailPage                                                                                         | (reuse `projects` query) |
| **F1-05 担当者・権限**         | `GET /projects/:id/members`, `POST /projects/:id/members`, `PUT /projects/:id/members/:userId`, `DELETE /projects/:id/members/:userId`                                        | Tab 「メンバー」 trong ProjectDetailPage + AddMemberModal                                                                     | `project_members`        |
| **F1-06 案件検索**             | `GET /projects?status=&from=&to=&owner=&customerId=&type=&search=`, `GET /projects/export.csv`, `GET /saved-searches`, `POST /saved-searches`, `DELETE /saved-searches/:id`   | ProjectFiltersPanel + CSV download button + SaveSearchModal                                                                   | `saved_searches`         |

**Total endpoints**: ~30 (incl saved-searches + import-csv)
**Total FE pages/components**: ~12

---

## Open questions (chuyển sang Part 2 Technical)

1. Auto-numbering `project_code` — DB sequence per năm vs single global vs app-side max+1?
2. Kanban library — `@dnd-kit/core` vs `react-beautiful-dnd`?
3. Module split — `customer` module chứa cả properties? Hay tách `property` module riêng?
4. FTS implementation — pg_bigm GIN index level (column-level vs combined tsvector)?
5. Event emission — sync (EventEmitter2) đủ Phase 1 hay BullMQ async từ đầu?
6. Soft delete cascade — khi soft-delete customer, properties + projects xử lý sao?

---

_Next: Part 2 Technical (BD + DD) → quyết định kiến trúc + implementation_
