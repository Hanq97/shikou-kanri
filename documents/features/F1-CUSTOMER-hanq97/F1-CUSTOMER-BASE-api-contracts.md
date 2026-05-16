# F1-CUSTOMER — API Contracts

**Feature**: F1 顧客・案件管理
**Version**: BASE — 2026-05-16
**Author**: hanq97
**Base URL**: `/api/v1`
**Auth**: JWT qua HttpOnly cookie (`__Host-access_token` / `__Host-refresh_token` ở prod)
**Content-Type**: `application/json` (trừ CSV import = `multipart/form-data`)
**Error format**: `{ code: string, message: string, traceId: string, ...extra? }`

---

## 1. Common conventions

### 1.1 Pagination
Request query: `?page=1&pageSize=50&sortBy=createdAt&sortOrder=desc`
Response body:
```json
{
  "data": [ ... ],
  "total": 1234,
  "page": 1,
  "pageSize": 50
}
```

### 1.2 Filters
Per-field query param. Multi-value: comma-separated hoặc repeat (`?status=construction&status=received`).

### 1.3 Authorization
- `Cookie: access_token=...` required cho mọi endpoint trừ public auth (đã có F8)
- 401 nếu token thiếu/invalid/expired → FE tự refresh qua /auth/refresh interceptor
- 403 nếu role không đủ quyền

### 1.4 Common error codes (đã có F8)
| Code | HTTP | Message (ja) |
|---|---|---|
| `AUTH_TOKEN_EXPIRED` | 401 | セッションが期限切れです |
| `AUTH_INSUFFICIENT_PERMISSION` | 403 | この操作を実行する権限がありません |
| `AUTH_RATE_LIMITED` | 429 | 操作が多すぎます |
| `VALIDATION_ERROR` | 400 | 入力内容に誤りがあります |
| `NOT_FOUND` | 404 | リソースが見つかりません |
| `INTERNAL_ERROR` | 500 | サーバーエラーが発生しました |

### 1.5 F1-specific error codes
| Code | HTTP | Context |
|---|---|---|
| `CUSTOMER_NOT_FOUND` | 404 | Customer ID invalid hoặc soft-deleted |
| `CUSTOMER_HAS_ACTIVE_PROJECTS` | 409 | Soft-delete customer khi còn active project |
| `PROPERTY_NOT_FOUND` | 404 | — |
| `PROPERTY_PHOTO_TOO_MANY` | 400 | >3 photos |
| `PROPERTY_PHOTO_TOO_LARGE` | 400 | >150KB/string |
| `PROJECT_NOT_FOUND` | 404 | — |
| `PROJECT_INVALID_STATUS_TRANSITION` | 400 | Forward transition không hợp lệ |
| `PROJECT_MISSING_FIELD_FOR_TRANSITION` | 400 | E.g. missing amount_total when received |
| `PROJECT_MISSING_PROPERTY` | 400 | Cần property cho handed_over |
| `PROJECT_MISSING_HANDOVER_DATE` | 400 | property.handover_date null |
| `PROJECT_CANCEL_REASON_REQUIRED` | 400 | Cancel cần reason ≥5 chars |
| `PROJECT_CUSTOMER_REQUIRED` | 400 | Phải có customer hoặc preAcquisition flag |
| `PROJECT_INVALID_OWNER` | 400 | Owner role không phải admin/manager/employee |
| `PROJECT_MEMBER_NOT_FOUND` | 404 | — |
| `PROJECT_MEMBER_ALREADY_EXISTS` | 409 | Duplicate add |
| `PROJECT_LAST_OWNER` | 409 | Cannot demote/remove last owner |
| `SAVED_SEARCH_NOT_FOUND` | 404 | — |

---

## 2. Customer endpoints

### 2.1 List customers

**Endpoint**: `GET /api/v1/customers`

**Authorization**: `system_admin` / `manager` / `employee`

