# React Axios Specialist
# React Axios スペシャリスト
# Chuyên Gia React Axios

**Version**: 1.0.0
**Stack**: React 19 + TypeScript 5 + Axios 1.6+
**Architecture**: HTTP Client Pattern
**Integration**: C# ASP.NET Core Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **25 Axios patterns** for building HTTP clients that integrate with C# ASP.NET Core backends. Focus on instance configuration, interceptors, error handling, authentication, and request/response transformation.

**Key Constraints**:
- ✅ **Axios ONLY** (NO fetch API)
- ✅ **Interceptors for authentication**
- ✅ **TypeScript for type safety**
- ✅ **Centralized error handling**
- ❌ **NO fetch API usage**
- ❌ **NO hardcoded base URLs**
- ❌ **NO token storage in localStorage** (use httpOnly cookies)

---

## 📚 PATTERN INDEX (25 Patterns)

### **Instance Configuration** (5 patterns)
1. axios-instance-creation
2. base-url-configuration
3. timeout-configuration
4. default-headers
5. response-type-configuration

### **Request Interceptors** (5 patterns)
6. jwt-token-injection
7. csrf-token-injection
8. request-logging
9. request-transformation
10. conditional-header-injection

### **Response Interceptors** (5 patterns)
11. response-transformation
12. error-response-handling
13. refresh-token-mechanism
14. response-logging
15. retry-mechanism

### **Error Handling** (5 patterns)
16. network-error-handling
17. timeout-error-handling
18. server-error-handling
19. validation-error-handling
20. global-error-handler

### **Advanced Patterns** (5 patterns)
21. request-cancellation
22. concurrent-requests
23. request-deduplication
24. file-upload-progress
25. download-with-progress

---

## 📖 PATTERN DETAILS

### Pattern 1: axios-instance-creation
**Category**: Instance Configuration
**Description**: Create configured Axios instance with baseURL and timeout

```typescript
// services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Why This Pattern**:
- ✅ Centralized configuration
- ✅ Environment-based URL
- ✅ Consistent timeout across requests
- ✅ Default headers for all requests

**Anti-Patterns** ❌:
- ❌ Using fetch API instead of Axios
- ❌ Hardcoding base URL
- ❌ No timeout configuration

---

### Pattern 2: base-url-configuration
**Category**: Instance Configuration
**Description**: Configure multiple base URLs for different environments

```typescript
// services/api.ts
const getBaseURL = (): string => {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    return process.env.NEXT_PUBLIC_PROD_API_URL!;
  } else if (env === 'staging') {
    return process.env.NEXT_PUBLIC_STAGING_API_URL!;
  } else {
    return process.env.NEXT_PUBLIC_DEV_API_URL || 'http://localhost:5000/api';
  }
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
});
```

**Why This Pattern**:
- ✅ Environment-aware configuration
- ✅ Easy to switch between environments
- ✅ Type-safe with TypeScript

---

### Pattern 3: timeout-configuration
**Category**: Instance Configuration
**Description**: Configure request timeout with fallback

```typescript
// services/api.ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10),
});

// Override timeout for specific requests
export const longRunningClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 60000, // 60 seconds for file uploads, reports
});
```

**Why This Pattern**:
- ✅ Configurable via environment variables
- ✅ Different timeouts for different use cases
- ✅ Prevents hanging requests

---

### Pattern 4: default-headers
**Category**: Instance Configuration
**Description**: Set default headers for all requests

```typescript
// services/api.ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});
```

**Why This Pattern**:
- ✅ Consistent headers across requests
- ✅ Easier CSRF protection detection
- ✅ Content negotiation

---

### Pattern 5: response-type-configuration
**Category**: Instance Configuration
**Description**: Configure response type for different data formats

```typescript
// services/api.ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  responseType: 'json', // Default: json
});

// Blob response for file downloads
export async function downloadFile(url: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(url, {
    responseType: 'blob',
  });
  return response.data;
}

// ArrayBuffer for binary data
export async function getBinaryData(url: string): Promise<ArrayBuffer> {
  const response = await apiClient.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
  });
  return response.data;
}
```

**Why This Pattern**:
- ✅ Type-safe response handling
- ✅ Supports JSON, Blob, ArrayBuffer, Text
- ✅ Explicit response type expectations

---

### Pattern 6: jwt-token-injection
**Category**: Request Interceptors
**Description**: Inject JWT access token from httpOnly cookies via request interceptor

```typescript
// services/api.ts
import { getAccessToken } from '@/utils/auth';

