---
id: tps-nextjs-manual
stack: typescript-nextjs
type: manual
category: test-plan
subcategory: nextjs
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E18]
---

# Manual Test & Accessibility Patterns for Next.js
# Next.jsの手動テスト＆アクセシビリティパターン

## SECTION 1: PATTERNS

### Manual Test Checklist Structure
- `## Preconditions` — environment setup, test data, user accounts
- `## Steps` — numbered step-by-step instructions
- `## Expected Result` — what user should see after each step
- `## Actual Result` — space for tester to fill in during execution

### Visual Verification Checklist
- Layout consistency across breakpoints (1920, 1366, 768, 375px)
- Theme consistency: colors, typography, spacing match design system
- Loading states: skeleton/spinner visible during data fetch
- Empty states: meaningful message when no data exists
- Error states: user-friendly error display with recovery action

### Accessibility Verification
- Keyboard navigation: Tab order follows visual flow
- Screen reader: all interactive elements have accessible names
- Color contrast: WCAG 2.1 AA (4.5:1 text, 3:1 large text)
- Focus indicators: visible focus ring on all interactive elements
- ARIA landmarks: `<main>`, `<nav>`, `<aside>` properly used

### Cross-Browser Checklist
- Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
- Verify form interactions work consistently
- Verify Ant Design components render correctly
- Verify CSS Grid/Flexbox layouts are consistent

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| New feature visual check | Manual checklist + screenshots | Catch visual issues automation misses |
| Accessibility audit | axe-core automated + keyboard manual | Combined coverage |
| Responsive layout | Manual breakpoint check | Complex layout interactions |
| Browser compatibility | Cross-browser checklist | Framework quirks per browser |
| User journey validation | End-to-end manual walkthrough | Business logic verification |
| Data display accuracy | Manual data comparison | Business rules hard to automate |

## SECTION 3: QUALITY CRITERIA

### Checklist Naming Convention
- Pattern: `TC-{MODULE}-{TYPE}-{SEQ}` (e.g., `TC-CST-VIS-001`)
- Types: VIS (visual), ACC (accessibility), FUN (functional), XBR (cross-browser)

### Minimum Coverage
- Every page has at least 1 visual verification checklist
- Every form has accessibility keyboard navigation test
- Every new feature has cross-browser verification
- axe-core automated scan on every page (zero critical violations)

### Accessibility Standards
- WCAG 2.1 Level AA compliance
- All images have alt text
- All form inputs have labels
- Color is not the only means of conveying information
- Touch targets minimum 44x44 CSS pixels for mobile
