# BDD Micro-Agent: Document Information (Section 00)

## Agent Identity
- **ID**: bdd-00-document-info
- **Section**: 00 - Document Information
- **Output Lines**: 80-120
- **Version**: 4.1 (Added §0.5 Implementation Patterns)
- **Scope**: Document metadata, version tracking, related documents, change log

## Purpose
Generate document metadata section for Backend Detail Design. This merged file contains both agent instructions and template pseudo-code logic.

## Prerequisites / Context Loading

```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME    # e.g., "LND"
sub_feature = ENV.SUB_FEATURE      # e.g., "BASE"
developer = ENV.DEVELOPER           # e.g., "Developer Name"
```

## Pseudo-Code Logic

```pseudo
# FUNCTION: generate_document_info()
# Purpose: Generate document metadata section
# Returns: Document header with metadata

FUNCTION generate_document_info():
    # STEP 1: Load context from environment
    feature_name = ENV.FEATURE_NAME    # e.g., "LND"
    sub_feature = ENV.SUB_FEATURE      # e.g., "BASE"
    developer = ENV.DEVELOPER           # e.g., "Developer Name"

    # STEP 2: Get git information
    branch = git.branch_current()
    commit_hash = git.log("--format=%h", "-1")  # Short hash
    commit_date = git.log("--format=%cd", "--date=short", "-1")

    # STEP 3: Get current system date/time
    current_date = date("+%Y-%m-%d")
    current_time = date("+%Y-%m-%d %H:%M:%S")

    # STEP 4: Build feature path
    feature_path = f"documents/features/{feature_name}-{sub_feature}"

    # STEP 5: Generate document metadata
    output = f"""# {feature_name} - Backend Detail Design

## Document Information

- **Feature ID**: {feature_name}-{sub_feature}
- **Feature Name**: [Auto-extracted from SRS Section 1.1]
- **Document Type**: Backend Detail Design
- **Version**: 1.0
- **Status**: Draft
- **Created Date**: {current_date}
- **Last Updated**: {current_time}
- **Developer**: {developer}
- **Git Branch**: {branch}
- **Git Commit**: {commit_hash} ({commit_date})

## Related Documents

- **SRS**: [{feature_name}-{sub_feature}-srs.md](./{feature_name}-{sub_feature}-srs.md)
- **Basic Design**: [{feature_name}-{sub_feature}-basic-design.md](./{feature_name}-{sub_feature}-basic-design.md)
- **Frontend DD**: [{feature_name}-{sub_feature}-frontend-detail-design.md](./{feature_name}-{sub_feature}-frontend-detail-design.md)
- **API Contracts**: [{feature_name}-{sub_feature}-api-contracts.md](./{feature_name}-{sub_feature}-api-contracts.md) (extracted from Section 03)

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {current_date} | {developer} | Initial creation |

---
"""

    # STEP 5.5: Generate §0.5 Implementation Patterns (from project-config.json)
    # Fallback safe: nếu implementationPatterns không có → skip §0.5
    config_path = ".claude/config/project-config.json"
    IF file_exists(config_path):
        config = read_json(config_path)
        source_root = config.sourceRoots[0] IF config.sourceRoots ELSE NULL

        IF source_root AND source_root.implementationPatterns:
            patterns = source_root.implementationPatterns
            IF LENGTH(patterns) > 0:
                output += "\n## 0.5 Implementation Patterns (from project-config.json)\n\n"
                output += "> Auto-generated. Áp dụng cho TẤT CẢ modules."
                output += " Source: project-config.json#implementationPatterns.\n\n"
                FOR EACH key, value IN patterns:
                    output += "- **{key}**: {value}\n"
                output += "\n---\n"

    RETURN output
```

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] All metadata fields present (Feature ID, Name, Version, Status, Dates, Developer, Git info)?
- [ ] Related documents section includes all 4 references (SRS, BD, FDD, API Contracts)?
- [ ] Version history table initialized?

### Q2: Consistency?
- [ ] Feature ID matches pattern `{FEATURE}-{SUB}` (e.g., LND-BASE)?
- [ ] Git information accurate (branch, commit hash, date)?
- [ ] Date/time stamps use current system time?

### Q3: Vietnamese >=60%?
- [ ] This section is metadata - Vietnamese requirement = N/A
- [ ] However, "Document Type", "Status", "Related Documents" should use Vietnamese labels if needed

### Q4: No Prohibited Content?
- [ ] Zero implementation code (only metadata)
- [ ] Zero TypeORM decorators
- [ ] Zero SQL DDL
- [ ] Only document information

## Output Format

**Format**: Markdown section (80-120 lines)

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Git info unavailable** | Not in git repo | Use placeholders or skip git section |
| **Date/time format error** | System date command failed | Use ISO 8601 format fallback |
| **Missing context** | ENV vars not set | Require feature_name, sub_feature, developer |

## Notes

- This template generates the document header ONLY
- Feature name should be auto-extracted from SRS Section 1.1 if available
- If git info unavailable (e.g., not in git repo), use placeholders
- Date/time must use system time, NOT hardcoded values
- Other agents append their sections after this
- If `project-config.json` contains `sourceRoots[0].implementationPatterns`,
  Section 0.5 is auto-generated with inline bullet list of pattern rules.
  If key is missing or empty → §0.5 is skipped (fallback safe).

## Change Log

**v4.1 (2026-03-16)**:
- Added STEP 5.5: §0.5 Implementation Patterns auto-generation from project-config.json
- Reads `sourceRoots[0].implementationPatterns` → inline bullet list in BDD output
- Fallback safe: missing or empty patterns → §0.5 skipped

**v4.0 (2026-03-13)**:
- Merged agent + template into single file
- Removed dead template path references
- Removed JIT Template Loading pattern
- Inline pseudo-code logic and Q1-Q4 validation

**v3.0 (2025-12-13)**:
- Migrated to JIT template loading pattern

**v2.0 (Previous)**:
- Language-agnostic approach

---

*BDD Micro-Agent: Document Information - v4.0 (Merged)*