**Query params**:
| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | FTS keyword (matches name, name_kana, phone, address) |
| `isOb` | boolean | — | Filter OB customer |
| `sortBy` | enum | `createdAt` | `createdAt` / `name` / `lastLoginAt` |
| `sortOrder` | enum | `desc` | `asc` / `desc` |
| `page` | number | 1 | ≥1 |
| `pageSize` | number | 50 | 1..100 |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "customerType": "individual",
      "name": "山田 太郎",
      "nameKana": "ヤマダ タロウ",
      "phone": "0312345678",
      "email": "yamada@example.com",
      "address": "東京都新宿区...",
      "isOb": true,
      "acquiredAt": "2018-04-15",
      "notes": null,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-16T03:00:00.000Z"
    }
  ],
  "total": 1234,
  "page": 1,
  "pageSize": 50
}
```

### 2.2 Get customer

**Endpoint**: `GET /api/v1/customers/:id`

**Authorization**: same as list

**Response 200**:
```json
{
  "customer": { /* same shape as list item */ }
}
```

**Errors**: 404 `CUSTOMER_NOT_FOUND`

### 2.3 Create customer

**Endpoint**: `POST /api/v1/customers?force=true|false`

**Authorization**: `system_admin` / `manager` / `employee`

**Request body**:
```json
{
  "customerType": "individual",
  "name": "山田 太郎",
  "nameKana": "ヤマダ タロウ",
  "phone": "03-1234-5678",
  "email": "yamada@example.com",
  "address": "東京都新宿区...",
  "isOb": false,
  "acquiredAt": "2026-05-16",
  "notes": null
}
```

**Response 201** (created):
```json
{ "customer": { /* customer DTO */ } }
```

**Response 200** (duplicate phone detected, force=false):
```json
{
  "duplicateOf": {
    "id": "uuid",
    "name": "existing customer name",
    "address": "existing address"
  }
}
```
→ FE shows confirm modal → retry with `?force=true` to bypass.

**Errors**: 400 `VALIDATION_ERROR`, 403 `AUTH_INSUFFICIENT_PERMISSION`

### 2.4 Update customer

**Endpoint**: `PUT /api/v1/customers/:id?force=true|false`

**Authorization**: `system_admin` / `manager` any; `employee` own only

**Request body**: same as create, all fields optional (partial)

**Response 200**: `{ customer }` HOẶC `{ duplicateOf }` nếu phone đổi gây trùng

**Errors**: 404, 403, 400

### 2.5 Soft delete customer

**Endpoint**: `DELETE /api/v1/customers/:id`

**Authorization**: `system_admin` only

**Response 204**: No content

**Errors**:
- 404 `CUSTOMER_NOT_FOUND`
- 409 `CUSTOMER_HAS_ACTIVE_PROJECTS`:
  ```json
  {
    "code": "CUSTOMER_HAS_ACTIVE_PROJECTS",
    "message": "3件のアクティブな案件があるため削除できません",
    "count": 3,
    "projects": [
      { "id": "uuid", "projectCode": "2026-0042", "name": "...", "status": "construction" }
    ],
    "traceId": "..."
  }
  ```

### 2.6 List properties of customer

**Endpoint**: `GET /api/v1/customers/:id/properties`

**Authorization**: same as list customers (deny invited)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "address": "東京都新宿区...",
      "propertyType": "single_family",
      "structure": "wood",
      "yearBuilt": 2018,
      "handoverDate": "2018-08-20",
      "floorAreaSqm": "120.50",
      "photoUrls": ["data:image/jpeg;base64,..."],
      "notes": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### 2.7 List projects of customer (F1-04 timeline)

**Endpoint**: `GET /api/v1/customers/:id/projects?sortBy=createdAt&sortOrder=desc&pageSize=50`

**Authorization**: deny invited

**Response 200**: same shape as `GET /projects`, scoped to customer.

### 2.8 CSV Import

**Endpoint**: `POST /api/v1/customers/import-csv`

**Authorization**: `system_admin` only

**Content-Type**: `multipart/form-data`

**Form fields**:
- `file`: CSV file (≤5MB, UTF-8 with BOM optional)

**CSV columns** (header required):
```
name, name_kana, phone, email, address, customer_type, is_ob, acquired_at, notes
```

**Response 200**:
```json
{
  "created": 1873,
  "skipped": 127,
  "errors": [
    { "rowIndex": 42, "message": "customer_type must be individual|corporate", "raw": {...} }
  ]
}
```

**Errors**: 400 (file missing/invalid), 403, 500

---

## 3. Property endpoints

### 3.1 List properties

**Endpoint**: `GET /api/v1/properties?customerId=<uuid>&page=1&pageSize=50`

**Authorization**: deny invited

**Response 200**: same shape `{ data: [...], total, page, pageSize }`

### 3.2 Get property

**Endpoint**: `GET /api/v1/properties/:id`

**Response 200**: `{ property: {...} }`

### 3.3 Create property

**Endpoint**: `POST /api/v1/properties`

**Authorization**: `system_admin` / `manager` / `employee`

**Request body**:
```json
{
  "customerId": "uuid",
  "address": "...",
  "propertyType": "single_family",
  "structure": "wood",
  "yearBuilt": 2018,
  "handoverDate": "2018-08-20",
  "floorAreaSqm": 120.5,
  "photoUrls": ["data:image/jpeg;base64,/9j/..."],
  "notes": null
}
```

**Response 201**: `{ property }`

**Errors**:
- 400 `PROPERTY_PHOTO_TOO_MANY` / `PROPERTY_PHOTO_TOO_LARGE`
- 404 `CUSTOMER_NOT_FOUND` (nếu customerId invalid)

### 3.4 Update property

**Endpoint**: `PUT /api/v1/properties/:id`

**Request body**: same fields, partial

**Response 200**: `{ property }`

**Side effect**: nếu `handoverDate` thay đổi → emit event `property.handover_date_set` (downstream aftercare module Phase 2)

### 3.5 Soft delete property

**Endpoint**: `DELETE /api/v1/properties/:id`

**Authorization**: `system_admin` / `manager`

**Response 204**

**Errors**: 404, 409 nếu có project active reference

---

## 4. Project endpoints

### 4.1 List projects

**Endpoint**: `GET /api/v1/projects`

**Authorization**: any auth (invited filtered server-side)

**Query params**:
| Param | Type | Description |
|---|---|---|
| `search` | string | FTS keyword |
| `status` | enum (multi) | quoting / received / construction / completed / handed_over / cancelled |
| `customerId` | uuid | Filter by customer |
| `ownerUserId` | uuid | Filter by owner |
| `projectType` | enum (multi) | new_construction / remodel / repair / aftercare |
| `from` | date (YYYY-MM-DD) | Range start on schedule_start |
| `to` | date | Range end on schedule_start |
| `sortBy` | enum | `createdAt` / `scheduleStart` / `projectCode` / `amountTotal` |
| `sortOrder` | enum | `asc` / `desc` |
| `page` | number | 1 |
| `pageSize` | number | 50 (max 100) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "projectCode": "2026-0042",
      "customerId": "uuid",
      "customer": { "id": "uuid", "name": "山田 太郎", "nameKana": "ヤマダ タロウ" },
      "propertyId": "uuid",
      "property": { "id": "uuid", "address": "東京都新宿区..." },
      "projectType": "remodel",
      "status": "construction",
      "name": "山田様邸 浴室リフォーム",
      "description": "...",
      "ownerUserId": "uuid",
      "owner": { "id": "uuid", "name": "営業 一郎", "email": "..." },
      "scheduleStart": "2026-06-01",
      "scheduleEnd": "2026-06-30",
      "actualStart": "2026-06-03",
      "actualEnd": null,
      "amountTotal": "1500000",
      "createdAt": "2026-05-16T...",
      "updatedAt": "..."
    }
  ],
  "total": 234,
  "page": 1,
  "pageSize": 50
}
```

