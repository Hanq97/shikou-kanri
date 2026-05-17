# Domain Knowledge: F1 顧客・案件管理

**Feature**: F1-CUSTOMER (顧客 + 物件 + 案件 management)
**Phase**: 1 (MVP)
**Sub-features**: F1-01 → F1-06
**Generated**: 2026-05-16
**Khách hàng đích**: 藤和建設様 (Towa Construction, thành lập 1975, 埼玉県所沢市) — công ty xây dựng - bất động sản tổng hợp, có khoảng 2,000 khách hàng OB, 90% doanh thu リフォーム đến từ OB pipeline.

---

## 1. Workflow chuẩn (HIGH priority)

### 1.1 新築案件 (Xây mới) — vòng đời đầy đủ

```
土地仕入れ → 顧客契約 → 設計/見積 → 案件登録 (status=quoting)
  → 受注 (status=received, amount_total set)
  → 着工 (status=construction, actual_start set)
  → 検査・是正 (Phase 2)
  → 完成・引渡 (status=handed_over, property.handover_date set)
  → アフター登録 (trigger maintenance_schedules)
```

**Scope F1**: bao quát các transition 案件登録 → 受注 → 着工 → 引渡. Pre-acquisition (土地仕入れ trước khi 顧客 ký) xử lý bằng cách cho phép `projects.property_id` tạm thời NULL.

### 1.2 リフォーム案件 (Sửa chữa từ khách OB) — đường dẫn 90% doanh thu

```
OB顧客リスト → chọn khách hiện hữu → 現地調査 → tham chiếu case cũ
  → tạo 見積 (cho phép 流用, F2-03) → 受注 → 工程表 (Phase 2)
  → 施工 → 検査 → 完了 → アフター履歴登録
```

**Scope F1**: chọn khách hiện hữu (customer search), 過去案件 timeline view (F1-04), tạo 案件 với `project_type=remodel`.

### 1.3 アフターサービス (Theo dõi sau bàn giao)

```
Tự động xác định số năm sau 竣工 (F6-02) → プレ通知 trước 14 ngày → phân công 担当者
  → liên hệ khách → thăm + kiểm tra → ghi kết quả → chuyển sang リフォーム見積 nếu cần
```

**Scope F1**: cung cấp data 顧客 + 物件 + lịch sử; module aftercare (F6) đọc qua public API của module customer.

---

## 2. Entity cốt lõi & Business rule (HIGH priority)

### 2.1 顧客 (customers)

| Field         | Type                             | Business rule                                                             |
| ------------- | -------------------------------- | ------------------------------------------------------------------------- |
| customer_type | enum: `individual` / `corporate` | 個人 có name + name_kana; 法人 có 会社名 + (option) 担当者名              |
| name          | varchar(200)                     | Required. Với 法人 = 会社名                                               |
| name_kana     | varchar(200)                     | フリガナ để search theo kana (chuẩn hóa 半角/全角)                        |
| phone         | varchar(20)                      | Định dạng chuẩn `0312345678` / `09012345678` — bỏ dấu gạch/space khi save |
| address       | text                             | Free-form. Hỗ trợ 〒 lookup ở Phase 2                                     |
| is_ob         | boolean                          | Cờ OB顧客 (Old Buyer) — đã có project handed_over tại 藤和                |
| acquired_at   | date                             | 初回取引日 — dùng cho phân khúc OB                                        |
| email         | varchar(255) NULL                | Optional — khách OB lớn tuổi thường không có                              |

**Business rules**:

- `is_ob = true` nghĩa là khách có ≥1 project đã `handed_over` — auto-derive khi `project.status = handed_over` (event-driven, không lưu giá trị đã derived)
- **Chuẩn hóa phone bắt buộc** để match đúng — strip `-`, ` `, `（）` trước khi save. Match exact khi tra cứu.
- **Phát hiện trùng** (Phase 1 nhẹ): warn khi save mà cùng `phone` đã tồn tại; KHÔNG block (có thể là 同居家族 cùng nhà)
- Khách hàng **không bao giờ hard-delete** trừ admin maintenance — soft delete với `deleted_at`. Lý do: 電帳法 (Luật e-bookkeeping Nhật) yêu cầu giữ invoice/quote history 7 năm

### 2.2 物件 (properties)

