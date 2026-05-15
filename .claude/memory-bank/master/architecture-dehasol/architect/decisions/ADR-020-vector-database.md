# ADR-020: Vector Database

## Status
**DEFERRED** — Decision recorded; implementation triggers in Phase 3
**Last reviewed**: 2026-05-15

## Context

Phase 3 features need vector similarity search:
- F7-03 AI 類似案件検索 (similar project search)
- F7-05 AI チャットボット (RAG retrieval)
- F2-06 AI 見積補助 (similar quote retrieval)

Estimated vector count Phase 3 launch:
- 案件 (5K projects, 1-2 embeddings each = ~10K vectors)
- 見積 (5K quotes × multiple per project, ~30K vectors)
- 社内ドキュメント (estimated 1-10K chunks)
- **Total: ~50K-100K vectors initially, growing**

## Options

### Option A: pgvector trên RDS PostgreSQL — Chosen
- Extension on existing PG (ADR-004)
- No additional infra
- HNSW index supported pgvector 0.5+
- Scale: comfortable up to 1M vectors with HNSW

### Option B: OpenSearch with vector field
- If OpenSearch already deployed Phase 2 (ADR-007) → reuse cluster
- Hybrid keyword + vector search natively

### Option C: Qdrant self-host (EC2)
- Best-in-class vector performance
- Additional infra component to operate

### Option D: Pinecone managed
- SaaS, easiest ops
- Data leaves AWS → conflicts with "AI private" (ADR-019)

## Decision (deferred)

**Option A — pgvector primary**, with **Option B (OpenSearch) reserved** if hybrid search performance becomes critical.

### Revisit checklist (Phase 3 start)
1. Verify pgvector performance on db.t4g.medium with 100K vectors
   - Target: p95 < 200ms for top-10 similarity search
   - If insufficient: upgrade RDS instance OR migrate to OpenSearch vector
2. Re-evaluate hybrid search needs (keyword + vector together)
   - If F7-05 chatbot needs both → consider OpenSearch hybrid query

### Planned implementation (Phase 3)

**Schema example**:
```sql
CREATE EXTENSION vector;

CREATE TABLE project_embeddings (
  project_id UUID PRIMARY KEY REFERENCES projects(id),
  embedding vector(1536),  -- Bedrock Titan Embeddings v2 dimension
  source_text TEXT NOT NULL,    -- snippet that was embedded
  model_version VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX project_embeddings_hnsw 
  ON project_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Embedding pipeline**:
- On project create/update → enqueue embedding job (BullMQ)
- Worker: fetch project data, build summary text (案件種別 + 概要 + 面積 + 仕様 + 金額帯), call Bedrock embedding API, upsert into `project_embeddings`
- Idempotent: replay-safe
- Model version stored for forward compatibility (re-embed when upgrading model)

**Search queries**:
- Similarity search:
  ```sql
  SELECT project_id, 1 - (embedding <=> $1) AS similarity
  FROM project_embeddings
  ORDER BY embedding <=> $1
  LIMIT 10;
  ```
- Combined with filter: SQL JOIN with `projects` table for status/type filter

**Memory & performance**:
- HNSW index in PG: ~3-5x raw embedding size in RAM when hot
- 100K × 1536 dim × 4 bytes = ~600MB raw; index ~2-3GB
- RDS instance: monitor `shared_buffers` and consider upsize to db.r6g.large at 500K+ vectors

### Migration path if pgvector insufficient
- Trigger: p95 latency >500ms or vector count >1M
- Target: OpenSearch vector field (reuse Phase 2 OpenSearch cluster) OR Qdrant if hybrid not critical
- Data export: read all vectors + metadata, write to target system
- Cutover: feature flag in AI gateway (ADR-021) switches retrieval source

### Out-of-scope for MVP / Phase 1-2
- No vector DB infra in Phase 1 (none of MVP features use AI)
- Phase 2 OpenSearch deployment focuses on keyword search; vector field can be added if needed Phase 3

## Consequences

### Positive
- Zero additional infra Phase 3 launch
- Atomic update with project data (single transaction)
- pgvector cost: $0 incremental beyond PG

### Negative
- Vector DB workload competes with OLTP on same RDS — monitor
- Future scale ceiling (~1M comfortably)

### Operational
- Re-embed cost: each model version change requires backfill (could be 10K+ API calls; budget aware)

## References

- Doc §5.2 (Pinecone/Qdrant baseline)
- Assessment Q2.2
- Domain KB §4.3, §7.3
- Related: ADR-004 (PG), ADR-019 (LLM), ADR-021 (AI Gateway)
