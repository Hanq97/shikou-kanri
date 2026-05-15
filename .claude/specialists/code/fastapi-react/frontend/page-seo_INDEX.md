# Page SEO Files Index
# Chỉ Mục Tệp SEO Trang

**Created**: 2026-01-02
**Source**: page-seo-specialist.md (1,952 lines) → 4 files (2,969 lines)
**Compliance**: 100% (all files ≤ 900 lines)
**Format**: Pseudo-code WORKFLOW format
**Domain**: Vietnamese legal P2P insurance & lending platform

---

## File Structure

### File 1: page-auth.md (897 lines)
**Patterns**: 10.26, 10.31-10.33
**Focus**: Authentication pages and user settings

```pseudo
CONTENTS = {
  specialist_identity: "Next.js 15 authentication page implementation specialist",
  patterns: [
    {
      id: "10.26",
      name: "Settings Page",
      description: "User account settings with categorized forms",
      lines: "~250",
      features: [
        "Profile settings form",
        "Notification preferences",
        "Security settings (password, 2FA)",
        "Danger zone (account deletion)",
        "Parallel data fetching with Promise.all()",
        "Suspense boundaries for progressive loading"
      ]
    },
    {
      id: "10.31",
      name: "Login Page",
      description: "User authentication and sign-in workflow",
      lines: "~220",
      features: [
        "Email/password authentication",
        "Social auth integration (Google, GitHub)",
        "Pre-authentication check with redirect",
        "Error handling with user-friendly messages",
        "Callback URL support",
        "JSON-LD schema for SEO"
      ]
    },
    {
      id: "10.32",
      name: "Register Page",
      description: "New user account registration and onboarding",
      lines: "~200",
      features: [
        "Registration form with step indicators",
        "Email pre-filling from query params",
        "Terms and privacy policy acceptance",
        "Email verification workflow",
        "Account existence validation",
        "JSON-LD schema for SEO"
      ]
    },
    {
      id: "10.33",
      name: "Forgot Password Page",
      description: "Password reset request and email verification",
      lines: "~130",
      features: [
        "Two-step password reset workflow",
        "Email submission and confirmation",
        "Security-focused token-based reset",
        "Account enumeration prevention",
        "JSON-LD schema for SEO"
      ]
    }
  ],
  technology_stack: {
    framework: "Next.js 15.3.0",
    runtime: "React 19",
    language: "TypeScript 5",
    apis: ["Metadata API", "Server Components", "Server Actions"]
  }
}
```

### File 2: page-error-states.md (501 lines)
**Patterns**: 10.36-10.38
**Focus**: Error handling and loading states

```pseudo
CONTENTS = {
  specialist_identity: "Next.js 15 error handling and loading state specialist",
  patterns: [
    {
      id: "10.36",
      name: "404 Not Found Page",
      description: "User-friendly page for missing resources",
      lines: "~140",
      features: [
        "Error code and description",
        "Visual illustration",
        "Action buttons (Go Home, Get Help)",
        "Quick links to common pages",
        "JSON-LD schema",
        "noindex robots directive"
      ]
    },
    {
      id: "10.37",
      name: "Error Page (Global Error Boundary)",
      description: "Server error handling with recovery options",
      lines: "~180",
      features: [
        "Client Component with error reporting",
        "Recovery mechanism with reset function",
        "Environment-specific error details",
        "Error digest for tracking",
        "Support links and system status",
        "Visual error illustration"
      ]
    },
    {
      id: "10.38",
      name: "Loading Page (Suspense UI)",
      description: "Progressive loading states with skeleton UI",
      lines: "~80",
      features: [
        "Skeleton placeholders matching final layout",
        "Animate-pulse for smooth loading effect",
        "Responsive grid layouts",
        "Prevents cumulative layout shift",
        "Improves perceived performance"
      ]
    }
  ],
  technology_stack: {
    framework: "Next.js 15.3.0",
    runtime: "React 19",
    language: "TypeScript 5",
    patterns: ["Error Boundaries", "Suspense", "Skeleton UI"]
  }
}
```

### File 3: page-seo-metadata.md (847 lines)
**Patterns**: 10.39-10.41
**Focus**: SEO optimization and structured data

