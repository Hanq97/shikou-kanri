# Section 01: Overview - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Overview section (Section 1) for SRS document.

This section provides purpose, scope, definitions, and references for the SRS document. Consolidates 5 sub-sections: Purpose, Scope (In/Out), Definitions, and References.

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

1. **Section 1.1 Purpose**: Document purpose + intended audience
2. **Section 1.2 Scope**: In-scope features + Out-of-scope items
3. **Section 1.3 Definitions**: Domain terms + abbreviations (5-15 terms)
4. **Section 1.4 References**: Internal + external document references

### MUST Exclude

- ❌ Implementation details (HOW)
- ❌ API endpoint paths
- ❌ Architecture patterns (Event-driven, CQRS, etc.)
- ❌ Technology stack (except in constraints reference)
- ❌ Source code or pseudocode
- ❌ Database schemas

### Format Constraints

- **Length**: 80-120 lines (Full scope)
- **Language**: Vietnamese/Japanese ≥60%
- **Headings**: Vietnamese-first format

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 01-overview.md
# PURPOSE: Generate Overview section (Purpose, Scope, Definitions, References)
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load innovation results
    innovation_path = f".claude/memory-bank/master/{feature_code}/innovation.md"
    IF file_exists(innovation_path):
        context.innovation = read_file(innovation_path)
        context.scope_level = extract_scope_level(context.innovation)
        context.functional_areas = extract_functional_areas(context.innovation)

    # Load evidence files
    evidence_path = f".claude/memory-bank/master/{feature_code}/evidence.md"
    IF file_exists(evidence_path):
        context.evidence = read_file(evidence_path)

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE SECTION 1.1 - PURPOSE
# ────────────────────────────────────────────────────────────

