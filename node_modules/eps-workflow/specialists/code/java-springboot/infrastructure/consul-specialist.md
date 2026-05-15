# Consul Service Discovery & Configuration Specialist

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.config` (bootstrap.yml) |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 72.1–72.3 |
| **Source Paths** | `backend/*/src/main/resources/config/bootstrap*.yml` |
| **File Count** | ~5 bootstrap files |
| **Naming Convention** | `bootstrap.yml`, `bootstrap-*.yml` |
| **Base Class** | N/A |
| **Imports From** | N/A (config) |
| **Cannot Import** | N/A (config) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Consul 1.20.6 — Service Discovery and Centralised Configuration
**Domain**: Infrastructure / Service Discovery
**Pattern Range**: 72.1–72.3

---

## Description

StarX4CRM uses HashiCorp Consul 1.20.6 as the service registry and distributed key-value
configuration store. Each Spring Boot microservice auto-registers on startup via
Spring Cloud Consul and reads its configuration from the Consul KV tree. The
`jhipster/consul-config-loader` sidecar populates Consul KV from YAML files at boot.

---

## Key Concepts

- **Agent dev mode**: single-node Consul for development (no quorum required)
- **KV config tree**: `config/{app-name}/` and `config/application/` (shared)
- **consul-config-loader**: Docker sidecar that watches `central-server-config/` and pushes to KV
- **DNS discovery**: services resolve each other via `{service}.service.consul` on port 8600
- **Health checks**: HTTP check on `/management/health` every 10 s, deregister after 1 min

---

## Pattern 72.1 — Consul Agent (docker-compose)

```yaml
consul:
  image: hashicorp/consul:1.20.6
  command: >
    agent -dev
    -client=0.0.0.0
    -log-level=WARN
    -ui
  ports:
    - "8500:8500"   # HTTP UI + API
    - "8600:8600/udp"  # DNS
  volumes:
    - consul-data:/consul/data
  healthcheck:
    test: ["CMD", "consul", "members"]
    interval: 10s
    timeout: 5s
    retries: 5

consul-config-loader:
  image: jhipster/consul-config-loader:v0.4.1
  environment:
    INIT_SLEEP_SECONDS: 5
    CONSUL_URL: consul
    CONSUL_PORT: 8500
  volumes:
    - ./central-server-config:/config
  depends_on:
    consul:
      condition: service_healthy
```

---

## Pattern 72.2 — Spring Cloud Consul Configuration

```yaml
# application-prod.yml
spring:
  cloud:
    consul:
      host: ${CONSUL_HOST:consul}
      port: ${CONSUL_PORT:8500}
      discovery:
        enabled: true
        instance-id: ${spring.application.name}:${spring.application.instance-id:${random.value}}
        health-check-path: /management/health
        health-check-interval: 10s
        health-check-timeout: 5s
        health-check-critical-timeout: 1m
        prefer-ip-address: true
        tags:
          - version=${info.project.version:1.0.0}
          - profile=${spring.profiles.active}
      config:
        enabled: true
        format: YAML
        prefix: config
        default-context: application
        profile-separator: ","
        watch:
          enabled: true
          delay: 1000
```

---

## Pattern 72.3 — Central Server Config Layout

```
central-server-config/
  application.yml          # shared across all services
  gateway/
    application.yml        # gateway-specific overrides
  core-manager/
    application.yml        # core-manager overrides
  sfa-manager/
    application.yml
```

Shared config example:

```yaml
# central-server-config/application.yml
spring:
  datasource:
    url: jdbc:postgresql://${POSTGRES_HOST:postgresql}:5432/${POSTGRES_DB:{app-prefix}}
  data:
    redis:
      host: ${REDIS_HOST:redis}
      port: 6379

management:
  endpoints:
    web:
      base-path: /management
```

---

## Anti-Patterns

- DO NOT use Consul dev mode in production — use a 3-node cluster
- DO NOT skip `instance-id` with `${random.value}` — duplicates cause split-brain registration
- DO NOT use `spring.cloud.consul.config.watch.enabled=false` in prod — misses runtime updates
- DO NOT expose port 8500 publicly without ACL tokens
- DO NOT poll `/management/health` directly from Consul — use the Spring Boot actuator path

---

## Related Specialists

- `infrastructure/docker-compose-specialist.md` — Consul container setup
- `infrastructure/spring-profiles-specialist.md` — profile-aware configuration layering
- `infrastructure/monitoring-specialist.md` — health endpoints used by Consul checks
