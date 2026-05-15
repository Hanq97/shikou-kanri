# 02 — Module Architecture

**Version**: 1.0 — 2026-05-15
**Refer to**: [01-system-architecture.md](./01-system-architecture.md), Module Catalog

---

## 1. Mục đích

Mô tả chi tiết cấu trúc 16 modules trong Modular Monolith (ADR-001), boundary rules, public API surface, và dependency flow.

---

## 2. Module structure

```
src/
├── modules/
│   ├── auth/              # Phase 1 — Authentication, authorization, invitation
│   ├── audit/             # Phase 1 — Audit log infrastructure
│   ├── backup/            # Phase 1 — Backup/restore admin operations
│   ├── customer/          # Phase 1 — Customer + property management
│   ├── project/           # Phase 1 — Project lifecycle, member, folder
│   ├── quote/             # Phase 1 — Quote, unit price, PDF
│   ├── aftercare/         # Phase 1 — Maintenance schedules, after-care records
│   ├── notification/      # Phase 1+ — Email, push, LINE/SMS adapters
│   ├── migration/         # Phase 1 — CLI for one-shot data import
│   ├── dashboard/         # Phase 1 basic → Phase 3 advanced
│   ├── schedule/          # Phase 2 — Gantt schedule
│   ├── photo/             # Phase 2 — Field photo, 電子黒板
│   ├── drawing/           # Phase 2 — Drawings + markers
│   ├── chat/              # Phase 2 — Project chat
│   ├── inspection/        # Phase 2 — Inspection + 是正 workflow
│   └── ai/                # Phase 3 — AI gateway (empty placeholder Phase 1)
└── shared/
    ├── database/          # Prisma client, base repository helpers
    ├── storage/           # S3 client wrapper, signed URL helper
    ├── queue/             # BullMQ adapter, Job decorator
    ├── crypto/            # bcrypt/argon2, encryption helpers
    ├── pdf/               # Puppeteer wrapper (worker process)
    ├── http/              # Axios wrapper for outbound HTTP
    └── observability/     # Logger, tracer, metrics
```

---

## 3. Module API surface contract

Each module exposes ONLY through `index.ts`:

```typescript
// src/modules/customer/index.ts (illustrative)
export { CustomerModule } from './customer.module';   // NestJS module
export { CustomerService } from './services';           // Public service interface
export * as CustomerEvents from './events';             // Event names + payload types
export type {
  CustomerDto, CreateCustomerInput, UpdateCustomerInput,
  PropertyDto, CreatePropertyInput,
} from './dto';
// NO export of repository, internal entities, raw Prisma types
```

**Cross-module rule**: import only `'@/modules/<name>'` (resolves to `index.ts`). 
Importing `'@/modules/<name>/internal/...'` is a lint error.

---

## 4. Module dependency matrix

```
Legend: ✓ = Uses public API of (rows depend on columns)

Module          │ shr │ auth│ aud │ cst │ prj │ qte │ aft │ ntf │ sch │ pho │ chat│ ai  │
────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
shared/         │  -  │     │     │     │     │     │     │     │     │     │     │     │
auth            │  ✓  │  -  │ ✓   │     │     │     │     │ ✓   │     │     │     │     │
audit           │  ✓  │     │  -  │     │     │     │     │     │     │     │     │     │
backup          │  ✓  │     │ ✓   │     │     │     │     │     │     │     │     │     │
customer        │  ✓  │ ✓   │ ✓   │  -  │     │     │     │     │     │     │     │     │
project         │  ✓  │ ✓   │ ✓   │ ✓   │  -  │     │     │     │     │     │     │     │
quote           │  ✓  │ ✓   │ ✓   │ ✓   │ ✓   │  -  │     │     │     │     │     │     │
aftercare       │  ✓  │ ✓   │ ✓   │ ✓ (event) │ │     │  -  │ ✓   │     │     │     │     │
notification    │  ✓  │ ✓   │ ✓   │     │     │     │     │  -  │     │     │     │     │
migration (CLI) │  ✓  │     │ ✓   │ ✓   │     │     │     │     │     │     │     │     │
dashboard (P1)  │  ✓  │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │     │     │     │     │     │
schedule (P2)   │  ✓  │ ✓   │ ✓   │     │ ✓   │     │     │ ✓   │  -  │     │     │     │
photo (P2)      │  ✓  │ ✓   │ ✓   │     │ ✓   │     │     │     │     │  -  │     │     │
drawing (P2)    │  ✓  │ ✓   │ ✓   │     │ ✓   │     │     │     │     │ ✓   │     │     │
chat (P2)       │  ✓  │ ✓   │ ✓   │     │ ✓   │     │     │ ✓   │     │     │  -  │     │
inspection (P2) │  ✓  │ ✓   │ ✓   │     │ ✓   │     │     │ ✓   │     │ ✓   │     │     │
dashboard (P3)  │  ✓  │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │     │     │     │     │ ✓   │
ai (P3)         │  ✓  │ ✓   │ ✓   │ ✓ (read) │ ✓ │ ✓   │     │     │     │     │     │  -  │
```

**No circular dependencies allowed** (eslint-plugin-boundaries enforces).

---

## 5. Inter-module communication patterns

### 5.1 Synchronous (in-process call)
Direct service method call on imported public API.
```ts
// project service uses customer service
const customer = await this.customerService.findById(customerId);
```

