# /design --test — Complete Flow Visualization

> **Version**: v3.0
> **Last Updated**: 2026-02-26
> **Related**: [test.md](test.md) (workflow), [design.md](../design.md) (router)

---

## 1. High-Level Flow

```
USER: /design --test
        │
        ▼
┌──────────────────┐     ┌─────────────────────────────────┐
│  ROUTER           │     │  commands/design.md     │
│  (184 lines)      │────▶│  v3.0 — Thin Router             │
└──────────────────┘     │                                   │
                          │  1. Parse --test                  │
                          │  2. Check SRS exists (minimum)    │
                          │  3. No quality gate (optional)    │
                          │  4. Read(design/test.md) ─────────┼──┐
                          └─────────────────────────────────┘  │
                                                                │
        ┌───────────────────────────────────────────────────────┘
        ▼
┌──────────────────┐     ┌─────────────────────────────────┐
│  MICRO-COMMAND    │     │  commands/design/        │
│  (~580 lines)     │────▶│  test.md v3.0                    │
│  Self-contained   │     │  Test Plan Workflow              │
└──────────────────┘     └─────────────────────────────────┘
        │
        ▼
   ┌────────────────────────────────────────────────┐
   │          SEQUENTIAL EXECUTION PIPELINE          │
   │                                                  │
   │  Step 0.5  Stack Context Loading ◄──── RAG: eps+arch layers
   │     │                                            │
   │     ▼                                            │
   │  Step 0.6  RAG Context Preload ◄───── RAG: design+code layers
   │     │        + SpecialistLoader         + TP_RAG_DESIGNS
   │     │                                   + TP_RAG_CODE
   │     ▼                                   + TP_RAG_SPECIALISTS
   │  Step 0.8  BASE Necessity Check                  │
   │     │                                            │
   │     ▼                                            │
   │  Step 1    Read Master Specialist                │
   │     │        (test-plan-specialist.md)            │
   │     ▼                                            │
   │  Step 2    Context Level Detection ──┐           │
   │     │                                │           │
   │     ▼                                ▼           │
   │  ┌──────────┬────────────┬──────────┐            │
   │  │  BASIC   │  MODERATE  │ DETAILED │            │
   │  │ SRS only │  BD exists │ DD exists│            │
   │  └────┬─────┴─────┬──────┴────┬─────┘            │
   │       │           │           │                   │
   │       └───────────┴───────────┘                   │
   │                   │                               │
   │  Step 3    Enforcement Loop (10 agents) ──────────┤
   │     │        Content first, aggregates last       │
   │     │        Drop-and-summarize                   │
   │     ▼                                            │
   │  Step 4    Quality Validation                    │
   │     │        Cross-section checks                 │
   │     ▼                                            │
   │  Step 5    Write Document                        │
   │     │        BASE + sub-features logic            │
   │     ▼                                            │
   │  Post-Workflow                                    │
   │     │  Evidence update + RAG index                │
   │     ▼                                            │
   │  Completion Message                              │
   └──────────────────────────────────────────────────┘
```

---

## 2. Context Level Detection

```
┌─────────────────────────────────────────────────────────────┐
│                  CONTEXT LEVEL DETECTION                      │
├──────────────┬──────────────────┬────────────────────────────┤
│              │ Documents Found  │ Test Case Granularity       │
├──────────────┼──────────────────┼────────────────────────────┤
│  BASIC       │ SRS only         │ Per FR-ID                   │
│  MODERATE    │ BD exists         │ Per component/module        │
│  DETAILED    │ DD exists         │ Per endpoint/method          │
└──────────────┴──────────────────┴────────────────────────────┘

Detection logic:
  IF dd_backend OR dd_frontend → DETAILED
  ELIF bd_file → MODERATE
  ELSE → BASIC
```

---

## 3. Enforcement Loop — Execution Order

