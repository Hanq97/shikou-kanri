# /design-review - Automated Design Document Quality Review

**Purpose**: Multi-layer automated quality review for Detail Design documents (BDD + FDD)

**Version**: 1.0.0
**Integration**: Quality Gate G2.5 (future), /plan pre-check

---

## COMMAND DESCRIPTION

The `/design-review` command performs automated quality assessment of Detail Design documents using a 3-layer scoring model:

### Layer 1: Hard Gates (Binary Pass/Fail)
- **Q4 Interface Purity**: No implementation code in design documents
- **Q2 Duplicate IDs**: All IDs must be unique

### Layer 2: Soft Scores (Weighted, threshold >= 90%)
- **Q1 Evidence Traceability** (35%): Sections reference evidence (FR-XXX, BR-XXX, E-XXX)
- **Q3 Bilingual Ratio** (25%): Vietnamese content >= 60%
- **Q5 Decision Alignment** (40%): DD follows approved decisions from BD/SRS/innovate selections

### Layer 3: Informational (No Gate)
- **Q2 Naming Convention**: ID naming pattern compliance (reported only)

**Flow**: Hard Gates → (if pass) → Soft Scores → Aggregate
**If Hard Gate fails**: Soft scores are SKIPPED (not evaluated)

---

## USAGE

### Basic Usage

```bash
/design-review <ddPath>
```

Example:
```bash
/design-review documents/features/MON/FEATURE-BASE-backend-detail-design.md
```

### Advanced Usage with Options

```bash
/design-review <ddPath> [--format=cli|json|markdown] [--threshold=90] [--type=bdd|fdd] [--verbose]
```

Examples:
```bash
# Explicit type override (skip auto-detection)
/design-review path/to/dd.md --type=bdd

# JSON output for tool integration
/design-review path/to/dd.md --format=json

# Custom threshold
/design-review path/to/dd.md --threshold=85

# Verbose mode
/design-review path/to/dd.md --verbose
```

---

## INPUT PARAMETERS

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `ddPath` | string | Yes | - | Path to DD file (relative or absolute) |
| `--format` | string | No | `cli` | Output format: `cli`, `json`, `markdown` |
| `--threshold` | number | No | `90` | Minimum soft score passing threshold (0-100) |
| `--type` | string | No | auto-detect | DD type: `bdd` or `fdd` (overrides filename detection) |
| `--verbose` | boolean | No | `false` | Show detailed dimension breakdown |

---

## EXECUTION WORKFLOW

```pseudo
# Step 1: Parse arguments
ddPath = args[0]
if not ddPath:
  display("Usage: /design-review <ddPath> [--format=cli|json|markdown] [--threshold=90] [--type=bdd|fdd] [--verbose]")
  exit(1)

format = args['--format'] || 'cli'
threshold = parseInt(args['--threshold']) || 90
type = args['--type'] || null
verbose = args['--verbose'] || false

# Step 2: Validate file exists
if not file_exists(ddPath):
  display("DD file not found: {ddPath}")
  exit(1)

# Step 3: Auto-detect context files (for Q5 Decision Alignment)
contextDir = null
innovateBdSelectionPath = null
innovateDdSelectionPath = null
bdPath = null
srsPath = null

try:
  # Try state-manager to find active context
  contextDir = node core/state/state-manager.js findActiveContext()

  if contextDir:
    innovateBdSelectionPath = find("{contextDir}/innovate-bd-selection.md")
    innovateDdSelectionPath = find("{contextDir}/innovate-dd-selection.md")

  # Find BD and SRS from documents/features/
  ddDir = dirname(ddPath)
  bdPath = find("{ddDir}/*-basic-design.md")
  srsPath = find("{ddDir}/*-srs.md")

catch:
  # Context detection is optional — Q5 runs with empty checklist (100%)
  log("Context files not found — Q5 will use empty checklist")

# Step 4: Create engine and run review
engine = new DesignReviewEngine({
  threshold,
  verbose,
  contextDir,
  innovateBdSelectionPath,
  innovateDdSelectionPath,
  bdPath,
  srsPath
})

result = await engine.review(ddPath, { type })

# Step 5: Format and display output
reporter = new DesignReviewReporter({ verbose })

if format == 'cli':
  display(reporter.formatCLI(result))
elif format == 'json':
  display(JSON.stringify(result, null, 2))
elif format == 'markdown':
  display(reporter.formatMarkdown(result))

# Step 6: Display readiness
if result.passed:
  display("")
  display("─────────────────────────────────────────────────────────────")
  display("READY FOR PLANNING")
  display("─────────────────────────────────────────────────────────────")
  display("Next: Run /plan to create implementation plan")
else:
  display("")
  display("─────────────────────────────────────────────────────────────")
  display("NOT READY — Fix issues above before proceeding to /plan")
  display("─────────────────────────────────────────────────────────────")

exit(result.passed ? 0 : 1)
```

---

## OUTPUT FORMATS

### CLI Output (Default)

