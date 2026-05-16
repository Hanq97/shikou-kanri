---
paths:
  - "backend/**/*.ts"
---
# Backend Coding Conventions — NestJS

## Stack
- **Runtime**: Node.js ≥ 20, NestJS 10, TypeScript strict
- **ORM**: Prisma 5 + PostgreSQL 16 (pgvector, pg_trgm)
- **Cache / queue (Phase 2+)**: Redis 7
- **Auth**: JWT HS256 + HttpOnly cookies, Argon2id, TOTP (otplib v12)
- **Validation**: class-validator + class-transformer on DTOs; Zod for env schema only
- **Logger**: Pino + field redaction (`password`, `token`, `secret`, `*.password`, `*.refreshToken`)
- **Email**: Nodemailer (SMTP / Mailhog dev → SES prod) + Handlebars templates
- **CLI**: nest-commander
- **Test**: Jest (unit) + Supertest (e2e)

## Module organization
- Feature-based modules under `backend/src/modules/` — one folder per feature (e.g., `modules/auth/`)
- Inside a module:
  ```
  modules/<feature>/
    controllers/       # @Controller — thin, no business logic
    services/          # @Injectable — orchestration + business rules
    internal/          # @Injectable — single-purpose helpers (TokenService, TotpService, …)
    repositories/      # Prisma data access — no business rules
    dto/               # Request/response DTOs with class-validator decorators
    domain/            # Pure types/interfaces — no decorators, no Nest deps
    decorators/        # @Public, @Roles, @CurrentUser, …
    guards/            # @Injectable() implements CanActivate
    strategies/        # Passport strategies
  ```
- Shared infrastructure → `backend/src/shared/`:
  - `database/` (Prisma service), `crypto/`, `http/`, `observability/`, `exceptions/`
- App composition: `backend/src/app.module.ts` imports feature modules; `main.ts` boots Nest + applies global pipes/filters

## Naming
- Files: `kebab-case.ts` (e.g., `account-lockout.service.ts`)
- Classes: `PascalCase` with suffix matching role: `AuthService`, `UserRepository`, `LoginDto`, `JwtAuthGuard`, `RolesGuard`, `CurrentUserDecorator`
- Methods on services: `verb-noun` (`createUser`, `validateCredentials`, `revokeAllForUser`)
- Constants: `SCREAMING_SNAKE_CASE` (module-level only)
- Enums: `PascalCase` for type, `SCREAMING_SNAKE_CASE` for members (or match Prisma schema)
- Domain types matching DB: mirror Prisma model names (`UserRole`, `UserStatus`)

