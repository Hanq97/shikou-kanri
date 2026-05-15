# Section 05: Acceptance Criteria - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate Acceptance Criteria section (Section 5) for SRS document.

This section defines testable conditions for verifying User Stories, using Given-When-Then format with verification methods and pass criteria.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Domain** | Civil Engineering / Tunnel Construction |
| **Focus** | Testable acceptance conditions |
| **Format** | Given-When-Then with verification methods |

---

## Constraints

### MUST Include

1. **AC ID Format**: `AC-[US_NUMBER].[SEQUENCE]` (e.g., AC-001.1, AC-001.2)
2. **Given-When-Then Format**: Structured scenarios
3. **Verification Method**: How to test the AC
4. **Pass Criteria**: Measurable conditions for pass/fail
5. **Related User Story**: Link to parent US
6. **≥2 ACs per User Story**

### MUST Exclude

- ❌ Implementation details
- ❌ Technical specifications
- ❌ Test code or scripts
- ❌ Database queries
- ❌ English-only content (Vietnamese ≥60%)

### AC Count by Scope Level

| Scope | AC per US | Total ACs | Coverage |
|-------|-----------|-----------|----------|
| **Core** | 2-3 | 20-45 | Happy path only |
| **Full** | 3-5 | 90-200 | Happy path + error scenarios |
| **Premium** | 5-8 | 300-640 | Happy path + errors + edge cases + security |

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 05-acceptance-criteria.md
# PURPOSE: Generate Acceptance Criteria section with G-W-T format
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load innovation for scope level
    innovation = read_file(f".claude/memory-bank/master/{feature_code}/innovation.md")
    context.scope_level = extract_scope_level(innovation)

    # Load user stories from section 4
    srs_file = f"documents/features/{feature_code}-{sub_code}/{feature_code}-{sub_code}-srs.md"
    context.user_stories = extract_user_stories(srs_file)

    # Determine AC targets
    ac_per_us = {
        "Core": {"min": 2, "max": 3},
        "Full": {"min": 3, "max": 5},
        "Premium": {"min": 5, "max": 8}
    }
    context.ac_targets = ac_per_us[context.scope_level]

    # Define coverage requirements
    coverage_requirements = {
        "Core": ["happy_path"],
        "Full": ["happy_path", "error_scenarios"],
        "Premium": ["happy_path", "error_scenarios", "edge_cases", "security"]
    }
    context.coverage = coverage_requirements[context.scope_level]

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE ACCEPTANCE CRITERIA
# ────────────────────────────────────────────────────────────

FUNCTION generate_acceptance_criteria(us, ac_sequence, scenario_type):
    # Extract US number from US ID (e.g., US-ENG-001 -> 001)
    us_number = extract_number(us.id)
    ac_id = f"AC-{us_number}.{ac_sequence}"

    ac = {
        "id": ac_id,
        "title": scenario.title_vi,
        "given": scenario.precondition_vi,
        "when": scenario.action_vi,
        "then": scenario.expected_result_vi,
        "related_us": us.id,
        "scenario_type": scenario_type,  # happy_path, error, edge_case, security
        "verification_method": generate_verification_method(scenario),
        "pass_criteria": generate_pass_criteria(scenario)
    }

    RETURN ac

FUNCTION generate_verification_method(scenario):
    methods = []

    # Generate step-by-step verification
    methods.append("1. [Setup preconditions từ Given]")
    methods.append("2. [Execute action từ When]")
    methods.append("3. [Verify results từ Then]")
    methods.append("4. [Check edge conditions]")
    methods.append("5. [Verify data persistence]")

    RETURN methods

FUNCTION generate_pass_criteria(scenario):
    criteria = []

    # Generate measurable criteria
    criteria.append(f"✅ {scenario.primary_outcome}")

    IF scenario.has_performance_requirement:
        criteria.append(f"✅ Response time < {scenario.max_response_time}")

    IF scenario.has_data_validation:
        criteria.append(f"✅ Data được lưu đúng format")

    IF scenario.has_notification:
        criteria.append(f"✅ Notification được gửi trong < {scenario.notification_timeout}")

    RETURN criteria

# ────────────────────────────────────────────────────────────
# STEP 3: FORMAT OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION format_section(acs_by_user_story):
    output = []

    output.append("## 5. Acceptance Criteria (Tiêu chí Chấp nhận)\n\n")

    us_number = 1
    FOR us, acs IN acs_by_user_story:
        output.append(f"### 5.{us_number} Acceptance Criteria cho {us.id}\n\n")
        output.append(f"**User Story:** {us.goal[:50]}...\n\n")

        FOR ac IN acs:
            output.append(format_acceptance_criterion(ac))

        us_number += 1

    RETURN "".join(output)