### 4.2 Get project

**Endpoint**: `GET /api/v1/projects/:id`

**Response 200**:
```json
{
  "project": { /* same as list item, with full description */ }
}
```

**Authorization**: 403 nếu invited_worker không phải member

### 4.3 Create project

**Endpoint**: `POST /api/v1/projects`

**Authorization**: `system_admin` / `manager` / `employee` (deny invited)

**Request body**:
```json
{
  "customerId": "uuid",                  // required unless preAcquisition=true
  "preAcquisition": false,                // optional flag for 土地仕入れ
  "propertyId": "uuid",                   // optional
  "projectType": "remodel",
  "name": "山田様邸 浴室リフォーム",
  "description": "...",
  "ownerUserId": "uuid",
  "scheduleStart": "2026-06-01",          // optional
  "scheduleEnd": "2026-06-30"             // optional
}
```

**Server behavior**:
1. Generate `projectCode` via DB sequence (`YYYY-NNNN`)
2. If `preAcquisition=true` AND no `customerId`: tạo placeholder customer
3. Insert project with `status='quoting'`
4. Auto-create 6 default folders
5. Insert owner as project_member with `role_on_project='owner'`
6. All in single transaction

**Response 201**:
```json
{
  "project": { /* full project DTO with folders, members */ }
}
```

