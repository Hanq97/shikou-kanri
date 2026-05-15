# Section 04: User Stories - Template v1.0
## Construction Management System (施工管理統合システム)

## Objective

Generate User Stories section (Section 4) for SRS document.

This section defines user requirements from the user's perspective using "As a [role], I want [goal], so that [benefit]" format with inline acceptance criteria.

---

## Technology Context

| Aspect | Value |
|--------|-------|
| **Project** | Construction Management System |
| **Domain** | Civil Engineering / Tunnel Construction |
| **Focus** | User-centric requirements |
| **Format** | User Story + Inline Acceptance Criteria |

---

## Constraints

### MUST Include

1. **US ID Format**: `US-[ROLE]-[###]` (e.g., US-ENG-001)
2. **User Story Format**: As a [role], I want [goal], so that [benefit]
3. **Inline Acceptance Criteria**: AC-XXX.Y format with Given-When-Then
4. **3-5 ACs per User Story**
5. **Grouped by User Role**

### MUST Exclude

- ❌ Implementation details
- ❌ Technical specifications
- ❌ API endpoints
- ❌ UI mockups (belongs in Detail Design)
- ❌ Source code

### US Count by Scope Level

| Scope | User Stories | ACs per US | Total ACs |
|-------|--------------|------------|-----------|
| **Core** | 10-15 | 3-4 | 30-60 |
| **Full** | 30-40 | 3-5 | 90-200 |
| **Premium** | 60-80 | 3-5 | 180-400 |

---

## Template Logic (Pseudo-Code)

```pseudo
# ============================================================
# TEMPLATE: 04-user-stories.md
# PURPOSE: Generate User Stories section with inline AC
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT
# ────────────────────────────────────────────────────────────

FUNCTION load_context(feature_code, sub_code):
    context = {}

    # Load innovation for scope level
    innovation = read_file(f".claude/memory-bank/master/{feature_code}/innovation.md")
    context.scope_level = extract_scope_level(innovation)

    # Load functional requirements for traceability
    srs_file = f"documents/features/{feature_code}-{sub_code}/{feature_code}-{sub_code}-srs.md"
    context.frs = extract_frs(srs_file)

    # Define user roles
    context.user_roles = [
        {"code": "ENG", "name": "Engineer", "name_vi": "Kỹ sư"},
        {"code": "MGR", "name": "Manager", "name_vi": "Quản lý"},
        {"code": "ADM", "name": "Admin", "name_vi": "Quản trị viên"},
        {"code": "SPV", "name": "Supervisor", "name_vi": "Giám sát"}
    ]

    # Determine US count
    us_counts = {
        "Core": {"total": 10-15, "ac_per_us": 3-4},
        "Full": {"total": 30-40, "ac_per_us": 3-5},
        "Premium": {"total": 60-80, "ac_per_us": 3-5}
    }
    context.us_targets = us_counts[context.scope_level]

    RETURN context

# ────────────────────────────────────────────────────────────
# STEP 2: GENERATE USER STORY
# ────────────────────────────────────────────────────────────

FUNCTION generate_user_story(us_number, role, requirement):
    us_id = f"US-{role.code}-{us_number:03d}"

    us = {
        "id": us_id,
        "role": role.name_vi,
        "goal": requirement.user_goal_vi,
        "benefit": requirement.benefit_vi,
        "related_frs": requirement.fr_ids,
        "acceptance_criteria": generate_acceptance_criteria(us_id, requirement)
    }

    RETURN us

FUNCTION generate_acceptance_criteria(us_id, requirement):
    acs = []

    # Generate 3-5 ACs using Given-When-Then format
    FOR i, scenario IN enumerate(requirement.scenarios):
        ac_id = f"AC-{us_id.split('-')[2]}.{i+1}"
        ac = {
            "id": ac_id,
            "given": scenario.precondition_vi,
            "when": scenario.action_vi,
            "then": scenario.expected_result_vi
        }
        acs.append(ac)

    RETURN acs

# ────────────────────────────────────────────────────────────
# STEP 3: FORMAT OUTPUT
# ────────────────────────────────────────────────────────────

FUNCTION format_section(user_stories_by_role):
    output = []

    output.append("## 4. User Stories (Câu chuyện Người dùng)\n\n")

    role_number = 1
    FOR role, stories IN user_stories_by_role:
        output.append(f"### 4.{role_number} {role.name_vi} ({role.name})\n\n")

        FOR us IN stories:
            output.append(format_user_story(us))

        role_number += 1

    RETURN "".join(output)

FUNCTION format_user_story(us):
    output = []

    # Header
    output.append(f"#### {us.id}: {us.goal[:50]}...\n\n")

    # User Story Format
    output.append(f"**As a** {us.role}\n")
    output.append(f"**I want to** {us.goal}\n")
    output.append(f"**So that** {us.benefit}\n\n")

    # Related FRs
    IF us.related_frs.length > 0:
        output.append(f"**Related FRs:** {', '.join(us.related_frs)}\n\n")

    # Inline Acceptance Criteria
    output.append("**Acceptance Criteria:**\n\n")
    FOR ac IN us.acceptance_criteria:
        output.append(f"- **{ac.id}**: ")
        output.append(f"**Given** {ac.given}, ")
        output.append(f"**When** {ac.when}, ")
        output.append(f"**Then** {ac.then}\n")

    output.append("\n---\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: VALIDATE OUTPUT (Q1-Q4)
# ────────────────────────────────────────────────────────────

FUNCTION validate_output(result, context):
    issues = []

    # Q1: US count matches scope level?
    us_count = count_user_stories(result)
    IF us_count < context.us_targets.total.min:
        issues.append(f"US count {us_count} below minimum")

    # Q1: Each US has inline ACs?
    FOR us IN extract_user_stories(result):
        ac_count = count_acs(us)
        IF ac_count < 3:
            issues.append(f"{us.id} has only {ac_count} ACs (need ≥3)")

    # Q2: AC ID format correct (AC-XXX.Y)?
    ac_ids = extract_ac_ids(result)
    FOR ac_id IN ac_ids:
        IF NOT matches_pattern(ac_id, r"AC-\d{3}\.\d"):
            issues.append(f"Invalid AC ID format: {ac_id}")

    # Q2: All ACs use Given-When-Then?
    FOR ac IN extract_acs(result):
        IF NOT contains(ac, "Given") OR NOT contains(ac, "When") OR NOT contains(ac, "Then"):
            issues.append(f"{ac.id} missing Given-When-Then format")

    # Q3: Vietnamese ratio ≥60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q4: No prohibited content?
    prohibited = [
        "GET /api", "POST /api", "API endpoint",
        "database", "SQL", "query",
        "component", "service", "controller",
        "class ", "function ", "interface "
    ]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited content: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format Example

```markdown
## 4. User Stories (Câu chuyện Người dùng)

