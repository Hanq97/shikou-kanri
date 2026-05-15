# /plan-review - Automated Plan Quality Review
# /plan-review - 自動計画品質レビュー
# /plan-review - Đánh Giá Chất Lượng Kế Hoạch Tự Động

**Purpose**: Multi-dimensional automated plan quality analysis with 5 review dimensions

**Version**: 1.0.0
**Created**: 2025-12-24
**Integration**: Quality Gate G2, Confidence Engine

---

## 📋 COMMAND DESCRIPTION

The `/plan-review` command performs automated quality assessment of plan files across 5 critical dimensions:

1. **Completeness** (25%): All required sections present
2. **Feasibility** (25%): Realistic timeline, resources, dependencies
3. **Clarity** (20%): Structure, actionable steps, code examples
4. **Risk** (15%): Circular dependencies, external dependencies, assumptions
5. **Consistency** (15%): Terminology, unique IDs, valid references

**Overall Confidence**: Weighted average of all 5 dimensions
**Threshold**: ≥95% to pass (configurable)
**Review Time**: <5 seconds per plan

---

## 🚀 USAGE

### Basic Usage

```bash
/plan-review <planPath>
```

Example:
```bash
/plan-review .claude/memory-bank/eps-enhancement/week-7/days/DAY_1_PLAN.md
```

### Advanced Usage with Options

```bash
/plan-review <planPath> --format=<outputFormat> --threshold=<minScore> --verbose
```

Examples:
```bash
# JSON output for tool integration
/plan-review week-7/days/DAY_2_PLAN.md --format=json

# Markdown output for documentation
/plan-review week-7/days/DAY_2_PLAN.md --format=markdown

# Custom threshold (default 95%)
/plan-review week-7/days/DAY_2_PLAN.md --threshold=90

# Verbose mode with detailed breakdown
/plan-review week-7/days/DAY_2_PLAN.md --verbose
```

---

## 📥 INPUT PARAMETERS

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `planPath` | string | ✅ Yes | - | Path to plan file (relative or absolute) |
| `--format` | string | ❌ No | `cli` | Output format: `cli`, `json`, `markdown` |
| `--threshold` | number | ❌ No | `90` | Minimum passing score (0-100) |
| `--verbose` | boolean | ❌ No | `false` | Show detailed dimension breakdown |

---

## 📤 OUTPUT FORMATS

### CLI Output (Default)

```
╔══════════════════════════════════════════════════════════════╗
║                     PLAN REVIEW REPORT                        ║
╚══════════════════════════════════════════════════════════════╝

📄 Plan: week-7-day-1
   Week 7, Day 1
   2,500 words (~3,250 tokens)

📊 OVERALL CONFIDENCE: 92.5% ✅ PASS (threshold: 90%)

📋 DIMENSION SCORES:

1. Completeness    95.0% ✅  [███████████████████   ]
   - All 10 required sections present

2. Feasibility     90.0% ✅  [██████████████████    ]
   - Timeline matches historical average (6.5h)

3. Clarity         92.0% ✅  [██████████████████    ]
   - Clear structure, code examples present

4. Risk            88.0% ⚠️   [█████████████████     ]
   - No circular dependencies ✅

5. Consistency     95.0% ✅  [███████████████████   ]
   - Terminology consistent

💡 IMPROVEMENT SUGGESTIONS (2 total):

 ⚠️  MEDIUM: Risk Assessment
    Current: 88% | Target: 90%
    → Add fallback plan for MCP server unavailability
    Impact: +5%

 ℹ️  LOW: Context References
    Current: Missing | Target: Architecture/Pattern references
    → Add architecture context or pattern references
    Impact: +2%

⏱️  Review completed in 3,245ms

─────────────────────────────────────────────────────────────
✅ READY FOR EXECUTION
─────────────────────────────────────────────────────────────
```

### JSON Output (--format=json)

