# FDD-00: Document Information Generator v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-00-document-info
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 00 - Document Information
- **Output**: Document metadata (Feature ID, Version, Developer, Date, Technology Stack)
- **Language**: Vietnamese >=60%

---

## Purpose

Generate **Section 00: Document Information** for Frontend Detail Design document.

This section provides metadata about the document: feature identification, version control, authorship, timestamps, references, and technology stack.

**CRITICAL**:
- NO implementation code
- Use current system date for metadata
- Vietnamese content >=60%

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:

| Parameter | Source | Example |
|-----------|--------|---------|
| FEATURE_NAME | ENV | "BNK" |
| SUB_FEATURE | ENV | "BASE" |
| DEVELOPER | ENV | "Developer Name" |

**Context Validation:**

```pseudo
FUNCTION prepare_context():
    context = {
        "feature_name": ENV["FEATURE_NAME"],
        "sub_feature": ENV["SUB_FEATURE"],
        "developer": ENV["DEVELOPER"]
    }

    IF NOT context.feature_name:
        RAISE Error("FEATURE_NAME not provided")
    IF NOT context.sub_feature:
        RAISE Error("SUB_FEATURE not provided")
    IF NOT context.developer:
        RAISE Error("DEVELOPER not provided")

    RETURN context
```

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 00-document-info.md
# PURPOSE: Generate Document Information section
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: GET CURRENT SYSTEM DATE
# ────────────────────────────────────────────────────────────

FUNCTION get_current_date():
    date_str = system.execute("date '+%Y-%m-%d'")

    IF NOT matches_pattern(date_str, "YYYY-MM-DD"):
        raise Error("Invalid date format")

    RETURN date_str

# ────────────────────────────────────────────────────────────
# STEP 2: EXTRACT FEATURE METADATA
# ────────────────────────────────────────────────────────────

FUNCTION extract_feature_metadata(context):
    feature_code = context.feature_name  # e.g., "BNK"
    sub_code = context.sub_feature       # e.g., "BASE"
    feature_id = f"{feature_code}-{sub_code}"

    # LOAD: Feature name from .subfeatures.json
    subfeatures_file = f"documents/features/{feature_code}-*/.subfeatures.json"
    subfeatures_data = json.load(subfeatures_file)

    IF sub_code == "BASE":
        feature_name_vi = subfeatures_data.base.name_vi
    ELSE:
        feature_obj = subfeatures_data.subfeatures.find(s => s.code == sub_code)
        feature_name_vi = feature_obj.name_vi

    IF NOT feature_name_vi:
        feature_name_vi = "[Ten feature - can bo sung]"

    metadata = {
        "feature_id": feature_id,
        "feature_name_vi": feature_name_vi,
        "feature_code": feature_code,
        "sub_code": sub_code
    }

    RETURN metadata

# ────────────────────────────────────────────────────────────
# STEP 3: LOAD REFERENCE DOCUMENTS
# ────────────────────────────────────────────────────────────

FUNCTION load_reference_paths(feature_id):
    feature_dir = feature_id.replace("-", "-").toLowerCase()

    refs = {
        "srs": f"documents/features/{feature_dir}/{feature_id}-srs.md",
        "basic_design": f"documents/features/{feature_dir}/{feature_id}-basic-design.md"
    }

    FOR key, path IN refs:
        IF NOT file_exists(path):
            refs[key] = f"[Chua co - {path}]"

    RETURN refs

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE DOCUMENT INFORMATION SECTION
# ────────────────────────────────────────────────────────────

