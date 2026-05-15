# FDD-03: Screen Design v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-03-screens
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 3 - Thiet ke man hinh chi tiet
- **Output**: Section 3.1 (Screen Flow) + 3.2+ (Individual Screens)
- **Language**: Vietnamese >=60%
- **Merged From**: 4 previous agents (component-tree, screen-layout, component-details, form-handling)

---

## Purpose

Generate **Section 3: Thiet ke man hinh chi tiet** (Screen Design) for Frontend Detail Design document.

This unified agent combines content from 4 previous agents:
1. **Component Tree** -> Component composition hierarchy
2. **Screen Layout** -> ASCII wireframes and layout zones
3. **Component Details** -> Props, states, events specifications
4. **Form Handling** -> Form fields, validation, submission flow

**Output Structure**:
- **3.1**: Screen Flow Diagram (Mermaid navigation overview)
- **3.2+**: Individual screen specifications:
  - Screen metadata (ID, URL, purpose, roles)
  - ASCII wireframe (desktop + mobile)
  - Layout zones table
  - Component composition hierarchy (ASCII tree)
  - Component details tables (simple + complex components)
  - Form specifications (if form screen)
  - Responsive behavior (3 breakpoints)
  - Interactive elements table

**CRITICAL**:
- NO implementation code (React, JSX, hooks)
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
| SECTION_01_OUTPUT | ENV | Section 01 output (screen list) |
| SECTION_02_OUTPUT | ENV | Section 02 output (business flow) |

**Auto-Read Files**:
1. **SRS Document**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-srs.md`
   - Section 4: User Stories (to derive screens)
   - Section 5: Functional Requirements (for screen logic)
2. **Basic Design**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-basic-design.md`
   - Section 3: UI Flow (for navigation context)
   - Section 2: Component Overview (for component hierarchy)
3. **Section 01 Output**: Screen list from Section 1.4

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 03-screens.md
# PURPOSE: Generate Screen Design section (unified)
# ============================================================

# ────────────────────────────────────────────────────────────
# STEP 1: LOAD CONTEXT AND DEPENDENCIES
# ────────────────────────────────────────────────────────────

FUNCTION load_context():
    result = node.run("core/state/state-manager.js", ["get"])

    IF result.exit_code != 0:
        raise Error(f"Failed to get context: {result.stderr}")

    context = json.parse(result.stdout)
    feature_name = context.feature
    sub_feature = context.sub
    developer = context.developer
    feature_id = f"{feature_name}-{sub_feature}"

    feature_dir = feature_id.replace("-", "-").toLowerCase()
    srs_path = f"documents/features/{feature_dir}/{feature_id}-srs.md"
    bd_path = f"documents/features/{feature_dir}/{feature_id}-basic-design.md"

    srs_content = read_file(srs_path)
    bd_content = read_file(bd_path)

    user_stories = extract_user_stories(srs_content)
    components = extract_components_from_reasoning()

    RETURN {
        feature_id, feature_name, sub_feature, developer,
        user_stories, bd_content, components
    }

# ────────────────────────────────────────────────────────────
# STEP 2: DERIVE SCREENS FROM USER STORIES
# ────────────────────────────────────────────────────────────

FUNCTION derive_screens(user_stories, feature_id):
    screens = []
    screen_counter = 1

    screen_groups = {"list": [], "detail": [], "create": [], "edit": [], "other": []}

    FOR story IN user_stories:
        IF contains(story.description, "xem danh sach") OR contains(story.description, "view list"):
            screen_type = "list"
        ELSE IF contains(story.description, "xem chi tiet") OR contains(story.description, "view detail"):
            screen_type = "detail"
        ELSE IF contains(story.description, "tao moi") OR contains(story.description, "create"):
            screen_type = "create"
        ELSE IF contains(story.description, "chinh sua") OR contains(story.description, "edit"):
            screen_type = "edit"
        ELSE:
            screen_type = "other"

        screen_groups[screen_type].append(story)

    FOR screen_type, stories IN screen_groups:
        IF len(stories) > 0:
            FOR story IN stories:
                screen = {
                    "id": f"SCR-{feature_id}-{screen_counter:03d}",
                    "number": screen_counter,
                    "name_vi": infer_screen_name(story, screen_type),
                    "type": screen_type,
                    "url": infer_url(story, feature_id, screen_type),
                    "description": story.description,
                    "user_story_id": story.id,
                    "roles": extract_roles(story)
                }
                screens.append(screen)
                screen_counter += 1

    IF len(screens) < 3:
        raise Error("Need at least 3 screens for proper design")

    RETURN screens

