# F1-CUSTOMER — Basic Design (BD)

**Feature**: F1 顧客・案件管理
**Version**: BASE — 2026-05-16
**Status**: BD_CREATED
**Author**: hanq97
**SRS**: `F1-CUSTOMER-BASE-srs.md`

---

## 1. System overview

F1 thêm 2 backend module (`customer`, `project`) + extend audit infrastructure. Frontend thêm 2 feature folders (`features/customer`, `features/project`). Tích hợp event-driven với module aftercare (chưa build, đặt nền tảng event emit).

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (React SPA)                       │
├─────────────────────────────────────────────────────────────────┤
│ features/customer/     │ features/project/     │ shared/         │
│  ├─ CustomersListPage  │  ├─ ProjectsListPage  │ ├─ AppLayout    │
│  ├─ CustomerDetailPage │  ├─ ProjectDetailPage │ ├─ guards/      │
│  ├─ CustomerFormPage   │  ├─ ProjectFormPage   │ ├─ api/         │
│  └─ components/...     │  └─ components/...    │ └─ i18n/        │
└────────────────────────────────────┬────────────────────────────┘
                                     │ HTTPS (HttpOnly cookies)
                                     │ Axios + 401 refresh
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (NestJS Modular Monolith)             │
├─────────────────────────────────────────────────────────────────┤
│  modules/auth/    ┌── modules/customer/ ── modules/project/      │
│   (đã có F8)      │  ├─ controllers      ├─ controllers          │
│                   │  ├─ services         ├─ services             │
│   AuditService    │  ├─ repositories     ├─ repositories         │
│   (UPGRADE: stub  │  ├─ dto              ├─ dto                  │
│    → persist)     │  └─ domain           └─ domain               │
│                   │                                              │
│  modules/notification/  (đã có F8 — SMTP)                       │
│                                                                  │
│  shared/database/ (Prisma) | shared/exceptions/ | shared/...     │
│                                                                  │
│  NestJS EventEmitter2 (in-process sync)                          │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                              ┌──────┴──────┐
                              ▼             ▼
                       ┌──────────┐  ┌──────────┐
                       │PostgreSQL│  │  Redis   │
                       │   16     │  │  7       │
                       │ + ext.   │  │ (chưa    │
                       │ pg_trgm  │  │  dùng F1)│
                       │ pgcrypto │  └──────────┘
                       └──────────┘
```

---

## 2. Module structure

### 2.1 Backend modules

```
backend/src/modules/customer/
├── customer.module.ts           # @Module — imports AuthModule, exports CustomerService
├── controllers/
│   ├── customers.controller.ts        # /api/v1/customers/*
│   ├── properties.controller.ts       # /api/v1/properties/*
│   └── customer-import.controller.ts  # /api/v1/customers/import-csv
├── services/
│   ├── customers.service.ts
│   ├── properties.service.ts
│   ├── customer-import.service.ts
│   └── customer-duplicate-check.service.ts
├── repositories/
│   ├── customer.repository.ts
│   └── property.repository.ts
├── dto/
│   ├── create-customer.dto.ts
│   ├── update-customer.dto.ts
│   ├── list-customers-query.dto.ts
│   ├── create-property.dto.ts
│   ├── update-property.dto.ts
│   └── import-csv-result.dto.ts
├── domain/
│   ├── types.ts                       # CustomerType, PropertyType, PropertyStructure
│   └── customer-events.ts             # Event payload types
└── index.ts                            # Public API exports

