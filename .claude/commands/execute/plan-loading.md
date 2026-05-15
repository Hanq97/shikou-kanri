# execute/plan-loading.md — Steps 1-1.5: Load Plan, Boundaries, Checkpoint Restore

Handles BOTH monolithic and multi-sub-plan structures.

---

## Step 1: Load Plan & Detect Structure

```bash
CONTEXT_DIR=$(node -e "
  const sm = require('./core/state/state-manager.js');
  console.log(sm.findActiveContext() || '');
")

PLAN_FILE="$CONTEXT_DIR/implementation-plan.md"

# Also check plans/ subdirectory (newer convention)
if [ ! -f "$PLAN_FILE" ]; then
  PLAN_FILE=$(ls -t "$CONTEXT_DIR"/plans/*-implementation-plan.md 2>/dev/null | head -1)
fi

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
  echo "❌ ERROR: No implementation plan found"
  echo "   Run /plan first to create implementation plan"
  exit 1
fi

# Content-based plan structure detection
PLAN_STRUCTURE=$(node -e "
  const fs = require('fs');
  const content = fs.readFileSync('$PLAN_FILE', 'utf8');
  if (content.includes('planStructure: multi-sub-plan')) {
    console.log('multi-sub-plan');
  } else {
    console.log('monolithic');
  }
")
echo "📋 Plan structure: $PLAN_STRUCTURE"
```

---

## Step 1.1: Multi-Sub-Plan — Resolve Current SP

**Skip if monolithic.** Only applies when `PLAN_STRUCTURE == "multi-sub-plan"`.

```javascript
// Import from shared module — single source of truth (blank-line tolerant, 5-col + 7-col)
const { parseSPRegistry } = require('./core/plan/auto-split.js');
```

### V2 Execution State (V1 backward compatible)

```javascript
// V1/V2 detection
function loadExecutionState(stateFilePath) {
  if (!fs.existsSync(stateFilePath)) return null;
  const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));

  if (!state.planStructure) {
    state._detectedVersion = "v1";
    state.planStructure = "monolithic";
  } else if (state.planStructure === "multi-sub-plan") {
    state._detectedVersion = "v2";
  }
  return state;
}

// V2 state creation (NEW multi-sub-plan executions only)
function createV2ExecutionState(registry, feature) {
  return {
    startedAt: new Date().toISOString(),
    planStructure: "multi-sub-plan",
    masterPlan: `${feature}-implementation-plan.md`,
    currentSubPlan: registry[0].spId,
    subPlanProgress: Object.fromEntries(
      registry.map(sp => [sp.spId, {
        status: sp.spId === registry[0].spId ? "in_progress" : "pending",
        file: `SP-${sp.spId.split("-")[1]}-${sp.title.replace(/ \+ /g, "-")}.md`,
        totalSteps: 0, completedSteps: 0, steps: []
      }])
    ),
    lastCompletedStep: 0,
    updatedAt: new Date().toISOString()
  };
}

function getNextSPInOrder(registry, currentSpId) {
  const idx = registry.findIndex(sp => sp.spId === currentSpId);
  if (idx >= 0 && idx + 1 < registry.length) return registry[idx + 1].spId;
  return null;
}
```

**CRITICAL**: V1 states are NEVER migrated to V2. `_detectedVersion` is runtime-only.

### Resolve Current Sub-Plan

```pseudo
if PLAN_STRUCTURE == "multi-sub-plan":
  plan_content = readFile(PLAN_FILE)
  sub_plan_registry = parseSPRegistry(plan_content)

  executionState = loadExecutionState(stateFilePath)
  if NOT executionState:
    executionState = createV2ExecutionState(sub_plan_registry, feature)
    saveExecutionState(stateFilePath, executionState)

  currentSP = executionState.currentSubPlan
  display("▶️ Current sub-plan: " + currentSP)

  # Find and load current sub-plan file
  plans_dir = path.dirname(PLAN_FILE)
  spNumber = currentSP.split("-")[1]
  spFile = find(plans_dir + "/SP-" + spNumber + "-*.md")

  if NOT spFile:
    warn("SP file not found for " + currentSP + ", falling back to monolithic")
    PLAN_STRUCTURE = "monolithic"
  else:
    # OVERRIDE: step-runner will use SP file instead of master plan
    ACTIVE_PLAN_FILE = spFile
    spContent = readFile(spFile)
    display("📄 Loaded: " + basename(spFile) + " (" + lineCount + " lines)")

if PLAN_STRUCTURE == "monolithic":
  ACTIVE_PLAN_FILE = PLAN_FILE
```

**Output**: `ACTIVE_PLAN_FILE` — the plan file that step-runner.md will use for boundaries and steps.

---

## Step 1.2: Load Boundaries

