# App Provider Composition Specialist

**Role**: Provider composition and orchestration expert
**Focus**: Correct provider ordering, hydration safety, performance optimization
**Technology**: Next.js 15.3.0 App Router, React 19
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppProviderComposition {
  ROLE: "Provider composition and orchestration expert for Vietnamese legal platform"

  RESPONSIBILITIES: [
    "Ensure correct provider nesting order",
    "Prevent hydration mismatches in SSR/CSR",
    "Optimize provider initialization sequence",
    "Coordinate state between providers",
    "Setup root layout with all providers"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0 App Router + React 19",
    providers: [
      "QueryProvider",
      "ThemeProvider",
      "AuthProvider",
      "I18nProvider",
      "ToastProvider",
      "StoreProvider",
      "ErrorBoundary"
    ],
    patterns: ["provider-composition", "root-layout"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    architecture: "Feature-Sliced Design (FSD)"
  }
}
```

---

## Provider Composition Pattern

### Overview

```pseudo
PATTERN ProviderComposition {
  PURPOSE: "Orchestrate all application providers in correct order for Vietnamese legal platform"

  PROBLEM: "Need to coordinate multiple providers with proper nesting and initialization sequence"

  SOLUTION: "Combine all providers in a single Providers component with correct ordering"

  USE_CASES: [
    "Setup app-wide context providers",
    "Ensure theme applies before UI renders",
    "Provide auth context to all pages",
    "Handle errors at root level",
    "Optimize provider initialization"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ProviderComposition_Setup {
  INPUT: {
    children: ReactNode
  }

  PRECONDITIONS: [
    "All provider components are client components ('use client')",
    "Next.js App Router is configured",
    "Environment variables are set"
  ]

  STEPS: {
    STEP_1_DEFINE_PROVIDER_ORDER: {
      description: "Establish correct provider nesting order"
      logic: |
        PROVIDER_ORDER = [
          "ErrorBoundary",          // Outermost - catches all errors
          "OptimizationProvider",   // Performance monitoring
          "QueryProvider",          // Server state (TanStack Query)
          "AppThemeProvider",       // Theme (early for UI)
          "I18nProvider",           // Internationalization
          "AuthProvider",           // Authentication context
          "ToastProvider"           // Notifications (innermost)
        ]

        RATIONALE: {
          ErrorBoundary: "Must wrap everything to catch all errors",
          OptimizationProvider: "Setup performance monitoring early",
          QueryProvider: "Needed before components make API calls",
          AppThemeProvider: "Theme must apply before UI renders",
          I18nProvider: "Translations needed in all components",
          AuthProvider: "Auth state used by protected routes",
          ToastProvider: "Notifications should be on top of content"
        }
    }

    STEP_2_NEST_PROVIDERS: {
      description: "Nest providers in correct order"
      logic: |
        RETURN (
          <ErrorBoundary onError={handleGlobalError}>
            <OptimizationProvider>
              <QueryProvider>
                <AppThemeProvider>
                  <I18nProvider>
                    <AuthProvider>
                      <ToastProvider>
                        {children}
                      </ToastProvider>
                    </AuthProvider>
                  </I18nProvider>
                </AppThemeProvider>
              </QueryProvider>
            </OptimizationProvider>
          </ErrorBoundary>
        )
    }

    STEP_3_HANDLE_ERRORS: {
      description: "Setup global error handler"
      logic: |
        handleGlobalError = (error, errorInfo) => {
          console.error("Global error caught:", error, errorInfo)

          IF PRODUCTION_MODE THEN
            // Send to error tracking service
            Sentry.captureException(error, {
              contexts: { react: errorInfo }
            })
          END IF

          // Log to analytics
          IF window.gtag EXISTS THEN
            gtag("event", "exception", {
              description: error.message,
              fatal: true
            })
          END IF
        }
    }
  }

  ERROR_HANDLING: {
    ProviderInitError: "ErrorBoundary catches and displays error UI",
    HydrationMismatch: "Theme provider suppressHydrationWarning={true}"
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "All app-wide context providers"
  }

  POSTCONDITIONS: [
    "All providers initialized in correct order",
    "Error boundary active at root level",
    "Theme and i18n ready before first render",
    "Auth state loaded from localStorage"
  ]
}
```

---

## Root Layout Integration

### Overview

```pseudo
PATTERN RootLayout {
  PURPOSE: "Next.js 15 App Router root layout with provider composition"

  PROBLEM: "Need to setup app-wide providers while maintaining SSR/CSR compatibility"

  SOLUTION: "Root layout with Providers component and hydration safety"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW RootLayout_Setup {
  INPUT: {
    children: ReactNode
  }

  STEPS: {
    STEP_1_DEFINE_METADATA: {
      description: "Setup app metadata for SEO"
      logic: |
        metadata = {
          title: "StarX4CRM - AI-Powered Legal Platform",
          description: "Vietnamese legal AI platform with multi-agent system",
          keywords: ["Legal", "AI", "CRM", "Vietnamese", "P2P Insurance"],
          authors: [{ name: "StarX4CRM Team" }],
          openGraph: {
            title: "StarX4CRM - AI-Powered Legal Platform",
            description: "Vietnamese legal AI platform",
            locale: "vi_VN",
            type: "website"
          }
        }
    }

    STEP_2_SETUP_HTML_ELEMENT: {
      description: "Configure HTML element with theme support"
      logic: |
        <html
          lang="vi"
          suppressHydrationWarning={true}  // Prevent theme hydration mismatch
        >
    }

    STEP_3_SETUP_BODY: {
      description: "Setup body with global styles"
      logic: |
        <body className="antialiased bg-background text-foreground">
          <Providers>
            {children}
          </Providers>
        </body>
    }

    STEP_4_LOAD_GLOBAL_STYLES: {
      description: "Import global CSS"
      logic: |
        import './globals.css'  // Tailwind CSS + custom styles
    }
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Root layout with all providers"
  }
}
```

### Example Implementation

```pseudo
EXAMPLE RootLayout_Implementation {
  FILE: "src/app/layout.tsx"

  CODE: |
    import type { Metadata } from 'next'
    import { Providers } from './providers'
    import './globals.css'

    export const metadata: Metadata = {
      title: 'StarX4CRM - AI-Powered Legal Platform',
      description: 'Vietnamese legal AI platform with multi-agent system',
      keywords: ['Legal', 'AI', 'CRM', 'Vietnamese'],
    }

    export default function RootLayout({
      children,
    }: {
      children: React.ReactNode
    }) {
      return (
        <html lang="vi" suppressHydrationWarning>
          <body>
            <Providers>{children}</Providers>
          </body>
        </html>
      )
    }

  FILE: "src/app/providers.tsx"

  CODE: |
    'use client'

    import { ReactNode } from 'react'
    import { QueryProvider } from './providers/query-provider'
    import { AppThemeProvider } from './providers/theme-provider'
    import { AuthProvider } from './providers/auth-provider'
    import { ToastProvider } from './providers/toast-provider'
    import { I18nProvider } from './providers/i18n-provider'
    import { ErrorBoundary } from './providers/error-boundary'
    import { OptimizationProvider } from './providers/optimization-provider'

    interface ProvidersProps {
      children: ReactNode
    }

    export function Providers({ children }: ProvidersProps) {
      return (
        <ErrorBoundary onError={handleError}>
          <OptimizationProvider>
            <QueryProvider>
              <AppThemeProvider>
                <I18nProvider>
                  <AuthProvider>
                    <ToastProvider>
                      {children}
                    </ToastProvider>
                  </AuthProvider>
                </I18nProvider>
              </AppThemeProvider>
            </QueryProvider>
          </OptimizationProvider>
        </ErrorBoundary>
      )
    }

    function handleError(error, errorInfo) {
      console.error('Global error:', error, errorInfo)
      // Send to Sentry in production
    }
}
```

---

## Provider Ordering Best Practices

### Workflow

```pseudo
WORKFLOW ProviderOrdering_Rules {
  DESCRIPTION: "Rules for determining provider nesting order"

  RULES: {
    RULE_1_ERROR_BOUNDARY_OUTERMOST: {
      principle: "ErrorBoundary must be outermost to catch all errors"
      reason: "Catches errors from all child providers and components"
      example: |
        ✅ CORRECT:
        <ErrorBoundary>
          <OtherProviders />
        </ErrorBoundary>

        ❌ INCORRECT:
        <SomeProvider>
          <ErrorBoundary />  // Won't catch SomeProvider errors
        </SomeProvider>
    }

    RULE_2_THEME_BEFORE_UI: {
      principle: "Theme provider before any UI components"
      reason: "Prevents flash of unstyled content (FOUC)"
      example: |
        ✅ CORRECT:
        <ThemeProvider>
          <UIComponent />
        </ThemeProvider>

        ❌ INCORRECT:
        <UIComponent />  // May flash wrong theme
        <ThemeProvider />
    }

    RULE_3_QUERY_BEFORE_DATA_DEPENDENT: {
      principle: "QueryProvider before components that fetch data"
      reason: "useQuery hook requires QueryProvider context"
      example: |
        ✅ CORRECT:
        <QueryProvider>
          <DataComponent />  // Can use useQuery
        </QueryProvider>

        ❌ INCORRECT:
        <DataComponent />  // useQuery will error
        <QueryProvider />
    }

    RULE_4_AUTH_BEFORE_PROTECTED: {
      principle: "AuthProvider before protected route components"
      reason: "Protected routes need auth context to check permissions"
      example: |
        ✅ CORRECT:
        <AuthProvider>
          <ProtectedRoute />  // Can check auth status
        </AuthProvider>

        ❌ INCORRECT:
        <ProtectedRoute />  // useAuth will error
        <AuthProvider />
    }

    RULE_5_TOAST_INNERMOST: {
      principle: "ToastProvider near innermost (but outside children)"
      reason: "Toasts should appear on top of all content"
      example: |
        ✅ CORRECT:
        <OtherProviders>
          <ToastProvider>
            {children}
          </ToastProvider>
        </OtherProviders>
    }

    RULE_6_I18N_EARLY: {
      principle: "I18nProvider early in tree"
      reason: "Translations needed in most components"
      example: |
        ✅ CORRECT:
        <I18nProvider>
          <ComponentsUsingTranslations />
        </I18nProvider>
    }
  }

  VALIDATION_CHECKLIST: [
    "✅ ErrorBoundary is outermost",
    "✅ ThemeProvider before any UI",
    "✅ QueryProvider before data fetching",
    "✅ AuthProvider before protected routes",
    "✅ I18nProvider early in tree",
    "✅ ToastProvider near innermost"
  ]
}
```

---

## Hydration Safety

### Workflow

```pseudo
WORKFLOW HydrationSafety_Strategies {
  DESCRIPTION: "Prevent hydration mismatches in Next.js App Router"

  STRATEGIES: {
    STRATEGY_1_SUPPRESS_HYDRATION_WARNING: {
      problem: "Theme mismatch between SSR and CSR (system theme detection)"
      solution: |
        <html suppressHydrationWarning={true}>
          {/* Theme class applied on client mount */}
        </html>

      when_to_use: "When theme depends on client-side detection (window.matchMedia)"
    }

    STRATEGY_2_USE_CLIENT_DIRECTIVE: {
      problem: "Providers use browser APIs not available during SSR"
      solution: |
        // src/app/providers.tsx
        'use client'

        export function Providers({ children }) {
          // Can use localStorage, window, etc.
        }

      when_to_use: "All provider files that use client-side APIs"
    }

    STRATEGY_3_LAZY_HYDRATION: {
      problem: "Provider initialization too slow on initial render"
      solution: |
        const LazyProvider = dynamic(() => import('./slow-provider'), {
          ssr: false,
          loading: () => <LoadingFallback />
        })

      when_to_use: "Heavy providers that aren't critical for first render"
    }

    STRATEGY_4_USE_EFFECT_FOR_CLIENT_ONLY: {
      problem: "Code runs on server and client, causing mismatch"
      solution: |
        useEffect(() => {
          // Only runs on client
          const theme = localStorage.getItem('theme')
          setTheme(theme)
        }, [])

      when_to_use: "When reading from localStorage or other client-only APIs"
    }

    STRATEGY_5_MOUNTED_STATE: {
      problem: "Conditional rendering based on client-only data"
      solution: |
        const [mounted, setMounted] = useState(false)

        useEffect(() => {
          setMounted(true)
        }, [])

        if (!mounted) {
          return <LoadingFallback />
        }

        return <ClientOnlyComponent />

      when_to_use: "Components that must render differently on client vs server"
    }
  }

  COMMON_PITFALLS: [
    "❌ Using localStorage during SSR",
    "❌ Accessing window object without client check",
    "❌ Date.now() or Math.random() in JSX (non-deterministic)"
  ]
}
```

---

## Performance Optimization

### Workflow

```pseudo
WORKFLOW ProviderPerformance_Optimization {
  DESCRIPTION: "Optimize provider initialization and re-renders"

  OPTIMIZATIONS: {
    OPTIMIZATION_1_MEMOIZE_CONTEXT_VALUES: {
      problem: "Provider re-renders all consumers when value changes"
      solution: |
        const value = useMemo(() => ({
          user,
          login,
          logout
        }), [user])  // Only recreate when user changes

        return <AuthContext.Provider value={value}>

      impact: "Prevents unnecessary re-renders of all consumers"
    }

    OPTIMIZATION_2_SPLIT_CONTEXTS: {
      problem: "Single large context causes all consumers to re-render"
      solution: |
        // Instead of one large AuthContext, split into:
        <AuthUserContext.Provider>  // User data
          <AuthActionsContext.Provider>  // Login/logout functions
            {children}
          </AuthActionsContext.Provider>
        </AuthUserContext.Provider>

        // Consumers only subscribe to what they need
        const user = useAuthUser()  // Re-renders when user changes
        const { login } = useAuthActions()  // Never re-renders (stable)

      impact: "Reduces re-render frequency"
    }

    OPTIMIZATION_3_LAZY_LOAD_PROVIDERS: {
      problem: "Too many providers slow down initial load"
      solution: |
        const AnalyticsProvider = lazy(() => import('./analytics-provider'))

        <Suspense fallback={<LoadingFallback />}>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </Suspense>

      impact: "Faster initial render, smaller bundle"
    }

    OPTIMIZATION_4_ZUSTAND_FOR_LOCAL_STATE: {
      problem: "React Context causes cascading re-renders"
      solution: |
        // Use Zustand for UI state instead of Context
        const useUIStore = create((set) => ({
          sidebarOpen: true,
          toggleSidebar: () => set((state) => ({
            sidebarOpen: !state.sidebarOpen
          }))
        }))

        // Only components using sidebarOpen re-render

      impact: "Eliminates cascading re-renders"
    }

    OPTIMIZATION_5_SELECTIVE_HYDRATION: {
      problem: "All providers hydrate at once, blocking render"
      solution: |
        <QueryProvider>  // Critical, hydrate immediately
          <Suspense fallback={<LoadingUI />}>
            <AnalyticsProvider>  // Non-critical, hydrate lazily
              {children}
            </AnalyticsProvider>
          </Suspense>
        </QueryProvider>

      impact: "Faster time to interactive (TTI)"
    }
  }

  PERFORMANCE_METRICS: {
    target_LCP: "< 2.5 seconds",
    target_FID: "< 100 milliseconds",
    target_CLS: "< 0.1",
    target_TTI: "< 3.5 seconds"
  }

  MONITORING: |
    // In OptimizationProvider
    useEffect(() => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(entry.name, entry.duration)

          if (entry.duration > 3000) {
            // Log slow operations
            analytics.track('slow_operation', {
              operation: entry.name,
              duration: entry.duration
            })
          }
        }
      })

      observer.observe({ entryTypes: ['measure', 'navigation'] })
    }, [])
}
```

---

## Testing Strategy

### Workflow

```pseudo
WORKFLOW ProviderComposition_Testing {
  DESCRIPTION: "Test provider composition and integration"

  TEST_CASES: {
    TEST_1_PROVIDER_ORDER: {
      description: "Verify providers are nested in correct order"
      test: |
        render(<Providers><TestComponent /></Providers>)

        // Check provider order using React DevTools
        expect(ErrorBoundary).toBeOutermost()
        expect(ToastProvider).toBeInnermost()
    }

    TEST_2_CONTEXT_AVAILABILITY: {
      description: "All contexts available in child components"
      test: |
        function TestComponent() {
          const auth = useAuth()
          const { theme } = useTheme()
          const { t } = useTranslation()

          return <div>{auth.user?.name} {theme} {t('hello')}</div>
        }

        render(<Providers><TestComponent /></Providers>)

        expect(screen.getByText(/TestUser light Xin chào/)).toBeInTheDocument()
    }

    TEST_3_ERROR_BOUNDARY: {
      description: "ErrorBoundary catches errors from providers"
      test: |
        function BrokenProvider({ children }) {
          throw new Error('Provider initialization failed')
        }

        render(
          <ErrorBoundary>
            <BrokenProvider>
              <div>Should not render</div>
            </BrokenProvider>
          </ErrorBoundary>
        )

        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    }

    TEST_4_HYDRATION_SAFETY: {
      description: "No hydration mismatches in SSR"
      test: |
        const { container } = renderToString(<Providers><App /></Providers>)
        const ssrHTML = container.innerHTML

        hydrate(<Providers><App /></Providers>, container)
        const csrHTML = container.innerHTML

        expect(ssrHTML).toBe(csrHTML)  // No mismatch
    }

    TEST_5_PERFORMANCE: {
      description: "Provider initialization under performance budget"
      test: |
        const start = performance.now()

        render(<Providers><App /></Providers>)

        const end = performance.now()
        const duration = end - start

        expect(duration).toBeLessThan(100)  // <100ms initialization
    }
  }

  INTEGRATION_TESTS: [
    "Test full user login flow across providers",
    "Test theme change propagates to all components",
    "Test query invalidation after auth state change",
    "Test toast notifications from query errors"
  ]
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  PROVIDER_CONFIGURATION: {
    default_language: "Vietnamese (vi)",
    default_theme: "system (follows OS preference)",
    auth_persistence: "localStorage with 24h expiry",
    query_cache: "10 minutes for legal documents"
  }

  BUSINESS_RULES: {
    session_management: "Auto-refresh token 5 min before expiry",
    error_reporting: "All production errors sent to Sentry",
    performance_monitoring: "Track operations >3 seconds",
    localization: "Vietnamese primary, English fallback"
  }

  ARCHITECTURE: {
    framework: "Next.js 15.3.0 App Router",
    design_system: "Feature-Sliced Design (FSD)",
    state_management: "TanStack Query (server) + Zustand (client)",
    styling: "Tailwind CSS with Vietnamese legal theme"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.1 - QueryProvider",
    relationship: "Included in provider composition",
    integration: "3rd in nesting order (after ErrorBoundary, OptimizationProvider)"
  },
  {
    pattern: "Pattern 9.2 - ThemeProvider",
    relationship: "Included in provider composition",
    integration: "4th in nesting order (before I18n, Auth)"
  },
  {
    pattern: "Pattern 9.3 - AuthProvider",
    relationship: "Included in provider composition",
    integration: "6th in nesting order (after Theme, I18n)"
  },
  {
    pattern: "All other providers (9.4-9.20)",
    relationship: "Orchestrated by ProviderComposition pattern",
    integration: "Each provider has specific position in nesting order"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [Next.js App Router](https://nextjs.org/docs/app), [React Context](https://react.dev/learn/passing-data-deeply-with-context)
- **Internal Docs**: `/docs/architecture/provider-composition.md`

---

**Total Patterns**: 1 (Provider Composition Pattern)
**Line Count**: ~597 lines
**Compliance**: ✅ ≤800 lines
**Date**: 2026-01-02
