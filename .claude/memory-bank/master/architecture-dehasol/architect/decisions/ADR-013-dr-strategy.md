# ADR-013: Disaster Recovery Strategy

## Status
**ACCEPTED** — 2026-05-15

## Context

Doc requirements:
- RPO: 24h
- RTO: 4h
- Daily backup with 30-day retention
- Cross-region backup
- DR consideration for region failure

Single-region AWS Tokyo (ap-northeast-1). Backup target ap-northeast-3 (Osaka).

## Options

### Option A: Backup-based DR — Chosen
- Daily automated backup; manual restore on disaster
- Cost: +5% over single-region baseline

### Option B: Cross-region passive standby (warm)
- RDS read replica + S3 CRR + ALB failover via Route 53
- RTO 15-30 min; cost +50-80%

### Option C: Active-active multi-region
- Full DR readiness; cost +200%
- Massive overkill for 50-user system

## Decision

**Option A — Backup-based DR with cross-region replication**.

### Backup components

| Resource | Backup mechanism | Frequency | Retention | Cross-region |
|---|---|---|---|---|
| RDS PG | Automated snapshot | Daily | 30 days | ✅ copy to ap-northeast-3 |
| RDS PG | PITR (binlog) | Continuous | 7 days | ❌ (regional) |
| S3 photos/docs | Cross-Region Replication | Live | Same as source lifecycle | ✅ ap-northeast-3 |
| ElastiCache Redis | NOT critical (cache + queue state) | — | — | ❌ rebuilt from PG/S3 on DR |
| Infrastructure-as-Code | Git (Terraform/CDK in source repo) | — | Indefinite | ✅ via GitHub |
| Secrets Manager | AWS managed replication | — | — | ✅ replicate to ap-northeast-3 |

### Restore runbook (documented)

**Scenario A: Single AZ failure**
- Multi-AZ RDS auto-failover (~1-2 min)
- ECS schedules tasks to healthy AZ
- **RTO**: ~5 min, **RPO**: 0
- No manual action

**Scenario B: Region failure (Tokyo down)**
- Manual restore from cross-region backup:
  1. Restore RDS in ap-northeast-3 from latest snapshot (~30-60 min for db.t4g.medium with 100GB)
  2. Deploy ECS stack to ap-northeast-3 (Terraform/CDK; ~15 min)
  3. Point Route 53 alias to new region ALB (~5 min DNS TTL)
  4. Validate read/write (5 min)
  5. Communicate to Towa
- **RTO**: 2-3h optimistic, 4-5h realistic — **acknowledge tight against 4h target**
- **RPO**: up to 24h (daily snapshot; can improve with hourly PITR — costs more)

### RTO 4h risk
**Flagged**: RTO 4h is tight with backup-only strategy. Options if Towa demands hard SLA:
- Add automated runbook (Step Functions) → reduce manual time
- Pre-warm DR instance (always-on small RDS replica in ap-northeast-3) → ~30 min RTO, 1.5x cost
- **Action**: Renegotiate RTO target with Towa to 6-8h, OR upgrade to warm standby (ADR amendment future)

### DR testing
- Quarterly DR drill: restore snapshot to staging, validate functionality, document
- Annual full failover simulation

## Consequences

### Positive
- Minimal cost overhead (~5% on top of baseline)
- Multi-AZ already provides intra-region resilience
- Cross-region replication completes within minutes for typical workload

### Negative
- RTO 4h target ambitious; mitigation needed if Towa enforces strictly
- Manual restore steps prone to human error → drill regularly

### Compliance
- Backup retention 30 days satisfies doc §4.2
- 監査ログ 2-year retention via S3 lifecycle to Glacier

## References

- Doc §4.2
- Assessment Q4.2
- Related: ADR-004 (RDS), ADR-005 (AWS), ADR-006 (S3)
