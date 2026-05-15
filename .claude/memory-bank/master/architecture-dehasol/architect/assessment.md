# Architecture Assessment: 藤和建設様 施工管理システム

**Mode**: Greenfield
**Domain**: Construction Management (施工管理) — Japan B2C2B
**Reference**: 藤和建設様_施工管理システム_統合ドキュメント.md
**Started**: 2026-05-15

---

## 0. Extracted from Reference Document (auto-fill, no interview needed)

### Business context
- **Customer**: 藤和建設株式会社 — 1975 founding, Saitama-Tokorozawa, ~2,000 OB customers
- **Business model**: New construction + Remodel (90% from OB) + After-service end-to-end
- **Implementer**: DEHA Solutions
- **Funding**: ものづくり補助金 (上限 4,000万円, 1/2 補助率); 交付決定前 không được phát sinh chi phí

### Scope baseline
- **Categories**: 8 (F1-F8)
- **Features**: 42
- **Screens**: 26
- **Roles**: 4 (システム管理者 / 社員マネージャー / 社員一般 / 招待ユーザー)
- **Phase plan**: 3 phases × 4 tháng = 12 tháng
- **Effort baseline**: 249 人日

### Non-functional baseline (per doc §4)
| Aspect | Target |
|---|---|
| Concurrent users | 50 peak |
| Page response | p95 < 2s normal, < 3s search |
| File upload | < 10s for 20MB |
| Data scale | 10K customers / 5K projects / 100K photos |
| Availability | 99.5% biz hours; RPO 24h; RTO 4h |
| Session | 30 min timeout |
| Audit retention | 2 years |
| Mobile | iOS 15+ / Android 10+ |
| Browser | Chrome/Edge/Safari latest + 1 prev |

### Compliance baseline
- 個人情報保護法 (APPI)
- 電子帳簿保存法 (見積/契約)
- 建設業2024年問題 (efficiency-oriented features)
- 瑕疵担保責任 (検査記録 retention)

---

## Topic 1: Technology Stack Decisions (completed)

### Q1.1 [DECIDE] Backend framework
- **Decision**: **NestJS (Node.js + TypeScript)**
- **Rationale**: Unified TS với FE React/TS — 1 ngôn ngữ cho cả team; ecosystem mature (REST + WebSocket + BullMQ); AI tích hợp qua API call vẫn OK
- **Impact**: ADR-001 Backend Framework
- **Source**: user-confirmed

### Q1.2 [DECIDE] Cloud provider
- **Decision**: **AWS (ap-northeast-1 / Tokyo)**
- **Rationale**: JP region mature; service catalog rich; DEHA team likely familiar
- **Impact**: ADR-002 Cloud Platform; ảnh hưởng cascading đến: storage (S3), DB (RDS), search (OpenSearch managed), OCR provider preference, LLM hosting option (Bedrock available)
- **Source**: user-confirmed

### Q1.3 [DECIDE] Full-text search
- **Decision**: **PostgreSQL FTS (GIN/trigram) cho Phase 1 → OpenSearch (AWS managed) từ Phase 2**
- **Rationale**: Phase 1 chỉ search 顧客/案件 trên ~10K records → PG đủ; Phase 2 mới có chat history & nhu cầu RAG → mới upgrade
- **Impact**: ADR-003 Search Strategy; giảm Phase 1 ops cost
- **Phase trigger**: Khi chat/RAG go live (Phase 2) hoặc khi PG FTS latency > 1s
- **Source**: user-confirmed

### Q1.4 [DECIDE] CI/CD platform
- **Decision**: **GitHub Actions**
- **Rationale**: Default standard, minute-billing kinh tế cho project size này; assumed code repo on GitHub
- **Impact**: ADR-004 CI/CD Platform
- **Source**: user-confirmed

---

## Topic 2: AI Architecture & Privacy (completed)

### Q2.1 [DECIDE] LLM hosting strategy
- **Decision**: **AWS Bedrock** (Claude family + Llama as fallback)
- **Rationale**: VPC endpoint giữ data trong AWS infra; DPA built-in; quality Claude high; multi-model (Anthropic + Meta + Amazon Titan) trong cùng API → mitigated vendor lock-in
- **Impact**: ADR-005 LLM Hosting; "AI private" requirement của doc được đáp ứng (no data leaves AWS)
- **Constraint**: Bedrock model availability ở ap-northeast-1 — cần verify trước Phase 3 release (Anthropic Claude usually available trong region này)
- **Source**: user-confirmed

