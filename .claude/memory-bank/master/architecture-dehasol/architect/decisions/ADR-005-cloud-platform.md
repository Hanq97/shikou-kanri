# ADR-005: Cloud Platform

## Status
**ACCEPTED** — 2026-05-15

## Context

Doc đề xuất "AWS hoặc Azure (リージョン：東京)". Cần chốt 1 cloud cho deployment.

Yêu cầu:
- 東京 region (data sovereignty + low latency)
- Managed PG, S3-compatible storage, managed search, LLM API (Bedrock or OpenAI), OCR service
- Mature monitoring (CloudWatch / Azure Monitor)

## Options

### Option A: AWS (ap-northeast-1 Tokyo) — Chosen
- **Pros**: 
  - Largest market share JP; mature region
  - Service catalog rich: RDS PG, S3, OpenSearch managed, Bedrock (Anthropic Claude available), Lambda, SES email
  - DEHA likely familiar
- **Cons**: AWS Bedrock model availability sometimes lag JP region (verify before Phase 3)

### Option B: Azure (Japan East / Tokyo)
- **Pros**: Strong với Microsoft ecosystem; Document Intelligence (OCR JP best-in-class); Azure OpenAI mature
- **Cons**: PostgreSQL Flexible Server không có pgvector built-in stable until recently; OCR strength offset by AWS Textract for general docs

### Option C: GCP (Tokyo)
- **Pros**: Vertex AI mature; BigQuery analytical
- **Cons**: Smaller JP enterprise adoption; DEHA familiarity unknown

## Decision

**Option A — AWS (ap-northeast-1 Tokyo region)**.

### Services chosen (and their phase):

| Phase | Service | Use |
|---|---|---|
| 1 | **RDS PostgreSQL** | Primary DB (ADR-004) |
| 1 | **S3** | Photo, document, backup storage (ADR-006) |
| 1 | **CloudFront** | CDN cho static assets + signed URL cho private content |
| 1 | **ECS Fargate** (or EKS) | NestJS containers; serverless-ish, no node mgmt |
| 1 | **ALB** | Load balancer + WAF |
| 1 | **Route 53** | DNS + health check |
| 1 | **SES** | Email send (F6-04 aftercare notification) |
| 1 | **Secrets Manager** | App secrets |
| 1 | **CloudWatch** | Logs + metrics |
| 1 | **CloudTrail** | Infra audit |
| 1 | **ElastiCache Redis** | BullMQ queue + cache |
| 2 | **OpenSearch managed** | Full-text + analytics (ADR-007) |
| 3 | **Bedrock** | LLM hosting (ADR-019) |
| 3 | **Textract** | OCR for F7-06 (decision: Textract vs Azure Doc Intelligence revisit Phase 3) |
| 3 | **EventBridge Scheduler** | Cron jobs (aftercare check, batch) |

### Compute decision: ECS Fargate vs EC2
- **Chosen: ECS Fargate** for Phase 1 simplicity
- **Alternative**: EKS if team scales >15 dev; or App Runner cho even simpler ops

### Network
- VPC custom với 2 AZ (1a, 1c); private subnet cho RDS/Redis/ECS; public subnet cho ALB; VPC endpoints cho S3/Bedrock
- NAT Gateway cho outbound (cost ~$30/m mỗi AZ — chấp nhận)

## Consequences

### Positive
- Comprehensive service catalog in 1 vendor → simpler vendor management
- Tokyo region: data residency JP compliant
- Bedrock VPC endpoint khi Phase 3 → AI traffic stays in AWS

### Negative
- Vendor lock-in risk (mitigated by ADR-001 modular monolith → swap services within modules)
- AWS cost can grow with Phase 3 AI; budget vigilance needed
- AWS Tokyo có outage history → DR (ADR-013) mitigates

### Cost estimate Phase 1 (rough, monthly USD)
- RDS db.t4g.medium Multi-AZ: ~$120
- ECS Fargate 2× small task: ~$70
- S3 100GB + transfer: ~$30
- ALB + NAT: ~$60
- ElastiCache cache.t4g.micro: ~$25
- CloudFront + SES + DNS + misc: ~$30
- **Total Phase 1 baseline: ~$335/m** (excluding logging, devops account)

## References

- Doc §5.2, §5.3
- Assessment Q1.2
- Related: All other ADRs (cloud is foundation)
