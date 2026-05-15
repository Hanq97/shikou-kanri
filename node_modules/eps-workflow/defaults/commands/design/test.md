# /design --test Workflow v3.0

## Purpose
Create Test Plan document with risk-based, automation-first strategy

**Agent**: test-plan-specialist (loaded via specialist-load)
**Agent Spec**: `specialists/document/test-plan/_orchestrator.md` (NOTE: does NOT exist on disk — fallback to inline rules)
**Micro-Agents**: 10 agents (tp-00 through tp-09)
**Test-Type Specialists**: Future enhancement (tps-*.md files not yet created)
**Execution**: Direct Agent (No Orchestrator)
**Output**: `[FEATURE]-[SUB]-test-plan.md`

---

## Pre-requisites (Validated by Router)
- Minimum: SRS must exist
- Recommended: Detail Design exists (for detailed test cases)
- No quality gate (Test Plan is optional document)
- No state transition (Router line 45+147)

---

## Step 0.5: Stack Context Loading (v5.4)

Load project stack configuration and export variables for specialist agents:

```bash
echo "📦 Loading stack context..."

# 1. Load project stack configuration from project-config.json
STACK_CONFIG_PATH=".claude/config/project-config.json"

# Load stack configuration via ops.js
node core/cli/ops.js stack-load
eval "$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  const sd=d.stackData||{};
  const be=sd.backend||{};
  const fe=sd.frontend||{};
  const infra=sd.infrastructure||{};
  console.log('export STACK_BACKEND_FRAMEWORK=\"'+(be.framework||'spring-boot')+'\"');
  console.log('export STACK_FRONTEND_FRAMEWORK=\"'+(fe.framework||'nextjs')+'\"');
  console.log('export STACK_ORM=\"'+(be.patterns&&be.patterns.orm||'R2DBC')+'\"');
  console.log('export STACK_UI_LIBRARY=\"'+(fe.uiLibrary||'antd')+'\"');
  console.log('export STACK_STATE_MANAGEMENT=\"'+(fe.stateManagement||'redux-toolkit')+'\"');
  console.log('export STACK_INFRASTRUCTURE=\"'+Object.entries(infra).map(([k,v])=>k+':'+v).join(', ')+'\"');
" 2>/dev/null)"

echo "   Source roots: loaded via ops.js stack-load"

# 2. Query RAG for stack-specific patterns (non-blocking)
SPECIALIST_PATTERNS=""
if command -v node &> /dev/null; then
  node core/cli/ops.js rag-query --query "${STACK_BACKEND_FRAMEWORK:-spring-boot} patterns best practices" --command design-test 2>/dev/null
  SPECIALIST_PATTERNS=$(node -e "
    try {
      const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
      const chunks=(r.data&&r.data.chunks)||[];
      console.log(JSON.stringify(chunks.filter(c=>c.score>0.7)));
    } catch(e) {}
  " 2>/dev/null || echo "")
fi

export SPECIALIST_PATTERNS

# 3. Query RAG for architecture compliance patterns
ARCH_PATTERNS=""
ARCH_LAYERS=""
ARCH_CONSTRAINTS=""
if command -v node &> /dev/null; then
  node core/cli/ops.js arch-detect 2>/dev/null
  ARCH_RESULT=$(node -e "
    try {
      const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
      console.log(JSON.stringify(r.data||{patterns:[],layers:[],source:'none'}));
    } catch(e) { console.log('{\"patterns\":[],\"layers\":[],\"source\":\"error\"}'); }
  " 2>/dev/null || echo '{"patterns":[],"layers":[],"source":"error"}')

  ARCH_PATTERNS=$(node -e "try{const j=JSON.parse(process.argv[1]);console.log((j.patterns||[]).join(', '))}catch(e){}" "$ARCH_RESULT" 2>/dev/null || echo "")
  ARCH_LAYERS=$(node -e "try{const j=JSON.parse(process.argv[1]);console.log((j.layers||[]).join(' -> '))}catch(e){}" "$ARCH_RESULT" 2>/dev/null || echo "")
  ARCH_SOURCE=$(node -e "try{const j=JSON.parse(process.argv[1]);console.log(j.source||'none')}catch(e){console.log('none')}" "$ARCH_RESULT" 2>/dev/null || echo "none")

  if [ "$ARCH_SOURCE" = "rag" ]; then
    echo "   📐 Architecture (RAG): $ARCH_PATTERNS"
    echo "   📐 Layers: $ARCH_LAYERS"
  fi
fi

# 4. Fallback: Load from Basic Design if RAG unavailable
if [ -z "$ARCH_PATTERNS" ] || [ "$ARCH_SOURCE" != "rag" ]; then
  BD_FILE=$(find documents/features -name "*-basic-design.md" 2>/dev/null | head -1)
  if [ -n "$BD_FILE" ] && [ -f "$BD_FILE" ]; then
    ARCH_FROM_BD=$(node -e "
      const fs = require('fs');
      const content = fs.readFileSync(process.argv[1], 'utf8');
      const section12 = content.match(/##\\s*1\\.2[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s*1\\.[3-9]|\\n##\\s*2\\.)/);
      if (section12) {
        const rows = section12[1].match(/\\|\\s*([^|]+)\\s*\\|/g) || [];
        const patterns = rows.slice(2)
          .map(r => r.replace(/[|]/g, '').trim())
          .filter(r => r && !r.includes('---'))
          .slice(0, 5);
        console.log(patterns.join(', '));
      }
    " "$BD_FILE" 2>/dev/null || echo "")
    if [ -n "$ARCH_FROM_BD" ]; then
      ARCH_PATTERNS="$ARCH_FROM_BD"
      echo "   📐 Architecture (Basic Design): $ARCH_PATTERNS"
    fi
  fi
fi

# 5. Default architecture constraints (always applied)
ARCH_CONSTRAINTS="Follow layer boundaries; Use dependency injection; No cross-layer direct calls; Respect Basic Design patterns"

export ARCH_PATTERNS
export ARCH_LAYERS
export ARCH_CONSTRAINTS

echo "✅ Stack context loaded"
echo ""
```

