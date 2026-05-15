# INNOVATE/TECHNICAL/COMMON — Loading + Gemini Setup
# [FROM: innovate/bd.md Step 0.0 + innovate/dd.md Step 0.0 — merged]

## Purpose
Load all required documents and setup Gemini context. Runs ONCE for both architecture + implementation.

---

## Step 0.0: Load Required Documents (MANDATORY)

```pseudo
# Load evidence.md
context_dir = detect_context_directory()
evidence = READ(context_dir + "/evidence.md")
IF evidence IS EMPTY:
    DISPLAY "❌ No evidence found. Run /research first."
    STOP

# Load SRS selection (from Part 1)
srs_selection = READ(context_dir + "/innovate-srs-selection.md")
IF srs_selection IS EMPTY:
    DISPLAY "❌ SRS selection not found. Part 1 must complete first."
    STOP

# Load architecture files (if exist in project)
architecture_content = ""
arch_files = GLOB("documents/architecture/*.md") OR GLOB("documents/01-ARCHITECTURE/*.md")
FOR EACH file IN arch_files:
    architecture_content += READ(file) + "\n"

DISPLAY "✅ Documents loaded:"
DISPLAY "   - evidence.md ({evidence.line_count} lines)"
DISPLAY "   - innovate-srs-selection.md"
IF architecture_content:
    DISPLAY "   - Architecture files ({LENGTH(arch_files)} docs)"
```

## Step 0.0.5: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merge research findings with SRS selection context
- Synthesize for architecture + implementation brainstorming

## Step 0.1: Gemini Context Setup (1 time for BD + DD)

```pseudo
# [FROM: innovate/bd.md — Gemini SDK Context Injection]
config = load_external_apis_config()

gemini_context = {
    project: config.name,
    tech_stack: detect_tech_stack(),
    architecture: architecture_content,
    srs: srs_selection,
    evidence: evidence,
    task_type: context.task_type
}

IF config.gemini.api_key:
    DISPLAY "✅ Gemini available for multi-model brainstorming"
ELSE:
    DISPLAY "ℹ️ Gemini unavailable — Claude-only mode"
```

---

## Output

Variables available in conversation context for subsequent micro-commands:
- `evidence` — full evidence.md content
- `srs_selection` — approved SRS approach
- `architecture_content` — project architecture docs
- `gemini_context` — prepared context for Gemini calls

---

## Enforcement Rules Covered
- B04: Architecture files MUST load
- B06: Evidence fusion
- B07: Multi-model Claude + Gemini (setup)

---

**RETURN** to `innovate/technical.md` router.

*[FROM: innovate/bd.md Step 0.0 + dd.md Step 0.0 — merged]*
*Enforcement: B04, B06, B07*
