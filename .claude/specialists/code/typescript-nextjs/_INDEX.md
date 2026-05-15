---
memory: project
---
# Frontend Specialists Index (Next.js)

> **Stack**: java-nextjs-postgres (reactive variant)
> **Total Specialists**: 38
> **Pattern Range**: 50.x–100.x
> **Last Updated**: 2026-03-15

## Specialist Directory

### Architecture (50.x–51.x, 63.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 1 | 50.x | Clean Architecture (5-Layer) | `architecture/nextjs-clean-architecture-specialist.md` |
| 2 | 51.x | DI — Pure Function Pattern | `architecture/frontend-di-specialist.md` |
| 3 | 63.x | Module Organization (26 modules) | `architecture/module-organization-specialist.md` |

### Core Layer (84.x–85.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 4 | 84.x | Core Layer (Config, Constants, Services) | `core/core-layer-specialist.md` |
| 5 | 85.x | Provider Composition (Nesting Order) | `core/provider-composition-specialist.md` |

### State (53.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 6 | 53.x | Redux Toolkit (4 slices) | `state/redux-toolkit-specialist.md` |

### Routing (52.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 7 | 52.x | Multi-Tenant Routing | `routing/multitenant-routing-specialist.md` |

### API (54.x, 87.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 8 | 54.x | Axios Interceptor | `api/axios-interceptor-specialist.md` |
| 9 | 87.x | API Client Structure (Object Export) | `api/api-client-specialist.md` |

### Layout (69.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 10 | 69.x | Layout & App Shell | `layout/layout-appshell-specialist.md` |

### UI (55.x–56.x, 82.x–83.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 11 | 55.x | Ant Design Forms | `ui/antd-form-specialist.md` |
| 12 | 56.x | Block/Screen Rendering | `ui/block-screen-specialist.md` |
| 13 | 59.x | Theme System (CSS Hybrid) | `ui/theme-specialist.md` |
| 14 | 82.x | CRUD Page Patterns | `ui/crud-page-patterns-specialist.md` |
| 15 | 83.x | Table/DataGrid | `ui/table-datagrid-specialist.md` |

### Security (57.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 16 | 57.x | Permission (Dual Architecture) | `security/permission-specialist.md` |

### Patterns (62.x, 86.x, 88.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 17 | 62.x | Data Fetching Chain | `patterns/data-fetching-specialist.md` |
| 18 | 86.x | Hook Patterns (15 global) | `patterns/hook-patterns-specialist.md` |
| 19 | 88.x | BaseRepository (51 impls) | `patterns/base-repository-specialist.md` |

### Performance & Testing (66.x–67.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 20 | 66.x | Frontend Performance | `performance/perf-specialist.md` |
| 21 | 67.x | Testing Strategy | `testing/testing-specialist.md` |

### Localization (58.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 22 | 58.x | i18n (ja-JP primary) | `localization/i18n-specialist.md` |

### Features (60.x–61.x, 64.x–65.x, 68.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 23 | 60.x | Workflow Designer (ReactFlow) | `features/workflow-designer-specialist.md` |
| 24 | 61.x | FCM Notifications | `features/fcm-notification-specialist.md` |
| 25 | 64.x | CKEditor 5 | `features/ckeditor-specialist.md` |
| 26 | 65.x | DnD-kit | `features/dndkit-specialist.md` |
| 27 | 68.x | Calendar (react-big-calendar) | `features/calendar-specialist.md` |

### NextJS/React Best Practices (90.x–100.x)
| # | Pattern | Specialist | File |
|---|---------|-----------|------|
| 28 | 90.x | RSC Patterns (Server/Client boundaries) | `patterns/nextjs-rsc-patterns-specialist.md` |
| 29 | 91.x | File Conventions (App Router) | `routing/nextjs-file-conventions-specialist.md` |
| 30 | 92.x | Assets Optimization (Image/Font/Script) | `performance/nextjs-assets-optimization-specialist.md` |
| 31 | 93.x | React Performance — Critical (Waterfalls/Bundle/SSR) | `performance/react-perf-critical-specialist.md` |
| 32 | 94.x | React Performance — Rendering (Re-render/Client) | `performance/react-perf-rendering-specialist.md` |
| 33 | 95.x | React Composition (Compound/Context/Providers) | `architecture/react-composition-specialist.md` |
| 34 | 96.x | Web Design Guidelines (A11y/Forms/Animation) | `ui/web-design-guidelines-specialist.md` |
| 35 | 97.x | Next.js Cache ('use cache'/PPR/cacheLife) | `patterns/nextjs-cache-specialist.md` |
| 36 | 98.x | Frontend Architecture Styles (4 architectures) | `architecture/frontend-architecture-styles-specialist.md` |
| 37 | 99.x | Error Handling (Boundaries/Recovery/Tracking) | `patterns/nextjs-error-handling-specialist.md` |
| 38 | 100.x | Security (XSS/CSP/CSRF/Secrets) | `security/nextjs-security-specialist.md` |

