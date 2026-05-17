# SRS — F2 見積管理 (Quote Management)

**Feature ID**: F2-QUOTE
**Version**: BASE (Phase 1 MVP)
**Audience**: 藤和建設株式会社 (Towa Construction)
**Authors**: DEHA Solutions / EPS Framework
**Date**: 2026-05-17
**Status**: Approved (innovate-srs-selection.md)
**Reference**: `documents/architecture/08-mvp-scope-and-roadmap.md` § F2, `documents/glossary.md` § 4

---

## 1. Tổng quan

### 1.1 Mục đích
Cung cấp module quản lý báo giá (見積) cho 営業 của 藤和建設, đáp ứng:
- Tạo/sửa/clone/duyệt báo giá theo workflow chuẩn JP
- In PDF với layout chuyên nghiệp
- Tuân thủ **電子帳簿保存法** (Electronic Bookkeeping Law) — 10 năm retention + 3 search keys + append-only versioning
- Tích hợp với module 案件 (F1-03 Project) — quote thuộc về 1 project

### 1.2 Phạm vi (Scope)
**In scope (MVP)**:
- Quote CRUD + line items editor (mobile-responsive)
- 単価マスタ (Unit Price Master) — manual entry
- 2-tier approval workflow (manager + admin threshold ¥10M)
- PDF generation (synchronous Puppeteer)
- 電帳法 versioning (append-only snapshots)
- Search by 取引年月日/金額/取引先

**Out of scope**:
- F2-06 AI 見積補助 (Phase 3)
- OCR receipt scanning
- Excel/CSV bulk import line items
- Digital signature (クラウドサイン)
- Customer self-view portal
- Multi-currency (chỉ JPY)

### 1.3 Stakeholders + Users
| Role | Code | Quyền chính trên F2 |
|---|---|---|
| 管理者 | `system_admin` | Full CRUD + approve any tier + delete + 単価マスタ admin |
| マネージャー | `manager` | Approve ≤¥10M + reject + read all + edit own draft |
| 担当者/社員 | `employee` | Create/edit own draft + submit; read all approved |
| 招待ユーザー | `invited` | ❌ KHÔNG có access |

### 1.4 Dependencies
- ✅ F1-CUSTOMER (Customer + Project module) đã merged
- ✅ F8-AUTH (User/role/permission) đã merged
- ✅ Audit infrastructure (AuditStubService) sẵn sàng extend
- ✅ EventEmitter2 sẵn sàng cho cross-module events
- ✅ NotificationModule (future use cho approval emails)

---

## 2. Functional Requirements (16 FRs)

### 2.1 Core CRUD

#### FR-QT-001 — Quote CRUD (基本管理)
- **Mô tả**: Create/Read/Update/Delete (soft) quote, mỗi quote thuộc 1 project
- **Input**: project_id, quote fields (issued_at, valid_until, notes, qualified_invoice_number)
- **Output**: Quote DTO
- **Business rules**:
  - BR-QT-001: `project_id` required — quote không thể tạo standalone
  - BR-QT-013: Soft delete chỉ admin được phép; sets `deleted_at` + creates version snapshot với `change_type='deletion'`
  - Counter_party_name auto-snapshot từ customer at creation time (BR-QT-014, audit trail)
- **Audit events**: `quote.created`, `quote.updated`, `quote.deleted`

#### FR-QT-002 — Line Items Editor (明細編集)
- **Mô tả**: Add/edit/remove/reorder line items inline trên quote
- **Input**: array of QuoteLine objects (item_name, unit, quantity, unit_price, tax_rate, is_optional, sort_order)
- **Output**: Updated quote with recomputed totals
- **Business rules**:
  - BR-QT-006: `amount = ROUND(unit_price × quantity)` computed server-side (no trust client)
  - BR-QT-007: `amount_subtotal = SUM(amount WHERE NOT is_optional)`
  - BR-QT-008: `amount_tax = SUM(amount × tax_rate WHERE NOT is_optional)`, rounded after sum
  - BR-QT-009: `amount_total = amount_subtotal + amount_tax`
  - BR-QT-002 (editor scope): chỉ status `draft`/`rejected` mới edit được lines
  - Mobile UX: card view trên `<sm` breakpoint, table view ≥sm
