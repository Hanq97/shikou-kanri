# ADR-012: Tenancy Model

## Status
**ACCEPTED** — 2026-05-15

## Context

System được build cho 1 khách hàng cụ thể (Towa). Doc không nói multi-tenant. Quyết định ảnh hưởng:
- DB schema design
- Auth/permission code complexity
- Future commercialization potential

## Options

### Option A: Single-tenant — Chosen
- 1 deployment / 1 DB / 1 instance set cho Towa
- Future commercialization: fork code or refactor (2-3 sprint)

### Option B: Logical multi-tenant ready
- DB schema có `tenant_id` everywhere, deploy 1 tenant
- +5-10% code overhead Phase 1
- Future: just provision new tenant, no refactor

### Option C: Full multi-tenant SaaS
- Tenant onboarding flow, billing, isolation, plans
- +20-30% effort

## Decision

**Option A — Single-tenant deployment cho Towa**.

### Implementation rules
- DB schema: NO `tenant_id` column anywhere
- Auth: user identity within Towa only; no tenant context
- Customer data, project data: implicit Towa-owned
- Branding/config: hardcoded Towa-specific where relevant (logo, company info on PDF templates) — pull from config file or DB `company_settings` table (1 row)

### Soft-multi-tenant escape hatch
- All resources tagged `tenant=towa` in AWS (CloudFormation/Terraform parameter) → ready for second tenant by parameterizing stack
- API endpoints không hardcode `/towa/` prefix — domain-based separation if future need

### Future commercialization path
- If second tenant emerges: 
  - Option 1: Provision new dedicated stack (separate AWS infra; same code; ~1 day infra deploy)
  - Option 2: Refactor to add `tenant_id` everywhere (~2-3 sprint; do once)
- DEHA chiến lược không yêu cầu multi-tenant ngay → defer

## Consequences

### Positive
- Simpler code, faster Phase 1 delivery
- No tenant isolation testing complexity
- Auth simpler (no cross-tenant leakage risk)

### Negative
- If business expands → refactor cost (manageable)
- Cannot offer SaaS trial cho prospect khác (cần manual instance)

### Trade-off accepted by user
- DEHA chấp nhận limit này; commercialization future = decision tách riêng

## References

- Assessment Q4.1
- Related: ADR-005 (Cloud), ADR-013 (DR)
