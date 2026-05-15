# Module Catalog

**Source**: ADR-001 (Modular Monolith) + Feature Map module-to-feature mapping
**Convention**: NestJS modules; module boundary enforced by `eslint-plugin-boundaries` (CI rule)

---

## Module structure overview

```
src/
├── modules/
│   ├── auth/              # Phase 1
│   ├── audit/             # Phase 1
│   ├── backup/            # Phase 1
│   ├── customer/          # Phase 1
│   ├── project/           # Phase 1
│   ├── quote/             # Phase 1
│   ├── aftercare/         # Phase 1
│   ├── notification/      # Phase 1 (basic) → Phase 2/3 (extended)
│   ├── migration/         # Phase 1 (CLI)
│   ├── schedule/          # Phase 2
│   ├── photo/             # Phase 2
│   ├── drawing/           # Phase 2
│   ├── chat/              # Phase 2
│   ├── inspection/        # Phase 2
│   ├── dashboard/         # Phase 3
│   └── ai/                # Phase 3 (placeholder Phase 1)
└── shared/
    ├── database/          # Prisma client, base repository
    ├── storage/           # S3 client wrapper
    ├── queue/             # BullMQ adapter
    ├── crypto/            # bcrypt/argon2, encryption helpers
    ├── pdf/               # Puppeteer wrapper (PDF rendering)
    ├── http/              # Axios wrapper for outbound HTTP
    └── observability/     # Logging, tracing, metrics
```

---

## Per-Module Contract

### `auth` (Phase 1)
**Public API** (other modules can import):
- `AuthGuard`, `RolesGuard`, `ProjectMembershipGuard` (NestJS guards)
- Decorators: `@CurrentUser()`, `@Roles()`, `@ProjectMembership()`
- Service: `AuthService.hashPassword`, `AuthService.verifyToken`
- DTOs: `AuthenticatedUserDto`

**Internal**: password storage, JWT signing, refresh token rotation, 2FA TOTP, invite token gen.

**Cross-deps**: depends on `audit` (log auth events), `notification` (send invite email).

**Features served**: F8-01, F8-02, F4-03 (invite for 招待ユーザー).

**ADRs**: ADR-015, ADR-016.

---

### `audit` (Phase 1)
**Public API**:
- `AuditService.log(actor, action, entity, changes, ctx)` — main entry
- Decorator: `@Audit(action)` — auto-wrap controller actions

**Internal**: insert to `audit_logs`; batch buffer (optional); export to S3 (cold archive).

**Cross-deps**: none (intentionally low-coupling). Logged by all other modules.

**Features served**: F8-03.

---

### `backup` (Phase 1)
**Public API**:
- `BackupService.listSnapshots()`, `BackupService.requestRestore(snapshotId)` (admin-only)

**Internal**: AWS RDS snapshot enumeration, lifecycle policy management.

**Cross-deps**: AWS SDK only.

**Features served**: F8-04.

---

### `customer` (Phase 1)
**Public API**:
- `CustomerService.findById`, `CustomerService.search`, `CustomerService.list`
- DTOs: `CustomerDto`, `PropertyDto`
- Events emitted: `customer.created`, `property.handover_date_set`

**Internal**: 顧客/物件 CRUD, fuzzy search composition.

**Cross-deps**: `auth` (for permission), `audit`.

**Subscribers** (listen to events): `aftercare` listens to `property.handover_date_set`.

**Features served**: F1-01, F1-02, F1-04, F6-01, F6-03.

---

### `project` (Phase 1)
**Public API**:
- `ProjectService.findById`, `ProjectService.list`, `ProjectService.canAccess(userId, projectId)`
- DTOs: `ProjectDto`, `ProjectMemberDto`
- Events: `project.created`, `project.status_changed`

**Internal**: 案件 CRUD, status transition validation, folder auto-creation (F3-06).

**Cross-deps**: `customer`, `auth`, `audit`. Listened by: `aftercare`, `quote`, `schedule`, etc.

**Features served**: F1-03, F1-05, F1-06, F3-06.

---