| Field             | Type    | Business rule                                                                                                      |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| customer_id       | uuid FK | **1 khách → N properties** (VD: 1 khách OB sở hữu nhiều nhà cho con cái)                                           |
| address           | text    | Thường khác customer.address (customer = 住所連絡先, property = 物件所在地)                                        |
| property_type     | enum    | `new_construction` (mới xây) / `remodel` / `single_family` (戸建) / `multi_family` (集合) / `commercial` / `other` |
| structure         | enum    | `wood` (木造) / `steel` (鉄骨) / `rc` (RC造) / `other`                                                             |
| year_built        | int     | 築年 — dùng cho timing aftercare                                                                                   |
| **handover_date** | date    | **引渡日 — trigger auto-generate 4 maintenance schedules (1/3/5/10 năm)**                                          |
| floor_area_sqm    | decimal | 延床面積 — dùng cho estimate見積 sơ bộ                                                                             |
| photo_urls        | text[]  | Ảnh ngoại quan, max 3 ảnh/property theo [F1-02 unified doc:721]                                                    |

**Business rules**:

- Thay đổi `handover_date` → emit event `property.handover_date_set` → module aftercare regen maintenance_schedules
- Property **luôn link với customer**; không cho phép orphan property
- Address là free text ở Phase 1; postal code lookup là nice-to-have Phase 2

### 2.3 案件 (projects)

| Field                        | Type               | Business rule                                                                                                              |
| ---------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| project_code                 | varchar(20) UNIQUE | **Auto-number `YYYY-NNNN`** (VD: `2026-0001`). Reset về 0001 mỗi năm. Race-safe qua DB sequence                            |
| project_type                 | enum               | `new_construction` / `remodel` / `repair` (修繕) / `aftercare` (アフター対応)                                              |
| status                       | enum               | `quoting` (見積中) → `received` (受注) → `construction` (着工) → `completed` (完成) → `handed_over` (引渡済) / `cancelled` |
| customer_id                  | uuid FK            | Required                                                                                                                   |
| property_id                  | uuid FK NULL       | NULL CHỈ khi `project_type=new_construction` VÀ pre-acquisition (giai đoạn 土地仕入れ)                                     |
| owner_user_id                | uuid FK            | 営業 chính (phải có role `system_admin/manager/employee`)                                                                  |
| schedule_start, schedule_end | date NULL          | Ngày kế hoạch                                                                                                              |
| actual_start, actual_end     | date NULL          | Ghi nhận khi status chuyển                                                                                                 |
| amount_total                 | decimal(15,0) NULL | Set khi `status=received` (受注額); DECIMAL(15,0) — không có 円 lẻ                                                         |

**Business rules — state machine**:

```
quoting → received (yêu cầu amount_total đã set)
received → construction (set actual_start)
construction → completed (set actual_end)
completed → handed_over (yêu cầu property có handover_date)
ANY → cancelled (kèm lý do log vào audit)
```

Chiều ngược chỉ cho `system_admin` (VD: rollback `cancelled → received` nếu click nhầm); luôn audit-log.

**Sinh project_code**:

- DB sequence `project_code_seq_<YYYY>` theo năm
- App đọc năm tại thời điểm insert + nextval(seq) + pad 4 chữ số
- An toàn concurrency (sequence handle)

### 2.4 案件メンバー (project_members) — bảng junction

| Field                  | Type       | Business rule                                            |
| ---------------------- | ---------- | -------------------------------------------------------- |
| project_id × user_id   | UNIQUE     | 1 row per (project, user) — không double-assign          |
| role_on_project        | enum       | `owner` / `contributor` / `inspector` / `invited_worker` |
| folder_access_override | jsonb NULL | Per-folder grant nếu khác mặc định (Phase 2 fine-grain)  |

**Business rules**:

- `owner` phản ánh `projects.owner_user_id` — giữ đồng bộ (DB trigger hoặc app code)
- Role `invited_worker` áp dụng cho `users.role = invited` (職人/協力業者) — CHỈ thấy projects mình được assign. Enforce ở query layer (mọi list query phải filter theo membership cho invited)
- Remove member set `revoked_at` (soft delete trên junction); KHÔNG hard delete (audit trail)

### 2.5 案件フォルダ (folders) — auto-generated

6 folder mặc định mỗi project khi insert: 文書 / 図面 / 工程 / 写真 / 黒板 / 検査 (match F3-06 unified doc:669)

- Folder access theo `role_on_project`: invited_worker chỉ thấy folder có `is_public_for_invited = true`
- Phase 1: schema + auto-create thôi. Phase 2 thêm upload, marker, v.v.

---

## 3. Yêu cầu pháp lý / nghiệp vụ (MEDIUM priority)

### 3.1 電帳法 (Luật e-bookkeeping Nhật) — gián tiếp ảnh hưởng F1

