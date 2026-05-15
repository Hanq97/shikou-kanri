# INNOVATE Command - Modular Structure

## Overview

This directory contains the modular implementation of the `/innovate` command using JIT (Just-in-Time) Loading pattern.

## Directory Structure

```
commands/
├── innovate.md              # Router (~100 lines) - Entry point
└── innovate/
    ├── README.md            # This file
    ├── srs.md               # INNOVATE_SRS workflow (~400 lines)
    ├── bd.md                # INNOVATE_BD workflow (~450 lines)
    └── dd.md                # INNOVATE_DD workflow (~150 lines)
```

## Workflow Files

| File | Purpose | Trigger State |
|------|---------|---------------|
| `srs.md` | Business Approach + Function List Review | RESEARCH_SRS → INNOVATE_SRS |
| `bd.md` | SRS Validation + Tech Decisions + Blueprint | RESEARCH_BD → INNOVATE_BD |
| `dd.md` | Detail Design Approach Selection | RESEARCH_DD → INNOVATE_DD |

## JIT Loading Pattern

The main `innovate.md` acts as a **router**:
1. Validates state transition
2. Checks Quality Gate D1
3. Determines innovation type from current state
4. **Loads ONLY the relevant workflow file** (srs.md, bd.md, or dd.md)
5. Executes loaded workflow

### Benefits
- **Context Efficiency**: ~500 tokens vs ~4,000 tokens (87% reduction)
- **Maintainability**: Each file focused on single workflow
- **Readability**: Smaller files easier to understand and update

## Usage

```bash
# User runs /innovate command
# Router determines state and loads appropriate workflow:

# If RESEARCH_SRS → loads innovate/srs.md
# If RESEARCH_BD → loads innovate/bd.md
# If RESEARCH_DD → loads innovate/dd.md
```

## Related Documentation

- **Concept**: `.claude/docs/INNOVATE_CONCEPT.md`
- **Templates**: `commands/templates/innovate/`
- **State Manager**: `core/state/state-manager.js`

---
*EPS Framework v4.1 - JIT Loading Pattern*
*Updated: 2025-12-04*
