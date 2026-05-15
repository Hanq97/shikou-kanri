# 00 — Architecture Overview

**Project**: 藤和建設様 施工管理システム (Towa Construction — Construction Management System)
**Implementer**: DEHA Solutions
**Version**: 1.0 — 2026-05-15
**Status**: Architecture baseline established

---

## 1. Executive Summary

藤和建設株式会社 (Towa Construction) — công ty xây dựng tổng hợp 50+ năm tại Saitama-Tokorozawa với ~2,000 OB customers — đang muốn DX-ify toàn bộ vòng đời business: 新築 / リフォーム / アフター / 検査 / 見積 / 工程. 

DEHA Solutions thiết kế hệ thống施工管理 cloud-based theo lộ trình 3 phases trong 12 tháng:
- **Phase 1 (MVP, 4 tháng)** — 基幹一元化: customer + project + quote + aftercare cơ bản, no AI no mobile
- **Phase 2 (4 tháng)** — 現場DX: mobile PWA, photo, drawing, chat, inspection, schedule
- **Phase 3 (4 tháng)** — AI高度化: AI 見積補助, dashboard, AI search, chatbot, OCR, LINE/SMS

Kiến trúc lựa chọn: **Modular Monolith trên NestJS + React + AWS Tokyo** với clear module boundary để extend AI sau, single-tenant cho Towa với DEHA-managed SaaS model.

---

## 2. Documents Index

### Architecture documents (this folder)

| # | Document | Focus |
|---|---|---|
| 00 | [Overview](./00-overview.md) | This document — summary + index |
| 01 | [System Architecture](./01-system-architecture.md) | Patterns, components, stack baseline |
| 02 | [Module Architecture](./02-module-architecture.md) | 16 modules, boundary, dependencies |
| 03 | [Frontend Architecture](./03-frontend-architecture.md) | React stack, routing, state, PWA |
| 04 | [Database Design](./04-database-design.md) | Schema, indexes, migration, FTS, 電帳法 |
| 05 | [Backend Architecture](./05-backend-architecture.md) | NestJS layers, jobs, real-time, PDF |
| 06 | [Security Architecture](./06-security-architecture.md) | AuthN/Z, encryption, compliance, threat model |
| 07 | [Deployment Architecture](./07-deployment-architecture.md) | AWS topology, CI/CD, DR, ops |
| 08 | [MVP Scope & Roadmap](./08-mvp-scope-and-roadmap.md) | Phase 1 detail, Phase 2/3 evolution |

### Working artifacts (in `.claude/memory-bank/master/architecture-dehasol/architect/`)

- `domain-knowledge.md` — Domain knowledge base (8 sections)
- `assessment.md` — Architecture assessment (interview output)
- `feature-map.md` — 44 features mapped + dependency graph
- `interview-plan.md` — Interview plan executed
- `adr-list.md` — Index of 21 ADRs
- `decisions/ADR-001` to `ADR-021` — Architecture Decision Records
- `catalogs/stakeholder-roles.md` — 7 roles + permission matrix
- `catalogs/entity-catalog.md` — 14 entity Phase 1 + future entities
- `catalogs/module-catalog.md` — 16 module contracts

### Reference source

- `藤和建設様_施工管理システム_統合ドキュメント.md` — Original requirements doc (Part 1: SRS + Part 2: 42 features detail)

---

## 3. Key Architectural Decisions (Summary)

### Stack (all Phase 1)
| Area | Choice | ADR |
|---|---|---|
| System Architecture | Modular Monolith | ADR-001 |
| Backend | NestJS 10 + Node.js 20 + Prisma | ADR-002 |
| Frontend | React 18 + TypeScript + Vite + Ant Design | ADR-003 |
| Database | PostgreSQL 16 (RDS) + pgvector + pg_bigm + pg_trgm | ADR-004 |
| Cloud | AWS Tokyo (ap-northeast-1) + Osaka DR | ADR-005 |
| Object Storage | S3 with lifecycle policy + CRR | ADR-006 |
| Search | PG FTS Phase 1 → OpenSearch Phase 2+ | ADR-007 |
| CI/CD | GitHub Actions + ECR + ECS Fargate | ADR-009 |
| Real-time | Socket.IO + Redis adapter (Phase 2) | ADR-008 |

