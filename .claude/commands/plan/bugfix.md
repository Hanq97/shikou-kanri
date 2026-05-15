# plan/bugfix.md — Step 1B: Bugfix Plan Workflow

## Step 1B: Bugfix Plan Workflow (Alternative)

**ONLY for bugfix tasks** (when Step 0.5 detected taskType === 'bugfix').

This step replaces Steps 1-4 for bugfix scenarios.

### 1B.1: Load Evidence (Required)

```javascript
const fs = require('fs');
const sm = require('./core/state/state-manager.js');

const ctx = sm.findActiveContext();
const evidenceFile = `${ctx}/evidence.md`;

if (!fs.existsSync(evidenceFile)) {
  console.error('❌ ERROR: No evidence.md found');
  console.error('   Run /research --type bugfix first');
  process.exit(1);
}

const evidence = fs.readFileSync(evidenceFile, 'utf8');
console.log('✅ Evidence loaded');
console.log(`   - ${evidence.split('\n').length} lines`);

// Extract key sections
const rootCause = evidence.match(/Root Cause[^#]*?([\s\S]*?)(?=##|$)/i);
const proposedFix = evidence.match(/Proposed Fix[^#]*?([\s\S]*?)(?=##|$)/i);
const filesAffected = evidence.match(/Files to Modify[^#]*?([\s\S]*?)(?=##|$)/i);

console.log('');
console.log('Key sections found:');
console.log(`   - Root Cause: ${rootCause ? 'YES' : 'NO'}`);
console.log(`   - Proposed Fix: ${proposedFix ? 'YES' : 'NO'}`);
console.log(`   - Files Affected: ${filesAffected ? 'YES' : 'NO'}`);
```

### 1B.2: Load Specialist Context for Bugfix

Load code specialists relevant to the bug area:

```bash
# Load specialist list
node core/cli/ops.js specialist-load --type code --list
BUGFIX_SPECS=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  console.log(JSON.stringify({ count: d.count||0, stackKey: d.stackKey||'unknown' }));
")
echo "📦 Bugfix specialist context: $BUGFIX_SPECS"
```

**Note**: During plan generation, load the specific specialist matching the bug area (e.g., java-r2dbc-specialist for database bugs, java-webflux-specialist for API bugs).

### 1B.2.5: Load Innovate Selection (Optional)

```javascript
const innovateFile = `${ctx}/innovate-selection.md`;

let innovateContent = '';
if (fs.existsSync(innovateFile)) {
  innovateContent = fs.readFileSync(innovateFile, 'utf8');
  console.log('✅ Innovate selection loaded');
} else {
  console.log('ℹ️  No innovate-selection.md - will use evidence only');
}
```

### 1B.3: Generate Bugfix Implementation Plan

Based on evidence.md (and optionally innovate-selection.md), generate a focused implementation plan:

**Bugfix Plan Template**:
```markdown
# Bugfix Implementation Plan: [Bug ID]

> **Bug**: [Bug Title from evidence]
> **Created**: YYYY-MM-DD HH:MM:SS
> **Based On**: evidence.md
> **Root Cause**: [Summary from evidence]
> **Estimated Effort**: X hours

## 1. Root Cause Summary

[Copy from evidence.md Root Cause section]

## 2. Proposed Fix

[Copy from evidence.md Proposed Fix section]

## 3. Implementation Steps

### Step 1: [First change]
**File**: `path/to/file.cs`
**Method**: `MethodName()`
**Change**: [Description of change]
**Rationale**: [Why this change fixes the bug]

### Step 2: [Second change]
...

## 4. Testing Requirements

- [ ] Unit test for fixed scenario
- [ ] Regression test for related functionality
- [ ] Manual test for reported bug

## 5. Potential Side Effects

[From evidence.md Side Effects section]

## 6. Rollback Plan

If fix causes issues:
1. Revert commit: `git revert [commit-hash]`
2. Re-analyze root cause
```

**IMPORTANT**:
- ✅ Base ALL steps directly on evidence.md analysis
- ✅ Include ONLY files identified in evidence
- ✅ Reference root cause analysis
- ❌ NO new features or improvements
- ❌ NO files not in evidence
- ❌ NO assumptions - only what's proven in evidence

After generating bugfix plan, proceed to save.

---

**NEXT**: Use the **Read tool** to load `commands/plan/save-and-display.md` and follow its instructions completely.

After completing, control returns to the router for auto-chain.

<!-- Next: plan/save-and-display.md → RETURN to plan.md -->
