# SRS Selection — F2 見積管理

**Feature**: F2-QUOTE
**Phase**: 1 MVP
**Generated**: 2026-05-17
**State**: SRS_CREATED (after this save)

---

## 1. Decisions (8 items)

### D1 — Approval Workflow: 2-level with threshold

- **Choice**: employee → manager (default) → admin (if amount > ¥10M)
- **Rationale**: Phù hợp scale Towa (mid-size contractor). Báo giá lớn cần admin oversight cho risk management.
- **Code**: `BR-QT-APPROVAL-001`
- **Impact**: Status machine có 3 actors; `submitted` → tự routing: manager hoặc admin tier.

### D2 — PDF Generation: Synchronous In-Process Puppeteer

- **Choice**: Puppeteer headless Chromium chạy in-process, response = PDF buffer
- **Rationale**: MVP đơn giản, đủ tốt cho ≤100 lines (~2s generate). Defer worker queue đến khi performance issue.
- **Code**: `BR-QT-PDF-001`
- **Trade-off**: +250MB image size (Puppeteer); chấp nhận được cho MVP.

### D3 — 単価マスタ: Manual Entry + Seed

- **Choice**: Admin nhập tay qua UI, seed 30-50 items mẫu cho dev
- **Rationale**: Towa chưa có file Excel master sẵn. Manual đủ tốt cho early adoption.
- **Code**: `BR-QT-MASTER-001`
- **Future**: CSV import phase 2 nếu cần bulk update.

### D4 — Quote-Project Cardinality: N quotes per 1 project, only 1 won

- **Choice**: Multiple competing quotes per project; only 1 can transition to status='won'
- **Rationale**: Cho phép sales propose budget vs premium options; reflects thực tế.
- **Code**: `BR-QT-LINK-001`
- **Constraint**: BR — warn nếu cố mark 2nd quote 'won' → admin override required.

### D5 — Approval Threshold: ¥10,000,000 (hard-code MVP)

- **Choice**: Constant `APPROVAL_TIER2_THRESHOLD_JPY = 10_000_000`
- **Rationale**: 10M JPY = typical residential renovation cap. Phase 2 có thể move sang config.
- **Code**: `BR-QT-APPROVAL-002`

### D6 — Mobile UX: Full Edit Support

- **Choice**: Responsive line items với card view trên `<sm` breakpoint; desktop dùng table
- **Rationale**: Sales tạo quote tại hiện trường khách hàng — value cao.
- **Code**: `BR-QT-MOBILE-001`
- **Effort**: +6h dev so với desktop-only, đáng giá.

### D7 — Post-Sent Edit: Lock + Clone New Version

- **Choice**: Sent quote = immutable; "Create v2" tạo new quote_version với change_reason
- **Rationale**: 電帳法 §7.1 compliant; append-only audit trail.
- **Code**: `BR-QT-EDIT-001`
- **UX**: Button "新規版作成 (Create v2)" only visible khi status ≥ sent.

### D8 — Optional Items: Separate PDF Section + Subtotal

- **Choice**: PDF chia 2 bảng — "見積金額" (required) + "オプション" (separate subtotal); main amount_total chỉ tính required
- **Rationale**: Customer rõ ràng phần nào bắt buộc vs optional. UX chuẩn JP.
- **Code**: `BR-QT-OPTIONAL-001`
- **Data**: `quote_lines.is_optional BOOLEAN`; aggregator excludes when `true`.

---

## 2. Function List (16 items)

### Core (MVP — must have)

| ID        | Name                              | JP                 | Description                                                                                                                        |
| --------- | --------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| FR-QT-001 | Quote CRUD                        | 見積CRUD           | Create/Read/Update/Delete (soft) cho draft quotes; tied to project                                                                 |
| FR-QT-002 | Line Items Editor                 | 明細編集           | Add/remove/reorder lines; inline edit unit price/quantity; auto-compute amounts; mobile responsive (D6)                            |
| FR-QT-003 | 単価マスタ CRUD                   | 単価マスタ管理     | Admin maintain master prices; Select from master when adding line; Manual override price OK (D3)                                   |
| FR-QT-004 | Status Machine + 2-Level Approval | ステータス・承認   | draft → submitted → approved → sent → won/lost; routing per D1+D5; reasons required for rejection/cancellation                     |
| FR-QT-005 | PDF Generation + Download         | PDF出力            | Sync Puppeteer per D2; Handlebars template; BOM cho Excel; sections per D8                                                         |
| FR-QT-006 | 電帳法 Versioning                 | 電帳法版管理       | Append-only quote_versions; snapshot JSONB; change_type + change_reason; trigger per D7                                            |
| FR-QT-007 | Compliant Search                  | 検索 (電帳法)      | 3 mandatory search keys (issued_at, amount_total, counter_party_name) + filter status/type                                         |
| FR-QT-008 | Clone Quote                       | 見積コピー         | Copy lines từ existing quote → new draft với reset status, quote_number, version_no                                                |
| FR-QT-009 | Optional Items Handling           | オプション項目処理 | is_optional flag + separate subtotal aggregator + PDF section per D8                                                               |
| FR-QT-010 | Won Quote → Project Transition    | 受注 → 案件遷移    | When status='won' + project='quoting' → prompt user transition project → received với amountTotal = quote.amount_total (BR-QT-005) |
| FR-QT-011 | Mobile Edit Support               | モバイル編集       | Card view line items <sm; touch-friendly inputs; same data model (D6)                                                              |

