---
description: Enter PLAN mode to create implementation plan (Multi-Model with 3 Plans)
---

# PLAN Command - Multi-Model Planning System (Router)

## 🚨 EXECUTION CONSTRAINTS (MANDATORY — NO EXCEPTIONS)

```
╔══════════════════════════════════════════════════════════════════╗
║  1. TUYỆT ĐỐI KHÔNG DÙNG Agent tool / Task tool               ║
║     - Mọi bước đều chạy INLINE trong conversation hiện tại     ║
║     - KHÔNG delegate cho subagent, background agent, hay task   ║
║                                                                  ║
║  2. TUYỆT ĐỐI KHÔNG CHẠY PARALLEL                             ║
║     - Mọi bước chạy TUẦN TỰ, từng bước một                    ║
║     - KHÔNG launch multiple agents/tasks đồng thời             ║
║     - KHÔNG dùng run_in_background                              ║
║                                                                  ║
║  3. BẮT BUỘC CHẠY TUẦN TỰ                                     ║
║     - Step 0 → Step 0.5 → Route → micro-command chain          ║
║     - Mỗi sub-plan generate xong, WRITE xong, rồi mới tiếp    ║
║     - KHÔNG batch, KHÔNG skip, KHÔNG defer                      ║
╚══════════════════════════════════════════════════════════════════╝
```

**VIOLATIONS**: If you use Agent tool, Task tool, or parallel execution → STOP immediately and restart the step INLINE.

---

## Architecture: Thin Router + Micro-Commands

This file is a **thin router** (~200 lines). It detects the task type and dispatches to the appropriate micro-command file, which is loaded via the **Read tool** on demand.

```
plan.md (this router)
  → Phase 1: Dispatch to micro-command chain
    → Step 0: Parse persona flags
    → Step 0.5: Detect taskType
    → Route:
      Feature:     feature-workflow → context-loading → document-loading → generation → save-and-display → RETURN
      Bugfix:      bugfix → save-and-display → RETURN
      Lightweight: lightweight → context-loading → generation → save-and-display → RETURN
  → Phase 2: Auto-chain /plan-review (router controls)
```

**CHAIN CONTROL**: Micro-commands RETURN control to this router after save-and-display completes.
Router then auto-chains to `/plan-review`. User does NOT need to manually run `/plan-review`.

**ENFORCEMENT**: workflow-gate hook blocks `/execute` if state is not `PLAN_REVIEWED`.

**Reference documentation** (NEVER auto-loaded): `commands/plan/reference-v25.md` — Plan v2.5 output format, error messages, confidence engine spec.

---

## Step 0: Parse Persona Flags (Week 12 - Optional)

Extract --persona flags from command arguments:

```javascript
// Parse command args for --persona flags
const args = process.argv.slice(2);
const personas = [];

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--persona' && args[i + 1]) {
        personas.push(args[i + 1]);
        i++; // Skip next arg (persona name)
    }
}

// Valid persona names
const validPersonas = ['architect', 'security', 'frontend', 'backend', 'database', 'devops', 'testing', 'documentation', 'performance'];

// Validate personas
const invalidPersonas = personas.filter(p => !validPersonas.includes(p));
if (invalidPersonas.length > 0) {
    console.error(`❌ Invalid persona(s): ${invalidPersonas.join(', ')}`);
    console.error(`   Valid personas: ${validPersonas.join(', ')}`);
    process.exit(1);
}

// Display selected personas
if (personas.length > 0) {
    console.log(`🎭 Selected Personas: ${personas.join(', ')}`);
    const PersonaManager = require('./core/mcp/persona-manager.js');
    const pm = new PersonaManager();
    const modifiers = pm.getConfidenceModifiers(personas);
    console.log(`   Confidence Adjustments: KB +${modifiers.kb}%, Agent +${modifiers.agent}%, Plan +${modifiers.plan}%`);
    console.log(`   Plan Threshold: ${90 + modifiers.plan}% (default: 90%)\n`);
} else {
    console.log(`ℹ️  No personas selected (default behavior, 90% threshold)\n`);
}
```

**If invalid persona**: Display error and stop.
**If valid**: Continue to Step 0.5 with personas array.

---

## Step 0.5: Detect Task Type (Feature vs Bugfix vs Lightweight)

Determine routing based on task type from context:

```javascript
const sm = require('./core/state/state-manager.js');
const fs = require('fs');

const ctx = sm.findActiveContext();
let taskType = 'new'; // v7.0: default is 'new'

if (ctx) {
  const contextFile = `${ctx}/context.md`;
  if (fs.existsSync(contextFile)) {
    const content = fs.readFileSync(contextFile, 'utf8');
    const match = content.match(/Task Type:\s*(\w+)/i);
    if (match) {
      taskType = match[1].toLowerCase();
    }
  }
}

// v7.0: Backward compat mapping
if (['infrastructure', 'refactor'].includes(taskType)) {
  console.log(`⚠️ Task type '${taskType}' deprecated. Mapped to 'enhancement'.`);
  taskType = 'enhancement';
}
if (taskType === 'feature') taskType = 'new';

console.log(`📋 Detected Task Type: ${taskType}`);

if (taskType === 'bugfix') {
  console.log('🐛 Bugfix mode');
  console.log('   Root cause analysis → fix plan → execute → test');
  // Continue to Step 1B (Bugfix Plan)
} else if (taskType === 'enhancement') {
  console.log('🔧 Enhancement mode');
  console.log('   Delta workflow — evidence + innovate decisions');
  // Continue to Step 1C (Enhancement Plan)
} else {
  console.log('✨ New feature mode — full workflow');
  // Continue to Step 1 (normal validation)
}
```

---

## Step 0.6: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Validates current state allows plan generation
- Expected: DESIGN completed (SRS + BD at minimum)
- If FAIL: STOP — display missing prerequisites
- If PASS: Continue to Step 0.7

---

## Step 0.7: Quality Gate D4

Invoke the **quality-gate-check** skill with gate D4 (Plan Approval):
- Criteria: All required design documents exist and are validated
- For feature tasks: SRS + BD required, DD optional
- For lightweight/infrastructure tasks: Evidence.md sufficient (soft gate)
- If FAIL (feature): STOP — display missing documents
- If FAIL (lightweight): WARN — continue with evidence only
- If PASS: Continue to routing

---

## Routing Table: Dispatch to Micro-Command

Based on `taskType` detected above, use the **Read tool** to load the appropriate workflow file and follow its instructions completely.

### Route 1: Feature (default)

**Condition**: `taskType === 'feature'` or any unrecognized type

**Load**: `commands/plan/feature-workflow.md`

**Chain**: feature-workflow → context-loading → document-loading → generation → save-and-display

**Context loaded**: ~1,470 lines (incrementally, only what's needed per step)

---

### Route 2: Bugfix

**Condition**: `taskType === 'bugfix'`

**Load**: `commands/plan/bugfix.md`

**Chain**: bugfix → save-and-display

**Context loaded**: ~430 lines (76% reduction vs monolithic)

---

### Route 3: Enhancement

**Condition**: `taskType === 'enhancement'`

**Load**: `commands/plan/enhancement.md`

**Chain**: enhancement → context-loading → generation → save-and-display

**Context loaded**: ~1,190 lines (34% reduction vs monolithic)

---

## Micro-Command File Index

| File | Steps | Lines | Purpose |
|------|-------|-------|---------|
| `plan/feature-workflow.md` | 1-2 | ~40 | State validation + Quality Gate D4 |
| `plan/bugfix.md` | 1B | ~120 | Evidence-based bugfix plan |
| `plan/enhancement.md` | 1C | ~65 | Enhancement delta workflow |
| `plan/context-loading.md` | 2.5-2.10 | ~500 | RAG, patterns, evidence, DD mode, specialists, arch |
| `plan/document-loading.md` | 3 | ~220 | Mode-aware design doc loading |
| `plan/generation.md` | 4+4.5 | ~330 | Plan generation (INLINE) + auto-split |
| `plan/save-and-display.md` | 5-7 | ~130 | Save, state update, AUTO plan-review |
| `plan/reference-v25.md` | — | ~220 | Reference only (NEVER auto-loaded) |

---

## Phase 1: Dispatch to Micro-Command Chain

**NOW**: Based on the taskType detected in Step 0.5:

1. Use the **Read tool** to load the appropriate micro-command file
2. Follow its instructions completely until the micro-command returns control
3. After micro-command chain completes (save-and-display.md returns), continue to Phase 2 below

```
if taskType === 'bugfix':
    → Read commands/plan/bugfix.md
elif taskType === 'enhancement':
    → Read commands/plan/enhancement.md
else:
    → Read commands/plan/feature-workflow.md
```

---

## Phase 2: Auto-Chain Pipeline (ALL ENFORCED BY HOOK)

> **Note**: The entire pipeline below is enforced by `PostToolUse` hook (`guards/hooks/auto-chain.js`).
> Each step auto-chains to the next. No router instruction needed.

```
/plan → PLAN_CREATED
  → auto-chain → /plan-review
    → score >= 95%: PLAN_REVIEWED → auto-chain → /execute
    → score < 95%: auto-chain → /plan-optimize → /plan-review (max 3 loops)
      → after max loops without 95%: STOP, user must fix manually
```

**ENFORCEMENT**: PostToolUse hook manages the full chain. workflow-gate blocks invalid transitions.