```
┌─────────────────────────────────────────────────────────────┐
│            ENFORCEMENT LOOP (10 agents, reordered)            │
│                                                               │
│  ┌─────────────┐                                              │
│  │   tp-00      │ ← Document Info (metadata, no RAG)          │
│  │ Doc Info     │                                              │
│  └──────┬──────┘                                              │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-03      │──▶│ tps-java-unit    │ (scope-aware)         │
│  │ Unit Tests   │   │ tps-nextjs-unit  │                       │
│  └──────┬──────┘   └──────────────────┘                       │
│         ▼    drop summary + ID counters                        │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-04      │──▶│ tps-java-integ   │ (scope-aware)         │
│  │ Integration  │   │ tps-nextjs-integ │                       │
│  └──────┬──────┘   └──────────────────┘                       │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-05      │──▶│ tps-nextjs-e2e   │                       │
│  │ E2E Tests    │   └──────────────────┘                       │
│  └──────┬──────┘                                              │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-06      │──▶│ tps-nextjs-manual│                       │
│  │ Manual Tests │   └──────────────────┘                       │
│  └──────┬──────┘                                              │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-07      │──▶│ tps-java-perf    │                       │
│  │ Performance  │   └──────────────────┘                       │
│  └──────┬──────┘                                              │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-08      │──▶│ tps-java-security│                       │
│  │ Security     │   └──────────────────┘                       │
│  └──────┬──────┘                                              │
│         │                                                      │
│         │  ◄── section_summaries collected ──►                  │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-02      │──▶│ tps-coverage     │ ← needs test IDs      │
│  │ Coverage     │   └──────────────────┘                       │
│  └──────┬──────┘                                              │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-01      │──▶│ tps-strategy     │ ← needs total count   │
│  │ Strategy     │   └──────────────────┘                       │
│  └──────┬──────┘                                              │
│         ▼                                                      │
│  ┌─────────────┐   ┌──────────────────┐                       │
│  │   tp-09      │──▶│ tps-execution    │ ← needs full scope    │
│  │ Exec Plan    │   └──────────────────┘                       │
│  └─────────────┘                                              │
│                                                               │
│  Verify: 10/10 completed via TodoWrite                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. RAG 2.0 Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG 2.0 INTEGRATION                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  READ (Pre-generation):                                       │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Step 0.5  RAG query: eps + arch layers               │     │
│  │           → SPECIALIST_PATTERNS, ARCH_PATTERNS       │     │
│  │                                                       │     │
│  │ Step 0.6  RAG query: design + code layers            │     │
│  │           → TP_RAG_DESIGNS, TP_RAG_CODE              │     │
│  │           + SpecialistLoader → TP_RAG_SPECIALISTS    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  READ (Per-agent — in Step 3 loop):                           │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ tp-03/04: findByStereotype("Service", "Component",  │     │
│  │           "Controller", "Repository")                 │     │
│  │ tp-05:    getContext("e2e test critical flows")       │     │
│  │ tp-06:    getContext("accessibility responsive")      │     │
│  │ tp-07:    queryWithArchitecture("performance load")   │     │
│  │ tp-08:    queryWithArchitecture("security keycloak")  │     │
│  │ tp-01/02/09: getContext("strategy/coverage/execution")│     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  WRITE (Post-generation):                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Post-Workflow: indexContent + extractAndUpdate        │     │
│  │               → RAG design layer (for future features)│     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  Interface Contract: Method names are contracts.              │
│  hipporag-service.js adapter absorbs server changes.          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Specialist + RAG Query Map

| Agent | Specialist(s) | RAG Method | Query/Stereotype |
|-------|--------------|-----------|-----------------|
| tp-00 | Master only | — | No RAG |
| tp-01 | tps-strategy | `getContext` | `"test strategy risk assessment {feature}"` |
| tp-02 | tps-coverage | `getContext` | `"test coverage requirements mapping {feature}"` |
| tp-03 | tps-java-unit + tps-nextjs-unit | `findByStereotype` | `"Service"` + `"Component"` |
| tp-04 | tps-java-integration + tps-nextjs-integration | `findByStereotype` | `"Controller"` + `"Repository"` |
| tp-05 | tps-nextjs-e2e | `getContext` | `"e2e test critical flows {feature}"` |
| tp-06 | tps-nextjs-manual | `getContext` | `"accessibility responsive testing"` |
| tp-07 | tps-java-performance | `queryWithArchitecture` | `"performance load testing reactive"` |
| tp-08 | tps-java-security | `queryWithArchitecture` | `"security authentication keycloak owasp"` |
| tp-09 | tps-execution | `getContext` | `"test execution environment schedule"` |

---

## 6. Complete File Map

### New Files (created by this workflow's agents)

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1-4 | `specialists/java-springboot/test-plan/tps-java-*.md` | ~480 | Java testing patterns |
| 5-8 | `specialists/nextjs/test-plan/tps-nextjs-*.md` | ~460 | Next.js testing patterns |
| 9-11 | `specialists/_shared/test-plan/tps-*.md` | ~300 | Shared strategy/coverage/execution |
| 12-21 | `micro-agents/test-plan/tp-{00..09}-*.md` | ~1,700 | Section generators |
| 22 | `micro-agents/test-plan/README.md` | ~80 | Agent index |
| 23 | `commands/design/test.md` | ~580 | This workflow |
| 24 | `commands/design/test-flow.md` | ~280 | This visualization |

### Existing Files (referenced, not modified)

| File | Purpose |
|------|---------|
| `commands/design.md` | Router (reads test.md) |
| `agents/test-plan-specialist.md` | Master specialist (global rules) |
| `utils/rag/hipporag-service.js` | RAG adapter (interface contracts) |
| `core/state/state-manager.js` | Feature context |
| `.claude/config/project-config.json` | Stack configuration |

---

## 7. Variable Reference

| Variable | Set In | Values | Used In |
|----------|--------|--------|---------|
| `CREATE_BASE` | Step 0.8 | true/false | Step 5 |
| `HAS_SUBFEATURES` | Step 0.8 | true/false | Step 5 |
| `TP_RAG_DESIGNS` | Step 0.6 | array | Step 3 per-agent |
| `TP_RAG_CODE` | Step 0.6 | array | Step 3 per-agent |
| `TP_RAG_SPECIALISTS` | Step 0.6 | array | Step 3 per-agent |
| `context_level` | Step 2 | BASIC/MODERATE/DETAILED | Step 3, templates |
| `section_summaries` | Step 3 loop | dict per-section | tp-01, tp-02, tp-09 |
| `test_id_counters` | Step 3 loop | dict ID→last_num | Uniqueness check |

---

## 8. Context Management (Solution C)

```
┌─────────────────────────────────────────────────────────────┐
│              CONTEXT MANAGEMENT STRATEGY                      │
│                                                               │
│  Problem: 10 agents × full context = context overflow         │
│                                                               │
│  Solution C: 3-part strategy                                  │
│                                                               │
│  1. Per-agent DD Scoping                                      │
│     TP_DD_SCOPE maps agent → relevant DD sections             │
│     tp-03 reads only DD Section 2 (services)                  │
│     tp-04 reads only DD Section 3 (endpoints)                 │
│     tp-06 reads only SRS (no DD needed)                       │
│                                                               │
│  2. Drop-and-Summarize                                        │
│     After each agent generates:                               │
│       section_summaries[N] = {                                │
│         heading, test_count, last_test_ids, covered_FRs       │
│       }                                                       │
│     Full generated text → appended to document                │
│     Only summary carried forward to next agent                │
│                                                               │
│  3. Execution Reorder                                         │
│     Content first: tp-03→04→05→06→07→08                      │
│     Aggregates last: tp-02→01→09                              │
│     Aggregates receive summaries, not full content            │
└─────────────────────────────────────────────────────────────┘
```

---

*/design --test — Complete Flow Visualization v3.0*
*10 agents (tp-00→09) + 11 specialists + RAG 2.0 deep integration*
*Context Management: Solution C (DD scoping + drop-and-summarize + reorder)*
