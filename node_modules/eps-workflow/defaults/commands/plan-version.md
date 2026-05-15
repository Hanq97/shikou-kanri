# /plan-version - Plan Version Management
# /plan-version - プランバージョン管理
# /plan-version - Quản Lý Phiên Bản Plan

**Purpose**: Complete plan version control with semantic versioning, comparison, and rollback
**Version**: 1.0.0
**Created**: 2025-12-24
**Integration**: plan-version-manager.js, version-comparator.js

---

## 📋 COMMAND DESCRIPTION

The `/plan-version` command provides complete version control for implementation plans with:

1. **Semantic Versioning**: major.minor.patch format with auto-detection
2. **Version History**: Complete metadata and quality tracking
3. **Side-by-Side Comparison**: LCS algorithm for accurate diffs
4. **Safe Rollback**: Validation, backup, and integrity checks

**Key Features**:
- Auto-increment version numbers based on change analysis
- Quality gate integration (only save plans with ≥90% confidence)
- Full version history with timestamps, authors, and rationale
- Impact analysis (timeline, quality, scope changes)
- Rollback with safety validation and automatic backups

---

## 🚀 USAGE

### Subcommands

```bash
/plan-version save <planPath> [options]      # Create new version
/plan-version list <planPath> [options]      # Show version history
/plan-version compare <planPath> <v1> <v2>   # Compare two versions
/plan-version rollback <planPath> <version>  # Restore previous version
```

---

## 📥 COMMAND 1: /plan-version save

**Purpose**: Create new plan version with auto-increment and quality validation

### Syntax

```bash
/plan-version save <planPath> [--type=<type>] [--rationale="<reason>"] [--no-review]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `planPath` | string | ✅ Yes | - | Path to plan file |
| `--type` | string | ❌ No | `auto` | Version type: `major`, `minor`, `patch`, `auto` |
| `--rationale` | string | ❌ No | `"Version update"` | Reason for new version |
| `--no-review` | boolean | ❌ No | `false` | Skip quality review before saving |
| `--author` | string | ❌ No | `"Claude Code"` | Version author |

### Examples

```bash
# Auto-detect version type
/plan-version save .claude/memory-bank/eps-enhancement/week-7/days/DAY_4_PLAN.md

# Specify version type and rationale
/plan-version save week-7/days/DAY_4_PLAN.md --type=minor --rationale="Added Context Engineering step"

# Save without review (not recommended)
/plan-version save week-7/days/DAY_4_PLAN.md --no-review
```

### Output

```
✅ Plan version saved successfully

Version: v1.2.0
Previous: v1.1.5
Type: minor
Quality: 92.5%
Rationale: Added Context Engineering step

Path: .claude/memory-bank/plan-versions/week-7/days/DAY_4_PLAN-v1.2.0.json
```

### Error Handling

```
❌ Quality score too low (85%) - threshold is 90%
💡 Suggestion: Run /plan-optimize to improve plan before saving

Version not saved.
```

---

## 📥 COMMAND 2: /plan-version list

**Purpose**: Show version history with metadata

### Syntax

```bash
/plan-version list <planPath> [--format=<format>] [--limit=<N>] [--sort=<field>]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `planPath` | string | ✅ Yes | - | Path to plan file |
| `--format` | string | ❌ No | `cli` | Output format: `cli`, `json`, `markdown` |
| `--limit` | number | ❌ No | `10` | Max versions to show |
| `--sort` | string | ❌ No | `timestamp` | Sort by: `timestamp`, `quality`, `version` |

### Examples

```bash
# Show last 10 versions (CLI format)
/plan-version list week-7/days/DAY_4_PLAN.md

# Show all versions sorted by quality
/plan-version list week-7/days/DAY_4_PLAN.md --limit=100 --sort=quality

# Export to JSON
/plan-version list week-7/days/DAY_4_PLAN.md --format=json

# Export to markdown table
/plan-version list week-7/days/DAY_4_PLAN.md --format=markdown
```

### Output (CLI Format)

```
📋 VERSION HISTORY: DAY_4_PLAN

v1.2.0 (current) - 2025-12-24T12:30:00Z
   Added Context Engineering step
   Quality: 92.5%

v1.1.5 - 2025-12-24T11:00:00Z
   Enhanced validation checklists
   Quality: 88.0%

v1.1.0 - 2025-12-24T09:00:00Z
   Added timeline adjustment section
   Quality: 85.0%

v1.0.0 - 2025-12-23T16:00:00Z
   Initial version
   Quality: 75.0%
```

