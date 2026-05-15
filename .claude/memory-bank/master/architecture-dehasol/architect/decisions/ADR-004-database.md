# ADR-004: Database

## Status
**ACCEPTED** — 2026-05-15

## Context

Doc đã đề xuất PostgreSQL. Cần document hóa lựa chọn này + version + extensions cần thiết.

Yêu cầu:
- OLTP cho all CRUD (customer, project, quote, schedule, ...)
- Light analytical query (dashboard Phase 3)
- Full-text search ban đầu (Phase 1, ADR-007)
- Vector search future (Phase 3, ADR-020)
- ACID cho 見積 lifecycle, 是正 workflow
- Audit log (immutable append-only)

## Options

### Option A: PostgreSQL (managed AWS RDS) — Chosen
- **Pros**: 
  - Mature, battle-tested
  - Rich extension ecosystem (pgvector, pg_trgm, postgis nếu cần future GPS)
  - JSON support cho flexible field (quote line items)
  - FTS built-in (GIN + tsvector + pg_trgm cho fuzzy)
- **Cons**: Scale vertical primarily; sharding phức tạp (không cần ở scale này)

### Option B: MySQL/MariaDB
- **Pros**: Lighter; familiar to some teams
- **Cons**: JSON support yếu hơn; không có pgvector equivalent; FTS yếu hơn

### Option C: Multi-DB (PG + DynamoDB cho chat)
- **Pros**: Chat scale tốt với NoSQL
- **Cons**: Overkill cho 6M messages estimated; tăng ops

## Decision

**Option A — AWS RDS PostgreSQL 16.x** (latest stable).

### Configuration:
- **Instance class**: `db.t4g.medium` Phase 1 (2 vCPU, 4 GiB) → đủ cho 50 users
- **Storage**: 100 GB GP3, autoscale enabled
- **Multi-AZ**: ON (Phase 1, for high availability inside region)
- **Backup**: automated, 30-day retention (ADR-013)
- **Extensions enabled**:
  - `pg_trgm` (Phase 1) — fuzzy search 氏名/住所
  - `pgvector` (install Phase 1, use Phase 3 — ADR-020)
  - `pgcrypto` (encryption helpers)
  - `unaccent` (search normalization)
- **Encryption**: at-rest (default RDS) + TLS for in-transit
- **Parameter groups**: tune `shared_buffers`, `work_mem` per workload baseline

### Schema strategy
- ORM: Prisma (ADR-002)
- Migration: Prisma Migrate, tracked in git
- Conventions: snake_case columns, UUIDv7 primary keys (time-ordered), `created_at`/`updated_at`/`deleted_at` audit fields
- Single schema initially; soft-delete pattern (deleted_at IS NULL filter)
- Append-only audit log table `audit_logs`

## Consequences

### Positive
- Single DB simplifies operations
- pgvector ready-to-go khi Phase 3 AI starts
- ACID transactions cho complex workflow (quote approval, 是正)

### Negative
- Vertical scale limit ~ db.r6g.16xlarge level — far beyond Phase 1 need
- Vector search performance trên pgvector OK cho ~1M vectors; nếu Phase 3 RAG cần >5M → migrate sang OpenSearch vector hoặc Qdrant

### Performance considerations
- Index strategy: B-tree cho FK, GIN cho FTS columns, btree_gin cho composite (status + date)
- Connection pooling: PgBouncer hoặc Prisma connection pool (test pgbouncer compatibility với Prisma)
- Read replica: defer until needed (probably Phase 2 khi chat load tăng)

## References

- Doc §5.2 (PostgreSQL baseline)
- Assessment Q1, Q2.2
- Domain KB §6 (scale metrics)
- Related: ADR-007 (Search), ADR-020 (Vector DB), ADR-013 (DR)
