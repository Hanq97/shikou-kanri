# ADR-018: Data Migration Strategy

## Status
**ACCEPTED** — 2026-05-15

## Context

MVP Phase 1 requires migrating Towa's existing customer base into system:
- ~2,000 OB customers
- Per-customer property records with 引渡日 (required to trigger aftercare auto-notification F6-02)

Doc note: 既存顧客管理ソフト → CSV/エクスポート connection (one-time).
Source software TBD (likely a Windows desktop CRM).

## Options

### Option A: One-shot CSV import — Chosen
- DEHA receives CSV export from Towa
- Run import tool once before Phase 1 go-live
- All data in by Day 1

### Option B: Phased migration (rolling)
- Import customers as Towa uses them
- Risk: long tail; OB notifications miss until that customer migrated

### Option C: Direct DB connection to legacy
- Pull data periodically until cutover
- Complex; requires legacy DB access; not realistic without legacy vendor cooperation

## Decision

**Option A — One-shot CSV import tool, before Phase 1 launch**.

### Migration tool implementation

**Form**: NestJS CLI command in repo: `npx nest start --command import:customers <csv-path>` (or admin Web UI in F8-04 region)

**Pipeline**:
1. **Receive**: CSV file uploaded to S3 `imports/` bucket
2. **Validate**:
   - File format: UTF-8 BOM acceptable, comma-delimited; header row required
   - Required fields per row: 氏名 (name), 連絡先 (phone or email), 物件住所 (address), 引渡日 (handover date)
   - Optional: 物件種別, 構造, 築年数, 備考
3. **Transform**:
   - Date normalization: 和暦 (R6/05/15) ↔ 西暦 (2024-05-15); locale parser
   - Phone normalization: strip dashes/spaces; +81 prefix optional
   - 氏名 trim, normalize 全角/半角
   - 住所 trim
4. **Dedupe**:
   - By (氏名 normalized + 連絡先 last 4 digits)
   - Flag duplicates for manual review (don't auto-merge)
5. **Insert**:
   - Transaction per batch (100 records)
   - Errors collected; not transactional across all
6. **Report**:
   - Success count
   - Error report: rejected rows with reason
   - Duplicate report
   - 引渡日 stats (aftercare notification preview)

**Output artifacts**:
- `imports/{batchId}/source.csv` (input)
- `imports/{batchId}/report.html` (visual report)
- `imports/{batchId}/rejected.csv` (re-import after fix)
- `imports/{batchId}/duplicates.csv`

### Dry-run mode
- `--dry-run` flag: run validate+transform+dedupe, generate report, NO insert
- Used iteratively with Towa to clean data before final run

### Iteration cadence
1. Towa exports CSV (Week 1)
2. DEHA runs dry-run, generates report (Week 1)
3. Joint review session; Towa cleans source (Week 2)
4. Re-export, re-dry-run (Week 2-3)
5. Repeat until <5% rejection
6. Final run on production DB cutover day (Week 4 of Phase 1)

### Aftercare trigger backfill
- After import: bulk-generate `maintenance_schedules` for each property based on 引渡日 + intervals (1/3/5/10年)
- Mark past-due notifications as "skipped" (don't spam 10-year-old customers)
- Active schedules in next 90 days → activate normal notification flow

### Excluded from MVP migration
- ❌ 見積 history (no template fit yet; defer to Phase 2 or never)
- ❌ 工事 history details
- ❌ Photos (no source likely; defer)
- ❌ Chat history (no source)

If Towa wants 工事履歴 migrated → separate effort, Phase 2 enhancement.

### Risks & mitigations
- **R1**: Data quality 15-20% rejection — mitigate with iteration cycle
- **R2**: Source CSV column mapping changes mid-project — mitigate by configuration file mapping (`migration-config.json`)
- **R3**: Towa changes source data after export — mitigate with "freeze window" coordination
- **R4**: Source software vendor uncooperative on export → escalate; possibly manual transcription for critical records

## Consequences

### Positive
- Clean cutover; system has full OB base from Day 1
- Aftercare value-prop immediately active
- Migration tool reusable for future bulk operations

### Negative
- Iteration cycle takes 2-4 weeks → must start early in Phase 1 (or pre-Phase 1)
- Data quality dependence on Towa source

### Tool reusability
- After OB migration: tool retained for future bulk imports (e.g., new branch acquisition, partner merger)
- Phase 2: extend with 見積マスタ import if 単価マスタ data exists

## References

- Doc §5.4
- Assessment Q5.4
- Domain KB §8.2
- Related: F6 module (aftercare logic), F1-01 (customer mgmt)
