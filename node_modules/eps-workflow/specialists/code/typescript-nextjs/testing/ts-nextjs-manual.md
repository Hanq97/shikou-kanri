---
id: ts-nextjs-manual
stack: typescript-nextjs
type: manual
category: code-gen
subcategory: nextjs
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E18]
---

# Code Generation Template: Manual Test Checklists & Accessibility
# コード生成テンプレート：手動テストチェックリスト＆アクセシビリティ

## Template: Manual Test Checklist

```markdown
# Manual Test Checklist: ${FeatureName}
# 手動テストチェックリスト：${FeatureName}

## TC-${MODULE}-FUN-001: ${TestCaseName}

### Preconditions
- [ ] User logged in as ${role}
- [ ] Test data prepared: ${testDataDescription}
- [ ] Environment: ${environment}

### Steps

| # | Action | Expected Result | Actual Result | Pass/Fail |
|---|--------|-----------------|---------------|-----------|
| 1 | Navigate to ${pagePath} | ${pageTitle} page displayed | | |
| 2 | Click "${buttonLabel}" button | ${modalOrFormTitle} opens | | |
| 3 | Enter "${testValue}" in ${fieldName} | Value displayed in field | | |
| 4 | Click "Save" | Success notification shown | | |
| 5 | Verify ${resource} in list | New ${resource} visible in table | | |

### Postconditions
- [ ] ${resource} created in database
- [ ] Audit log entry created
```

## Template: Visual Verification Checklist

```markdown
# Visual Verification: ${FeatureName}
# ビジュアル検証：${FeatureName}

## TC-${MODULE}-VIS-001: Layout Consistency

### Desktop (1920x1080)
- [ ] Page header aligned correctly
- [ ] Navigation sidebar width matches design (240px)
- [ ] Content area fills remaining space
- [ ] Table columns not truncated
- [ ] Action buttons aligned right

### Tablet (768x1024)
- [ ] Sidebar collapsed to hamburger menu
- [ ] Content area full width
- [ ] Table horizontal scroll if needed
- [ ] Modal width ≤ 90% viewport

### Mobile (375x812)
- [ ] Single column layout
- [ ] Form fields stack vertically
- [ ] Buttons full width
- [ ] No horizontal overflow

### Theme Consistency
- [ ] Colors match design tokens
- [ ] Typography scale correct (h1: 24px, h2: 20px, body: 14px)
- [ ] Spacing follows 8px grid
- [ ] Icons consistent size (16px inline, 24px standalone)
```

## Template: Accessibility Audit

```markdown
# Accessibility Audit: ${FeatureName}
# アクセシビリティ監査：${FeatureName}

## TC-${MODULE}-ACC-001: Keyboard Navigation

### Tab Order
- [ ] Tab moves focus in logical order (top-to-bottom, left-to-right)
- [ ] Skip link available to bypass navigation
- [ ] Focus visible on all interactive elements
- [ ] No keyboard traps (can Tab in and out of all areas)

### Interactive Elements
- [ ] All buttons activatable with Enter/Space
- [ ] All links activatable with Enter
- [ ] Dropdowns navigable with Arrow keys
- [ ] Modals trap focus when open, restore on close
- [ ] Escape closes modals and popups

## TC-${MODULE}-ACC-002: Screen Reader

### Landmarks
- [ ] `<main>` wraps primary content
- [ ] `<nav>` wraps navigation menus
- [ ] `<aside>` wraps sidebar (if present)
- [ ] Page `<h1>` matches page title

### Form Accessibility
- [ ] All inputs have associated `<label>` elements
- [ ] Required fields indicated with `aria-required="true"`
- [ ] Error messages linked via `aria-describedby`
- [ ] Form groups use `<fieldset>` + `<legend>`

### Dynamic Content
- [ ] Loading states announced via `aria-live="polite"`
- [ ] Toasts/notifications use `role="alert"`
- [ ] Deleted items removal announced
```

## Template: Automated Accessibility Test (axe-core)

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ${ComponentName} } from './${ComponentName}';

expect.extend(toHaveNoViolations);

describe('${ComponentName} Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<${ComponentName} ${props} />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('should have no critical violations with data loaded', async () => {
    const { container } = render(
      <${ComponentName} data={${mockData}} />
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'button-name': { enabled: true },
      },
    });

    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });
});
```
