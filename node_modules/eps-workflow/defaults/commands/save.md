---
description: Save context to branch-aware memory bank
---

# /save Command - Enhanced v2.0
**Structured Checkpoints with Auto-Recovery Support**

---

## COMMAND SCOPE

You are executing the `/save` command to save session context to memory-bank.

**Arguments received**: `$ARGUMENTS`

---

## STEP 0: Check Active Context (MANDATORY)

**CRITICAL**: Before saving, verify an active context exists.

### Step 0.1: Check for active context

```bash
# Get developer name
DEVELOPER=$(git config user.name 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr ' ' '-' || echo "developer")

# Check for active context
node core/cli/ops.js context-detect
ACTIVE_CONTEXT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")

echo "👤 Developer: $DEVELOPER"
echo "📍 Branch: $(git branch --show-current)"
```

### Step 0.2: Handle no active context

```bash
if [ -z "$ACTIVE_CONTEXT" ]; then
  echo "❌ No active context found!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Memory-bank requires an initialized context before saving."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Options:"
  echo ""
  echo "1️⃣  For EPS workflow (recommended):"
  echo "   /research --input <req-file> --type <new|enhancement|bugfix>"
  echo ""
  echo "2️⃣  For ad-hoc context (quick init):"
  echo "   Provide a FEATURE-ID and I'll initialize for you."
  echo ""
  echo "FEATURE-ID examples:"
  echo "   • ARCH-DOCS      (documentation task)"
  echo "   • EPS-ENHANCE    (infrastructure task)"
  echo "   • USR-AUTH       (feature development)"
  echo "   • BUG-123        (bugfix)"
  echo ""
  # DO NOT PROCEED - Ask user for input
fi
```

### Step 0.3: If user provides FEATURE-ID (init new context)

When user responds with a FEATURE-ID (e.g., "ARCH-DOCS" or "use ARCH-DOCS"):

```bash
FEATURE_ID="<user-provided-id>"  # e.g., ARCH-DOCS

# Initialize new context
node core/state/state-manager.js init "$FEATURE_ID" "$DEVELOPER"

# Verify creation
node core/cli/ops.js context-detect
ACTIVE_CONTEXT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")

if [ -n "$ACTIVE_CONTEXT" ]; then
  echo "✅ Context initialized: $ACTIVE_CONTEXT"
  echo ""
  echo "Now proceeding with /save..."
else
  echo "❌ Failed to initialize context"
  exit 1
fi
```

### Step 0.4: Proceed if context exists

```bash
if [ -n "$ACTIVE_CONTEXT" ]; then
  echo "✅ Active context: $ACTIVE_CONTEXT"
  # Continue to STEP 1
fi
```

**Decision Flow**:
```
/save called
    ↓
Check active context
    ↓
EXISTS? → Continue to Step 1
    ↓
NOT EXISTS? → Ask user for FEATURE-ID
    ↓
User provides FEATURE-ID → Init context → Continue to Step 1
    ↓
User says "cancel" → Abort /save
```

---

## STEP 1: Detect Mode & Auto-populate Default

Parse `$ARGUMENTS` to determine which mode:

```pseudo
IF $ARGUMENTS is empty OR only whitespace:
    MODE = "checkpoint"  # Default to Mode 3: Most Comprehensive
    AUTO_POPULATE = true
ELSE IF $ARGUMENTS contains "--checkpoint":
    MODE = "checkpoint"  # Mode 3: Comprehensive
    AUTO_POPULATE = false
ELSE IF $ARGUMENTS contains "--milestone":
    MODE = "milestone"   # Mode 2: Structured
    AUTO_POPULATE = false
ELSE:
    MODE = "quick"       # Mode 1: Backward compatible
    AUTO_POPULATE = false
END IF
```

**Display to user**:
```
Detected mode: [MODE] (auto-populated: [AUTO_POPULATE])
```

### Auto-population Logic (when $ARGUMENTS is empty)

When no arguments provided, auto-populate Mode 3 parameters from conversation context:

```pseudo
# Auto-detect checkpoint title from recent work
CHECKPOINT_TITLE = infer_from_recent_work()  # e.g., "Phase 4 Day 1-2 Complete"

# Auto-detect phase from conversation context
PHASE = infer_current_phase()  # e.g., "backend-implementation"

# Auto-detect status from file operations
STATUS = infer_current_status()  # e.g., "day-2-complete"

# Auto-summarize files created/modified
FILES = summarize_file_operations()  # e.g., "Day 1: 2,861 lines (2 specialists, 40 patterns). Day 2: 1,737 lines (3 specialists, 45 patterns)"

# Auto-detect next action
NEXT_ACTION = infer_next_logical_step()  # e.g., "Create Day 3 files: Repository Layer (Graph/Vector Repos, SQL/Cache Repos, 35 patterns)"

# Default recovery time
RECOVERY_TIME = "10"

# Auto-detect related files from recent operations
LINKS = detect_recent_file_links()  # e.g., "phase-4/day-1/PLAN.md,phase-4/day-2/PLAN.md,phase-4/PHASE_4_OVERVIEW.md"

# Build arguments string
$ARGUMENTS = "--checkpoint \"$CHECKPOINT_TITLE\" --phase \"$PHASE\" --status \"$STATUS\" --files \"$FILES\" --next-action \"$NEXT_ACTION\" --recovery-time \"$RECOVERY_TIME\" --links \"$LINKS\""
```

