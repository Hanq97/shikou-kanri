# Basic Design — F2 見積管理

**Feature ID**: F2-QUOTE
**Version**: BASE (Phase 1 MVP)
**Date**: 2026-05-17
**Status**: Approved
**References**: SRS (F2-QUOTE-BASE-srs.md), innovate-technical-selection.md

---

## 1. Tổng quan

### 1.1 Mục đích
Document thiết kế cấp module cho F2 — define module structure, ERD, sequence diagrams, state machine, integration points, compliance mapping.

### 1.2 Sub-features mapping (F2-01..05)
| Sub-ID | Mô tả | Components chính |
|---|---|---|
| F2-01 | Quote CRUD | QuotesService, QuoteRepository, QuotesController |
| F2-02 | Line items + 単価マスタ | QuoteLine* + UnitPrice* (service/repo/controller) |
| F2-03 | Approval workflow (2-tier) | QuoteStatusMachineService |
| F2-04 | PDF generation | QuotePdfService + Handlebars template + Puppeteer |
| F2-05 | 電帳法 versioning | QuoteVersioningService + quote_versions table |

---

## 2. Module Structure

```
backend/src/modules/quote/
├── quote.module.ts                        # NestJS module wire
├── controllers/
│   ├── quotes.controller.ts               # 15 endpoints
│   └── unit-prices.controller.ts          # 4 endpoints (admin master)
├── services/
│   ├── quotes.service.ts                  # Main CRUD + permission + clone
│   ├── quote-status-machine.service.ts    # Transition table + tier routing
│   ├── quote-versioning.service.ts        # Snapshot trigger (append-only)
│   ├── quote-pdf.service.ts               # Handlebars + Puppeteer
│   ├── quote-number-generator.service.ts  # YYYY-NNNNN sequence
│   ├── unit-prices.service.ts             # Master CRUD
│   └── *.spec.ts                          # ~50 unit tests
├── repositories/
│   ├── quote.repository.ts                # Prisma quote CRUD + list
│   ├── quote-line.repository.ts           # Lines CRUD (cascade)
│   ├── quote-version.repository.ts        # Append-only insert
│   └── unit-price.repository.ts           # Master CRUD
├── dto/
│   ├── create-quote.dto.ts
│   ├── update-quote.dto.ts
│   ├── list-quotes-query.dto.ts
│   ├── quote-line.dto.ts
│   ├── approve.dto.ts
│   ├── reject.dto.ts
│   ├── clone-quote.dto.ts
│   ├── create-version.dto.ts
│   └── unit-price.dto.ts (create/update/list)
├── domain/
│   ├── types.ts                           # Domain types (QuoteStatusName, etc.)
│   ├── status-transitions.ts              # VALID_TRANSITIONS table
│   ├── constants.ts                       # APPROVAL_TIER2_THRESHOLD_JPY
│   └── quote-events.ts                    # Event names + payload types
├── internal/
│   ├── quote-calculator.ts                # subtotal/tax/total math
│   └── quote-snapshot-builder.ts          # JSONB snapshot prep
├── templates/
│   └── quote-pdf.hbs                      # Handlebars template
└── utils/
    └── jpy-format.ts                      # JPY rounding helpers
```

### 2.1 Dependencies (Module imports)
```
QuoteModule
  ├── imports: AuthModule (UserRepo, AuditStub, Guards)
  ├── imports: CustomerModule (CustomersService for counter_party snapshot)
  └── NO import ProjectModule (avoid circular dep)
       └── cross-ref via PrismaService direct query
       └── emit events for ProjectModule to listen
```

### 2.2 New shared modules needed
- ❌ KHÔNG new (reuse existing)
- ✅ `shared/database/prisma.service.ts` (existing)
- ✅ `shared/exceptions/` (extend với quote-errors.ts)
- ✅ AuditStubService (extend với ~12 quote methods)

