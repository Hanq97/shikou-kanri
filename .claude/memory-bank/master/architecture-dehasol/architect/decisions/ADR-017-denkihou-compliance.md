# ADR-017: 電帳法 Compliance Strategy

## Status
**ACCEPTED** — 2026-05-15

## Context

電子帳簿保存法 (Electronic Bookkeeping Law) revised effective 2024. Requirements for digital quote/contract storage:
- **訂正削除履歴** (correction/deletion history) — must retain audit trail
- **検索要件** (searchability) — by 取引年月日 (transaction date), 金額 (amount), 取引先 (counter-party name)
- **真実性確保** (authenticity) — one of:
  - Option 1: Timestamp Authority (TSA) certification (cost per timestamp)
  - Option 2: Use system that prevents alteration + has correction/deletion log
- **可視性** (viewability) — visible on screen, printable

## Options

### Option A: 訂正削除履歴 + 検索要件 (lightweight, DB-based) — Chosen
- App-level version history + audit log
- Search index per requirements
- Comply with 真実性 Option 2 path

### Option B: TSA integration
- Each finalized quote/contract gets timestamp from TSA service
- Cost: ~10-50円 per timestamp
- Stronger compliance evidence

### Option C: 訂正削除履歴 + post-deployment TSA add-on
- Start with A; layer TSA later if Towa has audit pressure

## Decision

**Option A — 訂正削除履歴 + 検索要件, DB-based**.

### Implementation

**1. Version history (append-only)**:
- Table `quote_versions`: every save creates new version row
- Schema: `quote_id, version_number, version_data (JSONB snapshot), changed_by, changed_at, change_reason`
- 訂正 = new version with `change_type='correction'`
- 削除 = soft-delete with `change_type='deletion'`, original retained
- Hard delete NOT allowed via UI (only admin override + audit logged)

**Same pattern for**:
- `contract_versions` (if Phase 2+ adds contract module)
- `inspection_versions`

**2. Searchability**:
- Composite index on `(quote_date, amount, customer_id)` and indexed customer/supplier name
- Search UI in quote list:
  - 取引年月日 range (date range picker)
  - 金額 range (min-max)
  - 取引先 (text, fuzzy via pg_trgm/pg_bigm)
- Export to CSV with search filters preserved

**3. Authenticity**:
- All quote/contract immutable once finalized status
- Edit after finalize → version increment (no in-place edit)
- Audit log entry on every state transition
- 削除済 records visible to admin (with reason)
- Read-only export anytime

**4. Visibility**:
- PDF generation reproduces original at any version
- View original PDF and any later corrections side-by-side
- Print-friendly layout

**5. Retention**:
- 見積/契約 data + versions: 10 years (well beyond 電帳法 7-year requirement)
- Audit log: 2 years per doc; extend if needed
- S3 lifecycle to Glacier for old data (ADR-006)

### Out-of-scope for MVP
- TSA integration (defer; can add as enhancement)
- Optical scan + OCR for paper receipt entry (Phase 3, F7-06)
- スキャナ保存 mode (different 電帳法 path; not applicable since quote/contract created digitally in system)

## Consequences

### Positive
- Zero per-transaction cost (no TSA fee)
- Standard pattern works with 電帳法 Option 2 path
- Audit-friendly: all changes traceable

### Negative
- DB storage grows with version history (acceptable; quotes are small JSON)
- 真実性 evidence weaker than TSA if subject to legal challenge (rare for SMB)

### Future enhancement
- Add TSA integration if Towa anticipates tax audit or wants stronger evidence
- TSA can be added retroactively to existing records (with proof of "as of date X" via current timestamp)

## References

- Doc §4.7
- Assessment Q5.3
- Domain KB §3.1
- Related: ADR-004 (DB versioning), ADR-006 (S3 retention)
