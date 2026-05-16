# F1-CUSTOMER — Implementation Plan

**Feature**: F1 顧客・案件管理 (Customer + Property + Project Management)
**Version**: BASE — 2026-05-16
**Branch**: feature/f1-customer
**State**: BD_DD_CREATED → PLAN_CREATED
**Developer**: hanq97 (solo)
**Estimated total**: 8.5 ngày (8 phases)

**Phụ thuộc upstream**:

- F8-AUTH đã merge develop (auth, users table, RBAC, email service, audit infrastructure)
- F8 bug fixes pushed lên `feature/f1-customer` (will land cùng F1 PR): 2FA verify length, admin self-disable error, throttler quota, unlock UX, template path

**Tham chiếu**:

- SRS: `documents/features/F1-CUSTOMER-hanq97/F1-CUSTOMER-BASE-srs.md`
- BD: `F1-CUSTOMER-BASE-basic-design.md`
- FDD: `F1-CUSTOMER-BASE-frontend-detail-design.md`
- BDD: `F1-CUSTOMER-BASE-backend-detail-design.md`
- API contracts: `F1-CUSTOMER-BASE-api-contracts.md`
- Decisions: `innovate-srs-selection.md` + `innovate-technical-selection.md`

---

## 1. Phase overview

| Phase  | Tên                                                                 | Estimate | Deps   | Outputs                        |
| ------ | ------------------------------------------------------------------- | -------- | ------ | ------------------------------ |
| **P0** | Foundation (Prisma schema + migration + seed + FE skeleton)         | 0.5d     | —      | Schema migrated, modules wired |
| **P1** | Customer module BE + FE (CRUD + dedup + search)                     | 1.5d     | P0     | F1-01 working                  |
| **P2** | Property module BE + FE (CRUD + photo upload)                       | 1.0d     | P1     | F1-02 working                  |
| **P3** | Project module core BE (CRUD + state machine + auto-code + folders) | 1.5d     | P1, P2 | F1-03 backend                  |
| **P4** | Project members BE + FE                                             | 1.0d     | P3     | F1-05 working                  |
| **P5** | Project list FE (table + Kanban + filters)                          | 1.5d     | P3     | F1-03 + F1-06 FE               |
| **P6** | F1-06 saved searches + CSV export + CSV import (customer)           | 1.0d     | P5     | F1-06 full                     |
| **P7** | F1-04 customer timeline tab                                         | 0.5d     | P3     | F1-04 working                  |
| **P8** | Polish + AuditService upgrade + smoke test + commit                 | 0.5d     | All    | Ready for review               |

**Critical path**: P0 → P1 → P3 → P5 (5d). P2/P4/P6/P7/P8 có thể overlap nhưng solo dev → sequential.

---

## P0: Foundation (0.5 ngày)

### Mục tiêu

- Prisma schema có 5 bảng mới + 7 enums
- Migration applied to dev DB
- Raw SQL migration (tsvector + GIN + sequences) applied
- Seed amended với test data
- Frontend feature folders skeleton + routes
- AuditService upgrade (from F8 stub) chuẩn bị cho subsequent phases

### Tasks

#### T-P0-1: Prisma schema additions

**allowedFiles**:

- `backend/prisma/schema.prisma`

**Action**:

- Add 7 enums: `CustomerType`, `PropertyType`, `PropertyStructure`, `ProjectType`, `ProjectStatus`, `ProjectMemberRole`, `FolderType`
- Add 6 models: `Customer`, `Property`, `Project`, `ProjectMember`, `Folder`, `SavedSearch`
- Audit fields trên User: thêm relations cho `CustomerCreator`, `CustomerUpdater`, `ProjectOwner`, etc.

**Acceptance**: `pnpm --filter backend prisma:format` clean, `prisma generate` succeed

#### T-P0-2: Generate + apply migration

**allowedFiles**:

- `backend/prisma/migrations/<timestamp>_add_f1_customer_project/migration.sql`

**Action**:

```bash
pnpm --filter backend prisma:migrate:dev --name add_f1_customer_project
```

**Acceptance**: Migration applied, `pnpm --filter backend prisma:studio` thấy 5 bảng mới

#### T-P0-3: Raw SQL migration (tsvector + GIN + sequences)

**allowedFiles**:

- `backend/prisma/migrations/<timestamp>_add_f1_fts_and_sequences/migration.sql`

**Action**: Manual migration file với:

- `ALTER TABLE customers/projects ADD COLUMN search_text tsvector GENERATED ...`
- `CREATE INDEX ... USING gin(search_text) WHERE deleted_at IS NULL`
- `CREATE INDEX ... USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL`
- `CREATE SEQUENCE IF NOT EXISTS project_code_seq_2026 START 1`
- Tương tự cho 2027

