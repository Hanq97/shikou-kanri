# Domain Knowledge Base — F2 見積管理 (Quote Management)

**Feature**: F2-QUOTE
**Domain**: 日本建設業界の見積管理 (Quote management in Japanese construction industry)
**Target company**: 藤和建設株式会社 (small/medium contractor, ~7,500 quotes/year)
**Generated**: 2026-05-17

---

## 1. Standard Workflow (見積業務フロー)

### 1.1 Quote lifecycle (見積ライフサイクル)

```
[作成] Draft → [提示] Submitted → [交渉] Negotiating → [承認] Approved → [送付] Sent → [受注] Won
                                                       ↓
                                                  [失注] Rejected / Lost
```

- **Draft (下書き)**: 営業 tạo, edit nháp, chưa hiển thị cho cấp trên
- **Submitted (提出)**: 営業 nộp lên マネージャー để approve
- **Approved (承認済)**: マネージャー ký duyệt; lock fields chính
- **Sent (送付済)**: PDF đã gửi khách hàng (email/in giấy)
- **Won/Lost (受注/失注)**: kết quả từ khách → sync với project status

### 1.2 Key activities per stage

| Stage     | Who                 | What                                                                  |
| --------- | ------------------- | --------------------------------------------------------------------- |
| Draft     | 営業担当            | Nhập 物件 info, copy line items từ template/前回見積, calculate total |
| Submitted | 営業 → マネージャー | Email/Slack notify; マネージャー review margin/discount               |
| Approved  | マネージャー        | Lock pricing; generate PDF với hanko 印鑑                             |
| Sent      | 営業                | PDF email or print + post; record sent_at                             |
| Won       | 営業                | Project status: quoting → received, set project.amountTotal           |
| Lost      | 営業                | Record lost_reason; project may stay quoting (re-quote) or cancel     |

### 1.3 Versioning pattern (版管理)

- **First version**: implicit (v1 = initial draft)
- **Correction (訂正)**: phải tạo new version với change_reason
- **Deletion**: soft-delete với reason, không hard delete (電帳法 audit)
- **Append-only**: `quote_versions` table never UPDATE, only INSERT

---

## 2. Core Entities & Business Rules

### 2.1 Quote (見積)

| Field                              | Type          | Required | Notes                                                                   |
| ---------------------------------- | ------------- | -------- | ----------------------------------------------------------------------- |
| id                                 | UUID          | ✓        | PK                                                                      |
| quote_number                       | VARCHAR(30)   | ✓        | Auto-gen format `Q-YYYY-NNNNN` (similar to F1 project_code)             |
| project_id                         | UUID          | ✓        | FK → projects (RESTRICT delete)                                         |
| version_no                         | INT           | ✓        | 1, 2, 3... incremented on save-after-finalize                           |
| status                             | ENUM          | ✓        | draft/submitted/approved/sent/won/lost                                  |
| issued_at                          | DATE          | ✓        | 取引年月日 — required for 電帳法 search                                 |
| valid_until                        | DATE          | —        | 見積有効期限 (typically +30 days)                                       |
| counter_party_name                 | VARCHAR(200)  | ✓        | 取引先 — snapshot from customer at issue time (NOT FK, for audit trail) |
| amount_subtotal                    | DECIMAL(15,0) | ✓        | Sum of lines before tax                                                 |
| amount_tax                         | DECIMAL(15,0) | ✓        | 消費税 (10% standard, 8% reduced rate for food)                         |
| amount_total                       | DECIMAL(15,0) | ✓        | 取引金額 — required 電帳法 search                                       |
| notes                              | TEXT          | —        | 備考/special terms                                                      |
| approved_by                        | UUID          | —        | FK → users; only set when status=approved                               |
| approved_at                        | TIMESTAMP     | —        |                                                                         |
| sent_at                            | TIMESTAMP     | —        |                                                                         |
| created_at, updated_at, deleted_at | timestamps    | —        | standard                                                                |

### 2.2 Quote Lines (見積明細)

| Field                | Type          | Required | Notes                                     |
| -------------------- | ------------- | -------- | ----------------------------------------- |
| id                   | UUID          | ✓        | PK                                        |
| quote_id             | UUID          | ✓        | FK → quotes (CASCADE)                     |
| sort_order           | INT           | ✓        | display order                             |
| category             | VARCHAR(50)   | —        | 大分類 (e.g., 解体工事/基礎工事/屋根工事) |
| item_name            | VARCHAR(200)  | ✓        | 項目名                                    |
| description          | TEXT          | —        | 仕様/notes                                |
| unit                 | VARCHAR(20)   | ✓        | m² / kg / 式 / 個 / セット                |
| quantity             | DECIMAL(15,2) | ✓        | 数量                                      |
| unit_price           | DECIMAL(15,0) | ✓        | 単価 (JPY no decimals)                    |
| amount               | DECIMAL(15,0) | ✓        | unit_price × quantity (computed)          |
| tax_rate             | DECIMAL(5,2)  | ✓        | 0.10 (10%) default, 0.08 reduced          |
| is_optional          | BOOLEAN       | —        | オプション項目 (not in subtotal)          |
| unit_price_master_id | UUID          | —        | FK → unit_prices nếu copy từ master       |

