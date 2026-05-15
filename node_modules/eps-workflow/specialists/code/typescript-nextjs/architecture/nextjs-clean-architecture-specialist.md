# Next.js Clean Architecture Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting architecture definition) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 50.1–50.10 |
| **Source Paths** | `src/app/`, `src/core/`, `src/domain/`, `src/infrastructure/`, `src/presentation/` |
| **File Count** | ~925 total files across 5 layers |
| **Naming Convention** | Layer-based folder structure, `@/` path aliases |
| **Barrel Export** | Per-layer `index.ts` files (e.g., `domain/entities/index.ts`) |
| **Imports From** | N/A (this IS the architecture) |
| **Imported By** | N/A (all specialists follow this architecture) |
| **Cannot Import** | N/A (cross-cutting — defines rules rather than following them) |

---

## Description

The application uses **5-layer** clean architecture in Next.js App Router. Each layer has strict import direction rules. The App layer (Next.js routing) is distinct from Presentation (React components). ESLint enforces layer boundaries at build time.

---

## Key Concepts

### 50.1 — Five Architecture Layers

| Layer | Location | Files | Key Contents |
|-------|----------|-------|-------------|
| **App** | `src/app/` | ~91 | Next.js App Router pages, layouts, middleware, route groups |
| **Core** | `src/core/` | ~105 | DI (50 factories + 52 containers), config, constants, services, i18n |
| **Domain** | `src/domain/` | ~154 | 39 entity interfaces, 51 repository interfaces, 51 use-case files |
| **Infrastructure** | `src/infrastructure/` | ~127 | 60+ API modules, 51 repo impls, Redux store (4 slices) |
| **Presentation** | `src/presentation/` | ~476 | 15 hooks, 8 providers, 26 UI modules (100+ submodules) |
| **Total** | | **~925** | |

**NOTE**: 5 layers NOT 4. The App layer is the Next.js composition root — it imports from ALL other layers.

### 50.2 — Path Aliases (tsconfig.json)

6 path aliases defined:

```json
{
  "paths": {
    "@/*":               ["./src/*"],
    "@/domain/*":        ["./src/domain/*"],
    "@/core/*":          ["./src/core/*"],
    "@/infrastructure/*": ["./src/infrastructure/*"],
    "@/presentation/*":  ["./src/presentation/*"],
    "@/app/*":           ["./src/app/*"]
  }
}
```

```typescript
// ✅ Correct — always use @/ layer-qualified imports
import { ICustomer } from '@/domain/entities/customer';
import { createCustomerRepository } from '@/core/di/factories/customerFactory';
import { usePermission } from '@/presentation/hooks/usePermission';

// ❌ Wrong — never use relative imports across layers
import { ICustomer } from '../../../domain/entities/customer';
```

### 50.3 — ESLint Clean Architecture Enforcement

File: `eslint.config.mjs` (lines 89–107) — 3 `no-restricted-imports` patterns:

```javascript
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['src/domain/*'],
      message: 'Domain layer should not import from presentation or infrastructure layers',
    },
    {
      group: ['src/presentation/*'],
      message: 'Presentation layer should not import from infrastructure layer',
    },
    {
      group: ['src/infrastructure/*'],
      message: 'Infrastructure layer should not import from presentation layer',
    },
  ],
}]
```

These prevent raw `src/` imports that bypass layer boundaries. All code must use `@/` aliases.

### 50.4 — Import Direction Rules

```
App (composition root) ──→ can import from ALL layers
         │
         ▼
Presentation ──→ Domain, Core
         │
         ▼
Infrastructure ──→ Domain, Core
         │
         ▼
Domain ──→ Core (only)
         │
         ▼
Core ──→ NOTHING (leaf layer)
```

| From | Can Import | Cannot Import |
|------|-----------|--------------|
| App | All layers | — (composition root) |
| Presentation | Domain, Core | Infrastructure (use Core DI containers) |
| Infrastructure | Domain, Core | Presentation |
| Domain | Core | Presentation, Infrastructure |
| Core | — | Any other layer |

