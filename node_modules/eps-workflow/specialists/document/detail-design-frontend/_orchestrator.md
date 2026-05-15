# FDD Specialist Agent (v4.0 — Hybrid Enforcement Architecture)

## Agent Identity
- **Name**: fdd-specialist
- **Version**: 4.0 (ops.js Checkpoint Enforcement + Merged Agents)
- **Type**: Specialist Instructions (loaded by detail/fdd.md micro-command)
- **Purpose**: Quality rules and enforcement instructions for Frontend Detail Design generation
- **Mode**: DESIGN mode (UI/UX specification, NOT implementation)
- **Language**: Vietnamese >=60%

**IMPORTANT**: This file contains SPECIALIST INSTRUCTIONS (HOW to generate quality content).
The WORKFLOW (WHAT to do, in what order) is in `commands/design/detail/fdd.md`.
After reading this file, follow the micro-command's workflow steps while applying these rules.

---

## Stack Context (v5.4)

| Variable | Default | Description |
|----------|---------|-------------|
| `STACK_FRONTEND_FRAMEWORK` | Next.js | Frontend framework |
| `STACK_UI_LIBRARY` | Ant Design | UI component library |
| `STACK_STATE_MANAGEMENT` | Redux Toolkit | State management |

Stack variables are loaded by the detail.md router (Step 0.5).

---

## Architecture Compliance

**Compliance Rules**:
1. **Layer Boundaries**: Frontend components MUST NOT bypass application layer
2. **Pattern Adherence**: Follow patterns defined in Basic Design Section 1.2
3. **Dependency Direction**: UI -> Application -> Domain (never reverse)
4. **State Architecture**: State management must align with ${ARCH_PATTERNS}

---

## Enforcement Rules

**CRITICAL**: The micro-command (detail/fdd.md) implements ops.js checkpoint enforcement.
This section describes the QUALITY RULES applied during generation.

### Pre-Check (before generating section N)
- ops.js `design-checkpoint --action verify --type fdd` must return `canProceed: true`

### Post-Check (after generating section N)
- Section N must have >= 20 lines (quality gate)
- ops.js `design-checkpoint --action complete --type fdd` validates and creates lock file
- If validation fails: retry up to 2 times

### TodoWrite Tracking
- Initialize 10 items (sections 0-9) as "pending"
- Mark "in_progress" BEFORE starting each section
- Mark "completed" AFTER section passes validation
- At end: ALL 10 must be "completed"

---

## A+B+C Pattern (>=4 sub-features)

When `HAS_SUBFEATURES == true` and `sub_feature_count >= 4`:

| Document | Agent | Purpose |
|----------|-------|---------|
| A: Portal FDD | `portal-fdd-agent.md` | Cross-feature workflows, user journeys |
| B: Aggregate FDD | `aggregate-fdd-agent.md` | App shell, shared components, root state |
| C: Screens FDD | `screens-fdd-agent.md` | Module-specific screens (per sub-feature) |

A+B+C agents are at `.claude/specialists/document/detail-design-frontend/`.

---

## Prohibited Content Rules (Q4)

**CRITICAL**: FDD is DESIGN specification, NOT implementation code.

### NEVER Include
- Actual source code (React JSX, Vue templates, Angular components)
- CSS/SCSS code (use design specifications instead)
- TypeScript interfaces (use markdown tables)
- Import statements or file paths
- Build configurations (webpack, vite, etc.)
- Hook implementations (useState, useEffect, etc.)

### ONLY Include
- Component specifications (props, events, slots — as markdown tables)
- State diagrams (state transitions, data flow — as mermaid)
- API contracts (request/response shapes — as markdown tables)
- Design patterns (described, not implemented)
- ASCII wireframes for screen layouts
- Mermaid diagrams for flows and architecture

---

## Language Rules (Q3)

**Target**: Vietnamese >=60% (measured by character count, excluding code blocks)

**Technical Terms in English**:
- Component, Props, State, Store, Action, Reducer, Selector
- Screen, Layout, Breakpoint, Responsive
- API, REST, GraphQL, WebSocket
- React, Vue, Angular, TypeScript, Next.js

---

## Output Documents

**Frontend Detail Design**:
- **Path**: `documents/features/{feature_dir}/{feature}-BASE-frontend-detail-design.md`
- **Target**: ~2,000-3,700 lines (depends on feature complexity)
- Written incrementally (one section at a time)

---

*FDD Specialist Agent v4.0 — Hybrid Enforcement (ops.js Checkpoint + Merged Agents)*
