# /design --srs Workflow v4.0

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

Create Software Requirements Specification (SRS) document using 7 SRS specialist agents with checkpoint enforcement.
**Output**: `[FEATURE]-BASE-srs.md`

---

## Pre-requisites (Validated by Router)
- State: INNOVATE_SRS
- Quality Gate D1: Passed (evidence ≥3, quality ≥80%)
- Evidence file with approved Business Approach + Function List

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
  node core/cli/ops.js rag-query --query "${STACK_BACKEND_FRAMEWORK:-spring-boot} patterns best practices" --command design-srs 2>/dev/null
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
- Validates that current workflow state allows SRS generation
- Expected state: RESEARCH completed or INNOVATE_SRS completed
- If FAIL: STOP — display state violation
- If PASS: Continue

```bash
# Skill artifact enforcement
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill workflow-state-validator --command srs --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "workflow-state-validator" --mode strict
```

---

## Step 0.7: Quality Gate D1

Invoke the **quality-gate-check** skill with gate D1 (Evidence Threshold):
- Criteria: ≥3 evidence sources, ≥80% coverage
- If FAIL (soft gate): Display warning — user may continue or go back to /research
- If PASS: Continue

```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill quality-gate-check --command srs --result PASS
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
# Direct Read — replaces ops.js specialist-load
orchestrator_content = Read("specialists/document/srs/_orchestrator.md")
# Parse: agent mapping, quality rules Q1-Q4, language rules, prohibited content
```

---

## Step 1.5: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merges evidence from memory-bank, RAG query results, and research findings
- Provides synthesized evidence context for generation steps

```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill evidence-fusion --command srs --result PASS
```

---

## Step 2: Load Context & Evidence

```pseudo
result = node.run("core/state/state-manager.js", ["get"])
context = json.parse(result.stdout)
feature_name = context.feature
developer = context.developer
branch = git.branch_current()

context_file = f".claude/memory-bank/{branch}/{feature_name}-{developer}/context.md"
evidence_file = f".claude/memory-bank/{branch}/{feature_name}-{developer}/evidence.md"

context_content = read_file(context_file)
evidence_content = read_file(evidence_file)

output_path = f"documents/features/{feature_dir}/{feature_name}-BASE-srs.md"
```

**Evidence contains** (from INNOVATE_SRS):
- Business Approach (User Approved)
- Function List (User Approved)
- Estimated metrics

---

## Step 2.5: Initialize Enforcement

```bash
# Reset checkpoints + skill artifacts for fresh run
node core/cli/ops.js design-checkpoint --action reset --type srs
node core/cli/ops.js design-checkpoint --action skill-reset --command srs
```

```pseudo
# TodoWrite — tracking 7 sections
TodoWrite([
  { content: "S0: Document Info (00-document-info)", status: "pending" },
  { content: "S1: Overview (01-overview)", status: "pending" },
  { content: "S2: Functional Requirements (02-functional-requirements)", status: "pending" },
  { content: "S3: Non-Functional Requirements (03-non-functional-requirements)", status: "pending" },
  { content: "S4: User Stories (04-user-stories)", status: "pending" },
  { content: "S5: Acceptance Criteria (05-acceptance-criteria)", status: "pending" },
  { content: "S6: Constraints (06-constraints)", status: "pending" },
])
```

---

## Step 3: Section Loop (00 → 06) — 8-Step Enforcement

### Agent File Mapping

| N | Agent File (Direct Read) | Section Header | Checkpoint |
|---|--------------------------|---------------|------------|
| 0 | `specialists/document/srs/00-document-info.md` | `## 00 — Document Information` | S0 |
| 1 | `specialists/document/srs/01-overview.md` | `## 01 — Tổng quan / Overview` | S1 |
| 2 | `specialists/document/srs/02-functional-requirements.md` | `## 02 — Functional Requirements` | S2 |
| 3 | `specialists/document/srs/03-non-functional-requirements.md` | `## 03 — Non-Functional Requirements` | S3 |
| 4 | `specialists/document/srs/04-user-stories.md` | `## 04 — User Stories` | S4 |
| 5 | `specialists/document/srs/05-acceptance-criteria.md` | `## 05 — Acceptance Criteria` | S5 |
| 6 | `specialists/document/srs/06-constraints.md` | `## 06 — Constraints` | S6 |

### For N = 0 to 6, execute:

**3.A — VERIFY CHECKPOINT**
```bash
node core/cli/ops.js design-checkpoint --action verify --section N --type srs
# If canProceed=false and "already completed" → SKIP to next N
# If canProceed=false (sequence error) → STOP
```

**3.B — LOAD GRAPH CONTEXT**
```bash
node core/cli/ops.js design-context --section N --type srs --module $MODULE
GRAPH_CONTEXT=$(cat cache/ops-result.json)
```

**3.C — READ SPECIALIST AGENT (Direct Read)**
```pseudo
agent_content = Read("specialists/document/srs/{AGENT_FILE_MAP[N]}")
```

**3.D — MARK IN-PROGRESS**
```pseudo
TodoWrite(update "S{N}" status="in_progress")
```

**3.E — GENERATE SECTION CONTENT**

Generate section content using:
- Specialist agent instructions
- Graph context from HippoRAG
- Evidence (approved Business Approach + Function List)
- Orchestrator quality rules (Q1-Q4)

