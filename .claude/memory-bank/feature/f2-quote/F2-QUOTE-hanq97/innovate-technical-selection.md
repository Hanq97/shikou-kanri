# Technical Selection (BD+DD) — F2 見積管理

**Feature**: F2-QUOTE
**Phase**: Phase 1 MVP
**Generated**: 2026-05-17
**Mode**: full (new feature)
**State**: INNOVATE_TECHNICAL (after this save)

---

## Architecture Decisions (BD)

### AD1 — Module Structure

**Choice**: `backend/src/modules/quote/{controllers,services,repositories,dto,domain,utils,internal,templates}`

- Followed F1 (customer, project) pattern
- `internal/` chứa helpers: `QuoteCalculator`, `QuoteVersionSnapshotter`
- `templates/` chứa Handlebars PDF templates

**Rationale**: Consistency với F1, dev không phải học pattern mới.

### AD2 — Module Dependencies (no circular)

**Choice**:

- `QuoteModule imports AuthModule` (UserRepository, AuditStubService, Guards)
- `QuoteModule imports CustomerModule` (CustomersService.findById for counter_party snapshot)
- ❌ KHÔNG import ProjectModule
- Cross-reference project via PrismaService direct query (F1 pattern)
- ProjectModule listens to `quote.*` events via EventEmitter2

**Rationale**: Avoid circular dep. Project listens but doesn't directly call quote service.

### AD3 — Status Machine Pattern

**Choice**: Hard-coded transition table, service-based (giống F1 ProjectStatusMachineService)

```typescript
VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'pending_admin', 'rejected'],
  pending_admin: ['approved', 'rejected'],
  approved: ['sent', 'rejected'],
  sent: ['won', 'lost'],
  won: [], // terminal
  lost: [], // terminal
  rejected: ['submitted'], // can resubmit after revision
};
```

**Trade-off**: Schema change needs code update — acceptable for MVP. Config-driven defer until needed.

### AD4 — PDF Template Architecture

**Choice**: Handlebars HTML template + Puppeteer headless Chromium (sync, in-process)

- Templates: `backend/src/modules/quote/templates/quote-pdf.hbs`
- Inline CSS (security: no external requests from Puppeteer)
- JP fonts: bundle "Noto Sans JP" subset as base64 inline (~200KB)
- Service: `QuotePdfService.generate(quoteId, requester): Promise<Buffer>`
- Streaming response from controller, no S3 storage in MVP

**Trade-off**: Image +250MB. Acceptable; multi-stage Docker build excludes from runtime layer.

### AD5 — Versioning Storage

**Choice**: Full JSONB snapshot (per architecture/04 §7.1)

- `QuoteVersioningService.snapshot(quoteId, changeType, reason, tx?)`
- Triggers (called from inside transaction):
  - `QuotesService.update()` AFTER `status='approved'`
  - `QuotesService.softDelete()` with `change_type='deletion'`
  - `QuoteStatusMachineService.transition()` with `change_type='status_change'`
- Snapshot includes: quote main row + ALL quote_lines
- Storage estimate: 5-10KB × 22.5K rows/year ≈ 225MB/year — OK

**Rationale**: Append-only + full snapshot = simplest 電帳法 compliance. Reconstruction always possible.

### AD6 — 2-Tier Approval Routing

**Choice**: Service-level dynamic routing, no separate DB state per tier

- 1 submit endpoint `POST /quotes/:id/submit` → service routes to `approved` (manager-only allowed) OR `pending_admin` (needs admin) based on `amount_total > 10_000_000`
- 1 approve endpoint `POST /quotes/:id/approve` → role check + tier validation
- Status enum has `pending_admin` value
- Constant: `APPROVAL_TIER2_THRESHOLD_JPY = 10_000_000` exported from `quote/domain/constants.ts`

**Rationale**: Simpler than separate tier columns. Threshold one place to bump.

### AD7 — Audit Integration

**Choice**: Extend `AuditStubService` với 12 quote methods (similar to F1 14 project methods)

```
logQuoteCreated, logQuoteUpdated, logQuoteSubmitted,
logQuoteApproved, logQuoteRejected, logQuoteSent,
logQuoteWon, logQuoteLost, logQuoteDeleted,
logQuoteVersionCreated, logQuotePdfDownloaded, logQuoteCloned
```

**Note**: Action names use dot-separated (`quote.created`, `quote.version.created`).

### AD8 — Event Emission

**Choice**: EventEmitter2 sync events (giống F1)

- Emit: `quote.{created,submitted,approved,rejected,sent,won,lost,deleted}` + `quote.version.created`
- Phase 1: no consumers (just audit + future hooks)
- Phase 2: ProjectsService có thể listen `quote.won` → auto-suggest project status transition

---

## Implementation Decisions (DD)

### ID1 — DB Schema