```bash
# Load plan boundaries using CommandOrchestrator
# Use ACTIVE_PLAN_FILE (may be master plan or current SP file)
node -e "
  const { CommandOrchestrator } = require('./core/lib/command-orchestrator.js');
  const orchestrator = new CommandOrchestrator({ strictMode: true });
  const boundaries = orchestrator.loadPlanBoundaries('ACTIVE_PLAN_FILE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 PLAN BOUNDARIES LOADED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Allowed Files (' + boundaries.allowedFiles.length + '):');
  boundaries.allowedFiles.forEach(f => console.log('  ✅ ' + f));
  console.log('Allowed Methods (' + boundaries.allowedMethods.length + '):');
  boundaries.allowedMethods.forEach(m => console.log('  ✅ ' + m));
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚠️  ANY MODIFICATION OUTSIDE THESE BOUNDARIES WILL BE REJECTED');
  console.log('═══════════════════════════════════════════════════════════════');
"
```

### Deviation Handling

If you encounter a situation where:
1. You need to modify a file NOT in the plan
2. You need to add code NOT specified in the plan
3. You discover a missing dependency

**DO NOT proceed automatically.** Instead:

```
⚠️ DEVIATION DETECTED

Current action: [describe what you want to do]
Plan boundary: [what the plan allows]
Deviation: [describe the mismatch]

Options:
1. Stop and update plan first (/plan --update)
2. Skip this step and continue
3. Proceed anyway (NOT RECOMMENDED)

Please confirm before proceeding...
```

---

## Step 1.5: RAG Context Loading

Load graph context for execution via HippoRAG (non-blocking on failure):

```pseudo
# HippoRAG integration — replaces dead CodeIndexer/StalenessChecker
HippoRAGService.getInstance('execute', 'dev')
rag.generateReport() → node/edge counts

# Non-blocking: if RAG unavailable, continue without graph context
# Graph context will be loaded per-step via design-context --type execute
```

---

## Checkpoint Restore (Resume Support)

ALWAYS check for existing checkpoint before starting. If found, skip completed steps:

```bash
node -e "
  const fs = require('fs');
  const path = require('path');
  const sm = require('./core/state/state-manager.js');

  const CTX = sm.findActiveContext();
  if (!CTX) {
    console.log('No active context found. Starting from step 1.');
    process.exit(0);
  }

  const file = path.join(CTX, 'execution-checkpoints', 'execution-state.json');

  if (!fs.existsSync(file)) {
    console.log('No checkpoint found. Starting from step 1.');
    console.log('Context: ' + CTX);
    process.exit(0);
  }

  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const completed = state.steps.filter(s => s.status === 'completed');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('EXECUTION CHECKPOINT FOUND');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Context:         ' + CTX);
  console.log('Started at:      ' + state.startedAt);
  console.log('Completed steps: ' + completed.length);
  console.log('Last completed:  Step ' + state.lastCompletedStep);
  console.log('RESUME FROM:     Step ' + (state.lastCompletedStep + 1));

  if (completed.length > 0) {
    completed.forEach(s => console.log('  Done: Step ' + s.step + ' - ' + s.summary));
  }
  console.log('═══════════════════════════════════════════════════════════════');
"
```

## Save Checkpoint Helper (Run AFTER Each Step Completes)

```bash
node -e "
  const fs = require('fs');
  const path = require('path');
  const sm = require('./core/state/state-manager.js');
  const STEP = process.argv[1];
  const STATUS = process.argv[2];
  const SUMMARY = process.argv[3] || '';

  const CTX = sm.findActiveContext();
  if (!CTX) {
    console.error('ERROR: No active context found. Cannot save checkpoint.');
    process.exit(1);
  }

  if (!CTX.includes('.claude/memory-bank')) {
    console.error('ERROR: Invalid context path: ' + CTX);
    process.exit(1);
  }

  const dir = path.join(CTX, 'execution-checkpoints');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, 'execution-state.json');
  let state = { startedAt: new Date().toISOString(), steps: [], lastCompletedStep: 0 };
  if (fs.existsSync(file)) state = JSON.parse(fs.readFileSync(file, 'utf8'));

  state.steps.push({
    step: parseInt(STEP),
    status: STATUS,
    summary: SUMMARY,
    completedAt: new Date().toISOString()
  });
  state.lastCompletedStep = parseInt(STEP);
  state.updatedAt = new Date().toISOString();

  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  console.log('Checkpoint saved: Step ' + STEP + ' (' + STATUS + ') → ' + CTX);
" -- "STEP_NUMBER" "completed" "Step summary here"
```

---

**NEXT**: Use the **Read tool** to load `commands/execute/step-runner.md` and follow its instructions completely.

<!-- Next: execute/step-runner.md -->
