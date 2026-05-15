---
id: tps-nextjs-e2e
stack: typescript-nextjs
type: e2e
category: test-plan
subcategory: nextjs
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E10]
---

# E2E Test Patterns for Next.js with Playwright
# Next.js + PlaywrightのE2Eテストパターン

## SECTION 1: PATTERNS

### Page Object Model (POM)
- `class LoginPage { constructor(page) { this.page = page; } }` — encapsulate page interactions
- `async goto() { await this.page.goto('/login'); }` — navigation methods
- `async login(user, pass) { ... }` — high-level action methods
- Reusable across multiple test files

### Auth State Management
- `test.use({ storageState: 'auth.json' })` — reuse authenticated state
- `globalSetup` — login once, save storage state
- `test.describe.configure({ mode: 'serial' })` — ordered auth flow tests
- Multiple auth states: admin, user, unauthenticated

### Multi-Module Flow Testing
- Cross-module navigation: Customer → Schedule → Report
- Verify data created in Module A visible in Module B
- Test breadcrumb / back navigation between modules
- Full user journey: login → action → verify → logout

### Visual & Accessibility
- `expect(page).toHaveScreenshot()` — visual regression
- `page.accessibility.snapshot()` — accessibility tree check
- `expect(page.getByRole('heading')).toBeVisible()` — semantic elements
- Test responsive layouts: mobile, tablet, desktop viewports

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Login flow | POM + storageState | Reuse auth, fast execution |
| CRUD operation | POM + sequential steps | Full user journey |
| Cross-module | Multiple POMs + data sharing | Real multi-module flow |
| Visual regression | toHaveScreenshot() | Catch UI regressions |
| Accessibility | axe-core + getByRole | WCAG compliance |
| Multi-tenant | Auth state per tenant | Tenant isolation E2E |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `test('should [userAction] [expectedResult]')`
- Example: `test('should create customer and see it in customer list')`

### Assertion Requirements
- Minimum 2 assertions per E2E test
- Must verify: navigation success + data visible on target page
- Wait for network idle before assertions

### Coverage Targets
- Every critical user journey has E2E test
- Auth flows: login, logout, session expiry, role-based access
- CRUD for primary entities: create, read, update, delete
- Cross-module flows: at least 1 per module pair
