# INNOVATE/SRS/EVIDENCE-SYNTHESIS — Claude + Gemini Generation
# [FROM: innovate/srs.md Phase 0 — Steps 0.0 through 0.3]

## Purpose
Synthesize evidence + generate business approach alternatives (Claude inline + Gemini via WebFetch).

## Source
Copy the following sections from `defaults/commands/innovate/srs.md`:
- **Step 0.0**: Load Evidence File (MANDATORY) — lines ~32-57
- **Step 0.0.5**: Evidence Fusion — lines ~60-66
- **Step 0.1**: Synthesize Loaded Evidence — lines ~69-73
- **Step 0.2**: Generate Claude Approach (INLINE) — lines ~75-79
- **Step 0.2.5**: Detect taskType (MANDATORY) — lines ~81-109
- **Step 0.3**: Generate Gemini Approach (WebFetch) — lines ~111-160
- **Output Format** — lines ~162-190

## Adaptation Notes
- Step 0.0: evidence file path changes to `evidence.md` (new format with section tags)
- Step 0.1: synthesize from [SCOPE:SRS] section specifically + interview_answers from previous step
- All other steps: KEEP AS-IS from v1

## Enforcement Rules Covered
- I01: Evidence file MUST load (Read tool, NOT path)
- I02: Evidence fusion skill
- I03: Claude generate approach inline (full context)
- I04: Task type detection (Tier 1-4)
- I05: Gemini via WebFetch (sequential after Claude)

---

**RETURN** to `innovate/srs.md` router.

---

*[FROM: innovate/srs.md Phase 0]*
*Enforcement: I01, I02, I03, I04, I05*