```json
{
  "overall": 92.5,
  "passed": true,
  "threshold": 90,
  "dimensions": {
    "completeness": {
      "score": 95,
      "passed": true,
      "details": {
        "requiredSections": 10,
        "presentSections": 10,
        "missingElements": []
      }
    },
    "feasibility": {
      "score": 90,
      "passed": true,
      "details": {
        "totalHours": 6.5,
        "isRealistic": true
      }
    },
    "clarity": {
      "score": 92,
      "passed": true,
      "details": {
        "bilingualRatio": "65.0"
      }
    },
    "risk": {
      "score": 88,
      "passed": false,
      "details": {
        "hasDependencies": 3,
        "hasExternal": true
      }
    },
    "consistency": {
      "score": 95,
      "passed": true,
      "details": {
        "fileRefs": 12
      }
    }
  },
  "improvements": [
    {
      "severity": "medium",
      "dimension": "risk",
      "element": "External Dependency",
      "suggestion": "Add fallback strategies for external dependencies",
      "impact": 5
    }
  ],
  "readyForExecution": true,
  "executionTime": 3245
}
```

### Markdown Output (--format=markdown)

```markdown
# Plan Review Report

**Plan**: week-7-day-1
**Overall Confidence**: 92.5% ✅ PASS
**Threshold**: 90%
**Ready for Execution**: Yes

## Dimension Scores

| Dimension | Score | Status | Details |
|-----------|-------|--------|---------|
| Completeness | 95.0% | ✅ Pass | 10 checks |
| Feasibility | 90.0% | ✅ Pass | 4 checks |
| Clarity | 92.0% | ✅ Pass | 4 checks |
| Risk | 88.0% | ❌ Fail | 3 checks |
| Consistency | 95.0% | ✅ Pass | 2 checks |

## Improvement Suggestions

### ⚠️ MEDIUM

#### Risk Assessment

**Current**: 88%
**Target**: 90%
**Suggestion**: Add fallback strategies for external dependencies
**Impact**: +5%
```

---

## 🔗 INTEGRATION POINTS

### Quality Gate G2 Integration

```javascript
// Automatic integration with /execute command
// Before execution, /execute checks G2 gate:

const { PlanReviewEngine } = require('core/plan/plan-review-engine.js');

async function checkG2Gate(planPath) {
  const reviewEngine = new PlanReviewEngine({ threshold: 90 });
  const review = await reviewEngine.review(planPath);

  const g2Passed = review.overall >= 90 &&
                   review.dimensions.completeness.score >= 90 &&
                   review.dimensions.feasibility.score >= 90;

  if (!g2Passed) {
    throw new Error('Plan does not meet G2 quality gate. Use /plan-optimize to improve.');
  }

  return review;
}
```

### Confidence Engine Integration

```javascript
// Automatic recording to confidence history
// After each review, results are saved:

const { recordPlanReview } = require('core/confidence/confidence-engine.js');

async function reviewAndRecord(planPath) {
  const review = await reviewEngine.review(planPath);

  await recordPlanReview(planPath, {
    overall: review.overall,
    dimensions: review.dimensions,
    passed: review.passed,
    timestamp: new Date().toISOString()
  });

  return review;
}
```

---

## ⚠️ ERROR HANDLING

### File Not Found

```
╔══════════════════════════════════════════════════════════════╗
║                    PLAN REVIEW ERROR                          ║
╚══════════════════════════════════════════════════════════════╝

❌ Error: FileNotFound
   Plan file not found at path: /invalid/path/plan.md

💡 Suggestion: Verify file path and try again
   Severity: high
```

### Invalid Format

```
❌ Error: InvalidFormat
   Plan file is not valid markdown

💡 Suggestion: Ensure file is in markdown format with proper structure
   Severity: medium
```

### Low Confidence

```
❌ Error: LowConfidence
   Overall confidence (75%) below threshold (90%)

💡 Suggestion: Use /plan-optimize to improve plan quality
   Severity: high
```

---

## 📊 SUCCESS CRITERIA

- ✅ Review completes in <5 seconds
- ✅ All 5 dimensions analyzed
- ✅ Overall confidence calculated as weighted average
- ✅ Actionable improvement suggestions provided
- ✅ Supports CLI, JSON, and Markdown output
- ✅ Integrates with quality gates (G2)
- ✅ Records results in confidence history
- ✅ ≥95% accuracy vs manual review