- Quote/Invoice (F2) yêu cầu giữ 7 năm với history bất biến
- F1 customers/projects không có nghĩa vụ 電帳法 trực tiếp NHƯNG quote/project gắn với chúng phải giữ snapshot customer/project
- **Hệ quả cho F1**: soft-delete only cho customer/property/project; không hard delete
- Project status transition log vào audit_logs

### 3.2 個人情報保護法 (Luật bảo vệ thông tin cá nhân) — áp dụng F1

- Customer name + phone + email + address là 個人情報 → audit mọi read bulk export (CSV export từ F1-06 → audit log entry kèm row count + filter criteria)
- Access control: `invited_worker` KHÔNG được thấy customer list — chỉ các project được mời
- Quyền xóa (giống GDPR; ở Nhật yếu hơn nhưng nên có): soft delete + anonymize 90 ngày cho field non-financial (Phase 2)

### 3.3 業務上保管期間 (thời gian giữ business)

- Project records: vô thời hạn (nền tảng cho aftercare relationship)
- Audit log: tối thiểu 2 năm (unified doc:351)

---

## 4. Architecture tham chiếu (MEDIUM priority)

### 4.1 SmartCompany 工事台帳 (chuẩn ngành xây dựng Nhật)

- Phân cấp 顧客 → 物件 → 案件 (3 tầng) — match model của ta
- 案件 status: 見積→受注→着工→完了→引渡→アフター — match của ta
- 案件番号: format YY-NNNN phổ biến — ta dùng YYYY-NNNN cho rõ ràng

### 4.2 Salesforce Construction Cloud (US ref)

- "Account" = customer, "Asset" = property, "Opportunity" = project (quoting), "Job" = construction
- Có equivalent `is_ob` qua flag "previous customer"
- Pattern Kanban board: 6 cột match enum status — tham chiếu cho board view F1-03

### 4.3 楽々BUILD / 建ロボ (SaaS xây dựng Nhật)

- Pattern auto-generate project folder — xác nhận 6-folder default của ta là chuẩn ngành
- Member assignment với role per-project: match `project_members` junction của ta

### 4.4 Nội bộ: project trước của DEHA Solutions (60-70% reusable theo unified doc:269)

- Backend pattern module: NestJS + Prisma + repository layer — giống F8-AUTH
- Frontend feature-slice với Antd table — giống F8 admin/users

---

## 5. Edge case nghiệp vụ (MEDIUM priority)

### 5.1 Pre-acquisition project (土地仕入れ trước khi có customer)

- Tạo 案件 TRƯỚC khi customer ký (営業 muốn track cơ hội mua đất)
- Workaround: tạo "TBD customer" placeholder HOẶC cho `project.customer_id` NULL tạm
- **Quyết định**: giữ `customer_id NOT NULL`, cho phép placeholder customer (`name="TBD - 土地仕入れ"`, `customer_type=individual`) — admin rename khi customer thực ký. Tránh NULL trong schema.

### 5.2 Khách có nhiều property đã 引渡

- Khách OB có 2 nhà cùng có `handover_date` → tạo 2 set maintenance_schedules
- Timeline aftercare (F1-04) hiển thị gộp qua mọi property

### 5.3 同居家族 (thành viên cùng hộ)

- 父+息子 cùng địa chỉ, cùng phone — treat 1 customer hay 2?
- Chuẩn ngành: customer riêng, link qua `notes` hoặc bảng `customer_relations` tương lai (Phase 2)
- F1 MVP: không auto-link. Chỉ warn khi trùng phone.

### 5.4 Project chuyển giao 担当者

- 営業 ban đầu nghỉ việc, project gán cho người mới
- Update `projects.owner_user_id` + update `project_members` (set owner cũ `revoked_at`, insert owner mới với `role=owner`)
- Audit log

### 5.5 Reactivate project cancelled

- Khách cancel rồi 2 tuần sau đổi ý
- Reverse `cancelled → quoting` chỉ cho phép `system_admin`. Lý do cancel gốc giữ trong audit.

### 5.6 法人 customer sát nhập (M&A)

- Phase 1: merge thủ công — admin tạo entry mới, transfer projects bằng tay
- Phase 2: customer merge tool có audit trail

### 5.7 Phá dỡ + xây lại property trên cùng mảnh đất

- Tạo row `property` mới (`property_type=new_construction` khác), link cùng customer
- Property cũ soft-delete kèm note; maintenance schedule của property cũ → cancel

---

## 6. Performance pattern (LOW-MEDIUM priority)

### 6.1 Tìm kiếm customer (target 10K khách — unified doc:327)

- GIN index pg_bigm trên `name`, `name_kana` cho fuzzy search Japanese (theo ADR-007, db-design 5.1)
- GIN index pg_trgm trên `address` cho partial match
- B-tree exact match trên `phone` (normalized)
- **Target**: <500ms cho 50 result với full text + phone + address filter

