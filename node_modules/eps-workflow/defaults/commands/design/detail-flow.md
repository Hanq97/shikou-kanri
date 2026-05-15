# /design --detail — Complete Flow Visualization

> **Version**: v4.1 (Scope-Aware + RAG 2.0)
> **Last Updated**: 2026-02-20
> **Related**: [detail.md](detail.md) (1048 lines), [design.md](../design.md) (router)

---

## 1. High-Level Flow

```
USER: /design --detail
        │
        ▼
┌──────────────────┐     ┌─────────────────────────────────┐
│  ROUTER           │     │  commands/design.md     │
│  (184 lines)      │────▶│  v3.0 — Thin Router             │
└──────────────────┘     │                                   │
                          │  1. Parse --detail                │
                          │  2. Validate INNOVATE_DD_APPROVED │
                          │  3. Quality Gate D3               │
                          │  4. Read(design/detail.md) ───────┼──┐
                          └─────────────────────────────────┘  │
                                                                │
        ┌───────────────────────────────────────────────────────┘
        ▼
┌──────────────────┐     ┌─────────────────────────────────┐
│  MICRO-COMMAND    │     │  commands/design/        │
│  (906 lines)      │────▶│  detail.md v4.0                  │
│  Self-contained   │     │  Scope-Aware Workflow            │
└──────────────────┘     └─────────────────────────────────┘
        │
        ▼
   ┌────────────────────────────────────────────────┐
   │          SEQUENTIAL EXECUTION PIPELINE          │
   │                                                  │
   │  Step 0.1  G0 Gate (5 conditions)               │
   │     │                                            │
   │     ▼                                            │
   │  Step 0.5  Stack Context Loading ◄──── RAG: eps+arch layers
   │     │                                            │
   │     ▼                                            │
   │  Step 0.6  RAG Context Preload ◄───── RAG: design+code layers
   │     │        + SpecialistLoader         + DD_RAG_DESIGNS
   │     │                                   + DD_RAG_CODE
   │     ▼                                   + DD_RAG_SPECIALISTS
   │  Step 0.8  BASE Necessity Check                  │
   │     │                                            │
   │     ▼                                            │
   │  Step 0.9  Scope Detection (NEW) ────┐           │
   │     │                                 │           │
   │     ▼                                 ▼           │
   │  ┌─────────┬───────────┬──────────┐              │
   │  │ backend │ frontend  │ fullstack│              │
   │  └────┬────┴─────┬─────┴────┬─────┘              │
   │       │          │          │                     │
   │       │    Phase 1: FDD     │  Phase 1: FDD      │
   │       │          │          │     │               │
   │       │    Phase 2: API?    │  Phase 2: API      │
   │       │          │          │     │               │
   │  Phase 3: BDD    │    Phase 3: BDD               │
   │       │          │          │                     │
   │       └──────────┴──────────┘                     │
   │              │                                    │
   │     Pseudo-code Generation                        │
   │              │                                    │
   │     RAG Index & Graph Update ─────▶ RAG: index DD + extract entities
   │              │                                    │
   │     State Update (DD_CREATED)                     │
   │              │                                    │
   │     Post-Workflow (evidence + context)             │
   │              │                                    │
   │     Completion Message                            │
   └──────────────────────────────────────────────────┘
```

---

## 2. Scope-Dependent Execution Matrix

```
┌─────────────┬────────────────┬───────────────┬────────────────┐
│             │    backend     │   frontend    │   fullstack    │
├─────────────┼────────────────┼───────────────┼────────────────┤
│ Phase 1 FDD │   ⏭️ SKIP      │   ▶️ RUN       │   ▶️ RUN        │
│ Phase 2 API │   ⏭️ SKIP      │   auto-detect │   ▶️ RUN        │
│ Phase 3 BDD │   ▶️ RUN       │   ⏭️ SKIP      │   ▶️ RUN        │
├─────────────┼────────────────┼───────────────┼────────────────┤
│ Output docs │   1 file       │   1-2 files   │   3 files      │
│ Agents used │   10 (BDD)     │   10 (FDD)    │   20 (FDD+BDD) │
│ Context src │   BD + SRS     │   Evidence+BD │   FDD → BDD    │
└─────────────┴────────────────┴───────────────┴────────────────┘

Output files per scope:
  backend:   {F}-{S}-backend-detail-design.md
  frontend:  {F}-{S}-frontend-detail-design.md [+ {F}-{S}-api-contracts.md]
  fullstack: {F}-{S}-frontend-detail-design.md
             + {F}-{S}-api-contracts.md
             + {F}-{S}-backend-detail-design.md
```

