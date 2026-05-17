# API Contracts — F2 見積管理

**Feature ID**: F2-QUOTE
**Version**: BASE (Phase 1 MVP)
**Date**: 2026-05-17
**Base path**: `/api/v1`
**Auth**: HttpOnly cookie JWT (from F8)
**Error format**: `{ code, message, traceId, details? }`

---

## 1. Convention

### 1.1 URL patterns
- Plural resource names: `/quotes`, `/unit-prices`
- Path params for IDs: `:id` (UUID)
- Query params for filters/pagination

### 1.2 Response envelope
- List: `{ data: [...], total, page, pageSize }`
- Single: `{ <resourceName>: {...} }` e.g., `{ quote: {...} }`
- Action: `{ <resourceName>: {...} }` (returns updated state)
- Errors: `{ code: 'XXX', message: '...', traceId: '...', details?: {...} }`

### 1.3 Status codes
- `200 OK` — list/get/action success returning data
- `201 Created` — POST creating resource
- `204 No Content` — DELETE / status change with no body
- `400 Bad Request` — validation error
- `401 Unauthorized` — auth required / token expired
- `403 Forbidden` — role/permission check failed
- `404 Not Found` — resource doesn't exist
- `409 Conflict` — optimistic lock conflict / unique constraint
- `500 Internal` — unexpected error

### 1.4 Auth roles abbreviation
- 🔐 admin = `system_admin`
- 🔐 manager = `manager`
- 🔐 emp = `employee`
- 🔐 invited = `invited` (always ❌ for quote endpoints)

---

## 2. Quote Endpoints (`/quotes`)

### 2.1 GET `/quotes` — List quotes

**Auth**: admin / manager / emp

**Query params**:
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | tsvector search on notes + counter_party |
| `status` | string (CSV) | — | `draft,submitted,...` (multi-value) |
| `projectId` | UUID | — | Filter by project |
| `from` | date | — | issued_at ≥ (ISO 8601) |
| `to` | date | — | issued_at ≤ |
| `minAmount` | number | — | amount_total ≥ |
| `maxAmount` | number | — | amount_total ≤ |
| `counterPartySearch` | string | — | counter_party_name fuzzy (bigm) |
| `sortBy` | enum | `issuedAt` | `issuedAt` / `amountTotal` / `quoteNumber` / `createdAt` / `updatedAt` |
| `sortOrder` | enum | `desc` | `asc` / `desc` |
| `page` | int | 1 | ≥1 |
| `pageSize` | int | 20 | ≤100 |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "quoteNumber": "Q-2026-00001",
      "projectId": "uuid",
      "project": { "id": "uuid", "projectCode": "2026-0001", "name": "..." },
      "versionNo": 1,
      "version": 0,
      "status": "submitted",
      "issuedAt": "2026-05-17T00:00:00.000Z",
      "validUntil": "2026-06-15T00:00:00.000Z",
      "counterPartyName": "山田 太郎",
      "amountSubtotal": "1500000",
      "amountTax": "150000",
      "amountTotal": "1650000",
      "notes": "...",
      "qualifiedInvoiceNumber": null,
      "approvedBy": null,
      "approvedAt": null,
      "sentAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### 2.2 GET `/quotes/:id` — Get quote detail (with lines)

**Auth**: admin / manager / emp

