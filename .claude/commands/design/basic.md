# /design --basic Workflow v6.0

> **EXECUTION CONSTRAINTS** (KHONG DUOC VI PHAM)
>
> 1. **READ specialist agents TRUC TIEP**: Dung `Read` tool de doc file agent.
>    KHONG dung `ops.js specialist-load`. KHONG dung subprocess.
> 2. **MOT section TAI MOT THOI DIEM**: Hoan thanh section N (write + checkpoint)
>    truoc khi bat dau section N+1. KHONG batch.
> 3. **CHECKPOINT ENFORCEMENT**: Moi section PHAI pass checkpoint truoc khi
>    tiep tuc. Neu checkpoint fail → retry (max 2). Neu retry het → STOP.

---

## Purpose

Create Basic Design document using 7 BD specialist agents with checkpoint enforcement.
**Output**: `[FEATURE]-BASE-basic-design.md`

---

## Pre-requisites (Validated by Router)
- State: INNOVATE_BD
- Quality Gate D2: Passed (SRS approved + evidence ≥3, quality ≥80%)

---

## Step 0: Task Type Check (v7.0)

Doc taskType tu context.md. Neu enhancement, doc Impact Assessment result tu innovate-bd-selection.md.

```bash
TASK_TYPE=$(grep -oP 'Task Type:\s*\K\w+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "new")
```

**Neu taskType = 'enhancement'**:

Doc innovate-bd-selection.md → lay scope level.

- **Level 1 (Logic-only)**: Tao BD baseline document xac nhan kien truc hien tai.
  - §1: Architecture pattern hien tai (ten pattern, technology stack cu the)
  - §2: Components hien tai (danh sach, responsibilities)
  - §3-§6: "UNCHANGED — inherit from [BD goc path]"
  - Moi section phai co du lieu cu the tu codebase/documentation hien tai.
  - Neu khong tim thay BD goc hoac thong tin: interactive hoi user cung cap.
  - Khong chay C0-C6 micro-agents.
  - Update state BD_CREATED. RETURN.

- **Level 2 (Structural)**: Chay CHI cac micro-agents cho sections bi anh huong.
  - Vd: §2 + §4 bi anh huong → chay bd-02-component.md + bd-04-datamodel.md.
  - Cac section khong bi anh huong: doc tu BD goc hoac ghi "UNCHANGED — inherit from [BD goc]".
  - Output: BD delta document.
  - Update state BD_CREATED. RETURN.

**Neu taskType = 'new'** (hoac undefined):
Chay full workflow C0-C6 nhu binh thuong (tiep tuc Step 0.5).

---

## Step 0.5: Stack Context Loading (v5.4)

Load project stack configuration and export variables for specialist agents:

```bash
echo "📦 Loading stack context..."

# 1. Load project stack configuration
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

# 2. Query RAG for stack-specific patterns (non-blocking)
SPECIALIST_PATTERNS=""
if command -v node &> /dev/null; then
  node core/cli/ops.js rag-query --query "${STACK_BACKEND_FRAMEWORK:-spring-boot} patterns best practices" --command design-basic 2>/dev/null
  SPECIALIST_PATTERNS=$(node -e "
    try {
      const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
      const chunks=(r.data&&r.data.chunks)||[];
      console.log(JSON.stringify(chunks.filter(c=>c.score>0.7)));
    } catch(e) {}
  " 2>/dev/null || echo "")
fi
export SPECIALIST_PATTERNS

# 3. Architecture compliance patterns
ARCH_PATTERNS=""
if command -v node &> /dev/null; then
  node core/cli/ops.js arch-detect 2>/dev/null
  ARCH_RESULT=$(node -e "
    try {
      const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
      console.log(JSON.stringify(r.data||{patterns:[],layers:[],source:'none'}));
    } catch(e) { console.log('{\"patterns\":[],\"layers\":[],\"source\":\"error\"}'); }
  " 2>/dev/null || echo '{"patterns":[],"layers":[],"source":"error"}')
  ARCH_PATTERNS=$(node -e "try{const j=JSON.parse(process.argv[1]);console.log((j.patterns||[]).join(', '))}catch(e){}" "$ARCH_RESULT" 2>/dev/null || echo "")
  ARCH_SOURCE=$(node -e "try{const j=JSON.parse(process.argv[1]);console.log(j.source||'none')}catch(e){console.log('none')}" "$ARCH_RESULT" 2>/dev/null || echo "none")
  if [ "$ARCH_SOURCE" = "rag" ]; then
    echo "   📐 Architecture (RAG): $ARCH_PATTERNS"
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
        const patterns = rows.slice(2).map(r => r.replace(/[|]/g, '').trim()).filter(r => r && !r.includes('---')).slice(0, 5);
        console.log(patterns.join(', '));
      }
    " "$BD_FILE" 2>/dev/null || echo "")
    if [ -n "$ARCH_FROM_BD" ]; then
      ARCH_PATTERNS="$ARCH_FROM_BD"
      echo "   📐 Architecture (Basic Design): $ARCH_PATTERNS"
    fi
  fi
fi

ARCH_CONSTRAINTS="Follow layer boundaries; Use dependency injection; No cross-layer direct calls; Respect Basic Design patterns"
export ARCH_PATTERNS ARCH_CONSTRAINTS
echo "✅ Stack context loaded"
```

