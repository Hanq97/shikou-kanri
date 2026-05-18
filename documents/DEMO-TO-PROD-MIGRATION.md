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

**Status**: 🟡 Read-only viewer real, write infra deferred
**Built**: W2 D1-D2

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Viewer endpoint + UI | 🟢 Real (admin can browse 114+ logs at /admin/audit-logs) | — |
| Audit write path | 🟡 Synchronous (writes block primary op briefly) | Async queue (BullMQ) to avoid latency spikes |
| Long-term storage | 🟡 All logs in single PG table | S3 archival for logs > 1 year, partition by month |
| Log retention policy | 🔴 No purge | Configurable retention + automated archival job |

## F8-04 — バックアップ・リストア — Phase 1 Core

**Status**: 🔴 Mock UI only
**Built**: W2 D3

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Backup list page | 🔴 8 hardcoded backup rows in `BackupsListPage.tsx` (`INITIAL_BACKUPS`) | Query AWS RDS automated snapshot API + show real S3 CRR state |
| "Backup now" button | 🔴 3s fake spinner + prepend new row | Trigger real RDS manual snapshot via SDK |
| "Restore" button | 🔴 5s fake spinner + success modal | Real restore workflow: confirm → trigger PITR → audit log entry → notify ops |
| Retention display | 🔴 Static 30/90 days | Pull from RDS instance config |

## Migration tool — Phase 1 Core

**Status**: 🔴 Mock UI (customer tab links to real)
**Built**: W2 D3

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| Customer CSV | 🟢 Real (link to existing `/admin/customer-import`) | — |
| Property CSV upload | 🔴 Real file accept, fake parse (2s) → random row count | Extend `customer-import.service.ts` pattern: parse → validate → upsert property with FK to customer email |
| 引渡日 CSV | 🔴 Same mock as property | Property address match → update handover_date → trigger schedule regeneration |
| Validation step | 🔴 Random fake invalid count | Real per-row Zod validation with line-level error reporting |
| Import progress | 🔴 4s delay then "done" | Stream progress via WebSocket or polling |

## BD-01 — Home Dashboard

**Status**: 🟢 Real widgets wired to F1/F2/F6
**Built**: W2 D4-D5

| Mục | Demo state | Prod-grade upgrade |
|---|---|---|
| 4 KPI cards | 🟢 Real counts from DB | — |
| Aftercare 14d alerts | 🟢 Real query | — |
| Pending quote approvals | 🟢 Real query | — |
| Recent activity feed | 🟡 Merged from 3 sources at query time | Pre-aggregated activity_log table for faster query at scale |
| Chart visualizations | 🔴 Not in scope (deferred to Phase 3 F7-01/02) | Real-time charts via recharts + materialized views |

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
