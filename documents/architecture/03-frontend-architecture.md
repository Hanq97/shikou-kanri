# 03 — Frontend Architecture

**Version**: 1.0 — 2026-05-15
**Refer to**: ADR-003 (React stack), ADR-010 (PWA), ADR-011 (Offline)

---

## 1. Mục đích

Mô tả kiến trúc Frontend: stack, project structure, state management, routing, performance, PWA strategy (Phase 2).

---

## 2. Technology stack

| Layer | Tech | Phase | Note |
|---|---|---|---|
| Build | Vite 5+ | 1 | Fast HMR, code splitting |
| Framework | React 18 (StrictMode) | 1 | Concurrent features |
| Language | TypeScript 5.x strict | 1 | Type sharing with BE possible |
| Routing | React Router 6 | 1 | File-based or config-based |
| UI Library | Ant Design 5 | 1 | Enterprise-grade JP-friendly |
| Form | React Hook Form + Zod | 1 | Schema-based validation |
| Global state | Zustand | 1 | Lightweight; avoid Redux complexity |
| Server state | TanStack Query v5 | 1 | Cache, retry, optimistic update |
| HTTP client | Axios | 1 | Interceptor for auth, errors |
| Date | dayjs | 1 | Smaller than moment; plugin-based |
| Charts | Recharts hoặc Apache ECharts | 1 (basic widget), 3 (full dashboard) | Pick before Phase 1 |
| Gantt | gantt-task-react hoặc Syncfusion | 2 | F3-01 |
| PDF viewer | react-pdf (pdf.js) | 2 | F3-05 |
| i18n | react-i18next | 1 | ja-JP default |
| Service Worker | Workbox via vite-plugin-pwa | 2 | PWA |
| WebSocket | socket.io-client | 2 | F3-02, F4-01 |
| Code formatting | Prettier | 1 | — |
| Linting | ESLint + react/typescript/jsx-a11y | 1 | a11y warnings enforced |
| Testing | Vitest + Testing Library + Playwright (E2E) | 1 | — |

---

## 3. Project structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx            # Root
│   │   ├── routes.tsx         # Route config
│   │   ├── providers.tsx      # Theme, QueryClient, i18n, Auth
│   │   └── error-boundary.tsx
│   │
│   ├── features/              # Feature-sliced design
│   │   ├── auth/              # Login, password reset, 2FA setup
│   │   ├── home/              # Home dashboard (BD-01 Phase 1)
│   │   ├── customer/          # Customer list, detail, edit (F1-01, F1-04, F6-03)
│   │   ├── property/          # Property mgmt (F1-02)
│   │   ├── project/           # Project list, detail, members (F1-03, F1-05, F1-06)
│   │   ├── quote/             # Quote create/edit/list/PDF (F2-*)
│   │   ├── unit-price/        # Unit price master (F2-02)
│   │   ├── aftercare/         # OB list, schedule, records (F6-*)
│   │   ├── notification/      # Settings, history (F4-04)
│   │   ├── user-management/   # F8-02
│   │   ├── audit/             # Audit log viewer (F8-03)
│   │   ├── backup/            # Backup admin (F8-04)
│   │   ├── schedule/          # Gantt (Phase 2)
│   │   ├── photo/             # Field photos (Phase 2)
│   │   ├── drawing/           # Drawings + markers (Phase 2)
│   │   ├── chat/              # Project chat (Phase 2)
│   │   ├── inspection/        # Inspection + corrections (Phase 2)
│   │   ├── dashboard-advanced/# Phase 3 charts
│   │   └── ai/                # Phase 3 (chat sidebar, similar search, OCR)
│   │
│   ├── shared/
│   │   ├── api/               # API client (Axios setup, generated types)
│   │   ├── components/        # Reusable UI components (StatusBadge, MoneyDisplay, etc.)
│   │   ├── hooks/             # useAuth, useDebounce, usePermission
│   │   ├── stores/            # Zustand stores (authStore, uiStore)
│   │   ├── utils/             # date, currency, validation helpers
│   │   ├── types/             # Shared types (Role, ProjectStatus, ...)
│   │   └── constants/         # Routes, query keys, etc.
│   │
│   ├── pages/                 # Lazy-loaded route components (wraps features)
│   │
│   ├── styles/                # Global CSS, Ant Design theme override
│   ├── locales/               # i18n JSON files (ja, en future)
│   ├── main.tsx               # Entry
│   └── vite-env.d.ts
│
├── public/
│   ├── icons/                 # PWA icons
│   ├── manifest.json          # PWA manifest (Phase 2)
│   └── ...
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                   # Playwright
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

