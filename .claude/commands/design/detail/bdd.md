# Backend Detail Design Generation (BDD)

## Prerequisites (from detail.md router)
- DESIGN_SCOPE != "frontend" (otherwise this file is skipped)
- CONTEXT_DIR, STACK_* variables set by router (Step 0.1, 0.5)
- G0 gate passed (Step 0.1)
- DD_RAG_* variables available (Step 0.6)

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

Read the BDD orchestrator specification directly via Read tool:

```
Read file: .claude/specialists/document/detail-design-backend/_orchestrator.md
```

**After reading**: Follow orchestrator's enforcement rules for ALL subsequent steps.
The orchestrator defines HOW to generate quality content; this file defines WHAT to do.

---

## Step 2: Load Context (scope-dependent)

```pseudo
if DESIGN_SCOPE == "fullstack":
    # FDD + API Contracts generated in previous phases
    fdd_file = find("documents/features/{feature_dir}/*-frontend-detail-design.md")
    api_file = find("documents/features/{feature_dir}/*-api-contracts.md")
    Read file: fdd_file
    Read file: api_file
    context_source = "FDD + API Contracts"

elif DESIGN_SCOPE == "backend":
    # No frontend documents — load BD + SRS directly
    bd_file = f"documents/features/{feature_dir}/{feature}-BASE-basic-design.md"
    srs_file = f"documents/features/{feature_dir}/{feature}-BASE-srs.md"
    Read file: bd_file
    Read file: srs_file
    context_source = "BD + SRS (no frontend documents)"
```

Also read evidence file:
```pseudo
evidence_file = f"{CONTEXT_DIR}/evidence.md"
Read file: evidence_file
```

---

## Step 3: Initialize Enforcement

### TodoWrite Tracking

```pseudo
TodoWrite([
    { content: "BDD Section 0: Document Info", status: "pending" },
    { content: "BDD Section 1: Service Overview", status: "pending" },
    { content: "BDD Section 2: Business Logic", status: "pending" },
    { content: "BDD Section 3: API Endpoints", status: "pending" },
    { content: "BDD Section 4: Data & Database", status: "pending" },
    { content: "BDD Section 5: Integration", status: "pending" },
    { content: "BDD Section 6: Error Handling", status: "pending" },
    { content: "BDD Section 7: Performance", status: "pending" },
    { content: "BDD Section 8: Security", status: "pending" },
    { content: "BDD Section 9: Test Cases", status: "pending" },
])
```

### Reset Checkpoints

```bash
node core/cli/ops.js design-checkpoint --action reset --type bdd
```

### Resolve Output File Path

```pseudo
backend_dd_file = f"documents/features/{feature_dir}/{feature}-BASE-backend-detail-design.md"
```

---

## Step 4: Generate Sections (10 merged agents, section-by-section)

**FOR EACH section N (0-9)**, execute steps 4.A through 4.G sequentially:

### 4.A: VERIFY via ops.js (HARD GATE — programmatic)

```bash
node core/cli/ops.js design-checkpoint --action verify --section N --type bdd
```

Read `cache/ops-result.json`:
- If `data.ok == true` and `data.canProceed == true`: continue
- If `data.ok == false`: **STOP IMMEDIATELY** — display error and do not proceed

### 4.B: LOAD GRAPH CONTEXT (per-section, structured)

```bash
node core/cli/ops.js design-context --section N --type bdd --module $MODULE
```

Read `cache/ops-result.json` -> extract `data.context` object.
This provides structured entities, relationships, patterns specific to THIS section.
Non-blocking: if source == "fallback", continue without graph enrichment.

### 4.C: Read Merged Agent File (DIRECT)

```
Read file: .claude/specialists/document/detail-design-backend/bdd-0{N}-{section-name}.md
```

**Agent file mapping**:

| N | File to Read |
|---|---|
| 0 | `bdd-00-document-info.md` |
| 1 | `bdd-01-service-overview.md` |
| 2 | `bdd-02-business-logic.md` |
| 3 | `bdd-03-api-endpoints.md` (or `bdd-03-api-endpoints-infrastructure.md` if infra) |
| 4 | `bdd-04-data-database.md` |
| 5 | `bdd-05-integration.md` |
| 6 | `bdd-06-error-handling.md` |
| 7 | `bdd-07-performance.md` |
| 8 | `bdd-08-security.md` |
| 9 | `bdd-09-test-cases.md` |

