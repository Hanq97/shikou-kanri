# FDD Micro-Agent: Visual Design Reference (Section 09) - v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-09-visual-design
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 9 - Visual Design Reference
- **Output**: Section 9.1-9.3 (Global design standards, External references, Feature-specific variations)
- **Language**: Vietnamese >=60%

---

## Purpose

Generate **Section 9: Visual Design Reference** for Frontend Detail Design document, including:
- **9.1**: Global Design Standards (reference to UXD-ux-design)
- **9.2**: External References (Figma, Storybook links)
- **9.3**: Feature-Specific UI Variations (ONLY if different from global)

**CRITICAL**:
- NO CSS code
- NO Tailwind class names
- NO color hex codes (use semantic names: "primary", "error")
- Most features inherit 100% from global design system
- Only document differences

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
}
```

**Auto-Read Files**:
1. **SRS Document**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-srs.md`
   - Section 1: Overview (for custom UI mentions)
   - Check for keywords: "custom color", "brand color", "special layout", "unique design"

**Context Loading Logic**:
```pseudo
FUNCTION load_context():
    result = node.run("core/state/state-manager.js", ["get"])
    context = json.parse(result.stdout)
    feature_id = f"{context.feature}-{context.sub}"

    # CHECK: If design system exists
    uxd_path = "documents/features/UXD-ux-design/"
    design_system_exists = directory_exists(uxd_path)

    # ANALYZE: If feature has custom UI
    has_custom_ui = check_for_custom_ui_requirements(feature_id)

    RETURN {feature_id, design_system_exists, has_custom_ui}

FUNCTION check_for_custom_ui_requirements(feature_id):
    # READ: SRS for custom UI mentions
    srs_path = f"documents/features/{feature_id}/{feature_id}-srs.md"
    srs_content = read_file(srs_path)

    # KEYWORDS: Indicating custom UI
    custom_keywords = ["custom color", "brand color", "special layout", "unique design", "custom theme"]

    FOR keyword IN custom_keywords:
        IF contains(srs_content.toLowerCase(), keyword):
            RETURN True

    RETURN False
```

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: 09-visual-design.md
# PURPOSE: Generate Visual Design Reference section
# ============================================================

