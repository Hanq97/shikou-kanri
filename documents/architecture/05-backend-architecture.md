# 05 — Backend Architecture

**Version**: 1.0 — 2026-05-15
**Refer to**: ADR-002 (NestJS), ADR-001 (Modular Monolith)

---

## 1. Mục đích

Mô tả kiến trúc backend NestJS: project structure, layer pattern, cross-cutting concerns, async jobs, real-time, PDF generation.

---

## 2. Project structure

```
backend/
├── src/
│   ├── main.ts                # Bootstrap (HTTP + WS)
│   ├── app.module.ts          # Root NestJS module
│   ├── config/                # Type-safe config (process.env wrapper)
│   ├── modules/               # 16 modules (see Module Architecture)
│   ├── shared/                # Cross-cutting helpers
│   └── workers/               # Separate worker entry points
│       ├── pdf-worker.ts      # Puppeteer rendering
│       ├── photo-worker.ts    # Phase 2 image processing
│       └── ai-worker.ts       # Phase 3 inference
│
├── prisma/
│   ├── schema.prisma          # DB schema source of truth
│   └── migrations/            # Generated migrations
│
├── test/
│   ├── unit/
│   ├── integration/           # Uses test DB
│   └── e2e/                   # Spinning real app
│
├── Dockerfile                 # API image
├── Dockerfile.worker          # Worker image (separate)
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 3. Layer pattern (per module)

```
modules/<name>/
├── index.ts                   # Public API barrel
├── <name>.module.ts           # NestJS module definition
├── controllers/               # HTTP endpoints
├── gateways/                  # WebSocket handlers (Phase 2+)
├── services/                  # Application services (use cases)
├── domain/                    # Entities, value objects, business logic
├── repositories/              # Prisma-based persistence
├── dto/                       # Request/Response DTOs (+ Zod schemas)
├── events/                    # Event types and emitters
├── jobs/                      # BullMQ processors
└── internal/                  # Implementation details (not exported)
```

### 3.1 Controller (Presentation)
- Receives HTTP request
- Validates via DTO + class-validator/Zod
- Calls service
- Returns DTO

```typescript
@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomerService) {}

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee')
  @UseGuards(AuthGuard, RolesGuard)
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<CustomerDto> {
    return this.customers.findById(id, user);
  }
}
```

### 3.2 Service (Application)
- Orchestrates use case
- Manages transaction
- Emits events
- No HTTP concerns

```typescript
@Injectable()
export class CustomerService {
  constructor(
    private repo: CustomerRepository,
    private audit: AuditService,
    private events: EventEmitter2,
  ) {}

  async create(input: CreateCustomerInput, actor: AuthenticatedUser): Promise<CustomerDto> {
    return this.prisma.$transaction(async (tx) => {
      const customer = await this.repo.create(tx, { ...input, createdBy: actor.id });
      await this.audit.log({ actor: actor.id, action: 'customer.create', entityId: customer.id }, tx);
      this.events.emit('customer.created', { customerId: customer.id });
      return this.toDto(customer);
    });
  }
}
```

### 3.3 Repository (Infrastructure)
- Prisma-based queries
- Returns domain types (not Prisma types) — translation layer

### 3.4 Domain
- Pure TypeScript (no NestJS, no Prisma)
- Business rules (e.g., `Quote.canTransitionTo(newStatus)`)
- Value objects (e.g., `Money`, `JapaneseAddress`)

---

## 4. Request lifecycle

```
HTTP Request
  │
  ▼
ALB → ECS task
  │
  ▼
NestJS app receives:
  1. Logging interceptor (start time, traceId)
  2. AuthGuard (validate JWT, attach user to request)
  3. RolesGuard (check role)
  4. Custom guards (e.g., ProjectMembershipGuard)
  5. ValidationPipe (DTO + class-validator/Zod)
  6. Controller method
     └── calls Service
            └── transaction (if mutation)
                 ├── Repository (Prisma)
                 ├── Audit log entry
                 └── Event emission
  7. Serialization interceptor (ClassSerializerInterceptor)
  8. Logging interceptor (end time, status)
  │
  ▼
