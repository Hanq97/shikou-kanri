# Hook Patterns Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 86.1–86.5 |
| **Source Paths** | `src/presentation/hooks/` (15 global), `src/presentation/hooks/tenant/` (1), feature modules (local) |
| **File Count** | 15 global + 1 tenant + ~10 feature-local = ~26 total |
| **Naming Convention** | `use{Feature}.ts` or `use{Feature}.tsx` |
| **Barrel Export** | N/A (direct imports) |
| **Imports From** | Infrastructure: store hooks; Domain: entities |
| **Imported By** | Presentation: components import hooks |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

Hooks are organized in 3 tiers: global (shared across app), tenant-scoped, and feature-local (inside module folders). Global hooks live in `presentation/hooks/`. Feature-local hooks live inside their module's folder.

---

## Key Concepts

### 86.1 — Hook Organization Strategy

| Tier | Location | When to Use |
|------|----------|-------------|
| **Global** | `src/presentation/hooks/` | Used by 2+ modules or cross-cutting |
| **Tenant** | `src/presentation/hooks/tenant/` | Tenant-specific logic |
| **Feature-local** | `src/presentation/ui/modules/{code}/hooks/` | Used only within one module |

### 86.2 — Global Hooks Inventory (15 hooks)

| Hook | File | Purpose | Import Count |
|------|------|---------|-------------|
| `useAppAccess` | `useAppAccess.ts` | App-level JWT access check | 2 |
| `useCodeGenerator` | `useCodeGenerator.ts` | Generate unique codes | — |
| `useConfirmAction` | `useConfirmAction.tsx` | Confirmation dialog helper | — |
| `useDashboard` | `useDashboard.ts` | Dashboard data | — |
| `useFCMNotification` | `useFCMNotification.tsx` | Firebase push notifications | — |
| `useFilteredMenu` | `useFilteredMenu.ts` | Menu filtering by permission | — |
| `useIsMounted` | `useIsMounted.tsx` | SSR-safe mounted check | — |
| `useNotification` | `useNotification.ts` | Ant Design notification wrapper | — |
| `usePermission` | `usePermission.ts` | Function-level CRUD permissions | 49 |
| `useTableScroll` | `useTableScroll.tsx` | Auto-calculate table scroll height | — |
| `useUnsavedChangesConfirm` | `useUnsavedChangesConfirm.tsx` | Unsaved changes warning | — |
| `useWorkflowDispatch` | `useWorkflowDispatch.ts` | Dispatch workflow actions | — |
| `useWorkflowRegistration` | `useWorkflowRegistration.ts` | Register workflow nodes | — |
| `useWorkflowScreen` | `useWorkflowScreen.ts` | Workflow screen context | — |

### 86.3 — Tenant Hook

| Hook | File | Purpose |
|------|------|---------|
| `useRegistration` | `hooks/tenant/useRegistration.ts` | Tenant registration flow |

### 86.4 — Hook Naming Convention

```
use{Feature}.ts     ← TypeScript only (no JSX)
use{Feature}.tsx    ← Contains JSX (e.g., useConfirmAction returns JSX)
```

### 86.5 — When to Create a Hook vs Inline

**Create a hook when**:
- Logic is used by 2+ components
- Logic involves useEffect + state management combination
- Logic wraps a cross-cutting concern (permissions, notifications)

**Keep inline when**:
- Simple useState/useRef in a single component
- One-off useEffect with no reuse potential

### Example — usePermission in cmn005000

```typescript
// src/presentation/ui/modules/cmn005000/UserManagement.tsx
// usePermission checks CRUD access for the given APPLICATION_KEY
import { usePermission } from '@/presentation/hooks/usePermission';

const UserManagement = () => {
  const { canCreate, canRead, canUpdate, canDelete } = usePermission('cmn005000');

  return (
    <>
      <Button disabled={!canCreate} onClick={handleCreate}>新規作成</Button>
      <Table dataSource={canRead ? users : []} />
      <Button disabled={!canDelete} onClick={handleDeleteMulti}>一括削除</Button>
    </>
  );
};
```

This pattern is used in **49 files** across all `cmnXXXXXX` and `sfaXXXXXX` modules.

---

## Anti-Patterns

- Putting global hooks inside module folders (use `presentation/hooks/`)
- Creating hooks that directly call API clients (use DI containers instead)
- Using `use` prefix for non-hook functions (must follow React rules of hooks)
- Creating hooks that return JSX without `.tsx` extension

---

## Related Specialists

- `permission-specialist.md` (57.x) — usePermission hook detail
- `nextjs-clean-architecture-specialist.md` (50.x) — Hooks in Presentation layer
- `provider-composition-specialist.md` (85.x) — Providers that hooks consume