### Q2.2 [DECIDE] Vector DB
- **Decision**: **pgvector extension trên PostgreSQL chính**
- **Rationale**: Single-DB approach, no extra infra; AWS RDS PostgreSQL support pgvector từ 15.x; scale 100K-1M vectors phù hợp cho project size; có thể migrate sang OpenSearch vector hoặc Qdrant nếu scale tăng đột biến
- **Impact**: ADR-006 Vector Storage; giảm operational complexity Phase 3
- **Source**: user-confirmed

### Q2.3 [DECIDE] AI gateway / abstraction
- **Decision**: **Custom thin abstraction layer** (`AIGateway` service)
- **Rationale**: Scope AI nhỏ (3 use case: similar-project search, chatbot, quote-suggestion + OCR pipeline); tránh dependency drift của LangChain; control framework upgrades chủ động
- **Impact**: ADR-007 AI Gateway; codebase ~500 LOC trong service `ai/`
- **Open**: Nếu Phase 3 phát sinh agent/tool calling phức tạp → revisit và introduce LangChain
- **Source**: user-confirmed

---

## Topic 3: Mobile & Offline Strategy (completed)

### Q3.1 [DECIDE] Mobile delivery
- **Decision**: **PWA only (Phase 2 launch)**
- **Rationale**: 1 codebase React + Service Worker, install qua "Add to Home Screen"; đủ cho hiện trường use case; native wrap có thể introduce sau nếu cần push notification reliability hoặc App Store distribution
- **Known limitations**:
  - iOS PWA: web push qua Apple notification có hạn chế (iOS 16.4+)
  - Install UX yếu hơn native app
- **Impact**: ADR-008 Mobile Platform
- **Future trigger**: Nếu Towa yêu cầu App Store presence hoặc push notification reliability → revisit native wrap (Capacitor)
- **Source**: user-confirmed

### Q3.2 [DISCOVER] Offline scope
- **Decision**: **Minimal — Photo capture + queue → background sync**
- **Implementation**: IndexedDB queue cho photo; Service Worker với Background Sync API; retry exponential backoff
- **Excluded (Phase 2)**: offline browse/edit case data, offline schedule edit
- **Rationale**: 90% field use case = chụp ảnh; full offline tăng complexity 2-3 sprint; defer nếu cần
- **Impact**: ADR-009 Offline Strategy
- **Source**: user-confirmed

---

## 🎯 MVP Scope Confirmation (user-confirmed mid-interview)

- **MVP definition**: **Phase 1 = MVP** per reference doc
  - **22 features / 112 人日**: F1 (all 6), F2-01→F2-05 (5), F3-01/02/06 (3), F6-01→F6-04 (4), F8-01→F8-04 (4)
  - **AI features**: completely OUT of MVP — moved to Phase 3
- **AI-related ADRs (ADR-005, 006, 007)**: status = **"Deferred — Phase 3 trigger"**, decisions recorded for future reference, no Phase 1 implementation
- **Architecture imperative**: MVP architecture must be **AI-extensible** — clean module boundary giữa core domain (`customer/`, `project/`, `quote/`, …) và future `ai/` module. No tight coupling, không build AI infra trong Phase 1.

---

## Topic 4: Deployment & Tenancy (completed)

### Q4.1 [DECIDE] Multi-tenancy
- **Decision**: **Single-tenant cho Towa**
- **Rationale**: 1 deployment / 1 DB / 1 instance set; tránh premature complexity; nếu sau bán cho khách khác → fork code hoặc refactor (2-3 sprint affordable)
- **Impact**: ADR-010 Tenancy Model; DB schema KHÔNG có `tenant_id`; auth không cần tenant context
- **Source**: user-confirmed

### Q4.2 [DECIDE] Disaster recovery
- **Decision**: **Backup-based DR**
- **Implementation**: 
  - RDS automated daily backup (30-day retention per doc)
  - S3 Cross-Region Replication cho photo/document
  - Manual restore khi disaster
  - Disaster recovery runbook documented
