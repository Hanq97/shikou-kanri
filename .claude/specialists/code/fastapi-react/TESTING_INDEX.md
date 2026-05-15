# Testing Specialists - INDEX

**Category**: Integration Testing
**Specialists**: 2 (E2E Testing, API Integration)
**Total Patterns**: 34 patterns (15.1-15.40, excluding 15.30-15.35)
**Format**: Workflow as Code (pseudo-code)
**Purpose**: Enable SpecialistLoader auto-discovery for testing orchestration

---

## SPECIALIST OVERVIEW

### E2E Testing Specialist
**File**: [e2e-testing-specialist.md](./e2e-testing-specialist.md)
**Size**: 641 lines
**Patterns**: 20 patterns (15.1-15.15, 15.36-15.40)
**Coverage**:
- User Flows (15.1-15.5): Login, CRUD, Conversations, Export, Settings
- Page Tests (15.6-15.10): Home, Users, Conversations, Dashboard, Profile
- Feature Tests (15.11-15.15): Search, Filters, Validation, Upload, Notifications
- CI/CD (15.36-15.40): GitHub Actions, Coverage, Parallel execution, Visual regression, Performance

### API Integration Testing Specialist
**File**: [api-integration-specialist.md](./api-integration-specialist.md)
**Size**: 755 lines
**Patterns**: 14 patterns (15.16-15.29)
**Coverage**:
- REST API Tests (15.16-15.20): Authentication, User CRUD, Conversations, File upload, Error handling
- WebSocket Tests (15.21-15.23): Real-time messaging, Presence, Connection handling
- Component Integration (15.26-15.29): CreateUser, EditUser, Filters, Stats widget

---

## PATTERN COVERAGE MAPPING

### End-to-End Tests (Playwright)
| Pattern | Category | Description | Specialist |
|---------|----------|-------------|------------|
| 15.1 | User Flow | Login flow (success, errors, validation) | E2E Testing |
| 15.2 | User Flow | User CRUD flow (create, read, update, delete) | E2E Testing |
| 15.3 | User Flow | Conversation flow (multi-browser, WebSocket) | E2E Testing |
| 15.4 | User Flow | Data export (CSV, PDF, Excel) | E2E Testing |
| 15.5 | User Flow | Settings update (profile, security, preferences) | E2E Testing |
| 15.6 | Page Test | Home page (unauthenticated, authenticated redirect) | E2E Testing |
| 15.7 | Page Test | Users page (table, pagination, search) | E2E Testing |
| 15.8 | Page Test | Conversations page (list, message history) | E2E Testing |
| 15.9 | Page Test | Dashboard page (stats cards, charts) | E2E Testing |
| 15.10 | Page Test | Profile page (view, edit, avatar upload) | E2E Testing |
| 15.11 | Feature Test | Global search (keyboard shortcut, results) | E2E Testing |
| 15.12 | Feature Test | Filters (apply, clear, URL params) | E2E Testing |
| 15.13 | Feature Test | Form validation (client-side, server-side) | E2E Testing |
| 15.14 | Feature Test | File upload (avatar, bulk files) | E2E Testing |
| 15.15 | Feature Test | Notifications (toast, bell dropdown) | E2E Testing |

### API Integration Tests (pytest + httpx)
| Pattern | Category | Description | Specialist |
|---------|----------|-------------|------------|
| 15.16 | REST API | Authentication API (login, register, refresh, logout) | API Integration |
| 15.17 | REST API | User CRUD API (create, read, update, delete, list, filter) | API Integration |
| 15.18 | REST API | Conversation API (create, messages, mark as read) | API Integration |
| 15.19 | REST API | File upload API (single file, validation) | API Integration |
| 15.20 | REST API | Error handling (validation, not found, conflict, 500) | API Integration |
| 15.21 | WebSocket | Real-time messaging (two clients, message delivery) | API Integration |
| 15.22 | WebSocket | Presence updates (online/offline status broadcast) | API Integration |
| 15.23 | WebSocket | Connection handling (ping/pong, disconnect) | API Integration |

### Component Integration Tests (Jest + MSW)
| Pattern | Category | Description | Specialist |
|---------|----------|-------------|------------|
| 15.26 | Component + API | CreateUser component with API integration | API Integration |
| 15.27 | Component + API | EditUser component with API integration | API Integration |
| 15.28 | Component + API | Filters component with API integration | API Integration |
| 15.29 | Component + API | Stats widget with API integration | API Integration |

### CI/CD & Quality Gates
| Pattern | Category | Description | Specialist |
|---------|----------|-------------|------------|
| 15.36 | CI/CD | GitHub Actions pipeline (E2E tests, artifacts) | E2E Testing |
| 15.37 | Quality Gate | Test coverage requirements (≥90% user flows) | E2E Testing |
| 15.38 | CI/CD | Parallel execution (workers, shards, matrix) | E2E Testing |
| 15.39 | Quality Gate | Visual regression testing (screenshot comparison) | E2E Testing |
| 15.40 | Quality Gate | Performance budgets (<2s load, <3s TTI, <1s FCP) | E2E Testing |

---

## USAGE EXAMPLES

### Loading E2E Testing Specialist