**Stack Variables Available for Specialists**:

| Variable | Default | Description |
|----------|---------|-------------|
| `STACK_BACKEND_FRAMEWORK` | spring-boot | Backend framework |
| `STACK_FRONTEND_FRAMEWORK` | nextjs | Frontend framework |
| `STACK_ORM` | R2DBC | ORM/Database library |
| `STACK_UI_LIBRARY` | antd | UI component library |
| `STACK_STATE_MANAGEMENT` | redux-toolkit | State management |
| `SPECIALIST_PATTERNS` | (empty) | RAG-retrieved specialist patterns |
| `ARCH_PATTERNS` | (empty) | Architecture patterns |
| `ARCH_CONSTRAINTS` | (default) | Architecture constraints to enforce |

---

## Step 0.55: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Validates that current workflow state allows Test Plan generation
- Expected state: DETAIL_DESIGN_CREATED or design phase completed
- If FAIL: STOP and display state violation — user must complete prerequisite phases
- If PASS: Continue to Step 0.56

---

## Step 0.56: Quality Gate D3

Invoke the **quality-gate-check** skill with gate D3 (Design Completeness):
- Validates that detail design documents exist and meet quality criteria
- If FAIL: Display gate violations — user must complete detail design first
- If PASS: Continue to Step 0.6

---

## Step 0.6: RAG Context Preload for Test Plan

**WHY**: LAYER_PRIORITY for test plan = primary ["code", "arch", "docs"], secondary ["eps"].
Step 0.5 queries eps+arch. This step loads **docs-layer** (existing test plans from past features) and **code-layer** (actual test files + implementation patterns) to ground test generation in real project data.

