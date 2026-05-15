---
id: tps-java-reactive-multitenant
stack: java-reactive
type: multitenant
category: test-plan
subcategory: reactive
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E15]
---

# Multi-Tenant Test Patterns for Java Reactive
# Java Reactiveのマルチテナントテストパターン

## SECTION 1: PATTERNS

### Tenant Context Testing
- `TenantContextHolder.setTenantId(tenantId)` — set tenant before test
- `contextWrite(ctx -> ctx.put(TENANT_KEY, tenantId))` — reactor context propagation
- `Mono.deferContextual(ctx -> ...)` — read tenant from reactive context
- `StepVerifier.create(flux.contextWrite(...))` — verify with tenant context

### Tenant Isolation Testing
- Separate test data per tenant (tenant-A, tenant-B)
- Verify tenant-A cannot access tenant-B data
- Verify cross-tenant queries return empty/forbidden
- `@ParameterizedTest` with multiple tenant IDs

### R2DBC Tenant Filter Testing
- `R2dbcEntityTemplate` with tenant-scoped queries
- Verify `WHERE tenant_id = ?` applied automatically
- Test tenant filter bypass for admin operations
- `@DynamicPropertySource` for tenant-aware datasource

### Tenant-Aware Cache Testing
- Cache key pattern: `{tenantId}:{entityType}:{entityId}`
- Verify cache isolation between tenants
- Verify cache invalidation per tenant
- `ReactiveRedisTemplate` with tenant-prefixed keys

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Tenant context propagation | contextWrite + StepVerifier | Reactive context is the standard |
| Tenant data isolation | Parameterized + separate data | Proves isolation per tenant |
| Tenant filter in R2DBC | R2dbcEntityTemplate assertions | Verifies automatic filtering |
| Cross-tenant access denial | Forbidden/empty result check | Security requirement |
| Tenant-aware caching | Redis key prefix assertions | Cache must be tenant-scoped |
| Admin bypass filter | Separate admin context test | Admin can cross tenants |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `test_{method}_{tenantScenario}_{expectedOutcome}`
- Example: `test_findCustomers_asTenantA_returnsOnlyTenantAData`

### Assertion Requirements
- Minimum 2 assertions per tenant test
- Must verify: tenant isolation + correct data returned
- Cross-tenant tests must verify denial (empty or 403)

### Coverage Targets
- Every tenant-scoped repository method has isolation test
- At least 2 tenants per parameterized test
- Admin bypass tested separately from tenant-scoped access
