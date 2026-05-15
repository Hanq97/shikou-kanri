# Multi-Tenant Routing Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 52.1–52.8 |
| **Source Paths** | `src/app/`, `src/app/[tenant_key]/` |
| **File Count** | ~91 files in app/ directory |
| **Naming Convention** | Next.js App Router conventions (`page.tsx`, `layout.tsx`, `(group)/`) |
| **Barrel Export** | N/A (App Router uses file-system routing) |
| **Imports From** | Core: constants, RouteGuard; Presentation: module components |
| **Imported By** | N/A (entry point — nothing imports from app/) |
| **Cannot Import** | N/A (composition root — can import all layers) |

---

## Description

Every route is scoped to a tenant via a `[tenant_key]` dynamic segment. The app uses Next.js App Router with route groups `(auth)` and `(withLayout)`. A single dynamic `[application]` page maps 66 APPLICATION_KEYs to their respective React components. RouteGuard validates app-level access.

---

## Key Concepts

### 52.1 — URL Path Structure

```
/{tenantKey}/{prefix}/{application}

Examples:
  /acme-corp/cmn/customer_search        → Customer list
  /acme-corp/sfa/opportunity_create      → Create opportunity
  /acme-corp/tnt/tenant_detail           → Tenant detail
```

### 52.2 — Next.js App Router Structure

```
src/app/
├── layout.tsx                          ← Root layout
├── page.tsx                            ← Root page (redirect)
├── [tenant_key]/
│   ├── page.tsx                        ← Tenant root
│   ├── (auth)/                         ← Auth route group (no layout wrapper)
│   │   └── login/
│   │       └── page.tsx
│   └── (withLayout)/                   ← Main app route group (with sidebar/header)
│       ├── layout.tsx                  ← 3-zone layout (Header + Sider + Content)
│       ├── [prefix]/
│       │   ├── page.tsx
│       │   ├── [application]/
│       │   │   └── page.tsx            ← DYNAMIC APPLICATION MAPPING (66 keys)
│       │   ├── calendar/
│       │   │   └── page.tsx
│       │   └── mail/
│       │       └── page.tsx
│       └── ...
├── login/                              ← Login (no tenant)
├── register/                           ← Registration
└── tenant-registration/                ← Tenant onboarding
```

### 52.3 — Route Group Patterns

| Group | Purpose | Layout | Auth Required |
|-------|---------|--------|--------------|
| `(auth)` | Login/auth screens | No sidebar/header | No |
| `(withLayout)` | Main application | 3-zone layout (Header + Sider + Content) | Yes |

### 52.4 — RouteGuard Component

```typescript
// src/core/ultis/RouteGuard.tsx (note: ultis/ is a typo folder)
// Validates app-level access using JWT apps_access claim
// Wraps the dynamic [application] page
```

### 52.5 — `getPathParams()` Utility

Plain function (NOT a React hook) that parses `window.location.pathname`:

```typescript
// src/core/utils/pathParams.ts
export function getPathParams(): PathParams {
  const segments = window.location.pathname.split('/').filter(Boolean);
  return {
    tenantKey: segments[0] ?? '',
    prefix: segments[1] ?? '',
    application: segments[2] ?? '',
  };
}
```

Can be called anywhere — not just in React components.

### 52.6 — Dynamic Application Mapping (66 routes)

The `[application]/page.tsx` maps APPLICATION_KEY constants to React components:

```typescript
// src/app/[tenant_key]/(withLayout)/[prefix]/[application]/page.tsx
'use client';
import { useParams } from 'next/navigation';
import { APPLICATION_KEY } from '@/core/constants/common';
import { RouteGuard } from '@/core/ultis/RouteGuard';

const mapApplication: Record<string, JSX.Element> = {
  [APPLICATION_KEY.CUSTOMER_SEARCH]: <ListCustomer />,
  [APPLICATION_KEY.CUSTOMER_EDIT]: <EditCustomer />,
  [APPLICATION_KEY.CUSTOMER_DETAIL]: <DetailCustomer />,
  [APPLICATION_KEY.OPPORTUNITY_SEARCH]: <ListOpportunity />,
  [APPLICATION_KEY.OPPORTUNITY_CREATE]: <CreateUpdateOpportunity />,
  // ... 66 total mappings
};

export default function ApplicationPage() {
  const { application } = useParams();
  return (
    <RouteGuard>
      {mapApplication[application as string] || <NotFound />}
    </RouteGuard>
  );
}
```

**How to add a new route**:
1. Add `APPLICATION_KEY.NEW_FEATURE` to `src/core/constants/common.ts`
2. Import the component in `[application]/page.tsx`
3. Add mapping: `[APPLICATION_KEY.NEW_FEATURE]: <NewFeatureComponent />`

### 52.7 — Tenant Context Flow

```
URL: /acme-corp/cmn/customer_search
  ↓
[tenant_key] = "acme-corp"
  ↓
(withLayout)/layout.tsx → Injects tenant context, renders sidebar/header
  ↓
[prefix] = "cmn"
  ↓
[application] = "customer_search" → mapApplication lookup → <ListCustomer />
  ↓
RouteGuard checks JWT apps_access → Allow or deny
```

### 52.8 — Static Routes Outside Dynamic Mapping

Some routes are NOT mapped through `[application]` but have their own `page.tsx`:

| Route | Path | Why |
|-------|------|-----|
| Calendar | `[prefix]/calendar/page.tsx` | Full-page calendar (not in mapApplication) |
| Mail | `[prefix]/mail/page.tsx` | Mail client (separate layout) |

---

## Anti-Patterns

- Hardcoding tenant keys in component logic
- Skipping RouteGuard for protected routes
- Reading `apps_access` directly in leaf components (use hooks/guards)
- Using `useRouter().query` for params (use `useParams()` in App Router)
- Adding new routes as separate `page.tsx` files (use `mapApplication` mapping instead)
- Bypassing `getPathParams()` to parse URLs manually

---

## Related Specialists

- `permission-specialist.md` (57.x) — App-level access with useAppAccess()
- `axios-interceptor-specialist.md` (54.x) — Tenant key in API paths
- `nextjs-clean-architecture-specialist.md` (50.x) — App layer is composition root
- `layout-specialist.md` (69.x) — 3-zone layout in (withLayout)
- `core-layer-specialist.md` (84.x) — apiConfig.ts, constants
