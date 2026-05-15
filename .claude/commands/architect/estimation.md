# /architect Phase 5: Estimation (Optional)

> **EXECUTION CONSTRAINTS**
>
> 1. INLINE conversation only.
> 2. This phase is OPTIONAL — router asks user before dispatching.

---

## Purpose

Generate effort estimation for project proposal based on Feature Map + Architecture Documents.

**Input**: `architect/feature-map.md`, `documents/architecture/*.md`
**Output**: `architect/estimation.md`

---

## Step 0: Load Context

Read using Read tool:
- `{context-dir}/architect/feature-map.md`
- Key architecture documents from `documents/architecture/` (01-system, 02-service at minimum)

---

## Step 1: Per-Feature Estimation

For each feature in feature-map, estimate:

| Feature | Classification | Complexity | Effort (person-days) | Dependencies |
|---|---|---|---|---|
| [name] | Core | High | [N] | [blocked by] |
| [name] | Core | Medium | [N] | [blocked by] |
| [name] | Important | Low | [N] | - |

Display table.
WAIT user adjust estimates.

---

## Step 2: Per-Component Estimation

For each architectural component (from architecture documents):

| Component | Setup | Integration | Total |
|---|---|---|---|
| [name] | [N] days | [N] days | [N] days |

Display table.

---

## Step 3: Infrastructure + Risk Buffer

| Category | Effort |
|---|---|
| Development (features) | [sum] person-days |
| Architecture setup | [sum] person-days |
| Infrastructure/DevOps | [N] person-days |
| Testing | [N] person-days |
| **Subtotal** | [sum] |
| Risk buffer (20-30%) | [N] person-days |
| **Total** | [sum] |

Display summary.
WAIT user adjust.

---

## Step 4: Save

Save `architect/estimation.md`:

```markdown
# Project Estimation: [Project Name]

## Summary
- Total effort: [N] person-days
- Risk buffer: [X]%
- Recommended team size: [N]
- Estimated duration: [N] weeks

## Per-Feature Breakdown
[table from Step 1]

## Per-Component Breakdown
[table from Step 2]

## Infrastructure + Risk
[table from Step 3]

## Assumptions
[list any estimation assumptions]
```

Update architect-state.json:
```
estimation.status = "completed"
currentPhase = "completed"
```

Display: "Phase 5 complete. Estimation saved."

**RETURN** control to router.

---

**/architect Phase 5: Estimation v1.0**
*Per-Feature + Per-Component + Risk Buffer*
*EPS Framework v8.0*
