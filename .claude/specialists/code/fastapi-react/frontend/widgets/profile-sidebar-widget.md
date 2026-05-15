# Widget 11.27: ProfileSidebar

**Type**: Sidebar Widget
**Role**: Display user profile information, statistics, and account management
**Technology**: React 19, TypeScript, Zustand
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET ProfileSidebar {
  ROLE: "User profile information sidebar"

  RESPONSIBILITIES: [
    "Display user profile avatar and basic info",
    "Show user statistics (documents, conversations, reviews)",
    "Manage user ID copying to clipboard",
    "Toggle email visibility for privacy",
    "Provide access to profile management actions"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    state_management: "React useState hooks",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react",
    utilities: "Clipboard API for copy functionality"
  }

  DOMAIN_CONTEXT: {
    use_case: "User profile sidebar in main application",
    entities: ["User", "UserStatistics"],
    vietnamese_labels: {
      profile: "Hồ sơ",
      documents: "Tài liệu",
      conversations: "Hội thoại",
      reviews: "Duyệt",
      settings: "Cài đặt"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN ProfileSidebar_Widget {
  PURPOSE: "Compact sidebar showing user profile and account management options"

  PROBLEM: "Users need quick access to profile info and account actions without taking main screen space"

  SOLUTION: "Gradient-themed sidebar with profile section, stats, and action buttons"

  USE_CASES: [
    "View profile information while working",
    "Copy user ID for sharing or support",
    "Toggle email visibility",
    "Access profile settings and preferences",
    "Quick logout from sidebar"
  ]

  COMPLEXITY: "LOW"
}
```

---

## Workflow

```pseudo
WORKFLOW ProfileSidebar_Workflow {
  INPUT: {
    user: UserData,
    isOpen: boolean,
    callbacks: {
      onClose?: Function,
      onEdit?: Function,
      onSettings?: Function,
      onLogout?: Function
    }
  }

  PRECONDITIONS: [
    "User object must have required fields",
    "User stats must be non-negative numbers",
    "Dates must be valid Date objects"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize component state"
      logic: |
        SET showEmail = false (hide by default for privacy)
        SET copiedId = false
        SET sidebarWidth = isOpen ? "w-80" : "w-0"
        SET bgGradient = "from-blue-50 to-white"
    }

    STEP_2_RENDER_PROFILE_HEADER: {
      description: "Render profile header with avatar and status"
      logic: |
        RENDER centered profile section
        SHOW large avatar (size=lg)
        SHOW user name (text-xl font-semibold)
        SHOW user role badge
        SHOW status badge (active/inactive)
    }

    STEP_3_RENDER_USER_ID: {
      description: "Display user ID with copy functionality"
      logic: |
        RENDER user ID section in gray box
        SHOW user.id as monospace text
        SHOW copy button
        ON copy button click:
          CALL navigator.clipboard.writeText(user.id)
          SET copiedId = true
          AFTER 2 seconds:
            SET copiedId = false
    }

    STEP_4_RENDER_EMAIL_SECTION: {
      description: "Display email with visibility toggle"
      logic: |
        RENDER email section
        SHOW visibility toggle button (Eye/EyeOff icon)
        ON toggle:
          SET showEmail = !showEmail
        IF showEmail THEN
          SHOW actual email address
        ELSE
          SHOW masked email (••••••••••••••)
        END IF
    }

    STEP_5_RENDER_STATISTICS: {
      description: "Display user statistics in 3-column grid"
      logic: |
        RENDER stats section with 3 columns
        SHOW user.stats.documents count
        SHOW user.stats.conversations count
        SHOW user.stats.reviews count
        FORMAT numbers as bold headings
    }

    STEP_6_RENDER_ACTIVITY_INFO: {
      description: "Display user activity timestamps"
      logic: |
        RENDER activity section
        SHOW "Tham gia" (Joined): user.joinDate formatted
        SHOW "Hoạt động lần cuối" (Last Active): user.lastActive formatted
        FORMAT dates with vi-VN locale
    }

    STEP_7_RENDER_ACTION_BUTTONS: {
      description: "Render account action buttons"
      logic: |
        RENDER button group

        IF onEdit THEN
          SHOW "Chỉnh sửa hồ sơ" (Edit Profile) button
        END IF

        IF onSettings THEN
          SHOW "Cài đặt" (Settings) button
        END IF

        SHOW disabled buttons for future features:
          - "Thông báo" (Notifications)
          - "Bảo mật" (Security)
          - "Trợ giúp" (Help)

        IF onLogout THEN
          SHOW "Đăng xuất" (Logout) button in red
        END IF
    }
  }

  ERROR_HANDLING: {
    CopyError: "Show error toast instead of success",
    DataError: "Show fallback UI with default values",
    LogoutError: "Show confirmation and retry"
  }

  OUTPUT: {
    rendered_component: SidebarElement,
    visible: isOpen,
    width: "w-80 or w-0",
    background: "gradient blue-50 to white"
  }

  POSTCONDITIONS: [
    "Profile sidebar renders when isOpen=true",
    "User stats display correctly",
    "All callback actions are wired properly"
  ]
}
```

---

## Key Interfaces

```typescript
// User Data
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: Date;
  lastActive: Date;
  stats: {
    documents: number;
    conversations: number;
    reviews: number;
  };
}

// Component Props
interface ProfileSidebarProps {
  user: User;
  isOpen?: boolean;
  onClose?: () => void;
  onEdit?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

// Component Signature
function ProfileSidebar(props: ProfileSidebarProps): JSX.Element | null
```

---

## Integration Points

```pseudo
INTEGRATION ProfileSidebar_Integration {
  PARENT_COMPONENTS: [
    "MainLayout (top-level layout)",
    "AppShell (application shell)",
    "DashboardPage (dashboard layout)"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for showEmail, copiedId",
    global_state: "Zustand overlay store for visibility",
    server_state: "TanStack Query for user data"
  }

  API_ENDPOINTS: {
    profile: "GET /api/v1/users/:id",
    logout: "POST /api/v1/auth/logout",
    edit_profile: "PATCH /api/v1/users/:id"
  }

  STYLING: {
    theme: "Tailwind CSS",
    layout: "Flex column with centered content",
    background: "Gradient from blue-50 to white",
    colors: "Blue accents, red for logout"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE ProfileSidebar {
  SCENARIO: "User opens profile sidebar to check activity"

  ACTORS: {
    user: "Lawyer using platform",
    system: "Frontend application"
  }

  FLOW: {
    STEP_1: |
      User clicks profile icon/button
      System shows profile sidebar

    STEP_2: |
      System CALLS ProfileSidebar({
        user: {
          id: "user-123",
          name: "Nguyễn Văn A",
          email: "a.nguyen@law.example.com",
          role: "Luật sư",
          status: "active",
          stats: { documents: 45, conversations: 12, reviews: 8 },
          joinDate: new Date("2024-01-15"),
          lastActive: new Date()
        },
        isOpen: true,
        onEdit: () => navigateTo("/profile/edit"),
        onLogout: () => logout()
      })

    STEP_3: |
      User sees profile info, stats, and action buttons
      User clicks copy icon to copy user ID
      System shows "Đã sao chép" (Copied) message

    STEP_4: |
      User clicks visibility toggle on email
      Email becomes visible/masked based on toggle

    STEP_5: |
      User clicks "Đăng xuất" (Logout)
      System calls onLogout callback
  }
}
```

---

## Performance Considerations

```pseudo
PERFORMANCE ProfileSidebar_Performance {
  OPTIMIZATION_STRATEGIES: {
    rendering: "Memoize component to prevent unnecessary re-renders",
    avatar: "Use optimized image with placeholder",
    formatting: "Cache date formatting results",
    state: "Use useCallback for handlers"
  }

  BENCHMARKS: {
    target_render_time: "< 50ms",
    interaction_time: "< 100ms for copy action",
    sidebar_transition: "300ms smooth animation"
  }

  BEST_PRACTICES: [
    "Memoize entire component with React.memo",
    "Use useCallback for all handlers",
    "Lazy load avatar image",
    "Debounce email visibility toggle"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  LEGAL_ENTITIES: {
    User: "Người dùng",
    Profile: "Hồ sơ cá nhân",
    UserRole: "Vai trò người dùng"
  }

  BUSINESS_RULES: {
    roles: ["admin", "lawyer", "paralegal", "client"],
    statuses: ["active", "inactive", "pending"],
    privacy: "Email hidden by default for security"
  }

  LOCALIZATION: {
    language: "Vietnamese",
    date_format: "DD/MM/YYYY",
    timezone: "Asia/Ho_Chi_Minh",
    email_masking: "Show •• for privacy"
  }
}
```

---

## Testing Guidelines

```pseudo
TESTING ProfileSidebar_Tests {
  UNIT_TESTS: [
    "Should render when isOpen=true",
    "Should not render when isOpen=false",
    "Should display user name and role",
    "Should show/hide email on toggle",
    "Should copy user ID to clipboard",
    "Should disable logout button when expected"
  ]

  INTEGRATION_TESTS: [
    "Copy to clipboard works end-to-end",
    "Profile edit navigation works",
    "Logout callback fires correctly",
    "Date formatting uses Vietnamese locale"
  ]

  EDGE_CASES: [
    "Very long user names",
    "Missing avatar URL",
    "Invalid email format",
    "Clipboard API unavailable",
    "Different user roles and statuses"
  ]
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 324
**Status**: Completed
