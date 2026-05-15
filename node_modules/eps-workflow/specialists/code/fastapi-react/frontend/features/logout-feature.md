# Pattern 12.12: LogoutFeature

**Role**: User logout with auth state cleanup
**Focus**: Single button logout with toast feedback
**Technology**: React 19, TypeScript 5, Zustand, Next.js router
**Domain**: Vietnamese legal platform (Đăng Xuất)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE LogoutFeature {
  PURPOSE: "Clear authentication state and redirect to login"

  RESPONSIBILITIES: [
    "Clear user and token from auth store",
    "Remove stored session data",
    "Redirect to login page",
    "Show logout confirmation toast"
  ]

  TECH_STACK: {
    primary: "Zustand state management",
    ui_components: "Button with icon",
    navigation: "Next.js useRouter and useTransition"
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)", "Phiên (Session)"],
    operations: ["Logout (Đăng Xuất)"],
    cleanup: ["Token removal", "User data removal"]
  }
}
```

---

## Workflow: LogoutFeature_Workflow

```pseudo
WORKFLOW LogoutFeature {
  INPUT: {}

  PRECONDITIONS: [
    "User is authenticated",
    "Auth store is available"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_COMPONENT {
  description: "Setup logout button and transitions"
  logic: |
    router = useRouter()
    authStore = useAuthStore()
    toast = useToast()
    isPending = useTransition()

    RETURN { router, authStore, toast, isPending }
}

STEP_2_HANDLE_LOGOUT_CLICK {
  description: "Handle logout button click"
  logic: |
    ON_LOGOUT_CLICK = () => {
      startTransition(async () => {
        TRY:
          // Clear auth state from Zustand
          authStore.logout()

          // Show success message
          SHOW_TOAST({
            title: "Đã đăng xuất / Logged out",
            message: "Bạn đã đăng xuất thành công / You have been logged out"
          })

          // Redirect to login page
          router.push('/login')

        CATCH error:
          SHOW_TOAST({
            title: "Lỗi / Error",
            message: "Không thể đăng xuất / Failed to logout",
            variant: "destructive"
          })
          LOG_ERROR(error)
        END TRY
      })
    }
}

STEP_3_CLEAR_STORE {
  description: "Clear authentication data"
  logic: |
    authStore.logout() {
      this.user = null
      this.token = null
      // localStorage is auto-cleared by Zustand middleware
    }
}

STEP_4_UPDATE_BUTTON_STATE {
  description: "Update button during transition"
  logic: |
    BUTTON_STATE = {
      disabled: isPending,
      loading_text: "Đang đăng xuất... / Logging out...",
      normal_text: "Đăng Xuất / Logout",
      icon: LogOut icon (from lucide-react)
    }

    RENDER Button {
      onClick: ON_LOGOUT_CLICK,
      disabled: isPending,
      variant: "outline",
      className: "gap-2"
    }
}

STEP_5_REDIRECT_TO_LOGIN {
  description: "Navigate to login page"
  logic: |
    // After clearing state, redirect

    router.push('/login')

    // Optional: Force refresh to clear cached data
    // window.location.href = '/login'
}
```

---

## Key Interfaces

```typescript
interface LogoutButtonProps {
  // No props - uses context/hooks directly
}

interface AuthStore {
  user: User | null;
  token: string | null;
  logout: () => void;
  isAuthenticated: () => boolean;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
}
```

---

## Integration Points

```pseudo
INTEGRATION LogoutFeature {
  UI_COMPONENTS: {
    triggers: ["Logout button in header/navbar"],
    displays: ["Button with icon"],
    feedback: ["useToast()"]
  }

  STATE_MANAGEMENT: {
    auth_store: "Zustand useAuthStore()",
    session_cleanup: "Auto-clear localStorage",
    query_cache: "TanStack Query cache cleared on auth changes"
  }

  NAVIGATION: {
    current_location: "Navbar/Header dropdown",
    redirect_target: "/login",
    method: "router.push() or router.replace()"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/auth/logout (optional)",
    session_cleanup: "Backend may invalidate token"
  }

  STORE_CLEANUP: {
    user: "Set to null",
    token: "Set to null",
    session: "Clear localStorage"
  }

  ERROR_HANDLING: {
    LogoutError: "Show error toast, allow retry",
    NetworkError: "Still clear local state, show message",
    UnexpectedError: "Log and show generic error"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  MESSAGES: {
    button_text: "Đăng Xuất / Logout",
    button_loading: "Đang đăng xuất... / Logging out...",
    success_title: "Đã đăng xuất / Logged out",
    success_message: "Bạn đã đăng xuất thành công / You have been logged out",
    error_title: "Lỗi / Error",
    error_message: "Không thể đăng xuất / Failed to logout"
  }

  UI_PLACEMENT: {
    location: "Header/Navbar user menu",
    trigger: "Click on 'Đăng Xuất' in dropdown",
    feedback: "Toast notification on success/error"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.11 - LoginFeature",
    relationship: "Inverse operation (login)",
    integration: "Both manage auth store state"
  },
  {
    pattern: "12.13 - RegisterFeature",
    relationship: "Auto-logout after new registration",
    integration: "May trigger logout flow"
  }
]
```

---

## State Cleanup Checklist

```pseudo
CLEANUP_CHECKLIST {
  AUTH_STORE: [
    "Clear user object",
    "Clear token string",
    "Clear auth timestamp"
  ]

  SESSION_STORAGE: [
    "Clear JWT token from localStorage",
    "Clear user preferences",
    "Clear recent searches"
  ]

  QUERY_CACHE: [
    "Option 1: Clear all TanStack Query cache",
    "Option 2: Only clear user-specific queries",
    "Option 3: Keep cache (user will be redirected anyway)"
  ]

  BROWSER_STATE: [
    "Optional: Clear service worker cache",
    "Optional: Clear IndexedDB data"
  ]
}
```

---

## Error Recovery

```pseudo
ERROR_RECOVERY {
  SCENARIO_1_NETWORK_ERROR: |
    Logout API fails due to network
    SYSTEM clears local state anyway
    Shows message: "Đã đăng xuất (Lỗi mạng) / Logged out (Network error)"
    Redirects to /login

  SCENARIO_2_PERMISSION_ERROR: |
    Server rejects logout (unusual)
    SYSTEM still clears local state
    Shows error: "Logout failed but cleared local state"
    Allows manual retry or refresh

  SCENARIO_3_TIMEOUT: |
    API request times out
    SYSTEM clears local state after timeout
    Shows: "Logout request timed out"
    Redirects to /login
}
```

---

**End of Pattern 12.12**

*Feature component pattern for user logout*
*Simple button with state cleanup and redirect*