**Section 3 variant selection**:
```pseudo
if SRS contains "BASE Type: infrastructure" OR "no external API":
    agent = "bdd-03-api-endpoints-infrastructure.md"
else:
    agent = "bdd-03-api-endpoints.md"
```

Each merged file (v4.0) contains agent instructions + pseudo-code logic + Q1-Q4 validation rules.

### 4.D: Mark in_progress

```pseudo
TodoWrite: mark section N as in_progress
```

### 4.E: Generate Section Content

Using combined context:
- Merged agent instructions + pseudo-code + Q1-Q4 rules (from 4.C)
- Graph context: entities, relationships, patterns (from 4.B)
- DD_RAG_CODE + DD_RAG_DESIGNS (from router Step 0.6)

Follow Q1-Q4 validation rules from the merged agent file during generation.

**Per-section enrichment** (invoke skills where applicable):
- **architecture-analyzer**: For sections 3 (API), 4 (Data), 5 (Integration)
- **pattern-analyzer**: For all sections — check against specialist recommendations
- **design-validator**: After generating — Q1-Q4 compliance check

### 4.F: INCREMENTAL WRITE

```pseudo
if N == 0:
    # First section — Write tool: file header + Section 0
    Write(backend_dd_file, file_header + section_0_content)
else:
    # Append section — Edit tool: append after last section
    Edit(backend_dd_file, append section_N_content after last section)
```

This ensures progress is saved even if generation stops mid-way.

### 4.G: COMPLETE via ops.js (VALIDATION + LOCK — programmatic)

```bash
node core/cli/ops.js design-checkpoint --action complete --section N --type bdd --file $OUTPUT_FILE
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
        # Re-run 4.E, 4.F, 4.G
    if NOT data.ok:
        display("Section {N} failed after 2 retries - continuing with warning")
```

### 4.H: Mark completed

```pseudo
TodoWrite: mark section N as completed
```

---

## Step 5: Final Verification

```bash
node core/cli/ops.js design-checkpoint --action verify-all --type bdd
```

Read `cache/ops-result.json`:
- If `data.ok == true` and `data.total == 10`: all sections verified
- If `data.ok == false`: display missing sections, prompt for regeneration

```pseudo
if data.ok:
    display("BDD enforcement passed: 10/10 sections verified")
else:
    display(f"BDD enforcement failed: {data.total}/10 sections. Missing: {data.missing}")
    STOP
```

---

## Step 6: Insert DD-SECTION Markers (if > 300 lines)

```pseudo
bdd_content = read_file(backend_dd_file)
bdd_lines = bdd_content.split("\n").length

if bdd_lines > 300:
    # Insert DD-SECTION markers for /plan auto-split
    # Group related sections (2-3 per marker):
    #   core-logic: Section 1 (Service Overview) + Section 2 (Business Logic)
    #   api-data: Section 3 (API Endpoints) + Section 4 (Data & Database)
    #   integration: Section 5 (Integration) + Section 6 (Error Handling) + Section 7 (Performance)
    #   security-testing: Section 8 (Security) + Section 9 (Test Cases)
    #
    # Marker format: <!-- DD-SECTION: section-id --> ... <!-- DD-SECTION-END: section-id -->
    display(f"BDD {bdd_lines} lines > 300 - DD-SECTION markers inserted for auto-split")
else:
    display(f"BDD {bdd_lines} lines <= 300 - no markers needed (single-file mode)")
```

---

## Step 7: Quality Validation Summary

Display Q1-Q4 compliance for the complete BDD document:

```
Q1: Evidence-Based - All sections trace to SRS/BD requirements (FR-XXX)
Q2: Consistency - Service IDs unique, API paths consistent across sections
Q3: Vietnamese >=60% - {ratio}% (target: >=60%)
Q4: Interface Purity - Zero ORM decorators, zero SQL DDL, zero implementation code
```

---

**NEXT**: Return to detail.md router for next micro-command.
- If DESIGN_SCOPE == "fullstack": `detail/bdd-pseudo.md` is next
- If DESIGN_SCOPE == "backend": `detail/bdd-pseudo.md` is next

---
*detail/bdd.md — BDD micro-command v2.0*
*10 merged agents (v4.0), hybrid enforcement (EXECUTION CONSTRAINTS + ops.js checkpoint)*
*Per-section graph context via design-context ops.js action*
*Incremental write: progress saved after each section*