### 2.3 Unit Price Master (単価マスタ)

| Field                            | Type          | Notes                 |
| -------------------------------- | ------------- | --------------------- |
| id                               | UUID          | PK                    |
| code                             | VARCHAR(30)   | UNIQUE — internal SKU |
| category                         | VARCHAR(50)   |                       |
| item_name                        | VARCHAR(200)  | ✓                     |
| description                      | TEXT          |                       |
| unit                             | VARCHAR(20)   | ✓                     |
| default_unit_price               | DECIMAL(15,0) | ✓                     |
| supplier_name                    | VARCHAR(200)  | — supplier reference  |
| is_active                        | BOOLEAN       | true                  |
| last_updated_by, last_updated_at | audit         |

### 2.4 Quote Versions (版履歴 — 電帳法)

| Field         | Type      | Notes                                        |
| ------------- | --------- | -------------------------------------------- |
| id            | UUID      | PK                                           |
| quote_id      | UUID      | FK → quotes                                  |
| version_no    | INT       | matches quote.version_no at time of snapshot |
| change_type   | ENUM      | `correction` / `deletion` / `status_change`  |
| change_reason | TEXT      | required for correction/deletion             |
| snapshot      | JSONB     | full quote + lines snapshot                  |
| changed_by    | UUID      | FK → users                                   |
| changed_at    | TIMESTAMP | default NOW()                                |

**Append-only**: NO UPDATE/DELETE on this table. Even if quote is soft-deleted, versions remain for 10 years.

### 2.5 Business Rules (BR)

| ID        | Rule                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| BR-QT-001 | Quote.project_id required — không thể tạo quote không gắn project                                                                         |
| BR-QT-002 | Approval: chỉ system_admin/manager mới approve được; employee chỉ submit                                                                  |
| BR-QT-003 | After approved, không sửa được field chính (lines, amounts); muốn sửa phải create new version                                             |
| BR-QT-004 | Sent quote → project.amountTotal có thể auto-set (= quote.amount_total) khi project chuyển quoting → received                             |
| BR-QT-005 | Won quote → trigger project status transition prompt (manual approve trên FE)                                                             |
| BR-QT-006 | quote_lines.amount = ROUND(unit_price × quantity) — server-side compute, không trust client                                               |
| BR-QT-007 | quote.amount_subtotal = SUM(lines.amount WHERE NOT is_optional)                                                                           |
| BR-QT-008 | quote.amount_tax = ROUND(SUM(lines.amount × lines.tax_rate) WHERE NOT is_optional)                                                        |
| BR-QT-009 | quote.amount_total = amount_subtotal + amount_tax                                                                                         |
| BR-QT-010 | PDF generation: only on approved/sent statuses (preview cho draft cũng được nhưng watermark "DRAFT")                                      |
| BR-QT-011 | 電帳法 search: phải support exact match on 取引年月日 (issued_at) + range on 金額 (amount_total) + partial on 取引先 (counter_party_name) |
| BR-QT-012 | Version creation: triggered on (a) any field change after first save, (b) status change, (c) explicit user action "新規版作成"            |
| BR-QT-013 | Soft delete quote → all versions also marked deleted_at but rows preserved                                                                |
| BR-QT-014 | Counter_party_name snapshot at creation — KHÔNG follow customer rename (audit trail)                                                      |
| BR-QT-015 | Quote số (quote_number) format `Q-YYYY-NNNNN` — sequence reset per year, 5-digit pad                                                      |

---

## 3. Regulatory Requirements

### 3.1 電子帳簿保存法 (Electronic Bookkeeping Law)

Reference: [国税庁 - 電子帳簿保存法](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/index.htm)

**Effective**: 2024年1月施行 (mandatory for all corporations starting 2024)

**Requirements applicable to quotes**:

1. **真実性 (Authenticity)** — tampering prevention:
   - Either: タイムスタンプ (timestamp authority) OR システム内訂正履歴 (in-system audit trail)
   - **Our approach**: in-system audit trail via `quote_versions` append-only + `audit_logs` table
2. **可視性 (Visibility)** — readable display:
   - Display on monitor/print clearly
   - **Our approach**: PDF generation + screen view
3. **検索性 (Searchability)** — 3 mandatory search keys:
   - 取引年月日 (transaction date) — `quotes.issued_at`
   - 取引金額 (transaction amount) — `quotes.amount_total`
   - 取引先 (counter party) — `quotes.counter_party_name`
   - **Our approach**: dedicated DB indexes for these 3 columns
