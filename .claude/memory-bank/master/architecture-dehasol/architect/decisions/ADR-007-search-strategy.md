# ADR-007: Full-text Search Strategy

## Status
**ACCEPTED** — 2026-05-15

## Context

Yêu cầu search:
- **Phase 1**: 顧客 (氏名/電話/住所 fuzzy), 案件 (multi-condition filter)
- **Phase 2**: チャット message full-text, 図面/写真 metadata
- **Phase 3**: AI similar search, OCR'd content search

Scale Phase 1: 10K customers, 5K projects — relatively small.
Scale Phase 2+: 6M chat messages, 100K photos with metadata.

## Options

### Option A: OpenSearch managed từ đầu
- **Pros**: Unified search infra; rich features
- **Cons**: $$$ (~$150-300/m AWS managed); ops complexity từ Day 1; overkill cho Phase 1 scale

### Option B: PG FTS Phase 1 → OpenSearch Phase 2 — Chosen
- **Pros**: Cost-effective; phase-aligned; reuse existing DB
- **Cons**: Migration effort khi Phase 2 (~1 sprint); transition complexity

### Option C: PG FTS always (no OpenSearch)
- **Pros**: Cheapest; simplest
- **Cons**: Khi chat history grow >1M records, PG FTS performance drop; vector search OK với pgvector nhưng combined search yếu hơn OpenSearch

## Decision

**Option B — PostgreSQL FTS for Phase 1 → AWS OpenSearch managed for Phase 2+**.

### Phase 1 PG FTS implementation

```sql
-- Customer search example
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE customers ADD COLUMN search_text tsvector
  GENERATED ALWAYS AS (
    to_tsvector('japanese',  -- requires PG japanese dict (textsearch_ja or via mecab)
      coalesce(name, '') || ' ' || 
      coalesce(name_kana, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(address, '')
    )
  ) STORED;

CREATE INDEX customers_search_idx ON customers USING GIN(search_text);
CREATE INDEX customers_name_trgm_idx ON customers USING GIN(name gin_trgm_ops);
```

**Japanese tokenization**: 
- Option a: `pg_bigm` extension (bigram-based; works without dictionary)
- Option b: `textsearch_ja` (requires MeCab on DB host — RDS không support)
- **Decision**: Use `pg_bigm` (RDS support hoặc compile add via parameter group)

**Fallback**: trigram (`pg_trgm`) cho phone, address (ASCII-friendly)

### Phase 1 search targets

| Search | Index |
|---|---|
| 顧客 name/phone/address | `pg_bigm` + `pg_trgm` |
| 案件 multi-filter (status × date × owner) | B-tree composite |
| 案件 name search | `pg_bigm` |
| 単価マスタ category/item | B-tree + `pg_bigm` |

### Phase 2 OpenSearch migration

**Trigger**: Khi chat go-live (Phase 2 launch).

**Architecture**:
- Dual-write từ NestJS modules → PG (source of truth) + OpenSearch (search index)
- Async indexing via BullMQ to avoid blocking writes
- Backfill job cho existing data
- Search service module: `src/modules/search/` abstracts PG-vs-OS query routing

**Index design**:
- `chat-messages-{yyyy-mm}` (monthly index, rollover)
- `customers` (mirror of PG)
- `projects` (mirror)
- `photos-metadata` (Phase 2 if needed)

### Phase 3 vector search consideration
- pgvector trên PG (ADR-020) cho similarity search 案件
- OpenSearch vector field cho RAG chatbot (ADR-019, ADR-020 revisit Phase 3)

## Consequences

### Positive
- Phase 1 cost saving (~$150-300/m no OS)
- Avoid premature ops complexity
- Smooth migration path defined

### Negative
- Migration sprint needed Phase 2
- Dual-write consistency challenges (mitigate: async + reconciliation job)
- Japanese tokenization with `pg_bigm` không tốt như mecab-based; acceptable cho Phase 1 scale

### Performance targets
- 顧客 search p95 < 300ms Phase 1 (10K records) ✓
- 案件 filter p95 < 500ms Phase 1 ✓
- チャット search p95 < 1s Phase 2 (cần OS) — driver cho migration

## References

- Doc §5.2 (Elasticsearch/OpenSearch baseline)
- Assessment Q1.3
- Domain KB §6 (scale targets)
- Related: ADR-004 (PG), ADR-005 (AWS OpenSearch managed)