## TypeScript strict
- **No `any`** in production code. Use `unknown` + narrowing instead. (`@typescript-eslint/no-explicit-any` is currently `off` for migration but treat new code as if it's `error`.)
- Explicit return types on public methods of services/controllers — `async login(): Promise<TokenPair>`
- Prefer `interface` for public DTOs/shapes, `type` for unions/intersections
- Unused variables/parameters with `_` prefix are allowed (`_includeSensitive`, `_e`)
- **Never** disable type-check with `@ts-ignore`; use `@ts-expect-error <reason>` if absolutely required

## Controllers (thin)
- ONE responsibility: extract DTO → call service → shape response. **No business logic.**
- Use `@UseGuards(JwtAuthGuard, RolesGuard)` at class level; mark public routes with `@Public()`
- Validation via `@Body() dto: SomeDto` (global `ValidationPipe` enforces class-validator)
- Always pass `RequestContext` (traceId, ipAddress, userAgent) to services — build via `buildCtx(req)`

## Services (business logic)
- One service = one bounded concern. Big services (>500 lines) → split into orchestrator + internal helpers
- Domain errors → throw typed errors from `shared/exceptions/auth-errors.ts` (`AuthInvalidCredentialsError`, `AuthLastAdminError`, …) — global filter maps to HTTP
- For audit-relevant ops, call `audit.log<EventName>()` after the state mutation (in same transaction when possible)
- Never `throw new HttpException(...)` in services — use typed `AppError` subclasses

## Repositories (data access)
- Wrap Prisma calls; NO business rules
- Methods return Prisma models (`User`, `RefreshToken`, …) or `null` — let services map to DTOs
- Soft-deleted records are filtered by default (`deletedAt IS NULL`); add explicit `includeDeleted` flag when needed

## DTOs
- One DTO per request shape (`LoginDto`, `ChangeRoleDto`, …); validation via `class-validator`
  ```ts
  @IsEmail() email: string;
  @IsString() @Length(8, 256) password: string;
  ```
- Response DTOs are TS interfaces (no decorators) — kept in `domain/types.ts` or service file
- Never reuse Prisma models as response DTOs — explicit mapping in service

## Security
- Password hashing: `Argon2id` only (`Argon2Service`). Never bcrypt, never plaintext.
- Generic error for unknown email at login (use dummy hash for timing-safety) → `AuthInvalidCredentialsError`
- Refresh tokens: SHA-256 hash in DB, plaintext in HttpOnly cookie, family lineage tracking, reuse detection → revoke entire family
- 2FA secrets: AES-256-GCM encrypted at rest (`AesService` + `TWOFA_ENCRYPTION_KEY` env)
- Never log sensitive fields — Pino redaction is the safety net but don't log them on purpose
- Always validate `userId` ownership in service before mutation (`if (id !== requester.id && requester.role !== 'system_admin') throw AuthInsufficientPermissionError`)

## Prisma
- Schema source of truth: `backend/prisma/schema.prisma`
- After schema change: `pnpm prisma:generate` (committed to repo) + `pnpm prisma:migrate:dev --name <descriptive>` (committed under `prisma/migrations/`)
- Production: `pnpm prisma:migrate:deploy` (never `dev`)
- Use `$transaction` for multi-table writes; pass `tx` client to repositories
- Indexes on FK + frequent filter columns; document via `@@index` in schema

## Error handling
- Throw typed errors from `shared/exceptions/`. Each carries:
  - `code: string` — stable ID for FE error-mapper (`AUTH_INVALID_CREDENTIALS`)
  - `httpStatus: number`
  - `message: string` — fallback, but FE maps via code
- `GlobalExceptionFilter` formats response as `{ code, message, traceId }`
- For unexpected errors, log full stack via Pino at `error` level + return `INTERNAL_ERROR` to client

## Logging
- `Logger` from `@nestjs/common` for request-scope logs; injected via `Inject(WINSTON_MODULE_PROVIDER)` only if specific need
- Log levels: `error` (caught exceptions), `warn` (auth failures, suspicious activity), `info` (state transitions, business events), `debug` (dev only)
- Include `traceId` in every log line via `req.traceId` (set by `TraceMiddleware`)

## Env config
- All env access through `AppConfigService` (typed). NEVER `process.env.X` outside `config/`
- New env var: add to `config/env.schema.ts` Zod schema + `.env.example`
- Validate on bootstrap — fail fast if missing in production

## Testing
- Unit: `*.spec.ts` next to source file. Mock external deps (Prisma, HTTP, etc.)
- E2E: `test/*.e2e-spec.ts` + Supertest, against real DB (test schema)
- Run on CI; no `it.skip` / `xit` in committed code

## Imports
- Order: external (`@nestjs/...`, `axios`) → internal absolute (`../../../shared/...`) → relative (`./types`)
- Use relative imports within same module/folder
- No barrel `index.ts` re-exports — direct file imports (better tree-shaking + clearer)

## DO NOT
- ❌ Business logic in controllers
- ❌ Throw `HttpException` from services — throw `AppError` subclass instead
- ❌ Use `any` in new code
- ❌ `process.env.X` outside config layer
- ❌ Catch and silently swallow errors — log or re-throw
- ❌ Use Prisma model as response DTO directly
- ❌ Skip `@UseGuards` on authenticated endpoints
