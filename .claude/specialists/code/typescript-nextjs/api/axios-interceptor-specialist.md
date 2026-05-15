# Axios Interceptor Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 54.1–54.9 |
| **Source Paths** | `src/infrastructure/api/axios.ts`, `src/infrastructure/api/` (60+ entity modules) |
| **File Count** | 1 axios instance + 60+ API modules |
| **Naming Convention** | `axios.ts` for instance, `{entity}/index.ts` for API modules |
| **Barrel Export** | `src/infrastructure/api/index.ts` |
| **Imports From** | Core: `apiConfig.ts` (path functions), `constants/` |
| **Imported By** | Infrastructure: repository implementations import API clients |
| **Cannot Import** | `presentation/*` |

---

## Description

All HTTP communication goes through a single Axios instance (`src/infrastructure/api/axios.ts`) with request and response interceptors. The request interceptor injects JWT and tenant headers. The response interceptor handles 401 errors with token refresh queue. API modules in entity subfolders export client objects consumed by repository implementations.

---

## Key Concepts

### 54.1 — Axios Instance

```typescript
// src/infrastructure/api/axios.ts (NOT axiosInstance.ts)
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,  // From core/config/apiConfig.ts
  timeout: 20_000,
  withCredentials: true,
});

export default axiosInstance;
```

⚠️ File name is `axios.ts`, NOT `axiosInstance.ts`. Export is `default`.

### 54.2 — Request Interceptor

Injects multi-tenant headers on every request:
- `Authorization: Bearer {accessToken}` from cookie/localStorage
- `x-tenant-key: {tenantKey}` from current route

### 54.3 — Response Interceptor with Refresh Queue

On 401 response:
1. Set `isRefreshing = true`
2. Queue all concurrent requests as Promise callbacks
3. Call `refreshAccessToken()`
4. On success: replay queued requests with new token
5. On failure: redirect to `/login`, flush queue with rejection

### 54.4 — refreshAccessToken Flow

Calls auth server refresh endpoint with refresh token from httpOnly cookie. Returns new access token.

### 54.5 — Multi-Tenant Header Pattern

Every API request includes tenant context via `getApiCoreMngPath()` which prepends `/{tenantKey}` to the base path:

```typescript
// API call in: infrastructure/api/customer/index.ts
axiosInstance.post(getApiCoreMngPath() + '/api/customers/search', params);
// Resolved URL: /{tenantKey}/common/api/customers/search
```

The tenant key comes from URL path, NOT from a header. The path functions (`getApiCoreMngPath()`, `getApiSfaMngPath()`, etc.) handle this automatically.

### 54.6 — getPathParams() Utility

```typescript
// src/core/utils/pathParams.ts — PLAIN function, NOT a React hook
export function getPathParams(): PathParams {
  const segments = window.location.pathname.split('/').filter(Boolean);
  return {
    tenantKey: segments[0] ?? '',
    prefix: segments[1] ?? '',
    application: segments[2] ?? '',
  };
}
```

Used by `apiConfig.ts` to prepend tenant key to API paths.

### 54.7 — Token Refresh Queue Pattern

```typescript
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}
```

### 54.8 — API Module Folder Structure

```
src/infrastructure/api/
├── axios.ts                    ← Singleton Axios instance
├── index.ts                    ← Barrel re-export
├── auth/                       ← Auth API
│   └── index.ts
├── customer/                   ← Customer API
│   └── index.ts
├── category/                   ← Category API
│   └── index.ts
├── common/                     ← Common/shared API
│   └── index.ts
├── schedule/                   ← Schedule API
│   └── index.ts
├── opportunity/                ← Opportunity API
│   └── index.ts
└── ... (60+ entity modules)
```

Each module exports a client object (see 75.x api-client-specialist for details).

### 54.9 — API Base Path Functions

From `src/core/config/apiConfig.ts`:

| Function | Base Path | Full Path |
|----------|-----------|-----------|
| `getApiCoreMngPath()` | `/common` | `/{tenantKey}/common` |
| `getApiPageBuilderPath()` | `/page-builder` | `/{tenantKey}/page-builder` |
| `getApiTenantMngPath()` | `/tenant-manager-test` | `/{tenantKey}/tenant-manager-test` |
| `getApiSfaMngPath()` | `/sfa-manager-test` | `/{tenantKey}/sfa-manager-test` |

All are arrow functions that call `getTenantApiPath(basePath)` internally.

---

## Code Examples

### API Client Module (Pattern 54.8)

```typescript
// src/infrastructure/api/customer/index.ts
import { getApiCoreMngPath } from '@/core/config/apiConfig';
import { ApiRequestOptions } from '@/core/types/api';
import axiosInstance from '@/infrastructure/api/axios';

async function getCustomers(params: any, options?: ApiRequestOptions) {
  return axiosInstance.post(getApiCoreMngPath() + '/api/customers/search', params, {
    ...(options || {}),
  });
}

async function createCustomers(payload: any, options?: ApiRequestOptions) {
  return axiosInstance.post(getApiCoreMngPath() + '/api/customers/create', payload, options);
}

export const customerApi = {
  getCustomers,
  createCustomers,
  updateCustomers,
  getCustomersById,
  // ...
};
```

---

## Anti-Patterns

- Creating multiple Axios instances for different endpoints
- Handling 401 in individual API functions instead of the interceptor
- Storing refresh token in localStorage (must be httpOnly cookie)
- Not queuing requests during refresh (causes duplicate refresh calls)
- Referencing file as `axiosInstance.ts` (actual name: `axios.ts`)
- Importing `axiosInstance` from wrong path
- Hardcoding API base URLs in API modules (use `getApiCoreMngPath()` etc.)
- Creating class-based API clients (use object export pattern — see 75.x)

---

## Related Specialists

- `multitenant-routing-specialist.md` (52.x) — Tenant key source
- `data-fetching-specialist.md` (62.x) — API client used in repository chain
- `api-client-specialist.md` (87.x) — API module structure detail
- `core-layer-specialist.md` (84.x) — apiConfig.ts path functions