4. **保存期間 (Retention)** — 7 years from filing year:
   - Phải lưu 7 năm tax + audit (実務上は10年 để safe)
   - **Our approach**: 10-year retention policy per architecture doc

### 3.2 消費税 (Consumption Tax) — handling

- Standard rate: **10%** (most goods/services including construction)
- Reduced rate: **8%** (food, newspaper — rare in construction context)
- Tax-exempt: international transactions, certain residential housing (rare for Towa)
- **Display rule**: invoice must show subtotal + tax separately (not just total)
- **Computation**: line-level tax_rate, sum then round at quote level

### 3.3 印鑑 (Hanko) / Digital signature

- Traditional: hanko stamp on PDF before sending — manual workflow OK
- **Phase 1 scope**: no digital signature integration; PDF có placeholder cho hanko stamp
- Future: クラウドサイン integration (Phase 2+)

### 3.4 インボイス制度 (Qualified Invoice System)

- Effective: 2023年10月開始
- Quote → invoice flow eventually requires 登録番号 (registration number)
- **Phase 1 scope**: store optional `qualified_invoice_number` on quote (display only, no validation)

---

## 4. Reference Architectures

### 4.1 ANDPAD (アンドパッド) — major JP construction SaaS

- 見積 module: line-item editor + template + PDF + version history
- Pricing tiers: per-user monthly
- Mobile app for site updates
- **Takeaway**: line-item editor UX is core; template/preset là feature must-have

### 4.2 AnyONE (any-one.jp)

- Quote → contract → invoice → payment full chain
- 単価マスタ heavy reliance
- Excel import for line items
- **Takeaway**: CSV/Excel import cho line items; 単価マスタ critical

### 4.3 Dandori Work (ダンドリワーク)

- Project-centric flow tương tự F1+F2
- Per-project line item template
- **Takeaway**: per-project template (kế thừa từ project trước) là common pattern

### 4.4 Our reference choice

Hybrid of ANDPAD line-item UX + AnyONE 単価マスタ pattern, tuned for small contractor (no Excel import in MVP).

---

## 5. Domain Edge Cases

### 5.1 Pricing precision

- JPY no decimals at total/subtotal level — store DECIMAL(15,0)
- Per-line amount = ROUND(unit_price × quantity)
- Rounding strategy: **round half up** (四捨五入) per JP convention
- Tax: ROUND after summing (avoid cumulative rounding errors)

### 5.2 Optional line items (オプション項目)

- Some lines marked "推奨" but optional — customer can pick/exclude
- Excluded from subtotal but shown on PDF với separate section
- Subtotal display: "標準金額 ¥X (オプション含 ¥Y)"

### 5.3 Discount handling

- Two patterns common in JP:
  - **Line-level**: `unit_price` field directly reduced
  - **Quote-level**: separate `discount_amount` field
- **Our choice MVP**: line-level only (simpler); quote-level discount Phase 2

### 5.4 Negative line items (相殺/値引き)

- E.g., "下取り −¥100,000" for trade-in
- Stored as negative `amount` value with positive `quantity` + negative `unit_price`
- PDF displays as 「値引き」row in red

### 5.5 Long quote → multi-page PDF

- Typical residential remodel: 30-80 lines fitting 2-3 pages
- New construction: 200-500 lines fitting 5-10 pages
- PDF must handle page break gracefully + repeat header on each page

### 5.6 Quote cloning (見積コピー)

- "Make a similar quote from this one" pattern
- New quote_number, NEW version (v1), reset status to draft
- All lines copied with reset sort_order
- Preserve unit_price_master_id linkage cho future master price updates

### 5.7 Multiple quotes per project

- Same project can have multiple competing quotes (e.g., budget option vs premium option)
- All independent quotes, but only ONE can be marked "won" → triggers project status update
- BR: warning if 2nd quote marked won → require admin override

---

## 6. Performance Patterns

### 6.1 Line item editing UX

- Inline edit table with virtual scrolling cho 500+ lines
- Debounce subtotal recalc (300ms) to avoid every-keystroke compute
- Server-side validation on save (BR-QT-006)

### 6.2 PDF generation

- Per architecture: Puppeteer worker process — phase 1 simpler approach:
  - Synchronous PDF gen for ≤100 lines (~2s acceptable for user wait)
  - Async queue (BullMQ) for >100 lines (notify when done)
- **MVP choice**: synchronous chỉ với loading indicator (skip BullMQ for now)
- Template: Handlebars HTML → Puppeteer print to PDF

### 6.3 Search performance