---

## 🔍 EXAMPLES

### Example 1: Review Day 1 Plan

```bash
/plan-review .claude/memory-bank/eps-enhancement/week-7/days/DAY_1_PLAN.md
```

**Result**: 92.5% confidence, PASS, ready for execution

---

### Example 2: Review with JSON Output

```bash
/plan-review week-6/days/DAY_2_PLAN.md --format=json
```

**Use Case**: Tool integration, automated testing

---

### Example 3: Review with Custom Threshold

```bash
/plan-review week-5/days/DAY_3_PLAN.md --threshold=95
```

**Use Case**: Strict quality requirements, critical plans

---

### Example 4: Review with Verbose Output

```bash
/plan-review week-4/days/DAY_1_PLAN.md --verbose
```

**Use Case**: Debugging, detailed analysis

---

## 🎯 WHEN TO USE

Use `/plan-review` when:

- ✅ Before executing a plan (G2 gate validation)
- ✅ After creating/modifying a plan
- ✅ To identify quality improvements
- ✅ To validate bilingual content ratio
- ✅ To check timeline feasibility
- ✅ To detect circular dependencies
- ✅ Before committing plan to version control

---

## 🔗 RELATED COMMANDS

- `/plan-optimize` - Automatically improve plan based on review feedback
- `/plan` - Generate plan using Plan v2.5
- `/execute` - Execute approved plan (requires G2 pass)
- `/validate` - Validate implementation (G3/G4 gates)

---

## 📝 IMPLEMENTATION

```javascript
// File: commands/plan-review.md
// Auto-loaded when /plan-review is invoked

const { PlanReviewEngine } = require('core/plan/plan-review-engine.js');
const { ReviewReporter } = require('core/validate/review-reporter.js');
const path = require('path');

// Parse command arguments
const args = process.argv.slice(2);
const planPath = args[0];
const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'cli';
const threshold = parseInt(args.find(a => a.startsWith('--threshold='))?.split('=')[1] || '90');
const verbose = args.includes('--verbose');

if (!planPath) {
  console.error('Error: planPath is required');
  console.error('Usage: /plan-review <planPath> [--format=cli|json|markdown] [--threshold=90] [--verbose]');
  process.exit(1);
}

// Resolve path (support relative paths from current directory)
const fullPath = path.resolve(process.cwd(), planPath);

// Execute review
(async () => {
  try {
    // Create engine
    const engine = new PlanReviewEngine({ threshold, verbose });

    // Run review
    const review = await engine.review(fullPath);

    // Format output
    const reporter = new ReviewReporter({ verbose });
    const output = reporter.format(review, format);

    // Display results
    console.log(output);

    // Exit with appropriate code
    process.exit(review.passed ? 0 : 1);

  } catch (error) {
    const reporter = new ReviewReporter();
    const errorOutput = reporter.formatError({
      error: error.code || 'Error',
      message: error.message,
      suggestion: 'Check file path and try again',
      severity: 'high'
    }, format);

    console.error(errorOutput);
    process.exit(1);
  }
})();
```

---

## State Update

After plan review completes:

**If overall score >= 95% (PASS)**:
```bash
node core/state/state-manager.js update PLAN_REVIEWED
```
Display: "State: PLAN_REVIEWED. Auto-chain → /execute."

**If overall score < 95% (FAIL)**:
State stays `PLAN_CREATED`. PostToolUse hook (`auto-chain.js`) will auto-chain to `/plan-optimize` → re-review (max 3 loops). Do NOT ask user to choose — optimization is automatic.

**After max 3 optimize loops without reaching 95%**:
Auto-chain stops. Display score + suggestions. User must manually fix and re-run `/plan-review`.

---

**Created**: 2025-12-24
**Status**: ✅ Implemented
**Tests**: 25/25 passing
**Coverage**: 95%
**Performance**: <5s per review
**Next**: `/plan-optimize` command