Response
```

Exception handling: GlobalExceptionFilter maps to standardized JSON response.

---

## 5. Cross-cutting concerns

### 5.1 Authentication & Authorization
- `JwtStrategy` in passport (per ADR-015)
- Decorators: `@Public()`, `@Roles()`, `@CurrentUser()`, `@ProjectMembership()`
- Guards composed: `@UseGuards(AuthGuard, RolesGuard, ProjectMembershipGuard)`

### 5.2 Validation
- DTOs annotated with class-validator OR Zod schema parsed in pipe
- Reject early at controller layer
- Detailed error messages localized (ja_JP)

### 5.3 Transactions
- Use `prisma.$transaction()` for multi-statement operations
- Service methods accept optional `tx` parameter for composition
- Interactive transactions for complex flows (quote approval with audit + notification)

### 5.4 Audit
- Every mutation emits audit log within same transaction
- `@Audit('action.name')` decorator on controller method auto-instruments

### 5.5 Logging
- Pino logger with context propagation
- Trace ID generated at request entry; propagated via async_hooks
- Sensitive fields redacted (password, token, name+phone+email combo for PII)

### 5.6 Tracing
- OpenTelemetry SDK in main.ts
- Auto-instrumentation: HTTP, Prisma, BullMQ, Redis
- Spans for service methods via `@Trace()` decorator
- Exporter: X-Ray (or Datadog OTLP if decided ops-side)

### 5.7 Error handling
```typescript
// Domain errors
class AppError extends Error {
  constructor(public code: string, public statusCode: number, message: string, public details?: any) {
    super(message);
  }
}
class NotFoundError extends AppError { ... }
class PermissionError extends AppError { ... }
class ValidationError extends AppError { ... }
class ConflictError extends AppError { ... }
class IntegrationError extends AppError { ... }

// Global filter maps to:
// { code: 'NOT_FOUND', message: '...', traceId: '...', details: ... }
```

---

## 6. Async jobs (BullMQ)

### 6.1 Queue structure
- Backed by ElastiCache Redis
- Each module defines its queues (e.g., `email-send`, `aftercare-batch`)
- Workers are separate processes/containers for isolation

### 6.2 Queue catalog (Phase 1)
| Queue | Producer | Consumer | Frequency / Trigger |
|---|---|---|---|
| `email-send` | notification | notification worker | On notification create |
| `pdf-generate` | quote (later: inspection) | pdf-worker | On API request |
| `aftercare-batch` | aftercare (cron via BullMQ scheduler) | aftercare module | Daily 02:00 JST |
| `migration-import` | migration CLI | migration worker | On manual trigger |

### 6.3 Retry & DLQ
- Default: 3 attempts with exponential backoff (1m, 5m, 30m)
- After max attempts → DLQ (Dead Letter Queue), alert ops
- DLQ inspection UI: Bull Board (admin-only mounted at `/admin/queues`)

### 6.4 Job idempotency
- All jobs designed idempotent (job ID = business idempotency key when possible)
- Replay-safe (e.g., email-send checks `notification.status` before sending)

### 6.5 Worker deployment
- **Phase 1**: workers run on same ECS task as API (concurrent processors)
- **Phase 2+**: split to dedicated ECS service if load grows
- PDF generation always on separate worker (Puppeteer heavy)

---

## 7. Real-time (Phase 2)

Per ADR-008: Socket.IO + @socket.io/redis-adapter.

### 7.1 Gateway pattern
```typescript
@WebSocketGateway({ namespace: '/project' })
export class ProjectGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    const user = await this.authService.verifySocketToken(client.handshake.auth.token);
    if (!user) return client.disconnect();
    client.data.user = user;
  }

  @SubscribeMessage('project:join')
  async onJoin(@MessageBody() projectId: string, @ConnectedSocket() client: Socket) {
    if (!(await this.canAccess(client.data.user, projectId))) return;
    client.join(`project:${projectId}`);
  }
}
```

### 7.2 Broadcast pattern
- Service emits via `server.to('project:abc').emit('schedule:updated', payload)`
- Cross-instance: Redis adapter propagates

### 7.3 Authentication
- JWT in handshake `auth` payload
- Token re-verification on each `subscribe` (cheap; verifies expiry)

---

## 8. PDF generation

### 8.1 Pattern
- API endpoint enqueues `pdf-generate` job → returns 202 Accepted with job ID
- Frontend polls or subscribes to WS for completion
- Worker renders HTML template (Handlebars) via Puppeteer → uploads to S3 → updates DB record
- Returns signed URL on completion

### 8.2 Templates
- Location: `src/templates/pdf/`
- 見積書: `quote.hbs` with company seal, logo, line items
- 検査帳票: `inspection.hbs` with before/after photos (Phase 2)
- Templates support i18n via Handlebars helpers

### 8.3 Performance
- Concurrent rendering capped (4 per worker, configurable)
- Page pooling within worker (reuse Chromium for multiple renders)
- Memory monitoring; restart worker if heap > 1.5GB

---

## 9. Configuration management

### 9.1 Type-safe config
```typescript
// src/config/config.schema.ts
const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  AWS_REGION: z.string().default('ap-northeast-1'),
  S3_BUCKET: z.string(),
  SES_FROM_ADDRESS: z.string().email(),
  // ... etc
});

