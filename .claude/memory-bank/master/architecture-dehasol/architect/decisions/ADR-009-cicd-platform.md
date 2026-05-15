# ADR-009: CI/CD Platform

## Status
**ACCEPTED** — 2026-05-15

## Context

Cần CI/CD cho:
- Lint + typecheck on PR
- Test (unit + integration)
- Build (NestJS + React)
- Deploy to AWS (ECS, S3 for FE)
- DB migration (Prisma)
- Security scan

## Options

### Option A: GitHub Actions — Chosen
- **Pros**: Default standard; marketplace rich; minute billing; deep GitHub integration
- **Cons**: Minute usage cost trên large repo; LFS cost separate

### Option B: Azure DevOps Pipelines
- **Pros**: Free unlimited minutes cho public repo + parallel jobs cho enterprise
- **Cons**: Cross-cloud (we chose AWS) → extra integration; YAML khác GitHub

### Option C: GitLab CI
- **Pros**: Self-host option; integrated DevOps platform
- **Cons**: Overkill; team không cần GitLab features

## Decision

**Option A — GitHub Actions** với GitHub-hosted runners (start), self-hosted runner option future nếu cost surge.

### Workflows

```
.github/workflows/
  pr-check.yml         # On PR: lint + typecheck + unit test
  ci.yml               # On main push: full test + build artifacts
  deploy-staging.yml   # On main push: deploy to staging ECS
  deploy-prod.yml      # Manual trigger / tag: deploy to prod ECS
  db-migrate.yml       # Manual: Prisma migration deploy
  security-scan.yml    # Weekly: npm audit, Snyk, secrets scan
```

### Quality gates (PR check)
1. ESLint (with eslint-plugin-boundaries enforcing ADR-001 module rules)
2. TypeScript `tsc --noEmit`
3. Unit tests (Jest) with coverage threshold (start 70%, raise over time)
4. Build success
5. (Optional Phase 1) E2E smoke test on PR — Cypress or Playwright

### Deployment strategy
- **Staging**: auto-deploy on merge to `main`
- **Prod**: manual approval gate (GitHub environment protection rules)
- **Strategy**: ECS rolling deploy với min healthy 50% → zero-downtime
- **Rollback**: ECS task definition revert

### Secrets management
- GitHub Encrypted Secrets cho deployment credentials (OIDC to AWS IAM — preferred over long-lived keys)
- AWS Secrets Manager cho app secrets (DB password, API keys)

### Artifact registry
- Container images: AWS ECR (private repo)
- FE build artifacts: S3 + CloudFront (no Docker for FE)

## Consequences

### Positive
- Standard tooling, easy onboarding new dev
- OIDC auth removes long-lived AWS keys risk
- GitHub Environments for prod approval enforces governance

### Negative
- Self-hosted runner option may become needed if test minutes exceed plan
- Cross-team if Towa wants visibility — give them GitHub team access or surface in dashboard

### Cost
- GitHub Team plan: $4/user/month × ~10 users = ~$40/m
- Actions minutes: estimated <2000/m for project size → free tier sufficient initially

## References

- Doc §4.5, §5.2
- Assessment Q1.4