### 2.3 New dependencies (npm packages)
| Package | Version | Purpose | Size impact |
|---|---|---|---|
| `puppeteer` | ^23.x | PDF generation | +250MB (Chromium) |
| `handlebars` | ^4.x | HTML template engine | +50KB |

---

## 3. Module Wiring

### 3.1 QuoteModule (new)
```typescript
@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [QuotesController, UnitPricesController],
  providers: [
    QuotesService,
    QuoteStatusMachineService,
    QuoteVersioningService,
    QuotePdfService,
    QuoteNumberGeneratorService,
    UnitPricesService,
    QuoteRepository,
    QuoteLineRepository,
    QuoteVersionRepository,
    UnitPriceRepository,
  ],
  exports: [
    QuotesService,        // for future cross-module use
    QuoteRepository,      // for read-only access from project tab
  ],
})
export class QuoteModule {}
```

### 3.2 AppModule update (existing)
```typescript
import { QuoteModule } from './modules/quote/quote.module';

@Module({
  imports: [
    // ... existing ...
    AuthModule,
    CustomerModule,
    ProjectModule,
    QuoteModule,  // <-- new
  ],
})
export class AppModule {}
```

### 3.3 AuditStubService extension
Add ~12 methods following existing pattern (logProjectCreated, etc.):
- `logQuoteCreated(quoteId, actorId, ctx, tx?)`
- `logQuoteUpdated(quoteId, changedFields, actorId, ctx, tx?)`
- `logQuoteSubmitted(quoteId, tier, actorId, ctx, tx?)`
- `logQuoteApproved(quoteId, tier, actorId, ctx, tx?)`
- `logQuoteRejected(quoteId, reason, actorId, ctx, tx?)`
- `logQuoteSent(quoteId, actorId, ctx, tx?)`
- `logQuoteWon(quoteId, projectId, amountTotal, actorId, ctx, tx?)`
- `logQuoteLost(quoteId, actorId, ctx, tx?)`
- `logQuoteDeleted(quoteId, reason, actorId, ctx, tx?)`
- `logQuoteVersionCreated(quoteId, versionNo, changeType, actorId, ctx, tx?)`
- `logQuotePdfDownloaded(quoteId, actorId, ctx)` (no tx — outside transaction)
- `logQuoteCloned(newQuoteId, sourceQuoteId, actorId, ctx, tx?)`

---

## 4. Database Design (ERD)

### 4.1 New tables

```
┌─────────────────────────────────┐
│ quotes (main)                   │
│─────────────────────────────────│
│ PK id (UUID)                    │
│ UQ quote_number VARCHAR(30)     │
│ FK project_id → projects        │
│ version_no INT (電帳法 version)  │
│ version INT (optimistic lock)   │
│ status QuoteStatus              │
│ issued_at DATE  [idx DESC]      │
│ valid_until DATE                │
│ counter_party_name VARCHAR(200) │
│   [idx GIN bigm]                │
│ amount_subtotal DEC(15,0)       │
│ amount_tax DEC(15,0)            │
│ amount_total DEC(15,0) [idx]    │
│ notes TEXT                      │
│ approved_by → users             │
│ approved_at TIMESTAMP           │
│ sent_at TIMESTAMP               │
│ qualified_invoice_number        │
│ created_at/updated_at/deleted_at│
│ created_by, updated_by → users  │
└─────────────────────────────────┘
        │ 1
        │
        │ N
        ▼
┌────────────────────────────────────┐
│ quote_lines                        │
│────────────────────────────────────│
│ PK id (UUID)                       │
│ FK quote_id → quotes (CASCADE)     │
│ sort_order INT                     │
│ category VARCHAR(50)               │
│ item_name VARCHAR(200)             │
│ description TEXT                   │
│ unit VARCHAR(20)                   │
│ quantity DEC(15,2)                 │
│ unit_price DEC(15,0)               │
│ amount DEC(15,0)                   │
│ tax_rate DEC(5,2) default 0.10     │
│ is_optional BOOLEAN                │
│ FK unit_price_master_id (SETNULL)  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ quote_versions (append-only)       │
│────────────────────────────────────│
│ PK id (UUID)                       │
│ FK quote_id → quotes (RESTRICT)    │
│ version_no INT                     │
│ change_type QuoteChangeType        │
│ change_reason TEXT NOT NULL        │
│ snapshot JSONB (full quote+lines)  │
│ changed_by → users                 │
│ changed_at TIMESTAMP default NOW   │
│ [idx quote_id+changed_at DESC]     │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ unit_prices (master)               │
│────────────────────────────────────│
│ PK id (UUID)                       │
│ UQ code VARCHAR(30)                │
│ category VARCHAR(50)               │
│ item_name VARCHAR(200)             │
│ description TEXT                   │
│ unit VARCHAR(20)                   │
│ default_unit_price DEC(15,0)       │
│ supplier_name VARCHAR(200)         │
│ is_active BOOLEAN default true     │
│ [idx category+is_active]           │
│ created/updated/deleted_at         │
│ created_by, updated_by             │
└────────────────────────────────────┘
        ▲ N
        │
        │ 1 (SET NULL on master delete)
        │
[quote_lines.unit_price_master_id]
```

