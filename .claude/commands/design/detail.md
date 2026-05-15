# /design --detail Router v5.0 (Micro-Command Architecture)

## Purpose
Route to scope-specific micro-commands for Detail Design generation.

**Architecture**: Thin router + 5 micro-commands (FDD, BDD, API Contracts, FDD Pseudo, BDD Pseudo)
**Micro-Commands**: `design/detail/` directory — each self-contained with Direct Read pattern
**Specialist Loading**: Via Read tool in micro-commands (NOT ops.js specialist-load)
**Output**: Scope-dependent (1-3 documents per feature/sub-feature)

---

## Pre-requisites (Validated by Router)
- State: INNOVATE_DD_APPROVED (NOT INNOVATE_DD — v5.2 approval gate)
- Quality Gate D3: Passed (Basic Design approved + evidence ≥3, quality ≥80%)
- Evidence file with Detail Design Approach (innovate-dd-selection.md)

---

## Step 0.1: G0 Gate — INNOVATE_DD Quality Validation

**WHY**: DD generation is the most expensive phase (10+10 micro-agents). G0 prevents
wasted context by validating innovate quality upfront. All 5 conditions are scope-independent
because they validate prerequisites, not DD content.

**CRITICAL**: This gate MUST pass before proceeding.

```bash
echo "🔒 G0 Gate: INNOVATE_DD Quality Validation"

# Get context directory
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")

if [ -z "$CONTEXT_DIR" ]; then
  echo "❌ G0 FAILED: No active context found"
  echo "   To fix: node core/state/state-manager.js init <feature> [developer]"
  exit 1
fi

# G0.1: innovate-dd-selection.md exists
SELECTION_FILE="$CONTEXT_DIR/innovate-dd-selection.md"

if [ ! -f "$SELECTION_FILE" ]; then
  echo "❌ G0.1 FAILED: innovate-dd-selection.md not found"
  echo "   To fix: Run /innovate --dd first"
  exit 1
fi

# G0.2-G0.5: Content validation via gate-check
node core/cli/ops.js gate-check --gate D3 --selectionFile "$SELECTION_FILE"
GATE_RESULT=$(node -e "const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));console.log(r.ok?'PASS':'FAIL:'+(r.error||'Gate failed'))" 2>/dev/null || echo "FAIL:Script error")

if [[ "$GATE_RESULT" == FAIL* ]]; then
  echo "❌ G0 Gate FAILED:"
  echo "$GATE_RESULT" | sed 's/FAIL://g' | tr '|' '\n' | sed 's/^/   /g'
  echo ""
  echo "   To fix:"
  echo "   - G0.2: Re-run /innovate --dd with more evidence"
  echo "   - G0.3: Ensure multi-model evaluation"
  echo "   - G0.4: Expand rationale section"
  echo "   - G0.5: Document rejected alternatives"
  exit 1
fi

echo "✅ G0 Gate PASSED (G0.1-G0.5)"
echo ""
```

---

## Step 0.2: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Validates that current workflow state allows Detail Design generation
- Expected state: BD_CREATED or INNOVATE_DD completed
- If FAIL: STOP and display state violation — user must complete prerequisite phases
- If PASS: Continue to Step 0.3

---

## Step 0.3: Quality Gate D3

Invoke the **quality-gate-check** skill with gate D3 (Design Completeness):
- Validates SRS and Basic Design exist and meet quality criteria
- If FAIL: Display gate violations — user must complete prerequisite design phases
- If PASS: Continue to Step 0.5
- **Note**: This skill-based check complements the existing G0 gate in Step 0.1

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
  node core/cli/ops.js rag-query --query "${STACK_BACKEND_FRAMEWORK:-spring-boot} patterns best practices" --command design-detail 2>/dev/null
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

## Step 0.6: RAG Context Preload for DD Generation

