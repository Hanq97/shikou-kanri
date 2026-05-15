---
id: ts-nextjs-e2e
stack: typescript-nextjs
type: e2e
category: code-gen
subcategory: nextjs
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E10]
---

# Code Generation Template: Next.js E2E Tests with Playwright
# コード生成テンプレート：Next.js + Playwright E2Eテスト

## Template: Page Object

```typescript
import { Page, Locator, expect } from '@playwright/test';

export class ${PageName}Page {
  readonly page: Page;
  readonly ${elementName}: Locator;
  readonly ${tableName}: Locator;
  readonly ${buttonName}: Locator;

  constructor(page: Page) {
    this.page = page;
    this.${elementName} = page.getByRole('heading', { name: '${pageTitle}' });
    this.${tableName} = page.getByRole('table');
    this.${buttonName} = page.getByRole('button', { name: '${buttonLabel}' });
  }

  async goto() {
    await this.page.goto('/${routePath}');
    await this.${elementName}.waitFor();
  }

  async ${actionMethod}(${params}: string) {
    await this.${buttonName}.click();
    await this.page.getByLabel('${fieldLabel}').fill(${params});
    await this.page.getByRole('button', { name: /save|submit/i }).click();
  }

  async getRowCount(): Promise<number> {
    return this.${tableName}.getByRole('row').count() - 1; // minus header
  }
}
```

## Template: E2E Test Spec

```typescript
import { test, expect } from '@playwright/test';
import { ${PageName}Page } from './pages/${PageName}Page';

test.describe('${FeatureName}', () => {
  let ${pageName}Page: ${PageName}Page;

  test.beforeEach(async ({ page }) => {
    ${pageName}Page = new ${PageName}Page(page);
    await ${pageName}Page.goto();
  });

  test('should display ${resource} list', async () => {
    await expect(${pageName}Page.${elementName}).toBeVisible();
    const count = await ${pageName}Page.getRowCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should create ${resource} and see it in list', async ({ page }) => {
    const initialCount = await ${pageName}Page.getRowCount();

    await ${pageName}Page.${actionMethod}('${testValue}');

    // Verify success notification
    await expect(page.getByText(/success|created/i)).toBeVisible();

    // Verify item appears in list
    const newCount = await ${pageName}Page.getRowCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should navigate to detail page on row click', async ({ page }) => {
    await ${pageName}Page.${tableName}.getByRole('row').nth(1).click();

    await expect(page).toHaveURL(/\/${routePath}\/\w+/);
    await expect(page.getByRole('heading', { name: '${detailTitle}' })).toBeVisible();
  });
});
```

## Template: Auth Global Setup

```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login as admin
  await page.goto('${baseUrl}/login');
  await page.getByLabel('Username').fill('${adminUser}');
  await page.getByLabel('Password').fill('${adminPass}');
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await page.waitForURL('${baseUrl}/dashboard');

  // Save admin storage state
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });

  // Login as regular user
  await page.goto('${baseUrl}/login');
  await page.getByLabel('Username').fill('${regularUser}');
  await page.getByLabel('Password').fill('${regularPass}');
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await page.waitForURL('${baseUrl}/dashboard');

  // Save user storage state
  await page.context().storageState({ path: 'playwright/.auth/user.json' });

  await browser.close();
}

export default globalSetup;
```

## Template: Auth-Aware Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin-only features', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should access admin panel', async ({ page }) => {
    await page.goto('/${adminPath}');
    await expect(page.getByRole('heading', { name: '${adminTitle}' })).toBeVisible();
  });
});

test.describe('Regular user restrictions', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should not access admin panel', async ({ page }) => {
    await page.goto('/${adminPath}');
    await expect(page).toHaveURL(/\/(login|forbidden)/);
  });
});
```