backend/src/modules/project/
├── project.module.ts            # @Module — imports CustomerModule, AuthModule
├── controllers/
│   ├── projects.controller.ts          # /api/v1/projects/*
│   ├── project-members.controller.ts   # /api/v1/projects/:id/members/*
│   └── saved-searches.controller.ts    # /api/v1/saved-searches/*
├── services/
│   ├── projects.service.ts
│   ├── project-members.service.ts
│   ├── project-status-machine.service.ts
│   ├── project-code-generator.service.ts
│   ├── project-folders.service.ts
│   ├── project-export.service.ts
│   └── saved-searches.service.ts
├── repositories/
│   ├── project.repository.ts
│   ├── project-member.repository.ts
│   ├── folder.repository.ts
│   └── saved-search.repository.ts
├── dto/
│   ├── create-project.dto.ts
│   ├── update-project.dto.ts
│   ├── list-projects-query.dto.ts
│   ├── change-status.dto.ts
│   ├── reverse-status.dto.ts
│   ├── add-member.dto.ts
│   ├── update-member-role.dto.ts
│   └── saved-search.dto.ts
├── domain/
│   ├── types.ts
│   ├── project-events.ts
│   └── status-transitions.ts          # State machine config
└── index.ts
```

### 2.2 Shared upgrades (F8 → F1)

**AuditService upgrade**:
- F8 dùng `AuditStubService` chỉ console-log
- F1 cần persist thực vào `audit_logs` table
- Rename: `AuditStubService` → `AuditService` (giữ public method signature, internal đổi từ console.log sang `prisma.auditLog.create(...)`)
- Thêm method mới cho F1 events: `logCustomerCreated`, `logProjectStatusChanged`, etc.

### 2.3 Frontend feature folders

```
frontend/src/features/customer/
├── pages/
│   ├── CustomersListPage.tsx
│   ├── CustomerDetailPage.tsx           # 3 tabs: 概要 / 物件 / 履歴
│   ├── CustomerFormPage.tsx
│   └── CustomerImportPage.tsx           # admin only
├── components/
│   ├── CustomerSearchBar.tsx
│   ├── CustomerTypeTag.tsx
│   ├── CustomerOverviewTab.tsx
│   ├── PropertyListTab.tsx
│   ├── PropertyCard.tsx
│   ├── PropertyFormModal.tsx
│   ├── PhotoUploadField.tsx             # client-side resize + base64
│   ├── HistoryTab.tsx                   # F1-04 timeline
│   └── DuplicateCustomerConfirmModal.tsx
└── schemas/
    ├── customer.schema.ts                # Zod
    └── property.schema.ts

frontend/src/features/project/
├── pages/
│   ├── ProjectsListPage.tsx              # toggle table/board
│   ├── ProjectDetailPage.tsx             # tabs: 概要 / メンバー / フォルダ
│   └── ProjectFormPage.tsx
├── components/
│   ├── ProjectStatusTag.tsx
│   ├── ProjectTypeTag.tsx
│   ├── ProjectsTable.tsx
│   ├── ProjectBoardKanban.tsx            # @dnd-kit
│   ├── ProjectCard.tsx                   # Kanban card
│   ├── ConfirmStatusChangeModal.tsx
│   ├── ProjectFiltersPanel.tsx
│   ├── SaveSearchModal.tsx
│   ├── SavedSearchesDropdown.tsx
│   ├── ProjectMembersTab.tsx
│   ├── AddMemberModal.tsx                # 2 tab (pick / invite)
│   ├── ProjectFoldersTab.tsx             # Phase 1 read-only list
│   └── ReverseStatusModal.tsx            # admin only
└── schemas/
    └── project.schema.ts
```

---

## 3. Database schema (Prisma)

### 3.1 Enums mới

```prisma
enum CustomerType {
  individual
  corporate
}

enum PropertyType {
  new_construction
  remodel
  single_family
  multi_family
  commercial
  other
}

enum PropertyStructure {
  wood
  steel
  rc
  other
}

enum ProjectType {
  new_construction
  remodel
  repair
  aftercare
}

enum ProjectStatus {
  quoting
  received
  construction
  completed
  handed_over
  cancelled
}

enum ProjectMemberRole {
  owner
  contributor
  inspector
  invited_worker
}

