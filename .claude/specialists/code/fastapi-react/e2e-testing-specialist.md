# E2E Testing Specialist

**Role**: End-to-end testing expert with Playwright for React 19 + FastAPI applications
**Focus**: User flows, page tests, feature tests, browser automation
**Patterns**: 20 patterns (15.1-15.15 E2E + 15.36-15.40 CI/CD)
**Format**: Workflow as Code (pseudo-code)

---

## SPECIALIST IDENTITY

```yaml
specialist:
  name: "E2E Testing Specialist"
  domain: "Frontend Testing"
  expertise:
    - Playwright test automation
    - User flow testing
    - Multi-browser testing
    - Page Object Model
    - Test fixtures and utilities
    - CI/CD integration

  technologies:
    testing: ["Playwright", "TypeScript 5"]
    browsers: ["Chromium", "Firefox", "WebKit"]
    ci_cd: ["GitHub Actions"]
    utilities: ["Page Object Model", "Test Fixtures"]

  responsibilities:
    - Write comprehensive E2E tests for user journeys
    - Test cross-page navigation and interactions
    - Verify real-time features (WebSocket)
    - Test form submissions and validations
    - Verify error handling and edge cases
    - Implement test fixtures and Page Objects
    - Debug and optimize E2E test execution
    - Generate test reports and coverage
```

---

## PATTERN COVERAGE

### User Flows (Patterns 15.1-15.5)

#### Pattern 15.1: Login Flow E2E Test
*(Reference: `/tmp/day14-context/integration-testing-patterns.md` lines 33-150)*

```pseudo
WORKFLOW LoginFlow_E2ETest {
  INPUT: {
    test_scenarios: [
      "valid_credentials",
      "invalid_credentials",
      "email_validation",
      "required_fields",
      "forgot_password_navigation"
    ]
  }

  STEPS: {
    STEP_1_SETUP: {
      description: "Navigate to login page before each test"
      logic: |
        test.beforeEach(async ({ page }) => {
          NAVIGATE page TO '/login'
        })
    }

    STEP_2_VALID_LOGIN: {
      description: "Test successful login flow"
      logic: |
        test('should login successfully with valid credentials', async ({ page }) => {
          // Fill form
          FILL page.input('name="email"') WITH 'admin@example.com'
          FILL page.input('name="password"') WITH 'password123'

          // Submit
          CLICK page.button('type="submit"')

          // Verify navigation
          WAIT FOR page.url TO BE '/dashboard'

          // Verify UI elements
          EXPECT page.locator('text=Welcome back') TO BE VISIBLE
          EXPECT page.locator('[data-testid="user-menu"]') TO BE VISIBLE

          // Verify auth token
          authToken = EVALUATE localStorage.getItem('auth_token')
          EXPECT authToken TO BE TRUTHY
        })
    }

    STEP_3_INVALID_CREDENTIALS: {
      description: "Test error handling for invalid login"
      logic: |
        test('should show error with invalid credentials', async ({ page }) => {
          FILL email WITH 'invalid@example.com'
          FILL password WITH 'wrongpassword'
          CLICK submit_button

          // Verify error message
          EXPECT page.locator('text=Invalid credentials') TO BE VISIBLE

          // Verify still on login page
          EXPECT page.url TO BE '/login'

          // Verify no token stored
          authToken = EVALUATE localStorage.getItem('auth_token')
          EXPECT authToken TO BE NULL
        })
    }

    STEP_4_EMAIL_VALIDATION: {
      description: "Test email format validation"
      logic: |
        FILL email WITH 'invalid-email'
        CLICK submit
        EXPECT page.locator('text=Invalid email address') TO BE VISIBLE
    }

    STEP_5_REQUIRED_FIELDS: {
      description: "Test required field validation"
      logic: |
        CLICK submit WITHOUT filling fields
        EXPECT page.locator('text=Email is required') TO BE VISIBLE
        EXPECT page.locator('text=Password is required') TO BE VISIBLE
    }
  }

  OUTPUT: {
    test_coverage: "Login flow with 5 scenarios",
    assertions: "Navigation, UI visibility, localStorage, error messages"
  }
}
```

