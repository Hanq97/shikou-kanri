---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.md"
  - "**/*.json"
---
# Project-wide Coding Conventions — 施工管理システム

Cross-cutting rules áp dụng cho TOÀN bộ source code (backend + frontend + infra + docs).
Stack-specific rules: xem `backend-nestjs.md`, `frontend-react.md`, `infrastructure.md`.

## Repository structure
```
shikou-kanri/
├── backend/                      # NestJS API
├── frontend/                     # React SPA
├── documents/
│   ├── architecture/             # System-wide architecture docs (00-09)
│   └── features/F<n>-<slug>/     # Per-feature SRS / BD / DD / API contracts
├── .claude/
│   ├── CLAUDE.md                 # Claude Code project instructions
│   └── rules/                    # Path-scoped coding conventions (this folder)
├── infra/                        # Future: Dockerfiles, k8s manifests
├── .github/workflows/            # CI/CD
├── docker-compose.dev.yml        # Dev infrastructure (postgres + redis + mailhog)
├── package.json                  # pnpm workspaces root
└── pnpm-workspace.yaml
```

## Git workflow
- **Branches**:
  - `main` — production-ready, protected. Tagged releases only.
  - `develop` — integration branch, protected. CI must pass.
  - `feature/<feature-id>-<slug>` — new feature work (e.g., `feature/f8-auth`, `feature/f1-customer`)
  - `fix/<short-desc>` — bug fixes
  - `chore/<short-desc>` — infra, deps, refactor (e.g., `chore/ci-setup`)
- **Flow**: feature branch → PR → develop → (release) → main
- **Solo dev exception**: branch protection allows 0 approvals; required status checks via CI (when enabled)

## Commit messages — Conventional Commits
Format: `<type>(<scope>): <description>`

| Type | Use case |
|---|---|
| `feat` | New feature or user-facing capability |
| `fix` | Bug fix |
| `chore` | Tooling, deps, repo housekeeping |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation only |
| `style` | Formatting only (prettier, whitespace) |
| `test` | Tests only |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |
| `build` | Build system / external deps |

**Scope** (optional): app name (`backend`, `frontend`, `infra`) or feature ID (`F8-auth`)

**Examples** (real from this repo):
- `feat(frontend): F8-auth P7 — auth flow UI (login, 2FA, password reset, invite)`
- `fix(frontend): redesign sidebar collapse button — floating pill on edge`
- `chore(ci): add GitHub Actions workflow for lint + typecheck + build`

**Body** (optional): use bullet list of WHAT changed, capitalize first word.

**Rules**:
- NEVER include AI attribution (`Co-Authored-By: Claude`, `🤖 Generated with...`) per project CLAUDE.md
- Description ≤ 80 chars on first line
- Use imperative mood ("add" not "added")
- Reference issue/PR if relevant: `(#42)` at end

## TypeScript (cả backend + frontend)
- **Strict mode mandatory**: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- **No `any`** in new code. Use `unknown` + type guards.
- Explicit return types on exported functions/methods (`async getUser(id: string): Promise<User>`)
- `interface` for object shapes published externally; `type` for unions/intersections/utility
- Prefer `readonly` for arrays/properties that shouldn't mutate
- Unused vars with `_` prefix are allowed (intentional unused: `_includeSensitive`, `(_e) => …`)

## Imports
- Order: external packages → absolute internal (`@/...` or `../../shared/...`) → relative (`./X`)
- No barrel `index.ts` re-exports — direct file imports for better tree-shaking
- `import type { … }` for type-only imports (required when `verbatimModuleSyntax: true`)
- One import statement per source — don't merge unrelated imports

## Naming
- Files:
  - TypeScript modules / utils / services: `kebab-case.ts` (`auth.service.ts`, `error-mapper.ts`)
  - React components / pages: `PascalCase.tsx` (`LoginPage.tsx`, `AuthLayout.tsx`)
  - Config: `kebab-case` or convention (`vite.config.ts`, `tsconfig.json`, `tailwind.config.js`)