### `quote` (Phase 1)
**Public API**:
- `QuoteService.create`, `QuoteService.clone`, `QuoteService.approve`, `QuoteService.export`
- DTOs: `QuoteDto`, `QuoteLineDto`, `UnitPriceDto`
- Events: `quote.created`, `quote.approved`, `quote.accepted`

**Internal**: 見積 CRUD, line item management, status transition, PDF generation (via `shared/pdf`), 単価マスタ CSV import, version snapshot (ADR-017).

**Cross-deps**: `project` (project must exist), `customer` (counter_party snapshot), `audit`, `shared/pdf`.

**Features served**: F2-01〜F2-05, F2-06 (Phase 3).

---

### `aftercare` (Phase 1)
**Public API**:
- `AftercareService.listScheduled(filter)`, `AftercareService.recordHandling`
- Events: `aftercare.notification_due`

**Internal**:
- Batch job (daily, via BullMQ Cron): scan `maintenance_schedules` where `pre_notify_date = today` → enqueue notifications
- Subscribe to `property.handover_date_set` → generate maintenance_schedules
- Record handling outcomes

**Cross-deps**: `customer` (event subscriber), `notification` (enqueue), `audit`.

**Features served**: F6-02, F6-03.

---

### `notification` (Phase 1 basic → Phase 2/3 extended)
**Public API**:
- `NotificationService.send(opts)` — main entry
- Adapters: `EmailAdapter` (Phase 1), `PushAdapter` (Phase 2), `LineAdapter`/`SmsAdapter` (Phase 3)

**Internal**: 
- Template rendering (Handlebars / mjml for email)
- Queue handling with retry
- Channel routing per user preference

**Cross-deps**: AWS SES, BullMQ.

**Features served**: F6-04 (Phase 1), F4-04 (Phase 2), F6-05 (Phase 3).

---

### `migration` (Phase 1 CLI)
**Public API**: NestJS CLI commands:
- `import:customers --csv <path> [--dry-run]`
- `validate:customers --csv <path>`

**Internal**: CSV parsing, validation rules, dedupe logic, batch insert.

**Cross-deps**: `customer` (uses public CRUD API), `audit`.

**Features served**: Migration tool (one-shot per ADR-018).

---

### `schedule` (Phase 2)
**Public API**:
- `ScheduleService.getProjectSchedule`, `ScheduleService.updateTask`
- WebSocket gateway: emits `schedule:updated` on changes
- DTOs: `ScheduleDto`, `TaskDto`

**Internal**: Gantt data model, task dependency validation, template-based generation (10+ templates per doc F3-01).

**Cross-deps**: `project`, `auth`, `audit`, `notification` (for reminders).

**Features served**: F3-01, F3-02.

---

### `photo` (Phase 2)
**Public API**:
- `PhotoService.create`, `PhotoService.list`, `PhotoService.signedUrl`

**Internal**: 
- Presigned S3 upload URL generation
- Metadata extraction (EXIF, GPS)
- 電子黒板 composition (Lambda triggered on S3 event)
- Thumbnail generation

**Cross-deps**: `project`, `shared/storage`, AWS Lambda.

**Features served**: F3-03, F3-04.

---

### `drawing` (Phase 2)
**Public API**:
- `DrawingService.upload`, `DrawingService.addMarker`, `DrawingService.listMarkers`

**Internal**: PDF/image upload, marker CRUD, before/after photo links.

**Cross-deps**: `project`, `photo` (link marker to photo), `shared/storage`.

**Features served**: F3-05.

---

### `chat` (Phase 2)
**Public API**:
- `ChatService.postMessage`, `ChatService.listMessages`
- WebSocket gateway: `chat:message:new`, `chat:typing`, `chat:read`

**Internal**: per-project chat room, mention parsing (@user), thread support, full-text search index.

**Cross-deps**: `project`, `auth`, `notification` (mentions trigger notification), `shared/storage` (attachments).

**Features served**: F4-01, F4-02, F4-05.

---