```pseudo
# RAG 2.0: Pre-load context for Test Plan generation (ALL non-blocking)
try:
    rag = HippoRAGService.getInstance(feature, branch)

    # 1. Docs layer: existing test plans and test strategies
    design_results = await rag.getContext(
        f"{feature} test plan strategy coverage unit integration e2e",
        { name: "tp-preload" },
        { layers: ["docs"], topK: 5 }
    )
    TP_RAG_DESIGNS = design_results.chunks
        .filter(c => c.score > 0.6)

    # 2. Code layer: actual test files and implementation patterns
    code_results = await rag.getContext(
        f"{feature} test service controller repository component",
        { name: "code-preload" },
        { layers: ["code"], topK: 5 }
    )
    TP_RAG_CODE = code_results.chunks
        .filter(c => c.score > 0.6)

    # 3. Matched testing specialists via SpecialistLoader
    loader = SpecialistLoader()
    loader.loadSpecialists()
    test_keywords = ["testing", "test", STACK_BACKEND_FRAMEWORK, STACK_FRONTEND_FRAMEWORK]
    TP_RAG_SPECIALISTS = unique(flatten([loader.findByKeyword(kw) for kw in test_keywords]))[:5]

    display(f"📊 RAG Preload: {len(TP_RAG_DESIGNS)} test designs, "
            f"{len(TP_RAG_CODE)} code patterns, "
            f"{len(TP_RAG_SPECIALISTS)} specialists")
except:
    TP_RAG_DESIGNS = []
    TP_RAG_CODE = []
    TP_RAG_SPECIALISTS = []
    display("⚠️ RAG preload skipped (non-blocking)")
```

---

## Step 0.7: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merges evidence from memory-bank, RAG query results, and research findings
- Provides synthesized evidence context for test plan generation
- Output: Merged evidence context available for Step 3 generation

---

## Step 0.8: Check BASE Necessity & Sub-Features

**WHY identical to srs.md**: Same logic — check `.subfeatures.json`, set `CREATE_BASE` and `HAS_SUBFEATURES`. No test-specific adaptation.

Determine if BASE document should be created:

```pseudo
# EXECUTE: Get workflow context (JavaScript utility - PRESERVED)
context_result = node.run("core/state/state-manager.js", ["get"])

# PARSE: Extract feature name
context = json.parse(context_result.stdout)
feature_name = context.feature

# SEARCH: Find feature directory
feature_pattern = f"documents/features/{feature_name}-*"
feature_dirs = glob_directories(feature_pattern)

if not feature_dirs:
    raise Error(f"Feature directory not found for: {feature_name}")

feature_dir = feature_dirs[0]  # Take first match

# CHECK: Subfeature registry existence
registry_path = f"{feature_dir}/.subfeatures.json"
```

**If no registry**: Single feature only
```pseudo
create_base = False
has_subfeatures = False
```

**If registry exists**: Check BASE necessity
```pseudo
if file_exists(registry_path):
    registry = json.load_file(registry_path)
    base_needed = registry.get("baseNeeded", False)
    base_type = registry.get("baseType", "")
    if base_needed:
        create_base = True
        environment["BASE_TYPE"] = base_type
    else:
        create_base = False
    has_subfeatures = True
else:
    create_base = False
    has_subfeatures = False

environment["CREATE_BASE"] = create_base
environment["HAS_SUBFEATURES"] = has_subfeatures
```

**Display Structure**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SUB-FEATURE STRUCTURE DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature: [FEATURE]
Sub-features: [N]
BASE Needed: [true/false]
[If true] BASE Type: [core-library/foundation/orchestrator/manual]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 1: Read Agent Specification

**WHY load specialist**: Specialist has global rules (Test ID format, content rules, priority mapping) that apply across ALL sections. Loading it provides the AI with the "constitution" before executing individual agents.

```bash
# Load test plan orchestrator (if exists)
node core/cli/ops.js specialist-load --type document --category test-plan --name _orchestrator
TP_ORCHESTRATOR=$(node -e "const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')); console.log(r.data?.content || '')")
if [ -n "$TP_ORCHESTRATOR" ] && [ "$TP_ORCHESTRATOR" != "" ]; then
  echo "✅ Test plan orchestrator loaded"
else
  echo "ℹ️ No test plan orchestrator — using inline rules"
fi
# Contains: 9-section template, Test ID formats, content rules, priority mapping
# Agents implement individual sections; specialist provides global rules
```