- **Validation**:
  - quantity > 0
  - unit_price có thể âm (cho discount/値引き lines)
  - item_name required (≤200 chars), unit required (≤20 chars)
  - Max 500 lines per quote (UX warning >100)

#### FR-QT-003 — 単価マスタ CRUD (Unit Price Master)
- **Mô tả**: Admin maintain master pricing data; users select from master khi add line items
- **Input**: code, category, item_name, unit, default_unit_price, description, supplier_name
- **Output**: UnitPrice DTO
- **Business rules**:
  - Only `system_admin` có quyền CUD master
  - `code` unique constraint
  - Soft delete via `is_active=false` (preserves historical references in quote_lines)
- **Operations**:
  - List with filter (search/category/active)
  - Bulk add (defer Phase 2 CSV import)
- **Seed**: 30-50 sample items across 8 categories cho dev (解体/基礎/木工/屋根/外壁/設備/仕上/諸経費)

### 2.2 Workflow & Approval

#### FR-QT-004 — Status Machine + 2-Tier Approval
- **States** (8 values): `draft`, `submitted`, `pending_admin`, `approved`, `rejected`, `sent`, `won`, `lost`
- **Valid transitions**:
  ```
  draft         → submitted
  submitted     → approved | pending_admin | rejected
  pending_admin → approved | rejected
  approved      → sent | rejected
  sent          → won | lost
  rejected      → submitted (after revision)
  won, lost     → terminal
  ```
- **Approval routing (2-tier per D1+D5)**:
  - submit → check `amount_total ≤ ¥10,000,000`:
    - If true → wait for any manager OR admin to approve
    - If false → wait for manager approve first → `pending_admin` → wait for admin
  - Threshold constant: `APPROVAL_TIER2_THRESHOLD_JPY = 10_000_000`
- **Permission per action**:
  - `submit`: creator (employee) or any with edit access
  - `approve` (tier 1): `manager` or `admin`
  - `approve` (tier 2 / pending_admin): `admin` only
  - `reject`: any approver at current tier; reason ≥5 chars required
  - `send`: any with edit access; status must be `approved`
  - `won`/`lost`: any with edit access; status must be `sent`
- **Audit**: every status change logged via `logQuoteStatus*` methods
- **Events**: `quote.{submitted,approved,rejected,sent,won,lost}` emitted on transition

#### FR-QT-005 — PDF Generation + Download
- **Mô tả**: Generate PDF của quote bằng Puppeteer + Handlebars template, stream to client
- **API**: `GET /quotes/:id/pdf`
- **Permission**: any role with read access (system_admin, manager, employee)
- **Output**: `Content-Type: application/pdf`, `Content-Disposition: inline; filename="Q-2026-00001-v1.pdf"`
- **Template content**:
  - Header: 藤和建設 logo + company info + 印鑑 placeholder
  - Quote meta: 見積番号, 取引年月日, 有効期限, 取引先, 担当者
  - Line items table (paginated, repeat header)
  - **Section A**: 見積金額 (required items) — subtotal + tax + total
  - **Section B**: オプション項目 (optional items) — separate subtotal (D8)
  - Notes (備考) section
  - Footer: 印鑑 stamp area + バージョン番号 + draft watermark if status='draft'
- **Performance**: ≤3s for typical (≤50 lines), ≤10s for large (200+ lines)
- **Audit**: `logQuotePdfDownloaded(quoteId, requesterId, ctx)`

### 2.3 電帳法 Compliance

