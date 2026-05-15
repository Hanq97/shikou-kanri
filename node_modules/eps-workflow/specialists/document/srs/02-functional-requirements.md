# Section 02: Functional Requirements - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Functional Requirements section (Section 2) for SRS document.

This section defines WHAT the system must do - all functional capabilities grouped by functional areas with proper FR IDs, priorities, dependencies, and business rules.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Domain** | Civil Engineering / Tunnel Construction |
| **Focus** | WHAT system does (not HOW) |
| **Traceability** | FR → Basic Design Components |

---

## Constraints

### MUST Include

1. **FR ID Format**: `FR-[FEATURE]-[SUB]-[###]` (e.g., FR-CST-BASE-001)
2. **Grouped by Functional Areas**: 3-6 functional areas
3. **Each FR has**: Description, Priority, Dependencies, Business Rules, Acceptance Criteria
4. **Business Rules**: `BR-###` format with measurable rules
5. **Priority Levels**: High/Medium/Low aligned with scope level

### MUST Exclude

- ❌ Implementation details (HOW to implement)
- ❌ API endpoint paths
- ❌ Architecture patterns
- ❌ Technology stack
- ❌ Source code, SQL, pseudocode
- ❌ Database schemas

### FR Count by Scope Level

| Scope | High Priority | Medium Priority | Low Priority | Total |
|-------|---------------|-----------------|--------------|-------|
| **Core** | 10-15 | 3-5 | 0-2 | 15-20 |
| **Full** | 25-35 | 10-15 | 0-5 | 40-50 |
| **Premium** | 50-70 | 20-30 | 5-10 | 80-100 |

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 02-functional-requirements.md
# PURPOSE: Generate Functional Requirements section
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT AND DETERMINE FR COUNT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load innovation results for scope level
    innovation = read_file(f".claude/memory-bank/master/{feature_code}/innovation.md")
    context.scope_level = extract_scope_level(innovation)
    context.functional_areas = extract_functional_areas(innovation)

    # Load evidence for requirements
    evidence = read_file(f".claude/memory-bank/master/{feature_code}/evidence.md")
    context.requirements = extract_requirements(evidence)

    # Determine FR count based on scope
    fr_counts = {
        "Core": {"total": 15-20, "high": 10-15, "medium": 3-5, "low": 0-2},
        "Full": {"total": 40-50, "high": 25-35, "medium": 10-15, "low": 0-5},
        "Premium": {"total": 80-100, "high": 50-70, "medium": 20-30, "low": 5-10}
    }
    context.fr_targets = fr_counts[context.scope_level]

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: ORGANIZE FUNCTIONAL AREAS
# ────────────────────────────────────────────────────────────

FUNCTION organize_functional_areas(context):
    areas = []

    # Group requirements by functional area
    # Example areas for CST (Casting):
    # - Casting Specification Management
    # - Concrete Data Recording
    # - Quality Testing
    # - Real-time Monitoring
    # - External Integration

    FOR requirement IN context.requirements:
        area = determine_functional_area(requirement)
        IF area NOT IN areas:
            areas.append(area)

    # Ensure 3-6 functional areas
    IF len(areas) < 3:
        raise Error("Too few functional areas")
    IF len(areas) > 6:
        consolidate_areas(areas)

    RETURN areas

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE FR FOR EACH REQUIREMENT
# ────────────────────────────────────────────────────────────

FUNCTION generate_fr(fr_number, requirement, feature_code, sub_code):
    fr_id = f"FR-{feature_code}-{sub_code}-{fr_number:03d}"

    fr = {
        "id": fr_id,
        "title": requirement.title,
        "description": generate_description(requirement),
        "priority": determine_priority(requirement),
        "dependencies": find_dependencies(requirement),
        "business_rules": extract_business_rules(requirement),
        "acceptance_criteria": generate_acceptance_criteria(requirement)
    }

    RETURN fr

