# INNOVATE/SRS/INTERVIEW — Lightweight Interview (NEW)

## Purpose
3-5 adaptive questions (CONFIRM/DISCOVER/DECIDE) to clarify business intent before brainstorming.
Questions have DEPTH because AI already has domain knowledge from /research.

**Inspiration**: /architect Phase 1 interview — scaled down for feature level.

---

## Pre-requisites
- `business_context`: extracted from evidence.md [SCOPE:SRS]
- `domain_kb`: from domain-knowledge.md (may be empty for enhancement/bugfix)

---

## Workflow

### Step 1: Generate Interview Plan

Based on domain KB + evidence, generate 3-5 questions.
**CRITICAL**: Every question MUST have framing — context, scenario, and WHY this question matters.

```pseudo
FUNCTION generate_questions(business_context, domain_kb):
    questions = []

    # Type 1: CONFIRM — verify domain standards apply
    IF domain_kb HAS standard_workflows:
        questions.push({
            type: "CONFIRM",
            framing: {
                context: "[What current state/evidence leads to this question]",
                scenario: "[Concrete scenario where this matters — e.g., 'When user X does Y...']",
                why: "[Why the answer to this question affects the design direction]"
            },
            content: "Domain standard: [workflow]. Does this apply?",
            from_kb: true
        })

    # Type 2: DISCOVER — uncover unknowns
    IF business_context HAS gaps OR ambiguities:
        questions.push({
            type: "DISCOVER",
            framing: {
                context: "[What gap/ambiguity was found in the evidence]",
                scenario: "[Real scenario showing why this gap is problematic]",
                why: "[What decisions are blocked without this answer]"
            },
            content: "[Specific question about gap]",
            from_kb: false
        })

    # Type 3: DECIDE — choose between alternatives
    IF domain_kb HAS multiple_approaches:
        questions.push({
            type: "DECIDE",
            framing: {
                context: "[Current implementation state + problem being solved]",
                scenario: "[Concrete scenario illustrating the trade-off]",
                why: "[Why this decision cannot be deferred — impact on downstream design]"
            },
            content: "Two approaches: [A] vs [B]. Trade-offs:",
            options: [
                { label: "A", description: "...", implications: "..." },
                { label: "B", description: "...", implications: "..." }
            ],
            from_kb: true
        })

    # Cap at 5 questions max
    RETURN questions.slice(0, 5)
```

### Step 2: Interview Loop (Adaptive)

```pseudo
SET total = LENGTH(questions)
SET answers = []

DISPLAY ""
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Interview: {total} questions to clarify business intent"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FOR i = 0 TO total - 1:
    q = questions[i]

    DISPLAY ""
    DISPLAY "── Q{i+1}/{total} ({q.type}) ──"

    # ALWAYS show framing FIRST — context, scenario, why
    DISPLAY "**Bối cảnh**: {q.framing.context}"
    DISPLAY "**Kịch bản**: {q.framing.scenario}"
    DISPLAY "**Tại sao hỏi**: {q.framing.why}"
    DISPLAY ""

    IF q.type == "DECIDE":
        # Output mode: full context + options
        DISPLAY q.content
        DISPLAY ""
        FOR EACH option IN q.options:
            DISPLAY "  [{option.label}]: {option.description}"
            DISPLAY "       → {option.implications}"
        DISPLAY ""
        DISPLAY "Choose [A/B] or describe your preference:"

    ELIF q.type == "CONFIRM":
        # Dialog mode: simple yes/no
        DISPLAY q.content
        DISPLAY "[Y/n or explain]"

    ELSE:  # DISCOVER
        # Open-ended
        DISPLAY q.content

    # WAIT FOR USER RESPONSE
    answer = AWAIT USER_INPUT
    answers.push({ question: q.content, type: q.type, answer: answer })

    # Adaptive: adjust remaining questions based on answer
    # - If answer reveals new concern → add follow-up
    # - If answer eliminates a question → remove it
    # - Update total accordingly
    questions = adjust_remaining(questions, answers)
    total = LENGTH(questions)

DISPLAY ""
DISPLAY "✅ Interview complete. {LENGTH(answers)} answers collected."
DISPLAY "   Proceeding to evidence synthesis..."
```

---

## Output

`interview_answers` array stored in conversation context.
Used by evidence-synthesis.md to enrich brainstorming.

---

## Quality Rules

### DO
- ✅ Every question MUST have framing: context (what evidence leads here), scenario (concrete example), why (impact on design)
- ✅ Questions MUST reference domain KB (not generic)
- ✅ DECIDE questions MUST show trade-offs
- ✅ Adaptive: adjust based on answers
- ✅ Max 5 questions (feature-level, not project-level)

### DON'T
- ❌ DO NOT present a question without framing — NEVER display bare questions
- ❌ DO NOT ask generic questions ("What do you want?")
- ❌ DO NOT exceed 5 questions
- ❌ DO NOT skip WAIT for user response
- ❌ DO NOT auto-answer for user

---

**RETURN** to `innovate/srs.md` router.

---

*INNOVATE/SRS/INTERVIEW — Lightweight Interview*
*3-5 Adaptive Questions (CONFIRM/DISCOVER/DECIDE)*
*EPS Framework v9.0*
