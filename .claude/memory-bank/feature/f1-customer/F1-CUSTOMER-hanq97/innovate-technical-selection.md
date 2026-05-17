# Innovate Part 2: Technical Decisions — F1-CUSTOMER

**Feature**: F1-CUSTOMER (顧客 + 物件 + 案件 management)
**Generated**: 2026-05-16
**Decisions**: 8 quyết định technical (BD: 4, DD: 4)
**State transition**: SRS_CREATED → INNOVATE_TECHNICAL

---

## Tóm tắt quyết định

| #     | Layer          | Decision                      | Lựa chọn                                            |
| ----- | -------------- | ----------------------------- | --------------------------------------------------- |
| BD-01 | Architecture   | Module split                  | 1 module `customer` chứa cả `properties`            |
| BD-02 | Architecture   | Auto-numbering `project_code` | DB sequence per năm + migration auto-create         |
| BD-03 | Architecture   | Soft delete cascade           | Block delete nếu còn active project                 |
| BD-04 | Architecture   | FTS Japanese implementation   | Combined `search_text` tsvector generated column    |
| DD-01 | Implementation | Kanban drag-drop library      | `@dnd-kit/core` + `@dnd-kit/sortable`               |
| DD-02 | Implementation | Event emission pattern        | NestJS `EventEmitter2` sync in-process              |
| DD-03 | Implementation | Audit log storage             | Persist vào `audit_logs` table                      |
| DD-04 | Implementation | Test strategy                 | Service-layer unit test cho business logic phức tạp |

---

## BD Decisions (Architecture)

### D-BD-01: Module split — 1 module `customer` chứa cả properties

**Vấn đề**: Property có nên là module riêng hay nested trong customer module?

**Quyết định**: Single module `backend/src/modules/customer/` chứa cả customers + properties entities.

**Cấu trúc**:

```
modules/customer/
├── customer.module.ts                    # @Module(imports, providers, exports)
├── controllers/
│   ├── customers.controller.ts
│   ├── properties.controller.ts
│   └── customer-import.controller.ts     # CSV import (D-SRS-05)
├── services/
│   ├── customers.service.ts
│   ├── properties.service.ts
│   ├── customer-import.service.ts
│   └── customer-duplicate-check.service.ts   # D-SRS-02
├── repositories/
│   ├── customer.repository.ts
│   └── property.repository.ts
├── dto/                                  # All customer + property DTOs
├── domain/
│   ├── types.ts                          # CustomerType, PropertyType enums
│   └── customer-events.ts                # Event names + payload types
└── events/                               # Internal event listeners (sync)
```

**Lý do**:

- Property không có vòng đời độc lập (luôn link với customer 1:N)
- Theo entity-catalog §3 "Module: customer" cho property
- Tránh boilerplate (cross-module call customer↔property)
- Cùng team owner

**Đối lập**: Project là module riêng vì có lifecycle phức tạp + nhiều cross-cutting concern (status machine, member, folder).

### D-BD-02: Auto-numbering project_code — DB sequence per năm

**Vấn đề**: Sinh `project_code` format `YYYY-NNNN` race-safe, reset 0001 đầu năm.

**Quyết định**:

- Tạo DB sequence per năm: `CREATE SEQUENCE IF NOT EXISTS project_code_seq_2026 START 1`
- App-side code:
  ```typescript
  // Trong projects.service.ts createProject():
  const year = new Date().getFullYear();
  const seqName = `project_code_seq_${year}`;
  // Ensure sequence exists (idempotent)
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`);
  const [{ nextval }] = await prisma.$queryRawUnsafe(`SELECT nextval('${seqName}') as nextval`);
  const projectCode = `${year}-${String(nextval).padStart(4, '0')}`;
  ```
- Sequence được auto-tạo lazy lần đầu tạo project trong năm đó
- UNIQUE constraint trên `project_code` đảm bảo final safety

**Lý do**:

- Race-safe: nextval atomic
- Không cần cron job thủ công ngày 1/1
- 4 digits → max 9,999 projects/năm (đủ cho 5K target × 2x buffer)
- Format khớp yêu cầu user story

**Tác động**:

- Prisma không support sequence natively → dùng `$executeRawUnsafe` + `$queryRawUnsafe`
- Migration ban đầu: tạo sequence cho năm hiện tại + năm sau (`project_code_seq_2026`, `project_code_seq_2027`)
- Phase 2: cron job @ Jan 1 mỗi năm để pre-create sequence năm mới (tránh latency lần đầu)

### D-BD-03: Soft delete cascade — Block if active project

**Vấn đề**: Khi user soft-delete customer, properties/projects link với customer xử lý sao?

**Quyết định**:

- **Trước khi soft-delete customer**:
  ```typescript
  // customers.service.ts softDelete(id):
  const activeProjects = await projectRepo.count({
    where: { customerId: id, status: { notIn: ['handed_over', 'cancelled'] }, deletedAt: null },
  });
  if (activeProjects > 0) {
    throw new CustomerHasActiveProjectsError(activeProjects);
  }
  // Proceed with soft delete
  await customerRepo.softDelete(id);
  // Properties NOT cascade — user xử lý thủ công nếu cần
  ```
- Endpoint trả về `409 Conflict` với body `{ code: 'CUSTOMER_HAS_ACTIVE_PROJECTS', count: 3, projectIds: [...] }`
- FE: hiện modal liệt kê active projects + link → user xử lý từng project trước

**Lý do**:

- Safety-first: tránh "ghost project" mất reference customer
- Audit trail rõ ràng
- 電帳法 yêu cầu giữ history quote — block ngăn dependency phá vỡ

**Tác động**:

- Properties KHÔNG cascade soft-delete — admin xử lý thủ công (rất hiếm case này)
- Project soft-delete riêng có check tương tự: block nếu có quote/aftercare reference (Phase 2)

### D-BD-04: FTS — Combined `search_text` tsvector generated column

**Vấn đề**: Search customer theo 氏名/フリガナ/電話/住所 cùng lúc.

**Quyết định**:

- Mỗi entity searchable có 1 column generated `search_text tsvector`:
  ```sql
  ALTER TABLE customers ADD COLUMN search_text tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(name_kana, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(address, ''))
  ) STORED;
  CREATE INDEX idx_customers_search_text ON customers USING gin(search_text) WHERE deleted_at IS NULL;
  ```
- Dùng `'simple'` config thay vì `'japanese'` (config Japanese cần pg_bigm + cài đặt, dùng simple cho MVP)
- Query: `WHERE search_text @@ plainto_tsquery('simple', $1)`
- Bổ sung pg_trgm cho address/name fuzzy match (theo db-design §5.1)

**Lý do**:

- 1 index GIN duy nhất → fast
- Tự động maintain (generated column, không cần trigger)
- Match db-design §3.4 + entity-catalog đã định nghĩa `search_text tsvector GENERATED`

**Tác động**:

- Migration: tạo extension `pg_bigm` Phase 2 nếu performance không đủ. Phase 1 dùng `simple` config tốt cho ASCII + ổn ổn cho Japanese (mac match câu hoàn chỉnh tốt; partial match dùng pg_trgm)
- Project entity tương tự: `search_text` generated từ `name || description || project_code || customer.name`

---

## DD Decisions (Implementation)

### D-DD-01: Kanban — @dnd-kit/core + @dnd-kit/sortable

**Vấn đề**: Library cho drag-drop Kanban board.

**Quyết định**:

- Dependencies: `pnpm --filter frontend add @dnd-kit/core@^6 @dnd-kit/sortable@^8 @dnd-kit/utilities@^3`
- Implementation pattern:
  ```typescript
  // ProjectBoardKanban.tsx
  <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
    {STATUSES.map(status => (
      <DroppableColumn key={status} id={status}>
        <SortableContext items={projectsByStatus[status]} strategy={verticalListSortingStrategy}>
          {projectsByStatus[status].map(p => <SortableProjectCard key={p.id} project={p} />)}
        </SortableContext>
      </DroppableColumn>
    ))}
    <DragOverlay>{activeProject ? <ProjectCard project={activeProject} /> : null}</DragOverlay>
  </DndContext>
  ```
- onDragEnd: nếu drop sang column khác → show confirm modal → API call → invalidate query

**Lý do**:

- Modern (React 18 strict mode safe)
- Accessible by default (keyboard support cho a11y)
- Bundle nhỏ (~10KB gzip)
- Touch support tốt cho Phase 2 mobile
- Active maintenance vs react-beautiful-dnd (Atlassian đã stop)

**Tác động**:

- Bundle +10KB
- Code pattern khác Antd Drag (don't dùng Antd Tree/Table drag)
- Component `ProjectBoardKanban` + `SortableProjectCard` + `DroppableColumn`

### D-DD-02: Event emission — NestJS EventEmitter2 sync

**Vấn đề**: Cross-module event (customer.created → audit + dashboard).

**Quyết định**:

- Use `@nestjs/event-emitter` package (đã cài cho F8)
- Sync in-process: emitter.emit → listener chạy ngay trong cùng request thread
- Pattern:

  ```typescript
  // customers.service.ts
  await this.audit.logCustomerCreated(customer, ctx);
  this.eventEmitter.emit('customer.created', { customerId: customer.id, ... });

  // dashboard.listener.ts (Phase 2 placeholder)
  @OnEvent('customer.created')
  handleCustomerCreated(payload: CustomerCreatedPayload) { ... }
  ```

- Sync exception handling: nếu listener throw → main flow KHÔNG bị ảnh hưởng (caller wraps in try-catch hoặc dùng `emitAsync` nếu cần wait)

**Lý do**:

- Theo arch §5.2 dòng 109-126
- Đã có dependency từ F8
- Sync đủ Phase 1 volume (~50 events/day)
- BullMQ async overkill cho MVP (cần Redis, worker, retry logic)

**Tác động**:

- Listener subscribers wrap trong try-catch để tránh fail main flow
- Phase 2: chuyển sang `BullMQModule` cho event-driven async khi load tăng (chỉ thay implementation, interface giữ nguyên)

### D-DD-03: Audit storage — Persist vào audit_logs table

**Vấn đề**: F8 chỉ console-log via AuditStubService. F1 cần persist thực để query lịch sử.

**Quyết định**:

- Tạo `AuditService` (replace `AuditStubService` từ F8) trong `modules/auth/internal/audit.service.ts`
- Method signature giữ nguyên (backward compat với F8 code đã viết)
- Implementation: insert row vào `audit_logs` table (Prisma model đã có sẵn)
- Schema:
  ```prisma
  model AuditLog {
    id            String   @id @default(uuid())
    actorUserId   String?  // null cho system event
    eventType     String   // 'customer.created', 'project.status_changed', ...
    entityType    String   // 'customer', 'project', ...
    entityId      String?
    payload       Json     // changed fields (KHÔNG values với PII)
    ipAddress     String?
    userAgent     String?
    traceId       String
    occurredAt    DateTime @default(now())
    @@index([actorUserId, occurredAt(sort: Desc)])
    @@index([entityType, entityId, occurredAt(sort: Desc)])
  }
  ```
- F1 mutations đều call `audit.log<EventName>(payload, ctx)` trong cùng transaction

**Lý do**:

- F1 cần audit thực để admin truy vết
- Schema `audit_logs` đã có trong Prisma — chỉ thiếu service implementation
- Phase 2 archive sang S3 Glacier sau 90 ngày (cron job)

**Tác động**:

- BE: rename + reimplement AuditStubService → AuditService
- BE: cần migration update audit_logs schema nếu cần thêm field (kiểm tra trong /design)
- BE: thêm endpoint `GET /audit-logs?entityType=&entityId=` (admin only, defer Phase 2 nếu chỉ cần persist)
- F1 audit volume ước ~10-50 events/day Phase 1

### D-DD-04: Test strategy — Service-layer unit test

**Vấn đề**: Coverage test cho F1 ở mức nào (MVP solo dev).

**Quyết định**:

- **Viết unit test cho business logic phức tạp**:
  - `projects.service.ts`: status machine (forward + reverse), placeholder customer auto-create cho pre-acq
  - `customers.service.ts`: soft-delete block khi có active project, duplicate detection (phone match warn)
  - `properties.service.ts`: handover_date event emit
  - `customer-import.service.ts`: CSV parse + dedup + error reporting
- **Skip**:
  - CRUD đơn giản (Prisma layer đã test)
  - Controllers (thin layer, e2e cover sau)
- **Tool**: Jest (đã setup F8) + `jest-mock-extended` cho mock PrismaService
- **Target**: 10-15 spec file cho F1, ~50% service code coverage cho business rules

**Lý do**:

- Solo dev MVP — không thể full coverage
- Status machine + dedup logic là regression-prone → cần test
- E2E tests defer F9 (như F8 P9)
- Smoke test manual đủ cho controller layer

**Tác động**:

- Time: +1 ngày viết test
- Pattern: mỗi service file có file `.spec.ts` cùng folder
- CI: jest sẽ chạy trong workflow (đã có sẵn nhưng skip nếu không tìm thấy spec)

---

## Tích hợp với decisions Part 1 (SRS)

| Part 1 Decision               | Part 2 Tác động                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| D-SRS-01 saved searches       | Schema `saved_searches` bảng mới; FE component `SaveSearchModal`                           |
| D-SRS-02 dedup warn           | `customer-duplicate-check.service.ts` (separate from customers.service) — unit tested      |
| D-SRS-03 placeholder customer | Logic trong `projects.service.createProject()` — unit tested                               |
| D-SRS-04 hybrid invite        | FE `AddMemberModal` tab `Pick existing` + tab `Invite new` (link F8 InviteUserModal)       |
| D-SRS-05 CSV import           | `customer-import.service.ts` + `csv-parse` dep — unit tested                               |
| D-SRS-06 base64 photos        | FE client-side resize via canvas; BE validate `photo_urls` array length + each string size |
| D-SRS-07 audit mutations      | Wire AuditService (D-DD-03) vào mọi service mutation method                                |
| D-SRS-08 kanban drag+menu     | `@dnd-kit` + ConfirmStatusChangeModal (D-DD-01)                                            |
| D-SRS-09 reverse status       | Separate endpoint `POST /projects/:id/status/reverse` (admin role only)                    |
| D-SRS-10 timeline tab         | Tab trong CustomerDetailPage, query `GET /customers/:id/projects`                          |
| D-SRS-11 default list         | Initial useState với `{ sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 50 }`   |

---

## Dependencies mới sẽ cài

**Backend** (`pnpm --filter backend add`):

- `csv-parse` (~150KB) — CSV import processing
- (đã có) `@nestjs/event-emitter` — reuse từ F8

**Frontend** (`pnpm --filter frontend add`):

- `@dnd-kit/core@^6` (~6KB gzip)
- `@dnd-kit/sortable@^8` (~3KB gzip)
- `@dnd-kit/utilities@^3` (~1KB gzip)

**No new infra dependencies** (vẫn dùng PostgreSQL + Redis docker compose hiện có).

---

## Migration plan

### Migration 1: Schema F1

```bash
pnpm --filter backend prisma:migrate:dev --name add_f1_customer_project
```

Generated migration sẽ chứa:

- New enums: `CustomerType`, `PropertyType`, `PropertyStructure`, `ProjectType`, `ProjectStatus`, `ProjectMemberRole`, `FolderType`
- New tables: `customers`, `properties`, `projects`, `project_members`, `folders`, `saved_searches`
- Generated columns: `customers.search_text`, `projects.search_text`
- Indexes: GIN, B-tree composite per db-design §5
- Foreign keys (with proper `ON DELETE` rules)
- Sequence: `project_code_seq_2026`, `project_code_seq_2027`

### Seed update

- `prisma/seed.ts`: thêm 3-5 customer test, 5-8 property, 5-10 project across mọi status để dev test UI

---

## Open issues — cần xác nhận trong /design

1. **AuditService schema fields**: payload JSON structure (changed fields without PII values)?
2. **Project status enum mapping**: backend `quoting/received/...` ↔ FE display label trong i18n?
3. **Folder auto-create**: trigger trong DB hay app-side trong projects.service.createProject()?
4. **search_text language config**: `'simple'` Phase 1 OK, hay setup `pg_bigm` ngay nếu performance critical?

---

_Next: Auto-chain `/design --srs --basic --detail` để generate SRS + BD + DD docs_
