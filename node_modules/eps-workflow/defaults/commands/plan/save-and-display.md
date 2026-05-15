# plan/save-and-display.md — Steps 5-6: Save, State Update

After completing Steps 5-6, RETURN control to the calling router (`plan.md`).
The router handles auto-chain to `/plan-review`.

---

## Step 5: Save Implementation Plan

Determine context directory and save plan inside it:

```bash
# Resolve active context directory (e.g., .claude/memory-bank/dev/FEATURE-ID-developer/)
CONTEXT_DIR=$(node -e "
  const sm = require('./core/state/state-manager.js');
  console.log(sm.findActiveContext() || '');
")

if [ -z "$CONTEXT_DIR" ]; then
  echo "❌ ERROR: No active context found. Run /research first."
  exit 1
fi

FEATURE=[feature-name]
PLANS_DIR="$CONTEXT_DIR/plans"
mkdir -p "$PLANS_DIR"

PLAN_PATH="$PLANS_DIR/$FEATURE-implementation-plan.md"
```

Save plan to: `$PLAN_PATH`

**IMPORTANT**: Plans MUST be saved inside the context directory, NOT in a global `plans/` folder.
This ensures each feature's plans are co-located with its evidence, context, and checkpoints.

**Display confirmation**:
```
✅ Implementation plan created: [contextDir]/plans/[feature]-implementation-plan.md

Plan Summary:
- Total steps: N
- Backend steps: N
- Frontend steps: N
- Database steps: N
- Testing steps: N
```

---

## Step 6: Update State

After plan creation completes, update state:

```bash
node core/state/state-manager.js update PLAN_CREATED
```

---

## RETURN

Steps 5-6 complete. Control returns to the calling router (`plan.md`) for auto-chain.

**DO NOT chain to any other command from here.**

<!-- RETURN to plan.md — router handles auto-chain to /plan-review -->