**Tables**: `quotes`, `quote_lines`, `unit_prices`, `quote_versions`
**Enums**: `QuoteStatus` (8 values), `QuoteChangeType` (3 values)
**Indexes**:

- B-tree: `quotes.projectId`, `quotes.issuedAt DESC`, `quotes.amountTotal`, `quote_lines.quoteId+sortOrder`, `quote_versions.quoteId+changedAt DESC`
- GIN bigm: `quotes.counterPartyName` (electronic bookkeeping search)
- Unique: `quotes.quoteNumber`, `unit_prices.code`

**FK strategy**:

- `quote_lines.quoteId` → CASCADE delete (per architecture line 61)
- `quotes.projectId` → RESTRICT (cannot delete project with quotes)
- `quotes.approvedBy` → SetNull (admin user delete won't cascade)
- `quote_lines.unitPriceMasterId` → SetNull (master delete preserves snapshot price)

### ID2 — Migration Files

1. `20260517_120000_add_quote_tables/migration.sql` — Prisma DDL for 4 tables + enums + FKs + B-tree indexes
2. `20260517_120500_add_quote_fts_and_sequences/migration.sql` — Raw SQL:
   - `CREATE EXTENSION IF NOT EXISTS pg_bigm`
   - `CREATE INDEX idx_quotes_counter_party_bigm ON quotes USING gin (counter_party_name gin_bigm_ops) WHERE deleted_at IS NULL`
   - `CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2026 START 1`
   - `CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2027 START 1`

### ID3 — API Endpoints (REST)

**Quote**:

- `GET /quotes` — list with filter (search/status/projectId/from/to/amount range), pagination
- `GET /quotes/:id` — detail + lines + computed totals
- `GET /quotes/:id/versions` — version history (append-only list)
- `GET /quotes/:id/pdf` — download PDF (sync stream, `Content-Type: application/pdf`)
- `POST /quotes` — create draft (with optional `cloneFromId` query)
- `PUT /quotes/:id` — update draft/rejected only; optimistic lock; throws 409 on conflict
- `DELETE /quotes/:id` — soft delete (admin only) + version snapshot
- `POST /quotes/:id/clone` — clone to new draft (separate from POST cloneFromId)
- `POST /quotes/:id/submit` — auto-route (employee → manager OR admin)
- `POST /quotes/:id/approve` — manager (≤¥10M) or admin (>¥10M)
- `POST /quotes/:id/reject` — body: `{ reason }` (≥5 chars), returns to editor
- `POST /quotes/:id/send` — approved → sent (records `sent_at`)
- `POST /quotes/:id/won` `POST /quotes/:id/lost` — final transitions
- `POST /quotes/:id/version` — create v2 from sent quote (per D7)

**Unit Prices**:

- `GET /unit-prices` — list with filter (search/category/active), pagination
- `POST /unit-prices` — admin only
- `PUT /unit-prices/:id` — admin only
- `DELETE /unit-prices/:id` — admin only (soft delete)

**Total**: ~18 endpoints

### ID4 — Frontend Component Architecture

**Pages** (under `frontend/src/features/quote/pages/`):

- `QuotesListPage` — table/Kanban-less list with status filter
- `QuoteFormPage` — create/edit with line items editor
- `QuoteDetailPage` — header + lines table + version history tab + actions
- `UnitPricesListPage` — admin master CRUD

**Components** (under `frontend/src/features/quote/components/`):

- `QuoteStatusTag` — status pill (8 colors)
- `QuoteLineEditor` — array editor using react-hook-form `useFieldArray`
- `QuoteLineRow` — desktop table row
- `QuoteLineCard` — mobile card (per AD/D6)
- `QuoteTotalsPanel` — sticky panel showing subtotal/tax/total
- `UnitPriceMasterPicker` — modal to select from master + add inline
- `ApprovalModal` — confirm + show recipient tier
- `RejectModal` — reason input (≥5 chars)
- `CloneQuoteModal` — confirm + optional rename
- `CreateVersionModal` — change_reason input
- `QuotePdfDownloadButton` — async loading state
- `QuoteListTab` — gắn vào ProjectDetailPage (giống PropertyListTab)

**Routes**:

- `/quotes` — list
- `/quotes/new?projectId=X` — create
- `/quotes/:id` — detail
- `/quotes/:id/edit` — edit
- `/admin/unit-prices` — master (admin only)

### ID5 — Mobile Responsive Line Item Edit

**Pattern**:

- Desktop (`≥sm`): Antd `<Table>` with inline edit; columns = [sort, item_name, unit, qty, unit_price, amount (computed), is_optional, delete]
- Mobile (`<sm`): Card view per line; expand/collapse to edit fields; use Antd `<Collapse>` accordion
- Common data: `useFieldArray` from react-hook-form
- Subtotal recalc: debounced (300ms) on form value change

### ID6 — PDF Endpoint Streaming

- `GET /quotes/:id/pdf` returns binary stream
- Headers: `Content-Type: application/pdf`, `Content-Disposition: inline; filename="Q-2026-00001-v1.pdf"`
- FE button: `<a href={`/api/v1/quotes/${id}/pdf`} target="_blank">`
- Loading: Button shows spinner; revert when window navigation happens
- Generation time: ~1-3s for typical quote (≤50 lines); ~5-10s for large quote (200+ lines)

### ID7 — Optimistic Locking

**Implementation**:

```typescript
// Repository update
async update(id: string, version: number, data: ...) {
  const result = await prisma.quote.updateMany({
    where: { id, version, deletedAt: null },
    data: { ...data, version: { increment: 1 } },
  });
  if (result.count === 0) throw new QuoteConflictError();
}
```

- FE catch 409 → modal "他のユーザーが編集しました。再読み込みしますか?"
- Reload returns fresh data + version

### ID8 — Testing Strategy (Unit Tests)

**Spec files** (~50 tests total):

1. `QuoteStatusMachineService.spec.ts` — 18 tests
   - Forward transitions (8): draft→submitted, submitted→{approved, pending_admin, rejected}, pending_admin→{approved, rejected}, approved→{sent, rejected}, sent→{won, lost}
   - Tier routing (3): ≤¥10M routes to approved; >¥10M routes to pending_admin; admin can skip pending_admin
   - Permission (3): only manager/admin can approve at their tier; rejection needs reason ≥5 chars
   - Invalid transitions (4): draft→approved, won→sent, lost→won, sent→draft
2. `QuoteCalculatorService.spec.ts` — 6 tests
   - Subtotal sum (required only, exclude optional)
   - Tax rate per line, sum then round
   - Total = subtotal + tax
   - Mixed 10% + 8% rates
   - Negative line items (discount)
3. `QuoteVersioningService.spec.ts` — 5 tests
   - Snapshot on update after approved
   - Snapshot on softDelete
   - Snapshot on status change
   - Append-only verify (no UPDATE on table)
   - Reconstruct from snapshot
4. `QuoteNumberGeneratorService.spec.ts` — 4 tests
   - Format `Q-YYYY-NNNNN`
   - Sequence increment per year
   - Race-safe (mocked sequence advance)
   - New year sequence creation
5. `QuotesService.spec.ts` — 12 tests
   - CRUD permission per role
   - Clone preserves lines + resets status
   - Concurrent edit conflict (optimistic lock)
   - Counter_party snapshot at create (not follow customer rename)
6. `QuotePdfService.spec.ts` — 3 tests (smoke)
   - Template renders without error
   - PDF buffer is valid (starts with %PDF)
   - Includes Japanese characters
7. `UnitPricesService.spec.ts` — 5 tests
   - Admin-only CUD
   - Soft delete preserves quote line references

---

## Risk Register (technical)

| Risk                                          | Mitigation                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Puppeteer increases Docker image +250MB       | Multi-stage build, Chromium only in PDF worker layer; if performance issue, migrate to BullMQ worker phase 2 |
| Sync PDF blocks API for 5-10s on large quotes | Add `Connection: keep-alive` + frontend timeout 30s; consider async queue phase 2                            |
| Concurrent edit between manager + employee    | Optimistic lock + UX modal to reload                                                                         |
| `pg_bigm` extension not in standard Postgres  | Already used? Check Postgres image in docker-compose; install if needed                                      |
| Version snapshot size growth                  | Monitor; archive to S3 after 3 years                                                                         |
| 10M threshold becomes wrong                   | Document constant location; add changelog when changed                                                       |
| Hanko placeholder missing from PDF            | Just text placeholder "印鑑" in MVP; clear feedback to user that physical stamping required                  |

---

## Tech Stack additions (vs F1)

| Package                                       | Purpose              | Estimated impact           |
| --------------------------------------------- | -------------------- | -------------------------- |
| `puppeteer`                                   | PDF generation       | +250MB Docker, +5s install |
| `handlebars`                                  | HTML template engine | +50KB                      |
| Existing `csv-parse`, `csv-stringify` from F1 | Reused if needed     | —                          |

**No new shared modules needed**: reuse PrismaService, AuthModule, EventEmitter2, AuditStubService.

---

## Migration / Deployment

- Migrations 2 file (schema + raw SQL with extension)
- Seed: 30-50 unit_prices sample items for dev
- No data migration from F1 needed (quote table is new)

---

## State

- Previous: SRS_CREATED
- Current: INNOVATE_TECHNICAL (after save)
- Next: Auto-chain → generate SRS + BD + DD documents → BD_DD_CREATED → /plan

---

_16 decisions total (8 BD + 8 DD). Most followed F1 patterns for consistency. Key innovations: 2-tier approval routing, full mobile edit support, 電帳法 versioning with full JSONB snapshot._