```
╔══════════════════════════════════════════════════════════════╗
║                   DESIGN REVIEW REPORT                       ║
╚══════════════════════════════════════════════════════════════╝

📄 Design: FEATURE-BASE-backend-detail-design.md
   Type: BDD | 10 sections | 3,245 words | 47 IDs

🔒 HARD GATES:
   Q4 Interface Purity: ✅ PASS (0 violations)
   Q2 Duplicate IDs:    ✅ PASS (0 duplicates)

📊 SOFT SCORES: 92.3% ✅ PASS (threshold: 90%)

   Q1 Evidence Traceability (35%): ████████░░ 85%
   Q3 Bilingual Ratio (25%):      █████████░ 92%
   Q5 Decision Alignment (40%):   █████████░ 96%

   ℹ️  Q2 Naming Convention:       █████████░ 95% (informational)

📝 IMPROVEMENTS (2):
   ⚠️  [high] Section 7 "Performance" has no evidence references
   ℹ️  [medium] 2 IDs don't match expected naming convention

⏱  Execution time: 245ms

─────────────────────────────────────────────────────────────
✅ READY FOR PLANNING
─────────────────────────────────────────────────────────────
```

### Hard Gate Failure Output

```
╔══════════════════════════════════════════════════════════════╗
║                   DESIGN REVIEW REPORT                       ║
╚══════════════════════════════════════════════════════════════╝

📄 Design: FEATURE-BASE-backend-detail-design.md
   Type: BDD | 10 sections | 3,245 words | 47 IDs

🔒 HARD GATES:
   Q4 Interface Purity: ❌ FAIL (5 violations)
   Q2 Duplicate IDs:    ✅ PASS (0 duplicates)

📊 SOFT SCORES: ⏭ SKIPPED (Hard gate failed — soft scores not evaluated)

📝 IMPROVEMENTS (1):
   🔴 [critical] 5 interface purity violations: @Entity, @Table, @Column...

⏱  Execution time: 120ms

─────────────────────────────────────────────────────────────
❌ NOT READY — Fix issues above before proceeding to /plan
─────────────────────────────────────────────────────────────
```

---

## ERROR HANDLING

### File Not Found

```
╔══════════════════════════════════════════════════════════════╗
║                   DESIGN REVIEW REPORT                       ║
╚══════════════════════════════════════════════════════════════╝

📄 Design: missing-file.md

❌ ERROR: DD file not found: missing-file.md
```

### Cannot Detect Type

```
╔══════════════════════════════════════════════════════════════╗
║                   DESIGN REVIEW REPORT                       ║
╚══════════════════════════════════════════════════════════════╝

📄 Design: custom-name.md

❌ ERROR: Cannot detect DD type from filename. Use --type flag.
```

---

## INTEGRATION POINTS

### Quality Gate G2.5 (Future)

```javascript
// Before /plan creates implementation plan, check G2.5:
const { DesignReviewEngine } = require('core/design/design-review-engine.js')

async function checkG25Gate(ddPath) {
  const engine = new DesignReviewEngine({ threshold: 90 })
  const result = await engine.review(ddPath)

  if (!result.readyForPlanning) {
    throw new Error('DD does not meet G2.5 quality gate. Fix issues and re-run /design-review.')
  }

  return result
}
```

### Programmatic Usage

```javascript
const { DesignReviewEngine, DesignReviewReporter } = require('core/design/design-review-engine.js')

// Create engine with context
const engine = new DesignReviewEngine({
  threshold: 90,
  verbose: true,
  innovateBdSelectionPath: 'path/to/innovate-bd-selection.md',
  innovateDdSelectionPath: 'path/to/innovate-dd-selection.md',
  bdPath: 'path/to/basic-design.md',
  srsPath: 'path/to/srs.md'
})

// Run review
const result = await engine.review('path/to/dd.md', { type: 'bdd' })

// Format output
const reporter = new DesignReviewReporter({ verbose: true })
console.log(reporter.formatCLI(result))
```

---

## SCORING MODEL

### Hard Gates (Layer 1)

| Gate | Criteria | Fail Action |
|------|----------|-------------|
| Q4 Interface Purity | No ORM, SQL, Spring, React, TS types in non-pseudo blocks | Overall FAIL, skip soft scores |
| Q2 Duplicate IDs | All IDs unique across document | Overall FAIL, skip soft scores |

### Soft Scores (Layer 2)

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| Q1 Evidence Traceability | 35% | Sections reference FR-XXX, BR-XXX, E-XXX |
| Q3 Bilingual Ratio | 25% | Vietnamese words >= 60% of total |
| Q5 Decision Alignment | 40% | DD follows approved BD/SRS/innovate decisions |

### Informational (Layer 3)

| Dimension | Criteria |
|-----------|----------|
| Q2 Naming Convention | IDs match expected patterns (SVC-XXX, API-XXX, CMP-XXX, etc.) |

### Overall Score Calculation

```
If ANY hard gate fails → overall = 0%, passed = false
Else → overall = (Q1 * 0.35) + (Q3 * 0.25) + (Q5 * 0.40)
       passed = overall >= threshold (default 90%)
```

---

## State Update

After design review completes:

**If PASS (hard gates + soft score >= 90%)**:
```bash
node core/state/state-manager.js update DD_REVIEWED
```
Display: "State: DD_REVIEWED. Ready for /plan."

**If FAIL**:
State stays `DD_CREATED`. User must fix DD and re-run `/design-review`.

---

*Design Review Command v1.0.0*
*EPS Framework - Design Quality Assurance*
