---
description: Create design documents (SRS, Basic Design, Detail Design with API Contracts, Test Plan)
---

# DESIGN Command Router v3.0

Create structured design documents following documentation-first development.

## Command Syntax

```bash
/design --srs       # Create Software Requirements Specification
/design --basic     # Create Basic Design document
/design --detail    # Create Detail Design + API Contracts
/design --test      # Create Test Plan document
```

**Required**: One option (--srs, --basic, --detail, --test)

---

## Step 1: Parse Option

Extract the option from arguments:

```
$ARGUMENTS
```

**Valid options**: `--srs`, `--basic`, `--detail`, `--test`

**If invalid or missing**: Display usage error (see Error Messages below) and stop.

---

## Step 2: Validate State Transition

Based on option, validate state:

| Option | Expected State | Next State | Gate |
|--------|----------------|------------|------|
| `--srs` | INNOVATE_SRS | SRS_CREATED | D1 |
| `--basic` | INNOVATE_BD | BD_CREATED | D2 |
| `--detail` | INNOVATE_DD_APPROVED | DD_CREATED | D3 + G0 |
| `--test` | Any (SRS exists) | - | - |

```bash
node core/state/state-manager.js validate design-[option]
```

**Note**: For `--detail`, the state must be `INNOVATE_DD_APPROVED` (not just `INNOVATE_DD`).
Use `node guards/gates/approve-innovate-dd.js` to transition from INNOVATE_DD to INNOVATE_DD_APPROVED.

**If validation fails**: Display state error (see Error Messages below) and stop.

---

## Step 3: Check Quality Gates

**For `--srs` (Gate D1)**:
```bash
node core/validate/quality-gates.js check D1
```
- Evidence ≥ 3 pieces
- Average quality ≥ 80%

**For `--basic` (Gate D2)**:
```bash
node core/validate/quality-gates.js check D2
```
- SRS document exists and approved
- Evidence ≥ 3 pieces, quality ≥ 80%

**For `--detail` (Gate D3)**:
```bash
node core/validate/quality-gates.js check D3
```
- Basic Design exists and approved
- Evidence ≥ 3 pieces, quality ≥ 80%

**For `--test`**: Check SRS dependency only (no quality gate)

**If gate fails**: Display gate error (see Error Messages below) and stop.

---

## Step 4: Route to Micro-Command

Based on the parsed option, use the **Read tool** to load the corresponding workflow file and follow its instructions completely:

| Option | Workflow File | Description |
|--------|--------------|-------------|
| `--srs` | `commands/design/srs.md` | SRS generation (agent-based, JIT loading) |
| `--basic` | `commands/design/basic.md` | Basic Design (7 micro-agents, C0-C6 checkpoints) |
| `--detail` | `commands/design/detail.md` | Detail Design + API Contracts (G0 gate, FDD/BDD agents) |
| `--test` | `commands/design/test.md` | Test Plan (9 micro-agents, risk-based) |

**IMPORTANT**: Load the file using the Read tool, then execute the entire workflow defined in that file. The micro-command is self-contained — it handles Stack Context Loading, BASE Necessity checks, document generation, and Post-Workflow updates internally.

**For --srs, --basic, --test**: The loaded workflow file contains all remaining steps. Do NOT return to this router.

**For --detail**: After the micro-command completes, return control to this router for Step 5 (auto-chain design-review).

---

## Step 5: Auto-Chain — Design Review (for --detail only, ENFORCED BY HOOK)

**CONDITION**: Only applies when option is `--detail`. For `--srs`, `--basic`, `--test`: skip this step.

> **Note**: This phase is enforced by `PostToolUse` hook (`guards/hooks/auto-chain.js`).
> The hook fires after `design --detail` Skill completes and injects `additionalContext`
> instructing Claude to execute `/design-review` immediately. No router instruction needed.

After `/design-review` completes:
- If PASS (hard gates + soft score >= 90%): State updated to `DD_REVIEWED`. Display "Next: Run /plan".
- If FAIL: Display violations + suggestions. User fixes and re-runs `/design-review`.

**ENFORCEMENT**: PostToolUse hook auto-chains `/design-review`. workflow-gate hook blocks `/plan` if state is not `DD_REVIEWED`.

---

## Error Messages

**Invalid option**:
```
❌ Invalid option: [option]

Usage:
  /design --srs       Create SRS
  /design --basic     Create Basic Design
  /design --detail    Create Detail Design + API Contracts
  /design --test      Create Test Plan
```

**State validation failed**:
```
❌ Cannot run /design [option]

Current state: [STATE]
Required state: [REQUIRED_STATE]

Run /workflow to see current status.
```

**Quality gate failed**:
```
❌ Quality Gate [GATE] Failed

Requirements:
- Evidence: [current]/3 required
- Quality: [current]%/80% required

Run /research to collect more evidence.
```

---

## State Transitions

| Option | From State | To State |
|--------|------------|----------|
| `--srs` | INNOVATE_SRS | SRS_CREATED |
| `--basic` | INNOVATE_BD | BD_CREATED |
| `--detail` | INNOVATE_DD_APPROVED | DD_CREATED |
| `--test` | - | - (no state change) |

---

## Specialist Agents (Reference)

| Option | Specialist Agent | Micro-Agents Location |
|--------|------------------|----------------------|
| `--srs` | `srs-specialist.md` | `specialists/document/srs/` |
| `--basic` | `basic-design-specialist.md` | `specialists/document/basic-design/` |
| `--detail` | `_orchestrator.md` (FDD v5.0 + BDD v3.0) | `specialists/document/detail-design-frontend/` + `specialists/document/detail-design-backend/` |
| `--test` | `test-plan-specialist.md` | `specialists/document/test-plan/` |

## Document Output Paths

| Option | Output Files |
|--------|--------------|
| `--srs` | `[FEATURE]-[SUB]-srs.md` |
| `--basic` | `[FEATURE]-[SUB]-basic-design.md` |
| `--detail` | `[FEATURE]-[SUB]-frontend-detail-design.md`, `[FEATURE]-[SUB]-backend-detail-design.md`, `[FEATURE]-[SUB]-api-contracts.md` |
| `--test` | `[FEATURE]-[SUB]-test-plan.md` |

**Location**: `documents/features/[FEATURE]-[name]/`

---

## Related Files

| File | Purpose |
|------|---------|
| `core/state/state-manager.js` | State management |
| `core/validate/quality-gates.js` | Gate checking |
| `guards/gates/approve-innovate-dd.js` | INNOVATE_DD → INNOVATE_DD_APPROVED |
| `core/workflow/workflow-executor.js` | Workflow Engine v3.0 |

---
*DESIGN Command Router v3.0*
*Micro-Command Architecture - EPS Framework v4.2*