**WHY**: LAYER_PRIORITY["design-detail"] = primary ["code", "arch", "docs"], secondary ["eps"].
Step 0.5 only queries eps+arch. This step loads **docs-layer** (existing DD patterns from
past features) and **code-layer** (actual implementation patterns) to ground generation in
real project data. Also loads matched specialists via SpecialistLoader.

```pseudo
# RAG 2.0: Pre-load context for DD generation (ALL non-blocking)
try:
    rag = HippoRAGService.getInstance(feature, branch)

    # 1. Docs layer: existing DD patterns from similar features
    design_results = await rag.getContext(
        f"{feature} detail design frontend backend patterns",
        { name: "dd-preload" },
        { layers: ["docs"], topK: 5 }
    )
    DD_RAG_DESIGNS = design_results.chunks
        .filter(c => c.score > 0.6)

    # 2. Code layer: actual implementation patterns
    code_results = await rag.getContext(
        f"{feature} service controller repository component",
        { name: "code-preload" },
        { layers: ["code"], topK: 5 }
    )
    DD_RAG_CODE = code_results.chunks
        .filter(c => c.score > 0.6)

    # 3. Graph data: entity relationships
    DD_RAG_GRAPH = (design_results.graph?.nodes || []).slice(0, 30).map(n => ({
        type: n.attributes?.type || 'NODE',
        id: n.id,
        label: n.attributes?.label || n.id,
    }))

    # 3. Matched specialists via SpecialistLoader
    loader = SpecialistLoader()
    loader.loadSpecialists()
    keywords = [STACK_BACKEND_FRAMEWORK, STACK_FRONTEND_FRAMEWORK, STACK_ORM]
    DD_RAG_SPECIALISTS = unique(flatten([loader.findByKeyword(kw) for kw in keywords]))[:5]

    display(f"📊 RAG Preload: {len(DD_RAG_DESIGNS)} designs, "
            f"{len(DD_RAG_CODE)} code patterns, "
            f"{len(DD_RAG_SPECIALISTS)} specialists")
except:
    DD_RAG_DESIGNS = []
    DD_RAG_CODE = []
    DD_RAG_SPECIALISTS = []
    display("⚠️ RAG preload skipped (non-blocking)")
```

**Non-blocking**: RAG failures do not stop the workflow. DD generation proceeds with plan spec only.

---

## Step 0.7: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merges evidence from memory-bank, RAG query results, and research findings
- Provides synthesized evidence context for FDD/BDD generation
- Output: Merged evidence context available for Step 1/Step 3 generation

---

## Step 0.8: Check BASE Necessity & Sub-Features

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

## Step 0.9: Design Scope Detection

Automatically detect feature scope from Basic Design + SRS content.
Scope determines which phases (FDD/API/BDD) to execute.

**WHY**: Many real-world features are backend-only. Running FDD for them wastes
context and produces irrelevant documents. Scope detection prevents this.

### 0.9.1: Load BD + SRS Content

Read BOTH BD + SRS (SRS provides additional scope context via use cases and actors).

```pseudo
# CONSTRUCT: File paths from feature_dir (set in Step 0.8)
bd_file = f"documents/features/{feature_dir}/{feature}-BASE-basic-design.md"
srs_file = f"documents/features/{feature_dir}/{feature}-BASE-srs.md"

# LOAD: Both documents
bd_content = read_file(bd_file)
srs_content = read_file(srs_file)  # May not exist for some features
combined_content = bd_content + (srs_content or "")
```

### 0.9.2: Detect Scope Indicators

**Matching**: Case-insensitive substring search. Multi-word phrases reduce false positives.