**Errors**:
- 400 `VALIDATION_ERROR`
- 400 `PROJECT_CUSTOMER_REQUIRED` (no customerId + no preAcq)
- 400 `PROJECT_INVALID_OWNER` (owner role != admin/manager/employee)
- 404 `CUSTOMER_NOT_FOUND` / `PROPERTY_NOT_FOUND`

### 4.4 Update project

**Endpoint**: `PUT /api/v1/projects/:id`

**Authorization**: owner / `system_admin` / `manager`

**Request body**: partial — `name`, `description`, `propertyId`, `scheduleStart`, `scheduleEnd`, `ownerUserId`

**Response 200**: `{ project }`

### 4.5 Change status (forward transition)

**Endpoint**: `POST /api/v1/projects/:id/status`

**Authorization**: owner / `system_admin` / `manager`

**Request body**:
```json
{
  "newStatus": "received",
  "amountTotal": 1500000,    // required khi newStatus=received nếu project chưa có amount_total
  "reason": "..."            // required ≥5 chars khi newStatus=cancelled
}
```

**Side effects** (auto-set):
- `received` → `amountTotal` updated nếu provide
- `construction` → `actualStart = today` (nếu chưa có)
- `completed` → `actualEnd = today` (nếu chưa có)
- `handed_over` → check property.handover_date

**Response 200**: `{ project }` (updated)

**Errors**:
- 400 `PROJECT_INVALID_STATUS_TRANSITION` (kèm `from`, `to` trong body)
- 400 `PROJECT_MISSING_FIELD_FOR_TRANSITION` (kèm `field` trong body)
- 400 `PROJECT_MISSING_PROPERTY` / `PROJECT_MISSING_HANDOVER_DATE`
- 400 `PROJECT_CANCEL_REASON_REQUIRED`

### 4.6 Reverse status (admin only)

**Endpoint**: `POST /api/v1/projects/:id/status/reverse`

**Authorization**: `system_admin` only

**Request body**:
```json
{
  "newStatus": "quoting",
  "reason": "Khách hàng đổi ý sau khi cancel"  // ≥5 chars required
}
```

**Response 200**: `{ project }`

**Audit**: event `project.status.reversed` luôn được log

**Errors**: 403 (non-admin), 400 (reason missing/short)

### 4.7 Soft delete project

**Endpoint**: `DELETE /api/v1/projects/:id`

**Authorization**: `system_admin` only

**Response 204**

### 4.8 CSV Export

**Endpoint**: `GET /api/v1/projects/export.csv?<same filters as list>`

**Authorization**: `system_admin` / `manager`

