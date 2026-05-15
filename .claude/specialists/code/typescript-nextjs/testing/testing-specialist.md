# Frontend Testing Strategy Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (testing is cross-cutting) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 67.1–67.6 |
| **Source Paths** | N/A (no test files exist yet) |
| **File Count** | 0 test files |
| **Naming Convention** | `{component}.test.tsx`, `{module}.spec.ts` |
| **Imports From** | Vitest, React Testing Library (recommended) |
| **Imported By** | CI/CD pipeline (future) |
| **Cannot Import** | N/A (cross-cutting — defines rules rather than following them) |

---

## Description

The application currently has ZERO test files. No Jest, Vitest, RTL, Cypress, or Playwright is installed. This specialist provides the RECOMMENDED testing setup, not existing patterns. Use these patterns when writing new tests.

---

## Key Concepts

### 67.1 — Current State (Honest Baseline)

| Item | Status |
|------|--------|
| Test files (*.test.*, *.spec.*) | **NONE** |
| Jest / Vitest | **NOT configured** |
| React Testing Library | **NOT installed** |
| Cypress | **NOT configured** |
| Playwright | **NOT installed** |
| package.json test script | **NONE** |

### 67.2 — Recommended Testing Stack

| Tool | Purpose | Reason |
|------|---------|--------|
| Vitest | Unit + integration | Next.js compatible, fast HMR |
| @testing-library/react | Component testing | Industry standard for React |
| @testing-library/user-event | User interaction simulation | More realistic than fireEvent |
| msw (Mock Service Worker) | API mocking | Intercepts Axios requests |
| Playwright | E2E testing | Keycloak SSO support |

### 67.3 — Vitest Setup for Next.js

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': '/src' },  // Match tsconfig paths
  },
});
```

### 67.4 — Ant Design Component Testing

```typescript
import { ConfigProvider } from 'antd';

// Must wrap with ConfigProvider for theme tokens:
const renderWithProviders = (ui: ReactNode) =>
  render(
    <ConfigProvider theme={{ token: { colorPrimary: '#f14d22' } }}>
      {ui}
    </ConfigProvider>
  );
```

### 67.5 — Redux Store Mocking

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import commonReducer from '@/infrastructure/redux/commonSlice';
import detailReducer from '@/infrastructure/redux/detailSlice';

const makeTestStore = (preloadedState = {}) =>
  configureStore({
    reducer: {
      common: commonReducer,
      detail: detailReducer,
    },
    preloadedState,
  });

const renderWithStore = (ui: ReactNode, state = {}) =>
  render(<Provider store={makeTestStore(state)}>{ui}</Provider>);
```

### 67.6 — Keycloak E2E with Playwright

```typescript
// playwright.config.ts: storageState for auth
// tests/auth.setup.ts: login flow through Keycloak UI
// tests/fixtures.ts: extend test with authenticated context
test.use({ storageState: 'playwright/.auth/user.json' });
```

Keycloak redirect-based auth requires Playwright's `storageState` pattern — Cypress cannot handle multi-domain SSO redirects cleanly.

---

## Anti-Patterns

- Using Jest instead of Vitest (Next.js App Router compatibility issues)
- Mocking Redux store with plain objects instead of configureStore
- Testing Ant Design components without ConfigProvider wrapper
- Using Cypress for Keycloak SSO (multi-domain redirect issues)
- Writing snapshot tests for dynamic CRM content (too brittle)
- Testing implementation details instead of user behavior

---

## Related Specialists

- `redux-toolkit-specialist.md` (53.x) — Store structure for mocking
- `permission-specialist.md` (57.x) — Permission mocking for button tests
- `antd-form-specialist.md` (55.x) — Form testing patterns
- `crud-page-patterns-specialist.md` (82.x) — Page-level test targets