@Injectable()
export class AppConfig {
  constructor() { this.config = ConfigSchema.parse(process.env); }
  get<K extends keyof Config>(key: K): Config[K] { return this.config[key]; }
}
```

### 9.2 Secrets
- Loaded from AWS Secrets Manager at app startup (cached in memory)
- Rotation: app restart picks up new values
- No secrets in env files committed

### 9.3 Feature flags (lightweight)
- Use DB-backed feature flag table OR env vars for binary flags
- E.g., `FEATURE_AI_ENABLED=false` for Phase 1

---

## 10. Testing strategy

### 10.1 Unit (Jest)
- Pure functions, domain logic, service methods (with mocked repos)
- Target 80% coverage for services and domain

### 10.2 Integration (Jest + Test DB)
- Test against real PostgreSQL (testcontainers or local docker)
- Each test transaction-wrapped + rolled back
- Covers repository + service + DB constraint behavior

### 10.3 E2E (Jest + Supertest)
- Spin up full NestJS app
- Test API endpoints with realistic flow
- Smoke set runs on every PR

### 10.4 Contract tests (Phase 2+)
- OpenAPI spec generated from NestJS
- FE generates client from spec; mismatch = build break

---

## 11. Observability

### 11.1 Logs (CloudWatch)
- All to stdout in JSON
- Retention: 30 days hot; archive to S3 indefinite
- Log levels: error (always), warn, info (default), debug (dev only)

### 11.2 Metrics (CloudWatch)
- Request rate, latency p50/p95/p99 per endpoint
- DB query latency
- Queue depth per BullMQ queue
- Custom business metrics (active users, MAU, ...)

### 11.3 Alerts (PagerDuty / OpsGenie)
- Error rate > 1% over 5 min
- p95 latency > 2s over 5 min
- DB connections > 80% max
- Queue depth growing > expected
- DR drill failure
- Subscription expiry warnings (SES, ACM cert)

### 11.4 Health checks
- `/health` (liveness): always returns 200 if process alive
- `/health/ready` (readiness): checks DB + Redis + critical deps
- ALB target group uses readiness
- Graceful shutdown: drain ALB → wait for in-flight → close WS rooms → exit

---

## 12. Performance targets (per doc §4.1)

| Endpoint type | p95 target |
|---|---|
| Read single entity | < 200ms |
| List with filter (paginated) | < 500ms |
| Create / update (single transaction) | < 500ms |
| Complex search (PG FTS) | < 1s |
| PDF generation (async return) | API: < 200ms; rendering: < 30s |
| Page render | < 2s (FE responsibility) |

---

## 13. Related documents

- [01 — System Architecture](./01-system-architecture.md)
- [02 — Module Architecture](./02-module-architecture.md)
- [04 — Database Design](./04-database-design.md)
- [06 — Security Architecture](./06-security-architecture.md)
- [07 — Deployment Architecture](./07-deployment-architecture.md)
- ADR-002 (NestJS), ADR-008 (WebSocket)
