# 08 — MVP Scope & Roadmap

**Version**: 1.0 — 2026-05-15
**Refer to**: Feature Map, Assessment, all phase-related ADRs

---

## 1. Mục đích

Tài liệu này định nghĩa rõ MVP scope (Phase 1) và roadmap evolution sang Phase 2 + Phase 3. Đây là kim chỉ nam cho prioritization, deferring scope creep, và rõ ràng với khách hàng về timeline.

---

## 2. MVP definition

**MVP = Phase 1 from reference doc + Home Dashboard basic** — no AI, no mobile, no chat, no inspection, no photo.

### 2.1 What MVP must do (success criteria)

User vào hệ thống ngày Day 1 và có thể:
1. ✅ Login với email/password (admin có 2FA)
2. ✅ Xem Home Dashboard với widgets cơ bản (cases by status, aftercare 14 ngày, pending approvals)
3. ✅ Quản lý customers (CRUD + fuzzy search 氏名/電話/住所)
4. ✅ Quản lý properties với 引渡日 → tự sinh maintenance schedule
5. ✅ Quản lý cases (案件) với status lifecycle 見積→受注→着工→完成→引渡し
6. ✅ Tạo, edit, clone, approve, export PDF quote (見積)
7. ✅ Quản lý 単価マスタ với CSV import
8. ✅ Nhận email tự động khi đến hạn 点検 (cron daily)
9. ✅ Record manual aftercare history theo customer
10. ✅ Admin: manage users, roles, view audit log, restore from backup
11. ✅ Import existing OB customer data (~2K records) from Towa's CSV export

### 2.2 What MVP does NOT do (explicit out-of-scope)

| Out-of-scope | Reason | Future phase |
|---|---|---|
| Mobile app / PWA | Office-only initially | Phase 2 |
| Field photo capture | Needs mobile | Phase 2 |
| 電子黒板 | Needs mobile + photo | Phase 2 |
| Project chat | Needs WebSocket + mobile | Phase 2 |
| Drawing management | Phase 2 module | Phase 2 |
| Inspection + 是正 | Phase 2 module | Phase 2 |
| Gantt schedule | Phase 2 module (schedule basic via project dates only in P1) | Phase 2 |
| LINE/SMS notification | Email only first | Phase 3 |
| AI quote suggestion | AI module deferred | Phase 3 |
| AI similar search | AI module deferred | Phase 3 |
| AI chatbot | AI module deferred | Phase 3 |
| OCR receipt scan | AI module deferred | Phase 3 |
| Revenue/profit dashboard | Sensitive + needs more data | Phase 3 |
| Customer self-service portal | Not requested | Future |
| BIM integration | Not requested | Future |
| Multi-tenant SaaS (other companies) | Single-tenant per ADR-012 | Future |

### 2.3 MVP feature count
- **23 features** (22 from doc Phase 1 + 1 added BD-01 Home Dashboard)
- **119 人日** baseline (112 + 7 for BD-01)

---

## 3. Phase 1 sprint plan (illustrative)

| Sprint | Weeks | Focus | Deliverables |
|---|---|---|---|
| Sprint 0 | W1 | Setup | Infra IaC scaffold; DB schema baseline; CI pipeline; auth module skeleton |
| Sprint 1 | W2-3 | Foundation | `auth` module fully working; `audit` module; basic admin user mgmt |
| Sprint 2 | W4-5 | Customer + Project | `customer` (F1-01, F1-02, F1-04); `project` (F1-03, F1-05, F1-06, F3-06) |
| Sprint 3 | W6-7 | Quote + Master | `quote` (F2-01〜05); `unit_price` (F2-02); PDF generation |
| Sprint 4 | W8-9 | Aftercare + Migration | `aftercare` (F6-01〜04); notification email; migration CLI tool |
| Sprint 5 | W10-11 | Dashboard + Admin tools | Home Dashboard (BD-01); audit log viewer; backup admin |
| Sprint 6 | W12-13 | Integration & UAT prep | Data migration dry-runs; integration testing; UAT preparation |
| Sprint 7 | W14-15 | UAT & Cutover | UAT execution; bug fix; production cutover; OB data final import |
| Sprint 8 | W16 | Stabilization | Stabilization; hyper-care; metrics tuning |

