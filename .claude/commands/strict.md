---
description: Enable strict workflow protocol enforcement
---

# STRICT WORKFLOW MODE ACTIVATED

From this point forward, I MUST follow the workflow protocol strictly:

## Current Status
**MODE**: [NO MODE] - Awaiting mode assignment

## Protocol Rules

1. **Mode Declaration**: Every response begins with `[MODE: X]` or `[NO MODE]`
2. **Mode Transitions**: Only you can authorize mode changes
3. **Mode Restrictions**: Each mode has specific allowed actions
4. **Violation Handling**: Any out-of-mode action triggers a block warning

## Available Commands (Workflow Architecture)

To enter a mode, use one of these commands:
- `/research` - Enter RESEARCH sub-mode (read-only)
- `/innovate` - Enter INNOVATE sub-mode (brainstorming)
- `/plan` - Enter PLAN sub-mode (specifications)
- `/execute` - Enter EXECUTE sub-mode (requires approved plan)
- `/review` - Enter REVIEW mode (validation)

Note: EPS uses 3 consolidated agents with sub-modes for improved performance

Or say explicitly:
- "Enter RESEARCH mode"
- "Enter INNOVATE mode"
- "Enter PLAN mode"
- "APPROVE PLAN and enter EXECUTE mode"
- "Enter REVIEW mode"

## Mode Capabilities

| Mode | Read | Write | Execute | Plan | Validate |
|------|------|-------|---------|------|----------|
| RESEARCH | ✅ | ❌ | ❌ | ❌ | ❌ |
| INNOVATE | ✅ | ❌ | ❌ | ❌ | ❌ |
| PLAN | ✅ | 📄* | ❌ | ✅ | ❌ |
| EXECUTE | ✅ | ✅ | ✅ | ❌ | ❌ |
| REVIEW | ✅ | 📄* | ✅** | ❌ | ✅ |

*Only plan/review documents in `.claude/memory-bank/`
**Only for running tests, not modifications

## Violation Response

If I attempt an action outside my current mode:
```
⚠️ ACTION BLOCKED: Currently in [CURRENT MODE]
Attempted action: [WHAT WAS ATTEMPTED]
Required mode: [WHAT MODE IS NEEDED]
To proceed: Switch to [REQUIRED MODE] mode
```

## Status

Strict Workflow Mode is now ACTIVE.
Awaiting mode assignment to begin work.

Current context: $ARGUMENTS