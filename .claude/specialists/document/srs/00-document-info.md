# Section 00: Document Information - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Document Information section for SRS document.

This section provides metadata about the document: feature identification, version control, authorship, timestamps, scope level, and expected metrics.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Domain** | Civil Engineering / Tunnel Construction |
| **Documentation** | Bilingual (Japanese/Vietnamese/English) |
| **Format** | Markdown with Vietnamese ≥60% |

---

## Constraints

### MUST Include

1. **Feature ID**: `[FEATURE]-[SUB]` format (e.g., CST-BASE, MON-RTMS)
2. **Vietnamese title**: Tên feature bằng tiếng Việt / 日本語
3. **Version**: Semantic versioning (1.0.0)
4. **Author name**: Tác giả chính
5. **Timestamps**: Ngày tạo, Ngày cập nhật (current system date YYYY-MM-DD)
6. **Status**: Draft/Review/Approved
7. **Scope Level**: Core/Full/Premium với expected metrics
8. **References**: Links to related design documents

### MUST Exclude

- ❌ Implementation code
- ❌ Hardcoded dates (must use current system date)
- ❌ Empty fields
- ❌ English-only content (Vietnamese/Japanese ≥60%)
- ❌ Architecture patterns or technology stack

### Format Constraints

- **Length**: 30-50 lines
- **Language**: Vietnamese/Japanese (document metadata) + English (technical terms)
- **Date Format**: YYYY-MM-DD

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 00-document-info.md
# PURPOSE: Generate Document Information section for SRS
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: GET CURRENT SYSTEM DATE
# ────────────────────────────────────────────────────────────

FUNCTION get_current_date():
    # EXECUTE: Get system date
    date_str = system.execute("date '+%Y-%m-%d'")

    # VALIDATE: Date format correct
    IF NOT matches_pattern(date_str, "YYYY-MM-DD"):
        raise Error("Invalid date format")

    RETURN date_str

# ────────────────────────────────────────────────────────────
# STEP 2: EXTRACT FEATURE METADATA
# ────────────────────────────────────────────────────────────

FUNCTION extract_feature_metadata(context):
    # PARSE: Feature information
    feature_code = context.feature_name  # e.g., "CST"
    sub_code = context.sub_feature       # e.g., "BASE"
    feature_id = f"{feature_code}-{sub_code}"

    # LOAD: Feature name from innovation.md or evidence files
    innovation_file = f".claude/memory-bank/master/{feature_code}/innovation.md"

    IF file_exists(innovation_file):
        feature_name_vi = extract_from_innovation(innovation_file, "feature_name_vi")
        scope_level = extract_from_innovation(innovation_file, "scope_level")
    ELSE:
        feature_name_vi = "[Tên feature - cần bổ sung]"
        scope_level = "Full"

    metadata = {
        "feature_id": feature_id,
        "feature_name_vi": feature_name_vi,
        "feature_code": feature_code,
        "sub_code": sub_code,
        "scope_level": scope_level
    }

    RETURN metadata

# ────────────────────────────────────────────────────────────
# STEP 3: DETERMINE EXPECTED METRICS BY SCOPE LEVEL
# ────────────────────────────────────────────────────────────

FUNCTION get_expected_metrics(scope_level):
    metrics = {
        "Core": {
            "frs": "15-20",
            "nfrs": "5-8",
            "user_stories": "10-15",
            "business_rules": "5-10"
        },
        "Full": {
            "frs": "40-50",
            "nfrs": "12-18",
            "user_stories": "30-40",
            "business_rules": "15-25"
        },
        "Premium": {
            "frs": "80-100",
            "nfrs": "25+",
            "user_stories": "60-80",
            "business_rules": "30-50"
        }
    }

    RETURN metrics[scope_level]

# ────────────────────────────────────────────────────────────
# STEP 4: LOAD REFERENCE DOCUMENTS
# ────────────────────────────────────────────────────────────

FUNCTION load_reference_paths(feature_id):
    # CONSTRUCT: Document paths
    feature_dir = feature_id.toLowerCase()

    refs = {
        "basic_design": f"documents/features/{feature_dir}/{feature_id}-basic-design.md",
        "frontend_dd": f"documents/features/{feature_dir}/{feature_id}-frontend-detail-design.md",
        "backend_dd": f"documents/features/{feature_dir}/{feature_id}-backend-detail-design.md"
    }

    # VALIDATE: Files exist
    FOR key, path IN refs:
        IF NOT file_exists(path):
            refs[key] = f"[Chưa có - {path}]"

    RETURN refs

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE DOCUMENT INFORMATION SECTION
# ────────────────────────────────────────────────────────────