#### FR-QT-006 — 電帳法 Versioning (Append-Only)
- **Mô tả**: Mỗi correction/deletion/status_change tạo version snapshot không thể xóa
- **Storage**: `quote_versions` table, append-only (NO UPDATE/DELETE)
- **Snapshot content**: Full quote row + ALL quote_lines tại thời điểm version (JSONB)
- **Trigger conditions** (called from QuoteVersioningService.snapshot):
  - QuotesService.update() AFTER status='approved' → `change_type='correction'`, `change_reason` required (≥5 chars)
  - QuotesService.softDelete() → `change_type='deletion'`, `change_reason` required
  - QuoteStatusMachine.transition() → `change_type='status_change'`, reason optional (for cancel/reject)
- **Post-sent edit (per D7)**:
  - Sent quote = immutable
  - "Create v2" button generates new draft quote referencing original (BR-QT-EDIT-001)
- **Compliance mapping**: 電帳法 §7 真実性 requirement
- **Retention**: 10 years (architecture/04 § retention policy)
- **Audit**: `logQuoteVersionCreated(quoteId, versionNo, changeType, requesterId, ctx)`

#### FR-QT-007 — Compliant Search (電帳法 3-Key Search)
- **Mô tả**: List quotes với 3 mandatory search keys + bonus filters
- **API**: `GET /quotes?from=&to=&minAmount=&maxAmount=&counterPartySearch=&status=&projectId=&sortBy=&sortOrder=&page=&pageSize=`
- **Mandatory search keys** (電帳法):
  - **取引年月日 (issued_at)**: `from` / `to` date range, exact-match supported
  - **取引金額 (amount_total)**: `minAmount` / `maxAmount` range
  - **取引先 (counter_party_name)**: partial match via `pg_bigm` GIN index
- **Bonus filters**:
  - `status[]` (array enum)
  - `projectId` (FK filter)
  - `search` keyword (combined notes + counter_party tsvector)
- **Indexes** (per architecture/04 § 7.2):
  - `idx_quotes_issued_at DESC`
  - `idx_quotes_amount_total`
  - `idx_quotes_counter_party_bigm` (GIN bigm)
- **Performance**: <100ms typical (≤7.5K rows/year)

### 2.4 Auxiliary Operations

#### FR-QT-008 — Clone Quote (見積コピー)
- **Mô tả**: Sao chép 1 quote thành new draft (cho similar quotes)
- **Input**: source quote ID + optional new name/notes
- **Output**: New quote with copied lines, reset status to `draft`, NEW quote_number (sequence advance), version_no=1
- **Behavior**:
  - All quote_lines copied (preserve unit_price_master_id for future master price updates context)
  - Reset: `status='draft'`, `approved_by/at=null`, `sent_at=null`, `version=0`, fresh `issued_at=today`
- **Audit**: `logQuoteCloned(newQuoteId, sourceQuoteId, requesterId, ctx)`

#### FR-QT-009 — Optional Items Handling
- **Mô tả**: Lines marked `is_optional=true` không tính vào main subtotal; hiển thị section riêng trên PDF
- **PDF layout (per D8)**:
  - "見積金額" table (lines with `is_optional=false`) + subtotal/tax/total
  - "オプション" table (lines with `is_optional=true`) + separate subtotal (no main total)
- **API impact**: response includes `amount_optional_subtotal` field (computed, not stored)
- **Editor UX**: checkbox per line "オプション項目"

#### FR-QT-010 — Won Quote → Project Transition Prompt
- **Mô tả**: Khi quote chuyển sang `won` AND associated project có status `quoting`, prompt user transition project → `received`
- **Implementation**:
  - BE emit event `quote.won` với payload `{ quoteId, projectId, amountTotal }`
  - FE: after `POST /quotes/:id/won` success, show modal "案件のステータスを「受注」に変更しますか? 受注金額: ¥X,XXX,XXX"
  - User confirm → `POST /projects/:id/status` with `status='received', amountTotal=quote.amount_total`
- **Note**: No auto-trigger (user always confirms)
- **BR**: warn nếu cố mark 2nd quote 'won' khi project đã có won quote khác (require admin override)

#### FR-QT-011 — Mobile Responsive Line Item Edit
- **Mô tả**: Line items editor works fully on mobile (per D6)
- **Pattern**:
  - Desktop (≥sm): Antd `<Table>` editable inline với columns [drag handle, item_name, unit, qty, unit_price, amount, optional, delete]
  - Mobile (<sm): Card view; each card = 1 line; tap to expand for full edit
