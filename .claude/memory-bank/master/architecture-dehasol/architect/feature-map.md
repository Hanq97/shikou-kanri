# Feature Map: 藤和建設様 施工管理システム

**Generated**: 2026-05-15
**Source**: Reference doc (42 features) + Architecture Assessment + 21 ADRs
**MVP scope**: Phase 1 = Core; Phase 2 = Important; Phase 3 = Nice-to-have

---

## Classification Summary

| Category | Phase | Count | 概算工数 (人日) | % |
|---|---|---|---|---|
| **Core (MVP)** | Phase 1 | **23** (22 từ doc + 1 added) | **119** (112 + 7) | ~47% |
| **Important** | Phase 2 | 13 | 67 | 26% |
| **Nice-to-have** | Phase 3 | 8 | 70 | 27% |
| **Total** | All | **44** | **256** | 100% |

**Added to MVP (post-classification adjustment, 2026-05-15)**:
- `BD-01 Home Dashboard (basic)` — non-AI, non-chart-heavy home screen với widgets cơ bản (status counts, aftercare alerts, recent activity). UX necessity cho MVP. **Phase 3 F7-01/F7-02 vẫn giữ** cho chart-heavy + 売上 view.

---

## Core Features (MVP — Phase 1, 22 features)

| ID | Feature | Description | Module | Depends on | ADR refs |
|---|---|---|---|---|---|
| **F8-01** | ユーザー認証 (email/pw) | Email/password login, password reset, session 30min | `auth` | — | ADR-015 |
| **F8-02** | ロール・権限管理 | 3階層 role + per-project ACL | `auth` | F8-01 | ADR-015, ADR-001 |
| **F8-03** | 監査ログ | Audit trail for critical ops, 2-year retention | `audit` | F8-01 | ADR-004 |
| **F8-04** | バックアップ・リストア | RDS auto backup + S3 CRR + manual restore | `backup` | — | ADR-013 |
| **F1-01** | 顧客マスタ管理 | OB customer CRUD with fuzzy search 氏名/電話/住所 | `customer` | F8-02 | ADR-004, ADR-007 |
| **F1-02** | 物件情報管理 | Per-customer property, with 引渡日 trigger | `customer` | F1-01 | ADR-004 |
| **F1-03** | 案件登録・ステータス管理 | Project lifecycle 見積→受注→着工→完成→引渡し | `project` | F1-01, F1-02 | ADR-004 |
| **F1-04** | 工事履歴の紐付け管理 | Customer timeline view of all projects | `customer` | F1-03 | — |
| **F1-05** | 担当者・権限管理 | Project member assignment, per-project role override | `project` | F1-03, F8-02 | ADR-001 |
| **F1-06** | 案件検索・絞り込み | Multi-condition search + CSV export + saved filter | `project` | F1-03 | ADR-007 |
| **F3-06** | 案件フォルダ自動生成 | Auto-create folder structure on project creation | `project` | F1-03 | ADR-006 |
| **F2-01** | 見積書作成 | Quote with line items, tax calc, 下書き/確定 | `quote` | F1-03, F2-02, F2-03 | ADR-004, ADR-017 |
| **F2-02** | 単価マスタ管理 | Unit price master, CSV import, version history | `quote` | F8-02 | ADR-004 |
| **F2-03** | 過去見積の流用・複製 | Clone past quote with % adjustment | `quote` | F2-01 | — |
| **F2-04** | 見積書PDF出力 | PDF generation with company seal | `quote` | F2-01 | ADR-002 (Puppeteer) |
| **F2-05** | 見積ステータス管理 | Quote lifecycle ドラフト→承認→送付→受注/失注 | `quote` | F2-01 | ADR-017 |
| **F6-01** | OB顧客リスト管理 | OB customer list with 次回点検時期 sorting | `aftercare` | F1-01, F1-02 | — |
| **F6-02** | 点検時期自動通知 | Auto-generate maintenance schedule from 引渡日; 14日前 pre-notify | `aftercare` | F1-02, F6-04 | ADR-004 (batch) |
| **F6-03** | アフター対応履歴管理 | After-care record per customer | `aftercare` | F6-01 | — |
| **F6-04** | メール通知連携 | SES-based email notification with template | `notification` | F8-01 | ADR-005 (SES) |
| **(Migration)** | データ移行ツール | CSV import for customer + property history | `migration` (CLI) | — | ADR-018 |
| **BD-01** | **Home Dashboard (basic)** | **Home screen S02 với basic widgets: status counts, aftercare alerts 14d, pending approvals, quick actions, recent activity. No charts, no AI.** | `dashboard` (basic tier) | F1-03, F2-05, F6-02 | — |
| **(Infra)** | 共通基盤 / Modular monolith | Modular NestJS monolith, AWS infra Tokyo | `shared/*` | — | ADR-001 → ADR-014 |

> **Note**: Migration tool và infrastructure không nằm trong 42 features list của doc nhưng cần thiết cho MVP launch.