**~16 weeks ≈ 4 months** matches doc target.

### 3.1 Critical milestones
- **End W2**: Auth working end-to-end (login, role check, audit)
- **End W5**: Customer + Project CRUD fully working
- **End W7**: Quote generates PDF; full quote lifecycle working
- **End W9**: Aftercare auto-notification end-to-end (cron + email)
- **End W11**: Home Dashboard render; admin tools complete
- **End W13**: Data migration dry-run report acceptable (< 5% rejection)
- **End W15**: Production launch with Towa's OB data
- **End W16**: Phase 1 closeout, retrospective

### 3.2 Parallelization
- BE team (2 devs): can split modules per sprint (e.g., one on customer/project, one on quote)
- FE team (2 devs): can split features per sprint (e.g., one on customer/project screens, one on quote/PDF UI)
- BA + PM: ahead of dev — basic design preparation for next sprint's modules

---

## 4. Phase 2 (現場DX) — 67 人日, ~4 months

### 4.1 Scope (per doc)
| Feature group | Count | Notes |
|---|---|---|
| F3 工程・現場 (excluding F3-06 done P1) | 5 | Gantt + photo + 電子黒板 + drawing |
| F4 コミュニケーション | 5 | Chat + attachments + invite + notification + read receipt |
| F5 検査・品質 | 3 | Inspection + 是正 + PDF report |
| F8-05 モバイル対応 | 1 | PWA shell |
| **Total** | **14** | Includes F8-05 (counted separately in F8) |

### 4.2 New modules added
- `schedule`, `photo`, `drawing`, `chat`, `inspection`
- Notification module extended (Web Push channel added)

### 4.3 Infrastructure additions
- ElastiCache scaled for WebSocket session storage
- Lambda for HEIC transcode + thumbnail
- OpenSearch managed cluster (when needed)
- Service Worker + PWA assets deployed via CloudFront

### 4.4 Phase 2 success criteria
- 現場監督 can capture photo on mobile, queue offline, sync when online
- Schedule update in office → realtime to field via WebSocket
- 是正 workflow tracked digitally end-to-end
- Inspection report PDF with before/after photos

### 4.5 Risks specific to Phase 2
- Mobile UX quality on iOS (PWA limitations) — mitigate with extensive testing
- WebSocket scaling — load test before launch
- Photo storage costs growth — implement lifecycle policy from day one

---

## 5. Phase 3 (AI高度化) — 70 人日, ~4 months

### 5.1 Scope
| Feature group | Count |
|---|---|
| F2-06 AI 見積補助 | 1 |
| F6-05 LINE/SMS 通知 | 1 |
| F7 ダッシュボード (full + AI) | 6 |
| **Total** | **8** |

### 5.2 New modules
- `dashboard` (advanced tier with charts, drilldown, AI forecasting)
- `ai` (AI gateway + vector store + use case implementations)

### 5.3 Infrastructure additions
- VPC endpoint for AWS Bedrock
- pgvector activation on RDS (may upgrade instance to db.r6g.large)
- Textract or Azure Document Intelligence integration for OCR
- LINE Messaging API + SMS provider (Twilio or similar)

### 5.4 Pre-Phase 3 gate (revisit checklist)
- ✅ Verify Bedrock model availability in ap-northeast-1
- ✅ Verify Towa's legal review of AWS Bedrock DPA
- ✅ Verify pgvector performance on RDS scale
- ✅ Re-evaluate AI gateway abstraction (Custom thin) vs adoption of LangChain

### 5.5 Phase 3 success criteria
- Quote suggestion AI returns top-5 similar quotes with rationale in <3s
- Internal chatbot answers from indexed docs/cases with source attribution
- OCR extracts supplier quote line items with >85% accuracy
- Revenue/profit dashboard updated daily, drilldown by 案件 type/owner

