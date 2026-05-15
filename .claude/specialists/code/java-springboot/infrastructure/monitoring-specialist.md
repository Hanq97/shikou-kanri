# Monitoring & Observability Specialist

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.management`, `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 73.1–73.4 |
| **Source Paths** | `{sourceRoot}/infrastructure/management/`, `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~5 monitoring files |
| **Naming Convention** | `*HealthIndicator.java`, `*MetricsConfig.java` |
| **Base Class** | N/A |
| **Imports From** | Application (services for health checks) |
| **Cannot Import** | `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

> **D.8 — Management Port Map**: gateway:8081, core-manager:8083, sfa-manager:8085, tenant-manager:8087
> (These are the management ports; application ports differ — see docker-specialist.md Pattern 70.3 and Pattern 73.3 Prometheus scrape config.)

---

**Title**: Micrometer, Prometheus, and Zipkin Observability Stack
**Domain**: Infrastructure / Observability
**Pattern Range**: 73.1–73.4

---

## Description

Every StarX4CRM microservice exposes metrics via Micrometer (auto-configured) and ships
traces to Zipkin. Prometheus scrapes the `/management/prometheus` endpoint every 60 s.
Health probes split liveness (process health) from readiness (dependency availability),
enabling Kubernetes rolling-update safety.

---

## Key Concepts

- **Micrometer**: facade over underlying metric backends (Prometheus, etc.)
- **Actuator endpoints**: scoped set exposed on management port
- **Percentile histograms**: latency distribution per endpoint
- **Zipkin tracing**: 100 % sampling in prod (async sender, no blocking)
- **Liveness vs readiness**: separate probes for Kubernetes lifecycle

---

## Pattern 73.1 — Management Endpoint Configuration

```yaml
# application.yml — management section
management:
  endpoints:
    web:
      base-path: /management
      exposure:
        include:
          - configprops
          - env
          - health
          - info
          - loggers
          - prometheus
          - threaddump
          - liquibase
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true       # enables /health/liveness and /health/readiness
      group:
        liveness:
          include: livenessState
        readiness:
          include: readinessState,db,redis
  info:
    git:
      mode: full
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

---

## Pattern 73.2 — Micrometer Metrics Configuration

```yaml
management:
  metrics:
    enable:
      jvm: true
      process: true
      system: true
      logback: true
      http:
        server:
          requests: true
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests:
          - 0
          - 0.5
          - 0.75
          - 0.95
          - 0.99
          - 1.0
      slo:
        http.server.requests: 50ms,200ms,500ms,1s
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active:default}
```

---

## Pattern 73.3 — Prometheus Scrape Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: {app-prefix}
    metrics_path: /management/prometheus
    scrape_interval: 60s
    static_configs:
      - targets:
          - gateway:8081
          - core-manager:8083
          - sfa-manager:8085
          - tenant-manager:8087
```

Java dependency (already via Spring Boot actuator starter):

```xml
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

---

## Pattern 73.4 — Zipkin Distributed Tracing

```yaml
# application-zipkin.yml  (activated by -Pzipkin or profile=zipkin)
management:
  tracing:
    sampling:
      probability: 1.0     # 100% in prod; use 0.1 for high-throughput
  zipkin:
    tracing:
      endpoint: http://${ZIPKIN_HOST:zipkin}:9411/api/v2/spans

spring:
  application:
    name: core-manager   # appears as service name in Zipkin UI
```

Maven dependency:

```xml
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
  <groupId>io.opentelemetry</groupId>
  <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
```

---

## Anti-Patterns

- DO NOT expose all actuator endpoints (`include: "*"`) in production
- DO NOT use synchronous Zipkin sender — use `AsyncReporter` (default with OTel bridge)
- DO NOT set `probability: 1.0` on high-throughput services without head-based sampling
- DO NOT include `threaddump` in liveness/readiness groups — separate operational concern
- DO NOT skip `tags.application` — without it, dashboards cannot filter by service

---

## Related Specialists

- `infrastructure/docker-specialist.md` — health check uses `/management/health/liveness`
- `infrastructure/spring-profiles-specialist.md` — `zipkin` profile enables tracing
- `infrastructure/logging-specialist.md` — correlated log lines via trace/span IDs
