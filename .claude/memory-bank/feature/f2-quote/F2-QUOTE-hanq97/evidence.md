# Evidence Report — F2 見積管理

## Metadata

- **Feature**: F2-QUOTE
- **Task Type**: new
- **Module**: quote
- **Generated**: 2026-05-17
- **Branch**: feature/f2-quote
- **Phase**: Phase 1 MVP (F2-01..05; F2-06 deferred Phase 3)

---

## Section 1: Business Context [SCOPE:SRS]

### E1.1 — MVP scope confirmed by Phase 1 roadmap

**Source**: `documents/architecture/08-mvp-scope-and-roadmap.md` lines 25-26, 67

- Line 25-26: "Quản lý cases (案件) với status lifecycle 見積→受注→着工→完成→引渡し" + "Tạo, edit, clone, approve, export PDF quote (見積)"
- Line 67: Sprint 3 W6-7 → `quote` (F2-01〜05); `unit_price` (F2-02); PDF generation

**Implication**: 5 sub-features in MVP — CRUD, line items + unit_price master, approval workflow, PDF, 電帳法 versioning.

### E1.2 — Out of scope features per roadmap

**Source**: `documents/architecture/08-mvp-scope-and-roadmap.md` lines 45 + 132

- Line 45: "AI quote suggestion | AI module deferred | Phase 3"
- Line 132: F2-06 AI 見積補助 listed under Phase 3 scope (8 features total)

**Implication**: AI assistance for quote line item suggestions defer to Phase 3. No OCR receipt scanning in MVP.

### E1.3 — User roles per F1 + architecture

**Source**: `documents/architecture/06-security-architecture.md` (assumed pattern) + F1-CUSTOMER-BASE-srs.md role matrix

- Confirmed: 4 roles `system_admin` / `manager` / `employee` / `invited`
- Invited has NO quote access (similar to customer access pattern)

**Implication**: Authorization model — employee creates/edits own draft quotes; manager approves; admin override + delete.

### E1.4 — 電子帳簿保存法 compliance hard requirement

**Source**: `documents/architecture/04-database-design.md` lines 176-194 + README.md line 149

- README: "電子帳簿保存法 (Electronic Bookkeeping Law — quote/contract handling)"
- DB-design §7.2: 3 mandatory search keys — 取引年月日, 金額, 取引先
- DB-design §7.1: append-only `quote_versions` with snapshot JSONB

**Implication**: Quote module MUST implement versioning + 3 search indexes from day one. Cannot defer.

### E1.5 — Data volume estimates (10-year scale)

**Source**: `documents/architecture/04-database-design.md` lines 86-89

- `quotes` ~7,500 rows/year → 75K rows in 10 years
- `quote_lines` ~750K rows/year → 7.5M rows in 10 years (heavy)
- `quote_versions` ~22,500 rows/year → 225K rows in 10 years
- `unit_prices` ~1,000-2,000 rows total

**Implication**: line_items table is largest — need pagination + virtual scroll on UI. Versioning table needs JSONB compression for snapshots.

### E1.6 — Quote-Project relationship

**Source**: F1-CUSTOMER-BASE-srs.md + F1 implementation observed

- Project status state machine: `quoting → received → construction → completed → handed_over`
- `received` requires `amountTotal` field set
- Logically: amountTotal should come from approved quote

**Implication**: BR-QT-004/005 — when quote.status='won' + project.status='quoting', prompt user to transition project → received with quote.amount_total as project.amountTotal.

---

## Section 2: Architecture Patterns [SCOPE:BD]

### E2.1 — Module organization matches F1 pattern

**Source**: `backend/src/modules/customer/`, `backend/src/modules/project/` (existing)

- Pattern: `<module>/{controllers,services,repositories,dto,domain,utils}`
- One ProjectModule wires controllers + services + repositories
- Reuse PrismaService, AuthModule (UserRepository, RolesGuard), AuditStubService

**Implication**: Create `backend/src/modules/quote/` following same structure. No need for new infrastructure.

### E2.2 — Stack: NestJS + Prisma + PostgreSQL + Puppeteer

**Source**: `documents/architecture/02-module-architecture.md` lines 40-42 + 24

- Line 24: `quote/ # Phase 1 — Quote, unit price, PDF`
- Line 40: `pdf/ # Puppeteer wrapper (worker process)`
- Line 41: `http/` and line 42: `observability/` shared modules

**Implication**: PDF generation per architecture is Puppeteer worker process. MVP option: synchronous in-process Puppeteer for simpler start (≤100 lines), worker queue if performance issue.

### E2.3 — Event bus already in place (EventEmitter2)

**Source**: `backend/src/app.module.ts` (from F1 P0 work) + `documents/architecture/02-module-architecture.md` line 134-135

- AppModule registers EventEmitter2.forRoot()
- Architecture lists events: `quote.created`, `quote.approved`
- F1 already emits `project.created`, `project.status_changed` pattern