**Acceptance**:

- Verify qua psql: `\d customers` thấy `search_text`, `\di` thấy GIN indexes
- `SELECT nextval('project_code_seq_2026')` returns 1

#### T-P0-4: Seed amend với test data

**allowedFiles**:

- `backend/prisma/seed.ts`

**Action**: Thêm seed:

- 3 customers (1 個人 OB, 1 個人 new, 1 法人)
- 4 properties (mix structure + handover dates)
- 6 projects across mọi status
- 8 project_members
- Folders auto-create via app code (NOT seed; verify via project creation flow)

**Acceptance**: `pnpm prisma:seed` thành công, dữ liệu hiển thị trên Prisma Studio

#### T-P0-5: AuditService upgrade (rename + persist)

**allowedFiles**:

- `backend/src/modules/auth/internal/audit-stub.service.ts` (rename → `audit.service.ts`)
- `backend/src/modules/auth/auth.module.ts` (update provider name nếu cần)
- `backend/src/cli/cli.module.ts` (update import)
- All callers (auth.service.ts, users.service.ts, invitations.service.ts, emergency-disable-2fa.command.ts) — UPDATE IMPORT NAME ONLY, signature giữ nguyên

**Action**:

- Rename `AuditStubService` → `AuditService`
- Change internal `console.log(...)` → `this.prisma.auditLog.create({ data: ... })`
- Add new method stubs cho F1 events (sẽ implement chi tiết trong phases sau):
  - `logCustomerCreated`, `logCustomerUpdated`, `logCustomerDeleted`, `logCustomerCsvImported`
  - `logPropertyCreated`, `logPropertyUpdated`, `logPropertyDeleted`
  - `logProjectCreated`, `logProjectUpdated`, `logProjectDeleted`, `logProjectStatusChanged`, `logProjectStatusReversed`, `logProjectCsvExported`
  - `logProjectMemberAdded`, `logProjectMemberRoleChanged`, `logProjectMemberRemoved`

**Acceptance**:

- `pnpm typecheck` clean
- F8 auth events vẫn ghi vào audit_logs table (verify qua psql)
- `pnpm --filter backend run build` succeed

#### T-P0-6: Frontend feature folder skeleton + routes

**allowedFiles**:

- `frontend/src/features/customer/` (mkdir pages, components, schemas)
- `frontend/src/features/project/` (mkdir)
- `frontend/src/app/routes.tsx`

**Action**:

- Create empty folder structure per FDD §2
- Add placeholder page components (return `<div>F1 customer page coming soon</div>`)
- Add 9 routes per FDD §7 wrap trong `<AuthGuard>` + `<RoleGuard deny={['invited']}>` cho non-customer routes
- Add `<RoleGuard deny>` variant nếu chưa có

**Acceptance**:

- `/customers`, `/projects` etc. render placeholder
- `pnpm --filter frontend build` succeed

---

## P1: Customer module (1.5 ngày)

### Tasks

#### T-P1-1: Backend customer module — types, DTOs, repository

**allowedFiles**:

- `backend/src/modules/customer/customer.module.ts`
- `backend/src/modules/customer/domain/types.ts`
- `backend/src/modules/customer/domain/customer-events.ts`
- `backend/src/modules/customer/dto/create-customer.dto.ts`
- `backend/src/modules/customer/dto/update-customer.dto.ts`
- `backend/src/modules/customer/dto/list-customers-query.dto.ts`
- `backend/src/modules/customer/repositories/customer.repository.ts`
- `backend/src/shared/exceptions/customer-errors.ts`

**Action**:

- Define types (CustomerType, etc.) mirror Prisma enums
- DTOs với class-validator
- Repository methods: findById, findByPhone, list (with FTS + filters), create, update, softDelete, countActiveByCustomer (for FK check)
- Error classes: CustomerNotFoundError, CustomerHasActiveProjectsError

**Acceptance**: typecheck clean, repository unit-testable

#### T-P1-2: Backend customer services

**allowedFiles**:

- `backend/src/modules/customer/services/customers.service.ts`
- `backend/src/modules/customer/services/customer-duplicate-check.service.ts`
- `backend/src/modules/customer/services/customer-import.service.ts` (stub — full impl P6)
- `backend/src/modules/customer/utils/normalize-phone.ts`

**Action**:

- CustomersService: full CRUD with permission checks, dedup logic, audit emit, event emit
- DuplicateCheckService: checkPhone (normalized)
- Import service: stub (P6 full)

**Acceptance**:

- Service logic per BDD §5.1
- Unit tests for: dedup (warn vs allow), softDelete block khi active project, ownership check

#### T-P1-3: Backend customer controller + register module

**allowedFiles**:

- `backend/src/modules/customer/controllers/customers.controller.ts`
- `backend/src/modules/customer/customer.module.ts` (wire providers)
- `backend/src/app.module.ts` (register CustomerModule)

**Action**:

- 6 endpoints: list, get, create, update, softDelete, getProperties (stub returns empty array), getProjects (stub)
- Wire `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles`
- Handle force query param cho create/update

**Acceptance**:

- curl test: GET /customers returns array, POST /customers creates, dedup warning trả `{ duplicateOf }`

#### T-P1-4: Backend customers.spec.ts (unit tests)

**allowedFiles**:

- `backend/src/modules/customer/services/customers.service.spec.ts`
- `backend/src/modules/customer/services/customer-duplicate-check.service.spec.ts`

**Action**: Per BDD §12.1 — focus business logic, mock Prisma

**Acceptance**: `pnpm --filter backend test customer` pass

#### T-P1-5: Frontend customer API client + Zod schema

**allowedFiles**:

- `frontend/src/shared/api/customers.api.ts`
- `frontend/src/features/customer/schemas/customer.schema.ts`

**Action**:

- Axios methods per FDD §8
- Zod schema with i18n-aware validation (via superRefine like password.schema)

**Acceptance**: typecheck clean, import works

#### T-P1-6: Frontend i18n keys for customer

**allowedFiles**:

- `frontend/src/locales/ja.json`
- `frontend/src/locales/en.json`
- `frontend/src/locales/vi.json`

**Action**: Add `customer.*` namespace per FDD §6 (~40 keys)

**Acceptance**: keys load without missing-key warnings

#### T-P1-7: CustomersListPage + components

**allowedFiles**:

- `frontend/src/features/customer/pages/CustomersListPage.tsx`
- `frontend/src/features/customer/components/CustomerSearchBar.tsx`
- `frontend/src/features/customer/components/CustomerTypeTag.tsx`
- `frontend/src/features/customer/components/ObBadge.tsx`

**Action**: Per FDD §3.1 — search + filter + Antd Table + pagination + actions dropdown

**Acceptance**: `/customers` shows list, search works, sort works, pagination works

#### T-P1-8: CustomerFormPage + DuplicateCustomerConfirmModal

**allowedFiles**:

- `frontend/src/features/customer/pages/CustomerFormPage.tsx`
- `frontend/src/features/customer/components/DuplicateCustomerConfirmModal.tsx`

**Action**: Per FDD §3.3 — RHF + Zod + Antd + force flow for dedup

**Acceptance**: Create customer, dedup confirm, edit existing all work

#### T-P1-9: CustomerDetailPage skeleton (3 tabs)

**allowedFiles**:

- `frontend/src/features/customer/pages/CustomerDetailPage.tsx`
- `frontend/src/features/customer/components/CustomerOverviewTab.tsx`

**Action**: Header + Antd Tabs với 3 tab. Tab `物件` + `履歴` placeholder (full ở P2 + P7)

**Acceptance**: Detail page render, edit/delete buttons work, tab navigation works

---

## P2: Property module (1.0 ngày)

### Tasks

#### T-P2-1: Backend property module (types, DTOs, repo, service)

**allowedFiles**:

- `backend/src/modules/customer/domain/types.ts` (extend)
- `backend/src/modules/customer/dto/create-property.dto.ts`
- `backend/src/modules/customer/dto/update-property.dto.ts`
- `backend/src/modules/customer/repositories/property.repository.ts`
- `backend/src/modules/customer/services/properties.service.ts`

**Action**: Per BDD §5.2 — CRUD + photo validation + handover event emit

**Acceptance**:

- POST /properties succeeds, photo limits enforced
- Event `property.handover_date_set` emit khi handover_date thay đổi (verify via logger)

#### T-P2-2: Backend property controller

**allowedFiles**:

- `backend/src/modules/customer/controllers/properties.controller.ts`
- `backend/src/modules/customer/customer.module.ts`

**Action**: 5 endpoints (list/get/create/update/delete)

**Acceptance**: curl test all endpoints

#### T-P2-3: Update CustomersService — wire getProperties endpoint

**allowedFiles**:

- `backend/src/modules/customer/controllers/customers.controller.ts`
- `backend/src/modules/customer/services/customers.service.ts`

**Action**: Implement `GET /customers/:id/properties` to call propertyRepo.findByCustomer

**Acceptance**: customer detail loads properties list

#### T-P2-4: Frontend property API + Zod

**allowedFiles**:

- `frontend/src/shared/api/properties.api.ts`
- `frontend/src/features/customer/schemas/property.schema.ts`

#### T-P2-5: Frontend i18n keys for property

**allowedFiles**: `frontend/src/locales/{ja,en,vi}.json`

#### T-P2-6: PropertyListTab + PropertyCard + PropertyFormModal + PhotoUploadField