---

## Step 0.6: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Validates that current workflow state allows Basic Design generation
- Expected state: SRS_CREATED or INNOVATE_BD completed
- If FAIL: STOP — display state violation
- If PASS: Continue

```bash
# Skill artifact enforcement
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill workflow-state-validator --command basic --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "workflow-state-validator" --mode strict
```

---

## Step 0.7: Quality Gate D2

Invoke the **quality-gate-check** skill with gate D2 (Innovation Threshold):
- Criteria: Innovation score ≥70%, SRS document exists
- If FAIL: Display warning — user may continue or go back to /innovate
- If PASS: Continue

```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill quality-gate-check --command basic --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "workflow-state-validator,quality-gate-check" --mode strict
```

---

## Step 0.8: Check BASE Necessity & Sub-Features

```pseudo
context_result = node.run("core/state/state-manager.js", ["get"])
context = json.parse(context_result.stdout)
feature_name = context.feature

feature_pattern = f"documents/features/{feature_name}-*"
feature_dirs = glob_directories(feature_pattern)
if not feature_dirs:
    raise Error(f"Feature directory not found for: {feature_name}")
feature_dir = feature_dirs[0]

registry_path = f"{feature_dir}/.subfeatures.json"

if file_exists(registry_path):
    registry = json.load_file(registry_path)
    base_needed = registry.get("baseNeeded", False)
    base_type = registry.get("baseType", "")
    create_base = base_needed
    if base_needed:
        environment["BASE_TYPE"] = base_type
    has_subfeatures = True
else:
    create_base = False
    has_subfeatures = False

environment["CREATE_BASE"] = create_base
environment["HAS_SUBFEATURES"] = has_subfeatures
```

---

## Step 1: Read Orchestrator Guide (Direct Read)

```pseudo
# Direct Read — replaces dead reference to orchestrate-bd.js
orchestrator_content = Read("specialists/document/basic-design/_orchestrator.md")
# Parse: agent mapping, section assignments, quality rules Q1-Q4
```

---

## Step 1.5: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merges evidence from memory-bank, RAG query results, and research findings
- Provides synthesized evidence context for generation steps

```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill evidence-fusion --command basic --result PASS
```

---

## Step 2: Determine Output Path & Load Context

```pseudo
result = node.run("core/state/state-manager.js", ["get"])
context = json.parse(result.stdout)
feature_name = context.feature
developer = context.developer
branch = git.branch_current()

context_file = f".claude/memory-bank/{branch}/{feature_name}-{developer}/context.md"
evidence_file = f".claude/memory-bank/{branch}/{feature_name}-{developer}/evidence.md"
srs_file = f"documents/features/{feature_dir}/{feature_name}-BASE-srs.md"

context_content = read_file(context_file)
evidence_content = read_file(evidence_file)
srs_content = read_file(srs_file)

output_path = f"documents/features/{feature_dir}/{feature_name}-BASE-basic-design.md"
reasoning_path = f"documents/features/{feature_dir}/reasoning.json"
```