---

## Step 2: Load Context & Evidence + Context Level Detection

**WHY context level**: Test plan quality depends on upstream documents. If DD exists, test cases can be specific (per-endpoint, per-component). If only BD, test cases are per-component. If only SRS, test cases are high-level (per-requirement). This determines the detail level agents use.

```pseudo
# EXECUTE: Get workflow context
result = node.run("core/state/state-manager.js", ["get"])
context = json.parse(result.stdout)
feature_name = context.feature
developer = context.developer
branch = git.branch_current()

# CONSTRUCT: Context file paths
context_file = f".claude/memory-bank/{branch}/{feature_name}-{developer}/context.md"
evidence_file = f".claude/memory-bank/{branch}/{feature_name}-{developer}/evidence.md"

# LOAD: Context and evidence
context_content = read_file(context_file)
evidence_content = read_file(evidence_file)

# LOAD: SRS (REQUIRED)
srs_file = find("documents/features/{feature_dir}/*-srs.md")
if not srs_file:
    display("❌ SRS not found. Test Plan requires SRS as minimum input.")
    STOP
srs_content = read_file(srs_file)

# DETECT: Context level based on available upstream documents
dd_backend = find("documents/features/{feature_dir}/*-backend-detail-design.md")
dd_frontend = find("documents/features/{feature_dir}/*-frontend-detail-design.md")
api_contracts = find("documents/features/{feature_dir}/*-api-contracts.md")
bd_file = find("documents/features/{feature_dir}/*-basic-design.md")

if dd_backend or dd_frontend:
    context_level = "DETAILED"
    display("📋 Context Level: DETAILED (DD exists → per-endpoint/component test cases)")
    if dd_backend: dd_be_content = read_file(dd_backend)
    if dd_frontend: dd_fe_content = read_file(dd_frontend)
    if api_contracts: api_content = read_file(api_contracts)
elif bd_file:
    context_level = "MODERATE"
    display("📋 Context Level: MODERATE (BD exists → per-component test cases)")
    bd_content = read_file(bd_file)
else:
    context_level = "BASIC"
    display("📋 Context Level: BASIC (SRS only → per-requirement test cases)")

# DETECT: Design scope (if detail.md was run)
scope = "fullstack"  # default
if dd_backend and not dd_frontend:
    scope = "backend"
elif dd_frontend and not dd_backend:
    scope = "frontend"
# If both or neither exist, keep fullstack default

display(f"🎯 Design Scope: {scope}")
```

---

## Step 3: Enforcement Loop with Context Management

**WHY enforcement**: Test plan has 10 micro-agents executed sequentially. Without TodoWrite tracking, AI may skip agents or lose context mid-generation. 2-layer enforcement (Self-critique + TodoWrite) is appropriate — lighter than detail.md's 3-layer (no lock files needed for optional document).

**WHY reorder**: Content sections (tp-03→08) must run BEFORE aggregate sections (tp-02 Coverage Matrix, tp-01 Strategy, tp-09 Execution Plan). Coverage Matrix needs test IDs from all content sections. Strategy needs total test count. Execution Plan needs full scope.

**WHY drop-and-summarize**: After generating each section, only carry forward section summary + test ID counters, not full content. Prevents context growth across 10 iterations.

**Execution order**:
```
tp-00 (Document Info) → tp-03 (Unit) → tp-04 (Integration) →
tp-05 (E2E) → tp-06 (Manual) → tp-07 (Performance) → tp-08 (Security) →
tp-02 (Coverage Matrix) → tp-01 (Strategy) → tp-09 (Execution Plan)
```

