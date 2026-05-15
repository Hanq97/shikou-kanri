# Frontend Performance Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting concern) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 66.1–66.7 |
| **Source Paths** | All component files |
| **File Count** | ~925 files (performance applies to all) |
| **Naming Convention** | N/A |
| **Imports From** | React: useMemo, useCallback, memo |
| **Imported By** | N/A (pattern guidance) |
| **Cannot Import** | N/A (cross-cutting — defines rules rather than following them) |

---

## Description

The application heavily uses `useMemo` (447 occurrences) and `useCallback` but has ZERO usage of `React.memo`, `next/image`, or bundle analysis. This specialist documents current patterns and recommended improvements.

---

## Key Concepts

### 66.1 — Current Performance Inventory (Verified Counts)

| Pattern | Count | Assessment |
|---------|-------|------------|
| `useMemo` | 447 occurrences / 123 files | Active — data transforms, column defs |
| `useCallback` | Heavy (paired with useMemo) | Permission hooks, event handlers |
| `React.memo` | **0 usages** | GAP — no component memoization |
| `next/dynamic()` | 7 occurrences / 6 files | CKEditor, Logo, middleware |
| `next/image` | **0 usages** | GAP — raw `<img>` used everywhere |
| Bundle analyzer | **Not configured** | GAP — no bundle visibility |

### 66.2 — useMemo Best Practices (Project-Specific)

Primary use: table column definitions (prevent re-calculation on re-render):
```typescript
const tableOptions = useMemo<ColumnsType<any>>(() =>
  columns?.map(x => ({ /* column definition */ }))
, [columns, listDataField]);
```

Secondary use: filtered/sorted data arrays.

Anti-pattern: useMemo for primitive values or cheap computations.

### 66.3 — Recommended React.memo Adoption

High-value targets (render frequently, no internal state):

```typescript
// Table cell renderers:
export const TableColumnRenderer = React.memo(({ value, field }) => {
  return renderByType(value, field);
});

// Permission-checked button bars:
export const ActionButtons = React.memo(({ permission, onAction }) => {
  return (/* button bar */);
});
```

### 66.4 — Existing next/dynamic() Usage

```typescript
// Current 6 files using dynamic import:
const CKEditorClient = dynamic(() => import('./CKEditorClient'), { ssr: false });
const Logo = dynamic(() => import('./Logo'), { ssr: false });
// Pattern: ssr: false for client-only libraries
```

Recommendation: Add dynamic import for ReactFlow workflow designer (heavy library).

### 66.5 — Recommended next/image Migration

```typescript
// Current (performance gap):
<img src={logoUrl} alt="logo" />

// Recommended:
import Image from 'next/image';
<Image src={logoUrl} alt="logo" width={120} height={32} priority />
```

Benefits: Automatic WebP conversion, lazy loading, size optimization.

### 66.6 — Bundle Analysis Setup

Currently NOT configured. Recommended setup:

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer(nextConfig);
```

Run: `ANALYZE=true npm run build`

### 66.7 — Route-Level Code Splitting

- App Router handles automatic page-level splitting
- Additional optimization: `dynamic()` for heavy library components
- Currently done for: CKEditor (64.x)
- Recommend also for: ReactFlow workflow designer (60.x)

---

## Anti-Patterns

- Adding React.memo to components with frequently changing props (counterproductive)
- Using useMemo for primitive values or string concatenation
- Importing entire icon libraries (`import * from '@ant-design/icons'`)
- Loading CKEditor or ReactFlow without next/dynamic
- Using `<img>` for user-facing images instead of `next/image`

---

## Related Specialists

- `table-datagrid-specialist.md` (83.x) — useMemo for column defs
- `ckeditor-specialist.md` (64.x) — Dynamic import example
- `workflow-designer-specialist.md` (60.x) — ReactFlow dynamic candidate
