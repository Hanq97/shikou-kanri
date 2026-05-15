# Shikou-Kanri — 藤和建設様 施工管理システム

Construction Management System (施工管理システム) for 藤和建設株式会社 (Towa Construction).
Built by **DEHA Solutions**.

> 📚 **Architecture documents**: see [`documents/architecture/`](./documents/architecture/) — start with [00-overview.md](./documents/architecture/00-overview.md).

---

## 🏗️ Tech stack

| Layer | Tech | ADR |
|---|---|---|
| Backend | NestJS 10 + Node.js 20 + TypeScript strict + Prisma | [ADR-002](./documents/architecture/) |
| Frontend | React 18 + Vite 5 + TypeScript + Ant Design 5 | ADR-003 |
| Database | PostgreSQL 16 + pg_trgm + pgvector (Phase 3) | ADR-004 |
| Cloud (Phase 1) | AWS Tokyo (ap-northeast-1) | ADR-005 |
| Real-time (Phase 2) | Socket.IO + Redis adapter | ADR-008 |
| CI/CD | GitHub Actions + AWS ECR | ADR-009 |

See `documents/architecture/00-overview.md` for full decision summary.

---

## 📁 Repository structure

```
shikou-kanri/
├── backend/                         # NestJS API + Prisma
├── frontend/                        # React + Vite SPA
├── shared/                          # Shared TypeScript types (future)
├── infra/                           # Terraform / CDK (future)
├── scripts/
│   └── db/init/                     # PostgreSQL init scripts (extensions)
├── documents/
│   └── architecture/                # Architecture docs (9 files)
├── .claude/memory-bank/             # EPS Framework context (auto-managed)
├── docker-compose.dev.yml           # Local dev: Postgres + Redis + Mailhog
├── pnpm-workspace.yaml              # pnpm workspaces config
├── package.json                     # Root: scripts + workspaces
└── README.md                        # This file
```

---

## 🚀 Quick start (local dev)

### Prerequisites
- **Node.js**: >= 20 LTS (current: v24+ OK)
- **pnpm**: >= 10
- **Docker Desktop**: with Compose v2+
- **Git**

### Setup

```bash
# 1. Install dependencies (root + workspaces)
pnpm install

# 2. Start local services (PG + Redis + Mailhog)
pnpm docker:up

# 3. Setup backend env
cp backend/.env.example backend/.env
# Edit backend/.env: replace JWT/2FA secrets with strong random values

# 4. Run Prisma migrate (creates DB schema)
pnpm --filter backend run prisma:migrate:dev

# 5. Setup frontend env
cp frontend/.env.example frontend/.env.local

# 6. Start dev servers (concurrent: backend + frontend)
pnpm dev
```

Access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Mailhog UI**: http://localhost:8025 (email testing)
- **Postgres**: localhost:5432 (user: `shikou`, db: `shikou_kanri_dev`)
- **Redis**: localhost:6379

### Useful scripts

```bash
pnpm dev                # Start backend + frontend in parallel
pnpm dev:backend        # Backend only (watch mode)
pnpm dev:frontend       # Frontend only
pnpm build              # Build all packages
pnpm test               # Run all tests
pnpm lint               # Lint all packages
pnpm typecheck          # TypeScript check all packages
pnpm docker:up          # Start dev services
pnpm docker:down        # Stop dev services
pnpm docker:logs        # Follow service logs

# Backend specific
pnpm --filter backend run prisma:studio    # GUI for DB
pnpm --filter backend run prisma:migrate:dev <name>
```

---

## 🛣️ Development roadmap

| Phase | Duration | Scope | Status |
|---|---|---|---|
| Sprint 0 | Setup | Project scaffold, dev environment | ✅ Done |
| Phase 1 (MVP) | 4 months | F8 auth + F1 customer + F2 quote + F6 aftercare | 🚧 In progress |
| Phase 2 | 4 months | F3 schedule + F4 chat + F5 inspection + Mobile PWA | ⏳ Planned |
| Phase 3 | 4 months | F7 dashboard + AI features (Bedrock) | ⏳ Planned |

See [`documents/architecture/08-mvp-scope-and-roadmap.md`](./documents/architecture/08-mvp-scope-and-roadmap.md) for full detail.

---

## 🌳 Branch strategy

```
master            (production releases)
  └── develop    (integration)
        ├── feature/f8-foundation-auth
        ├── feature/f1-customer-property
        └── ...
```

Branch protection rulesets active on `master` and `develop` (require PR + 1 approval, no force push, no deletion).

---

## 🤖 EPS Framework

This project uses **EPS Framework** for feature development workflow:

```
/research → /innovate → /design --srs → /design --basic → /design --detail
         → /plan → /execute → /validate
```

Architecture-level work already complete via `/architect`. See artifacts in `.claude/memory-bank/master/architecture-dehasol/`.

---

## 📋 Compliance

This system supports:
- 個人情報保護法 (APPI — Japan Personal Information Protection Act)
- 電子帳簿保存法 (Electronic Bookkeeping Law — quote/contract handling)
- 瑕疵担保責任 (Defect Liability — 10-year inspection records retention)

See `documents/architecture/06-security-architecture.md` § 8 for compliance details.

---

## 🔒 Security

Report security issues via private channel to DEHA Solutions security team.
**Do not** create public GitHub issues for security vulnerabilities.

---

*© 2026 DEHA Solutions for 藤和建設株式会社*
