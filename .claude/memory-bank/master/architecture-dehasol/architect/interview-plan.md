# Interview Plan: Construction Management System (Towa)

**Mode**: Greenfield (with rich reference doc)
**Style**: Extract-from-doc + Fill-gaps (per user choice)
**Domain complexity**: Complex → 6 topics / ~18 questions
**Estimated time**: ~25-35 minutes

---

## Background

Reference document `藤和建設様_施工管理システム_統合ドキュメント.md` đã cover:
- ✅ Business context, stakeholders, role matrix
- ✅ 8 categories / 42 features / 26 screens
- ✅ Non-functional requirements (performance, availability, security baseline)
- ✅ Phase plan (3 phases / 12 months)
- ✅ Compliance requirements (個情法, 電帳法, 瑕疵担保)
- ✅ Tech stack **candidates** (vẫn còn nhiều "hoặc")

**Mục đích của interview**: chốt các architecture decisions cụ thể từ multiple-choice candidates trong doc, và làm rõ những gap về deployment, multi-tenancy, team, AI strategy.

---

## Topic 1: Technology Stack Decisions (4 questions)

**Focus**: Chốt các "A hoặc B" trong doc thành 1 lựa chọn cụ thể.
**Feeds into**: ADR-001 (Backend), ADR-002 (Cloud), ADR-003 (Search), ADR-004 (CI/CD)

- **Q1.1** [DECIDE] Backend framework: **NestJS (Node.js/TS)** vs **FastAPI (Python)**
- **Q1.2** [DECIDE] Cloud provider: **AWS** vs **Azure** vs **multi-cloud abstraction**
- **Q1.3** [DECIDE] Full-text search: **OpenSearch managed** vs **Elasticsearch** vs **PostgreSQL FTS (Phase 1) + OpenSearch (Phase 2)**
- **Q1.4** [DECIDE] CI/CD: **GitHub Actions** vs **Azure DevOps**

---

## Topic 2: AI Architecture & Privacy (3 questions)

**Focus**: Doc nói "AI private, no external send" nhưng có conflict với "Claude/GPT/Gemini API" → cần làm rõ.
**Feeds into**: ADR-005 (LLM hosting), ADR-006 (Vector DB), ADR-007 (AI gateway)

- **Q2.1** [DECIDE] LLM hosting strategy:
  - **A**: API call với DPA (Data Processing Agreement) + opt-out training; data đi qua API provider's infra (Anthropic/OpenAI/Google) nhưng có legal protection
  - **B**: Self-host LLM (Llama/Qwen) trong VPC; quality lower nhưng data 100% on-premise
  - **C**: Hybrid: embedding self-host + LLM API
- **Q2.2** [DECIDE] Vector DB: **Qdrant self-host** (OSS, control) vs **Pinecone managed** vs **Azure AI Search** (nếu chọn Azure)
- **Q2.3** [DISCOVER] AI gateway: dùng framework (**LangChain** / **LlamaIndex**) hay **custom abstraction layer**?

---

## Topic 3: Mobile & Offline Strategy (2 questions)

**Focus**: Doc nói "レスポンシブまたはPWA" — chốt cụ thể và level of offline support.
**Feeds into**: ADR-008 (Mobile platform), ADR-009 (Offline sync)

- **Q3.1** [DECIDE] Mobile delivery:
  - **A**: PWA only (Phase 2)
  - **B**: PWA Phase 2 + Native iOS/Android Phase 3 (đầu tư thêm)
  - **C**: Native từ đầu (Capacitor/React Native wrap)
- **Q3.2** [DISCOVER] Offline support scope:
  - Photo capture + queue → sync (minimum)
  - Browse current case + 工程 + 図面 cached
  - Edit & sync (advanced — conflict resolution needed)

---

## Topic 4: Deployment & Tenancy (3 questions)

**Focus**: Doc không nói multi-tenant hay single-tenant; architecture phải biết để design.
**Feeds into**: ADR-010 (Multi-tenancy), ADR-011 (DR), ADR-012 (Ownership)

- **Q4.1** [DECIDE] Multi-tenancy:
  - **A**: Single-tenant dedicated cho Towa (dễ implement, không gây premature complexity)
  - **B**: Multi-tenant từ đầu (cùng codebase phục vụ nhiều construction company; DEHA có thể tái sử dụng cho khách khác)
  - **C**: Logical multi-tenant ready (DB schema có tenant_id, nhưng deploy 1 tenant trước)
- **Q4.2** [DECIDE] Disaster recovery:
  - **A**: Backup only (RPO 24h như doc; DR là restore manual)
  - **B**: Cross-region passive standby (RTO 4h tự động hơn nhưng cost 1.5-2×)
  - **C**: Active-active (overkill cho scale này)
- **Q4.3** [DECIDE] Deployment ownership:
  - **A**: DEHA-managed cloud (SaaS-style, Towa trả monthly fee)
  - **B**: Towa own AWS/Azure account, DEHA deploy & operate
  - **C**: On-premise / private cloud (Towa server room) — không recommended

---

## Topic 5: Auth, Compliance, Migration (4 questions)

**Focus**: Detail các quyết định còn mơ hồ trong doc.
**Feeds into**: ADR-013 (Identity), ADR-014 (Compliance), Documents (Data Migration plan)

- **Q5.1** [DECIDE] SSO Provider:
  - **A**: Google Workspace (Towa hiện dùng Google Drive theo doc → khả năng cao đã có Google account)
  - **B**: Microsoft 365 / Azure AD
  - **C**: Không SSO Phase 1, chỉ email/password; add SSO sau
- **Q5.2** [CONFIRM/DECIDE] 2FA policy: optional cho all users (doc default) vs **mandatory cho システム管理者** role vs mandatory cho all
- **Q5.3** [DECIDE] 電帳法 (electronic bookkeeping law) strategy cho 見積/契約:
  - **A**: 訂正削除履歴 + 検索要件 (lightweight, dễ implement, version-controlled DB)
  - **B**: Tích hợp Timestamp Authority (TSA) — dùng service như セイコーソリューションズ / アマノタイムスタンプ (cost: ~10-50円/timestamp, infra phức tạp)
- **Q5.4** [DISCOVER] Data migration cụ thể:
  - Source: tên ソフト hiện tại của Towa cho customer mgmt? Format export?
  - Volume: ~2,000 OB customer (đã có trong doc), bao nhiêu property/project history?
  - Timing: cần ready trước Phase 1 release hay rolling migration?

---

## Topic 6: Project Constraints (2 questions)

**Focus**: Constraint quan trọng cho architecture decision (team complexity vs timeline).
**Feeds into**: Documents (Phase plan refinement, risk register), Estimation phase

- **Q6.1** [DISCOVER] DEHA team composition:
  - Headcount cho project (BE / FE / AI / QA / DevOps)
  - Location split (Vietnam dev / Japan BA-PM)
  - Có team member với prior 施工管理 SaaS exposure không?
- **Q6.2** [CONFIRM] Subsidy timeline:
  - 交付決定 (subsidy approval) target date → ảnh hưởng "không được phát sinh chi phí trước đó" constraint
  - 4-month Phase 1 deadline (per doc) — fixed hay flexible?

---

## Interview output

After all topics complete:
1. `architect/assessment.md` — consolidated architecture assessment (9 layers)
2. List of unresolved assumptions (questions user said "not sure" — sẽ default per Domain KB recommendation)
3. Updated `architect-state.json`: `interview.status=completed`, `currentPhase=adr`
