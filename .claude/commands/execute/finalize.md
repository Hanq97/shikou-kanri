# execute/finalize.md — Steps 5-6: Feedback, Verify All, State Update

After completing Steps 5-6, RETURN control to the calling router (`execute.md`).
The router handles auto-chain to `/validate` and `/test`.

---

## Step 5: Feedback Integration

Emit execution events via the feedback module (correct paths):

```javascript
// FIX [E3]: .claude/utils/feedback → core/feedback
const { EventLogger, getEventBus } = require('./core/feedback/index.js');
const { StalenessChecker } = require('./core/feedback/staleness-checker.js');

// Emit execution events
const eventBus = getEventBus();
eventBus.emit('execute:complete', {
  feature, steps: totalSteps, files: modifiedFiles,
  timestamp: new Date().toISOString()
});

// Check staleness
const staleness = new StalenessChecker();
const staleFiles = staleness.check(modifiedFiles);
if (staleFiles.length > 0) {
  console.log("⚠️ Stale files detected: " + staleFiles.join(', '));
}
```

**Non-blocking**: Feedback logging failures do not interrupt execution.

### Feedback Integration Points

| Point | When | Action |
|-------|------|--------|
| **Start** | `/execute` begins | Initialize `EventLogger` with featureId |
| **Each Step** | Pattern applied | Emit `pattern:used` event via `getEventBus()` |
| **End** | `/execute` completes | Call `feedbackLogger.finalize()` |

---

## Step 6: Verify All + State Update

After all steps complete, verify enforcement and update state:

```pseudo
# ═══════════════════════════════════════════════════════════════
# Verify all checkpoints
# ═══════════════════════════════════════════════════════════════
design-checkpoint --action verify-all --type execute
# → { ok: true/false, total: N, sections: [...] }

# Skill verification
design-checkpoint --action skill-verify --skills "pattern-analyzer" --mode strict

# ═══════════════════════════════════════════════════════════════
# State transition: PLAN_REVIEWED → EXECUTED
# ═══════════════════════════════════════════════════════════════
node core/state/state-manager.js update EXECUTED

# Display summary
log("═══════════════════════════════════════════════════════════════")
log("✅ EXECUTION COMPLETE")
log("═══════════════════════════════════════════════════════════════")
log("  Steps completed: " + totalSteps)
log("  Files modified: " + modifiedFiles.length)
log("  State: EXECUTED")
log("═══════════════════════════════════════════════════════════════")
```

### Post-Workflow: Update Evidence + Context

```pseudo
# Append execution summary to evidence.md
# Update context.md state to EXECUTED
# Save execution report to context directory
```

---

## RETURN

Steps 5-6 complete. Control returns to the calling router (`execute.md`) for auto-chain.

**DO NOT chain to /validate or /test from here.**

<!-- RETURN to execute.md — router handles auto-chain to /validate then /test -->