**Playwright Config**:
```pseudo
WORKFLOW PlaywrightConfig {
  CONFIG: {
    testDir: './tests/e2e',
    fullyParallel: true,
    retries: CI ? 2 : 0,
    workers: CI ? 1 : undefined,
    reporter: 'html',

    use: {
      baseURL: 'http://localhost:3000',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure'
    },

    projects: ['chromium', 'firefox', 'webkit'],

    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !CI
    }
  }
}
```

---

#### Pattern 15.2: User CRUD E2E Test

```pseudo
WORKFLOW UserCRUD_E2ETest {
  INPUT: {
    operations: ["create", "read", "update", "delete"],
    test_user: {
      full_name: "Test User",
      email: "test@example.com",
      role: "MEMBER"
    }
  }

  STEPS: {
    STEP_1_CREATE_USER: {
      description: "Test user creation flow"
      logic: |
        // Navigate to users page
        NAVIGATE TO '/dashboard/users'

        // Open create dialog
        CLICK page.button('text=Add User')
        WAIT FOR page.dialog TO BE VISIBLE

        // Fill form
        FILL 'input[name="full_name"]' WITH test_user.full_name
        FILL 'input[name="email"]' WITH test_user.email
        SELECT 'select[name="role"]' OPTION test_user.role

        // Submit
        CLICK dialog.button('text=Create')

        // Verify toast notification
        EXPECT page.locator('text=User created successfully') TO BE VISIBLE

        // Verify user appears in table
        EXPECT page.locator(`text=${test_user.email}`) TO BE VISIBLE
    }

    STEP_2_READ_USER: {
      description: "Test user view/details"
      logic: |
        // Find user row
        userRow = page.locator(`tr:has-text("${test_user.email}")`)

        // Click view button
        CLICK userRow.button('[data-testid="view-user"]')

        // Verify details displayed
        EXPECT page.locator('text=User Details') TO BE VISIBLE
        EXPECT page.locator(`text=${test_user.full_name}`) TO BE VISIBLE
        EXPECT page.locator(`text=${test_user.role}`) TO BE VISIBLE
    }

    STEP_3_UPDATE_USER: {
      description: "Test user edit flow"
      logic: |
        // Open edit dialog
        CLICK userRow.button('[data-testid="edit-user"]')
        WAIT FOR dialog TO BE VISIBLE

        // Update fields
        updated_name = "Updated Test User"
        FILL 'input[name="full_name"]' WITH updated_name

        // Submit
        CLICK dialog.button('text=Save')

        // Verify toast
        EXPECT page.locator('text=User updated successfully') TO BE VISIBLE

        // Verify table updated
        EXPECT page.locator(`text=${updated_name}`) TO BE VISIBLE
    }

    STEP_4_DELETE_USER: {
      description: "Test user deletion with confirmation"
      logic: |
        // Click delete button
        CLICK userRow.button('[data-testid="delete-user"]')

        // Confirm deletion
        WAIT FOR confirmation_dialog
        CLICK confirmation_dialog.button('text=Delete')

        // Verify toast
        EXPECT page.locator('text=User deleted successfully') TO BE VISIBLE

        // Verify user removed from table
        EXPECT page.locator(`text=${test_user.email}`) NOT TO BE VISIBLE
    }
  }

  OUTPUT: {
    test_coverage: "Full CRUD lifecycle",
    interactions: "Dialogs, forms, tables, toasts"
  }
}
```

---

#### Pattern 15.3: Conversation Flow E2E Test