**Response 200**:
```json
{
  "quote": {
    "id": "uuid",
    "quoteNumber": "Q-2026-00001",
    "projectId": "uuid",
    "project": { "id": "uuid", "projectCode": "2026-0001", "name": "...", "customerId": "uuid" },
    "versionNo": 1,
    "version": 3,
    "status": "approved",
    "issuedAt": "2026-05-17T00:00:00.000Z",
    "validUntil": "2026-06-15T00:00:00.000Z",
    "counterPartyName": "山田 太郎",
    "amountSubtotal": "1500000",
    "amountTax": "150000",
    "amountTotal": "1650000",
    "notes": "...",
    "qualifiedInvoiceNumber": "T1234567890123",
    "approvedBy": "uuid",
    "approvedByUser": { "id": "uuid", "name": "営業マネージャー" },
    "approvedAt": "2026-05-17T10:00:00.000Z",
    "sentAt": null,
    "createdAt": "...",
    "updatedAt": "...",
    "createdById": "uuid",
    "updatedById": "uuid",
    "lines": [
      {
        "id": "uuid",
        "sortOrder": 0,
        "category": "外壁工事",
        "itemName": "外壁塗装",
        "description": "シリコン塗装",
        "unit": "m²",
        "quantity": "100.00",
        "unitPrice": "3000",
        "amount": "300000",
        "taxRate": "0.10",
        "isOptional": false,
        "unitPriceMasterId": "uuid"
      }
    ]
  }
}
```

**Errors**: 404 `QUOTE_NOT_FOUND`

---

### 2.3 GET `/quotes/:id/versions` — Version history

**Auth**: admin / manager / emp

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "quoteId": "uuid",
      "versionNo": 2,
      "changeType": "correction",
      "changeReason": "顧客要望により単価変更",
      "snapshot": { "quote": {...}, "lines": [...], "capturedAt": "..." },
      "changedById": "uuid",
      "changedByUser": { "id": "uuid", "name": "営業マネージャー" },
      "changedAt": "2026-05-17T11:00:00.000Z"
    }
  ]
}
```

---

### 2.4 GET `/quotes/:id/pdf` — Download PDF

**Auth**: admin / manager / emp

**Response 200**:
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="Q-2026-00001-v1.pdf"`
- Body: PDF binary buffer

**Errors**: 404 `QUOTE_NOT_FOUND`, 500 on PDF gen failure (`PDF_GENERATION_FAILED`)

**Side effect**: audit `quote.pdf_downloaded`

---

### 2.5 POST `/quotes` — Create draft quote

**Auth**: admin / manager / emp

**Request body**:
```json
{
  "projectId": "uuid",
  "issuedAt": "2026-05-17",
  "validUntil": "2026-06-15",
  "notes": "...",
  "qualifiedInvoiceNumber": "T1234567890123",
  "lines": [
    {
      "category": "外壁工事",
      "itemName": "外壁塗装",
      "description": "シリコン塗装",
      "unit": "m²",
      "quantity": 100,
      "unitPrice": 3000,
      "taxRate": 0.10,
      "isOptional": false,
      "unitPriceMasterId": "uuid"
    }
  ]
}
```

**Validation** (Zod / class-validator):
- `projectId` required UUID
- `issuedAt` required ISO date
- `lines` required, ≥1 line, at least 1 non-optional
- Each line: itemName ≥1 chars, unit ≥1 char, quantity != 0, taxRate 0-1

**Response 201**: `{ quote: {...} }` (with computed totals + counter_party snapshot)

**Errors**:
- 400 `VALIDATION_FAILED` — bad input
- 404 `PROJECT_NOT_FOUND` — projectId invalid
- 403 — invited role

---

### 2.6 PUT `/quotes/:id` — Update draft/rejected quote

**Auth**: admin / manager / emp (own draft) — based on FR-QT-013

**Request body**:
```json
{
  "version": 3,  // optimistic lock — current version from GET
  "issuedAt": "2026-05-17",
  "validUntil": "2026-06-15",
  "notes": "Updated notes",
  "qualifiedInvoiceNumber": "T1234567890123",
  "lines": [ /* full replacement */ ]
}
```

