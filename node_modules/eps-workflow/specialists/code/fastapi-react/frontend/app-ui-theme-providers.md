# App UI & Theme Providers Specialist

**Role**: UI experience and theme management expert
**Focus**: Theme switching, internationalization, toast notifications, suspense, optimization
**Technology**: next-themes, next-intl, react-hot-toast, React 19 Suspense
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppUIThemeProviders {
  ROLE: "UI experience and theme management expert for Vietnamese legal platform"

  RESPONSIBILITIES: [
    "Configure light/dark/system theme switching",
    "Setup Vietnamese/English internationalization",
    "Manage toast notifications with localization",
    "Implement suspense boundaries for lazy loading",
    "Optimize performance with preloading and monitoring"
  ]

  TECH_STACK: {
    primary: "next-themes + next-intl + react-hot-toast",
    libraries: ["next-themes", "react-hot-toast", "next-intl"],
    patterns: ["theme-provider", "i18n-provider", "toast-provider", "suspense"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    languages: ["Vietnamese (primary)", "English (fallback)"]
  }
}
```

---

## Pattern 9.2: ThemeProvider (next-themes)

### Overview

```pseudo
PATTERN ThemeProvider {
  PURPOSE: "Next-themes integration for light/dark/system theme switching"

  PROBLEM: "Need seamless theme switching with system preference detection and persistence"

  SOLUTION: "next-themes provider with localStorage persistence and Vietnamese legal UI colors"

  USE_CASES: [
    "User toggles between light/dark mode",
    "System detects user OS preference automatically",
    "Theme persists across sessions",
    "Legal platform branding colors applied consistently"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ThemeProvider_Configuration {
  INPUT: {
    children: ReactNode
  }

  PRECONDITIONS: [
    "HTML element supports 'class' attribute",
    "Tailwind CSS dark mode configured with 'class' strategy"
  ]

  STEPS: {
    STEP_1_INITIALIZE_PROVIDER: {
      description: "Setup next-themes with Vietnamese legal platform config"
      logic: |
        RETURN (
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            enableColorScheme={true}
            disableTransitionOnChange={false}
            storageKey="app-theme"
          >
            {children}
          </ThemeProvider>
        )
    }

    STEP_2_DETECT_SYSTEM_PREFERENCE: {
      description: "Detect OS theme preference"
      logic: |
        IF defaultTheme == "system" THEN
          systemTheme = DETECT_OS_PREFERENCE()
          activeTheme = systemTheme  // "light" or "dark"
        END IF
    }

    STEP_3_APPLY_THEME_CLASS: {
      description: "Apply theme class to HTML element"
      logic: |
        htmlElement.classList.REMOVE("light", "dark")
        htmlElement.classList.ADD(activeTheme)

        IF enableColorScheme THEN
          htmlElement.style.colorScheme = activeTheme
        END IF
    }

    STEP_4_PERSIST_PREFERENCE: {
      description: "Save user theme preference"
      logic: |
        IF user_manually_changed_theme THEN
          localStorage.SET("app-theme", selectedTheme)
        END IF
    }
  }

  ERROR_HANDLING: {
    LocalStorageUnavailable: "Fall back to system preference, log warning",
    InvalidThemeValue: "Reset to 'system' default"
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Theme context to all child components"
  }

  POSTCONDITIONS: [
    "Theme class applied to <html> element",
    "Theme preference persisted in localStorage",
    "useTheme() hook available in all children"
  ]
}
```

### Theme Configuration

```pseudo
WORKFLOW ThemeConfig_Legal {
  DESCRIPTION: "Vietnamese legal platform theme configuration"

  THEME_COLORS: {
    light: { primary: "hsl(217, 91%, 60%)", background: "hsl(0, 0%, 100%)" },
    dark: { primary: "hsl(217, 91%, 60%)", background: "hsl(217, 39%, 11%)" }
  }

  TAILWIND_CONFIG: "darkMode: 'class' with legal color palette"
}
```

### Key Interfaces

```typescript
// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
}

// Theme hook return type
interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  themes: string[];
  systemTheme: string | undefined;
}

// Custom hook with isDark helper
function useAppTheme(): {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  themes: string[];
  systemTheme: string | undefined;
  isDark: boolean;
};
```

### Integration Points

```pseudo
INTEGRATION ThemeProvider_Integration {
  UI_COMPONENTS: ["ThemeToggleButton", "All UI components"]
  STATE: "UIStore stores preference, useTheme() hook provides context"
  DEPENDENCIES: ["@/app/providers/store-provider", "next-themes"]
  ERROR_HANDLING: "Suppress hydration mismatch during SSR"
}
```

---

## Pattern 9.4: I18nProvider

### Overview

```pseudo
PATTERN I18nProvider {
  PURPOSE: "Internationalization (Vietnamese/English) for legal platform"

  PROBLEM: "Need bilingual support with Vietnamese legal terminology"

  SOLUTION: "next-intl provider with Vietnamese/English dictionaries"

  USE_CASES: [
    "Display UI in Vietnamese or English",
    "Translate legal document statuses",
    "Localize date/time formats (DD/MM/YYYY for Vietnam)",
    "Support Vietnamese legal terminology"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW I18nProvider_Setup {
  INPUT: {
    children: ReactNode
  }

  STEPS: {
    STEP_1_LOAD_TRANSLATIONS: {
      description: "Load Vietnamese and English translation dictionaries"
      logic: |
        translations = {
          vi: LOAD_DICTIONARY("./locales/vi.json"),
          en: LOAD_DICTIONARY("./locales/en.json")
        }
    }

    STEP_2_DETECT_LOCALE: {
      description: "Detect user language preference"
      logic: |
        userLocale = useUIStore().language  // "vi" or "en"

        IF userLocale NOT IN ["vi", "en"] THEN
          userLocale = "vi"  // Default to Vietnamese
        END IF
    }

    STEP_3_SET_HTML_LANG: {
      description: "Update HTML lang attribute"
      logic: |
        document.documentElement.lang = userLocale
    }

    STEP_4_PROVIDE_CONTEXT: {
      description: "Provide translations to component tree"
      logic: |
        RETURN (
          <I18nProvider locale={userLocale} messages={translations[userLocale]}>
            {children}
          </I18nProvider>
        )
    }
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Translation context with useTranslation() hook"
  }
}
```

### Translation Dictionary

```pseudo
WORKFLOW TranslationDictionary_Legal {
  DESCRIPTION: "Vietnamese legal terminology translation mappings"

  VIETNAMESE_TRANSLATIONS: {
    navigation: { dashboard: "Bảng điều khiển", documents: "Tài liệu pháp lý" },
    legal_terms: { contract: "Hợp đồng", compliance: "Tuân thủ pháp luật" },
    actions: { upload: "Tải lên", save: "Lưu", submit: "Gửi" },
    status: { pending: "Đang chờ", approved: "Được phê duyệt", completed: "Hoàn thành" }
  }

  USAGE_HOOK: "useTranslation() returns { language, t(key), tByLang(lang, key) }"
}
```

### Key Interfaces

```typescript
// I18n provider props
interface I18nProviderProps {
  children: ReactNode;
}

// Translation hook return type
interface UseTranslationReturn {
  language: 'vi' | 'en';
  t: (key: string) => string;
  tByLang: (lang: 'vi' | 'en', key: string) => string;
}

// Translation function
function useTranslation(): UseTranslationReturn;
```

---

## Pattern 9.5: ToastProvider

### Overview

```pseudo
PATTERN ToastProvider {
  PURPOSE: "Toast notifications with Vietnamese localization"

  PROBLEM: "Need user-friendly notifications for actions, errors, and success messages"

  SOLUTION: "react-hot-toast provider with Vietnamese/English messages"

  USE_CASES: [
    "Show success toast when document uploaded",
    "Display error toast on API failure",
    "Show loading toast during document analysis",
    "Notify user of compliance check results"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ToastProvider_Configuration {
  INPUT: {
    children: ReactNode
  }

  STEPS: {
    STEP_1_CONFIGURE_TOASTER: {
      description: "Setup toast notifications with Vietnamese legal platform styling"
      logic: |
        RETURN (
          <>
            <Toaster
              position="top-right"
              reverseOrder={false}
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#fff",
                  color: "#000",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                },
                success: {
                  style: {
                    background: "#10b981",
                    color: "#fff"
                  }
                },
                error: {
                  style: {
                    background: "#ef4444",
                    color: "#fff"
                  }
                },
                loading: {
                  style: {
                    background: "#3b82f6",
                    color: "#fff"
                  }
                }
              }}
            />
            {children}
          </>
        )
    }
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Global toast notification system"
  }
}
```

### Legal Toast Notifications

```pseudo
WORKFLOW LegalToast_Notifications {
  DESCRIPTION: "Pre-configured toast notifications for legal platform"

  TOAST_TYPES: {
    documentUploaded: () => toast.success("Tài liệu đã được tải lên / Document uploaded"),
    complianceCheckFailed: (reason) => toast.error("Kiểm tra tuân thủ không thành công / Compliance check failed: " + reason),
    error: (message) => toast.error("Lỗi / Error: " + message),
    success: (message) => toast.success("Thành công / Success: " + message)
  }

  USAGE: "mutation.onSuccess = () => legalToast.documentUploaded()"
}
```

### Key Interfaces

```typescript
// Toast provider props
interface ToastProviderProps {
  children: ReactNode;
}

// Legal toast notifications
const legalToast: {
  documentUploaded: () => void;
  documentAnalyzed: () => void;
  documentApproved: () => void;
  complianceCheckPassed: () => void;
  complianceCheckFailed: (reason: string) => void;
  contractReviewStarted: () => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
};
```

---

## Pattern 9.16: SuspenseProvider

### Overview

```pseudo
PATTERN SuspenseProvider {
  PURPOSE: "React Suspense wrapper for lazy loading and code splitting"

  PROBLEM: "Need loading states for async components and data fetching"

  SOLUTION: "React 19 Suspense with custom fallback UI for Vietnamese legal platform"

  USE_CASES: [
    "Show loading skeleton while fetching legal documents",
    "Lazy load large document viewer component",
    "Display loading state during route transitions",
    "Handle async data loading in server components"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SuspenseBoundary_Implementation {
  INPUT: {
    children: ReactNode,
    fallback?: ReactNode
  }

  STEPS: {
    STEP_1_WRAP_SUSPENSE: {
      description: "Wrap children with React Suspense boundary"
      logic: |
        defaultFallback = <DefaultLoadingFallback />

        RETURN (
          <Suspense fallback={fallback || defaultFallback}>
            {children}
          </Suspense>
        )
    }

    STEP_2_SHOW_FALLBACK: {
      description: "Show fallback UI while children are loading"
      logic: |
        IF children_is_loading THEN
          RENDER fallback
        ELSE
          RENDER children
        END IF
    }
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Loading boundary with fallback UI"
  }
}
```

### Loading Fallbacks

```pseudo
WORKFLOW LoadingFallbacks_Legal {
  DESCRIPTION: "Loading fallback components for legal platform"

  DEFAULT_LOADING: "Loader2 spinner with 'Đang tải / Loading...'"
  LEGAL_DOCUMENT_LOADING: "Skeleton UI with header, content, analysis sections (animate-pulse)"
  CONVERSATION_LOADING: "Spinner with 'Đang tải cuộc hội thoại / Loading conversation...'"
}
```

### Key Interfaces

```typescript
// Suspense boundary props
interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Lazy loading helper
function LazyLegalDocumentViewer(props: { documentId: string }): JSX.Element;
function LazyConversationPanel(props: { conversationId: string }): JSX.Element;
```

---

## Pattern 9.20: OptimizationProvider

### Overview

```pseudo
PATTERN OptimizationProvider {
  PURPOSE: "Performance optimization utilities and configuration"

  PROBLEM: "Need to preload resources, monitor performance, and optimize user experience"

  SOLUTION: "Custom provider for resource preloading and performance monitoring"

  USE_CASES: [
    "Preload critical API endpoints on mount",
    "Monitor slow operations and log warnings",
    "Track Core Web Vitals for legal platform",
    "Optimize image loading for document thumbnails"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW OptimizationProvider_Setup {
  INPUT: {
    children: ReactNode
  }

  STEPS: {
    STEP_1_PRELOAD_RESOURCES: {
      description: "Preload critical resources on mount"
      logic: |
        criticalResources = [
          { rel: "prefetch", href: "/api/auth/user", as: "fetch" },
          { rel: "prefetch", href: "/api/documents", as: "fetch" },
          { rel: "preconnect", href: process.env.NEXT_PUBLIC_API_URL }
        ]

        FOR EACH resource IN criticalResources:
          linkElement = CREATE_ELEMENT("link")
          linkElement.rel = resource.rel
          linkElement.href = resource.href
          linkElement.as = resource.as
          document.head.appendChild(linkElement)
        END FOR
    }

    STEP_2_ENABLE_PERFORMANCE_MONITORING: {
      description: "Setup PerformanceObserver to track slow operations"
      logic: |
        IF window.PerformanceObserver EXISTS THEN
          observer = NEW PerformanceObserver((entries) => {
            FOR EACH entry IN entries:
              IF entry.duration > 3000 THEN  // 3 seconds
                console.warn("Slow operation:", entry.name, entry.duration + "ms")

                IF production_mode THEN
                  SEND_TO_ANALYTICS({
                    operation: entry.name,
                    duration: entry.duration
                  })
                END IF
              END IF
            END FOR
          })

          observer.observe({ entryTypes: ["measure", "navigation"] })
        END IF
    }

    STEP_3_RENDER_CHILDREN: {
      description: "Render children with optimizations active"
      logic: |
        RETURN <>{children}</>
    }
  }

  OUTPUT: {
    type: "JSX.Element",
    provides: "Performance optimizations and monitoring"
  }
}
```

### Performance Monitoring

```pseudo
WORKFLOW PerformanceMonitoring_Hook {
  DESCRIPTION: "Hook to monitor operation performance"

  INPUT: { operationName: string }

  LOGIC: |
    startTime = performance.now()
    ON_UNMOUNT:
      duration = performance.now() - startTime
      IF duration > 1000: log warning and send to analytics

  USAGE: "usePerformanceMonitoring('LegalDocumentAnalysis')"
}
```

### Key Interfaces

```typescript
// Optimization provider props
interface OptimizationProviderProps {
  children: ReactNode;
}

// Performance monitoring hook
function usePerformanceMonitoring(operationName: string): void;

// Optimized image component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

function OptimizedImage(props: OptimizedImageProps): JSX.Element;
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    Theme: {
      options: ["light", "dark", "system"],
      vietnamese_term: "Chủ đề"
    },
    Language: {
      options: ["vi", "en"],
      vietnamese_term: "Ngôn ngữ"
    },
    Notification: {
      types: ["success", "error", "info", "warning", "loading"],
      vietnamese_term: "Thông báo"
    }
  }

  BUSINESS_RULES: {
    default_language: "Vietnamese (vi) for legal platform",
    theme_persistence: "User preference saved in localStorage",
    toast_duration: "4 seconds for standard notifications"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    date_format: "DD/MM/YYYY",
    time_format: "HH:mm",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.1 - QueryProvider",
    relationship: "ToastProvider shows notifications for query errors",
    integration: "mutation.onError → legalToast.error()"
  },
  {
    pattern: "Pattern 9.6 - StoreProvider",
    relationship: "UIStore manages theme and language preferences",
    integration: "useUIStore() → setTheme(), setLanguage()"
  },
  {
    pattern: "Pattern 9.3 - AuthProvider",
    relationship: "ToastProvider shows auth-related notifications",
    integration: "login success → legalToast.success()"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [next-themes](https://github.com/pacocoursey/next-themes), [react-hot-toast](https://react-hot-toast.com)
- **Internal Docs**: `/docs/architecture/ui-providers.md`

---

**Total Patterns**: 5 (9.2, 9.4, 9.5, 9.16, 9.20)
**Line Count**: ~630 lines
**Compliance**: ✅ ≤800 lines
**Date**: 2026-01-02