Self-critique Q1-Q4:
- Q1: Evidence-based? Traces to Function List / Business Approach?
- Q2: ID consistency? FR-XXX / NFR-XXX / US-[ROLE]-XXX format?
- Q3: Vietnamese ratio ≥ 60%?
- Q4: No prohibited content (no source code, no SQL, no API paths, no architecture patterns)?

If any Q fails → self-fix before proceeding.

**3.F — WRITE (Incremental)**
```pseudo
IF N == 0:
    Write(output_path, document_header + section_00_content)  # Create file
ELSE:
    Edit(output_path, append section_0N_content)  # Append to file
```

**3.G — COMPLETE CHECKPOINT**
```bash
node core/cli/ops.js design-checkpoint --action complete --section N --type srs --file $OUTPUT_PATH
# If too short (< 25 lines) → retry (max 2)
# If fail after retry → STOP
# Lock file: .checkpoints/srs-s{N}.lock
```

**3.G.5 — DESIGN VALIDATOR (Per Section)**

Invoke the **design-validator** skill on generated section:
- Q1: Evidence grounding — FR/NFR IDs have evidence citations
- Q2: ID uniqueness — no duplicate IDs
- Q3: Bilingual ratio — Vietnamese:English within 60:40 to 80:20
- Q4: Interface purity — no implementation code

```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill "design-validator-s{N}" --command srs --result PASS
```

**3.H — MARK COMPLETE**
```pseudo
TodoWrite(update "S{N}" status="completed")
```

---

## Step 4.5: Final Design Validation

After all 7 checkpoints complete, run full-document validation:

```pseudo
# 4 validators on complete document
lang_result = node.run("core/design-validators/language-validator.js", [output_path])
prohibited_result = node.run("core/design-validators/prohibited-content-checker.js", [output_path])
consistency_result = node.run("core/design-validators/consistency-checker.js", [output_path])
evidence_result = node.run("core/design-validators/evidence-validator.js", [output_path])

# If any fail → fix affected sections before continuing
```

Invoke the **design-validator** skill (final) on complete document:
```bash
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill design-validator-final --command srs --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "workflow-state-validator,quality-gate-check,design-validator-final" --mode strict
# If ok=false → STOP
```

---

## Step 5: Verify All Checkpoints

```bash
node core/cli/ops.js design-checkpoint --action verify-all --type srs
# Expected: { ok: true, total: 7, missing: [] }
# If missing any → STOP
```

---

## Step 6: Update State

```pseudo
result = node.run("core/state/state-manager.js", ["update", "SRS_CREATED"])
if result.exit_code != 0:
    raise Error(f"Failed to update state: {result.stderr}")
display("✅ State updated: SRS_CREATED")
```

---

## Post-Workflow: Update Evidence & Context (MANDATORY)

**1. Update evidence.md — Section "### 3.1 SRS Summary"**

Using the Read tool, read evidence.md. Then using the Edit tool, add or replace:

```markdown
### 3.1 SRS Summary (updated by /design --srs — [DATE])

**Document**: [filename]
**Key Outputs**: [2-3 bullet points summarizing what the SRS contains]
**Scope Confirmed**: [X] FRs / [Y] NFRs / [Z] BRs (actual vs estimated)

**Corrections to Innovate Decisions**:
[If design process revealed issues with innovate decisions]
[If none: "Innovate decisions confirmed by design"]
```

**2. Update context.md — Add to Decisions Log**

Read context.md. If "## Decisions Log" section doesn't exist, create it. Then append row:

| # | Phase | Decision | Choice | Rationale | Corrects |
|---|-------|----------|--------|-----------|----------|
| N | DESIGN_SRS | [SRS output] | [Summary] | Generated from innovate | [if any] |

---

## SRS Content Rules

SRS = requirements (WHAT/WHY), NOT implementation (HOW):
- Vietnamese ≥60% for content, English for technical terms (API, JWT, Component)
- Bilingual section headers: "Mục đích / Purpose"
- ID formats: FR-XXX, NFR-XXX, US-[ROLE]-XXX (English)

**Prohibited Content** — MUST NOT include:
- ❌ Source code, SQL, pseudocode
- ❌ Architecture patterns, tech stack (except Section 06)
- ❌ API endpoint paths, method signatures
- ❌ Database schemas, table structures
- ❌ Implementation details

**Focus on**: WHAT (requirements), not HOW (implementation)

---

## Completion Message

```
✅ SRS CREATED (v4.0 — Enforcement Pattern)

Document(s):
- documents/features/[FEATURE]-[name]/[FEATURE]-BASE-srs.md
[If sub-features:]
- documents/features/[FEATURE]-[name]/[FEATURE]-[SUB1]-srs.md

Checkpoints Completed: S0, S1, S2, S3, S4, S5, S6 (7/7)
Lock files: .checkpoints/srs-s0.lock through srs-s6.lock

Quality:
  ✅ Vietnamese ratio: [X]% (≥60%)
  ✅ Prohibited content: 0 violations
  ✅ Section completeness: 7/7 sections
  ✅ Evidence linkage: [X]% coverage

Metrics:
- Functional Requirements: [X] FRs
- Non-Functional Requirements: [Y] NFRs
- Business Rules: [Z] BRs
- User Stories: [V] USs

Next command: /research (for Basic Design)
```

---
*/design --srs Workflow v4.0*
*Enforcement Pattern — 7 Specialist Agents / 7 Checkpoints (S0-S6)*
*Direct Read + Incremental Write + Skill Gates*
