# 01 — System Architecture

**Project**: 藤和建設様 施工管理システム (Construction Management System for Towa Construction)
**Implementer**: DEHA Solutions
**Version**: 1.0 — 2026-05-15
**Status**: Architecture baseline

---

## 1. Mục đích tài liệu

Tài liệu này mô tả kiến trúc hệ thống tổng thể: pattern, layers, components chính, technology stack. Đây là baseline cho toàn bộ thiết kế chi tiết (basic design / detail design / implementation) của 3 phases.

---

## 2. Kiến trúc tổng thể

### 2.1 Pattern lựa chọn

**Modular Monolith** (ADR-001) — 1 deployment đơn nhất chứa nhiều module có boundary rõ rệt.

**Lý do**:
- Scale dự kiến (50 concurrent users, 10K customers, 5K projects) không cần microservice
- Team 7 người không đủ capacity vận hành microservice
- Modular boundary cho phép tách AI module sang microservice ở Phase 3 mà không refactor toàn bộ

**Cấu trúc deployment**:

```
┌──────────────────────────────────────────────────────────┐
│  CDN / Static Hosting (CloudFront + S3)                  │
│  Frontend bundle (React SPA + PWA assets)                │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Application Load Balancer (ALB) + AWS WAF               │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  ECS Fargate Tasks (NestJS application)                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  modules/                                          │  │
│  │   auth, audit, customer, project, quote,          │  │
│  │   aftercare, notification, dashboard, ai…         │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  shared/  database, storage, queue, pdf, ...      │  │
│  └────────────────────────────────────────────────────┘  │
└────┬──────────────┬────────────┬─────────────┬──────────┘
     │              │            │             │
     ▼              ▼            ▼             ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌──────────────┐
│ RDS PG  │   │  S3     │   │ Elasti- │   │ External:    │
│ pgvector│   │ + CRR   │   │ Cache   │   │ SES (email)  │
│ Multi-AZ│   │ Photos  │   │ Redis   │   │ Bedrock (P3) │
└─────────┘   │ + Docs  │   │ (Queue+ │   │ Textract (P3)│
              └─────────┘   │  Cache) │   │ LINE/SMS (P3)│
                            └─────────┘   └──────────────┘
```

### 2.2 Layered view (within Application)

| Layer | Trách nhiệm | Tech |
|---|---|---|
| **Presentation** | HTTP/WS endpoints, validation, serialization | NestJS Controllers + Gateways + DTOs |
| **Application** | Use case orchestration, transactions, policy | NestJS Services |
| **Domain** | Entities, business rules, value objects | TypeScript classes per module |
| **Infrastructure** | DB, storage, queue, external API adapters | Prisma, AWS SDK, BullMQ, ... |

Module ngoại trừ `shared/` đều phải tuân theo 4-layer pattern; cross-module communication chỉ qua public API ở Presentation/Application layer.

---

## 3. Component diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Browser / PWA (React + TS)                       │
│   ┌──────────────────────┐  ┌─────────────────────────────────────┐ │
│   │ Routing (RR6)        │  │ State: Zustand + TanStack Query     │ │
│   │ Ant Design UI        │  │ Service Worker (PWA, Phase 2)       │ │
│   └──────────────────────┘  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ HTTPS REST + WebSocket (P2)
┌─────────────────▼───────────────────────────────────────────────────┐
│                    NestJS API (ECS Fargate)                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Cross-cutting (shared)                          │   │
│  │  AuthGuard | LoggingInterceptor | ExceptionFilter | Tracing │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ auth        │ │ customer    │ │ project      │ │ quote        │ │
│  │ audit       │ │ aftercare   │ │ schedule(P2) │ │              │ │
│  └─────────────┘ └─────────────┘ └──────────────┘ └──────────────┘ │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ notification│ │ photo (P2)  │ │ drawing (P2) │ │ chat (P2)    │ │
│  │ backup      │ │ inspection  │ │ dashboard    │ │ ai (P3)      │ │
│  │ migration   │ │   (P2)      │ │ (P1 basic→P3)│ │              │ │
│  └─────────────┘ └─────────────┘ └──────────────┘ └──────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           shared/ (database, storage, queue, pdf, ...)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────┬──────────────┬───────────────────┘
               │                  │              │
               ▼                  ▼              ▼
        ┌───────────┐      ┌──────────┐     ┌──────────┐
        │ Aurora PG │      │  S3      │     │  Redis   │
        │ + pgvect  │      │ + CRR    │     │ (BullMQ +│
        │           │      │ Photos / │     │  Cache)  │
        │           │      │ Docs     │     │          │
        └───────────┘      └──────────┘     └──────────┘
