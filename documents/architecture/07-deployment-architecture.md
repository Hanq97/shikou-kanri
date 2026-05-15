# 07 — Deployment Architecture

**Version**: 1.0 — 2026-05-15
**Refer to**: ADR-005 (AWS), ADR-009 (CI/CD), ADR-012 (Tenancy), ADR-013 (DR), ADR-014 (Ownership)

---

## 1. Mục đích

Mô tả deployment topology, environments, CI/CD pipeline, DR, monitoring, và ops procedures.

---

## 2. Deployment topology

### 2.1 AWS region & AZ
- **Primary**: ap-northeast-1 (Tokyo) — 2 AZs (1a, 1c)
- **DR**: ap-northeast-3 (Osaka) — backup destination only

### 2.2 Topology diagram

```
                    Internet
                       │
                       ▼
                ┌──────────────┐
                │ Route 53     │ DNS
                └──────┬───────┘
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
       ┌─────────┐          ┌──────────┐
       │CloudFront│          │   ALB    │
       │ + WAF    │          │  + WAF   │
       │ (FE SPA) │          │  (API)   │
       └────┬─────┘          └────┬─────┘
            │ Origin               │
            ▼                      │
       ┌──────────┐                │
       │ S3 (FE)  │                │
       │  bucket  │                │
       └──────────┘                │
                                   ▼
            ┌──────────────────────────────────────┐
            │     VPC (ap-northeast-1)             │
            │  ┌────────────┐  ┌────────────┐      │
            │  │Public 1a   │  │Public 1c   │      │
            │  │ NAT, ALB   │  │ NAT (HA)   │      │
            │  └────────────┘  └────────────┘      │
            │                                      │
            │  ┌────────────────────────────┐      │
            │  │  Private App subnet 1a/1c   │      │
            │  │  ECS Fargate tasks          │      │
            │  │  - api task (2 desired)     │      │
            │  │  - worker task (1 desired)  │      │
            │  └────────────────────────────┘      │
            │                                      │
            │  ┌────────────────────────────┐      │
            │  │  Private Data subnet 1a/1c  │      │
            │  │  RDS Multi-AZ              │      │
            │  │  ElastiCache (Redis)       │      │
            │  └────────────────────────────┘      │
            │                                      │
            │  VPC Endpoints:                      │
            │  - S3, ECR, SecretsMgr, CW, Bedrock  │
            └──────────────────────────────────────┘
                       │
                       │ Cross-Region Replication
                       ▼
            ┌──────────────────────────────────────┐
            │     ap-northeast-3 (Osaka) - DR      │
            │  - S3 replica bucket                 │
            │  - RDS snapshot copy                 │
            │  - Secrets Manager replica           │
            │  (Standby, no compute running)       │
            └──────────────────────────────────────┘
```

---

## 3. Environments

| Environment | Purpose | Region | Compute size | Data |
|---|---|---|---|---|
| **Local** | Dev laptop | n/a | Docker Compose | Seed data |
| **Dev** | Shared dev | ap-northeast-1 | t4g.small (single) | Synthetic |
| **Staging** | UAT | ap-northeast-1 | Same as prod scaled-down | Anonymized prod copy + UAT data |
| **Production** | Live | ap-northeast-1 | Production sizing | Live Towa data |
| **DR** | Disaster recovery | ap-northeast-3 | Cold (no compute) | Replicated backups |

### 3.1 Environment isolation
- Separate AWS accounts (AWS Organizations) recommended:
  - DEHA-prod (hosts Towa prod + staging + DR)
  - DEHA-dev (hosts dev shared)
  - DEHA-sandbox (engineer playground)
- Cross-account access via SSO + IAM roles

### 3.2 Configuration per environment
- Stored in Secrets Manager + Parameter Store per env
- Loaded at app startup
- Differences:
  - DB connection string
  - Log level (debug in dev, info in prod)
  - Feature flags (e.g., disable real payment, real email)
  - Rate limits (looser in dev)

---

## 4. Compute (ECS Fargate)

### 4.1 Service definition
- **api service**:
  - 2 tasks desired (min) / 6 max
  - Auto-scale on CPU > 70% sustained 3min
  - Task definition: 0.5 vCPU, 1 GB RAM (Phase 1)
  - Health check: `/health/ready` via ALB
  - Deployment type: Rolling (50% min healthy)
- **worker service** (Phase 1):
  - 1 task; can scale to 4
  - Same task definition pattern (different start cmd)
  - Phase 2+: separate pdf-worker, photo-worker services