**Before loop** — Initialize TodoWrite:
```pseudo
TodoWrite([
    { content: "TP Section 0: Document Info", status: "pending", activeForm: "Generating document info" },
    { content: "TP Section 3: Unit Tests", status: "pending", activeForm: "Generating unit test plan" },
    { content: "TP Section 4: Integration Tests", status: "pending", activeForm: "Generating integration test plan" },
    { content: "TP Section 5: E2E Tests", status: "pending", activeForm: "Generating E2E test plan" },
    { content: "TP Section 6: Manual Tests", status: "pending", activeForm: "Generating manual test plan" },
    { content: "TP Section 7: Performance Tests", status: "pending", activeForm: "Generating performance test plan" },
    { content: "TP Section 8: Security Tests", status: "pending", activeForm: "Generating security test plan" },
    { content: "TP Section 2: Coverage Matrix", status: "pending", activeForm: "Generating coverage matrix" },
    { content: "TP Section 1: Test Strategy", status: "pending", activeForm: "Generating test strategy" },
    { content: "TP Section 9: Execution Plan", status: "pending", activeForm: "Generating execution plan" },
])
```

**Per-agent context scoping** — DD sections relevant per agent:
```pseudo
TP_DD_SCOPE = {
    3: { be_sections: ["Section 2 (services)"], fe_sections: ["Section 3 (components)"] },
    4: { be_sections: ["Section 3 (endpoints)", "Section 4 (data access)"], fe_sections: [] },
    5: { be_sections: [], fe_sections: ["user stories from SRS only"] },
    7: { be_sections: ["Section 2 (services)"], fe_sections: [] },
    8: { be_sections: ["auth sections"], fe_sections: [] },
    # tp-00, 01, 02, 06, 09: SRS only (no DD sections needed)
}
```

**Specialist loading** — per-section tp-0N agents via specialist-load:
```bash
# Load section specialist for current agent N (tp-00 through tp-09)
node core/cli/ops.js specialist-load --type document --category test-plan --name tp-0N-{section}
TP_SECTION_SPEC=$(node -e "const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')); console.log(r.data?.content || '')")
```
Note: Test-type specialists (tps-*.md) are a future enhancement. Currently, tp-0N section agents handle all test plan content.

**For EACH agent in execution order**:
```pseudo
execution_order = [0, 3, 4, 5, 6, 7, 8, 2, 1, 9]
section_summaries = {}  # drop-and-summarize accumulator
test_id_counters = {}   # running ID counters for uniqueness

for N in execution_order:
    # Layer 2 (TodoWrite): Mark in_progress
    TodoWrite: mark section N as in_progress

    # Load: Read micro-agent spec (JIT)
    agent = read_file(f"specialists/document/test-plan/tp-{N:02d}-*.md")

    # Load: Test-type specialist via specialist-load (future: tps-*.md files)
    # Currently, tp-0N section agents handle all content directly
    # When tps-*.md specialists are created, load via:
    #   node core/cli/ops.js specialist-load --type document --category test-plan --name tps-{type}
    specialist_content = ""  # No test-type specialists yet (future enhancement)

    # RAG: Per-agent context injection (non-blocking)
    try:
        rag = HippoRAGService.getInstance(feature, branch)
        agent_rag = await rag.getContext(
            f"test-plan section {N}", { name: f"tp-{N:02d}" },
            { layers: ["source-code", "eps-knowledge"], topK: 3 })
    except:
        agent_rag = None

    # Context: Per-agent DD scoping (only load relevant DD sections)
    dd_scope = TP_DD_SCOPE.get(N, {})
    agent_dd_context = extract_dd_sections(dd_be_content, dd_scope.be_sections) if dd_scope else ""

    # Pattern Analysis: Invoke pattern-analyzer skill
    # Check proposed test patterns against specialist recommendations
    invoke_skill("pattern-analyzer", section_context=agent, specialist=specialist_content)

    # Generate: Execute agent with context
    # Input: srs_content + agent_dd_context + specialist_content
    #        + TP_RAG_DESIGNS (preloaded) + TP_RAG_CODE (preloaded)
    #        + agent_rag (per-section) + section_summaries (from previous agents)
    #        + test_id_counters + context_level

    # For aggregate sections (tp-02, tp-01, tp-09): pass section_summaries as input
    if N in [1, 2, 9]:
        # These agents receive summaries from content sections, not full text
        pass

    # Layer 1 (Self-critique): Agent runs Q1-Q4 internally (built into agent Step 3)

    # Design Validation (Per Section): Invoke design-validator skill
    # Q1: Evidence grounding, Q2: ID uniqueness, Q3: Bilingual ratio, Q4: Interface purity
    invoke_skill("design-validator", section=generated_content)
    # If any violation: fix the section before proceeding to next agent

    # Drop-and-summarize: Extract summary before moving to next agent
    section_summaries[N] = {
        "heading": extract_heading(generated_content),
        "test_count": count_test_ids(generated_content),
        "last_test_ids": extract_last_ids(generated_content),
        "covered_FRs": extract_FR_refs(generated_content)
    }
    test_id_counters.update(extract_id_counters(generated_content))

    # Layer 2 (TodoWrite): Mark completed
    TodoWrite: mark section N as completed
```

