# INNOVATE/TECHNICAL/SAVE — Merge BD+DD Decisions + Save

## Purpose
Merge architecture + implementation decisions into `innovate-technical-selection.md`.
User final confirmation. Update evidence + context.

---

## Step 1: Final Summary

```pseudo
DISPLAY ""
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Final Summary — All Technical Decisions"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""

DISPLAY "## Architecture (BD scope):"
DISPLAY ""
DISPLAY "| # | Item | Selected | Source |"
DISPLAY "|---|------|----------|--------|"
FOR EACH d IN arch_decisions.decisions:
    DISPLAY "| {index+1} | {d.item} | {d.choice} | {d.source} |"

DISPLAY ""
DISPLAY "## Implementation (DD scope):"
DISPLAY ""

IF impl_decisions.decisions IS EMPTY:
    DISPLAY "Confirmed by architecture — no additional decisions needed."
ELSE:
    DISPLAY "| # | Item | Selected | Source |"
    DISPLAY "|---|------|----------|--------|"
    FOR EACH d IN impl_decisions.decisions:
        DISPLAY "| {index+1} | {d.item} | {d.choice} | {d.source} |"

DISPLAY ""
DISPLAY "**Total**: {arch_count} architecture + {impl_count} implementation decisions"
```

## Step 2: User Confirmation

```pseudo
DISPLAY ""
DISPLAY "Confirm to save?"
DISPLAY ""
DISPLAY "| Response | Action |"
DISPLAY "|----------|--------|"
DISPLAY "| `confirm` | Save to selection file |"
DISPLAY "| `change [N]` | Go back to item N |"
DISPLAY "| `cancel` | Abort |"

response = WAIT USER_INPUT

SWITCH response:
    CASE "confirm" OR "save" OR "ok":
        GOTO Step 3

    CASE REGEX "^change\s+(\d+)":
        # Return to specific item — router handles re-dispatch
        DISPLAY "Re-running from item {N}..."
        # This is complex in micro-command architecture
        # Simplification: re-run architecture.md or implementation.md
        STOP "Manual re-run: /innovate (will resume from current state)"

    CASE "cancel":
        DISPLAY "❌ Aborted. No changes saved."
        STOP
```

## Step 3: Save Selection File

```pseudo
selection = format_technical_selection({
    inherited_from_srs: extract_srs_summary(srs_selection),
    bd_decisions: arch_decisions,
    dd_decisions: impl_decisions
})

context_dir = detect_context_directory()
WRITE(context_dir + "/innovate-technical-selection.md", selection)

DISPLAY "✅ Saved to innovate-technical-selection.md"
```

### Selection File Format

```markdown
# Innovate Technical Selection: [FEATURE]

## Inherited from SRS (LOCKED)
[SRS decisions reference — from innovate-srs-selection.md]

## BD Decisions (Architecture) [FROM-BD]
| # | Item | Selected | Source |
|---|------|----------|--------|
[architecture decisions table]

## DD Decisions (Implementation) [FROM-DD]
| # | Item | Selected | Source |
|---|------|----------|--------|
[implementation decisions table — or "Confirmed by architecture"]

## Summary
| Category | Count |
|----------|-------|
| Architecture | N |
| Implementation | M |
| Total | N+M |

**Status**: APPROVED
```

## Step 4: Post-Save — Update Evidence + Context (MANDATORY)

```pseudo
# Update evidence.md — add technical decisions section
evidence = READ(context_dir + "/evidence.md")
APPEND evidence WITH:
    "### 2.2 Technical Decisions (updated by /innovate — {DATE})\n"
    "BD: {arch_decisions.summary}\n"
    "DD: {impl_decisions.summary}\n"

# Update context.md — add to decisions log
context = READ(context_dir + "/context.md")
APPEND context decisions_log WITH:
    "| N | INNOVATE_TECHNICAL | Architecture + Implementation | {summary} | — |"
```

---

**RETURN** to `innovate/technical.md` router.

*INNOVATE/TECHNICAL/SAVE — Merge + Save*
*EPS Framework v9.0*
