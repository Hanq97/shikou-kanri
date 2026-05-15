# Core Layer Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 84.1–84.7 |
| **Source Paths** | `src/core/` (9 subfolders) |
| **File Count** | ~105 files (excluding DI which is covered by 51.x) |
| **Naming Convention** | camelCase files, PascalCase exports |
| **Barrel Export** | `src/core/constants/index.ts` re-exports all constants |
| **Imports From** | N/A (leaf layer — cannot import from other layers) |
| **Imported By** | ALL other layers import from Core |
| **Cannot Import** | `presentation/*`, `infrastructure/*`, `domain/*` |

---

## Description

The Core layer is the foundation of the frontend architecture — it can be imported by ALL other layers but cannot import from ANY of them. It contains DI wiring (see 51.x), configuration, constants, services, i18n, types, styles, and utility functions.

---

## Key Concepts

### 84.1 — Core Layer Overview (9 Subfolders)

```
src/core/
├── config/          (1 file)     apiConfig.ts — API path functions
├── constants/       (8 files)    App-wide constants + index.ts barrel
├── di/              (103 files)  DI factories + containers (see 51.x)
├── i18n/            (~15 files)  i18next config + locale files (see 58.x)
├── services/        (4 files)    Cross-cutting services
├── styles/          (2 files)    Global CSS (app.css, globals.css)
├── types/           (4 files)    Shared TypeScript type definitions
├── ultis/           (4 files)    ⚠️ TYPO folder (should be utils/)
└── utils/           (4 files)    Utility functions
```

### 84.2 — apiConfig.ts: API Path Functions

**File**: `src/core/config/apiConfig.ts`

All API calls use tenant-prefixed path functions:

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.4:9080';
export const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_BASE_URL || 'http://192.168.1.4:9080/idp/realms';

// Legacy exports (backward compatibility)
export const API_CORE_MNG_PATH = _API_CORE_MNG_PATH;

// Tenant-prefixed exports (use these)
export const getApiCoreMngPath = () => getTenantApiPath(_API_CORE_MNG_PATH);     // /{tenant}/common
export const getApiPageBuilderPath = () => getTenantApiPath(_API_PAGE_BUILDER_PATH); // /{tenant}/page-builder
export const getApiTenantMngPath = () => getTenantApiPath(_API_TENANT_MNG_PATH);   // /{tenant}/tenant-manager-test
export const getApiSfaMngPath = () => getTenantApiPath(_API_SFA_MNG_PATH);         // /{tenant}/sfa-manager-test
```

The `getTenantApiPath()` reads tenant key from URL via `getPathParams()`.

### 84.3 — Constants (8 files)

| File | Key Exports | Purpose |
|------|-------------|---------|
| `appConfig.ts` | App configuration | App-level config |
| `auth.ts` | Auth-related constants | Keycloak, SSO |
| `common.ts` | `APPLICATION_KEY`, field types | Application mapping keys |
| `http.ts` | HTTP status codes | Status code constants |
| `path.ts` | Route path constants | URL path definitions |
| `storage.ts` | LocalStorage keys | Storage key constants |
| `tenant.ts` | Tenant config | Multi-tenant constants |
| `index.ts` | Barrel re-export | Re-exports all constants |

**Critical**: `common.ts` exports `APPLICATION_KEY` used by `[application]/page.tsx` for routing (66 keys).

### 84.4 — Core Services (4 files)

| Service | File | Purpose | Used By |
|---------|------|---------|---------|
| `appAccessService` | `appAccessService.ts` | JWT parsing, app access check | Middleware, guards |
| `EventDelegationService` | `EventDelegationService.ts` | Custom event pub/sub | Workflow, cross-module |
| `workflowLoaderService` | `workflowLoaderService.ts` | Load workflow definitions | Workflow designer |
| `workflowScreenService` | `workflowScreenService.ts` | Screen rendering for workflow | Page builder |

These are imported by Presentation hooks and Infrastructure repositories.

### 84.5 — Core Types (4 files)

| File | Key Types | Purpose |
|------|-----------|---------|
| `api.ts` | `ApiRequestOptions` | Optional config for API calls |
| `appAccess.ts` | `IAppAccess` | App access interface |
| `notification.ts` | `INotification` | FCM notification types |
| `pageBuilder.d.ts` | `ComponentType`, etc. | Page builder ambient types |

### 84.6 — Core Styles (2 files)

```
src/core/styles/
├── app.css          ← Main stylesheet, imports Tailwind directives
└── globals.css      ← CSS variables, resets, custom properties
```

Imported by `src/app/layout.tsx`.

### 84.7 — Utils vs Ultis (TYPO Situation)

**Problem**: Both `utils/` and `ultis/` folders exist in Core:

| Folder | Files | Content |
|--------|-------|---------|
| `utils/` | 4 | appMenuMapper, jwtParser, pathParams, workflowErrorHandler |
| `ultis/` | 4 | common, formBuilderUtils, keycloak, RouteGuard.tsx |

`ultis/` is a **typo** (should be `utils/`). Both are imported across the codebase.

**Target**: Merge `ultis/` into `utils/` during source code refactor. Until then, use whichever folder the file already lives in.

---

## Anti-Patterns

- Importing from Domain, Infrastructure, or Presentation in Core layer (ESLint enforced)
- Creating new config files outside `core/config/` (keep config centralized)
- Hardcoding API URLs instead of using `getApi*Path()` functions
- Adding new constants without exporting from `index.ts` barrel
- Using `ultis/` for new files (use `utils/` — `ultis/` is legacy typo)

---

## Related Specialists

- `frontend-di-specialist.md` (51.x) — DI in `core/di/`
- `i18n-specialist.md` (58.x) — i18n in `core/i18n/`
- `nextjs-clean-architecture-specialist.md` (50.x) — Core layer placement
- `axios-interceptor-specialist.md` (54.x) — Uses apiConfig.ts paths