### Supporting (MVP — required infrastructure)

| ID        | Name                     | Description                                                                                                      |
| --------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| FR-QT-012 | Audit Trail              | ~10 events: quote.created/updated/submitted/approved/rejected/sent/won/lost/deleted/versionCreated/pdfDownloaded |
| FR-QT-013 | Permission Gates         | 4-role matrix: admin (all + override), manager (approve ≤¥10M), employee (CRUD own draft), invited (no access)   |
| FR-QT-014 | Project Detail Quote Tab | New tab "見積" trên ProjectDetailPage liệt kê all quotes; create/clone từ đây                                    |
| FR-QT-015 | Optimistic Locking       | `version` INT field; reject update on stale version                                                              |
| FR-QT-016 | i18n Full                | ja/en/vi cho ~200 keys: status, action, columns, validation, errors                                              |

### Optional (Phase 2 — defer)

- CSV bulk import line items
- Excel-style copy-paste editor
- Email PDF to customer (integrated SMTP send)
- Slack/Teams notification on approval request
- Configurable approval threshold via env/settings

### Excluded (Phase 3+ scope)

- **F2-06** AI suggestion (similar quote ranking)
- OCR receipt → line items
- Multi-currency support
- Digital signature integration (クラウドサイン / DocuSign)
- Multi-tier approval (>2 levels)
- Customer self-view portal
- Excel template generation

---

## 3. Compliance Mapping

| Regulation            | Requirement                   | Implementation                                                                             |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| **電子帳簿保存法 §7** | 真実性 (authenticity)         | `quote_versions` append-only + audit_logs                                                  |
|                       | 可視性 (visibility)           | PDF export + screen render                                                                 |
|                       | 検索性 (3 keys)               | `idx_quotes_issued_at` + `idx_quotes_amount_total` + `idx_quotes_counter_party_bigm` (GIN) |
|                       | 保存期間                      | 10yr retention (S3 cold tier ≥3yr per architecture)                                        |
| **消費税法**          | Tax 10% standard + 8% reduced | `quote_lines.tax_rate` per-line                                                            |
|                       | Invoice display               | Subtotal + tax + total separately on PDF                                                   |
| **適格請求書制度**    | 登録番号 (registration #)     | Optional field `qualified_invoice_number` (display-only MVP)                               |
| **APPI**              | Customer name on quote        | counter_party_name snapshot (BR-QT-014)                                                    |

---

## 4. Approval Decision Tree

```
quote.submitted
  │
  ├── amount_total ≤ ¥10M
  │     └── notify all managers → first to approve wins
  │           └── approved (by manager)
  │
  └── amount_total > ¥10M
        └── notify managers + admins → both tiers required
              ├── manager approves first → pending_admin
              └── admin approves → approved
```

**Reject path**: any tier can reject với reason ≥10 chars → status='rejected' → editor can revise → resubmit

---

## 5. Risk Register

| Risk                                       | Mitigation                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| Puppeteer image size +250MB in Docker      | Multi-stage build, exclude Chromium from dev image        |
| Concurrent edit conflicts                  | Optimistic locking (FR-QT-015)                            |
| Large quote (500+ lines) slow PDF gen      | Pagination in template + async option phase 2             |
| Master price drift after quote line copies | Snapshot unit_price at copy time (line stores own price)  |
| 10M threshold too rigid                    | Document constant location for easy bump phase 2          |
| Mobile edit UX complexity                  | Iterate after user feedback; fallback view-only mode flag |

---

## 6. Out of MVP — explicit list

- AI similar quote suggestion → Phase 3 (F2-06)
- OCR scanning supplier receipts → Phase 3
- Excel/CSV import line items
- Multi-currency (only JPY in MVP)
- Customer-facing quote review portal
- Digital signature workflows
- Configurable approval threshold (env-based)
- 3+ tier approval chains
- Quote template library (only clone existing)
- Auto-send PDF email (only download + manual send)

---

## 7. State

- Previous: RESEARCHED
- Current: SRS_CREATED (after this save)
- Next: INNOVATE_TECHNICAL (BD + DD decisions)

---

_Decisions reached through 9 questions covering: approval flow, PDF tech, master data, project link cardinality, threshold, mobile UX, post-sent edit policy, optional items handling. Trade-offs documented per item._