**Feature-sliced design**: each `features/<name>/` is self-contained — has its components, hooks, queries, types, fully scoped.

---

## 4. State management strategy

### 4.1 Server state (TanStack Query)
- All data fetched from API → cached in TanStack Query
- Query key conventions: `[entity, scope, ...filters]`, e.g., `['customers', 'list', { search, page }]`
- Mutation hooks: `useCreateCustomer`, `useUpdateCustomer` etc.
- Cache invalidation strategy:
  - On mutation success → invalidate related queries
  - Optimistic updates for non-critical mutations (toggle, like-count style)
  - Refetch on window focus (default; tune per query if too aggressive)

### 4.2 Global UI state (Zustand)
- `authStore`: current user, role, token expiry, login/logout actions
- `uiStore`: theme, locale, sidebar open/closed, global notifications stack
- Persisted to localStorage for theme/locale; auth in HttpOnly cookie (token NOT in store)

### 4.3 Local form state (React Hook Form)
- Per-form `useForm`; reset on unmount
- Zod schema for validation; shared with BE DTOs where possible

### 4.4 What we DON'T use
- Redux / Redux Toolkit (overkill)
- Context API for data (slow re-render risk)
- MobX (not needed)

---

## 5. Routing strategy

### 5.1 Top-level routes (Phase 1)
```
/                                  → /home (auth required)
/login                             → public
/forgot-password                   → public
/reset-password?token=...          → public

/home                              → BD-01 Home Dashboard
/customers                         → S03 Customer list
/customers/new
/customers/:id                     → S04 Customer detail (tabs: overview / properties / history / aftercare)
/customers/:id/edit
/properties/:id                    → S05 Property detail
/projects                          → S06 Project list (table/board toggle)
/projects/new
/projects/:id                      → S07 Project detail (tabs: overview / folders / members / quotes / aftercare)
/projects/:id/edit
/quotes                            → S12 Quote list
/quotes/new?projectId=...
/quotes/:id                        → S13 Quote detail/edit
/quotes/:id/preview                → S14 PDF preview
/unit-prices                       → S15 Unit price master
/ob-customers                      → S19 OB customer list
/aftercare/settings                → S20 Aftercare notification settings (admin)
/audit-log                         → S26 Audit log (admin)
/users                             → S24 User management (admin)
/settings/profile
/settings/notifications            → S25 Notification settings
/settings/2fa
```

### 5.2 Phase 2 additions
- `/projects/:id/schedule` (S08)
- `/projects/:id/photos` (S09)
- `/projects/:id/drawings/:drawingId` (S10)
- `/projects/:id/chat` (S11)
- `/inspections/:id` (S16, S17, S18)

### 5.3 Phase 3 additions
- `/dashboard/advanced` (extends home dashboard)
- `/ai/search` (S21)
- AI chatbot sidebar overlay (S22)
- `/ai/ocr` (S23)

### 5.4 Route guards
- `<AuthGuard>` wrapper: redirect to /login if no valid session
- `<RoleGuard role="admin">`: redirect to /home if insufficient role
- `<ProjectMembershipGuard>`: for 招待ユーザー accessing project routes

### 5.5 Code splitting
- All routes lazy-loaded via `React.lazy()` + `Suspense`
- Vendor chunks split: react, antd, charts, pdf-viewer (heavy libs)
- Target initial bundle < 300KB gzip

---

## 6. API integration

### 6.1 API client structure
```typescript
// src/shared/api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use(addAuthHeader);
apiClient.interceptors.response.use(undefined, handleErrors);
```

### 6.2 Generated types
- Option 1 (preferred): OpenAPI spec exported from NestJS → `openapi-typescript` generates TS types
- Option 2: tRPC (overkill but considered)
- Option 3: Manual DTOs synced (use shared package between FE/BE)