**Response 200**:
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="projects_<timestamp>.csv"`
- Body: streaming CSV with header row + data rows

**CSV columns**:
```
project_code, name, customer_name, property_address, status, project_type,
owner_name, schedule_start, schedule_end, actual_start, actual_end,
amount_total, created_at
```

**Audit**: event `project.csv_exported` với `{ rowCount, filter }`

---

## 5. Project members endpoints (F1-05)

### 5.1 List members

**Endpoint**: `GET /api/v1/projects/:id/members`

**Authorization**:
- Any auth nếu là project member
- `system_admin` / `manager` any project

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "userId": "uuid",
      "user": {
        "id": "uuid",
        "name": "営業 一郎",
        "email": "employee@dev.shikou-kanri.local",
        "role": "employee"
      },
      "roleOnProject": "owner",
      "invitedAt": "2026-05-16T...",
      "revokedAt": null
    }
  ]
}
```

### 5.2 Add member

**Endpoint**: `POST /api/v1/projects/:id/members`

**Authorization**: project owner / `system_admin` / `manager`

**Request body**:
```json
{
  "userId": "uuid",
  "roleOnProject": "contributor"
}
```

**Server behavior**:
- Validate user exists + status=active
- Check duplicate (UNIQUE project_id + user_id)
- If previously revoked (revokedAt != null): reactivate (set revokedAt=null, update role)
- If `roleOnProject='owner'`: sync `projects.owner_user_id`

**Response 201**: `{ member }`

**Errors**:
- 404 `PROJECT_NOT_FOUND` / user not found
- 409 `PROJECT_MEMBER_ALREADY_EXISTS`
- 400 user status != active

### 5.3 Update member role

**Endpoint**: `PUT /api/v1/projects/:id/members/:userId`

**Request body**: `{ "roleOnProject": "inspector" }`

**Response 200**: `{ member }`

**Errors**: 404, 409 `PROJECT_LAST_OWNER` (nếu demote owner cuối cùng)

### 5.4 Remove member (soft delete)

**Endpoint**: `DELETE /api/v1/projects/:id/members/:userId`

**Response 204**

**Errors**: 404, 409 `PROJECT_LAST_OWNER`

---

## 6. Saved searches endpoints (F1-06)

### 6.1 List

**Endpoint**: `GET /api/v1/saved-searches?scope=projects|customers`

**Authorization**: any auth (scoped to current user)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "scope": "projects",
      "name": "今月着工予定",
      "filterJson": {
        "status": ["received"],
        "from": "2026-06-01",
        "to": "2026-06-30"
      },
      "createdAt": "..."
    }
  ]
}
```

### 6.2 Create

**Endpoint**: `POST /api/v1/saved-searches`

**Request body**:
```json
{
  "scope": "projects",
  "name": "今月着工予定",
  "filterJson": { ... }
}
```

**Response 201**: `{ savedSearch }`

**Errors**: 400 nếu duplicate `(userId, scope, name)`

### 6.3 Delete

**Endpoint**: `DELETE /api/v1/saved-searches/:id`

**Response 204**

---

## 7. Folders endpoints (Phase 1 read-only)

### 7.1 List folders of project

**Endpoint**: `GET /api/v1/projects/:id/folders`

**Authorization**: project member / admin / manager

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "文書",
      "folderType": "document",
      "isPublicForInvited": false,
      "createdAt": "..."
    }
    // ... 6 folders auto-created
  ]
}
```

Phase 1: chỉ list. Upload, drawing markers, etc. defer Phase 2.

---