```pseudo
# INDICATORS: Case-insensitive, multi-word phrases
frontend_indicators = ["screen", "ui component", "react", "page layout", "form",
                       "bff", "navigation", "frontend module", "user interface"]
backend_indicators = ["service layer", "repository", "entity", "controller",
                      "database", "batch job", "message queue", "worker", "backend module"]

# SCAN: Count meaningful occurrences
fe_count = count_case_insensitive(combined_content, frontend_indicators)
be_count = count_case_insensitive(combined_content, backend_indicators)

# DETERMINE: Scope based on indicator presence
if fe_count > 0 and be_count > 0:
    detected_scope = "fullstack"
elif fe_count > 0 and be_count == 0:
    detected_scope = "frontend"
elif be_count > 0 and fe_count == 0:
    detected_scope = "backend"
else:
    # EDGE CASE: No indicators found → default to fullstack (safest)
    detected_scope = "fullstack"
    display("⚠️ No clear scope indicators found in BD/SRS. Defaulting to fullstack.")
```

### 0.9.3: Auto-detect API Contracts Need (frontend/fullstack only)

```pseudo
api_indicators = ["api endpoint", "rest api", "bff", "api contract", "http method"]
needs_api_contracts = (detected_scope != "backend") and
                      count_case_insensitive(bd_content, api_indicators) > 0
```

### 0.9.4: Confirm with User

```pseudo
AskUserQuestion:
  question: "Scope detected from BD+SRS analysis. Confirm or override?"
  header: "Scope"
  options:
    1. label: "Confirm: {detected_scope}"
       description: "FE: {fe_count} indicators, BE: {be_count} indicators"
    2. label: "Override: backend"
       description: "BDD only — no frontend documents"
    3. label: "Override: frontend"
       description: "FDD + optional API Contracts — no backend documents"
    4. label: "Override: fullstack"
       description: "FDD + API Contracts + BDD — all documents"

DESIGN_SCOPE = user_choice  # "backend" | "frontend" | "fullstack"
```

