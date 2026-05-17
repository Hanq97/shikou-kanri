# Implementation Plan — F2 見積管理

**Feature**: F2-QUOTE
**Version**: BASE (Phase 1 MVP)
**Branch**: feature/f2-quote
**Generated**: 2026-05-17
**State**: BD_DD_CREATED → PLAN_CREATED (after this)
**Estimated effort**: 10-12 ngày dev (solo)
**References**: SRS, BD, FE DD, BE DD, API contracts

---

## 0. Phase Overview

| Phase  | Mô tả                                                                             | Effort | Deps | Deliverable                                     |
| ------ | --------------------------------------------------------------------------------- | ------ | ---- | ----------------------------------------------- |
| **P0** | Foundation: schema + migrations + deps + seed                                     | 0.5d   | —    | DB ready, Prisma client OK, sample unit_prices  |
| **P1** | Quote core BE: types/DTOs/repos/CRUD + QuoteCalculator                            | 1.5d   | P0   | Service CRUD working with totals math           |
| **P2** | Quote workflow BE: StatusMachine (2-tier) + Versioning + NumberGen                | 1.5d   | P1   | All status transitions + append-only versioning |
| **P3** | PDF + 単価マスタ BE + Controllers + module wiring                                 | 1.5d   | P2   | 19 endpoints live, PDF download working         |
| **P4** | Quote FE foundation: API client + Zod + locales + list + form (basic)             | 1.5d   | P3   | List/create draft working                       |
| **P5** | Quote FE line items editor (desktop + mobile) + totals + detail page              | 1.5d   | P4   | Full edit + view working                        |
| **P6** | Quote FE workflow modals (approve/reject/clone/v2) + PDF + ProjectTab integration | 1d     | P5   | All actions functional                          |
| **P7** | 単価マスタ admin FE + won → project prompt + mobile responsive polish             | 1d     | P6   | Master CRUD UI + integration complete           |
| **P8** | Unit tests (~50) + docs polish + commit prep                                      | 1d     | P7   | All tests pass, README updated                  |

**Critical path**: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 (sequential)

**Parallelization opportunity**: BE (P0-P3) + FE (P4-P7) can interleave if 2 devs; solo dev = sequential.

---

## P0: Foundation (0.5 ngày)

### T-P0-1: Prisma schema additions

**allowedFiles**:

- `backend/prisma/schema.prisma` (add Quote, QuoteLine, QuoteVersion, UnitPrice models + enums)

**Action**: Add per BE DD §3 (DB Schema):

- Models: `Quote`, `QuoteLine`, `QuoteVersion`, `UnitPrice`
- Enums: `QuoteStatus`, `QuoteChangeType`
- Relations: Quote → Project (RESTRICT), Quote → User (SetNull), QuoteLine → Quote (CASCADE), QuoteLine → UnitPrice (SetNull), QuoteVersion → Quote (RESTRICT)
- Indexes: per BE DD §4.4

**Acceptance**: `pnpm --filter backend prisma:generate` succeeds, types available

### T-P0-2: Migrations

**allowedFiles**:

- `backend/prisma/migrations/<timestamp>_add_quote_tables/migration.sql`
- `backend/prisma/migrations/<timestamp>_add_quote_fts_and_sequences/migration.sql`

**Action**:

1. Schema migration: `pnpm prisma migrate diff` → save SQL → manual apply via `prisma db execute` (F1 pattern, avoid interactive)
2. Raw SQL migration: `CREATE EXTENSION IF NOT EXISTS pg_bigm` + GIN index + sequences for 2026/2027

**Acceptance**: Migrations applied without error; `\dt` shows new tables; `\dx` shows pg_bigm

### T-P0-3: Install puppeteer + handlebars deps

**allowedFiles**:

- `backend/package.json`
- `pnpm-lock.yaml`

**Action**: `pnpm --filter backend add puppeteer handlebars`

**Acceptance**: `pnpm install --frozen-lockfile` passes; Chromium downloaded

