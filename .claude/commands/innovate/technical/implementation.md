# INNOVATE/TECHNICAL/IMPLEMENTATION — Implementation Decisions [FROM-DD]
# [FROM: innovate/dd.md — full logic]

## Purpose
Implementation decisions that INHERIT from architecture. Innovation scope limited to:
API design, state management, testing strategy, code organization, error handling.

---

## GOLDEN RULE (CRITICAL)

> **DD alternatives MUST implement the BD approach, NOT propose alternative architectures.**

Architecture decisions from `architecture.md` output are **LOCKED**:
- Architecture Pattern (LOCKED)
- Component Structure (LOCKED)
- Data Model (LOCKED)
- Integration Points (LOCKED)
- Technology Stack (LOCKED)

---

## Step 1: Display Inheritance

```pseudo
# [FROM-DD: dd.md — Inheritance from Basic Design]

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "═══ Implementation Decisions [FROM-DD] ═══"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""
DISPLAY "Inherited from Architecture (LOCKED):"
FOR EACH d IN arch_decisions.decisions:
    DISPLAY "  ✓ {d.item}: {d.choice}"
DISPLAY ""
```

## Step 2: Detect Remaining Scope

```pseudo
# [NEW — giải quyết root cause DD innovate trống rỗng]

remaining_scope = detect_remaining_dd_scope(arch_decisions)

# What DD CAN innovate:
# [FROM-DD: dd.md "What DD CAN Innovate"]
possible_items = [
    "API Design (endpoints, DTOs, validation)",
    "State Management (local vs global, cache strategy)",
    "Testing Strategy (unit coverage, integration approach)",
    "Code Organization (file structure, naming conventions)",
    "Error Handling (response format, retry strategy, fallback)"
]

# Filter: which items were NOT already decided by architecture?
remaining = []
FOR EACH item IN possible_items:
    IF NOT already_decided_by_architecture(item, arch_decisions):
        remaining.push(item)

IF LENGTH(remaining) == 0:
    DISPLAY "Architecture decisions cover all implementation concerns."
    DISPLAY "No additional decisions needed."
    DISPLAY ""
    DISPLAY "Confirm? [Y/n]"
    WAIT user_confirm
    RETURN { decisions: [], note: "Confirmed by architecture — no additional decisions" }

DISPLAY "Remaining decisions ({LENGTH(remaining)} items):"
FOR EACH item IN remaining:
    DISPLAY "  → {item}"
DISPLAY ""
```

## Step 3: Brainstorm Implementation Options

```pseudo
# [FROM-DD: dd.md Phase 1 — only for remaining scope]

# Claude: generate implementation approach inline
claude_impl = generate_claude_implementation(evidence, srs_selection, arch_decisions, remaining)

# Gemini: alternative perspective (if available)
gemini_impl = call_gemini_implementation(gemini_context, remaining) OR NULL
```

## Step 4: Per-item Decision Loop (with Self-Debate)

```pseudo
# [FROM-DD: dd.md Phase 1 Step 3→6 — ENHANCED with self-debate protocol]

decision_items = extract_implementation_decisions(claude_impl, gemini_impl)

decisions = []
FOR EACH item IN decision_items:
    # CONSTRAINT CHECK: must implement BD, not propose alternatives
    # [FROM-DD: dd.md — GOLDEN RULE]
    validate_bd_compliance(item, arch_decisions)

    # ═══ SELF-DEBATE: 4-5 rounds BEFORE presenting to user ═══
    current_state = analyze_current_implementation(item, evidence, arch_decisions)
    problem = identify_what_needs_solving(item, remaining)

    raw_candidates = item.options
    surviving = raw_candidates

    FOR round = 1 TO 5:
        # Internal reasoning — NOT shown to user
        FOR EACH opt IN surviving:
            # Must ALSO validate BD compliance in each round
            validate_bd_compliance(opt, arch_decisions)
            weaknesses = challenge(opt, current_state, problem)
            mitigations = defend(opt, weaknesses)
            opt.score = evaluate(opt, weaknesses, mitigations)
        surviving = surviving.filter(o => o.score >= threshold)
        surviving = merge_if_complementary(surviving)
        IF LENGTH(surviving) == 1 AND surviving[0].score >= HIGH_CONFIDENCE:
            BREAK

    # ═══ FRAMING: explain WHY this implementation decision matters ═══
    DISPLAY ""
    DISPLAY "## 🔍 Implementation [{index+1}/{total}]: {item.name}"
    DISPLAY ""
    DISPLAY "**Bối cảnh**: {current_state.summary}"
    DISPLAY "**Vấn đề cần giải quyết**: {problem.description}"
    DISPLAY "**Tại sao cần quyết định**: {item.downstream_impact}"
    DISPLAY ""

    # ═══ PRESENT: only surviving options after self-debate ═══
    IF LENGTH(surviving) == 1:
        DISPLAY "| # | Description | Why Optimal (after {rounds} rounds analysis) |"
        DISPLAY "|---|-------------|----------------------------------------------|"
        DISPLAY "| 1 | {surviving[0].description} | {surviving[0].rationale} |"
        DISPLAY ""
        DISPLAY "⭐ Single optimal option — self-debate eliminated weaker alternatives"
    ELSE:
        DISPLAY "| # | Source | Description | Strengths | Weaknesses |"
        DISPLAY "|---|--------|-------------|-----------|------------|"
        FOR EACH option IN surviving:
            DISPLAY "| {option.number} | {option.source} | {option.description} | {option.strengths} | {option.weaknesses} |"
        DISPLAY ""
        DISPLAY "⭐ Recommended: Option {recommended.number}"
        DISPLAY "Rationale: {recommended.rationale}"

    # User choice
    DISPLAY ""
    DISPLAY "Choose: [1-N] / own: [idea] / more info"
    response = WAIT USER_INPUT
    decisions.push(process_response(item, response))

RETURN { decisions: decisions }
```

---

## Enforcement Rules Covered
- D01: BD Selection MUST load (inherit from architecture.md output)
- D02: GOLDEN RULE — DD MUST implement BD, NOT propose alternatives
- D03: Architecture LOCKED
- D04: DD CAN innovate — API, state, testing, code org, error handling
- D05: Specialist patterns query (via common.md)
- D06: Per-item decision loop
- **D07: Self-debate 4-5 rounds per item BEFORE presenting (NEW)**
- **D08: Framing required — context + problem + why for each item (NEW)**
- **D09: Quality over quantity — 1 optimal option acceptable (NEW)**

---

**RETURN** to `innovate/technical.md` router.

*[FROM: innovate/dd.md — full logic]*
*Enforcement: D01, D02, D03, D04, D05, D06*
