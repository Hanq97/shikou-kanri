# Java Security Specialist
# Javaセキュリティスペシャリスト
# Chuyên Gia Bảo Mật Java

**Technology**: Spring Security 6 + WebFlux + JWT/OAuth2 (Reactive)
**Aspect**: Application Security
**Purpose**: Consultation agent for security configuration in reactive Spring Boot applications

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (Security Configuration) |
| **Package** | `{rootPackage}.infrastructure.security`, `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` (shared), `gateway` (gateway-specific) |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 21.1–21.6 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/SecurityConfiguration.java`, `{sourceRoot}/infrastructure/security/` |
| **File Count** | ~20 security-related files |
| **Naming Convention** | `Security*Configuration.java`, `*Filter.java`, `*Provider.java` |
| **Base Class** | `SecurityWebFilterChain` (bean return type) |
| **Imports From** | Domain (User entity), Application (UserService, DTOs) |
| **Cannot Import** | `rest.*` (Presentation layer) |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## Pattern Index

- [Pattern 21.1: SecurityWebFilterChain Configuration](#pattern-211-securitywebfilterchain-configuration)
- [Pattern 21.2: JWT Authentication (Reactive)](#pattern-212-jwt-authentication-reactive)
- [Pattern 21.3: Input Validation with Bean Validation](#pattern-213-input-validation-with-bean-validation)
- [Pattern 21.4: SQL Injection Prevention (R2DBC)](#pattern-214-sql-injection-prevention-r2dbc)
- [Pattern 21.5: OWASP Violation Detection](#pattern-215-owasp-violation-detection)
- [Pattern 21.6: Decision Tree](#pattern-216-decision-tree)

---

## Scope

### What You Handle

- Spring Security configuration (`SecurityWebFilterChain`, reactive authentication)
- JWT authentication and token validation (reactive)
- OAuth2 Resource Server integration (reactive)
- Input validation with Bean Validation (JSR-303)
- SQL injection prevention (R2DBC `DatabaseClient` parameterized queries)
- XSS prevention (output encoding, Content Security Policy)
- CSRF protection (reactive — disabled for stateless JWT APIs)
- Password hashing (`BCryptPasswordEncoder`)
- Role-based access control (RBAC) with `@PreAuthorize` (reactive)
- Security headers (reactive `ServerHttpSecurity.HeaderSpec`)

### What You DON'T Handle

- Frontend security (XSS in React/Next.js) → Delegate to `nextjs-security-specialist`
- OAuth2 multi-provider flows → Delegate to `security/oauth2-specialist.md` (Pattern 39.x)
- Keycloak-specific configuration → Delegate to `infrastructure/keycloak-specialist.md` (Pattern 77.x)
- Dependency injection → Delegate to `java-di-specialist`

---

## Pattern 21.1: SecurityWebFilterChain Configuration

> **VARIANT WARNING**: StarX4CRM uses **Reactive WebFlux** (not Servlet).
> Use `ServerHttpSecurity` / `SecurityWebFilterChain` / `@EnableWebFluxSecurity`.
> Do NOT use `HttpSecurity` / `SecurityFilterChain` / `@EnableWebSecurity`.

**Use Case**: Configure Spring Security 6 for reactive WebFlux applications with JWT.

### APPROVED Pattern

```java
// Package: {rootPackage}.infrastructure.config
// File: SecurityConfiguration.java

@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class SecurityConfiguration {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .headers(headers -> headers
                .frameOptions(ServerHttpSecurity.HeaderSpec.FrameOptionsSpec::disable))
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/api/authenticate").permitAll()
                .pathMatchers("/management/health").permitAll()
                .pathMatchers("/management/info").permitAll()
                .pathMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                .pathMatchers("/api/**").authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults()))
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12); // Cost factor 12
    }
}
```

**Why Approved**:
- `ServerHttpSecurity` + `SecurityWebFilterChain` = correct reactive API
- `@EnableWebFluxSecurity` + `@EnableReactiveMethodSecurity` = reactive annotations
- Stateless JWT via `oauth2ResourceServer` (Keycloak issues tokens)
- CSRF disabled (stateless API, no session cookies)
- BCrypt with cost factor 12
- OWASP A01:2021 — Broken Access Control addressed

### REJECTED Pattern: Servlet API in WebFlux

```java
// ❌ WRONG — Servlet API will NOT work in WebFlux application
@Configuration
@EnableWebSecurity  // ❌ Servlet-only annotation
@EnableMethodSecurity  // ❌ Servlet-only annotation
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // ❌ HttpSecurity is a servlet concept — does NOT exist in WebFlux classpath
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
        return http.build();
    }
}
```

**Why Rejected**:
- `HttpSecurity` / `SecurityFilterChain` / `@EnableWebSecurity` are **servlet-only**
- WebFlux applications have `spring-boot-starter-webflux` (no servlet container)
- Using servlet API causes `ClassNotFoundException` or silent misconfiguration

---

## Pattern 21.2: JWT Authentication (Reactive)

**Use Case**: JWT token generation and validation in reactive context.

```java
// Package: {rootPackage}.infrastructure.security
// File: JwtTokenProvider.java

