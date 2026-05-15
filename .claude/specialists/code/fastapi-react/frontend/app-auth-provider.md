# App Authentication & Error Handling Provider Specialist

**Role**: Authentication and error boundary expert
**Focus**: JWT authentication, user permissions, React 19 ErrorBoundary, error recovery
**Technology**: React Context API, JWT, React 19 ErrorBoundary
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppAuthErrorProvider {
  ROLE: "Authentication and error handling expert for Vietnamese legal platform"

  RESPONSIBILITIES: [
    "Manage JWT authentication and refresh tokens",
    "Handle user context and permissions (lawyer, admin, client roles)",
    "Implement React 19 ErrorBoundary with graceful recovery",
    "Provide fallback UI for error states",
    "Report errors to monitoring services (Sentry)"
  ]

  TECH_STACK: {
    primary: "React Context API + ErrorBoundary",
    libraries: ["react", "jwt-decode"],
    patterns: ["auth-provider", "error-boundary", "context-pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_roles: ["admin", "lawyer", "paralegal", "client"]
  }
}
```

---

## Pattern 9.3: AuthProvider

### Overview

```pseudo
PATTERN AuthProvider {
  PURPOSE: "Authentication context with JWT, refresh tokens, and user info"

  PROBLEM: "Need global auth state management with token rotation and role-based access"

  SOLUTION: "React Context provider with JWT management and Vietnamese legal role system"

  USE_CASES: [
    "User login with email/password",
    "Automatic token refresh before expiry",
    "Role-based UI rendering (lawyer vs client)",
    "Permission-based feature access",
    "Logout and session cleanup"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW AuthProvider_Initialization {
  INPUT: {
    children: ReactNode
  }

  PRECONDITIONS: [
    "API endpoints /api/auth/login and /api/auth/refresh exist",
    "localStorage is available"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Setup initial auth state"
      logic: |
        state = {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: true,
          error: null
        }
    }

    STEP_2_LOAD_PERSISTED_AUTH: {
      description: "Load auth data from localStorage on mount"
      logic: |
        ON_MOUNT:
          TRY:
            storedToken = localStorage.GET("auth-token")
            storedUser = localStorage.GET("auth-user")

            IF storedToken AND storedUser THEN
              state.token = storedToken
              state.user = JSON.parse(storedUser)

              // Verify token validity
              AWAIT refreshToken()
            END IF
          CATCH error:
            console.error("Auth initialization failed:", error)
            localStorage.REMOVE("auth-token")
            localStorage.REMOVE("auth-user")
          FINALLY:
            state.isLoading = false
    }

    STEP_3_PROVIDE_CONTEXT: {
      description: "Provide auth context to component tree"
      logic: |
        value = {
          user: state.user,
          token: state.token,
          isAuthenticated: !!state.user && !!state.token,
          isLoading: state.isLoading,
          error: state.error,
          login: loginFunction,
          logout: logoutFunction,
          refreshToken: refreshTokenFunction,
          updateProfile: updateProfileFunction
        }

        RETURN <AuthContext.Provider value={value}>
          {children}
        </AuthContext.Provider>
    }
  }

  ERROR_HANDLING: {
    InitializationFailure: "Clear localStorage, set isLoading=false",
    TokenExpired: "Call refreshToken(), fallback to logout if refresh fails"
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Global auth context with useAuth() hook"
  }

  POSTCONDITIONS: [
    "useAuth() hook available in all child components",
    "Auth state persisted in localStorage",
    "Token refresh scheduled if authenticated"
  ]
}
```

### Login Flow

```pseudo
WORKFLOW AuthProvider_Login {
  INPUT: {
    email: string,
    password: string
  }

  STEPS: {
    STEP_1_VALIDATE_INPUT: {
      description: "Validate email and password format"
      logic: |
        IF email IS_EMPTY OR NOT VALID_EMAIL_FORMAT THEN
          THROW ERROR "Invalid email address"
        END IF

        IF password IS_EMPTY OR password.length < 8 THEN
          THROW ERROR "Password must be at least 8 characters"
        END IF
    }

    STEP_2_CALL_LOGIN_API: {
      description: "Send login request to backend"
      logic: |
        SET state.isLoading = true
        SET state.error = null

        response = AWAIT FETCH("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        })

        IF NOT response.ok THEN
          THROW ERROR "Login failed"
        END IF

        { user, token } = AWAIT response.json()
    }

    STEP_3_UPDATE_AUTH_STATE: {
      description: "Store user and token in state and localStorage"
      logic: |
        SET state.user = user
        SET state.token = token

        localStorage.SET("auth-token", token)
        localStorage.SET("auth-user", JSON.stringify(user))
    }

    STEP_4_SCHEDULE_TOKEN_REFRESH: {
      description: "Schedule automatic token refresh before expiry"
      logic: |
        tokenExpiry = DECODE_JWT(token).exp
        refreshTime = tokenExpiry - 5 * 60 * 1000  // 5 min before expiry

        setTimeout(() => {
          refreshToken()
        }, refreshTime)
    }
  }

  ERROR_HANDLING: {
    InvalidCredentials: "Set error state, show toast notification",
    NetworkError: "Set error state, retry with exponential backoff",
    UnexpectedError: "Log error, set error state"
  }

  OUTPUT: {
    success: boolean,
    user?: User,
    error?: string
  }

  POSTCONDITIONS: [
    "User is authenticated if login successful",
    "Error state set if login failed",
    "isLoading set to false"
  ]
}
```

### Logout Flow

```pseudo
WORKFLOW AuthProvider_Logout {
  STEPS: {
    STEP_1_CALL_LOGOUT_API: {
      description: "Notify backend of logout"
      logic: |
        TRY:
          AWAIT FETCH("/api/auth/logout", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + state.token
            }
          })
        CATCH error:
          console.error("Logout API call failed:", error)
        // Continue with local logout even if API call fails
    }

    STEP_2_CLEAR_AUTH_STATE: {
      description: "Clear user, token, and error state"
      logic: |
        SET state.user = null
        SET state.token = null
        SET state.error = null
        SET state.isAuthenticated = false
    }

    STEP_3_CLEAR_STORAGE: {
      description: "Remove auth data from localStorage"
      logic: |
        localStorage.REMOVE("auth-token")
        localStorage.REMOVE("auth-user")
    }

    STEP_4_REDIRECT: {
      description: "Redirect to login page"
      logic: |
        router.push("/login")
    }
  }

  OUTPUT: {
    success: true
  }

  POSTCONDITIONS: [
    "User is logged out",
    "localStorage cleared",
    "Redirected to login page"
  ]
}
```

### Token Refresh Flow

```pseudo
WORKFLOW AuthProvider_RefreshToken {
  STEPS: {
    STEP_1_CALL_REFRESH_API: {
      description: "Request new token from backend"
      logic: |
        response = AWAIT FETCH("/api/auth/refresh", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + state.token
          }
        })

        IF NOT response.ok THEN
          THROW ERROR "Token refresh failed"
        END IF

        { token: newToken, user: newUser } = AWAIT response.json()
    }

    STEP_2_UPDATE_TOKEN: {
      description: "Update token in state and localStorage"
      logic: |
        SET state.token = newToken
        SET state.user = newUser

        localStorage.SET("auth-token", newToken)
        localStorage.SET("auth-user", JSON.stringify(newUser))
    }

    STEP_3_SCHEDULE_NEXT_REFRESH: {
      description: "Schedule next token refresh"
      logic: |
        tokenExpiry = DECODE_JWT(newToken).exp
        refreshTime = tokenExpiry - 5 * 60 * 1000

        setTimeout(() => {
          refreshToken()
        }, refreshTime)
    }
  }

  ERROR_HANDLING: {
    RefreshFailure: "Force logout, redirect to login page"
  }

  OUTPUT: {
    success: boolean,
    error?: string
  }
}
```

### Permission Checking

```pseudo
WORKFLOW AuthProvider_PermissionChecks {
  DESCRIPTION: "Helper hooks for Vietnamese legal platform roles"

  HOOKS: {
    useHasPermission: (permission: string) => {
      user = useAuth().user
      RETURN user?.permissions.includes(permission) ?? false
    },

    useHasRole: (role: "admin" | "lawyer" | "paralegal" | "client") => {
      user = useAuth().user
      RETURN user?.role === role
    },

    useIsLawyer: () => {
      user = useAuth().user
      RETURN user?.role === "lawyer" OR user?.role === "admin"
    },

    useIsAdmin: () => {
      user = useAuth().user
      RETURN user?.role === "admin"
    },

    useCanReviewDocuments: () => {
      RETURN useHasPermission("review_documents")
    },

    useCanApproveContracts: () => {
      RETURN useHasPermission("approve_contracts")
    }
  }

  USAGE_EXAMPLE: |
    function ContractApprovalButton() {
      canApprove = useCanApproveContracts()

      IF NOT canApprove THEN
        RETURN null  // Hide button if no permission
      END IF

      RETURN <Button>Approve Contract</Button>
    }
}
```

### Key Interfaces

```typescript
// Vietnamese Legal User Model
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'lawyer' | 'paralegal' | 'client';
  permissions: string[];
  organization?: string;
  avatar?: string;
  locale: 'vi' | 'en';
}

// Auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth hooks
function useAuth(): AuthContextType;
function useHasPermission(permission: string): boolean;
function useHasRole(role: User['role']): boolean;
function useIsLawyer(): boolean;
function useIsAdmin(): boolean;
```

### Integration Points

```pseudo
INTEGRATION AuthProvider_Integration {
  UI_COMPONENTS: ["LoginForm", "LogoutButton", "ProfileMenu", "UserAvatar"]
  STATE: "AuthProvider (Context) + useAuthStore (Zustand) + TanStack Query"
  API_ENDPOINTS: ["POST /api/auth/login", "POST /api/auth/logout", "POST /api/auth/refresh"]
  DEPENDENCIES: ["@/app/providers/store-provider", "@/shared/api/auth", "react", "jwt-decode"]
  ERROR_HANDLING: "Invalid credentials: show error; Token expired: auto-refresh or logout"
}
```

---

## Pattern 9.11: ErrorBoundary

### Overview

```pseudo
PATTERN ErrorBoundary {
  PURPOSE: "Global error boundary with fallback UI and error reporting"

  PROBLEM: "Need to catch and handle React component errors gracefully"

  SOLUTION: "React 19 ErrorBoundary class component with Vietnamese localized error UI"

  USE_CASES: [
    "Catch component rendering errors",
    "Display user-friendly error message",
    "Report errors to Sentry in production",
    "Allow user to retry failed operation",
    "Show error stack in development mode"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ErrorBoundary_LifeCycle {
  INPUT: {
    children: ReactNode,
    fallback?: (error: Error, resetError: () => void) => ReactNode,
    onError?: (error: Error, errorInfo: ErrorInfo) => void
  }

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Setup error boundary state"
      logic: |
        state = {
          hasError: false,
          error: null
        }
    }

    STEP_2_CATCH_ERROR: {
      description: "Catch errors from child components"
      logic: |
        ON_ERROR_CAUGHT(error, errorInfo):
          // Update state
          SET state.hasError = true
          SET state.error = error

          // Log to console
          console.error("ErrorBoundary caught:", error, errorInfo)

          // Call custom error handler
          IF props.onError EXISTS THEN
            props.onError(error, errorInfo)
          END IF

          // Report to error tracking service
          IF PRODUCTION_MODE THEN
            Sentry.captureException(error, {
              contexts: { react: errorInfo }
            })
          END IF
    }

    STEP_3_RENDER_FALLBACK: {
      description: "Render fallback UI when error occurs"
      logic: |
        IF state.hasError AND state.error THEN
          IF props.fallback EXISTS THEN
            RETURN props.fallback(state.error, resetError)
          ELSE
            RETURN <DefaultErrorFallback error={state.error} reset={resetError} />
          END IF
        END IF

        RETURN children
    }

    STEP_4_RESET_ERROR: {
      description: "Allow user to retry after error"
      logic: |
        resetError = () => {
          SET state.hasError = false
          SET state.error = null
        }
    }
  }

  ERROR_HANDLING: {
    CatchError: "Display fallback UI, log error, report to Sentry"
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Error boundary wrapper around children"
  }

  POSTCONDITIONS: [
    "Errors caught and handled gracefully",
    "Fallback UI displayed on error",
    "User can retry failed operation"
  ]
}
```

### Default Error Fallback

```pseudo
WORKFLOW DefaultErrorFallback_UI {
  INPUT: {
    error: Error,
    reset: () => void
  }

  DESCRIPTION: "Vietnamese legal platform error fallback UI"

  UI_STRUCTURE: |
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Error icon */}
        <AlertTriangle className="w-12 h-12 mx-auto text-red-600" />

        {/* Bilingual error message */}
        <h1 className="mt-4 text-2xl font-bold text-center">
          Có lỗi xảy ra / Something went wrong
        </h1>

        <p className="mt-2 text-sm text-center text-gray-600">
          Xin lỗi, đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
        </p>
        <p className="text-xs text-center text-gray-500">
          We're sorry, but something unexpected happened. Please try again.
        </p>

        {/* Error details (development only) */}
        IF DEVELOPMENT_MODE THEN
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="text-xs font-mono text-red-600">{error.message}</p>
            IF error.stack THEN
              <pre className="mt-2 text-xs font-mono overflow-x-auto">
                {error.stack}
              </pre>
            END IF
          </div>
        END IF

        {/* Retry button */}
        <button onClick={reset} className="mt-6 w-full bg-blue-600 text-white rounded-lg">
          <RefreshCw className="w-4 h-4 mr-2" />
          Thử lại / Try again
        </button>
      </div>
    </div>
}
```

### Error Handler Hook

```pseudo
WORKFLOW useErrorHandler_Hook {
  DESCRIPTION: "Hook to throw errors in functional components"

  USAGE: |
    function MyComponent() {
      errorHandler = useErrorHandler()

      FUNCTION handleClick() {
        TRY:
          // Some risky operation
          riskyOperation()
        CATCH error:
          errorHandler(error)  // Trigger error boundary
        END TRY
      }

      RETURN <button onClick={handleClick}>Click me</button>
    }

  IMPLEMENTATION: |
    function useErrorHandler() {
      RETURN (error: Error) => {
        THROW error  // This will be caught by ErrorBoundary
      }
    }
}
```

### Key Interfaces

```typescript
// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error fallback props
interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