# ────────────────────────────────────────────────────────────
# STEP 3: GENERATE SCREEN FLOW DIAGRAM (3.1)
# ────────────────────────────────────────────────────────────

FUNCTION generate_screen_flow_diagram(screens, feature_name):
    output = []

    output.append("## 3. Thiet ke man hinh chi tiet (Screen Design)\n\n")
    output.append("### 3.1 Screen Flow Diagram\n\n")
    output.append(f"**Luong dieu huong cho feature {feature_name}:**\n\n")
    output.append("```mermaid\n")
    output.append("flowchart TD\n")

    FOR screen IN screens:
        node_id = f"S{screen.number}"
        node_label = screen.name_vi
        output.append(f"    {node_id}[{node_label}]\n")

    output.append("\n    %% Navigation paths\n")

    list_screen = find_screen_by_type(screens, "list")
    detail_screen = find_screen_by_type(screens, "detail")
    create_screen = find_screen_by_type(screens, "create")
    edit_screen = find_screen_by_type(screens, "edit")

    IF list_screen AND detail_screen:
        output.append(f"    S{list_screen.number} -->|Click item| S{detail_screen.number}\n")
    IF list_screen AND create_screen:
        output.append(f"    S{list_screen.number} -->|Click + Tao moi| S{create_screen.number}\n")
    IF detail_screen AND edit_screen:
        output.append(f"    S{detail_screen.number} -->|Click Edit| S{edit_screen.number}\n")
    IF create_screen AND list_screen:
        output.append(f"    S{create_screen.number} -->|Submit success| S{list_screen.number}\n")
    IF edit_screen AND detail_screen:
        output.append(f"    S{edit_screen.number} -->|Save success| S{detail_screen.number}\n")

    output.append("\n    %% Styling\n")
    IF list_screen:
        output.append(f"    style S{list_screen.number} fill:#e1f5ff\n")
    IF detail_screen:
        output.append(f"    style S{detail_screen.number} fill:#fff3cd\n")
    IF create_screen:
        output.append(f"    style S{create_screen.number} fill:#d4edda\n")
    IF edit_screen:
        output.append(f"    style S{edit_screen.number} fill:#d4edda\n")

    output.append("```\n\n")
    output.append("**Legend:**\n")
    output.append("- Blue: List/Grid screens (danh sach)\n")
    output.append("- Yellow: Detail screens (xem chi tiet)\n")
    output.append("- Green: Form screens (tao/sua)\n\n")
    output.append("---\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 4: GENERATE SCREEN WIREFRAME
# ────────────────────────────────────────────────────────────

FUNCTION generate_wireframe(screen, screen_type):
    IF screen_type == "list":
        RETURN generate_list_wireframe(screen)
    ELSE IF screen_type == "detail":
        RETURN generate_detail_wireframe(screen)
    ELSE IF screen_type == "create" OR screen_type == "edit":
        RETURN generate_form_wireframe(screen)
    ELSE:
        RETURN generate_generic_wireframe(screen)

FUNCTION generate_list_wireframe(screen):
    wireframe = """
```
+---------------------------------------------------------------------------------+
|  APP HEADER (Fixed, z-index: 100)                                               |
|  +-----------------------------------------------------------------------------+|
|  | [Logo]  Navigation                                [Notifications] [User]    ||
|  +-----------------------------------------------------------------------------+|
+---------------------------------------------------------------------------------+
|  PAGE HEADER (Sticky, top: 64px)                                                |
|  +-----------------------------------------------------------------------------+|
|  | Home > {feature}                                                             ||
|  |                                                                              ||
|  | {screen_name}                                            [+ Tao moi] [Gear] ||
|  | {total_count} items - {stats}                                                ||
|  +-----------------------------------------------------------------------------+|
+---------------------------------------------------------------------------------+
|  FILTER SECTION (Collapsible)                                                   |
|  +-----------------------------------------------------------------------------+|
|  | [Search...]        [Status v] [Date v] [Category v]     [Apply] [Reset]     ||
|  +-----------------------------------------------------------------------------+|
+---------------------------------------------------------------------------------+
|  DATA TABLE                                                                      |
|  +-----------------------------------------------------------------------------+|
|  | # | ID     | Name            | Status      | Date        | Amount  | Actions||
|  +---+--------+-----------------+-------------+-------------+---------+---------+|
|  | # | #1001  | Item Name 1     | Active      | 2025-01-01  | $10,000 | [View] ||
|  | # | #1002  | Item Name 2     | Pending     | 2025-01-02  | $5,000  | [View] ||
|  +-----------------------------------------------------------------------------+|
+---------------------------------------------------------------------------------+
|  PAGINATION                                                                      |
|  +-----------------------------------------------------------------------------+|
|  | Showing 1-20 of 100            [< Previous]  [1] [2] [3]  [Next >]          ||
|  +-----------------------------------------------------------------------------+|
+---------------------------------------------------------------------------------+
```
"""
    RETURN wireframe

FUNCTION generate_detail_wireframe(screen):
    wireframe = """
```
+---------------------------------------------------------------------------------+
|  APP HEADER (Fixed)                                                              |
|  [Logo]  Navigation                                           [Bell] [User]      |
+---------------------------------------------------------------------------------+
|  PAGE HEADER                                                                     |
|  [< Back] Home > {feature} > #{id}                                              |
|                                                                                  |
|  {item_name}                                         [Edit] [Delete] [More]     |
|  Status: {status}  -  Created: {date}                                           |
+---------------------------------------------------------------------------------+
|  TAB NAVIGATION (Sticky)                                                         |
|  [Overview] [Details] [History] [Related]                                       |
+---------------------------------------------------------------------------------+
|  CONTENT AREA (2-column layout)                                                  |
|  +--------------------------------------+----------------------------------------+
|  | MAIN CONTENT (70%)                   | SIDEBAR (30%)                          |
|  | +------------------------------------+ +--------------------------------------+
|  | | Key Information                    | | Quick Stats                          |
|  | | +-------------+--------------------+ | +--------+-------------------+       |
|  | | | Field 1     | Value 1            | | | Stat 1 | 100               |       |
|  | | | Field 2     | Value 2            | | | Stat 2 | $10,000           |       |
|  | | +-------------+--------------------+ | +--------+-------------------+       |
|  | |                                    | |                                      |
|  | | Description                        | | Related Documents                    |
|  | | Lorem ipsum...                     | | Document 1.pdf                       |
|  +--------------------------------------+----------------------------------------+
+---------------------------------------------------------------------------------+
```
"""
    RETURN wireframe

FUNCTION generate_form_wireframe(screen):
    wireframe = """
```
+---------------------------------------------------------------------------------+
|  APP HEADER                                                                      |
|  [Logo]  Navigation                                           [Bell] [User]      |
+---------------------------------------------------------------------------------+
|  WIZARD HEADER                                                                   |
|  [X Cancel] {screen_name}                                     [Save Draft]      |
+---------------------------------------------------------------------------------+
|  PROGRESS STEPPER                                                                |
|  o-----------------o-----------------o                                          |
|  Step 1: Info      Step 2: Details  Step 3: Review                              |
+---------------------------------------------------------------------------------+
|  FORM CONTENT (centered, max-width: 800px)                                       |
|  +-----------------------------------------------------------------------------+|
|  | Step 1: Thong tin co ban                                                     ||
|  |                                                                              ||
|  | Field 1 *                                                                    ||
|  | +-----------------------------------------------------------------------+   ||
|  | | Enter value...                                                        |   ||
|  | +-----------------------------------------------------------------------+   ||
|  | X Error message (if any)                                                     ||
|  |                                                                              ||
|  | Field 2 *                                                                    ||
|  | +-----------------------------------------------------------------------+   ||
|  | | Select option... v                                                    |   ||
|  | +-----------------------------------------------------------------------+   ||
|  |                                                                              ||
|  | [< Cancel]                                                  [Continue >]    ||
|  +-----------------------------------------------------------------------------+|
+---------------------------------------------------------------------------------+
```
"""
    RETURN wireframe

# ────────────────────────────────────────────────────────────
# STEP 5: GENERATE COMPONENT MAPPING
# ────────────────────────────────────────────────────────────

FUNCTION generate_component_mapping(screen, components):
    output = []

    output.append("#### Component Composition\n\n")
    output.append("**Component Hierarchy (ASCII Tree):**\n\n")
    output.append("```\n")
    output.append(f"{screen.name_vi}/\n")

    screen_components = filter_components_by_screen(components, screen.id)
    tree = build_component_tree(screen_components)

    FOR node IN tree:
        render_tree_node(output, node, depth=0)

    output.append("```\n\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 6: GENERATE COMPONENT DETAILS TABLES
# ────────────────────────────────────────────────────────────

FUNCTION generate_component_details(screen, components):
    output = []

    simple_components = filter_simple_components(components, screen.id)

    IF len(simple_components) > 0:
        output.append("#### Simple Components\n\n")
        output.append("| Component ID | Type | Label/Text | Required | States | Events | Logic/Business Rules | Validation | Error Messages |\n")
        output.append("|--------------|------|------------|----------|--------|--------|---------------------|------------|----------------|\n")

        FOR comp IN simple_components:
            required = "Yes" IF comp.required ELSE "No"
            states = comp.states IF comp.states ELSE "-"
            events = comp.events IF comp.events ELSE "-"
            logic = comp.logic IF comp.logic ELSE "-"
            validation = comp.validation IF comp.validation ELSE "-"
            errors = comp.error_messages IF comp.error_messages ELSE "-"

            output.append(f"| {comp.id} | {comp.type} | {comp.label} | {required} | {states} | {events} | {logic} | {validation} | {errors} |\n")

        output.append("\n")

    complex_components = filter_complex_components(components, screen.id)

    FOR comp IN complex_components:
        output.append(f"#### Complex Component: {comp.id}\n\n")
        output.append(f"**Type:** {comp.type}\n\n")
        output.append(f"**Description:** {comp.description}\n\n")
        output.append("**Sub-Components:**\n\n")
        FOR sub_comp IN comp.sub_components:
            output.append(f"- {sub_comp.id}: {sub_comp.description}\n")
        output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 7: GENERATE RESPONSIVE BEHAVIOR
# ────────────────────────────────────────────────────────────

FUNCTION generate_responsive_behavior(screen):
    output = []

    output.append("#### Responsive Behavior\n\n")
    output.append("| Breakpoint | Layout Changes | Hidden Elements | Stacking |\n")
    output.append("|------------|----------------|-----------------|----------|\n")

    output.append("| **Desktop** (>=1024px) | Full layout as shown | None | Horizontal layout |\n")

    IF screen.type == "list":
        output.append("| **Tablet** (768-1023px) | Reduce columns, collapse filters | Low-priority columns | Filters accordion |\n")
        output.append("| **Mobile** (<768px) | Stack vertically, table -> card view | All optional columns | Full vertical stack |\n")
    ELSE IF screen.type == "detail":
        output.append("| **Tablet** (768-1023px) | 60/40 split, stack sidebar on scroll | None | Sidebar below content on scroll |\n")
        output.append("| **Mobile** (<768px) | Full stack, sidebar below content | Stats, breadcrumb | Full vertical stack |\n")
    ELSE IF screen.type == "form":
        output.append("| **Tablet** (768-1023px) | Reduce padding, single column | None | Full vertical stack |\n")
        output.append("| **Mobile** (<768px) | Single column, reduced padding | Helper text, optional fields | Full vertical stack |\n")

    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 8: GENERATE INTERACTIVE ELEMENTS
# ────────────────────────────────────────────────────────────

FUNCTION generate_interactive_elements(screen):
    output = []

    output.append("#### Interactive Elements\n\n")
    output.append("| Element | Interaction | Feedback |\n")
    output.append("|---------|-------------|----------|\n")

    IF screen.type == "list":
        output.append("| Checkbox (row) | Click -> Toggle selection | Row highlight, bulk bar appears |\n")
        output.append("| Column header | Click -> Sort by column | Arrow icon (up/down), table reorders |\n")
        output.append("| [View] button | Click -> Navigate to detail | Transition to detail screen |\n")
        output.append("| Filter fields | Input -> Debounced filter | Loading state, table updates |\n")
        output.append("| Pagination | Click page -> Load page | Loading skeleton, content swap |\n")
    ELSE IF screen.type == "detail":
        output.append("| [Edit] button | Click -> Navigate to edit | Transition to edit form |\n")
        output.append("| Tab navigation | Click tab -> Switch content | Tab highlight, content swap |\n")
        output.append("| [Delete] button | Click -> Show confirm modal | Modal appears |\n")
    ELSE IF screen.type == "form":
        output.append("| Input field | Type -> Validation | Inline error (red border) |\n")
        output.append("| [Next] button | Click -> Validate + Next step | Errors or next step |\n")
        output.append("| [Submit] button | Click -> Submit form | Loading spinner, success/error toast |\n")

    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 9: GENERATE SINGLE SCREEN SECTION
# ────────────────────────────────────────────────────────────

FUNCTION generate_screen_section(screen, components, section_number):
    output = []

    output.append(f"### 3.{section_number} {screen.id}: {screen.name_vi}\n\n")

    # METADATA
    output.append("#### Screen Metadata\n\n")
    output.append("| Property | Value |\n")
    output.append("|----------|-------|\n")
    output.append(f"| Screen ID | {screen.id} |\n")
    output.append(f"| Ten man hinh | {screen.name_vi} |\n")
    output.append(f"| URL/Route | {screen.url} |\n")
    output.append(f"| Muc dich | {screen.description} |\n")
    output.append(f"| User roles | {screen.roles} |\n")
    output.append("\n")

    # WIREFRAME
    output.append("#### Layout (Desktop >=1024px)\n\n")
    wireframe = generate_wireframe(screen, screen.type)
    output.append(wireframe)
    output.append("\n")

    # LAYOUT ZONES
    output.append(generate_layout_zones(screen))

    # COMPONENT MAPPING
    output.append(generate_component_mapping(screen, components))

    # COMPONENT DETAILS
    output.append(generate_component_details(screen, components))

    # RESPONSIVE BEHAVIOR
    output.append(generate_responsive_behavior(screen))

    # INTERACTIVE ELEMENTS
    output.append(generate_interactive_elements(screen))

    output.append("---\n\n")

    RETURN "".join(output)

FUNCTION generate_layout_zones(screen):
    output = []

    output.append("#### Layout Zones\n\n")
    output.append("| Zone | Component | Height | Sticky/Fixed | Description |\n")
    output.append("|------|-----------|--------|--------------|-------------|\n")

    output.append("| App Header | HeaderContainer | 64px | Fixed top | Logo, navigation, user menu |\n")

    IF screen.type == "list":
        output.append("| Page Header | PageHeaderContainer | 120px | Sticky (top: 64px) | Breadcrumb, title, actions, stats |\n")
        output.append("| Filter Section | FilterContainer | Auto (min 80px) | Static | Search, filters, view controls |\n")
        output.append("| Data Table | TableContainer | Auto (fill) | Scrollable | Main content, rows |\n")
        output.append("| Pagination | PaginationContainer | 64px | Static | Page navigation |\n")
    ELSE IF screen.type == "detail":
        output.append("| Page Header | DetailHeaderContainer | 100px | Static | Back button, title, actions |\n")
        output.append("| Tab Navigation | TabNav | 56px | Sticky (top: 164px) | Tab switcher |\n")
        output.append("| Main Content | DetailContentContainer | Auto | Scrollable | Primary information |\n")
        output.append("| Sidebar | DetailSidebarContainer | Auto | Scrollable | Stats, actions, documents |\n")
    ELSE IF screen.type == "form":
        output.append("| Wizard Header | WizardHeaderContainer | 80px | Static | Cancel, title, save draft |\n")
        output.append("| Progress Stepper | StepperContainer | 100px | Static | Step indicators |\n")
        output.append("| Form Content | FormContentContainer | Auto (fill) | Scrollable | Form fields |\n")
        output.append("| Form Actions | FormActionsContainer | 80px | Sticky (bottom) | Cancel, Next/Submit buttons |\n")

    output.append("\n")

    RETURN "".join(output)

# ────────────────────────────────────────────────────────────
# STEP 10: ASSEMBLE COMPLETE SECTION 3
# ────────────────────────────────────────────────────────────

FUNCTION generate_section():
    data = load_context()

    screens = derive_screens(data.user_stories, data.feature_id)

    output = []

    output.append(generate_screen_flow_diagram(screens, data.feature_name))

    section_number = 2
    FOR screen IN screens:
        output.append(generate_screen_section(screen, data.components, section_number))
        section_number += 1

    result = "".join(output)

    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: All required sections present?
    required_sections = ["3.1 Screen Flow Diagram", "Screen Metadata", "Layout (Desktop", "Component Composition"]
    FOR section IN required_sections:
        IF NOT contains(result, section):
            issues.append(f"Missing required section: {section}")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%} (required >=60%)")

    # Q3: No prohibited content?
    prohibited_patterns = ["function ", "const ", "import ", "export ", "className=", "onClick="]
    FOR pattern IN prohibited_patterns:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited code pattern: {pattern}")

    # Q4: Format constraints?
    line_count = count_lines(result)
    IF line_count < 500 OR line_count > 800:
        issues.append(f"Line count out of range: {line_count} (recommended 500-800)")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

Returns Section 3 markdown content (500-800 lines, depends on screen count) to orchestrator for assembly.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **SRS not found** | Feature path wrong | Verify feature directory structure |
| **No screens derived** | User stories missing | Check SRS Section 4 exists |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **Screen ID conflict** | Duplicate numbering | Use sequential numbering (001, 002, 003) |
| **ASCII width > 150 chars** | Wireframe too wide | Break into multiple lines |
| **Missing component hierarchy** | Not extracted from reasoning | Check reasoning JSON output |
| **< 3 screens** | Insufficient user stories | Check SRS completeness |

---

## Notes

### Technology Context

| Aspect | Value |
|--------|-------|
| **Framework** | React 18.x (Server + Client Components) |
| **Language** | TypeScript 5.x |
| **Styling** | Tailwind CSS 3.x |
| **Layout** | CSS Grid + Flexbox |
| **Responsive** | Mobile-first design |
| **State Management** | Redux Toolkit (UI) + React Query (Server) |
| **Forms** | React Hook Form + Zod |
| **Component Pattern** | Container/Presenter pattern |

### Constraints

**MUST Include**: Section 3.1 (Screen Flow Diagram), For each screen: Screen ID, metadata table, ASCII wireframe, layout zones, component hierarchy, component details, responsive behavior, interactive elements. Mobile wireframe optional but recommended.

**MUST Exclude**: React component code (JSX, hooks), CSS/Tailwind classes, TypeScript interfaces, Implementation details

**Format**: 500-800 lines, Vietnamese >=60%, ASCII width <=150 chars, Screen ID format SCR-[FEATURE]-###

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-03-screens.md) and template (03-screens.md) into single file
- Removed JIT template loading (dead path)
- Consolidated pseudo-code logic from template into agent
- Removed Integration with Orchestrator, Best Practices, Template Version Compatibility sections

**v3.0 (2025-12-12)**:
- Initial unified version with JIT template loading pattern
- Merged 4 previous agents:
  - fdd-02-component-tree.md -> Component hierarchy
  - fdd-03-screen-layout.md -> ASCII wireframes
  - fdd-04-component-details.md -> Props/states/events
  - fdd-08-form-handling.md -> Form specifications
- Implements 03-screens.md template (780 lines)
- Added comprehensive screen specifications
- Enhanced validation (Q1-Q4)
- Vietnamese content requirements enforced

---

*FDD-03: Screen Design v4.0 (Unified)*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Tailwind CSS*
*Merged from 4 agents: Component Tree + Screen Layout + Component Details + Form Handling*