---

## 3. Step-by-Step Pipeline

### Step 0.1: G0 Gate — INNOVATE_DD Quality Validation

```
┌───────────────────────────────────────────────────────┐
│  G0 GATE                                               │
│  Input: innovate-dd-selection.md                       │
│                                                         │
│  G0.1 ── File exists?                    ── FAIL → STOP│
│  G0.2 ── Innovation Score ≥ 85?         ── FAIL → STOP│
│  G0.3 ── Multi-Model flag present?       ── FAIL → STOP│
│  G0.4 ── Rationale section >1000 chars?  ── FAIL → STOP│
│  G0.5 ── ≥1 rejected alternative?        ── FAIL → STOP│
│                                                         │
│  All 5 PASS → Continue to Step 0.5                     │
│  Scope-independent (validates prerequisites, not DD)    │
└───────────────────────────────────────────────────────┘
```

### Step 0.5: Stack Context Loading (v5.4)

```
┌───────────────────────────────────────────────────────┐
│  STACK CONTEXT                                         │
│                                                         │
│  1. project-config.json ──▶ STACK_BACKEND_FRAMEWORK    │
│     config/         STACK_FRONTEND_FRAMEWORK   │
│                             STACK_ORM                  │
│                             STACK_UI_LIBRARY           │
│                             STACK_STATE_MANAGEMENT     │
│                                                         │
│  2. RAG Query (eps layer) ──▶ SPECIALIST_PATTERNS      │
│     hipporag-service.js       (non-blocking)           │
│                                                         │
│  3. RAG Query (arch layer) ─▶ ARCH_PATTERNS            │
│     architecture compliance    ARCH_LAYERS             │
│     (non-blocking)             ARCH_CONSTRAINTS        │
│                                                         │
│  4. Fallback: Basic Design Section 1.2                 │
│                                                         │
│  5. Default constraints (always applied)               │
│                                                         │
│  Duplicated in srs.md, basic.md, detail.md             │
│  (env vars don't persist between Read tool calls)      │
└───────────────────────────────────────────────────────┘
```

### Step 0.6: RAG Context Preload (NEW in v4.1)

```
┌───────────────────────────────────────────────────────────────┐
│  RAG CONTEXT PRELOAD                                           │
│  Layers: design (primary) + code (secondary)                   │
│  APIs: HippoRAGService.getContext() + SpecialistLoader         │
│                                                                 │
│  1. Design Layer ────▶ DD_RAG_DESIGNS                          │
│     Query: "{feature} detail design patterns"                   │
│     Result: Existing FDD/BDD from similar features              │
│     Filter: score > 0.6, truncate 500 chars                    │
│                                                                 │
│  2. Code Layer ──────▶ DD_RAG_CODE                             │
│     Query: "{feature} service controller repository component"  │
│     Result: Actual implementation patterns                      │
│     Format: [{ file, snippet }]                                │
│                                                                 │
│  3. SpecialistLoader ▶ DD_RAG_SPECIALISTS                      │
│     Keywords: STACK_BACKEND_FRAMEWORK, STACK_FRONTEND_FRAMEWORK │
│     Result: Top 5 matched specialist filenames                  │
│                                                                 │
│  Non-blocking: failures → empty arrays, workflow continues      │
└───────────────────────────────────────────────────────────────┘
```

### Step 0.8: BASE Necessity