enum FolderType {
  document
  drawing
  schedule
  photo
  chalkboard
  inspection
  custom
}
```

### 3.2 Tables

```prisma
model Customer {
  id              String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerType    CustomerType @map("customer_type")
  name            String       @db.VarChar(200)
  nameKana        String?      @map("name_kana") @db.VarChar(200)
  phone           String?      @db.VarChar(20)
  email           String?      @db.VarChar(255)
  address         String?      @db.Text
  isOb            Boolean      @default(false) @map("is_ob")
  acquiredAt      DateTime?    @map("acquired_at") @db.Date
  notes           String?      @db.Text
  // search_text tsvector generated column (added via raw SQL migration)

  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?    @map("deleted_at") @db.Timestamptz(6)
  createdById     String?      @map("created_by") @db.Uuid
  updatedById     String?      @map("updated_by") @db.Uuid

  createdBy       User?        @relation("CustomerCreator", fields: [createdById], references: [id])
  updatedBy       User?        @relation("CustomerUpdater", fields: [updatedById], references: [id])
  properties      Property[]
  projects        Project[]

  @@index([phone], where: "deleted_at IS NULL")
  @@index([nameKana])
  @@index([isOb, deletedAt])
  @@map("customers")
}

model Property {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerId      String              @map("customer_id") @db.Uuid
  address         String              @db.Text
  propertyType    PropertyType        @map("property_type")
  structure       PropertyStructure
  yearBuilt       Int?                @map("year_built")
  handoverDate    DateTime?           @map("handover_date") @db.Date
  floorAreaSqm    Decimal?            @map("floor_area_sqm") @db.Decimal(8, 2)
  photoUrls       String[]            @map("photo_urls")
  notes           String?             @db.Text

  createdAt       DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime            @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?           @map("deleted_at") @db.Timestamptz(6)
  createdById     String?             @map("created_by") @db.Uuid
  updatedById     String?             @map("updated_by") @db.Uuid

  customer        Customer            @relation(fields: [customerId], references: [id], onDelete: Restrict)
  projects        Project[]

  @@index([customerId, deletedAt])
  @@index([handoverDate], where: "deleted_at IS NULL")
  @@map("properties")
}

model Project {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectCode     String          @unique @map("project_code") @db.VarChar(20)
  customerId      String          @map("customer_id") @db.Uuid
  propertyId      String?         @map("property_id") @db.Uuid
  projectType     ProjectType     @map("project_type")
  status          ProjectStatus   @default(quoting)
  name            String          @db.VarChar(200)
  description     String?         @db.Text
  ownerUserId     String          @map("owner_user_id") @db.Uuid
  scheduleStart   DateTime?       @map("schedule_start") @db.Date
  scheduleEnd     DateTime?       @map("schedule_end") @db.Date
  actualStart     DateTime?       @map("actual_start") @db.Date
  actualEnd       DateTime?       @map("actual_end") @db.Date
  amountTotal     Decimal?        @map("amount_total") @db.Decimal(15, 0)
  // search_text tsvector generated column (raw SQL)

  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?       @map("deleted_at") @db.Timestamptz(6)
  createdById     String?         @map("created_by") @db.Uuid
  updatedById     String?         @map("updated_by") @db.Uuid

  customer        Customer        @relation(fields: [customerId], references: [id], onDelete: Restrict)
  property        Property?       @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  owner           User            @relation("ProjectOwner", fields: [ownerUserId], references: [id])
  members         ProjectMember[]
  folders         Folder[]

  @@index([status, scheduleStart])
  @@index([customerId, createdAt(sort: Desc)])
  @@index([ownerUserId, deletedAt])
  @@index([scheduleStart], where: "status != 'cancelled'")
  @@map("projects")
}

model ProjectMember {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId       String              @map("project_id") @db.Uuid
  userId          String              @map("user_id") @db.Uuid
  roleOnProject   ProjectMemberRole   @map("role_on_project")
  folderAccessOverride  Json?         @map("folder_access_override")
  invitedAt       DateTime            @default(now()) @map("invited_at") @db.Timestamptz(6)
  revokedAt       DateTime?           @map("revoked_at") @db.Timestamptz(6)

  project         Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user            User                @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
  @@index([userId, revokedAt])
  @@map("project_members")
}

