---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
  - "frontend/**/*.css"
---
# Frontend Coding Conventions — 施工管理システム

## Stack
- **Build**: Vite 5 + React 18 + TypeScript strict (`verbatimModuleSyntax: true`)
- **Routing**: React Router 6 (`createBrowserRouter`)
- **UI hybrid**: Ant Design 5 (widgets + JP locale) + Tailwind CSS 3 (utility/layout) + Lucide React (icons)
- **State**: Zustand (UI/auth) + TanStack Query v5 (server state)
- **Form**: React Hook Form + Zod
- **HTTP**: Axios (cookie-based auth, 401 refresh interceptor)
- **i18n**: i18next + react-i18next + i18next-browser-languagedetector (ja default, en, vi)
- **Date**: dayjs (Antd-compatible) — locale synced with i18n
- **Test**: Vitest + Testing Library (planned), Playwright E2E (planned)

## Folder structure
```
frontend/src/
├── app/                          # Root composition
│   ├── providers.tsx             # ConfigProvider + AntdApp + QueryClient + I18n
│   └── routes.tsx                # createBrowserRouter config
├── features/                     # Feature-sliced (self-contained)
│   ├── auth/{pages,components,schemas}
│   ├── admin/{pages,components}
│   ├── settings/{pages,components}
│   └── home/, misc/
├── shared/
│   ├── api/                      # Axios client + per-domain API methods + types
│   ├── components/
│   │   ├── guards/               # AuthGuard, RoleGuard, PublicOnly
│   │   └── layout/               # AppLayout, LanguageSwitcher
│   ├── hooks/                    # useAuth, …
│   ├── stores/                   # Zustand stores
│   ├── i18n/                     # i18next setup
│   └── utils/                    # error-mapper, formatters
├── locales/                      # ja.json, en.json, vi.json
├── styles/
│   └── design-tokens.css         # SINGLE SOURCE OF TRUTH for color/radius/shadow
├── index.css                     # Tailwind directives + reset
└── main.tsx                      # Entry: createRoot + AppProviders + RouterProvider
```

## Naming
- Files: `PascalCase.tsx` for components/pages, `kebab-case.ts` for utilities/services/schemas
- Components: `PascalCase` matching filename (`LoginPage`, `AuthLayout`, `RoleTag`)
- Hooks: `useXxx` lower camelCase
- Stores: `useXxxStore` (Zustand convention)
- API modules: `xxxApi` object (e.g., `authApi`, `usersApi`)
- Types/Interfaces: `PascalCase` (`UserSummary`, `ApiError`, `LoginFormValues`)
- Translation keys: dot-separated camelCase (`auth.login.title`, `users.confirms.changeRoleOk`)

## Design System (BẮT BUỘC tuân theo)

### Single source of truth — `src/styles/design-tokens.css`
- color (brand-50…brand-950, neutral zinc, status emerald/amber/red)
- radius (base 8, lg 12), shadow (card/elevated/floating, all soft)
- typography (Inter + Noto Sans JP, sizes xs→4xl, weights 400/500/600)
- layout (sidebar 240px, collapsed 64px, header 56px)

**KHÔNG hard-code màu/spacing trong component.** Mọi token thay đổi → sửa `design-tokens.css` + mirror vào Antd theme tokens trong `app/providers.tsx`.

### Khi nào Antd vs Tailwind
| Use case | Library |
|---|---|
| Form / Input / Select / DatePicker / Cascader / Upload | **Antd** (JP locale + validation states) |
| Table / Pagination | **Antd** |
| Modal / Drawer / Tooltip / Popconfirm / message / notification | **Antd** (`App.useApp()` for context-aware) |
| Spin (async loading) | **Antd** |
| Layout (sidebar / header / grid / container) | **Tailwind** |
| Card / badge / KPI stat / empty state | **Tailwind** |
| Spacing / padding / margin / color utility | **Tailwind** |
| Icon trong page content | **Lucide React** |
| Icon trong Antd internal (Form validation, Alert) | **Antd default** |

### Layout wrappers
- Authenticated page → `<AppLayout>` (sidebar + header + LanguageSwitcher + user dropdown)
- Public auth page → `<AuthLayout title subtitle>` (centered card)
- Settings sub-page → `<SettingsLayout title description>` (tabs sidebar)

### Card pattern
```tsx
<div className="bg-white border border-zinc-200/70 rounded-xl shadow-card">…</div>
```
KHÔNG dùng Antd `<Card>` default trừ khi có lý do cụ thể.

### Color usage
- Primary action: `bg-brand-500 text-white` / Antd `<Button type="primary">`
- Status pills (Tailwind): `bg-{tone}-50 text-{tone}-700 ring-1 ring-{tone}-200` — emerald (success), amber (warning), red (danger), brand-500 (info)