```
┌───────────────────────────────────────────────────────┐
│  BASE NECESSITY                                        │
│                                                         │
│  Input: {feature_dir}/.subfeatures.json                │
│                                                         │
│  ┌──────────────────┐     ┌────────────────────────┐  │
│  │ No registry file │     │ Registry exists         │  │
│  │                  │     │                          │  │
│  │ CREATE_BASE=false│     │ baseNeeded? ──┐         │  │
│  │ HAS_SUBS=false   │     │       yes     no        │  │
│  └──────────────────┘     │       │       │         │  │
│                            │  CREATE_BASE  CREATE_BASE│  │
│                            │  = true       = false    │  │
│                            │  HAS_SUBS     HAS_SUBS   │  │
│                            │  = true       = true     │  │
│                            └────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### Step 0.9: Design Scope Detection (NEW in v4.0)

```
┌───────────────────────────────────────────────────────────────┐
│  SCOPE DETECTION                                               │
│                                                                 │
│  0.9.1: Load Sources                                           │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ Basic Design (BD)│  │ SRS (optional)    │                   │
│  │ {F}-BASE-basic-  │  │ {F}-BASE-srs.md  │                   │
│  │ design.md        │  │                   │                   │
│  └────────┬─────────┘  └────────┬──────────┘                   │
│           └──────────┬──────────┘                               │
│                      ▼                                          │
│  0.9.2: Scan Indicators (case-insensitive, multi-word)         │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  Frontend indicators:                                │       │
│  │  screen, ui component, react, page layout, form,     │       │
│  │  bff, navigation, frontend module, user interface    │       │
│  │                                                       │       │
│  │  Backend indicators:                                  │       │
│  │  service layer, repository, entity, controller,       │       │
│  │  database, batch job, message queue, worker,          │       │
│  │  backend module                                       │       │
│  └──────────────────────┬──────────────────────────────┘       │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  FE > 0 AND BE > 0  →  "fullstack"                  │       │
│  │  FE > 0 AND BE = 0  →  "frontend"                   │       │
│  │  FE = 0 AND BE > 0  →  "backend"                    │       │
│  │  FE = 0 AND BE = 0  →  "fullstack" (default/safe)   │       │
│  └──────────────────────┬──────────────────────────────┘       │
│                          ▼                                      │
│  0.9.3: API Contracts Auto-detect                              │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  api_indicators: api endpoint, rest api, bff,        │       │
│  │                  api contract, http method            │       │
│  │  needs_api = (scope != backend) AND indicators > 0   │       │
│  └──────────────────────┬──────────────────────────────┘       │
│                          ▼                                      │
│  0.9.4: User Confirmation                                      │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  AskUserQuestion:                                     │       │
│  │  ┌──────────────────────────────────────────┐        │       │
│  │  │ 1. Confirm: {detected} (FE:X, BE:Y)     │        │       │
│  │  │ 2. Override: backend                      │        │       │
│  │  │ 3. Override: frontend                     │        │       │
│  │  │ 4. Override: fullstack                    │        │       │
│  │  └──────────────────────────────────────────┘        │       │
│  └──────────────────────┬──────────────────────────────┘       │
│                          ▼                                      │
│              DESIGN_SCOPE = user_choice                         │
│              (applies to ALL sub-features)                      │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 1: Frontend Detail Design (FDD)

```
Scope Guard: SKIP if DESIGN_SCOPE == "backend"

┌───────────────────────────────────────────────────────────────────┐
│  SPECIALIST: frontend-detail-specialist.md (v5.0)                 │
│  Type: Orchestrated Micro-Agent Workflow                          │
│  Execution: DIRECT AGENT — AI reads specialist, NO JS orchestrator│
│  Mode: DESIGN (specification only, no implementation code)        │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ A+B+C Decision ────────────────────────────────────────┐     │
│  │  HAS_SUBFEATURES AND count ≥ 4?                          │     │
│  │     YES → A+B+C Pattern (Portal + Aggregate + Screens)   │     │
│  │     NO  → Traditional 10-agent pattern                    │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ Traditional: 10 Micro-Agents (JIT) ────────────────────┐     │
│  │                                                           │     │
│  │  specialists/document/frontend-dd/                 │     │
│  │                                                           │     │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │     │
│  │  │fdd-00│→│fdd-01│→│fdd-02│→│fdd-03│→│fdd-04│           │     │
│  │  │Doc   │  │Over- │  │Biz   │  │Screen│  │State │           │     │
│  │  │Info  │  │view  │  │Flow  │  │Specs │  │Mgmt  │           │     │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘           │     │
│  │      │                                                    │     │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │     │
│  │  │fdd-05│→│fdd-06│→│fdd-07│→│fdd-08│→│fdd-09│           │     │
│  │  │Data  │  │Error │  │Respon│  │Perf  │  │Visual│           │     │
│  │  │Integ │  │Handle│  │sive  │  │      │  │Design│           │     │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘           │     │
│  │                                                           │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ Enforcement: TodoWrite + Checkpoints + RAG ────────────┐     │
│  │                                                           │     │
│  │  INIT: TodoWrite([ 10 sections as "pending" ])            │     │
│  │                                                           │     │
│  │  FOR section 0 → 9:                                       │     │
│  │    ┌─────────────────────────────────────────────┐       │     │
│  │    │  1. TodoWrite: mark in_progress              │       │     │
│  │    │  2. Read micro-agent file (JIT load)         │       │     │
│  │    │  3. RAG: getGraphContext(fdd-{N})  ◄── Graph │       │     │
│  │    │     + querySpecialists(section_kw) ◄── EPS   │       │     │
│  │    │     (non-blocking, enriches context)          │       │     │
│  │    │  4. Generate with: agent + DD_RAG_* + graph  │       │     │
│  │    │  5. validate-section.js (Layer 1)            │       │     │
│  │    │     └─ FAIL? → regenerate (max 2 retries)    │       │     │
│  │    │  6. Write .checkpoints/fdd-s{N}.lock         │       │     │
│  │    │  7. TodoWrite: mark completed                │       │     │
│  │    └─────────────────────────────────────────────┘       │     │
│  │                                                           │     │
│  │  VERIFY: count(.checkpoints/fdd-s*.lock) == 10            │     │
│  │          FAIL → STOP | PASS → Continue                    │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  OUTPUT: {F}-{S}-frontend-detail-design.md                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. Phase 2: API Contracts

```
Scope Guard: SKIP if DESIGN_SCOPE == "backend"
Auto-detect: SKIP if DESIGN_SCOPE == "frontend" AND no API indicators