```pseudo
CONTENTS = {
  specialist_identity: "Next.js 15 SEO optimization and metadata specialist",
  patterns: [
    {
      id: "10.39",
      name: "Dynamic Metadata Generation",
      description: "Generate metadata from Vietnamese legal documents",
      lines: "~380",
      features: [
        "Async generateMetadata function",
        "Bilingual Vietnamese/English support",
        "OpenGraph and Twitter Card metadata",
        "Canonical URLs and alternate languages",
        "JSON-LD structured data (Document + Breadcrumb)",
        "Static generation for popular contracts (generateStaticParams)"
      ]
    },
    {
      id: "10.40",
      name: "Sitemap and SEO Configuration",
      description: "Dynamic sitemap and robots.txt generation",
      lines: "~230",
      features: [
        "XML sitemap with 50,000 URL limit",
        "Priority and change frequency per route",
        "24-hour cache revalidation",
        "robots.txt with crawler directives",
        "AI crawler blocking (GPTBot, ChatGPT-User)",
        "Parallel data fetching for contracts and users"
      ]
    },
    {
      id: "10.41",
      name: "JSON-LD Schema Implementation",
      description: "Structured data for search engines",
      lines: "~190",
      features: [
        "Organization schema for company branding",
        "WebSite schema with search action",
        "BreadcrumbList for navigation hierarchy",
        "Document schema for legal contracts",
        "LocalBusiness schema for Vietnamese legal services",
        "Voice search optimization"
      ]
    }
  ],
  technology_stack: {
    framework: "Next.js 15.3.0",
    runtime: "React 19",
    language: "TypeScript 5",
    apis: ["Metadata API", "MetadataRoute.Sitemap", "MetadataRoute.Robots"]
  }
}
```

### File 4: page-performance.md (724 lines)
**Patterns**: 10.42-10.43
**Focus**: Performance optimization and monitoring

```pseudo
CONTENTS = {
  specialist_identity: "Next.js 15 performance optimization and monitoring specialist",
  patterns: [
    {
      id: "10.42",
      name: "Data Fetching Strategies with Caching",
      description: "Five caching patterns for optimal performance",
      lines: "~430",
      strategies: [
        {
          name: "Always Fresh",
          cache: "no-store",
          use_cases: ["Dashboards", "Live feeds", "User-specific data"]
        },
        {
          name: "ISR (Incremental Static Regeneration)",
          cache: "next.revalidate = 3600",
          use_cases: ["Blog posts", "Product listings", "News articles"]
        },
        {
          name: "Static + On-Demand Revalidation",
          cache: "next.revalidate = 86400, tags",
          use_cases: ["Legal documents", "Contracts", "Static pages"]
        },
        {
          name: "Parallel Data Fetching",
          pattern: "Promise.all()",
          use_cases: ["Dashboard pages", "Multi-section pages"]
        },
        {
          name: "Tag-Based Revalidation",
          functions: ["revalidateTag()", "revalidatePath()"],
          use_cases: ["Content updates", "Manual cache invalidation"]
        }
      ]
    },
    {
      id: "10.43",
      name: "Core Web Vitals Monitoring",
      description: "Performance tracking and optimization",
      lines: "~290",
      features: [
        "web-vitals library integration",
        "Core Web Vitals tracking (LCP, CLS, FID)",
        "Performance metrics (FCP, TTFB)",
        "Image optimization with Next.js Image",
        "Font optimization with next/font (Vietnamese support)",
        "Performance budgets and alerting",
        "Real-time analytics reporting"
      ]
    }
  ],
  technology_stack: {
    framework: "Next.js 15.3.0",
    runtime: "React 19",
    language: "TypeScript 5",
    libraries: ["web-vitals", "next/image", "next/font"]
  }
}
```

---

## Usage Guide

### Import Patterns

```typescript
// Authentication Pages
import { Pattern_10_26_SettingsPage } from './page-auth.md'
import { Pattern_10_31_LoginPage } from './page-auth.md'
import { Pattern_10_32_RegisterPage } from './page-auth.md'
import { Pattern_10_33_ForgotPasswordPage } from './page-auth.md'

// Error States
import { Pattern_10_36_NotFoundPage } from './page-error-states.md'
import { Pattern_10_37_ErrorPage } from './page-error-states.md'
import { Pattern_10_38_LoadingPage } from './page-error-states.md'

// SEO & Metadata
import { Pattern_10_39_DynamicMetadata } from './page-seo-metadata.md'
import { Pattern_10_40_SitemapConfig } from './page-seo-metadata.md'
import { Pattern_10_41_JSONLDSchema } from './page-seo-metadata.md'

// Performance
import { Pattern_10_42_DataFetchingStrategies } from './page-performance.md'
import { Pattern_10_43_CoreWebVitals } from './page-performance.md'
```

