# Next.js File Conventions Specialist — Generic
# Next.jsファイル規約スペシャリスト — 汎用
# Chuyên Gia Quy Ước File Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 91.1–91.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
App Router file conventions, route segments, parallel/intercepting routes, Suspense requirements, route handlers, and middleware for Next.js.

## Patterns

### Pattern 91.1: Core File Conventions
```
app/
├── page.tsx          → Route UI (required for URL to be accessible)
├── layout.tsx        → Shared UI wrapper (persists across navigations, no re-render)
├── loading.tsx       → Instant loading UI (Suspense fallback)
├── error.tsx         → Error boundary (CLIENT component, receives error+reset)
├── not-found.tsx     → 404 UI (triggered by notFound())
├── template.tsx      → Like layout but RE-MOUNTS on navigation
├── default.tsx       → Fallback for parallel routes on hard navigation
└── global-error.tsx  → Root error boundary (MUST include <html><body>)
```

### Pattern 91.2: Route Segments
```
[slug]        → Dynamic segment       /blog/[slug]
[...slug]     → Catch-all            /docs/[...slug] matches /docs/a/b/c
[[...slug]]   → Optional catch-all   matches /docs AND /docs/a/b
(group)       → Route group          NO URL segment, organize without affecting path
@slot         → Parallel route slot   Named slot for parallel rendering
_private      → Private folder        Excluded from routing entirely
```

### Pattern 91.3: Parallel & Intercepting Routes
```
Parallel routes:
  @slot/page.tsx    → Named slots rendered in parallel
  @slot/default.tsx → REQUIRED (prevents 404 on hard navigation)
  layout.tsx receives slots as props: { children, modal, sidebar }

Intercepting routes:
  (.)folder    → Same level
  (..)folder   → One level up
  (...)folder  → From app root
  Pattern: List page → click → intercepted modal → direct URL → full page
  Close modal: router.back() (NOT router.push)
```

### Pattern 91.4: Suspense Requirements
```
useSearchParams() → ALWAYS wrap in Suspense (or entire page becomes CSR)
usePathname()     → Wrap in Suspense for dynamic routes
useParams()       → No Suspense needed
useRouter()       → No Suspense needed

Pattern:
  // SearchContent.tsx — 'use client'
  function SearchContent() { const params = useSearchParams(); ... }
  // page.tsx
  <Suspense fallback={<Loading />}><SearchContent /></Suspense>
```

### Pattern 91.5: Route Handlers
```
// app/api/webhook/route.ts
export async function POST(request: Request) { ... }
export async function GET(request: Request) { ... }

Rules:
- route.ts + page.tsx CANNOT coexist in same directory
- Server-only (no 'use client')
- Dynamic params: { params: Promise<{ id: string }> }
- Prefer Server Actions for UI mutations
- Use Route Handlers for: webhooks, external API callbacks, streaming
```

### Pattern 91.6: Middleware
```
// Next.js 14-15: middleware.ts (project root)
// Next.js 16+: proxy.ts replaces middleware.ts

Use for: auth redirects, locale detection, A/B testing, header injection
Do NOT use for: heavy computation, database access, complex business logic
```

## Common Mistakes
- Missing default.tsx in parallel route slots (causes 404 on hard nav)
- Colocating route.ts and page.tsx in the same folder
- Using router.push() to close intercepted modals (use router.back())
- Forgetting Suspense around useSearchParams()
- Making error.tsx a Server Component (must be Client)

## Related Specialists
- 90.x nextjs-rsc-patterns — Server/Client component boundaries
- 99.x nextjs-error-handling — Error boundary architecture patterns
- 52.x multitenant-routing — Project-specific routing (variant overlay)
