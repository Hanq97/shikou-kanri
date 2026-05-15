# Widget 11.31: NavigationSidebar

**Type**: Navigation Widget
**Role**: Main application navigation with collapsible menu support
**Technology**: React 19, TypeScript, Next.js routing
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET NavigationSidebar {
  ROLE: "Primary application navigation sidebar"

  RESPONSIBILITIES: [
    "Display main navigation menu items",
    "Support sidebar collapse/expand",
    "Track active route with pathname detection",
    "Show badge notifications for unread items",
    "Handle logout action",
    "Maintain hydration safety"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    routing: "Next.js 15 with usePathname hook",
    state_management: "React useState",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react"
  }

  DOMAIN_CONTEXT: {
    use_case: "Main app navigation for legal platform",
    menu_items: ["Dashboard", "Users", "Documents", "Conversations", "Analytics", "Settings"],
    vietnamese_labels: {
      dashboard: "Bảng điều khiển",
      users: "Người dùng",
      documents: "Tài liệu",
      conversations: "Hội thoại",
      analytics: "Phân tích",
      settings: "Cài đặt",
      logout: "Đăng xuất"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN NavigationSidebar_Widget {
  PURPOSE: "Provide collapsible main navigation with active state tracking"

  PROBLEM: "Apps need flexible navigation that saves screen space when collapsed"

  SOLUTION: "Sidebar with smooth collapse/expand animation and active route highlighting"

  USE_CASES: [
    "Navigate between main app sections",
    "Show unread notification badges",
    "Toggle sidebar in responsive layouts",
    "Quick access to important sections"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW NavigationSidebar_Workflow {
  INPUT: {
    items?: NavItemConfig[],
    onLogout?: Function,
    defaultCollapsed?: boolean
  }

  PRECONDITIONS: [
    "Navigation items must have label, href, icon",
    "Next.js usePathname must be available",
    "Component must run in client-side environment"
  ]

  STEPS: {
    STEP_1_HYDRATION_CHECK: {
      description: "Prevent hydration mismatch on SSR apps"
      logic: |
        USE useEffect hook
        INITIALLY render skeleton with defaultCollapsed width
        ON mount:
          SET mounted = true
          RETURN actual navigation content
    }

    STEP_2_DETECT_ACTIVE_ROUTE: {
      description: "Track current page and highlight active menu item"
      logic: |
        GET pathname using usePathname()
        FOR EACH item IN items:
          IF pathname.startsWith(item.href) THEN
            item.isActive = true
            APPLY active styles (blue background)
          ELSE
            item.isActive = false
          END IF
        END FOR
    }

    STEP_3_RENDER_HEADER: {
      description: "Render sidebar header with logo and collapse button"
      logic: |
        RENDER header section (h-16)
        IF NOT isCollapsed THEN
          SHOW logo (X) icon
          SHOW "StarX4CRM" text
        END IF
        SHOW collapse/expand button
    }

    STEP_4_RENDER_NAVIGATION_ITEMS: {
      description: "Render navigation menu items"
      logic: |
        RENDER scrollable navigation section
        FOR EACH item IN items:
          RENDER navigation item
          SHOW icon
          IF NOT isCollapsed THEN
            SHOW label text
            IF item.badge THEN
              SHOW badge with count
            END IF
          END IF

          ON click:
            NAVIGATE to item.href
        END FOR
    }

    STEP_5_RENDER_FOOTER: {
      description: "Render sidebar footer with logout"
      logic: |
        RENDER footer section
        IF onLogout THEN
          RENDER logout button (red variant)
          IF isCollapsed THEN
            SHOW icon only
          ELSE
            SHOW "Đăng xuất" (Logout) text
          END IF
        END IF
    }

    STEP_6_HANDLE_COLLAPSE: {
      description: "Toggle sidebar collapse state"
      logic: |
        ON collapse button click:
          SET isCollapsed = !isCollapsed
          APPLY smooth transition (duration-300)
          WIDTH changes from w-64 to w-16
    }
  }

  ERROR_HANDLING: {
    NavigationError: "Log error and show fallback menu",
    HydrationError: "Render skeleton until mounted",
    RouteError: "Default to dashboard"
  }

  OUTPUT: {
    rendered_component: NavigationElement,
    width: "w-64 or w-16",
    height: "h-screen full height",
    sticky: true
  }

  POSTCONDITIONS: [
    "Navigation renders without hydration errors",
    "Active route highlights correctly",
    "Collapse/expand animation is smooth",
    "All links are functional"
  ]
}
```

---

## Key Interfaces

```typescript
// Navigation Configuration
interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  description?: string;
  children?: NavItemConfig[];
}

// Component Props
interface NavigationSidebarProps {
  items?: NavItemConfig[];
  onLogout?: () => void;
  defaultCollapsed?: boolean;
}

// Component Signature
function NavigationSidebar(props: NavigationSidebarProps): JSX.Element

// Default Navigation Items
const defaultNavItems: NavItemConfig[] = [
  { label: "Bảng điều khiển", href: "/dashboard", icon: LayoutGrid },
  { label: "Người dùng", href: "/users", icon: Users },
  { label: "Tài liệu", href: "/documents", icon: FileText, badge: 12 },
  { label: "Hội thoại", href: "/conversations", icon: MessageSquare, badge: 5 },
  { label: "Phân tích", href: "/analytics", icon: BarChart3 },
  { label: "Cài đặt", href: "/settings", icon: Settings }
]
```

---

## Integration Points

```pseudo
INTEGRATION NavigationSidebar_Integration {
  PARENT_COMPONENTS: [
    "AppShell (main layout wrapper)",
    "AdminLayout (admin dashboard)",
    "MainLayout (user application)"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for isCollapsed, mounted",
    global_state: "localStorage for collapsed preference (future)",
    routing: "Next.js usePathname for active detection"
  }

  ROUTING: {
    framework: "Next.js 15 app router",
    link_component: "Next.js Link component",
    pathname_detection: "usePathname hook"
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Flex column full height",
    animations: "Smooth width transition (300ms)",
    colors: "Blue accents for active, red for logout"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE NavigationSidebar {
  SCENARIO: "User navigates between app sections"

  ACTORS: {
    user: "Lawyer using application",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User logs in and sees main dashboard
      NavigationSidebar renders with default items

    STEP_2: |
      System CALLS NavigationSidebar({
        items: defaultNavItems,
        defaultCollapsed: false,
        onLogout: () => logout()
      })

    STEP_3: |
      Sidebar shows "Bảng điều khiển" highlighted (active)
      Sidebar shows badge counts for Documents (12) and Conversations (5)

    STEP_4: |
      User clicks "Tài liệu" (Documents) link
      System navigates to /documents
      Sidebar highlights Documents item with blue background

    STEP_5: |
      User clicks collapse button
      Sidebar smoothly transitions to icon-only mode (w-16)
      Text labels disappear, only icons show

    STEP_6: |
      User clicks expand button
      Sidebar returns to full width (w-64)
      Text labels and badges reappear

    STEP_7: |
      User clicks "Đăng xuất" (Logout) button
      System calls onLogout callback
      User is logged out
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE NavigationSidebar_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Memoize navigation items list",
    routing: "Cache pathname detection results",
    transitions: "Use CSS transitions for animations",
    hydration: "Render skeleton until mounted"
  }

  BENCHMARKS: {
    target_render_time: "< 100ms",
    initial_hydration: "< 200ms",
    collapse_animation: "300ms smooth transition",
    route_detection: "< 50ms"
  }

  BEST_PRACTICES: [
    "Memoize entire component",
    "Use useCallback for handlers",
    "Use CSS for animations (not JS)",
    "Load collapsed state from localStorage"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  NAVIGATION_STRUCTURE: {
    primary_sections: [
      { name: "Bảng điều khiển", href: "/dashboard" },
      { name: "Người dùng", href: "/users" },
      { name: "Tài liệu", href: "/documents" },
      { name: "Hội thoại", href: "/conversations" },
      { name: "Phân tích", href: "/analytics" },
      { name: "Cài đặt", href: "/settings" }
    ]
  }

  LOCALIZATION: {
    language: "Vietnamese",
    logout_label: "Đăng xuất",
    dashboard_label: "Bảng điều khiển"
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING NavigationSidebar_Tests {
  UNIT_TESTS: [
    "Should render without hydration errors",
    "Should highlight active route",
    "Should show badge counts",
    "Should toggle collapse state",
    "Should show logout button",
    "Should handle undefined items"
  ]

  INTEGRATION_TESTS: [
    "Clicking nav item navigates correctly",
    "Active state updates when route changes",
    "Collapsed state persists (localStorage)",
    "Logout callback fires correctly"
  ]

  EDGE_CASES: [
    "Very long navigation labels",
    "Extremely large badge numbers",
    "Navigation with nested items",
    "Rapid route changes",
    "Navigation during loading"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 357
**Status**: Completed
