---
name: quality-gate-check
description: Validates quality gates D1-D4 and G0 before proceeding to next design phase. Use when any EPS phase requires gate approval. Reports gate status, score, and violations.
allowed-tools: Read, Bash, Grep, Glob
---

# Quality Gate Check Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Enforces quality gates that protect EPS workflow phase transitions. Each gate has specific criteria that must be met before proceeding.

## Gate Definitions

| Gate | Name                  | Phase Boundary         | Threshold |
|------|-----------------------|------------------------|-----------|
| `D1` | Evidence Threshold    | Research → Innovate    | >=3 sources, >=80% coverage |
| `D2` | Innovation Score      | Innovate → Design      | >=70 score, >=3 alternatives |
| `D3` | Design Completeness   | Design → Plan          | SRS + BD complete |
| `D4` | Plan Approval         | Plan → Execute         | All steps defined |
| `G0` | Pre-execution Guard   | Before any execution   | Confidence >=90% |

## Validation Command

```bash
# Check a specific gate
node core/cli/ops.js gate-check --gate <GATE_ID>

# Examples:
node core/cli/ops.js gate-check --gate D1
node core/cli/ops.js gate-check --gate G0
```

## Gate Check Logic

For each gate invocation:

1. Read current context (from Input section above)
2. Run gate-check CLI command for specified gate ID
3. Parse output for: status, score, violations
4. Format and report result

### D1 — Evidence Threshold Check

Verify research phase produced sufficient evidence:
- Minimum 3 distinct evidence sources
- Evidence covers >=80% of stated requirements
- Each source has confidence score >=0.7
- Evidence.md exists and is populated

### D2 — Innovation Score Check

Verify innovate phase produced quality alternatives:
- Innovation score >= 70 (plain text format: `Innovation Score: 75`)
- At least 3 alternatives documented
- At least 1 alternative approved
- Rejected alternatives have documented rationale

### D3 — Design Completeness Check

Verify design phase artifacts are complete:
- SRS document exists with FR and NFR sections
- Basic Design document exists with architecture diagrams
- All FR/NFR IDs are unique (no duplicates)
- Bilingual ratio >= 60% (if project requires bilingual)

### D4 — Plan Approval Check

Verify implementation plan is ready:
- Plan document exists with numbered steps
- Each step has acceptance criteria
- Dependencies are identified
- Estimated confidence >= 90%

### G0 — Pre-execution Guard

Verify confidence before any implementation:
- Confidence score >= 90% (from confidence-check assessment)
- No unresolved blocking issues
- Branch state is clean

## When to Use

- After `/research` completes — check D1 before allowing `/innovate`
- After `/innovate` completes — check D2 before allowing `/design`
- After `/design` completes — check D3 before allowing `/plan`
- After `/plan` completes — check D4 before allowing `/execute`
- Before any execution step — check G0

## Output Format

```
Quality Gate Check: {GATE_ID}
==============================
Feature    : {feature-name}
Branch     : {branch}
Gate       : {GATE_ID} — {Gate Name}
Threshold  : {threshold description}

Status: [PASS | FAIL | WARN]
Score : {numeric score if applicable}

Checks:
  [PASS] {criterion 1}
  [FAIL] {criterion 2} — {violation detail}
  [WARN] {criterion 3} — {warning detail}

Violations ({count}):
  1. {violation description}
     Fix: {remediation action}

Decision: [PROCEED | BLOCKED | CONDITIONAL]
```

### On PASS

```
Status: PASS
Score : {score}

All {N} criteria met. Gate {GATE_ID} approved.
Proceed to: {next_phase}
```

### On FAIL

```
Status: FAIL
Score : {score} (threshold: {threshold})

{N} violations found. Gate {GATE_ID} BLOCKED.

Required actions before proceeding:
  1. {action_1}
  2. {action_2}
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- Wraps guards/gates/quality-gates.js D1-D4 checks
- ops.js path is relative to package root: `node core/cli/ops.js`
- Used by 6+ EPS commands as a gate enforcement mechanism