### Vietnamese Legal Domain Context

All patterns support Vietnamese legal P2P insurance & lending platform with:

- **Bilingual Metadata**: Vietnamese (primary) + English (secondary)
- **Legal Entities**: Contract/Hợp Đồng, Document/Tài Liệu, Case/Vụ Án
- **Localization**: vi_VN locale with Vietnamese font support
- **Structured Data**: Legal document schemas with Vietnamese content

### Compliance Validation

```pseudo
VALIDATION_RESULTS = {
  file_1_page_auth: {
    lines: 897,
    limit: 900,
    compliance: "✅ PASS (99.7% of limit)",
    format: "Pseudo-code WORKFLOW",
    patterns: 4
  },
  file_2_page_error_states: {
    lines: 501,
    limit: 900,
    compliance: "✅ PASS (55.7% of limit)",
    format: "Pseudo-code WORKFLOW",
    patterns: 3
  },
  file_3_page_seo_metadata: {
    lines: 847,
    limit: 900,
    compliance: "✅ PASS (94.1% of limit)",
    format: "Pseudo-code WORKFLOW",
    patterns: 3
  },
  file_4_page_performance: {
    lines: 724,
    limit: 900,
    compliance: "✅ PASS (80.4% of limit)",
    format: "Pseudo-code WORKFLOW",
    patterns: 2
  },
  overall: {
    total_lines: 2969,
    original_lines: 1952,
    delta: "+1017 lines (documentation expansion)",
    compliance_rate: "100% (4/4 files ≤ 900 lines)",
    format_compliance: "100% (all pseudo-code WORKFLOW)"
  }
}
```

---

## Migration Notes

### Original File
- **File**: page-seo-specialist.md
- **Lines**: 1,952
- **Violation**: 2.44x over limit (1952 / 800)
- **Status**: ⚠️ NON-COMPLIANT

### Split Files
- **File 1**: page-auth.md (897 lines) - ✅ COMPLIANT
- **File 2**: page-error-states.md (501 lines) - ✅ COMPLIANT
- **File 3**: page-seo-metadata.md (847 lines) - ✅ COMPLIANT
- **File 4**: page-performance.md (724 lines) - ✅ COMPLIANT

### Improvement
- **Before**: 1 file, 1,952 lines, 0% compliance
- **After**: 4 files, 2,969 lines, 100% compliance
- **Delta**: +1,017 lines (expanded documentation with pseudo-code)
- **Format**: 100% pseudo-code WORKFLOW format (no implementation)

---

## Related Files

### GROUP_2 (App/Page Files)
1. ✅ **app-router** → 5 files (app-router-config, guards, loaders, navigation, layouts)
2. ✅ **app-providers** → 4 files (query-state, ui-theme, auth, composition)
3. ✅ **page-components** → 3 files (public, dashboard-crud, conversation-settings)
4. ✅ **page-seo** → 4 files (auth, error-states, seo-metadata, performance)

**Total**: 4 originals → 16 files (100% compliant)

---

## Summary

This index provides comprehensive navigation for the **Page SEO & Authentication** file group, which covers:

1. **Authentication Pages** (4 patterns): Login, Register, Forgot Password, Settings
2. **Error Handling** (3 patterns): 404 Not Found, Error Boundary, Loading UI
3. **SEO Optimization** (3 patterns): Dynamic Metadata, Sitemap, JSON-LD Schema
4. **Performance** (2 patterns): Data Fetching Strategies, Core Web Vitals

**Total Patterns**: 12 comprehensive patterns
**Total Lines**: 2,969 lines (from 1,952 original)
**Compliance**: 100% (all files ≤ 900 lines)
**Format**: Pseudo-code WORKFLOW with interface signatures only

---

*Page SEO Files Index v1.0*
*Created: 2026-01-02*
*GROUP_2 File 4 Complete*