FUNCTION generate_description(requirement):
    # Vietnamese-first format with modal verbs
    modal_verbs = {
        "High": "phải",      # MUST
        "Medium": "cần",     # SHOULD
        "Low": "có thể"      # MAY
    }

    description = f"Hệ thống {modal_verbs[requirement.priority]} "
    description += f"{requirement.capability_vi} ({requirement.capability_en})."

    RETURN description

FUNCTION determine_priority(requirement):
    # High: Core functionality, compliance
    IF requirement.is_core OR requirement.is_compliance:
        RETURN "High"

    # Medium: Important but not critical
    IF requirement.is_important:
        RETURN "Medium"

    # Low: Nice to have
    RETURN "Low"

# ────────────────────────────────────────────────────────────
# STEP 4: FORMAT OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION format_section(areas, frs):
    output = []

    output.append("## 2. Yêu cầu Chức năng (Functional Requirements)\n\n")

    area_number = 1
    FOR area IN areas:
        output.append(f"### 2.{area_number} {area.name_vi} ({area.name_en})\n\n")

        FOR fr IN frs.filter(f => f.area == area):
            output.append(format_fr(fr))

        area_number += 1

    RETURN "".join(output)

FUNCTION format_fr(fr):
    output = []

    # Header
    output.append(f"#### {fr.id}: {fr.title}\n\n")

    # Description
    output.append(f"**Mô tả (Description):**\n")
    output.append(f"{fr.description}\n\n")

    # Priority
    output.append(f"**Mức độ ưu tiên (Priority):** {fr.priority}\n\n")

    # Dependencies
    IF fr.dependencies.length > 0:
        output.append("**Phụ thuộc (Dependencies):**\n")
        FOR dep IN fr.dependencies:
            output.append(f"- **{dep.fr_id}**: {dep.description}\n")
        output.append("\n")

    # Business Rules
    IF fr.business_rules.length > 0:
        output.append("**Quy tắc nghiệp vụ (Business Rules):**\n")
        FOR br IN fr.business_rules:
            output.append(f"- **{br.id}**: {br.rule}\n")
        output.append("\n")

    # Acceptance Criteria
    output.append("**Tiêu chí chấp nhận (Acceptance Criteria):**\n")
    FOR ac IN fr.acceptance_criteria:
        output.append(f"- {ac}\n")
    output.append("\n---\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: FR count matches scope level?
    fr_count = count_frs(result)
    target = context.fr_targets.total
    IF fr_count < target.min OR fr_count > target.max:
        issues.append(f"FR count {fr_count} not in range {target}")

    # Q2: Consistency - FR IDs unique and sequential?
    fr_ids = extract_fr_ids(result)
    IF has_duplicates(fr_ids):
        issues.append("Duplicate FR IDs found")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "GET /api", "POST /api", "PUT /api", "DELETE /api",
        "PostgreSQL", "Redis", "MongoDB", "SQL Server",
        "NestJS", "React", "SignalR",
        "Event-driven", "Microservices", "CQRS", "Saga",
        "class ", "function ", "interface ", "async ",
        "SELECT ", "INSERT ", "UPDATE ", "DELETE ", "CREATE TABLE"
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    # Q4: Each FR has required fields?
    FOR fr IN extract_frs(result):
        IF NOT has_field(fr, "Mô tả"):
            issues.append(f"{fr.id} missing Description")
        IF NOT has_field(fr, "Mức độ ưu tiên"):
            issues.append(f"{fr.id} missing Priority")
        IF NOT has_field(fr, "Tiêu chí chấp nhận"):
            issues.append(f"{fr.id} missing Acceptance Criteria")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
## 2. Yêu cầu Chức năng (Functional Requirements)

### 2.1 Quản lý Lô Đổ (Casting Specification Management)

#### FR-CST-BASE-001: Tạo Lô Đổ Bê tông

**Mô tả (Description):**
Hệ thống phải cho phép tạo mới lô đổ bê tông (casting specification) với đầy đủ thông tin: mã lô, ngày đổ, vị trí, khối lượng dự kiến, và thành phần bê tông (concrete mix).

**Mức độ ưu tiên (Priority):** High

**Phụ thuộc (Dependencies):**
- **FR-SET-BASE-001**: Cần có master data về concrete mix đã được thiết lập

**Quy tắc nghiệp vụ (Business Rules):**
- **BR-001**: Mã lô đổ phải unique trong toàn hệ thống
- **BR-002**: Ngày đổ phải ≥ ngày hiện tại
- **BR-003**: Khối lượng dự kiến phải > 0

**Tiêu chí chấp nhận (Acceptance Criteria):**
- Lô đổ được tạo thành công với tất cả required fields
- Mã lô tự động generate theo format: CST-YYYYMMDD-###
- Validation errors hiển thị rõ ràng nếu dữ liệu không hợp lệ

---

#### FR-CST-BASE-002: Cập nhật Thông tin Lô Đổ

**Mô tả (Description):**
Hệ thống cần cho phép cập nhật thông tin lô đổ bê tông trước khi bắt đầu đổ. Sau khi đổ bắt đầu, chỉ một số fields được phép cập nhật.

**Mức độ ưu tiên (Priority):** High

**Phụ thuộc (Dependencies):**
- **FR-CST-BASE-001**: Lô đổ phải tồn tại trước khi cập nhật

**Quy tắc nghiệp vụ (Business Rules):**
- **BR-004**: Trước khi đổ: Tất cả fields editable
- **BR-005**: Trong khi đổ: Chỉ ghi chú (notes) editable
- **BR-006**: Sau khi đổ: Không field nào editable (read-only)

**Tiêu chí chấp nhận (Acceptance Criteria):**
- Fields editable theo status của lô đổ
- Audit log ghi nhận mọi thay đổi
- Concurrent edit được handle đúng

---

### 2.2 Ghi nhận Dữ liệu Bê tông (Concrete Data Recording)

#### FR-CST-BASE-003: Nhận Dữ liệu từ Hokuto CSV

**Mô tả (Description):**
Hệ thống phải tự động nhận và xử lý dữ liệu bê tông từ file CSV của hệ thống Hokuto với polling interval 1 giây.

**Mức độ ưu tiên (Priority):** High

**Phụ thuộc (Dependencies):**
- **FR-CST-BASE-001**: Lô đổ phải được tạo để map dữ liệu

**Quy tắc nghiệp vụ (Business Rules):**
- **BR-007**: Polling interval = 1 giây
- **BR-008**: Duplicate records phải được detect và skip
- **BR-009**: Dữ liệu lỗi phải được log và báo cáo

**Tiêu chí chấp nhận (Acceptance Criteria):**
- Dữ liệu CSV được import trong ≤ 2 giây sau khi file available
- Duplicate detection hoạt động chính xác
- Error records được log với chi tiết lỗi

---

### 2.3 Kiểm tra Chất lượng (Quality Testing)

#### FR-CST-BASE-004: Ghi nhận Kết quả Test Slump

**Mô tả (Description):**
Hệ thống phải cho phép ghi nhận kết quả test slump (độ sụt) với giá trị đo và thời gian đo.

**Mức độ ưu tiên (Priority):** High

**Phụ thuộc (Dependencies):**
- **FR-CST-BASE-001**: Lô đổ phải tồn tại
- **FR-CST-BASE-003**: Dữ liệu bê tông phải được nhận

**Quy tắc nghiệp vụ (Business Rules):**
- **BR-010**: Giá trị slump phải trong range 0-30 cm
- **BR-011**: Kết quả phải được ghi trong 15 phút sau khi lấy mẫu
- **BR-012**: Nếu slump ngoài spec, cần ghi chú lý do

**Tiêu chí chấp nhận (Acceptance Criteria):**
- Slump value được validate theo range cho phép
- Cảnh báo hiển thị nếu slump ngoài specification
- Timestamp tự động capture khi ghi nhận

---
```

---

## Traceability to Basic Design

| SRS Section 2 Element | Maps to Basic Design |
|----------------------|---------------------|
| FR-XXX-001 | → Architecture Component |
| Business Rules | → Component Logic |
| Dependencies | → Service Integration |
| Acceptance Criteria | → Test Cases |

---

*Section 02: Functional Requirements - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