## 8. Endpoint summary table

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/customers` | admin/manager/employee | List with filter |
| POST | `/customers` | admin/manager/employee | Create (dedup check) |
| GET | `/customers/:id` | admin/manager/employee | Detail |
| PUT | `/customers/:id` | admin/manager/employee (own) | Update |
| DELETE | `/customers/:id` | admin | Soft delete |
| GET | `/customers/:id/properties` | admin/manager/employee | List properties |
| GET | `/customers/:id/projects` | admin/manager/employee | Timeline (F1-04) |
| POST | `/customers/import-csv` | admin | Bulk import |
| GET | `/properties` | admin/manager/employee | List (by customerId) |
| POST | `/properties` | admin/manager/employee | Create |
| GET | `/properties/:id` | admin/manager/employee | Detail |
| PUT | `/properties/:id` | admin/manager/employee | Update |
| DELETE | `/properties/:id` | admin/manager | Soft delete |
| GET | `/projects` | all auth | List (invited filtered) |
| POST | `/projects` | admin/manager/employee | Create |
| GET | `/projects/:id` | per membership | Detail |
| PUT | `/projects/:id` | owner/admin/manager | Update |
| DELETE | `/projects/:id` | admin | Soft delete |
| POST | `/projects/:id/status` | owner/admin/manager | Forward transition |
| POST | `/projects/:id/status/reverse` | admin | Reverse transition |
| GET | `/projects/export.csv` | admin/manager | Streaming CSV |
| GET | `/projects/:id/members` | member/admin/manager | List |
| POST | `/projects/:id/members` | owner/admin/manager | Add |
| PUT | `/projects/:id/members/:userId` | owner/admin/manager | Update role |
| DELETE | `/projects/:id/members/:userId` | owner/admin/manager | Soft remove |
| GET | `/projects/:id/folders` | member/admin/manager | List 6 folders |
| GET | `/saved-searches` | any auth (own only) | List |
| POST | `/saved-searches` | any auth | Create |
| DELETE | `/saved-searches/:id` | own only | Delete |

**Total**: 28 endpoints.

---

## 9. Audit events emitted

| Event | Trigger | Audit log entity |
|---|---|---|
| `customer.created` | POST /customers | customer |
| `customer.updated` | PUT /customers/:id | customer |
| `customer.deleted` | DELETE /customers/:id | customer |
| `customer.csv_imported` | POST /customers/import-csv | customer (bulk, count summary) |
| `property.created` | POST /properties | property |
| `property.updated` | PUT /properties/:id | property |
| `property.deleted` | DELETE /properties/:id | property |
| `property.handover_date_set` | (internal event) | property |
| `project.created` | POST /projects | project |
| `project.updated` | PUT /projects/:id | project |
| `project.deleted` | DELETE /projects/:id | project |
| `project.status_changed` | POST /projects/:id/status | project (kèm from, to) |
| `project.status.reversed` | POST /projects/:id/status/reverse | project (kèm reason) |
| `project.csv_exported` | GET /projects/export.csv | project (count + filter) |
| `project.member_added` | POST /projects/:id/members | project_member |
| `project.member_role_changed` | PUT /projects/:id/members/:userId | project_member |
| `project.member_removed` | DELETE /projects/:id/members/:userId | project_member |

---

## 10. Frontend integration cheatsheet

### 10.1 API client modules (đã list ở FDD)
- `customersApi`, `propertiesApi`, `projectsApi`, `projectMembersApi`, `savedSearchesApi`

### 10.2 TanStack Query keys
- `['customers', 'list', filters]`
- `['customers', 'detail', id]`
- `['customers', id, 'properties']`
- `['customers', id, 'projects']`
- `['projects', 'list', filters]`
- `['projects', 'detail', id]`
- `['projects', id, 'members']`
- `['projects', id, 'folders']`
- `['saved-searches', scope]`

### 10.3 Optimistic updates
- Kanban drag-drop: optimistic `setQueryData` ngay khi user confirm, rollback nếu API fail
- Status badge color change tức thì

---

## 11. Out of scope (API contracts)

- ❌ OpenAPI/Swagger generation — defer Phase 2 (chưa setup nest-swagger)
- ❌ GraphQL — không cần
- ❌ WebSocket events — defer F4 chat module Phase 2
- ❌ Postman collection — manual nếu cần
- ❌ Rate limit chi tiết per-endpoint — global throttler `short: 100/60s` đủ Phase 1

---

*Generated by /design --detail (API contracts part) — F1 API Contracts BASE*