## Path alias
- `@/` → `src/` (config trong `vite.config.ts` + `tsconfig.app.json`)
- Import order:
  1. External (`react`, `antd`, `lucide-react`, `react-router-dom`, …)
  2. Internal absolute (`@/shared/...`, `@/features/...`)
  3. Relative (`./types`, `../components/X`)

## Type-only imports
TypeScript `verbatimModuleSyntax: true`. Type-only imports PHẢI dùng `import type`:
```ts
import type { ApiError } from '@/shared/api/types';
import { useAuth } from '@/shared/hooks/useAuth';
```
Mixed:
```ts
import { authApi, type InvitationInfo } from '@/shared/api/auth.api';
```

## i18n
- **No hardcoded user-facing strings.** Mọi text PHẢI dùng `t('namespace.key')`
- Add new strings to ALL 3 locale files (`ja.json`, `en.json`, `vi.json`) cùng lúc
- Backend error codes → map via `error-mapper.ts` → `t('errorCodes.<CODE>')`. Add new code to all 3 locales when backend introduces new error
- Validation messages: use `superRefine` in Zod schemas (Zod `min/regex` doesn't accept fn for message) → call `i18n.t()` at runtime so message reflects current language
- `dayjs.locale()` auto-syncs với `i18n.language` qua `shared/i18n/index.ts`
- Antd locale (ja_JP/en_US/vi_VN) auto-syncs via `useMemo` in `providers.tsx`
- Language persisted to localStorage key `shikou-kanri.lang`

## API client
- `@/shared/api/client.ts` — Axios instance, `withCredentials: true`, baseURL from `VITE_API_BASE_URL` or `/api` (Vite proxy)
- 401 → singleton refresh promise; retry skip paths: `/auth/login`, `/auth/refresh`, `/auth/invitations`, `/auth/2fa/verify`
- Per-domain modules export typed object: `authApi`, `usersApi`. Methods return parsed data (not full AxiosResponse)
- Use `extractApiError(err)` to normalize errors → `{ code, message, status }`

## State management
- **Server state** (TanStack Query): all data from API. Query keys: `['<entity>', '<scope>', ...filters]`. Invalidate on mutation success
- **Auth state** (Zustand `authStore`): `user`, `isLoading`, `isInitialized`, `pendingTwoFa`. Actions: `login`, `logout`, `verifyTwoFa`, `loadCurrentUser`
- **Form state** (React Hook Form): per-form `useForm` + Zod schema via `zodResolver`
- **DO NOT** store JWT/refresh tokens in JS state — HttpOnly cookies only
- **DO NOT** use React Context for data — too easy to cause re-renders

## Forms
- React Hook Form + `zodResolver(<Schema>)` + Antd `<Form layout="vertical">` (no Antd Form rules — Zod is source of truth)
- Wire Antd inputs via `<Controller>`:
  ```tsx
  <Form.Item label={t('...')} validateStatus={errors.x ? 'error' : ''} help={errors.x?.message}>
    <Controller name="x" control={control} render={({ field }) => <Input {...field} />} />
  </Form.Item>
  ```
- Submit: `handleSubmit(onSubmit)`. Use `App.useApp()` `message`/`modal` for feedback

## Routing
- All routes in `src/app/routes.tsx` via `createBrowserRouter`
- Authenticated routes wrap in `<AuthGuard>`; admin routes additionally in `<RoleGuard roles={[...]}>`
- Public-only (login etc.) wrap in `<PublicOnly>` to auto-redirect authenticated users
- Lazy-load big routes via `React.lazy()` + `<Suspense>` (planned for Phase 2)

## Error handling
- API errors → `extractApiError(err)` → `mapErrorMessage(...)` for user display
- Show via Antd `<Alert type="error">` (inline form errors) or `message.error()` (toast)
- Never display raw error messages from network — always map through `error-mapper`

## DO NOT
- ❌ Hard-code màu (`#1890ff`, `#fff`) → dùng design-tokens hoặc Tailwind class
- ❌ Inline `style={{ ... }}` cho layout → dùng Tailwind className
- ❌ Antd icons (`@ant-design/icons`) trong page content → dùng Lucide
- ❌ Hardcoded Japanese/English strings → dùng `t()`
- ❌ Antd default Card với shadow đậm → dùng custom card với `shadow-card`
- ❌ Mở Tailwind preflight (xung đột Antd normalize)
- ❌ Store tokens trong Zustand/localStorage — HttpOnly cookie only
- ❌ Dùng `any` type — `unknown` + narrowing
- ❌ Catch + ignore errors — log hoặc map through `error-mapper`