┌───────────────────────────────────────────────────────────────────┐
│  API CONTRACTS (no specialist agent — direct derivation)          │
│  No enforcement (single-step process, not multi-agent)            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  RAG: Pattern Loading (non-blocking)                              │
│  ┌────────────────────────────────────────────────────┐          │
│  │  findByStereotype("Controller") → existing APIs    │ ◄── code │
│  │  queryWithArchitecture("api endpoints rest",       │    layer │
│  │    { stereotype: "Controller" }) → naming/DTO      │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                    │
│  Input: Frontend Detail Design document + RAG patterns            │
│  ┌────────────────────────────────────────────────────┐          │
│  │  Screen data needs        → GET endpoints          │          │
│  │  User actions             → POST/PUT/DELETE        │          │
│  │  State mutations          → Request/Response DTOs  │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                    │
│  OUTPUT: {F}-{S}-api-contracts.md                                 │
└───────────────────────────────────────────────────────────────────┘
```

---

## 6. Phase 3: Backend Detail Design (BDD)

```
Scope Guard: SKIP if DESIGN_SCOPE == "frontend"

┌───────────────────────────────────────────────────────────────────┐
│  SPECIALIST: backend-design-specialist.md (v3.0)                  │
│  Type: Direct Micro-Agent Workflow (No Orchestrator)              │
│  Enforcement: 3-Layer (Hooks + TodoWrite + Checkpoints)           │
│  Mode: DESIGN (specification only)                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ Context Loading (scope-dependent) ─────────────────────┐     │
│  │                                                           │     │
│  │  fullstack:                    backend:                   │     │
│  │  ┌────────────────────┐       ┌────────────────────┐     │     │
│  │  │ FDD document       │       │ Basic Design (BD)  │     │     │
│  │  │ API Contracts      │       │ SRS                │     │     │
│  │  │ (frontend-first)   │       │ (no FDD exists)    │     │     │
│  │  └────────────────────┘       └────────────────────┘     │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ 10 Micro-Agents (JIT) ────────────────────────────────┐     │
│  │                                                           │     │
│  │  specialists/document/backend-dd/                  │     │
│  │                                                           │     │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │     │
│  │  │bdd-00│→│bdd-01│→│bdd-02│→│bdd-03│→│bdd-04│           │     │
│  │  │Doc   │  │Svc   │  │Biz   │  │API   │  │Data &│           │     │
│  │  │Info  │  │Over  │  │Logic │  │Endpt │  │DB    │           │     │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘           │     │
│  │      │                                                    │     │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │     │
│  │  │bdd-05│→│bdd-06│→│bdd-07│→│bdd-08│→│bdd-09│           │     │
│  │  │Integ │  │Error │  │Perf  │  │Secur │  │Test  │           │     │
│  │  │ation │  │Handle│  │      │  │ity   │  │Cases │           │     │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘           │     │
│  │                                                           │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ 3-Layer Enforcement + RAG ─────────────────────────────┐     │
│  │                                                           │     │
│  │  INIT: mkdir .checkpoints; TodoWrite([ 10 pending ])      │     │
│  │                                                           │     │
│  │  STEREOTYPE_MAP (section → stereotype):                   │     │
│  │    1:Service  2:Service  3:Controller  4:Repository       │     │
│  │    5:Service  6:Service  7:Service  8:Service  9:Service  │     │
│  │                                                           │     │
│  │  FOR section 0 → 9:                                       │     │
│  │    ┌─────────────────────────────────────────────┐       │     │
│  │    │  Layer 1 (Hook): validate previous section   │       │     │
│  │    │     └─ validate-section.js [doc, N-1]        │       │     │
│  │    │                                              │       │     │
│  │    │  Layer 2 (TodoWrite): mark in_progress       │       │     │
│  │    │                                              │       │     │
│  │    │  GENERATE: Load bdd-0{N}-*.md (JIT)          │       │     │
│  │    │                                              │       │     │
│  │    │  RAG: retrieveSimilarPatterns(     ◄── code   │       │     │
│  │    │    STEREOTYPE_MAP[N], feature_module, layer   │       │     │
│  │    │    {limit:3, minConfidence:0.7})              │       │     │
│  │    │  + getGraphContext(bdd-{N})        ◄── graph  │       │     │
│  │    │  (non-blocking, injects real code patterns)   │       │     │
│  │    │                                              │       │     │
│  │    │  Generate with: agent + RAG + DD_RAG_CODE    │       │     │
│  │    │                                              │       │     │
│  │    │  Layer 1 (Hook): validate current section    │       │     │
│  │    │     └─ validate-section.js [doc, N]          │       │     │
│  │    │                                              │       │     │
│  │    │  Layer 3 (Checkpoint): write lock file       │       │     │
│  │    │     └─ .checkpoints/bdd-s{N}.lock            │       │     │
│  │    │                                              │       │     │
│  │    │  Layer 2 (TodoWrite): mark completed         │       │     │
│  │    └─────────────────────────────────────────────┘       │     │
│  │                                                           │     │
│  │  VERIFY: count(.checkpoints/bdd-s*.lock) == 10            │     │
│  │          FAIL → STOP | PASS → Continue                    │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  OUTPUT: {F}-{S}-backend-detail-design.md                         │
└───────────────────────────────────────────────────────────────────┘
```

---

## 7. A+B+C Pattern (Alternative to Traditional FDD)

```
Trigger: HAS_SUBFEATURES AND sub_feature_count ≥ 4
Scope:   frontend OR fullstack ONLY (backend excluded)
Benefit: 74% duplication reduction

