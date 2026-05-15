# plan/lightweight.md — Step 1C: Lightweight Plan Workflow

## Step 1C: Lightweight Plan Workflow (Alternative)

**For infrastructure, enhancement, refactor tasks** (when Step 0.5 detected lightweight type).

This step replaces Steps 1-3 for lightweight scenarios. Continues to context-loading → generation → save.

### 1C.1: Load Evidence (Required)

Load evidence.md from active context directory:

```javascript
const fs = require('fs');
const sm = require('./core/state/state-manager.js');

const ctx = sm.findActiveContext();
const evidenceFile = `${ctx}/evidence.md`;

if (!fs.existsSync(evidenceFile)) {
  console.error('❌ ERROR: No evidence.md found');
  console.error('   Run /research first');
  process.exit(1);
}

const evidence = fs.readFileSync(evidenceFile, 'utf8');
console.log('✅ Evidence loaded');
console.log(`   - ${evidence.split('\n').length} lines`);
```

If evidence.md missing → ERROR: run /research first.

### 1C.2: Verify Evidence Contains Innovate Decisions

Evidence.md should contain "## 2. Innovate Decisions" sections (updated by Post-Save steps in /innovate).
If sections §2.1-2.3 are missing, warn user to re-run /innovate for the relevant phase.

```javascript
const ctx = sm.findActiveContext();
const evidence = fs.readFileSync(`${ctx}/evidence.md`, 'utf8');

if (evidence.includes('### 2.1 SRS Decisions') || evidence.includes('### 2.2 Architecture Decisions') || evidence.includes('### 2.3 Technical Decisions')) {
  console.log('✅ Evidence contains innovate decisions (enriched)');
} else {
  console.log('⚠️  Evidence does not contain innovate decision sections');
  console.log('   Consider re-running /innovate to enrich evidence.md');
}
```

### 1C.2.5: Load Minimal Specialist Context (Lightweight)

Even for infrastructure/enhancement plans, load top-3 code specialists to ensure generated code follows project patterns:

```bash
# Get specialist list for keyword matching
node core/cli/ops.js specialist-load --type code --list
SPEC_LIST=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  console.log((d.specialists||[]).join(','));
")

if [ -n "$SPEC_LIST" ]; then
  echo "📦 Available specialists: $(echo $SPEC_LIST | tr ',' '\n' | wc -l) total"
  echo "   Top specialists will be loaded per-step during plan generation"
else
  echo "ℹ️ No code specialists available — continuing without"
fi
```

**Note for context-loading**: When invoked from lightweight workflow, Step 2.9 uses this minimal specialist list for keyword matching. Steps 2.8 and 2.10 remain skipped.

### 1C.3: Continue to Context Loading

Skip Steps 1 (state validation), 2 (quality gate D4), and 3 (design docs).

The plan receives evidence as PRIMARY context (no design docs). Evidence.md contains research findings + innovate decisions inline.

**Note for context-loading**: When invoked from lightweight workflow, Steps 2.8 and 2.10 (DD mode, architecture) should be skipped since there are no design documents. Step 2.9 (specialists) is now loaded via 1C.2.5 above. Steps 2.5 (RAG), 2.6 (patterns), and 2.7 (evidence) apply.

---

**NEXT**: Use the **Read tool** to load `commands/plan/context-loading.md` and follow its instructions completely.

After context-loading completes, skip `document-loading.md` (no design docs for lightweight) and proceed directly to `commands/plan/generation.md`.

<!-- Next: plan/context-loading.md → (skip document-loading.md) → plan/generation.md → plan/save-and-display.md -->
