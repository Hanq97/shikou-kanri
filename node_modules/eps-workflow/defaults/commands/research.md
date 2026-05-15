---
description: Enter RESEARCH mode — Unified KB Builder (State-Aware, Multi-Model)
---

# RESEARCH Command — Unified Knowledge Base Builder

> **EXECUTION CONSTRAINTS**
>
> 1. ONE research run covers ALL scopes (SRS + BD + DD).
>    DO NOT ask user to run research again for BD or DD phases.
> 2. Output MUST have section tags [SCOPE:SRS], [SCOPE:BD], [SCOPE:DD].
> 3. Adaptive depth based on task type (new/enhancement/bugfix).

---

## Purpose

Build comprehensive domain knowledge base in a SINGLE research run.
Replace the v1 pattern of 3 separate research commands (SRS → BD → DD).

**Key Difference from v1**: Research v1 runs 3 times with different scopes.
Research runs ONCE, covers all scopes, outputs structured evidence.

---

## Step 0: Smart Onboarding (Hybrid)

### 0.1: Check for Existing Context (Auto-Resume)

```bash
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));console.log(r.data&&r.data.contextPath||'')" 2>/dev/null || echo "")

if [ -n "$CONTEXT_DIR" ] && [ -f "$CONTEXT_DIR/context.md" ]; then
  CURRENT_STATE=$(grep -oP 'Current State:\s*\*\*\K[^*]+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "")

  # V2 states → auto-resume
  case "$CURRENT_STATE" in
    RESEARCHED|INNOVATE_SRS|SRS_CREATED|INNOVATE_TECHNICAL|BD_DD_CREATED)
      echo "📂 Context found: $CONTEXT_DIR"
      echo "📌 State: $CURRENT_STATE"
      echo ""
      echo "Research already completed. Run /innovate to continue."
      exit 0
      ;;
  esac
fi
```

### 0.2: Check Flags (Power User Path)

```bash
# Parse flags
INPUT_FILE=""
TASK_TYPE=""
MODULE=""

for arg in "$@"; do
  case "$arg" in
    --input) shift; INPUT_FILE="$1" ;;
    --type) shift; TASK_TYPE="$1" ;;
    --module) shift; MODULE="$1" ;;
  esac
done

# If flags provided → use directly (no interactive prompts)
if [ -n "$INPUT_FILE" ] && [ -n "$TASK_TYPE" ]; then
  echo "✅ Using flags: --type $TASK_TYPE --input $INPUT_FILE"

  # Auto-detect module if not provided
  if [ -z "$MODULE" ]; then
    # Extract from input file or use default
    MODULE=$(grep -oP 'Module:\s*\K\w+' "$INPUT_FILE" 2>/dev/null || echo "INF")
    echo "📦 Detected module: $MODULE"
    echo "   Confirm? [Y/n]"
    # WAIT for user response — override if needed
  fi

  # Skip to Step 1
  goto STEP_1
fi
```

### 0.3: Interactive Onboarding (New User Path)

If flags not provided, guide user through setup:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RESEARCH — Smart Onboarding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Q1: Input file hoặc mô tả yêu cầu?**

Paste path to requirement file (e.g., docs/requirements/01_processed/REQ-001.md)
hoặc gõ mô tả trực tiếp.
```

**WAIT FOR USER RESPONSE.**

After user provides input:

```pseudo
IF is_file_path(response) AND file_exists(response):
    input_content = READ(response)
    INPUT_FILE = response
ELSE:
    input_content = response
    INPUT_FILE = NULL  # inline description
```

**Q2: Auto-detect task type**

```pseudo
# Keyword heuristic on input content
content_lower = input_content.lower()

IF any(kw IN content_lower FOR kw IN ["bug", "lỗi", "fix", "error", "không hoạt động"]):
    detected = "bugfix"
ELIF any(kw IN content_lower FOR kw IN ["thêm", "cải tiến", "thay đổi", "mở rộng", "update"]):
    detected = "enhancement"
ELSE:
    detected = "new"
```

Display:
```markdown
**Q2: Task type detected: [detected]**

| # | Type | Description |
|---|------|-------------|
| 1 | new | Feature mới hoàn toàn |
| 2 | enhancement | Thay đổi/cải tiến feature đã có |
| 3 | bugfix | Sửa lỗi |

