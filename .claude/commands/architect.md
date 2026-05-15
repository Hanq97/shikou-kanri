---
description: Create Architecture Documents for project (5 phases — Interview, ADRs, Feature Map, Documents, Estimation)
---

# /architect Command Router

> **EXECUTION CONSTRAINTS** (KHONG DUOC VI PHAM)
>
> 1. **INLINE only**: Moi buoc chay trong conversation hien tai. KHONG dung Agent tool.
> 2. **SEQUENTIAL**: Moi phase hoan thanh truoc khi phase tiep bat dau.
> 3. **SAVE per phase**: Update architect-state.json sau moi phase.

---

## Purpose

Create Architecture Documents — nen tang cua toan bo du an.
5 phases: Smart Interview → ADRs → Feature Map → Documents → Estimation (optional).
2 modes: Greenfield (tu y tuong) va Reverse-engineer (tu codebase).

**Output**: `documents/architecture/*.md` (final), `{context-dir}/architect/` (working artifacts)

---

## Step 0: Parse Flags

Extract flags from arguments:

- `--mode [greenfield|reverse-engineer]` → set MODE (default: greenfield)
- `--resume` → set RESUME=true

If no flags → default greenfield mode.

---

## Step 1: Detect State + Context

```bash
node core/cli/ops.js context-detect
```

Read current state from context:

- **ARCH_COMPLETED** → Display: "Architecture workflow complete. Documents at documents/architecture/."
  Stop.

- **ARCH_IN_PROGRESS** → Auto-resume (go to Step 3).

- **Feature workflow in progress** (state not INITIAL, not ARCH_*) →
  Display warning: "Feature workflow in progress (state: [STATE]). /architect will create separate architect context."
  WAIT user confirm before proceeding.

- **INITIAL or no context** → New session (go to Step 2).

---

## Step 2: New Session

### 2.1 Select Mode

If `--mode` flag provided → use it.
Else → ask user:

```
Architecture Workflow — Select mode:
  1. Greenfield — Start from idea/requirements (default)
  2. Reverse-engineer — Analyze existing codebase

Choose (1/2):
```

WAIT for user response.

### 2.2 Create Context

```bash
# Create architect directory in context
CONTEXT_DIR=$(node -e "
  const sm = require('./core/state/state-manager.js');
  console.log(sm.findActiveContext() || sm.getBranchContextDir());
")
```

Create directories:
- `{CONTEXT_DIR}/architect/`
- `{CONTEXT_DIR}/architect/decisions/`
- `{CONTEXT_DIR}/architect/catalogs/`

### 2.3 Initialize architect-state.json

Write `{CONTEXT_DIR}/architect-state.json`:

```json
{
  "mode": "greenfield",
  "domain": null,
  "currentPhase": "interview",
  "phases": {
    "interview": {
      "status": "pending",
      "totalTopics": 0,
      "completedTopics": [],
      "currentTopic": null,
      "currentQuestion": 0
    },
    "adr": {
      "status": "pending",
      "totalADRs": 0,
      "completedADRs": [],
      "adrList": []
    },
    "feature-map": {
      "status": "pending"
    },
    "documents": {
      "status": "pending",
      "totalDocs": 0,
      "completedDocs": [],
      "docList": []
    },
    "estimation": {
      "status": "pending"
    }
  },
  "startedAt": "ISO_TIMESTAMP",
  "updatedAt": "ISO_TIMESTAMP"
}
```

### 2.4 Update State

```bash
node core/state/state-manager.js update ARCH_IN_PROGRESS
```

Proceed to Step 4.

---

## Step 3: Resume

Read `{CONTEXT_DIR}/architect-state.json`.

Display progress summary:

```
Resuming /architect workflow:
  Mode: [greenfield|reverse-engineer]
  Domain: [domain name]
  Current Phase: [phase name]
  Progress:
    Interview: [status] ([N/M] topics)
    ADR: [status] ([N/M] ADRs)
    Feature Map: [status]
    Documents: [status] ([N/M] docs)
    Estimation: [status]
```

Proceed to Step 4.

---

## Step 4: Phase Dispatch Loop

Read `architect-state.json` → find `currentPhase`.

### Dispatch Table

| currentPhase | Micro-command | Description |
|---|---|---|
| `interview` | `commands/architect/interview.md` | Phase 1: Domain KB + Smart Interview |
| `adr` | `commands/architect/adr.md` | Phase 2: Architecture Decisions |
| `feature-map` | `commands/architect/feature-map.md` | Phase 3: Feature Mapping |
| `documents` | `commands/architect/documents.md` | Phase 4: Architecture Documents |
| `estimation` | `commands/architect/estimation.md` | Phase 5: Estimation |

### Loop Logic

```
WHILE currentPhase != "completed":
    phase = read architect-state.json → currentPhase

    IF phase == "estimation":
        Ask: "Run Phase 5 (Estimation)? This is optional. (y/n)"
        WAIT user response.
        IF no → mark estimation.status = "skipped"
                 set currentPhase = "completed"
                 CONTINUE

    Load micro-command: Read tool → commands/architect/{phase}.md
    Follow micro-command instructions completely.
    Micro-command will:
      - Execute phase workflow
      - Update architect-state.json (phase.status = completed)
      - Advance currentPhase to next phase
      - RETURN control here

    Update architect-state.json.updatedAt
END WHILE
```

### Phase Advancement Order

```
interview → adr → feature-map → documents → estimation → completed
```

---

## Step 5: Completion

All phases done (or estimation skipped).

```bash
node core/state/state-manager.js update ARCH_COMPLETED
```

Display summary:

```
Architecture Workflow Complete!

Mode: [greenfield|reverse-engineer]
Domain: [domain]

Documents created:
  documents/architecture/
    [list all .md files created]

Working artifacts:
  {context-dir}/architect/
    assessment.md
    decisions/ ([N] ADRs)
    catalogs/ ([N] catalogs)
    feature-map.md
    [estimation.md if applicable]

State: ARCH_COMPLETED
```

---

**/architect Command Router v1.0**
*EPS Framework v8.0 — Architecture Workflow*
