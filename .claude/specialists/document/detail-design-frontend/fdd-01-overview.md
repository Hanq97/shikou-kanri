# FDD-01: Overview Generator v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-01-overview
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 1 - Tong quan thiet ke
- **Output**: Section 1.1-1.4 (Business goals, User Journey, Information Architecture, Screen List)
- **Language**: Vietnamese >=60%

---

## Purpose

Generate **Section 1: Tong quan thiet ke** for Frontend Detail Design document, including:
- **1.1**: Muc tieu nghiep vu (Business goals from SRS)
- **1.2**: User Journey (Entry -> Tasks -> Exit)
- **1.3**: Information Architecture (Navigation model, hierarchy, menu)
- **1.4**: Danh sach man hinh (Screen list derived from user stories)

**CRITICAL**:
- NO implementation code
- Derive screens from SRS User Stories
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

**Auto-Read Files**:
1. **SRS Document**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-srs.md`
   - Section 1: Overview (business goals, problems, success criteria)
   - Section 4: User Stories (to derive screens)
2. **Basic Design**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-basic-design.md`
   - Section 1: Architecture Overview (technical context)
   - Section 2: UI Components (navigation structure)

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 01-overview.md
# PURPOSE: Generate Section 1 (Overview)
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD SRS DOCUMENT
# ────────────────────────────────────────────────────────────

FUNCTION load_srs_document(feature_id):
    feature_dir = feature_id.replace("-", "-").toLowerCase()
    srs_path = f"documents/features/{feature_dir}/{feature_id}-srs.md"

    IF NOT file_exists(srs_path):
        raise Error(f"SRS not found: {srs_path}")

    srs_content = read_file(srs_path)
    functional_reqs = extract_functional_requirements(srs_content)
    user_stories = extract_user_stories(srs_content)

    RETURN {
        "functional_reqs": functional_reqs,
        "user_stories": user_stories,
        "raw_content": srs_content
    }

# ────────────────────────────────────────────────────────────
# STEP 2: LOAD BASIC DESIGN DOCUMENT
# ────────────────────────────────────────────────────────────

FUNCTION load_basic_design(feature_id):
    feature_dir = feature_id.replace("-", "-").toLowerCase()
    bd_path = f"documents/features/{feature_dir}/{feature_id}-basic-design.md"

    IF NOT file_exists(bd_path):
        raise Error(f"Basic Design not found: {bd_path}")

    bd_content = read_file(bd_path)
    ui_components = extract_ui_components(bd_content)
    navigation = extract_navigation_structure(bd_content)

    RETURN {
        "ui_components": ui_components,
        "navigation": navigation,
        "raw_content": bd_content
    }

# ────────────────────────────────────────────────────────────
# STEP 3: DERIVE SCREENS FROM USER STORIES
# ────────────────────────────────────────────────────────────

FUNCTION derive_screens(user_stories, functional_reqs, feature_id):
    screens = []
    screen_counter = 1

    screen_groups = {
        "list": [],
        "detail": [],
        "create": [],
        "other": []
    }

    FOR story IN user_stories:
        IF contains(story, "xem danh sach") OR contains(story, "quan ly"):
            screen_type = "list"
        ELSE IF contains(story, "xem chi tiet") OR contains(story, "thong tin"):
            screen_type = "detail"
        ELSE IF contains(story, "tao moi") OR contains(story, "chinh sua"):
            screen_type = "create"
        ELSE:
            screen_type = "other"

        screen_groups[screen_type].append(story)

    FOR screen_type, stories IN screen_groups:
        FOR story IN stories:
            screen = {
                "id": f"SCR-{feature_id}-{screen_counter:03d}",
                "name_vi": infer_screen_name(story),
                "url": infer_url(story, feature_id),
                "purpose": story.description,
                "roles": extract_roles(story)
            }
            screens.append(screen)
            screen_counter += 1

    RETURN screens

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE SECTION 1.1 (Business Goals)
# ────────────────────────────────────────────────────────────

