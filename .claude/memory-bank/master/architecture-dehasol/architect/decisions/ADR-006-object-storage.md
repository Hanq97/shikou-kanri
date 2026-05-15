# ADR-006: Object Storage

## Status
**ACCEPTED** — 2026-05-15

## Context

100K photo + ~10K document (見積 PDF, 検査 PDF, 図面) + backup → cần object storage cost-effective với lifecycle policy.

Yêu cầu:
- 写真: 5-10MB each, 100K total → ~500GB-1TB target
- HEIC iOS → JPEG transcode
- Signed URL cho private access (招待ユーザー scope)
- Audit retention 2 years (per doc)
- Cross-region replication cho DR (ADR-013)

## Options

### Option A: S3 (AWS) với lifecycle policy — Chosen
- **Pros**: Native AWS, integration với CloudFront/IAM tốt; lifecycle tier cost optimization; versioning
- **Cons**: AWS lock-in (mitigated by S3-compatible API)

### Option B: S3 + EFS (file system for active editing)
- **Pros**: Some apps need file system semantics
- **Cons**: Không cần ở đây; object storage đủ

## Decision

**S3 với lifecycle policy + CloudFront signed URLs**.

### Bucket structure
```
towa-shikou-kanri-prod/
  photos/{projectId}/{photoId}.{ext}        # Original
  photos/{projectId}/{photoId}-thumb-{sz}.jpg   # 3 sizes: 200/500/1200
  documents/quotes/{quoteId}.pdf
  documents/inspections/{inspectionId}.pdf
  drawings/{projectId}/{drawingId}.{pdf|jpg}
  attachments/{messageId}/{filename}        # Chat attachments (Phase 2)
  imports/{batchId}/customers.csv           # Migration source
  exports/{userId}/{exportId}.csv           # User export
  backups/db/...                            # Application-level snapshot if any
```

### Lifecycle policies
| Path | Standard | Standard-IA | Glacier IR | Glacier Deep | Delete |
|---|---|---|---|---|---|
| `photos/**/*-thumb-*` | 365d | — | — | — | 2y |
| `photos/**/*` (original) | 90d | 90→365d | 1→3y | 3→7y | never (or 10y per 瑕疵担保) |
| `documents/**` | 365d | 1→2y | 2→7y | — | 10y (or never per 電帳法) |
| `attachments/**` | 90d | 90→365d | 1→3y | — | 7y |
| `imports/**`, `exports/**` | 30d | — | — | — | 90d |
| `backups/**` | — | — | — | 30d (Glacier) | per retention policy |

### Photo processing pipeline (Phase 2)
- Upload via presigned URL (FE → S3 direct, không qua BE)
- S3 event → Lambda → 
  - Validate file (size, MIME)
  - HEIC → JPEG transcode if needed (Lambda với Sharp library)
  - Generate 3 thumbnails (200/500/1200 width)
  - Update DB metadata record
- Original retained; thumbnails serve via CloudFront

### Access pattern
- Photos/docs: **signed URL via CloudFront** với 5min-1h TTL
- Public assets (UI image): regular CloudFront caching
- Bucket policy: private; IAM only allow app role + CloudFront OAC

### Cross-region replication
- Same-account, target region ap-northeast-3 (Osaka)
- Selective replication: `photos/`, `documents/`, `drawings/` only (not `imports/exports`)
- Replication rule per ADR-013

### Encryption
- SSE-S3 default for all (AES-256)
- Optional SSE-KMS cho documents/* nếu compliance audit cần encryption key control

## Consequences

### Positive
- Cost optimization through tier transitions (~30-50% saving on cold data)
- Scalable to PB-scale
- HEIC handled at ingress → DB metadata clean

### Negative
- Lifecycle transitions có hidden cost (per-object IA fee); review monthly
- HEIC transcode pipeline = 1 Lambda + complexity

### Operational notes
- S3 Inventory enabled (daily) cho audit
- S3 Object Lock NOT enabled initially (can add for audit/log buckets if compliance requires WORM)
- Versioning ON cho `documents/` (electronic record protection)

## References

- Doc §4.1 (data scale)
- Doc §5.2 (S3 baseline)
- Related: ADR-005 (AWS), ADR-013 (DR), ADR-017 (電帳法 versioning)
