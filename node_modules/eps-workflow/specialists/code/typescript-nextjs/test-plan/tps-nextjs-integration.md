---
id: tps-nextjs-integration
stack: typescript-nextjs
type: integration
category: test-plan
subcategory: nextjs
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E12]
---

# Integration Test Patterns for Next.js
# Next.jsの統合テストパターン

## SECTION 1: PATTERNS

### MSW (Mock Service Worker) API Mocking
- `setupServer(http.get('/api/resource', resolver))` — intercept HTTP at network level
- `server.use(http.get(...))` — per-test handler override
- `HttpResponse.json(data)` — mock JSON responses
- `server.resetHandlers()` — cleanup between tests

### API Client Integration
- Test Axios interceptors (auth token injection, error handling)
- Test API client methods with MSW backend
- Verify request headers, query params, request body
- Test error responses: 400, 401, 403, 404, 500

### Redux + API Integration
- Render component with real Redux store + MSW API
- Dispatch async thunks, verify state transitions
- Test loading → success → data rendered pipeline
- Test loading → error → error message pipeline

### Router Integration
- `useRouter()` mock for navigation testing
- `useSearchParams()` for query parameter testing
- Test dynamic routes: `[id]`, `[...slug]`
- Next.js App Router: test layout + page composition

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| API data fetching | MSW + render + waitFor | Real HTTP interception, no mock leak |
| Axios interceptor | MSW + API client call | Tests actual interceptor chain |
| Redux async thunk | MSW + store.dispatch + getState | Full async flow |
| Form submission | MSW POST handler + userEvent | End-to-end form flow |
| Error handling | MSW error response + screen | Verify user-facing errors |
| Navigation | useRouter mock + fireEvent | Test route changes |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `describe('Feature Integration') → it('should [flow] when [trigger]')`
- Example: `it('should display customer list when API returns data')`

### Assertion Requirements
- Minimum 3 assertions per integration test
- Must verify: API call made + state updated + UI reflects change
- Verify loading states: spinner shown → data rendered

### Coverage Targets
- Every API endpoint has at least 1 integration test
- Error paths: validation error + auth error + server error
- Happy path + at least 1 error path per feature