apiClient.interceptors.request.use(
  (config) => {
    // Token is automatically sent via httpOnly cookies
    // Optional: Get token from cookie for custom header
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Automatic token injection
- ✅ No manual token handling per request
- ✅ Centralized authentication logic
- ✅ Uses httpOnly cookies (secure)

**Anti-Patterns** ❌:
- ❌ Storing tokens in localStorage
- ❌ Manual token injection per request

---

### Pattern 7: csrf-token-injection
**Category**: Request Interceptors
**Description**: Inject CSRF token from meta tag

```typescript
// services/api.ts
apiClient.interceptors.request.use(
  (config) => {
    // Get CSRF token from meta tag
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ CSRF protection for state-changing requests
- ✅ Automatic token injection
- ✅ Works with ASP.NET Core AntiForgery

---

### Pattern 8: request-logging
**Category**: Request Interceptors
**Description**: Log all outgoing requests for debugging

```typescript
// services/api.ts
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Request]', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Easy debugging in development
- ✅ Request visibility
- ✅ Disabled in production

---

### Pattern 9: request-transformation
**Category**: Request Interceptors
**Description**: Transform request data before sending

```typescript
// services/api.ts
import { snakeCase } from 'lodash';

apiClient.interceptors.request.use(
  (config) => {
    // Transform camelCase to snake_case for backend
    if (config.data && typeof config.data === 'object') {
      config.data = transformKeys(config.data, snakeCase);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function transformKeys(obj: any, transformer: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, transformer));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      acc[transformer(key)] = transformKeys(obj[key], transformer);
      return acc;
    }, {} as any);
  }
  return obj;
}
```

**Why This Pattern**:
- ✅ Consistent naming conventions
- ✅ Frontend (camelCase) ↔ Backend (snake_case) alignment
- ✅ Automatic transformation

---

### Pattern 10: conditional-header-injection
**Category**: Request Interceptors
**Description**: Add headers based on request configuration

```typescript
// services/api.ts
apiClient.interceptors.request.use(
  (config) => {
    // Add Content-Type for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']; // Let browser set boundary
    }

    // Add Accept-Language for i18n
    const locale = localStorage.getItem('locale') || 'en';
    config.headers['Accept-Language'] = locale;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Dynamic header configuration
- ✅ Handles FormData boundary correctly
- ✅ Supports internationalization

---

### Pattern 11: response-transformation
**Category**: Response Interceptors
**Description**: Transform response data after receiving

```typescript
// services/api.ts
import { camelCase } from 'lodash';

apiClient.interceptors.response.use(
  (response) => {
    // Transform snake_case to camelCase for frontend
    if (response.data && typeof response.data === 'object') {
      response.data = transformKeys(response.data, camelCase);
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Consistent naming conventions
- ✅ Backend (snake_case) → Frontend (camelCase)
- ✅ Automatic transformation

---

### Pattern 12: error-response-handling
**Category**: Response Interceptors
**Description**: Handle error responses globally

```typescript
// services/api.ts
import { toast } from '@/components/ui/use-toast';

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 400:
          toast({
            title: 'Validation Error',
            description: data.message || 'Invalid request',
            variant: 'destructive',
          });
          break;
        case 401:
          toast({
            title: 'Unauthorized',
            description: 'Please log in',
            variant: 'destructive',
          });
          window.location.href = '/login';
          break;
        case 403:
          toast({
            title: 'Forbidden',
            description: 'You do not have permission',
            variant: 'destructive',
          });
          break;
        case 404:
          toast({
            title: 'Not Found',
            description: 'Resource not found',
            variant: 'destructive',
          });
          break;
        case 500:
          toast({
            title: 'Server Error',
            description: 'Something went wrong',
            variant: 'destructive',
          });
          break;
      }
    }

    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Centralized error handling
- ✅ User-friendly error messages
- ✅ Automatic redirects for auth errors

---

### Pattern 13: refresh-token-mechanism
**Category**: Response Interceptors
**Description**: Automatically refresh expired JWT tokens

```typescript
// services/api.ts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token endpoint
        await apiClient.post('/auth/refresh');

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Automatic token refresh
- ✅ Queues failed requests during refresh
- ✅ Retries original request after refresh
- ✅ Redirects to login on refresh failure

---

### Pattern 14: response-logging
**Category**: Response Interceptors
**Description**: Log all responses for debugging

```typescript
// services/api.ts
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Easy debugging
- ✅ Response visibility
- ✅ Disabled in production

---

### Pattern 15: retry-mechanism
**Category**: Response Interceptors
**Description**: Automatically retry failed requests

```typescript
// services/api.ts
import axiosRetry from 'axios-retry';

axiosRetry(apiClient, {
  retries: 3, // Number of retries
  retryDelay: axiosRetry.exponentialDelay, // Exponential backoff: 1s, 2s, 4s
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500
    );
  },
});
```

**Why This Pattern**:
- ✅ Resilience to transient errors
- ✅ Exponential backoff
- ✅ Only retries safe requests

---

### Pattern 16: network-error-handling
**Category**: Error Handling
**Description**: Handle network errors (no response from server)

```typescript
// services/api.ts
export async function makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Network error (no response)
        toast({
          title: 'Network Error',
          description: 'Cannot connect to server. Check your internet connection.',
          variant: 'destructive',
        });
      }
    }
    throw error;
  }
}
```

**Why This Pattern**:
- ✅ User-friendly network error messages
- ✅ Distinguishes network errors from server errors

---

### Pattern 17: timeout-error-handling
**Category**: Error Handling
**Description**: Handle request timeout errors

```typescript
// services/api.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      toast({
        title: 'Request Timeout',
        description: 'The request took too long. Please try again.',
        variant: 'destructive',
      });
    }

    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ Specific timeout error handling
