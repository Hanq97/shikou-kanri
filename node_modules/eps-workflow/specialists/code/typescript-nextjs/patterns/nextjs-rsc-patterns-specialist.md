# Next.js RSC Patterns Specialist — Generic
# Next.js RSCパターンスペシャリスト — 汎用
# Chuyên Gia Mẫu RSC Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 90.1–90.8 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
React Server Components boundaries, directives, serialization, async APIs, data fetching patterns, and runtime selection for Next.js App Router.

## Patterns

### Pattern 90.1: Server vs Client Components
```
Server Component (DEFAULT):
- Can be async, can access DB/fs/env directly
- CANNOT use useState, useEffect, onClick, browser APIs

Client Component ('use client'):
- CANNOT be async
- Required for: useState, useEffect, event handlers, browser APIs
- Push 'use client' as LOW as possible in the tree
```

### Pattern 90.2: Serialization Boundaries
```
Server → Client props MUST be serializable:
✅ string, number, boolean, null, undefined, Array, plain Object, Date (as ISO), Promise, Server Actions
❌ functions (except Server Actions), Map, Set, class instances, Symbols, circular refs

Convert before passing:
  Date       → .toISOString()
  Map        → Object.fromEntries()
  Set        → Array.from()
  class      → plain object spread
```

### Pattern 90.3: Directives
```
'use client'  → Interactivity boundary. useState, useEffect, onClick, browser APIs
'use server'  → Server Actions. Form mutations, revalidation. POST only
'use cache'   → Caching boundary. Requires cacheComponents: true in next.config
```

### Pattern 90.4: Async APIs (Next.js 15+)
```typescript
// params, searchParams, cookies(), headers() are ALL async
type Props = { params: Promise<{ id: string }> }
export default async function Page({ params }: Props) {
  const { id } = await params
}
// Sync components: use React.use()
'use client'
function Client({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
}
```

### Pattern 90.5: Data Fetching Decision Tree
```
READ data    → Server Component (async, direct DB/API access)
MUTATE data  → Server Action ('use server', form actions, revalidatePath)
External API → Route Handler (webhooks, third-party callbacks)
Client need  → Pass from Server (preferred) > useEffect > Server Action
```

### Pattern 90.6: Waterfall Prevention
```
❌ const user = await getUser(id)
   const posts = await getPosts(user.id)  // Sequential waterfall

✅ const [user, posts] = await Promise.all([getUser(id), getPosts(id)])
✅ Use Suspense boundaries for parallel streaming
✅ Preload pattern: const dataPromise = getData(); // start early, await late
```

### Pattern 90.7: Server Actions
```
'use server'
- Always POST. Type-safe input/output
- Authenticate like API routes (check session/permissions)
- Validate input (Zod schemas)
- Call revalidatePath()/revalidateTag() after mutations
- Return typed results, not throw errors to client
```

### Pattern 90.8: Runtime Selection
```
Default: Node.js runtime (full API support)
Edge: ONLY for specific latency-critical requirements
  - Edge lacks: fs, full crypto, many npm packages
  - "If unsure, use Node.js"
export const runtime = 'edge' // only when justified
```

## Common Mistakes
- Putting 'use client' at top of every file (destroys SSR benefits)
- Wrapping redirect()/notFound() in try-catch (they throw intentionally)
- Passing non-serializable props across server/client boundary
- Sequential awaits when data is independent (use Promise.all)
- Making Client Components async (not supported)

## Related Specialists
- 91.x nextjs-file-conventions — File structure conventions
- 93.x react-perf-critical — Waterfall elimination patterns
- 97.x nextjs-cache — 'use cache' directive details
- 62.x data-fetching — Project-specific data chain (variant overlay)
