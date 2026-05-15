# App Navigation Components Specialist
# Chuyên Gia Thành Phần Điều Hướng Ứng Dụng

**Role**: Next.js 15 navigation components specialist (Navbar, Sidebar, Breadcrumbs, Tabs, Mobile Nav)
**Focus**: Client-side navigation components with responsive design and accessibility
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Zustand, Feature-Sliced Design
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppNavigation {
  ROLE: "Navigation components specialist for Next.js 15 App Router applications"

  RESPONSIBILITIES: [
    "Build NavigationBar (top navigation with logo, user menu)",
    "Create Sidebar (side navigation with active states)",
    "Implement Breadcrumbs (hierarchical path navigation)",
    "Build TabNavigation (tabbed interfaces for sub-pages)",
    "Create MobileNav (responsive mobile navigation drawer)"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "Zustand (nav state)", "lucide-react (icons)", "tailwindcss"],
    patterns: ["Client Components", "usePathname hook", "Active link detection", "Responsive design"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_sections: ["Dashboard/Bảng Điều Khiển", "Contracts/Hợp Đồng", "Documents/Tài Liệu", "Cases/Vụ Án"]
  }
}
```

---

## Pattern 9.26: NavigationBar - Top Navigation Component

```pseudo
PATTERN NavigationBar {
  PURPOSE: "Create top navigation bar with logo, main links, user menu, and notifications"

  WORKFLOW: {
    STRUCTURE: |
      <nav className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <!-- Logo -->
            <Logo href="/dashboard" />

            <!-- Main navigation links (desktop) -->
            <NavLinks items={navigationMenu} />

            <!-- Right side: Notifications + User menu -->
            <div className="flex items-center gap-4">
              <NotificationButton />
              <UserMenu user={currentUser} />
            </div>
          </div>
        </div>
      </nav>

    ACTIVE_LINK_DETECTION: |
      pathname = USE_PATHNAME()
      isActive = pathname === item.path OR pathname.STARTS_WITH(item.path + "/")

      <Link
        href={item.path}
        className={isActive ? "text-blue-600" : "text-gray-600"}
      >
        {item.labelVi}
      </Link>
  }

  KEY_INTERFACES: |
    interface NavigationBarProps {
      user: User;
      menuItems: RouteConfig[];
    }

    export function NavigationBar({ user, menuItems }: NavigationBarProps): JSX.Element;
}
```

---

## Pattern 9.27: Sidebar - Side Navigation Component

```pseudo
PATTERN Sidebar {
  PURPOSE: "Create collapsible sidebar navigation with icons, active states, and role-based visibility"

  WORKFLOW: {
    STRUCTURE: |
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64
        bg-gray-900 text-white
        transform transition-transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <!-- Sidebar header -->
        <div className="p-4 border-b border-gray-800">
          <h2>StartX4CRM Legal</h2>
        </div>

        <!-- Navigation sections -->
        <nav className="p-4 space-y-2">
          FOR EACH section IN navigationSections:
            <SidebarSection
              title={section.titleVi}
              items={section.items}
            />
          END FOR
        </nav>
      </aside>

    ACTIVE_STATE: |
      pathname = USE_PATHNAME()
      isActive = (item: NavItem) => {
        IF item.path === pathname THEN RETURN true
        IF item.children AND item.children.SOME(child => pathname.STARTS_WITH(child.path)) THEN
          RETURN true
        END IF
        RETURN false
      }

    ROLE_FILTERING: |
      { user } = USE_AUTH_STORE()
      visibleItems = FILTER items WHERE:
        item.requiresAuth === false OR
        (user.isAuthenticated AND HAS_REQUIRED_ROLES(user, item.requiredRoles))
  }

  KEY_INTERFACES: |
    interface SidebarProps {
      isOpen: boolean;
      onClose: () => void;
      sections: NavigationSection[];
    }

    interface NavigationSection {
      titleVi: string;
      items: RouteConfig[];
    }

    export function Sidebar({ isOpen, onClose, sections }: SidebarProps): JSX.Element;
}
```

---

## Pattern 9.28: Breadcrumbs - Breadcrumb Navigation

```pseudo
PATTERN Breadcrumbs {
  PURPOSE: "Display hierarchical navigation path for current route"

  WORKFLOW: {
    PATH_PARSING: |
      pathname = USE_PATHNAME()
      segments = pathname.SPLIT("/").FILTER(s => s !== "")

      breadcrumbs = []
      currentPath = ""

      FOR EACH segment IN segments:
        currentPath += "/" + segment
        route = GET_ROUTE_BY_PATH(currentPath)

        breadcrumbs.PUSH({
          label: route?.labelVi OR segment,
          path: currentPath,
          isLast: (segment === segments[segments.length - 1])
        })
      END FOR

    STRUCTURE: |
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
        <!-- Home link -->
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
          <Home className="w-4 h-4" />
        </Link>

        <!-- Breadcrumb items -->
        FOR EACH crumb IN breadcrumbs:
          <ChevronRight className="w-4 h-4 text-gray-400" />

          IF crumb.isLast THEN
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          ELSE
            <Link href={crumb.path} className="text-gray-500 hover:text-gray-700">
              {crumb.label}
            </Link>
          END IF
        END FOR
      </nav>

    DYNAMIC_ROUTES: |
      // For routes like /legal/contracts/[contractId]
      IF segment MATCHES UUID_PATTERN THEN
        // Fetch entity name for display
        entityName = AWAIT GET_ENTITY_NAME(segment)
        breadcrumbs.PUSH({ label: entityName, path: currentPath, isLast: true })
      END IF
  }

  KEY_INTERFACES: |
    interface BreadcrumbItem {
      label: string;
      path: string;
      isLast: boolean;
    }

    export function Breadcrumbs(): JSX.Element;
}
```

---

## Pattern 9.29: TabNavigation - Tab-Based Navigation

```pseudo
PATTERN TabNavigation {
  PURPOSE: "Create tabbed navigation for sub-sections within a page (e.g., Contract Details: Overview | Documents | History)"

  WORKFLOW: {
    STRUCTURE: |
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          FOR EACH tab IN tabs:
            <button
              onClick={() => SET_ACTIVE_TAB(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.labelVi}
            </button>
          END FOR
        </nav>
      </div>

      <!-- Tab content -->
      <div className="mt-6">
        {RENDER_TAB_CONTENT(activeTab)}
      </div>

    STATE_MANAGEMENT: |
      // Option 1: Local state
      [activeTab, setActiveTab] = USE_STATE(tabs[0].id)

      // Option 2: URL-based (better for deep linking)
      searchParams = USE_SEARCH_PARAMS()
      router = USE_ROUTER()

      activeTab = searchParams.GET("tab") OR tabs[0].id

      FUNCTION setActiveTab(tabId):
        router.PUSH(`?tab=${tabId}`, { scroll: false })
      END FUNCTION
  }

  KEY_INTERFACES: |
    interface Tab {
      id: string;
      labelVi: string;
      content: ReactNode;
    }

    interface TabNavigationProps {
      tabs: Tab[];
      defaultTab?: string;
    }

    export function TabNavigation({ tabs, defaultTab }: TabNavigationProps): JSX.Element;
}
```

---

## Pattern 9.30: MobileNav - Mobile Navigation

```pseudo
PATTERN MobileNav {
  PURPOSE: "Create responsive mobile navigation drawer with overlay and slide-in animation"

  WORKFLOW: {
    STRUCTURE: |
      <!-- Mobile menu button -->
      <button onClick={() => SET_IS_OPEN(true)} className="lg:hidden">
        <Menu className="w-6 h-6" />
      </button>

      <!-- Overlay -->
      IF isOpen THEN
        <div
          onClick={() => SET_IS_OPEN(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        />
      END IF

      <!-- Mobile drawer -->
      <div className={`
        fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:hidden
      `}>
        <!-- Header -->
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Menu / Thực Đơn</h2>
          <button onClick={() => SET_IS_OPEN(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <!-- Navigation links -->
        <nav className="p-4 space-y-2">
          FOR EACH item IN navigationMenu:
            <Link
              href={item.path}
              onClick={() => SET_IS_OPEN(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.labelVi}</span>
            </Link>
          END FOR
        </nav>

        <!-- User menu (mobile) -->
        <div className="border-t p-4">
          <UserMenuMobile user={currentUser} />
        </div>
      </div>

    TOUCH_GESTURES: |
      // Swipe to close
      [touchStart, setTouchStart] = USE_STATE(null)

      ON_TOUCH_START = (e) => {
        setTouchStart(e.targetTouches[0].clientX)
      }

      ON_TOUCH_END = (e) => {
        touchEnd = e.changedTouches[0].clientX
        IF touchEnd > touchStart + 50 THEN
          SET_IS_OPEN(false) // Swipe right to close
        END IF
      }

    BODY_SCROLL_LOCK: |
      USE_EFFECT(() => {
        IF isOpen THEN
          document.body.style.overflow = "hidden"
        ELSE
          document.body.style.overflow = "auto"
        END IF

        RETURN () => {
          document.body.style.overflow = "auto"
        }
      }, [isOpen])
  }

  KEY_INTERFACES: |
    interface MobileNavProps {
      isOpen: boolean;
      onClose: () => void;
      menuItems: RouteConfig[];
      user: User;
    }

    export function MobileNav({ isOpen, onClose, menuItems, user }: MobileNavProps): JSX.Element;
}
```

---

## Integration Points

```pseudo
INTEGRATION NavigationIntegration {
  STATE_MANAGEMENT: {
    nav_state: "Zustand store for sidebar open/close, mobile menu state",
    active_path: "usePathname hook for active link detection",
    user_state: "Auth store for user info and permissions"
  }

  ROUTE_CONFIG: {
    source: "RouteConfig from Pattern 9.22",
    filtering: "Filter by role and permissions",
    active_detection: "Match pathname with route.path"
  }

  RESPONSIVE_DESIGN: {
    breakpoints: {
      mobile: "< 640px (mobile nav drawer)",
      tablet: "640px - 1024px (collapsed sidebar)",
      desktop: "> 1024px (full sidebar)"
    }
  }

  ACCESSIBILITY: {
    aria_labels: "All nav elements have proper ARIA labels",
    keyboard_nav: "Tab navigation, Enter to activate",
    focus_management: "Focus trapped in mobile nav when open",
    screen_reader: "Announce active page and navigation structure"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  NAV_SECTIONS: {
    dashboard: {
      titleVi: "Bảng Điều Khiển",
      icon: "LayoutDashboard",
      items: ["Overview/Tổng Quan", "Analytics/Phân Tích", "Reports/Báo Cáo"]
    },
    legal: {
      titleVi: "Pháp Lý",
      icon: "Scale",
      items: ["Contracts/Hợp Đồng", "Documents/Tài Liệu", "Cases/Vụ Án"]
    },
    management: {
      titleVi: "Quản Lý",
      icon: "Users",
      items: ["Users/Người Dùng", "Teams/Nhóm", "Roles/Vai Trò"]
    },
    settings: {
      titleVi: "Cài Đặt",
      icon: "Settings",
      items: ["Profile/Hồ Sơ", "Preferences/Tùy Chọn", "Security/Bảo Mật"]
    }
  }

  USER_MENU_ITEMS: [
    { labelVi: "Hồ Sơ / Profile", path: "/profile", icon: "User" },
    { labelVi: "Cài Đặt / Settings", path: "/settings", icon: "Settings" },
    { labelVi: "Trợ Giúp / Help", path: "/help", icon: "HelpCircle" },
    { labelVi: "Đăng Xuất / Logout", path: "/logout", icon: "LogOut" }
  ]
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.22 - RouteConfig",
    relationship: "Navigation components consume route configuration",
    integration: "navigationMenu array from RouteConfig"
  },
  {
    pattern: "Pattern 9.23 - RouteGuards",
    relationship: "Navigation respects permission-based visibility",
    integration: "Filter menu items by user roles and permissions"
  },
  {
    pattern: "Pattern 9.36-9.40 - Layouts",
    relationship: "Navigation components embedded in layouts",
    integration: "DashboardLayout includes Sidebar, Navbar, Breadcrumbs"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD), Next.js 15 App Router
- **Technology Docs**: [Next.js Navigation](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating), [Accessibility Guidelines (WCAG 2.1)](https://www.w3.org/WAI/WCAG21/quickref/)
- **Internal Docs**: `/docs/ui/navigation-patterns.md`, `/docs/accessibility/keyboard-navigation.md`

---

**File Lines**: ~450 lines
**Compliance**: ✅ ≤800 lines
**Format**: ✅ Pseudo-code WORKFLOW format
**Status**: Complete - Ready for File 5
