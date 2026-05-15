# INNOVATE/SRS/DECISION-LOOP — Per-item Decision + Synthesis
# [FROM: innovate/srs.md Phase 1 — Steps 1 through 6 + Phase 1.5]

## Purpose
Extract decision items from Claude + Gemini approaches, apply DEEP SELF-DEBATE per item,
present ONLY optimal options to user. Quality over quantity.

---

## SELF-DEBATE PROTOCOL (CRITICAL — applies to ALL decision items)

**BEFORE presenting ANY option to user**, each decision item MUST go through deep analysis:

```pseudo
FUNCTION self_debate(item, evidence, current_impl):
    # ═══ Phase A: Deep Analysis ═══
    # Analyze current implementation + current problem thoroughly
    current_state = analyze_current_implementation(item, evidence)
    problem_root_cause = identify_root_cause(item, evidence)

    # ═══ Phase B: Generate Initial Candidates ═══
    # From Claude approach + Gemini approach + own analysis
    raw_candidates = collect_all_candidates(claude_approach, gemini_approach)

    # ═══ Phase C: 4-5 Rounds of Self-Debate ═══
    surviving_options = raw_candidates

    FOR round = 1 TO 5:
        DISPLAY_INTERNAL ""  # Internal reasoning, NOT shown to user
        DISPLAY_INTERNAL "── Self-debate Round {round} ──"

        FOR EACH option IN surviving_options:
            # Challenge: What breaks with this option?
            weaknesses = find_weaknesses(option, current_state, problem_root_cause)
            # Defend: Can weaknesses be mitigated?
            mitigations = find_mitigations(weaknesses)
            # Judge: Does this option survive this round?
            option.score = evaluate(option, weaknesses, mitigations)

        # Eliminate weak options — only keep genuinely strong ones
        surviving_options = surviving_options.filter(o => o.score >= threshold)

        # Can we merge similar surviving options into a better hybrid?
        surviving_options = merge_if_complementary(surviving_options)

        # If only 1 option remains and it's clearly optimal → stop early
        IF LENGTH(surviving_options) == 1 AND surviving_options[0].score >= HIGH_CONFIDENCE:
            BREAK

    RETURN surviving_options  # Could be 1, 2, or 3 — quality matters, not quantity
```

### Key Principles
- **1 excellent option > 3 mediocre options** — do NOT pad options to reach a count
- Each round MUST genuinely challenge previous conclusions (not rubber-stamp)
- Final options MUST trace back to: current impl analysis + problem root cause + evidence
- If all candidates are weak → state honestly: "No strong option found, need more info"

---

## Workflow

### Step 1: DIVERGE — Collect All Approaches

```pseudo
all_approaches = {
    claude: claude_approach,
    gemini: gemini_alternatives  # May be NULL
}
```

### Step 2: VALIDATE (Constraint Soft Filter)

```pseudo
FOR EACH approach IN all_approaches:
    violations = check_constraints(approach, project_constraints)
    IF violations:
        approach.flags = violations  # Flag, don't reject (I06)
```

### Step 3: EXTRACT DECISION ITEMS

```pseudo
decision_items = extract_from_all_approaches(all_approaches)
# Deduplicate: merge items that address the same concern
decision_items = deduplicate(decision_items)
```

### Step 4: PER-ITEM DECISION LOOP (HUMAN CHECKPOINT)

```pseudo
decisions = []
FOR EACH item IN decision_items:
    # ═══ SELF-DEBATE: 4-5 rounds before presenting ═══
    optimal_options = self_debate(item, evidence, current_implementation)

    # ═══ FRAMING: explain WHY this decision matters ═══
    DISPLAY ""
    DISPLAY "## 🔍 Decision Item [{index+1}/{total}]: {item.name}"
    DISPLAY ""
    DISPLAY "**Bối cảnh**: {item.current_state_analysis}"
    DISPLAY "**Vấn đề**: {item.problem_description}"
    DISPLAY "**Tại sao cần quyết định**: {item.why_decision_needed}"
    DISPLAY ""

    # ═══ PRESENT: only surviving options from self-debate ═══
    IF LENGTH(optimal_options) == 1:
        # Single optimal option — present with full rationale
        DISPLAY "| # | Source | Description | Why Optimal |"
        DISPLAY "|---|--------|-------------|-------------|"
        DISPLAY "| 1 | {opt.source} | {opt.description} | {opt.rationale_from_debate} |"
        DISPLAY ""
        DISPLAY "⭐ Single optimal option after {rounds} rounds of analysis"
        DISPLAY "Self-debate summary: {debate_summary}"
    ELSE:
        # Multiple surviving options — show comparison
        DISPLAY "| # | Source | Description | Strengths | Weaknesses |"
        DISPLAY "|---|--------|-------------|-----------|------------|"
        FOR EACH option IN optimal_options:
            DISPLAY "| {option.number} | {option.source} | {option.description} | {option.strengths} | {option.weaknesses} |"

        DISPLAY ""
        DISPLAY "⭐ Recommended: Option {recommended.number} ({recommended.source})"
        DISPLAY "Rationale: {recommended.rationale_from_debate}"

    DISPLAY ""
    DISPLAY "Choose: [1-N] / own: [idea] / more info"

    response = WAIT USER_INPUT  # I21: NEVER auto-select
    decisions.push(process_response(item, response))

    # Save session state after each decision (I11)
    save_session_state(decisions)

    DISPLAY "📊 Progress: {index+1}/{total} decisions"
```

### Step 5: FINAL SUMMARY

```pseudo
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Summary of All Decisions"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FOR EACH d IN decisions:
    DISPLAY "  ✓ {d.item}: {d.choice} ({d.source})"
```

### Step 6: CONFIRMATION (HUMAN CHECKPOINT)

```pseudo
DISPLAY ""
DISPLAY "Actions: [confirm] / [change N] / [cancel]"
response = WAIT USER_INPUT  # I12

IF response == "change N":
    # Re-run self-debate for that specific item
    GOTO Step 4 for item N
ELIF response == "cancel":
    STOP
```

### Phase 1.5: Refine Based on User Choice

```pseudo
# If user chose "own:" for any item, integrate their idea
# Re-validate constraints with final selections
# Ensure consistency across all decisions
refined_decisions = refine_and_validate(decisions)
```

---

## Enforcement Rules Covered
- I06: Constraint soft filter (flag, don't reject)
- I07: Extract decision items from ALL approaches
- I08: Per-item decision loop (WAIT per item)
- I09: Show AI recommendation + rationale per item (grounded in self-debate)
- I10: User responses: number / own: / more info
- I11: Save session state after each decision
- I12: Final summary + confirm/change/cancel
- I13: Phase 1.5 — Refine based on user choice
- I21: NEVER auto-select without user input
- I22: NEVER present unified solution FIRST
- **I23: SELF-DEBATE 4-5 rounds per item BEFORE presenting (NEW)**
- **I24: FRAMING required — context + problem + why for each item (NEW)**
- **I25: Quality over quantity — 1 optimal option acceptable (NEW)**

---

**RETURN** to `innovate/srs.md` router.

---

*INNOVATE/SRS/DECISION-LOOP — Deep Self-Debate + Per-item Decision*
*Enforcement: I06-I13, I21-I25*
*EPS Framework v9.1*
