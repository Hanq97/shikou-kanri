# INNOVATE/TECHNICAL — Part 2 Router (BD+DD Combined)

## Purpose
Router for technical innovation: Architecture (BD) + Implementation (DD) decisions in 1 flow.
Dispatches to 4 micro-commands sequentially via Read tool.

---

## Step 0: Detect Mode

```pseudo
context = load_context()
task_type = context.task_type

IF task_type == "enhancement":
    mode = "delta"
ELSE:
    mode = "full"
```

---

## Step 1: Common Loading

Use the **Read tool** to load `commands/innovate/technical/common.md` and follow its instructions.

Output: `evidence`, `srs_selection`, `gemini_context` loaded into conversation.

---

## Step 1.5: Big Picture — Technical Overview (MANDATORY)

**BEFORE any technical decisions**, paint the full picture so user understands the landscape.

```pseudo
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Bức tranh toàn cảnh — Technical Innovation"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""

# 1. What SRS decided (recap for continuity)
DISPLAY "## SRS Decisions đã chốt"
FOR EACH d IN srs_selection.decisions:
    DISPLAY "- ✓ {d.item}: {d.choice}"
DISPLAY ""

# 2. Technical concerns that need resolution
DISPLAY "## Vấn đề kỹ thuật cần giải quyết"
technical_concerns = analyze_technical_gaps(evidence, srs_selection, mode)
FOR i, concern IN technical_concerns:
    DISPLAY "{i+1}. **{concern.name}** — {concern.why_it_matters}"
DISPLAY ""

# 3. Decision roadmap
DISPLAY "## Lộ trình"
DISPLAY "- Architecture Decisions (BD): pattern, component, data model, integration"
DISPLAY "- Implementation Decisions (DD): API, state, testing, error handling"
DISPLAY "  (DD bị ràng buộc bởi BD — chỉ innovate trong phạm vi BD cho phép)"
DISPLAY ""

IF mode == "delta":
    DISPLAY "⚠️ Enhancement mode: mở rộng existing patterns, KHÔNG thay thế"
    DISPLAY ""

DISPLAY "Bắt đầu với Architecture Decisions..."
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## Step 2: Architecture Decisions [FROM-BD]

Use the **Read tool** to load `commands/innovate/technical/architecture.md` and follow its instructions.

Input: `evidence`, `srs_selection`, `mode`, `gemini_context`
Output: `arch_decisions` (user-approved architecture choices)

---

## Step 3: Implementation Decisions [FROM-DD]

Use the **Read tool** to load `commands/innovate/technical/implementation.md` and follow its instructions.

Input: `evidence`, `srs_selection`, `arch_decisions`, `mode`, `gemini_context`
Output: `impl_decisions` (user-approved OR "confirmed by architecture")

---

## Step 4: Merge + Save

Use the **Read tool** to load `commands/innovate/technical/save.md` and follow its instructions.

Input: `arch_decisions`, `impl_decisions`
Output: `innovate-technical-selection.md` saved to context directory

---

## State Update

After save completes:
```bash
node core/state/state-manager.js update INNOVATE_TECHNICAL
```

**RETURN** control to `innovate.md` router.

---

*INNOVATE/TECHNICAL Router — 4 Micro-commands*
*BD+DD Combined Decisions*
*EPS Framework v9.0*