---

## 📥 COMMAND 3: /plan-version compare

**Purpose**: Compare two versions with side-by-side diff and impact analysis

### Syntax

```bash
/plan-version compare <planPath> <versionA> <versionB> [--format=<format>] [--verbose]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `planPath` | string | ✅ Yes | - | Path to plan file |
| `versionA` | string | ✅ Yes | - | First version to compare |
| `versionB` | string | ✅ Yes | - | Second version to compare |
| `--format` | string | ❌ No | `summary` | Format: `summary`, `split`, `unified` |
| `--verbose` | boolean | ❌ No | `false` | Show detailed diff |
| `--no-impact` | boolean | ❌ No | `false` | Skip impact analysis |

### Examples

```bash
# Compare two versions (summary)
/plan-version compare week-7/days/DAY_4_PLAN.md 1.1.0 1.2.0

# Side-by-side comparison
/plan-version compare week-7/days/DAY_4_PLAN.md 1.1.0 1.2.0 --format=split

# Unified diff (verbose)
/plan-version compare week-7/days/DAY_4_PLAN.md 1.1.0 1.2.0 --format=unified --verbose
```

### Output (Summary Format)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        VERSION COMPARISON                                 ║
╚══════════════════════════════════════════════════════════════════════════╝

v1.1.0 → v1.2.0

📊 CHANGE STATISTICS:
   Sections added: 1
   Sections deleted: 0
   Sections modified: 3
   Lines added: 45
   Lines deleted: 8

🎯 IMPACT ANALYSIS:
   Timeline: Timeline increased by 1.0h (16.7%) (medium)
   Quality: Quality improved by 7.5% (medium)
   Scope: 4 sections changed (medium)
```

---

## 📥 COMMAND 4: /plan-version rollback

**Purpose**: Restore previous version with safety validation

### Syntax

```bash
/plan-version rollback <planPath> <targetVersion> [--force] [--no-backup] [--reason="<reason>"]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `planPath` | string | ✅ Yes | - | Path to plan file |
| `targetVersion` | string | ✅ Yes | - | Version to rollback to |
| `--force` | boolean | ❌ No | `false` | Skip safety checks |
| `--no-backup` | boolean | ❌ No | `false` | Don't create backup |
| `--reason` | string | ❌ No | `"User requested"` | Rollback reason |

### Examples

```bash
# Rollback to specific version (with validation)
/plan-version rollback week-7/days/DAY_4_PLAN.md 1.1.5

# Force rollback (skip safety checks)
/plan-version rollback week-7/days/DAY_4_PLAN.md 1.1.5 --force

# Rollback without backup (not recommended)
/plan-version rollback week-7/days/DAY_4_PLAN.md 1.1.5 --no-backup
```

### Output (Success)

```
✅ Rollback successful

From: v1.2.0
To: v1.1.5
Backup: .claude/memory-bank/plan-versions/backups/pre-rollback-2025-12-24T12-45-00.json

⚠️ WARNINGS (1):
   - Target version has medium quality score (88%)
   - Consider optimizing after rollback

Plan restored to v1.1.5
```

### Output (Validation Failed)

```
❌ Rollback blocked

Reason: Target version not found
Version: 1.3.0

