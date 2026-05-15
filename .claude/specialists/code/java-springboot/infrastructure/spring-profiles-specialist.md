# Spring Profiles Configuration Specialist

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `resources/config/application*.yml` |
| **Maven Module** | all modules |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 75.1–75.4 |
| **Source Paths** | `backend/*/src/main/resources/config/application*.yml` |
| **File Count** | ~30 config files |
| **Naming Convention** | `application.yml`, `application-{profile}.yml` |
| **Base Class** | N/A |
| **Imports From** | N/A (config) |
| **Cannot Import** | N/A (config) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Profile-Based Configuration Strategy for Dev/Prod/TLS/Zipkin
**Domain**: Infrastructure / Configuration
**Pattern Range**: 75.1–75.4

---

## Description

StarX4CRM uses Spring's profile system to provide environment-specific configuration.
Profiles are composable: a production deployment activates `prod,consul,zipkin`.
The `dev` profile group includes `api-docs` and `no-liquibase` for faster iteration.
All sensitive values use `${ENV_VAR:default}` interpolation.

---

## Key Concepts

- **Profile groups**: `spring.profiles.group.dev` bundles multiple profiles into one activation
- **Profile-specific YAML**: `application-{profile}.yml` loaded automatically
- **Composable activation**: comma-separated list in `SPRING_PROFILES_ACTIVE`
- **Environment interpolation**: `${VAR:default}` — never hardcode secrets
- **Graceful shutdown**: enabled in `prod` for zero-downtime rolling restarts

---

## Pattern 75.1 — Profile Groups (application.yml)

```yaml
# application.yml — base configuration
spring:
  application:
    name: core-manager
  profiles:
    active: dev        # overridden by env var in containers
    group:
      dev:
        - dev
        - api-docs
        - no-liquibase
      prod:
        - prod
        - consul
```

---

## Pattern 75.2 — Dev Profile (application-dev.yml)

```yaml
# application-dev.yml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/{app-prefix}
    username: {app-prefix}
    password: {app-prefix}
  data:
    redis:
      host: localhost
      port: 6379

logging:
  level:
    {rootPackage}: DEBUG
    org.springframework.r2dbc: DEBUG

server:
  port: 8082
```

> **Note**: `localhost` values above are for local development only. When running in Docker or
> Kubernetes, these are overridden by environment variables (e.g., `SPRING_R2DBC_URL`,
> `SPRING_DATA_REDIS_HOST`) injected by the container orchestrator.

---

## Pattern 75.3 — Prod Profile (application-prod.yml)

```yaml
# application-prod.yml
spring:
  r2dbc:
    url: ${SPRING_R2DBC_URL:r2dbc:postgresql://postgresql:5432/{app-prefix}}
    username: ${SPRING_R2DBC_USERNAME:{app-prefix}}
    password: ${SPRING_R2DBC_PASSWORD}
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}
      port: ${SPRING_DATA_REDIS_PORT:6379}

server:
  port: 8082
  compression:
    enabled: true
    mime-types: text/html,text/xml,text/plain,text/css,application/javascript,application/json
    min-response-size: 1024
  shutdown: graceful   # waits for in-flight requests to complete

logging:
  level:
    root: INFO
    {rootPackage}: INFO

spring.lifecycle.timeout-per-shutdown-phase: 10s
```

---

## Pattern 75.4 — TLS and Zipkin Profiles

```yaml
# application-tls.yml
server:
  ssl:
    enabled: true
    key-store: ${TLS_KEYSTORE:classpath:config/tls/keystore.p12}
    key-store-password: ${TLS_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
  port: 8443

---
# application-zipkin.yml
management:
  tracing:
    sampling:
      probability: ${ZIPKIN_SAMPLING:1.0}
  zipkin:
    tracing:
      endpoint: http://${ZIPKIN_HOST:zipkin}:9411/api/v2/spans
```

### api-docs Profile

```yaml
# application-api-docs.yml
springdoc:
  api-docs:
    enabled: true
  swagger-ui:
    enabled: true
    operations-sorter: alpha
    tags-sorter: alpha
```

### no-liquibase Profile

```yaml
# application-no-liquibase.yml
spring:
  liquibase:
    enabled: false
```

---

## Environment Variable Override Pattern

```bash
# Container environment (overrides application-prod.yml defaults)
SPRING_PROFILES_ACTIVE=prod,consul,zipkin
SPRING_R2DBC_URL=r2dbc:postgresql://db-host:5432/{app-prefix}
SPRING_R2DBC_PASSWORD=secret
SPRING_DATA_REDIS_HOST=redis-cluster
ZIPKIN_HOST=zipkin.monitoring.svc.cluster.local
```

---

## Anti-Patterns

- DO NOT commit secrets to `application-prod.yml` — use env vars or Vault
- DO NOT activate `api-docs` in production — exposes internal API structure
- DO NOT use `spring.profiles.active=prod,dev` — conflicting profiles cause unpredictable merges
- DO NOT skip `spring.lifecycle.timeout-per-shutdown-phase` in prod — abrupt shutdown corrupts requests
- DO NOT use fixed port in Kubernetes — override via env vars per deployment

---

## Related Specialists

- `infrastructure/consul-specialist.md` — `consul` profile enables KV config loading
- `infrastructure/monitoring-specialist.md` — `zipkin` profile enables tracing
- `cross-cutting/springdoc-specialist.md` — `api-docs` profile enables Swagger UI
- `infrastructure/logging-specialist.md` — `prod` profile activates async appenders
