# Page Performance Specialist
# Chuyên Gia Hiệu Suất Trang

**Role**: Next.js 15 performance optimization specialist for Vietnamese legal AI platform
**Focus**: Data fetching strategies, caching, revalidation, Core Web Vitals monitoring
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, web-vitals
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST PagePerformance {
  ROLE: "Next.js 15 performance optimization and monitoring specialist"

  RESPONSIBILITIES: [
    "Implement optimal data fetching strategies",
    "Configure caching and revalidation policies",
    "Monitor Core Web Vitals (LCP, CLS, FID)",
    "Optimize images with Next.js Image component",
    "Implement performance budgets and tracking"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "web-vitals", "next/image", "next/font"],
    patterns: ["ISR", "Tag-based Revalidation", "Parallel Fetching", "Performance Monitoring"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["Performance/Hiệu Suất", "Cache/Bộ Nhớ Đệm", "Vitals/Chỉ Số"]
  }
}
```

---

## Pattern 10.42: Data Fetching Strategies with Caching
## Pattern 10.42: Chiến Lược Lấy Dữ Liệu với Bộ Nhớ Đệm

### Overview

```pseudo
PATTERN DataFetchingStrategies {
  PURPOSE: "Optimize performance with strategic caching and revalidation for legal document platform"

  PROBLEM: "Need to balance between fresh data and performance with different caching strategies per data type"

  SOLUTION: "Five data fetching patterns: Always Fresh, ISR, Static + On-Demand Revalidation, Parallel Fetching, Tag-based Revalidation"

  USE_CASES: [
    "Real-time data (dashboards, live stats)",
    "Semi-static content (blog posts, product listings)",
    "Static content (legal documents, contracts)",
    "Parallel data fetching (dashboard pages)",
    "On-demand cache invalidation (content updates)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW DataFetching_AlwaysFresh {
  INPUT: {
    endpoint: string
  }

  PRECONDITIONS: [
    "API endpoint is fast (<100ms)",
    "Data changes frequently (real-time)"
  ]

  STEPS: {
    STEP_1_FETCH_LIVE_DATA: {
      description: "Always fetch fresh data without caching"
      logic: |
        ASYNC FUNCTION getLiveStats():
          response = AWAIT FETCH(
            API_URL + '/api/stats/live',
            {
              cache: 'no-store', // Never cache - always fresh
              credentials: 'include'
            }
          )

          IF NOT response.ok:
            THROW Error('Failed to fetch stats')

          RETURN AWAIT response.json()

        USE_CASE: "Dashboards, live feeds, user-specific data"
    }
  }

  OUTPUT: {
    strategy: "Always Fresh",
    cache: "no-store",
    use_cases: ["Dashboards", "Live feeds", "User-specific data"]
  }
}
```

### ISR Strategy

```pseudo
WORKFLOW DataFetching_ISR {
  INPUT: {
    endpoint: string
    revalidateSeconds: number
  }

  PRECONDITIONS: [
    "Content updates periodically",
    "Can tolerate slight staleness"
  ]

  STEPS: {
    STEP_1_FETCH_WITH_ISR: {
      description: "Incremental Static Regeneration with time-based revalidation"
      logic: |
        ASYNC FUNCTION getBlogPosts():
          response = AWAIT FETCH(
            API_URL + '/api/blog',
            {
              next: {
                revalidate: 3600, // Revalidate every 1 hour (3600 seconds)
                tags: ['blog']
              }
            }
          )

          IF NOT response.ok:
            THROW Error('Failed to fetch blog posts')

          RETURN AWAIT response.json()

        USE_CASE: "Blog posts, product listings, frequently accessed content"
    }
  }

  OUTPUT: {
    strategy: "ISR (Incremental Static Regeneration)",
    cache: "next.revalidate",
    revalidate_interval: "3600 seconds (1 hour)",
    use_cases: ["Blog posts", "Product listings", "News articles"]
  }
}
```

### Static + On-Demand Revalidation

```pseudo
WORKFLOW DataFetching_StaticOnDemand {
  INPUT: {
    endpoint: string
    tags: string[]
  }

  PRECONDITIONS: [
    "Content rarely changes",
    "Manual cache invalidation needed on updates"
  ]

  STEPS: {
    STEP_1_FETCH_STATIC_DATA: {
      description: "Static generation with tag-based on-demand revalidation"
      logic: |
        ASYNC FUNCTION getContractStaticData(id: string):
          response = AWAIT FETCH(
            API_URL + '/api/contracts/' + id,
            {
              next: {
                revalidate: 86400, // Revalidate every 24 hours
                tags: ['contracts', 'contract-' + id]
              }
            }
          )

          IF NOT response.ok:
            THROW Error('Failed to fetch contract')

          RETURN AWAIT response.json()

        USE_CASE: "Legal documents, contracts, static pages"
    }

    STEP_2_ON_DEMAND_REVALIDATION: {
      description: "Manually revalidate cache on content updates"
      logic: |
        ASYNC FUNCTION updateContract(id: string, data: any):
          // Update the contract in the database
          response = AWAIT FETCH(
            API_URL + '/api/contracts/' + id,
            {
              method: 'PUT',
              body: JSON.stringify(data)
            }
          )

          IF response.ok:
            // Invalidate cache for this specific contract
            revalidateTag('contract-' + id)
            // Also invalidate the contracts list
            revalidateTag('contracts')
            // Optionally revalidate entire path
            revalidatePath('/contracts/' + id)

          RETURN AWAIT response.json()
    }
  }

  OUTPUT: {
    strategy: "Static + On-Demand Revalidation",
    cache: "next.revalidate with tags",
    revalidate_interval: "86400 seconds (24 hours)",
    on_demand: "revalidateTag() on updates",
    use_cases: ["Legal documents", "Contracts", "Static pages"]
  }
}
```

### Parallel Data Fetching

```pseudo
WORKFLOW DataFetching_Parallel {
  INPUT: {
    endpoints: string[]
  }

  PRECONDITIONS: [
    "Multiple data sources needed",
    "Data sources are independent"
  ]

  STEPS: {
    STEP_1_PARALLEL_FETCH: {
      description: "Fetch multiple endpoints in parallel for better performance"
      logic: |
        ASYNC FUNCTION DashboardPage():
          // Fetch multiple endpoints in parallel
          [stats, activities, notifications] = AWAIT Promise.all([
            FETCH(API_URL + '/api/stats', {
              next: { revalidate: 60 }
            }).then(r => r.json()),

            FETCH(API_URL + '/api/activities', {
              next: { revalidate: 300 }
            }).then(r => r.json()),

            FETCH(API_URL + '/api/notifications', {
              next: { revalidate: 300 }
            }).then(r => r.json())
          ])

          RETURN (
            <div>
              <StatsWidget data={stats} />
              <ActivityFeed activities={activities} />
              <NotificationCenter notifications={notifications} />
            </div>
          )

        USE_CASE: "Pages requiring multiple data sources"
    }
  }

  OUTPUT: {
    strategy: "Parallel Data Fetching",
    pattern: "Promise.all()",
    benefit: "Faster page load by fetching in parallel",
    use_cases: ["Dashboard pages", "Multi-section pages"]
  }
}
```

### Tag-Based Revalidation

```pseudo
WORKFLOW DataFetching_TagRevalidation {
  INPUT: {
    tags: string[]
  }

  PRECONDITIONS: [
    "Server Actions are implemented",
    "Cache tags are defined"
  ]

  STEPS: {
    STEP_1_TAG_BASED_INVALIDATION: {
      description: "Use tags for granular cache control"
      logic: |
        // Define reusable tags
        TAGS = {
          contracts: 'contracts',
          contract: (id) => 'contract-' + id,
          users: 'users',
          user: (id) => 'user-' + id,
          blog: 'blog',
          blogPost: (id) => 'blog-' + id
        }

        // Revalidate specific contract
        revalidateTag(TAGS.contract('123'))

        // Revalidate all contracts
        revalidateTag(TAGS.contracts)

        // Revalidate path
        revalidatePath('/contracts')
        revalidatePath('/contracts/123')

        USE_CASE: "Manual cache invalidation on content updates"
    }
  }

  OUTPUT: {
    strategy: "Tag-Based Revalidation",
    functions: ["revalidateTag()", "revalidatePath()"],
    use_cases: ["Content updates", "Manual cache invalidation"]
  }
}
```

### Interface Signatures

```pseudo
FUNCTION_SIGNATURE getLiveStats {
  RETURNS: Promise<StatsData>
  CACHE: "no-store"
}

FUNCTION_SIGNATURE getBlogPosts {
  RETURNS: Promise<BlogPost[]>
  CACHE: "next.revalidate = 3600"
}

FUNCTION_SIGNATURE getContractStaticData {
  PARAMS: {
    id: string
  }
  RETURNS: Promise<ContractData>
  CACHE: "next.revalidate = 86400, tags = ['contracts', 'contract-{id}']"
}

FUNCTION_SIGNATURE updateContract {
  PARAMS: {
    id: string
    data: any
  }
  RETURNS: Promise<ContractData>
  SIDE_EFFECTS: ["revalidateTag('contract-{id}')", "revalidateTag('contracts')"]
}

FUNCTION_SIGNATURE revalidateTag {
  PARAMS: {
    tag: string
  }
  RETURNS: void
}

FUNCTION_SIGNATURE revalidatePath {
  PARAMS: {
    path: string
  }
  RETURNS: void
}
```

---

## Pattern 10.43: Core Web Vitals Monitoring
## Pattern 10.43: Giám Sát Core Web Vitals

### Overview

```pseudo
PATTERN CoreWebVitals {
  PURPOSE: "Monitor and optimize page performance metrics for legal document platform"

  PROBLEM: "Need to track LCP, CLS, FID, FCP, TTFB and optimize for performance budgets"

  SOLUTION: "Implement web-vitals library with client-side reporting, image optimization, font optimization, and performance monitoring"

  USE_CASES: [
    "Track Core Web Vitals (LCP, CLS, FID)",
    "Monitor performance metrics (FCP, TTFB)",
    "Report metrics to analytics service",
    "Optimize images with Next.js Image",
    "Optimize fonts with next/font"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CoreWebVitals_Monitoring {
  INPUT: {
    analyticsEndpoint: string
  }

  PRECONDITIONS: [
    "web-vitals library is installed",
    "Analytics endpoint is configured"
  ]

  STEPS: {
    STEP_1_ROOT_LAYOUT_SETUP: {
      description: "Configure root layout with performance optimizations"
      logic: |
        ASYNC FUNCTION RootLayout({ children }):
          RETURN (
            <html lang="vi">
              <head>
                // Meta tags for performance
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta httpEquiv="x-ua-compatible" content="IE=edge" />

                // Preconnect to external domains
                <link rel="preconnect" href="https://api.starx4crm.com" />
                <link rel="preconnect" href="https://cdn.starx4crm.com" />
                <link rel="dns-prefetch" href="https://analytics.google.com" />

                // Font optimization with font-display: swap
                <link rel="preload" as="font" href="/fonts/inter.woff2" type="font/woff2" />
                <link rel="preload" as="font" href="/fonts/outfit.woff2" type="font/woff2" />

                // Favicon and Apple Touch Icon
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
              </head>

              <body>
                {children}

                // Web Vitals Reporter Component
                <WebVitalsReporter />
              </body>
            </html>
          )
    }

    STEP_2_WEB_VITALS_REPORTER: {
      description: "Client component for web vitals monitoring"
      logic: |
        'use client'

        FUNCTION WebVitalsReporter():
          EFFECT ON_MOUNT:
            // Report Core Web Vitals to analytics
            getCLS(reportMetric)
            getFID(reportMetric)
            getFCP(reportMetric)
            getLCP(reportMetric)
            getTTFB(reportMetric)

          FUNCTION reportMetric(metric):
            // Send to analytics service
            body = JSON.stringify({
              name: metric.name,
              value: metric.value,
              id: metric.id,
              delta: metric.delta,
              entries: metric.entries
            })

            // Use sendBeacon for reliability
            IF navigator.sendBeacon:
              navigator.sendBeacon('/api/analytics/vitals', body)
            ELSE:
              FETCH('/api/analytics/vitals', { method: 'POST', body })

            // Log in development
            IF process.env.NODE_ENV === 'development':
              CONSOLE.log(metric.name + ':', metric.value)

          RETURN null
    }

    STEP_3_IMAGE_OPTIMIZATION: {
      description: "Optimize images with Next.js Image component"
      logic: |
        FUNCTION OptimizedImage({ src, alt, width, height, priority }):
          RETURN (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,..."
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )

        BENEFITS:
          - Automatic image optimization
          - Responsive images with srcSet
          - Lazy loading for below-the-fold images
          - Modern formats (WebP) with fallbacks
          - Blur placeholder for smooth loading
    }

    STEP_4_FONT_OPTIMIZATION: {
      description: "Optimize fonts with next/font/google"
      logic: |
        // Inter font for Vietnamese support
        inter = Inter({
          subsets: ['latin', 'vietnamese'],
          display: 'swap',
          variable: '--font-inter'
        })

        // Outfit font for headings
        outfit = Outfit({
          subsets: ['latin'],
          display: 'swap',
          variable: '--font-outfit'
        })

        BENEFITS:
          - Self-hosted fonts (no external requests)
          - font-display: swap (no FOIT)
          - Vietnamese character support
          - Optimized font loading
    }

    STEP_5_PERFORMANCE_BUDGETS: {
      description: "Define performance budgets and thresholds"
      logic: |
        PERFORMANCE_BUDGETS = {
          LCP: {
            good: 2500, // 2.5 seconds
            needs_improvement: 4000,
            poor: 4000+
          },
          FID: {
            good: 100, // 100 milliseconds
            needs_improvement: 300,
            poor: 300+
          },
          CLS: {
            good: 0.1,
            needs_improvement: 0.25,
            poor: 0.25+
          },
          FCP: {
            good: 1800, // 1.8 seconds
            needs_improvement: 3000,
            poor: 3000+
          },
          TTFB: {
            good: 800, // 800 milliseconds
            needs_improvement: 1800,
            poor: 1800+
          }
        }

        // Alert when metrics exceed budgets
        IF metric.value > PERFORMANCE_BUDGETS[metric.name].needs_improvement:
          SEND_ALERT("Performance degradation detected: " + metric.name)
    }
  }

  OUTPUT: {
    component: "WebVitalsReporter",
    type: "Client Component",
    features: [
      "Core Web Vitals tracking (LCP, CLS, FID)",
      "Performance metrics reporting (FCP, TTFB)",
      "Image optimization with Next.js Image",
      "Font optimization with next/font",
      "Performance budgets and alerting"
    ]
  }

  VALIDATION: [
    "LCP must be < 2.5 seconds",
    "FID must be < 100 milliseconds",
    "CLS must be < 0.1",
    "Images must use Next.js Image component",
    "Fonts must use next/font with display: swap"
  ]
}
```

### Performance Optimization Checklist

```pseudo
WORKFLOW PerformanceOptimization_Checklist {
  STEPS: {
    IMAGE_OPTIMIZATION: [
      "Use Next.js Image component with automatic optimization",
      "Implement responsive images with srcSet",
      "Use modern formats (WebP with fallbacks)",
      "Implement lazy loading for below-the-fold images",
      "Generate different sizes for different breakpoints"
    ]

    CODE_SPLITTING: [
      "Dynamic imports for heavy components",
      "Route-based code splitting (automatic with App Router)",
      "Component-level code splitting with next/dynamic",
      "Lazy load third-party scripts"
    ]

    CACHING_STRATEGY: [
      "Browser caching (Cache-Control headers)",
      "CDN caching for static assets",
      "Server-side caching with ISR",
      "API response caching with fetch options",
      "Tag-based revalidation for updates"
    ]

    DATABASE_QUERIES: [
      "Implement pagination for large datasets",
      "Use filtering and search efficiently",
      "Implement caching for frequently accessed data",
      "Use database indexes properly",
      "Monitor slow queries"
    ]

    NETWORK_OPTIMIZATION: [
      "Preconnect to external domains",
      "DNS prefetch for third-party resources",
      "Resource hints (preload, prefetch)",
      "HTTP/2 server push (if applicable)",
      "Minimize redirects"
    ]
  }

  VALIDATION: [
    "Run Lighthouse audit (score ≥90)",
    "Check Core Web Vitals in Chrome DevTools",
    "Monitor Real User Monitoring (RUM) data",
    "Test on slow 3G network",
    "Test on low-end devices"
  ]
}
```

### Interface Signatures

```pseudo
COMPONENT_SIGNATURE WebVitalsReporter {
  PROPS: {}
  RETURNS: null
  CLIENT_COMPONENT: true
}

INTERFACE Metric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  id: string
  delta: number
  entries: PerformanceEntry[]
}

FUNCTION_SIGNATURE reportMetric {
  PARAMS: {
    metric: Metric
  }
  RETURNS: void
}

COMPONENT_SIGNATURE OptimizedImage {
  PROPS: {
    src: string
    alt: string
    width: number
    height: number
    priority?: boolean
  }
  RETURNS: ReactElement
}

INTERFACE FontConfig {
  subsets: string[]
  display: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
  variable: string
  weight?: string | string[]
}
```

---

## Summary

This **Page Performance Specialist** provides comprehensive pseudo-code workflows for:

1. **Pattern 10.42 (Data Fetching Strategies)**: Five caching patterns - Always Fresh, ISR, Static + On-Demand, Parallel Fetching, Tag-based Revalidation
2. **Pattern 10.43 (Core Web Vitals)**: Performance monitoring with web-vitals, image optimization, font optimization, and performance budgets

**Key Features**:
- Strategic caching for different data types
- ISR with time-based and tag-based revalidation
- Parallel data fetching for better performance
- Core Web Vitals monitoring (LCP, CLS, FID, FCP, TTFB)
- Image optimization with Next.js Image
- Font optimization with next/font and Vietnamese support
- Performance budgets and alerting
- Real-time analytics reporting

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5, web-vitals, next/image, next/font
**Domain Context**: Vietnamese legal P2P insurance & lending platform
**Format**: Pseudo-code WORKFLOW format with interface signatures only

---

*Page Performance Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.42-10.43 Coverage*