**Decision (TBD before Phase 1 implementation)**: pick OpenAPI generation OR shared types package.

### 6.3 Error handling
- 401 → clear auth state, redirect to login
- 403 → toast "権限がありません"
- 4xx → toast specific error message from `error.code`
- 5xx → toast generic error + log to monitoring
- Network error → retry (TanStack Query default), then offline indicator

---

## 7. PWA strategy (Phase 2)

### 7.1 Service Worker
- vite-plugin-pwa generates SW with Workbox
- Strategies:
  - App shell: precache (cache-first)
  - API GET: stale-while-revalidate (5min TTL)
  - Photo thumbnails: cache-first (max 100 entries)
  - HTML navigation: network-first with offline fallback

### 7.2 Web App Manifest
```json
{
  "name": "藤和建設 施工管理",
  "short_name": "施工管理",
  "start_url": "/home",
  "display": "standalone",
  "theme_color": "#1890ff",
  "background_color": "#ffffff",
  "icons": [...]
}
```

### 7.3 Background Sync (Photo Queue)
- IndexedDB store via Dexie or idb library
- Service Worker `sync` event handler
- Retry policy: exponential backoff (per ADR-011)

### 7.4 Push notifications (Phase 2)
- Web Push API + VAPID key
- Permission request prompt on first relevant action
- Server-side: notification module sends via Web Push library
- iOS limitation acknowledged (16.4+ only)

---

## 8. Performance considerations

### 8.1 Targets (per doc §4.1)
- Initial page load p95 < 2s (on 4G+)
- Search result render p95 < 3s
- Time to Interactive (TTI) < 5s

### 8.2 Techniques
- Route-level code splitting (✓ above)
- Image lazy loading (`<img loading="lazy">`)
- Virtual list for long tables (TanStack Virtual or react-window) — for 顧客 list >100 rows
- Memoization (React.memo, useMemo) on heavy compute components (Gantt, charts)
- AntD tree-shake: avoid `import { Button } from 'antd'`; use `import Button from 'antd/es/button'` or babel plugin
- Prefetch critical routes on idle (e.g., after login, prefetch home + customer list)

### 8.3 Monitoring
- Web Vitals (CLS, LCP, FID, INP) reported to analytics
- Source map upload to monitoring (e.g., Sentry) for production debugging

---

## 9. Accessibility & UX

### 9.1 a11y baseline
- All interactive elements keyboard-accessible
- Form labels properly associated
- Color contrast WCAG AA minimum
- Screen reader friendly (aria-labels for icon-only buttons)
- Skip-to-content link

### 9.2 UX rules from doc (§4.6)
- 3-click rule for main flows
- Tutorial on first login (overlay tour)
- Mobile-first cho field user (Phase 2)
- Clear validation errors (inline + summary)

### 9.3 Japanese-specific
- 全角/半角 normalization on input where applicable (phone, postal code)
- IME-aware input handling (don't fire onChange mid-composition for search)
- Number format: ¥ prefix, thousand separator

---

## 10. Testing strategy

### 10.1 Unit (Vitest)
- All hooks, utility functions, pure components
- Target 70%+ coverage on logic-heavy code

### 10.2 Integration (Vitest + Testing Library)
- Feature workflows (create customer → create project → create quote)
- Mocked API via MSW (Mock Service Worker)

### 10.3 E2E (Playwright)
- Critical user journeys per role:
  - Login → home → create customer → quote draft → quote PDF
  - Login → OB list → record aftercare
  - Admin login → user management → role change → audit verify
- Run nightly on staging
- Smoke test on every PR (subset)

### 10.4 Visual regression (optional)
- Storybook + Chromatic OR Playwright screenshot
- Consider Phase 2+ if UI churn is high

---

## 11. Related documents

- [01 — System Architecture](./01-system-architecture.md)
- [02 — Module Architecture](./02-module-architecture.md)
- [05 — Backend Architecture](./05-backend-architecture.md)
- [06 — Security Architecture](./06-security-architecture.md)
- ADR-003 (Frontend Framework), ADR-010 (Mobile PWA), ADR-011 (Offline)
