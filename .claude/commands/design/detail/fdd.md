# Frontend Detail Design Generation (FDD)

## Prerequisites (from detail.md router)
- DESIGN_SCOPE != "backend" (otherwise this file is skipped)
- CONTEXT_DIR, STACK_* variables set by router (Step 0.1, 0.5)
- G0 gate passed (Step 0.1)
- DD_RAG_* variables available (Step 0.6)
- HAS_SUBFEATURES, sub_feature_count from router (Step 0.8)

---

## EXECUTION CONSTRAINTS (MANDATORY — NO EXCEPTIONS)

```
+==================================================================+
|  1. MUST READ ALL 10 MERGED AGENT FILES                         |
|     - Each section MUST Read the corresponding merged agent file |
|     - DO NOT skip any section (0-9)                              |
|     - DO NOT generate a section without Reading its agent file   |
|                                                                  |
|  2. MUST GENERATE ONE SECTION AT A TIME                         |
|     - Verify -> Read agent -> Graph context -> Generate -> Write |
|     - DO NOT generate multiple sections simultaneously           |
|     - DO NOT write the entire document at once                   |
|                                                                  |
|  3. OPS.JS CHECKPOINT ENFORCEMENT (PROGRAMMATIC)                |
|     - BEFORE each section: run ops.js design-checkpoint verify   |
|     - AFTER each section:  run ops.js design-checkpoint complete |
|     - If verify FAILS -> STOP — cannot be bypassed              |
+==================================================================+
```

**VIOLATIONS**: If you skip an agent file, batch-generate sections, or bypass checkpoint calls, the output will be rejected.

---

## Step 1: Read Orchestrator (DIRECT)

Read the FDD orchestrator specification directly via Read tool:

```
Read file: .claude/specialists/document/detail-design-frontend/_orchestrator.md
```

**After reading**: Follow orchestrator's enforcement rules for ALL subsequent steps.
The orchestrator defines HOW to generate quality content; this file defines WHAT to do.

---

## Step 2: A+B+C Pattern Check

```pseudo
if HAS_SUBFEATURES and sub_feature_count >= 4:
    use_abc_pattern = true
    display("Using A+B+C FDD Pattern (>=4 sub-features)")
    # Skip standard 10-agent flow
    # Jump to Step 2B: A+B+C Execution
else:
    use_abc_pattern = false
    display("Using Traditional FDD Pattern (10 micro-agents)")
    # Continue to Step 3
```

### Step 2B: A+B+C Execution (only if use_abc_pattern == true)

If A+B+C pattern is active, load and execute 3 specialized agents instead of 10:

```pseudo
# Document A: Portal FDD
Read file: .claude/specialists/document/detail-design-frontend/portal-fdd-agent.md
# Generate: cross-feature workflows, user journeys, API strategy
# Write: documents/features/{feature_dir}/{feature}-portal-fdd.md

# Document B: Aggregate FDD
Read file: .claude/specialists/document/detail-design-frontend/aggregate-fdd-agent.md
# Generate: app shell, shared components, root state
# Write: documents/features/{feature_dir}/{feature}-aggregate-fdd.md

# Document C: Screens FDD (per sub-feature)
Read file: .claude/specialists/document/detail-design-frontend/screens-fdd-agent.md
# For each sub-feature:
#   Generate: module-specific screens referencing A & B
#   Write: documents/features/{feature_dir}/{feature}-{sub}-screens-fdd.md

# Skip Steps 3-8 (standard flow) and jump to Quality Validation Summary
```

**After A+B+C completes**: Jump to Step 9 (Quality Validation Summary).

---

## Step 3: Load Context

```pseudo
evidence_file = f"{CONTEXT_DIR}/evidence.md"
Read file: evidence_file

bd_file = f"documents/features/{feature_dir}/{feature}-BASE-basic-design.md"
Read file: bd_file

srs_file = f"documents/features/{feature_dir}/{feature}-BASE-srs.md"
Read file: srs_file  # May not exist for some features
```

---

## Step 4: Initialize Enforcement

### TodoWrite Tracking

```pseudo
TodoWrite([
    { content: "FDD Section 0: Document Info", status: "pending" },
    { content: "FDD Section 1: Overview", status: "pending" },
    { content: "FDD Section 2: Business Flow", status: "pending" },
    { content: "FDD Section 3: Screens", status: "pending" },
    { content: "FDD Section 4: State Management", status: "pending" },
    { content: "FDD Section 5: Data Integration", status: "pending" },
    { content: "FDD Section 6: Error Handling", status: "pending" },
    { content: "FDD Section 7: Responsive Design", status: "pending" },
    { content: "FDD Section 8: Performance", status: "pending" },
    { content: "FDD Section 9: Visual Design", status: "pending" },
])
```

### Reset Checkpoints

```bash
node core/cli/ops.js design-checkpoint --action reset --type fdd
```

### Resolve Output File Path

```pseudo
frontend_dd_file = f"documents/features/{feature_dir}/{feature}-BASE-frontend-detail-design.md"
```

---

## Step 5: Generate Sections (10 merged agents, section-by-section)

**FOR EACH section N (0-9)**, execute steps 5.A through 5.H sequentially:

### 5.A: VERIFY via ops.js (HARD GATE — programmatic)

```bash
node core/cli/ops.js design-checkpoint --action verify --section N --type fdd
```