- **Touch targets**: min 38×38 px (per project rule mobile-first)
- **Performance**: virtualization khi >50 lines (use Antd Table `virtual` prop)

### 2.5 Supporting (Infrastructure)

#### FR-QT-012 — Audit Trail (~12 events)
- Extend AuditStubService với methods:
  - `logQuoteCreated`, `logQuoteUpdated`, `logQuoteSubmitted`, `logQuoteApproved`, `logQuoteRejected`, `logQuoteSent`, `logQuoteWon`, `logQuoteLost`, `logQuoteDeleted`, `logQuoteVersionCreated`, `logQuotePdfDownloaded`, `logQuoteCloned`
- Pattern y hệt F1 audit (sync write to `audit_logs.changes` JSONB)
- All include: actor_user_id, entity_type='quote', entity_id, changes payload

#### FR-QT-013 — Permission Gates (4-role matrix)
| Action | admin | manager | employee | invited |
|---|---|---|---|---|
| List/view quotes | ✓ | ✓ | ✓ | ❌ |
| Create draft | ✓ | ✓ | ✓ | ❌ |
| Edit own draft | ✓ | ✓ | ✓ | ❌ |
| Edit any draft | ✓ | ✓ | ❌ | ❌ |
| Submit | ✓ | ✓ | ✓ (own) | ❌ |
| Approve ≤¥10M | ✓ | ✓ | ❌ | ❌ |
| Approve >¥10M (tier 2) | ✓ | ❌ | ❌ | ❌ |
| Reject | ✓ | ✓ | ❌ | ❌ |
| Send | ✓ | ✓ | ✓ | ❌ |
| Mark won/lost | ✓ | ✓ | ✓ | ❌ |
| Soft delete | ✓ | ❌ | ❌ | ❌ |
| PDF download | ✓ | ✓ | ✓ | ❌ |
| Create v2 from sent | ✓ | ✓ | ✓ (own original) | ❌ |
| 単価マスタ CUD | ✓ | ❌ | ❌ | ❌ |
| View versions history | ✓ | ✓ | ✓ | ❌ |

#### FR-QT-014 — Project Detail Quote Tab
- **Mô tả**: Add tab "見積" trên `ProjectDetailPage` (F1) liệt kê all quotes của project
- **Component**: `QuoteListTab` (giống PropertyListTab pattern)
- **Display**: Table với columns [quote_number, status, amount_total, issued_at, version_no, actions]
- **Actions**: Create new (link to `/quotes/new?projectId=X`), Clone existing, View detail
- **Mobile**: card view per quote

#### FR-QT-015 — Optimistic Locking
- **Mô tả**: Prevent concurrent edit conflicts
- **Implementation**:
  - Each quote row has `version` INT field, increments on every update
  - Update query: `UPDATE quotes WHERE id=? AND version=?` → check rowsAffected
  - If 0 → throw `QuoteConflictError` (HTTP 409)
- **FE handling**: catch 409 → modal "他のユーザーが編集しました。再読み込みしますか?" → reload data
- **Note**: distinct from `version_no` (which is 電帳法 versioning counter)

#### FR-QT-016 — i18n Full
- **Languages**: ja (primary), en, vi
- **Estimated keys**: ~200 in `quote.*` namespace
- Categories:
  - `quote.title`, `quote.subtitle`, `quote.empty`
  - `quote.columns.*` (table headers)
  - `quote.status.*` (8 statuses)
  - `quote.actions.*` (approve, reject, send, clone, etc.)
  - `quote.form.*` (labels, placeholders)
  - `quote.detail.*` (overview labels)
  - `quote.validation.*` (error messages)
  - `quote.pdf.*` (PDF template strings)
  - `unitPrice.*` (~30 keys)

---

## 3. Non-Functional Requirements