**Response 200**: `{ quote: {...} }` (with re-computed totals)

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 409 `QUOTE_CONFLICT` — version mismatch (optimistic lock)
- 400 `QUOTE_LOCKED` — status not in [draft, rejected]
- 403 — permission denied (employee editing others' draft)

---

### 2.7 DELETE `/quotes/:id` — Soft delete (admin only)

**Auth**: admin only

**Request body**:
```json
{ "reason": "Wrong customer assigned, manually entered duplicate" }
```

**Response 204 No Content**

**Side effects**:
- Snapshot version (`change_type='deletion'`, `change_reason`)
- Set `deleted_at`
- Audit `quote.deleted`

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 400 `QUOTE_DELETE_REASON_REQUIRED` (reason <5 chars)
- 403 — non-admin

---

### 2.8 POST `/quotes/:id/clone` — Clone to new draft

**Auth**: admin / manager / emp

**Request body** (optional):
```json
{ "newName": "山田様邸 浴室リフォーム (V2)" }
```

**Response 201**: `{ quote: {...} }` (new draft with new quote_number)

**Behavior**:
- New quote_number (sequence advance)
- status = `draft`
- version_no = 1
- All lines copied (preserve unit_price_master_id)
- counter_party_name preserved from source
- issuedAt = today

**Errors**: 404 `QUOTE_NOT_FOUND`

---

### 2.9 POST `/quotes/:id/submit` — Submit for approval

**Auth**: admin / manager / emp

**Request body**: (empty)

**Response 200**: `{ quote: {...} }` (status updated)

**Routing logic**:
- If `amount_total ≤ 10,000,000` → status `submitted` (tier 1)
- If `amount_total > 10,000,000` → status `pending_admin` (tier 2)

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 400 `QUOTE_INVALID_STATUS_TRANSITION` — current status not in [draft, rejected]

---

### 2.10 POST `/quotes/:id/approve` — Approve

**Auth** (per status):
- status `submitted` → admin / manager allowed
- status `pending_admin` → admin only

**Request body**: (empty)

**Response 200**: `{ quote: {...} }` (status = `approved`, `approved_by/at` set)

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 403 `QUOTE_TIER2_REQUIRES_ADMIN` — manager trying to approve `pending_admin`
- 400 `QUOTE_INVALID_STATUS_TRANSITION` — wrong status

---

### 2.11 POST `/quotes/:id/reject` — Reject

**Auth**: admin / manager (anyone with approval rights)

**Request body**:
```json
{ "reason": "Pricing too high, please revise" }
```

**Response 200**: `{ quote: {...} }` (status = `rejected`)

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 400 `QUOTE_REJECT_REASON_REQUIRED` — reason <5 chars
- 400 `QUOTE_INVALID_STATUS_TRANSITION`

---

### 2.12 POST `/quotes/:id/send` — Send to customer

**Auth**: admin / manager / emp

**Request body**: (empty)

**Response 200**: `{ quote: {...} }` (status = `sent`, `sent_at` recorded)

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 400 — current status not `approved`

---

### 2.13 POST `/quotes/:id/won` — Mark won

**Auth**: admin / manager / emp

**Request body**: (empty)

**Response 200**: `{ quote: {...} }` (status = `won`)

**Side effect**: emits `quote.won` event with `{ quoteId, projectId, amountTotal }`

**BR-QT-016 check**: If another quote in same project already `won` AND requester is not admin → 409 `QUOTE_ANOTHER_WON_EXISTS`

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 400 — status not `sent`
- 409 `QUOTE_ANOTHER_WON_EXISTS`

---

### 2.14 POST `/quotes/:id/lost` — Mark lost

**Auth**: admin / manager / emp

**Request body** (optional):
```json
{ "reason": "Customer chose competitor" }
```

**Response 200**: `{ quote: {...} }` (status = `lost`)

**Errors**: 404 `QUOTE_NOT_FOUND`, 400 invalid transition

---

### 2.15 POST `/quotes/:id/version` — Create v2 from sent quote (D7)

**Auth**: admin / manager / emp (own original)

**Request body**:
```json
{ "changeReason": "顧客要望により再見積" }
```

**Response 201**: `{ quote: {...} }` (new quote with `versionNo = source.versionNo + 1`, status `draft`)

**Behavior**:
- Snapshot source quote first
- Create new quote (copies source data + lines)
- Increment `versionNo`
- New `quote_number` (sequence advance)
- status `draft`

**Errors**:
- 404 `QUOTE_NOT_FOUND`
- 400 `QUOTE_CAN_ONLY_VERSION_FROM_SENT` — source status not in [sent, won, lost]
- 400 `QUOTE_VERSION_REASON_REQUIRED` — reason <5 chars

---

## 3. Unit Prices Endpoints (`/unit-prices`)

### 3.1 GET `/unit-prices` — List unit prices

**Auth**: admin / manager / emp (all internal roles, for picker)

**Query params**:
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | code + item_name |
| `category` | string | — | Exact match |
| `isActive` | boolean | — | Filter active/inactive |
| `sortBy` | enum | `itemName` | `itemName` / `code` / `defaultUnitPrice` |
| `sortOrder` | enum | `asc` | — |
| `page` | int | 1 | — |
| `pageSize` | int | 50 | ≤100 |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "EXT-PNT-001",
      "category": "外壁工事",
      "itemName": "外壁塗装 (シリコン)",
      "description": null,
      "unit": "m²",
      "defaultUnitPrice": "3000",
      "supplierName": null,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 50
}
```

---

### 3.2 POST `/unit-prices` — Create (admin only)

**Auth**: admin only

**Request body**:
```json
{
  "code": "EXT-PNT-001",
  "category": "外壁工事",
  "itemName": "外壁塗装 (シリコン)",
  "description": "5年保証付き",
  "unit": "m²",
  "defaultUnitPrice": 3000,
  "supplierName": "A塗装会社"
}
```

**Validation**:
- `code` required, ≤30 chars, unique
- `itemName` required, ≤200 chars
- `unit` required, ≤20 chars
- `defaultUnitPrice` required, ≥0

**Response 201**: `{ unitPrice: {...} }`

**Errors**:
- 400 `VALIDATION_FAILED`
- 409 `UNIT_PRICE_CODE_EXISTS`
- 403 — non-admin

---

### 3.3 PUT `/unit-prices/:id` — Update (admin only)

**Auth**: admin only

**Request body**: partial updates (any field except `code`)

**Response 200**: `{ unitPrice: {...} }`

**Errors**:
- 404 `UNIT_PRICE_NOT_FOUND`
- 403 — non-admin

---

### 3.4 DELETE `/unit-prices/:id` — Soft delete (admin only)

**Auth**: admin only

**Response 204 No Content**

**Behavior**: sets `deleted_at` + `is_active=false`; preserves references in existing quote_lines

**Errors**: 404 `UNIT_PRICE_NOT_FOUND`, 403 — non-admin

---

## 4. Error Reference

| Code | Status | Message JP | Source |
|---|---|---|---|
| `QUOTE_NOT_FOUND` | 404 | 見積が見つかりません | `QuoteNotFoundError` |
| `QUOTE_CONFLICT` | 409 | 他のユーザーが編集しました | `QuoteConflictError` (optimistic lock) |
| `QUOTE_INVALID_STATUS_TRANSITION` | 400 | {from} から {to} への遷移は許可されていません | Status machine |
| `QUOTE_TIER2_REQUIRES_ADMIN` | 403 | 管理者の承認が必要です | Tier 2 check |
| `QUOTE_REJECT_REASON_REQUIRED` | 400 | 却下理由は5文字以上必要です | Reject validation |
| `QUOTE_DELETE_REASON_REQUIRED` | 400 | 削除理由は5文字以上必要です | Soft delete |
| `QUOTE_LOCKED` | 400 | ステータス「{status}」の見積は編集できません | Edit on non-draft |
| `QUOTE_CAN_ONLY_VERSION_FROM_SENT` | 400 | 送付済以降の見積のみ新規版作成できます | Version creation |
| `QUOTE_VERSION_REASON_REQUIRED` | 400 | 変更理由は5文字以上必要です | Version creation |
| `QUOTE_ANOTHER_WON_EXISTS` | 409 | この案件にはすでに受注見積があります | Won check |
| `PROJECT_NOT_FOUND` | 404 | 案件が見つかりません | From F1 (referenced) |
| `UNIT_PRICE_NOT_FOUND` | 404 | 単価マスタが見つかりません | `UnitPriceNotFoundError` |
| `UNIT_PRICE_CODE_EXISTS` | 409 | 単価コード「{code}」はすでに存在します | Unique constraint |
| `VALIDATION_FAILED` | 400 | (per field message) | class-validator global pipe |
| `AUTH_INSUFFICIENT_PERMISSION` | 403 | この操作を実行する権限がありません | F8 Auth |
| `AUTH_TOKEN_INVALID` | 401 | 認証情報が無効です | F8 Auth |
| `INTERNAL_ERROR` | 500 | 内部エラーが発生しました | Global filter fallback |

---

## 5. Event Payloads (EventEmitter2)

### `quote.created`
```json
{ "quoteId": "uuid", "projectId": "uuid" }
```

### `quote.updated`
```json
{ "quoteId": "uuid", "changedFields": ["notes", "lines"] }
```

### `quote.submitted`
```json
{ "quoteId": "uuid", "tier": 1 }  // or tier: 2
```

### `quote.approved`
```json
{ "quoteId": "uuid", "tier": 1 }
```

### `quote.rejected`
```json
{ "quoteId": "uuid", "reason": "..." }
```

### `quote.sent`
```json
{ "quoteId": "uuid" }
```

### `quote.won`
```json
{ "quoteId": "uuid", "projectId": "uuid", "amountTotal": 1650000 }
```

### `quote.lost`
```json
{ "quoteId": "uuid" }
```

### `quote.deleted`
```json
{ "quoteId": "uuid" }
```

### `quote.cloned`
```json
{ "newId": "uuid", "sourceId": "uuid" }
```

### `quote.version.created`
```json
{ "quoteId": "uuid", "versionNo": 2, "changeType": "correction" }
```

---

## 6. Audit Log Actions

Stored in `audit_logs.action` (text), entity_type='quote', entity_id=quoteId.

| Action | Triggered by | changes payload |
|---|---|---|
| `quote.created` | POST /quotes | — |
| `quote.updated` | PUT /quotes/:id | `{ fields: [...] }` |
| `quote.submitted` | POST /quotes/:id/submit | `{ tier: 1 }` or `{ tier: 2 }` |
| `quote.approved` | POST /quotes/:id/approve | `{ tier: 1 }` or `{ tier: 2 }` |
| `quote.rejected` | POST /quotes/:id/reject | `{ reason: "..." }` |
| `quote.sent` | POST /quotes/:id/send | — |
| `quote.won` | POST /quotes/:id/won | `{ projectId, amountTotal }` |
| `quote.lost` | POST /quotes/:id/lost | — |
| `quote.deleted` | DELETE /quotes/:id | `{ reason }` |
| `quote.version_created` | (internal) | `{ versionNo, changeType }` |
| `quote.pdf_downloaded` | GET /quotes/:id/pdf | — |
| `quote.cloned` | POST /quotes/:id/clone | `{ sourceId }` |

---

## 7. Endpoint Summary Table

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /quotes | adm/mgr/emp | List with filter |
| GET | /quotes/:id | adm/mgr/emp | Detail + lines |
| GET | /quotes/:id/versions | adm/mgr/emp | Version history |
| GET | /quotes/:id/pdf | adm/mgr/emp | Download PDF |
| POST | /quotes | adm/mgr/emp | Create draft |
| PUT | /quotes/:id | adm/mgr/emp(own) | Update (optimistic lock) |
| DELETE | /quotes/:id | adm | Soft delete |
| POST | /quotes/:id/clone | adm/mgr/emp | Clone to new draft |
| POST | /quotes/:id/submit | adm/mgr/emp | Submit (auto-route tier) |
| POST | /quotes/:id/approve | adm (tier 2) / mgr (tier 1) | Approve |
| POST | /quotes/:id/reject | adm/mgr | Reject with reason |
| POST | /quotes/:id/send | adm/mgr/emp | Send to customer |
| POST | /quotes/:id/won | adm/mgr/emp | Mark won |
| POST | /quotes/:id/lost | adm/mgr/emp | Mark lost |
| POST | /quotes/:id/version | adm/mgr/emp(own) | Create v2 from sent |
| GET | /unit-prices | adm/mgr/emp | List master |
| POST | /unit-prices | adm | Create master |
| PUT | /unit-prices/:id | adm | Update master |
| DELETE | /unit-prices/:id | adm | Soft delete master |

**Total: 19 endpoints** (15 quotes + 4 unit-prices)

---

## 8. Sample curl Requests

### Login (from F8, reused)
```bash
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@dev.shikou-kanri.local","password":"DevPassword123!"}'
```

### Create quote
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_UUID",
    "issuedAt": "2026-05-17",
    "validUntil": "2026-06-15",
    "notes": "テスト見積",
    "lines": [
      {
        "category": "外壁工事",
        "itemName": "外壁塗装",
        "unit": "m²",
        "quantity": 100,
        "unitPrice": 3000,
        "taxRate": 0.10,
        "isOptional": false
      }
    ]
  }'
```

