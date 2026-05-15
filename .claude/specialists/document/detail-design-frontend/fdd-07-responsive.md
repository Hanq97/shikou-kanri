# FDD Micro-Agent: Responsive Design (Section 07) - v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-07-responsive
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 7 - Responsive Design
- **Output**: Section 7.1-7.4 (Breakpoints, Component behavior, Content priority, Hidden elements)
- **Language**: Vietnamese >=60%

---

## Purpose

Generate **Section 7: Responsive Design** for Frontend Detail Design document, including:
- **7.1**: Breakpoints (5 breakpoints with use cases)
- **7.2**: Component Behavior by Screen Size (table format)
- **7.3**: Content Priority (Mobile) (progressive enhancement)
- **7.4**: Hidden/Modified Elements on Mobile (what to show/hide)

**CRITICAL**:
- NO Tailwind CSS classes (use descriptions: "full width", "2 columns")
- NO media query code
- NO React component code
- Only responsive specifications

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:
```javascript
ENV = {
  FEATURE_NAME: "LND",        // Feature code
  SUB_FEATURE: "BASE",        // Sub-feature code
  DEVELOPER: "Developer Name",
  REASONING_JSON: {...},      // Reasoning output (if available)
  SECTION_00_OUTPUT: "...",   // Section 00 output (Document Info)
  SECTION_01_OUTPUT: "...",   // Section 01 output (Overview)
  SECTION_02_OUTPUT: "...",   // Section 02 output (Business Flow)
  SECTION_03_OUTPUT: "...",   // Section 03 output (Screen Design)
}
```

**Auto-Read Files**:
1. **Section 03 Output**: Screen Design (for component list and layout)

**Context Loading Logic**:
```pseudo
FUNCTION load_context():
    result = node.run("core/state/state-manager.js", ["get"])
    context = json.parse(result.stdout)
    feature_id = f"{context.feature}-{context.sub}"

    # READ: Previous sections (especially Section 3 - Screens)
    fdd_path = f"documents/features/{feature_id}/{feature_id}-frontend-detail-design.md"
    section_03 = extract_section(fdd_path, "3. Thiet ke man hinh chi tiet")

    # PARSE: Extract screens from Section 3
    screens = extract_screens_from_section(section_03)

    RETURN {feature_id, screens}
```

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 07-responsive.md
# PURPOSE: Generate Responsive Design section
# ============================================================

