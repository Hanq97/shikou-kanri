# /architect Phase 2: Architecture Decisions (ADRs)

> **EXECUTION CONSTRAINTS**
>
> 1. INLINE conversation only.
> 2. Save each ADR after user approval.
> 3. Update architect-state.json after each ADR.
> 4. ADRs are SEQUENTIAL — later ADRs reference earlier ones.

---

## Purpose

Generate Architecture Decision Records based on Architecture Assessment.
Each ADR presents alternatives with trade-offs, user chooses.

**Input**: `architect/assessment.md`, `architect/domain-knowledge.md`
**Output**: `architect/decisions/ADR-NNN-[title].md`, optionally `architect/catalogs/*.md`

---

## Step 0: Load Context

Read the following files using Read tool:
- `{context-dir}/architect/assessment.md` — Architecture Assessment from Phase 1
- `{context-dir}/architect/domain-knowledge.md` — Domain KB for research context

Extract unresolved assumptions from assessment → flag for resolution during ADR generation.

---

## Step 1: Propose ADR List

AI analyzes assessment to identify architecture decisions needed.

Standard ADR categories (in order):

1. **System Structure** — Monolith vs Modular Monolith vs Microservices, layer architecture
2. **Tech Stack** — Languages, frameworks, runtime
3. **Data Architecture** — Database type, caching strategy, messaging/events
4. **Integration Architecture** — API gateway, authentication, external system patterns
5. **Domain-specific** — Blockchain, ML/AI, IoT, real-time — only if applicable

For each proposed ADR, display:
- ADR number
- Title
- Why this decision is needed (from assessment)
- Which assessment answers drive this decision

```
Proposed ADR List: [N] decisions

  ADR-001: [title]
    Context: [why needed — from assessment]

  ADR-002: [title]
    Context: [why needed]
    Depends on: ADR-001

  ...

Confirm this list? You can add/remove ADRs. (confirm/edit)
```

WAIT user confirm. May add/remove ADRs.

Save `architect/adr-list.md` with confirmed list.
Update architect-state.json: `adr.adrList = [...]`, `adr.totalADRs = N`.

---

## Step 2: ADR Generation Loop

FOR each ADR in confirmed list (sequential order):

### 2.1 Display Progress

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADR [current/total]: [title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.2 Research Alternatives

**Claude** (inline): Generate options based on assessment + domain KB + previous ADRs.

**Gemini** (if available):
```bash
node core/cli/ops.js gemini-call --prompt "
  Domain: [domain]
  Decision: [ADR title]
  Context: [assessment excerpt]
  Previous decisions: [ADR-001: chose X, ADR-002: chose Y]

  Suggest 2-3 technology/architecture alternatives with:
  - Name and description
  - Pros and cons
  - Real-world production examples
  - Performance/cost/complexity comparison
" --model "gemini-2.0-flash"
```

If Gemini unavailable → Claude generates all alternatives.

### 2.3 Present ADR Draft

```markdown
# ADR-[NNN]: [Title]

## Context
[Why this decision is needed — from assessment]
[References to assessment answers]

## Options

### Option A: [Name]
Description: [what and how]
Pros: [list]
Cons: [list]
Used by: [reference systems from Domain KB]
Impact: [architecture implications]

### Option B: [Name]
Description: [what and how]
Pros: [list]
Cons: [list]
Used by: [reference systems]
Impact: [architecture implications]

[Option C if applicable]

## Recommendation
[AI recommendation with rationale]
[Trade-off summary]
```

WAIT for user to choose option and approve.

### 2.4 Save ADR

Save `architect/decisions/ADR-[NNN]-[title].md`:

```markdown
# ADR-[NNN]: [Title]
## Status: ACCEPTED
## Context
[from 2.3]
## Options
[from 2.3]
## Decision
[User's choice with rationale]
## Consequences
[Positive and negative consequences of this decision]
## References
[Assessment sections, previous ADRs]
```

### 2.5 Check Supersede

If this ADR contradicts or replaces a previous ADR:
- Display: "ADR-[NNN] supersedes ADR-[MMM]. Update ADR-[MMM] status?"
- WAIT user confirm.
- Update previous ADR: `## Status: SUPERSEDED by ADR-[NNN]`

### 2.6 Check Catalog Generation

If this ADR decision generates a catalog (e.g., auth model → permission catalog):
- Display: "This decision suggests creating a [name] catalog. Generate?"
- WAIT user confirm.
- Generate `architect/catalogs/[name].md`

### 2.7 Update State

Update architect-state.json:
```
adr.completedADRs += "ADR-[NNN]"
```

Display: "ADR-[NNN] saved. [remaining] ADRs left."

END FOR

---

## Step 3: ADR Summary

Display all ADRs with their decisions:

```
Architecture Decisions Summary:

  ADR-001: [title] → Chose: [option name]
  ADR-002: [title] → Chose: [option name]
  ...

  Catalogs generated: [list]
  Superseded ADRs: [list if any]
```

Ask: "Approve all ADRs? (y/n/revise ADR-NNN)"
WAIT user.

If revise requested → re-run Step 2 for specific ADR.
If approved:

Update architect-state.json:
```
adr.status = "completed"
currentPhase = "feature-map"
```

Display: "Phase 2 complete. [N] ADRs saved. Moving to Phase 3: Feature Mapping."

**RETURN** control to router.

---

**/architect Phase 2: ADR Generation v1.0**
*Sequential ADRs with Supersede Support*
*EPS Framework v8.0*