### 4.2 Foreign Key Strategy
| FK | On Delete | Reason |
|---|---|---|
| `quote_lines.quote_id` | CASCADE | Lines belong to quote (architecture/04 §3.61) |
| `quotes.project_id` | RESTRICT | Cannot delete project with quotes |
| `quotes.approved_by` | SET NULL | User soft-delete shouldn't lose audit history |
| `quote_lines.unit_price_master_id` | SET NULL | Master delete preserves snapshot prices |
| `quote_versions.quote_id` | RESTRICT | Versions preserve audit trail (even if quote soft-deleted, versions remain) |

### 4.3 Enums
```sql
CREATE TYPE "QuoteStatus" AS ENUM (
  'draft', 'submitted', 'pending_admin', 'approved',
  'rejected', 'sent', 'won', 'lost'
);

CREATE TYPE "QuoteChangeType" AS ENUM (
  'correction', 'deletion', 'status_change'
);
```

### 4.4 Indexes
```sql
-- B-tree indexes (Prisma DDL)
CREATE INDEX idx_quotes_project_id ON quotes (project_id);
CREATE INDEX idx_quotes_issued_at ON quotes (issued_at DESC);
CREATE INDEX idx_quotes_amount_total ON quotes (amount_total);
CREATE INDEX idx_quotes_status ON quotes (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_quote_lines_quote_id_sort ON quote_lines (quote_id, sort_order);
CREATE INDEX idx_quote_versions_quote_id_changed_at ON quote_versions (quote_id, changed_at DESC);
CREATE INDEX idx_unit_prices_category_active ON unit_prices (category, is_active);

-- GIN bigm (Raw SQL migration for 電帳法 counter_party search)
CREATE EXTENSION IF NOT EXISTS pg_bigm;
CREATE INDEX idx_quotes_counter_party_bigm
  ON quotes USING gin (counter_party_name gin_bigm_ops)
  WHERE deleted_at IS NULL;

-- Sequences (per year, raw SQL)
CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2027 START 1;
```

### 4.5 Migrations split
**Migration 1**: `20260517_120000_add_quote_tables/`
- Prisma-generated DDL for 4 tables + 2 enums + FKs + B-tree indexes

**Migration 2**: `20260517_120500_add_quote_fts_and_sequences/`
- Raw SQL: pg_bigm extension + GIN bigm index + sequences for 2026/2027

---

## 5. State Machine

### 5.1 Quote Status Transitions (Diagram)

