# React Testing Specialist
**Version**: 1.0.0
**Technology**: Vitest + React Testing Library + React 19
**Integration**: C# ASP.NET Core Backend
**Created**: 2025-12-31
**Specialist Type**: React Frontend - Testing & Quality Assurance

---

## 🎯 SPECIALIST OVERVIEW

This specialist enforces Vitest + React Testing Library patterns for:
- Component testing (React Testing Library)
- Unit testing (Vitest)
- Integration testing
- E2E testing (Playwright)
- Test coverage and quality metrics

**Vitest + React Testing Library** is the recommended testing approach for StarX4CRM (NO Jest, NO Enzyme).

---

## 📋 TESTING PATTERNS (15 Total)

### Pattern 1: vitest-setup
**Category**: Setup
**Description**: Configure Vitest for React testing

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Why This Pattern**:
- ✅ Faster than Jest
- ✅ ESM support out of the box
- ✅ Watch mode by default

---

### Pattern 2: component-render
**Category**: Component Testing
**Description**: Basic component rendering test

```typescript
// components/__tests__/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders primary variant', () => {
    render(<Button variant="primary">Primary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('renders disabled button', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

**Why This Pattern**:
- ✅ `screen` queries are recommended over destructuring
- ✅ `getByRole` is most accessible query
- ✅ `expect` from vitest

---

### Pattern 3: user-interaction
**Category**: Component Testing
**Description**: Test user interactions with userEvent

```typescript
// components/__tests__/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('submits form with user credentials', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    // Type into inputs
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Click submit button
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Assert form submitted with correct data
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    // Submit without filling form
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Check for validation errors
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });
});
```

**Why This Pattern**:
- ✅ `userEvent` simulates real user interactions
- ✅ `await` for async user actions
- ✅ `vi.fn()` for mock functions

---

### Pattern 4: async-component
**Category**: Component Testing
**Description**: Test async components with waitFor and findBy

```typescript
// components/__tests__/UserList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserList } from '../UserList';

// Mock fetch
global.fetch = vi.fn();

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => [],
    });

    render(<UserList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays users after fetching', async () => {
    const users = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => users,
    });

    render(<UserList />);

    // Wait for users to appear
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });
  });
});
```

**Why This Pattern**:
- ✅ `findBy` waits for elements automatically
- ✅ `waitFor` for custom async assertions
- ✅ Mock API responses

---

### Pattern 5: react-query-testing
**Category**: Integration Testing
**Description**: Test React Query components

```typescript
// components/__tests__/UserList.react-query.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserList } from '../UserList';

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('UserList with React Query', () => {
  it('displays users from query', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
      ],
    });

    render(<UserList />, { wrapper: createWrapper() });

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
  });
});
```

**Why This Pattern**:
- ✅ Wrapper provides QueryClient
- ✅ Disable retries for faster tests
- ✅ Real React Query behavior

---

### Pattern 6: mocking-modules
**Category**: Mocking
**Description**: Mock modules with vi.mock()

```typescript
// __tests__/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { fetchUsers } from '../api/users';

// Mock axios
vi.mock('axios');

describe('fetchUsers', () => {
  it('fetches users from API', async () => {
    const users = [{ id: '1', name: 'John' }];

    (axios.get as any).mockResolvedValueOnce({
      data: users,
    });

    const result = await fetchUsers();

    expect(result).toEqual(users);
    expect(axios.get).toHaveBeenCalledWith('/api/users');
  });

  it('throws error on API failure', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchUsers()).rejects.toThrow('Network error');
  });
});
```

**Why This Pattern**:
- ✅ `vi.mock()` hoisted automatically
- ✅ Mock external dependencies
- ✅ Isolate unit under test

---

### Pattern 7: accessibility-testing
**Category**: Quality Assurance
**Description**: Test accessibility with jest-axe

```bash
npm install -D jest-axe
```

```typescript
// components/__tests__/LoginForm.a11y.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginForm } from '../LoginForm';

expect.extend(toHaveNoViolations);

