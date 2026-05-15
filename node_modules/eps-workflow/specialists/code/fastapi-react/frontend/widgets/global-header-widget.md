# Widget 11.32: GlobalHeader

**Type**: Header Widget
**Role**: Top navigation bar with search, notifications, and user menu
**Technology**: React 19, TypeScript, Zustand
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET GlobalHeader {
  ROLE: "Global application header with navigation and actions"

  RESPONSIBILITIES: [
    "Display search bar for global search",
    "Show notification center with unread count",
    "Provide user menu dropdown",
    "Support mobile hamburger menu",
    "Show sticky header on top of content",
    "Manage notification list display"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    state_management: "React useState hooks",
    ui_library: "Custom UI components (@/shared/ui/)",
    dropdown: "DropdownMenu component",
    icons: "lucide-react"
  }

  DOMAIN_CONTEXT: {
    use_case: "Global header for legal platform",
    vietnamese_labels: {
      search: "Tìm kiếm",
      notifications: "Thông báo",
      settings: "Cài đặt",
      help: "Trợ giúp",
      logout: "Đăng xuất"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN GlobalHeader_Widget {
  PURPOSE: "Sticky header providing global navigation and user actions"

  PROBLEM: "Apps need accessible search and notifications without consuming page space"

  SOLUTION: "Sticky header with search bar, notification center, and user dropdown menu"

  USE_CASES: [
    "Global document search across entire platform",
    "Receive and view notifications",
    "Access user profile and settings",
    "Toggle mobile navigation",
    "View unread notification count"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW GlobalHeader_Workflow {
  INPUT: {
    notifications?: Notification[],
    onSearchChange?: Function,
    onMenuToggle?: Function,
    showMobileMenu?: boolean,
    user?: UserInfo,
    onUserSettings?: Function,
    onLogout?: Function
  }

  PRECONDITIONS: [
    "notifications array must be provided (can be empty)",
    "User object should have name and optional avatar"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize header state"
      logic: |
        SET searchQuery = ""
        SET isSearchFocused = false
        CALCULATE unreadCount = notifications.filter(n => !n.read).length
    }

    STEP_2_RENDER_STICKY_HEADER: {
      description: "Render sticky header at top"
      logic: |
        RENDER header with:
          - position: sticky
          - top: 0
          - z-index: 40
          - border bottom
          - shadow sm
    }

    STEP_3_RENDER_LEFT_SECTION: {
      description: "Render mobile menu button and search"
      logic: |
        RENDER mobile menu button (md:hidden)
        ON click:
          CALL onMenuToggle()

        RENDER search input (hidden on very small screens)
        ON input change:
          SET searchQuery = value
          CALL onSearchChange(value)
        ON focus:
          SET isSearchFocused = true
        ON blur:
          SET isSearchFocused = false
    }

    STEP_4_RENDER_NOTIFICATIONS: {
      description: "Render notification dropdown"
      logic: |
        RENDER notification button with Bell icon
        SHOW unread count badge if unreadCount > 0

        ON button click:
          TOGGLE notification dropdown

        IF dropdown open:
          RENDER notification list
          SHOW notifications with title, description, timestamp
          IF notifications.empty THEN
            SHOW "Không có thông báo" (No notifications)
          END IF
    }

    STEP_5_RENDER_USER_MENU: {
      description: "Render user dropdown menu"
      logic: |
        IF user THEN
          RENDER user avatar button
          ON click:
            TOGGLE user menu dropdown

          IF dropdown open:
            SHOW user name
            SHOW user actions:
              - Settings (onUserSettings)
              - Help (disabled)
              - Logout (onLogout, red color)
        END IF
    }

    STEP_6_FORMAT_TIMESTAMPS: {
      description: "Format notification timestamps with Vietnamese locale"
      logic: |
        FOR EACH notification IN notifications:
          CALL toLocaleString('vi-VN', {...options})
          DISPLAY formatted timestamp
        END FOR
    }
  }

  ERROR_HANDLING: {
    SearchError: "Clear search and show error message",
    NotificationError: "Show empty state",
    UserError: "Show guest user menu"
  }

  OUTPUT: {
    rendered_component: HeaderElement,
    sticky: true,
    z_index: 40,
    responsive: true
  }

  POSTCONDITIONS: [
    "Header sticks to top",
    "Search works without pagination",
    "Notifications display correctly",
    "User menu functions properly",
    "Mobile menu toggles correctly"
  ]
}
```

---

## Key Interfaces

```typescript
// Notification Data
interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  timestamp: Date;
}

// User Info
interface UserInfo {
  name: string;
  avatar?: string;
}

// Component Props
interface GlobalHeaderProps {
  notifications?: Notification[];
  onSearchChange?: (query: string) => void;
  onMenuToggle?: () => void;
  showMobileMenu?: boolean;
  user?: UserInfo;
  onUserSettings?: () => void;
  onLogout?: () => void;
}

// Component Signature
function GlobalHeader(props: GlobalHeaderProps): JSX.Element
```

---

## Integration Points

```pseudo
INTEGRATION GlobalHeader_Integration {
  PARENT_COMPONENTS: [
    "AppShell (main layout)",
    "RootLayout (Next.js root)",
    "AdminLayout"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for search, focus",
    global_state: "Zustand for notifications",
    server_state: "TanStack Query for user data"
  }

  API_ENDPOINTS: {
    search: "GET /api/v1/search?q=query",
    notifications: "GET /api/v1/notifications",
    user: "GET /api/v1/users/me"
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Flex row sticky at top",
    z_index: 40 (below modals at 50),
    responsive: "Hidden elements on small screens"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE GlobalHeader {
  SCENARIO: "User searches and views notifications"

  ACTORS: {
    user: "Lawyer using application",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User sees header at top of page
      Header shows search, notifications, and user avatar

    STEP_2: |
      System CALLS GlobalHeader({
        notifications: [
          { id: "n1", title: "Hợp đồng mới", description: "ABC Corp", read: false },
          { id: "n2", title: "Bình luận mới", description: "Trên tài liệu...", read: true }
        ],
        user: { name: "Nguyễn Văn A", avatar: "..." },
        onSearchChange: (q) => search(q),
        onLogout: () => logout()
      })

    STEP_3: |
      Header shows "1" badge on notification bell (1 unread)
      User clicks notification bell

    STEP_4: |
      Notification dropdown opens showing:
      - "Hợp đồng mới" (unread, highlighted)
      - "Bình luận mới" (read, normal)
      User sees both notifications with timestamps

    STEP_5: |
      User types in search bar "Hợp đồng"
      System calls onSearchChange("Hợp đồng")
      Search results appear or page updates

    STEP_6: |
      User clicks avatar
      User menu opens showing settings and logout

    STEP_7: |
      User clicks "Đăng xuất"
      System calls onLogout
      User is logged out
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE GlobalHeader_Performance {
  OPTIMIZATION_STRATEGIES: {
    search: "Debounce search input by 300ms",
    notifications: "Lazy load notification list",
    dropdowns: "Memoize dropdown content",
    timestamps: "Format timestamps on demand"
  }

  BENCHMARKS: {
    target_render_time: "< 50ms",
    search_response: "< 300ms (with debounce)",
    notification_load: "< 500ms",
    sticky_performance: "No jank on scroll"
  }

  BEST_PRACTICES: [
    "Debounce search input",
    "Memoize notification list items",
    "Use CSS sticky positioning",
    "Lazy load user avatar"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  SEARCH_SCOPE: {
    documents: "Tài liệu",
    users: "Người dùng",
    conversations: "Hội thoại",
    cases: "Vụ án"
  }

  NOTIFICATION_TYPES: {
    document_created: "Tài liệu mới",
    contract_needs_review: "Hợp đồng cần duyệt",
    new_comment: "Bình luận mới",
    user_assigned: "Bạn được gán",
    deadline_approaching: "Hạn chót sắp tới"
  }

  LOCALIZATION: {
    language: "Vietnamese",
    search_placeholder: "Tìm kiếm tài liệu, người dùng...",
    no_notifications: "Không có thông báo"
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING GlobalHeader_Tests {
  UNIT_TESTS: [
    "Should render all sections correctly",
    "Should show unread notification count",
    "Should toggle notification dropdown",
    "Should toggle user menu",
    "Should handle search input",
    "Should show/hide mobile menu button"
  ]

  INTEGRATION_TESTS: [
    "Search triggers onSearchChange callback",
    "Notification click updates read state",
    "User settings navigation works",
    "Logout callback fires correctly",
    "Mobile menu toggle works"
  ]

  EDGE_CASES: [
    "Very long notification titles",
    "Many notifications (>50)",
    "Search with special characters",
    "User without avatar",
    "Missing notifications array"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 345
**Status**: Completed
