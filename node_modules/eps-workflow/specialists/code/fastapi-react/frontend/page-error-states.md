# Page Error States Specialist
# Chuyên Gia Trạng Thái Lỗi Trang

**Role**: Next.js 15 error handling and loading state specialist for Vietnamese legal AI platform
**Focus**: 404 Not Found, Error Boundary, Loading UI, Suspense fallbacks
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Error Boundaries
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST PageErrorStates {
  ROLE: "Next.js 15 error handling and loading state implementation specialist"

  RESPONSIBILITIES: [
    "Implement 404 Not Found page with helpful suggestions",
    "Create global error boundary for server errors",
    "Design loading states with skeleton UI",
    "Build Suspense fallback components",
    "Integrate error reporting and monitoring"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "next/navigation", "web-vitals"],
    patterns: ["Error Boundaries", "Suspense", "Skeleton UI", "Error Reporting"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Error/Lỗi", "Loading/Đang Tải", "NotFound/Không Tìm Thấy"]
  }
}
```

---

## Pattern 10.36: 404 Not Found Page
## Pattern 10.36: Trang 404 Không Tìm Thấy

### Overview

```pseudo
PATTERN NotFoundPage {
  PURPOSE: "User-friendly page for missing resources with helpful navigation suggestions"

  PROBLEM: "Need graceful error handling for 404 errors with helpful links and clear messaging"

  SOLUTION: "Custom not-found.tsx with illustration, error code, description, action buttons, and quick links"

  USE_CASES: [
    "Display when route does not exist",
    "Show helpful navigation suggestions",
    "Provide quick links to common pages",
    "Include illustration for visual appeal",
    "Prevent search engine indexing"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW NotFoundPage_Render {
  INPUT: {
    // No input props for not-found.tsx
  }

  PRECONDITIONS: [
    "NotFoundIllustration component exists",
    "Common navigation routes are defined"
  ]

  STEPS: {
    STEP_1_DEFINE_METADATA: {
      description: "Define metadata with noindex for 404 pages"
      logic: |
        metadata = {
          title: "404 - Page Not Found",
          description: "The page you are looking for could not be found.",
          robots: "noindex, nofollow" // Prevent indexing
        }
    }

    STEP_2_RENDER_NOT_FOUND_PAGE: {
      description: "Render 404 page with helpful content"
      logic: |
        RETURN (
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-2xl w-full space-y-8 text-center">
              // Illustration
              <div className="flex justify-center">
                <NotFoundIllustration />
              </div>

              // Error Code
              <div>
                <h1 className="text-6xl font-bold">404</h1>
                <p className="text-2xl font-semibold mt-4">
                  Page Not Found
                </p>
              </div>

              // Description
              <p className="text-lg max-w-md mx-auto">
                Sorry, we couldn't find the page you're looking for.
                It might have been moved or deleted.
                Let's get you back on track.
              </p>

              // Action Buttons
              <div className="flex gap-4 justify-center">
                <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
                  Go Home
                </Link>
                <Link href="/help" className="px-6 py-3 border rounded-lg">
                  Get Help
                </Link>
              </div>

              // Quick Links
              <div className="space-y-3 text-sm max-w-md mx-auto">
                <p className="font-semibold">Quick Links:</p>
                <ul className="space-y-2">
                  <li><Link href="/">Home</Link></li>
                  <li><Link href="/dashboard">Dashboard</Link></li>
                  <li><Link href="/help">Help Center</Link></li>
                  <li><Link href="/contact">Contact Support</Link></li>
                </ul>
              </div>

              // JSON-LD Schema
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebPage',
                  name: '404 Not Found',
                  url: 'https://starx4crm.com/404',
                  isPartOf: {
                    '@type': 'WebSite',
                    name: 'StarX4CRM',
                    url: 'https://starx4crm.com'
                  }
                })}
              </script>
            </div>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "NotFound",
    type: "Server Component",
    features: [
      "User-friendly error message",
      "Helpful navigation suggestions",
      "Visual illustration",
      "Quick links to common pages",
      "JSON-LD schema for structure"
    ]
  }

  VALIDATION: [
    "Must not be indexed by search engines",
    "Must provide helpful navigation",
    "Must include visual appeal",
    "Must render quickly"
  ]
}
```

### Interface Signatures

```pseudo
COMPONENT_SIGNATURE NotFoundIllustration {
  PROPS: {}
  RETURNS: ReactElement
}
```

---

## Pattern 10.37: Error Page (Global Error Boundary)
## Pattern 10.37: Trang Lỗi (Ranh Giới Lỗi Toàn Cục)

### Overview

```pseudo
PATTERN ErrorPage {
  PURPOSE: "Server error handling with recovery options and error reporting"

  PROBLEM: "Need global error boundary to catch 500 errors, unexpected exceptions, and provide recovery mechanisms"

  SOLUTION: "Client Component error.tsx with error reporting, recovery function, environment-specific error details, and support links"

  USE_CASES: [
    "Handle 500 internal server errors",
    "Catch unexpected runtime exceptions",
    "Report errors to monitoring service",
    "Provide recovery with reset function",
    "Show error details in development only"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ErrorPage_Render {
  INPUT: {
    error: Error & { digest?: string }
    reset: () => void
  }

  PRECONDITIONS: [
    "Error reporting service is configured",
    "ErrorIllustration component exists",
    "Support routes are defined"
  ]

  STEPS: {
    STEP_1_REPORT_ERROR: {
      description: "Report error to monitoring service on mount"
      logic: |
        EFFECT ON_MOUNT:
          reportError({
            message: error.message,
            stack: error.stack,
            digest: error.digest,
            timestamp: new Date().toISOString()
          })
    }

    STEP_2_DETERMINE_ENVIRONMENT: {
      description: "Check if running in development mode"
      logic: |
        isDevelopment = process.env.NODE_ENV === 'development'
    }

    STEP_3_RENDER_ERROR_PAGE: {
      description: "Render error page with recovery options"
      logic: |
        RETURN (
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-2xl w-full space-y-8 text-center">
              // Illustration
              <div className="flex justify-center">
                <ErrorIllustration />
              </div>

              // Error Code
              <div>
                <h1 className="text-6xl font-bold text-red-600">500</h1>
                <p className="text-2xl font-semibold mt-4">
                  Something went wrong
                </p>
              </div>

              // Description
              <p className="text-lg max-w-md mx-auto">
                An unexpected error occurred. Our team has been notified
                and is working to resolve the issue.
                Please try again or contact support.
              </p>

              // Error Details (Development Only)
              IF isDevelopment AND error.message:
                <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-left">
                  <p className="font-mono text-sm text-red-800">
                    <strong>Error:</strong> {error.message}
                  </p>
                  IF error.digest:
                    <p className="font-mono text-xs text-red-600 mt-2">
                      <strong>Digest:</strong> {error.digest}
                    </p>
                </div>

              // Action Buttons
              <div className="flex gap-4 justify-center">
                <button onClick={reset} className="px-6 py-3 bg-blue-600 text-white rounded-lg">
                  Try again
                </button>
                <Link href="/" className="px-6 py-3 border rounded-lg">
                  Go Home
                </Link>
              </div>

              // Support Section
              <div className="space-y-3 text-sm">
                <p>Need help?</p>
                <div className="flex gap-4 justify-center">
                  <Link href="/help">Help Center</Link>
                  <span>•</span>
                  <Link href="/contact">Contact Support</Link>
                  <span>•</span>
                  <Link href="/status">System Status</Link>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "Error",
    type: "Client Component",
    features: [
      "Error reporting to monitoring service",
      "Recovery with reset function",
      "Environment-specific error details",
      "Support links",
      "Visual error illustration"
    ]
  }

  VALIDATION: [
    "Must be a Client Component (use client)",
    "Must report errors to monitoring",
    "Must provide recovery mechanism",
    "Must show details only in development"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

COMPONENT_SIGNATURE ErrorIllustration {
  PROPS: {}
  RETURNS: ReactElement
}

FUNCTION_SIGNATURE reportError {
  PARAMS: {
    message: string
    stack?: string
    digest?: string
    timestamp: string
  }
  RETURNS: Promise<void>
}
```

---

## Pattern 10.38: Loading Page (Suspense UI)
## Pattern 10.38: Trang Đang Tải (Giao Diện Suspense)

### Overview

```pseudo
PATTERN LoadingPage {
  PURPOSE: "Progressive loading states with skeleton UI for perceived performance improvement"

  PROBLEM: "Need loading fallbacks during async data fetching to improve user experience and prevent layout shift"

  SOLUTION: "Skeleton UI components that match final page layout with animate-pulse effects"

  USE_CASES: [
    "Loading state for dashboard pages",
    "Async data fetching fallback",
    "Suspense boundary fallback",
    "Progressive page rendering",
    "Perceived performance optimization"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW LoadingPage_Render {
  INPUT: {
    // No input props for loading.tsx
  }

  PRECONDITIONS: [
    "Skeleton components are defined",
    "Loading layout matches final page structure"
  ]

  STEPS: {
    STEP_1_RENDER_LOADING_SKELETONS: {
      description: "Render skeleton placeholders matching page layout"
      logic: |
        RETURN (
          <div className="space-y-6 p-6">
            // Page Header Skeleton
            <PageHeaderSkeleton />

            // Stats Cards Skeleton (4 cards in grid)
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              FOR i IN [0, 1, 2, 3]:
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            // Table Skeleton
            <div className="bg-white rounded-lg border border-gray-200">
              <TableSkeleton rows={5} columns={6} />
            </div>

            // Sidebar Skeleton (3 cards in grid)
            <div className="grid gap-6 lg:grid-cols-3">
              FOR i IN [0, 1, 2]:
                <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "Loading",
    type: "Server Component",
    features: [
      "Skeleton placeholders matching final layout",
      "Animate-pulse for smooth loading effect",
      "Responsive grid layouts",
      "Prevents layout shift",
      "Improves perceived performance"
    ]
  }

  VALIDATION: [
    "Skeleton must match final page layout",
    "Must use animate-pulse for smooth effect",
    "Must prevent cumulative layout shift",
    "Must render quickly"
  ]
}
```

### Interface Signatures

```pseudo
COMPONENT_SIGNATURE PageHeaderSkeleton {
  PROPS: {}
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE TableSkeleton {
  PROPS: {
    rows: number
    columns: number
  }
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE CardGridSkeleton {
  PROPS: {
    count: number
  }
  RETURNS: ReactElement
}
```

---

## Summary

This **Page Error States Specialist** provides comprehensive pseudo-code workflows for:

1. **Pattern 10.36 (404 Not Found)**: User-friendly 404 page with helpful suggestions, quick links, and visual illustration
2. **Pattern 10.37 (Error Boundary)**: Global error handler with error reporting, recovery mechanism, and environment-specific details
3. **Pattern 10.38 (Loading UI)**: Skeleton loading states with animate-pulse effects matching final page layout

**Key Features**:
- Error handling with user-friendly messaging
- Error reporting to monitoring services
- Recovery mechanisms (reset function)
- Loading states with skeleton UI
- Responsive layouts
- JSON-LD structured data
- Vietnamese/English bilingual support

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5, Error Boundaries, Suspense
**Domain Context**: Vietnamese legal P2P insurance & lending platform
**Format**: Pseudo-code WORKFLOW format with interface signatures only

---

*Page Error States Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.36-10.38 Coverage*