---

## Source Path → Specialist Lookup

| Source Path | Specialist |
|-------------|-----------|
| `src/app/**` | 52.x routing |
| `src/core/config/` | 84.x core-layer |
| `src/core/constants/` | 84.x core-layer |
| `src/core/di/` | 51.x DI |
| `src/core/i18n/` | 58.x i18n |
| `src/core/services/` | 84.x core-layer |
| `src/core/styles/` | 59.x theme |
| `src/domain/entities/` | 50.x architecture |
| `src/domain/repositories/` | 62.x data-fetching |
| `src/domain/use-cases/` | 51.x DI |
| `src/infrastructure/api/axios.ts` | 54.x axios |
| `src/infrastructure/api/{entity}/` | 87.x api-client |
| `src/infrastructure/repositories/base/` | 88.x base-repo |
| `src/infrastructure/repositories/` | 62.x data-fetching |
| `src/infrastructure/store/` | 53.x redux |
| `src/presentation/hooks/` | 86.x hooks |
| `src/presentation/providers/` | 85.x providers |
| `src/presentation/ui/components/core/block/` | 56.x block |
| `src/presentation/ui/layouts/` | 69.x layout |
| `src/presentation/ui/modules/` | 63.x module-org + 82.x CRUD |
| Table inside module | 83.x table |
| Form inside module | 55.x form |
| Permission check | 57.x permission |

---

## Pattern Number Registry

| Range | Domain |
|-------|--------|
| 50.x | Next.js clean architecture (5-layer) |
| 51.x | Frontend DI / pure function factory |
| 52.x | Multi-tenant routing |
| 53.x | Redux Toolkit state (4 slices) |
| 54.x | Axios API layer |
| 55.x | Ant Design forms |
| 56.x | Block/screen rendering |
| 57.x | Permissions (dual architecture) |
| 58.x | Internationalization (i18next) |
| 59.x | Theme system (CSS hybrid) |
| 60.x | Workflow designer (ReactFlow) |
| 61.x | FCM notifications |
| 62.x | Data fetching chain |
| 63.x | Module organization (26 modules) |
| 64.x | CKEditor 5 rich text |
| 65.x | DnD-kit drag & drop |
| 66.x | Frontend performance |
| 67.x | Testing strategy |
| 68.x | Calendar (react-big-calendar) |
| 69.x | Layout & app shell |
| 70.x–81.x | *(reserved — backend infrastructure + cross-cutting)* |
| 82.x | CRUD page patterns |
| 83.x | Table/DataGrid |
| 84.x | Core layer |
| 85.x | Provider composition |
| 86.x | Hook patterns |
| 87.x | API client structure |
| 88.x | BaseRepository |
| 89.x | *(reserved)* |
| 90.x | RSC patterns (Server/Client boundaries) |
| 91.x | File conventions (App Router) |
| 92.x | Assets optimization (Image/Font/Script/Bundling) |
| 93.x | React performance — critical (waterfalls/bundle/SSR) |
| 94.x | React performance — rendering (re-render/client) |
| 95.x | React composition (compound/context/providers) |
| 96.x | Web design guidelines (a11y/forms/animation) |
| 97.x | Next.js cache ('use cache'/PPR/cacheLife) |
| 98.x | Frontend architecture styles (4 architectures) |
| 99.x | Error handling (boundaries/recovery/tracking) |
| 100.x | Security (XSS/CSP/CSRF/secrets) |

---

## Quick Decision Tree

Working on...
- `src/app/**` → 52.x routing
- `src/core/config/` → 84.x core-layer
- `src/core/constants/` → 84.x core-layer
- `src/core/di/` → 51.x DI
- `src/core/i18n/` → 58.x i18n
- `src/core/services/` → 84.x core-layer
- `src/domain/entities/` → 50.x architecture
- `src/domain/repositories/` → 62.x data-fetching
- `src/domain/use-cases/` → 51.x DI
- `src/infrastructure/api/axios.ts` → 54.x axios
- `src/infrastructure/api/{entity}/` → 87.x api-client
- `src/infrastructure/repositories/base/` → 88.x base-repo
- `src/infrastructure/repositories/` → 62.x data-fetching
- `src/infrastructure/store/` → 53.x redux
- `src/presentation/hooks/` → 86.x hooks
- `src/presentation/providers/` → 85.x providers
- `src/presentation/ui/components/core/block/` → 56.x block
- `src/presentation/ui/layouts/` → 69.x layout
- `src/presentation/ui/modules/` → 63.x module-org + 82.x CRUD
- Table inside module → 83.x table
- Form inside module → 55.x form
- Permission check → 57.x permission
