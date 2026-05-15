# /architect Phase 3: Feature Mapping

> **EXECUTION CONSTRAINTS**
>
> 1. INLINE conversation only.
> 2. WAIT for user confirmation at each step.

---

## Purpose

Identify, classify, and map features from Architecture Assessment + ADRs.
Create dependency graph showing WHY each feature exists and HOW features relate.

**Input**: `architect/assessment.md`, `architect/decisions/ADR-*.md`
**Output**: `architect/feature-map.md`, optionally `architect/catalogs/*.md`

---

## Step 0: Load Context

Read using Read tool:
- `{context-dir}/architect/assessment.md`
- All files in `{context-dir}/architect/decisions/` (ADR-*.md)

---

## Step 1: Feature Identification

AI analyzes assessment + ADRs to extract features.

For each feature, identify:
- **Name**: Short descriptive name
- **Description**: What this feature does (1-2 sentences)
- **Source**: Which assessment answers / ADR decisions justify this feature
- **Components**: Which architectural components serve this feature

Display feature list.
WAIT for user to add/remove/edit features.

---

## Step 2: Feature Classification

Classify each feature into:

| Category | Criteria |
|---|---|
| **Core (must-have)** | System cannot function without it |
| **Important (should-have)** | Needed but acceptable to delay to phase 2 |
| **Nice-to-have** | Value-add, can be built later |

Display classification table:

```
Feature Classification:

CORE (must-have):
  1. [feature] — [reason it's core]
  2. [feature] — [reason]

IMPORTANT (should-have):
  3. [feature] — [reason]
  4. [feature] — [reason]

NICE-TO-HAVE:
  5. [feature] — [reason]
```

WAIT user confirm/adjust classification.

---

## Step 3: Dependency Graph

For each feature, determine:
- **Why it exists**: Business justification (from assessment)
- **Depends on**: Which other features must exist first
- **Depended by**: Which features need this one
- **Components**: Which architectural components serve it

Display dependency tree (ASCII):

```
Feature Dependency Graph:

[Core Feature A]
  └── [Core Feature B] (depends on A)
       ├── [Important Feature C] (depends on B)
       └── [Important Feature D] (depends on B)

[Core Feature E] (independent)
  └── [Nice-to-have Feature F] (depends on E)
```

WAIT user confirm/adjust dependencies.

---

## Step 4: Catalogs (if needed)

Based on feature analysis, check if domain-specific catalogs are needed:

- **stakeholder-roles** — If multiple actor types identified
- **account-types** — If multiple entity types with different behaviors
- Other domain-specific catalogs

For each needed catalog:
- AI generates draft content from assessment + ADRs
- Display to user
- WAIT confirm
- Save to `architect/catalogs/[name].md`

---

## Step 5: Save Feature Map

Save `architect/feature-map.md`:

```markdown
# Feature Map: [Project Name]

## Classification Summary
- Core: [N] features
- Important: [N] features
- Nice-to-have: [N] features
- Total: [N] features

## Features

### Core Features
[table: name, description, source, components, dependencies]

### Important Features
[table]

### Nice-to-have Features
[table]

## Dependency Graph
[ASCII diagram]

## Catalogs Generated
[list with descriptions]
```

Update architect-state.json:
```
feature-map.status = "completed"
currentPhase = "documents"
```

Display: "Phase 3 complete. [N] features mapped. Moving to Phase 4: Architecture Documents."

**RETURN** control to router.

---

**/architect Phase 3: Feature Mapping v1.0**
*Classification + Dependency Graph*
*EPS Framework v8.0*