### T-P0-4: Seed unit_prices sample data

**allowedFiles**:

- `backend/prisma/seed.ts` (add `seedF2` function + call)

**Action**: Add 30-50 sample items across 8 categories per BE DD §13.3

**Acceptance**: `pnpm prisma db seed` → "✓ F2 seeded N unit_prices"; `psql -c "SELECT COUNT(*) FROM unit_prices"` returns N

---

## P1: Quote Core BE (1.5 ngày)

### T-P1-1: Domain types + constants + status transitions

**allowedFiles**:

- `backend/src/modules/quote/domain/types.ts`
- `backend/src/modules/quote/domain/constants.ts`
- `backend/src/modules/quote/domain/status-transitions.ts`
- `backend/src/modules/quote/domain/quote-events.ts`

**Action**:

- `types.ts`: QuoteStatusName, QuoteChangeTypeName, QuoteDto, QuoteWithLines, ListQuotesFilter, etc.
- `constants.ts`: `APPROVAL_TIER2_THRESHOLD_JPY = 10_000_000`
- `status-transitions.ts`: `VALID_TRANSITIONS` table + `isValidTransition()` helper
- `quote-events.ts`: event name constants + payload types

**Acceptance**: TypeScript compiles, types exported from index.ts

### T-P1-2: DTOs (11 files)

**allowedFiles**:

- `backend/src/modules/quote/dto/{create-quote,update-quote,list-quotes-query,quote-line,approve,reject,clone-quote,create-version,unit-price,list-unit-prices-query,update-unit-price}.dto.ts`

**Action**: class-validator DTOs per BE DD § DTOs + API contracts

**Acceptance**: TypeScript compiles

### T-P1-3: Error classes

**allowedFiles**:

- `backend/src/shared/exceptions/quote-errors.ts`

**Action**: 13 error classes per BE DD §6:

- `QuoteNotFoundError`, `QuoteConflictError`, `QuoteInvalidStatusTransitionError`, `QuoteTier2RequiresAdminError`, `QuoteRejectReasonRequiredError`, `QuoteDeleteReasonRequiredError`, `QuoteLockedError`, `QuoteCanOnlyCreateVersionFromSentError`, `QuoteVersionReasonRequiredError`, `QuoteAnotherWonExistsError`, `UnitPriceNotFoundError`, `UnitPriceCodeExistsError`, `PdfGenerationFailedError`

**Acceptance**: All extend AppError với code/httpStatus/message

### T-P1-4: Repositories (4 files)

**allowedFiles**:

- `backend/src/modules/quote/repositories/{quote,quote-line,quote-version,unit-price}.repository.ts`

**Action**: Per BE DD §4:

- QuoteRepository: CRUD + list with filter + countWonByProject + optimistic lock update
- QuoteLineRepository: findByQuote + replaceLines + createMany
- QuoteVersionRepository: append-only (findByQuote + create + countByQuote, NO update/delete)
- UnitPriceRepository: CRUD + list + findByCode

**Acceptance**: Each repo has Tx parameter support; typecheck clean

### T-P1-5: QuoteCalculator (internal helper)

**allowedFiles**:

- `backend/src/modules/quote/internal/quote-calculator.ts`
- `backend/src/modules/quote/internal/quote-calculator.spec.ts`

**Action**: Per BE DD §5.5:

- `lineAmount(unitPrice, quantity)` — ROUND
- `computeQuoteTotals(lines)` — subtotal/tax/total/optionalSubtotal

**Acceptance**: 6+ unit tests cover edge cases (negative prices, optional, mixed tax rates, rounding)

### T-P1-6: QuotesService — CRUD + clone (no status transitions yet)

**allowedFiles**:

- `backend/src/modules/quote/services/quotes.service.ts`

**Action**: Per BE DD §5.1 — methods:

- `list(filter, requester)`, `findById(id, requester)`, `create(input)`, `update(id, input)`, `clone(sourceId, input)`, `softDelete(id, reason)`, `createVersionFromSent(sourceId, input)`