- ✅ User-friendly messages

---

### Pattern 18: server-error-handling
**Category**: Error Handling
**Description**: Handle 5xx server errors

```typescript
// services/api.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status >= 500) {
      toast({
        title: 'Server Error',
        description: error.response.data?.message || 'Something went wrong on the server',
        variant: 'destructive',
      });

      // Log to error monitoring service (Sentry, etc.)
      if (process.env.NODE_ENV === 'production') {
        // Sentry.captureException(error);
      }
    }

    return Promise.reject(error);
  }
);
```

**Why This Pattern**:
- ✅ User-friendly server error messages
- ✅ Error monitoring integration

---

### Pattern 19: validation-error-handling
**Category**: Error Handling
**Description**: Handle 400 validation errors with field-level errors

```typescript
// services/userService.ts
interface ValidationError {
  field: string;
  message: string;
}

interface ApiError {
  message: string;
  errors?: ValidationError[];
}

export async function createUser(data: CreateUserDto) {
  try {
    const response = await apiClient.post<User>('/users', data);
    return { data: response.data, errors: null };
  } catch (error) {
    if (axios.isAxiosError<ApiError>(error) && error.response?.status === 400) {
      const apiError = error.response.data;

      // Return field-level errors
      return {
        data: null,
        errors: apiError.errors || [{ field: 'general', message: apiError.message }],
      };
    }

    throw error;
  }
}
```

**Why This Pattern**:
- ✅ Field-level error display
- ✅ Type-safe error handling
- ✅ Integrates with React Hook Form

---

### Pattern 20: global-error-handler
**Category**: Error Handling
**Description**: Global error boundary for uncaught errors

```typescript
// services/api.ts
export function setupGlobalErrorHandler() {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // Log all errors to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Sentry.captureException(error);
      }

      // Show generic error toast for unexpected errors
      if (!error.response || error.response.status >= 500) {
        toast({
          title: 'Unexpected Error',
          description: 'An unexpected error occurred. Please try again later.',
          variant: 'destructive',
        });
      }

      return Promise.reject(error);
    }
  );
}
```

**Why This Pattern**:
- ✅ Catch-all for uncaught errors
- ✅ Error monitoring integration
- ✅ User-friendly generic messages

---

### Pattern 21: request-cancellation
**Category**: Advanced Patterns
**Description**: Cancel in-flight requests using AbortController

```typescript
// hooks/useUserSearch.ts
import { useState, useEffect } from 'react';

export function useUserSearch(query: string) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<User[]>('/users/search', {
          params: { q: query },
          signal: controller.signal,
        });
        setUsers(response.data);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log('Request cancelled');
        } else {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchUsers();
    }

    return () => {
      controller.abort(); // Cancel on cleanup
    };
  }, [query]);

  return { users, loading };
}
```

**Why This Pattern**:
- ✅ Prevents race conditions
- ✅ Cancels outdated requests
- ✅ Improves performance

---

### Pattern 22: concurrent-requests
**Category**: Advanced Patterns
**Description**: Make multiple concurrent requests with Promise.all

```typescript
// services/dashboardService.ts
export async function loadDashboardData() {
  try {
    const [userStats, salesStats, activityLogs] = await Promise.all([
      apiClient.get<UserStats>('/stats/users'),
      apiClient.get<SalesStats>('/stats/sales'),
      apiClient.get<ActivityLog[]>('/logs/recent'),
    ]);

    return {
      users: userStats.data,
      sales: salesStats.data,
      logs: activityLogs.data,
    };
  } catch (error) {
    console.error('Dashboard data loading failed', error);
    throw error;
  }
}
```

**Why This Pattern**:
- ✅ Parallel requests (faster)
- ✅ All-or-nothing error handling
- ✅ Type-safe results

