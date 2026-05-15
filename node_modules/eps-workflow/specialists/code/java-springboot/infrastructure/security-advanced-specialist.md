# Security Advanced Specialist — Generic
# セキュリティ上級スペシャリスト — 汎用
# Chuyên Gia Bảo Mật Nâng Cao — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 89.1–89.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*SecurityConfig.java`, `*Filter.java` |
| **Base Class** | N/A |
| **Imports From** | Application |
| **Cannot Import** | Domain |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
OWASP Top 10 beyond basics, secrets management, CORS, API key auth, security headers, input sanitization, and rate limiting.

## Patterns

### Pattern 89.1: OWASP A04–A10 Coverage
| OWASP | Threat | Spring Boot Mitigation |
|-------|--------|----------------------|
| **A04** Insecure Design | Missing threat modeling | Security review in design phase; `@PreAuthorize` default deny |
| **A05** Security Misconfiguration | Debug enabled in prod | `spring.devtools` exclude from prod; actuator endpoints restricted |
| **A06** Vulnerable Components | Known CVEs in deps | `dependency-check-maven` in CI; fail build at CVSS ≥7 |
| **A07** Auth Failures | Brute force, weak passwords | Account lockout; BCrypt strength ≥12; rate limit login |
| **A08** Integrity Failures | Unsigned updates, untrusted CI | Verify dependency checksums; sign artifacts |
| **A09** Logging Failures | No security event logs | Log auth success/failure, access denial; NEVER log passwords/tokens |
| **A10** SSRF | Server-side URL fetch exploit | Allowlist outbound URLs; validate/sanitize user-provided URLs |

### Pattern 89.2: Secrets Management
```yaml
# ✅ Environment variables (12-factor)
spring.datasource.password: ${DB_PASSWORD}

# ✅ Spring Cloud Vault
spring.cloud.vault:
  uri: https://vault.internal:8200
  authentication: kubernetes
  kv.backend: secret
```
- NEVER hardcode secrets in source code or YAML files
- `.env` files: add to `.gitignore` immediately
- Kubernetes: mount secrets as volumes, not env vars (more secure)
- Rotate secrets regularly; detect secrets in code with `gitleaks` or `trufflehog`

### Pattern 89.3: CORS Configuration
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://app.example.com")); // specific origins
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true); // only with specific origins, NEVER with "*"
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```
- NEVER `allowedOrigins("*")` with `allowCredentials(true)` — browser blocks it
- CORS is browser enforcement — does NOT protect server-to-server calls

### Pattern 89.4: API Key Authentication
```java
@Component
public class ApiKeyFilter extends OncePerRequestFilter {
    @Value("${security.api-keys}")
    private Set<String> validKeys;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp,
                                     FilterChain chain) throws ServletException, IOException {
        String apiKey = req.getHeader("X-API-Key");
        if (apiKey == null || !validKeys.contains(apiKey)) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"error\":\"Invalid API key\"}");
            return;
        }
        chain.doFilter(req, resp);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/external/");
    }
}
```

### Pattern 89.5: Security Headers
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .headers(h -> h
            .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
            .frameOptions(fo -> fo.deny())
            .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000).includeSubDomains(true))
        )
        .build();
}
```
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing (Spring default)
- `X-Frame-Options: DENY` — prevents clickjacking
- `Strict-Transport-Security` — enforces HTTPS
- `Content-Security-Policy` — prevents XSS via inline scripts

### Pattern 89.6: Input Sanitization
```java
// Beyond Bean Validation — prevent stored XSS
import org.owasp.encoder.Encode;

public String sanitizeHtml(String input) {
    return Encode.forHtml(input); // escapes <, >, &, ", '
}

// In service layer before persistence
public void createComment(CreateCommentRequest req) {
    String safeContent = Encode.forHtml(req.content());
    commentRepository.save(new Comment(safeContent));
}
```
- Bean Validation (`@NotBlank`, `@Size`) validates FORMAT
- OWASP Encoder sanitizes CONTENT (prevent XSS)
- Dependency: `org.owasp.encoder:encoder`

### Pattern 89.7: Rate Limiting with Bucket4j
```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp,
                                     FilterChain chain) throws ServletException, IOException {
        String clientId = req.getRemoteAddr();
        Bucket bucket = buckets.computeIfAbsent(clientId, k ->
            Bucket.builder().addLimit(Bandwidth.simple(100, Duration.ofMinutes(1))).build());

        if (bucket.tryConsume(1)) {
            chain.doFilter(req, resp);
        } else {
            resp.setStatus(429);
            resp.setHeader("Retry-After", "60");
            resp.getWriter().write("{\"error\":\"Rate limit exceeded\"}");
        }
    }
}
```
- Redis-backed `ProxyManager` for distributed rate limiting
- Per-endpoint or per-user limits via different bucket configurations

## REJECTED Patterns
- ❌ `allowedOrigins("*")` with credentials
- ❌ Hardcoded API keys, passwords, tokens in source code
- ❌ Logging passwords, JWT tokens, or PII
- ❌ `String.format()` for SQL — use parameterized queries only
- ❌ `ObjectInputStream.readObject()` from untrusted input
- ❌ MD5, SHA1, SHA256-without-salt for passwords — use BCrypt/Argon2

## Related Specialists
- `security/java-security-specialist.md` — Keycloak + project security chain (21.x)
- `security/oauth2-specialist.md` — Multi-provider OAuth2 (39.x)
- `patterns/resilience-specialist.md` — Circuit breaker patterns (40.x)