**Acceptance**: Service compiles, ready for tests in P2

---

## P2: Quote Workflow BE (1.5 ngày)

### T-P2-1: QuoteNumberGeneratorService

**allowedFiles**:

- `backend/src/modules/quote/services/quote-number-generator.service.ts`

**Action**: Per BE DD §5.4 — DB sequence per year, format `Q-YYYY-NNNNN`, race-safe via `CREATE SEQUENCE IF NOT EXISTS`

**Acceptance**: Inline test: call 3 times → Q-2026-00001, Q-2026-00002, Q-2026-00003

### T-P2-2: QuoteVersioningService (append-only)

**allowedFiles**:

- `backend/src/modules/quote/services/quote-versioning.service.ts`

**Action**: Per BE DD §5.3:

- `snapshot(quoteId, changeType, changeReason, changedById, tx)` — builds JSONB + insert
- `list(quoteId, requester)` — read versions

**Acceptance**: TypeScript compiles, snapshot stored in transaction

### T-P2-3: QuoteStatusMachineService (2-tier approval)

**allowedFiles**:

- `backend/src/modules/quote/services/quote-status-machine.service.ts`

**Action**: Per BE DD §5.2 + domain/status-transitions.ts:

- `submit(id, requester)` — auto-route per APPROVAL_TIER2_THRESHOLD
- `approve(id, requester)` — tier-aware permission check
- `reject(id, reason, requester)` — reason ≥5
- `send(id, requester)`
- `won(id, requester)` — check BR-QT-016 (admin override)
- `lost(id, requester)`
- All emit events + audit + snapshot version

**Acceptance**: TypeScript compiles, ready for tests P8

### T-P2-4: Wire QuotesService with new services

**allowedFiles**:

- `backend/src/modules/quote/services/quotes.service.ts` (update constructor)

**Action**: Inject QuoteCalculator, QuoteVersioningService, QuoteNumberGeneratorService

**Acceptance**: TypeScript compiles

---

## P3: PDF + Master + Controllers + Wiring (1.5 ngày)

### T-P3-1: QuotePdfService + Handlebars template

**allowedFiles**:

- `backend/src/modules/quote/services/quote-pdf.service.ts`
- `backend/src/modules/quote/templates/quote-pdf.hbs`
- `backend/src/modules/quote/utils/jpy-format.ts`

**Action**: Per BE DD §5.6 + FE DD §5.11:

- Handlebars template với:
  - Company header + logo placeholder
  - Quote meta info
  - Section A required lines (table với jpy formatter)
  - Section B optional lines (separate subtotal)
  - Notes
  - Footer với hanko area + DRAFT watermark if status='draft'
- Service: launch Puppeteer → setContent → pdf → buffer
- jpy-format helper: `formatJpy(n) => "¥X,XXX,XXX"`

**Acceptance**: Smoke test inline — generate PDF cho test quote → file ≥5KB, starts với `%PDF`

### T-P3-2: UnitPricesService

**allowedFiles**:

- `backend/src/modules/quote/services/unit-prices.service.ts`

**Action**: Per BE DD §5.7 — list/findById/create/update/softDelete với admin-only CUD

**Acceptance**: Service compiles

### T-P3-3: QuotesController (15 endpoints)

**allowedFiles**:

- `backend/src/modules/quote/controllers/quotes.controller.ts`

**Action**: Per API contracts §2:

- GET /quotes (list), GET /:id, GET /:id/versions, GET /:id/pdf
- POST /quotes (create), PUT /:id (update with version), DELETE /:id (admin)
- POST /:id/clone, /:id/submit, /:id/approve, /:id/reject, /:id/send, /:id/won, /:id/lost
- POST /:id/version (create v2 from sent)

**Acceptance**: All endpoints registered, RolesGuard applied per matrix

### T-P3-4: UnitPricesController

**allowedFiles**:

- `backend/src/modules/quote/controllers/unit-prices.controller.ts`

