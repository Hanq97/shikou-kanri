# Frontend Detail Design Micro-Agents

**Version**: 1.0.0
**Updated**: 2025-12-03

---

## Overview

Micro-agents cho Frontend Detail Design generation. Mỗi agent responsible cho một section cụ thể (single responsibility).

## Agent List

| Agent | Section | Purpose | Lines |
|-------|---------|---------|-------|
| fdd-00-document-info.md | 00 | Document metadata | 40-60 |
| fdd-01-module-overview.md | 01 | Module overview, user journey | 80-120 |
| fdd-02-component-tree.md | 02 | Component hierarchy | 100-150 |
| fdd-03-screen-layout.md | 03 | ASCII wireframes | 150-200 |
| fdd-04-component-details.md | 04 | Component specifications | 200-300 |
| fdd-05-routing.md | 05 | Route definitions | 80-120 |
| fdd-06-ui-state.md | 06 | Redux state management | 100-150 |
| fdd-07-server-state.md | 07 | React Query integration | 150-200 |
| fdd-08-form-handling.md | 08 | Form validation | 100-150 |
| fdd-09-error-handling.md | 09 | Error display | 80-120 |
| fdd-10-test-cases.md | 10 | Test scenarios | 100-150 |

## Orchestration

Micro-agents được orchestrated bởi `core/orchestrate/orchestrate-fdd.js`:

```
C0: Load Context + Reasoning
C1: fdd-01 → Module Overview
C2: fdd-02 → Component Tree
C3: fdd-03 → Screen Layout (CORE)
C4: fdd-04 → Component Details
C5: fdd-05 → Routing
C6: fdd-06 → UI State
C7: fdd-07 → Server State (CRITICAL for Backend DD)
C8: fdd-08 → Form Handling
C9: fdd-09 → Error Handling
C10: fdd-10 → Test Cases
```

## Input Context

Each micro-agent receives:
1. `reasoning.json` - Screens, components derived from SRS + Basic Design
2. Previous sections (for cross-reference)
3. SRS document
4. Basic Design document

## Checkpoint Validation

Each checkpoint validates:
- Section completeness
- Vietnamese content ratio (≥60%)
- Prohibited content absence
- Cross-section consistency

## Usage

Micro-agents are invoked automatically via `/design --detail --frontend`.

Manual invocation (for debugging):
```bash
cd .claude/utils
node ../../../core/orchestrate/orchestrate-fdd.js --feature LND --status
node ../../../core/orchestrate/orchestrate-fdd.js --feature LND --section 03
```