### 5.6 Phase 3 risks
- AI quality not meeting user expectations → mitigate with PoC + early user feedback
- Cost overrun on Bedrock — strict cost monitoring + rate limits
- OCR accuracy on JP receipts — pilot with real Towa supplier quotes

---

## 6. Cross-phase principles

### 6.1 Architecture invariants (from 01-system-architecture)
- Modular monolith — no microservice split without ADR
- Module boundary enforced — no cross-module internal imports
- AI module isolated until Phase 3
- Single source of truth = PostgreSQL
- No data leaves AWS network
- All in JP region

### 6.2 Backward compatibility
- API: versioned (default `/v1/`); breaking changes require new version
- Database: migrations forward-only, schema additive where possible
- Frontend: PWA cache invalidation handled by Service Worker version

### 6.3 Feature flag policy
- Phase 2 and Phase 3 features ship with disabled-by-default flag
- Towa opts in per phase rollout
- Flag in DB or env var per feature

---

## 7. Estimation summary

| Phase | Features | 人日 | Duration | Team |
|---|---|---|---|---|
| Phase 1 (MVP) | 23 | 119 | 4 months | 7 ppl (1 PM, 1 BA, 2 BE, 2 FE, 1 QA) |
| Phase 2 | 14 | 67 | 4 months | Same team |
| Phase 3 | 8 | 70 | 4 months | Same team + 1 AI specialist? |
| **Total** | **45** | **256** | **12 months** | — |

> Note: 256 人日 baseline. Add ~30% buffer for non-coding work (BA design, QA cycles, UAT, rework, infra, ops setup, training, migration data quality iteration) → **~330-350 人日 realistic**.

### 7.1 Capacity model (Phase 1 example)
- 4 dev (2 BE + 2 FE) × 16 weeks × 4 days/week effective = 256 dev-days raw capacity
- Buffer 30%: 256 × 0.7 = 180 effective dev-days
- Phase 1 baseline 119 人日 → 66% utilization budget → workable but no slack for major slips

### 7.2 Caveats
- Effort baseline from doc per Towa's提案書; review during basic design
- Migration cycle (iterate with Towa on data quality) may extend 1-2 weeks
- UAT findings could trigger re-work (estimate +5-10% rework)

---

## 8. Communication & Governance

### 8.1 Cadence (per doc §6.3)
- **Weekly**: development progress meeting (DEHA lead + Towa window)
- **Bi-weekly**: project steering committee (includes executives)
- **Monthly**: operations report (during ops phase)
- **End of phase**: retrospective + scope review for next phase

### 8.2 Change management
- All change requests (CR) logged
- Impact assessed (effort, schedule, risk) before approval
- Approval: ステアリングコミッティ for material changes
- Documentation updated within 1 sprint of approval

### 8.3 Acceptance & UAT
- UAT criteria defined per feature (linked to 受入条件 in detailed feature list)
- UAT script provided to Towa 2 weeks before UAT start
- UAT execution: ~2 weeks final sprint
- Defect classification: blocker / critical / major / minor / cosmetic
- Go-live gate: zero blocker, all critical resolved or workaround documented

---

## 9. Subsidy notes (informational)

Per Assessment Q6.2, no subsidy timing constraint for this project (Towa self-funded). However ものづくり補助金 if pursued later:
- Must avoid contract/payment before 交付決定 date
- 3-5 year labor productivity plan to be filed
- GビズID プライム required (3-week obtain)
- 認定経営革新等支援機関 advisory

These are admin-side activities; system architecture is not affected.

---

## 10. Related documents

- [01 — System Architecture](./01-system-architecture.md) through [07 — Deployment](./07-deployment-architecture.md)
- Feature Map: `architect/feature-map.md`
- All ADRs in `architect/decisions/`
- Reference doc: `藤和建設様_施工管理システム_統合ドキュメント.md`
