# Frontend Shared Layer - Specialist Index

**Architecture**: Feature-Sliced Design (FSD)
**Layer**: Shared Layer (UI primitives, utilities, API clients, hooks)
**Total Specialists**: 3
**Total Patterns**: 47 (14.1-14.47 + 5 hook patterns)
**Format**: Workflow as Code (Pseudo-code)
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform

---

## Specialist Categories

### UI Components (1 specialist)

1. **[ui-components-specialist.md](./ui-components-specialist.md)** (644 lines - ✅ compliant)
   - Patterns 14.1-14.20 (UI primitives - 20 patterns)
   - Form components, layout components, feedback components, data display
   - Technologies: React 19, Shadcn/ui, Radix UI, CVA, Tailwind CSS
   - Keywords: button, input, select, dialog, toast, card, avatar, table, shadcn, radix, cva

### Utilities (1 specialist)

2. **[utilities-specialist.md](./utilities-specialist.md)** (610 lines - ✅ compliant)
   - Patterns 14.21-14.40 (Utilities - 20 patterns)
   - Styling utilities, formatters, validators, helpers
   - Technologies: TypeScript 5, date-fns, Intl API, clsx, tailwind-merge
   - Keywords: cn, formatters, validators, helpers, debounce, throttle, vietnamese-utils

### API & Hooks (1 specialist)

3. **[api-hooks-specialist.md](./api-hooks-specialist.md)** (627 lines - ✅ compliant)
   - Patterns 14.41-14.55 (API Clients: 10, Custom Hooks: 5)
   - HTTP client, auth, error handling, custom React hooks
   - Technologies: Fetch API, TypeScript 5, React 19 hooks
   - Keywords: api-client, fetch, auth, hooks, useDebounce, useLocalStorage

---

## Pattern Coverage

### Form Components (Patterns 14.1-14.5)
**Specialist**: [ui-components-specialist.md](./ui-components-specialist.md)

- Pattern 14.1: Button (CVA variants, loading state, polymorphic)
- Pattern 14.2: Input (validation states, icons)
- Pattern 14.3: Select (Radix UI dropdown)
- Pattern 14.4: Checkbox (Radix UI)
- Pattern 14.5: Radio Group (Radix UI)

### Layout Components (Patterns 14.6-14.10)
**Specialist**: [ui-components-specialist.md](./ui-components-specialist.md)

- Pattern 14.6: Card (compound components)
- Pattern 14.7: Dialog (modal with overlay)
- Pattern 14.8: Sheet (slide-out panel)
- Pattern 14.9: Tabs (Radix UI)
- Pattern 14.10: Accordion (Radix UI)

### Feedback Components (Patterns 14.11-14.15)
**Specialist**: [ui-components-specialist.md](./ui-components-specialist.md)

- Pattern 14.11: Toast (global notification system)
- Pattern 14.12: Alert (static messages)
- Pattern 14.13: Badge (status indicators)
- Pattern 14.14: Skeleton (loading placeholder)
- Pattern 14.15: Spinner (loading spinner)

### Data Display Components (Patterns 14.16-14.20)
**Specialist**: [ui-components-specialist.md](./ui-components-specialist.md)

- Pattern 14.16: Avatar (with fallback)
- Pattern 14.17: Table (sortable, pagination)
- Pattern 14.18: Pagination (page navigation)
- Pattern 14.19: Tooltip (Radix UI)
- Pattern 14.20: Popover (Radix UI)

### Styling Utilities (Patterns 14.21-14.25)
**Specialist**: [utilities-specialist.md](./utilities-specialist.md)

- Pattern 14.21: cn (clsx + tailwind-merge)
- Pattern 14.22-14.25: CVA variant systems

### Formatters (Patterns 14.26-14.30)
**Specialist**: [utilities-specialist.md](./utilities-specialist.md)

- Pattern 14.26: formatDate (Vietnamese DD/MM/YYYY)
- Pattern 14.27: formatCurrency (VND with dots)
- Pattern 14.28: formatNumber (thousands separators)
- Pattern 14.29: formatRelativeTime ("2 giờ trước")
- Pattern 14.30: formatBytes (human-readable sizes)

### Validators (Patterns 14.31-14.35)
**Specialist**: [utilities-specialist.md](./utilities-specialist.md)

- Pattern 14.31: isValidEmail
- Pattern 14.32: isValidPhone (Vietnamese +84 or 0xxx)
- Pattern 14.33: isValidURL
- Pattern 14.34: parseJWT
- Pattern 14.35: sanitizeHTML (DOMPurify)

### Helpers (Patterns 14.36-14.40)
**Specialist**: [utilities-specialist.md](./utilities-specialist.md)

- Pattern 14.36: debounce
- Pattern 14.37: throttle
- Pattern 14.38: cloneDeep
- Pattern 14.39: omit
- Pattern 14.40: pick

