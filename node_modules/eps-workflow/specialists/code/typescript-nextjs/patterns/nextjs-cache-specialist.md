# Next.js Cache Specialist — Generic
# Next.jsキャッシュスペシャリスト — 汎用
# Chuyên Gia Cache Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure + Application |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 97.1–97.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
Next.js Cache Components: 'use cache' directive, cacheLife profiles, cacheTag invalidation, PPR (Partial Prerendering), and migration from unstable_cache. Source: Vercel next-cache-components.

## Patterns

### Pattern 97.1: Configuration
```js
// next.config.js
module.exports = { cacheComponents: true }
// Replaces experimental.ppr from earlier versions
```

### Pattern 97.2: Content Categories
```
Static    → No directive. Built at build time. Fully cacheable
Cached    → 'use cache'. Built on demand, cached with lifetime control
Dynamic   → Inside <Suspense>. Per-request. cookies(), headers(), searchParams
```

### Pattern 97.3: 'use cache' Directive
```tsx
// File level: entire file cached
'use cache'
export default async function CachedPage() { ... }

// Component level
async function ProductList() {
  'use cache'
  const products = await db.query('SELECT * FROM products')
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// Function level
async function getUser(id: string) {
  'use cache'
  return await db.user.findUnique({ where: { id } })
}
// Cache key auto-generated from function args (no manual key needed)
```

### Pattern 97.4: cacheLife() Profiles
```tsx
import { cacheLife } from 'next/cache'
async function Dashboard() {
  'use cache'
  cacheLife('hours')  // Built-in profiles:
  // default: 5min stale, 15min revalidate
  // minutes: 5min stale, 5min revalidate
  // hours: 5min stale, 1hr revalidate
  // days: 5min stale, 1day revalidate
  // weeks: 5min stale, 1week revalidate
  // max: long-term immutable cache
}
```

### Pattern 97.5: Cache Invalidation
```tsx
import { cacheTag, revalidateTag } from 'next/cache'
// Tag cached content
async function ProductCard({ id }: { id: string }) {
  'use cache'
  cacheTag(`product-${id}`, 'products')
  // ...
}
// Invalidate: revalidateTag('products')      → background SWR refresh
// Immediate: updateTag(`product-${id}`)       → immediate purge
// Path-based: revalidatePath('/products')     → revalidate all matching routes
```

### Pattern 97.6: Constraints
```
CANNOT use inside 'use cache':
❌ cookies(), headers(), searchParams (runtime-dependent)
❌ Date.now() or Math.random() (non-deterministic)

Pattern: Extract outside, pass as args → become part of cache key
async function getGreeting(locale: string) {
  'use cache'
  // locale passed as arg = part of cache key
  return translate('hello', locale)
}
// Call site: getGreeting(cookies().get('locale')?.value ?? 'en')

Private cache: 'use cache: private' allows per-user caching
```

### Pattern 97.7: Partial Prerendering (PPR)
```tsx
// Static shell renders immediately. Dynamic content streams via Suspense
export default async function Page() {
  return (
    <div>
      <StaticNav />           {/* Instant: included in static shell */}
      <Suspense fallback={<Skeleton />}>
        <DynamicFeed />       {/* Streams: rendered on request */}
      </Suspense>
    </div>
  )
}
// PPR = best of static + dynamic in ONE page
```

## Common Mistakes
- Using runtime APIs (cookies, headers) inside 'use cache' blocks
- Forgetting that cache key is auto-generated from args (no manual key)
- Missing cacheTag when content needs on-demand invalidation
- Not understanding revalidateTag (SWR) vs updateTag (immediate purge)
- Using unstable_cache when 'use cache' is available (migrate)

## Related Specialists
- 90.x nextjs-rsc-patterns — Server/Client directives
- 93.x react-perf-critical — Server-side performance optimization
- 62.x data-fetching — Project-specific data chain (variant overlay)