FUNCTION generate_business_goals(srs_data, feature_name_vi):
    output = []

    output.append("## 1. Tong quan thiet ke\n\n")
    output.append("### 1.1 Muc tieu nghiep vu\n\n")

    output.append("**Business Goals:**\n\n")
    goals = extract_business_goals(srs_data.raw_content)
    FOR goal IN goals:
        output.append(f"- {goal}\n")

    IF goals.length == 0:
        output.append(f"- Cung cap giao dien truc quan de quan ly {feature_name_vi}\n")
        output.append(f"- Toi uu hoa trai nghiem nguoi dung cho {feature_name_vi}\n")
        output.append(f"- Dam bao tinh nhat quan voi design system cua he thong\n")

    output.append("\n")

    output.append("**Problems can giai quyet:**\n\n")
    output.append(f"- Lam the nao de hien thi thong tin {feature_name_vi} mot cach ro rang?\n")
    output.append("- Lam the nao de user thuc hien cac thao tac nhanh chong?\n")
    output.append("- Lam the nao de xu ly loi mot cach than thien?\n\n")

    output.append("**Success Metrics:**\n\n")
    output.append("- **Task Completion Rate**: >=95% users hoan thanh tasks thanh cong\n")
    output.append("- **Time on Task**: Giam 30% so voi quy trinh thu cong\n")
    output.append("- **Error Rate**: <5% loi do UI/UX khong ro rang\n\n")

    output.append("**Target Users & Personas:**\n\n")
    roles = extract_all_roles(srs_data.user_stories)
    FOR role IN roles:
        output.append(f"- **{role}**: [Mo ta ngan vai tro]\n")

    output.append("\n")
    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE SECTION 1.2 (User Journey)
# ────────────────────────────────────────────────────────────

