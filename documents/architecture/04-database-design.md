# 04 — Database Design

**Version**: 1.0 — 2026-05-15
**Refer to**: ADR-004 (PostgreSQL), ADR-007 (Search), ADR-017 (電帳法), Entity Catalog

---

## 1. Mục đích

Mô tả thiết kế DB: schema strategy, key entities, indexes, migration approach, performance considerations.

---

## 2. DB platform

- **Engine**: PostgreSQL 16.x trên AWS RDS (ADR-004)
- **Instance**: db.t4g.medium Phase 1 (2 vCPU, 4 GB RAM); upgrade roadmap based on load
- **HA**: Multi-AZ enabled (auto failover ~1-2min)
- **Backup**: 30-day automated daily snapshots; PITR 7 days; cross-region copy to ap-northeast-3
- **Encryption**: AES-256 at rest (KMS managed); TLS 1.2+ in transit

### 2.1 Extensions used
| Extension | Purpose | Phase |
|---|---|---|
| `uuid-ossp` | UUIDv7 generation (or app-side) | 1 |
| `pg_trgm` | Trigram for fuzzy text search (LIKE alternative) | 1 |
| `pg_bigm` | Bigram for Japanese FTS | 1 |
| `unaccent` | Normalize accents | 1 |
| `pgcrypto` | Crypto helpers, gen_random_uuid | 1 |
| `pgvector` | Vector similarity search | Install Phase 1 (dormant) → use Phase 3 |
| `pg_stat_statements` | Query performance analysis | 1 |

---

## 3. Schema conventions

### 3.1 Naming
- Tables: `snake_case`, plural (`customers`, `projects`, `quote_lines`)
- Columns: `snake_case`
- PK: `id` (UUID v7 for time-orderedness)
- FK: `<table_singular>_id` (e.g., `customer_id`)
- Audit fields on all entities:
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()` (auto-update via trigger or app code)
  - `created_by UUID FK users.id` (nullable for system-generated)
  - `updated_by UUID FK users.id` (nullable)
  - `deleted_at TIMESTAMPTZ NULL` (soft delete pattern)

### 3.2 Types
- IDs: `UUID` (v7 preferred for time-orderedness in indexes)
- Money: `DECIMAL(15,0)` for 円 (no fractional yen); `DECIMAL(15,2)` only if 半端 needed
- Text:
  - `VARCHAR(N)` for bounded fields (name, code)
  - `TEXT` for unbounded (description, notes)
- Date-only: `DATE`
- Timestamps: `TIMESTAMPTZ` (UTC stored)
- Enum: PostgreSQL `enum` type (or `varchar` with CHECK if frequent changes expected)
- JSON: `JSONB` (for snapshot, flexible fields like quote_versions.snapshot)

### 3.3 Constraint patterns
- All FKs `ON DELETE RESTRICT` by default; use `CASCADE` only where appropriate (e.g., `quote_lines` cascade delete with `quotes`)
- Soft-delete pattern: never `ON DELETE`; rely on `deleted_at IS NULL` filter in queries
- Add CHECK constraints for business rules where stable (e.g., `amount_total >= 0`)
- Add UNIQUE constraints with partial index: `UNIQUE (email) WHERE deleted_at IS NULL`

### 3.4 Soft delete
- All user-facing entities have `deleted_at`
- App-side `deleted_at IS NULL` filter enforced via Prisma middleware
- Hard delete only via admin maintenance script with audit log entry
- Periodic cleanup job (Phase 2+): permanently delete records `deleted_at < NOW() - INTERVAL '90 days'` for non-financial data

---

## 4. Phase 1 entity overview

Refer to `architect/catalogs/entity-catalog.md` for full field list. Summary:

| Entity | Purpose | Approx rows Phase 1 |
|---|---|---|
| `users` | System users | 50-100 |
| `customers` | OB + new customers | 10,000 (target) |
| `properties` | Per-customer property | 12,000 (~1.2 per customer avg) |
| `projects` | All projects | 5,000 active + historical |
| `project_members` | Project ACL | 30,000 (~6 members avg per project) |
| `folders` | Per-project folder | 30,000 (6 default × 5K) |
| `unit_prices` | Master pricing | 1,000-2,000 |
| `quotes` | Quote records | 7,500 (~1.5 per project) |
| `quote_lines` | Quote line items | 750,000 (~100 lines avg) |
| `quote_versions` | 電帳法 versions | 22,500 (~3 versions avg per quote) |
| `maintenance_schedules` | Auto-generated | 48,000 (12K properties × 4 milestones) |
| `aftercare_records` | After-care history | 5,000-10,000 |
| `notifications` | Notification log | 50,000+ (high frequency) |
| `audit_logs` | Audit trail | 500,000+ (high frequency) |

Total Phase 1 row count: ~1.5M+ across all tables. Comfortable on db.t4g.medium.

---

## 5. Key index strategy

### 5.1 Search-related (per ADR-007 PG FTS strategy)

```sql
-- Customer fuzzy search
CREATE INDEX idx_customers_name_bigm ON customers USING gin (name gin_bigm_ops) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_kana_bigm ON customers USING gin (name_kana gin_bigm_ops);
CREATE INDEX idx_customers_phone ON customers (phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_address_trgm ON customers USING gin (address gin_trgm_ops);

-- Project search & filter
CREATE INDEX idx_projects_status_owner ON projects (status, owner_user_id);
CREATE INDEX idx_projects_customer ON projects (customer_id, created_at desc);
CREATE INDEX idx_projects_schedule_start ON projects (schedule_start) WHERE status != 'cancelled';

-- Quote 電帳法 search (ADR-017)
CREATE INDEX idx_quotes_issued_at ON quotes (issued_at desc);
CREATE INDEX idx_quotes_amount_total ON quotes (amount_total);
CREATE INDEX idx_quotes_counter_party_bigm ON quotes USING gin (counter_party_name gin_bigm_ops);
```

### 5.2 Foreign keys
- All FK columns indexed (PostgreSQL doesn't auto-index FK; required for performant joins/deletes)

### 5.3 Audit log
```sql
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, occurred_at desc);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, occurred_at desc);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at desc);
```

### 5.4 Maintenance schedule batch query
```sql
-- Daily batch finds eligible schedules
CREATE INDEX idx_maintenance_pre_notify ON maintenance_schedules (pre_notify_date) 
  WHERE status = 'scheduled';