describe('LoginForm Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<LoginForm onSubmit={vi.fn()} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Why This Pattern**:
- ✅ Automated accessibility testing
- ✅ Catch WCAG violations
- ✅ `jest-axe` integration

---

### Pattern 8: snapshot-testing
**Category**: Regression Testing
**Description**: Snapshot testing for UI consistency

```typescript
// components/__tests__/Button.snapshot.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button Snapshots', () => {
  it('matches snapshot for default variant', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for primary variant', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for disabled state', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

**Why This Pattern**:
- ✅ Catch unintended UI changes
- ✅ Visual regression testing
- ✅ Update snapshots with `--update`

---

### Pattern 9: custom-render
**Category**: Testing Utilities
**Description**: Custom render with providers

```typescript
// test/utils.tsx
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';

function render(ui: React.ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { render };
```

```typescript
// Usage
import { render, screen } from '../test/utils';

test('renders with all providers', () => {
  render(<MyComponent />);
  // All providers automatically available
});
```

**Why This Pattern**:
- ✅ DRY - Don't repeat wrapper setup
- ✅ Consistent test environment
- ✅ Centralized provider configuration

---

### Pattern 10: integration-test
**Category**: Integration Testing
**Description**: Integration test for complete user flows

```typescript
// __tests__/integration/user-registration.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../test/utils';
import { userEvent } from '@testing-library/user-event';
import { RegisterPage } from '@/app/(auth)/register/page';

describe('User Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full registration process', async () => {
    const user = userEvent.setup();

    // Mock API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        // Check email availability
        ok: true,
        json: async () => ({ isAvailable: true }),
      })
      .mockResolvedValueOnce({
        // Register user
        ok: true,
        json: async () => ({ id: '123', email: 'test@example.com' }),
      });

    render(<RegisterPage />);

    // Fill registration form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

    // Submit form
    await user.click(screen.getByRole('button', { name: /register/i }));

    // Verify success message
    expect(await screen.findByText(/registration successful/i)).toBeInTheDocument();

    // Verify API calls
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('shows error for existing email', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isAvailable: false }),
    });

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByText(/email is already registered/i)).toBeInTheDocument();
  });
});
```

**Why This Pattern**:
- ✅ Test complete user flows
- ✅ Multiple API interactions
- ✅ Real-world scenarios

---

### Pattern 11: mock-server
**Category**: Integration Testing
**Description**: Mock server with MSW (Mock Service Worker)

```bash
npm install -D msw
```

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: '3', ...body },
      { status: 201 }
    );
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'John Doe',
      email: 'john@example.com',
    });
  }),
];
```

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Why This Pattern**:
- ✅ Intercept network requests
- ✅ No real API calls in tests
- ✅ Consistent mock data

---

### Pattern 12: e2e-playwright
**Category**: E2E Testing
**Description**: End-to-end tests with Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('user can login successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Fill login form
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');

    // Verify user is logged in
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

**playwright.config.ts**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Why This Pattern**:
- ✅ Real browser testing
- ✅ Multi-browser support
- ✅ Visual testing

---

### Pattern 13: coverage-reporting
**Category**: Quality Metrics
**Description**: Code coverage with Vitest

```bash
npm run test:coverage
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/types.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

**Why This Pattern**:
- ✅ Track test coverage
- ✅ Enforce minimum thresholds
- ✅ Multiple report formats

---

### Pattern 14: test-hooks
**Category**: Testing Utilities
**Description**: Test custom hooks with @testing-library/react-hooks

```typescript
// hooks/__tests__/useCounter.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements counter', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets counter', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

**Why This Pattern**:
- ✅ Test hooks in isolation
- ✅ `act()` for state updates
- ✅ No component wrapper needed

---

### Pattern 15: ci-pipeline
**Category**: CI/CD
**Description**: GitHub Actions CI pipeline

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload E2E report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

**Why This Pattern**:
- ✅ Automated testing on PRs
- ✅ Coverage reporting
- ✅ E2E test execution

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Jest
```typescript
// ❌ DON'T - Use Jest
import { describe } from '@jest/globals';

// ✅ DO - Use Vitest
import { describe } from 'vitest';
```

### ❌ NO Enzyme
```typescript
// ❌ DON'T - Use Enzyme
import { shallow } from 'enzyme';

// ✅ DO - Use React Testing Library
import { render } from '@testing-library/react';
```

### ❌ NO Implementation Details
```typescript
// ❌ DON'T - Test implementation details
expect(component.state.count).toBe(1);

// ✅ DO - Test user-visible behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

---

## ✅ BEST PRACTICES

1. **Query Priority**: getByRole > getByLabelText > getByPlaceholderText > getByText
2. **User Interactions**: Use `userEvent` over `fireEvent`
3. **Async Testing**: Use `findBy` queries and `waitFor`
4. **Accessibility**: Test with `jest-axe`
5. **Coverage**: Aim for ≥80% coverage
6. **Mock API**: Use MSW for consistent mocking
7. **E2E**: Test critical user flows with Playwright

---

## 🔗 INTEGRATION WITH C# BACKEND

- Mock API responses with MSW
- E2E tests hit real backend (dev environment)
- Contract testing with Pact (optional)

---

**Integration**: Works with all React specialists
**Backend**: C# ASP.NET Core REST API
**Testing**: Vitest + React Testing Library + Playwright
**Coverage**: ≥80% threshold
**Version**: Vitest 1.x + React Testing Library 14.x