### Mobile & UX (Phase 2)
| Area | Choice | ADR |
|---|---|---|
| Mobile | PWA only (Phase 2 launch) | ADR-010 |
| Offline | Photo queue + background sync | ADR-011 |

### Operations
| Area | Choice | ADR |
|---|---|---|
| Tenancy | Single-tenant cho Towa | ADR-012 |
| Disaster Recovery | Backup-based, cross-region replication | ADR-013 |
| Deployment Ownership | DEHA-managed SaaS | ADR-014 |

### Security & Compliance
| Area | Choice | ADR |
|---|---|---|
| Identity | Email/PW Phase 1 → SSO (Google) Phase 2 | ADR-015 |
| 2FA | Optional + Admin-mandatory | ADR-016 |
| 電帳法 Compliance | DB-based 訂正削除履歴 + 検索要件 | ADR-017 |
| Data Migration | CSV one-shot tool, OB customer + property + 引渡日 | ADR-018 |

### AI (all Deferred to Phase 3)
| Area | Choice | ADR |
|---|---|---|
| LLM Hosting | AWS Bedrock (VPC endpoint) | ADR-019 (deferred) |
| Vector DB | pgvector on RDS | ADR-020 (deferred) |
| AI Gateway | Custom thin abstraction | ADR-021 (deferred) |

---

## 4. Feature Inventory

**44 features** organized into 8 categories from doc + 1 added (BD-01 Home Dashboard).

### Phase 1 — MVP (23 features, 119 人日)

Foundation:
- **F8 共通・基盤**: F8-01 認証, F8-02 ロール, F8-03 監査, F8-04 バックアップ

Customer & Project:
- **F1 顧客・案件**: F1-01 顧客マスタ, F1-02 物件, F1-03 案件, F1-04 工事履歴, F1-05 担当者・権限, F1-06 検索, F3-06 案件フォルダ

Quote:
- **F2 見積**: F2-01 見積作成, F2-02 単価マスタ, F2-03 過去流用, F2-04 PDF, F2-05 ステータス

Aftercare:
- **F6 アフター**: F6-01 OB顧客, F6-02 自動通知, F6-03 履歴, F6-04 メール連携

Tools:
- **Migration tool** (CLI for OB customer + property import)
- **BD-01 Home Dashboard (basic)** — status counts, aftercare alerts, pending approvals, recent activity

### Phase 2 — Important (14 features, 67 人日)
- **F3 工程・現場**: F3-01 ガント, F3-02 RT共有, F3-03 写真, F3-04 電子黒板, F3-05 図面
- **F4 コミュニケーション**: F4-01 チャット, F4-02 添付, F4-03 招待, F4-04 通知, F4-05 未読
- **F5 検査**: F5-01 登録, F5-02 是正, F5-03 PDF
- **F8-05 モバイル (PWA)**

### Phase 3 — Nice-to-have (8 features, 70 人日) — all AI
- **F2-06** AI 見積補助
- **F6-05** LINE/SMS 通知
- **F7 ダッシュボード**: F7-01 進捗, F7-02 売上, F7-03 AI類似検索, F7-04 AI予測, F7-05 AIチャットbot, F7-06 OCR

---

## 5. Technology Stack at a Glance

```
┌──────────────────────────────────────────────────────────┐
│              Browser / PWA (Phase 2+)                    │
│  React 18 · TS · Vite · Ant Design · Zustand · TanStack │
│  Q · React Hook Form + Zod · Workbox PWA · Socket.IO    │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS REST + WS
┌────────────────────▼─────────────────────────────────────┐
│              AWS ALB + WAF                               │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│       ECS Fargate (Modular Monolith)                     │
│  NestJS 10 · Node.js 20 · Prisma · BullMQ · Puppeteer   │
│  Socket.IO + Redis adapter · Passport JWT · Pino · OTel │
│  16 modules: auth/audit/backup/customer/project/quote/  │
│  aftercare/notification/migration/dashboard/[+5 P2]/[ai]│
└──┬──────────────┬─────────┬─────────────┬───────────────┘
   │              │         │             │
   ▼              ▼         ▼             ▼
┌─────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐
│ RDS PG  │  │  S3    │  │ ElastiC- │  │ SES (P1)     │
│ Multi-AZ│  │ + CRR  │  │ ache R-  │  │ Bedrock (P3) │
│ pg_bigm │  │ Tier-  │  │ edis     │  │ Textract(P3) │
│ pgvector│  │  ing   │  │ (Queue + │  │ LINE/SMS(P3) │
│         │  │        │  │  Cache)  │  │              │
└─────────┘  └────────┘  └──────────┘  └──────────────┘
```

