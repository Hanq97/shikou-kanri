# Data Fetching Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting chain spanning 5 layers) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 62.1–62.8 |
| **Source Paths** | Chain: `presentation/` → `core/di/modules/` → `domain/use-cases/` → `infrastructure/repositories/` → `infrastructure/api/` |
| **File Count** | ~265 files participate (52 containers + 51 use-cases + 51 repo impls + 60+ API modules + components) |
| **Naming Convention** | See chain below — each layer has own naming |
| **Barrel Export** | `infrastructure/api/index.ts`, `domain/repositories/index.ts` |
| **Imports From** | Every layer imports from the next inward layer |
| **Imported By** | Presentation components are the entry point |
| **Cannot Import** | N/A (cross-cutting — defines rules rather than following them) |

---

## Description

The application uses an explicit 6-layer data fetching chain instead of RTK Query. Each layer has a single responsibility. The chain flows: Component → Container → UseCase → Repository → BaseRepository → API Client → Axios. This provides explicit control, testability at each boundary, and clean architecture compliance.

---

## Key Concepts

### 62.1 — Complete 6-Layer Chain (VERIFIED)

```
Component (Presentation)
  → Container (Core: core/di/modules/{entity}Container.ts)
    → UseCase PURE FUNCTION (Domain: domain/use-cases/{entity}Usecase.ts)
      → Repository Interface (Domain: domain/repositories/{entity}Repository.ts)
        → RepositoryImpl extends BaseRepository (Infra: infrastructure/repositories/{entity}RepositoryImpl.ts)
          → BaseRepository.executeWithErrorHandling() (Infra: infrastructure/repositories/base/baseRepository.ts)
            → API Client Object (Infra: infrastructure/api/{entity}/index.ts)
              → Axios Instance (Infra: infrastructure/api/axios.ts)
```

⚠️ **Previous version had WRONG paths**:
- ❌ `core/usecases/` → ✅ `domain/use-cases/`
- ❌ `infrastructure/api/clients/` → ✅ `infrastructure/api/{entity}/`
- ❌ `XxxUsecase.execute()` → ✅ `xxxUsecase(param, repository)` (pure function call)

### 62.2 — No RTK Query

RTK Query is NOT used. The DI factory/use-case pattern provides:
- Explicit loading state management
- Independent testability of each layer
- No query key management overhead
- Clear error propagation chain

### 62.3 — Loading State Management

Loading state is managed via local `useState` in container components (NOT Redux for loading):

```typescript
const [loading, setLoading] = useState(false);
setLoading(true);
const data = await getCustomersFactory(params);
setLoading(false);
```

Domain data that needs sharing across components goes to Redux slices.

### 62.4 — Error Propagation Chain

```
API Client → throws AxiosError
  → BaseRepository.executeWithErrorHandling() → re-throws (currently passthrough)
    → Container → catches and handles (toast, redirect, etc.)
```

The `BaseRepository.executeWithErrorHandling()` wraps every API call:
```typescript
// src/infrastructure/repositories/base/baseRepository.ts
export abstract class BaseRepository {
  protected async executeWithErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      throw error;
    }
  }
}
```

### 62.5 — Full Call Flow Example (ACTUAL Code)

**Step 1 — Component** (Presentation layer):
```typescript
// src/presentation/ui/modules/cmn001000/cmn001001_list/containers/CustomerListContainer.tsx
import { getCustomersFactory } from '@/core/di/modules/customerContainer';

const data = await getCustomersFactory(searchParams);
```

**Step 2 — Container** (Core layer):
```typescript
// src/core/di/modules/customerContainer.ts
import { getCustomerUsecase } from '@/domain/use-cases/customerUsecase';
import { createCustomerRepository } from '../factories/customerFactory';

const customerRepository = createCustomerRepository();
export const getCustomersFactory = (param: any) =>
  getCustomerUsecase(param, customerRepository);
```

**Step 3 — Use-Case** (Domain layer, PURE FUNCTION):
```typescript
// src/domain/use-cases/customerUsecase.ts
import { CustomerRepository } from '../repositories/customerRepository';

export const getCustomerUsecase = async (param: any, repository: CustomerRepository) =>
  repository.getCustomers(param);
```

**Step 4 — Repository Interface** (Domain layer):
```typescript
// src/domain/repositories/customerRepository.ts
export interface CustomerRepository {
  getCustomers(param: any): Promise<any>;
  createCustomers(payload: any): Promise<ICustomer>;
  // ...
}
```