```pseudo
WORKFLOW ConversationFlow_E2ETest {
  INPUT: {
    user1: { email: "user1@example.com", password: "password123" },
    user2: { email: "user2@example.com", password: "password123" },
    message: "Hello from User 1!"
  }

  STEPS: {
    STEP_1_TWO_BROWSER_SETUP: {
      description: "Setup two authenticated browser contexts"
      logic: |
        // Browser 1 (User 1)
        context1 = await browser.newContext()
        page1 = await context1.newPage()
        await LOGIN(page1, user1.email, user1.password)

        // Browser 2 (User 2)
        context2 = await browser.newContext()
        page2 = await context2.newPage()
        await LOGIN(page2, user2.email, user2.password)
    }

    STEP_2_SEND_MESSAGE: {
      description: "User 1 sends message to User 2"
      logic: |
        // User 1: Navigate to conversations
        NAVIGATE page1 TO '/dashboard/conversations'

        // Start new conversation with User 2
        CLICK page1.button('text=New Conversation')
        FILL page1.input('search-user') WITH user2.email
        CLICK page1.locator(`text=${user2.email}`)

        // Type and send message
        FILL page1.textarea('[data-testid="message-input"]') WITH message
        CLICK page1.button('text=Send')

        // Verify message appears in User 1's view
        EXPECT page1.locator(`text=${message}`) TO BE VISIBLE
    }

    STEP_3_REALTIME_DELIVERY: {
      description: "Verify User 2 receives message in real-time (WebSocket)"
      logic: |
        // User 2: Navigate to conversations
        NAVIGATE page2 TO '/dashboard/conversations'

        // Verify unread badge appears
        WAIT FOR page2.locator('[data-testid="unread-badge"]') TO BE VISIBLE

        // Open conversation
        CLICK page2.locator(`text=${user1.email}`)

        // Verify message received
        EXPECT page2.locator(`text=${message}`) TO BE VISIBLE

        // Verify unread count cleared
        EXPECT page2.locator('[data-testid="unread-badge"]') NOT TO BE VISIBLE
    }

    STEP_4_CLEANUP: {
      description: "Close contexts"
      logic: |
        await context1.close()
        await context2.close()
    }
  }

  OUTPUT: {
    test_type: "Multi-context E2E test",
    real_time: "WebSocket message delivery verification"
  }
}
```

---

#### Patterns 15.4-15.5: Export & Settings Tests

```pseudo
WORKFLOW DataExportAndSettings_E2ETests {
  EXPORT_TEST: {
    description: "Test file downloads (CSV, PDF, Excel)"
    logic: |
      NAVIGATE TO '/dashboard/users'
      CLICK export_button
      FOR EACH format IN ["CSV", "PDF", "Excel"]:
        SELECT format
        download = WAIT FOR download_event
        VERIFY filename MATCHES `users.${format.toLowerCase()}`
      END FOR
  }

  SETTINGS_TEST: {
    description: "Test profile, security, preferences updates"
    logic: |
      // Profile
      UPDATE '/dashboard/settings/profile' WITH { name: 'Updated', phone: '+84 987 654 321' }
      VERIFY toast 'Profile updated successfully'

      // Password
      UPDATE '/dashboard/settings/security' WITH { current: 'old', new: 'new123', confirm: 'new123' }
      VERIFY toast 'Password changed successfully'

      // Preferences
      UPDATE '/dashboard/settings/preferences' WITH { language: 'vi', theme: 'dark' }
      VERIFY page.locator('html') HAS CLASS 'dark'
  }
}
```

---

### Page Tests (Patterns 15.6-15.10)