---

### Pattern 23: request-deduplication
**Category**: Advanced Patterns
**Description**: Deduplicate identical concurrent requests

```typescript
// services/api.ts
const pendingRequests = new Map<string, Promise<any>>();

export async function dedupedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Start new request
  const promise = requestFn()
    .finally(() => {
      pendingRequests.delete(key); // Cleanup after completion
    });

  pendingRequests.set(key, promise);
  return promise;
}

// Usage
export async function getUser(id: string) {
  return dedupedRequest(`user-${id}`, () =>
    apiClient.get<User>(`/users/${id}`).then((res) => res.data)
  );
}
```

**Why This Pattern**:
- ✅ Prevents duplicate requests
- ✅ Reduces server load
- ✅ Improves performance

---

### Pattern 24: file-upload-progress
**Category**: Advanced Patterns
**Description**: Track file upload progress

```typescript
// components/FileUpload.tsx
import { useState } from 'react';

export function FileUpload() {
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
          );
          setProgress(percentCompleted);
        },
      });

      toast({ title: 'Upload complete' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files![0])} />
      <progress value={progress} max={100} />
    </div>
  );
}
```

**Why This Pattern**:
- ✅ User feedback during upload
- ✅ Progress tracking
- ✅ Better UX for large files

---

### Pattern 25: download-with-progress
**Category**: Advanced Patterns
**Description**: Download files with progress tracking

```typescript
// services/fileService.ts
export async function downloadFile(
  fileId: string,
  onProgress?: (progress: number) => void
) {
  try {
    const response = await apiClient.get<Blob>(`/files/${fileId}/download`, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
          );
          onProgress(percentCompleted);
        }
      },
    });

    // Create download link
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `file-${fileId}`;
    link.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast({ title: 'Download failed', variant: 'destructive' });
    throw error;
  }
}
```

**Why This Pattern**:
- ✅ Progress feedback for large downloads
- ✅ Automatic file download
- ✅ Memory cleanup with revokeObjectURL

---

## ❌ PROHIBITED PATTERNS

### 1. Using fetch API
```typescript
// ❌ BAD
const response = await fetch('/api/users');
const data = await response.json();

// ✅ GOOD
const response = await apiClient.get<User[]>('/users');
const data = response.data;
```

### 2. Hardcoded base URLs
```typescript
// ❌ BAD
const response = await axios.get('http://localhost:5000/api/users');

// ✅ GOOD
const response = await apiClient.get('/users');
```

### 3. Storing tokens in localStorage
```typescript
// ❌ BAD
localStorage.setItem('token', accessToken);

// ✅ GOOD
// Use httpOnly cookies (set by server)
```

### 4. No error handling
```typescript
// ❌ BAD
const data = await apiClient.get('/users');

// ✅ GOOD
try {
  const data = await apiClient.get('/users');
} catch (error) {
  handleError(error);
}
```

### 5. Manual token injection per request
```typescript
// ❌ BAD
await apiClient.get('/users', {
  headers: { Authorization: `Bearer ${token}` }
});

// ✅ GOOD
// Use request interceptor (automatic)
```

---

## 🎯 INTEGRATION WITH C# BACKEND

### Backend API Response Format
```csharp
// C# API Controller
[HttpGet]
public async Task<ActionResult<List<UserDto>>> GetUsers()
{
    var users = await _userService.GetAllUsersAsync();
    return Ok(users);
}

[HttpPost]
public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
{
    var user = await _userService.CreateUserAsync(dto);
    return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
}
```

### Frontend Service Integration
```typescript
// services/userService.ts
export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const response = await apiClient.post<User>('/users', dto);
  return response.data;
}
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### Instance Reuse
- ✅ Create ONE Axios instance per API
- ✅ Reuse instance across requests
- ❌ Don't create new instance per request

### Request Cancellation
- ✅ Cancel requests on component unmount
- ✅ Cancel outdated search requests
- ✅ Use AbortController

### Response Caching
- ✅ Use React Query for client-side caching
- ✅ Set appropriate cache headers
- ❌ Don't implement manual caching with Axios

---

## 🔒 SECURITY BEST PRACTICES

### Token Storage
- ✅ Use httpOnly cookies (server-side set)
- ❌ NEVER store tokens in localStorage
- ❌ NEVER store tokens in sessionStorage

### CSRF Protection
- ✅ Include CSRF token in headers
- ✅ Use X-CSRF-Token header
- ✅ Validate on server for state-changing requests

### HTTPS Enforcement
- ✅ Use HTTPS in production
- ✅ Fail requests over HTTP in production
- ✅ Set secure: true on cookies

---

**END OF DOCUMENT**
