---
id: tps-java-reactive-security
stack: java-reactive
type: security
category: test-plan
subcategory: reactive
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E10]
---

# Security Test Patterns for Java Reactive
# Java Reactiveのセキュリティテストパターン

## SECTION 1: PATTERNS

### Authentication Testing
- `@WithMockUser(roles = "USER")` — mock authenticated user
- `@WithMockUser(username = "admin", roles = "ADMIN")` — mock admin
- `SecurityMockServerConfigurers.mockJwt()` — mock JWT token
- `mutateWith(mockOpaqueToken())` — mock opaque token

### Authorization Testing
- `webTestClient.mutateWith(mockUser().roles("ADMIN"))` — per-request role
- Test each endpoint with: authenticated, unauthenticated, wrong role
- Verify 401 for missing token, 403 for insufficient role
- `@PreAuthorize("hasRole('ADMIN')")` — method-level security

### Keycloak JWT Mock
- `SecurityMockServerConfigurers.mockJwt().jwt(jwt -> ...)` — custom claims
- Add tenant claim: `.claim("tenant_id", "tenant-A")`
- Add roles: `.authorities(new SimpleGrantedAuthority("ROLE_USER"))`
- Test token expiry: `.notBefore(Instant.now().plusSeconds(3600))`

### SecurityContext in Reactive
- `ReactiveSecurityContextHolder.getContext()` — read from reactive chain
- `StepVerifier.create(service.method().contextWrite(securityContext))` — inject context
- `@EnableWebFluxSecurity` + `@EnableReactiveMethodSecurity` — full security config
- Test `ServerHttpSecurity` chain customizations

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Basic auth check | @WithMockUser + WebTestClient | Simple role-based test |
| JWT validation | mockJwt() with custom claims | Real JWT claim structure |
| Keycloak integration | Keycloak Testcontainer or mock JWT | Full OIDC flow |
| Method-level security | @PreAuthorize + StepVerifier | Service layer authorization |
| CORS testing | WebTestClient with Origin header | Browser security |
| CSRF for mutations | WebTestClient.mutateWith(csrf()) | Mutation protection |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `test_{endpoint}_{authScenario}_{expectedOutcome}`
- Example: `test_deleteUser_withUserRole_returnsForbidden`

### Assertion Requirements
- Minimum 2 assertions per security test
- Must verify: HTTP status + error body/message
- Auth tests must cover: valid, missing, invalid, expired, wrong-role

### Coverage Targets
- Every secured endpoint has at least 3 security tests (valid, 401, 403)
- Role hierarchy tested (USER < MANAGER < ADMIN)
- Token edge cases: expired, malformed, missing claims
