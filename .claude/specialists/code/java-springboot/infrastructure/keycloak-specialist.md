# Keycloak SSO Specialist

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.security`, `deploy/` |
| **Maven Module** | `common` + `gateway` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 77.1–77.4 |
| **Source Paths** | `{sourceRoot}/infrastructure/security/`, `deploy/keycloak/` |
| **File Count** | ~5 keycloak config files |
| **Naming Convention** | `Keycloak*Config.java`, `realm-export.json` |
| **Base Class** | N/A |
| **Imports From** | Application (user DTOs for sync) |
| **Cannot Import** | `rest.*`, `application.*` (except DTOs) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Keycloak 26.x Integration — Realm, Client, and Token Management
**Domain**: Infrastructure / Authentication
**Pattern Range**: 77.1–77.4

---

## Description

StarX4CRM delegates authentication and SSO to Keycloak 26.x. The `common` realm
holds the `web_app` client. Spring Boot microservices validate JWTs from Keycloak's
JWKS endpoint. The gateway handles the OAuth2 login flow; backend services are
pure resource servers.

---

## Key Concepts

- **Realm**: `common` — logical tenant boundary within Keycloak
- **Client**: `web_app` — public OIDC client for the Next.js frontend
- **Scopes**: `openid`, `profile`, `email`, `offline_access`
- **Token exchange**: internal services call `/idp/realms/common/protocol/openid-connect/token`
- **Session cookies**: http-only, sameSite=strict — prevents XSS token theft
- **Admin CLI**: `kcadm.sh` for scripted realm/client provisioning in CI
- **Custom extension**: `{app-prefix}-keycloak:latest` image bundles custom providers and themes on top of `quay.io/keycloak/keycloak:26.1`
- **Path prefix**: all Keycloak endpoints are served under `/idp` path prefix (e.g., `/idp/realms/common`)

---

## Pattern 77.1 — Keycloak Docker Service

```yaml
# docker-compose.infra.yml
keycloak:
  image: {app-prefix}-keycloak:latest  # base: quay.io/keycloak/keycloak:26.1 + custom extensions
  command: start-dev --import-realm
  environment:
    KC_DB: postgres
    KC_DB_URL: jdbc:postgresql://postgresql:5432/keycloak
    KC_DB_USERNAME: keycloak
    KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD:-keycloak}
    KC_BOOTSTRAP_ADMIN_USERNAME: admin
    KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-admin}
    KC_HOSTNAME: localhost
    KC_HTTP_PORT: 8080
  volumes:
    - keycloak-data:/opt/keycloak/data
    - ./keycloak/realms:/opt/keycloak/data/import
  ports:
    - "18080:8080"
  depends_on:
    postgresql:
      condition: service_healthy
  networks:
    - {app-prefix}_default
```

---

## Pattern 77.2 — Spring Security Resource Server (Backend)

```yaml
# application.yml — backend microservices
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://${KEYCLOAK_HOST:keycloak}:8080/idp/realms/common
          jwk-set-uri: http://${KEYCLOAK_HOST:keycloak}:8080/idp/realms/common/protocol/openid-connect/certs
```

```java
@Configuration
@EnableWebFluxSecurity
public class SecurityConfiguration {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/management/health/**").permitAll()
                .pathMatchers("/management/info").permitAll()
                .pathMatchers("/management/**").hasAuthority("ROLE_ADMIN")
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .build();
    }

    private ReactiveJwtAuthenticationConverter jwtAuthenticationConverter() {
        var converter = new ReactiveJwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            var realmRoles = (List<String>) ((Map<?, ?>) jwt.getClaims()
                .getOrDefault("realm_access", Map.of()))
                .getOrDefault("roles", List.of());
            return Flux.fromIterable(realmRoles)
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
        });
        return converter;
    }
}
```

---

## Pattern 77.3 — Service-to-Service Token Exchange

```java
@Service
public class InternalTokenService {

    private final WebClient webClient;

    @Value("${keycloak.token-uri:http://keycloak:8080/idp/realms/common/protocol/openid-connect/token}")
    private String tokenUri;

    public Mono<String> getClientCredentialsToken(String clientId, String clientSecret) {
        return webClient.post()
            .uri(tokenUri)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData("grant_type", "client_credentials")
                .with("client_id", clientId)
                .with("client_secret", clientSecret))
            .retrieve()
            .bodyToMono(TokenResponse.class)
            .map(TokenResponse::accessToken);
    }

    record TokenResponse(@JsonProperty("access_token") String accessToken) {}
}
```

---

## Pattern 77.4 — Realm Export and Admin CLI Provisioning

```bash
# Export realm for version control
docker exec keycloak /opt/keycloak/bin/kc.sh export \
  --realm common \
  --file /opt/keycloak/data/import/common-realm.json

# Admin CLI — create client via script
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:18080/idp \
  --realm master \
  --user admin --password admin

/opt/keycloak/bin/kcadm.sh create clients \
  --realm common \
  --set clientId=web_app \
  --set publicClient=true \
  --set "redirectUris=[\"http://localhost:3000/*\"]" \
  --set "webOrigins=[\"http://localhost:3000\"]"
```

### Gateway OAuth2 Login Config

```yaml
# application-dev.yml (gateway only)
spring:
  security:
    oauth2:
      client:
        registration:
          oidc:
            client-id: web_app
            client-secret: ''
            scope: openid, profile, email, offline_access
        provider:
          oidc:
            issuer-uri: http://localhost:18080/idp/realms/common
```

---

## Anti-Patterns

- DO NOT use `start-dev` in production — enables insecure defaults
- DO NOT skip realm export to version control — Keycloak DB is not a source of truth
- DO NOT use `publicClient=false` without `client_secret` rotation strategy
- DO NOT validate JWTs locally without jwk-set-uri — keys rotate
- DO NOT expose port 18080 publicly without reverse proxy (TLS termination)

---

## Related Specialists

- `infrastructure/spring-profiles-specialist.md` — `tls` profile for HTTPS between gateway and Keycloak
- `infrastructure/docker-compose-specialist.md` — Keycloak container with PostgreSQL dependency
- `infrastructure/consul-specialist.md` — Keycloak token URI stored in Consul KV for runtime override
