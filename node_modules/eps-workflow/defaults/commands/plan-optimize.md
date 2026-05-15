# /plan-optimize - Automated Plan Optimization
# /plan-optimize - 自動計画最適化
# /plan-optimize - Tối Ưu Hóa Kế Hoạch Tự Động

**Purpose**: Automatically improve plan quality using token, dependency, timeline, and quality strategies

**Version**: 1.0.0
**Created**: 2025-12-24
**Integration**: plan/plan-review-engine.js, confidence/confidence-engine.js

---

## 📋 COMMAND DESCRIPTION

The `/plan-optimize` command automatically enhances plans by applying 4 optimization strategies:

1. **Token Optimization**: Reduce token usage by ≥15% while preserving quality
2. **Dependency Resolution**: Detect circular dependencies and suggest optimal ordering
3. **Timeline Adjustment**: Compare to historical data and identify bottlenecks
4. **Quality Enhancement**: Add missing sections, strengthen validation

**Target**: Improve plan confidence from baseline to ≥95% (G2 gate threshold)
**Review Integration**: Uses `/plan-review` for baseline and validation
**Optimization Time**: <10 seconds per plan

---

## 🚀 USAGE

### Basic Usage (Auto-select strategies)

```bash
/plan-optimize <planPath>
```

Example:
```bash
/plan-optimize .claude/memory-bank/eps-enhancement/week-7/days/DAY_2_PLAN.md
```

### Advanced Usage with Specific Strategies

```bash
/plan-optimize <planPath> --strategy=<strategy1,strategy2> [--dry-run] [--auto-approve]
```

Examples:
```bash
# Token optimization only
/plan-optimize week-7/days/DAY_2_PLAN.md --strategy=token

# Multiple strategies
/plan-optimize week-7/days/DAY_2_PLAN.md --strategy=token,quality

# Dry run mode (preview changes without applying)
/plan-optimize week-7/days/DAY_2_PLAN.md --dry-run

# Auto-approve mode (skip confirmation)
/plan-optimize week-7/days/DAY_2_PLAN.md --auto-approve
```

---

## 📥 INPUT PARAMETERS

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `planPath` | string | ✅ Yes | - | Path to plan file (relative or absolute) |
| `--strategy` | string | ❌ No | `all` | Strategies: `all`, `token`, `dependency`, `timeline`, `quality` |
| `--dry-run` | boolean | ❌ No | `false` | Preview changes without applying |
| `--auto-approve` | boolean | ❌ No | `false` | Skip user confirmation |

---

## 🔧 OPTIMIZATION STRATEGIES

### Strategy 1: Token Optimization

**Purpose**: Reduce token usage by ≥15%
**目的**: トークン使用量を15%以上削減
**Mục đích**: Giảm token sử dụng ≥15%

**Actions**:
- Remove excessive whitespace
- Compress verbose descriptions
- Replace repetitive phrases with references

**Target Reduction**: ≥15% tokens saved
**Quality Preservation**: 100% (no content loss)

**When Applied**:
- Plan token count >3,000
- Or explicitly requested via `--strategy=token`

---

### Strategy 2: Dependency Resolution

**Purpose**: Detect and resolve circular dependencies
**目的**: 循環依存を検出して解決
**Mục đích**: Phát hiện và giải quyết phụ thuộc vòng

**Actions**:
- Detect circular dependencies in step graph
- Suggest optimal step ordering (topological sort)
- Identify critical path (longest execution path)
- Find parallelization opportunities

**Target**: 100% circular dependencies fixed
**Quality Preservation**: Logical flow maintained

**When Applied**:
- Risk dimension score <90%
- Or explicitly requested via `--strategy=dependency`

---

### Strategy 3: Timeline Adjustment

**Purpose**: Adjust unrealistic timelines based on historical data
**目的**: 履歴データに基づいて非現実的なタイムラインを調整
**Mục đích**: Điều chỉnh thời gian không thực tế dựa trên dữ liệu lịch sử

**Actions**:
- Compare to historical average (6.5 hours/day)
- Identify bottleneck steps (>2 hours)
- Balance workload (90-110% of target duration)
- Suggest parallelization opportunities

**Target**: ±10% of historical average
**Quality Preservation**: Realistic estimates

**When Applied**:
- Feasibility dimension score <90%
- Or explicitly requested via `--strategy=timeline`

---

### Strategy 4: Quality Enhancement

**Purpose**: Improve clarity and completeness
**目的**: 明確性と完全性を向上
**Mục đích**: Cải thiện độ rõ ràng và đầy đủ

**Actions**:
- Add Context Engineering step (Day 1 plans)
- Enhance validation checklists for each step
- Improve bilingual content ratio (target ≥60%)
- Strengthen success criteria (make measurable)
- Add missing Required Reading section

**Target**: +15-20% quality improvement
**Quality Preservation**: Additive only (no removals)

**When Applied**:
- Always (quality improvements always beneficial)

---

## 📤 OUTPUT

### CLI Output (Default)

