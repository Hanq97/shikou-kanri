# React Performance Rendering Specialist — Generic
# Reactレンダリングパフォーマンススペシャリスト — 汎用
# Chuyên Gia Hiệu Năng Render React — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 94.1–94.23 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
MEDIUM severity performance patterns: client-side fetching, re-render optimization, and rendering performance. Source: Vercel react-best-practices (62 rules).

## Patterns

### Pattern 94.1–94.4: Client-Side Fetching (MEDIUM-HIGH)
```
94.1 Deduplicate global event listeners: Single listener, distribute events via context/store
94.2 Passive event listeners: { passive: true } for scroll/touch (no preventDefault needed)
94.3 SWR auto-dedup: useSWR deduplicates identical requests within 2s window
94.4 Version localStorage data: Schema version key, migrate on mismatch, clear stale
```

### Pattern 94.5–94.17: Re-render Optimization (MEDIUM)
```
94.5  Derived state in render: Compute from props/state directly, NOT useEffect+setState
94.6  Defer state reads: useDeferredValue for expensive computations from state
94.7  No useMemo for primitives: Memoizing strings/numbers/booleans costs more than recomputing
94.8  Don't define components inside components: Creates new type each render → unmount/remount
94.9  Extract defaults outside component: const DEFAULT = { ... } outside, not inline in JSX
94.10 Extract to memoized sub-components: Split large components, memo() leaf nodes
94.11 Narrow effect dependencies: Specific values, not entire objects
94.12 Event handlers over useEffect: onClick/onChange > useEffect for user-triggered logic
94.13 Subscribe to derived state: Select specific slice from store, not entire state
94.14 Functional setState: setState(prev => prev + 1) not setState(count + 1) for batching
94.15 Lazy state initialization: useState(() => expensiveComputation()) for costly initial values
94.16 useTransition for non-urgent: Mark state updates as non-urgent, keep UI responsive
94.17 useRef for transient values: Animation frames, timers, DOM refs — no re-render needed
```

### Pattern 94.18–94.23: Rendering Performance (MEDIUM)
```
94.18 CSS content-visibility: auto for off-screen sections (skip rendering)
94.19 Hoist static JSX: Move constant JSX outside component, assign to module-level variable
94.20 Hydration mismatch prevention: useId() for SSR-safe IDs, guard browser-only APIs
94.21 Explicit conditional rendering: {condition && <Component />} — avoid nested ternaries
94.22 DOM resource hints: <link rel="preconnect">, <link rel="dns-prefetch"> for external origins
94.23 useTransition over manual loading: Replace useState(isLoading) with useTransition
```

## Common Mistakes
- Defining components inside other components (re-creates on every render)
- Using useEffect to derive state from props (compute in render instead)
- Memoizing primitive values with useMemo (no benefit, adds overhead)
- Subscribing to entire store when only one field is needed
- Using useState for values that don't affect UI (use useRef)

## Related Specialists
- 93.x react-perf-critical — CRITICAL severity: waterfalls, bundle, SSR
- 95.x react-composition — Component architecture for render optimization
- 96.x web-design-guidelines — CSS performance (virtualization, content-visibility)