CREATE INDEX idx_maintenance_scheduled ON maintenance_schedules (scheduled_date)
  WHERE status IN ('scheduled', 'pre_notified');
```

---

## 6. Migration strategy

### 6.1 Tool
- **Prisma Migrate** (per ADR-002, ADR-004)
- Migration files in `prisma/migrations/`; tracked in git
- Forward-only migrations; never edit applied migrations

### 6.2 Naming convention
```
20260520_120000_create_users_table/migration.sql
20260520_140000_create_customers_table/migration.sql
20260601_090000_add_quote_versions_table/migration.sql
```

### 6.3 Migration safety rules
1. **Always reversible at logical level** (document undo SQL in PR description)
2. **Backward-compatible for rolling deploy**:
   - Adding column: nullable or with default
   - Renaming column: add new column, deploy code reading both, backfill, drop old
   - Removing column: deploy code that doesn't read it, then drop in next migration
3. **No data migration in schema migration** — use separate data migration script
4. **Large tables**: avoid full-table locks; use `CREATE INDEX CONCURRENTLY`
5. **Test on staging** before prod with realistic data volume

### 6.4 Migration deployment flow
1. PR includes migration → reviewed
2. Merge → staging deploy → auto-apply migration on staging
3. Smoke test
4. Prod deploy manual approval → migration applied → app rolling deploy
5. Rollback plan documented

---

## 7. Versioning & 電帳法 compliance (ADR-017)

### 7.1 quote_versions table
Detailed in entity catalog. Key points:
- Each save (after first finalize) inserts new version with full JSONB snapshot
- `change_type ENUM`: `correction` / `deletion` / `status_change`
- `change_reason TEXT NOT NULL` for corrections and deletions
- Append-only; no UPDATE on this table

### 7.2 電帳法 search requirements
- Search by 取引年月日: `idx_quotes_issued_at`
- Search by 金額: `idx_quotes_amount_total`
- Search by 取引先: `idx_quotes_counter_party_bigm`

### 7.3 Export for audit
- Reports can be generated from any version snapshot
- Audit log preserves who-changed-what-when
- Retention: 10 years for quotes + versions (well above 7-year legal minimum)

---

## 8. Performance & scaling

### 8.1 Connection pooling
- **Strategy**: Prisma connection pool (default 10) at app instance level
- **Concurrency**: 2 ECS tasks × 10 connections = 20 → comfortable for db.t4g.medium (default max 100 connections)
- **Scaling**: if ECS tasks scale up, consider PgBouncer in front of RDS (transaction pooling mode) to allow more app instances

### 8.2 Read replica plan
- **Phase 1**: Multi-AZ only (no read replica yet)
- **Phase 2+**: add read replica for:
  - Search/filter list queries (Phase 2 OpenSearch handles most heavy reads; replica as backup)
  - Dashboard aggregation queries
  - Reporting/exports
- Trigger to add: read CPU consistently > 60% OR p95 query time > 500ms

### 8.3 Query optimization principles
1. EXPLAIN ANALYZE for any query > 100ms in dev
2. Limit + offset paging avoided for large tables — use cursor (`WHERE id > $lastId ORDER BY id LIMIT 50`)
3. Avoid N+1: use `INCLUDE` in Prisma or batch loading
4. Audit log: query by composite index always
5. Slow query log enabled at 500ms threshold; weekly review

### 8.4 Maintenance
- VACUUM/ANALYZE: rely on autovacuum (RDS default); monitor bloat
- Partition strategy: defer until table > 100M rows (none expected Phase 1-3)
  - When needed: partition `audit_logs` and `notifications` by month
  - Use `pg_partman` extension for management

---

## 9. Data lifecycle policies

| Entity | Retention | Action |
|---|---|---|
| `quotes`, `quote_lines`, `quote_versions` | 10 years | Archive after 5 years to lower tier S3 backup; in DB indefinitely |
| `audit_logs` | 2 years per doc | Partition + archive to S3 (Glacier) after 2 years; DROP partition |
| `notifications` | 1 year | Archive + DROP partition; keep summary stats only |
| `aftercare_records` | 15 years (post-aftercare period buffer) | Same lifecycle as quotes |
| `maintenance_schedules` (completed/skipped) | 10 years | Same |
| Soft-deleted (general) | 90 days then hard-delete | Periodic job |

---

## 10. Operational

### 10.1 Backup verification
- Quarterly DR drill: restore latest snapshot to staging, run smoke tests
- Backup integrity verified by automated `SELECT count(*)` on critical tables in restored DB

### 10.2 Monitoring (CloudWatch + RDS metrics)
- CPU utilization (alarm at 70% sustained 5min)
- Available memory (alarm at < 20%)
- DB connections (alarm at > 80% of max)
- Read/write IOPS (baseline + spike alarm)
- Replication lag (Multi-AZ; should be < 1s)
- Snapshot completion (alarm if missed)

### 10.3 Sensitive data handling
- PII columns (`name`, `phone`, `address`, `email`):
  - Encrypted at rest (RDS default)
  - Optionally column-level encryption (Phase 2+ if compliance requires)
  - Excluded from logs (Pino redaction in app)
- Password hash (`users.password_hash`): never exposed via API; never logged
- 2FA secret (`users.2fa_secret`): app-level AES-256-GCM encryption with KMS key

---

## 11. Related documents

- [01 — System Architecture](./01-system-architecture.md)
- [02 — Module Architecture](./02-module-architecture.md)
- [05 — Backend Architecture](./05-backend-architecture.md)
- [06 — Security Architecture](./06-security-architecture.md)
- [07 — Deployment Architecture](./07-deployment-architecture.md)
- Entity Catalog: `architect/catalogs/entity-catalog.md`
- ADR-004 (Database), ADR-007 (Search), ADR-017 (電帳法)