- **Risk acknowledgment**: RTO 4h (theo doc) khó đạt absolute — RDS large restore ~1-2h + app boot ~30min + verification = ~2-3h tốt nhất, có thể đến 5h worst case. **Cần negotiate RTO target với Towa hoặc upgrade lên Q4.2-B nếu strict.**
- **Impact**: ADR-011 DR Strategy
- **Cost impact**: ~+5% so với single-region (cross-region S3 replication transfer cost)
- **Source**: user-confirmed

### Q4.3 [DECIDE] Deployment ownership
- **Decision**: **DEHA-managed (SaaS-style)**
- **Implementation**: DEHA owns AWS account; Towa pays monthly subscription covering infra + ops + support
- **Impact**: ADR-012 Deployment Ownership
- **Side effects**:
  - DEHA cần internal billing/cost-tracking process
  - Data residency clear: AWS Tokyo, owned by DEHA but contractually for Towa
  - Contract phải có "data ownership = Towa" clause để compliance OK
- **Source**: user-confirmed

---

## Topic 5: Auth, Compliance, Migration (completed)

### Q5.1 [DECIDE] SSO Provider
- **Decision**: **Phase 1 (MVP): Email + password only with strong policy. SSO deferred to Phase 2.**
- **Phase 1 implementation**:
  - Email/password với bcrypt (cost 12+) hoặc Argon2id
  - Strong password: 12+ chars, mixed case + digit + symbol
  - Session timeout 30 min (per doc)
  - Password reset via email link (signed token, 1h expiry)
- **Phase 2 trigger**: Khi Towa confirm SSO provider (likely Google Workspace based on Google Drive usage). NextAuth.js (cho NestJS-compatible) hoặc Passport.js để bridge OIDC.
- **Impact**: ADR-013 Identity Provider
- **Source**: user-confirmed

### Q5.2 [DECIDE] 2FA policy
- **Decision**: **Optional cho all + Mandatory cho システム管理者**
- **Implementation**: TOTP-based (Google Authenticator / 1Password compatible); no SMS dependency; backup codes provided khi enroll
- **Impact**: ADR-014 2FA Policy
- **Rationale**: Admin role có quyền truy cập audit log + user management + restore backup → cần thêm layer protection; regular employee 2FA optional để giảm UX friction trên người chưa quen
- **Source**: user-confirmed

### Q5.3 [DECIDE] 電帳法 strategy
- **Decision**: **訂正削除履歴 + 検索要件 (lightweight, DB-based)** cho MVP Phase 1
- **Implementation**:
  - Quote/contract có version history table (`quote_versions` immutable append-only)
  - Search index by 取引年月日 (transaction date) / 金額 (amount) / 取引先 (counter-party name)
  - User edits create new version; old versions retained
  - Cannot hard-delete (soft-delete with deletion log)
- **Impact**: ADR-015 電帳法 Compliance Strategy
- **Future evolution**: TSA (Timestamp Authority) integration deferred — revisit nếu Towa cần compliance level cao hơn (e.g., audit từ tax authority)
- **Source**: user-confirmed

### Q5.4 [DISCOVER] Data migration scope (MVP)
- **Decision**: **OB customer master + property history với 引渡日**
- **Data scope**:
  - Customer master: ~2,000 records (氏名, 連絡先, 住所, 種別)
  - Property: per-customer, with 住所 + 構造 + 築年数 + **引渡日** (required for aftercare auto-trigger)
- **Source format**: CSV export from Towa's existing customer mgmt software (TBD specifically which tool — confirm with Towa in basic design phase)
- **Migration tool**: One-shot import script với:
  - Data validation (required field check, format check)
  - Dedupe by 氏名 + 連絡先
  - Error report (rejected records with reasons)
  - Dry-run mode
- **Excluded from MVP migration**: 見積 history, 工事 history, photo. Add Phase 2+ if needed.
- **Impact**: Documents — Data Migration Plan
- **Assumption**: Data quality varies; expect 5-15% rejection rate; cleansing iteration với Towa cần thiết
- **Source**: user-confirmed

---

## Topic 6: Project Constraints (completed)

### Q6.1 [DISCOVER] DEHA team composition
- **Decision**: **Standard small team — 7 people**
  - 1 PM (Project Manager) — JP/VN bridge
  - 1 BA (Business Analyst) — JP-side preferably
  - 2 BE (Backend NestJS engineers)
  - 2 FE (Frontend React/TS engineers)
  - 1 QA
