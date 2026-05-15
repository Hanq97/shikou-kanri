# Provider Composition Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (providers/) + App (layout.tsx) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 85.1–85.5 |
| **Source Paths** | `src/presentation/providers/` (7 files + workflow/ subfolder) |
| **File Count** | 7 provider files + 3 workflow context files + 1 index.ts |
| **Naming Convention** | `{Feature}Provider.tsx` |
| **Barrel Export** | `src/presentation/providers/index.ts` |
| **Imports From** | Core: constants, i18n; Infrastructure: store |
| **Imported By** | App: root layout.tsx and feature layouts |
| **Cannot Import** | N/A (spans composition root) |

---

## Description

The application uses a provider composition pattern with strict nesting order. Providers wrap the root layout and must be nested correctly — outer providers are available to inner ones. Feature-level providers (Form, Workflow) wrap individual pages, not the root.

---

## Key Concepts

### 85.1 — Root Provider Nesting Order

The root layout (`src/app/layout.tsx`) nests providers in this order (outermost first):

```tsx
<StoreProvider>           ← 1. Redux store (must be outermost — other providers use it)
  <LocaleProvider>        ← 2. i18next locale context
    <AntdProvider>        ← 3. Ant Design theme + ConfigProvider
      <FCMNotificationProvider>  ← 4. Firebase push notifications
        {children}
      </FCMNotificationProvider>
    </AntdProvider>
  </LocaleProvider>
</StoreProvider>
```

**Order matters**: StoreProvider MUST be outermost because LocaleProvider and AntdProvider read from Redux store.

### 85.2 — Provider Inventory

| Provider | File | Layer | Wraps | Provides |
|----------|------|-------|-------|----------|
| `StoreProvider` | `StoreProvider.tsx` | Root | Entire app | Redux store (`makeStore()`) |
| `LocaleProvider` | `LocaleProvider.tsx` | Root | Under store | i18next locale context |
| `AntdProvider` | `AntdProvider.tsx` | Root | Under locale | Ant Design theme + next-themes |
| `FCMNotificationProvider` | `FCMNotificationProvider.tsx` | Root | Under AntD | Firebase messaging |
| `FormProvider` | `FormProvider.tsx` | Feature | Per-page | Shared form instances |
| `WorkflowProvider` | `WorkflowProvider.tsx` | Feature | Per-workflow | Workflow designer context |
| `AutoWorkflowProvider` | `AutoWorkflowProvider.tsx` | Feature | Per-auto-workflow | Auto-workflow runtime |

### 85.3 — Provider Dependency Graph

```
StoreProvider (Redux)
  ↓ provides: useAppSelector, useAppDispatch
LocaleProvider (i18n)
  ↓ provides: useTranslation, locale context
  ↓ depends on: store (reads language preference)
AntdProvider (Theme)
  ↓ provides: ConfigProvider, design tokens
  ↓ depends on: store (reads theme preference from currentUserSlice)
FCMNotificationProvider
  ↓ provides: push notification context
  ↓ depends on: store (reads user auth state)
```

### 85.4 — Workflow Context Hierarchy

The `workflow/` subfolder contains React contexts (not providers):

```
src/presentation/providers/workflow/
├── ScreenContext.ts            ← Base screen context interface
├── AntDesignScreenContext.ts   ← Ant Design screen implementation
├── TestScreenContext.ts        ← Test environment implementation
└── index.ts                    ← Barrel export
```

Used by `WorkflowProvider` to provide screen rendering capabilities to workflow blocks.

### 85.5 — How to Add a New Provider

1. Create `src/presentation/providers/{Feature}Provider.tsx`
2. Determine scope:
   - **Root-level** (all pages): Add to root `layout.tsx` nesting chain
   - **Feature-level** (specific pages): Wrap in the feature's container component
3. If root-level, determine nesting position based on dependencies
4. Export from `providers/index.ts`

---

## Anti-Patterns

- Nesting StoreProvider inside other providers (must be outermost)
- Using React.createContext for state that should be in Redux
- Creating a provider that depends on something from a sibling provider (use parent-child only)
- Wrapping entire app with feature-level providers (wrap only relevant pages)

---

## Related Specialists

- `redux-toolkit-specialist.md` (53.x) — StoreProvider wraps the store
- `theme-specialist.md` (59.x) — AntdProvider theme tokens
- `i18n-specialist.md` (58.x) — LocaleProvider i18n context
- `fcm-notification-specialist.md` (61.x) — FCM provider
- `nextjs-clean-architecture-specialist.md` (50.x) — Providers in Presentation layer