---

## 6. Cross-Phase Invariants

These principles hold regardless of phase:

1. **Single deployment unit** — Modular Monolith
2. **Module boundary enforced** — lint-checked
3. **AI module isolated** until Phase 3
4. **Single PG source of truth** — no data duplication except S3 file content + OpenSearch index
5. **No client-direct DB access** — all via NestJS API
6. **Audit log mandatory** — every state mutation logged
7. **No data leaves AWS** — AI/ML in Bedrock with VPC endpoint
8. **JP region only** — ap-northeast-1 primary + ap-northeast-3 DR

---

## 7. Critical Risks Tracking

| Risk | Severity | Owner | Mitigation status |
|---|---|---|---|
| RDS RTO 4h tight with backup-only DR | M | DEHA ops | Renegotiate target OR upgrade to warm standby — pending |
| Bedrock model availability ap-northeast-1 | M | DEHA architect | Verify before Phase 3 — pending |
| pg_bigm JP tokenization quality | L | DEHA BE | Monitor Phase 1; can swap to OpenSearch — open |
| Data migration quality 5-15% rejection | M | DEHA BA + Towa | Iteration cycle in plan — planned |
| SSO provider not finalized | L | DEHA BA + Towa | Confirm during basic design Phase 1 — open |
| Subscription billing model not finalized | M | DEHA business | Resolve before Phase 1 launch — pending |
| Migration source software unknown | M | DEHA BA + Towa | Investigation during basic design — open |
| RTO 4h with backup-based DR | M | DEHA ops | Already flagged; revisit with Towa | (duplicate above) |

---

## 8. Open Questions (for basic design phase)

To resolve during /design --srs and /design --basic phases:

1. SSO provider specific (Google Workspace assumed; confirm with Towa)
2. Migration source software name and export format
3. Drawing file format scope (PDF/JPG only? CAD/DWG support needed?)
4. Bedrock model availability in ap-northeast-1 (verify)
5. Subscription pricing model details
6. Helpdesk ticketing system selection (existing DEHA?)
7. Monitoring tool choice — CloudWatch only or augment with Datadog/New Relic
8. IaC tool choice — Terraform vs AWS CDK
9. UI Component library final — Ant Design vs MUI (proposed AntD)
10. Charts library — Recharts vs ECharts vs Syncfusion

---

## 9. Quality Gates (per EPS Framework)

Documents adhere to:

| Gate | Status |
|---|---|
| Q1 (≥80% evidence) | ✅ Decisions backed by ADRs + assessment + reference doc |
| Q2 (Unique IDs) | ✅ ADR-NNN, F#-NN naming |
| Q3 (Bilingual ≥60%) | ⚠️ Documents bằng tiếng Việt với JP terms; bản dịch JP có thể được sinh sau nếu cần cho Towa stakeholder |
| Q4 (Interfaces only) | ✅ Architecture-level only; no implementation code |

---

## 10. Next Steps

After /architect complete:

1. **/design --srs** — Detailed software requirement specification per feature
2. **/design --basic** — Basic design (画面遷移, API contracts, DB tables) for Phase 1 features
3. **/design --detail** — Detail design for first sprint's features
4. **/plan** — Sprint planning + task breakdown
5. **/execute** — Implementation
6. **/validate** — QA + UAT

---

## 11. Document Maintenance

- Architecture documents are **living documents** — update khi:
  - Major decisions change (create new ADR + supersede if needed)
  - Phase transitions (Phase 1 → 2 → 3)
  - Quarterly review
- Version control via git
- Change log appended at end of each document on major edits

---

**Architecture baseline established. Ready for detailed design.**

— DEHA Solutions Architect Team, 2026-05-15
