# Demo-to-Production Migration Tracking

**Purpose**: Track every demo-grade implementation that needs upgrade for production.

**Context**: Per pivot decision 2026-05-19, features after F2-quote are built **demo-grade** (mock data + UI completeness) for sales demo within ~2 months. Architecture/schema/API surface are kept **production-ready**; service-layer logic may be simplified or mocked. This document is the canonical list of what to revisit when moving to production.

---

## How to use

- **Each demo feature** adds one section here when work starts.
- **Convention in code**: mock service methods carry comment `// MOCK-IMPL: see DEMO-TO-PROD-MIGRATION.md#<anchor>` for grep-ability.
- **Update on every commit** that introduces or resolves mock logic.
- **At productization**, work top-down: items higher in this file are higher priority (touch core domain) than lower (UX polish).

---

## Status legend

| Symbol | Meaning |
|---|---|
| 🟢 | Prod-grade — no migration needed |
| 🟡 | Demo-grade with minor gaps (config/secrets/scaling) |
| 🔴 | Demo-only (mock data, fake responses, hardcoded behavior) |

---

## F6 — アフター (Aftercare) — Phase 1 Core

**Status**: In progress (W1 of 2-month pivot)
**Built**: 2026-05-19 — TBD

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Daily batch trigger | 🟡 `@nestjs/schedule` cron at 8:00 JST single-instance | Distributed lock (Redis or PG advisory lock) for multi-instance; retry with exponential backoff; failure alerting via Sentry/Slack |
| Email send (F6-04) | 🟡 Nodemailer → MailHog dev SMTP | AWS SES production + suppression list + bounce/complaint webhook handling + DKIM/SPF |
| Email template i18n | 🔴 Hardcoded Japanese | Handlebars partials per locale (ja/en/vi) — defer per `tech_debt_email_i18n` |
| Schedule regeneration on property update | 🟡 Manual API trigger only | Auto-regen on `property.handover_date` change via service event or DB trigger |
| Daily batch logging | 🟡 Console log | Structured logs with stats (count notified, count overdue) → Cloudwatch/Pino |
| Bulk operations (cancel/reschedule N schedules) | 🔴 Not implemented | Add bulk endpoints + UI buttons for operations staff efficiency |
| LINE/SMS notification (F6-05) | 🔴 Phase 3 — not in scope | LINE Messaging API + SMS gateway (Twilio/Plivo) |
| Customer email opt-out | 🔴 Not implemented (always send) | Per-customer notification preference (email/LINE/none) + unsubscribe footer |
| Maintenance schedule recurrence rules | 🟡 Fixed 4 milestones (+1y/3y/5y/10y) | Configurable per property/customer type via admin UI |

**Demo-only seed data** (will NOT carry to prod):
- 7 hardcoded customers (`佐藤`, `鈴木`, `高橋`, `渡辺`, `伊藤`, `山本`, `中村`)
- 11 hardcoded properties in Tokyo wards with date-shifted handover dates
- 56 auto-generated schedules + 9 aftercare records

→ Real customer/property data must be imported via the Migration tool (separate W2 task).

---

## F8-03 — 監査ログ (Audit Log) — Phase 1 Core

_To be filled when W2 starts._

## F8-04 — バックアップ・リストア — Phase 1 Core

**Planned status**: 🔴 UI giả (Phase 2)

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Backup list page | 🔴 Mock data (static backup history rows) | Wire to RDS automated snapshot API |
| Restore button | 🔴 Fake spinner + success modal | Real restore workflow with confirmation + audit log |
| Backup schedule config | 🔴 Read-only display | Editable cron via admin UI |

## Migration tool — Phase 1 Core

**Planned status**: 🔴 UI giả

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| CSV upload wizard | 🔴 Real upload but fake parse animation + canned success | Real CSV parsing via existing F1 import infra extended to property+handover_date |

## BD-01 — Home Dashboard

_To be filled when W2 starts. Plan: real widgets wiring to F1/F2/F6 counts._

---

## Phase 2 — Important Features

### F8-05 PWA shell
_TBD_

### F3-01 Gantt 工程表
**Planned**: 🟡 Drag-drop UI real, save to DB real, but no realtime collab

### F3-02 Realtime sync
**Planned**: 🔴 setInterval fake refresh; no WebSocket

### F3-03 写真 + F3-04 電子黒板
**Planned**: 🟢 Real upload + canvas composite (khách bấm thật)

### F3-05 図面
**Planned**: 🟡 Real PDF view + marker pin DB-backed, no version diff

### F4 chat (F4-01〜F4-05)
**Planned**: 🟢 Real messages persisted (khách demo flow đi-về)

### F5 検査 (F5-01〜F5-03)
**Planned**: 🟡 Real forms, canned PDF output

---

## Phase 3 — AI Features (Template + Keyword matching)

All implementations are **🔴 mock-as-real**. Real LLM/RAG/Bedrock deferred to post-demo customer commitment.

### F2-06 AI 見積補助

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Suggestion engine | 🔴 Keyword overlap on past_quotes table → return top 3 | Real RAG via Bedrock + pgvector embeddings |
| Confidence score | 🔴 Random 75-95% | Real cosine similarity score |

### F7-01 進捗ダッシュボード + F7-02 売上ダッシュボード

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Charts data | 🔴 Seeded `dashboard_metrics` table with mock time-series | Aggregate from real project/quote tables (materialized view) |

### F7-03 AI 類似案件検索

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Search backend | 🔴 Trigram fuzzy match labeled "AI semantic search" | pgvector cosine similarity + Bedrock embedding API |

### F7-04 受注トレンド分析

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Forecast line | 🔴 Linear regression on seeded historical points + canned 30-day forecast | Real ARIMA/Prophet model + seasonality |

### F7-05 AI チャットボット

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Q&A engine | 🔴 `chatbot_qa` table (question_keyword → answer_template) + typing animation | Real Bedrock RAG over docs + conversation memory |

### F7-06 OCR 見積書取込

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| OCR backend | 🔴 Pre-baked `ocr_samples` JSON keyed by uploaded filename | AWS Textract + post-processing pipeline |

### F6-05 LINE/SMS 通知

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Channel toggle | 🔴 UI button "LINEで送信" with fake success toast | Real LINE Messaging API + SMS gateway integration |

---

## Cross-cutting concerns (track separately)

### Authentication
🟢 Prod-grade (F8-AUTH completed full-stack).

### RBAC
🟢 Prod-grade.

### Audit logging
🟡 Stub service in place — F8-03 will productize.

### Email infrastructure
🟡 Nodemailer + MailHog dev. SES wiring deferred to deployment phase.

### Observability
🟡 Pino logs. APM/metrics deferred to Phase 2.

### CI/CD
🟢 GitHub Actions running lint + typecheck + build. Test coverage gate pending.

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-05-19 | Document created during F6-aftercare W1 start | Claude (with hanq97) |
