# Docker & Containerization Specialist

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Package** | `deploy/`, `Dockerfile` |
| **Maven Module** | all modules |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 70.1–70.4 |
| **Source Paths** | `backend/*/Dockerfile`, `deploy/` |
| **File Count** | ~10 Dockerfiles |
| **Naming Convention** | `Dockerfile`, `Dockerfile.multistage` |
| **Base Class** | `eclipse-temurin:21-jre` |
| **Imports From** | N/A (DevOps) |
| **Cannot Import** | N/A (DevOps) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Docker Multi-Stage Build and Container Hardening
**Domain**: Infrastructure / Containerization
**Pattern Range**: 70.1–70.4

---

## Description

Covers production-grade Dockerfile authoring for StarX4CRM microservices using multi-stage
builds, non-root user execution, JVM tuning, and health checks. All services follow a
consistent image layering strategy to minimise final image size and attack surface.

---

## Key Concepts

- **Multi-stage build**: separate `builder` and `runtime` stages to exclude Maven/JDK from the shipped image
- **Non-root user**: `{app-prefix}:{app-prefix}` (UID 1001) — never run the JVM as root
- **JVM tuning**: explicit heap bounds + GC flags suited for container memory limits
- **Health check**: curl against Spring Boot Actuator service port
- **Port convention**: each service exposes a single port (see table below)

### Service Port Map

| Service          | Port | EXPOSE |
|------------------|------|--------|
| gateway          | 8080 | 8080   |
| core-manager     | 8081 | 8081   |
| page-builder     | 8082 | 8082   |
| tenant-manager   | 8083 | 8083   |
| sfa-manager      | 8084 | 8084   |

---

## Pattern 70.1 — Multi-Stage Dockerfile

```dockerfile
# ---- builder stage ----
FROM maven:3.9-openjdk-21 AS builder
WORKDIR /build

# Cache dependency layer
COPY pom.xml .
COPY .mvn/ .mvn/
RUN mvn dependency:go-offline -q

COPY src/ src/
RUN mvn package -DskipTests -Pprod -q

# ---- runtime stage ----
FROM eclipse-temurin:25-jre AS runtime
LABEL maintainer="{app-prefix}-team"

# Pattern 70.2 — non-root user
RUN groupadd --system --gid 1001 {app-prefix} \
 && useradd  --system --uid 1001 --gid {app-prefix} --no-create-home {app-prefix}

WORKDIR /app
COPY --from=builder --chown={app-prefix}:{app-prefix} /build/target/*.jar app.jar

USER {app-prefix}
```

---

## Pattern 70.2 — JVM Tuning

```dockerfile
ENV JAVA_OPTS="\
  -Xmx512m \
  -Xms256m \
  -XX:+AlwaysPreTouch \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -Djava.security.egd=file:/dev/./urandom \
  -Dspring.backgroundpreinitializer.ignore=true"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

---

## Pattern 70.3 — Port Exposure

```dockerfile
# core-manager example
EXPOSE 8081
```

---

## Pattern 70.4 — Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8081/management/health/liveness || exit 1
```

---

## Anti-Patterns

- DO NOT use `FROM openjdk:*` — prefer `eclipse-temurin` (actively maintained)
- DO NOT run as root (`USER root` or omitting USER directive)
- DO NOT set `-Xmx` larger than 75 % of container memory limit
- DO NOT copy the entire workspace into the builder stage before dependency caching
- DO NOT expose service port to external networks without reverse proxy (use internal Docker network only)

---

## Related Specialists

- `infrastructure/docker-compose-specialist.md` — orchestration and service wiring
- `infrastructure/spring-profiles-specialist.md` — `prod` profile activated at build time (`-Pprod`)
- `infrastructure/monitoring-specialist.md` — Actuator endpoints used by health check
- `infrastructure/consul-specialist.md` — service registration after container start