FUNCTION generate_purpose(context):
    output = []

    output.append("## 1. Tổng quan (Overview)\n\n")
    output.append("### 1.1 Mục đích (Purpose)\n\n")

    # Document purpose (1 paragraph, 3-4 sentences)
    output.append(f"Tài liệu này mô tả Software Requirements Specification (SRS) ")
    output.append(f"cho feature **{context.feature_name_vi}** ({context.feature_id}). ")
    output.append(f"Tài liệu định nghĩa functional requirements, non-functional requirements, ")
    output.append(f"user stories, và business rules cần thiết để implement feature này. ")
    output.append(f"Đây là foundation cho các giai đoạn thiết kế (Basic Design, Detail Design) ")
    output.append(f"và implementation.\n\n")

    # Intended audience (bullet list)
    output.append("**Đối tượng đọc (Intended Audience):**\n\n")
    output.append("- **Developers**: Hiểu requirements để implement feature\n")
    output.append("- **Testers**: Tạo test cases dựa trên acceptance criteria\n")
    output.append("- **Business Analysts**: Validate requirements với stakeholders\n")
    output.append("- **Architects**: Design system architecture dựa trên requirements\n")
    output.append("- **Project Managers**: Estimate effort và plan implementation\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE SECTION 1.2 - SCOPE
# ────────────────────────────────────────────────────────────

FUNCTION generate_scope(context):
    output = []

    output.append("### 1.2 Phạm vi (Scope)\n\n")

    # ── 1.2.1 In-Scope ──
    output.append("#### 1.2.1 Trong phạm vi (In-Scope)\n\n")
    output.append("Feature này bao gồm các chức năng sau:\n\n")

    # Generate functional areas from innovation/evidence
    # Format: numbered list with 5-10 items
    FOR i, area IN enumerate(context.functional_areas):
        output.append(f"{i+1}. **{area.name}**: {area.description}\n")

    output.append("\n")

    # ── 1.2.2 Out-of-Scope ──
    output.append("#### 1.2.2 Ngoài phạm vi (Out-of-Scope)\n\n")
    output.append("Các chức năng SAU KHÔNG nằm trong phạm vi feature này:\n\n")

    # Generate out-of-scope items
    # Format: bullet list with rationale
    FOR item IN context.out_of_scope:
        output.append(f"- **{item.name}**: {item.rationale}\n")

    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE SECTION 1.3 - DEFINITIONS
# ────────────────────────────────────────────────────────────

FUNCTION generate_definitions(context):
    output = []

    output.append("### 1.3 Định nghĩa và Viết tắt (Definitions & Abbreviations)\n\n")

    # ── Business Terms ──
    output.append("#### Định nghĩa (Definitions)\n\n")
    output.append("| Thuật ngữ | Định nghĩa |\n")
    output.append("|-----------|------------|\n")

    # Generate domain-specific terms (5-15 terms)
    # Sort alphabetically
    terms = sort_alphabetically(context.domain_terms)
    FOR term IN terms:
        output.append(f"| {term.name} | {term.definition} |\n")

    output.append("\n")

    # ── Abbreviations ──
    output.append("#### Viết tắt (Abbreviations)\n\n")
    output.append("| Viết tắt | Đầy đủ |\n")
    output.append("|----------|--------|\n")

    # Standard abbreviations
    abbreviations = [
        ("AC", "Acceptance Criteria"),
        ("BR", "Business Rule"),
        ("FR", "Functional Requirement"),
        ("NFR", "Non-Functional Requirement"),
        ("SRS", "Software Requirements Specification"),
        ("US", "User Story")
    ]

    # Add feature-specific abbreviations
    abbreviations.extend(context.feature_abbreviations)
    abbreviations = sort_alphabetically(abbreviations)

    FOR abbr, full IN abbreviations:
        output.append(f"| {abbr} | {full} |\n")

    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE SECTION 1.4 - REFERENCES
# ────────────────────────────────────────────────────────────

FUNCTION generate_references(context):
    output = []

    output.append("### 1.4 Tài liệu Tham khảo (References)\n\n")

    # ── Internal Documents ──
    output.append("#### Tài liệu Nội bộ (Internal Documents)\n\n")

    output.append("**Design Documents:**\n")
    output.append(f"- [{context.feature_id}-basic-design.md] - Basic Design Document\n")
    output.append(f"- [{context.feature_id}-frontend-detail-design.md] - Frontend Detail Design\n")
    output.append(f"- [{context.feature_id}-backend-detail-design.md] - Backend Detail Design\n\n")

    output.append("**System Documentation:**\n")
    output.append("- [System Architecture] - 施工管理統合システム Architecture Overview\n")
    output.append("- [API Contracts] - API specifications\n\n")

    # ── External References ──
    output.append("#### Tài liệu Bên ngoài (External References)\n\n")

    output.append("**Industry Standards:**\n")
    output.append("- JIS A 5308:2019 - Ready-mixed concrete (レディーミクストコンクリート)\n")
    output.append("- JIS A 1101 - Slump test for concrete\n")
    output.append("- JIS A 1116 - Method of making test specimens\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 6: GENERATE COMPLETE SECTION
# ────────────────────────────────────────────────────────────

FUNCTION generate_section(feature_code, sub_code):
    # Load context
    context = load_context(feature_code, sub_code)

    # Generate all sub-sections
    section_1_1 = generate_purpose(context)
    section_1_2 = generate_scope(context)
    section_1_3 = generate_definitions(context)
    section_1_4 = generate_references(context)

    # Combine
    result = section_1_1 + section_1_2 + section_1_3 + section_1_4

    RETURN result

# ────────────────────────────────────────────────────────────
# STEP 7: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result):
    issues = []

    # Q1: Evidence-based?
    required_sections = [
        "1.1 Mục đích",
        "1.2 Phạm vi",
        "1.2.1 Trong phạm vi",
        "1.2.2 Ngoài phạm vi",
        "1.3 Định nghĩa",
        "1.4 Tài liệu Tham khảo"
    ]
    FOR section IN required_sections:
        IF NOT contains(result, section):
            issues.append(f"Missing section: {section}")

    # Q2: Consistency check
    # Verify definitions table has 5-15 terms
    definition_count = count_table_rows(result, "Định nghĩa")
    IF definition_count < 5:
        issues.append(f"Too few definitions: {definition_count} (need ≥5)")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "GET /api", "POST /api", "PUT /api", "DELETE /api",
        "PostgreSQL", "Redis", "MongoDB", "NestJS", "React",
        "Event-driven", "Microservices", "CQRS", "Saga",
        "class ", "function ", "interface ", "async "
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    # Q4: Line count check
    line_count = count_lines(result)
    IF line_count < 80 OR line_count > 120:
        issues.append(f"Line count out of range: {line_count} (expected 80-120)")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
## 1. Tổng quan (Overview)

### 1.1 Mục đích (Purpose)

Tài liệu này mô tả Software Requirements Specification (SRS) cho feature **Quản lý Đổ bê tông** (CST-BASE). Tài liệu định nghĩa functional requirements, non-functional requirements, user stories, và business rules cần thiết để implement feature này. Đây là foundation cho các giai đoạn thiết kế (Basic Design, Detail Design) và implementation.

**Đối tượng đọc (Intended Audience):**

- **Developers**: Hiểu requirements để implement feature
- **Testers**: Tạo test cases dựa trên acceptance criteria
- **Business Analysts**: Validate requirements với stakeholders
- **Architects**: Design system architecture dựa trên requirements
- **Project Managers**: Estimate effort và plan implementation

### 1.2 Phạm vi (Scope)

#### 1.2.1 Trong phạm vi (In-Scope)

Feature này bao gồm các chức năng sau:

1. **Casting Specification Management**: Quản lý thông tin lô đổ bê tông (casting spec)
2. **Concrete Data Recording**: Ghi nhận dữ liệu bê tông từ xe trộn (mixer truck)
3. **Quality Testing**: Quản lý các bài test chất lượng (slump, air content, temperature)
4. **Real-time Monitoring**: Giám sát tiến độ đổ bê tông real-time
5. **External Integration**: Tích hợp với Hokuto CSV và it-Concrete API

#### 1.2.2 Ngoài phạm vi (Out-of-Scope)

Các chức năng SAU KHÔNG nằm trong phạm vi feature này:

- **Vibrator Control**: Thuộc VBR module (quản lý thiết bị rung)
- **Report Generation**: Thuộc RPT module (xuất báo cáo Excel/PDF)
- **User Management**: Thuộc AUTH/SET modules (quản lý người dùng)
- **Equipment Maintenance**: Không thuộc phase hiện tại

### 1.3 Định nghĩa và Viết tắt (Definitions & Abbreviations)

#### Định nghĩa (Definitions)

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| Casting Spec | Thông số kỹ thuật của lô đổ bê tông (打設仕様) |
| Concrete Mix | Thành phần trộn bê tông (配合) |
| Slump | Độ sụt của bê tông, đo bằng cm (スランプ) |
| Air Content | Hàm lượng khí trong bê tông, đo bằng % (空気量) |
| Chloride | Hàm lượng clorua trong bê tông (塩化物) |

#### Viết tắt (Abbreviations)

| Viết tắt | Đầy đủ |
|----------|--------|
| AC | Acceptance Criteria |
| BR | Business Rule |
| CST | Casting (module code) |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| SRS | Software Requirements Specification |

### 1.4 Tài liệu Tham khảo (References)

#### Tài liệu Nội bộ (Internal Documents)

**Design Documents:**
- [CST-BASE-basic-design.md] - Basic Design Document
- [CST-BASE-frontend-detail-design.md] - Frontend Detail Design
- [CST-BASE-backend-detail-design.md] - Backend Detail Design

**System Documentation:**
- [System Architecture] - 施工管理統合システム Architecture Overview
- [API Contracts] - API specifications

#### Tài liệu Bên ngoài (External References)

**Industry Standards:**
- JIS A 5308:2019 - Ready-mixed concrete (レディーミクストコンクリート)
- JIS A 1101 - Slump test for concrete
- JIS A 1116 - Method of making test specimens
```

---

*Section 01: Overview - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