**Action**: Per API contracts §3 — GET (list), POST (admin), PUT/:id (admin), DELETE/:id (admin)

**Acceptance**: 4 endpoints registered

### T-P3-5: Extend AuditStubService

**allowedFiles**:

- `backend/src/modules/auth/internal/audit-stub.service.ts`

**Action**: Add ~12 quote audit methods per BE DD §3.3

**Acceptance**: TypeScript compiles, methods callable

### T-P3-6: QuoteModule wire + register in AppModule

**allowedFiles**:

- `backend/src/modules/quote/quote.module.ts`
- `backend/src/app.module.ts`

**Action**: Wire all providers per BE DD §3.1; register QuoteModule in AppModule imports

**Acceptance**: `pnpm --filter backend run build` passes; backend dev server starts without DI errors

### T-P3-7: Smoke test BE

**allowedFiles**: (none — testing via curl)

**Action**: Smoke test full flow:

1. Login as manager → get cookie
2. POST /quotes with sample line items → returns `Q-2026-00001`
3. POST /quotes/:id/submit → status='submitted'
4. POST /quotes/:id/approve → status='approved'
5. POST /quotes/:id/send → status='sent'
6. GET /quotes/:id/pdf → downloads PDF
7. POST /quotes/:id/won → status='won'

**Acceptance**: All 7 steps return 200/201, PDF file ≥5KB

---

## P4: Quote FE Foundation (1.5 ngày)

### T-P4-1: API client + types

**allowedFiles**:

- `frontend/src/shared/api/quotes.api.ts`
- `frontend/src/shared/api/unit-prices.api.ts`

**Action**: Per FE DD §7:

- quotesApi: list/get/getVersions/create/update/softDelete/clone/submit/approve/reject/send/won/lost/createVersion
- quotePdfApi.url(id)
- unitPricesApi: CRUD methods

**Acceptance**: TypeScript compiles, methods typed

### T-P4-2: Zod schemas

**allowedFiles**:

- `frontend/src/features/quote/schemas/{quote,quote-line,unit-price}.schema.ts`

**Action**: Per FE DD §4.2:

- QuoteSchema with superRefine (at least 1 required line)
- QuoteLineSchema with quantity != 0, unitPrice integer
- UnitPriceSchema with code/itemName/unit required

**Acceptance**: Schemas exported, integrate with react-hook-form

### T-P4-3: Locales (ja/en/vi)

**allowedFiles**:

- `frontend/src/locales/{ja,en,vi}.json` (add `quote.*` + `unitPrice.*` namespaces)

**Action**: Per FE DD §8 — ~200 keys × 3 langs:

- quote.{title, subtitle, empty, columns, status, changeType, tier, actions, form, detail, validation, errors, messages, confirms, tabs}
- unitPrice.{title, columns, form, etc.}

**Acceptance**: All 3 locale files valid JSON, keys consistent across langs

### T-P4-4: QuoteStatusTag component

**allowedFiles**:

- `frontend/src/features/quote/components/QuoteStatusTag.tsx`

**Action**: Per FE DD §5.1 — 8 colors

**Acceptance**: Renders all 8 statuses with correct colors

### T-P4-5: QuotesListPage + ResponsiveTable + Card view

**allowedFiles**:

- `frontend/src/features/quote/pages/QuotesListPage.tsx`

**Action**: Per FE DD §4.1:

- Header với Create button
- Filter bar (search + status + advanced)
- ResponsiveTable: table desktop, card mobile
- Pagination
- Row actions menu (edit/clone/delete)

**Acceptance**: `/quotes` loads list, filter works, navigate to detail works

### T-P4-6: QuoteFormPage shell (without lines editor)

**allowedFiles**:

- `frontend/src/features/quote/pages/QuoteFormPage.tsx`

**Action**: Per FE DD §4.2 (partial):

- Layout với back link
- Meta section: project selector, issuedAt, validUntil, qualifiedInvoiceNumber, notes
- Placeholder for line items editor (will add P5)
- Submit button → POST /quotes (without lines first, then PUT with lines in P5)

