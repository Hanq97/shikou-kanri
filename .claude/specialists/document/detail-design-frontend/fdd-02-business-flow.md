# FDD-02: Business Flow Presentation v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-02-business-flow
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 2 - Business Flow Presentation
- **Output**: Section 2.1-2.3 (Business visualization, Interaction model, Feedback design)
- **Language**: Vietnamese >=60%

---

## Purpose

Generate **Section 2: Business Flow Presentation** for Frontend Detail Design document, including:
- **2.1**: Cach the hien nghiep vu (Business process visualization with Mermaid diagrams)
- **2.2**: Interaction Model (User-system interaction patterns)
- **2.3**: Feedback & Response Design (UI feedback mechanisms)

**CRITICAL**:
- NO implementation code
- Derive workflows from SRS business processes
- Use current system date for metadata

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:

| Parameter | Source | Example |
|-----------|--------|---------|
| FEATURE_NAME | ENV | "LND" |
| SUB_FEATURE | ENV | "BASE" |
| DEVELOPER | ENV | "Developer Name" |
| SECTION_00_OUTPUT | ENV | Section 00 output |
| SECTION_01_OUTPUT | ENV | Section 01 output (screen list) |

**Auto-Read Files**:
1. **SRS Document**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-srs.md`
   - Section 3: Business Processes (to generate workflows)
   - Section 4: User Stories (to identify interactions)
2. **Basic Design**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-basic-design.md`
   - Section 3: UI Flow (to understand screen transitions)
3. **Section 01 Output**: Screens from previous section (for mapping)

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 02-business-flow.md
# PURPOSE: Generate Business Flow Presentation section
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD SRS DOCUMENT (BUSINESS PROCESSES)
# ────────────────────────────────────────────────────────────

FUNCTION load_srs_business_processes(feature_id):
    feature_dir = feature_id.replace("-", "-").toLowerCase()
    srs_path = f"documents/features/{feature_dir}/{feature_id}-srs.md"

    IF NOT file_exists(srs_path):
        raise Error(f"SRS document not found: {srs_path}")

    srs_content = read_file(srs_path)

    business_processes = extract_business_processes(srs_content)
    # Example: [
    #   {name: "Loan Application", steps: ["Submit", "Review", "Approve"], roles: ["Borrower", "Lender"]},
    #   {name: "Payment Processing", steps: ["Initiate", "Verify", "Complete"], roles: ["Borrower", "System"]}
    # ]

    user_roles = extract_user_roles(srs_content)

    RETURN {
        "processes": business_processes,
        "roles": user_roles,
        "raw_content": srs_content
    }

# ────────────────────────────────────────────────────────────
# STEP 2: LOAD SCREEN LIST (FROM SECTION 1.4)
# ────────────────────────────────────────────────────────────

FUNCTION load_screen_list(feature_id):
    # NOTE: In production, orchestrator passes section1_output as parameter
    screens = []

    screens.append({
        "id": f"SCR-{feature_id}-001",
        "name_vi": "Man hinh danh sach",
        "type": "list",
        "process_step": "View all items"
    })

    screens.append({
        "id": f"SCR-{feature_id}-002",
        "name_vi": "Man hinh chi tiet",
        "type": "detail",
        "process_step": "View details, Edit"
    })

    screens.append({
        "id": f"SCR-{feature_id}-003",
        "name_vi": "Man hinh tao moi",
        "type": "create",
        "process_step": "Create new item"
    })

    RETURN screens

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE SECTION 2.1 (BUSINESS PROCESS VISUALIZATION)
# ────────────────────────────────────────────────────────────

FUNCTION generate_business_visualization(processes, screens):
    output = []

    output.append("### 2.1 Cach the hien nghiep vu\n\n")
    output.append("**Business Process Visualization:**\n\n")
    output.append("Feature nay the hien nghiep vu qua cac man hinh va workflow sau:\n\n")

    # -- Workflow Diagram (Mermaid) --
    output.append("**Workflow Diagram:**\n\n")
    output.append("```mermaid\n")
    output.append("flowchart TD\n")

    FOR process IN processes:
        process_slug = process.name.toLowerCase().replace(" ", "_")
        output.append(f"    {process_slug}_start[{process.name} - Start]\n")

        FOR i, step IN enumerate(process.steps):
            step_slug = step.toLowerCase().replace(" ", "_")
            output.append(f"    {process_slug}_step{i+1}[{step}]\n")

        output.append(f"    {process_slug}_end[{process.name} - End]\n")

        output.append(f"    {process_slug}_start --> {process_slug}_step1\n")
        FOR i IN range(len(process.steps) - 1):
            output.append(f"    {process_slug}_step{i+1} --> {process_slug}_step{i+2}\n")
        output.append(f"    {process_slug}_step{len(process.steps)} --> {process_slug}_end\n")

    output.append("```\n\n")

    # -- Screen-to-Process Mapping Table --
    output.append("**Screen-to-Process Mapping:**\n\n")
    output.append("| Screen ID | Ten man hinh | Business Process | Process Steps | Vai tro |\n")
    output.append("|-----------|--------------|------------------|---------------|----------|\n")

    FOR screen IN screens:
        process_name = "Quan ly [Feature]"
        roles_str = ", ".join(["User", "Admin"])
        output.append(f"| {screen.id} | {screen.name_vi} | {process_name} | {screen.process_step} | {roles_str} |\n")

    output.append("\n")

    # -- State Indicators in UI --
    output.append("**State Indicators in UI:**\n\n")
    output.append("| Business State | UI Indicator | Visual Design | Location |\n")
    output.append("|----------------|--------------|---------------|----------|\n")
    output.append("| Pending | Badge: \"Dang cho\" (mau vang) | Yellow badge | List item, Detail header |\n")
    output.append("| In Progress | Badge: \"Dang xu ly\" (mau xanh) | Blue badge | List item, Detail header |\n")
    output.append("| Completed | Badge: \"Hoan thanh\" (mau xanh la) | Green badge | List item, Detail header |\n")
    output.append("| Rejected | Badge: \"Tu choi\" (mau do) | Red badge | List item, Detail header |\n")
    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE SECTION 2.2 (INTERACTION MODEL)
