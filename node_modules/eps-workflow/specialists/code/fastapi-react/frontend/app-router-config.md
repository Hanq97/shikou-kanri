# App Router Configuration Specialist
# Chuyên Gia Cấu Hình App Router

**Role**: Next.js 15 App Router configuration and type-safe routing for Vietnamese legal AI platform
**Focus**: Root layout, route configuration, metadata, type-safe navigation
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Feature-Sliced Design
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppRouterConfig {
  ROLE: "Next.js 15 App Router configuration and type-safe routing specialist"

  RESPONSIBILITIES: [
    "Configure Next.js 15 App Router with root layout and metadata",
    "Define type-safe route configuration for legal platform",
    "Set up route groups (auth, dashboard, legal, public)",
    "Implement bilingual metadata (Vietnamese/English)",
    "Create reusable route configuration system"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "next/font"],
    patterns: ["App Router", "Server Components", "Route Groups"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Contract/Hợp Đồng", "Document/Tài Liệu", "Case/Vụ Án", "User/Người Dùng"]
  }
}
```

---

## Pattern 9.21: RouterProvider - Next.js 15 App Router Configuration
## Pattern 9.21: RouterProvider - Cấu Hình Next.js 15 App Router

### Overview

```pseudo
PATTERN RouterProvider {
  PURPOSE: "Configure Next.js 15 App Router with root layout, metadata, and provider hierarchy for legal platform"

  PROBLEM: "Need centralized configuration for App Router with Vietnamese/English bilingual support, SEO metadata, and proper provider composition"

  SOLUTION: "Create RootLayout as Server Component with metadata configuration, structured data for legal services, and Client Component providers wrapper"

  USE_CASES: [
    "Root layout with Vietnamese font support (Inter)",
    "SEO metadata for legal platform (contracts, documents, cases)",
    "Provider hierarchy (Query → Theme → Auth → Toast → Error)",
    "Structured data (JSON-LD) for legal services",
    "Route groups for logical organization"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW RouterProvider_Setup {
  INPUT: {
    appConfig: {
      url: string,
      title: string,
      titleVi: string,
      description: string,
      descriptionVi: string
    },
    fonts: {
      primary: FontConfig,
      code: FontConfig
    },
    providers: ProviderConfig[]
  }

  PRECONDITIONS: [
    "Next.js 15.3.0 installed with App Router enabled",
    "TypeScript configured with strict mode",
    "Provider components created (Query, Theme, Auth, Toast, Error)"
  ]

  STEPS: {
    STEP_1_CONFIGURE_FONTS: {
      description: "Set up Vietnamese-compatible fonts"
      logic: |
        primary_font = LOAD_FONT({
          name: "Inter",
          subsets: ["latin", "vietnamese"],
          weight: ["400", "500", "600", "700"],
          display: "swap"
        })

        code_font = LOAD_FONT({
          name: "JetBrains_Mono",
          subsets: ["latin"],
          display: "swap"
        })
    }

    STEP_2_DEFINE_METADATA: {
      description: "Create bilingual SEO metadata"
      logic: |
        metadata = {
          metadataBase: NEW_URL(appConfig.url),

          title: {
            default: appConfig.titleVi + " - " + appConfig.title,
            template: "%s | " + appConfig.title
          },

          description: appConfig.descriptionVi + " " + appConfig.description,

          keywords: [
            "hợp đồng", "contract management",
            "tài liệu pháp lý", "legal documents",
            "quản lý vụ án", "case management",
            "AI pháp lý", "legal AI"
          ],

          openGraph: {
            type: "website",
            locale: "vi_VN",
            url: appConfig.url,
            siteName: appConfig.title,
            title: appConfig.titleVi,
            description: appConfig.descriptionVi,
            images: [{
              url: "/og-image.png",
              width: 1200,
              height: 630
            }]
          },

          robots: {
            index: true,
            follow: true
          }
        }
    }

    STEP_3_CREATE_STRUCTURED_DATA: {
      description: "Generate JSON-LD for legal services"
      logic: |
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "LegalService",
          name: appConfig.title,
          description: appConfig.description,
          url: appConfig.url,
          serviceName: "Legal Document & Contract Management"
        }
    }

    STEP_4_COMPOSE_PROVIDERS: {
      description: "Set up provider hierarchy"
      logic: |
        provider_hierarchy = [
          "ErrorBoundary",     // Top level - catch all errors
          "QueryProvider",     // TanStack Query for server state
          "ThemeProvider",     // Dark/light mode
          "AuthProvider",      // Authentication & authorization
          "ToastProvider"      // Notifications
        ]

        FOR EACH provider IN provider_hierarchy:
          VALIDATE provider EXISTS
          VALIDATE provider PROPS are correct
        END FOR
    }

    STEP_5_CREATE_ROOT_LAYOUT: {
      description: "Build RootLayout Server Component"
      logic: |
        FUNCTION RootLayout(children):
          RETURN (
            <html lang="vi" suppressHydrationWarning>
              <head>
                <script type="application/ld+json">
                  {JSON.stringify(jsonLd)}
                </script>
                <link rel="icon" href="/favicon.ico" />
                <meta name="theme-color" content="#0066cc" />
              </head>
              <body className={primary_font.className}>
                <Providers>
                  {children}
                </Providers>
                <Analytics />
              </body>
            </html>
          )
        END FUNCTION
    }

    STEP_6_CREATE_PROVIDERS_WRAPPER: {
      description: "Create Client Component providers wrapper"
      logic: |
        'use client'

        FUNCTION Providers({ children }):
          RETURN (
            <ErrorBoundary>
              <QueryProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  <AuthProvider>
                    <ToastProvider />
                    {children}
                  </AuthProvider>
                </ThemeProvider>
              </QueryProvider>
            </ErrorBoundary>
          )
        END FUNCTION
    }
  }

  ERROR_HANDLING: {
    FontLoadError: "Fall back to system fonts",
    MetadataError: "Use default metadata configuration",
    ProviderError: "Log error and skip optional providers"
  }

  OUTPUT: {
    root_layout: "Server Component with metadata and provider hierarchy",
    providers_wrapper: "Client Component wrapping all providers",
    seo_config: "Bilingual metadata with structured data",
    font_config: "Vietnamese-compatible font configuration"
  }

  POSTCONDITIONS: [
    "App Router configured with proper metadata",
    "Providers hierarchy established",
    "Vietnamese font support enabled",
    "SEO optimization for legal platform"
  ]
}
```

### Key Interfaces

```typescript
// Font configuration
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

// Provider configuration
interface ProvidersProps {
  children: React.ReactNode;
}

// Metadata configuration
interface AppConfig {
  url: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
}

// Root layout function signature
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element;

// Providers wrapper function signature
export function Providers({ children }: ProvidersProps): JSX.Element;
```

### File Structure

```pseudo
FILE_STRUCTURE {
  app_directory: "src/app/",

  files: {
    "layout.tsx": "Root layout (Server Component)",
    "page.tsx": "Home page",
    "loading.tsx": "Root loading UI (Suspense boundary)",
    "error.tsx": "Root error boundary",
    "not-found.tsx": "404 page",
    "providers.tsx": "Combined providers (Client wrapper)",
    "globals.css": "Global styles"
  },

  route_groups: {
    "(auth)/": "Authentication routes (login, register, forgot-password)",
    "(dashboard)/": "Dashboard routes (users, settings)",
    "(legal)/": "Legal routes (contracts, documents, cases)",
    "(public)/": "Public routes (home, pricing, about)"
  },

  api_routes: {
    "api/auth/[...nextauth]/route.ts": "NextAuth authentication",
    "api/trpc/[trpc]/route.ts": "tRPC API routes"
  }
}
```

---

## Pattern 9.22: RouteConfig - Route Configuration with Type Safety
## Pattern 9.22: RouteConfig - Cấu Hình Định Tuyến Với An Toàn Kiểu Dữ Liệu

### Overview

```pseudo
PATTERN RouteConfig {
  PURPOSE: "Define type-safe route configuration system for navigation, permissions, and metadata management"

  PROBLEM: "Need centralized route management with type safety, permission checks, role-based access, and bilingual labels"

  SOLUTION: "Create TypeScript interfaces for route configuration with helper functions for navigation and permission validation"

  USE_CASES: [
    "Type-safe navigation throughout application",
    "Permission-based route access control",
    "Dynamic sidebar menu generation",
    "Breadcrumb navigation",
    "SEO metadata per route"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW RouteConfig_System {
  INPUT: {
    route_groups: ["auth", "dashboard", "legal", "public", "admin"],
    routes: RouteDefinition[],
    permissions: PermissionSet
  }

  PRECONDITIONS: [
    "TypeScript with strict mode enabled",
    "Route groups defined in app directory",
    "Permission system implemented"
  ]

  STEPS: {
    STEP_1_DEFINE_TYPES: {
      description: "Define TypeScript types for routes"
      logic: |
        TYPE RouteGroup = "auth" | "dashboard" | "legal" | "public" | "admin"

        INTERFACE RouteConfig:
          path: string
          label: string (English)
          labelVi: string (Vietnamese)
          icon: LucideIcon (optional)
          group: RouteGroup
          isPublic: boolean
          requiresAuth: boolean
          requiredRoles: string[] (optional)
          requiredPermissions: string[] (optional)
          children: RouteConfig[] (optional)
          metadata: {
            title: string,
            description: string,
            descriptionVi: string
          } (optional)
        END INTERFACE
    }

    STEP_2_DEFINE_AUTH_ROUTES: {
      description: "Configure authentication routes"
      logic: |
        auth_routes = [
          {
            path: "/login",
            label: "Đăng Nhập / Login",
            labelVi: "Đăng Nhập",
            group: "auth",
            isPublic: true,
            requiresAuth: false,
            metadata: {
              title: "Đăng Nhập - StartX4CRM",
              description: "Login to StartX4CRM Legal Platform",
              descriptionVi: "Đăng nhập vào Nền Tảng Pháp Lý StartX4CRM"
            }
          },
          {
            path: "/register",
            label: "Đăng Ký / Register",
            labelVi: "Đăng Ký",
            group: "auth",
            isPublic: true,
            requiresAuth: false
          },
          {
            path: "/forgot-password",
            label: "Quên Mật Khẩu / Forgot Password",
            labelVi: "Quên Mật Khẩu",
            group: "auth",
            isPublic: true,
            requiresAuth: false
          }
        ]
    }

    STEP_3_DEFINE_DASHBOARD_ROUTES: {
      description: "Configure dashboard routes"
      logic: |
        dashboard_routes = [
          {
            path: "/dashboard",
            label: "Bảng Điều Khiển / Dashboard",
            labelVi: "Bảng Điều Khiển",
            group: "dashboard",
            isPublic: false,
            requiresAuth: true,
            metadata: {
              title: "Bảng Điều Khiển",
              description: "Dashboard overview",
              descriptionVi: "Tổng quan bảng điều khiển"
            }
          },
          {
            path: "/dashboard/users",
            label: "Người Dùng / Users",
            labelVi: "Người Dùng",
            group: "dashboard",
            isPublic: false,
            requiresAuth: true,
            requiredRoles: ["admin", "manager"]
          },
          {
            path: "/dashboard/settings",
            label: "Cài Đặt / Settings",
            labelVi: "Cài Đặt",
            group: "dashboard",
            isPublic: false,
            requiresAuth: true
          }
        ]
    }

    STEP_4_DEFINE_LEGAL_ROUTES: {
      description: "Configure legal entity routes"
      logic: |
        legal_routes = [
          {
            path: "/legal/contracts",
            label: "Hợp Đồng / Contracts",
            labelVi: "Hợp Đồng",
            group: "legal",
            isPublic: false,
            requiresAuth: true,
            metadata: {
              title: "Quản Lý Hợp Đồng",
              description: "Contract management",
              descriptionVi: "Quản lý hợp đồng pháp lý"
            }
          },
          {
            path: "/legal/contracts/[contractId]",
            label: "Chi Tiết Hợp Đồng / Contract Details",
            labelVi: "Chi Tiết Hợp Đồng",
            group: "legal",
            isPublic: false,
            requiresAuth: true
          },
          {
            path: "/legal/documents",
            label: "Tài Liệu Pháp Lý / Legal Documents",
            labelVi: "Tài Liệu Pháp Lý",
            group: "legal",
            isPublic: false,
            requiresAuth: true
          },
          {
            path: "/legal/documents/[documentId]",
            label: "Chi Tiết Tài Liệu / Document Details",
            labelVi: "Chi Tiết Tài Liệu",
            group: "legal",
            isPublic: false,
            requiresAuth: true
          },
          {
            path: "/legal/cases",
            label: "Vụ Án / Legal Cases",
            labelVi: "Vụ Án",
            group: "legal",
            isPublic: false,
            requiresAuth: true
          },
          {
            path: "/legal/cases/[caseId]",
            label: "Chi Tiết Vụ Án / Case Details",
            labelVi: "Chi Tiết Vụ Án",
            group: "legal",
            isPublic: false,
            requiresAuth: true
          }
        ]
    }

    STEP_5_DEFINE_PUBLIC_ROUTES: {
      description: "Configure public routes"
      logic: |
        public_routes = [
          {
            path: "/",
            label: "Trang Chủ / Home",
            labelVi: "Trang Chủ",
            group: "public",
            isPublic: true,
            requiresAuth: false
          },
          {
            path: "/pricing",
            label: "Giá Cả / Pricing",
            labelVi: "Giá Cả",
            group: "public",
            isPublic: true,
            requiresAuth: false
          },
          {
            path: "/about",
            label: "Giới Thiệu / About",
            labelVi: "Giới Thiệu",
            group: "public",
            isPublic: true,
            requiresAuth: false
          }
        ]
    }

    STEP_6_CREATE_HELPER_FUNCTIONS: {
      description: "Create utility functions for route operations"
      logic: |
        all_routes = CONCAT(auth_routes, dashboard_routes, legal_routes, public_routes)

        FUNCTION getRouteByPath(path: string):
          RETURN all_routes.FIND(route => route.path === path)
        END FUNCTION

        FUNCTION isPublicRoute(path: string):
          route = getRouteByPath(path)
          RETURN route?.isPublic ?? false
        END FUNCTION

        FUNCTION requiresAuth(path: string):
          route = getRouteByPath(path)
          RETURN route?.requiresAuth ?? false
        END FUNCTION

        FUNCTION getRequiredRoles(path: string):
          route = getRouteByPath(path)
          RETURN route?.requiredRoles ?? []
        END FUNCTION

        FUNCTION getRequiredPermissions(path: string):
          route = getRouteByPath(path)
          RETURN route?.requiredPermissions ?? []
        END FUNCTION
    }

    STEP_7_CREATE_NAVIGATION_MENU: {
      description: "Generate navigation menu for sidebar"
      logic: |
        navigation_menu = FILTER all_routes WHERE:
          route.isPublic === false AND
          route.path NOT INCLUDES "[" (exclude dynamic routes)

        SORT navigation_menu BY group, then by path
    }
  }

  ERROR_HANDLING: {
    RouteNotFound: "Return undefined and log warning",
    InvalidPermission: "Return empty array",
    ConfigurationError: "Throw error during build time"
  }

  OUTPUT: {
    type_definitions: "TypeScript types for all routes",
    route_collections: "Organized route arrays by group",
    helper_functions: "Utility functions for route operations",
    navigation_menu: "Filtered menu for sidebar display"
  }

  POSTCONDITIONS: [
    "All routes have unique paths",
    "All protected routes have requiresAuth=true",
    "All routes have bilingual labels",
    "Navigation menu excludes dynamic routes"
  ]
}
```

### Key Interfaces

```typescript
// Route group types
export type RouteGroup = 'auth' | 'dashboard' | 'legal' | 'public' | 'admin';

// Route configuration interface
export interface RouteConfig {
  path: string;
  label: string;
  labelVi?: string;
  icon?: LucideIcon;
  group: RouteGroup;
  isPublic: boolean;
  requiresAuth: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  children?: RouteConfig[];
  metadata?: {
    title: string;
    description: string;
    descriptionVi?: string;
  };
}

// Helper function signatures
export function getRouteByPath(path: string): RouteConfig | undefined;
export function isPublicRoute(path: string): boolean;
export function requiresAuth(path: string): boolean;
export function getRequiredRoles(path: string): string[];
export function getRequiredPermissions(path: string): string[];

// Route collections
export const authRoutes: RouteConfig[];
export const dashboardRoutes: RouteConfig[];
export const legalRoutes: RouteConfig[];
export const publicRoutes: RouteConfig[];
export const allRoutes: RouteConfig[];
export const navigationMenu: RouteConfig[];
```

### Integration Points

```pseudo
INTEGRATION RouteConfig_Integration {
  UI_COMPONENTS: {
    triggers: ["Sidebar", "NavigationBar", "Breadcrumbs", "MobileNav"],
    displays: ["ActiveLink", "RouteTitle", "RouteMetadata"]
  }

  STATE_MANAGEMENT: {
    client_state: "Current route path (Zustand navigation store)",
    server_state: "N/A (static configuration)",
    persistence: "N/A (configuration only)"
  }

  DEPENDENCIES: {
    internal: ["@/shared/config/routes"],
    external: ["lucide-react (icons)"]
  }

  ERROR_HANDLING: {
    route_not_found: "Redirect to 404 page",
    unauthorized: "Redirect to login page",
    forbidden: "Show 403 error page"
  }

  EVENTS: {
    emits: ["onRouteChange", "onNavigationClick"],
    listens: ["onAuthStateChange", "onPermissionUpdate"]
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    Contract: {
      vietnamese_term: "Hợp Đồng",
      types: ["insurance_contract", "loan_contract", "service_contract"],
      routes: ["/legal/contracts", "/legal/contracts/[contractId]"]
    },
    Document: {
      vietnamese_term: "Tài Liệu Pháp Lý",
      types: ["evidence", "court_filing", "contract_attachment"],
      routes: ["/legal/documents", "/legal/documents/[documentId]"]
    },
    LegalCase: {
      vietnamese_term: "Vụ Án",
      statuses: ["pending", "in_progress", "resolved", "closed"],
      routes: ["/legal/cases", "/legal/cases/[caseId]"]
    },
    User: {
      vietnamese_term: "Người Dùng",
      roles: ["admin", "manager", "lawyer", "paralegal", "client"],
      routes: ["/dashboard/users", "/dashboard/users/[userId]"]
    }
  }

  BUSINESS_RULES: {
    route_access: "Role-based access control for all legal routes",
    metadata_language: "Vietnamese primary, English fallback",
    seo_optimization: "Bilingual metadata for all public routes"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    route_labels: "Bilingual format (Vietnamese / English)",
    metadata: "Vietnamese primary with English alternative"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.23 - RouteGuards",
    relationship: "Uses RouteConfig for permission checks",
    integration: "Middleware reads route configuration for auth validation"
  },
  {
    pattern: "Pattern 9.26-9.30 - Navigation Components",
    relationship: "Consumes RouteConfig for menu generation",
    integration: "Sidebar, Navbar use navigationMenu array"
  },
  {
    pattern: "Pattern 9.36-9.40 - Layouts",
    relationship: "Uses route metadata for page titles",
    integration: "Layouts read route.metadata for <head> content"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD), Next.js 15 App Router
- **Technology Docs**: [Next.js App Router](https://nextjs.org/docs/app), [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- **Internal Docs**: `/docs/architecture/app-router-structure.md`

---

**File Lines**: ~570 lines
**Compliance**: ✅ ≤800 lines
**Format**: ✅ Pseudo-code WORKFLOW format
**Status**: Complete - Ready for File 2