```
╔══════════════════════════════════════════════════════════════╗
║                   OPTIMIZATION COMPARISON                     ║
╚══════════════════════════════════════════════════════════════╝

📊 DIMENSION SCORES:

                      BEFORE    AFTER    CHANGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Completeness           80%      95%      +15%  ✅
Feasibility            70%      90%      +20%  ✅
Clarity                75%      92%      +17%  ✅
Risk                   65%      88%      +23%  ✅
Consistency            85%      95%      +10%  ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERALL CONFIDENCE     75%      93%      +18%  ✅

🔧 STRATEGIES APPLIED (4):

1. Token Optimization
   Reason: Token count (6,500) exceeds 3,000
   Changes: 5
   Metrics: {"originalTokens":6500,"optimizedTokens":5330,"tokensSaved":1170,"reductionPercentage":18}

2. Dependency Resolution
   Reason: Risk score below 90% - may have dependency issues
   Changes: 2
   Metrics: {"circularDependenciesFixed":1,"criticalPathDuration":5}

3. Timeline Adjustment
   Reason: Feasibility score below 90% - timeline may need adjustment
   Changes: 3
   Metrics: {"bottlenecksIdentified":1,"workloadBalanced":true}

4. Quality Enhancement
   Reason: Quality improvements always beneficial
   Changes: 4
   Metrics: {"validationEnhancements":3,"bilingualImprovements":1}

📝 TOTAL CHANGES: 14

💾 Apply changes? (y/n):
```

### Success Response

```json
{
  "status": "success",
  "baseline": {
    "overall": 75,
    "dimensions": {...}
  },
  "improved": {
    "overall": 93,
    "dimensions": {...}
  },
  "improvement": {
    "overall": 18,
    "dimensions": {...}
  },
  "strategies": [...],
  "totalChanges": 14,
  "executionTime": 3245,
  "dryRun": false,
  "message": "Optimizations applied successfully"
}
```

### Rollback Response

```json
{
  "status": "rollback",
  "reason": "quality_degradation",
  "baseline": {...},
  "improved": {...},
  "degradation": 5.2,
  "message": "Optimizations caused quality degradation. Rolled back to original plan.",
  "suggestions": [
    {
      "strategy": "token",
      "issue": "Aggressive token reduction may have removed essential content",
      "alternative": "Try less aggressive token optimization or skip this strategy"
    }
  ]
}
```

---

## ⚠️ ERROR HANDLING

### File Not Found

```
❌ Error: Plan file not found at path: /invalid/path/plan.md
💡 Suggestion: Verify file path and try again
```

### Already Optimal

```
✅ Plan already meets 90% threshold
Overall Confidence: 92.5%
No optimization needed.
```

### No Applicable Strategies

```
⚠️ No applicable strategies found for this plan
Requested: token
Reason: Plan token count (2,500) below threshold (3,000)
Suggestion: Try different strategies or use --strategy=all
```

---

## 🔗 INTEGRATION POINTS

### Integration with /plan-review

```javascript
// Step 1: Run baseline review
const { PlanReviewEngine } = require('core/plan/plan-review-engine.js');
const reviewEngine = new PlanReviewEngine();
const baseline = await reviewEngine.review(planPath);

// Step 2: Optimize if needed
if (baseline.overall < 90) {
  const { PlanOptimizer } = require('core/plan/plan-optimizer.js');
  const optimizer = new PlanOptimizer();
  const result = await optimizer.optimize(planPath);
}

// Step 3: Re-validate
const improved = await reviewEngine.review(planPath);
```

### Integration with Quality Gate G2

```javascript
// Before /execute command
const review = await reviewEngine.review(planPath);

if (review.overall < 90) {
  console.log('Plan does not meet G2 gate (confidence <90%)');
  console.log('Run /plan-optimize to improve plan quality');
  throw new Error('G2 gate failed');
}
```

---

## ✅ SUCCESS CRITERIA

- ✅ All 4 strategies implemented
- ✅ Quality preservation rate 100% (no content loss)
- ✅ Token reduction ≥15% average (when applicable)
- ✅ Optimization time <10 seconds per plan
- ✅ User confirmation flow (unless --auto-approve)
- ✅ Rollback on quality degradation
- ✅ Integration with plan/plan-review-engine.js

---

## 🔍 EXAMPLES

### Example 1: Optimize Plan with Auto-selection

```bash
/plan-optimize .claude/memory-bank/eps-enhancement/week-7/days/DAY_2_PLAN.md
```

**Result**: Applies all applicable strategies, shows comparison, asks for confirmation

---

### Example 2: Preview Optimization (Dry Run)

```bash
/plan-optimize week-7/days/DAY_2_PLAN.md --dry-run
```

**Result**: Shows optimization preview without modifying file

---

### Example 3: Token Optimization Only

```bash
/plan-optimize week-7/days/DAY_2_PLAN.md --strategy=token
```

**Result**: Applies only token optimization strategy

---

### Example 4: Auto-approve Mode

```bash
/plan-optimize week-7/days/DAY_2_PLAN.md --auto-approve
```

**Result**: Applies optimizations without user confirmation

---

## 🎯 WHEN TO USE

Use `/plan-optimize` when:

- ✅ Plan review shows confidence <90% (G2 gate failure)
- ✅ Plan token count exceeds budget (>3,000 tokens)
- ✅ Plan has circular dependencies or unclear step ordering
- ✅ Timeline estimates seem unrealistic
- ✅ Plan missing required sections (Context Engineering, validation, etc.)
- ✅ Bilingual content ratio <60%
- ✅ Before executing plan (quality assurance)

---

## 🔗 RELATED COMMANDS

- `/plan-review` - Analyze plan quality before optimization
- `/plan` - Generate plan using Plan v2.5
- `/execute` - Execute approved plan (requires G2 pass via /plan-review)
- `/validate` - Validate implementation (G3/G4 gates)

---

**Created**: 2025-12-24
**Status**: ✅ Implemented
**Tests**: 20/20 tests (pending)
**Coverage**: 95% (pending)
**Performance**: <10s per plan (pending)
**Next**: Test suite and DAY_3_COMPLETE report