---

## Step 3: Initialize Enforcement

```bash
# 3.1 Reset checkpoints + skill artifacts for fresh run
node core/cli/ops.js design-checkpoint --action reset --type basic
node core/cli/ops.js design-checkpoint --action skill-reset --command basic
```

```pseudo
# 3.2 TodoWrite — tracking 7 sections
TodoWrite([
  { content: "C0: Reasoning (bd-00-reasoning)", status: "pending" },
  { content: "C1: Architecture (bd-01-architecture)", status: "pending" },
  { content: "C2: Component (bd-02-component)", status: "pending" },
  { content: "C3: Dataflow (bd-03-dataflow)", status: "pending" },
  { content: "C4: Datamodel (bd-04-datamodel)", status: "pending" },
  { content: "C5: State (bd-05-state)", status: "pending" },
  { content: "C6: NFR (bd-06-nfr)", status: "pending" },
])
```

---

## Step 5: Section Loop (C0 → C6) — 8-Step Enforcement

### Agent File Mapping

| N | Agent File (Direct Read) | Checkpoint |
|---|--------------------------|------------|
| 0 | `specialists/document/basic-design/bd-00-reasoning.md` | C0 |
| 1 | `specialists/document/basic-design/bd-01-architecture.md` | C1 |
| 2 | `specialists/document/basic-design/bd-02-component.md` | C2 |
| 3 | `specialists/document/basic-design/bd-03-dataflow.md` | C3 |
| 4 | `specialists/document/basic-design/bd-04-datamodel.md` | C4 |
| 5 | `specialists/document/basic-design/bd-05-state.md` | C5 |
| 6 | `specialists/document/basic-design/bd-06-nfr.md` | C6 |

### For N = 0 to 6, execute:

**5.A — VERIFY CHECKPOINT**
```bash
node core/cli/ops.js design-checkpoint --action verify --section N --type basic
# If canProceed=false and "already completed" → SKIP to next N
# If canProceed=false (sequence error) → STOP
```

**5.B — LOAD GRAPH CONTEXT**
```bash
node core/cli/ops.js design-context --section N --type basic --module $MODULE
GRAPH_CONTEXT=$(cat cache/ops-result.json)
```

**5.C — READ SPECIALIST AGENT (Direct Read)**
```pseudo
agent_content = Read("specialists/document/basic-design/bd-0{N}-{name}.md")
```

**5.D — MARK IN-PROGRESS**
```pseudo
TodoWrite(update "C{N}" status="in_progress")
```

**5.E — GENERATE SECTION CONTENT**

If N == 0 (C0 Reasoning — special case):
- Output: `reasoning.json` (JSON, not markdown)
- Generate reasoning with components, patterns, technologies
- Validate via `node core/design-validators/reasoning-validator-bd.js reasoning_path`
- If validation fails → retry (max 2)

If N > 0 (C1-C6):
- Output: markdown section content
- Generate using agent instructions + graph context + evidence + reasoning.json + SRS
- Self-critique Q1-Q4:
  - Q1: Components match reasoning.json?
  - Q2: Patterns match reasoning.json?
  - Q3: Vietnamese ratio ≥ 60%?
  - Q4: No prohibited content (no sequence diagrams, no API specs, no code)?

**5.F — WRITE (Incremental)**
```pseudo
IF N == 0:
    Write(reasoning_path, reasoning_json)
ELIF N == 1:
    Write(output_path, document_header + section_content)  # Create file
ELSE:
    Edit(output_path, append section_content)  # Append to file
```

**5.G — COMPLETE CHECKPOINT**
```bash
# C0 special: validated by reasoning-validator-bd.js, checkpoint skips header check
node core/cli/ops.js design-checkpoint --action complete --section N --type basic --file $FILE_PATH
# If too short (< 30 lines for C1-C6) → retry (max 2)
# If fail after retry → STOP
```

**5.G.5 — DESIGN VALIDATOR (Per Section)**