---

## Important Features (Phase 2 — 12 features)

| ID | Feature | Description | Module | Depends on | ADR refs |
|---|---|---|---|---|---|
| **F8-05** | モバイル対応 (PWA) | PWA with service worker + manifest | `(全体)` | All Phase 1 | ADR-010 |
| **F3-01** | 工程表作成・編集 (Gantt) | Gantt chart UI, drag-drop, dependencies, 10+ templates | `schedule` | F1-03 | ADR-003 (Gantt lib) |
| **F3-02** | 工程表リアルタイム共有 | WebSocket-based broadcast on schedule update | `schedule` | F3-01 | ADR-008 |
| **F3-03** | 現場写真撮影・アップロード | Mobile photo capture, offline queue, GPS metadata | `photo` | F1-03 | ADR-006, ADR-011 |
| **F3-04** | 電子黒板 | Composite chalkboard info onto photo | `photo` | F3-03 | ADR-006 (Lambda processing) |
| **F3-05** | 図面管理・マーカー機能 | PDF/image drawing, marker pins, before/after photo | `drawing` | F1-03, F3-03 | ADR-003 (react-pdf) |
| **F4-01** | 案件チャット・掲示板 | Per-project threaded chat with search | `chat` | F1-03 | ADR-008 (WebSocket) |
| **F4-02** | ファイル・画像添付 | Attach files up to 20MB in chat | `chat` | F4-01 | ADR-006 |
| **F4-03** | 職人・協力業者の招待 | Email-based invite with token, per-project ACL | `auth` | F1-05 | ADR-015 |
| **F4-04** | 通知 (Push/Email) | Web Push (PWA) + email, per-user channel pref | `notification` | F4-01, F8-05 | ADR-010 |
| **F4-05** | 未読管理・既読確認 | Per-message read receipts | `chat` | F4-01 | ADR-008 |
| **F5-01** | 検査登録・実施管理 | Inspection templates with 合否/photo/comment | `inspection` | F1-03, F3-03 | — |
| **F5-02** | 是正ワークフロー | 3-step 依頼→完了→承認 with before/after photo | `inspection` | F5-01 | ADR-004 |
| **F5-03** | 検査帳票PDF出力 | Inspection report PDF with before/after photo | `inspection` | F5-01, F5-02 | ADR-002 |

> Phase 2 total: **13 features** (count includes F8-05 + 12 from F3/F4/F5)

---

## Nice-to-have Features (Phase 3 — 8 features)

> All Phase 3 features are **AI-related** (deferred per user decision, ADR-019/020/021 mark "Deferred").

| ID | Feature | Description | Module | Depends on | ADR refs |
|---|---|---|---|---|---|
| **F2-06** | AI 見積補助 | RAG-based similar quote suggestion | `ai` | F2-01, F2-03 | ADR-019, ADR-020, ADR-021 |
| **F6-05** | LINE/SMS 通知連携 | LINE official + SMS API | `notification` | F6-04 | (no ADR; integration) |
| **F7-01** | 案件進捗ダッシュボード | Project status visualization | `dashboard` | F1-03 | ADR-003 (charts) |
| **F7-02** | 売上・粗利可視化 | Revenue / gross margin charts | `dashboard` | F1-03, F2-05 | ADR-003 |
| **F7-03** | AI 類似案件検索 | Semantic project search via pgvector | `ai` | F1-03 | ADR-019, ADR-020 |
| **F7-04** | 受注トレンドAI分析 | Forecast + seasonality | `ai` | F1-03, F2-05 | ADR-019 |
| **F7-05** | AIチャットボット (社内Q&A) | RAG chatbot over docs/projects | `ai` | All data sources | ADR-019, ADR-020, ADR-021 |
| **F7-06** | OCR 見積書取込 | Scan supplier quote → structured data | `ai` | F2-01 | ADR-019 (or Textract) |

---

## Dependency Graph (ASCII)