**Acceptance**: Can navigate to `/quotes/new?projectId=X`, fill meta, save draft (empty lines OK temporarily)

### T-P4-7: Add /quotes routes to app/routes.tsx

**allowedFiles**:

- `frontend/src/app/routes.tsx`

**Action**: Per FE DD §2:

- /quotes, /quotes/new, /quotes/:id, /quotes/:id/edit, /admin/unit-prices

**Acceptance**: Routes navigate, RoleGuard properly applied

---

## P5: Quote FE Line Editor + Detail (1.5 ngày)

### T-P5-1: QuoteLineEditor (useFieldArray + desktop/mobile)

**allowedFiles**:

- `frontend/src/features/quote/components/QuoteLineEditor.tsx`
- `frontend/src/features/quote/components/QuoteLineTableDesktop.tsx`
- `frontend/src/features/quote/components/QuoteLineCardMobile.tsx`

**Action**: Per FE DD §5.2-5.4:

- useFieldArray for `lines` array
- Conditional render: desktop table vs mobile card via Grid.useBreakpoint
- Inline edit columns: drag handle, item_name, unit, qty, unit_price, amount (computed), tax_rate, optional, delete
- Drag-drop reorder via @dnd-kit

**Acceptance**: Add/remove/reorder lines on both desktop + mobile; subtotal updates debounced

### T-P5-2: QuoteTotalsPanel

**allowedFiles**:

- `frontend/src/features/quote/components/QuoteTotalsPanel.tsx`

**Action**: Per FE DD §5.5 — sticky bottom panel with subtotal/tax/total + optional subtotal

**Acceptance**: Updates when line values change

### T-P5-3: UnitPriceMasterPickerModal

**allowedFiles**:

- `frontend/src/features/quote/components/UnitPriceMasterPickerModal.tsx`

**Action**: Per FE DD §5.6 — debounced search master + click to add as line

**Acceptance**: Open from "マスタから選択" button, select item → line appended with master defaults

### T-P5-4: Wire QuoteLineEditor into QuoteFormPage

**allowedFiles**:

- `frontend/src/features/quote/pages/QuoteFormPage.tsx` (update)

**Action**: Include `<QuoteLineEditor>` + `<QuoteTotalsPanel>`; update submit to include lines array

**Acceptance**: Full create flow works with lines; PUT update also works

### T-P5-5: QuoteDetailPage (overview + lines + versions tabs)

**allowedFiles**:

- `frontend/src/features/quote/pages/QuoteDetailPage.tsx`
- `frontend/src/features/quote/components/QuoteVersionsTab.tsx`

**Action**: Per FE DD §4.3:

- Header with quote_number + status tag + amount + action buttons (per role/status)
- Tabs: 概要 / 明細 / 版履歴
- Read-only line items table với 2 sections (required + optional)
- Version history list

**Acceptance**: All tabs render correctly; actions visible per role/status matrix

---

## P6: Quote FE Workflow + PDF + ProjectTab (1 ngày)

### T-P6-1: ApprovalModal + RejectModal

**allowedFiles**:

- `frontend/src/features/quote/components/ApprovalModal.tsx`
- `frontend/src/features/quote/components/RejectModal.tsx`

**Action**: Per FE DD §5.7-5.8 — confirm approve with tier display + reject reason input ≥5 chars

**Acceptance**: Wired to detail page action buttons; calls API + invalidates query

### T-P6-2: CloneQuoteModal + CreateVersionModal

**allowedFiles**:

- `frontend/src/features/quote/components/CloneQuoteModal.tsx`
- `frontend/src/features/quote/components/CreateVersionModal.tsx`

**Action**: Per FE DD §5.9-5.10:

- Clone: optional new name input
- CreateVersion: change_reason ≥5 chars input

**Acceptance**: Both call API + navigate to new quote on success

### T-P6-3: QuotePdfDownloadButton