- **Capacity calculation**:
  - 4 dev (2 BE + 2 FE) × 4 months × ~20 working days = 320 dev-days raw
  - Effective ~70% = 224 dev-days
  - Phase 1 baseline 112 人日 → 50% utilization buffer (account for: cross-team coordination, code review, basic design phase before dev starts)
- **Impact**: Documents — Team & Capacity Plan, Estimation phase
- **Source**: user-confirmed

### Q6.2 [CONFIRM] Subsidy timing
- **Decision**: **No subsidy timing constraint** — Towa self-funded
- **Impact**: 
  - Phase 1 development có thể start ngay khi hợp đồng ký
  - Không cần defer billable work
  - Architect docs không cần highlight subsidy timing (vẫn để ものづくり補助金 trong reference nhưng marked as "informational, not blocking")
- **Source**: user-confirmed

---

## Topic Summary

All 6 topics complete:
- ✅ Topic 1: Tech Stack (4 decisions)
- ✅ Topic 2: AI Architecture (3 decisions — all "Deferred Phase 3")
- ✅ Topic 3: Mobile & Offline (2 decisions)
- ✅ Topic 4: Deployment & Tenancy (3 decisions)
- ✅ Topic 5: Auth/Compliance/Migration (4 decisions)
- ✅ Topic 6: Project Constraints (2 decisions)

Total: **18 architectural decisions captured**.

---

## 9-Layer Coverage Check

| Layer | Min Data | Actual | Status |
|---|---|---|---|
| Business | 2 | 5+ (stakeholders, OB model, phased delivery, subsidy, business flows) | ✅ |
| Domain | 3 | 8+ (entity model, workflow lifecycle, rules, OB customer, aftercare, quote reuse, inspection) | ✅ |
| Reference | 1 | 6 reference systems (ANDPAD, Buildee, SiteBox, etc.) in domain KB | ✅ |
| Regulatory | 1 | 4 (個情法, 電帳法, 瑕疵担保, 2024年問題) | ✅ |
| Localization | 1 | JP-specific (電子黒板, 単価マスタ, JP language, 西暦/和暦 considerations) | ✅ |
| Technical | 2 | 10+ (backend, FE, DB, cloud, search, CI/CD, mobile, vector, AI gateway, offline) | ✅ |
| Operational | 2 | 5+ (deployment ownership, DR, CI/CD, monitoring inherited from doc, support model) | ✅ |
| Integration | 1 | 6+ (SMTP, SSO future, LLM API, OCR, LINE/SMS, accounting future) | ✅ |
| Security | 2 | 8+ (auth, 2FA, encryption, audit, AI security, network, threat model) | ✅ |

**All layers covered.** No supplementary questions needed.

---

## Contradictions & Resolutions

| Original conflict | Resolution |
|---|---|
| Doc says "AI private, no external send" + "Claude/GPT/Gemini API" | Resolved by AWS Bedrock (VPC endpoint, data in AWS) |
| Doc lists "Pinecone OR Qdrant" — privacy implication if Pinecone managed | Chose pgvector trên RDS — fully private |
| Doc says SLA 99.5% biz hours + RTO 4h | Acknowledged RTO 4h is tight with backup-only DR; flagged for renegotiation with Towa |
| Doc mentions モバイル app yet PWA in same para | Resolved: PWA only Phase 2; native deferred |
| Doc mobile "iOS 15+ / Android 10+" vs iOS PWA push limited until 16.4 | Acknowledged constraint; native wrap as future option |

---

## Unresolved Assumptions (flag for ADR phase)

1. **SSO provider** — assumed Google Workspace for Phase 2; confirm với Towa in basic design
2. **Migration source software** — assumed CSV export possible; specific tool TBD
3. **Phase 1 deadline strictness** — assumed 4-month soft target with buffer; confirm
4. **Data quality assumption** — 5-15% rejection rate from migration source; based on industry typical
5. **Bedrock Claude availability in ap-northeast-1** — should verify before Phase 3 commit
6. **Drawing format** — assumed PDF + JPG only (per doc F3-05); confirm if DWG/DXF needed