model Folder {
  id                    String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId             String       @map("project_id") @db.Uuid
  name                  String       @db.VarChar(100)
  folderType            FolderType   @map("folder_type")
  isPublicForInvited    Boolean      @default(false) @map("is_public_for_invited")

  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt             DateTime?    @map("deleted_at") @db.Timestamptz(6)

  project               Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, folderType])
  @@map("folders")
}

model SavedSearch {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  scope           String   @db.VarChar(50)  // 'projects' | 'customers'
  name            String   @db.VarChar(100)
  filterJson      Json     @map("filter_json")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, scope, name])
  @@index([userId, scope])
  @@map("saved_searches")
}
```

### 3.3 Raw SQL additions (chạy sau Prisma migration)

```sql
-- Generated columns cho FTS
ALTER TABLE customers ADD COLUMN search_text tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(name, '') || ' ' ||
    coalesce(name_kana, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(address, '')
  )
) STORED;

ALTER TABLE projects ADD COLUMN search_text tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(project_code, '') || ' ' ||
    coalesce(name, '') || ' ' ||
    coalesce(description, '')
  )
) STORED;

-- GIN indexes (chỉ active rows)
CREATE INDEX idx_customers_search_text ON customers USING gin(search_text) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_address_trgm ON customers USING gin (address gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_search_text ON projects USING gin(search_text) WHERE deleted_at IS NULL;

-- Sequence cho project_code (Phase 1: 2026, 2027 pre-create)
CREATE SEQUENCE IF NOT EXISTS project_code_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS project_code_seq_2027 START 1;
```

### 3.4 Migration order
1. Prisma migration `add_f1_customer_project` — tạo tables + enums + FKs + B-tree indexes
2. Raw SQL migration `add_f1_fts_and_sequences.sql` — generated columns + GIN + sequences
3. Seed amend — thêm 3-5 customer test, 5-8 property, 5-10 project

---

## 4. Component design — Backend

### C-CUS-01: CustomersService
Public methods:
- `list(filter, requester)` — paginated, role-aware (invited filtered)
- `findById(id, requester)` — permission check
- `create(input, requester, ctx)` — duplicate check + audit emit
- `update(id, input, requester, ctx)` — ownership check + duplicate check
- `softDelete(id, requester, ctx)` — active project block
- `findOrCreatePlaceholder(projectCode, ctx, tx)` — internal, called by ProjectsService for pre-acq

Dependencies:
- `CustomerRepository`, `PropertyRepository`, `CustomerDuplicateCheckService`, `AuditService`, `EventEmitter2`

### C-CUS-02: CustomerDuplicateCheckService
- `checkPhone(phone)` → `{ duplicateOf: { id, name, address } | null }`
- Normalizes phone trước query

### C-CUS-03: PropertiesService
- `list(customerId)`, `findById`, `create`, `update`, `softDelete`
- `update` detect `handover_date` change → emit `property.handover_date_set`
- Photo validation: max 3 strings, mỗi ≤150KB chars

### C-CUS-04: CustomerImportService
- `parseAndImport(file: Buffer, requester, ctx)` → `{ created, skipped, errors }`
- Uses `csv-parse` library streaming mode
- Validate per row, dedup theo phone trong cùng file + DB hiện hữu
- Single transaction batch insert (commit after all)
- Audit single event với count summary

### C-PRJ-01: ProjectsService
- `list(filter, requester)` — invited filter + pagination
- `findById(id, requester)`
- `create(input, requester, ctx)` — trong transaction:
  1. Resolve customer: hoặc input.customerId, hoặc tạo placeholder (nếu preAcquisition)
  2. Generate project_code qua ProjectCodeGenerator
  3. Insert project
  4. Auto-create 6 folders qua ProjectFoldersService
  5. Insert project_members row (owner)
  6. Emit `project.created`
- `update(id, input, requester, ctx)`
- `softDelete(id, requester, ctx)` — admin only

### C-PRJ-02: ProjectStatusMachineService
- `transition(projectId, newStatus, options, requester, ctx)` — forward only
- Validation theo `status-transitions.ts` config
- Side effects (set actualStart, actualEnd)
- Emit `project.status_changed`
- `reverseTransition(projectId, newStatus, reason, requester, ctx)` — admin only, audit `project.status.reversed`

### C-PRJ-03: ProjectCodeGeneratorService
- `next(year)` → `'YYYY-NNNN'`
- Internal: `CREATE SEQUENCE IF NOT EXISTS` + `SELECT nextval(...)` qua `prisma.$executeRawUnsafe`
- Idempotent, race-safe

### C-PRJ-04: ProjectFoldersService
- `createDefaultFolders(projectId, tx)` — insert 6 rows
- `list(projectId)` — for ProjectDetailPage folders tab

### C-PRJ-05: ProjectMembersService
- `list(projectId, requester)` — permission check
- `add(projectId, userId, roleOnProject, requester, ctx)` — unique constraint check
- `updateRole(projectId, userId, newRole, requester, ctx)` — last-owner check
- `remove(projectId, userId, requester, ctx)` — soft (set revokedAt) + last-owner check

### C-PRJ-06: ProjectExportService
- `exportCsv(filter, requester, ctx, res: Response)` — stream CSV qua response
- Authorize admin/manager only
- Audit `project.csv_exported` với rowCount

### C-PRJ-07: SavedSearchesService
- `list(userId, scope)`, `create(userId, name, scope, filterJson)`, `delete(id, userId)`
- Constraint UNIQUE(userId, scope, name)

### C-SHR-01: AuditService (upgrade)
- Public signature same as F8 stub (backward compat)
- Internal: insert vào `audit_logs` qua `prisma.auditLog.create(...)` thay vì `logger.log(...)`
- Thêm method:
  - `logCustomerCreated`, `logCustomerUpdated`, `logCustomerDeleted`, `logCustomerCsvImported`
  - `logPropertyCreated`, `logPropertyUpdated`, `logPropertyDeleted`, `logPropertyHandoverDateSet`
  - `logProjectCreated`, `logProjectUpdated`, `logProjectDeleted`, `logProjectStatusChanged`, `logProjectStatusReversed`, `logProjectCsvExported`
  - `logProjectMemberAdded`, `logProjectMemberRoleChanged`, `logProjectMemberRemoved`

---

## 5. Inter-module communication

### 5.1 Sync direct call (NestJS DI)
- `ProjectsService` injects `CustomersService` → trong `create()` gọi `customersService.findOrCreatePlaceholder(...)` cho pre-acq flow
- `ProjectsService` injects `UserRepository` (qua AuthModule public API) để validate `ownerUserId`

### 5.2 Event-based (EventEmitter2 sync)

| Event | Producer | Phase 1 Subscribers | Phase 2 Subscribers |
|---|---|---|---|
| `customer.created` | CustomersService | AuditService (auto qua service call) | DashboardService (stats) |
| `customer.updated` | CustomersService | AuditService | — |
| `customer.deleted` | CustomersService | AuditService | DashboardService |
| `property.handover_date_set` | PropertiesService | AuditService | AftercareService (regen schedules) |
| `project.created` | ProjectsService | AuditService | DashboardService |
| `project.status_changed` | ProjectStatusMachineService | AuditService | NotificationService (notify owner) |
| `project.status.reversed` | ProjectStatusMachineService | AuditService | — |
| `project.member_added` | ProjectMembersService | AuditService | NotificationService (welcome) |

### 5.3 Audit invocation pattern
Mọi service mutation gọi `audit.log<Event>(...)` **trong cùng transaction** với main operation:
```ts
return this.prisma.$transaction(async (tx) => {
  const customer = await this.customerRepo.create(input, tx);
  await this.audit.logCustomerCreated(customer.id, requester.id, ctx, tx);
  return customer;
});
```

---

## 6. Frontend architecture

### 6.1 Routes mới (thêm vào `src/app/routes.tsx`)
```
/customers                        → CustomersListPage (AuthGuard)
/customers/new                    → CustomerFormPage  (AuthGuard)
/customers/:id                    → CustomerDetailPage (AuthGuard)
/customers/:id/edit               → CustomerFormPage  (AuthGuard)
/admin/customer-import            → CustomerImportPage (RoleGuard system_admin)
/projects                         → ProjectsListPage (AuthGuard)
/projects/new                     → ProjectFormPage  (AuthGuard, NOT invited)
/projects/:id                     → ProjectDetailPage (AuthGuard, per-membership)
/projects/:id/edit                → ProjectFormPage  (AuthGuard, owner/admin/manager)
```

### 6.2 API client modules (thêm vào `src/shared/api/`)
```ts
// customers.api.ts
export const customersApi = {
  list, get, create, update, softDelete,
  getProperties: (customerId) => GET /customers/:id/properties,
  getProjects: (customerId) => GET /customers/:id/projects,  // F1-04 timeline
  importCsv: (file) => POST /customers/import-csv,
};

// properties.api.ts
export const propertiesApi = { list, get, create, update, softDelete };

// projects.api.ts
export const projectsApi = {
  list, get, create, update, softDelete,
  changeStatus, reverseStatus,
  exportCsv,
};

// project-members.api.ts
export const projectMembersApi = { list, add, updateRole, remove };

// saved-searches.api.ts
export const savedSearchesApi = { list, create, delete };
```

### 6.3 i18n namespace mới (extend `locales/*.json`)
```json
{
  "customer": { "title": "顧客管理", "type": { ... }, "list": { ... }, "form": { ... }, "import": { ... } },
  "property": { "title": "物件", "type": { ... }, "structure": { ... }, "handoverDate": "引渡日", "form": { ... } },
  "project": {
    "title": "案件管理",
    "code": "案件番号",
    "type": { "new_construction": "新築", ... },
    "status": { "quoting": "見積中", "received": "受注", ... },
    "board": { "title": "案件ボード", "confirmStatusChange": { ... } },
    "members": { "title": "メンバー", "roleOnProject": { ... } },
    "filter": { ... },
    "savedSearch": { ... }
  }
}
```
Tất cả keys add vào cả 3 locale (ja/en/vi) cùng lúc theo project conventions.

### 6.4 State management (TanStack Query)
Query keys:
- `['customers', 'list', filters]`
- `['customers', 'detail', id]`
- `['customers', id, 'properties']`
- `['customers', id, 'projects']` (F1-04)
- `['projects', 'list', filters]`
- `['projects', 'detail', id]`
- `['projects', id, 'members']`
- `['saved-searches', scope]`

Invalidation strategy: mutation success → invalidate root key (`['customers']`, `['projects']`) — TanStack Query smart-invalidate descendants.

---

## 7. Security & permissions

### 7.1 Authorization enforcement layers
1. **Route guard** (FE `RoleGuard`): redirect /home nếu role không match
2. **Controller guard** (BE `@Roles(...)`): 403 nếu role không match
3. **Service-level ownership check**: throw `AuthInsufficientPermissionError`
   - `employee` chỉ update customer/property/project họ tạo (`createdById === requester.id`)
   - `invited` không thấy customer endpoints
   - `invited` chỉ thấy project họ là member

### 7.2 Invited_worker access pattern
Cross-cutting: `ProjectsService.list()` và `findById()`:
```ts
if (requester.role === 'invited') {
  query = query.where('id IN (SELECT project_id FROM project_members WHERE user_id = ? AND revoked_at IS NULL)', requester.id);
}
```
Hoặc qua repository method `listForUser(userId, isInvited)` để encapsulate.

### 7.3 PII protection
- Pino redaction config (đã có F8) auto-redact `*.password`, `*.token` — extend thêm `*.phone`, `*.email`, `*.address` cho customer/property
- CSV export audit log: chỉ `rowCount` + `filterCriteria`, NOT row data

---

## 8. Performance design

### 8.1 Index strategy (đã liệt kê §3.3)
- FTS combined column + GIN
- pg_trgm cho fuzzy
- B-tree composite cho list filter
- Partial index `WHERE deleted_at IS NULL` để skip soft-deleted

### 8.2 N+1 prevention
- Customer detail load: 1 query với `include: { properties, projects: { include: { owner } } }`
- Project list: 1 query với `include: { customer, property, owner }` (avoid lazy loading)

### 8.3 Photo handling
- Client-side canvas resize → ≤100KB jpeg base64
- Backend validate length per string ≤ 150KB
- DB query `SELECT id, address, ... FROM properties` KHÔNG `photo_urls` khi list — chỉ load khi detail
- Total ước ~3GB max khi 10K property full ảnh — chấp nhận được

### 8.4 Search response time
- Customer FTS: GIN index → <100ms for typical query
- pg_trgm fallback fuzzy: <500ms
- Project list with multiple filter: composite index → <300ms

### 8.5 CSV export streaming
- Use `csv-stringify` streaming API
- Pipe trực tiếp vào Express `res` (no in-memory buffer)
- Throttler bypass cho admin endpoint (or whitelist)

---

## 9. Error handling

### 9.1 Mới error classes (thêm vào `auth-errors.ts` hoặc tạo `customer-errors.ts`)

```ts
// Customer
CustomerNotFoundError                  // 404 CUSTOMER_NOT_FOUND
CustomerHasActiveProjectsError         // 409 CUSTOMER_HAS_ACTIVE_PROJECTS (kèm count + ids)
CustomerDuplicatePhoneError            // chỉ dùng nếu strict mode; thường return 200 với duplicateOf

// Property
PropertyNotFoundError                  // 404 PROPERTY_NOT_FOUND
PropertyHasActiveProjectsError         // 409
PropertyPhotoTooLargeError             // 400 PROPERTY_PHOTO_TOO_LARGE

// Project
ProjectNotFoundError                   // 404 PROJECT_NOT_FOUND
ProjectInvalidStatusTransitionError    // 400 PROJECT_INVALID_STATUS_TRANSITION (kèm from, to)
ProjectMissingFieldForTransitionError  // 400 (e.g., missing amount_total khi received)
ProjectCannotDemoteLastOwnerError      // 409 PROJECT_LAST_OWNER

// CSV import
CsvParseError                          // 400 CSV_PARSE_ERROR (kèm error rows)
```

### 9.2 i18n mapping
Mỗi error code → key trong `frontend/src/locales/<lang>.json` `errorCodes.<CODE>`. Update khi thêm error class mới.

---

## 10. Migration & deployment

### 10.1 Migration sequence
```bash
# 1. Prisma migration (auto-generated)
pnpm --filter backend prisma:migrate:dev --name add_f1_customer_project

# 2. Raw SQL migration (manual file in prisma/migrations/<timestamp>_add_f1_fts/migration.sql)
# Includes generated columns + GIN + sequences

# 3. Seed update (existing + new test data)
pnpm --filter backend prisma:seed
```

### 10.2 Backward compat (F8 → F1)
- AuditService rename: keep old method signatures, add new methods
- F8 calls vẫn work (unchanged)

### 10.3 Rollback strategy
- Prisma migration reversible (down SQL được Prisma generate)
- Raw SQL: viết down script tay (`DROP INDEX`, `DROP SEQUENCE`, `ALTER TABLE DROP COLUMN`)

---

## 11. Out of scope (BD reminder)

- ❌ Property photo S3 (defer F3 Phase 2)
- ❌ Customer merge (Phase 2)
- ❌ pg_bigm Japanese FTS optimize (Phase 2, dùng `'simple'` Phase 1)
- ❌ BullMQ async events (Phase 2, dùng EventEmitter2 sync Phase 1)
- ❌ Project quote linkage (defer F2 branch)
- ❌ Maintenance schedule generation (defer F6 branch — F1 chỉ emit event)
- ❌ Tests cho controllers (defer post-MVP; chỉ unit test service logic phức tạp)

---

*Generated by /design --basic — F1 Basic Design BASE*
*Next: F1-CUSTOMER-BASE-frontend-detail-design.md + backend-detail-design.md + api-contracts.md*