FUNCTION generate_section(feature_name, sub_feature, author):
    output = []

    # Get system date
    current_date = get_current_date()

    # Extract metadata
    metadata = extract_feature_metadata({
        "feature_name": feature_name,
        "sub_feature": sub_feature
    })

    # Get expected metrics
    expected_metrics = get_expected_metrics(metadata.scope_level)

    # Load references
    refs = load_reference_paths(metadata.feature_id)

    # ── Header ──
    output.append(f"# {metadata.feature_name_vi} - Software Requirements Specification\n\n")

    # ── Document Information ──
    output.append("## Thông tin Tài liệu (Document Information)\n\n")

    output.append(f"- **Feature ID**: {metadata.feature_id}\n")
    output.append(f"- **Tên feature**: {metadata.feature_name_vi}\n")
    output.append(f"- **Phiên bản**: 1.0.0\n")
    output.append(f"- **Tác giả**: {author}\n")
    output.append(f"- **Ngày tạo**: {current_date}\n")
    output.append(f"- **Ngày cập nhật**: {current_date}\n")
    output.append(f"- **Trạng thái**: Draft\n\n")

    # ── Scope Level ──
    output.append("## Phạm vi (Scope Level)\n\n")
    output.append(f"- **Scope Level**: {metadata.scope_level}\n")
    output.append(f"- **Expected Metrics**:\n")
    output.append(f"  - Functional Requirements: {expected_metrics.frs}\n")
    output.append(f"  - Non-Functional Requirements: {expected_metrics.nfrs}\n")
    output.append(f"  - User Stories: {expected_metrics.user_stories}\n")
    output.append(f"  - Business Rules: {expected_metrics.business_rules}\n\n")

    # ── References ──
    output.append("## Tài liệu Tham chiếu (References)\n\n")
    output.append(f"- Basic Design: [{metadata.feature_id}-basic-design.md]({refs.basic_design})\n")
    output.append(f"- Frontend DD: [{metadata.feature_id}-frontend-detail-design.md]({refs.frontend_dd})\n")
    output.append(f"- Backend DD: [{metadata.feature_id}-backend-detail-design.md]({refs.backend_dd})\n\n")

    # Combine output
    result = "".join(output)

    RETURN result

# ────────────────────────────────────────────────────────────
# STEP 6: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result):
    issues = []

    # Q1: All required fields present?
    required_fields = [
        "Feature ID",
        "Phiên bản",
        "Tác giả",
        "Ngày tạo",
        "Ngày cập nhật",
        "Scope Level",
        "Expected Metrics"
    ]

    FOR field IN required_fields:
        IF NOT contains(result, field):
            issues.append(f"Missing required field: {field}")

    # Q2: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%} (required ≥60%)")

    # Q3: No prohibited content?
    prohibited_patterns = [
        "class ", "function ", "const ", "import ", "export ",
        "PostgreSQL", "Redis", "NestJS", "React",
        "Event-driven", "Microservices", "CQRS"
    ]
    FOR pattern IN prohibited_patterns:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    # Q4: Format constraints?
    line_count = count_lines(result)
    IF line_count < 30 OR line_count > 50:
        issues.append(f"Line count out of range: {line_count} (required 30-50)")

    # Return validation result
    IF issues.length > 0:
        RETURN {
            "valid": False,
            "issues": issues
        }
    ELSE:
        RETURN {
            "valid": True,
            "issues": []
        }
```

---

## Output Format Example

```markdown
# Quản lý Đổ bê tông - Software Requirements Specification

## Thông tin Tài liệu (Document Information)

- **Feature ID**: CST-BASE
- **Tên feature**: Quản lý Đổ bê tông (Casting Management)
- **Phiên bản**: 1.0.0
- **Tác giả**: Development Team
- **Ngày tạo**: 2026-01-05
- **Ngày cập nhật**: 2026-01-05
- **Trạng thái**: Draft

## Phạm vi (Scope Level)

- **Scope Level**: Full
- **Expected Metrics**:
  - Functional Requirements: 40-50
  - Non-Functional Requirements: 12-18
  - User Stories: 30-40
  - Business Rules: 15-25

## Tài liệu Tham chiếu (References)

- Basic Design: [CST-BASE-basic-design.md](documents/features/cst-base/CST-BASE-basic-design.md)
- Frontend DD: [CST-BASE-frontend-detail-design.md](documents/features/cst-base/CST-BASE-frontend-detail-design.md)
- Backend DD: [CST-BASE-backend-detail-design.md](documents/features/cst-base/CST-BASE-backend-detail-design.md)
```

---

*Section 00: Document Information - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