**allowedFiles**:

- `frontend/src/features/quote/components/QuotePdfDownloadButton.tsx`

**Action**: Per FE DD §5.11 — Direct browser navigation (cookie auth) with loading indicator

**Acceptance**: PDF downloads correctly across all status (DRAFT watermark visible for draft)

### T-P6-4: QuoteListTab embedded in ProjectDetailPage

**allowedFiles**:

- `frontend/src/features/quote/components/QuoteListTab.tsx`
- `frontend/src/features/project/pages/ProjectDetailPage.tsx` (add tab)

**Action**: Per FE DD §4.5:

- New tab "見積" in ProjectDetailPage between "概要" and "メンバー" (or after フォルダ)
- Component lists quotes filtered by projectId
- "新規見積" link to `/quotes/new?projectId=X`

**Acceptance**: Tab shows quotes for current project; navigation works

### T-P6-5: Error mapper updates

**allowedFiles**:

- `frontend/src/shared/utils/error-mapper.ts` (add F2 codes)
- `frontend/src/locales/{ja,en,vi}.json` (add errorCodes.QUOTE\_\* entries)

**Action**: Add ~12 quote error codes to mapping table

**Acceptance**: 409 conflict shows "他のユーザーが編集しました..." instead of generic

---

## P7: 単価マスタ + Project Transition + Polish (1 ngày)

### T-P7-1: UnitPricesListPage (admin master CRUD)

**allowedFiles**:

- `frontend/src/features/quote/pages/UnitPricesListPage.tsx`
- `frontend/src/features/quote/components/UnitPriceFormModal.tsx`

**Action**: Per FE DD §4.4:

- ResponsiveTable list with filter (search + category + active)
- Add/Edit modal with form
- Delete confirm (soft delete)
- Admin-only RoleGuard

**Acceptance**: `/admin/unit-prices` works for admin; non-admin → 403 page

### T-P7-2: ProjectTransitionPromptModal (won → received)

**allowedFiles**:

- `frontend/src/features/quote/components/ProjectTransitionPromptModal.tsx`
- `frontend/src/features/quote/pages/QuoteDetailPage.tsx` (wire after won mutation)

**Action**: Per FE DD §5.12 — modal after POST /quotes/:id/won success; calls projectsApi.changeStatus on confirm

**Acceptance**: Won flow ends with project transitioning OR user skips → no state corruption

### T-P7-3: Nav + breadcrumb update

**allowedFiles**:

- `frontend/src/shared/components/layout/AppLayout.tsx`

**Action**: Add `quotes` nav item (admin/manager/employee, hide for invited)

**Acceptance**: Sidebar shows "見積管理" link for internal roles

### T-P7-4: Mobile responsive verification

**allowedFiles**: (visual check + any tweaks)

**Action**: Test all quote pages at 375px width:

- QuotesListPage card view
- QuoteFormPage stack + line item card edit
- QuoteDetailPage tabs (horizontal scroll)
- Modals full-width

**Acceptance**: No layout breakage at 375px-640px-1024px

---

## P8: Tests + Docs (1 ngày)

### T-P8-1: Unit tests BE (~50 tests)

**allowedFiles**:

- `backend/src/modules/quote/services/quote-status-machine.service.spec.ts` (18 tests)
- `backend/src/modules/quote/services/quote-versioning.service.spec.ts` (5 tests)
- `backend/src/modules/quote/services/quote-number-generator.service.spec.ts` (4 tests)
- `backend/src/modules/quote/services/quotes.service.spec.ts` (12 tests)
- `backend/src/modules/quote/services/quote-pdf.service.spec.ts` (3 smoke tests)
- `backend/src/modules/quote/services/unit-prices.service.spec.ts` (5 tests)

**Action**: Per BE DD §12.1 — mock all deps, verify business rules + audit + events

