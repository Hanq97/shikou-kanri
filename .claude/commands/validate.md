---
description: Enter REVIEW mode to validate implementation
---

╔══════════════════════════════════════════════════════════════════╗
║ EXECUTION CONSTRAINTS (MANDATORY — NO EXCEPTIONS)               ║
╠══════════════════════════════════════════════════════════════════╣
║ 1. SEQUENTIAL ONLY — Validate ONE file/dimension at a time.     ║
║    NO parallel validation agents.                                ║
║ 2. TWO-PASS REQUIRED — Pass 1 (per-file) MUST complete          ║
║    before Pass 2 (per-dimension) starts.                         ║
║ 3. CHECKPOINT REQUIRED — Each file/dimension checkpointed        ║
║    before proceeding to next.                                    ║
╚══════════════════════════════════════════════════════════════════╝

---

## Step 0.5: Stack Context Loading v5.4

```bash
node core/cli/ops.js stack-load
```

Parse `cache/ops-result.json` → extract `stackKey`, `variantId`, `language`, `framework`.

---

## Step 0.6: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Expected state: EXECUTED
- If FAIL: STOP — execution must be complete before validation
- If PASS: Continue

```pseudo
design-checkpoint --action skill-gate --skill workflow-state-validator --command validate --result {PASS|FAIL}
```

---

## Step 0.7: Quality Gate G3

Run tests before validation:

```bash
# Backend tests (Java/Spring Boot)
if [ -f "pom.xml" ]; then
  echo "Running backend tests..."
  mvn test -q || echo "❌ BACKEND TESTS FAILED"
fi

# Frontend tests (Next.js)
if [ -f "package.json" ]; then
  echo "Running frontend tests..."
  npm test -- --passWithNoTests || echo "❌ FRONTEND TESTS FAILED"
fi
```

```pseudo
design-checkpoint --action skill-gate --skill quality-gate-G3 --command validate --result {PASS|FAIL}
```

If any check fails, output failure details and STOP.

---

## Step 1: Load Plan + Implementation Context

```pseudo
CONTEXT_DIR = findActiveContext()
PLAN_FILE = ls -t $CONTEXT_DIR/plans/*-implementation-plan.md | head -1
EXEC_STATE_FILE = $CONTEXT_DIR/execution-checkpoints/execution-state.json

# Extract changed files from execution-state.json
changedFiles = []
for step in execState.steps:
  if step.status === 'completed' AND step.files:
    changedFiles.push(...step.files)
changedFiles = deduplicate(changedFiles)

# Fallback: git diff if execution-state lacks files field
if changedFiles.length === 0:
  changedFiles = git diff --name-only HEAD~N HEAD -- '*.java' '*.ts' '*.tsx' '*.js'
```

---

## Step 1.5: RAG Context for Validation

```pseudo
# HippoRAG integration — replaces dead CodeIndexer
HippoRAGService.getInstance('validate', 'dev')
rag.getArchitectureViolations() → known violations

# Non-blocking on failure
```

---

## Step 2: Initialize Enforcement

```pseudo
design-checkpoint --action reset --type validate
design-checkpoint --action skill-reset --command validate

TodoWrite([
  # One entry per changedFile for Pass 1
  # + 2 entries for Pass 2 (Architecture, PlanCompliance)
  # + 1 entry for Aggregate & Report
])
```

---

## PASS 1: Per-File Validation (D4 — per-file specialist check)

For EACH changed file, validate against specialist patterns and architecture rules:

```pseudo
perFileScores = []

for fileIndex = 0 to changedFiles.length - 1:
  file = changedFiles[fileIndex]

  # ─────────────────────────────────────────────────────
  # 1.A: Verify checkpoint
  # ─────────────────────────────────────────────────────
  checkResult = design-checkpoint --action verify --section fileIndex --type validate
  if already completed → skip

  # ─────────────────────────────────────────────────────
  # 1.B: Load specialist
  # ─────────────────────────────────────────────────────
  specialistResult = specialist-load --type code --source-path file \
    --parse-metadata --filter-variant
  specialist = specialistResult.specialists[0] || null
  metadata = specialist?.metadata || null

  # ─────────────────────────────────────────────────────
  # 1.C: Load graph context
  # ─────────────────────────────────────────────────────
  contextResult = design-context --section 0 --type validate --module file
  graphContext = { expectedPatterns, violations }

  # ─────────────────────────────────────────────────────
  # 1.D: Validate against 4 criteria
  # ─────────────────────────────────────────────────────
  fileContent = readFile(file)

  score = {
    naming: 0,       # 20% weight — naming conventions from metadata
    patterns: 0,     # 30% weight — specialist pattern compliance
    architecture: 0, # 25% weight — import rules from metadata
    planCompliance: 0 # 25% weight — file in allowedFiles
  }

  # D.1: Naming Convention (20%)
  if metadata AND metadata.namingConvention:
    score.naming = (actualName matches convention) ? 100 : 50
  else:
    score.naming = 80  # No specialist → partial score

  # D.2: Pattern Compliance (30%)
  if specialist:
    score.patterns = evaluatePatternCompliance(fileContent, specialist.content)
  else:
    score.patterns = 70  # Generic check

  # D.3: Architecture Rules (25%)
  if metadata:
    actualImports = extractImports(fileContent)
    forbiddenImports = metadata.cannotImport || []
    importViolations = actualImports.filter(imp → forbidden)
    score.architecture = violations === 0 ? 100 : max(0, 100 - violations * 25)
  else:
    score.architecture = 80

  # D.4: Plan Compliance (25%)
  score.planCompliance = boundaries.allowedFiles.includes(file) ? 100 : 0

  # ─────────────────────────────────────────────────────
  # Weighted total
  # ─────────────────────────────────────────────────────
  fileScore = round(
    score.naming * 0.20 + score.patterns * 0.30 +
    score.architecture * 0.25 + score.planCompliance * 0.25
  )

  # Variant warning penalty
  if specialist?.variantWarning:
    fileScore = max(fileScore - 10, 0)

  perFileScores.push({ file, fileScore, details: score })

  # ─────────────────────────────────────────────────────
  # Checkpoint complete
  # ─────────────────────────────────────────────────────
  design-checkpoint --action complete --section fileIndex --type validate --file file
  TodoWrite.update(fileIndex, "completed")
```

---

## PASS 2: Per-Dimension Quality Gates (D4 — 1 run per gate)

Pass 2 runs ONCE for the entire suite. It starts ONLY after Pass 1 completes.

```pseudo
dimensionScores = {}

# ─────────────────────────────────────────────────────
# 2.A: Architecture Analyzer (invoke skill)
# ─────────────────────────────────────────────────────
# skill: architecture-analyzer
# Cross-file: dependency direction, layer violations, circular deps
archResult = invoke architecture-analyzer
dimensionScores.architecture = archResult.complianceScore || 0
TodoWrite.update("Architecture", "completed")

# ─────────────────────────────────────────────────────
# 2.B: Plan Compliance Gate (replaces T-COV/T-QUAL)
# ─────────────────────────────────────────────────────
# CHECK 1: Tất cả files trong Plan Section 0.1 đã được tạo/sửa chưa?
plannedFiles = extractFilesFromPlan(planContent, "Section 0.1")
implementedFiles = changedFiles  # từ execution-state.json hoặc git diff
missingFiles = plannedFiles.filter(f => !implementedFiles.includes(f))
fileCompleteness = (plannedFiles.length - missingFiles.length) / plannedFiles.length * 100

# CHECK 2: Tất cả methods trong Plan Section 0.2 đã implement chưa?
plannedMethods = extractMethodsFromPlan(planContent, "Section 0.2")
# Source 1: execution-state.json (steps[].summary tracks completed methods per step)
completedSteps = execState.steps.filter(s => s.status == "completed")
implementedMethods = completedSteps.flatMap(s => s.methods || [])
# Source 2 (fallback): Claude text-search trong file content
if implementedMethods.length == 0:
  for file in implementedFiles:
    fileContent = readFile(file)
    for method in plannedMethods:
      if fileContent contains method.name:
        implementedMethods.push(method.name)
missingMethods = plannedMethods.filter(m => !implementedMethods.includes(m.name))
methodCompleteness = (plannedMethods.length - missingMethods.length) / plannedMethods.length * 100

# CHECK 3: Test files từ Plan Section 3.3 đã được tạo chưa?
plannedTestFiles = extractFilesFromPlan(planContent, "Section 3.3")
existingTestFiles = plannedTestFiles.filter(f => fileExists(f))
testCompleteness = plannedTestFiles.length > 0
  ? existingTestFiles.length / plannedTestFiles.length * 100
  : 100  # Nếu plan không có test files → 100%

# SCORING: files 40% + methods 40% + test files 20%
dimensionScores.planCompliance = round(
  fileCompleteness * 0.40 +
  methodCompleteness * 0.40 +
  testCompleteness * 0.20
)

# REPORT missing items
if missingFiles.length > 0:
  log("⚠️ Missing files: " + missingFiles.join(", "))
if missingMethods.length > 0:
  log("⚠️ Missing methods: " + missingMethods.join(", "))
if plannedTestFiles.length > existingTestFiles.length:
  missingTestFiles = plannedTestFiles.filter(f => !existingTestFiles.includes(f))
  log("⚠️ Missing test files: " + missingTestFiles.join(", "))

TodoWrite.update("PlanCompliance", "completed")

# ─────────────────────────────────────────────────────
# Checkpoint complete Pass 2
# ─────────────────────────────────────────────────────
design-checkpoint --action complete --section pass2 --type validate
```