```
                         ┌──────────────┐
                         │   draft      │ ◄────────┐
                         └──────┬───────┘          │
                                │ submit            │
                                ▼                   │
                       ┌────────────────┐           │ submit
                       │  submitted     │           │ (after revision)
                       └─┬──────────┬───┘           │
                         │ approve  │ approve       │
              (≤¥10M)    │          │   (any tier)  │
                         ▼          ▼               │
                  ┌──────────┐  ┌──────────┐  ┌─────┴─────┐
                  │ approved │  │pending_  │  │ rejected  │
                  │          │  │  admin   │  │           │
                  └──┬───┬───┘  └─────┬────┘  └─────▲─────┘
                     │   │             │             │
                send │   │ reject     ▼ approve(admin) │
                     │   ▼      (back to ─►  approved) │
                     │ rejected                        │
                     ▼   ▲ reject                      │
                  ┌─────┴──────┐                      │
                  │   sent     │                       │
                  └──┬─────┬───┘                       │
              won   │     │ lost                       │
                    ▼     ▼                            │
              ┌─────────┐ ┌─────────┐                  │
              │  won    │ │  lost   │ (terminal)       │
              │(terminal)│ │         │                  │
              └─────────┘ └─────────┘                  │
                                                       │
                  (Create v2 from sent ────────────────┘
                   creates NEW draft)
```

### 5.2 Transition Permission Matrix

| Transition | admin | manager | employee (own) |
|---|---|---|---|
| draft → submitted | ✓ | ✓ | ✓ |
| submitted → approved (≤¥10M) | ✓ | ✓ | ❌ |
| submitted → pending_admin (>¥10M) | (auto-route) | (auto-route) | (auto-route) |
| pending_admin → approved | ✓ | ❌ | ❌ |
| submitted/pending_admin → rejected | ✓ | ✓ | ❌ |
| approved → sent | ✓ | ✓ | ✓ |
| approved → rejected (recall) | ✓ | ✓ | ❌ |
| sent → won/lost | ✓ | ✓ | ✓ |
| rejected → submitted | ✓ | ✓ | ✓ (own) |

### 5.3 Side Effects per Transition
| Transition | Side Effects |
|---|---|
| draft → submitted | record `submitted_at` (computed from audit, not column) |
| submitted → approved/pending_admin | check threshold, route accordingly |
| pending_admin → approved | record `approved_by`, `approved_at` |
| → approved | also record `approved_by`/`approved_at` |
| → sent | record `sent_at` |
| → won | emit `quote.won` event with `{ projectId, amountTotal }` |
| any transition | snapshot via QuoteVersioningService (change_type='status_change') |

---

## 6. Sequence Diagrams

### 6.1 Quote Creation Flow
```
[FE: QuoteFormPage]
       │
       │ POST /quotes
       ▼
[QuotesController.create]
       │
       │ inject CurrentUser, RequestContext
       ▼
[QuotesService.create]
       │
       │ 1. Permission check (not invited)
       │ 2. CustomersService.findById(customerId) for counter_party snapshot
       │ 3. prisma.$transaction:
       │    │
       │    ├── QuoteNumberGeneratorService.next(year) → "Q-2026-00001"
       │    ├── QuoteRepository.create({ ...input, counterPartySnapshot })
       │    ├── QuoteLineRepository.createMany([...lines])
       │    ├── QuoteCalculator.computeTotals(lines) → subtotal/tax/total
       │    ├── QuoteRepository.update(id, computedTotals)
       │    ├── AuditStubService.logQuoteCreated(...)
       │    └── EventEmitter.emit('quote.created', { ... })
       │
       │ return Quote DTO
       ▼
[Response 201 { quote }]
```

### 6.2 Approval Flow (≤¥10M)
```
[Manager clicks "承認"]
       │
       │ POST /quotes/:id/approve
       ▼
[QuotesController.approve]
       │
       │ @Roles('manager','admin')
       ▼
[QuoteStatusMachineService.approve(id, requester)]
       │
       │ 1. Find quote → check status='submitted'
       │ 2. Check amount_total <= 10M → manager OK
       │ 3. prisma.$transaction:
       │    │
       │    ├── repo.update(id, { status:'approved', approved_by, approved_at, version+1 })
       │    ├── QuoteVersioningService.snapshot(id, 'status_change', null)
       │    ├── audit.logQuoteApproved(id, tier=1, requester)
       │    └── events.emit('quote.approved', { id, tier:1 })
       │
       ▼
[Response 200 { quote }]
```