### 5.2 Event-based (loose coupling)
Use Nestjs EventEmitter for cross-module signals.

```ts
// customer module emits
this.eventEmitter.emit('property.handover_date_set', { propertyId, customerId, handoverDate });

// aftercare module subscribes
@OnEvent('property.handover_date_set')
async handleHandoverDateSet(payload: PropertyHandoverPayload) {
  await this.maintenanceScheduleService.generateForProperty(payload.propertyId);
}
```

**Use events when**:
- Side effect after primary operation (not core to caller's contract)
- Multiple subscribers possible
- Async / fire-and-forget acceptable

**Event catalog** (Phase 1):
| Event | Producer | Subscribers | Purpose |
|---|---|---|---|
| `customer.created` | customer | audit, dashboard | Welcome flow, stats |
| `property.handover_date_set` | customer | aftercare | Generate maintenance schedule |
| `project.created` | project | audit, dashboard | Stats refresh |
| `project.status_changed` | project | audit, notification | Stakeholder notification |
| `quote.created` | quote | audit, dashboard | — |
| `quote.approved` | quote | audit, notification (notify customer/sales) | — |
| `aftercare.notification_due` | aftercare (batch) | notification | Trigger email send |

### 5.3 Job queue (deferred / heavy)
Use BullMQ for jobs that:
- Take >1s
- Need retry logic
- Run on schedule

**Common queues**:
- `email-send` (notification module)
- `pdf-generate` (quote, inspection modules)
- `photo-process` (photo module Phase 2 — HEIC transcode, thumbnail)
- `aftercare-batch` (daily cron — aftercare module)
- `migration-import` (one-shot — migration module)
- `ai-embed` (Phase 3 — ai module)
- `ai-inference` (Phase 3 — ai module)
- `csv-export` (any module — user-requested data export)

---

## 6. Shared / Cross-cutting modules

### 6.1 `shared/database`
- Prisma client singleton
- Base repository helpers (soft-delete, audit field auto-set)
- Migration scripts via `prisma migrate`

### 6.2 `shared/storage`
- S3 client wrapper với typed methods: `uploadFile`, `getSignedUrl`, `deleteFile`
- Bucket configuration (per ADR-006 path structure)
- Lifecycle management coordination

### 6.3 `shared/queue`
- BullMQ wrapper
- Job decorator `@Processor`, `@Process` patterns
- DLQ (dead letter queue) handling
- Job metrics export to CloudWatch

### 6.4 `shared/crypto`
- Argon2id hash + verify
- AES-256-GCM symmetric encryption for sensitive fields (2FA secret)
- Helper: `tokenGenerator(prefix, length)` cho invite tokens

### 6.5 `shared/pdf`
- Puppeteer wrapper (renders HTML/CSS to PDF)
- Run in separate worker process to avoid blocking main API
- Concurrency control via BullMQ
- Templates in `src/templates/pdf/` (Handlebars-based)

### 6.6 `shared/http`
- Axios instance with default config (timeout, retry, circuit breaker via `axios-retry` + custom interceptor)
- Logging interceptor (request/response with redaction)

### 6.7 `shared/observability`
- Pino logger với context-aware (traceId, userId injection)
- OpenTelemetry SDK initialization
- Metrics primitives: `Counter`, `Histogram`, `Gauge`

---

## 7. Module lifecycle in Phase 1

```
T0 (project start)
  │
  ▼
Sprint 1: shared/* skeleton + auth module + audit + DB schema baseline
  │
  ▼
Sprint 2: customer module + project module (parallel)
  │
  ▼
Sprint 3: quote module + unit price master + PDF generation
  │
  ▼
Sprint 4: aftercare module + notification (email) + dashboard (basic)
  │
  ▼
Sprint 5: migration CLI tool + data quality iteration
  │
  ▼
Sprint 6: backup admin + audit log viewer + integration testing
  │
  ▼
Sprint 7: UAT prep + bug fix + production cutover
  │
  ▼
T+4mo: Phase 1 MVP launch
```

7 sprints × ~2 weeks = 14 weeks = ~3.5 months (within 4-month target with buffer).

---

## 8. Boundary enforcement

### 8.1 ESLint rule snippet (illustrative)

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'shared', pattern: 'src/shared/*' },
      { type: 'module', pattern: 'src/modules/*/index.ts', mode: 'file' },
      { type: 'module-internal', pattern: 'src/modules/*/!(index.ts)' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'module', allow: ['shared', 'module'] },
          { from: 'module-internal', allow: ['shared', 'module-internal'] },
          { from: 'shared', allow: ['shared'] },
        ],
      },
    ],
  },
};
```

### 8.2 CI check
- PR pipeline runs `pnpm lint` which includes the boundaries rule
- Failures block merge
- Quarterly architecture review to verify no exceptions creep in

### 8.3 Refactor guidance
- If module A really needs module B's internal — discuss whether to:
  1. Add to B's public API (preferred if reusable)
  2. Move shared logic to `shared/`
  3. Split B into smaller modules
  4. (Last resort) Add explicit exception in eslint config with comment justifying

---

## 9. Related documents

- [01 — System Architecture](./01-system-architecture.md)
- [05 — Backend Architecture](./05-backend-architecture.md)
- Module Catalog: `architect/catalogs/module-catalog.md`
- ADR-001: Modular Monolith pattern
