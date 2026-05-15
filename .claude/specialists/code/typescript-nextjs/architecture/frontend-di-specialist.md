# Frontend Dependency Injection Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core (`factories/` + `modules/`) + Domain (`use-cases/`) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 51.1–51.7 |
| **Source Paths** | `src/core/di/factories/` (50 files), `src/core/di/modules/` (52 files), `src/domain/use-cases/` (51 files) |
| **File Count** | 153 total (50 factories + 52 containers + 51 use-cases) |
| **Naming Convention** | `{entity}Factory.ts`, `{entity}Container.ts`, `{entity}Usecase.ts` |
| **Barrel Export** | `src/core/di/index.ts` re-exports containers; `src/domain/repositories/index.ts` re-exports repo interfaces |
| **Imports From** | Domain: repository interfaces; Infrastructure: repository implementations |
| **Imported By** | Presentation: components import container functions |
| **Cannot Import** | `presentation/*`, `infrastructure/*` |

---

## Description

The application uses **manual, framework-free DI** — no InversifyJS, no tsyringe, no decorators. Dependency injection is implemented through a 3-file chain: Factory → Use-Case → Container. Use-cases are **pure async functions** (NOT classes). Containers are the public API consumed by React components.

---

## Key Concepts

### 51.1 — FLAT Folder Structure

⚠️ **CRITICAL**: DI folders are FLAT (not entity-grouped):

```
src/core/di/
├── factories/                    ← 50 files
│   ├── customerFactory.ts
│   ├── authFactory.ts
│   ├── scheduleFactory.ts
│   ├── opportunityFactory.ts
│   └── ... (50 total)
├── modules/                      ← 52 files
│   ├── customerContainer.ts
│   ├── authContainer.ts
│   ├── scheduleContainer.ts
│   ├── opportunityContainer.ts
│   └── ... (52 total)
└── index.ts                      ← barrel re-export
```

**DO NOT** create nested entity folders like `src/core/di/customer/factory.ts` — this is WRONG.

### 51.2 — Use-Cases Are PURE FUNCTIONS (NOT Classes)

Every use-case is an exported `async` arrow function. No constructor, no `.execute()`, no `this`.

```typescript
// ✅ ACTUAL pattern: src/domain/use-cases/customerUsecase.ts
export const getCustomerUsecase = async (param: any, repository: CustomerRepository) =>
  repository.getCustomers(param);

export const createCustomerUsecase = async (repository: CustomerRepository, payload: any) => {
  return repository.createCustomers(payload);
};

// ❌ WRONG — DO NOT generate class-based use-cases:
// export class GetCustomersUseCase {
//   constructor(private readonly repository: CustomerRepository) {}
//   async execute(params: any): Promise<ICustomer[]> { ... }
// }
```

Each use-case file contains MULTIPLE related functions (not one per file):
- `customerUsecase.ts` → 14 functions (getCustomer, createCustomer, updateCustomer, etc.)
- `authUsecase.ts` → auth-related functions
- `scheduleUsecase.ts` → schedule-related functions

### 51.3 — 3-File DI Chain (Factory → Use-Case → Container)

**Layer 1 — Factory** (creates repository instance):
```typescript
// src/core/di/factories/customerFactory.ts
import { CustomerRepository } from '@/domain/repositories/customerRepository';
import { CustomerRepositoryImpl } from '@/infrastructure/repositories/customerRepositoryImpl';

export const createCustomerRepository = (): CustomerRepository => new CustomerRepositoryImpl();
```

**Layer 2 — Use-Case** (pure function, repo as parameter):
```typescript
// src/domain/use-cases/customerUsecase.ts
import { CustomerRepository } from '../repositories/customerRepository';

export const getCustomerUsecase = async (param: any, repository: CustomerRepository) =>
  repository.getCustomers(param);
export const createCustomerUsecase = async (repository: CustomerRepository, payload: any) =>
  repository.createCustomers(payload);
```

**Layer 3 — Container** (wires factory + use-case, exported as public API):
```typescript
// src/core/di/modules/customerContainer.ts
import { getCustomerUsecase, createCustomerUsecase } from '@/domain/use-cases/customerUsecase';
import { createCustomerRepository } from '../factories/customerFactory';

const customerRepository = createCustomerRepository();

export const getCustomersFactory = (param: any) =>
  getCustomerUsecase(param, customerRepository);
export const createCustomersFactory = (payload: any) =>
  createCustomerUsecase(customerRepository, payload);
```

**Component usage**:
```typescript
// src/presentation/ui/modules/cmn001000/cmn001001_list/containers/CustomerListContainer.tsx
import { getCustomersFactory } from '@/core/di/modules/customerContainer';

const data = await getCustomersFactory(searchParams);
```

### 51.4 — Container Wiring Pattern

Container calls: `usecase(args..., repository)` — NO `new`, NO `.execute()`:

```typescript
// ✅ CORRECT container wiring:
const repo = createCustomerRepository();
export const getCustomersFactory = (param) => getCustomerUsecase(param, repo);

// ❌ WRONG — do NOT generate:
// const usecase = new GetCustomersUseCase(repo);
// export const getCustomers = (param) => usecase.execute(param);
```

### 51.5 — Parameter Order INCONSISTENCY

⚠️ Use-case parameter order is **NOT consistent** across the codebase. Some put repo first, others put param first:

| Pattern | Example | Files Using |
|---------|---------|-------------|
| `(param, repository)` | `getCustomerUsecase(param, repository)` | ~40% of use-cases |
| `(repository, payload)` | `createCustomerUsecase(repository, payload)` | ~60% of use-cases |
| `(repository, id)` | `getCustomersByIdUsecase(repository, id)` | ID-based lookups |

**Target standard**: `(repository, ...args)` — repository always first. But current code has BOTH patterns. The container adjusts argument order to match.

### 51.6 — Container Export Naming

| Prefix | Operation | Example | Signature |
|--------|-----------|---------|-----------|
| `get{Entity}Factory` | Fetch list | `getCustomersFactory(param)` | `(param) => usecase(param, repo)` |
| `get{Entity}ByIdFactory` | Fetch by ID | `getCustomersByIdFactory(id)` | `(id) => usecase(repo, id)` |
| `create{Entity}Factory` | Create | `createCustomersFactory(payload)` | `(payload) => usecase(repo, payload)` |
| `update{Entity}Factory` | Update | `updateCustomersFactory(payload)` | `(payload) => usecase(repo, payload)` |
| `delete{Entity}Factory` | Delete | `deleteCustomerFactory(id)` | `(id) => usecase(repo, id)` |
| `getAll{Entity}Factory` | Fetch all | `getAllCustomersFactory()` | `() => usecase(repo)` |

⚠️ Note the naming: container exports end with `Factory` suffix (e.g., `getCustomersFactory`, NOT `getCustomers`).

### 51.7 — Factory File Pattern

All 50 factory files follow the same structure:

```typescript
// src/core/di/factories/{entity}Factory.ts
import { {Entity}Repository } from '@/domain/repositories/{entity}Repository';
import { {Entity}RepositoryImpl } from '@/infrastructure/repositories/{entity}RepositoryImpl';

export const create{Entity}Repository = (): {Entity}Repository => new {Entity}RepositoryImpl();
```

The factory:
1. Imports the **interface** from Domain
2. Imports the **implementation** from Infrastructure
3. Exports a creator function that returns the interface type
4. This is the ONLY place that `new` is used for repositories

---

## Code Examples

### Complete DI Chain — Customer (Patterns 51.1–51.4)

```typescript
// === Step 1: Factory (Core layer) ===
// src/core/di/factories/customerFactory.ts
import { CustomerRepository } from '@/domain/repositories/customerRepository';
import { CustomerRepositoryImpl } from '@/infrastructure/repositories/customerRepositoryImpl';

export const createCustomerRepository = (): CustomerRepository => new CustomerRepositoryImpl();

// === Step 2: Use-Case (Domain layer) ===
// src/domain/use-cases/customerUsecase.ts
import { CustomerRepository } from '../repositories/customerRepository';

export const getCustomerUsecase = async (param: any, repository: CustomerRepository) =>
  repository.getCustomers(param);
export const createCustomerUsecase = async (repository: CustomerRepository, payload: any) =>
  repository.createCustomers(payload);

// === Step 3: Container (Core layer) ===
// src/core/di/modules/customerContainer.ts
import { getCustomerUsecase, createCustomerUsecase } from '@/domain/use-cases/customerUsecase';
import { createCustomerRepository } from '../factories/customerFactory';

const customerRepository = createCustomerRepository();

export const getCustomersFactory = (param: any) => getCustomerUsecase(param, customerRepository);
export const createCustomersFactory = (payload: any) => createCustomerUsecase(customerRepository, payload);

// === Step 4: Component usage (Presentation layer) ===
// Imports from container — never from factory or use-case directly
import { getCustomersFactory } from '@/core/di/modules/customerContainer';

const data = await getCustomersFactory(searchParams);
```

---

## Anti-Patterns

- **Generating class-based use-cases** with constructor injection (use pure functions)
- **Using `new UseCase(repo).execute()`** pattern (use `usecase(param, repo)` instead)
- **Creating entity-grouped DI folders** (`src/core/di/customer/`) — use flat `factories/` and `modules/`
- **Importing factories in components** (import containers only — factories are internal)
- **Importing infrastructure directly in presentation** (go through Core DI layer)
- **Using React context as a DI container** (blurs architecture)
- **Sharing a single global repo instance across modules** (each container creates its own via factory)

---

## Related Specialists

- `nextjs-clean-architecture-specialist.md` (50.x) — Layer boundaries
- `data-fetching-specialist.md` (62.x) — Complete data chain
- `module-organization-specialist.md` (63.x) — Where containers are imported
- `base-repository-specialist.md` (88.x) — BaseRepository that repo impls extend
- `api-client-specialist.md` (87.x) — API clients used by repo impls