**Step 5 — Repository Implementation** (Infrastructure layer):
```typescript
// src/infrastructure/repositories/customerRepositoryImpl.ts
import { BaseRepository } from './base/baseRepository';
import { customerApi } from '@/infrastructure/api/customer';

export class CustomerRepositoryImpl extends BaseRepository implements CustomerRepository {
  async getCustomers(param: any): Promise<ICustomer[]> {
    return this.executeWithErrorHandling(async () => {
      const response = await customerApi.getCustomers(param);
      return response.data;
    });
  }
}
```

**Step 6 — API Client** (Infrastructure layer):
```typescript
// src/infrastructure/api/customer/index.ts
import { getApiCoreMngPath } from '@/core/config/apiConfig';
import axiosInstance from '@/infrastructure/api/axios';

async function getCustomers(params: any, options?: ApiRequestOptions) {
  return axiosInstance.post(getApiCoreMngPath() + '/api/customers/search', params, {
    ...(options || {}),
  });
}

export const customerApi = {
  getCustomers,
  createCustomers,
  updateCustomers,
  // ...
};
```

### 62.6 — API Base Path Configuration

All API calls use tenant-prefixed path functions from `src/core/config/apiConfig.ts`:

```typescript
// Returns: /{tenantKey}/{basePath}
export const getApiCoreMngPath = () => getTenantApiPath(_API_CORE_MNG_PATH);     // → /{tenant}/common
export const getApiPageBuilderPath = () => getTenantApiPath(_API_PAGE_BUILDER_PATH); // → /{tenant}/page-builder
export const getApiTenantMngPath = () => getTenantApiPath(_API_TENANT_MNG_PATH);   // → /{tenant}/tenant-manager-test
export const getApiSfaMngPath = () => getTenantApiPath(_API_SFA_MNG_PATH);         // → /{tenant}/sfa-manager-test
```

The `getTenantApiPath()` helper reads tenant key from URL via `getPathParams()`:
```typescript
const getTenantApiPath = (basePath: string): string => {
  const { tenantKey } = getPathParams();
  return tenantKey ? `/${tenantKey}${basePath}` : basePath;
};
```

### 62.7 — Repository Implementation Pattern

ALL 51 repository implementations follow this exact structure:

```typescript
export class {Entity}RepositoryImpl extends BaseRepository implements {Entity}Repository {
  async {method}(args): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      const response = await {entity}Api.{method}(args);
      return response.data;  // Always unwrap .data from AxiosResponse
    });
  }
}
```

Key pattern:
1. `extends BaseRepository` — gets `executeWithErrorHandling()`
2. `implements {Entity}Repository` — satisfies domain interface contract
3. Every method wraps API call in `this.executeWithErrorHandling()`
4. Always returns `response.data` (unwraps Axios response wrapper)

### 62.8 — API Client Object Export Pattern

60+ API modules use the same structure:

```typescript
// src/infrastructure/api/{entity}/index.ts
import { getApiCoreMngPath } from '@/core/config/apiConfig';
import axiosInstance from '@/infrastructure/api/axios';

// Named async functions (private)
async function getXxx(params: any, options?: ApiRequestOptions) {
  return axiosInstance.post(getApiCoreMngPath() + '/api/xxx/search', params, {
    ...(options || {}),
  });
}

// Object export (public API)
export const xxxApi = {
  getXxx,
  createXxx,
  updateXxx,
  deleteXxx,
};
```

Pattern details:
- Named functions defined first, then exported via single object
- `options?: ApiRequestOptions` parameter on every function
- Uses `getApiCoreMngPath()` (or `getApiSfaMngPath()`, etc.) for base URL
- POST for search, POST for create, PUT for update, DELETE for delete, GET for detail/list
- Returns raw `AxiosResponse` (repository impl unwraps `.data`)

---

## Anti-Patterns

- Calling API clients directly from React components (bypass DI chain)
- Using `fetch()` instead of the shared Axios instance
- Using `.execute()` on use-case objects (use-cases are pure functions, not classes)
- Importing from `infrastructure/api/clients/` (WRONG path — it's `infrastructure/api/{entity}/`)
- Referencing `core/usecases/` (WRONG path — it's `domain/use-cases/`)
- Skipping `executeWithErrorHandling()` in repository implementations
- Returning `response` instead of `response.data` from repository implementations
- Creating class-based API clients (use object export pattern)

---

## Related Specialists

- `frontend-di-specialist.md` (51.x) — Factory/container wiring (Step 2 of chain)
- `axios-interceptor-specialist.md` (54.x) — Axios instance and interceptors
- `redux-toolkit-specialist.md` (53.x) — Store for shared domain data
- `nextjs-clean-architecture-specialist.md` (50.x) — Layer placement of each chain link
- `base-repository-specialist.md` (88.x) — BaseRepository abstract class detail
- `api-client-specialist.md` (87.x) — API module structure detail