### NFR-3.1 Performance
- Quote list query: <100ms (≤7.5K rows/year)
- Quote detail load: <200ms (includes lines + computed totals)
- Quote update (with line items): <500ms (≤100 lines)
- PDF generation: <3s typical (≤50 lines), <10s large (200+ lines)
- Search by counter_party_name (bigm): <50ms
- Concurrent quote creates: 5/sec sustained (sequence-based, no contention)

### NFR-3.2 Scalability
- 10-year horizon: 75K quotes, 7.5M line_items, 225K versions
- Storage: ~225MB/year for versions (JSONB snapshots)
- Read replica plan: not needed Phase 1 (per architecture/04 §8.2)
- PDF generation: sync in-process Phase 1 → BullMQ worker if >10s avg Phase 2

### NFR-3.3 Reliability
- Optimistic locking: 99%+ success rate (low contention expected)
- Audit log: 100% durability (sync write in same transaction as state change)
- Version snapshot: 100% on every relevant change (transactional)

### NFR-3.4 Security
- Permission gates per FR-QT-013 enforced via RolesGuard + RequireApprovalTierGuard
- counter_party_name snapshot for APPI compliance (audit trail không follow customer rename)
- PDF download audit logged
- No quote data in error responses for unauthorized requests
- Quote PDF không lưu S3 in MVP (generated on-demand, no leakage risk)

### NFR-3.5 Compliance
- **電子帳簿保存法** (Electronic Bookkeeping Law):
  - 真実性: append-only `quote_versions` + audit_logs
  - 可視性: PDF generation + screen view
  - 検索性: 3 mandatory indexes (issued_at, amount_total, counter_party_bigm)
  - 保存期間: 10 years (lifecycle policy to S3 cold tier after 3 years)
- **消費税法**: per-line `tax_rate` (10% / 8%), PDF displays subtotal + tax separately
- **適格請求書 (インボイス)**: optional `qualified_invoice_number` field (display-only MVP)
- **APPI**: customer name snapshot in counter_party_name (no follow rename)

### NFR-3.6 Usability
- Mobile-first responsive (per project rule 2026-05-16+)
- Line item editor must be usable on phone (D6)
- Loading indicators on PDF gen (which can take 1-10s)
- Validation errors inline (Zod + react-hook-form)
- Confirmation dialogs for destructive actions (reject, delete, mark lost)

### NFR-3.7 Maintainability
- Same module/file structure pattern as F1 (customer, project)
- Unit test coverage target ≥50% for service layer (~50 tests planned)
- TypeScript strict mode enforced
- No business logic in controllers (thin layer)

---

## 4. Business Rules (BR)

| ID | Rule | Refs |
|---|---|---|
| BR-QT-001 | `project_id` required on quote create | FR-QT-001 |
| BR-QT-002 | Approval: manager (≤¥10M) or admin (>¥10M); employee submit only | FR-QT-004 |
| BR-QT-003 | After approved, line items + amounts locked; only notes editable | FR-QT-002 |
| BR-QT-004 | Sent quote: post-sent edit requires create v2 (D7) | FR-QT-006 |
| BR-QT-005 | Won quote prompts project status transition (manual user confirm) | FR-QT-010 |
| BR-QT-006 | `amount = ROUND(unit_price × quantity)` server-side compute | FR-QT-002 |
| BR-QT-007 | `subtotal = SUM(amount WHERE NOT is_optional)` | FR-QT-002 |
| BR-QT-008 | `tax = SUM(amount × tax_rate WHERE NOT is_optional)` round after sum | FR-QT-002 |
| BR-QT-009 | `total = subtotal + tax` | FR-QT-002 |
| BR-QT-010 | PDF generation only for non-draft (draft has watermark "DRAFT") | FR-QT-005 |
| BR-QT-011 | 電帳法 search: 3 indexes (issued_at, amount_total, counter_party_bigm) | FR-QT-007 |
| BR-QT-012 | Version trigger: correction/deletion/status_change | FR-QT-006 |
| BR-QT-013 | Soft delete admin-only; creates version snapshot | FR-QT-001 |
| BR-QT-014 | counter_party_name snapshot at create, no follow customer rename | FR-QT-001 |
| BR-QT-015 | quote_number format `Q-YYYY-NNNNN`, sequence per year, 5-digit pad | DD AD3 |
| BR-QT-016 | Only 1 quote per project can be marked 'won' (warn on 2nd attempt) | FR-QT-010 |
| BR-QT-017 | Reject reason required ≥5 chars | FR-QT-004 |
| BR-QT-018 | 単価マスタ CUD admin-only | FR-QT-003 |
| BR-QT-019 | Optimistic locking: update with stale `version` → 409 conflict | FR-QT-015 |
| BR-QT-020 | Optional items separate PDF section + subtotal (D8) | FR-QT-009 |

