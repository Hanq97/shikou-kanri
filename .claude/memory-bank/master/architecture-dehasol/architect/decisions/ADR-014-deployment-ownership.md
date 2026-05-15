# ADR-014: Deployment Ownership

## Status
**ACCEPTED** — 2026-05-15

## Context

Cần xác định: ai own AWS account, ai pay infra cost, ai operate.

Options affect:
- Contract structure
- Compliance / audit visibility
- Operational flexibility

## Options

### Option A: DEHA-managed (SaaS-style) — Chosen
- DEHA owns AWS account
- Towa pays monthly subscription (bundles infra + ops + support)

### Option B: Towa-owned, DEHA-operated
- Towa owns AWS account; pays AWS directly
- DEHA has cross-account IAM role to deploy & operate
- Service fee separate from infra cost

### Option C: On-premise / private cloud (Towa server room)
- Rejected (cloud-native architecture incompatible)

## Decision

**Option A — DEHA-managed SaaS-style**.

### Operational model

**DEHA responsibilities**:
- AWS account ownership, billing, compliance
- Production deployment (auto via CI/CD)
- 24/7 monitoring (alerting to DEHA on-call)
- Patching, security updates
- Backup operation + DR drills
- User support (per doc §4.4: helpdesk biz hours)

**Towa responsibilities**:
- User onboarding (system admin role for Towa staff)
- Business data accuracy
- Reporting incidents
- Approving feature changes

### Contract terms (must include)
- **Data ownership**: All Towa-generated data (customers, projects, photos, etc.) = Towa property
- **Data portability**: At contract termination, DEHA exports full data dump (DB dump + S3 manifest) within agreed window
- **SLA**: 99.5% biz hours, RTO/RPO per ADR-013
- **Data residency**: Tokyo region; data does not leave Japan
- **Subprocessor disclosure**: AWS as subprocessor (data processor) per APPI; DPA in place
- **Audit right**: Towa can request annual SOC2 / ISO27001 cert from AWS; DEHA provides infra audit log on request
- **Pricing**: Monthly subscription fee — includes infra cost + service margin; specify usage tier (50 users, etc.) and overage policy

### Multi-tenancy implication
- ADR-012 single-tenant: each customer (Towa) gets isolated deployment
- DEHA scales by adding tenant stacks (future)
- Each tenant = separate AWS sub-account (Organizations) recommended → billing & isolation clean

## Consequences

### Positive
- Single point of accountability (DEHA) for entire stack
- Towa doesn't need AWS expertise
- DEHA controls cost optimization, upgrades, security posture

### Negative
- DEHA carries infra cost risk (must price subscription to cover variability)
- If Towa wants to leave DEHA — data migration friction (mitigate with portability clause)
- DEHA must implement internal billing/tracking to attribute cost per tenant

### Operational dependencies
- DEHA needs internal team for: AWS account governance, security (IAM, MFA, GuardDuty), cost allocation per tenant
- Monitoring & alerting tools (CloudWatch + PagerDuty/OpsGenie)

## References

- Assessment Q4.3
- Domain KB §3 (APPI, regulatory)
- Related: ADR-005 (Cloud), ADR-013 (DR)