**After all 10** — Verify:
```pseudo
completed = count(TodoWrite items where status == "completed")
if completed != 10:
    display(f"❌ TP enforcement failed: {completed}/10")
    STOP
display("✅ TP enforcement passed: 10/10 sections complete")
```

---

## Step 4: Quality Validation

**WHY**: Quality Validation aggregates results across ALL 10 sections to catch cross-section issues that per-agent Q1-Q4 cannot detect: duplicate Test IDs across sections, missing sections, low total count. This is the "global gate" complementing per-agent "local gates".

```pseudo
# Aggregate validation across all 10 sections
total_test_cases = count_all_test_ids(content)  # Count UT-*, IT-*, E2E-*, MT-*, ST-*
unique_ids = set(all_test_ids)

# Check uniqueness
if len(unique_ids) != total_test_cases:
    display("⚠️ Duplicate Test IDs found — fix before saving")

# Check coverage
if total_test_cases < 10:
    display("⚠️ Low test count (<10) — review test adequacy")

# Check all sections present (0-9)
for section_num in 0..9:
    if section_num == 0:
        if "Document Information" not in content:
            display("❌ Section 0 (Document Info) missing")
    else:
        if f"## {section_num}." not in content:
            display(f"❌ Section {section_num} missing")

# Check normal/abnormal balance
normal_count = count_by_type(content, "Normal")
abnormal_count = count_by_type(content, "Abnormal")
if abnormal_count < normal_count * 0.3:
    display(f"⚠️ Low abnormal test ratio: {abnormal_count}/{normal_count} (<30%)")

display(f"📊 Quality Summary:")
display(f"   Total Test Cases: {total_test_cases}")
display(f"   Unique IDs: {len(unique_ids)}")
display(f"   Normal: {normal_count} | Abnormal: {abnormal_count}")
display(f"   Sections: 10/10")
```

---

## Step 4.5: Final Design Validation

After all programmatic validators pass, invoke the **design-validator** skill on the complete assembled test plan document:
- Run Q1-Q4 on the entire Test Plan (not per-section)
- Verify cross-section consistency (Test IDs, evidence references, coverage matrix alignment)
- If violations found: iterate on affected sections
- If all pass: Continue to Step 5 (Write)

---

## Step 5: Write Document

```pseudo
if CREATE_BASE:
    base_file = f"documents/features/{feature_dir}/{feature}-BASE-test-plan.md"
    write_file(base_file, content)
    for sub in subfeatures:
        sub_file = build_path(feature, sub.code, "test-plan")
        write_file(sub_file, sub_content)
elif HAS_SUBFEATURES:
    for sub in subfeatures:
        sub_file = build_path(feature, sub.code, "test-plan")
        write_file(sub_file, sub_content)
else:
    single_file = f"documents/features/{feature_dir}/{feature}-BASE-test-plan.md"
    write_file(single_file, content)
```

---

## Post-Workflow: Evidence + RAG Index

**WHY evidence update**: Even though test plan is optional, documenting what was generated helps future `/recall` understand the feature's test coverage state.

**WHY RAG index**: Indexing the test plan into RAG enables future features to learn from this test strategy. Feedback loop: Feature A test plan → indexed → Feature B queries → gets Feature A patterns → progressively better test plans.