┌───────────────────────────────────────────────────────────────────┐
│  A+B+C FDD PATTERN                                                │
│  Agents: specialists/document/frontend-dd/                 │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ Document A: Portal FDD ──────────────────────────────────┐   │
│  │  Agent: portal-fdd-agent.md                                │   │
│  │  Sections: A.01-A.06                                       │   │
│  │  Content:                                                   │   │
│  │    - Cross-feature business workflows (Mermaid sequences)  │   │
│  │    - User journeys (UJ-XXX IDs)                            │   │
│  │    - API strategy (granular vs BFF)                         │   │
│  │    - Event architecture                                     │   │
│  │  Output: {FEATURE}-portal-fdd.md                           │   │
│  └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                       │
│  ┌─ Document B: Aggregate FDD ───────────────────────────────┐   │
│  │  Agent: aggregate-fdd-agent.md                             │   │
│  │  Sections: B.00-B.08                                       │   │
│  │  Content:                                                   │   │
│  │    - App shell & routing configuration                     │   │
│  │    - Shared components (SC-XXX IDs)                        │   │
│  │    - Root state architecture                                │   │
│  │    - Error handling, responsive design                      │   │
│  │  Output: {FEATURE}-aggregate-fdd.md                        │   │
│  └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                       │
│  ┌─ Document C: Screens FDD (PER SUB-FEATURE) ──────────────┐   │
│  │  Agent: screens-fdd-agent.md                               │   │
│  │  Sections: C.01-C.05                                       │   │
│  │  Content:                                                   │   │
│  │    - Module overview (references Document A)               │   │
│  │    - Screen specifications (references Document B)         │   │
│  │    - Module-specific state                                  │   │
│  │    - API integration (references A strategy)                │   │
│  │  Output: {FEATURE}-{SUB}-screens-fdd.md                   │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  Repeated for each sub-feature:                    │      │   │
│  │  │  {FEATURE}-SUB1-screens-fdd.md                    │      │   │
│  │  │  {FEATURE}-SUB2-screens-fdd.md                    │      │   │
│  │  │  {FEATURE}-SUB3-screens-fdd.md                    │      │   │
│  │  │  ...                                               │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  vs Traditional: 10 agents × N sub-features = 10N documents      │
│  A+B+C: 2 shared + N screens = N+2 documents (74% reduction)    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 8. Post-Generation Pipeline