**allowedFiles**:

- `frontend/src/features/customer/components/PropertyListTab.tsx`
- `frontend/src/features/customer/components/PropertyCard.tsx`
- `frontend/src/features/customer/components/PropertyFormModal.tsx`
- `frontend/src/features/customer/components/PhotoUploadField.tsx`

**Action**: Per FDD §3.2 + §4.2 — client-side photo resize via canvas, max 3 photos

**Acceptance**:

- Tab `物件` shows list, add modal works, photo upload + preview works
- Upload >3 photos rejected client-side
- Photo ≤100KB after resize

---

## P3: Project module core backend (1.5 ngày)

### Tasks

#### T-P3-1: Backend project module — types, DTOs, repo

**allowedFiles**:

- `backend/src/modules/project/project.module.ts`
- `backend/src/modules/project/domain/types.ts`
- `backend/src/modules/project/domain/status-transitions.ts`
- `backend/src/modules/project/domain/project-events.ts`
- `backend/src/modules/project/dto/{create,update,list,change-status,reverse-status}-project.dto.ts`
- `backend/src/modules/project/repositories/project.repository.ts`
- `backend/src/modules/project/repositories/folder.repository.ts`
- `backend/src/shared/exceptions/project-errors.ts`

**Action**: Repository methods incl. `findByCustomer`, `countActiveByCustomer`, `list` with invited filter, `findByCustomer` for timeline

**Acceptance**: typecheck clean

#### T-P3-2: ProjectCodeGeneratorService

**allowedFiles**:

- `backend/src/modules/project/services/project-code-generator.service.ts`
- `backend/src/modules/project/services/project-code-generator.service.spec.ts`

**Action**: Per BDD §5.6 — DB sequence per year, race-safe

**Acceptance**:

- spec test: format `YYYY-NNNN`, padding, sequence reuse
- Manual: call 3 lần → `2026-0001`, `2026-0002`, `2026-0003`

#### T-P3-3: ProjectFoldersService

**allowedFiles**:

- `backend/src/modules/project/services/project-folders.service.ts`

**Action**: createDefaultFolders (6 folders), list

**Acceptance**: spec test verifies 6 rows created per project

#### T-P3-4: ProjectsService + status machine

**allowedFiles**:

- `backend/src/modules/project/services/projects.service.ts`
- `backend/src/modules/project/services/project-status-machine.service.ts`
- `backend/src/modules/project/services/projects.service.spec.ts`
- `backend/src/modules/project/services/project-status-machine.service.spec.ts`

**Action**: Per BDD §5.4 + §5.5

- Create with pre-acquisition flow → placeholder customer
- Update + permission check (owner / admin / manager)
- Status machine: forward transitions valid/invalid, side effects (actualStart/End auto-set)
- Reverse transition admin-only + reason

**Acceptance**: Unit tests cover all transitions including invalid

#### T-P3-5: ProjectsController + ProjectFoldersController (read-only)

**allowedFiles**:

- `backend/src/modules/project/controllers/projects.controller.ts`
- (folders endpoint inline in projects.controller.ts as `GET /projects/:id/folders`)
- `backend/src/modules/project/project.module.ts` (wire)
- `backend/src/app.module.ts` (register ProjectModule)

**Action**: 9 endpoints:

- GET /projects (list with invited filter)
- POST /projects (create, kèm placeholder customer flow)
- GET /projects/:id
- PUT /projects/:id
- DELETE /projects/:id (admin only)
- POST /projects/:id/status (forward transition)
- POST /projects/:id/status/reverse (admin only)
- GET /projects/:id/folders
- (CSV export endpoint P6)

**Acceptance**: curl test full create flow returns project + folders + member

---

## P4: Project members (1.0 ngày)

### Tasks

#### T-P4-1: Backend project_members

**allowedFiles**:

- `backend/src/modules/project/dto/{add-member,update-member-role}.dto.ts`
- `backend/src/modules/project/repositories/project-member.repository.ts`
- `backend/src/modules/project/services/project-members.service.ts`
- `backend/src/modules/project/services/project-members.service.spec.ts`
- `backend/src/modules/project/controllers/project-members.controller.ts`
- `backend/src/modules/project/project.module.ts` (wire)

**Action**: Per BDD §5.8

- 4 endpoints (list/add/updateRole/remove)
- Last-owner protection
- Re-activate revoked member on re-add
- Owner sync với `projects.owner_user_id`

**Acceptance**:

- Spec covers last-owner block, duplicate add returns existing, re-add reactivates
- curl test add/list/remove flow

#### T-P4-2: Frontend project members API + i18n

**allowedFiles**:

- `frontend/src/shared/api/project-members.api.ts`
- `frontend/src/locales/{ja,en,vi}.json` (extend `project.members.*`)

