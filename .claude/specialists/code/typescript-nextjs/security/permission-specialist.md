# Permission Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (hooks) + Core (RouteGuard) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 57.1–57.7 |
| **Source Paths** | `src/presentation/hooks/usePermission.ts`, `src/presentation/hooks/useAppAccess.ts`, `src/core/ultis/RouteGuard.tsx` |
| **File Count** | 3 core files (usePermission 123 lines, useAppAccess, RouteGuard) |
| **Naming Convention** | `use{Feature}` for hooks |
| **Barrel Export** | N/A (direct imports) |
| **Imports From** | Infrastructure: `store/hooks` (useAppSelector) |
| **Imported By** | Presentation: 49 files import usePermission, 2 files import useAppAccess |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The application implements **TWO permission systems** that coexist:

1. **App-level**: `useAppAccess()` — JWT-based, controls route/module access (2 files use it)
2. **Function-level CRUD**: `usePermission(functionCd)` — Redux-based, controls button-level permissions (49 files use it)

Both are hooks in the Presentation layer. They check different data sources.

---

## Key Concepts

### 57.1 — App-Level Access Control

Access is granted per application module code (e.g., `cmn001000`).
The `apps_access` array in the JWT lists all modules the user can access.

### 57.2 — useAppAccess() Hook

Single hook with NO parameters. Returns:
- `enabledApps: string[]` — accessible app codes
- `hasAppAccess: (appCode: string) => boolean`
- `hasAllAppAccess: (appCodes: string[]) => boolean`
- `hasAnyAppAccess: (appCodes: string[]) => boolean`
- `refreshEnabledApps: () => void`

### 57.3 — RouteGuard Component

```typescript
// src/core/ultis/RouteGuard.tsx (note: ultis/ is typo folder)
// Wraps [application]/page.tsx to validate route-level access
```

### 57.4 — JWT apps_access Claim

```json
{
  "apps_access": ["cmn001000", "cmn002000", "sfa001000"],
  "tenant_key": "acme-corp"
}
```

### 57.5 — usePermission() Function-Level CRUD Hook

**File**: `src/presentation/hooks/usePermission.ts` (123 lines)
**Used in**: 49 files across the codebase

```typescript
export const usePermission = (functionCd: string): PermissionResult => {
  const myPermissions = useAppSelector((state) => state.common.myPermissions);

  return useMemo(() => {
    const permission = myPermissions?.permissions?.find(p => p.function_cd === functionCd);

    const canCreate = permission?.function_permission_c === true;
    const canRead = permission?.function_permission_r === true;
    const canUpdate = permission?.function_permission_u === true;
    const canDelete = permission?.function_permission_d === true;
    const hasAnyPermission = canCreate || canRead || canUpdate || canDelete;

    return {
      permission,             // FunctionPermission | null
      hasPermission: hasAnyPermission,
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      hasAnyPermission,
    };
  }, [myPermissions, functionCd]);
};
```

**Key details**:
- Parameter: `functionCd: string` (the function code from APPLICATION_KEY or custom)
- Source: Redux `state.common.myPermissions.permissions[]`
- Lookup: `.find(p => p.function_cd === functionCd)`
- Permission fields: `function_permission_c`, `function_permission_r`, `function_permission_u`, `function_permission_d`
- Memoized with `useMemo` — only recomputes when `myPermissions` or `functionCd` changes

### 57.6 — usePermissions() Batch Hook

For checking multiple function codes at once (Map-based O(1) lookup):

```typescript
export const usePermissions = (functionCds: string[]): Record<string, PermissionResult> => {
  const myPermissions = useAppSelector((state) => state.common.myPermissions);

  return useMemo(() => {
    const permissionMap = new Map(
      myPermissions?.permissions?.map(p => [p.function_cd, p]) ?? []
    );

    const results: Record<string, PermissionResult> = {};
    functionCds.forEach(functionCd => {
      const permission = permissionMap.get(functionCd);
      // ... same logic as usePermission per entry
    });
    return results;
  }, [myPermissions, functionCds]);
};
```

### 57.7 — Dual Permission Architecture

| Hook | Level | Source | Purpose | Usage |
|------|-------|--------|---------|-------|
| `useAppAccess()` | App/Module | JWT `apps_access` claim | Guards routes, menu visibility | 2 files |
| `usePermission(functionCd)` | Function/CRUD | Redux `myPermissions` | Guards buttons (New, Edit, Delete) | 49 files |

**Flow**:
1. User logs in → JWT contains `apps_access` → `useAppAccess()` filters menu items
2. User opens page → `usePermission(functionCd)` checks CRUD flags for that screen
3. Buttons conditionally rendered: `{canCreate && <Button>新規登録</Button>}`

```
JWT apps_access ─────────→ useAppAccess() ──→ Menu visibility, route guards
                                                 ↓ (if allowed)
Redux myPermissions ─────→ usePermission() ──→ Button visibility (CRUD)
```

---

## Code Examples

### usePermission() CRUD Guard (Pattern 57.5)

```typescript
// src/presentation/ui/modules/cmn001000/cmn001001_list/containers/CustomerListContainer.tsx
import { usePermission } from '@/presentation/hooks/usePermission';
import { APPLICATION_KEY } from '@/core/constants/common';

const { canCreate, canUpdate, canDelete } = usePermission(APPLICATION_KEY.CUSTOMER_SEARCH);

// Button guard pattern
{canCreate && <Button onClick={handleCreate}>新規登録</Button>}
{canUpdate && <Button onClick={handleEdit}>編集</Button>}
{canDelete && <Button danger onClick={handleDelete}>削除</Button>}
```

### usePermissions() Batch (Pattern 57.6)

```typescript
// When a page needs to check multiple function codes
import { usePermissions } from '@/presentation/hooks/usePermission';

const permissions = usePermissions([
  APPLICATION_KEY.CUSTOMER_SEARCH,
  APPLICATION_KEY.TODO_SEARCH,
]);

const customerPerm = permissions[APPLICATION_KEY.CUSTOMER_SEARCH];
const todoPerm = permissions[APPLICATION_KEY.TODO_SEARCH];
```

### Menu with App-Level Access (Pattern 57.2)

```typescript
import { useAppAccess } from '@/presentation/hooks/useAppAccess';

const { hasAppAccess } = useAppAccess();
{hasAppAccess('cmn001000') && <Menu.Item>顧客管理</Menu.Item>}
```

---

## Anti-Patterns

- Claiming usePermission() doesn't exist (IT DOES — 49 files use it)
- Using usePermission() for route-level guards (use useAppAccess() instead)
- Checking permissions in Redux reducers (check in components only)
- Forgetting to call fetchCommonData() on app mount (permissions come from this)
- Hardcoding permission strings instead of using APPLICATION_KEY constants
- Parsing JWT claims directly in components (use useAppAccess())
- Passing appCode to useAppAccess() as parameter (it takes NO parameters)

---

## Related Specialists

- `multitenant-routing-specialist.md` (52.x) — RouteGuard integration
- `redux-toolkit-specialist.md` (53.x) — myPermissions in commonSlice
- `axios-interceptor-specialist.md` (54.x) — Token refresh updates JWT claims
- `hook-patterns-specialist.md` (86.x) — Hook organization strategy