### Submit quote
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes/QUOTE_UUID/submit
```

### Approve quote
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes/QUOTE_UUID/approve
```

### Reject quote
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes/QUOTE_UUID/reject \
  -H "Content-Type: application/json" \
  -d '{"reason":"単価が高すぎます。再見直しお願いします。"}'
```

### Send quote
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes/QUOTE_UUID/send
```

### Won
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes/QUOTE_UUID/won
```

### Download PDF
```bash
curl -b cookies.txt http://localhost:3000/api/v1/quotes/QUOTE_UUID/pdf \
  -o quote.pdf
```

### Create v2 from sent
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/quotes/QUOTE_UUID/version \
  -H "Content-Type: application/json" \
  -d '{"changeReason":"顧客要望により単価変更"}'
```

### Search with 電帳法 keys
```bash
curl -b cookies.txt "http://localhost:3000/api/v1/quotes?from=2026-01-01&to=2026-12-31&minAmount=1000000&maxAmount=10000000&counterPartySearch=山田"
```

### Create unit price master (admin)
```bash
curl -b cookies-admin.txt -X POST http://localhost:3000/api/v1/unit-prices \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EXT-PNT-001",
    "category": "外壁工事",
    "itemName": "外壁塗装 (シリコン)",
    "unit": "m²",
    "defaultUnitPrice": 3000
  }'
```