@Service
@RequiredArgsConstructor
public class JwtTokenProvider {

    @Value("${jhipster.security.authentication.jwt.base64-secret}")
    private String jwtBase64Secret;

    @Value("${jhipster.security.authentication.jwt.token-validity-in-seconds}")
    private long tokenValidityInSeconds; // 86400 (24 hours)

    public String generateToken(Authentication authentication) {
        String authorities = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.joining(","));

        Instant now = Instant.now();
        Instant validity = now.plusSeconds(tokenValidityInSeconds);

        return Jwts.builder()
            .subject(authentication.getName())
            .claim("auth", authorities)
            .issuedAt(Date.from(now))
            .expiration(Date.from(validity))
            .signWith(getSigningKey())
            .compact();
    }

    public Mono<Authentication> getAuthentication(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();

        Collection<? extends GrantedAuthority> authorities =
            Arrays.stream(claims.get("auth").toString().split(","))
                .filter(auth -> !auth.trim().isEmpty())
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        User principal = new User(claims.getSubject(), "", authorities);
        return Mono.just(new UsernamePasswordAuthenticationToken(principal, token, authorities));
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtBase64Secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

**Key Points**:
- `Mono<Authentication>` return type for reactive pipeline
- JJWT 0.12+ API (`Jwts.builder().subject()` not `setSubject()`)
- Secret from `application.yml` (never hardcoded)

---

## Pattern 21.3: Input Validation with Bean Validation

**OWASP A03:2021 — Injection Prevention**

```java
// Package: {rootPackage}.application.service.dto.{moduleCode}
// Standard Bean Validation — same for servlet and reactive

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserDTO {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128)
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Password must contain uppercase, lowercase, digit, and special character"
    )
    private String password;

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    private String name;
}

// In controller: @Valid triggers validation
@PostMapping("/register")
public Mono<ResponseEntity<UserVM>> register(@Valid @RequestBody CreateUserDTO dto) {
    return userService.createUser(dto)
        .map(user -> ResponseEntity.ok(userVMMapper.toVM(user)));
}
```

---

## Pattern 21.4: SQL Injection Prevention (R2DBC)

**Use Case**: Prevent SQL injection using R2DBC `DatabaseClient` parameterized queries.

> **VARIANT WARNING**: StarX4CRM uses R2DBC (NOT JPA). Use `DatabaseClient` with positional `$N` parameters.

### APPROVED: Parameterized R2DBC query

```java
// Package: {rootPackage}.application.repository.{moduleCode}.impl
// File: CmnMUserRepositoryInternalImpl.java

@Override
public Flux<CmnMUser> findByEmailAndStatus(String email, Integer status) {
    return databaseClient.sql(
            "SELECT * FROM cmn_m_user WHERE email = $1 AND status = $2"
        )
        .bind(0, email)
        .bind(1, status)
        .map(rowMapper::apply)
        .all();
}
```

### REJECTED: String concatenation

```java
// ❌ CRITICAL VULNERABILITY — SQL Injection
// OWASP: A03:2021 - Injection
String sql = "SELECT * FROM cmn_m_user WHERE email = '" + email + "'";
databaseClient.sql(sql).map(rowMapper::apply).all();
// NEVER concatenate user input into SQL strings
```

**Fix**: Always use positional parameters (`$1`, `$2`) with `.bind()`.

---

## Pattern 21.5: OWASP Violation Detection

### Violation 1: Hardcoded Credentials

**Pattern**: `(password|secret|key).*=.*["'].*["']`
**Severity**: CRITICAL
**OWASP**: A02:2021 — Cryptographic Failures
**Fix**: Use `@Value("${...}")` from `application.yml` or secret management

### Violation 2: Weak Password Hashing

**Pattern**: `DigestUtils\.(md5|sha1)`
**Severity**: HIGH
**OWASP**: A02:2021 — Cryptographic Failures
**Fix**: Use `BCryptPasswordEncoder(12)`

### Violation 3: SQL String Concatenation

**Pattern**: `["'].*SELECT.*["'].*\+`
**Severity**: HIGH
**OWASP**: A03:2021 — Injection
**Fix**: Use R2DBC `DatabaseClient` with positional `$N` parameters and `.bind()`

---

## Pattern 21.6: Decision Tree

```
Is this question about security?
├─ YES → Continue consultation
│   │
│   ├─ Authentication (login, JWT, OAuth2)?
│   │   ├─ JWT token generation/validation?
│   │   │   → Pattern 21.2: JwtTokenProvider (reactive Mono)
│   │   │   → CONFIDENCE: 95%
│   │   ├─ OAuth2 Resource Server (Keycloak JWT)?
│   │   │   → Pattern 21.1: SecurityWebFilterChain + oauth2ResourceServer
│   │   │   → Cross-ref: keycloak-specialist.md (77.x)
│   │   │   → CONFIDENCE: 93%
│   │   └─ OAuth2 multi-provider (Google, Outlook)?
│   │       → DELEGATE: oauth2-specialist.md (39.x)
│   │
│   ├─ Authorization (RBAC, permissions)?
│   │   ├─ Role-based?
│   │   │   → @PreAuthorize("hasAuthority('ROLE_ADMIN')")
│   │   │   → CONFIDENCE: 94%
│   │   └─ Method-level reactive?
│   │       → @EnableReactiveMethodSecurity + @PreAuthorize
│   │       → CONFIDENCE: 93%
│   │
│   ├─ Input Validation?
│   │   ├─ DTO validation?
│   │   │   → Pattern 21.3: @Valid + Bean Validation
│   │   │   → CONFIDENCE: 93%
│   │   └─ SQL injection prevention?
│   │       → Pattern 21.4: R2DBC DatabaseClient + $N params
│   │       → CONFIDENCE: 95%
│   │
│   ├─ Password Security?
│   │   → BCryptPasswordEncoder(12)
│   │   → Detect MD5/SHA-1 as VIOLATION
│   │   → CONFIDENCE: 95%
│   │
│   └─ CSRF Protection?
│       → Disabled for stateless JWT APIs (correct)
│       → CONFIDENCE: 94%
│
└─ NO → Delegate to appropriate specialist
    ├─ Frontend security? → nextjs-security-specialist
    ├─ OAuth2 providers? → oauth2-specialist.md (39.x)
    ├─ Keycloak config? → keycloak-specialist.md (77.x)
    └─ DI? → java-di-specialist
```

---

## Anti-Patterns

- NO `HttpSecurity` / `SecurityFilterChain` / `@EnableWebSecurity` — these are servlet-only
- NO `JpaRepository` / `@Query` JPQL in examples — use R2DBC `DatabaseClient`
- NO hardcoded secrets in source code
- NO MD5/SHA-1 for password hashing
- NO string concatenation in SQL queries
- NO wildcard CORS origins in production

---

## Related Specialists

- `security/oauth2-specialist.md` (39.x) — OAuth2 multi-provider flows
- `infrastructure/keycloak-specialist.md` (77.x) — Keycloak SSO integration
- `di/java-di-specialist.md` (22.x) — Spring DI for security beans
- `architecture/backend-clean-architecture-specialist.md` (0.x) — Layer constraints

---

## Keywords

Trigger this specialist when step description contains:
`security`, `owasp`, `authentication`, `authorization`, `jwt`, `spring security`,
`login`, `password`, `hash`, `bcrypt`, `validate`, `validation`, `sql injection`,
`xss`, `csrf`, `@PreAuthorize`, `@Secured`, `role`, `permission`,
`SecurityWebFilterChain`, `ServerHttpSecurity`