# STEP 1: GENERATE GLOBAL DESIGN STANDARDS (9.1)
FUNCTION generate_global_standards(design_system_exists):
    output = []

    output.append("## 9. Visual Design Reference\n\n")
    output.append("### 9.1 Global Design Standards\n\n")

    IF design_system_exists:
        output.append("**Design System:**\n\n")
        output.append("Feature nay su dung **Global Design System** duoc dinh nghia tai:\n\n")
        output.append("- **Design Tokens**: `documents/features/UXD-ux-design/design-tokens.md`\n")
        output.append("- **Component Library**: `documents/features/UXD-ux-design/component-library.md`\n")
        output.append("- **Layout Patterns**: `documents/features/UXD-ux-design/layout-patterns.md`\n")
        output.append("- **Typography**: `documents/features/UXD-ux-design/typography.md`\n")
        output.append("- **Color Palette**: `documents/features/UXD-ux-design/colors.md`\n")
        output.append("- **Spacing Scale**: `documents/features/UXD-ux-design/spacing.md`\n")
        output.append("- **Iconography**: `documents/features/UXD-ux-design/icons.md`\n\n")
    ELSE:
        output.append("**Note**: Global Design System chua duoc tao.\n\n")
        output.append("**Fallback Standards:**\n\n")
        output.append("| Aspect | Standard | Reference |\n")
        output.append("|--------|----------|--------|\n")
        output.append("| **Colors** | Tailwind default palette | https://tailwindcss.com/docs/customizing-colors |\n")
        output.append("| **Typography** | Inter font, type scale | Tailwind typography plugin |\n")
        output.append("| **Spacing** | 4px base unit (0.25rem) | Tailwind spacing scale |\n")
        output.append("| **Components** | Headless UI | https://headlessui.com/ |\n")
        output.append("| **Icons** | Heroicons | https://heroicons.com/ |\n\n")

    output.append("**Key Design Principles:**\n\n")
    output.append("1. **Consistency**: Su dung cung components, colors, spacing trong toan app\n")
    output.append("2. **Accessibility**: WCAG 2.1 AA compliance (contrast ratio >=4.5:1, keyboard nav, screen readers)\n")
    output.append("3. **Responsiveness**: Mobile-first design, 3 breakpoints (mobile/tablet/desktop)\n")
    output.append("4. **Performance**: Optimize images, lazy load, code splitting\n")
    output.append("5. **Usability**: Clear labels, helpful error messages (Vietnamese), intuitive flows\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 2: GENERATE EXTERNAL REFERENCES (9.2)
FUNCTION generate_external_references(feature_id):
    output = []

    output.append("### 9.2 External References\n\n")

    output.append("**Design Assets:**\n\n")
    output.append("| Resource | Link | Purpose |\n")
    output.append("|----------|------|------|\n")

    # FIGMA: Check if exists
    figma_link = get_figma_link(feature_id)
    IF figma_link:
        output.append(f"| **Figma Design** | {figma_link} | UI mockups, prototypes, visual specs |\n")
    ELSE:
        output.append("| **Figma Design** | [Chua co] | UI mockups se duoc tao sau khi approve DD |\n")

    # STORYBOOK: Check if internal component library exists
    storybook_link = get_storybook_link()
    IF storybook_link:
        output.append(f"| **Storybook** | {storybook_link} | Interactive component documentation |\n")
    ELSE:
        output.append("| **Storybook** | [Chua co] | Component library docs (planned) |\n")

    # STYLE GUIDE
    output.append("| **Style Guide** | `documents/features/UXD-ux-design/` | Brand guidelines, design tokens |\n\n")

    output.append("**Development Handoff:**\n\n")
    output.append("Khi implement, developers se:\n")
    output.append("1. **Tham khao Figma**: De biet exact layout, spacing, colors\n")
    output.append("2. **Su dung Design Tokens**: Import from global CSS variables\n")
    output.append("3. **Reuse Components**: Tu component library (Storybook)\n")
    output.append("4. **Follow Detail Design**: Specs trong sections 1-8 cua document nay\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 3: GENERATE FEATURE-SPECIFIC UI VARIATIONS (9.3)
FUNCTION generate_feature_specific_ui(has_custom_ui, feature_id):
    output = []

    output.append("### 9.3 Feature-Specific UI Variations\n\n")

    IF NOT has_custom_ui:
        output.append("**Note**: Feature nay su dung 100% Global Design System.\n\n")
        output.append("Khong co custom UI variations. Tat ca components, colors, spacing deu follow global standards.\n\n")
        RETURN "".join(output)

    # IF custom UI exists, document variations
    output.append("**Custom UI Elements:**\n\n")
    output.append("Feature nay co mot so UI variations khac voi global design:\n\n")

    output.append("| Element | Global Standard | Feature Variation | Reason |\n")
    output.append("|---------|----------------|-------------------|--------|\n")

    # Examples: Common custom UI scenarios
    output.append("| **Primary color** | Blue (primary) | Custom brand color | Feature-specific branding |\n")
    output.append("| **Card layout** | Standard card (16px padding) | Compact card (8px padding) | Space-constrained screen |\n")
    output.append("| **Status badge** | Standard badge | Custom icon-badge | Better visual distinction |\n")

    output.append("\n")

    output.append("**Custom Component Specs:**\n\n")
    output.append("Chi tiet ve custom components:\n\n")
    output.append("- **Ten**: [Custom Component Name]\n")
    output.append("- **Mo ta**: [Purpose and usage]\n")
    output.append("- **Visual States**: [Normal, Hover, Active, Disabled]\n")
    output.append("- **Responsive**: [Mobile/Tablet/Desktop behavior]\n")
    output.append("- **Accessibility**: [ARIA attributes, keyboard navigation]\n\n")

    output.append("**Design Rationale:**\n\n")
    output.append("Ly do cho custom UI variations:\n")
    output.append("1. **[Reason 1]**: Specific business requirement\n")
    output.append("2. **[Reason 2]**: User feedback/testing\n")
    output.append("3. **[Reason 3]**: Technical constraint\n\n")

    output.append("---\n\n")

    RETURN "".join(output)

# STEP 4: ASSEMBLE COMPLETE SECTION 9
FUNCTION generate_section():
    data = load_context()
    output = []

    # GENERATE: All subsections
    output.append(generate_global_standards(data.design_system_exists))
    output.append(generate_external_references(data.feature_id))
    output.append(generate_feature_specific_ui(data.has_custom_ui, data.feature_id))

    result = "".join(output)

    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(result):
    issues = []

    # Q1: All required sections present?
    required_sections = ["9.1 Global Design Standards", "9.2 External References", "9.3 Feature-Specific"]
    FOR section IN required_sections:
        IF NOT contains(result, section):
            issues.append(f"Missing section: {section}")

    # Q2: Vietnamese ratio >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(result)
    IF vietnamese_ratio < 0.60:
        issues.append(f"Vietnamese ratio too low: {vietnamese_ratio:.1%}")

    # Q3: No implementation code?
    prohibited = ["class:", "className=", "style={{", "#3B82F6", "rgb(", "font-size:"]
    FOR pattern IN prohibited:
        IF contains(result, pattern):
            issues.append(f"Contains prohibited CSS code: {pattern}")

    # Q4: Format constraints?
    line_count = count_lines(result)
    IF line_count > 250:
        issues.append(f"Section too long: {line_count} lines (max 250)")

    IF issues.length > 0:
        RETURN {"valid": False, "issues": issues}
    ELSE:
        RETURN {"valid": True, "issues": []}
```

---

## Output Format

**Generated Markdown** (100-250 lines) containing sections 9.1-9.3 as specified in pseudo-code above.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **SRS not found** | Feature path wrong | Verify feature directory structure |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |
| **CSS code present** | Using implementation code | Remove all CSS/Tailwind classes |

---

## Notes

- **Technology Context**: Internal UI Component Library, Tailwind CSS 3.x, Heroicons / Lucide React, Inter (sans-serif) + JetBrains Mono (monospace), Figma (mockups/prototypes), Storybook (component docs)
- **Length**: 100-250 lines
- **Language**: Vietnamese >=60%
- **Note**: Most features will have minimal content (just references)

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-09-visual-design.md) + template (09-visual-design.md) into single file
- Removed JIT template loading (dead path)
- Inlined all pseudo-code logic from template

**v3.0 (2025-12-12)**:
- Initial version with JIT template loading pattern
- Implements 09-visual-design.md template (249 lines)
- Added 3 subsections (9.1-9.3) structure
- Enhanced validation (Q1-Q4)
- Vietnamese content requirements enforced

---

*FDD Micro-Agent: Visual Design Reference - v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + TypeScript 5.x + Tailwind CSS*