Đúng không? [1/2/3 hoặc Enter để confirm]
```

**WAIT FOR USER RESPONSE.** Override if user chọn khác.

**Q3: Auto-detect module**

```pseudo
# Detect from input content, codebase, or existing features
MODULE = detect_module_from_content(input_content)
```

Display:
```markdown
**Q3: Module detected: [MODULE]**
Confirm? [Y/n hoặc gõ module code khác]
```

**WAIT FOR USER RESPONSE.**

### 0.4: Create Context

```bash
# Auto-detect developer name
DEVELOPER_NAME=$(git config user.name 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Create feature ID from input
FEATURE_ID=$(echo "$INPUT_FILE" | sed 's/.*REQ-//' | sed 's/\.md//' | tr '[:lower:]' '[:upper:]')

# v7.0: Task type validation
case "$TASK_TYPE" in
  new|enhancement|bugfix) ;;
  infrastructure|refactor) TASK_TYPE="enhancement" ;;
  feature) TASK_TYPE="new" ;;
  *) echo "❌ Invalid task type: $TASK_TYPE"; exit 1 ;;
esac

# Create context via state-manager
node core/state/state-manager.js init "$FEATURE_ID" "$DEVELOPER_NAME" \
  --requirement-file "$INPUT_FILE" \
  --task-type "$TASK_TYPE" \
  --module "$MODULE"

echo "✅ Context created for: $FEATURE_ID ($TASK_TYPE)"
```

---

## Step 1: Route by Task Type — Adaptive Research

```pseudo
SWITCH TASK_TYPE:
  CASE "new":     GOTO Step 2A (Full Research — 3 Phases)
  CASE "enhancement": GOTO Step 2B (Focused Research — 2 Phases)
  CASE "bugfix":  GOTO Step 2C (Minimal Research — 2 Phases)
```

---

## Step 2A: Full Research (Task Type = new) — 3 Phases

### Phase 1: Domain Knowledge Base (Deep)

```markdown
📚 Phase 1/3: Building Domain Knowledge Base...
```

Build domain KB with up to 8 components (scale based on domain complexity):

| # | Component | Description | Priority |
|---|-----------|-------------|----------|
| 1 | Standard Workflows | Quy trình chuẩn ngành | HIGH |
| 2 | Core Entities & Rules | Entities chính + business rules | HIGH |
| 3 | Regulatory Requirements | Luật + compliance | MEDIUM |
| 4 | Reference Architectures | Hệ thống lớn đã giải quyết thế nào | MEDIUM |
| 5 | Domain Edge Cases | Xử lý lat leo mà generic design bỏ sót | MEDIUM |
| 6 | Performance Patterns | Đặc thù performance của domain | LOW |
| 7 | Security Patterns | Đặc thù bảo mật | LOW |
| 8 | Integration Patterns | Hệ thống bên ngoài thường cần kết nối | LOW |

**Actions**:
- Claude: Analyze input + research domain inline (full conversation context)
- Gemini (if available): Parallel research via WebFetch for diverse perspective
- Web search: HIGH priority — best practices, reference systems, regulations

**Output**: Save `domain-knowledge.md` in context directory.

### Phase 2: Codebase Analysis (Survey)

```markdown
🔍 Phase 2/3: Analyzing Codebase...
```

**Actions**:
- Scan project structure, tech stack, existing patterns
- Query RAG for relevant code patterns (if available)
- Identify existing architecture, conventions, naming

**Output**: Append to evidence.md section [SCOPE:BD].

### Phase 3: External References (Deep)

```markdown
🌐 Phase 3/3: Researching External References...
```

**Actions**:
- Web search: best practices, similar solutions, technology comparisons
- RAG query: existing project patterns
- Gemini (if available): alternative perspectives

**Output**: Append to evidence.md sections [SCOPE:SRS] and [SCOPE:DD].

---

## Step 2B: Focused Research (Task Type = enhancement) — 2 Phases

### Phase 1: Codebase Deep Scan

```markdown
🔍 Phase 1/2: Deep Codebase Analysis...
```

**Actions**:
- Scan existing feature code (the feature being enhanced)
- Analyze dependencies, imports, patterns used
- Identify impact areas

**Output**: Append to evidence.md section [SCOPE:BD].

### Phase 2: Impact Analysis

```markdown
📊 Phase 2/2: Impact Analysis...
```

**Actions**:
- Map changes to affected files, components, tests
- Assess risk level (Low/Medium/High)
- Identify backward compatibility concerns

**Output**: Append to evidence.md section [SCOPE:DD].

---

## Step 2C: Minimal Research (Task Type = bugfix) — 2 Phases

### Phase 1: Root Cause Analysis

```markdown
🐛 Phase 1/2: Root Cause Analysis...
```

**Actions**:
- Parse bug report / symptom description
- Attempt to reproduce (if possible)
- Identify root cause via code analysis

**Output**: Append to evidence.md section [SCOPE:FIX].

### Phase 2: Targeted Codebase Scan

```markdown
🔍 Phase 2/2: Targeted Codebase Scan...
```

**Actions**:
- Find bug location in code
- Find related tests
- Identify minimal fix scope

**Output**: Append to evidence.md section [SCOPE:FIX].

---

## Step 3: Synthesize & Save Evidence

### 3.1: Format Evidence

```pseudo
evidence = "# Evidence Report: {FEATURE_ID}\n\n"
evidence += "## Metadata\n"
evidence += "- Feature: {FEATURE_ID}\n"
evidence += "- Task Type: {TASK_TYPE}\n"
evidence += "- Module: {MODULE}\n"
evidence += "- Generated: {DATE}\n\n"