#### T-P4-3: ProjectMembersTab + AddMemberModal

**allowedFiles**:

- `frontend/src/features/project/components/ProjectMembersTab.tsx`
- `frontend/src/features/project/components/AddMemberModal.tsx`
- `frontend/src/features/project/components/MemberRow.tsx`

**Action**: Per FDD §4.5 — 2-tab modal (Pick existing / Invite link sang F8)

**Acceptance**: ProjectDetailPage tab `メンバー` works, add/remove/change-role flows complete

---

## P5: Project list + Kanban + filters (1.5 ngày)

### Tasks

#### T-P5-1: Install @dnd-kit

**allowedFiles**:

- `frontend/package.json`
- `pnpm-lock.yaml`

**Action**: `pnpm --filter frontend add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

#### T-P5-2: Frontend project API + Zod + i18n

**allowedFiles**:

- `frontend/src/shared/api/projects.api.ts`
- `frontend/src/features/project/schemas/project.schema.ts`
- `frontend/src/locales/{ja,en,vi}.json` (extend `project.*` keys ~50)

#### T-P5-3: ProjectsListPage + ProjectsTable

**allowedFiles**:

- `frontend/src/features/project/pages/ProjectsListPage.tsx`
- `frontend/src/features/project/components/ProjectsTable.tsx`
- `frontend/src/features/project/components/ProjectStatusTag.tsx`
- `frontend/src/features/project/components/ProjectTypeTag.tsx`

**Action**: Table view + view toggle button + project_code + customer name link

**Acceptance**: list shows projects, filter changes URL state, pagination works

#### T-P5-4: ProjectBoardKanban + drag-drop

**allowedFiles**:

- `frontend/src/features/project/components/ProjectBoardKanban.tsx`
- `frontend/src/features/project/components/DroppableColumn.tsx`
- `frontend/src/features/project/components/SortableProjectCard.tsx`
- `frontend/src/features/project/components/ConfirmStatusChangeModal.tsx`

**Action**: Per FDD §4.1 — 6 columns, drag-drop with confirm modal, optimistic update + rollback

**Acceptance**:

- Drag card sang column khác → confirm modal → status update
- Cancel modal → card về vị trí cũ
- Invalid transition → error message
- `received` transition requires `amountTotal` field

#### T-P5-5: ProjectFiltersPanel

**allowedFiles**:

- `frontend/src/features/project/components/ProjectFiltersPanel.tsx`

**Action**: Per FDD §3.5 — multi-criteria + collapsible

**Acceptance**: All filters compose correctly (status × type × owner × date range × customer)

#### T-P5-6: ProjectFormPage + ProjectFormFields

**allowedFiles**:

- `frontend/src/features/project/pages/ProjectFormPage.tsx`
- `frontend/src/features/project/components/ProjectFormFields.tsx`

**Action**: Per FDD §3.7 — pre-acquisition checkbox, customer picker autocomplete, property picker

**Acceptance**:

- Create project normal: customer required, property optional
- Create project pre-acq: checkbox → ẩn customer picker → backend tạo placeholder
- Edit existing: form populated

#### T-P5-7: ProjectDetailPage (3 tabs) + ReverseStatusModal

**allowedFiles**:

- `frontend/src/features/project/pages/ProjectDetailPage.tsx`
- `frontend/src/features/project/components/ProjectOverviewTab.tsx`
- `frontend/src/features/project/components/ProjectFoldersTab.tsx`
- `frontend/src/features/project/components/ReverseStatusModal.tsx`

**Action**: Header + Tabs (概要 / メンバー / フォルダ) + admin reverse button

**Acceptance**: All tabs accessible per role, folders tab shows 6 default folders

---

## P6: Saved searches + CSV export + CSV import (1.0 ngày)

### Tasks

#### T-P6-1: Backend saved-searches module

**allowedFiles**:

- `backend/src/modules/project/dto/saved-search.dto.ts`
- `backend/src/modules/project/repositories/saved-search.repository.ts`
- `backend/src/modules/project/services/saved-searches.service.ts`
- `backend/src/modules/project/controllers/saved-searches.controller.ts`
- `backend/src/modules/project/project.module.ts` (wire)

**Action**: 3 endpoints (list / create / delete) scoped to user

**Acceptance**: curl test, per-user data isolation verified

#### T-P6-2: Backend ProjectExportService + CSV streaming

**allowedFiles**:

- `backend/src/modules/project/services/project-export.service.ts`
- `backend/src/modules/project/controllers/projects.controller.ts` (add export endpoint)
- `backend/package.json` (add `csv-stringify`)

**Action**: Per BDD §5.9 — streaming CSV via Express response, BOM for Excel

**Acceptance**:

- curl `/projects/export.csv?status=construction` returns text/csv
- Open in Excel: 日本語 chars render correctly (BOM works)
- Audit log entry created với rowCount + filter

#### T-P6-3: Backend CustomerImportService full implementation

**allowedFiles**:

- `backend/src/modules/customer/services/customer-import.service.ts`
- `backend/src/modules/customer/services/customer-import.service.spec.ts`
- `backend/src/modules/customer/controllers/customer-import.controller.ts`
- `backend/src/modules/customer/customer.module.ts` (wire + multer config)
- `backend/package.json` (add `csv-parse`, `multer`)

**Action**: Per BDD §5.3 — CSV parse, dedup phone, batch insert in transaction, error report

**Acceptance**:

- Test với CSV 100 rows: 95 created + 5 skipped (duplicates) + 0 errors
- Test với invalid row: returns error report with rowIndex + message
- Single transaction: if any critical error, rollback all

#### T-P6-4: Frontend saved searches + CSV export FE

**allowedFiles**:

- `frontend/src/shared/api/saved-searches.api.ts`
- `frontend/src/features/project/components/SavedSearchesDropdown.tsx`
- `frontend/src/features/project/components/SaveSearchModal.tsx`
- `frontend/src/features/project/components/ProjectFiltersPanel.tsx` (add export button)

**Action**: Dropdown trong filter panel + save modal + download CSV button (calls export endpoint with current filter)

**Acceptance**:

- Save filter → reload page → dropdown shows saved → click → filter restored
- Click "CSV エクスポート" → file downloads với current filter applied

#### T-P6-5: Frontend CustomerImportPage

**allowedFiles**:

- `frontend/src/features/customer/pages/CustomerImportPage.tsx`
- `frontend/src/features/customer/components/CsvImportDropzone.tsx`

**Action**: Per FDD §3.4 — drag-drop + preview 10 rows + submit + result display

**Acceptance**:

- Admin login → `/admin/customer-import` → upload CSV → see result `{created, skipped, errors}`
- Error report download works

---

## P7: F1-04 Timeline view (0.5 ngày)

### Tasks

#### T-P7-1: Backend `GET /customers/:id/projects`

**allowedFiles**:

- `backend/src/modules/customer/controllers/customers.controller.ts`
- `backend/src/modules/customer/services/customers.service.ts`

**Action**: Add method `getProjectsTimeline(customerId, requester)` calling `projectRepo.findByCustomer`

**Acceptance**: returns projects sort desc by createdAt với customer + property + owner relations

#### T-P7-2: HistoryTab component

**allowedFiles**:

- `frontend/src/features/customer/components/HistoryTab.tsx`

**Action**: Antd Timeline với items hiển thị project_code, status, type, name, dates, owner. Click → navigate `/projects/:id`

**Acceptance**: Customer detail page tab `履歴` shows projects chronologically, navigate works

---

## P8: Polish + smoke test + commit (0.5 ngày)

### Tasks

#### T-P8-1: AuditService events wired everywhere

**allowedFiles**:

- All services in customer/ and project/ modules — verify `await this.audit.log*(...)` được call sau mỗi mutation
- `backend/src/modules/auth/internal/audit.service.ts` (or audit-stub.service.ts) — ensure full method coverage

**Action**:

- Code review all mutation methods to ensure audit emit
- Add missing audit calls
- Manual verification via Prisma Studio: spawn 5 mutations → see 5 audit_log rows với correct event types

**Acceptance**: Every BDD-listed event type appears in audit_logs after manual test

#### T-P8-2: Smoke test end-to-end

**Action** (manual, không write code):

1. Login admin → create customer (個人) → verify list
2. Edit customer → verify dedup confirm khi đổi phone trùng
3. Add property với handover_date + 2 ảnh client-resized
4. Create project linked to customer + property
5. Verify project_code format `2026-NNNN`, 6 folders auto-created, owner in members
6. Drag-drop project quoting → received với amountTotal → success
7. Add member (manager role) → verify list, change role to inspector, remove
8. Pre-acquisition project: tạo project với checkbox 土地仕入れ → verify placeholder customer
9. CSV export filtered → open Excel
10. Customer detail tab `履歴` → see timeline
11. Saved search: save filter → reload → load saved → filter restored
12. admin reverse status cancelled → quoting với reason
13. Invited_user: login → /customers → 403 → /projects → empty list (no assignments)
14. CSV import 10-row test CSV → result correct

**Acceptance**: All 14 paths complete without errors

#### T-P8-3: Build + lint check

**Action**:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

**Acceptance**: All 3 commands clean

#### T-P8-4: Update CLAUDE.md / project conventions if discovered new patterns

**allowedFiles**:

- `.claude/rules/backend-nestjs.md` (extend nếu cần)
- `.claude/rules/frontend-react.md` (extend nếu cần)
- `documents/architecture/02-module-architecture.md` (update if needed — module split for F1)

**Action**: Update conventions if implementation revealed new patterns (e.g., generated tsvector columns approach, sequence-per-year pattern)

**Acceptance**: docs reflect actual implementation

#### T-P8-5: Final commits + push

**Action**:

- Commit logical chunks (1 commit per phase or per logical unit)
- Push to feature/f1-customer
- Open PR description với summary + AC checklist

**Acceptance**: PR ready for review on GitHub

---

## 2. File boundary summary (cho `/execute`)

### Files được tạo MỚI (NEW)

**Backend** (~50 files):

- `backend/src/modules/customer/` — full module (16 files)
- `backend/src/modules/project/` — full module (20 files)
- `backend/src/shared/exceptions/customer-errors.ts`
- `backend/src/shared/exceptions/project-errors.ts`
- `backend/prisma/migrations/*_add_f1_customer_project/migration.sql`
- `backend/prisma/migrations/*_add_f1_fts_and_sequences/migration.sql`
- Spec files (~6 files)

**Frontend** (~40 files):

- `frontend/src/features/customer/` — full feature (12 files)
- `frontend/src/features/project/` — full feature (16 files)
- `frontend/src/shared/api/customers.api.ts`
- `frontend/src/shared/api/properties.api.ts`
- `frontend/src/shared/api/projects.api.ts`
- `frontend/src/shared/api/project-members.api.ts`
- `frontend/src/shared/api/saved-searches.api.ts`

### Files được MODIFY (EXISTING)

**Backend**:

- `backend/prisma/schema.prisma` — add enums + models
- `backend/prisma/seed.ts` — add test data
- `backend/src/app.module.ts` — register CustomerModule + ProjectModule
- `backend/src/modules/auth/internal/audit-stub.service.ts` → rename `audit.service.ts` + implement persist + add F1 methods
- `backend/src/cli/cli.module.ts` — update audit service import name
- `backend/package.json` — add `csv-parse`, `csv-stringify`, `multer`, `@types/multer`

**Frontend**:

- `frontend/src/app/routes.tsx` — add 9 routes
- `frontend/src/shared/components/guards/RoleGuard.tsx` — add `deny` prop variant (nếu chưa có)
- `frontend/src/shared/components/layout/AppLayout.tsx` — wire nav items (existing, just sanity check)
- `frontend/src/locales/{ja,en,vi}.json` — add ~150 keys per FDD §6
- `frontend/package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

### Files KHÔNG được modify

- `backend/src/modules/auth/` (auth core) — chỉ rename audit service
- `backend/src/modules/notification/` (email service) — unchanged
- `frontend/src/features/auth/` — unchanged
- `frontend/src/features/admin/users/` — unchanged
- `frontend/src/features/settings/` — unchanged
- `frontend/src/styles/design-tokens.css` — unchanged
- `frontend/src/app/providers.tsx` — unchanged
- All `documents/architecture/*.md` — unchanged (already updated trong design phase)

---

## 3. Dependencies external (npm packages mới)

### Backend

```bash
pnpm --filter backend add csv-parse csv-stringify multer
pnpm --filter backend add -D @types/multer
```

### Frontend

```bash
pnpm --filter frontend add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Total bundle impact:

- BE: ~200KB unpacked deps (parse/stringify lightweight)
- FE: ~10KB gzip JS (@dnd-kit total)

---

## 4. Risk register

| ID   | Risk                                                                                                          | Likelihood | Impact | Mitigation                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| R-01 | tsvector generated column require PostgreSQL 16 syntax — Prisma migration không support natively              | Med        | Med    | Use raw SQL migration (planned). Test migration manually trên fresh DB trước khi push                                     |
| R-02 | Sequence per năm cần create cho năm hiện tại — first create slow do `CREATE SEQUENCE IF NOT EXISTS`           | Low        | Low    | Pre-create cho 2026, 2027 trong migration. Cron job pre-create năm sau ở Phase 2                                          |
| R-03 | Photo base64 phình DB nếu user upload nhiều property                                                          | Med        | Med    | Client resize ≤100KB strict. Monitor table size. Migrate S3 Phase 2 nếu cần                                               |
| R-04 | @dnd-kit React 18 strict mode quirks                                                                          | Low        | Low    | Library matured, expected stable. Test trong dev + smoke check                                                            |
| R-05 | Soft-delete cascade logic phức tạp — block customer delete nếu active project                                 | Med        | Med    | Cover trong unit test. Manual smoke với fixture data                                                                      |
| R-06 | Pre-acquisition placeholder customer pollute customer list                                                    | Med        | Low    | Doc trong rules (admin rename khi customer thực ký). Filter Phase 2 view "pending customers"                              |
| R-07 | invited_worker filter trên mọi project query → forget at 1 endpoint = security leak                           | High       | High   | Apply filter ở repository level (1 chỗ duy nhất). Code review checklist                                                   |
| R-08 | CSV import lock DB lâu nếu 2K rows                                                                            | Med        | Med    | Streaming parse, single transaction, timeout 60s. Test với 5K rows worst case                                             |
| R-09 | Audit log volume khi F1 production load (50 users × 10 mutations/day = 500 events/day × 365 = 180K rows/year) | Low        | Low    | Index `(actorUserId, occurredAt desc)` + `(entityType, entityId, occurredAt desc)` adequate. Archive S3 Glacier ở Phase 2 |

---

## 5. Rollback strategy

### 5.1 Schema rollback

- Prisma migration auto-generated DOWN SQL
- Raw SQL migration: viết manual rollback script chứa:
  ```sql
  DROP INDEX IF EXISTS idx_customers_search_text, idx_customers_address_trgm, idx_customers_name_trgm, idx_projects_search_text;
  ALTER TABLE customers DROP COLUMN IF EXISTS search_text;
  ALTER TABLE projects DROP COLUMN IF EXISTS search_text;
  DROP SEQUENCE IF EXISTS project_code_seq_2026, project_code_seq_2027;
  ```
- Tables rollback: `DROP TABLE saved_searches, folders, project_members, projects, properties, customers CASCADE` (chỉ dev — không bao giờ run prod)

### 5.2 Code rollback

- Git revert F1 PR
- AuditService: nếu rollback, F8 vẫn work với stub behavior (cần keep both `audit-stub.service.ts` import path cho safety hoặc viết upgrade là backward compat)

### 5.3 Soft rollback (nếu chỉ 1 module có issue)

- Disable route trong `routes.tsx` (frontend) + remove module from `app.module.ts` import (backend)
- F1 features ẩn nhưng data trong DB giữ nguyên

---

## 6. Acceptance criteria (cho /plan-review)

### MUST have (P0-P5)

- ✅ All 6 sub-features F1-01 → F1-06 working end-to-end
- ✅ Backend: typecheck + lint + build clean
- ✅ Frontend: typecheck + lint + build clean
- ✅ Schema migrated + seed loaded
- ✅ Smoke test 14 paths pass
- ✅ No regression trong F8 (login, 2FA, settings, user mgmt still work)
- ✅ Audit log entries created cho mọi mutation
- ✅ Authorization enforced (invited_worker access constrained)

### SHOULD have (P6-P8)

- ✅ Service-layer unit tests cho business logic phức tạp
- ✅ Saved searches end-to-end
- ✅ CSV export streaming
- ✅ CSV import 100-row sample test
- ✅ F1-04 timeline rendered

### NICE to have (deferred)

- ❌ E2E tests (defer F9)
- ❌ pg_bigm optimization (defer Phase 2)
- ❌ S3 photo storage (defer F3)
- ❌ BullMQ async events (defer Phase 2)
- ❌ Email i18n (defer per tech-debt note)

---

## 7. Estimate summary

| Phase | Net effort | Cumulative |
| ----- | ---------- | ---------- |
| P0    | 0.5d       | 0.5d       |
| P1    | 1.5d       | 2.0d       |
| P2    | 1.0d       | 3.0d       |
| P3    | 1.5d       | 4.5d       |
| P4    | 1.0d       | 5.5d       |
| P5    | 1.5d       | 7.0d       |
| P6    | 1.0d       | 8.0d       |
| P7    | 0.5d       | 8.5d       |
| P8    | 0.5d       | 9.0d       |

**Solo dev**: 8.5-9 ngày làm việc thuần (không kể bug fix unexpected + breaks).
**Buffer**: +20% = ~11 ngày calendar.

---

## 8. Confidence assessment

- Architecture decisions: **HIGH** (5 ADR + 3 architecture docs + 8 innovate technical decisions)
- Business requirements: **HIGH** (SRS chi tiết từ unified doc + 11 innovate SRS decisions)
- Implementation pattern: **HIGH** (F8-AUTH đã prove module structure + frontend feature-slice)
- Reuse from F8: **HIGH** (auth, RBAC, audit infra, email infra, i18n, design tokens, layout — all ready)
- New tech adoption: **MEDIUM** (@dnd-kit chưa dùng — proof-of-concept needed Phase P5)
- Test coverage: **MEDIUM** (chỉ service-layer per innovate decision, controller skip)

**Overall confidence**: 92% (đạt ngưỡng 90% cho execute)

---

_Generated by /plan — F1-CUSTOMER Implementation Plan BASE_
_Next: /plan-review (auto-chain)_