**Important**: When auto-populating, analyze the conversation context to extract:
- Recent file Write/Edit operations
- Current work phase (from memory-bank paths, document titles)
- Logical next step (from todo list, plan documents, user's last request)
- Related files (from Read/Write operations in last 10 tool uses)

---

## STEP 2: Execute Save Processor

Run the save processor script with all arguments:

```bash
node "$(git rev-parse --show-toplevel)/core/memory/save-processor.js" $ARGUMENTS
```

**Expected output**:
- ✅ Success message with file path
- 📋 Recovery command (for Mode 2 & 3)
- 🎯 Next action

---

## STEP 3: Display Result

Show the output from save-processor.js to the user.

The processor handles:
- Mode detection (based on flags)
- Parameter parsing (--checkpoint, --milestone, --phase, --status, etc.)
- Git context collection (branch, commit, status, date, time)
- Content generation (3 different templates)
- File creation (with proper naming and location)
- Recovery command generation

---

## USAGE REFERENCE

### Default: Auto-populated Checkpoint Save (When no arguments)
```bash
/save
```
**Behavior**: Automatically analyzes conversation context and populates Mode 3 parameters
**Output file**: `checkpoint-{slug}-YYYYMMDD-HHMMSS.md` (in context directory)

**Example auto-populated command**:
```bash
# User types: /save
# System auto-populates to:
/save --checkpoint "Phase 4 Day 1-2 Complete" \
  --phase "backend-implementation" \
  --status "day-2-complete" \
  --files "Day 1: 2,861 lines (2 specialists, 40 patterns). Day 2: 1,737 lines (3 specialists, 45 patterns)" \
  --next-action "Create Day 3 files: Repository Layer (Graph/Vector Repos, SQL/Cache Repos, 35 patterns)" \
  --recovery-time "10" \
  --links "phase-4/day-1/PLAN.md,phase-4/day-2/PLAN.md,phase-4/PHASE_4_OVERVIEW.md"
```

### Mode 1: Quick Save (Backward Compatible)
```bash
/save "Quick progress note"
```
**Output file**: `YYYYMMDD-session.md`

### Mode 2: Milestone Save (Structured)
```bash
/save --milestone "Batch 1 Complete" \
  --completed "3 files converted" \
  --learnings "Playbook validated" \
  --next "Start Batch 2, File 2.1"
```
**Output file**: `YYYYMMDD-milestone-{slug}.md`

**Parameters**:
- `--milestone`: Title (required)
- `--completed`: What was done (optional)
- `--learnings`: Key insights (optional)
- `--next`: Next action (required)

### Mode 3: Checkpoint Save (Comprehensive)
```bash
/save --checkpoint "Planning Complete" \
  --phase "documentation" \
  --status "ready-for-conversion" \
  --files "4 documents created" \
  --next-action "Start Batch 1, File 1.1" \
  --recovery-time "15 minutes" \
  --links "file1.md,file2.md"
```
**Output file**: `checkpoint-{slug}-YYYYMMDD-HHMMSS.md` (in context directory)

**Parameters**:
- `--checkpoint`: Title (required)
- `--phase`: Current phase (required)
- `--status`: Current status (required)
- `--files`: What was created/modified (optional)
- `--next-action`: Exact next command (required)
- `--recovery-time`: Recovery estimate in minutes (optional, default: 15)
- `--links`: Related files, comma-separated (optional)

---

## BENEFITS SUMMARY

**Default Mode (Auto-populated Checkpoint)** - NEW:
- ✅ Zero effort: Just type `/save` with no arguments
- ✅ Intelligent context analysis from conversation
- ✅ Auto-detects: checkpoint title, phase, status, files, next action, links
- ✅ Comprehensive recovery guide with decision tree
- ✅ 50% faster recovery (10 min vs 30 min with full context)
- ✅ Always uses best practice (Mode 3)

**Mode 1 (Quick)**:
- ✅ Familiar workflow (no change from current)
- ✅ Fast for incremental notes
- ✅ Use when: Simple progress note needed

**Mode 2 (Milestone)**:
- ✅ Structured progress tracking
- ✅ Recovery instructions included
- ✅ Searchable by milestone name
- ✅ Use when: Marking significant milestones with custom notes

**Mode 3 (Checkpoint) - Manual**:
- ✅ Full control over all parameters
- ✅ Custom checkpoint titles and metadata
- ✅ Copy-paste commands for resumption
- ✅ Troubleshooting section
- ✅ Use when: Need custom parameters or special checkpoint types

---

## MEMORY BANK RULES

### Location Policy

**CRITICAL**: Memory-bank MUST be at repository root:
- ✅ **Correct**: `[ROOT]/.claude/memory-bank/[branch]/`
- ❌ **Wrong**: `packages/*/.claude/memory-bank/`

In monorepos: ONE memory-bank at root serves entire project.

### Context Directory Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│           CONTEXT INITIALIZATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│  /research --input REQ-XXX.md --type new                       │
│       ↓                                                         │
│  state-manager.js init (AUTOMATIC)                              │
│       ↓                                                         │
│  Creates: .claude/memory-bank/{branch}/{FEATURE-ID}-{dev}/     │
│       ├── context.md      (metadata, state tracking)           │
│       ├── evidence.md     (research findings)                  │
│       └── documents/      (generated docs)                      │
│       ↓                                                         │
│  /save (ADD files to existing context)                          │
│       ├── session-YYYY-MM-DD.md                                 │
│       ├── checkpoint-*.md                                       │
│       └── milestone-*.md                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Folder Naming Convention

| Component | Format | Example |
|-----------|--------|---------|
| Branch folder | `{git-branch}/` | `feature/eps-enhancement/` |
| Context folder | `{FEATURE-ID}-{developer}/` | `ARCH-LAYER-DOC-cuong/` |
| Session file | `session-YYYY-MM-DD.md` | `session-2026-02-15.md` |
| Checkpoint | `checkpoint-{slug}-YYYYMMDD-HHMMSS.md` | `checkpoint-phase-1-complete-20260215-143022.md` |

### FEATURE-ID Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature development | `{MODULE}-{FEATURE}` | `USR-AUTH`, `SFA-OPPORTUNITY` |
| Infrastructure/EPS | `{CATEGORY}-{TASK}` | `EPS-ENHANCEMENT`, `RAG-MIGRATION` |
| Documentation | `{DOC-TYPE}-{SCOPE}` | `ARCH-DOCS`, `API-SPEC` |
| Bugfix | `BUG-{ID}` or `FIX-{DESC}` | `BUG-123`, `FIX-LOGIN-TIMEOUT` |
| Ad-hoc/Research | `{VERB}-{SUBJECT}` | `ANALYZE-PERF`, `EXPLORE-AUTH` |

**Rules**: UPPERCASE with hyphens, max 20 chars, no spaces/special chars.

### Required Files in Context

| File | Created By | Required |
|------|------------|----------|
| `context.md` | `state-manager.js init` | ✅ YES |
| `evidence.md` | `state-manager.js init` | ✅ YES |
| `session-*.md` | `/save` | Optional |
| `checkpoint-*.md` | `/save --checkpoint` | Optional |
| `innovate-*-selection.md` | `/innovate` | Created during workflow |

---

## EXECUTION INSTRUCTIONS

Execute the following steps using available tools:

### Step 2.1: Get repository root
Use Bash tool:
```bash
git rev-parse --show-toplevel
```
Store result as `ROOT_PATH`.

### Step 2.2: Execute save processor
Use Bash tool with full path:
```bash
node [ROOT_PATH]/core/memory/save-processor.js $ARGUMENTS
```

Replace `[ROOT_PATH]` with result from Step 2.1.
Replace `$ARGUMENTS` with the actual arguments user provided.

### Step 2.3: Display output
Show the complete output from save-processor.js to user.

The output will include:
- ✅ Success confirmation
- 📁 File path created
- 📋 Recovery command (Mode 2 & 3)
- 🎯 Next action

---

## FALLBACK (if save-processor.js not found)

If Step 2.2 fails with "No such file":

1. Create basic Mode 1 save manually
2. Use Write tool to create file at:
   ```
   [ROOT_PATH]/.claude/memory-bank/[branch]/[YYYYMMDD]-session.md
   ```
3. Content template:
   ```markdown
   ## Context Information
   - **Date**: [current date]
   - **Time**: [current time]
   - **Branch**: [current branch]
   - **Latest Commit**: [git log -1 --oneline]

   ## Memory Content
   [user's message from $ARGUMENTS]
   ```

---

**Important**: ALWAYS use Bash tool for execution, NOT inline bash in markdown.