IF TASK_TYPE == "new":
    evidence += "## Section 1: Business Context [SCOPE:SRS]\n"
    evidence += format_business_findings()
    evidence += "\n## Section 2: Architecture Patterns [SCOPE:BD]\n"
    evidence += format_architecture_findings()
    evidence += "\n## Section 3: Implementation References [SCOPE:DD]\n"
    evidence += format_implementation_findings()

ELIF TASK_TYPE == "enhancement":
    evidence += "## Section 1: Architecture & Impact [SCOPE:BD]\n"
    evidence += format_codebase_findings()
    evidence += "\n## Section 2: Implementation Delta [SCOPE:DD]\n"
    evidence += format_impact_findings()

ELIF TASK_TYPE == "bugfix":
    evidence += "## Section 1: Root Cause & Fix Scope [SCOPE:FIX]\n"
    evidence += format_rootcause_findings()
```

### 3.2: Validate Evidence

```pseudo
# Each section must have ≥2 evidence pieces with source citation
FOR EACH section IN evidence.sections:
    IF section.evidence_count < 2:
        DISPLAY "⚠️ Section {section.name} has only {section.evidence_count} evidence pieces"
        DISPLAY "   Minimum 2 required. Adding more research..."
        # Retry research for this section
```

### 3.3: Save Files

```bash
# Save evidence
WRITE "$CONTEXT_DIR/evidence.md" evidence

# Save domain KB (new features only)
IF [ "$TASK_TYPE" = "new" ]; then
    WRITE "$CONTEXT_DIR/domain-knowledge.md" domain_kb
fi

echo "✅ Evidence saved: $CONTEXT_DIR/evidence.md"
```

---

## Step 4: Update State

```bash
node core/state/state-manager.js update RESEARCHED
echo "✅ State: RESEARCHED"
echo ""
echo "Next: /innovate"
```

---

## Completion Message

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RESEARCH COMPLETE

Feature: [FEATURE_ID]
Task Type: [TASK_TYPE]
Module: [MODULE]

Evidence:
  - evidence.md ([N] sections, [M] evidence pieces)
  [If new:] - domain-knowledge.md ([K] components)

State: RESEARCHED
Next: /innovate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Enforcement Rules (R01-R08)

| ID | Rule | Covered By |
|----|------|------------|
| R01 | Workflow state validation before research | Step 0.1 (auto-resume check) |
| R02 | --input + --type required for SRS phase | Step 0.2 (flags) + Step 0.3 (interactive) |
| R03 | Phase detection based on state/type | Step 1 (route by task type) |
| R04 | Evidence ≥2 pieces per section with source citation | Step 3.2 (validate evidence) |
| R05 | Web search priority by task type | Step 2A Phase 3 (HIGH), Step 2B (MEDIUM), Step 2C (skip) |
| R06 | Multi-model: Claude + Gemini parallel | Step 2A Phase 1+3 (new only) |
| R07 | Context directory creation + context.md save | Step 0.4 (create context) |
| R08 | State update after research complete | Step 4 (RESEARCHED) |

## Quality Rules

### DO
- ✅ R03: Build domain KB BEFORE evidence gathering (new features)
- ✅ R05: Adaptive depth based on task type
- ✅ R04: Evidence pieces MUST have source citation
- ✅ Section tags [SCOPE:SRS], [SCOPE:BD], [SCOPE:DD] required
- ✅ R02: Smart onboarding: flags if provided, interactive if not
- ✅ R06: Gemini parallel research when available (fallback: Claude-only)

### DON'T
- ❌ DO NOT ask user to run research again for BD or DD phases
- ❌ R03: DO NOT skip domain KB for new features
- ❌ DO NOT use generic questions (must be domain-informed)
- ❌ R04: DO NOT proceed with < 2 evidence pieces per section

---

*RESEARCH Command — Unified KB Builder*
*Adaptive Depth: new (3 phases) | enhancement (2 phases) | bugfix (2 phases)*
*EPS Framework v9.0*