---

## 5. Use Cases

### UC-5.1 営業 tạo báo giá mới
- **Actor**: employee
- **Goal**: Tạo báo giá cho project đang quoting
- **Steps**:
  1. Vào ProjectDetailPage → tab 見積 → click "新規見積"
  2. System redirect đến `/quotes/new?projectId=X`
  3. Form pre-fill project + customer info (counter_party_name snapshot)
  4. Nhập line items (chọn từ 単価マスタ hoặc nhập tay)
  5. Subtotal/tax/total auto-compute trên UI
  6. Save → quote tạo với status='draft' + quote_number `Q-2026-00001`
  7. Click "提出" → submit → wait for manager approval
- **Result**: New quote in DB with audit log + event `quote.created` + `quote.submitted`

### UC-5.2 マネージャー duyệt báo giá ≤¥10M
- **Actor**: manager
- **Goal**: Approve báo giá đã submit (≤¥10M)
- **Steps**:
  1. Notification "新しい見積が承認待ち" (email + in-app future)
  2. Click link → QuoteDetailPage
  3. Review line items + amounts
  4. Click "承認" → approve modal confirm → POST `/quotes/:id/approve`
  5. Status → `approved`, `approved_by` + `approved_at` recorded
- **Result**: Quote locked for edit; audit log; event `quote.approved`

### UC-5.3 マネージャー duyệt báo giá >¥10M (tier 2)
- **Steps**:
  1. Manager approves first → status `pending_admin`
  2. System notifies admins
  3. Admin reviews + approves → status `approved`
- **Behavior**: Cannot skip manager; admin có thể reject tại pending_admin tier

### UC-5.4 営業 gửi báo giá khách hàng
- **Steps**:
  1. After approved, click "送付" → status `sent`, `sent_at` recorded
  2. Download PDF qua "PDFダウンロード" button
  3. Send to customer (email/print manual outside system)
- **Result**: Quote now immutable; edit requires v2

### UC-5.5 営業 nhận đơn (Won)
- **Steps**:
  1. Customer accepts → click "受注 (Won)" → status `won`
  2. Modal hiển thị "案件を「受注」へ変更しますか? 金額: ¥X,XXX,XXX"
  3. User confirm → POST `/projects/:id/status` with `received` + amount_total
- **Result**: Quote `won` + Project `received` + audit + 2 events

### UC-5.6 営業 sửa báo giá đã sent (v2)
- **Steps**:
  1. Customer yêu cầu sửa → click "新規版作成 (Create v2)"
  2. Modal nhập `change_reason` (≥5 chars)
  3. System tạo new draft quote, version_no incremented, link to v1
  4. Original v1 remains immutable in DB + readable on PDF/screen
- **Compliance**: 電帳法 §7 真実性 — append-only versioning

### UC-5.7 admin xóa báo giá sai
- **Steps**:
  1. Admin spots wrong quote
  2. Click "削除" → modal nhập change_reason (≥5 chars)
  3. POST `/quotes/:id` DELETE
  4. Quote soft-deleted (`deleted_at` set), version snapshot saved
- **Compliance**: Quote PDF + lines preserved in version snapshot for audit

---

## 6. Acceptance Criteria (AC)

