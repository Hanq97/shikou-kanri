# Base Repository Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 88.1–88.5 |
| **Source Paths** | `src/infrastructure/repositories/base/baseRepository.ts`, `src/infrastructure/repositories/` (51 impl files) |
| **File Count** | 1 base + 51 implementations = 52 files |
| **Naming Convention** | `{entity}RepositoryImpl.ts` |
| **Barrel Export** | N/A (direct imports) |
| **Imports From** | Infrastructure: API client objects; Domain: repository interfaces |
| **Imported By** | Core: DI factories instantiate repository impls |
| **Cannot Import** | `presentation/*` |

---

## Description

`BaseRepository` is an abstract class that provides `executeWithErrorHandling<T>()` — a try/catch wrapper used by ALL 51 repository implementations. Every API call in the repository layer goes through this method.

---

## Key Concepts

### 88.1 — BaseRepository Abstract Class

```typescript
// src/infrastructure/repositories/base/baseRepository.ts (10 lines)
export abstract class BaseRepository {
  protected async executeWithErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      throw error;  // Currently passthrough — can add logging/transformation
    }
  }
}
```

**Currently**: Simple re-throw. The value is a centralized place to add error logging, transformation, or retry logic in the future.

### 88.2 — Repository Implementation Pattern

ALL 51 implementations follow this structure:

```typescript
// src/infrastructure/repositories/{entity}RepositoryImpl.ts
import { {Entity}Repository } from '@/domain/repositories/{entity}Repository';
import { {entity}Api } from '@/infrastructure/api/{entity}';
import { BaseRepository } from './base/baseRepository';

export class {Entity}RepositoryImpl extends BaseRepository implements {Entity}Repository {
  async {method}(args: any): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      const response = await {entity}Api.{method}(args);
      return response.data;  // Always unwrap .data
    });
  }
  // ... more methods following same pattern
}
```

**Key invariants**:
1. `extends BaseRepository` — gets `executeWithErrorHandling()`
2. `implements {Entity}Repository` — satisfies domain interface contract
3. Every method wraps API call in `this.executeWithErrorHandling()`
4. Always returns `response.data` (unwraps Axios response)

### 88.3 — Repository-to-API-Client Wiring

```
{Entity}RepositoryImpl
  ├── extends BaseRepository (gets executeWithErrorHandling)
  ├── implements {Entity}Repository (satisfies domain interface)
  └── imports {entity}Api (infrastructure API client object)
```

The repository impl is the BRIDGE between domain contract and infrastructure API.

**Concrete example** — `CustomerRepositoryImpl`:

```typescript
// src/infrastructure/repositories/customerRepositoryImpl.ts
import { CustomerRepository } from '@/domain/repositories/customerRepository';
import { customerApi } from '@/infrastructure/api/customer';
import { BaseRepository } from './base/baseRepository';

export class CustomerRepositoryImpl extends BaseRepository implements CustomerRepository {
  async getCustomers(params: any): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const response = await customerApi.getCustomers(params);
      return response.data;
    });
  }

  async createCustomers(payload: any): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const response = await customerApi.createCustomers(payload);
      return response.data;
    });
  }
}
```

DI wiring in `src/core/di/factories/customerFactory.ts`:
```typescript
export const createCustomerContainer = () => {
  const repository = new CustomerRepositoryImpl();
  return { getCustomers: repository.getCustomers.bind(repository), ... };
};
```

### 88.4 — Error Propagation Chain

```
API Client → throws AxiosError
  → BaseRepository.executeWithErrorHandling() → re-throws
    → Container function → throws to component
      → Component → catches and handles (notification, redirect)
```

### 88.5 — How to Add a New Repository

1. Create domain interface: `src/domain/repositories/{entity}Repository.ts`
2. Create API client: `src/infrastructure/api/{entity}/index.ts` (see 87.x)
3. Create implementation:
   ```typescript
   // src/infrastructure/repositories/{entity}RepositoryImpl.ts
   import { {Entity}Repository } from '@/domain/repositories/{entity}Repository';
   import { {entity}Api } from '@/infrastructure/api/{entity}';
   import { BaseRepository } from './base/baseRepository';

   export class {Entity}RepositoryImpl extends BaseRepository implements {Entity}Repository {
     async getAll(): Promise<I{Entity}[]> {
       return this.executeWithErrorHandling(async () => {
         const response = await {entity}Api.getAll();
         return response.data;
       });
     }
   }
   ```
4. Create DI factory: `src/core/di/factories/{entity}Factory.ts` (see 51.x)

---

## Anti-Patterns

- Skipping `executeWithErrorHandling()` in repository methods
- Returning `response` instead of `response.data`
- Not extending `BaseRepository` for new repositories
- Putting error handling in API client instead of repository
- Importing API client objects in Presentation layer (go through DI chain)

---

## Related Specialists

- `data-fetching-specialist.md` (62.x) — Repository's place in the chain
- `api-client-specialist.md` (87.x) — API clients consumed by repositories
- `frontend-di-specialist.md` (51.x) — Factories that instantiate repositories
- `nextjs-clean-architecture-specialist.md` (50.x) — Infrastructure layer placement
