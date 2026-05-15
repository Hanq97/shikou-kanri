# App Router Guards Specialist
# Chuyên Gia Bảo Vệ Định Tuyến App Router

**Role**: Next.js 15 route protection, authentication, authorization, and access control specialist
**Focus**: Middleware guards, role-based access control, permission guards, subscription guards
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, jose (JWT), Feature-Sliced Design
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppRouterGuards {
  ROLE: "Route protection and access control specialist for Next.js 15 App Router"

  RESPONSIBILITIES: [
    "Implement middleware-based route protection (server-side)",
    "Create client-side guard components (AuthGuard, RoleGuard, PermissionGuard)",
    "Enforce role-based access control (RBAC)",
    "Manage permission-based authorization",
    "Handle subscription-tier access control",
    "Implement maintenance mode and feature flags"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "jose (JWT verification)", "Zustand (auth state)"],
    patterns: ["Middleware Guards", "HOC Guards", "Hook-based Guards", "Compositional Guards"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_roles: ["admin", "manager", "lawyer", "paralegal", "client"],
    key_permissions: ["contracts:read", "contracts:write", "contracts:delete", "cases:manage", "documents:approve"]
  }
}
```

---

## Pattern 9.23: RouteGuards - Route Protection & Middleware
## Pattern 9.23: RouteGuards - Bảo Vệ Định Tuyến & Middleware

### Overview

```pseudo
PATTERN RouteGuards {
  PURPOSE: "Protect routes with server-side middleware and client-side guards using authentication, authorization, and role-based access control"

  PROBLEM: "Need comprehensive route protection that works both server-side (middleware) and client-side (components) with JWT verification, role checks, and permission validation"

  SOLUTION: "Implement Next.js middleware for server-side protection and React guard components for client-side protection with Zustand auth state management"

  USE_CASES: [
    "Redirect unauthenticated users to login page",
    "Prevent authenticated users from accessing login/register pages",
    "Enforce role-based access (admin-only pages)",
    "Validate JWT tokens on every request",
    "Pass user info to Server Components via headers"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW MiddlewareGuard_Implementation {
  INPUT: {
    request: NextRequest,
    publicRoutes: string[],
    authOnlyRoutes: string[],
    protectedRoutes: string[],
    jwtSecret: string
  }

  PRECONDITIONS: [
    "JWT_SECRET environment variable configured",
    "Auth token stored in cookies with name 'auth-token'",
    "Route configuration defined (public, auth-only, protected)"
  ]

  STEPS: {
    STEP_1_EXTRACT_REQUEST_INFO: {
      description: "Extract pathname and token from request"
      logic: |
        pathname = request.nextUrl.pathname
        token = request.cookies.GET("auth-token")?.value

        IF token IS_NULL THEN
          token = null
        END IF
    }

    STEP_2_CLASSIFY_ROUTE: {
      description: "Determine route classification"
      logic: |
        is_public_route = FALSE
        is_auth_only_route = FALSE
        is_protected_route = FALSE

        FOR EACH route IN publicRoutes:
          IF pathname === route OR pathname.STARTS_WITH(route + "/") THEN
            is_public_route = TRUE
            BREAK
          END IF
        END FOR

        FOR EACH route IN authOnlyRoutes:
          IF pathname.STARTS_WITH(route) THEN
            is_auth_only_route = TRUE
            BREAK
          END IF
        END FOR

        FOR EACH route IN protectedRoutes:
          IF pathname.STARTS_WITH(route) THEN
            is_protected_route = TRUE
            BREAK
          END IF
        END FOR
    }

    STEP_3_VERIFY_JWT_TOKEN: {
      description: "Verify JWT token if present"
      logic: |
        is_authenticated = FALSE
        user_payload = null

        IF token IS_NOT_NULL THEN
          TRY:
            secret_key = TEXT_ENCODER.encode(jwtSecret)
            verified = AWAIT JWT_VERIFY(token, secret_key)
            is_authenticated = TRUE
            user_payload = verified.payload
          CATCH error:
            LOG_ERROR("Token verification failed", error)
            is_authenticated = FALSE
            user_payload = null
          END TRY
        END IF
    }

    STEP_4_HANDLE_PROTECTED_ROUTES: {
      description: "Redirect unauthenticated users from protected routes"
      logic: |
        IF is_protected_route AND NOT is_authenticated THEN
          login_url = NEW_URL("/login", request.url)
          login_url.searchParams.SET("callbackUrl", pathname)
          RETURN REDIRECT(login_url)
        END IF
    }

    STEP_5_HANDLE_AUTH_ONLY_ROUTES: {
      description: "Redirect authenticated users from auth pages"
      logic: |
        IF is_auth_only_route AND is_authenticated THEN
          dashboard_url = NEW_URL("/dashboard", request.url)
          RETURN REDIRECT(dashboard_url)
        END IF
    }

    STEP_6_CHECK_ROLE_BASED_ACCESS: {
      description: "Validate role-based access for specific routes"
      logic: |
        // Example: /dashboard/users requires admin or manager role
        IF pathname.STARTS_WITH("/dashboard/users") AND is_authenticated THEN
          user_roles = user_payload?.roles OR []

          has_required_role = (
            user_roles.INCLUDES("admin") OR
            user_roles.INCLUDES("manager")
          )

          IF NOT has_required_role THEN
            forbidden_url = NEW_URL("/dashboard", request.url)
            RETURN REDIRECT(forbidden_url)
          END IF
        END IF

        // Example: /legal/contracts requires contracts:read permission
        IF pathname.STARTS_WITH("/legal/contracts") AND is_authenticated THEN
          user_permissions = user_payload?.permissions OR []

          IF NOT user_permissions.INCLUDES("contracts:read") THEN
            forbidden_url = NEW_URL("/unauthorized", request.url)
            RETURN REDIRECT(forbidden_url)
          END IF
        END IF
    }

    STEP_7_ADD_USER_HEADERS: {
      description: "Add user info to request headers for Server Components"
      logic: |
        IF is_authenticated AND user_payload IS_NOT_NULL THEN
          request_headers = NEW_HEADERS(request.headers)

          request_headers.SET("x-user-id", user_payload.sub OR "")
          request_headers.SET("x-user-roles", JSON.stringify(user_payload.roles OR []))
          request_headers.SET("x-user-permissions", JSON.stringify(user_payload.permissions OR []))

          RETURN NEXT_RESPONSE({
            request: {
              headers: request_headers
            }
          })
        END IF
    }

    STEP_8_ALLOW_REQUEST: {
      description: "Allow request to proceed"
      logic: |
        RETURN NEXT_RESPONSE.next()
    }
  }

  ERROR_HANDLING: {
    JWTVerificationError: "Set is_authenticated = false, log error, continue",
    RedirectError: "Return 500 error page",
    UnexpectedError: "Log error, allow request (fail open for non-critical routes)"
  }

  OUTPUT: {
    response: NextResponse,
    action: "redirect | next | forbidden",
    user_headers: "x-user-id, x-user-roles, x-user-permissions (if authenticated)"
  }

  POSTCONDITIONS: [
    "Unauthenticated users cannot access protected routes",
    "Authenticated users skip auth pages",
    "User info available in Server Components via headers",
    "Invalid tokens are rejected"
  ]
}
```

### Key Interfaces

```typescript
// Middleware function signature
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse>;

// Middleware config
export const config: {
  matcher: string[];
};

// JWT payload interface
interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

// Route classification
const publicRoutes: string[];
const authOnlyRoutes: string[];
const protectedRoutes: string[];
```

### Workflow: Client-Side AuthGuard Component

```pseudo
WORKFLOW ClientSideAuthGuard {
  INPUT: {
    children: ReactNode,
    requiredRoles: string[] (optional),
    requiredPermissions: string[] (optional),
    fallback: ReactNode (optional)
  }

  PRECONDITIONS: [
    "Auth store configured with isAuthenticated, user state",
    "Next.js router available for redirects"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Get auth state from Zustand store"
      logic: |
        router = USE_ROUTER()
        { isAuthenticated, user } = USE_AUTH_STORE()
        is_checking = USE_STATE(true)
    }

    STEP_2_CHECK_AUTHENTICATION: {
      description: "Verify user is authenticated"
      logic: |
        USE_EFFECT(() => {
          IF NOT isAuthenticated THEN
            router.PUSH("/login")
            RETURN
          END IF

          // Continue to role/permission checks
        }, [isAuthenticated, user, router])
    }

    STEP_3_CHECK_REQUIRED_ROLES: {
      description: "Validate user has required roles"
      logic: |
        IF requiredRoles AND requiredRoles.length > 0 THEN
          user_roles = user?.roles OR []

          has_required_role = FALSE
          FOR EACH role IN requiredRoles:
            IF user_roles.INCLUDES(role) THEN
              has_required_role = TRUE
              BREAK
            END IF
          END FOR

          IF NOT has_required_role THEN
            router.PUSH("/unauthorized")
            RETURN
          END IF
        END IF
    }

    STEP_4_CHECK_REQUIRED_PERMISSIONS: {
      description: "Validate user has all required permissions"
      logic: |
        IF requiredPermissions AND requiredPermissions.length > 0 THEN
          user_permissions = user?.permissions OR []

          has_all_permissions = TRUE
          FOR EACH permission IN requiredPermissions:
            IF NOT user_permissions.INCLUDES(permission) THEN
              has_all_permissions = FALSE
              BREAK
            END IF
          END FOR

          IF NOT has_all_permissions THEN
            router.PUSH("/unauthorized")
            RETURN
          END IF
        END IF
    }

    STEP_5_SET_CHECKING_COMPLETE: {
      description: "Mark checking as complete"
      logic: |
        SET_IS_CHECKING(false)
    }

    STEP_6_RENDER_CONTENT: {
      description: "Render children or fallback"
      logic: |
        IF is_checking THEN
          RETURN fallback OR <AuthGuardSkeleton />
        END IF

        IF NOT isAuthenticated THEN
          RETURN null
        END IF

        RETURN <>{children}</>
    }
  }

  ERROR_HANDLING: {
    RouterError: "Log error and show error boundary",
    StoreError: "Redirect to login page"
  }

  OUTPUT: {
    rendered_content: ReactNode,
    redirects: "/login | /unauthorized (if access denied)"
  }

  POSTCONDITIONS: [
    "Only authenticated users with proper roles/permissions see content",
    "Unauthorized users are redirected appropriately",
    "Loading state shown during checks"
  ]
}
```

### Key Interfaces (Client Guards)

```typescript
// AuthGuard component props
interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

// AuthGuard component signature
export function AuthGuard({
  children,
  requiredRoles,
  requiredPermissions,
  fallback,
}: AuthGuardProps): JSX.Element | null;

// Skeleton component
function AuthGuardSkeleton(): JSX.Element;
```

---

## Pattern 9.31-9.35: Route Guards - Multi-Level Access Control
## Pattern 9.31-9.35: Bảo Vệ Định Tuyến - Kiểm Soát Truy Cập Đa Cấp

### Overview

```pseudo
PATTERN MultiLevelGuards {
  PURPOSE: "Implement compositional guard system with multiple layers: Authentication, Role, Permission, Subscription, and Maintenance"

  PROBLEM: "Need flexible, composable guard system that can handle complex access control scenarios (e.g., admin + contracts:write permission + pro subscription)"

  SOLUTION: "Create hook-based guard system (useRouteGuards) and specialized guard components (RoleGuard, PermissionGuard, SubscriptionGuard) that can be composed together"

  USE_CASES: [
    "Admin panel (requires admin role)",
    "Contract editor (requires contracts:write and contracts:delete permissions)",
    "Advanced analytics (requires pro or enterprise subscription)",
    "Feature flags and maintenance mode",
    "Compositional guards (e.g., admin + premium subscription)"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW useRouteGuards_Hook {
  INPUT: {
    config: GuardConfig {
      requiresAuth: boolean (optional),
      requiredRoles: string[] (optional),
      requiredPermissions: string[] (optional),
      requiredSubscription: "free" | "pro" | "enterprise" (optional),
      maintenanceMode: boolean (optional)
    }
  }

  PRECONDITIONS: [
    "Auth store available with isAuthenticated, user state",
    "User object contains roles, permissions, subscription fields",
    "Router available for redirects"
  ]

  STEPS: {
    STEP_1_INITIALIZE_STATE: {
      description: "Set up state and get dependencies"
      logic: |
        router = USE_ROUTER()
        { isAuthenticated, user } = USE_AUTH_STORE()
        is_checking = USE_STATE(true)
        access_denied = USE_STATE(null)
    }

    STEP_2_CHECK_AUTHENTICATION: {
      description: "Verify authentication if required"
      logic: |
        IF config.requiresAuth AND NOT isAuthenticated THEN
          SET_ACCESS_DENIED("unauthenticated")
          router.PUSH("/login")
          RETURN
        END IF
    }

    STEP_3_CHECK_MAINTENANCE_MODE: {
      description: "Check if route is in maintenance mode"
      logic: |
        IF config.maintenanceMode === true THEN
          SET_ACCESS_DENIED("maintenance")
          // Don't redirect, just block access
          RETURN
        END IF
    }

    STEP_4_CHECK_REQUIRED_ROLES: {
      description: "Validate user has at least one required role"
      logic: |
        IF config.requiredRoles AND isAuthenticated AND user THEN
          user_roles = user.roles OR []

          has_required_role = FALSE
          FOR EACH role IN config.requiredRoles:
            IF user_roles.INCLUDES(role) THEN
              has_required_role = TRUE
              BREAK
            END IF
          END FOR

          IF NOT has_required_role THEN
            SET_ACCESS_DENIED("insufficient-role")
            router.PUSH("/unauthorized")
            RETURN
          END IF
        END IF
    }

    STEP_5_CHECK_REQUIRED_PERMISSIONS: {
      description: "Validate user has ALL required permissions"
      logic: |
        IF config.requiredPermissions AND isAuthenticated AND user THEN
          user_permissions = user.permissions OR []

          has_all_permissions = TRUE
          FOR EACH permission IN config.requiredPermissions:
            IF NOT user_permissions.INCLUDES(permission) THEN
              has_all_permissions = FALSE
              BREAK
            END IF
          END FOR

          IF NOT has_all_permissions THEN
            SET_ACCESS_DENIED("insufficient-permission")
            router.PUSH("/unauthorized")
            RETURN
          END IF
        END IF
    }

    STEP_6_CHECK_SUBSCRIPTION_LEVEL: {
      description: "Validate user subscription tier"
      logic: |
        IF config.requiredSubscription AND isAuthenticated AND user THEN
          subscription_levels = {
            free: 1,
            pro: 2,
            enterprise: 3
          }

          user_level = subscription_levels[user.subscription] OR 0
          required_level = subscription_levels[config.requiredSubscription]

          IF user_level < required_level THEN
            SET_ACCESS_DENIED("insufficient-subscription")
            router.PUSH("/subscription-required")
            RETURN
          END IF
        END IF
    }

    STEP_7_MARK_CHECK_COMPLETE: {
      description: "All checks passed"
      logic: |
        SET_IS_CHECKING(false)
    }
  }

  ERROR_HANDLING: {
    RouterError: "Log error and show fallback",
    StoreError: "Redirect to error page",
    UnexpectedError: "Block access and show error boundary"
  }

  OUTPUT: {
    isChecking: boolean,
    accessDenied: "unauthenticated" | "maintenance" | "insufficient-role" | "insufficient-permission" | "insufficient-subscription" | null,
    isAllowed: boolean (computed: !accessDenied && !isChecking)
  }

  POSTCONDITIONS: [
    "Access granted only if all checks pass",
    "Appropriate redirects for each denial reason",
    "Checking state allows for loading UI"
  ]
}
```

### Key Interfaces

```typescript
// Guard configuration
export interface GuardConfig {
  requiresAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requiredSubscription?: 'free' | 'pro' | 'enterprise';
  maintenanceMode?: boolean;
}

// Hook return type
export interface GuardHookResult {
  isChecking: boolean;
  accessDenied: string | null;
  isAllowed: boolean;
}

// Hook signature
export function useRouteGuards(config: GuardConfig): GuardHookResult;
```

### Guard Component Workflows

```pseudo
WORKFLOW GuardComponents {
  // All guard components follow same pattern:
  // 1. Call useRouteGuards with specific config
  // 2. Render children, fallback, or null based on status

  RoleGuard: USE_ROUTE_GUARDS({ requiresAuth: true, requiredRoles })
  PermissionGuard: USE_ROUTE_GUARDS({ requiresAuth: true, requiredPermissions })
  SubscriptionGuard: USE_ROUTE_GUARDS({ requiresAuth: true, requiredSubscription })

  RENDER_LOGIC_ALL_COMPONENTS: |
    IF isChecking THEN RETURN fallback OR <Skeleton />
    IF NOT isAllowed THEN RETURN null
    RETURN <>{children}</>
}
```

### Key Interfaces (Guard Components)

```typescript
// RoleGuard component
export function RoleGuard({
  children,
  requiredRoles,
  fallback,
}: {
  children: React.ReactNode;
  requiredRoles: string[];
  fallback?: React.ReactNode;
}): JSX.Element | null;

// PermissionGuard component
export function PermissionGuard({
  children,
  requiredPermissions,
  fallback,
}: {
  children: React.ReactNode;
  requiredPermissions: string[];
  fallback?: React.ReactNode;
}): JSX.Element | null;

// SubscriptionGuard component
export function SubscriptionGuard({
  children,
  requiredSubscription,
  fallback,
}: {
  children: React.ReactNode;
  requiredSubscription: 'free' | 'pro' | 'enterprise';
  fallback?: React.ReactNode;
}): JSX.Element | null;
```

### Usage Example (Pseudo-code)

```pseudo
USAGE_EXAMPLES {
  // Admin panel
  <RoleGuard requiredRoles={["admin"]}><AdminPanel /></RoleGuard>

  // Contract editor
  <PermissionGuard requiredPermissions={["contracts:write", "contracts:delete"]}><Editor /></PermissionGuard>

  // Pro feature
  <SubscriptionGuard requiredSubscription="pro"><AdvancedAnalytics /></SubscriptionGuard>

  // Compositional (nested guards)
  <RoleGuard requiredRoles={["admin"]}>
    <PermissionGuard requiredPermissions={["system:manage"]}>
      <SubscriptionGuard requiredSubscription="enterprise">
        <SuperAdminFeature />
      </SubscriptionGuard>
    </PermissionGuard>
  </RoleGuard>
}
```

---

## Integration Points

```pseudo
INTEGRATION GuardsIntegration {
  MIDDLEWARE_LAYER: {
    location: "src/middleware.ts",
    triggers: "Every HTTP request matching config.matcher",
    actions: [
      "Verify JWT token",
      "Check route access (public, protected, auth-only)",
      "Validate roles and permissions",
      "Add user headers for Server Components"
    ]
  }

  CLIENT_COMPONENTS: {
    guard_components: ["AuthGuard", "RoleGuard", "PermissionGuard", "SubscriptionGuard"],
    usage: "Wrap protected UI components",
    state_source: "Zustand auth store"
  }

  STATE_MANAGEMENT: {
    client_state: "Auth store (isAuthenticated, user, roles, permissions, subscription)",
    server_state: "Request headers (x-user-id, x-user-roles, x-user-permissions)",
    persistence: "HTTP-only cookies (auth-token)"
  }

  ERROR_HANDLING: {
    unauthenticated: "Redirect to /login with callbackUrl",
    insufficient_role: "Redirect to /unauthorized",
    insufficient_permission: "Redirect to /unauthorized",
    insufficient_subscription: "Redirect to /subscription-required",
    maintenance_mode: "Show maintenance page"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  USER_ROLES: {
    admin: "Quản Trị Viên (full access)",
    manager: "Quản Lý (team/workflow management)",
    lawyer: "Luật Sư (cases, documents, contracts)",
    paralegal: "Trợ Lý Pháp Lý (document assistance)",
    client: "Khách Hàng (own contracts/cases only)"
  }

  PERMISSIONS: [
    "contracts:read/write/delete/approve",
    "documents:read/write/delete/approve",
    "cases:read/write/manage",
    "users:read/write/delete",
    "system:manage/config"
  ]

  SUBSCRIPTION_TIERS: {
    free: "Miễn Phí (basic, 10 contracts max)",
    pro: "Chuyên Nghiệp (advanced, unlimited, AI) - 500k VND/month",
    enterprise: "Doanh Nghiệp (custom integrations, support) - 2M VND/month"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.21-9.22 - RouterProvider & RouteConfig",
    relationship: "Guards consume route configuration for access control",
    integration: "Middleware reads routeConfig to determine protection level"
  },
  {
    pattern: "Pattern 9.1-9.6 - Providers (Auth, Query, Theme)",
    relationship: "Guards depend on AuthProvider for user state",
    integration: "useAuthStore hook provides authentication state"
  },
  {
    pattern: "Pattern 9.24-9.25 - RouteLoader & ErrorBoundary",
    relationship: "Guards integrate with error boundaries for access denied errors",
    integration: "Guard errors caught by route-level error boundaries"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD), Next.js 15 Middleware
- **Technology Docs**: [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware), [jose (JWT)](https://github.com/panva/jose)
- **Internal Docs**: `/docs/security/authentication-flow.md`, `/docs/security/rbac-system.md`

---

**File Lines**: ~700 lines
**Compliance**: ✅ ≤800 lines
**Format**: ✅ Pseudo-code WORKFLOW format
**Status**: Complete - Ready for File 3