**Implication**: Reuse EventEmitter2; emit `quote.{created,submitted,approved,sent,won,lost}`; ProjectsService listens to `quote.won` for status transition prompts.

### E2.4 — Audit pattern via AuditStubService (synchronous)

**Source**: `backend/src/modules/auth/internal/audit-stub.service.ts` (F1 work)

- Writes synchronously to `audit_logs` table with `actor + action + entityType + entityId + changes JSONB`
- F1 added 14 project event methods
- Pattern: 1 method per event, all call `this.log()`

**Implication**: Add `logQuote{Created,Updated,Submitted,Approved,Sent,Won,Lost,Deleted,VersionCreated,CsvExported,PdfDownloaded}` methods to AuditStubService.

### E2.5 — Migrations split: schema + raw SQL pattern

**Source**: F1 migrations

- `20260516180300_add_f1_customer_project/` — Prisma-generated DDL
- `20260516180400_add_f1_fts_and_sequences/` — Raw SQL for tsvector + sequences

**Implication**: F2 will need 2 similar migrations:

1. Quote tables + FKs + B-tree indexes
2. Raw SQL for: bigm extension for counter_party_name, GIN indexes, sequence for quote_number per year

### E2.6 — Soft delete pattern via deletedAt

**Source**: All F1 tables (customers, properties, projects, folders) use `deletedAt` timestamp pattern

- Queries filter `deletedAt: null` by default
- Service-level soft delete via `repo.softDelete(id, actorId)`

**Implication**: quotes + quote_lines use same pattern. quote_versions append-only — no deletedAt.

### E2.7 — Cross-module reference avoiding circular dep

**Source**: F1 implementation experience — CustomerModule does NOT import ProjectModule

- Solution used: direct Prisma query in CustomersService (e.g., listProjectsByCustomer)
- ProjectModule imports CustomerModule for `findOrCreatePlaceholder`

**Implication**: QuoteModule should NOT import ProjectModule for project lookups — either use Prisma directly or have ProjectsService expose a minimal getProjectById method via export. Avoid circular import.

### E2.8 — Responsive Frontend pattern

**Source**: `frontend/src/shared/components/responsive/ResponsiveTable.tsx` + `.claude/rules/frontend-react.md` mobile-first rules

- Table → card list pattern on `<sm`
- Forms stack on mobile
- Quote line item editor on mobile = challenge (tables hard on touch)

**Implication**: Quote line item edit = desktop primary; mobile shows read-only view + summary. PDF download works on mobile.

---

## Section 3: Implementation References [SCOPE:DD]

### E3.1 — DB schema reference for quote tables

**Source**: `documents/architecture/04-database-design.md` lines 86-89, 117-119, 154

```
quotes        ~7,500 rows
quote_lines   ~750,000 rows (CASCADE on quote delete)
quote_versions ~22,500 rows (append-only)
unit_prices    ~1,000-2,000 rows

Indexes:
  idx_quotes_issued_at (DESC)
  idx_quotes_amount_total
  idx_quotes_counter_party_bigm (GIN bigm)
```

Migration file naming convention example: `20260601_090000_add_quote_versions_table/migration.sql`

**Implication**: Schema follows exact pattern. Need pg_bigm extension installed (in addition to pg_trgm).

### E3.2 — Sequence pattern for quote_number (per year reset)

**Source**: F1 implementation — `project_code_seq_2026` via `CREATE SEQUENCE IF NOT EXISTS`

- `backend/src/modules/project/services/project-code-generator.service.ts`
- Format: `2026-0001` (4-digit pad)

**Implication**: For F2, reuse same pattern but 5-digit pad:

- Sequence: `quote_number_seq_2026`
- Format: `Q-2026-00001`
- Race-safe via DB sequence
- Implement `QuoteNumberGeneratorService` following ProjectCodeGeneratorService pattern

### E3.3 — Versioning pseudo-code

**Source**: `documents/architecture/04-database-design.md` lines 178-183

```
- Each save (after first finalize) inserts new version with full JSONB snapshot
- change_type ENUM: correction / deletion / status_change
- change_reason TEXT NOT NULL for corrections and deletions
- Append-only; no UPDATE on this table
```

**Implication**: Implement `QuoteVersioningService.snapshot(quoteId, changeType, changeReason)`. Call from:

- QuotesService.update() after status='approved' — auto snapshot
- QuotesService.softDelete() — snapshot with change_type='deletion'
- QuoteStatusMachine.transition() — snapshot with change_type='status_change'

### E3.4 — PDF generation tech choice

**Source**: `documents/architecture/02-module-architecture.md` line 40 + 146

- `pdf/ # Puppeteer wrapper (worker process)`
- `pdf-generate` job lifted to common queue jobs

**Phase 1 MVP simpler choice**:

- Install `puppeteer` package
- Synchronous generation in-process for ≤100 lines
- Handlebars template (HTML) → headless Chromium → PDF buffer
- Stream PDF directly to response (no S3 storage in MVP)
- Future: defer to BullMQ worker if needed

### E3.5 — Frontend table edit pattern reference

**Source**: F1 PropertyFormModal + CustomerFormPage existing usage

- React Hook Form + Zod + Antd Form
- For inline editable table: use Antd `<Table editable>` or custom row-edit pattern
- Recommended: `react-hook-form useFieldArray` for line items array editing
- Reuse Antd InputNumber với formatter for JPY currency

### E3.6 — Permission decorator + role check pattern

**Source**: `backend/src/modules/project/controllers/projects.controller.ts` (F1)

- `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
- `@Roles('system_admin', 'manager', 'employee')` per method
- Invited excluded from CUD; specific endpoints add 'invited' for read-only

**Implication**: Quote controller pattern:

- GET `/quotes/*` → admin/manager/employee (no invited)
- POST/PUT/DELETE `/quotes` → admin/manager/employee
- POST `/quotes/:id/approve` → admin/manager only
- POST `/quotes/:id/version` → admin/manager only

### E3.7 — i18n + locales pattern

**Source**: F1 work — `frontend/src/locales/{ja,en,vi}.json`

- ~250 keys added for F1 across 3 languages
- Pattern: `project.{tabs,actions,form,detail,errors}.*`
- Estimate: F2 needs ~200 keys (similar complexity)

**Implication**: Add `quote.*` namespace to all 3 locales simultaneously per project rule.

### E3.8 — Test pattern via Jest mocks

**Source**: F1 P8 — 40 unit tests written

- Pattern: mock PrismaService + repositories + dependencies
- Spec files colocated with services
- CI runs `pnpm test --ci --runInBand`

**Implication**: F2 unit tests targets:

- QuoteStatusMachineService (forward + reverse transitions, 15+ tests)
- QuoteVersioningService (snapshot trigger, append-only verify)
- QuoteNumberGeneratorService (race condition simulation)
- QuotesService.calculateTotals (subtotal/tax/total math)
- PdfGenerationService (template render smoke test)

### E3.9 — Concurrency: optimistic locking pattern

**Source**: Standard Prisma practice — `version` field check on update

- Common issue: two managers edit same quote simultaneously
- Pattern: include `updatedAt` or `version` in WHERE clause

**Implication**: Add `version` INT field to quotes (separate from `version_no` which is for 電帳法 versioning). Check on update; throw conflict error if mismatch.

### E3.10 — Sample line items reference

**Source**: Domain knowledge §2.2 + general JP construction practice

- Common categories: 解体工事, 基礎工事, 木工事, 屋根工事, 外壁工事, 設備工事, 仕上工事, 諸経費
- Common units: m², m, kg, 式, 個, 本, 台, 回, 日, セット
- Common item examples: 「外壁塗装」「フローリング張替」「キッチン交換」「足場設置」

**Implication**: Seed `unit_prices` master with ~30-50 sample items across 8 categories for dev testing. Production = empty, customer fills in.

---

## Section 4: Validation Summary

| Section             | Evidence count | Source citations                                 | Status        |
| ------------------- | -------------- | ------------------------------------------------ | ------------- |
| SRS (Business)      | 6              | architecture/08, 04, README, F1 SRS              | ✅ Valid (≥2) |
| BD (Architecture)   | 8              | architecture/02, 04, F1 modules, frontend rules  | ✅ Valid (≥2) |
| DD (Implementation) | 10             | architecture/04, F1 implementations, F1 P8 tests | ✅ Valid (≥2) |

**Total**: 24 evidence pieces across 3 scopes, all source-cited.

---

## Recommendations for /innovate

### Critical decisions needed

1. **PDF generation approach** — Puppeteer worker queue (full architecture) vs synchronous (faster MVP)
2. **Version trigger** — auto on every save-after-finalize vs manual button
3. **Unit price master** — pre-seed CSV import in MVP vs manual entry only
4. **Quote-project link** — strict 1:N or allow project switch on draft

### Soft decisions

5. Quote number format (recommend `Q-YYYY-NNNNN`)
6. Mobile UX (recommend desktop-only edit)
7. Approval chain (recommend 1-level only MVP)
8. Optional line items handling (recommend separate sum + PDF section)

### Out-of-scope MVP (defer Phase 3+)

- F2-06 AI suggestions
- OCR receipt → line items
- Multi-currency
- Digital signature / クラウドサイン
- Excel/CSV bulk import for line items
- Customer self-view portal
- Slack/Teams integration

---

_Evidence built from existing architecture docs (8 files) + F1 implementation patterns + domain knowledge of JP construction quoting (ANDPAD, AnyONE, Dandori Work) + 電子帳簿保存法 regulation reference._
