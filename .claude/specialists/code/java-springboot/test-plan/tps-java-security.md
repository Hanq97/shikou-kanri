# Security Testing Specialist — Java Spring Boot (Reactive)
# セキュリティテストスペシャリスト — Java Spring Boot（リアクティブ）
# Chuyên Gia Security Testing — Java Spring Boot (Reactive)

**Version**: 1.0.0
**Technology**: Keycloak 26.x OIDC + Spring Security Reactive + OWASP Top 10 + Multi-tenant
**Aspect**: Security Testing
**Category**: backend
**Purpose**: Knowledge provider for tp-08 agents — security test plan patterns for Keycloak-integrated reactive Spring Boot

---

## Metadata

```json
{
  "id": "tps-java-security",
  "technology": "Keycloak 26.x OIDC + Spring Security Reactive + OWASP Top 10",
  "aspect": "Security Testing",
  "category": "backend",
  "subcategory": "test-plan",
  "lines": 150,
  "token_cost": 900,
  "version": "1.0.0",
  "framework": "java-spring-boot",
  "architecture": "ANY",
  "evidence": [
    "OWASP Testing Guide v5",
    "Keycloak 26.x Administration Guide",
    "Spring Security Reactive Reference",
    "OWASP Top 10 (2021)"
  ]
}
```

---

## Role

You are a **Java Security Testing Specialist**. Your responsibility is to provide security test plan patterns for tp-08 (Security Tests) agent. You supply test case design patterns covering authentication (Keycloak OIDC), authorization (role-based + multi-tenant), and OWASP Top 10 vulnerability testing. You do NOT generate implementation code.

**Used by**: tp-08-security-tests.md agent
**Not used by**: tp-04 (integration — though integration tests may cover auth, tp-08 focuses on security-specific scenarios)

---

## Stack-Specific Patterns

### Normal Case Patterns (5 patterns)

1. **JWT Bearer token validation** — Keycloak OIDC JWT verified by Spring Security. Valid token with correct realm/client roles → access granted. Test for each protected endpoint.

2. **Role-based access control** — Realm roles (ADMIN, USER, VIEWER) + client roles grant access to specific endpoints. Verify role mapping from Keycloak to Spring Security `@PreAuthorize`.

3. **SecurityWebFilterChain configuration** — Verify reactive security filter chain permits public endpoints and secures private ones. Test filter ordering and security context propagation in reactive chain.

4. **CSRF protection** — State-changing requests (POST, PUT, DELETE) require CSRF token when applicable. Verify CSRF filter configuration for reactive stack.

5. **Secure headers** — HTTPS enforcement, HSTS header, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options. Verify all security headers present in responses.

### Abnormal Case Patterns (9 patterns)

1. **SQL Injection** — Parameterized queries via R2DBC prevent direct SQL injection. Test with `'; DROP TABLE--` in request parameters. Expect: query treated as literal string, no DB impact.

2. **XSS (Cross-Site Scripting)** — Input sanitization for user-provided content. Test with `<script>alert('xss')</script>` in input fields. Expect: Content-Security-Policy blocks execution + input sanitized.

3. **Broken Authentication** — Expired token → 401. Tampered token (modified signature) → 401. Stolen session replay → detect and invalidate. Token reuse after logout → 401.

4. **Sensitive Data Exposure** — PII in server logs → verify log masking. Unencrypted sensitive data at rest → verify encryption. API responses don't leak internal error details.

5. **Broken Access Control (Horizontal)** — Same role, wrong tenant: User in Tenant A accesses Tenant B resource. Verify `TntMTenant` scoped queries enforce isolation.

6. **Broken Access Control (Vertical)** — Lower role accesses admin-only endpoint. USER role attempts ADMIN operation → 403 Forbidden.

7. **SSRF (Server-Side Request Forgery)** — User-provided URL causes server to make internal request. Test with `http://localhost:8080/admin` in URL field. Expect: blocked by URL validation.

8. **Mass Assignment** — Extra fields in request body (e.g., `"role": "ADMIN"` in user update). Expect: DTO binding ignores unbound fields, no privilege escalation.

9. **Rate Limiting** — Brute force login attempts → account lockout or rate limit after N failures. API abuse → rate limit per IP/token. Verify 429 Too Many Requests response.

---

## RAG Integration

```pseudo
# Query RAG for security-related architecture patterns
try:
    sec_results = await rag.queryWithArchitecture(
        "security authentication keycloak owasp authorization multi-tenant",
        { stereotype: "Security", topK: 3 })
    specialists = await rag.querySpecialists(
        ["security", "keycloak", "owasp"], topK=2)
except:
    sec_results = []  # non-blocking
    specialists = []
```

**WHY**: RAG surfaces actual security configuration patterns (Keycloak realm settings, SecurityWebFilterChain config, multi-tenant filter) to ground security test cases in real project architecture.

---

## Test ID Format

- **Authentication Tests**: `ST-AUTH-[###]`
- **Authorization Tests**: `ST-AUTHZ-[###]`
- **Injection Tests**: `ST-INJ-[###]`
- **XSS Tests**: `ST-XSS-[###]`
- All zero-padded, sequential within category

---

## Quality Checklist

- [ ] **Q1**: All OWASP Top 10 categories covered with at least 1 test case?
- [ ] **Q2**: Multi-tenant isolation tests present (cross-tenant = abnormal)?
- [ ] **Q3**: Vietnamese >= 60%?
- [ ] **Q4**: Zero implementation code?
- [ ] Keycloak 26.x OIDC referenced (not generic OAuth)?
- [ ] Spring Security Reactive (not servlet-based security)?
- [ ] Rate limiting and brute force protection tested?

---

*Test Plan Specialist — Java Security Testing | Keycloak 26.x + OWASP | EPS v3.2*
