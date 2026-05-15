---
name: workflow-state-validator
description: Validates EPS workflow state transitions. Use before any phase command to ensure correct state machine progression. Reports PASS/FAIL with current state and allowed next states.
allowed-tools: Read, Bash, Grep
---

# Workflow State Validator Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Validates that the requested EPS phase transition is valid given the current workflow state. Prevents out-of-order phase execution which can corrupt evidence and design artifacts.

## EPS State Machine

Valid transitions per state:

| Current State     | Allowed Next States                        |
|-------------------|--------------------------------------------|
| `INIT`            | `RESEARCH`                                 |
| `RESEARCH`        | `INNOVATE`                                 |
| `INNOVATE`        | `DESIGN_SRS`, `DESIGN_BASIC`, `DESIGN_DETAIL` |
| `DESIGN_SRS`      | `DESIGN_BASIC`, `PLAN`                     |
| `DESIGN_BASIC`    | `DESIGN_DETAIL`, `PLAN`                    |
| `DESIGN_DETAIL`   | `PLAN`                                     |
| `PLAN`            | `EXECUTE`                                  |
| `EXECUTE`         | `VALIDATE`                                 |
| `VALIDATE`        | `COMPLETE`, `EXECUTE` (re-execute)         |
| `COMPLETE`        | (terminal)                                 |

## Validation Logic

When invoked with a target state:

1. Read current state from injected context (Input section above)
2. Look up current state in transition table
3. Check if requested target state is in allowed list
4. Report result

### State Detection

```bash
# Get current context state
node core/cli/ops.js context-detect --raw
```

Parse the output for:
- `phase`: current workflow phase
- `feature`: active feature name
- `branch`: git branch

### Transition Check

```
If current_state IN state_machine:
    allowed = state_machine[current_state]
    If target_state IN allowed:
        PASS
    Else:
        FAIL — list allowed transitions
Else:
    FAIL — unrecognized state, run /research to initialize
```

## When to Use

- Before `/research` — verify context is initialized
- Before `/innovate` — verify research is complete
- Before `/design` — verify innovate is approved
- Before `/plan` — verify design docs exist
- Before `/execute` — verify plan is approved
- Before `/validate` — verify execution is complete

## Output Format

```
Workflow State Validation
=========================
Feature    : {feature-name}
Branch     : {branch}
Current    : {CURRENT_STATE}
Requested  : {TARGET_STATE}

Result: [PASS | FAIL]

Allowed transitions from {CURRENT_STATE}:
  - {STATE_1}
  - {STATE_2}

Action: {proceed message | blocked message with remediation}
```

### On PASS

```
Result: PASS
Current state {CURRENT_STATE} allows transition to {TARGET_STATE}.
Proceeding with {command}.
```

### On FAIL

```
Result: FAIL
Current state {CURRENT_STATE} does NOT allow transition to {TARGET_STATE}.

Allowed next states: {list}

Remediation:
  1. Complete required phase: {missing_phase}
  2. Then re-run: /{target_command}
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- Wraps state-manager.js transition validation logic
- ops.js path is relative to package root: `node core/cli/ops.js`
- Used by all 6 EPS phase commands