### `inspection` (Phase 2)
**Public API**:
- `InspectionService.create`, `InspectionService.recordResult`, `InspectionService.startCorrection`, `InspectionService.approveCorrection`, `InspectionService.exportPdf`

**Internal**: template management, 合否 recording, 是正 workflow state machine.

**Cross-deps**: `project`, `photo` (before/after refs), `audit`, `shared/pdf`.

**Features served**: F5-01, F5-02, F5-03.

---

### `dashboard` (Phase 1 basic tier → Phase 3 advanced tier)
**Public API**:
- **Phase 1 (basic tier)**:
  - `DashboardService.getHomeWidgets(userId)` — returns `{ statusCounts, aftercareAlerts, pendingApprovals, recentActivity, quickActions }`
- **Phase 3 (advanced tier)**:
  - `DashboardService.projectStats`, `DashboardService.revenueStats` (charts, drilldowns)
  - `DashboardService.aiForecast` (via `ai` module)

**Internal**:
- **Phase 1**: simple aggregate queries on `projects`, `quotes`, `maintenance_schedules`, `audit_logs`. Cached 60s in Redis. <500ms p95 target.
- **Phase 3**: read replica or materialized view if heavy; chart-friendly time-series queries.

**Cross-deps**:
- Phase 1: `project`, `quote`, `aftercare`, `audit`, `auth`.
- Phase 3: + `ai` module (forecast), strict role check for 売上 visibility (manager+).

**Features served**: 
- Phase 1: **BD-01 Home Dashboard (basic)**.
- Phase 3: F7-01 案件進捗ダッシュボード, F7-02 売上・粗利可視化.

**Note**: `BD-01` is not in doc 42 features list; added during architect Phase 4 (2026-05-15) as UX necessity for MVP home screen.

---

### `ai` (Phase 3 — placeholder Phase 1)
**Phase 1**: Empty module with `README.md` stating "Phase 3 implementation".
**Architecture test rule**: NO other module may import from `ai/` in Phase 1.

**Phase 3 Public API** (planned per ADR-021):
- `AIGateway.generate`, `AIGateway.chat`, `AIGateway.embed`, `AIGateway.ocrExtract`
- `VectorStore.upsert`, `VectorStore.similaritySearch`

**Internal**: thin abstraction over AWS Bedrock SDK, prompt management, cost tracking.

**Cross-deps** (Phase 3): `project` (read), `quote` (read), `shared/storage` (RAG corpus).

**Features served**: F2-06, F7-03, F7-04, F7-05, F7-06.

---

## Module dependency rules (enforced by eslint-plugin-boundaries)

```javascript
// .eslintrc.js (illustrative)
"boundaries/elements": [
  { type: "module", pattern: "src/modules/*" },
  { type: "shared", pattern: "src/shared/*" }
],
"boundaries/element-rules": [
  { from: "module", allow: ["shared", "module"], message: "Modules can only import shared or other modules' public API" }
],
// Each module's index.ts is the only allowed entry point from outside
```

**Conventions**:
- Module's public API exported via `src/modules/{name}/index.ts`
- Internal files in `src/modules/{name}/internal/`
- Cross-module: import from `'@/modules/customer'` (resolves to index.ts only)
- Direct file import from another module's internal/ is a lint error
- `shared/` can be imported by all modules
- `shared/` cannot import from modules

---

## Cross-cutting concerns

### Logging
- All modules use `shared/observability/logger` (Pino)
- Structured JSON logs with `traceId`, `userId`, `module`, `action`
- Output to stdout → CloudWatch Logs (ADR-005)

### Tracing
- OpenTelemetry SDK initialized in main.ts
- Auto-instrumentation for: HTTP, DB (Prisma), Redis, BullMQ
- Export to CloudWatch X-Ray or Datadog (TBD operationally)

### Metrics
- Custom metrics via `shared/observability/metrics`
- Counter / histogram / gauge primitives
- Export to CloudWatch metrics

### Error handling
- All modules throw typed errors (e.g., `NotFoundError`, `PermissionError`, `ValidationError`)
- Global exception filter maps to HTTP status
- 5xx errors logged with full stack; 4xx logged at info level