# STEP 1: GENERATE BREAKPOINTS DEFINITION (7.1)
FUNCTION generate_breakpoints():
    output = []

    output.append("## 7. Responsive Design\n\n")
    output.append("### 7.1 Breakpoints\n\n")

    output.append("**Mobile-First Approach:**\n\n")
    output.append("Thiet ke bat dau tu mobile, sau do mo rong len tablet va desktop.\n\n")

    output.append("| Breakpoint | Width | Device | Primary Use | Layout Approach |\n")
    output.append("|------------|-------|--------|-------------|------------------|\n")
    output.append("| **xs (Base)** | < 640px | Mobile phones | Single hand use | Single column, stacked |\n")
    output.append("| **sm** | >= 640px | Large phones | Portrait orientation | Single column, larger spacing |\n")
    output.append("| **md** | >= 768px | Tablets | iPad Mini, iPad | 2 columns, sidebar appears |\n")
    output.append("| **lg** | >= 1024px | Tablets/Laptops | iPad Pro, small laptops | Full layout, all features |\n")
    output.append("| **xl** | >= 1280px | Desktops | Standard monitors | Multi-column, max width 1280px |\n")
    output.append("| **2xl** | >= 1536px | Large displays | Wide monitors | Container max-width, centered |\n\n")

    output.append("**Design Priorities by Device:**\n\n")
    output.append("| Device | Priority | Focus | Constraints |\n")
    output.append("|--------|----------|-------|-------------|\n")
    output.append("| Mobile | Task completion | Essential actions only | Limited screen space, touch targets |\n")
    output.append("| Tablet | Balance | Hybrid experience | Mix of touch + keyboard, landscape mode |\n")
    output.append("| Desktop | Information density | Show all data, shortcuts | Mouse precision, large viewport |\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 2: GENERATE COMPONENT BEHAVIOR (7.2)
FUNCTION generate_component_behavior(screens):
    output = []

    output.append("### 7.2 Component Behavior by Screen Size\n\n")

    # CATEGORIZE: Components by type
    component_types = [
        "Navigation", "Header", "Sidebar", "Table/Grid",
        "Forms", "Modals", "Cards", "Buttons"
    ]

    output.append("| Component Type | Mobile (<768px) | Tablet (768-1023px) | Desktop (>=1024px) |\n")
    output.append("|----------------|-----------------|---------------------|-------------------|\n")

    # Navigation
    output.append("| **Navigation** | Hamburger menu (drawer) | Horizontal tabs | Full menu bar |\n")

    # Header
    output.append("| **Header** | Logo + hamburger (56px) | Logo + key links (64px) | Full header (64px) |\n")

    # Sidebar
    output.append("| **Sidebar** | Hidden (bottom sheet if needed) | Collapsible (icon-only) | Fixed (full width 240px) |\n")

    # Table/Grid
    output.append("| **Table/Grid** | Card view (stack) | Reduced columns (4-5) | Full table (all columns) |\n")

    # Forms
    output.append("| **Forms** | Single column, full width | Single column, max-width 600px | 2 columns, max-width 800px |\n")

    # Modals
    output.append("| **Modals** | Full screen | Centered (80% width) | Centered (max 600px width) |\n")

    # Cards
    output.append("| **Cards** | Full width, stack | 2 columns grid | 3-4 columns grid |\n")

    # Buttons
    output.append("| **Buttons** | Full width (block) | Inline (auto width) | Inline (auto width) |\n\n")

    output.append("**Component-Specific Adaptations:**\n\n")
    output.append("| Component | Mobile Adaptation | Reason |\n")
    output.append("|-----------|-------------------|--------|\n")
    output.append("| Filter panel | Bottom sheet modal | Preserve screen space |\n")
    output.append("| Data table | Horizontal scroll or card view | Table doesn't fit narrow screen |\n")
    output.append("| Action buttons | FAB (floating action button) | Thumb-friendly position |\n")
    output.append("| Pagination | Simplified (Prev/Next only) | Reduce tap targets |\n")
    output.append("| Breadcrumbs | Hide intermediate levels | Show only current page |\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 3: GENERATE CONTENT PRIORITY (7.3)
FUNCTION generate_content_priority():
    output = []

    output.append("### 7.3 Content Priority (Mobile)\n\n")

    output.append("**Progressive Enhancement Strategy:**\n\n")
    output.append("Mobile hien thi noi dung uu tien cao nhat, cac noi dung phu duoc an hoac thu gon.\n\n")

    output.append("**Priority Levels:**\n\n")
    output.append("| Priority | Content Type | Mobile Display | Desktop Display | Example |\n")
    output.append("|----------|--------------|----------------|-----------------|------|\n")
    output.append("| **P0 (Critical)** | Primary action | Prominent button | Same | \"Tao moi\", \"Submit\" |\n")
    output.append("| **P1 (High)** | Core data | Full display | Same | Item name, status, amount |\n")
    output.append("| **P2 (Medium)** | Secondary info | Collapsed/Hidden | Visible | Metadata, timestamps |\n")
    output.append("| **P3 (Low)** | Auxiliary | Hidden | Visible | Tooltips, help text |\n")
    output.append("| **P4 (Optional)** | Enhancement | Hidden | Visible | Advanced filters, stats |\n\n")

    output.append("**Mobile Content Strategy:**\n\n")
    output.append("| Screen Type | Show on Mobile | Hide on Mobile | Access Method |\n")
    output.append("|-------------|----------------|----------------|---------------|\n")
    output.append("| **List** | Item name, status, primary action | Stats, secondary columns, bulk actions | Tap item -> Detail |\n")
    output.append("| **Detail** | Key fields, primary actions | Related data, metadata | Tabs, accordion |\n")
    output.append("| **Form** | Required fields only | Optional fields, help text | \"Show more\" toggle |\n")
    output.append("| **Dashboard** | Top 3 metrics, recent items | Full charts, filters | Scroll down, drill-down |\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 4: GENERATE HIDDEN/MODIFIED ELEMENTS (7.4)
FUNCTION generate_hidden_elements(screens):
    output = []

    output.append("### 7.4 Hidden/Modified Elements on Mobile\n\n")

    output.append("**Elements Hidden on Mobile (<768px):**\n\n")
    output.append("| Element | Screen | Reason | Alternative |\n")
    output.append("|---------|--------|--------|-------------|\n")

    # COMMON: Hidden elements across screens
    output.append("| Breadcrumbs | All | Space constraint | Back button |\n")
    output.append("| Advanced filters | List screens | Complexity | Basic search + filter modal |\n")
    output.append("| Bulk actions | List screens | No multi-select | Individual actions |\n")
    output.append("| Table columns (non-essential) | List screens | Table doesn't fit | Card view |\n")
    output.append("| Sidebar | Detail screens | No space | Bottom tabs or accordion |\n")
    output.append("| Tooltips | All | No hover on mobile | Tap for modal info |\n")
    output.append("| Keyboard shortcuts | All | No keyboard | Touch gestures |\n\n")

    output.append("**Elements Modified on Mobile:**\n\n")
    output.append("| Element | Desktop Version | Mobile Version | Reason |\n")
    output.append("|---------|-----------------|----------------|--------|\n")
    output.append("| Navigation | Horizontal menu | Hamburger drawer | Save space |\n")
    output.append("| Table | Multi-column table | Card list | Better readability |\n")
    output.append("| Form | 2-3 columns | Single column | Easier input |\n")
    output.append("| Modal | Centered (600px) | Full screen | Use all space |\n")
    output.append("| Pagination | Page numbers (1,2,3...) | Prev/Next only | Reduce taps |\n")
    output.append("| Dropdown | Inline dropdown | Native picker | Better UX |\n\n")

    output.append("**Touch-Optimized Modifications:**\n\n")
    output.append("| Element | Desktop Size | Mobile Size | Guideline |\n")
    output.append("|---------|--------------|-------------|--------|\n")
    output.append("| Buttons | 32-40px height | 44px height | iOS/Android minimum |\n")
    output.append("| Input fields | 36px height | 44px height | Easier tap |\n")
    output.append("| List items | 40px height | 56px height | Thumb-friendly |\n")
    output.append("| Icons (clickable) | 24x24px | 32x32px | Larger tap target |\n")
    output.append("| Spacing | 8-16px | 16-24px | Prevent mis-taps |\n\n")

    output.append("**Mobile-Specific Features:**\n\n")
    output.append("| Feature | Purpose | Implementation |\n")
    output.append("|---------|---------|----------------|\n")
    output.append("| Pull to refresh | Reload data | Swipe down gesture |\n")
    output.append("| Swipe actions | Quick actions (delete, archive) | Swipe left/right on list items |\n")
    output.append("| Bottom sheet | Filters, actions | Slide up from bottom |\n")
    output.append("| FAB (Floating Action Button) | Primary action | Fixed bottom-right |\n")
    output.append("| Infinite scroll | Load more data | Alternative to pagination |\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 5: ASSEMBLE COMPLETE SECTION 7
FUNCTION generate_section():
    data = load_context()
    output = []

    # GENERATE: All subsections
    output.append(generate_breakpoints())
    output.append(generate_component_behavior(data.screens))
    output.append(generate_content_priority())
    output.append(generate_hidden_elements(data.screens))

    result = "".join(output)

    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: All required sections present?
    required_sections = ["7.1 Breakpoints", "7.2 Component Behavior", "7.3 Content Priority", "7.4 Hidden"]
    FOR section IN required_sections:
        IF NOT contains(result, section):
            issues.append(f"Missing section: {section}")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q3: No prohibited content?
    prohibited = ["className=", "class:", "@media", "md:", "lg:"]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited CSS/code: {pattern}")

    # Q4: Format constraints?
    line_count = count_lines(result)
    IF line_count < 300 OR line_count > 400:
        issues.append(f"Line count out of range: {line_count} (recommended 300-400)")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

**Generated Markdown** (300-400 lines) containing sections 7.1-7.4 as specified in pseudo-code above.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Section 03 not found** | Screen Design missing | Generate Section 03 first |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **Tailwind classes present** | Using implementation code | Remove all CSS classes |

---

## Notes

- **Technology Context**: Tailwind CSS 3.x, Mobile-first design, CSS Grid + Flexbox
- **Breakpoints**: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- **Touch Targets**: Minimum 44x44px (iOS/Android guidelines)
- **Length**: 300-400 lines
- **Language**: Vietnamese >=60%
- **Tables**: Markdown format with Vietnamese headers

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-07-responsive.md) + template (07-responsive.md) into single file
- Removed JIT template loading (dead path)
- Inlined all pseudo-code logic from template

**v3.0 (2025-12-12)**:
- Initial version with JIT template loading pattern
- Implements 07-responsive.md template (359 lines)
- Added 4 subsections (7.1-7.4) structure
- Enhanced validation (Q1-Q4)
- Vietnamese content requirements enforced

---

*FDD Micro-Agent: Responsive Design - v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Tailwind CSS*