### 6.3 Approval Flow (>¥10M with tier 2)
```
[Submit a >¥10M quote]
       │
       │ POST /quotes/:id/submit
       ▼
[QuoteStatusMachineService.submit]
       │
       │ check amount_total > 10M → route to pending_admin
       │ status → 'pending_admin'
       │ emit 'quote.submitted' with tier=2
       │
       ▼
[Notify admins (Phase 2 email)]
       │
[Admin clicks "承認"]
       │
       │ POST /quotes/:id/approve
       ▼
[QuoteStatusMachineService.approve]
       │
       │ 1. Find quote → status='pending_admin'
       │ 2. role check: ONLY admin allowed at this tier
       │ 3. transition → 'approved'
       ▼
[Response 200 { quote }]
```

### 6.4 PDF Generation Flow
```
[FE: click "PDFダウンロード"]
       │
       │ GET /quotes/:id/pdf
       ▼
[QuotesController.pdf]
       │
       │ inject Response object
       ▼
[QuotePdfService.generate(id, requester, res)]
       │
       │ 1. Permission check (read access)
       │ 2. QuoteRepository.findByIdWithRelations(id) → quote + lines
       │ 3. Group lines by is_optional (required/optional sections)
       │ 4. Handlebars compile template with quote data
       │ 5. Puppeteer launch headless Chromium
       │ 6. page.setContent(html, { waitUntil: 'networkidle0' })
       │ 7. page.pdf({ format:'A4', printBackground:true, margin:... })
       │ 8. await browser.close()
       │ 9. set headers: Content-Type, Content-Disposition
       │ 10. res.send(buffer)
       │ 11. audit.logQuotePdfDownloaded(id, requester) (outside transaction)
       │
       ▼
[Browser downloads PDF]
```

### 6.5 Versioning Flow (correction after approved)
```
[Manager edits approved quote]
       │
       │ PUT /quotes/:id with change_reason
       ▼
[QuotesService.update]
       │
       │ 1. Find quote → status='approved'
       │ 2. Check optimistic lock (version)
       │ 3. prisma.$transaction:
       │    │
       │    ├── repo.update(id, { ...input, version+1 })
       │    ├── QuoteLineRepository.replaceLines(quoteId, newLines) [cascade rebuild]
       │    ├── QuoteCalculator.computeTotals → re-compute
       │    ├── QuoteVersioningService.snapshot(id, 'correction', change_reason)
       │    │   ├── Build full snapshot (quote + lines)
       │    │   └── INSERT INTO quote_versions (append-only)
       │    ├── audit.logQuoteUpdated(...)
       │    └── audit.logQuoteVersionCreated(versionNo, 'correction')
       │
       ▼
[Response 200 { quote, newVersionNo }]
```

### 6.6 Won → Project Transition Prompt Flow
```
[Sales clicks "受注 (Won)"]
       │
       │ POST /quotes/:id/won
       ▼
[QuoteStatusMachineService.won(id)]
       │
       │ status → 'won', emit 'quote.won' event
       ▼
[Response 200 with project context]
       │
       ▼
[FE shows modal "案件を「受注」へ変更?"]
       │
       │ User confirm
       │ POST /projects/:projectId/status
       │   body: { status:'received', amountTotal: quote.amount_total }
       ▼
[ProjectStatusMachineService.transition]
       │
       │ project status quoting → received
       ▼
[Response 200 { project }]
```

---

## 7. Module Dependencies (cross-module)

### 7.1 Quote → Customer (direct service call)
- `QuotesService.create` calls `CustomersService.findById(customerId)` to snapshot `counter_party_name`
- Imports: `CustomerModule` exported `CustomersService`

