# Phase 4 Master Index - FastAPI + React.js Specialists

**Phase**: Phase 4 (FastAPI + React.js)
**Days Completed**: 12-14 (of 15)
**Total Specialists**: 7
**Total Patterns**: 116 (13.1-13.35, 14.1-14.55, 15.1-15.40)
**Purpose**: Master index for SpecialistLoader auto-discovery and orchestration

---

## Quick Navigation

- [Specialist Registry](#specialist-registry)
- [Pattern Index](#pattern-index-by-number)
- [Category Index](#pattern-index-by-category)
- [Technology Stack](#technology-stack-index)
- [Usage Examples](#usage-examples)
- [Quality Metrics](#quality-metrics)

---

## Specialist Registry

### Frontend Specialists

| # | Specialist | Patterns | Lines | Layer | Status |
|---|------------|----------|-------|-------|--------|
| 1 | [entity-components-specialist.md](frontend/entity-components-specialist.md) | 13.1-13.28 (28) | 711 | Entities | ✅ Excellent |
| 2 | [entity-models-specialist.md](frontend/entity-models-specialist.md) | 13.29-13.35 (7) | 867 | Entities | ⚠️ Very Good |
| 3 | [ui-components-specialist.md](frontend/ui-components-specialist.md) | 14.1-14.20 (20) | 644 | Shared | ✅ Excellent |
| 4 | [utilities-specialist.md](frontend/utilities-specialist.md) | 14.21-14.40 (20) | 610 | Shared | ✅ Excellent |
| 5 | [api-hooks-specialist.md](frontend/api-hooks-specialist.md) | 14.41-14.55 (15) | 627 | Shared | ✅ Excellent |

### Testing Specialists

| # | Specialist | Patterns | Lines | Category | Status |
|---|------------|----------|-------|----------|--------|
| 6 | [e2e-testing-specialist.md](e2e-testing-specialist.md) | 15.1-15.15, 15.36-15.40 (20) | 641 | E2E | ✅ Excellent |
| 7 | [api-integration-specialist.md](api-integration-specialist.md) | 15.16-15.29 (14) | 755 | API/Component | ✅ Excellent |

### Index Files

| File | Lines | Purpose |
|------|-------|---------|
| [ENTITIES_INDEX.md](frontend/ENTITIES_INDEX.md) | 382 | Entity layer metadata |
| [SHARED_INDEX.md](frontend/SHARED_INDEX.md) | 274 | Shared layer metadata |
| [TESTING_INDEX.md](TESTING_INDEX.md) | 262 | Testing metadata |
| **PHASE_4_INDEX.md** (this file) | - | Master index |

---

## Pattern Index (by Number)

### Day 12: Entities Layer (Patterns 13.1-13.35)

#### Entity Components (13.1-13.28)
| Pattern | Name | Specialist |
|---------|------|------------|
| 13.1 | UserCard Component | entity-components |
| 13.2 | UserList Component | entity-components |
| 13.3 | UserTable Component | entity-components |
| 13.4 | UserProfile Component | entity-components |
| 13.5 | UserAvatar Component | entity-components |
| 13.6 | UserStatus Badge | entity-components |
| 13.7 | UserForm (Create/Edit) | entity-components |
| 13.8 | ConversationCard Component | entity-components |
| 13.9 | ConversationList Component | entity-components |
| 13.10 | ConversationHeader Component | entity-components |
| 13.11 | ConversationParticipants Component | entity-components |
| 13.12 | MessageBubble Component | entity-components |
| 13.13 | MessageList Component | entity-components |
| 13.14 | MessageInput Component | entity-components |
| 13.15 | MessageAttachment Component | entity-components |
| 13.16 | MessageReactions Component | entity-components |
| 13.17 | ProductCard Component | entity-components |
| 13.18 | ProductGrid Component | entity-components |
| 13.19 | ProductDetail Component | entity-components |
| 13.20 | ProductImage Gallery | entity-components |
| 13.21 | EntitySkeleton Component | entity-components |
| 13.22 | EntityError Component | entity-components |
| 13.23 | EntityEmpty State | entity-components |
| 13.24 | EntityLoadingIndicator | entity-components |
| 13.25 | EntityPagination Component | entity-components |
| 13.26 | EntitySearch Component | entity-components |
| 13.27 | EntityFilter Component | entity-components |
| 13.28 | EntitySort Component | entity-components |

#### Entity Models (13.29-13.35)
| Pattern | Name | Specialist |
|---------|------|------------|
| 13.29 | Generic EntityCard Template | entity-models |
| 13.30 | Generic EntityList Template | entity-models |
| 13.31 | Generic EntityTable Template | entity-models |
| 13.32 | TypeScript Utility Types (Loadable, Paginated, Filterable) | entity-models |
| 13.33 | Zod Entity Validation Schemas | entity-models |
| 13.34 | Entity State Management Patterns | entity-models |
| 13.35 | Entity Hook Patterns (useFetchEntity, useMutateEntity) | entity-models |

---

### Day 13: Shared Layer (Patterns 14.1-14.55)

#### UI Components (14.1-14.20)
| Pattern | Name | Specialist |
|---------|------|------------|
| 14.1 | Button Component (CVA variants) | ui-components |
| 14.2 | Input Component | ui-components |
| 14.3 | Select Component | ui-components |
| 14.4 | Checkbox Component | ui-components |
| 14.5 | Radio Component | ui-components |
| 14.6 | Textarea Component | ui-components |
| 14.7 | Card Component (Header, Content, Footer) | ui-components |
| 14.8 | Dialog Component (Compound) | ui-components |
| 14.9 | Sheet Component (Drawer) | ui-components |
| 14.10 | Tabs Component | ui-components |
| 14.11 | Accordion Component | ui-components |
| 14.12 | Toast Notification System | ui-components |
| 14.13 | Alert Component | ui-components |
| 14.14 | Badge Component | ui-components |
| 14.15 | Skeleton Loader | ui-components |
| 14.16 | Spinner Component | ui-components |
| 14.17 | Avatar Component | ui-components |
| 14.18 | Table Component | ui-components |
| 14.19 | Pagination Component | ui-components |
| 14.20 | Tooltip & Popover Components | ui-components |

#### Utilities (14.21-14.40)
| Pattern | Name | Specialist |
|---------|------|------------|
| 14.21 | cn Utility (clsx + tailwind-merge) | utilities |
| 14.22 | formatDate (DD/MM/YYYY Vietnamese format) | utilities |
| 14.23 | formatCurrency (VND with dot separators) | utilities |
| 14.24 | formatNumber (Intl.NumberFormat) | utilities |
| 14.25 | formatRelativeTime (date-fns) | utilities |
| 14.26 | formatBytes (1KB, 1MB, 1GB) | utilities |
| 14.27 | formatPhoneVN (+84 987 654 321) | utilities |
| 14.28 | isValidEmail Validator | utilities |
| 14.29 | isValidPhone (+84 or 0xxx format) | utilities |
| 14.30 | isValidURL Validator | utilities |
| 14.31 | isValidCCCD (12-digit Vietnamese Citizen ID) | utilities |
| 14.32 | parseJWT Token Parser | utilities |
| 14.33 | sanitizeHTML (DOMPurify wrapper) | utilities |
| 14.34 | debounce Function | utilities |
| 14.35 | throttle Function | utilities |
| 14.36 | cloneDeep (Structured Clone) | utilities |
| 14.37 | omit Object Utility | utilities |
| 14.38 | pick Object Utility | utilities |
| 14.39 | toSlug Vietnamese Slug Generator | utilities |
| 14.40 | generateId (nanoid wrapper) | utilities |

#### API & Hooks (14.41-14.55)
| Pattern | Name | Specialist |
|---------|------|------------|
| 14.41 | APIClient Class (Generic HTTP client) | api-hooks |
| 14.42 | GET Request with Query Params | api-hooks |
| 14.43 | POST Request with JSON Body | api-hooks |
| 14.44 | PATCH/PUT Request | api-hooks |
| 14.45 | DELETE Request | api-hooks |
| 14.46 | Auth Token Management (get, set, clear) | api-hooks |
| 14.47 | File Upload with Progress | api-hooks |
| 14.48 | Error Handling (APIError class) | api-hooks |
| 14.49 | Retry Logic with Exponential Backoff | api-hooks |
| 14.50 | AbortController for Request Cancellation | api-hooks |
| 14.51 | useDebounce Hook | api-hooks |
| 14.52 | useThrottle Hook | api-hooks |
| 14.53 | useLocalStorage Hook | api-hooks |
| 14.54 | useMediaQuery Hook | api-hooks |
| 14.55 | useOnClickOutside Hook | api-hooks |

---

### Day 14: Integration Testing (Patterns 15.1-15.40)

#### E2E User Flows (15.1-15.5)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.1 | Login Flow E2E Test | e2e-testing |
| 15.2 | User CRUD Flow E2E Test | e2e-testing |
| 15.3 | Conversation Flow E2E Test (WebSocket) | e2e-testing |
| 15.4 | Data Export Flow E2E Test (CSV, PDF, Excel) | e2e-testing |
| 15.5 | Settings Update Flow E2E Test | e2e-testing |

#### E2E Page Tests (15.6-15.10)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.6 | Home Page E2E Test | e2e-testing |
| 15.7 | Users Page E2E Test (Table, Pagination, Search) | e2e-testing |
| 15.8 | Conversations Page E2E Test | e2e-testing |
| 15.9 | Dashboard Page E2E Test (Stats, Charts) | e2e-testing |
| 15.10 | Profile Page E2E Test | e2e-testing |

#### E2E Feature Tests (15.11-15.15)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.11 | Global Search E2E Test (Ctrl+K) | e2e-testing |
| 15.12 | Filter Feature E2E Test | e2e-testing |
| 15.13 | Form Validation E2E Test (Client + Server) | e2e-testing |
| 15.14 | File Upload E2E Test (Avatar, Bulk) | e2e-testing |
| 15.15 | Notification System E2E Test (Toast, Bell) | e2e-testing |

#### API Integration Tests (15.16-15.20)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.16 | Authentication API Test (Login, Register, Refresh, Logout) | api-integration |
| 15.17 | User CRUD API Test (Create, Read, Update, Delete, List, Filter) | api-integration |
| 15.18 | Conversation API Test (Create, Messages, Mark as Read) | api-integration |
| 15.19 | File Upload API Test (Single file, Validation) | api-integration |
| 15.20 | Error Handling API Test (422, 404, 409, 500) | api-integration |

#### WebSocket Tests (15.21-15.23)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.21 | Real-Time Messaging WebSocket Test (Two clients) | api-integration |
| 15.22 | Presence Updates WebSocket Test (Online/Offline) | api-integration |
| 15.23 | Connection Handling WebSocket Test (Ping/Pong, Disconnect) | api-integration |

#### Component Integration Tests (15.26-15.29)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.26 | CreateUser Component + API Integration Test (MSW) | api-integration |
| 15.27 | EditUser Component + API Integration Test (MSW) | api-integration |
| 15.28 | Filters Component + API Integration Test (MSW) | api-integration |
| 15.29 | Stats Widget + API Integration Test (MSW) | api-integration |

#### CI/CD & Quality Gates (15.36-15.40)
| Pattern | Name | Specialist |
|---------|------|------------|
| 15.36 | GitHub Actions CI Pipeline (E2E tests, artifacts) | e2e-testing |
| 15.37 | Test Coverage Requirements (≥90% user flows) | e2e-testing |
| 15.38 | Parallel E2E Execution (Workers, Shards, Matrix) | e2e-testing |
| 15.39 | Visual Regression Testing (Screenshot comparison) | e2e-testing |
| 15.40 | Performance Budget Enforcement (<2s load, <3s TTI) | e2e-testing |

---

## Pattern Index (by Category)

### Frontend Architecture
- **FSD Entities Layer**: Patterns 13.1-13.35 (35 patterns)
- **FSD Shared Layer**: Patterns 14.1-14.55 (47 patterns)

### Testing & Quality
- **E2E Testing**: Patterns 15.1-15.15, 15.36-15.40 (20 patterns)
- **API Integration**: Patterns 15.16-15.23 (8 patterns)
- **Component Integration**: Patterns 15.26-15.29 (4 patterns)
- **CI/CD**: Patterns 15.36-15.40 (5 patterns)

### By Technology
- **React Components**: 13.1-13.28, 14.1-14.20 (48 patterns)
- **TypeScript Utilities**: 13.29-13.35, 14.21-14.40 (27 patterns)
- **API Patterns**: 14.41-14.50 (10 patterns)
- **Custom Hooks**: 13.35, 14.51-14.55 (6 patterns)
- **Playwright Tests**: 15.1-15.15, 15.36-15.40 (20 patterns)
- **pytest Tests**: 15.16-15.23 (8 patterns)
- **MSW Tests**: 15.26-15.29 (4 patterns)

---

## Technology Stack Index

### Frontend Stack
| Technology | Version | Patterns | Specialists |
|------------|---------|----------|-------------|
| React | 19 | 13.1-14.20, 14.51-14.55 | 3 |
| Next.js | 15.3.0 | 13.1-14.55 | 5 |
| TypeScript | 5 (strict) | All | 7 |
| Shadcn/ui | Latest | 14.1-14.20 | 1 |
| Radix UI | Latest | 14.1-14.20 | 1 |
| Tailwind CSS | 3.x | 14.1-14.21 | 2 |
| CVA | Latest | 14.1 | 1 |
| Zod | Latest | 13.33 | 1 |
| TanStack Query | v5 | 13.35 | 1 |
| date-fns | Latest | 14.22, 14.25 | 1 |

### Testing Stack
| Technology | Version | Patterns | Specialists |
|------------|---------|----------|-------------|
| Playwright | Latest | 15.1-15.15, 15.36-15.40 | 1 |
| pytest | Latest | 15.16-15.23 | 1 |
| pytest-asyncio | Latest | 15.16-15.23 | 1 |
| httpx | Latest | 15.16-15.23 | 1 |
| MSW | Latest | 15.26-15.29 | 1 |
| Jest | Latest | 15.26-15.29 | 1 |
| Testing Library | Latest | 15.26-15.29 | 1 |
| GitHub Actions | - | 15.36 | 1 |

---

## Usage Examples

### Loading a Specialist
```javascript
// Load entity components specialist
const entitySpec = await SpecialistLoader.load('entity-components-specialist');

// Get specific pattern
const userCardPattern = entitySpec.getPattern('13.1');

// Execute pattern generation
await entitySpec.execute({
  command: 'generate-component',
  pattern: '13.1',
  output: 'src/entities/user/ui/UserCard.tsx'
});
```

### Loading by Category
```javascript
// Load all Entities layer specialists
const entitiesSpecs = await SpecialistLoader.loadCategory('entities');
// Returns: [entity-components-specialist, entity-models-specialist]

// Load all Shared layer specialists
const sharedSpecs = await SpecialistLoader.loadCategory('shared');
// Returns: [ui-components-specialist, utilities-specialist, api-hooks-specialist]

// Load all Testing specialists
const testingSpecs = await SpecialistLoader.loadCategory('testing');
// Returns: [e2e-testing-specialist, api-integration-specialist]
```

### Pattern Search
```javascript
// Find all Button-related patterns
const buttonPatterns = await SpecialistLoader.searchPatterns('button');
// Returns: [14.1 (Button Component CVA variants)]

// Find all Vietnamese localization patterns
const vnPatterns = await SpecialistLoader.searchPatterns('vietnamese|vnd|phone|cccd');
// Returns: [14.22, 14.23, 14.27, 14.31, 14.39]

// Find all validation patterns
const validationPatterns = await SpecialistLoader.searchPatterns('validator|validation|zod');
// Returns: [13.33, 14.28-14.32, 15.13, 15.19]
```

### Orchestrated Generation
```javascript
// Generate complete Entities layer
const orchestrator = new SpecialistOrchestrator({
  specialists: ['entity-components-specialist', 'entity-models-specialist']
});

await orchestrator.generateLayer({
  layer: 'entities',
  entities: ['User', 'Conversation', 'Message', 'Product'],
  output: 'src/entities/'
});

// Generate test suite
const testOrchestrator = new TestingOrchestrator({
  specialists: ['e2e-testing-specialist', 'api-integration-specialist']
});

await testOrchestrator.generateTestSuite({
  features: ['authentication', 'users', 'conversations'],
  coverage_target: 90,
  include_e2e: true,
  include_api: true
});
```

---

## Quality Metrics

### Compliance Statistics
| Metric | Value |
|--------|-------|
| Total Specialists | 7 |
| Total Patterns | 116 |
| Total Lines (specialists) | 4,955 |
| Average Specialist Size | 708 lines |
| Strict Compliance (≤800) | 86% (6/7) |
| Buffer Compliance (≤900) | 100% (7/7) |
| Format | Workflow as Code ✅ |

### Pattern Distribution
| Category | Patterns | % of Total |
|----------|----------|-----------|
| Entity Components | 28 | 24.1% |
| Entity Models | 7 | 6.0% |
| UI Components | 20 | 17.2% |
| Utilities | 20 | 17.2% |
| API & Hooks | 15 | 12.9% |
| E2E Tests | 20 | 17.2% |
| API Tests | 8 | 6.9% |
| Component Integration | 4 | 3.4% |
| CI/CD | 5 | 4.3% |

### Specialist Sizes
| Specialist | Lines | % of Avg | Compliance |
|------------|-------|----------|------------|
| utilities-specialist | 610 | 86% | ✅ Excellent |
| e2e-testing-specialist | 641 | 91% | ✅ Excellent |
| ui-components-specialist | 644 | 91% | ✅ Excellent |
| api-hooks-specialist | 627 | 89% | ✅ Excellent |
| entity-components-specialist | 711 | 100% | ✅ Excellent |
| api-integration-specialist | 755 | 107% | ✅ Excellent |
| entity-models-specialist | 867 | 122% | ⚠️ Very Good |

---

## Keywords for Discovery

**FSD Architecture**: feature-sliced-design, entities, shared, app, pages, widgets, features

**React Components**: react-19, typescript-5, shadcn-ui, radix-ui, cva, compound-components

**Utilities**: formatters, validators, helpers, vietnamese-localization, vnd-currency, cccd

**API Patterns**: http-client, fetch-api, auth-tokens, error-handling, retry-logic, file-upload

**Custom Hooks**: use-debounce, use-local-storage, use-media-query, use-click-outside

**Testing**: playwright, e2e, pytest, httpx, msw, jest, testing-library, integration-tests

**Quality**: ci-cd, github-actions, coverage, visual-regression, performance-budgets

**Accessibility**: wcag-21-aa, aria, keyboard-navigation, screen-reader, focus-management

---

## File Structure

```
specialists/code/fastapi-react/
├── PHASE_4_INDEX.md                    (this file)
├── frontend/
│   ├── ENTITIES_INDEX.md                (Day 12 index)
│   ├── entity-components-specialist.md  (Day 12, 711 lines, 28 patterns)
│   ├── entity-models-specialist.md      (Day 12, 867 lines, 7 patterns)
│   ├── SHARED_INDEX.md                  (Day 13 index)
│   ├── ui-components-specialist.md      (Day 13, 644 lines, 20 patterns)
│   ├── utilities-specialist.md          (Day 13, 610 lines, 20 patterns)
│   └── api-hooks-specialist.md          (Day 13, 627 lines, 15 patterns)
├── TESTING_INDEX.md                     (Day 14 index)
├── e2e-testing-specialist.md            (Day 14, 641 lines, 20 patterns)
└── api-integration-specialist.md        (Day 14, 755 lines, 14 patterns)
```

---

## Related Documentation

- **[Phase 4 Summary](../../../../memory-bank/dev/PHASE_4_SUMMARY.md)**: Complete phase overview
- **[Day 12 Checkpoint](../../../../memory-bank/dev/20260103-checkpoint-day-12-complete-entities-layer-2-specialists-711-867-lines.md)**: Entities layer
- **[Day 13 Checkpoint](../../../../memory-bank/dev/20260103-checkpoint-day-13-complete-shared-layer-3-specialists-100-compliance.md)**: Shared layer
- **[Day 14 Checkpoint](../../../../memory-bank/dev/20260103-checkpoint-day-14-complete-testing-2-specialists-100-compliance.md)**: Integration testing

---

*Last Updated*: 2026-01-03
*Phase 4 - Days 12-14*: Complete
*Total Specialists*: 7
*Total Patterns*: 116
