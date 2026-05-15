# Frontend Architecture Styles Specialist — Generic
# フロントエンドアーキテクチャスタイルスペシャリスト — 汎用
# Chuyên Gia Kiến Trúc Frontend — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 98.1–98.5 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |

---

## Purpose
Frontend architecture selection guide: Clean Architecture, Feature-Sliced Design, Layered, Modular Monolith. Decision matrix for choosing the right architecture based on team size, complexity, and scalability needs. Fills stack config gap: `supportedArchitectures` defines 4 styles.

## Patterns

### Pattern 98.1: Clean Architecture
```
src/
├── app/            → Next.js routing (composition root)
├── core/           → DI, config, constants, services
├── domain/         → Entities, repository interfaces, use-cases (ZERO framework deps)
├── infrastructure/ → API clients, repository impls, store (Redux/Zustand)
└── presentation/   → Components, hooks, providers, UI modules

Rules:
- Dependencies point INWARD: app → presentation → domain ← infrastructure
- Domain layer has ZERO framework imports (no React, no Next.js)
- Infrastructure implements domain interfaces (dependency inversion)
When: Complex business logic, large teams, long-lived projects
```

### Pattern 98.2: Feature-Sliced Design (FSD)
```
src/
├── app/       → Providers, global styles, routing config
├── pages/     → Page compositions (import widgets + features)
├── widgets/   → Complex compositions of features
├── features/  → User scenarios (login, checkout, search)
├── entities/  → Business models (user, product, order)
└── shared/    → UI kit, utilities, API client, types

Rules:
- Upper layers import lower (app → pages → widgets → features → entities → shared)
- NEVER import upward (entities cannot import features)
- Each slice has public API (index.ts barrel export)
When: Large teams, many independent features, need strict isolation
```

### Pattern 98.3: Layered Architecture
```
src/
├── components/ → Reusable UI components
├── hooks/      → Custom hooks
├── api/        → API clients and data fetching
├── store/      → State management
├── utils/      → Shared utilities
└── pages/ or app/ → Route pages

Rules:
- Simple folder-by-type structure
- No strict dependency rules between layers
- Risk: becomes "big ball of mud" as project grows
When: Small/medium CRUD apps, rapid prototyping, small teams
```

### Pattern 98.4: Modular Monolith
```
src/
├── modules/
│   ├── auth/         → Login, register, tokens, permissions
│   ├── billing/      → Plans, invoices, payments
│   ├── dashboard/    → Analytics, widgets, reports
│   └── settings/     → User prefs, org config
├── shared/           → Cross-module utilities, types, UI kit
└── app/              → Module composition, routing

Rules:
- Each module is self-contained: components, hooks, api, store, types
- Modules communicate via public API (index.ts), not direct imports
- Internal structure per module: any of the above architectures
When: Microservices migration prep, multiple teams owning modules
```

### Pattern 98.5: Architecture Selection Guide
```
Decision matrix:
                    | Small team (<5) | Medium (5-15) | Large (15+)
Simple CRUD         | Layered         | Layered/FSD   | FSD
Complex business    | Clean Arch      | Clean Arch    | Clean Arch
Many features       | Modular         | FSD/Modular   | FSD
Micro-frontend prep | Modular         | Modular       | Modular

Key signals:
- "Business rules independent of UI" → Clean Architecture
- "Teams own features independently" → Feature-Sliced Design
- "Need to move fast, keep it simple" → Layered
- "Preparing for service extraction" → Modular Monolith
```

## Common Mistakes
- Choosing Clean Architecture for simple CRUD (over-engineering)
- Layered architecture without noticing it growing into a mess
- FSD without enforcing import rules (layers import freely = chaos)
- Mixing architecture styles without clear boundaries

## Related Specialists
- 50.x nextjs-clean-architecture — Project-specific Clean Architecture implementation (variant overlay)
- 63.x module-organization — Project-specific module structure (variant overlay)