Invoke the **design-validator** skill on generated section:
- Q1: Evidence grounding — FR/NFR IDs have evidence citations
- Q2: ID uniqueness — no duplicate IDs
- Q3: Bilingual ratio — Vietnamese:English within 60:40 to 80:20
- Q4: Interface purity — no implementation code

```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill "design-validator-s{N}" --command basic --result PASS
```

**5.H — MARK COMPLETE**
```pseudo
TodoWrite(update "C{N}" status="completed")
```

---

## Step 6.5: Final Design Validation

After all 7 checkpoints complete, run full-document validation:

```pseudo
# 4 validators on complete document
lang_result = node.run("core/design-validators/language-validator.js", [output_path])
prohibited_result = node.run("core/design-validators/prohibited-content-checker-bd.js", [output_path])
consistency_result = node.run("core/design-validators/consistency-checker-bd.js", [output_path])
evidence_result = node.run("core/design-validators/evidence-validator-bd.js", [output_path, "--srs", srs_path])

# If any fail → fix affected sections before continuing
```

Invoke the **design-validator** skill (final) on complete document:
```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill design-validator-final --command basic --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "workflow-state-validator,quality-gate-check,design-validator-final" --mode strict
# If ok=false → STOP
```

---

## Step 7: Verify All Checkpoints

```bash
node core/cli/ops.js design-checkpoint --action verify-all --type basic
# Expected: { ok: true, total: 7, missing: [] }
# If missing any → STOP
```

---

## Step 8: Update State

```pseudo
result = node.run("core/state/state-manager.js", ["update", "BD_CREATED"])
if result.exit_code != 0:
    raise Error(f"Failed to update state: {result.stderr}")
display("✅ State updated: BD_CREATED")
```

---

## Post-Workflow: Update Evidence & Context (MANDATORY)

**1. Update evidence.md — Section "### 3.2 BD Summary"**

Using the Read tool, read evidence.md. Then using the Edit tool, add or replace:

```markdown
### 3.2 BD Summary (updated by /design --basic — [DATE])

**Document**: [filename]
**Key Outputs**: [2-3 bullet points summarizing what the BD contains]
**Scope Confirmed**: [X] components / [Y] patterns / [Z] entities (actual vs estimated)

**Corrections to Innovate Decisions**:
[If design process revealed issues with innovate decisions]
[If none: "Innovate decisions confirmed by design"]
```

**2. Update context.md — Add to Decisions Log**

Read context.md. If "## Decisions Log" section doesn't exist, create it. Then append row:

| # | Phase | Decision | Choice | Rationale | Corrects |
|---|-------|----------|--------|-----------|----------|
| N | DESIGN_BD | [BD output] | [Summary] | Generated from innovate | [if any] |

---

## Prohibited Content (Basic Design)

**MUST NOT include:**
- ❌ Sequence diagrams (→ Detail Design)
- ❌ API specs, method signatures (→ Detail Design)
- ❌ Database schemas chi tiet (→ Detail Design)
- ❌ Source code, SQL

**Focus on**: Architecture (WHAT components), not Implementation (HOW to code)

---

## Completion Message

```
✅ BASIC DESIGN CREATED (v6.0 — Enforcement Pattern)

Document(s):
- documents/features/[FEATURE]-[name]/[FEATURE]-BASE-basic-design.md
[If sub-features:]
- documents/features/[FEATURE]-[name]/[FEATURE]-[SUB1]-basic-design.md

Checkpoints Completed: C0, C1, C2, C3, C4, C5, C6 (7/7)
Lock files: .checkpoints/basic-s0.lock through basic-s6.lock

Quality:
  ✅ Vietnamese ratio: [X]%
  ✅ Prohibited content: 0 violations
  ✅ Consistency: Pass
  ✅ Evidence linkage: [X]% coverage

Next command: /research (for Detail Design)
```

---
*/design --basic Workflow v6.0*
*Enforcement Pattern — 7 Specialist Agents / 7 Checkpoints (C0-C6)*
*Direct Read + Incremental Write + Skill Gates*
