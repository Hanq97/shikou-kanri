# Widget 11.33: UserMenuWidget

**Type**: Dropdown Menu Widget
**Role**: User dropdown menu with profile links and recent items
**Technology**: React 19, TypeScript, Zustand
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET UserMenuWidget {
  ROLE: "Compact user dropdown menu"

  RESPONSIBILITIES: [
    "Display user basic information",
    "Show user role badge",
    "List user profile actions",
    "Display recent items (documents, conversations)",
    "Handle logout action",
    "Manage dropdown open/close state"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    dropdown: "DropdownMenu component",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react"
  }

  DOMAIN_CONTEXT: {
    use_case: "Quick access user menu in header",
    vietnamese_labels: {
      profile: "Hồ sơ cá nhân",
      my_documents: "Tài liệu của tôi",
      recent_activity: "Hoạt động gần đây",
      settings: "Cài đặt",
      security: "Bảo mật",
      logout: "Đăng xuất"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN UserMenuWidget_Widget {
  PURPOSE: "Compact dropdown menu for user actions and recent items"

  PROBLEM: "Need quick access to profile actions without occupying much space"

  SOLUTION: "Compact dropdown with user info, actions, and recent items list"

  USE_CASES: [
    "Navigate to user profile",
    "View personal documents",
    "Check recent activity",
    "Access account settings",
    "Logout quickly"
  ]

  COMPLEXITY: "LOW"
}
```

---

## Workflow

```pseudo
WORKFLOW UserMenuWidget_Workflow {
  INPUT: {
    user: UserData,
    callbacks: {
      onProfile?: Function,
      onSettings?: Function,
      onDocuments?: Function,
      onActivity?: Function,
      onLogout?: Function
    },
    recentItems?: RecentItem[]
  }

  PRECONDITIONS: [
    "User object must have id, name, email, role",
    "recentItems must have id, title, type"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize dropdown state"
      logic: |
        SET isOpen = false (controlled by parent)
        SET maxRecentItems = 3 (for space constraint)
    }

    STEP_2_RENDER_TRIGGER: {
      description: "Render dropdown trigger button"
      logic: |
        RENDER button with user avatar
        SET className = "rounded-full" for circular button
        ON click:
          TOGGLE dropdown menu
    }

    STEP_3_RENDER_USER_INFO: {
      description: "Display user basic information"
      logic: |
        RENDER user info section
        SHOW user.name (medium font)
        SHOW user.email (small, gray)
        SHOW role badge (secondary variant)
    }

    STEP_4_RENDER_MENU_ITEMS: {
      description: "Display user action menu items"
      logic: |
        RENDER menu items:
          IF onProfile:
            SHOW "Hồ sơ cá nhân" (Profile) with User icon
          IF onDocuments:
            SHOW "Tài liệu của tôi" (My Documents) with FileText icon
          IF onActivity:
            SHOW "Hoạt động gần đây" (Recent Activity) with Clock icon
          IF onSettings:
            SHOW "Cài đặt" (Settings) with Settings icon

          ALWAYS SHOW "Bảo mật" (Security) DISABLED with ShieldCheck icon

        ON menu item click:
          CLOSE dropdown
          CALL corresponding callback
    }

    STEP_5_RENDER_RECENT_ITEMS: {
      description: "Display recent documents and conversations"
      logic: |
        IF recentItems.length > 0 THEN
          RENDER separator
          RENDER "Gần đây" (Recent) header

          FOR EACH item IN recentItems.slice(0, 3):
            RENDER recent item
            SHOW type-specific icon
            SHOW truncated title
            ON click:
              NAVIGATE to item
          END FOR
        END IF
    }

    STEP_6_RENDER_LOGOUT: {
      description: "Display logout action"
      logic: |
        IF onLogout THEN
          RENDER separator
          RENDER logout menu item
          STYLE with red color
          ON click:
            CALL onLogout()
        END IF
    }
  }

  ERROR_HANDLING: {
    OverflowError: "Truncate long titles",
    NavigationError: "Show error toast",
    LogoutError: "Show confirmation dialog"
  }

  OUTPUT: {
    rendered_component: DropdownMenuElement,
    max_width: "w-56",
    position: "align-end"
  }

  POSTCONDITIONS: [
    "All menu items render correctly",
    "Recent items truncated to 3",
    "Dropdown closes on item click"
  ]
}
```

---

## Key Interfaces

```typescript
// Recent Item
interface RecentItem {
  id: string;
  title: string;
  type: 'document' | 'conversation';
}

// User Data
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

// Component Props
interface UserMenuWidgetProps {
  user: User;
  onProfile?: () => void;
  onSettings?: () => void;
  onDocuments?: () => void;
  onActivity?: () => void;
  onLogout?: () => void;
  recentItems?: RecentItem[];
}

// Component Signature
function UserMenuWidget(props: UserMenuWidgetProps): JSX.Element
```

---

## Integration Points

```pseudo
INTEGRATION UserMenuWidget_Integration {
  PARENT_COMPONENTS: [
    "GlobalHeader (in right section)",
    "MainLayout (user menu area)",
    "AppShell"
  ]

  STATE_MANAGEMENT: {
    local_state: "DropdownMenu manages open state",
    global_state: "Zustand for user data",
    server_state: "TanStack Query for recent items"
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Dropdown menu w-56",
    colors: "Gray for normal items, red for logout",
    icons: "lucide-react icons"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE UserMenuWidget {
  SCENARIO: "User accesses menu from header"

  ACTORS: {
    user: "Lawyer using application",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User sees avatar button in header
      User clicks avatar

    STEP_2: |
      System CALLS UserMenuWidget({
        user: {
          id: "u123",
          name: "Nguyễn Văn A",
          email: "a@law.example.com",
          role: "Luật sư",
          avatar: "..."
        },
        recentItems: [
          { id: "doc1", title: "Hợp đồng ABC Corp", type: "document" },
          { id: "conv1", title: "Cuộc trao đổi về hợp đồng...", type: "conversation" }
        ],
        onProfile: () => navigateTo("/profile"),
        onLogout: () => logout()
      })

    STEP_3: |
      Dropdown opens showing user info
      User sees "Nguyễn Văn A" and email
      User sees role badge "Luật sư" (Lawyer)

    STEP_4: |
      User sees menu items and recent items
      User clicks "Hợp đồng ABC Corp" (recent)
      System navigates to document
      Dropdown closes

    STEP_5: |
      User clicks dropdown again
      User clicks "Đăng xuất" (Logout)
      System calls logout
      User is logged out
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE UserMenuWidget_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Memoize component",
    items: "Truncate recent items to 3",
    icons: "Use lightweight icons",
    state: "Let parent manage open state"
  }

  BENCHMARKS: {
    target_render_time: "< 50ms",
    menu_open: "< 100ms animation",
    item_click: "< 50ms response"
  }

  BEST_PRACTICES: [
    "Memoize with React.memo",
    "Limit recent items to 3",
    "Use text truncation for long titles",
    "Manage state in parent component"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  MENU_STRUCTURE: {
    profile_items: [
      "Hồ sơ cá nhân" (Profile),
      "Tài liệu của tôi" (My Documents),
      "Hoạt động gần đây" (Recent Activity),
      "Cài đặt" (Settings)
    ],
    recent_types: [
      "document" → "Tài liệu",
      "conversation" → "Hội thoại"
    ]
  }

  LOCALIZATION: {
    language: "Vietnamese",
    max_recent_items: 3,
    truncate_length: 30
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING UserMenuWidget_Tests {
  UNIT_TESTS: [
    "Should render user avatar",
    "Should display user name and email",
    "Should show role badge",
    "Should render all menu items",
    "Should truncate long titles",
    "Should limit recent items to 3"
  ]

  INTEGRATION_TESTS: [
    "Menu items trigger callbacks",
    "Recent items navigate correctly",
    "Logout callback fires",
    "Dropdown opens/closes"
  ]

  EDGE_CASES: [
    "Very long user name",
    "Very long email",
    "No recent items",
    "Many recent items (>10)",
    "Very long recent item title"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 318
**Status**: Completed
