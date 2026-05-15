# API Client Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 87.1–87.5 |
| **Source Paths** | `src/infrastructure/api/` (60+ entity subfolders) |
| **File Count** | 60+ API modules |
| **Naming Convention** | `{entity}/index.ts` (kebab-case entity folder) |
| **Barrel Export** | `src/infrastructure/api/index.ts` |
| **Imports From** | Core: `apiConfig.ts` (path functions), `types/api.ts` |
| **Imported By** | Infrastructure: repository implementations import API client objects |
| **Cannot Import** | `presentation/*` |

---

## Description

Each API module lives in its own folder (`infrastructure/api/{entity}/`) and exports a single API client object. Functions are defined first as named async functions, then grouped into an exported object. This is NOT a class pattern.

---

## Key Concepts

### 87.1 — API Module Folder Structure

```
src/infrastructure/api/
├── axios.ts                  ← Singleton Axios instance (see 54.x)
├── index.ts                  ← Barrel re-export
├── auth/index.ts             ← Auth API client
├── category/index.ts         ← Category API client
├── common/index.ts           ← Common/shared API client
├── customer/index.ts         ← Customer API client
├── dashboard/index.ts        ← Dashboard API client
├── function/index.ts         ← Function management
├── function-orgzs/index.ts   ← Function organizations
├── information/index.ts      ← Information/announcements
├── job-position/index.ts     ← Job position management
├── mail/index.ts             ← Mail API client
├── manage-data-fields/index.ts ← Data field management
├── opportunity/index.ts      ← Opportunity (SFA)
├── schedule/index.ts         ← Schedule/calendar
├── ... (60+ total)
```

### 87.2 — Object Export Pattern (NOT Class)

```typescript
// ✅ ACTUAL pattern: src/infrastructure/api/customer/index.ts
import { getApiCoreMngPath } from '@/core/config/apiConfig';
import { ApiRequestOptions } from '@/core/types/api';
import axiosInstance from '@/infrastructure/api/axios';

// Step 1: Define named async functions
async function getCustomers(params: any, options?: ApiRequestOptions) {
  return axiosInstance.post(getApiCoreMngPath() + '/api/customers/search', params, {
    ...(options || {}),
  });
}

async function createCustomers(payload: any, options?: ApiRequestOptions) {
  return axiosInstance.post(getApiCoreMngPath() + '/api/customers/create', payload, options);
}

async function updateCustomers(payload: any, options?: ApiRequestOptions) {
  return axiosInstance.put(getApiCoreMngPath() + '/api/customers/update', payload, options);
}

// Step 2: Export as single object
export const customerApi = {
  getCustomers,
  createCustomers,
  updateCustomers,
  getCustomersById,
  getEmployeesById,
  getAllCustomers,
  // ...
};

// ❌ WRONG — do NOT generate class-based API clients:
// export class CustomerApiService {
//   static async getCustomers(params: any) { ... }
// }
```

### 87.3 — API Base Path Integration

Every API function uses a path function from `core/config/apiConfig.ts`:

| Backend Service | Path Function | Returns |
|----------------|---------------|---------|
| Core Manager | `getApiCoreMngPath()` | `/{tenantKey}/common` |
| SFA Manager | `getApiSfaMngPath()` | `/{tenantKey}/sfa-manager-test` |
| Page Builder | `getApiPageBuilderPath()` | `/{tenantKey}/page-builder` |
| Tenant Manager | `getApiTenantMngPath()` | `/{tenantKey}/tenant-manager-test` |

### 87.4 — Request Conventions

| HTTP Method | Operation | URL Pattern | Body |
|-------------|-----------|-------------|------|
| POST | Search/List | `/api/{entity}/search` | Search params |
| POST | Create | `/api/{entity}/create` | Entity data |
| PUT | Update | `/api/{entity}/update` | Entity data |
| DELETE | Delete | `/api/{entity}/delete_multi` | `{ data: payload }` |
| GET | Detail | `/api/{entity}/detail?id={id}` | Query param |
| GET | All | `/api/{entity}/all` | — |

**Important**: DELETE uses `{ data: payload }` config (Axios requires data in config for DELETE).

### 87.5 — How to Add a New API Module

1. Create folder: `src/infrastructure/api/{entity}/`
2. Create `index.ts` with named functions + object export
3. Use appropriate `getApi*Path()` for base URL
4. Add `options?: ApiRequestOptions` parameter to all functions
5. Export object: `export const {entity}Api = { ... }`
6. Add to barrel: `src/infrastructure/api/index.ts`

---

## Anti-Patterns

- Creating class-based API clients (use object export pattern)
- Hardcoding API base URLs (use `getApi*Path()` functions)
- Omitting `options?: ApiRequestOptions` parameter
- Importing `axiosInstance` by name (it's a default export: `import axiosInstance from '../axios'`)
- Putting API logic in Presentation layer (belongs in Infrastructure)
- Using `fetch()` instead of shared Axios instance

---

## Related Specialists

- `axios-interceptor-specialist.md` (54.x) — Axios instance and interceptors
- `data-fetching-specialist.md` (62.x) — Where API clients sit in the chain
- `base-repository-specialist.md` (88.x) — Repositories that consume API clients
- `core-layer-specialist.md` (84.x) — apiConfig.ts path functions