Suggestions:
- Use /plan-version list to see available versions
- Verify version number format (major.minor.patch)
```

---

## 🔄 SEMANTIC VERSIONING RULES

### Major Version (X.0.0)

**Triggers**:
- Complete plan rewrite
- Architecture change
- Incompatible with previous versions
- Fundamental redesign

**Example**:
```bash
v1.5.2 → v2.0.0  # Complete plan restructure
```

### Minor Version (x.Y.0)

**Triggers**:
- New sections added
- Enhanced steps
- Additional outputs
- New validation criteria
- Context Engineering added

**Example**:
```bash
v1.5.2 → v1.6.0  # Added Step 1.0: Context Engineering
```

### Patch Version (x.y.Z)

**Triggers**:
- Typo corrections
- Clarifications
- Minor corrections
- Formatting fixes
- Reference updates

**Example**:
```bash
v1.5.2 → v1.5.3  # Fixed typos in Step 3
```

### Auto-Detection

When `--type=auto` (default), the system analyzes changes:

```javascript
// Pseudo-code for auto-detection
if (sectionsDeleted > 3 || sectionsAdded > 5) {
    return 'major';  // Significant structural changes
} else if (sectionsAdded > 0) {
    return 'minor';  // New content added
} else {
    return 'patch';  // Small edits
}
```

---

## 🗄️ STORAGE STRUCTURE

```
.claude/memory-bank/plan-versions/
├── metadata.json                           # Global registry
├── [feature]/
│   └── [sub-feature]/
│       ├── metadata.json                   # Feature-specific registry
│       ├── [plan-name]-v1.0.0.json        # Version files
│       ├── [plan-name]-v1.1.0.json
│       ├── [plan-name]-v1.2.0.json
│       └── backups/                        # Rollback backups
│           └── pre-rollback-[timestamp].json
```

### Version File Format

```json
{
  "metadata": {
    "version": "1.2.0",
    "previousVersion": "1.1.5",
    "timestamp": "2025-12-24T12:30:00Z",
    "author": "Claude Code",
    "rationale": "Added Context Engineering step",
    "changeType": "minor",
    "quality_score": 92.5,
    "review_summary": {
      "completeness": 95,
      "feasibility": 90,
      "clarity": 92,
      "risk": 88,
      "consistency": 95
    },
    "contentHash": "sha256:abc123..."
  },
  "content": "# Week 7 Day 4: Plan Versioning System\n..."
}
```

---

## 🔗 INTEGRATION POINTS

### Integration with /save Command

```bash
# Standard /save (no versioning)
/save "Completed Week 7 Day 4"

# Save with automatic versioning
/plan-version save .claude/memory-bank/eps-enhancement/week-7/days/DAY_4_PLAN.md
```

### Integration with /plan-review

```bash
# Review before saving version
/plan-review week-7/days/DAY_4_PLAN.md

# If confidence ≥90%, save version
/plan-version save week-7/days/DAY_4_PLAN.md --rationale="Review passed"
```

### Integration with /plan-optimize

```bash
# Optimize plan
/plan-optimize week-7/days/DAY_4_PLAN.md

# Save optimized version
/plan-version save week-7/days/DAY_4_PLAN.md --type=patch --rationale="Post-optimization"
```

---

## ⚠️ ERROR HANDLING

### Error 1: Low Quality Score

```
❌ Quality score too low (85%) - threshold is 90%
💡 Suggestion: Run /plan-optimize to improve plan before saving
```

### Error 2: Version Not Found

```
❌ Target version not found: v1.3.0
💡 Suggestion: Use /plan-version list to see available versions
```

### Error 3: Rollback Blocked

```
❌ Rollback validation failed

BLOCKER: Target version has breaking changes
- Step 3.0 deleted (critical step)
- 5 dependent steps affected

Resolution: Use --force to override (not recommended)
```

---

## ✅ SUCCESS CRITERIA

- ✅ Version history maintained with full metadata
- ✅ Comparison accuracy 100% (LCS algorithm)
- ✅ Rollback preserves plan integrity (hash validation)
- ✅ Version operations <2 seconds each
- ✅ Quality gate integration (≥90% threshold)
- ✅ Automatic backups before rollback

---

## 🎯 WHEN TO USE

Use `/plan-version` when:

- ✅ Significant plan changes completed (save version)
- ✅ Need to track plan evolution (list history)
- ✅ Compare before/after optimization (compare versions)
- ✅ Execution failed, need to revert (rollback)
- ✅ Collaborative planning (multiple authors)
- ✅ Quality assurance (version tracking with scores)

---

## 🔗 RELATED COMMANDS

- `/plan` - Generate implementation plan (creates initial version)
- `/plan-review` - Analyze plan quality (validates before version save)
- `/plan-optimize` - Improve plan quality (creates new version after optimization)
- `/save` - Save context to memory bank (complements versioning)
- `/recall` - Recall from memory bank (can retrieve specific versions)

---

**Created**: 2025-12-24
**Status**: ✅ Implemented
**Tests**: 20/20 tests (pending)
**Coverage**: 95% (pending)
**Performance**: <2s per operation (pending)
**Next**: Test suite and DAY_4_COMPLETE report