# ────────────────────────────────────────────────────────────

FUNCTION generate_interaction_model(screens):
    output = []

    output.append("### 2.2 Interaction Model\n\n")
    output.append("**User-System Interaction Patterns:**\n\n")

    output.append("| Interaction Type | Trigger | System Response | UI Feedback | Example |\n")
    output.append("|------------------|---------|-----------------|-------------|----------|\n")
    output.append("| **Navigation** | Click menu item | Route change | Page transition | Dashboard -> Loan List |\n")
    output.append("| **Data Retrieval** | Page load, Search | Fetch data from API | Loading spinner -> Data display | Load loan list |\n")
    output.append("| **Form Submission** | Click \"Submit\" button | Validate -> Send API request | Loading -> Success/Error toast | Create new loan |\n")
    output.append("| **Real-time Update** | Server event (WebSocket) | Update Redux store | Toast notification | New loan application received |\n")
    output.append("| **Confirmation** | Click \"Delete\" | Show confirmation modal | Modal appears | Delete loan record |\n")
    output.append("| **Inline Edit** | Click edit icon | Enable input field | Input becomes editable | Edit loan amount |\n")
    output.append("\n")

    output.append("**User Actions -> System Responses:**\n\n")
    output.append("| User Action | System Response | Next Screen State | Error Handling |\n")
    output.append("|-------------|-----------------|-------------------|----------------|\n")
    output.append("| Click \"Tao moi\" | Navigate to Create screen | Empty form displayed | - |\n")
    output.append("| Fill form + Submit | Validate -> POST API -> Success | Redirect to List screen | Show inline errors |\n")
    output.append("| Click \"Xem chi tiet\" | GET API -> Load data | Detail screen with data | Show error toast if API fails |\n")
    output.append("| Click \"Xoa\" | Show confirmation modal | Wait for user confirmation | - |\n")
    output.append("| Confirm delete | DELETE API -> Success | Remove item from list | Show error toast if API fails |\n")
    output.append("\n")

    output.append("**Async Operation Handling:**\n\n")
    output.append("- **Loading State**: Display spinner hoac skeleton screen khi cho API response\n")
    output.append("- **Optimistic UI**: Cap nhat UI ngay lap tuc truoc khi API response (for quick actions like \"Like\", \"Favorite\")\n")
    output.append("- **Error Recovery**: Neu API that bai, rollback UI ve trang thai truoc do va hien thi error message\n")
    output.append("- **Retry Mechanism**: Cho phep user retry action neu gap loi network\n")
    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE SECTION 2.3 (FEEDBACK & RESPONSE DESIGN)
# ────────────────────────────────────────────────────────────

