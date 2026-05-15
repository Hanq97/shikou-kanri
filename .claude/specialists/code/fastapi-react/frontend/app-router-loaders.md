# App Router Loaders & Error Boundaries Specialist
# Chuyên Gia Trình Tải & Xử Lý Lỗi App Router

**Role**: Next.js 15 data loading, Suspense boundaries, and error handling specialist
**Focus**: Loading UI, skeleton screens, error boundaries, data fetching strategies
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Feature-Sliced Design
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppRouterLoaders {
  ROLE: "Data loading and error handling specialist for Next.js 15 App Router"

  RESPONSIBILITIES: [
    "Implement loading.tsx files for Suspense boundaries",
    "Create skeleton UI components for loading states",
    "Set up error.tsx files for error boundaries",
    "Handle route-level data fetching",
    "Generate dynamic metadata for SEO",
    "Implement ISR (Incremental Static Regeneration)"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "lucide-react (icons)"],
    patterns: ["Suspense Boundaries", "Error Boundaries", "Server Components", "Metadata Generation"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Contract/Hợp Đồng", "Document/Tài Liệu", "Case/Vụ Án"]
  }
}
```

---

## Pattern 9.24: RouteLoader - Data Loading with Suspense
## Pattern 9.24: RouteLoader - Tải Dữ Liệu Bằng Suspense

### Overview

```pseudo
PATTERN RouteLoader {
  PURPOSE: "Load route data efficiently with Suspense boundaries, skeleton UI, and streaming SSR"

  PROBLEM: "Need optimized loading experience for dynamic routes with proper loading states and SEO metadata"

  SOLUTION: "Use Next.js 15 loading.tsx files for automatic Suspense boundaries, server-side data fetching in page.tsx, and generateMetadata for SEO"

  USE_CASES: [
    "Contract detail page with loading skeleton",
    "Document list with streaming SSR",
    "Case detail with incremental static regeneration (ISR)",
    "Dynamic metadata generation for legal pages"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW LoadingUI_Implementation {
  INPUT: {
    route_path: string (e.g., "/legal/contracts/[contractId]"),
    skeleton_type: "list" | "detail" | "form" | "dashboard"
  }

  PRECONDITIONS: [
    "Route defined in app directory",
    "Skeleton component created in features layer"
  ]

  STEPS: {
    STEP_1_CREATE_LOADING_FILE: {
      description: "Create loading.tsx in route directory"
      logic: |
        // src/app/(legal)/contracts/loading.tsx
        EXPORT DEFAULT FUNCTION ContractsLoading():
          RETURN <ContractListSkeleton />
        END FUNCTION
    }

    STEP_2_CREATE_SKELETON_COMPONENT: {
      description: "Build skeleton UI component"
      logic: |
        // src/features/legal/contracts/components/ContractListSkeleton.tsx
        EXPORT FUNCTION ContractListSkeleton():
          RETURN (
            <div className="space-y-4">
              <!-- Header skeleton -->
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />

              <!-- Search bar skeleton -->
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />

              <!-- Table skeleton -->
              FOR i = 0 TO 4:
                <div className="h-12 bg-gray-100 rounded animate-pulse" />
              END FOR
            </div>
          )
        END FUNCTION
    }

    STEP_3_IMPLEMENT_SERVER_DATA_FETCHING: {
      description: "Fetch data in Server Component page.tsx"
      logic: |
        // src/app/(legal)/contracts/page.tsx
        ASYNC FUNCTION ContractsPage():
          // This runs on the server
          contracts = AWAIT fetchContracts()

          RETURN <ContractList contracts={contracts} />
        END FUNCTION
    }

    STEP_4_GENERATE_METADATA: {
      description: "Create generateMetadata for SEO"
      logic: |
        // src/app/(legal)/contracts/[contractId]/page.tsx
        ASYNC FUNCTION generateMetadata({ params }):
          { contractId } = AWAIT params

          TRY:
            contract = AWAIT getContract(contractId)

            RETURN {
              title: "Hợp Đồng: " + contract.title,
              description: contract.description,
              openGraph: {
                title: contract.title,
                type: "article",
                publishedTime: contract.createdAt,
                modifiedTime: contract.updatedAt
              }
            }
          CATCH error:
            RETURN {
              title: "Hợp Đồng Không Tìm Thấy",
              description: "The contract could not be found"
            }
          END TRY
        END FUNCTION
    }

    STEP_5_CONFIGURE_REVALIDATION: {
      description: "Set up ISR (Incremental Static Regeneration)"
      logic: |
        // At top of page.tsx
        EXPORT revalidate = 60 // Revalidate every 60 seconds

        // OR for on-demand revalidation
        EXPORT revalidate = false
        EXPORT dynamic = "force-dynamic"

        // OR for static with periodic updates
        EXPORT revalidate = 3600 // Every hour
    }

    STEP_6_HANDLE_NOT_FOUND: {
      description: "Redirect to 404 if data not found"
      logic: |
        ASYNC FUNCTION ContractPage({ params }):
          { contractId } = AWAIT params

          TRY:
            contract = AWAIT getContract(contractId)

            IF NOT contract THEN
              notFound() // Triggers not-found.tsx
            END IF

            RETURN <ContractDetail contract={contract} />
          CATCH error:
            notFound()
          END TRY
        END FUNCTION
    }
  }

  ERROR_HANDLING: {
    DataFetchError: "Throw error to trigger error boundary (error.tsx)",
    NotFoundError: "Call notFound() to trigger not-found.tsx",
    ValidationError: "Render error message inline"
  }

  OUTPUT: {
    loading_ui: "Skeleton shown during data fetching",
    metadata: "SEO-optimized metadata per route",
    revalidation: "ISR configuration for optimal caching"
  }

  POSTCONDITIONS: [
    "Loading UI shown automatically during Suspense",
    "Metadata generated server-side for SEO",
    "Data fetched on server (no client-side waterfall)",
    "Not found handled gracefully"
  ]
}
```

### Key Interfaces

```typescript
// Loading component (no props)
export default function Loading(): JSX.Element;

// Page component with params
interface PageProps {
  params: Promise<{ [key: string]: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page(props: PageProps): Promise<JSX.Element>;

// Metadata generation
export async function generateMetadata(props: PageProps): Promise<Metadata>;

// Static params generation
export async function generateStaticParams(): Promise<Array<{ [key: string]: string }>>;

// Revalidation config
export const revalidate: number | false;
export const dynamic: 'auto' | 'force-dynamic' | 'error' | 'force-static';
```

---

## Pattern 9.25: RouteErrorBoundary - Route-Level Error Handling
## Pattern 9.25: RouteErrorBoundary - Xử Lý Lỗi Cấp Định Tuyến

### Overview

```pseudo
PATTERN RouteErrorBoundary {
  PURPOSE: "Handle errors at route level with custom error UI, recovery options, and error logging"

  PROBLEM: "Need user-friendly error handling that doesn't crash entire app when route data fails to load"

  SOLUTION: "Use Next.js 15 error.tsx files to create route-level error boundaries with reset capability"

  USE_CASES: [
    "Contract not found or failed to load",
    "Document fetch error",
    "Network timeout",
    "API server error (500)",
    "Permission denied (403)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ErrorBoundary_Implementation {
  INPUT: {
    error: Error & { digest?: string },
    reset: () => void
  }

  PRECONDITIONS: [
    "Error thrown in page.tsx or child component",
    "error.tsx exists in route directory or parent group"
  ]

  STEPS: {
    STEP_1_CREATE_ERROR_FILE: {
      description: "Create error.tsx in route directory"
      logic: |
        // src/app/(legal)/contracts/[contractId]/error.tsx
        'use client' // MUST be Client Component

        FUNCTION ContractError({ error, reset }):
          USE_EFFECT(() => {
            LOG_ERROR("Contract page error:", error)
          }, [error])

          RETURN <ErrorUI />
        END FUNCTION
    }

    STEP_2_BUILD_ERROR_UI: {
      description: "Create user-friendly error interface"
      logic: |
        RETURN (
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
              <!-- Error icon -->
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />

              <!-- Bilingual title -->
              <h1 className="mt-4 text-2xl font-bold text-center">
                Lỗi Tải Hợp Đồng / Error Loading Contract
              </h1>

              <!-- Bilingual message -->
              <p className="mt-2 text-sm text-center text-gray-600">
                Xin lỗi, không thể tải hợp đồng. Vui lòng thử lại sau.
              </p>

              <!-- Dev-only error details -->
              IF process.env.NODE_ENV === "development" THEN
                <div className="mt-4 p-4 bg-gray-100 rounded">
                  <p className="text-xs font-mono text-red-600">
                    {error.message}
                  </p>
                  IF error.digest THEN
                    <p className="text-xs text-gray-500">ID: {error.digest}</p>
                  END IF
                </div>
              END IF

              <!-- Action buttons -->
              <div className="mt-6 space-y-3">
                <!-- Retry button -->
                <button onClick={reset}>
                  <RefreshCw /> Thử Lại / Try Again
                </button>

                <!-- Back button -->
                <Link href="/legal/contracts">
                  <Home /> Quay Lại Danh Sách / Back to List
                </Link>
              </div>
            </div>
          </div>
        )
    }

    STEP_3_LOG_ERROR: {
      description: "Log error for monitoring"
      logic: |
        USE_EFFECT(() => {
          // Log to console in development
          console.error("Route error:", {
            message: error.message,
            stack: error.stack,
            digest: error.digest,
            timestamp: new Date().toISOString()
          })

          // Send to error tracking service in production
          IF process.env.NODE_ENV === "production" THEN
            sendToSentry(error) // or other service
          END IF
        }, [error])
    }

    STEP_4_HANDLE_RESET: {
      description: "Allow user to retry failed operation"
      logic: |
        // reset() re-renders the page.tsx
        <button onClick={() => reset()}>
          Thử Lại / Try Again
        </button>

        // OR navigate away
        <Link href="/legal/contracts">
          Back to List
        </Link>
    }
  }

  ERROR_HANDLING: {
    RenderError: "Fallback to parent error boundary",
    ResetError: "Refresh page if reset fails",
    LoggingError: "Continue execution, log to console"
  }

  OUTPUT: {
    error_ui: "User-friendly error message with recovery options",
    error_log: "Logged error for debugging",
    recovery_action: "Reset or navigate away"
  }

  POSTCONDITIONS: [
    "Error displayed in bilingual format",
    "User can retry or navigate away",
    "Error logged for monitoring",
    "App remains functional (error isolated to route)"
  ]
}
```

### Key Interfaces

```typescript
// Error component props
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Error component signature (MUST be Client Component)
'use client';
export default function Error({ error, reset }: ErrorProps): JSX.Element;

// Error object
interface RouteError extends Error {
  digest?: string; // Unique error ID from Next.js
  message: string;
  stack?: string;
}
```

### Error Hierarchy

```pseudo
ERROR_BOUNDARY_HIERARCHY {
  // Error boundaries cascade from specific to general
  hierarchy: [
    "src/app/(legal)/contracts/[contractId]/error.tsx" (most specific),
    "src/app/(legal)/contracts/error.tsx",
    "src/app/(legal)/error.tsx",
    "src/app/error.tsx" (catches all unhandled errors),
    "src/app/global-error.tsx" (fallback for root layout errors)
  ]

  // Error propagation
  propagation: |
    IF error.tsx exists at current level THEN
      RENDER error.tsx
    ELSE
      PROPAGATE to parent level
    END IF
}
```

---

## Integration Points

```pseudo
INTEGRATION LoadersErrorsIntegration {
  LOADING_STATES: {
    triggers: "Suspense boundary activated during async data fetch",
    components: ["loading.tsx", "Skeleton components"],
    timing: "Shown until Server Component resolves"
  }

  ERROR_STATES: {
    triggers: "Error thrown in page.tsx or child components",
    components: ["error.tsx", "global-error.tsx"],
    recovery: "reset() function or navigation"
  }

  DATA_FETCHING: {
    location: "Server Components (page.tsx)",
    methods: ["fetch with cache", "Database queries", "API calls"],
    caching: "Next.js automatic caching + revalidation"
  }

  SEO: {
    metadata: "generateMetadata runs before page renders",
    streaming: "Metadata sent first, then streamed HTML",
    social: "OpenGraph, Twitter cards for legal documents"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  LOADING_MESSAGES: {
    contracts: "Đang tải hợp đồng... / Loading contracts...",
    documents: "Đang tải tài liệu pháp lý... / Loading legal documents...",
    cases: "Đang tải vụ án... / Loading cases..."
  }

  ERROR_MESSAGES: {
    not_found: "Không tìm thấy / Not found",
    network_error: "Lỗi kết nối / Network error",
    permission_denied: "Không có quyền truy cập / Permission denied",
    server_error: "Lỗi máy chủ / Server error"
  }

  ACTIONS: {
    retry: "Thử Lại / Try Again",
    back_to_list: "Quay Lại Danh Sách / Back to List",
    go_home: "Quay Về Trang Chủ / Go Home",
    contact_support: "Liên Hệ Hỗ Trợ / Contact Support"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.21-9.22 - RouterProvider & RouteConfig",
    relationship: "Loaders use route metadata for loading messages",
    integration: "RouteConfig provides titles for loading states"
  },
  {
    pattern: "Pattern 9.23 - RouteGuards",
    relationship: "Guards may throw errors caught by error boundaries",
    integration: "Permission denied errors trigger error.tsx"
  },
  {
    pattern: "Pattern 9.36-9.40 - Layouts",
    relationship: "Layouts wrap loaders and error boundaries",
    integration: "Layout error.tsx catches layout-level errors"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD), Next.js 15 App Router
- **Technology Docs**: [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling), [React Suspense](https://react.dev/reference/react/Suspense)
- **Internal Docs**: `/docs/architecture/error-handling.md`, `/docs/performance/loading-states.md`

---

**File Lines**: ~400 lines
**Compliance**: ✅ ≤800 lines
**Format**: ✅ Pseudo-code WORKFLOW format
**Status**: Complete - Ready for File 4