### 6.2 Project list với filter (5K projects, F1-06)

- B-tree composite trên `(status, schedule_start)` cho board view
- B-tree composite trên `(customer_id, created_at desc)` cho customer timeline
- GIN partial trên `search_text` (tsvector generated column)
- **Target**: <1s cho filtered list (50 row) + count

### 6.3 Project member access check

- Hot path: mọi API call cho invited_worker cần check membership
- Cache (Redis) row project_member theo user_id với TTL 5 phút — invalidate khi member thay đổi event

### 6.4 Aggregate customer detail (F1-04 timeline)

- 1 customer detail load = 1 query cho properties + 1 query cho projects (sort desc) — đều index theo customer_id
- Tránh N+1: dùng Prisma `include` cho nested relation

---

## 7. Security pattern (LOW priority)

### 7.1 Authorization matrix

| Hành động                   | system_admin | manager | employee       | invited         |
| --------------------------- | ------------ | ------- | -------------- | --------------- |
| List toàn bộ customer       | ✓            | ✓       | ✓              | ❌              |
| Tạo customer                | ✓            | ✓       | ✓              | ❌              |
| Update customer             | ✓            | ✓       | ✓ (own only)   | ❌              |
| Delete customer             | ✓            | ❌      | ❌             | ❌              |
| List project                | ✓ all        | ✓ all   | ✓ all          | ✓ assigned only |
| Tạo project                 | ✓            | ✓       | ✓              | ❌              |
| Đổi status project          | ✓            | ✓       | ✓ (own only)   | ❌              |
| Add project member          | ✓            | ✓       | ✓ (owner only) | ❌              |
| Export CSV customer/project | ✓            | ✓       | ❌             | ❌              |

Enforce ở service layer qua `RequestContext.role` + ownership check. Audit mọi denied attempt.

### 7.2 Bảo vệ PII

- Phone + email + address là PII → KHÔNG log plaintext (Pino redaction phải include key `*.phone`, `*.email`, `*.address` cho nested log)
- Audit CSV export: log row count + filter criteria, KHÔNG log từng row

### 7.3 Search injection

- Search input → parameterized query (Prisma handle sẵn)
- Với raw FTS query, escape `&`, `|`, `!`, `(`, `)` để tránh tsquery injection

---

## 8. Integration pattern (LOW priority)

### 8.1 Migration từ hệ thống cũ (one-shot CSV import)

- 顧客管理ソフト hiện hữu export CSV với column: 氏名, フリガナ, 電話, 住所, 引渡日, 物件種別 (theo unified doc:449)
- Migration module (CLI: `pnpm --filter backend cli migrate:customers --file customers.csv`)
- Validate từng row; skip trùng theo phone; emit count summary + error CSV
- Chạy 1 lần per environment

### 8.2 Postal code lookup (Phase 2)

- 郵便番号 lookup API: Japan Post API hoặc zipcloud free (https://zipcloud.ibsnet.co.jp/api/search?zipcode=...)
- Không nằm Phase 1 MVP — customer/staff nhập address tự do

### 8.3 Event emission cho module downstream

- `customer.created` → audit, dashboard (stats) Phase 1+
- `property.handover_date_set` → aftercare (regen maintenance_schedules) khi aftercare có
- `project.created` → audit, dashboard
- `project.status_changed` → audit, notification (báo stakeholder Phase 2)

NestJS EventEmitter (sync in-process Phase 1; BullMQ async Phase 2).

---

## Nguồn tham chiếu

- `藤和建設様_施工管理システム_統合ドキュメント.md` (root) — §1-3 business context, §3.2 F1 overview, §4.1 performance, §6.2 chi tiết F1-01→F1-06, §A function catalog hàng 652-657
- `documents/architecture/02-module-architecture.md` — module structure F1 §2 (customer/project trong modules/), §4 dependency matrix, §5 event catalog
- `documents/architecture/04-database-design.md` — §3 schema convention, §4 entity overview (customers/properties/projects/project_members), §5 index strategy
- `.claude/memory-bank/master/architecture-dehasol/architect/catalogs/entity-catalog.md` — entity definition chi tiết §2-§6
- ADR-002 NestJS, ADR-003 React, ADR-004 PostgreSQL+Prisma, ADR-007 search strategy (pg_bigm + pg_trgm) — `.claude/memory-bank/master/architecture-dehasol/architect/decisions/`
- F8-AUTH backend implementation (merged on develop) — reference cho module/repo/service pattern reuse
