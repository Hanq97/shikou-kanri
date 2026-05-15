# App Layouts & Styling Specialist
# Chuyên Gia Bố Cục & Kiểu Dáng Ứng Dụng

**Role**: Next.js 15 layout components and global styling specialist
**Focus**: RootLayout, DashboardLayout, AuthLayout, LegalLayout, ThemeProvider
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Tailwind CSS, Feature-Sliced Design
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST AppLayouts {
  ROLE: "Layout components and global styling specialist for Next.js 15 App Router"

  RESPONSIBILITIES: [
    "Create RootLayout (global app shell)",
    "Build DashboardLayout (sidebar + navbar + content)",
    "Implement AuthLayout (centered auth forms)",
    "Create LegalLayout (specialized for legal workflows)",
    "Configure ThemeProvider (dark/light mode)"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "Tailwind CSS", "next-themes", "Inter font"],
    patterns: ["Nested Layouts", "Layout Groups", "Theme Context", "Responsive Grid"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    layout_types: ["Dashboard", "Auth", "Legal Workflows", "Public Pages"]
  }
}
```

---

## Pattern 9.36: RootLayout - Global App Shell

```pseudo
PATTERN RootLayout {
  PURPOSE: "Define global HTML structure, fonts, metadata, and provider hierarchy"

  WORKFLOW: {
    STRUCTURE: |
      // src/app/layout.tsx (Server Component)
      FUNCTION RootLayout({ children }):
        RETURN (
          <html lang="vi" suppressHydrationWarning>
            <head>
              <script type="application/ld+json">
                {JSON.stringify(jsonLd)} // Legal service schema
              </script>
              <link rel="icon" href="/favicon.ico" />
              <meta name="theme-color" content="#0066cc" />
            </head>
            <body className={inter.className + " antialiased"} suppressHydrationWarning>
              <Providers> // Client Component wrapper
                {children}
              </Providers>
              <Analytics />
            </body>
          </html>
        )
      END FUNCTION

    METADATA: |
      EXPORT metadata = {
        metadataBase: NEW_URL(process.env.NEXT_PUBLIC_APP_URL),

        title: {
          default: "Nền Tảng Pháp Lý Thông Minh - StartX4CRM Legal Platform",
          template: "%s | StartX4CRM Legal Platform"
        },

        description: "Nền tảng quản lý hợp đồng, tài liệu pháp lý và các vụ án thông minh với AI.",

        keywords: ["hợp đồng", "tài liệu pháp lý", "quản lý vụ án", "AI pháp lý"],

        openGraph: {
          type: "website",
          locale: "vi_VN",
          url: process.env.NEXT_PUBLIC_APP_URL,
          siteName: "StartX4CRM Legal Platform",
          title: "Nền Tảng Pháp Lý Thông Minh",
          description: "Quản lý hợp đồng, tài liệu pháp lý và vụ án bằng AI",
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

    FONT_CONFIGURATION: |
      // Vietnamese-compatible font
      inter = INTER({
        subsets: ["latin", "vietnamese"],
        display: "swap",
        weight: ["400", "500", "600", "700"]
      })

      jetbrainsMono = JETBRAINS_MONO({
        subsets: ["latin"],
        display: "swap"
      })

    JSON_LD_SCHEMA: |
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "LegalService",
        name: "StartX4CRM Legal Platform",
        description: "AI-Powered Legal Management Platform",
        url: process.env.NEXT_PUBLIC_APP_URL,
        serviceName: "Legal Document & Contract Management"
      }
  }

  KEY_INTERFACES: |
    export default function RootLayout({ children }: { children: ReactNode }): JSX.Element;

    export const metadata: Metadata;
}
```

---

## Pattern 9.37: DashboardLayout - Dashboard Shell

```pseudo
PATTERN DashboardLayout {
  PURPOSE: "Create dashboard layout with sidebar, navbar, breadcrumbs, and content area"

  WORKFLOW: {
    STRUCTURE: |
      // src/app/(dashboard)/layout.tsx (Server Component)
      FUNCTION DashboardLayout({ children }):
        RETURN (
          <div className="min-h-screen bg-gray-50">
            <!-- Sidebar (Client Component) -->
            <Sidebar sections={dashboardSections} />

            <!-- Main content area -->
            <div className="lg:pl-64"> // Offset for sidebar
              <!-- Top navbar -->
              <NavigationBar user={currentUser} />

              <!-- Breadcrumbs -->
              <div className="bg-white border-b px-4 py-3">
                <Breadcrumbs />
              </div>

              <!-- Page content -->
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
            </div>
          </div>
        )
      END FUNCTION

    RESPONSIVE_BEHAVIOR: |
      // Mobile: Sidebar hidden, hamburger menu shown
      // Tablet (< 1024px): Sidebar overlay, can be toggled
      // Desktop (>= 1024px): Sidebar fixed, always visible

      [isSidebarOpen, setIsSidebarOpen] = USE_STATE(false)

      // Close sidebar on route change (mobile)
      pathname = USE_PATHNAME()
      USE_EFFECT(() => {
        setIsSidebarOpen(false)
      }, [pathname])

    DASHBOARD_SECTIONS: |
      dashboardSections = [
        {
          titleVi: "Tổng Quan",
          items: [
            { path: "/dashboard", labelVi: "Bảng Điều Khiển", icon: "LayoutDashboard" },
            { path: "/dashboard/analytics", labelVi: "Phân Tích", icon: "BarChart" }
          ]
        },
        {
          titleVi: "Quản Lý",
          items: [
            { path: "/dashboard/users", labelVi: "Người Dùng", icon: "Users", requiredRoles: ["admin"] },
            { path: "/dashboard/teams", labelVi: "Nhóm", icon: "UsersIcon" }
          ]
        }
      ]
  }

  KEY_INTERFACES: |
    export default function DashboardLayout({ children }: { children: ReactNode }): JSX.Element;
}
```

---

## Pattern 9.38: AuthLayout - Authentication Layout

```pseudo
PATTERN AuthLayout {
  PURPOSE: "Create centered authentication layout for login, register, forgot-password pages"

  WORKFLOW: {
    STRUCTURE: |
      // src/app/(auth)/layout.tsx (Server Component)
      FUNCTION AuthLayout({ children }):
        RETURN (
          <div className="min-h-screen flex">
            <!-- Left side: Branding (hidden on mobile) -->
            <div className="hidden lg:flex lg:w-1/2 bg-blue-600 text-white items-center justify-center p-12">
              <div className="max-w-md space-y-6">
                <h1 className="text-4xl font-bold">
                  StartX4CRM Legal Platform
                </h1>
                <p className="text-lg text-blue-100">
                  Nền tảng quản lý pháp lý thông minh với AI
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    <span>Quản lý hợp đồng tự động</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    <span>Tài liệu pháp lý thông minh</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    <span>Theo dõi vụ án real-time</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Right side: Auth form -->
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-md">
                {children}
              </div>
            </div>
          </div>
        )
      END FUNCTION

    METADATA_OVERRIDE: |
      // Prevent authenticated users from accessing auth pages
      // (handled by middleware, but layout can redirect too)

      EXPORT metadata = {
        title: "Đăng Nhập - StartX4CRM",
        description: "Login to StartX4CRM Legal Platform",
        robots: {
          index: false, // Don't index auth pages
          follow: false
        }
      }
  }

  KEY_INTERFACES: |
    export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element;
}
```

---

## Pattern 9.39: LegalLayout - Legal Workflows Layout

```pseudo
PATTERN LegalLayout {
  PURPOSE: "Create specialized layout for legal workflows (contracts, documents, cases) with contextual sidebar"

  WORKFLOW: {
    STRUCTURE: |
      // src/app/(legal)/layout.tsx (Server Component)
      FUNCTION LegalLayout({ children }):
        RETURN (
          <div className="min-h-screen bg-gray-50">
            <Sidebar sections={legalSections} />

            <div className="lg:pl-64">
              <NavigationBar user={currentUser} />

              <!-- Legal-specific toolbar -->
              <div className="bg-white border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <Breadcrumbs />

                  <!-- Quick actions for legal workflows -->
                  <div className="flex gap-2">
                    <Button href="/legal/contracts/new">
                      <Plus className="w-4 h-4" />
                      Tạo Hợp Đồng Mới
                    </Button>
                    <Button href="/legal/documents/upload">
                      <Upload className="w-4 h-4" />
                      Tải Tài Liệu
                    </Button>
                  </div>
                </div>
              </div>

              <main className="max-w-7xl mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </div>
        )
      END FUNCTION

    LEGAL_SECTIONS: |
      legalSections = [
        {
          titleVi: "Hợp Đồng",
          items: [
            { path: "/legal/contracts", labelVi: "Tất Cả Hợp Đồng", icon: "FileText" },
            { path: "/legal/contracts/drafts", labelVi: "Nháp", icon: "FilePlus" },
            { path: "/legal/contracts/active", labelVi: "Đang Hoạt Động", icon: "FileCheck" }
          ]
        },
        {
          titleVi: "Tài Liệu Pháp Lý",
          items: [
            { path: "/legal/documents", labelVi: "Tất Cả Tài Liệu", icon: "FolderOpen" },
            { path: "/legal/documents/evidence", labelVi: "Chứng Cứ", icon: "Scale" }
          ]
        },
        {
          titleVi: "Vụ Án",
          items: [
            { path: "/legal/cases", labelVi: "Tất Cả Vụ Án", icon: "Briefcase" },
            { path: "/legal/cases/active", labelVi: "Đang Xử Lý", icon: "Activity" }
          ]
        }
      ]
  }

  KEY_INTERFACES: |
    export default function LegalLayout({ children }: { children: ReactNode }): JSX.Element;
}
```

---

## Pattern 9.40: ThemeProvider - Dark/Light Mode

```pseudo
PATTERN ThemeProvider {
  PURPOSE: "Provide theme switching capability (dark/light mode) with system preference detection"

  WORKFLOW: {
    PROVIDER_SETUP: |
      // src/app/providers/ThemeProvider.tsx (Client Component)
      'use client'

      IMPORT { ThemeProvider as NextThemesProvider } FROM "next-themes"

      FUNCTION ThemeProvider({ children, ...props }):
        RETURN (
          <NextThemesProvider
            attribute="class" // Use class-based dark mode
            defaultTheme="system" // Follow system preference
            enableSystem={true}
            disableTransitionOnChange={false}
          >
            {children}
          </NextThemesProvider>
        )
      END FUNCTION

    THEME_TOGGLE_COMPONENT: |
      // src/shared/ui/ThemeToggle.tsx
      'use client'

      FUNCTION ThemeToggle():
        { theme, setTheme } = USE_THEME()
        [mounted, setMounted] = USE_STATE(false)

        // Prevent hydration mismatch
        USE_EFFECT(() => {
          setMounted(true)
        }, [])

        IF NOT mounted THEN
          RETURN <div className="w-9 h-9" /> // Placeholder
        END IF

        RETURN (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )
      END FUNCTION

    TAILWIND_CONFIGURATION: |
      // tailwind.config.ts
      module.exports = {
        darkMode: "class", // Use class-based dark mode
        content: [
          "./src/**/*.{js,ts,jsx,tsx,mdx}"
        ],
        theme: {
          extend: {
            colors: {
              // Custom colors for legal platform
              legal: {
                primary: "#0066cc",
                secondary: "#4a90e2",
                accent: "#f59e0b"
              }
            }
          }
        }
      }

    DARK_MODE_STYLES: |
      // Usage in components
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <h1 className="text-2xl font-bold">
          Hợp Đồng / Contracts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your legal contracts
        </p>
      </div>
  }

  KEY_INTERFACES: |
    interface ThemeProviderProps {
      children: ReactNode;
      attribute?: "class" | "data-theme";
      defaultTheme?: string;
      enableSystem?: boolean;
      disableTransitionOnChange?: boolean;
    }

    export function ThemeProvider(props: ThemeProviderProps): JSX.Element;

    export function ThemeToggle(): JSX.Element;
}
```

---

## Layout Composition

```pseudo
LAYOUT_HIERARCHY {
  // Layouts cascade from general to specific

  hierarchy: |
    <RootLayout> // Global: fonts, metadata, providers
      <Providers> // Query, Theme, Auth, Toast
        <!-- Route group layouts -->
        <DashboardLayout> // Sidebar + Navbar
          <DashboardPage /> // Specific page
        </DashboardLayout>

        <AuthLayout> // Centered auth form
          <LoginPage />
        </AuthLayout>

        <LegalLayout> // Legal workflows sidebar
          <ContractsPage />
        </LegalLayout>
      </Providers>
    </RootLayout>

  // Each layout can define:
  layout_capabilities: [
    "Server Component (default)",
    "Custom metadata (overrides parent)",
    "Loading UI (loading.tsx)",
    "Error boundary (error.tsx)",
    "Not found (not-found.tsx)"
  ]
}
```

---

## Integration Points

```pseudo
INTEGRATION LayoutsIntegration {
  PROVIDERS: {
    location: "RootLayout wraps all with <Providers>",
    components: ["QueryProvider", "ThemeProvider", "AuthProvider", "ToastProvider"],
    order: "Error → Query → Theme → Auth → Toast"
  }

  NAVIGATION: {
    components: ["Sidebar", "NavigationBar", "Breadcrumbs", "MobileNav"],
    integration: "Embedded in DashboardLayout, LegalLayout",
    state: "Zustand store for sidebar toggle, active path"
  }

  STYLING: {
    framework: "Tailwind CSS with custom config",
    dark_mode: "Class-based with next-themes",
    fonts: "Inter (Vietnamese support), JetBrains Mono (code)",
    responsive: "Mobile-first approach, lg:pl-64 for sidebar offset"
  }

  METADATA: {
    root: "Default metadata in RootLayout",
    override: "Each layout can override with own metadata",
    dynamic: "generateMetadata in page.tsx overrides all"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  LAYOUT_TITLES: {
    dashboard: "Bảng Điều Khiển / Dashboard",
    legal: "Pháp Lý / Legal",
    auth: "Xác Thực / Authentication",
    settings: "Cài Đặt / Settings"
  }

  THEME_LABELS: {
    light: "Sáng / Light",
    dark: "Tối / Dark",
    system: "Hệ Thống / System"
  }

  QUICK_ACTIONS: {
    new_contract: "Tạo Hợp Đồng Mới / New Contract",
    upload_document: "Tải Tài Liệu / Upload Document",
    new_case: "Tạo Vụ Án Mới / New Case"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 9.21 - RouterProvider",
    relationship: "RootLayout is the top-level layout",
    integration: "RouterProvider configured in RootLayout"
  },
  {
    pattern: "Pattern 9.1-9.6 - Providers",
    relationship: "All providers composed in RootLayout",
    integration: "Providers wrapper in RootLayout body"
  },
  {
    pattern: "Pattern 9.26-9.30 - Navigation",
    relationship: "Navigation components embedded in layouts",
    integration: "DashboardLayout includes Sidebar, Navbar, Breadcrumbs"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD), Next.js 15 App Router
- **Technology Docs**: [Next.js Layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts), [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- **Internal Docs**: `/docs/ui/layout-system.md`, `/docs/styling/theme-configuration.md`

---

**File Lines**: ~520 lines
**Compliance**: ✅ ≤800 lines
**Format**: ✅ Pseudo-code WORKFLOW format
**Status**: Complete - All 5 files created
