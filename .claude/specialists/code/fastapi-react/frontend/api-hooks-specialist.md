# Frontend API & Hooks Specialist

**Role**: API client and custom hooks expert
**Focus**: HTTP client, authentication, error handling, custom React hooks
**Technology**: Fetch API, TypeScript 5, React 19 hooks
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform
**Patterns**: 14.41-14.55 (API Clients: 10, Custom Hooks: 5)
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST APIHooksSpecialist {
  ROLE: "API client and custom hooks expert for type-safe, reusable data fetching and state management"

  RESPONSIBILITIES: [
    "Implement centralized HTTP client with Fetch API",
    "Handle authentication token management (JWT)",
    "Create error handling system with APIError class",
    "Build file upload functionality",
    "Implement retry mechanism with exponential backoff",
    "Create custom hooks (useDebounce, useLocalStorage, useMediaQuery, etc.)",
    "Ensure type safety with TypeScript generics",
    "Handle edge cases (network errors, timeouts, AbortController)"
  ]

  TECH_STACK: {
    http_client: "Fetch API (native)",
    language: "TypeScript 5 (strict mode)",
    framework: "React 19 (hooks)",
    storage: "localStorage (with JSON serialization)",
    auth: "JWT tokens"
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    api_base: "process.env.NEXT_PUBLIC_API_URL",
    auth_header: "Authorization: Bearer {token}",
    error_handling: "Vietnamese error messages"
  }
}
```

---

## Pattern 14.41: API Client (HTTP Client)

### Overview

```pseudo
PATTERN APIClient {
  PURPOSE: "Centralized, type-safe HTTP client with auth, error handling, retries"

  PROBLEM: "Scattered fetch calls, inconsistent error handling, manual auth token injection"

  SOLUTION: "APIClient class with generics, automatic auth, interceptors, retry logic"

  USE_CASES: [
    "Fetch user data with auth",
    "Submit forms with validation",
    "Upload files with progress",
    "Retry failed requests (network issues)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW APIClient_Implementation {
  INPUT: {
    baseURL: string,  # process.env.NEXT_PUBLIC_API_URL
    defaultHeaders?: Record<string, string>
  }

  FILE_STRUCTURE: |
    shared/api/
    ├── client.ts               # Main APIClient class
    ├── auth.ts                 # Auth token management
    ├── upload.ts               # File upload helper
    ├── error-handler.ts        # APIError class
    └── retry.ts                # Retry mechanism

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Create APIClient singleton"
      logic: |
        class APIClient {
          private baseURL: string
          private defaultHeaders: Record<string, string>

          constructor(baseURL: string) {
            this.baseURL = baseURL
            this.defaultHeaders = { 'Content-Type': 'application/json' }
          }
        }
    }

    STEP_2_GET_METHOD: {
      description: "GET request with query params"
      logic: |
        async get<T>(url: string, params?: Record<string, any>): Promise<T> {
          fullURL = new URL(url, this.baseURL)

          IF params THEN
            FOR EACH (key, value) IN params:
              fullURL.searchParams.append(key, String(value))
            END FOR
          END IF

          token = getAuthToken()
          headers = {
            ...this.defaultHeaders,
            ...(token AND { Authorization: `Bearer ${token}` })
          }

          response = await fetch(fullURL.toString(), { method: 'GET', headers })

          IF !response.ok THEN
            THROW new APIError('GET request failed', response.status, await response.json())
          END IF

          RETURN await response.json()
        }
    }

    STEP_3_POST_METHOD: {
      description: "POST request with JSON body"
      logic: |
        async post<T>(url: string, data?: any): Promise<T> {
          fullURL = new URL(url, this.baseURL)
          token = getAuthToken()
          headers = {
            ...this.defaultHeaders,
            ...(token AND { Authorization: `Bearer ${token}` })
          }

          response = await fetch(fullURL.toString(), {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
          })

          IF !response.ok THEN
            THROW new APIError('POST request failed', response.status, await response.json())
          END IF

          RETURN await response.json()
        }
    }

    STEP_4_PUT_DELETE_METHODS: {
      description: "PUT and DELETE methods (similar to POST)"
      logic: |
        async put<T>(url: string, data?: any): Promise<T> { /* Similar to POST */ }
        async delete<T>(url: string): Promise<T> { /* Similar to GET */ }
    }

    STEP_5_ERROR_HANDLING: {
      description: "Custom APIError class for structured errors"
      logic: |
        class APIError extends Error {
          constructor(
            message: string,
            public status: number,
            public data?: any
          ) {
            super(message)
            this.name = 'APIError'
          }
        }
    }
  }

  USAGE_EXAMPLES: [
    "const users = await apiClient.get<User[]>('/api/users', { page: 1, pageSize: 20 })",
    "const newUser = await apiClient.post<User>('/api/users', { name: 'John', email: 'john@example.com' })",
    "await apiClient.delete('/api/users/123')"
  ]

  OUTPUT: {
    class: "APIClient",
    singleton: "export const apiClient = new APIClient(process.env.NEXT_PUBLIC_API_URL)",
    type_safe: "Generics enable <User>, <Product>, etc."
  }
}
```

---

## Pattern 14.42-14.46: Auth & File Upload

### Workflow

```pseudo
WORKFLOW AuthFileUpload_Group {
  PATTERN_14_44_GET_AUTH_TOKEN: {
    purpose: "Retrieve JWT token from localStorage"

    logic: |
      FUNCTION getAuthToken(): string | null {
        RETURN localStorage.getItem('auth_token')
      }
  }

  PATTERN_14_45_SET_AUTH_TOKEN: {
    purpose: "Store JWT token in localStorage"

    logic: |
      FUNCTION setAuthToken(token: string): void {
        localStorage.setItem('auth_token', token)
      }
  }

  PATTERN_14_46_CLEAR_AUTH_TOKEN: {
    purpose: "Remove token on logout"

    logic: |
      FUNCTION clearAuthToken(): void {
        localStorage.removeItem('auth_token')
      }
  }

  PATTERN_14_43_UPLOAD_FILE: {
    purpose: "Upload files with progress tracking"

    logic: |
      async uploadFile(file: File, onProgress?: (percent: number) => void): Promise<{url: string}> {
        formData = new FormData()
        formData.append('file', file)

        xhr = new XMLHttpRequest()

        // Track progress
        xhr.upload.onprogress = (event) => {
          IF event.lengthComputable AND onProgress THEN
            percent = (event.loaded / event.total) * 100
            onProgress(percent)
          END IF
        }

        // Send request
        RETURN new Promise((resolve, reject) => {
          xhr.onload = () => {
            IF xhr.status == 200 THEN
              resolve(JSON.parse(xhr.responseText))
            ELSE
              reject(new APIError('Upload failed', xhr.status))
            END IF
          }

          xhr.open('POST', `${this.baseURL}/api/upload`)
          xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`)
          xhr.send(formData)
        })
      }

      // Usage:
      // await apiClient.uploadFile(file, (percent) => console.log(`${percent}% uploaded`))
  }
}
```

---

## Pattern 14.47-14.50: Error Handling & Retry

### Workflow

```pseudo
WORKFLOW ErrorHandlingRetry_Group {
  PATTERN_14_47_HANDLE_API_ERROR: {
    purpose: "Centralized error handler with Vietnamese messages"

    logic: |
      FUNCTION handleAPIError(error: unknown): string {
        IF error instanceof APIError THEN
          MATCH error.status {
            401 => "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
            403 => "Bạn không có quyền truy cập tài nguyên này.",
            404 => "Không tìm thấy tài nguyên.",
            422 => "Dữ liệu không hợp lệ: " + error.data.message,
            500 => "Lỗi máy chủ. Vui lòng thử lại sau.",
            DEFAULT => "Đã xảy ra lỗi: " + error.message
          }
        ELSE
          RETURN "Đã xảy ra lỗi không xác định."
        END IF
      }
  }

  PATTERN_14_48_RETRY_REQUEST: {
    purpose: "Retry failed requests with exponential backoff"

    logic: |
      async retryRequest<T>(
        fn: () => Promise<T>,
        maxRetries = 3,
        baseDelay = 1000
      ): Promise<T> {
        FOR attempt = 1 TO maxRetries:
          TRY {
            RETURN await fn()
          } CATCH (error) {
            IF attempt == maxRetries THEN
              THROW error
            END IF

            // Exponential backoff: 1s, 2s, 4s
            delay = baseDelay * Math.pow(2, attempt - 1)
            await sleep(delay)
          }
        END FOR
      }

      // Usage:
      // const users = await retryRequest(() => apiClient.get<User[]>('/api/users'))
  }

  PATTERN_14_49_ABORT_CONTROLLER: {
    purpose: "Cancel requests (e.g., on component unmount)"

    logic: |
      WORKFLOW UseAbortController {
        controller = new AbortController()

        TRY {
          response = await fetch(url, { signal: controller.signal })
        } CATCH (error) {
          IF error.name == 'AbortError' THEN
            console.log('Request cancelled')
          END IF
        }

        // Cancel request:
        controller.abort()
      }

      // Usage in useEffect:
      // useEffect(() => {
      //   const controller = new AbortController()
      //   fetchData({ signal: controller.signal })
      //   return () => controller.abort()  // Cleanup
      // }, [])
  }

  PATTERN_14_50_REQUEST_INTERCEPTOR: {
    purpose: "Add headers/auth to all requests"

    logic: |
      // Already implemented in APIClient via getAuthToken()
      // Can extend with:
      // - Request logging
      // - Response transformation
      // - Rate limiting
  }
}
```

---

## Pattern 14.51-14.55: Custom Hooks

### Workflow

```pseudo
WORKFLOW CustomHooks_Group {
  PATTERN_14_51_USE_DEBOUNCE: {
    purpose: "Debounce value changes (e.g., search input)"

    logic: |
      FUNCTION useDebounce<T>(value: T, delay: number): T {
        STATE: debouncedValue = useState<T>(value)

        EFFECT(() => {
          handler = setTimeout(() => {
            setDebouncedValue(value)
          }, delay)

          CLEANUP: () => clearTimeout(handler)
        }, [value, delay])

        RETURN debouncedValue
      }

      // Usage:
      // const [search, setSearch] = useState('')
      // const debouncedSearch = useDebounce(search, 300)
      // useEffect(() => { fetchResults(debouncedSearch) }, [debouncedSearch])
  }

  PATTERN_14_52_USE_THROTTLE: {
    purpose: "Throttle value changes (e.g., scroll events)"

    logic: |
      FUNCTION useThrottle<T>(value: T, limit: number): T {
        STATE: {
          throttledValue = useState<T>(value),
          lastRan = useRef<number>(Date.now())
        }

        EFFECT(() => {
          handler = setTimeout(() => {
            IF (Date.now() - lastRan.current) >= limit THEN
              setThrottledValue(value)
              lastRan.current = Date.now()
            END IF
          }, limit - (Date.now() - lastRan.current))

          CLEANUP: () => clearTimeout(handler)
        }, [value, limit])

        RETURN throttledValue
      }
  }

  PATTERN_14_53_USE_LOCAL_STORAGE: {
    purpose: "Sync state with localStorage"

    logic: |
      FUNCTION useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
        STATE: storedValue = useState<T>(() => {
          TRY {
            item = window.localStorage.getItem(key)
            RETURN item ? JSON.parse(item) : initialValue
          } CATCH {
            RETURN initialValue
          }
        })

        FUNCTION setValue(value: T): void {
          TRY {
            setStoredValue(value)
            window.localStorage.setItem(key, JSON.stringify(value))
          } CATCH (error) {
            console.error(error)
          }
        }

        RETURN [storedValue, setValue]
      }

      // Usage:
      // const [theme, setTheme] = useLocalStorage('theme', 'light')
  }

  PATTERN_14_54_USE_MEDIA_QUERY: {
    purpose: "Responsive breakpoints (mobile/tablet/desktop)"

    logic: |
      FUNCTION useMediaQuery(query: string): boolean {
        STATE: matches = useState(() => window.matchMedia(query).matches)

        EFFECT(() => {
          mediaQuery = window.matchMedia(query)

          handleChange = (e) => setMatches(e.matches)
          mediaQuery.addEventListener('change', handleChange)

          CLEANUP: () => mediaQuery.removeEventListener('change', handleChange)
        }, [query])

        RETURN matches
      }

      // Usage:
      // const isMobile = useMediaQuery('(max-width: 768px)')
      // const isDesktop = useMediaQuery('(min-width: 1024px)')
  }

  PATTERN_14_55_USE_ON_CLICK_OUTSIDE: {
    purpose: "Detect clicks outside element (e.g., close dropdown)"

    logic: |
      FUNCTION useOnClickOutside<T extends HTMLElement>(
        ref: React.RefObject<T>,
        handler: (event: MouseEvent) => void
      ): void {
        EFFECT(() => {
          listener = (event: MouseEvent) => {
            IF !ref.current OR ref.current.contains(event.target) THEN
              RETURN
            END IF

            handler(event)
          }

          document.addEventListener('mousedown', listener)
          CLEANUP: () => document.removeEventListener('mousedown', listener)
        }, [ref, handler])
      }

      // Usage:
      // const ref = useRef<HTMLDivElement>(null)
      // useOnClickOutside(ref, () => setIsOpen(false))
      // <div ref={ref}>Dropdown content</div>
  }
}
```

---

## Integration with TanStack Query

```pseudo
WORKFLOW TanStackQueryIntegration {
  PURPOSE: "Use APIClient with TanStack Query for server state"

  USAGE: |
    import { useQuery, useMutation } from '@tanstack/react-query'
    import { apiClient } from '@/shared/api/client'

    // Fetch data
    const { data: users, isLoading } = useQuery({
      queryKey: ['users'],
      queryFn: () => apiClient.get<User[]>('/api/users')
    })

    // Create user
    const createUser = useMutation({
      mutationFn: (data: CreateUserRequest) => apiClient.post<User>('/api/users', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    })

  BENEFITS: [
    "Automatic caching",
    "Background refetching",
    "Optimistic updates",
    "Error/loading states"
  ]
}
```

---

## Testing Strategy

```pseudo
WORKFLOW TestAPIHooks {
  API_CLIENT_TESTS: {
    test_get_request: |
      IT "makes GET request with auth token" {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => [{ id: 1, name: 'User 1' }]
        })

        localStorage.setItem('auth_token', 'test-token')

        const users = await apiClient.get('/api/users')

        EXPECT fetch.toHaveBeenCalledWith(
          expect.stringContaining('/api/users'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token'
            })
          })
        )

        EXPECT users toEqual [{ id: 1, name: 'User 1' }]
      }

    test_error_handling: |
      IT "throws APIError on 404" {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({ message: 'Not found' })
        })

        await expect(apiClient.get('/api/users/999')).rejects.toThrow(APIError)
      }
  }

  HOOK_TESTS: {
    test_use_debounce: |
      IT "debounces value changes" {
        const { result, rerender } = renderHook(
          ({ value, delay }) => useDebounce(value, delay),
          { initialProps: { value: 'initial', delay: 300 } }
        )

        EXPECT result.current toBe 'initial'

        rerender({ value: 'updated', delay: 300 })
        await act(() => jest.advanceTimersByTime(299))
        EXPECT result.current toBe 'initial'  // Still old value

        await act(() => jest.advanceTimersByTime(1))
        EXPECT result.current toBe 'updated'  // Updated after delay
      }

    test_use_local_storage: |
      IT "syncs with localStorage" {
        const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

        const [value, setValue] = result.current
        EXPECT value toBe 'initial'

        act(() => setValue('updated'))

        EXPECT localStorage.getItem('test-key') toBe '"updated"'
        EXPECT result.current[0] toBe 'updated'
      }
  }
}
```

---

## Reference Patterns

**Full Implementation**: See `/tmp/day13-context/fsd-shared-layer-patterns.md`

**Related Patterns**:
- Patterns 14.1-14.20: UI Components (covered in ui-components-specialist.md)
- Patterns 14.21-14.40: Utilities (covered in utilities-specialist.md)

---

**End of API & Hooks Specialist**
