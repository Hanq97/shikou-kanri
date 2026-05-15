---
description: Enter EXECUTE mode to implement approved plan
---

# EXECUTE Command — Thin Router + Micro-Commands

## EXECUTION CONSTRAINTS (MANDATORY — NO EXCEPTIONS)

```
╔══════════════════════════════════════════════════════════════════╗
║ 1. SEQUENTIAL ONLY — Execute ONE step at a time.                ║
║    NO parallel Task agents. NO background execution.            ║
║ 2. CHECKPOINT REQUIRED — Each step MUST be checkpointed         ║
║    (both design-checkpoint AND execution-state.json)            ║
║    before proceeding to next step.                               ║
║ 3. BOUNDARY ENFORCEMENT — ONLY modify files in plan's           ║
║    allowedFiles. STOP on deviation.                              ║
╚══════════════════════════════════════════════════════════════════╝
```

**VIOLATIONS**: If you use Agent tool, Task tool, or parallel execution → STOP immediately and restart the step INLINE.

---

## Architecture: Thin Router + Micro-Commands

This file is a **thin router** (~200 lines). It dispatches to micro-command files loaded via the **Read tool** on demand.

```
execute.md (this router)
  → Phase 1: Dispatch to micro-command chain
    → execute/pre-gates.md → plan-loading.md → step-runner.md → finalize.md → RETURN
  → Phase 2: Auto-chain /validate (router controls)
  → Phase 3: Auto-chain /test (router controls, human-in-loop)
```

**CHAIN CONTROL**: Micro-commands RETURN control to this router after finalize.md completes.
Router then auto-chains to `/validate` and `/test`. User does NOT need to manually run these.

**ENFORCEMENT**: workflow-gate hook blocks `/validate` if state is not `EXECUTED`.

---

## Micro-Command File Index

| File | Steps | Lines | Purpose |
|------|-------|-------|---------|
| `execute/pre-gates.md` | 0.5-0.8 | ~60 | Stack load, state validation, G0, confidence |
| `execute/plan-loading.md` | 1-1.5 | ~170 | Plan, boundaries, multi-sub-plan resolve, checkpoint restore |
| `execute/step-runner.md` | 2-4 | ~170 | Init enforcement, per-step loop, SP advance |
| `execute/finalize.md` | 5-6 | ~80 | Feedback, verify-all, state → EXECUTED, RETURN |

---

## Phase 1: Dispatch to Micro-Command Chain

**NOW**: Use the **Read tool** to load `commands/execute/pre-gates.md` and follow its instructions completely.

The chain will proceed:
```
pre-gates.md → plan-loading.md → step-runner.md → finalize.md → RETURN here
```

After the micro-command chain completes (finalize.md RETURNS), continue to Phase 2 below.

---

## Phase 2: Auto-Chain — Validate (ENFORCED BY HOOK)

> **Note**: This phase is enforced by `PostToolUse` hook (`guards/hooks/auto-chain.js`).
> The hook fires after this Skill completes and injects `additionalContext` instructing
> Claude to execute `/validate` immediately. No router instruction needed.

After `/validate` completes and RETURNS:
- If score >= 90%: State = `VALIDATED`. Continue to Phase 3.
- If score < 90%: Display violations. Ask user:
  1. Auto-fix violations (recommended) → re-validate
  2. Fix specific files only → re-validate
  3. Skip fix, proceed to Phase 3
  4. Stop pipeline (state stays `EXECUTED`)

**ENFORCEMENT**: PostToolUse hook auto-chains `/validate`. workflow-gate hook blocks `/test` if state is not `VALIDATED`.

---

## Phase 3: Auto-Chain — Test (Human-in-Loop)

**PREREQUISITE**: Phase 2 completed, state = `VALIDATED`.

**ACTION**: Ask user whether to run `/test`.

Display:
```
═══════════════════════════════════════════════════════════════
✅ Validation complete.
═══════════════════════════════════════════════════════════════

Chay /test de kiem tra tu dong?
  1. Co — chay /test ngay (recommended)
  2. Khong — dung tai day, chay /test sau khi san sang
═══════════════════════════════════════════════════════════════
```

**Wait for user input.**

- If user chon 1: Use Skill tool to invoke `test`. After completion, state = `TESTED`. Pipeline complete.
- If user chon 2: Display "Run /test khi san sang." Pipeline ends at `VALIDATED`.

---

## Auto-Chain Flow Diagram

```
/execute
    │
    ├── Phase 1: Micro-command chain
    │     pre-gates → plan-loading → step-runner → finalize → RETURN
    │     State: EXECUTED
    │
    ▼
    Phase 2: /validate (auto, mandatory)
    │
    ├── Score >= 90% → State: VALIDATED
    │       │
    │       ▼
    │   Phase 3: Confirm /test? (Y/n)
    │       │
    │       ├── Y → /test → State: TESTED
    │       └── n → Pipeline ends at VALIDATED
    │
    ├── Score < 90% → Show violations
    │       │
    │       ▼
    │   User fix → Re-validate → State: VALIDATED → Phase 3
    │
    └── User stops → State: EXECUTED
```

### Key Rules

| Rule | Description |
|------|-------------|
| **Router controls chain** | Only this router invokes /validate and /test — micro-commands do NOT |
| **Auto-chain is DEFAULT** | Pipeline always continues unless user explicitly stops |
| **Human-in-loop for test** | User MUST confirm before /test runs |
| **Re-validate after fix** | Fixed code is validated again before proceeding to test |
| **Single conversation** | Entire pipeline runs in ONE conversation — no context loss |

---

## Execute Implementation Summary

The router operates in EXECUTE sub-mode:
1. **Phase 1**: Dispatch micro-command chain (pre-gates → plan-loading → step-runner → finalize)
2. **Phase 2**: Auto-chain `/validate` (mandatory, router-controlled)
3. **Phase 3**: Auto-chain `/test` (human-in-loop, router-controlled)

**STRICT MODE**:
- ✅ Execute ONLY what is in the plan
- ✅ Validate each file against `allowedFiles` before editing
- ✅ Checkpoint each step with dual-layer enforcement
- ✅ Load specialist + graph context per step
- ✅ Stop and ask user if deviation detected
- ✅ Auto-chain to /validate and /test after execution completes (router controls)
- ❌ NO improvisation or "bonus improvements"
- ❌ NO modifications to files outside plan
- ❌ NO new methods unless explicitly in plan
- ❌ NO parallel Task agents or background execution

Remember: NO deviations from the approved plan are allowed.