### 7.2 Quote → Project (no direct import, via Prisma)
- Need to validate `projectId` exists + read project info
- Use PrismaService direct query (`prisma.project.findFirst`)
- Avoid circular dep since ProjectModule may listen to quote events

### 7.3 Project ← Quote (event-driven, future)
- ProjectModule subscribes to `quote.won` event
- Phase 1: FE handles prompt (no BE listener)
- Phase 2: BE auto-suggest project transition (notification)

### 7.4 Quote → Audit (direct call, sync)
- `QuotesService.*` calls `AuditStubService.logQuote*` in same transaction
- Reused from AuthModule export

### 7.5 Diagram
```
                    ┌──────────────┐
                    │   Quote      │
                    │   Module     │
                    └──┬───┬───────┘
                       │   │
              imports  │   │ events emit
                       │   │
              ┌────────▼─┐ │ ┌───────────────┐
              │ Auth     │ │ │ Project       │
              │ Module   │ │ │ Module        │
              │ - User   │ │ │ - listens     │
              │ - Audit  │ │ │   quote.*     │
              │ - Guards │ │ │   (Phase 2)   │
              └──────────┘ │ └───────────────┘
                           │
              ┌────────────▼┐
              │ Customer    │
              │ Module      │
              │ - find by id│
              └─────────────┘
```

---

## 8. Compliance Mapping

### 8.1 電子帳簿保存法 (E-bookkeeping Law)
| Requirement | Implementation | DB element |
|---|---|---|
| 真実性 (authenticity) | Append-only versioning + audit_logs | `quote_versions` no UPDATE/DELETE |
| 可視性 (visibility) | PDF generation + screen render | `QuotePdfService` + `QuoteDetailPage` |
| 検索性 (3 keys) | 3 dedicated indexes | `idx_quotes_issued_at` + `_amount_total` + `_counter_party_bigm` |
| 保存期間 (10yr) | Retention policy via S3 lifecycle | architecture/04 § retention |

### 8.2 消費税法
| Requirement | Implementation |
|---|---|
| Tax 10%/8% per line | `quote_lines.tax_rate` DECIMAL(5,2) |
| Display subtotal + tax separately | PDF template + screen showing both |

### 8.3 適格請求書制度 (Qualified Invoice System)
| Requirement | Implementation |
|---|---|
| Optional 登録番号 | `quotes.qualified_invoice_number` VARCHAR(20) |
| Display on PDF | template includes field if set |

### 8.4 APPI (個人情報保護法)
| Requirement | Implementation |
|---|---|
| Audit trail on PII | `counter_party_name` snapshot at create (no follow customer rename) |
| Quote PDF audit | `logQuotePdfDownloaded(quoteId, requesterId, ctx)` per download |

---

## 9. Performance Considerations

### 9.1 Read patterns
- Quote list: paginated 20 per page → ~50ms with B-tree indexes
- Quote detail with lines: JOIN quote_lines → ~100ms (cascade fetch up to 500 lines)
- 電帳法 search: 3 specialized indexes → <50ms typical

### 9.2 Write patterns
- Quote create with lines: 1 transaction with multiple INSERTs (lines batched via createMany)
- Update: full lines replace (DELETE all + INSERT all) — simpler than delta
- Version snapshot: 1 INSERT with JSONB serialization (5-10KB) → ~20ms

### 9.3 PDF generation
- Puppeteer launch: ~500ms cold start, ~200ms warm
- HTML render: ~300ms typical
- PDF write: ~500ms typical
- **Total**: 1-2s for ≤50 lines, 5-10s for 200+ lines
- **Optimization**: keep Chromium browser instance warm (Phase 2)

### 9.4 Storage estimates (10-year)
- `quotes`: 75K rows × ~2KB = 150MB
- `quote_lines`: 7.5M rows × ~500B = 3.75GB
- `quote_versions`: 225K rows × 10KB = 2.25GB
- `unit_prices`: ~2K rows × ~1KB = 2MB
- **Total**: ~6GB after 10 years — well within RDS

