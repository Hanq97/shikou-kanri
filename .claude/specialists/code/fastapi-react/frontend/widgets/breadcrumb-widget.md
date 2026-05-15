# Widget 11.35: BreadcrumbWidget

**Type**: Navigation Widget
**Role**: Breadcrumb navigation showing current page hierarchy
**Technology**: React 19, TypeScript, Next.js
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET BreadcrumbWidget {
  ROLE: "Breadcrumb trail navigation"

  RESPONSIBILITIES: [
    "Display page hierarchy path",
    "Show navigation breadcrumbs",
    "Support custom separators",
    "Include optional home icon",
    "Link to parent pages",
    "Highlight current page"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    routing: "Next.js Link component",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react"
  }

  DOMAIN_CONTEXT: {
    use_case: "Page navigation breadcrumb trail",
    vietnamese_labels: {
      home: "Trang chủ",
      documents: "Tài liệu",
      conversations: "Hội thoại"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN BreadcrumbWidget_Widget {
  PURPOSE: "Show page hierarchy and enable navigation via breadcrumbs"

  PROBLEM: "Users need clear indication of where they are in app structure"

  SOLUTION: "Semantic breadcrumb navigation with Home link by default"

  USE_CASES: [
    "Show page hierarchy",
    "Navigate to parent pages",
    "Understand current location",
    "See page context"
  ]

  COMPLEXITY: "LOW"
}
```

---

## Workflow

```pseudo
WORKFLOW BreadcrumbWidget_Workflow {
  INPUT: {
    items: BreadcrumbItem[],
    separator?: ReactNode,
    showHome?: boolean,
    className?: string
  }

  PRECONDITIONS: [
    "items array must not be empty",
    "Each item must have label",
    "href optional for non-clickable items"
  ]

  STEPS: {
    STEP_1_PREPARE_ITEMS: {
      description: "Prepare breadcrumb items with home if needed"
      logic: |
        IF showHome THEN
          PREPEND home item:
            { label: "Trang chủ", href: "/", icon: Home }
        END IF

        breadcrumbs = showHome ? [home, ...items] : items
    }

    STEP_2_RENDER_NAVIGATION: {
      description: "Render semantic breadcrumb navigation"
      logic: |
        RENDER nav element with:
          - aria-label: "Breadcrumb navigation"
          - className: "flex items-center gap-1"

        RENDER ordered list (ol)
    }

    STEP_3_RENDER_BREADCRUMB_ITEMS: {
      description: "Render each breadcrumb item"
      logic: |
        FOR EACH item, index IN breadcrumbs:
          RENDER list item (li)

          // Render separator
          IF index > 0 THEN
            RENDER separator:
              - default: ChevronRight icon
              - custom: custom separator if provided
            aria-hidden="true"
          END IF

          // Render item content
          isLast = (index == breadcrumbs.length - 1)

          IF item.href AND NOT isLast THEN
            // Clickable link
            RENDER Next.js Link to item.href
            RENDER button with:
              - color: blue-600
              - hover: underline
              - IF item.icon: SHOW icon with label
          ELSE
            // Non-clickable current page
            RENDER span with:
              - color: gray-900 if last, gray-700 if not
              - font-weight: medium if last
              - aria-current: "page" if last
              - IF item.icon: SHOW icon with label
          END IF
        END FOR
    }
  }

  ERROR_HANDLING: {
    EmptyItems: "Show only home",
    InvalidHref: "Render as non-clickable",
    LongLabels: "Truncate with ellipsis"
  }

  OUTPUT: {
    rendered_component: BreadcrumbNav,
    semantic: true,
    accessible: true
  }

  POSTCONDITIONS: [
    "Breadcrumbs render in correct order",
    "Current page not clickable",
    "Home item clickable (if shown)",
    "Separators display correctly"
  ]
}
```

---

## Key Interfaces

```typescript
// Breadcrumb Item
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
}

// Component Props
interface BreadcrumbWidgetProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  className?: string;
}

// Component Signature
function BreadcrumbWidget(props: BreadcrumbWidgetProps): JSX.Element
```

---

## Integration Points

```pseudo
INTEGRATION BreadcrumbWidget_Integration {
  PARENT_COMPONENTS: [
    "DocumentPage (show: Home > Documents > Doc Name)",
    "ConversationPage (show: Home > Conversations > Conv Name)",
    "UserPage (show: Home > Users > User Name)"
  ]

  ROUTING: {
    framework: "Next.js 15",
    link_component: "Next.js Link",
    pathname: "usePathname for active detection"
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Flex row with gap-1",
    colors: "Blue for links, gray for text"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE BreadcrumbWidget {
  SCENARIO: "User views document detail page"

  ACTORS: {
    user: "Lawyer viewing document",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User navigates to /documents/doc-123
      Page renders breadcrumb

    STEP_2: |
      System CALLS BreadcrumbWidget({
        showHome: true,
        items: [
          { label: "Tài liệu", href: "/documents", icon: FileText },
          { label: "Hợp đồng ABC Corp.pdf" }
        ],
        separator: undefined (use default ChevronRight)
      })

    STEP_3: |
      Breadcrumb shows:
      [Home icon] Trang chủ > [FileText icon] Tài liệu > Hợp đồng ABC Corp.pdf

    STEP_4: |
      "Trang chủ" and "Tài liệu" are clickable (blue, with links)
      "Hợp đồng ABC Corp.pdf" is not clickable (gray, current page)

    STEP_5: |
      User clicks "Tài liệu" (Documents)
      System navigates to /documents
      Breadcrumb updates to show new location
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE BreadcrumbWidget_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Simple component, no memoization needed",
    routing: "Links use Next.js native routing",
    css: "All CSS is static Tailwind classes"
  }

  BENCHMARKS: {
    target_render_time: "< 20ms",
    navigation: "Instant (Next.js Link)",
    typical_items: "3-5 items"
  }

  BEST_PRACTICES: [
    "Keep breadcrumb items to 5 or fewer",
    "Use semantic HTML (nav, ol, li)",
    "Include Home for context",
    "Show current page as non-clickable"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  BREADCRUMB_PATHS: {
    home: "Trang chủ",
    documents: "Tài liệu",
    conversations: "Hội thoại",
    users: "Người dùng",
    analytics: "Phân tích",
    settings: "Cài đặt"
  }

  LOCALIZATION: {
    language: "Vietnamese",
    home_label: "Trang chủ",
    separator: "ChevronRight (›)"
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING BreadcrumbWidget_Tests {
  UNIT_TESTS: [
    "Should render all breadcrumb items",
    "Should show home when enabled",
    "Should make current page non-clickable",
    "Should use custom separator if provided",
    "Should show icons when provided",
    "Should truncate long labels"
  ]

  INTEGRATION_TESTS: [
    "Clicking breadcrumb navigates correctly",
    "Home link goes to root",
    "Breadcrumbs update on route change",
    "Semantic HTML validates correctly"
  ]

  EDGE_CASES: [
    "Single item (only current page)",
    "Very long labels",
    "Many items (>10)",
    "Items without href",
    "Items without labels"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 289
**Status**: Completed