```javascript
const specialist = await SpecialistLoader.load('e2e-testing-specialist');

// Get pattern for login flow
const loginPattern = specialist.getPattern('15.1');

// Execute Playwright test generation
await specialist.execute({
  command: 'generate-test',
  pattern: '15.2',  // User CRUD E2E Test
  output: 'tests/e2e/users/crud.spec.ts'
});
```

### Loading API Integration Specialist

```javascript
const specialist = await SpecialistLoader.load('api-integration-specialist');

// Get pattern for authentication tests
const authPattern = specialist.getPattern('15.16');

// Execute pytest test generation
await specialist.execute({
  command: 'generate-test',
  pattern: '15.17',  // User CRUD API Test
  output: 'backend/tests/integration/test_user_api.py'
});
```

### Generating Full Test Suite

```javascript
const testingOrchestrator = new TestingOrchestrator({
  specialists: [
    'e2e-testing-specialist',
    'api-integration-specialist'
  ]
});

await testingOrchestrator.generateTestSuite({
  features: ['authentication', 'users', 'conversations'],
  coverage_target: 90,
  include_e2e: true,
  include_api: true,
  include_component_integration: true
});
```

---

## TECHNOLOGY STACK

### Frontend E2E Testing
- **Framework**: Playwright
- **Language**: TypeScript 5
- **Browsers**: Chromium, Firefox, WebKit
- **Utilities**: Page Object Model, Test Fixtures
- **CI/CD**: GitHub Actions
- **Reporters**: HTML, JSON

### Backend API Testing
- **Framework**: pytest
- **Language**: Python 3.11+
- **HTTP Client**: httpx (AsyncClient)
- **Extensions**: pytest-asyncio, pytest-cov
- **Database**: PostgreSQL with transaction rollback
- **Coverage**: pytest-cov with HTML reports

### Frontend Integration Testing
- **Framework**: Jest
- **Language**: TypeScript 5
- **Testing Library**: @testing-library/react, @testing-library/user-event
- **API Mocking**: MSW (Mock Service Worker)
- **Assertions**: @testing-library/jest-dom

---

## INTEGRATION PATTERNS

### E2E Test Execution Flow
```
1. Start test server (npm run dev)
2. Start backend (docker-compose up backend postgres redis)
3. Run Playwright tests (npx playwright test)
4. Generate reports (playwright-report/)
5. Upload artifacts to CI (screenshots, videos, traces)
```

### API Test Execution Flow
```
1. Setup test database (create test schema)
2. Run migrations (alembic upgrade head)
3. Execute pytest (pytest --cov=app --cov-report=html)
4. Auto-rollback transactions (per test fixture)
5. Generate coverage report (htmlcov/)
```

### Component Integration Test Flow
```
1. Setup MSW handlers (mock API endpoints)
2. Render component (with @testing-library/react)
3. Simulate user interactions (userEvent.type, userEvent.click)
4. Intercept API calls (MSW captures requests)
5. Assert UI updates and API behavior
```

---

## QUALITY GATES

### Coverage Requirements
- **User Flows**: ≥90% coverage
- **Critical Paths**: 100% coverage (login, payments, data export)
- **Pages**: ≥80% coverage
- **Features**: ≥70% coverage
- **API Endpoints**: ≥80% coverage

### Performance Budgets
- **Page Load**: <2 seconds
- **Time to Interactive**: <3 seconds
- **First Contentful Paint**: <1 second
- **Largest Contentful Paint**: <2.5 seconds

### CI/CD Gates
- All E2E tests must pass
- API test coverage ≥80%
- No visual regression failures (unless approved)
- Performance budgets met
- Linting and formatting pass

---

## KEYWORDS FOR DISCOVERY

**E2E Testing**: playwright, e2e, user-flow, page-test, browser-automation, multi-browser, visual-regression, performance-testing, ci-cd-pipeline

**API Testing**: pytest, fastapi, httpx, async-client, rest-api, crud-tests, authentication-tests, websocket-tests, integration-tests

**Component Integration**: jest, msw, testing-library, component-tests, api-mocking, user-events, frontend-integration

**Quality Gates**: coverage, thresholds, performance-budgets, ci-cd, github-actions, parallel-execution

---

## ACCESSIBILITY NOTES

All E2E tests verify WCAG 2.1 AA compliance:
- Keyboard navigation (Tab, Enter, Esc, Arrow keys)
- ARIA attributes (role, aria-label, aria-expanded, aria-live)
- Focus management (visible focus indicators, focus trap in modals)
- Screen reader support (semantic HTML, proper labeling)
- Color contrast (4.5:1 for normal text, 3:1 for large text)

---

## COMPLIANCE METRICS

**Strict Compliance (≤800 lines)**: 100% (2/2 files)
- e2e-testing-specialist.md: 641 lines ✅
- api-integration-specialist.md: 755 lines ✅

**Buffer Compliance (≤900 lines)**: 100% (2/2 files)

**Format**: Workflow as Code (pseudo-code) ✅
**Average File Size**: 698 lines
**Total Lines**: 1,396 specialist lines + 274 index = 1,670 lines

---

*Last Updated*: 2026-01-03
*Phase 4 - Day 14*: Integration Testing Specialists
*Total Patterns*: 34 patterns (15.1-15.40, excluding 15.30-15.35)