**Special case**: Presentation imports from Infrastructure's store hooks (`useAppDispatch`, `useAppSelector`) — this is allowed because store hooks re-export typed wrappers, not raw infrastructure.

### 50.5 — TypeScript Strict Mode

`strict: true` in tsconfig.json. `@typescript-eslint/no-explicit-any` is OFF — `any` is used in use-cases and containers for flexibility.

### 50.6 — Entity Naming Convention (I-Prefix)

- All 39 entity **interfaces** use `I` prefix: `ICustomer`, `IScreen`, `IBlock`, `IAuthModel`
- **Files** are lowercase without I-prefix: `customer.ts`, `auth.ts`, `organization.ts`
- Import pattern: `import { ICustomer } from '@/domain/entities/customer'`

```
src/domain/entities/
├── customer.ts          → exports ICustomer, IEmployees
├── auth.ts              → exports IAuthModel
├── common.ts            → exports IDataField, IDataSource, IScreenFilter, ITenantUser
├── category.ts          → exports ICategoryDetail
├── screen.ts            → exports IScreen
├── organization.ts      → exports IOrganization
├── tenant/              → subdirectory for tenant-specific entities
├── workflowRuntime/     → subdirectory for workflow entities
├── tenantAppConfig/     → subdirectory for tenant app config
└── index.ts             → barrel re-export
```

⚠️ Known typo: `opporttunity.ts` (double t)

### 50.7 — Layer Dependency Graph (ASCII)

```
┌─────────────────────────────────────────────────┐
│                  APP LAYER                       │
│  src/app/ — Next.js router, layouts, middleware  │
│  Can import: ALL layers (composition root)       │
└──────────┬──────────────────────────┬────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────┐
│  PRESENTATION       │    │  INFRASTRUCTURE          │
│  src/presentation/  │    │  src/infrastructure/     │
│  Components, hooks, │    │  API clients, repos,     │
│  providers, modules │    │  store, Redux slices     │
└──────────┬──────────┘    └──────────┬───────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────┐
│                 DOMAIN LAYER                     │
│  src/domain/ — Entities, repository interfaces,  │
│  use-case pure functions                         │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│                  CORE LAYER                      │
│  src/core/ — DI factories/containers, config,    │
│  constants, services, i18n, types                │
└─────────────────────────────────────────────────┘
```

### 50.8 — Core Layer Subfolders (9 subfolders)

```
src/core/
├── config/          (1 file: apiConfig.ts — API path functions)
├── constants/       (9 files: appConfig, auth, common, http, index, path, storage, tenant)
├── di/              (factories/ 50 files + modules/ 52 files + index.ts)
├── i18n/            (i18n.tsx + locales/en-US/ + locales/ja-JP/)
├── services/        (4 files: appAccessService, EventDelegationService, workflowLoaderService, workflowScreenService)
├── styles/          (2 files: app.css, globals.css)
├── types/           (4 files: api, appAccess, notification, pageBuilder.d.ts)
├── ultis/           ⚠️ TYPO folder (3 files: common, formBuilderUtils, keycloak, RouteGuard.tsx)
└── utils/           (4 files: appMenuMapper, jwtParser, pathParams, workflowErrorHandler)
```

### 50.9 — Domain Layer Structure

```
src/domain/
├── entities/        (39 files — I-prefixed interfaces)
├── repositories/    (51 files — interface contracts)
└── use-cases/       (51 files — pure functions, NOT classes)
```

All 51 repository definitions are `interface` (NOT `abstract class`):
```typescript
export interface CustomerRepository {
  getCustomers(param: any): Promise<any>;
  createCustomers(payload: any): Promise<ICustomer>;
  // ...
}
```

All 51 use-cases are **pure functions** (see 51.x DI specialist for details):
```typescript
export const getCustomerUsecase = async (param: any, repository: CustomerRepository) =>
  repository.getCustomers(param);
```

### 50.10 — Frontend Module Codes (26 modules)