---

## 9. Notes for Implementers

### 9.1 Optimistic locking flow (FR-QT-015)
1. GET /quotes/:id returns `version: N`
2. Client sends PUT /quotes/:id with `version: N` in body
3. Server: `updateMany WHERE id=? AND version=?` → check count
4. If count=0 → throw QuoteConflictError (409)
5. Client catches 409 → reload + retry

### 9.2 2-tier approval routing (D1, D5)
- Client submits same endpoint regardless of tier
- Server decides target status based on `amount_total`
- For tier 2, status enters `pending_admin` — visible to admins only
- Manager UI hides "approve" button when status=`pending_admin`

### 9.3 Counter party snapshot (BR-QT-014)
- Set at quote create from `project.customer.name`
- Never updated even if customer rename later
- Preserves invoice/quote document integrity for audit

### 9.4 PDF generation latency
- Sync endpoint can take 1-10s for large quotes
- Frontend should show loading indicator
- Consider client-side timeout 30s
- Phase 2 future: async with status polling endpoint

### 9.5 電帳法 search performance
- `counter_party_name` GIN bigm — sub-50ms typical
- Combined date+amount range — uses both indexes via index intersection
- For complex queries, may need composite index (Phase 2 if perf issue)

---

*API Contracts — F2 見積管理 v1.0 — 19 endpoints + error catalog + event payloads + audit actions*