FUNCTION generate_user_journey(screens):
    output = []

    output.append("### 1.2 User Journey\n\n")

    output.append("**Entry Points** (User den tu dau):\n\n")
    output.append("- **Dashboard**: Click menu item hoac widget\n")
    output.append("- **Direct URL**: Bookmark hoac share link\n")
    output.append("- **Notification**: Click tu thong bao he thong\n\n")

    output.append("**Main Task Flows:**\n\n")
    output.append("```\n")
    output.append("[Entry] -> [List Screen] -> [Detail Screen] -> [Action] -> [Confirmation]\n")
    output.append("   |           |               |               |            |\n")
    output.append("   |           |               |               |            +-> Success/Error\n")
    output.append("   |           |               |               +-> Create/Edit/Delete\n")
    output.append("   |           |               +-> View details\n")
    output.append("   |           +-> Filter/Search/Sort\n")
    output.append("   +-> Dashboard/Menu\n")
    output.append("```\n\n")

    output.append("**Decision Points:**\n\n")
    output.append("| Decision | Options | Outcome |\n")
    output.append("|----------|---------|----------|\n")
    output.append("| User co quyen edit? | Yes/No | Show Edit button / Hide Edit button |\n")
    output.append("| Data dang loading? | Yes/No | Show skeleton / Show data |\n")
    output.append("| Form co loi? | Yes/No | Block submit / Allow submit |\n\n")

    output.append("**Exit Points** (User di dau tiep):\n\n")
    output.append("- **Back to List**: Sau khi complete action\n")
    output.append("- **Dashboard**: Click breadcrumb hoac menu\n")
    output.append("- **Related Feature**: Click link trong detail view\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 6: GENERATE SECTION 1.3 (Information Architecture)
# ────────────────────────────────────────────────────────────

FUNCTION generate_information_architecture(navigation_data):
    output = []

    output.append("### 1.3 Information Architecture\n\n")

    output.append("**Navigation Model:** Hub-and-Spoke\n\n")
    output.append("- **Hub**: Dashboard / List screen (central point)\n")
    output.append("- **Spokes**: Detail screens, Create/Edit forms (radiate from hub)\n")
    output.append("- **Navigation**: Breadcrumbs + Back button\n\n")

    output.append("**Information Hierarchy:**\n\n")
    output.append("| Level | Type | Examples | Display |\n")
    output.append("|-------|------|----------|----------|\n")
    output.append("| **Primary** | Critical data | Status, Amount, Date | Large font, prominent color |\n")
    output.append("| **Secondary** | Supporting info | Details, Metadata | Regular font, neutral color |\n")
    output.append("| **Hidden** | Optional info | Audit trail, History | Collapsed by default, expandable |\n\n")

    output.append("**Menu Structure:**\n\n")
    output.append("```\n")
    output.append("Main Menu\n")
    output.append("+- Dashboard\n")
    output.append("+- [Feature Name]\n")
    output.append("|  +- Danh sach (List)\n")
    output.append("|  +- Tao moi (Create)\n")
    output.append("|  +- Bao cao (Reports)\n")
    output.append("+- Cai dat (Settings)\n")
    output.append("```\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 7: GENERATE SECTION 1.4 (Screen List)
# ────────────────────────────────────────────────────────────

FUNCTION generate_screen_list(screens):
    output = []

    output.append("### 1.4 Danh sach man hinh\n\n")

    output.append("| Screen ID | Ten man hinh | URL | Muc dich | Quyen truy cap |\n")
    output.append("|-----------|--------------|-----|----------|----------------|\n")

    FOR screen IN screens:
        output.append(f"| {screen.id} | {screen.name_vi} | {screen.url} | {screen.purpose} | {screen.roles} |\n")

    output.append("\n")
    output.append(f"**Tong so man hinh**: {screens.length}\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 8: COMBINE ALL SECTIONS
# ────────────────────────────────────────────────────────────

FUNCTION generate_section(feature_name, sub_feature, developer):
    output = []

    feature_id = f"{feature_name}-{sub_feature}"

    srs_data = load_srs_document(feature_id)
    bd_data = load_basic_design(feature_id)

    screens = derive_screens(srs_data.user_stories, srs_data.functional_reqs, feature_id)

    IF screens.length < 3:
        raise Error(f"Need at least 3 screens, found {screens.length}")

    section_1_1 = generate_business_goals(srs_data, feature_name)
    section_1_2 = generate_user_journey(screens)
    section_1_3 = generate_information_architecture(bd_data.navigation)
    section_1_4 = generate_screen_list(screens)

    output.append(section_1_1)
    output.append(section_1_2)
    output.append(section_1_3)
    output.append(section_1_4)

    result = "".join(output)
    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: All required sections present?
    required_sections = ["1.1", "1.2", "1.3", "1.4"]
    FOR section IN required_sections:
        IF NOT contains(result, f"### {section}"):
            issues.append(f"Missing section {section}")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q3: Screen list has >=3 screens?
    screen_count = count_tables_rows(result, "Screen ID")
    IF screen_count < 3:
        issues.append(f"Screen list too short: {screen_count} screens (need >=3)")

    # Q4: No implementation code?
    prohibited_patterns = ["import ", "export ", "function ", "const ", "<"]
    FOR pattern IN prohibited_patterns:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited code: {pattern}")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

Returns Section 1 markdown content (150-250 lines) to orchestrator for assembly.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **SRS not found** | Feature path wrong | Verify feature directory structure |
| **No screens derived** | User stories missing | Check SRS Section 4 exists |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **Screen ID conflict** | Duplicate numbering | Use sequential numbering (001, 002, 003) |
| **< 3 screens** | Insufficient user stories | Check SRS completeness |

---

## Notes

### Technology Context

| Aspect | Value |
|--------|-------|
| **Framework** | React 18.x |
| **Language** | TypeScript 5.x |
| **Routing** | React Router v6 |
| **State Management** | Redux Toolkit + React Query |

### Constraints

**MUST Include**: Section 1.1 (>=3 business goals), Section 1.2 (user journey), Section 1.3 (navigation model), Section 1.4 (>=3 screens with SCR-[FEATURE]-### format), Vietnamese >=60%

**MUST Exclude**: Implementation code, Folder structure, Build configuration

**Format**: 150-250 lines, Vietnamese content + English technical terms, Screen ID format SCR-[FEATURE]-###

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-01-overview.md) and template (01-overview.md) into single file
- Removed JIT template loading (dead path)
- Consolidated pseudo-code logic from template into agent
- Removed Integration with Orchestrator, Best Practices, Template Version Compatibility sections

**v3.0 (2025-12-12)**:
- Switched to JIT template loading pattern
- Updated to match new 01-overview.md template
- Added 4 subsections (1.1-1.4) structure
- Removed hardcoded output format
- Enhanced validation (Q1-Q4)

**v2.0 (2025-12-11)**:
- Enhanced with pseudo-code pattern
- Added Vietnamese content requirements
- Improved screen derivation logic

**v1.0 (2025-11-20)**:
- Initial version with basic overview generation

---

*FDD-01: Overview Generator v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Tailwind CSS*