**Acceptance**: `pnpm --filter backend test` passes all (~90 total with F1's 40)

### T-P8-2: README + glossary update

**allowedFiles**:

- `README.md` (add F2 feature checklist row)
- `documents/glossary.md` (already covers F2 — verify completeness)

**Action**:

- README: mark F2 ✅ in feature table
- Add seed user note if needed
- Update test count (~90)

**Acceptance**: README correctly reflects F2 status

### T-P8-3: Browser test full F2 flow

**allowedFiles**: (none — manual QA)

**Action**: Test in browser DevTools:

1. Login manager → create quote → submit → approve → send → won
2. Mobile 375px: line editor card view OK
3. PDF download in browser
4. Admin login → /admin/unit-prices CRUD
5. Invited user → /quotes 403 page
6. Concurrent edit (2 tabs) → 409 conflict modal

**Acceptance**: All 6 scenarios pass; screenshot bugs trước commit

### T-P8-4: Commit + push final

**Action**:

- Verify all docs committed
- Final lint + typecheck + build + tests pass
- Commit message: "feat(F2-quote): full module — 19 endpoints + 27 components + ~50 tests"
- Push to feature/f2-quote

**Acceptance**: CI passes; branch ready for PR develop → f2-quote

---

## Risks + Mitigations

| Risk                                               | Impact | Mitigation                                                                                  |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Puppeteer Chromium install fails on Windows dev    | High   | Pre-download in package.json postinstall; if fails, use puppeteer-core + manual Chrome path |
| pg_bigm extension not available in Docker Postgres | High   | Test in P0; if missing, fallback to pg_trgm (less precise but works)                        |
| Line items editor performance with 500+ rows       | Medium | Virtualize via Antd Table `virtual` prop; warn at >100                                      |
| Concurrent edit causing data corruption            | High   | Optimistic lock + integration test in P5                                                    |
| PDF generation latency >10s for large quotes       | Medium | Phase 2 BullMQ worker; MVP just show loading + 30s timeout                                  |
| 電帳法 audit/version snapshot growing storage      | Low    | S3 lifecycle policy after 3 years (Phase 2)                                                 |
| Mobile line edit UX too cramped                    | Medium | User testing trong P7; fallback view-only mode flag if blocker                              |

---

## Out of Scope (reconfirm per SRS)

- F2-06 AI suggestion → Phase 3
- BullMQ async PDF queue → Phase 2
- Quote template library → Phase 2
- Multi-tier approval >2 levels → Future
- Configurable threshold via env → Phase 2
- Excel/CSV bulk import line items → Phase 2
- Customer self-view portal → Future
- Auto-email PDF send → Phase 2
- Digital signature integration → Phase 2

---

## State Transitions Expected

```
BD_DD_CREATED (current)
  → /plan → PLAN_CREATED (after this file saved)
    → /plan-review (auto) → PLAN_REVIEWED (if score ≥95%)
      → /execute → EXECUTING per phase
        → P0 DONE → P1 → ... → P8 DONE → EXECUTED
          → /validate (auto) → VALIDATED (if ≥90%)
            → /test (optional) → TESTED → READY_FOR_PR
```

---

## Effort Summary

| Phase     | Effort        | Files created/modified |
| --------- | ------------- | ---------------------- |
| P0        | 0.5d          | ~5 files               |
| P1        | 1.5d          | ~20 files              |
| P2        | 1.5d          | ~5 files               |
| P3        | 1.5d          | ~12 files              |
| P4        | 1.5d          | ~10 files              |
| P5        | 1.5d          | ~8 files               |
| P6        | 1d            | ~8 files               |
| P7        | 1d            | ~5 files               |
| P8        | 1d            | ~6 files               |
| **Total** | **~11d solo** | **~79 files**          |

Comparable to F1 (~12d, ~140 files) — F2 has fewer files but more complex per file (PDF + versioning + 2-tier approval).

---

_Plan generated from BD_DD_CREATED state — references SRS/BD/DD docs in documents/features/F2-QUOTE-hanq97/_
_All tasks have allowedFiles + acceptance criteria for /execute strict mode_