### 0.9.5: Display Scope Execution Plan

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DESIGN SCOPE: {DESIGN_SCOPE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

| DESIGN_SCOPE | Phase 1 (FDD) | Phase 2 (API) | Phase 3 (BDD) |
|-------------|---------------|---------------|---------------|
| backend     | Skip          | Skip          | Run           |
| frontend    | Run           | {auto-detect} | Skip          |
| fullstack   | Run           | Run           | Run           |

**IMPORTANT**: DESIGN_SCOPE applies to ALL sub-features.
Do NOT re-detect scope per sub-feature. See Sub-Feature Processing section.

---

## Variable Reference for Remaining Workflow

The following variables were determined in previous steps. The AI executing this
workflow must carry these forward to all subsequent phases:

| Variable | Set In | Values | Used In |
|----------|--------|--------|---------|
| DESIGN_SCOPE | Step 0.9 | "backend" / "frontend" / "fullstack" | Phase 1, 2, 3, Sub-Features, Completion |
| needs_api_contracts | Step 0.9.3 | true / false | Phase 2 |
| CREATE_BASE | Step 0.8 | true / false | Sub-Features |
| HAS_SUBFEATURES | Step 0.8 | true / false | Sub-Features |
| use_abc_pattern | Phase 1 (A+B+C) | true / false | Phase 1 FDD structure |
| DD_RAG_DESIGNS | Step 0.6 | array (existing DD patterns from design layer) | Phase 1, 2, 3 per-agent context |
| DD_RAG_CODE | Step 0.6 | array (code patterns from code layer) | Phase 1, 2, 3 per-agent context |
| DD_RAG_SPECIALISTS | Step 0.6 | array (matched specialist filenames) | Phase 1, 3 per-agent context |

**CRITICAL**: These are AI-tracked variables (not shell environment variables).
When a scope guard says `if DESIGN_SCOPE == "backend"`, this means: "If the user
confirmed backend scope in Step 0.9, skip this phase."

---


## Micro-Command Dispatch

Based on DESIGN_SCOPE (set in Step 0.9), use the **Read tool** to load and follow micro-commands sequentially.

### Routing Table

| DESIGN_SCOPE | Micro-command sequence |
|-------------|----------------------|
| backend     | `detail/bdd.md` → `detail/bdd-pseudo.md` |
| frontend    | `detail/fdd.md` → `detail/api-contract.md` (if needs_api_contracts) → `detail/fdd-pseudo.md` |
| fullstack   | `detail/fdd.md` → `detail/api-contract.md` → `detail/fdd-pseudo.md` → `detail/bdd.md` → `detail/bdd-pseudo.md` |

### Micro-Command Files

| File | Purpose | Enforcement | Lines |
|------|---------|-------------|-------|
| `detail/fdd.md` | FDD generation (10 micro-agents) | TodoWrite + Checkpoints | ~250 |
| `detail/bdd.md` | BDD generation (10 micro-agents) | Hooks + TodoWrite + Checkpoints | ~300 |
| `detail/api-contract.md` | API Contracts derived from FDD | None (single-step) | ~100 |
| `detail/fdd-pseudo.md` | FDD pseudo-code + RAG indexing | None | ~100 |
| `detail/bdd-pseudo.md` | BDD pseudo-code + RAG indexing | None | ~80 |

### Dispatch Logic

```pseudo
if DESIGN_SCOPE == "backend":
    display("Scope: Backend - BDD only")
    Read file: commands/design/detail/bdd.md
    # Follow bdd.md instructions completely
    Read file: commands/design/detail/bdd-pseudo.md
    # Follow bdd-pseudo.md instructions completely

elif DESIGN_SCOPE == "frontend":
    display("Scope: Frontend - FDD + optional API Contracts")
    Read file: commands/design/detail/fdd.md
    # Follow fdd.md instructions completely
    if needs_api_contracts:
        Read file: commands/design/detail/api-contract.md
        # Follow api-contract.md instructions completely
    Read file: commands/design/detail/fdd-pseudo.md
    # Follow fdd-pseudo.md instructions completely

elif DESIGN_SCOPE == "fullstack":
    display("Scope: Fullstack - FDD + API + BDD")
    Read file: commands/design/detail/fdd.md
    # Follow fdd.md instructions completely
    Read file: commands/design/detail/api-contract.md
    # Follow api-contract.md instructions completely
    Read file: commands/design/detail/fdd-pseudo.md
    # Follow fdd-pseudo.md instructions completely
    Read file: commands/design/detail/bdd.md
    # Follow bdd.md instructions completely
    Read file: commands/design/detail/bdd-pseudo.md
    # Follow bdd-pseudo.md instructions completely
```

**IMPORTANT**: Each micro-command is self-contained. It reads its own orchestrator
and micro-agents via **Read tool** (Direct Read pattern — NOT ops.js specialist-load).
Do NOT return to this router between micro-commands.

### Variables Passed to Micro-Commands

These are AI-tracked variables (not shell environment). The AI carries them forward
through the Read-and-follow chain:

| Variable | Set in | Used in |
|----------|--------|---------|
| DESIGN_SCOPE | Step 0.9 | All micro-commands |
| CONTEXT_DIR | Step 0.1 | All micro-commands |
| needs_api_contracts | Step 0.9.3 | detail/api-contract.md |
| CREATE_BASE | Step 0.8 | All micro-commands |
| HAS_SUBFEATURES | Step 0.8 | detail/fdd.md (A+B+C pattern) |
| STACK_* variables | Step 0.5 | All micro-commands |
| DD_RAG_* variables | Step 0.6 | All micro-commands |
| feature_dir | Step 0.8 | All micro-commands (output paths) |

---

## Sub-Feature Processing

**Scope applies to ALL sub-features** — detect once for BASE, apply to all.

```pseudo
if CREATE_BASE:
    1. Run micro-command dispatch for BASE documents first
    2. For each sub-feature: Re-run micro-command dispatch with SAME DESIGN_SCOPE

if not CREATE_BASE and HAS_SUBFEATURES:
    1. For each sub-feature: Run micro-command dispatch with SAME DESIGN_SCOPE

For each sub-feature:
    - Use SAME DESIGN_SCOPE (do NOT re-run Step 0.9)
    - Use SAME needs_api_contracts flag
    - Add Service Boundaries section (cross-sub-feature interfaces)
```

---

## Post-Workflow (after all micro-commands complete)

### Update State

```pseudo
result = node.run("core/state/state-manager.js", ["update", "DD_CREATED"])
if result.exit_code != 0:
    raise Error(f"Failed to update state: {result.stderr}")
display("State updated: DD_CREATED")
```

### Update Evidence & Context (MANDATORY)

**1. Update evidence.md — Section "### 3.3 DD Summary"**

Using the Read tool, read evidence.md. Then using the Edit tool, add or replace:

```markdown
### 3.3 DD Summary (updated by /design --detail — [DATE])

**Document(s)**: [list of generated files]
**Scope**: [DESIGN_SCOPE]
**Key Outputs**: [2-3 bullet points]
**Scope Confirmed**: [X] agents executed / [Y] documents generated

**Corrections to Innovate Decisions**:
[If design process revealed issues with innovate decisions]
[If none: "Innovate decisions confirmed by design"]
```

**2. Update context.md — Add to Decisions Log**

Read context.md. Append row:

| # | Phase | Decision | Choice | Rationale | Corrects |
|---|-------|----------|--------|-----------|----------|
| N | DESIGN_DD | [DD output] | Scope: [DESIGN_SCOPE], [N] docs | Generated from innovate | [if any] |

**CRITICAL**: This step is MANDATORY after successful DD generation.

---

## Auto Design Review with Self-Healing (MANDATORY)

After evidence & context updates, automatically review and fix each generated DD file.
Maximum **3 retry attempts** per file. Each retry: analyze → fix → re-review.

```pseudo
MAX_RETRIES = 3
dd_files = [list of generated DD document paths]
review_results = {}

for dd_file in dd_files:
    dd_type = "bdd" if "backend" in dd_file.lower() else "fdd"
    passed = false

    for attempt in range(1, MAX_RETRIES + 1):
        display(f"--- Design Review: {dd_file} (attempt {attempt}/{MAX_RETRIES}) ---")

        // Step 1: Run design-review skill
        review = invoke_skill("design-review", args=f"{dd_file} --type={dd_type} --threshold=90 --verbose")

        if review.status == "READY":
            display(f"✓ PASSED (attempt {attempt}, score: {review.score}%)")
            review_results[dd_file] = { status: "PASSED", score: review.score, attempts: attempt }
            passed = true
            break

        // Step 2: Deep analysis — categorize each violation
        display(f"✗ FAILED (attempt {attempt}, score: {review.score}%) — Analyzing {len(review.violations)} violations...")

        violations_by_type = group_by(review.violations, key="gate")
        // Example groups: Q1_EVIDENCE, Q2_DUPLICATE_ID, Q3_BILINGUAL, Q4_INTERFACE_PURITY

        // Step 3: Auto-fix each violation category
        for gate, issues in violations_by_type:

            if gate == "Q1_EVIDENCE":
                // Missing evidence traceability — add FR-XXX/BR-XXX/E-XXX references
                // Read the DD file, find sections without evidence refs
                // Cross-reference with SRS (FR-XXX, BR-XXX) and evidence.md (E-XXX)
                // Add traceability references to each section
                for issue in issues:
                    section = locate_section(dd_file, issue.location)
                    relevant_refs = find_matching_refs(srs_path, evidence_path, section.content)
                    edit_file(dd_file, section, add_refs=relevant_refs)

            elif gate == "Q2_DUPLICATE_ID":
                // Duplicate IDs found — rename to ensure uniqueness
                for issue in issues:
                    dup_id = issue.duplicate_id
                    new_id = generate_unique_id(dup_id, existing_ids)
                    edit_file(dd_file, old=dup_id, new=new_id, replace_all=true)

            elif gate == "Q3_BILINGUAL":
                // Vietnamese ratio below 60% — add Vietnamese descriptions
                for issue in issues:
                    section = locate_section(dd_file, issue.location)
                    // Add Vietnamese translation alongside English content
                    // Format: "English description — Mô tả tiếng Việt"
                    vi_content = translate_to_vietnamese(section.english_only_content)
                    edit_file(dd_file, section, append_vietnamese=vi_content)

            elif gate == "Q4_INTERFACE_PURITY":
                // Implementation details leaked into design — remove concrete code
                for issue in issues:
                    section = locate_section(dd_file, issue.location)
                    // Replace implementation code with interface/contract definitions
                    // Keep: method signatures, input/output types, contracts
                    // Remove: concrete class names, implementation logic, framework annotations
                    purified = extract_interface_only(section.content)
                    edit_file(dd_file, section.content, purified)

            elif gate == "Q2_NAMING":
                // ID naming convention violations — fix pattern
                for issue in issues:
                    wrong_id = issue.id
                    correct_id = fix_naming_convention(wrong_id, issue.expected_pattern)
                    edit_file(dd_file, old=wrong_id, new=correct_id, replace_all=true)

        display(f"Applied fixes for {len(review.violations)} violations. Re-reviewing...")

    // After MAX_RETRIES exhausted
    if not passed:
        review_results[dd_file] = { status: "FAILED", score: review.score, attempts: MAX_RETRIES }

// Final verdict
failed_files = [f for f, r in review_results if r.status == "FAILED"]

if failed_files:
    display(f"""
    ⚠ DESIGN REVIEW FAILED after {MAX_RETRIES} attempts

    Failed files:
    {for f in failed_files: f"  - {f} (score: {review_results[f].score}%)"}

    Remaining violations require manual intervention.
    Run: /design-review <path> --verbose
    Do NOT proceed to /plan until all files pass.
    """)
    raise Error("Design review failed after max retries")

display(f"""
✓ ALL DESIGN REVIEWS PASSED

{for f, r in review_results:
    f"  {f}: {r.score}% (attempt {r.attempts}/{MAX_RETRIES})"}

Ready for planning.
""")
```

**Rules**:
- Review is **blocking** — if any DD fails after 3 retries, do NOT show "Next: /plan"
- Each retry cycle: `/design-review` → analyze violations → auto-fix → re-review
- Fixes are applied directly to the DD file using Edit tool (preserving document structure)
- On final failure: display remaining issues + require manual `/design-review` before `/plan`
- On success: proceed to Completion Message with review scores

---

## Completion Message

```pseudo
display(f"""
DETAIL DESIGN CREATED (Scope: {DESIGN_SCOPE})

Documents:
{list all generated DD files}

Pseudo-code:
{list all generated .pseudo files}

Enforcement:
  {if FDD ran:} FDD: 10/10 checkpoints
  {if BDD ran:} BDD: 10/10 checkpoints

Design Review: PASSED (score: {review_score}%)

Next command: /plan
""")
```

---

## Output Documents (scope-dependent)

| DESIGN_SCOPE | Documents per feature/sub-feature |
|-------------|----------------------------------|
| backend     | `{F}-{S}-backend-detail-design.md` (1 file) |
| frontend    | `{F}-{S}-frontend-detail-design.md` + optional `{F}-{S}-api-contracts.md` (1-2 files) |
| fullstack   | `{F}-{S}-frontend-detail-design.md` + `{F}-{S}-api-contracts.md` + `{F}-{S}-backend-detail-design.md` (3 files) |

## Language Rules
- **Content**: Vietnamese (>=60% ratio)
- **Technical terms**: English (API, REST, JWT, Component, etc.)
- **Code snippets**: English (TypeScript/Java interfaces only, no implementation)

---
*/design --detail Router v5.0*
*Micro-command architecture: router + 5 micro-commands*
*Scope-Aware: Backend / Frontend / Full-stack*
*Direct Read pattern: specialists loaded via Read tool in micro-commands*
*Enforcement: FDD (2-layer) + BDD (3-layer) — in micro-commands*
*RAG 2.0: Preload in router, Per-Agent in micro-commands*