FUNCTION generate_section(feature_name, sub_feature, developer):
    output = []

    current_date = get_current_date()
    metadata = extract_feature_metadata({
        "feature_name": feature_name,
        "sub_feature": sub_feature
    })
    refs = load_reference_paths(metadata.feature_id)

    # -- Header --
    output.append(f"# Frontend Detail Design: {metadata.feature_name_vi}\n\n")

    # -- Document Information --
    output.append("## Document Information\n\n")
    output.append(f"- **Feature ID**: {metadata.feature_id}\n")
    output.append(f"- **Ten feature**: {metadata.feature_name_vi}\n")
    output.append(f"- **Phien ban**: 1.0.0\n")
    output.append(f"- **Tac gia**: {developer}\n")
    output.append(f"- **Ngay tao**: {current_date}\n")
    output.append(f"- **Ngay cap nhat**: {current_date}\n")
    output.append(f"- **Trang thai**: Draft\n")
    output.append(f"- **Tai lieu tham chieu**:\n")
    output.append(f"  - SRS: [{metadata.feature_id}-srs.md]({refs.srs})\n")
    output.append(f"  - Basic Design: [{metadata.feature_id}-basic-design.md]({refs.basic_design})\n\n")

    # -- Technology Stack --
    output.append("## Technology Stack\n\n")
    output.append("| Layer | Technology | Version |\n")
    output.append("|-------|------------|----------|\n")
    output.append("| **Framework** | React | 18.x |\n")
    output.append("| **Language** | TypeScript | 5.x |\n")
    output.append("| **Build Tool** | Vite | Latest |\n")
    output.append("| **Styling** | Tailwind CSS | 3.x |\n")
    output.append("| **UI State** | Redux Toolkit | Latest |\n")
    output.append("| **Server State** | React Query (TanStack Query) | v5 |\n")
    output.append("| **Forms** | React Hook Form + Zod | Latest |\n")
    output.append("| **Routing** | React Router | v6 |\n")

    # -- Document Purpose --
    output.append("## Muc dich tai lieu\n\n")
    output.append("Tai lieu nay mo ta chi tiet thiet ke giao dien nguoi dung (UI) cho feature ")
    output.append(f"**{metadata.feature_name_vi}** ({metadata.feature_id}), bao gom:\n\n")
    output.append("- **Man hinh**: Danh sach va luong dieu huong giua cac man hinh\n")
    output.append("- **Components**: Dac ta chi tiet cac UI components (simple + complex)\n")
    output.append("- **State Management**: Quan ly trang thai UI (Redux Toolkit) va server state (React Query)\n")
    output.append("- **API Integration**: Danh sach API endpoints ma frontend can (cho Backend Detail Design)\n")
    output.append("- **Error Handling**: Chien luoc xu ly loi va hien thi thong bao\n")
    output.append("- **Responsive Design**: Thiet ke dap ung cho Mobile/Tablet/Desktop\n\n")

    output.append("**Doi tuong su dung**:\n")
    output.append("- Frontend Developers: Implement UI components\n")
    output.append("- Backend Developers: Doc Section 5.1 de thiet ke APIs\n")
    output.append("- QA Engineers: Tham khao de viet test cases\n")
    output.append("- UX/UI Designers: Review implementation\n\n")

    result = "".join(output)
    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: All required fields present?
    required_fields = [
        "Feature ID",
        "Phien ban",
        "Tac gia",
        "Ngay tao",
        "Ngay cap nhat",
        "Technology Stack",
        "Muc dich tai lieu"
    ]

    FOR field IN required_fields:
        IF NOT contains(result, field):
            issues.append(f"Missing required field: {field}")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%} (required >=60%)")

    # Q3: No prohibited content?
    prohibited_patterns = ["class ", "function ", "const ", "import ", "export "]
    FOR pattern IN prohibited_patterns:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited code pattern: {pattern}")

    # Q4: Format constraints?
    line_count = count_lines(result)
    IF line_count < 50 OR line_count > 80:
        issues.append(f"Line count out of range: {line_count} (required 50-80)")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

Returns Section 00 markdown content to orchestrator for assembly.

**Generated Markdown** (50-80 lines):
- Document Information metadata block
- Technology Stack table
- Document Purpose section

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **FEATURE_NAME missing** | ENV not set | Verify orchestrator passes all required ENV |
| **Feature name not found** | .subfeatures.json missing | Check feature directory structure |
| **SRS/BD not found** | Document paths wrong | Verify feature directory and file naming |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **Line count out of range** | Content too short/long | Adjust document purpose detail level |

---

## Notes

### Technology Context

| Aspect | Value |
|--------|-------|
| **Framework** | React 18.x |
| **Language** | TypeScript 5.x |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **State Management** | Redux Toolkit + React Query |
| **Form Handling** | React Hook Form + Zod |
| **Component Pattern** | Functional components with hooks |

### Constraints

**MUST Include**: Feature ID, Vietnamese title, Version, Developer name, Timestamps, Status, References, Technology Stack, Document Purpose

**MUST Exclude**: Implementation code, Hardcoded dates, Empty fields, English-only content

**Format**: 50-80 lines, Vietnamese >=60%, Date format YYYY-MM-DD

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-00-document-info.md) and template (00-document-info.md) into single file
- Removed JIT template loading (dead path)
- Consolidated pseudo-code logic and validation
- Streamlined structure for direct execution

**v1.0 (2025-12-11)**:
- Initial version with JIT loading pattern
- Separate agent and template files

---

*FDD-00: Document Information Generator v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Tailwind CSS*
