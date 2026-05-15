# Layout & App Shell Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App (layouts) + Presentation (layout components) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 69.1–69.8 |
| **Source Paths** | `src/app/*/layout.tsx`, `src/presentation/ui/layouts/tenant/` |
| **File Count** | 5 layout files + 4 layout components |
| **Naming Convention** | `layout.tsx` for Next.js, `{Component}.tsx` for UI |
| **Barrel Export** | N/A |
| **Imports From** | Presentation: providers, hooks; Infrastructure: store |
| **Imported By** | App: all route groups use layouts |
| **Cannot Import** | N/A (spans composition root) |

---

## Description

The application uses 3-level layout nesting with providers in strict order (see 73.x for full provider details). Fixed 48px header, 240px sidebar, scrollable content. Wrong provider order or height values breaks the entire app.

---

## Key Concepts

### 69.1 — Three-Level Layout Nesting

```
L0: src/app/layout.tsx (58 lines)
    Root — StoreProvider + LocaleProvider + AntdProvider + FCMNotificationProvider

L1: src/app/[tenant_key]/(withLayout)/layout.tsx (63 lines)
    Tenant — Header + Sider (Menu) + Content + FormProvider + AutoWorkflowProvider

L1: src/app/tenants/(withLayout)/layout.tsx (74 lines)
    Tenant Admin — same + Suspense wrapper

L1: src/app/tenants/register/layout.tsx (15 lines)
    Auth — pass-through, metadata only

L1: src/app/tenants/verify/layout.tsx (16 lines)
    Auth — pass-through, metadata only

L2: Feature pages (wrapped by L1)
```

### 69.2 — Provider Stack Order (MUST be exact)

```
StoreProvider (Redux)
  └─ LocaleProvider (i18next, ja primary)
     └─ AntdProvider (next-themes + ConfigProvider + AntdRegistry)
        └─ FCMNotificationProvider (Firebase)
           └─ {children}
              └─ FormProvider + AutoWorkflowProvider (L1 tenant only)
```

WHY: Redux must wrap i18next (reads locale from store). Antd must wrap FCM (notification UI). See `provider-composition-specialist.md` (85.x) for full dependency graph.

### 69.3 — Header Component (329 lines)

- File: `src/presentation/ui/layouts/tenant/Header.tsx`
- Sticky top:0, height: 48px, bg: `#161d26`
- Contains: Logo | spacer | Help | Notifications | User dropdown
- `fetchCommonData()` on mount → loads myPermissions + profile

### 69.4 — Menu Component (509 lines)

- File: `src/presentation/ui/layouts/tenant/Menu.tsx`
- 7 categories + 14 settings sub-items
- `useFilteredMenu()` filters by useAppAccess
- Width: 240px fixed

### 69.5 — Breadcrumb Component (145 lines)

- File: `src/presentation/ui/layouts/tenant/Breadcrumb.tsx`
- Redux `listBreacrumb` from detailSlice
- Maps detail → parent search screen
- Separator: `">"`

### 69.6 — Notifications Component (384 lines)

- File: `src/presentation/ui/layouts/tenant/Notifications.tsx`
- Popover-based (NOT drawer)
- 5 types: INFO, SYSTEM, EMAIL, SCHEDULE, TODO
- Infinite scroll, unread badge
- Only responsive component: `md:w-[450px]`, `max-md:w-screen`

### 69.7 — Height Calculation Constants

```
Header:   48px (fixed, sticky top)
Sider:    calc(100vh - 48px)
Menu:     calc(100vh - 88px)    ← 48px + 40px collapse
Content:  calc(100vh - 48px)    ← scrollable
Sidebar:  240px width (fixed)
```

NON-NEGOTIABLE values.

### 69.8 — Theme Provider Configuration

```typescript
<ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} themes={['light', 'dark']}>
```

---

## Anti-Patterns

- Changing provider stack order
- Using values other than 48px for header height
- Putting FormProvider in root layout (tenant only)
- Using drawer for notifications (project uses popover)
- Adding mobile menu collapse (not implemented)
- Setting enableSystem={true}

---

## Related Specialists

- `theme-specialist.md` (59.x) — Color tokens, dark mode
- `permission-specialist.md` (57.x) — useAppAccess for menu
- `redux-toolkit-specialist.md` (53.x) — detailSlice breadcrumb
- `fcm-notification-specialist.md` (61.x) — FCMNotificationProvider
- `provider-composition-specialist.md` (85.x) — Full provider dependency graph