### 4.1 Kỹ sư (Engineer)

#### US-ENG-001: Xem Dashboard Giám sát Đổ Bê tông

**As a** Kỹ sư
**I want to** xem dashboard giám sát tiến độ đổ bê tông real-time
**So that** tôi có thể theo dõi quá trình đổ và phát hiện vấn đề kịp thời

**Related FRs:** FR-CST-BASE-001, FR-MON-BASE-001

**Acceptance Criteria:**

- **AC-001.1**: **Given** tôi đã đăng nhập hệ thống, **When** tôi mở trang dashboard, **Then** tôi thấy danh sách các lô đổ đang hoạt động với tiến độ cập nhật real-time
- **AC-001.2**: **Given** dashboard đang hiển thị, **When** có dữ liệu mới từ xe trộn, **Then** dashboard cập nhật trong vòng 1 giây
- **AC-001.3**: **Given** một lô đổ có vấn đề (slump ngoài spec), **When** dashboard refresh, **Then** lô đổ đó được highlight màu cảnh báo
- **AC-001.4**: **Given** tôi đang xem dashboard, **When** tôi click vào một lô đổ, **Then** tôi thấy chi tiết của lô đổ đó

---

#### US-ENG-002: Ghi nhận Kết quả Test Chất lượng

**As a** Kỹ sư
**I want to** ghi nhận kết quả test chất lượng bê tông (slump, air content, temperature)
**So that** dữ liệu chất lượng được lưu trữ cho báo cáo và kiểm định

**Related FRs:** FR-CST-BASE-004, FR-QLT-BASE-001

**Acceptance Criteria:**

- **AC-002.1**: **Given** tôi đang ở màn hình chi tiết lô đổ, **When** tôi nhập giá trị slump, **Then** hệ thống validate giá trị trong range 0-30 cm
- **AC-002.2**: **Given** giá trị slump ngoài specification, **When** tôi submit, **Then** hệ thống yêu cầu nhập ghi chú giải thích
- **AC-002.3**: **Given** tôi đã nhập đầy đủ thông tin test, **When** tôi submit, **Then** kết quả được lưu với timestamp và user ID

---

### 4.2 Quản lý (Manager)

#### US-MGR-001: Xem Báo cáo Tổng hợp Đổ Bê tông

**As a** Quản lý
**I want to** xem báo cáo tổng hợp tiến độ đổ bê tông theo ngày/tuần/tháng
**So that** tôi có thể đánh giá tiến độ dự án và lập kế hoạch

**Related FRs:** FR-RPT-BASE-001

**Acceptance Criteria:**

- **AC-003.1**: **Given** tôi đã đăng nhập với role Manager, **When** tôi mở trang báo cáo, **Then** tôi thấy các option filter theo thời gian (ngày/tuần/tháng)
- **AC-003.2**: **Given** tôi đã chọn filter, **When** báo cáo load, **Then** tôi thấy tổng khối lượng bê tông, số lô đổ, và tỷ lệ pass/fail test
- **AC-003.3**: **Given** báo cáo đang hiển thị, **When** tôi click Export, **Then** báo cáo được xuất ra file Excel

---

### 4.3 Giám sát (Supervisor)

#### US-SPV-001: Nhận Cảnh báo Khi Có Vấn đề

**As a** Giám sát
**I want to** nhận cảnh báo ngay khi có vấn đề với chất lượng bê tông
**So that** tôi có thể can thiệp kịp thời trước khi xảy ra sự cố

**Related FRs:** FR-MON-BASE-003

**Acceptance Criteria:**

- **AC-004.1**: **Given** một bài test slump cho kết quả ngoài specification, **When** kết quả được lưu, **Then** tôi nhận được notification trên dashboard
- **AC-004.2**: **Given** tôi nhận được notification, **When** tôi click vào notification, **Then** tôi được điều hướng đến chi tiết lô đổ có vấn đề
- **AC-004.3**: **Given** vấn đề đã được xử lý, **When** tôi đánh dấu resolved, **Then** notification được clear và ghi nhận action

---
```

---

## User Roles Reference

| Role Code | Role Name | Role Name (VI) | Typical Permissions |
|-----------|-----------|----------------|---------------------|
| **ENG** | Engineer | Kỹ sư | View, Input data, Basic reports |
| **MGR** | Manager | Quản lý | View, Reports, Approve |
| **ADM** | Admin | Quản trị viên | Full access, User management |
| **SPV** | Supervisor | Giám sát | View, Alerts, Quality oversight |

---

*Section 04: User Stories - Template v1.0*
*Construction Management System (施工管理統合システム)*
*EPS Framework v3.0*
