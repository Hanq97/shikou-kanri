# Docker Compose Orchestration Specialist

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Package** | `deploy/docker-compose*.yml` |
| **Maven Module** | N/A (infrastructure) |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 71.1–71.5 |
| **Source Paths** | `deploy/` |
| **File Count** | ~3 compose files |
| **Naming Convention** | `docker-compose*.yml` |
| **Base Class** | N/A |
| **Imports From** | N/A (DevOps) |
| **Cannot Import** | N/A (DevOps) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Layered Docker Compose for Full-Stack Orchestration
**Domain**: Infrastructure / Compose
**Pattern Range**: 71.1–71.5

---

## Description

StarX4CRM uses a layered Compose strategy: a root `docker-compose.yml` declares shared
volumes and networks, while four overlay files add infrastructure, backend services,
the frontend, and optional build profiles. This keeps each concern independently composable
and avoids a monolithic 400-line file.

---

## Key Concepts

- **Include directive** (Compose v2.20+): compose files reference each other via `include:`
- **Named volumes**: declared once in root, referenced by all layers
- **Shared network**: `{app-prefix}_default` (external: true in overlay files)
- **Health-check depends_on**: services wait for dependencies to be healthy before starting
- **Build profile**: `profile: build` for one-time image creation services

---

## Pattern 71.1 — Root Compose File (docker-compose.yml)

```yaml
# docker-compose.yml  — shared declarations only
version: "3.9"

networks:
  {app-prefix}_default:
    driver: bridge

volumes:
  postgres-data:
  keycloak-data:
  consul-data:
  kafka-data:
  redis-data:
  elasticsearch-data:

include:
  - docker-compose.infra.yml
  - docker-compose.backend.yml
  - docker-compose.frontend.yml
```

---

## Pattern 71.2 — Infrastructure Layer (docker-compose.infra.yml)

```yaml
services:
  postgresql:
    image: postgres:17
    environment:
      POSTGRES_DB: {app-prefix}
      POSTGRES_USER: {app-prefix}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-{app-prefix}}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - {app-prefix}_default
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U {app-prefix}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.0.11-alpine
    volumes:
      - redis-data:/data
    networks:
      - {app-prefix}_default
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 3

  kafka:
    image: apache/kafka:3.8.1
    environment:
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_NODE_ID: 1
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    volumes:
      - kafka-data:/var/lib/kafka/data
    networks:
      - {app-prefix}_default

  consul:
    image: hashicorp/consul:1.20
    command: agent -dev -client=0.0.0.0 -log-level=WARN
    volumes:
      - consul-data:/consul/data
    ports:
      - "8500:8500"
      - "8600:8600/udp"
    networks:
      - {app-prefix}_default
```

---

## Pattern 71.3 — Backend Layer (docker-compose.backend.yml)

```yaml
services:
  gateway:
    image: {app-prefix}/gateway:latest
    environment:
      SPRING_PROFILES_ACTIVE: prod,consul
      SPRING_CLOUD_CONSUL_HOST: consul
    depends_on:
      consul:
        condition: service_healthy
      postgresql:
        condition: service_healthy
    ports:
      - "8080:8080"
    networks:
      - {app-prefix}_default

  core-manager:
    image: {app-prefix}/core-manager:latest
    environment:
      SPRING_PROFILES_ACTIVE: prod,consul
      SPRING_R2DBC_URL: r2dbc:postgresql://postgresql:5432/{app-prefix}
      SPRING_DATA_REDIS_HOST: redis
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - {app-prefix}_default
```

---

## Pattern 71.4 — Build Profile

```yaml
services:
  builder:
    profiles:
      - build
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    image: {app-prefix}/core-manager:latest
```

Run with: `docker compose --profile build up --build`

---

## Pattern 71.5 — Frontend Layer (docker-compose.frontend.yml)

```yaml
services:
  frontend:
    image: {app-prefix}/frontend:latest
    environment:
      NEXT_PUBLIC_API_URL: http://gateway:8080
    depends_on:
      - gateway
    ports:
      - "3000:3000"
    networks:
      - {app-prefix}_default
```

---

## Anti-Patterns

- DO NOT use `version: "2.x"` — use Compose v3.9+ for `depends_on` condition support
- DO NOT put volume definitions in overlay files — declare them once in root
- DO NOT hardcode passwords — use `${ENV_VAR:-default}` interpolation
- DO NOT use `links:` — use named networks instead
- DO NOT start backend services without `condition: service_healthy` on infrastructure

---

## Related Specialists

- `infrastructure/docker-specialist.md` — Dockerfile multi-stage builds
- `infrastructure/consul-specialist.md` — Consul agent configuration
- `infrastructure/spring-profiles-specialist.md` — profile activation via `SPRING_PROFILES_ACTIVE`