```pseudo
# 1. Update evidence.md — Section "### 3.4 Test Plan Summary"
evidence_content = read_file(evidence_file)

### 3.4 Test Plan Summary (updated by /design --test — [DATE])

**Document**: [filename]
**Context Level**: [context_level]
**Key Outputs**: [total_test_cases] test cases across 10 sections
**Coverage**: P0=[X] cases (100% target), P1=[Y] cases (60% target)
**Normal/Abnormal**: [X] normal, [Y] abnormal (ratio: [Z]%)

**RAG Enrichment**:
[X] design patterns used, [Y] code stereotypes matched, [Z] specialists consulted

**Corrections to Innovate Decisions**:
[If any, or "Innovate decisions confirmed by test plan"]

# 2. Update context.md — Add to Decisions Log
| N | DESIGN_TEST | Test plan output | [total] test cases, context=[level] | Generated from SRS+DD | — |

# 3. RAG Index: Feed test plan back into RAG (non-blocking)
try:
    rag = HippoRAGService.getInstance(feature, branch)
    await rag.indexContent(content, "test-plan", "TP_COMPLETE")
    await rag.extractAndUpdate(content, "test-plan", "test-plan")
    display("📊 Test Plan indexed into RAG (design layer)")
except:
    display("⚠️ RAG indexing skipped (non-blocking)")
```

---

## Completion Message

```
✅ TEST PLAN CREATED v3.0

Document: documents/features/[FEATURE]-[name]/[FEATURE]-BASE-test-plan.md
Context Level: [BASIC/MODERATE/DETAILED]
Sections: 10/10 complete

Test Coverage Summary:
- Total Test Cases: [X]
- Normal: [X] | Abnormal: [Y] (ratio: [Z]%)
- P0 (Quan trọng): [X] cases (100% automation target)
- P1 (Chính): [X] cases (60% automation target)
- P2 (Phụ): [X] cases (20% automation target)

Test ID Summary:
- UT-BE: [X] | UT-FE: [X]
- IT-API: [X] | IT-DB: [X]
- E2E: [X] | MT: [X] | ST: [X]

RAG Enrichment:
- [X] design patterns, [Y] code stereotypes, [Z] specialists

Specialists Used:
- [list of tp-0N section specialists loaded via specialist-load]

Next Steps:
1. Review with QA team
2. Implement automation during /execute phase
```

---

## Variable Reference Table

| Variable | Set In | Values | Used In |
|----------|--------|--------|---------|
| `CREATE_BASE` | Step 0.8 | true/false | Step 5 (write) |
| `HAS_SUBFEATURES` | Step 0.8 | true/false | Step 5 (write) |
| `TP_RAG_DESIGNS` | Step 0.6 | array (existing test plans from design layer) | Step 3 per-agent context |
| `TP_RAG_CODE` | Step 0.6 | array (code patterns from code layer) | Step 3 per-agent context |
| `TP_RAG_SPECIALISTS` | Step 0.6 | array (matched testing specialist filenames) | Step 3 per-agent context |
| `context_level` | Step 2 | "BASIC" / "MODERATE" / "DETAILED" | Step 3 agent context, Output templates |
| `section_summaries` | Step 3 loop | dict (per-section heading, test_count, IDs) | Aggregate agents (tp-01, tp-02, tp-09) |
| `test_id_counters` | Step 3 loop | dict (ID prefix → last number) | Uniqueness verification |

**CRITICAL**: These are AI-tracked variables (not shell environment variables).

---

## RAG Method Note (Interface Contract)

**Interface Contract**: This workflow uses method names (`findByStereotype`, `querySpecialists`, `getContext`, `queryWithArchitecture`) as interface contracts. Current implementation routes through `/v1/query` internally via `hipporag-service.js`. When RAG server upgrades to dedicated endpoints, only the adapter layer changes — this workflow and all agents remain unchanged.

---

*/design --test Workflow v3.0*
*Self-contained micro-command with Stack Context + BASE + Post-Workflow*
*Agent: test-plan-specialist / 10 Micro-Agents + 11 Test-Type Specialists*
*Context Management: Solution C (per-agent DD scoping + drop-and-summarize + execution reorder)*
*Normal/Abnormal: Mandatory in all agent output templates*
