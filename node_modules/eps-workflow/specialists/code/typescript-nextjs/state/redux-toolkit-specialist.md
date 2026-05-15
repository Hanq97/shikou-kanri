# Redux Toolkit Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 53.1–53.6 |
| **Source Paths** | `src/infrastructure/store/` (store.ts, hooks.ts, slices/) |
| **File Count** | 6 files (store.ts + hooks.ts + 4 slice files) |
| **Naming Convention** | `{name}Slice.ts` for slices, `store.ts` for configuration |
| **Barrel Export** | No barrel — direct imports from `store.ts` and `hooks.ts` |
| **Imports From** | Domain: entity interfaces (`IAuthModel`, `IDataField`, etc.) |
| **Imported By** | Presentation: components use `useAppSelector`/`useAppDispatch` from hooks.ts |
| **Cannot Import** | `presentation/*` |

---

## Description

The application uses Redux Toolkit (RTK) with 4 main slices. RTK Query is NOT used — data fetching is handled by the DI factory/use-case pattern (see 51.x). The store lives in the **Infrastructure layer** (not Presentation). Slices manage derived UI state, shared domain data, and authentication state.

---

## Key Concepts

### 53.1 — Four Main Slices (VERIFIED)

| Slice | File | `name:` | Purpose |
|-------|------|---------|---------|
| `currentUserSlice` | `slices/currentUserSlice.ts` | `'user'` | JWT user profile + theme (`light`/`dark`) |
| `commonSlice` | `slices/commonSlice.ts` | `'common'` | DataFields, DataSources, ScreenFilters, myPermissions, Customers |
| `detailSlice` | `slices/detailSlice.ts` | `'detail'` | Detail screen stack, breadcrumb trail |
| `layoutSlice` | `slices/layoutSlice.ts` | `'layout'` | Page builder state, component tracking |

⚠️ **CORRECTED**: Previous versions wrongly called these "authSlice" and "scheduleSlice". The actual names are `currentUserSlice` (user auth + theme) and `detailSlice` (detail screen navigation).

### 53.2 — Typed Hooks (Infrastructure Layer)

Hooks live at `src/infrastructure/store/hooks.ts` (NOT `src/presentation/hooks/`):

```typescript
// src/infrastructure/store/hooks.ts
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
```

Always use these typed hooks. Never use raw `useDispatch` or `useSelector`.

### 53.3 — Store Configuration (SSR-Safe)

```typescript
// src/infrastructure/store/store.ts
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import currentUser from './slices/currentUserSlice';
import layoutReducer from './slices/layoutSlice';
import commonReducer from './slices/commonSlice';
import detailReducer from './slices/detailSlice';

const rootReducer = combineReducers({
  currentUser: currentUser,
  layout: layoutReducer,
  common: commonReducer,
  detail: detailReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// SSR-safe: makeStore creates unique instances per request
export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
```

Key details:
- Uses `combineReducers` (not `combineSlices`)
- `makeStore()` function for SSR isolation (not a global `store` export)
- `serializableCheck: false` in middleware
- No RTK Query middleware

### 53.4 — Selector Naming

Selectors are named `select{Entity}` and co-located with the slice file:

```typescript
// In currentUserSlice.ts
export const selectCurrentUser = (state: RootState) => state.currentUser.currUser;
export const selectTheme = (state: RootState) => state.currentUser.theme;
```

### 53.5 — Slice Actions Pattern

Actions describe UI events, not API calls. API results are dispatched as plain data:

```typescript
// currentUserSlice reducers:
saveUser: (state, action: PayloadAction<IAuthModel>) => { state.currUser = action.payload; },
resetUser: () => initialState,
setCurrThem: (state, action: PayloadAction<'light' | 'dark'>) => { state.theme = action.payload; },
```

⚠️ Note typo: `setCurrThem` (missing 'e' in Theme) — exists in actual code.

### 53.6 — Store Location: Infrastructure Layer

The store is explicitly in the **Infrastructure** layer:
```
src/infrastructure/store/
├── store.ts           ← configureStore, types
├── hooks.ts           ← useAppDispatch, useAppSelector, useAppStore
└── slices/
    ├── commonSlice.ts
    ├── currentUserSlice.ts
    ├── detailSlice.ts
    └── layoutSlice.ts
```

This is correct per Clean Architecture — Redux is infrastructure (external framework), not domain logic. Components in Presentation import typed hooks from here.

---

## Code Examples

### currentUserSlice (Pattern 53.1)

```typescript
// src/infrastructure/store/slices/currentUserSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IAuthModel } from '@/domain/entities';

export interface IUerState {
  currUser: IAuthModel | null;
  theme: 'light' | 'dark';
}

const initialState: IUerState = {
  currUser: null,
  theme: 'light',
};

const currentUserSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    saveUser: (state, action: PayloadAction<IAuthModel>) => {
      state.currUser = action.payload;
    },
    resetUser: () => initialState,
    setCurrThem: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});
```

### Using Store in Components (Pattern 53.2 + 53.5)

```typescript
// In a presentation component
import { useAppDispatch, useAppSelector } from '@/infrastructure/store/hooks';
import { saveUser } from '@/infrastructure/store/slices/currentUserSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const currUser = useAppSelector(state => state.currentUser.currUser);

  // After DI factory call resolves:
  const handleLogin = async () => {
    const user = await loginFactory(credentials);  // From DI container
    dispatch(saveUser(user));  // Dispatch plain data
  };
};
```

---

## Anti-Patterns

- Using raw `useSelector`/`useDispatch` without typed wrappers
- Importing hooks from `src/presentation/hooks/storeHooks.ts` (WRONG path — they're at `src/infrastructure/store/hooks.ts`)
- Storing server response objects verbatim (map to domain entities first)
- Using RTK Query (not part of this project's pattern)
- Creating slice-level thunks for API calls (use DI factory pattern instead)
- Nesting slice state more than 2 levels deep
- Using `.execute()` on use-case objects (use pure function calls instead)
- Referencing "authSlice" or "scheduleSlice" (these don't exist — they're `currentUserSlice` and `detailSlice`)

---

## Related Specialists

- `data-fetching-specialist.md` (62.x) — How data flows into the store
- `frontend-di-specialist.md` (51.x) — Factory pattern that dispatches to store
- `permission-specialist.md` (57.x) — Permission data lives in commonSlice
- `nextjs-clean-architecture-specialist.md` (50.x) — Store's place in Infrastructure layer

---

## Standard Deviations (Known Issues)

| File | Issue | Target Fix |
|------|-------|------------|
| `currentUserSlice.ts` | Interface `IUerState` — typo for `IUserState` | Rename interface |
| `currentUserSlice.ts` | Action `setCurrThem` — missing 'e' in Theme | Rename to `setCurrTheme` |
| Store `name: 'user'` | Inconsistent with file name `currentUserSlice` | Consider renaming to `currentUser` |
