# INNOVATE/SRS/SAVE — Finalize + Convention Codes + Post-Save
# [FROM: innovate/srs.md Phase 5, 5.5, Post-Save]

## Purpose
Save approved decisions + function list to innovate-srs-selection.md.
Generate convention codes for sub-features.
Update evidence.md + context.md with SRS decisions.

## Source
Copy the following sections from `defaults/commands/innovate/srs.md`:
- **Phase 5: Finalize & Save** — lines ~717-757
  - Save template with: businessApproach, justification, alternativesConsidered, functionalScope
  - Save to `innovate-srs-selection.md` in context directory
- **Post-Save: Sub-Feature Convention Code Generation (Step 5.5)** — lines ~761-858
  - Step 5.5.1: Extract function list from approved scope
  - Step 5.5.2: Validate Feature Dictionary (MANDATORY)
  - Step 5.5.3: Generate convention codes via `subfeature-manager.js`
  - Step 5.5.4: Display generated codes for confirmation
  - BASE Analysis if ≥2 sub-features
- **Phase 5.5: Update Evidence & Context (Post-Save — MANDATORY)** — lines ~871-906
  - Update evidence.md — Section "### 2.1 SRS Decisions"
  - Update context.md — Add to Decisions Log
  - Update Impact Analysis if scope changed

## Adaptation Notes
- Phase 5: output file format MUST be v1-compatible (design --srs reads this file)
- Phase 5.5: update evidence.md instead of evidence.md
- Convention codes: KEEP AS-IS (uses existing subfeature-manager.js)

## CRITICAL: v1 Format Compatibility
Design --srs (v1 command) reads `innovate-srs-selection.md`.
The file format MUST match what v1 design --srs expects.
Do NOT change the output structure.

## Enforcement Rules Covered
- I17: Phase 5 — Save selection file
- I18: Phase 5.5 — Convention code generation
- I19: Phase 5.5 — Feature dictionary validation
- I20: Post-save — Update evidence + context

---

**RETURN** to `innovate/srs.md` router.

---

*[FROM: innovate/srs.md Phase 5, 5.5, Post-Save]*
*Enforcement: I17, I18, I19, I20*