| ID | Criteria | Verified by |
|---|---|---|
| AC-01 | Employee tạo quote mới → status='draft', quote_number `Q-2026-00001`, counter_party snapshot | UC-5.1 + DB check |
| AC-02 | 5 lines (3 required + 2 optional), subtotal/tax/total đúng formula | UC-5.1 + unit test |
| AC-03 | Submit quote ≤¥10M → manager có thể approve, admin cũng có quyền | UC-5.2 + permission test |
| AC-04 | Submit quote >¥10M → status `pending_admin`, manager không thể skip | UC-5.3 + permission test |
| AC-05 | Reject without reason → 400 error code `QUOTE_REJECT_REASON_REQUIRED` | FR-QT-004 + unit test |
| AC-06 | PDF download của approved quote → file PDF với 2 sections nếu có optional | UC-5.4 + PDF inspection |
| AC-07 | PDF của draft → có watermark "DRAFT" | BR-QT-010 + visual check |
| AC-08 | Search by `from=2026-01-01&to=2026-12-31&minAmount=1000000` → đúng kết quả | FR-QT-007 + integration |
| AC-09 | Search by `counterPartySearch=山田` (bigm) → fuzzy match | FR-QT-007 + integration |
| AC-10 | Mark 2nd quote 'won' khi project có quote won khác → warn + require admin | BR-QT-016 |
| AC-11 | Concurrent edit (2 tabs) → 1 success + 1 gets 409 conflict | FR-QT-015 + unit test |
| AC-12 | Create v2 of sent quote → new draft, link to v1, change_reason in audit | UC-5.6 + DB check |
| AC-13 | Soft delete by admin → version snapshot với `change_type='deletion'` | UC-5.7 + DB check |
| AC-14 | Audit log có 12 quote event types after full workflow | FR-QT-012 + log check |
| AC-15 | Invited user truy cập `/quotes` → 403 redirect | FR-QT-013 + e2e |
| AC-16 | Mobile (375px) line items editor → card view, edit OK | FR-QT-011 + visual |
| AC-17 | 単価マスタ CUD chỉ admin được phép, manager 403 | FR-QT-003 + permission test |
| AC-18 | Quote clone → new quote_number, same lines, status='draft' | FR-QT-008 + DB check |
| AC-19 | Won quote → prompt project transition modal | FR-QT-010 + UI |
| AC-20 | 10-year retention: deleted quote versions vẫn query được | FR-QT-006 + DB check |

---

## 7. Out of Scope (Reconfirm)

| Feature | Reason | Future phase |
|---|---|---|
| AI quote suggestion (F2-06) | AI module defer | Phase 3 |
| OCR receipt scanning | AI module defer | Phase 3 |
| Multi-currency support | Single 円 only | Future |
| Digital signature / クラウドサイン | Manual hanko OK MVP | Phase 2 |
| Excel/CSV bulk import line items | Manual + clone enough | Phase 2 |
| Customer self-view portal | Not requested | Future |
| Auto-send PDF email | Manual download + send | Phase 2 |
| Multi-tier approval (>2) | 2-tier covers Towa scale | Future |
| Configurable threshold via env | Hard-code ¥10M MVP | Phase 2 |
| Slack/Teams notification | Email only Phase 1 | Phase 2 |

---

## 8. Glossary (per documents/glossary.md § 4)

| 日本語 | English | Code | Notes |
|---|---|---|---|
| 見積 | Quote | `Quote`, `quotes` table | Main entity |
| 明細 | Line item | `QuoteLine`, `quote_lines` | Up to 500 per quote |
| 単価 | Unit price | `unit_price` | DECIMAL(15,0) JPY |
| 取引先 | Counter party | `counter_party_name` | Snapshot at create |
| 取引年月日 | Issue date | `issued_at` | 電帳法 search key |
| 取引金額 | Total amount | `amount_total` | 電帳法 search key |
| 版 | Version | `version_no` | 電帳法 versioning |
| 電帳法 | E-bookkeeping law | (compliance) | 2024年義務化 |

---

*SRS — F2 見積管理 v1.0 — Generated from innovate-srs-selection.md*
*Approved by user via /innovate workflow on 2026-05-17*
