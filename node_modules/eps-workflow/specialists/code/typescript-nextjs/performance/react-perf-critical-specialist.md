# React Performance Critical Specialist — Generic
# Reactパフォーマンス重要スペシャリスト — 汎用
# Chuyên Gia Hiệu Năng React Quan Trọng — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 93.1–93.18 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
CRITICAL and HIGH severity performance patterns: eliminating waterfalls, bundle size optimization, and server-side performance. Source: Vercel react-best-practices (62 rules).

## Patterns

### Pattern 93.1–93.5: Eliminating Waterfalls (CRITICAL)
```
93.1 Defer await: Start fetches early, await at usage point
93.2 Parallelize dependencies: Promise.all() independent fetches, better-all for partial failures
93.3 Avoid API route waterfalls: Server Components call DB directly, skip HTTP roundtrip
93.4 Promise.all() for independent data: NEVER sequential await for unrelated data
93.5 Strategic Suspense boundaries: Wrap slow parts, let fast parts render immediately
```

### Pattern 93.6–93.10: Bundle Size (CRITICAL)
```
93.6  Avoid barrel imports: import { Button } from 'lib/Button' NOT from 'lib'
93.7  Conditional module loading: dynamic(() => import(...)) based on feature flags
93.8  Defer non-critical 3rd party: lazyOnload strategy for analytics, chat widgets
93.9  Dynamic import heavy components: next/dynamic with ssr:false for charts, editors, maps
93.10 Preload on user intent: prefetch on hover/focus, load on click
```

### Pattern 93.11–93.18: Server-Side Performance (HIGH)
```
93.11 Authenticate Server Actions: Check session/permissions like API routes
93.12 Avoid duplicate RSC serialization: Hoist shared data to parent, pass as props
93.13 Cross-request LRU caching: Cache expensive computations across requests
93.14 Hoist static I/O to module level: Config reads, env parsing outside request path
93.15 Minimize RSC boundary data: Pass only needed props across server→client boundary
93.16 Parallel data composition: Compose Server Components that fetch independently
93.17 React.cache() dedup: Wrap same-request data access, auto-dedup within render
93.18 after() for non-blocking ops: Logging, analytics, cache warming after response sent
```

## Common Mistakes
- Barrel file imports pulling entire library into bundle
- Sequential awaits for independent data (use Promise.all)
- Server Components calling internal API routes instead of DB/service directly
- Passing entire objects across RSC boundary when only 2 fields needed
- Missing Suspense boundaries causing entire page to wait for slowest data

## Related Specialists
- 94.x react-perf-rendering — Medium severity: re-render, client-side, rendering patterns
- 90.x nextjs-rsc-patterns — Server/Client boundaries
- 92.x nextjs-assets-optimization — Dynamic imports, bundling
- 66.x perf — Project-specific performance inventory (variant overlay)