### 4.2 Resource sizing (Phase 1 baseline)
- API task: 0.5 vCPU / 1 GB → scale as load grows
- Worker task: 1 vCPU / 2 GB (Puppeteer needs more memory)
- ALB: auto-scaled
- RDS: db.t4g.medium (2 vCPU / 4 GB) Multi-AZ
- ElastiCache: cache.t4g.micro (2 nodes for HA optional Phase 2+)

### 4.3 Image registry
- AWS ECR private repository
- Image tagging: `<git-sha>` for prod, `<branch>-<sha>` for dev
- Lifecycle policy: keep last 30 prod tags, 14 days for dev tags
- Vulnerability scanning on push

---

## 5. CI/CD pipeline (per ADR-009)

### 5.1 Pipeline overview

```
git push (PR)
  │
  ▼
GitHub Actions: pr-check.yml
  - ESLint (with boundaries rule)
  - TypeScript tsc --noEmit
  - Unit tests (Jest + Vitest)
  - Build verification
  - npm audit
  └→ Status check on PR (required for merge)

git push (main branch)
  │
  ▼
GitHub Actions: ci.yml
  - Full test suite (unit + integration)
  - Build Docker images (api + worker)
  - Push to ECR with sha tag
  - Run Prisma migration on staging DB
  - Deploy staging ECS service (rolling)
  - Run E2E smoke tests against staging
  └→ Success → ready for prod promotion

Manual trigger (or git tag v*.*.*):
  │
  ▼
GitHub Actions: deploy-prod.yml
  - Required reviewer approval (GitHub Environment protection)
  - Run Prisma migration on prod DB (with backup verification)
  - Deploy ECS prod (rolling, min 50% healthy)
  - Smoke test post-deploy
  - Notify Slack on success/failure
```

### 5.2 Rollback
- Automatic: if rolling deploy fails health check → ECS reverts to previous task definition
- Manual: re-run prod deploy with previous git sha → revert image; if DB migration ran, may need separate rollback migration

### 5.3 Database migration safety
- Migrations applied in `db-migrate.yml` separate workflow (or part of deploy)
- Pre-deploy backup verification (latest snapshot exists)
- Migration applied BEFORE code deploy (additive migrations only)
- Code never depends on schema change in same deploy
- Multi-step destructive changes split across deploys

### 5.4 Secrets in pipeline
- OIDC connection from GitHub Actions to AWS → temporary credentials (no long-lived keys)
- App secrets fetched from Secrets Manager at runtime (not in pipeline)
- GitHub Encrypted Secrets only for IDs (account ID, role ARN)

---

## 6. Monitoring & Observability

### 6.1 Logs (CloudWatch Logs)
- Log groups:
  - `/aws/ecs/api/prod`
  - `/aws/ecs/worker/prod`
  - `/aws/rds/prod/postgresql/postgresql.log`
  - `/aws/rds/prod/postgresql/slowquery.log`
  - `/aws/lambda/photo-processor/prod` (Phase 2)
- Retention: 30 days hot
- Insights queries pre-saved for common diagnostics

### 6.2 Metrics (CloudWatch Metrics)
- Standard AWS metrics: ECS CPU/mem, ALB request count, RDS connections, Redis ops/sec
- Custom application metrics:
  - `app.request.count` (by endpoint, status)
  - `app.request.latency` (histogram by endpoint)
  - `app.queue.depth` (by queue name)
  - `app.business.users.active`
  - `app.business.projects.active`
  - `app.ai.cost.usd` (Phase 3)

### 6.3 Dashboards
- "System Overview" — ECS health, ALB, RDS, Redis basic
- "API Performance" — latency, error rate, top slow endpoints
- "DB Performance" — connection count, query latency, lock waits
- "Business KPIs" — active users, MAU, projects/quotes per period
- "AI Usage" — Phase 3 — token consumption, cost, latency

### 6.4 Alerts (CloudWatch → PagerDuty/OpsGenie)
- **P1 (page on-call)**:
  - All API tasks unhealthy
  - DB unavailable
  - Error rate > 5% for 5 min
  - RDS CPU > 90% for 10 min
- **P2 (notify business hours)**:
  - Error rate > 1% for 15 min
  - p95 latency > 3s for 10 min
  - Queue depth > 1000 sustained
  - Backup failure
  - SSL cert expiring < 30 days
- **Info (Slack channel)**:
  - Deploy success/failure
  - Capacity utilization warnings

### 6.5 Tracing (X-Ray or Datadog OTLP)
- Distributed tracing for all API requests
- Sample 100% in dev/staging, 10-20% in prod (always sample on error)

---

## 7. Disaster Recovery (per ADR-013)

