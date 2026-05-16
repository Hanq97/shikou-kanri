---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
  - "frontend/**/*.css"
---
# Frontend Rules — 施工管理システム

## Stack
- **Build**: Vite 5 + React 18 + TypeScript strict
- **Routing**: React Router 6 (`createBrowserRouter`)
- **UI hybrid**: Ant Design 5 (widgets + `ja_JP` locale) + Tailwind CSS 3 (utility/layout) + Lucide React (icons)
- **State**: Zustand (UI/auth) + TanStack Query v5 (server state)
- **Form**: React Hook Form + Zod
- **HTTP**: Axios (cookie-based auth, 401 refresh interceptor)

## Design System (BẮT BUỘC tuân theo)

### Single source of truth
- **`src/styles/design-tokens.css`** — color/radius/shadow/typography. KHÔNG hard-code màu trong component.
- Antd theme tokens trong `src/app/providers.tsx` PHẢI mirror design-tokens.css.

### Khi nào Antd vs Tailwind
| Use case | Library |
|---|---|
| Form / Input / Select / DatePicker / Cascader / Upload | **Antd** (JP locale) |
| Table / Pagination | **Antd** |
| Modal / Drawer / Tooltip / Popconfirm / message / notification | **Antd** |
| Layout / sidebar / header / grid / container | **Tailwind** |
| Card / badge / empty state / custom button | **Tailwind** |
| Spacing / margin / padding / color utility | **Tailwind** |
| Icon trong page content | **Lucide React** |
| Icon trong Antd internal | **Antd default** |

### Layout
- Authenticated page → wrap qua `@/shared/components/layout/AppLayout`
- Auth public page → wrap qua `@/features/auth/components/AuthLayout`

### Color
- Primary: `brand-500` (#1689e4) — KHÔNG dùng Antd default `#1890ff`
- Neutral: zinc palette (`text-zinc-900`, `text-zinc-500`, `bg-zinc-50`, `border-zinc-200/70`)
- Status: emerald (success), amber (warning), red (danger), brand-500 (info)

### Card pattern
```tsx
<div className="bg-white border border-zinc-200/70 rounded-xl shadow-card">...</div>
```
KHÔNG dùng Antd `<Card>` default trừ khi có lý do cụ thể.

## Path alias
- `@/` → `src/` (config trong `vite.config.ts` + `tsconfig.app.json`)
- Import order: external → `@/shared/...` → `@/features/...` → relative

## Type-only imports
TypeScript `verbatimModuleSyntax = true`. Type-only imports PHẢI dùng `import type`:
```typescript
import type { ApiError } from '@/shared/api/types';
import { useAuth } from '@/shared/hooks/useAuth';
```

## API client
- `@/shared/api/client.ts` — Axios instance, `withCredentials: true`
- 401 → singleton refresh promise, retry skip cho `/auth/login`, `/auth/refresh`, `/auth/invitations`

## State management
- **authStore** (Zustand): `user`, `isLoading`, `isInitialized`, `pendingTwoFa`, `login`, `logout`, `verifyTwoFa`
- **useAuth hook**: `{ user, isAuthenticated, hasRole, hasAnyRole, login, logout, verifyTwoFa }`
- KHÔNG store JWT token trong state (HttpOnly cookie là duy nhất)

## DO NOT
- ❌ Hard-code màu (`#1890ff`, `#fff`) → dùng token hoặc Tailwind class
- ❌ Inline `style={{ ... }}` cho layout → dùng Tailwind className
- ❌ Antd icons (`@ant-design/icons`) trong page content → dùng Lucide
- ❌ Antd default Card shadow → dùng `shadow-card` (soft)
- ❌ Mở Tailwind preflight (xung đột Antd normalize)