- 電帳法 3 indexes: `issued_at desc`, `amount_total`, `counter_party_name gin_bigm_ops`
- Full-text: combined tsvector (similar to F1) on `notes + counter_party_name`
- Expected: 7.5K rows/year, easy < 50ms even without optimization

### 6.4 Versioning storage

- JSONB snapshot per version → ~5-10KB per version
- 22.5K versions × 10KB = ~225MB after 1 year — well within RDS
- Archive to S3 cold tier after 3 years per retention policy

---

## 7. Security Patterns

### 7.1 Authorization

- **employee**: CRUD on own draft quotes; submit; view all approved
- **manager**: approve/reject; full CRUD on all; PDF export
- **system_admin**: full + version delete (audit-logged)
- **invited_worker**: ❌ no access to quote module

### 7.2 PII in quotes

- counter_party_name = 個人/法人 name — APPI applies (Phase 1 docs)
- Quote PDF stored where? — Phase 1: re-generate on-demand (no S3 storage of PDF)
- Audit log every PDF download (who/when)

### 7.3 Field-level access

- Once approved: line items + amounts read-only; only notes editable
- "Draft mode" PDF watermark "DRAFT — 印刷不可" to prevent confusion

---

## 8. Integration Patterns

### 8.1 F1 Project integration

- `quotes.project_id` → projects.id (RESTRICT)
- Event: `quote.won` → emit → ProjectsService listens → suggest status transition (quoting → received) với amountTotal preset
- Project detail page should show list of quotes (tab "見積") — similar to PropertyListTab pattern

### 8.2 Notification (Phase 1 minimal)

- `quote.submitted` → email to all managers (request approval)
- `quote.approved` → email to creator (employee)
- `quote.sent` → audit only (no email)
- Use NotificationModule (đã có sẵn từ F8 cho password reset emails)

### 8.3 Audit module

- All status changes logged: `quote.created/submitted/approved/sent/won/lost`
- Field-level diff stored in audit_logs.changes JSONB
- Reuse pattern from F1 audit-stub.service.ts

### 8.4 Future integrations (NOT MVP)

- Slack/Teams notification on approval request
- DocuSign/クラウドサイン for digital signature
- Accounting software (freee/MoneyForward) for invoice handoff
- LINE for sending quote PDF to customer

---

## 9. Key decisions for /innovate phase

### 9.1 Open questions

1. **Quote number format**: `Q-YYYY-NNNNN` (5-digit) hay `Q-YYYYNNNN` (4-digit)? Architecture chỉ định format chưa rõ — recommend 5-digit để safe cho ~10K/year scale
2. **PDF approach**: Puppeteer worker (architecture) hay simpler (Phase 1 synchronous)? Recommend synchronous với loading UX, defer worker queue.
3. **Unit price master**: pre-seed với CSV import từ Towa hay manual data entry only? Recommend optional CSV import từ MVP cho 単価マスタ
4. **Version trigger**: auto (mỗi save sau approved) hay manual ("新規版作成" button)? Per BDD §7.1 architecture là **auto on save after first finalize**
5. **Template feature**: clone from previous quote vs save explicit template? Recommend **clone** only trong MVP (simpler)
6. **Mobile UX**: line-item edit on mobile khó với touch screen — recommend **desktop-only edit** trong MVP, mobile chỉ view

### 9.2 Out of scope MVP confirm

- ❌ AI suggestion (F2-06 → Phase 3)
- ❌ OCR receipt → line items (Phase 3)
- ❌ Multi-currency (single 円 only)
- ❌ Approval chain (only 1-level: employee submit → manager approve)
- ❌ Customer self-view portal
- ❌ Excel import line items (only manual + clone)

---

## 10. Glossary (JP-EN)

| 日本語          | English                    | Context                        |
| --------------- | -------------------------- | ------------------------------ |
| 見積 / 見積書   | Quote / Quotation          | The main document              |
| 見積項目 / 明細 | Quote line item            | Individual rows                |
| 単価            | Unit price                 | Per-unit cost                  |
| 数量            | Quantity                   | Amount of unit                 |
| 小計            | Subtotal                   | Before tax                     |
| 消費税          | Consumption tax            | Sales tax 10%/8%               |
| 合計            | Total                      | Final amount                   |
| 取引先          | Counter party              | Customer name on invoice       |
| 取引年月日      | Transaction date           | Issue date for tax purposes    |
| 版              | Version                    | Revision                       |
| 電帳法          | Electronic Bookkeeping Law | 電子帳簿保存法 — JP regulation |
| インボイス      | Qualified invoice          | 適格請求書 — 2023+ tax system  |
| 値引き          | Discount                   | Reduction                      |
| 印鑑 / 判子     | Hanko / Stamp              | Traditional seal               |
| 承認            | Approval                   | Manager sign-off               |
| 受注            | Order received             | Won quote                      |
| 失注            | Order lost                 | Lost quote                     |