- Classes / Components / Types: `PascalCase`
- Functions / methods / variables: `camelCase`
- Constants (module-level): `SCREAMING_SNAKE_CASE`
- Enums: `PascalCase` for type, members match domain (DB → `snake_case`, code → `SCREAMING_SNAKE_CASE`)
- Booleans: prefix `is/has/can/should` (`isLoading`, `hasRole`)

## Comments
- Default: **don't write comments**. Names should explain WHAT; comments explain WHY when non-obvious.
- Valid use cases:
  - Hidden constraint or invariant (`// must run before X because Y`)
  - Workaround with link to upstream bug
  - Subtle business rule that surprises readers
- NEVER:
  - Restate what the code does
  - Reference task/PR/issue (`// added for ticket X`)
  - Multi-paragraph docstrings on internal functions
  - `// TODO` without owner + date (use issue tracker instead)
- JSDoc only on exported public API of shared modules

## Error handling
- **Errors at boundaries**: validate user input + external API responses + env config
- **Trust internal code**: don't catch errors you can't handle meaningfully
- **Typed errors** in backend: subclass `AppError` with `code` (stable string) + `httpStatus`
- **FE error display**: backend `code` → `t('errorCodes.<CODE>')` via `error-mapper`. Never display raw network errors.
- **Never silently swallow**: re-throw, log, or wrap with context

## Security baseline
- Secrets ONLY via env vars; validated by Zod schema at bootstrap
- Never log: passwords, tokens, refresh tokens, 2FA secrets, encryption keys. Pino redaction is safety net but don't rely on it.
- Crypto:
  - Passwords: Argon2id (timeCost ≥ 3, memoryCost ≥ 64MB)
  - JWT: HS256 with secret ≥ 32 bytes
  - 2FA secrets: AES-256-GCM encrypted at rest
  - Tokens in cookies: SHA-256 hashed before DB storage
- Auth: HttpOnly + Secure + SameSite=Lax cookies, `__Host-` prefix in prod
- CORS: strict allowlist, no `*` in prod
- Rate limiting on all auth endpoints (login, 2FA, password reset)
- Always validate ownership in services: `if (resource.userId !== requester.id) throw AuthInsufficientPermissionError`

## Internationalization (frontend-only currently)
- Default language: `ja` (target client is 藤和建設, Nhật)
- Supported: `ja`, `en`, `vi`
- ALL user-facing strings via `t()` — no hardcoded Japanese/English/Vietnamese
- Backend error codes → translated in FE error-mapper, NOT in backend response

## Documentation
- Architecture docs: `documents/architecture/0X-name.md` (numbered, ordered)
- Feature docs: `documents/features/F<n>-<slug>/F<n>-<slug>-BASE-{srs,basic-design,frontend-detail-design,backend-detail-design,api-contracts}.md`
- ADRs (when needed): `documents/adr/ADR-XXX-title.md`
- All docs in Vietnamese with Japanese domain terms (顧客, 案件, 見積) + English technical terms (NestJS, React, JWT)
- Keep architecture docs in sync with code — if you change stack/pattern in code, update doc same PR

## CI requirements (per `.github/workflows/ci.yml`)
- Lint + typecheck + build MUST pass for both backend and frontend
- Backend lint: ESLint + Prettier (no auto-fix in CI — code must be pre-formatted)
- Frontend lint: ESLint (flat config) + Prettier (when configured)
- Local: `pnpm lint:fix` to auto-format before commit
- Tests not yet in CI gate (will add once specs exist)

## DO NOT (universal)
- ❌ Commit `.env` files or any file with real secrets
- ❌ Disable strict TypeScript with `@ts-ignore` (use `@ts-expect-error <reason>` if absolutely needed)
- ❌ Bypass linter with `eslint-disable` without inline reason comment
- ❌ Use AI attribution in commit messages
- ❌ Force-push to `develop` or `main`
- ❌ Skip pre-commit hooks (`--no-verify`) without explicit user approval
- ❌ Hardcode user-facing strings in frontend (use i18n)
- ❌ Edit applied Prisma migration files
- ❌ Mix unrelated changes in one commit — keep commits focused