| Code | Module | Description |
|------|--------|-------------|
| `cmn001000` | Customer | Customer management (CRUD + detail) |
| `cmn002000` | Category | Category/master management |
| `cmn005000` | User/Permission | User management, roles, permissions |
| `cmn007000` | Schedule | Calendar, schedule, TODO |
| `cmn009000` | Mail | Email server management |
| `cmn010000` | Document | Document management |
| `cmn011000` | Template | Template management |
| `cmn012000` | Information | Information/announcement management |
| `cmn013000` | Dashboard | Dashboard |
| `cmn014000` | Report | Report management |
| `cmn015000` | Workflow | Workflow designer (ReactFlow) |
| `cmn016000` | Tag | Tag management |
| `cmn017000` | Notification | Notification management |
| `cmn020000` | Import | Import management |
| `ctm001000` | Page Builder | Dynamic page builder |
| `sfa001000` | Opportunity | Sales opportunity management |
| `sfa002000` | Activity | Sales activity tracking |
| `sfa003000` | Quotation | Quotation management |
| `sfa004000` | Lead | Lead management |
| `sfa005000` | Sales Target | Sales target tracking |
| `sfa006000` | Sales Report | Sales reporting |
| `tnt001000` | Tenant Reg | Tenant registration |
| `tnt002000` | Tenant Admin | Tenant administration |
| `tnt003000` | Tenant Setup | Tenant setup |
| `error` | Error | Error pages (404, 500) |
| `login` | Login | Login screen |
| `setting` | Setting | User settings |
| `home` | Home | Home/dashboard |

**Location**: `src/presentation/ui/modules/{code}_{name}/`

**Submodule pattern**: `{code}/{subcode}_{action}/` — e.g., `cmn001000/cmn001001_list/`, `cmn001000/cmn001002_edit/`

---

## Code Examples

### Domain Entity (Pattern 50.6)

```typescript
// src/domain/entities/customer.ts
// File: lowercase, NO I-prefix in filename
// Exports: I-prefixed interfaces
export interface ICustomer {
  id: number;
  logo_fileId: string;
  customer_code: string;
  customer_name: string;
  customer_nameJsc: string;
  career: string;
  email_address: string;
  address: string;
  fax_number: string;
  mobile_number: string;
  url: string;
  note: string;
  addition_data: string;
}
```

### Repository Interface (Pattern 50.9)

```typescript
// src/domain/repositories/customerRepository.ts
// NOTE: interface, NOT abstract class
import { ICustomer, IEmployees } from '../entities/customer';

export interface CustomerRepository {
  createCustomers(payload: any): Promise<ICustomer>;
  updateCustomers(payload: any): Promise<ICustomer>;
  getCustomers(param: any): Promise<any>;
  getCustomersById(id: string): Promise<any>;
  // ...
}
```

---

## Anti-Patterns

- Importing infrastructure clients directly inside React components (use Core DI containers)
- Putting business logic inside Next.js page files (belongs in Domain use-cases)
- Using raw `src/` imports instead of `@/` path aliases
- Creating class-based use-cases (use pure functions — see 51.x)
- Circular imports between layers
- Placing API URLs in domain or presentation files (belongs in `core/config/apiConfig.ts`)
- Documenting 4 layers (there are 5 — App is distinct from Presentation)

---

## Related Specialists

- `frontend-di-specialist.md` (51.x) — Factory/container wiring
- `data-fetching-specialist.md` (62.x) — Component to API chain
- `module-organization-specialist.md` (63.x) — Feature module layout
- `core-layer-specialist.md` (84.x) — Core layer details
- `redux-toolkit-specialist.md` (53.x) — Store in Infrastructure layer

---

## Standard Deviations (Known Issues)

| File/Path | Issue | Target Fix |
|-----------|-------|------------|
| `src/core/ultis/` | Typo folder (should be `utils/`) | Merge into `src/core/utils/` |
| `opporttunity.ts` | Double t typo in entity filename | Rename to `opportunity.ts` |
| `@typescript-eslint/no-explicit-any: 'off'` | `any` used broadly | Gradually type all use-cases |
