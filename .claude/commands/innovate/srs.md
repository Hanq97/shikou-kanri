# INNOVATE/SRS — Part 1 Router

## Purpose
Router for SRS innovation: Interview + Brainstorm + Function List + Save.
Dispatches to 5 micro-commands sequentially via Read tool.

---

## Step 0: Load Evidence

```pseudo
# Load evidence.md from context directory
context_dir = detect_context_directory()
evidence = READ(context_dir + "/evidence.md")

IF evidence IS EMPTY:
    DISPLAY "❌ No evidence found. Run /research first."
    STOP

# Extract business section for interview
business_context = extract_section(evidence, "[SCOPE:SRS]")

# Load domain KB if exists (new features)
domain_kb = READ_IF_EXISTS(context_dir + "/domain-knowledge.md")
```

---

## Step 0.5: Big Picture — SRS Overview (MANDATORY)

**BEFORE any questions**, paint the full picture so user understands WHY we're asking.

```pseudo
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Bức tranh toàn cảnh — SRS Innovation"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""

# 1. Summarize what we know from evidence
DISPLAY "## Hiện trạng (từ research)"
key_findings = summarize_key_findings(business_context, domain_kb)
FOR EACH finding IN key_findings:
    DISPLAY "- {finding}"
DISPLAY ""

# 2. Identify gaps/problems that need resolution
DISPLAY "## Vấn đề / Gaps cần giải quyết"
gaps = identify_gaps_and_ambiguities(business_context, domain_kb)
FOR i, gap IN gaps:
    DISPLAY "{i+1}. **{gap.name}** — {gap.why_it_matters}"
DISPLAY ""

# 3. Map the decision roadmap
DISPLAY "## Lộ trình"
DISPLAY "- Interview ({N} câu hỏi) → làm rõ các gaps ở trên"
DISPLAY "- Brainstorm → sinh các phương án giải quyết"
DISPLAY "- Quyết định → chốt từng item với phân tích sâu"
DISPLAY "- Function List → danh sách chức năng cuối cùng"
DISPLAY ""
DISPLAY "Bắt đầu với Interview..."
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## Step 1: Interview

Use the **Read tool** to load `commands/innovate/srs/interview.md` and follow its instructions.

Input: `business_context`, `domain_kb`
Output: `interview_answers` (stored in conversation context)

---

## Step 2: Evidence Synthesis + Gemini

Use the **Read tool** to load `commands/innovate/srs/evidence-synthesis.md` and follow its instructions.

Input: `evidence`, `interview_answers`
Output: `claude_approach`, `gemini_alternatives`

---

## Step 2.5: Big Picture — Decision Overview (MANDATORY)

**BEFORE per-item decisions**, show the landscape of what needs to be decided.

```pseudo
# Extract decision items from both approaches (preview, not full debate yet)
preview_items = extract_decision_items_preview(claude_approach, gemini_alternatives)

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Tổng quan quyết định — SRS Decisions"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""

# 1. What was synthesized
DISPLAY "## Kết quả brainstorm"
DISPLAY "- Claude: {claude_approach.summary}"
IF gemini_alternatives:
    DISPLAY "- Gemini: {gemini_alternatives.summary}"
DISPLAY ""

# 2. Map of decisions needed
DISPLAY "## Cần {LENGTH(preview_items)} quyết định:"
FOR i, item IN preview_items:
    DISPLAY "{i+1}. **{item.name}** — {item.problem_it_solves}"
DISPLAY ""

DISPLAY "Bắt đầu phân tích từng item (self-debate 4-5 rounds trước khi trình bày)..."
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## Step 3: Per-item Decision Loop

Use the **Read tool** to load `commands/innovate/srs/decision-loop.md` and follow its instructions.

Input: `claude_approach`, `gemini_alternatives`
Output: `decisions` (user-approved per item)

---

## Step 4: Function List + Review

Use the **Read tool** to load `commands/innovate/srs/function-list.md` and follow its instructions.

Input: `decisions`
Output: `function_list` (user-reviewed, Core/Supporting/Optional/Excluded)

---

## Step 5: Save + Convention Codes

Use the **Read tool** to load `commands/innovate/srs/save.md` and follow its instructions.

Input: `decisions`, `function_list`
Output: `innovate-srs-selection.md` saved to context directory

---

## State Update

After save completes:
```bash
node core/state/state-manager.js update INNOVATE_SRS
node core/state/state-manager.js update SRS_CREATED
```

**RETURN** control to `innovate.md` router.

---

*INNOVATE/SRS Router — 5 Micro-commands*
*EPS Framework v9.0*