FUNCTION format_acceptance_criterion(ac):
    output = []

    # Header
    output.append(f"#### {ac.id}: {ac.title}\n\n")

    # Given-When-Then
    output.append(f"**Given** {ac.given},\n")
    output.append(f"**When** {ac.when},\n")
    output.append(f"**Then** {ac.then}.\n\n")

    # Related User Story
    output.append(f"**Related User Story:** {ac.related_us}\n\n")

    # Verification Method
    output.append("**Verification Method:**\n")
    FOR step IN ac.verification_method:
        output.append(f"{step}\n")
    output.append("\n")

    # Pass Criteria
    output.append("**Pass Criteria:**\n")
    FOR criterion IN ac.pass_criteria:
        output.append(f"- {criterion}\n")
    output.append("\n")

    output.append("---\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: AC count per US meets minimum?
    FOR us IN context.user_stories:
        ac_count = count_acs_for_us(result, us.id)
        IF ac_count < context.ac_targets.min:
            issues.append(f"{us.id} has only {ac_count} ACs (need ≥{context.ac_targets.min})")

    # Q1: All ACs have Given-When-Then?
    FOR ac IN extract_acs(result):
        IF NOT contains(ac, "Given") OR NOT contains(ac, "When") OR NOT contains(ac, "Then"):
            issues.append(f"{ac.id} missing Given-When-Then format")

    # Q2: AC ID format correct (AC-XXX.Y)?
    ac_ids = extract_ac_ids(result)
    FOR ac_id IN ac_ids:
        IF NOT matches_pattern(ac_id, r"AC-\d{3}\.\d"):
            issues.append(f"Invalid AC ID format: {ac_id}")

    # Q2: All ACs have verification method and pass criteria?
    FOR ac IN extract_acs(result):
        IF NOT contains(ac, "Verification Method"):
            issues.append(f"{ac.id} missing Verification Method")
        IF NOT contains(ac, "Pass Criteria"):
            issues.append(f"{ac.id} missing Pass Criteria")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "SELECT ", "INSERT ", "UPDATE ", "DELETE ",
        "class ", "function ", "const ", "import ",
        "GET /api", "POST /api", "expect(", "assert("
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    # Q4: Coverage requirements met?
    FOR coverage_type IN context.coverage:
        IF NOT has_scenarios_of_type(result, coverage_type):
            issues.append(f"Missing {coverage_type} scenarios")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
## 5. Acceptance Criteria (Tiêu chí Chấp nhận)

### 5.1 Acceptance Criteria cho US-ENG-001

**User Story:** Xem Dashboard Giám sát Đổ Bê tông...

#### AC-001.1: Dashboard Hiển thị Danh sách Lô Đổ

**Given** tôi đã đăng nhập hệ thống với quyền Engineer,
**When** tôi mở trang dashboard monitoring,
**Then** tôi thấy danh sách các lô đổ đang hoạt động với tiến độ real-time.

**Related User Story:** US-ENG-001

**Verification Method:**
1. Login với account Engineer
2. Navigate tới Dashboard Monitoring
3. Verify danh sách lô đổ hiển thị
4. Check tiến độ được cập nhật
5. Confirm data consistency với database

**Pass Criteria:**
- ✅ Dashboard load thành công trong < 2 giây
- ✅ Danh sách lô đổ hiển thị đầy đủ
- ✅ Tiến độ cập nhật real-time (< 1 giây delay)
- ✅ Không có error hiển thị

---

#### AC-001.2: Dashboard Cập nhật Real-time

**Given** dashboard đang hiển thị và có dữ liệu mới từ xe trộn,
**When** dữ liệu mới được gửi từ Hokuto CSV,
**Then** dashboard cập nhật trong vòng 1 giây mà không cần refresh.

**Related User Story:** US-ENG-001

**Verification Method:**
1. Mở dashboard trên 2 browser windows
2. Trigger new data từ Hokuto CSV simulator
3. Observe dashboard updates
4. Measure update latency
5. Verify data accuracy

**Pass Criteria:**
- ✅ Update latency < 1 giây (P95)
- ✅ Không có flicker khi update
- ✅ Data accurate với source

---

#### AC-001.3: Dashboard Highlight Lô Đổ Có Vấn đề

**Given** một lô đổ có kết quả test ngoài specification (slump < 8 hoặc > 18 cm),
**When** dashboard refresh (manual hoặc auto),
**Then** lô đổ đó được highlight màu cảnh báo (đỏ/vàng).

**Related User Story:** US-ENG-001

**Verification Method:**
1. Tạo test data với slump value ngoài spec
2. Verify dashboard hiển thị
3. Check highlight color applied
4. Verify tooltip hiển thị reason

**Pass Criteria:**
- ✅ Highlight màu đỏ cho critical (slump < 5 hoặc > 22)
- ✅ Highlight màu vàng cho warning (slump < 8 hoặc > 18)
- ✅ Tooltip hiển thị chi tiết vấn đề

---

### 5.2 Acceptance Criteria cho US-ENG-002

**User Story:** Ghi nhận Kết quả Test Chất lượng...

#### AC-002.1: Form Validation cho Slump Input

**Given** tôi đang ở màn hình chi tiết lô đổ,
**When** tôi nhập giá trị slump không hợp lệ (< 0 hoặc > 30),
**Then** hệ thống hiển thị validation error và không cho submit.

**Related User Story:** US-ENG-002

**Verification Method:**
1. Navigate tới màn hình chi tiết lô đổ
2. Nhập slump = -1, verify error
3. Nhập slump = 35, verify error
4. Nhập slump = 15, verify no error
5. Submit và verify data saved

**Pass Criteria:**
- ✅ Error message hiển thị cho invalid input
- ✅ Submit button disabled khi có error
- ✅ Valid input được save thành công

---
```

---

## Scenario Types Reference

| Type | Description | Required Level |
|------|-------------|----------------|
| **happy_path** | Normal successful flow | Core, Full, Premium |
| **error_scenarios** | Error handling và recovery | Full, Premium |
| **edge_cases** | Boundary conditions | Premium |
| **security** | Authorization, data protection | Premium |

---

## AC → Test Case Mapping

| AC Element | Maps to Test Design |
|------------|---------------------|
| Given | → Test setup/preconditions |
| When | → Test execution steps |
| Then | → Expected results/assertions |
| Verification Method | → Test procedure |
| Pass Criteria | → Test pass/fail conditions |

---

*Section 05: Acceptance Criteria - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