### 7.1 Backup
| Resource | Mechanism | Frequency | Retention | Cross-region |
|---|---|---|---|---|
| RDS | Automated snapshot | Daily | 30 days | Copy to ap-northeast-3 |
| RDS | PITR | Continuous | 7 days | No (regional) |
| S3 | Cross-Region Replication | Live | Same as source lifecycle | To ap-northeast-3 |
| Secrets Manager | Replication | Live | n/a | To ap-northeast-3 |
| IaC | Git (GitHub) | Push-based | Indefinite | Yes |
| ECR images | Replication | Per-image | n/a | To ap-northeast-3 |

### 7.2 Restore runbook

**Scenario A — Single AZ failure**:
- ECS auto-balances to healthy AZ
- RDS Multi-AZ auto-failover
- **No manual action; RTO ~5min, RPO 0**

**Scenario B — Region failure**:
1. Declare incident; communicate to Towa
2. Restore RDS from cross-region snapshot in ap-northeast-3
3. Deploy Terraform/CDK stack to ap-northeast-3 (apply prod env)
4. Update Route 53 weighted record / failover policy to ap-northeast-3 ALB
5. Validate end-to-end smoke test
6. Communicate restoration to Towa
7. Once primary region restored: plan controlled fallback

**Documented**: `documents/operations/dr-runbook.md` (to be created in Phase 1 ops setup)

### 7.3 DR testing
- Quarterly drill: restore latest snapshot to staging in ap-northeast-3, validate
- Annual: simulated full failover including DNS switch

---

## 8. Ops procedures

### 8.1 Routine maintenance window
- Per doc §4.4: 第2土曜 23:00-日曜 6:00 JST (only when needed)
- Notify Towa 7+ days in advance
- Non-disruptive changes: deploy any time using rolling
- Disruptive (DB schema major, infra migration): scheduled window

### 8.2 Scaling decisions
- Manual scale-up trigger: dashboard alert sustained
- Phase 1: 2 tasks default; auto-scale to 6 if needed (rare for 50 users)
- Phase 2+: increase based on observed load (chat, photo upload spikes)

### 8.3 Cost monitoring
- AWS Budget alerts at 80% and 100% of monthly target
- Cost Explorer dashboards per service category
- Monthly cost review with optimization opportunities

### 8.4 Helpdesk integration (per doc §4.4)
- DEHA helpdesk (business hours)
- Tickets logged externally (TBD: existing DEHA ticketing system)
- SLA per priority:
  - P1 (致命的): 1h response, 4h resolution
  - P2: 4h response, next business day resolution

---

## 9. Phase evolution of deployment

### Phase 1 (MVP)
- Single region, Multi-AZ
- 2 ECS api tasks, 1 worker
- RDS db.t4g.medium, ElastiCache micro
- Backup-based DR

### Phase 2 (現場DX)
- Add separate workers (pdf-worker, photo-worker)
- Add Lambda for photo processing (HEIC transcode, thumbnail)
- Add OpenSearch domain (ADR-007)
- Consider Read Replica if load grows
- PWA distribution via CDN (no separate infra)

### Phase 3 (AI高度化)
- VPC endpoint for Bedrock
- Add ai-worker for inference jobs
- Cost monitoring extended for AI usage
- Consider RDS upgrade (db.r6g.large) for pgvector workload
- Add EventBridge Scheduler for AI batch jobs

---

## 10. Infrastructure as Code

### 10.1 Tool
- **Choice (to finalize before Phase 1 start)**: Terraform OR AWS CDK
- Either way: all infra in git, reviewed via PR

### 10.2 Module structure
```
infra/
├── terraform/  (or cdk/)
│   ├── modules/
│   │   ├── vpc/
│   │   ├── ecs-cluster/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   ├── s3/
│   │   ├── alb/
│   │   ├── cloudfront/
│   │   └── monitoring/
│   ├── environments/
│   │   ├── prod/
│   │   ├── staging/
│   │   └── dev/
│   └── backend.tf (state in S3 + DynamoDB lock)
```

### 10.3 State management
- Terraform: remote state in S3 with DynamoDB lock table
- CDK: CloudFormation stacks per environment

---

## 11. Related documents

- [01 — System Architecture](./01-system-architecture.md)
- [04 — Database Design](./04-database-design.md)
- [05 — Backend Architecture](./05-backend-architecture.md)
- [06 — Security Architecture](./06-security-architecture.md)
- [08 — MVP Scope & Roadmap](./08-mvp-scope-and-roadmap.md)
- ADRs 005, 009, 012, 013, 014