---

## 10. Security Architecture

### 10.1 Authentication
- Reuse F8 JWT cookie auth (HttpOnly + Secure + SameSite=Lax)
- All `/quotes/*` endpoints behind `JwtAuthGuard`

### 10.2 Authorization
- `RolesGuard` per endpoint (4-role matrix from FR-QT-013)
- Approval tier check inline in `QuoteStatusMachineService.approve()`
- Optimistic lock check in `QuoteRepository.update()`

### 10.3 Audit
- 100% audit coverage on state changes via AuditStubService
- PDF download logged (PII access)
- Failed permission attempts logged via global filter

### 10.4 Data sensitivity
- counter_party_name = PII (個人/法人 name)
- amount_total = financial data
- Both treated as sensitive — no caching, no client-side storage beyond session

---

## 11. Testing Strategy

### 11.1 Unit tests (Jest with mocked deps)
**Coverage targets**:
- QuoteStatusMachineService: 18 tests (transitions + tier routing + permission + invalid)
- QuoteCalculatorService: 6 tests (math + edge cases)
- QuoteVersioningService: 5 tests (trigger + append-only + reconstruct)
- QuoteNumberGeneratorService: 4 tests (sequence + race)
- QuotesService: 12 tests (CRUD + permission + clone + concurrent)
- QuotePdfService: 3 tests (template render + valid PDF + JP chars)
- UnitPricesService: 5 tests (CRUD + admin-only)
- **Total**: ~50 tests

### 11.2 Integration tests (deferred)
- Defer to Phase 9 (UAT prep) per architecture roadmap
- Test full workflows: create → submit → approve → send → won → project transition

### 11.3 E2E tests (deferred Phase 2+)
- Playwright happy path through quote lifecycle
- PDF generation verification (output file inspection)

### 11.4 Test data setup
- Seed 30-50 sample unit_prices
- Seed test users (admin/manager/employee already from F1)

---

## 12. Migration & Deployment

### 12.1 Migration order
1. Schema migration (Prisma DDL)
2. Raw SQL migration (extensions + GIN + sequences)
3. Seed unit_prices sample (idempotent)

### 12.2 Rollback
- Schema rollback: revert Prisma migrations (down direction)
- Versioning data: append-only → no rollback needed
- pg_bigm extension: leave installed (no harm)

### 12.3 Docker image
- Puppeteer brings Chromium → +250MB
- Multi-stage build: install in `deps` stage, only Chromium binary in `runtime`
- `.dockerignore` excludes test files + dev deps

### 12.4 CI updates
- Add `npm install puppeteer` (uses cached Chromium download)
- Run new unit tests (~50)
- Update test command: same `pnpm test --ci --runInBand`

---

## 13. Risk Register (BD-level)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| pg_bigm not available on Postgres | Low | High | Verify in dev compose; fallback to pg_trgm if missing |
| Puppeteer fails on Linux container | Medium | High | Test in CI early; use puppeteer recommended Docker image base |
| Quote concurrent edit causing data loss | Medium | High | Optimistic locking (FR-QT-015) + integration test |
| Version snapshot table grows unbounded | Low | Medium | Lifecycle policy to S3 after 3 years |
| Tier 2 approval threshold becomes wrong | Low | Low | Document constant location for easy bump |
| PDF generation latency too high | Medium | Medium | Monitor metrics; defer to BullMQ worker if >10s avg |

---

## 14. Out of Scope (BD-level reconfirm)

- AI suggestion module (F2-06 Phase 3)
- Async PDF queue (BullMQ) — Phase 2
- Quote template library — Phase 2
- Multi-tier approval (>2) — Future
- Configurable threshold via env — Phase 2
- Customer self-view portal — Future
- Excel/CSV import line items — Phase 2

---

*Basic Design — F2 見積管理 v1.0 — Module structure, ERD, state machine, sequences, integration*