```
┌───────────────────────────────────────────────────────────────────┐
│  POST-GENERATION                                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ Pseudo-code Generation ────────────────────────────────┐     │
│  │  Utility: core/pseudo-code/generator.js (v1.0)  │     │
│  │                                                           │     │
│  │  FDD exists? ──YES──▶ PseudoCodeGenerator(fdd, srs,      │     │
│  │       │                "FRONTEND_DD") → .pseudo file      │     │
│  │       NO ──▶ Skip                                         │     │
│  │                                                           │     │
│  │  BDD exists? ──YES──▶ PseudoCodeGenerator(bdd, srs,      │     │
│  │       │                "BACKEND_DD") → .pseudo file       │     │
│  │       NO ──▶ Skip                                         │     │
│  │                                                           │     │
│  │  PseudoCodeValidator (non-blocking validation)            │     │
│  │                                                           │     │
│  │  ┌─────────────┬──────────┬──────────┐                   │     │
│  │  │ backend     │ frontend │ fullstack│                   │     │
│  │  │ FDD: Skip   │ FDD: Gen │ FDD: Gen │                   │     │
│  │  │ BDD: Gen    │ BDD: Skip│ BDD: Gen │                   │     │
│  │  └─────────────┴──────────┴──────────┘                   │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ RAG Index & Graph Update (NEW in v4.1) ──────────────┐     │
│  │                                                           │     │
│  │  For each generated document (FDD/BDD/API):              │     │
│  │    indexContent(content, docType, "DD_COMPLETE")           │     │
│  │    └─ Stores in design layer for future features          │     │
│  │                                                           │     │
│  │    extractAndUpdate(content, docType, sectionId)           │     │
│  │    └─ Creates graph entities & relationships              │     │
│  │                                                           │     │
│  │  ┌─────────────┬──────────┬──────────┐                   │     │
│  │  │ backend     │ frontend │ fullstack│                   │     │
│  │  │ FDD: —      │ FDD: Idx │ FDD: Idx │                   │     │
│  │  │ BDD: Idx    │ BDD: —   │ BDD: Idx │                   │     │
│  │  │ API: —      │ API: ?   │ API: Idx │                   │     │
│  │  └─────────────┴──────────┴──────────┘                   │     │
│  │                                                           │     │
│  │  Non-blocking: failures don't affect DD output            │     │
│  │  Feedback loop: makes RAG smarter for next feature        │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ State Update ──────────────────────────────────────────┐     │
│  │  node state-manager.js update DD_CREATED                  │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ Post-Workflow (MANDATORY) ─────────────────────────────┐     │
│  │                                                           │     │
│  │  1. evidence.md → add "### 3.3 DD Summary"               │     │
│  │     - Document list, scope, key outputs                   │     │
│  │     - Corrections to innovate decisions (if any)          │     │
│  │                                                           │     │
│  │  2. context.md → append to Decisions Log                  │     │
│  │     - Phase: DESIGN_DD, scope, doc count                  │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─ Completion Message ────────────────────────────────────┐     │
│  │  ✅ DETAIL DESIGN CREATED (Scope: {DESIGN_SCOPE})        │     │
│  │  Documents: [scope-dependent list]                        │     │
│  │  Enforcement: FDD 10/10, BDD 10/10                       │     │
│  │  Next command: /plan                                      │     │
│  └───────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 9. Complete File Map

### Command Layer

| File | Version | Lines | Purpose |
|------|---------|-------|---------|
| `commands/design.md` | v3.0 | 184 | Router — parse option, validate state, dispatch |
| `commands/design/detail.md` | v4.0 | 906 | Micro-command — G0 Gate, Scope Detection, Phase 1-3 |

### Specialist Layer

| File | Version | Type | Purpose |
|------|---------|------|---------|
| `.claude/agents/frontend-detail-specialist.md` | v5.0 | Orchestrated Micro-Agent | FDD orchestration instructions |
| `.claude/agents/backend-design-specialist.md` | v3.0 | Direct Micro-Agent (No Orchestrator) | BDD orchestration instructions |

### Micro-Agent Layer — FDD (10 agents)

| File | Section |
|------|---------|
| `specialists/document/frontend-dd/fdd-00-document-info.md` | 00: Document Information |
| `specialists/document/frontend-dd/fdd-01-overview.md` | 01: Overview |
| `specialists/document/frontend-dd/fdd-02-business-flow.md` | 02: Business Flow |
| `specialists/document/frontend-dd/fdd-03-screens.md` | 03: Screen Specifications |
| `specialists/document/frontend-dd/fdd-04-state.md` | 04: State Management |
| `specialists/document/frontend-dd/fdd-05-data-integration.md` | 05: Data Integration |
| `specialists/document/frontend-dd/fdd-06-error.md` | 06: Error Handling |
| `specialists/document/frontend-dd/fdd-07-responsive.md` | 07: Responsive Design |
| `specialists/document/frontend-dd/fdd-08-performance.md` | 08: Performance |
| `specialists/document/frontend-dd/fdd-09-visual-design.md` | 09: Visual Design |

### Micro-Agent Layer — BDD (10 agents)

| File | Section |
|------|---------|
| `specialists/document/backend-dd/bdd-00-document-info.md` | 00: Document Information |
| `specialists/document/backend-dd/bdd-01-service-overview.md` | 01: Service Overview |
| `specialists/document/backend-dd/bdd-02-business-logic.md` | 02: Business Logic |
| `specialists/document/backend-dd/bdd-03-api-endpoints.md` | 03: API Endpoints |
| `specialists/document/backend-dd/bdd-04-data-database.md` | 04: Data & Database |
| `specialists/document/backend-dd/bdd-05-integration.md` | 05: Integration |
| `specialists/document/backend-dd/bdd-06-error-handling.md` | 06: Error Handling |
| `specialists/document/backend-dd/bdd-07-performance.md` | 07: Performance |
| `specialists/document/backend-dd/bdd-08-security.md` | 08: Security |
| `specialists/document/backend-dd/bdd-09-test-cases.md` | 09: Test Cases |

### Micro-Agent Layer — A+B+C (3 agents, frontend/fullstack only)

| File | Document | Purpose |
|------|----------|---------|
| `specialists/document/frontend-dd/portal-fdd-agent.md` | A: Portal | Cross-feature workflows, journeys, API strategy |
| `specialists/document/frontend-dd/aggregate-fdd-agent.md` | B: Aggregate | App shell, shared components, root state |
| `specialists/document/frontend-dd/screens-fdd-agent.md` | C: Screens | Module-specific screens (per sub-feature) |

### Utility Layer

| File | Exists | Purpose |
|------|--------|---------|
| `.claude/hooks/validate-section.js` | YES | Layer 1 enforcement — section validation |
| `core/pseudo-code/generator.js` | YES | Transform DD → pseudo-code for /plan |
| `core/state/state-manager.js` | YES | State transitions (INNOVATE_DD_APPROVED → DD_CREATED) |
| `.claude/utils/tests/fdd-validator.js` | NO | FDD quality validation (not yet implemented) |
| `.claude/utils/tests/bdd-validator.js` | NO | BDD quality validation (not yet implemented) |

### RAG Service Layer (v4.1)

| File | Purpose | Used In |
|------|---------|---------|
| `core/rag/hipporag-service.js` | Unified RAG 2.0 facade (vector + graph) | Step 0.6, Phase 1-3, Post-Gen |
| `core/rag/hipporag-client.js` | Low-level HTTP client for HippoRAG server | (via hipporag-service) |
| `core/rag/global-graph-service.js` | Graph traversal, impact analysis, cache | Phase 3 RAG, Post-Gen graph |
| `core/rag/embedding-provider.js` | TEI embeddings (BAAI/bge-m3, 1024 dims) | (via hipporag-service) |
| `core/mcp/specialist-loader.js` | Dynamic specialist discovery | Step 0.6 preload |

---

## 12. RAG 2.0 Integration Map

```
┌───────────────────────────────────────────────────────────────────┐
│  RAG TOUCHPOINTS IN /design --detail                              │
│  Total: 6 integration points (v4.1)                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ READ (consume from RAG) ─────────────────────────────────┐   │
│  │                                                             │   │
│  │  Step 0.5: Stack Context                                    │   │
│  │    └─ eps layer: specialist patterns                        │   │
│  │    └─ arch layer: architecture compliance patterns          │   │
│  │    └─ arch fallback: Basic Design Section 1.2               │   │
│  │                                                             │   │
│  │  Step 0.6: DD Context Preload (NEW)                         │   │
│  │    └─ design layer: existing DD patterns from past features │   │
│  │    └─ code layer: actual implementation patterns            │   │
│  │    └─ SpecialistLoader: matched specialists by tech stack   │   │
│  │                                                             │   │
│  │  Phase 1 FDD: Per-Agent RAG (NEW)                           │   │
│  │    └─ getGraphContext(fdd-{N}): entity relationships        │   │
│  │    └─ querySpecialists(section_kw): section-specific guides │   │
│  │                                                             │   │
│  │  Phase 2 API: Pattern RAG (NEW)                             │   │
│  │    └─ findByStereotype("Controller"): existing API patterns │   │
│  │    └─ queryWithArchitecture(): naming conventions, DTOs     │   │
│  │                                                             │   │
│  │  Phase 3 BDD: RAG Pattern Retrieval                         │   │
│  │    └─ retrieveSimilarPatterns(stereotype, module):           │   │
│  │       Service → bdd-01,02,05,06,07,08,09                   │   │
│  │       Controller → bdd-03                                   │   │
│  │       Repository → bdd-04                                   │   │
│  │    └─ getGraphContext(bdd-{N}): entity relationships        │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ WRITE (feed back to RAG) ────────────────────────────────┐   │
│  │                                                             │   │
│  │  Post-Generation: RAG Index & Graph (NEW)                   │   │
│  │    └─ indexContent(fdd, "fdd", "DD_COMPLETE")               │   │
│  │    └─ indexContent(bdd, "bdd", "DD_COMPLETE")               │   │
│  │    └─ indexContent(api, "fdd", "DD_COMPLETE")               │   │
│  │    └─ extractAndUpdate(content, docType, sectionId)          │   │
│  │       → Creates graph entities for architecture compliance   │   │
│  │                                                             │   │
│  │  FEEDBACK LOOP:                                             │   │
│  │  Feature A generates DD → indexed into RAG                  │   │
│  │  Feature B queries RAG → gets Feature A patterns            │   │
│  │  Feature B generates better DD → indexed → Feature C ...    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  All RAG calls are NON-BLOCKING: failures → continue without RAG  │
└───────────────────────────────────────────────────────────────────┘