```pseudo
WORKFLOW PageTests_E2E {
  HOME_PAGE (15.6): {
    unauthenticated: |
      NAVIGATE '/' → VERIFY elements: 'Welcome to StarX4CRM', 'Sign In', 'Get Started'
    authenticated: |
      LOGIN → NAVIGATE '/' → EXPECT redirect TO '/dashboard'
  }

  USERS_PAGE (15.7): {
    page_load: |
      NAVIGATE '/dashboard/users' → VERIFY table, columns (Name, Email, Role)
    pagination: |
      CLICK 'Next' → VERIFY url='page=2' → VERIFY different_data_loaded
    search: |
      FILL search WITH 'admin' → WAIT 500ms → VERIFY all_rows CONTAIN 'admin'
  }

  CONVERSATIONS_PAGE (15.8): {
    logic: |
      NAVIGATE '/dashboard/conversations'
      VERIFY conversation_list, search_bar, new_conversation_button
      CLICK conversation → VERIFY message_history, input_field
  }

  DASHBOARD_PAGE (15.9): {
    logic: |
      NAVIGATE '/dashboard'
      VERIFY stats_cards (total_users, active_conversations, pending_tasks)
      VERIFY charts_rendered (user_growth, activity_timeline)
  }

  PROFILE_PAGE (15.10): {
    logic: |
      NAVIGATE '/dashboard/profile'
      VERIFY user_info_displayed (name, email, avatar, role)
      TEST edit_profile_flow
      TEST avatar_upload_flow
  }
}
```

---

### Feature Tests (Patterns 15.11-15.15)

```pseudo
WORKFLOW FeatureTests_E2E {
  SEARCH (15.11): {
    logic: |
      PRESS 'Control+K' → WAIT FOR search_modal
      FILL search WITH 'user@example.com' → WAIT 300ms
      VERIFY results_grouped_by_type (Users, Conversations)
      CLICK result[0] → EXPECT navigation TO '/dashboard/users/*'
  }

  FILTERS (15.12): {
    apply: |
      CLICK filter_button → SELECT role='ADMIN', status='ACTIVE', created_after='2024-01-01'
      CLICK 'Apply' → VERIFY url CONTAINS 'role=ADMIN&status=ACTIVE'
      VERIFY all_rows CONTAIN 'ADMIN'
    clear: |
      CLICK 'Clear Filters' → VERIFY url_params_cleared → VERIFY more_results_shown
  }

  FORM_VALIDATION (15.13): {
    client_side: |
      SUBMIT empty_form → VERIFY errors: 'Name is required', 'Email is required'
      FILL email='invalid' → BLUR → VERIFY error: 'Invalid email format'
    server_side: |
      FILL email='existing@example.com' → SUBMIT
      VERIFY error: 'Email already exists'
  }

  FILE_UPLOAD (15.14): {
    avatar: |
      setInputFiles('avatar.jpg') → WAIT FOR upload_progress → upload_complete
      VERIFY avatar_preview src MATCHES 'avatar.jpg'
    bulk: |
      setInputFiles(['file1.pdf', 'file2.docx', 'file3.xlsx'])
      FOR i IN 1..3: VERIFY file[i]_uploaded
  }

  NOTIFICATIONS (15.15): {
    toast: |
      CLICK save → VERIFY toast VISIBLE WITH 'Saved successfully'
      WAIT 3500ms → VERIFY toast NOT VISIBLE
    bell: |
      CLICK notification_bell → VERIFY dropdown VISIBLE
      VERIFY notification_items.count > 0
      CLICK notification[0] → VERIFY navigation
  }
}
```

---

### CI/CD Integration (Patterns 15.36-15.40)

