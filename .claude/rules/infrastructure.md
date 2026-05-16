---
paths:
  - "docker-compose*.yml"
  - "Dockerfile*"
  - "*.Dockerfile"
  - ".github/**"
  - "infra/**"
  - "backend/prisma/**"
---
# Infrastructure Coding Conventions

## Stack (dev)
- **Container runtime**: Docker Desktop (Windows host) + Docker Compose v2
- **Dev infra** (`docker-compose.dev.yml`):
  - PostgreSQL 16 alpine (port 5432, with `pgvector` + `pg_trgm` extensions)
  - Redis 7 alpine (port 6379)
  - Mailhog (SMTP 1025 + UI 8025)
- **Local dev tooling**: pnpm 10.33.2 workspaces, Node.js ≥ 20

## Production targets (Phase 1+)
- Managed PostgreSQL 16 (RDS / Cloud SQL) — `prisma migrate deploy`
- Redis Cloud / Elasticache (Phase 2 for queue + cache)
- AWS SES (or equivalent) for transactional email
- Container deployment: Docker images built per-app; orchestrator TBD (Phase 2)

## Docker Compose dev
- Single file: `docker-compose.dev.yml` (root)
- Service names prefixed `shikou-kanri-` for clarity
- Use named volumes for postgres data (`shikou-kanri-postgres-data`); never bind-mount DB data
- All services in default network; expose ports to host only for dev (NOT in prod compose)
- Healthchecks on postgres + redis required (other services wait on `condition: service_healthy`)
- Env via host shell or `.env` (gitignored). Use `${VAR:-default}` for safe fallbacks

## Dockerfiles (when added)
- Multi-stage: `deps → build → runtime`
- Use `node:22-alpine` base for runtime; `node:22` for build (faster yarn/npm install)
- `WORKDIR /app`, copy `package.json` + `pnpm-lock.yaml` first → `pnpm install --frozen-lockfile` → then COPY source (cache layers)
- Final stage runs as non-root user (`USER node`)
- Healthcheck via `HEALTHCHECK` directive
- `.dockerignore` MUST exclude: `node_modules`, `.env*`, `dist`, `.git`, `documents`, `*.md` (except needed)

## Prisma migrations
- Source: `backend/prisma/schema.prisma`
- Local dev: `pnpm --filter backend prisma:migrate:dev --name <descriptive_name>`
- Migrations committed to `backend/prisma/migrations/` — **never edit applied migration files**
- Production deploy: `pnpm --filter backend prisma:migrate:deploy` (in release pipeline, runs before app starts)
- Schema changes that require backfill → split into 2 migrations:
  1. Add column nullable / new table
  2. Backfill via script (separate)
  3. Mark NOT NULL / drop old column

## GitHub Actions
- All workflows in `.github/workflows/*.yml`
- Naming: lowercase kebab (`ci.yml`, `release.yml`, `deploy-prod.yml`)
- Triggers: `pull_request` for develop/main, `push` for develop/main (no PR-only CI on feature branches)
- Use `concurrency.cancel-in-progress: true` to cancel stale runs on rapid pushes
- Pin actions to major version (`actions/checkout@v4`, not `@latest`); pin pnpm version explicitly
- `timeout-minutes` required on every job (15 default, 30 for build-heavy)
- Cache pnpm store via `actions/setup-node` `cache: pnpm`
- Don't store secrets in workflow files — use GitHub Secrets / Environments

## Environment variables
- `.env.example` at app root committed; `.env` gitignored
- Required vars validated on bootstrap (Zod schema in `backend/src/config/env.schema.ts`)
- Naming: `SCREAMING_SNAKE_CASE`, prefix by domain (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `SMTP_HOST`, `TWOFA_ENCRYPTION_KEY`)
- Frontend env: prefix `VITE_` for client-exposed; never expose secrets to FE
- Production secrets stored in secret manager (AWS Secrets Manager / GCP Secret Manager) — injected at runtime, not baked into image

## Security
- TLS terminates at load balancer / reverse proxy in prod
- DB connections use TLS in prod (`?sslmode=require` in `DATABASE_URL`)
- Argon2id memory cost ≥ 64MB, time cost ≥ 3, parallelism = 4
- Cookies in prod: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`
- CORS strict allowlist (no `*` in prod); credentials enabled only for known origins
- Rate limiting via `@nestjs/throttler` — different windows for `auth`, `general`, `read`

## DO NOT
- ❌ Commit `.env` or any file with real secrets
- ❌ Edit applied Prisma migration files
- ❌ Use `prisma db push` in production (dev convenience only)
- ❌ Bake secrets into Docker images
- ❌ Pin Docker images by `:latest` — use specific tag or digest
- ❌ Run containers as root in production images
- ❌ Skip healthchecks on dev compose services (causes flaky boot order)