---

## Step 5: Aggregate Scoring + Report

Combine per-file and per-dimension scores with weighted aggregate:

```pseudo
# ═══════════════════════════════════════════════════════════════
# Weighted aggregate: 60% per-file + 40% per-dimension
# ═══════════════════════════════════════════════════════════════
avgFileScore = avg(perFileScores.map(s → s.fileScore))

aggregateScore = round(
  avgFileScore * 0.60 +
  dimensionScores.architecture * 0.20 +
  dimensionScores.planCompliance * 0.20
)

# ═══════════════════════════════════════════════════════════════
# Generate report via review-reporter.js
# ═══════════════════════════════════════════════════════════════
const ReviewReporter = require('./core/validate/review-reporter.js')
reporter = new ReviewReporter()
report = reporter.generate({
  perFileScores, dimensionScores, aggregateScore,
  feature, changedFiles, timestamp: new Date().toISOString()
})

# Save report
reportPath = `${CONTEXT_DIR}/validation-report.md`
writeFile(reportPath, report)

# Display summary
log("═══════════════════════════════════════════════════════════════")
log("📊 Validation Report")
log("═══════════════════════════════════════════════════════════════")
log("  Per-file average:   " + avgFileScore + "%")
log("  Dimension average:  " + avgDimensionScore + "%")
log("  Aggregate score:    " + aggregateScore + "%")
log("  Result: " + (aggregateScore >= 90 ? "PASS ✅" : "FAIL ❌"))
log("═══════════════════════════════════════════════════════════════")
```

---

## Step 6: Feedback Integration

Emit validation events via the feedback module (correct paths):

```javascript
// FIX [V3]: .claude/utils/feedback → core/feedback
const { EventLogger, getEventBus } = require('./core/feedback/index.js');

const eventBus = getEventBus();
eventBus.emit('validate:complete', {
  feature, aggregateScore, passed: aggregateScore >= 90,
  perFileScores: perFileScores.length, timestamp: new Date().toISOString()
});
```

**Non-blocking**: Feedback logging failures do not interrupt validation.

---

## Step 7: State Transition

Verify all checkpoints and transition state based on aggregate score:

```pseudo
# ═══════════════════════════════════════════════════════════════
# Verify all checkpoints
# ═══════════════════════════════════════════════════════════════
design-checkpoint --action verify-all --type validate
design-checkpoint --action skill-verify --skills "architecture-analyzer,plan-compliance" --mode strict

# ═══════════════════════════════════════════════════════════════
# State transition
# ═══════════════════════════════════════════════════════════════
if aggregateScore >= 90:
  # PASS → transition to VALIDATED (state-manager.js: validate → VALIDATED)
  node core/state/state-manager.js update VALIDATED
  log("═══════════════════════════════════════════════════════════════")
  log("✅ Validation PASSED — state updated to VALIDATED")
  log("═══════════════════════════════════════════════════════════════")
  log("  Score: " + aggregateScore + "% (≥90% threshold)")
  log("  Next: Ready for /test.")
  log("═══════════════════════════════════════════════════════════════")
else:
  # FAIL → stay at EXECUTED
  log("═══════════════════════════════════════════════════════════════")
  log("❌ Validation FAILED — state remains EXECUTED")
  log("═══════════════════════════════════════════════════════════════")
  log("  Score: " + aggregateScore + "% (< 90% threshold)")
  log("  Review report: " + reportPath)
  log("  Fix issues and re-run /validate")
  log("═══════════════════════════════════════════════════════════════")
```

---

## Validation Summary

The `/validate` command performs a **two-pass validation** (D4 decision):

### Pass 1: Per-File Specialist Validation
- Load specialist via `specialist-load --source-path`
- Load graph context via `design-context --type validate`
- Score 4 criteria: naming (20%), patterns (30%), architecture (25%), plan compliance (25%)
- Checkpoint each file completion

### Pass 2: Per-Dimension Quality Gates
- Architecture analyzer — structural compliance check
- Plan Compliance gate — files (40%), methods (40%), test files (20%)
- Runs ONCE for entire suite

### Aggregate
- 60% per-file + 20% architecture + 20% plan compliance
- ≥90% → VALIDATED state transition
- <90% → stays EXECUTED, review report generated

---

## RETURN

Validation complete. Control returns to the calling router (if auto-chained from `/execute`).
If invoked standalone, pipeline ends here.

**DO NOT chain to /test from here.** The caller (execute.md router) handles that decision.

<!-- RETURN to execute.md — router handles auto-chain to /test -->