### API Clients (Patterns 14.41-14.50)
**Specialist**: [api-hooks-specialist.md](./api-hooks-specialist.md)

- Pattern 14.41: APIClient (HTTP client with auth)
- Pattern 14.42: authFetch
- Pattern 14.43: uploadFile (with progress)
- Pattern 14.44-14.46: Auth token management
- Pattern 14.47: handleAPIError (Vietnamese messages)
- Pattern 14.48: retryRequest (exponential backoff)
- Pattern 14.49: AbortController
- Pattern 14.50: Request interceptor

### Custom Hooks (Patterns 14.51-14.55)
**Specialist**: [api-hooks-specialist.md](./api-hooks-specialist.md)

- Pattern 14.51: useDebounce
- Pattern 14.52: useThrottle
- Pattern 14.53: useLocalStorage
- Pattern 14.54: useMediaQuery
- Pattern 14.55: useOnClickOutside

---

## Technology Stack

**Frontend Framework**:
- React 19 (Client Components + hooks)
- TypeScript 5 (strict mode)
- Next.js 15 (App Router)

**UI Components**:
- Shadcn/ui (CLI-installed components)
- Radix UI (accessible primitives)
- class-variance-authority (CVA)
- Tailwind CSS + clsx + tailwind-merge
- Lucide React (icons)

**Utilities**:
- date-fns (date formatting)
- Intl API (currency, number formatting)
- DOMPurify (HTML sanitization)

**API & State**:
- Fetch API (native HTTP client)
- TanStack Query v5 (server state)
- localStorage (persistent storage)

---

## File Size Summary

```pseudo
METRICS = {
  total_specialists: 3,
  total_lines: 1881,
  avg_lines_per_file: 627,
  min_lines: 610 (utilities-specialist.md),
  max_lines: 644 (ui-components-specialist.md),
  strict_compliance_≤800: 3/3 (100%),
  buffer_compliance_≤900: 3/3 (100%)
}

SIZE_DISTRIBUTION = {
  "600-700 lines": 3 files
}
```

---

## Usage Examples

### UI Components

```typescript
import { Button, Dialog, Card, Toast } from '@/shared/ui'

<Button variant="destructive" size="lg" loading={isLoading}>
  Delete
</Button>

<Dialog>
  <DialogTrigger><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogTitle>Confirm</DialogTitle>
    <DialogFooter><Button>OK</Button></DialogFooter>
  </DialogContent>
</Dialog>
```

### Utilities

```typescript
import { cn, formatCurrency, formatDate, isValidEmail, debounce } from '@/shared/lib'

const className = cn('base-class', isActive && 'active', props.className)
const price = formatCurrency(1500000) // "1.500.000 ₫"
const date = formatDate('2025-12-29') // "29/12/2025"
const valid = isValidEmail('test@example.com') // true

const debouncedSearch = debounce(searchAPI, 300)
```

### API & Hooks

```typescript
import { apiClient } from '@/shared/api/client'
import { useDebounce, useLocalStorage } from '@/shared/hooks'

const users = await apiClient.get<User[]>('/api/users')
await apiClient.post<User>('/api/users', { name: 'John' })

const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

const [theme, setTheme] = useLocalStorage('theme', 'light')
```

---

## Accessibility

**WCAG 2.1 AA Compliance**:
- Semantic HTML (button, input, select)
- ARIA labels and roles
- Keyboard navigation (Tab, Enter, Esc, Arrow keys)
- Focus management (focus trap in dialogs)
- Color contrast (4.5:1 for text, 3:1 for interactive)

**Vietnamese Accessibility**:
- Vietnamese labels for form fields
- Vietnamese error messages
- Vietnamese ARIA announcements

---

## Source Files

**Pattern Definition**: [fsd-shared-layer-patterns.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-13/patterns/fsd-shared-layer-patterns.md) (1,324 lines)

**Planning Documents**:
- [PLAN.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-13/PLAN.md)
- [CONTEXT_ENGINEERING.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-13/CONTEXT_ENGINEERING.md)
- [INSTRUCTION_HELPER.md](../../../../memory-bank/eps-enhancement/week-14/days/phase-4/day-13/INSTRUCTION_HELPER.md)

---

## Related Layers

**Dependencies** (none - Shared is the base layer):
- Shared has no dependencies on other layers

**Dependents** (used by all layers):
- Entities Layer (Day 12): Uses UI components, utilities
- Features Layer (Day 11): Uses UI components, API client, hooks
- Widgets Layer (Day 10): Uses UI components, utilities
- Pages Layer (Day 9): Uses all Shared utilities
- App Layer (Day 8): Uses Providers, themes

---

**Last Updated**: 2026-01-03
**Status**: COMPLETE
**Compliance**: 100% strict (≤800), 100% buffer (≤900)
**Day**: 13 of 15 (Phase 4)