```pseudo
WORKFLOW CICD_QualityGates {
  GITHUB_ACTIONS_PIPELINE (15.36): {
    file: ".github/workflows/ci.yml"
    jobs: |
      e2e-tests:
        runs-on: ubuntu-latest
        steps:
          - CHECKOUT code → SETUP Node 20 → npm ci
          - npx playwright install --with-deps
          - docker-compose up -d backend postgres redis
          - npm run test:e2e
          - UPLOAD artifacts: playwright-report, screenshots (if failed)
  }

  COVERAGE_REQUIREMENTS (15.37): {
    thresholds: {
      user_flows: "≥90%",
      critical_paths: "100%",
      pages: "≥80%",
      features: "≥70%"
    }
    enforcement: |
      RUN playwright test --reporter=html,json
      PARSE coverage_report.json
      IF coverage.user_flows < 90% OR coverage.critical_paths < 100% THEN
        FAIL "Coverage threshold not met"
      END IF
  }

  PARALLEL_EXECUTION (15.38): {
    config: {
      workers: "CI ? 2 : 4",
      shards: "CI ? 4 : 1",
      timeout: "30s per test",
      retries: "CI ? 2 : 0"
    }
    matrix: |
      strategy: { matrix: { shard: [1,2,3,4], browser: ["chromium", "firefox"] } }
      RUN: npx playwright test --shard=${{matrix.shard}}/4 --project=${{matrix.browser}}
  }

  VISUAL_REGRESSION (15.39): {
    capture: |
      test('screenshot match', async ({ page }) => {
        await page.goto('/')
        await EXPECT(page).toHaveScreenshot('home.png')
      })
    update: |
      npx playwright test --update-snapshots
      COMMIT baselines TO git
  }

  PERFORMANCE_BUDGETS (15.40): {
    budgets: { page_load: "<2s", tti: "<3s", fcp: "<1s", lcp: "<2.5s" }
    measurement: |
      metrics = page.evaluate(() => {
        nav = performance.getEntriesByType('navigation')[0]
        RETURN {
          loadTime: nav.loadEventEnd - nav.fetchStart,
          tti: nav.domInteractive - nav.fetchStart,
          fcp: performance.getEntriesByName('first-contentful-paint')[0].startTime
        }
      })
      VERIFY metrics.loadTime < 2000, metrics.tti < 3000, metrics.fcp < 1000
  }
}
```

---

## TESTING BEST PRACTICES

### Page Object Model

```pseudo
PATTERN PageObjectModel {
  STRUCTURE: |
    class LoginPage {
      constructor(page: Page) { this.page = page }

      async goto() {
        await this.page.goto('/login')
      }

      async login(email: string, password: string) {
        await this.page.fill('input[name="email"]', email)
        await this.page.fill('input[name="password"]', password)
        await this.page.click('button[type="submit"]')
      }

      async getErrorMessage() {
        RETURN await this.page.locator('[data-testid="error"]').textContent()
      }
    }

  USAGE: |
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('user@example.com', 'password123')
}
```

### Test Fixtures

```pseudo
PATTERN TestFixtures {
  AUTH_FIXTURE: |
    export const test = base.extend({
      authenticatedPage: async ({ page }, use) => {
        await page.goto('/login')
        await page.fill('input[name="email"]', 'admin@example.com')
        await page.fill('input[name="password"]', 'password123')
        await page.click('button[type="submit"]')
        await page.waitForURL('/dashboard')
        await use(page)
      }
    })

  USAGE: |
    test('should access protected page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/users')
      await EXPECT(authenticatedPage).toHaveURL('/dashboard/users')
    })
}
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Install browsers: `npx playwright install`
- [ ] Configure `playwright.config.ts`
- [ ] Create test fixtures (auth, test data)
- [ ] Implement Page Object Models
- [ ] Write user flow tests (Patterns 15.1-15.5)
- [ ] Write page tests (Patterns 15.6-15.10)
- [ ] Write feature tests (Patterns 15.11-15.15)
- [ ] Configure CI pipeline (Pattern 15.36)
- [ ] Setup coverage thresholds (Pattern 15.37)
- [ ] Enable parallel execution (Pattern 15.38)
- [ ] Configure visual regression testing (Pattern 15.39)
- [ ] Setup performance budgets (Pattern 15.40)

---

**Technologies**: Playwright, TypeScript 5, Page Object Model, GitHub Actions
**Test Types**: E2E, Visual Regression, Performance
**Coverage**: 20 patterns (15.1-15.15, 15.36-15.40)
**Format**: Workflow as Code (pseudo-code)

---

*End of E2E Testing Specialist*