```

---

## 4. Technology stack baseline

| Layer | Technology | ADR |
|---|---|---|
| **FE Framework** | React 18 + TypeScript (strict) + Vite | ADR-003 |
| **FE UI Library** | Ant Design 5 | ADR-003 |
| **FE State** | Zustand (global), TanStack Query (server) | ADR-003 |
| **FE Form/Validation** | React Hook Form + Zod | ADR-003 |
| **PWA** | vite-plugin-pwa + Workbox (Phase 2) | ADR-010, ADR-011 |
| **BE Framework** | NestJS 10 (Node.js 20 LTS) | ADR-002 |
| **BE ORM** | Prisma | ADR-002, ADR-004 |
| **BE Real-time** | Socket.IO + @socket.io/redis-adapter (Phase 2) | ADR-008 |
| **BE Queue** | BullMQ (Redis-backed) | ADR-002 |
| **BE PDF** | Puppeteer (worker process) | ADR-002 |
| **Database** | AWS RDS PostgreSQL 16 + pg_bigm + pgvector + pg_trgm | ADR-004 |
| **Search Phase 1** | PG FTS (GIN + pg_bigm + pg_trgm) | ADR-007 |
| **Search Phase 2+** | AWS OpenSearch managed | ADR-007 |
| **Object Storage** | AWS S3 + CloudFront signed URL + Lifecycle Policy | ADR-006 |
| **Caching** | AWS ElastiCache (Redis 7.x) | ADR-005 |
| **Email** | AWS SES | ADR-005 |
| **LLM (Phase 3)** | AWS Bedrock (Claude family) | ADR-019 (deferred) |
| **Vector DB (P3)** | pgvector trên RDS | ADR-020 (deferred) |
| **OCR (Phase 3)** | AWS Textract (revisit vs Azure Document Intelligence) | ADR-019 |
| **Compute** | AWS ECS Fargate | ADR-005 |
| **CI/CD** | GitHub Actions + AWS ECR | ADR-009 |
| **Region** | ap-northeast-1 (Tokyo) + ap-northeast-3 (Osaka DR) | ADR-005, ADR-013 |
| **Monitoring** | CloudWatch Logs + Metrics + X-Ray; PagerDuty/OpsGenie alerting | ADR-005 |
| **IaC** | Terraform hoặc AWS CDK (TBD — pick before Phase 1 start) | — |

---

## 5. Cross-cutting concerns

### 5.1 Logging
- Structured JSON logs (Pino) with `traceId`, `userId`, `module`, `action`
- All logs to stdout → CloudWatch Logs với retention policy
- Sensitive field redaction (password, token, PII bulk)

### 5.2 Tracing
- OpenTelemetry SDK with auto-instrumentation
- Sample 100% in dev/staging, 10-20% in prod (trace + on-error always)
- Export to AWS X-Ray (or Datadog if separate decision)

### 5.3 Metrics
- Application metrics: request count, latency (p50/p95/p99), error rate
- Business metrics: active users, # projects, # quotes/day, AI calls/cost (Phase 3)
- Infrastructure metrics from CloudWatch (CPU, memory, RDS connections, queue depth)

### 5.4 Error handling
- Typed error hierarchy: `AppError` → `NotFoundError`, `PermissionError`, `ValidationError`, `ConflictError`, `IntegrationError`
- Global exception filter → standardized JSON error response: `{ code, message, details, traceId }`
- Client-side: React Error Boundary + global toast

### 5.5 Internationalization
- UI: react-i18next; default ja-JP; future support en/vi if needed
- Date/time: `dayjs` with locale; show in 西暦 default (toggle 和暦 in user prefs)
- Number: Japanese yen format (`¥1,234,567`); standard SI for measurements

### 5.6 Time zone
- All timestamps UTC in DB
- Display in user's TZ (default Asia/Tokyo)
- Date-only fields (e.g., `handover_date`, `quote.issued_at`) stored as DATE (no TZ)

---

## 6. Phase evolution

### Phase 1 (MVP, 4 tháng — 119 人日)
- Core modules: auth, audit, backup, customer, project, quote, aftercare, notification, migration, dashboard(basic)
- Desktop-only (no PWA)
- Email-only notification
- No AI, no chat, no photo, no inspection, no schedule (basic only)

### Phase 2 (5-8 tháng — 67 人日, "現場DX")
- New modules: schedule, photo, drawing, chat, inspection
- PWA mobile shell (ADR-010)
- WebSocket realtime (ADR-008)
- OpenSearch added (ADR-007)
- Web Push notifications

### Phase 3 (9-12 tháng — 70 人日, "AI高度化")
- New modules: dashboard(advanced tier), ai
- Bedrock + pgvector activation
- LINE/SMS notification channels
- F7-01/F7-02 advanced charts; F7-03→F7-06 AI features

---

## 7. Architecture invariants (must hold across phases)

1. **Single deployment unit** — Don't split into microservices without explicit ADR
2. **Module boundary** — Enforced by `eslint-plugin-boundaries`; no cross-module internal imports
3. **AI module isolated** — Other modules MUST NOT import from `ai/` in Phase 1
4. **Single PostgreSQL source of truth** — No data duplication outside DB except S3 file content and OpenSearch index (eventually consistent)
5. **No client-direct DB access** — All access via NestJS API
6. **Audit log mandatory** — Every state mutation logged
7. **No data leaves AWS** — All AI/ML processing within AWS Bedrock (ADR-019)
8. **JP region** — All data in ap-northeast-1 (primary) + ap-northeast-3 (DR)

---

## 8. Open items / Risks

| Item | Severity | Mitigation |
|---|---|---|
| RDS RTO 4h tight with backup-only DR | M | Renegotiate or upgrade to warm standby (ADR-013) |
| Bedrock model availability in ap-northeast-1 not verified | M | Verify before Phase 3 kickoff (ADR-019 revisit) |
| pg_bigm JP tokenization quality | L | Monitor search quality; can swap to OpenSearch earlier if poor |
| Data migration quality 5-15% rejection rate | M | Iteration cycle, dry-run mode (ADR-018) |
| Subscription billing model for Towa SaaS not finalized | M | Contractual; resolve before Phase 1 launch |

---

## 9. Related documents

- [02 — Module Architecture](./02-module-architecture.md)
- [03 — Frontend Architecture](./03-frontend-architecture.md)
- [04 — Database Design](./04-database-design.md)
- [05 — Backend Architecture](./05-backend-architecture.md)
- [06 — Security Architecture](./06-security-architecture.md)
- [07 — Deployment Architecture](./07-deployment-architecture.md)
- [08 — MVP Scope & Roadmap](./08-mvp-scope-and-roadmap.md)
- All ADRs in `.claude/memory-bank/master/architecture-dehasol/architect/decisions/`