// Error handler hook
function useErrorHandler(): (error: Error) => never;
```

### Integration Points

```pseudo
INTEGRATION ErrorBoundary_Integration {
  UI_COMPONENTS: ["All page components", "DefaultErrorFallback"]
  ERROR_TRACKING: "Production: Sentry.captureException(); Development: console.error()"
  DEPENDENCIES: ["@/shared/components/icons", "react", "@sentry/react"]
  ERROR_HANDLING: "Component error: show fallback UI and report to Sentry"
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    User: {
      roles: ["admin", "lawyer", "paralegal", "client"],
      vietnamese_term: "Người Dùng",
      permissions: [
        "review_documents",
        "approve_contracts",
        "manage_users",
        "view_analytics",
        "upload_documents"
      ]
    },
    AuthSession: {
      duration: "24 hours",
      refresh_window: "5 minutes before expiry",
      vietnamese_term: "Phiên Đăng Nhập"
    }
  }

  BUSINESS_RULES: {
    password_requirements: "Minimum 8 characters, 1 uppercase, 1 number",
    session_timeout: "24 hours of inactivity",
    token_refresh: "Automatic refresh 5 minutes before expiry",
    role_hierarchy: "admin > lawyer > paralegal > client"
  }

  SECURITY: {
    jwt_algorithm: "RS256",
    token_storage: "localStorage (with httpOnly cookie as fallback)",
    csrf_protection: "CSRF token in cookie",
    data_encryption: "TLS 1.3 for data in transit"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.1 - QueryProvider",
    relationship: "AuthProvider provides token for API requests",
    integration: "useAuth().token → API headers"
  },
  {
    pattern: "Pattern 9.6 - StoreProvider",
    relationship: "AuthStore persists auth state in localStorage",
    integration: "useAuthStore() syncs with AuthProvider"
  },
  {
    pattern: "Pattern 9.5 - ToastProvider",
    relationship: "Show toast notifications for auth errors",
    integration: "login error → legalToast.error()"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [React Context](https://react.dev/learn/passing-data-deeply-with-context), [ErrorBoundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- **Internal Docs**: `/docs/architecture/authentication.md`

---

**Total Patterns**: 2 (9.3, 9.11)
**Line Count**: ~480 lines
**Compliance**: ✅ ≤800 lines
**Date**: 2026-01-02