FUNCTION generate_feedback_design():
    output = []

    output.append("### 2.3 Feedback & Response Design\n\n")

    # -- Success Feedback --
    output.append("**Success Feedback:**\n\n")
    output.append("| Action | Feedback Type | Message | Duration | Location |\n")
    output.append("|--------|---------------|---------|----------|----------|\n")
    output.append("| Create | Toast (success) | \"Tao moi thanh cong!\" | 3s | Top-right corner |\n")
    output.append("| Update | Toast (success) | \"Cap nhat thanh cong!\" | 3s | Top-right corner |\n")
    output.append("| Delete | Toast (success) | \"Xoa thanh cong!\" | 3s | Top-right corner |\n")
    output.append("| Submit form | Inline message | \"Form da duoc gui, cho xu ly\" | Persistent | Below submit button |\n")
    output.append("\n")

    # -- Error Feedback --
    output.append("**Error Feedback:**\n\n")
    output.append("| Error Type | Feedback Type | Message Example | Recovery Action |\n")
    output.append("|------------|---------------|-----------------|------------------|\n")
    output.append("| Validation error | Inline error (red text) | \"Email khong hop le\" | User fixes input |\n")
    output.append("| Network error | Toast (error) | \"Khong the ket noi. Vui long thu lai\" | Retry button |\n")
    output.append("| Permission error | Modal (error) | \"Ban khong co quyen thuc hien thao tac nay\" | Close modal |\n")
    output.append("| Server error (5xx) | Toast (error) | \"Loi he thong. Vui long thu lai sau\" | Auto-dismiss |\n")
    output.append("\n")

    # -- Loading States --
    output.append("**Loading States:**\n\n")
    output.append("| Loading Type | UI Indicator | Use Case | Example |\n")
    output.append("|--------------|--------------|----------|----------|\n")
    output.append("| Full-page loading | Spinner (center screen) | Initial page load | Dashboard load |\n")
    output.append("| Section loading | Skeleton screen | Load data for a section | Loan list table |\n")
    output.append("| Button loading | Spinner inside button | Form submission | \"Dang gui...\" |\n")
    output.append("| Progress bar | Linear progress | Long-running task | File upload |\n")
    output.append("\n")

    # -- Confirmation Dialogs --
    output.append("**Confirmation Dialogs:**\n\n")
    output.append("| Action | Dialog Type | Message | Buttons | Default Focus |\n")
    output.append("|--------|-------------|---------|---------|---------------|\n")
    output.append("| Delete | Modal (warning) | \"Ban co chac muon xoa?\" | Cancel, Xoa | Cancel |\n")
    output.append("| Discard changes | Modal (warning) | \"Thay doi chua luu se bi mat\" | Huy, Tiep tuc | Huy |\n")
    output.append("| Submit | Modal (confirmation) | \"Xac nhan gui form?\" | Huy, Gui | Gui |\n")
    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 6: COMBINE ALL SUBSECTIONS
# ────────────────────────────────────────────────────────────

FUNCTION generate_section(feature_name, sub_feature, developer):
    output = []

    feature_id = f"{feature_name}-{sub_feature}"

    srs_data = load_srs_business_processes(feature_id)
    screens = load_screen_list(feature_id)

    section_2_1 = generate_business_visualization(srs_data.processes, screens)
    section_2_2 = generate_interaction_model(screens)
    section_2_3 = generate_feedback_design()

    output.append("## 2. Business Flow Presentation\n\n")
    output.append(section_2_1)
    output.append(section_2_2)
    output.append(section_2_3)

    result = "".join(output)
    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: All sections 2.1-2.3 present?
    required_sections = ["2.1 Cach the hien nghiep vu", "2.2 Interaction Model", "2.3 Feedback & Response Design"]
    FOR section IN required_sections:
        IF NOT contains(result, section):
            issues.append(f"Missing section: {section}")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%} (required >=60%)")

    # Q3: Workflow diagram present?
    IF NOT contains(result, "```mermaid"):
        issues.append("Missing Mermaid workflow diagram")

    # Q4: No prohibited content?
    prohibited_patterns = ["class ", "function ", "const ", "import ", "export "]
    FOR pattern IN prohibited_patterns:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited code pattern: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

Returns Section 2 markdown content (120-150 lines) to orchestrator for assembly.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **SRS not found** | Feature path wrong | Verify feature directory structure |
| **No business processes** | SRS Section 3 missing | Check SRS document completeness |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **No Mermaid diagrams** | Workflow not generated | Ensure business processes have steps |
| **Section 01 missing** | Dependency not met | Generate Section 01 first |

---

## Notes

### Technology Context

| Aspect | Value |
|--------|-------|
| **Framework** | React 18.x |
| **Language** | TypeScript 5.x |
| **State Management** | Redux Toolkit + React Query |
| **UI Patterns** | Loading states, error boundaries, optimistic UI |
| **Feedback** | Toast notifications, inline errors, confirmation dialogs |
| **Component Pattern** | Functional components with hooks |

### Constraints

**MUST Include**: Section 2.1 (workflow diagrams + screen-to-process mapping), Section 2.2 (interaction patterns + async handling), Section 2.3 (success/error/loading feedback + confirmation dialogs), Vietnamese >=60%

**MUST Exclude**: Implementation code, API implementation details, Detailed component specs, English-only content

**Format**: 120-150 lines, Mermaid flowcharts for workflows, Tables for interaction mapping

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-02-business-flow.md) and template (02-business-flow.md) into single file
- Removed JIT template loading (dead path)
- Consolidated pseudo-code logic from template into agent
- Removed Integration with Orchestrator, Best Practices, Template Version Compatibility sections

**v3.0 (2025-12-12)**:
- Initial version with JIT template loading pattern
- Implements 02-business-flow.md template
- Added 3 subsections (2.1-2.3) structure
- Enhanced validation (Q1-Q4)
- Vietnamese content requirements enforced

---

*FDD-02: Business Flow Presentation v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Redux Toolkit*