Layer Priority (design-detail):
  Primary:   ["eps", "design", "arch"]
  Secondary: ["code"]
```

---

## 10. AI-Tracked Variables

These variables are determined during execution and carried forward by the AI
(not shell environment variables — they exist only in the AI's working memory):

| Variable | Set In | Values | Used In |
|----------|--------|--------|---------|
| `DESIGN_SCOPE` | Step 0.9 | `"backend"` / `"frontend"` / `"fullstack"` | Phase 1, 2, 3, Sub-Features, Completion |
| `needs_api_contracts` | Step 0.9.3 | `true` / `false` | Phase 2 scope guard |
| `CREATE_BASE` | Step 0.8 | `true` / `false` | Sub-Feature Processing |
| `HAS_SUBFEATURES` | Step 0.8 | `true` / `false` | Sub-Feature Processing, A+B+C check |
| `use_abc_pattern` | Phase 1 | `true` / `false` | Phase 1 FDD document structure |
| `DD_RAG_DESIGNS` | Step 0.6 | `array` (existing DD patterns from design layer) | Phase 1, 2, 3 per-agent context |
| `DD_RAG_CODE` | Step 0.6 | `array` (code patterns from code layer) | Phase 1, 2, 3 per-agent context |
| `DD_RAG_SPECIALISTS` | Step 0.6 | `array` (matched specialist filenames) | Phase 1, 3 per-agent context |

---

## 11. Sub-Feature Processing Flow

```
┌───────────────────────────────────────────────────────────────────┐
│  SUB-FEATURE PROCESSING                                           │
│  Rule: DESIGN_SCOPE detected once for BASE, applied to ALL subs  │
│  Evidence: real projects show consistent scope within feature      │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Case 1: CREATE_BASE = true                                       │
│  ┌───────────────────────────────────────────────────┐           │
│  │  1. Create BASE documents (scope-dependent 1-3)    │           │
│  │     │                                              │           │
│  │     ▼                                              │           │
│  │  2. FOR EACH sub-feature:                          │           │
│  │     ├── Phase 1 (if scope allows)                  │           │
│  │     ├── Phase 2 (if scope allows)                  │           │
│  │     ├── Phase 3 (if scope allows)                  │           │
│  │     └── + Service Boundaries section               │           │
│  │     (SAME DESIGN_SCOPE — no re-detection)          │           │
│  └───────────────────────────────────────────────────┘           │
│                                                                    │
│  Case 2: CREATE_BASE = false, HAS_SUBFEATURES = true             │
│  ┌───────────────────────────────────────────────────┐           │
│  │  FOR EACH sub-feature:                             │           │
│  │     ├── Phase 1 (if scope allows)                  │           │
│  │     ├── Phase 2 (if scope allows)                  │           │
│  │     ├── Phase 3 (if scope allows)                  │           │
│  │     └── + Service Boundaries section               │           │
│  └───────────────────────────────────────────────────┘           │
│                                                                    │
│  Case 3: Single feature (no sub-features)                         │
│  ┌───────────────────────────────────────────────────┐           │
│  │  Phase 1 → Phase 2 → Phase 3 (scope-dependent)    │           │
│  └───────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

*/design --detail Flow Visualization v4.1*
*Document: detail-flow.md*
*Source: detail.md (1048 lines) + specialist agents + micro-agents + RAG 2.0*
*RAG: 6 touchpoints (Preload + FDD per-agent + API patterns + BDD patterns + Post-Gen Index)*
*Created: 2026-02-20 | Updated: 2026-02-20 (RAG 2.0 integration)*