```
                       ┌──────────────────────────────────────┐
                       │     INFRA (Phase 1 foundation)       │
                       │  ADR-001 Modular Monolith            │
                       │  ADR-002 NestJS + ADR-003 React      │
                       │  ADR-004 RDS PG + ADR-005 AWS Tokyo  │
                       │  ADR-006 S3 + ADR-009 GitHub Actions │
                       └────────────────┬─────────────────────┘
                                        │
                       ┌────────────────▼─────────────────────┐
                       │   F8 共通・基盤 (Phase 1 Core)        │
                       │   F8-01 認証 ─→ F8-02 権限            │
                       │   F8-03 監査 ・ F8-04 バックアップ      │
                       └─────┬──────────────────┬─────────────┘
                             │                  │
       ┌─────────────────────▼─────┐     ┌──────▼──────────────┐
       │  F1 顧客・案件 (Core)      │     │  Migration Tool      │
       │  F1-01 顧客 ──→ F1-02 物件 │◀────┤  CSV → customer+    │
       │     ▼              ▼        │     │  property+引渡日    │
       │  F1-03 案件 ◀──────┘        │     └─────────────────────┘
       │     │                       │
       │  F1-04 履歴, F1-05 担当,    │
       │  F1-06 検索, F3-06 フォルダ │
       └─────┬────────┬──────────────┘
             │        │
   ┌─────────▼──┐  ┌─▼─────────────────────────────────┐
   │  F2 見積    │  │  F6 アフター (Core)                │
   │ (Core)     │  │  F6-01 OB ─→ F6-02 自動通知       │
   │ F2-01〜05  │  │  F6-03 履歴 ・ F6-04 メール        │
   │            │  │      ▲ uses F1-02.引渡日            │
   └─────┬──────┘  └──────┘
         │  uses F2-02 単価マスタ
         ▼
   ╔═════════════════════════════════════════════════════════════╗
   ║                  END OF MVP / PHASE 1                       ║
   ╠═════════════════════════════════════════════════════════════╣
   ║                                                             ║
   ║         PHASE 2 — Important Features (現場DX)               ║
   ║                                                             ║
   ╚═════════════════════════════════════════════════════════════╝
            │
   ┌────────▼────────┐  ┌─────────────────┐  ┌────────────────┐
   │  F8-05 PWA       │  │ F3 工程・現場   │  │ F4 コミュニケ  │
   │ (mobile shell)   │  │ F3-01 ガント    │  │ F4-01 チャット │
   │ ADR-010, 011     │  │ F3-02 RT共有 ───┼─→│ F4-02 添付     │
   │                  │  │ F3-03 写真      │  │ F4-03 招待     │
   │                  │  │ F3-04 電子黒板  │  │ F4-04 通知     │
   │                  │  │ F3-05 図面      │  │ F4-05 未読     │
   │                  │  └────┬────────────┘  └────────────────┘
   │                  │       │
   │                  │  ┌────▼────────────┐
   │                  │  │ F5 検査         │
   │                  │  │ F5-01 登録      │
   │                  │  │ F5-02 是正      │
   │                  │  │ F5-03 帳票PDF   │
   │                  │  └─────────────────┘
   └──────────────────┘
   
   ╔═════════════════════════════════════════════════════════════╗
   ║         PHASE 3 — Nice-to-have (AI高度化)                   ║
   ╠═════════════════════════════════════════════════════════════╣
   ║  ADR-019 Bedrock LLM (deferred-active)                      ║
   ║  ADR-020 pgvector (deferred-active)                         ║
   ║  ADR-021 AI Gateway (deferred-active)                       ║
   ║                                                             ║
   ║  F2-06 AI見積補助  ──┐                                       ║
   ║  F6-05 LINE/SMS     │                                       ║
   ║  F7-01〜02 Dashboard │  → all share `ai/` module             ║
   ║  F7-03 AI類似検索   │                                       ║
   ║  F7-04 AI予測       │                                       ║
   ║  F7-05 AIチャットbot ┤                                       ║
   ║  F7-06 OCR          ┘                                       ║
   ╚═════════════════════════════════════════════════════════════╝
```

### Critical Path (MVP)

```
F8 (基盤) → F1 (顧客・案件) → F2 (見積) || F6 (アフター)
```

Migration tool feeds F1-01 + F1-02 (customer + property + 引渡日) → unblocks F6-02 (auto-aftercare-notification).

### Module-to-Feature Mapping

| Module (per ADR-001) | Features served | Phase |
|---|---|---|
| `auth` | F8-01, F8-02, F4-03 | 1, 2 |
| `audit` | F8-03 | 1 |
| `backup` | F8-04 | 1 |
| `customer` | F1-01, F1-02, F1-04, F6-01, F6-03 | 1 |
| `project` | F1-03, F1-05, F1-06, F3-06 | 1 |
| `quote` | F2-01〜F2-05 | 1 |
| `aftercare` | F6-02, F6-03 (cross), F6-04 (shared) | 1 |
| `notification` | F6-04, F4-04, F6-05 | 1, 2, 3 |
| `migration` (CLI) | Customer + property import | 1 (one-shot) |
| `schedule` | F3-01, F3-02 | 2 |
| `photo` | F3-03, F3-04 | 2 |
| `drawing` | F3-05 | 2 |
| `chat` | F4-01, F4-02, F4-05 | 2 |
| `inspection` | F5-01, F5-02, F5-03 | 2 |
| `dashboard` | **BD-01 (Phase 1 basic)**, F7-01, F7-02 (Phase 3 advanced) | 1, 3 |
| `ai` | F2-06, F7-03, F7-04, F7-05, F7-06 | 3 (deferred) |

---

## Catalogs Generated

3 catalogs in `architect/catalogs/`:

1. **stakeholder-roles.md** — 7 user roles + their primary screens + 1 external stakeholder (OB customer)
2. **entity-catalog.md** — 14 core domain entities with key fields and relations
3. **module-catalog.md** — 16 modules (NestJS structure) with public API surface