Read `cache/ops-result.json`:
- If `data.ok == true` and `data.canProceed == true`: continue
- If `data.ok == false`: **STOP IMMEDIATELY** — display error and do not proceed

### 5.B: LOAD GRAPH CONTEXT (per-section, structured)

```bash
node core/cli/ops.js design-context --section N --type fdd --module $MODULE
```

Read `cache/ops-result.json` -> extract `data.context` object.
Non-blocking: if source == "fallback", continue without graph enrichment.

### 5.C: Read Merged Agent File (DIRECT)

```
Read file: .claude/specialists/document/detail-design-frontend/fdd-0{N}-{section-name}.md
```

**Agent file mapping**:

| N | File to Read |
|---|---|
| 0 | `fdd-00-document-info.md` |
| 1 | `fdd-01-overview.md` |
| 2 | `fdd-02-business-flow.md` |
| 3 | `fdd-03-screens.md` |
| 4 | `fdd-04-state.md` |
| 5 | `fdd-05-data-integration.md` |
| 6 | `fdd-06-error.md` |
| 7 | `fdd-07-responsive.md` |
| 8 | `fdd-08-performance.md` |
| 9 | `fdd-09-visual-design.md` |

Each merged file (v4.0) contains agent instructions + pseudo-code logic + Q1-Q4 validation rules.

### 5.D: Mark in_progress

```pseudo
TodoWrite: mark section N as in_progress
```

### 5.E: Generate Section Content

Using combined context:
- Merged agent instructions + pseudo-code + Q1-Q4 rules (from 5.C)
- Graph context: entities, relationships, patterns (from 5.B)
- DD_RAG_DESIGNS + DD_RAG_CODE (from router Step 0.6)

Follow Q1-Q4 validation rules from the merged agent file during generation.

**Per-section enrichment** (invoke skills where applicable):
- **architecture-analyzer**: For sections 3 (Screens), 4 (State), 5 (Data Integration)
- **pattern-analyzer**: For all sections — check against specialist recommendations
- **design-validator**: After generating — Q1-Q4 compliance check

### 5.F: INCREMENTAL WRITE

```pseudo
if N == 0:
    # First section — Write tool: file header + Section 0
    Write(frontend_dd_file, file_header + section_0_content)
else:
    # Append section — Edit tool: append after last section
    Edit(frontend_dd_file, append section_N_content after last section)
```

This ensures progress is saved even if generation stops mid-way.

### 5.G: COMPLETE via ops.js (VALIDATION + LOCK — programmatic)

```bash
node core/cli/ops.js design-checkpoint --action complete --section N --type fdd --file $OUTPUT_FILE
```

Read `cache/ops-result.json`:
- If `data.ok == true`: section validated (>= 20 lines), lock file created
- If `data.ok == false`: section too short or missing — regenerate (max 2 retries)

```pseudo
if NOT data.ok:
    retry_count = 0
    while NOT data.ok and retry_count < 2:
        # Regenerate section with more detail
        retry_count += 1
        # Re-run 5.E, 5.F, 5.G
    if NOT data.ok:
        display("Section {N} failed after 2 retries - continuing with warning")
```

### 5.H: Mark completed

```pseudo
TodoWrite: mark section N as completed
```

---

## Step 6: Final Verification

```bash
node core/cli/ops.js design-checkpoint --action verify-all --type fdd
```

Read `cache/ops-result.json`:
- If `data.ok == true` and `data.total == 10`: all sections verified
- If `data.ok == false`: display missing sections, prompt for regeneration

```pseudo
if data.ok:
    display("FDD enforcement passed: 10/10 sections verified")
else:
    display(f"FDD enforcement failed: {data.total}/10 sections. Missing: {data.missing}")
    STOP
```

---

## Step 7: Insert DD-SECTION Markers (if > 300 lines)

```pseudo
fdd_content = read_file(frontend_dd_file)
fdd_lines = fdd_content.split("\n").length

if fdd_lines > 300:
    display(f"FDD {fdd_lines} lines > 300 - DD-SECTION markers inserted for auto-split")
else:
    display(f"FDD {fdd_lines} lines <= 300 - no markers needed (single-file mode)")
```

---

## Step 8: Write Final Document

Document already written incrementally in Step 5.F. This step only needed for DD-SECTION marker insertion.

---

## Step 9: Quality Validation Summary

Display Q1-Q4 compliance for the complete FDD document:

```
Q1: Evidence-Based - All components trace to SRS requirements (FR-XXX)
Q2: Consistency - Component IDs unique, screen IDs follow SCR-XXX-001 convention
Q3: Vietnamese >=60% - {ratio}% (target: >=60%)
Q4: Interface Purity - Zero JSX, zero CSS code, zero TypeScript interfaces
```

---

**NEXT**: Return to detail.md router for next micro-command.
- If DESIGN_SCOPE == "frontend": `detail/api-contract.md` (if needs_api_contracts) or `detail/fdd-pseudo.md`
- If DESIGN_SCOPE == "fullstack": `detail/api-contract.md` is next

---
*detail/fdd.md — FDD micro-command v2.0*
*10 merged agents (v4.0), hybrid enforcement (EXECUTION CONSTRAINTS + ops.js checkpoint)*
*Per-section graph context via design-context ops.js action*
*Incremental write: progress saved after each section*
*A+B+C pattern support for >=4 sub-features*
