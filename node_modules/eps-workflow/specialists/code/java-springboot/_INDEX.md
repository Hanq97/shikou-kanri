---
memory: project
---
# Backend (Java) Specialists INDEX
# バックエンド（Java）スペシャリストINDEX

> **Total**: 84 specialists (80 code + 4 test-plan) | **Stack**: Java 21/25 + Spring Boot 3.4.x
> **Variants**: Standard (JPA), Lightweight (JDBC), Reactive (WebFlux+R2DBC), Clean-Modulith (Blocking+VT)
> **Template Variables**: `{rootPackage}`, `{sourceRoot}`, `{testRoot}`, `{app-prefix}`
> **Folders**: language, presentation, domain, application, data-access, architecture, patterns, infrastructure, di, gateway, messaging, migration, multitenancy, performance, scheduling, search, security, cloud, cross-cutting, workflow, devops, quality, cache, testing, test-plan

## Architecture Master (Pattern 0.x) — START HERE

**[backend-clean-architecture-specialist.md](./architecture/backend-clean-architecture-specialist.md)**
- 4-Layer structure, module code system, dependency rules
- File Type → Path mapping (14 file types)
- Cross-module feature example

## Quick Reference: Which Specialist?

| Task | Specialist | Pattern | Layer | Package |
|------|-----------|---------|-------|---------|
| Understand architecture | backend-clean-architecture | 0.x | ALL | all |
| Create REST endpoint | annotated-reactive-controller | 42.x | Presentation | `.rest.{moduleCode}` |
| Add search/filter | search-criteria | 43.x | Application | `.application.service.dto.{moduleCode}` |
| Add pagination | pagination | 44.x | Application | `.application.{service,repository}` |
| Create CRUD service | crud-service-base | 45.x | Application | `.application.service.{moduleCode}.impl` |
| Create entity | java-domain | 4.x | Domain | `.domain.{moduleCode}` |
| Map entity↔DTO | java-mapper | 11.x | Application | `.application.service.mapper.{moduleCode}` |
| Map DTO↔VM | viewmodel | 47.x | Infrastructure | `.infrastructure.web.rest.{vm,mapper}.{moduleCode}` |
| R2DBC repository | r2dbc-database-client | 19.x | Application | `.application.repository.{moduleCode}` |
| R2DBC RowMapper | r2dbc-rowmapper | 46.x | Application | `.application.repository.rowmapper.{moduleCode}` |
| Security config | java-security | 21.x | Infrastructure | `.infrastructure.security` |
| Kafka messaging | kafka | 30.x | Infrastructure | `.infrastructure.kafka` |
| Multi-tenancy | multitenancy | 31.x | Infrastructure | `.infrastructure.multitenancy` |
| **BBN: JDBC entity** | **spring-data-jdbc** | **50.x** | **Domain+Infra** | `.domain.entity`, `.infrastructure.persistence` |
| **BBN: JdbcClient query** | **jdbcclient** | **51.x** | **Adapter** | `.adapter.gateway` |
| **BBN: Spring Modulith** | **spring-modulith** | **52.x** | **Domain+Infra** | `.domain.event`, `.infrastructure.kafka` |
| **BBN: RestClient HTTP** | **restclient** | **53.x** | **Adapter+Infra** | `.adapter.gateway`, `.infrastructure.config` |
| **Generic** | | | | |
| SOLID, Java 21+ | java-fundamentals | 60.x | ALL | N/A (generic) |
| Concurrency patterns | java-concurrency | 61.x | Cross-cutting | N/A (generic) |
| Code quality | java-code-quality | 62.x | ALL | N/A (generic) |
| Design patterns | java-design-patterns | 63.x | ALL | N/A (generic) |
| Spring Boot config | spring-boot-configuration | 64.x | Infrastructure | N/A (generic) |
| AOP patterns | spring-aop | 65.x | Cross-cutting | N/A (generic) |
| API governance | api-design-governance | 67.x | Presentation | N/A (generic) |
| GraphQL | graphql-spring | 68.x | Presentation | N/A (generic) |
| Architecture styles | architecture-patterns | 82.x | ALL | N/A (generic) |
| JPA/Hibernate | jpa-hibernate | 83.x | App+Domain | N/A (generic) |
| Transactions | transaction-management | 84.x | Application | N/A (generic) |
| HTTP clients | http-client-patterns | 86.x | Infrastructure | N/A (generic) |
| File handling | file-handling | 87.x | Infrastructure | N/A (generic) |
| Security advanced | security-advanced | 89.x | Infrastructure | N/A (generic) |
| Testing advanced | testing-advanced | 90.x | Test | N/A (generic) |
| Observability | custom-observability | 92.x | Cross-cutting | N/A (generic) |
| Maven advanced | maven-advanced | 93.x | Build | N/A (generic) |
| Distributed patterns | distributed-patterns | 94.x | Application | N/A (generic) |
| CI/CD | ci-cd-patterns | 95.x | DevOps | N/A (generic) |
| Kubernetes | kubernetes-spring | 96.x | DevOps | N/A (generic) |

---

## Pattern Number Registry

### Architecture (0.x) — 1 specialist

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 0.1–0.6 | [backend-clean-architecture-specialist.md](./architecture/backend-clean-architecture-specialist.md) | ALL | `{rootPackage}.*` |

### Root Specialists — Standard Variant (1.x–7.x) — 7 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 1.x | [java-domain-specialist.md](./domain/java-domain-specialist.md) | Domain | `.domain.{moduleCode}` |
| 2.x | [java-service-specialist.md](./application/java-service-specialist.md) | Application | `.application.service.{moduleCode}` |
| 3.x | [java-repository-specialist.md](./data-access/java-repository-specialist.md) | Application | `.application.repository.{moduleCode}` |
| 4.x | [java-controller-specialist.md](./presentation/java-controller-specialist.md) | Presentation | `.rest.{moduleCode}` |
| 5.x | [java-dto-specialist.md](./domain/java-dto-specialist.md) | Application | `.application.service.dto.{moduleCode}` |
| 6.x | [java-validation-specialist.md](./domain/java-validation-specialist.md) | Cross-cutting | `.application.service`, `.infrastructure.web` |
| 7.x | [java-exception-specialist.md](./domain/java-exception-specialist.md) | Cross-cutting | `.infrastructure.web.rest.errors` |

### Root Specialists — Lightweight Variant (8.x–11.x) — 4 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 8.x | [java-jdbc-specialist.md](./data-access/java-jdbc-specialist.md) | Application | `.application.repository` |
| 9.x | [java-dao-specialist.md](./data-access/java-dao-specialist.md) | Application | `.application.repository` |
| 10.x | [java-pojo-specialist.md](./domain/java-pojo-specialist.md) | Domain/Application | `.domain`, `.application.service.dto` |
| 11.x | [java-mapper-specialist.md](./application/java-mapper-specialist.md) | Application | `.application.service.mapper.{moduleCode}` |

### Root Specialists — Reactive Variant (12.x–16.x) — 5 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 12.x | [java-webflux-specialist.md](./presentation/java-webflux-specialist.md) | Infrastructure | `.infrastructure.web` |
| 13.x | [java-r2dbc-specialist.md](./data-access/java-r2dbc-specialist.md) | Application | `.application.repository` |
| 14.x | [java-reactive-specialist.md](./application/java-reactive-specialist.md) | Cross-cutting | all layers |
| 15.x | [java-handler-specialist.md](./application/java-handler-specialist.md) | Infrastructure | `.infrastructure.web.rest.handler` |
| 16.x | [java-router-specialist.md](./presentation/java-router-specialist.md) | Infrastructure | `.infrastructure.web.rest.router` |

### Clean-Modulith Variant — BBN (50.x–53.x) — 4 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 50.x | [data-access/spring-data-jdbc-specialist.md](./data-access/spring-data-jdbc-specialist.md) | Domain + Infrastructure | `.domain.entity`, `.infrastructure.persistence` |
| 51.x | [data-access/jdbcclient-specialist.md](./data-access/jdbcclient-specialist.md) | Adapter | `.adapter.gateway` |
| 52.x | [cross-cutting/spring-modulith-specialist.md](./cross-cutting/spring-modulith-specialist.md) | Domain + Infrastructure | `.domain.event`, `.infrastructure.kafka` |
| 53.x | [gateway/restclient-specialist.md](./gateway/restclient-specialist.md) | Adapter + Infrastructure | `.adapter.gateway`, `.infrastructure.config` |

### Data Access (17.x–20.x, 34.x) — 6 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 17.x | [data-access/java-data-access-specialist.md](./data-access/java-data-access-specialist.md) | Application | `.application.repository.{moduleCode}` |
| 18.x | [data-access/r2dbc-connection-specialist.md](./data-access/r2dbc-connection-specialist.md) | Infrastructure | `.infrastructure.config` |
| 19.x | [data-access/r2dbc-database-client-specialist.md](./data-access/r2dbc-database-client-specialist.md) | Application | `.application.repository.{moduleCode}` |
| 20.x | [data-access/r2dbc-transaction-specialist.md](./data-access/r2dbc-transaction-specialist.md) | Application + Infrastructure | `.application.service`, `.infrastructure.config` |
| 34.x | [data-access/r2dbc-callback-specialist.md](./data-access/r2dbc-callback-specialist.md) | Domain | `.domain.{moduleCode}` |
| 46.x | [data-access/r2dbc-rowmapper-specialist.md](./data-access/r2dbc-rowmapper-specialist.md) | Application | `.application.repository.rowmapper.{moduleCode}` |

### Quality & Security (21.x–25.x, 39.x) — 6 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 21.x | [security/java-security-specialist.md](./security/java-security-specialist.md) | Infrastructure | `.infrastructure.security` |
| 22.x | [di/java-di-specialist.md](./di/java-di-specialist.md) | Infrastructure | `.infrastructure.config` |
| 23.x | [migration/java-migration-specialist.md](./migration/java-migration-specialist.md) | Infrastructure | `resources/config/liquibase/` |
| 24.x | [testing/java-testing-specialist.md](./testing/java-testing-specialist.md) | Test | `src/test/java/...` |
| 25.x | [performance/java-perf-specialist.md](./performance/java-perf-specialist.md) | Cross-cutting | all layers |
| 39.x | [security/oauth2-specialist.md](./security/oauth2-specialist.md) | Infrastructure | `.infrastructure.security.oauth2` |

### Messaging, Cache, Multi-tenancy (30.x–32.x) — 3 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 30.x | [messaging/kafka-specialist.md](./messaging/kafka-specialist.md) | Infrastructure | `.infrastructure.kafka` |
| 31.x | [multitenancy/multitenancy-specialist.md](./multitenancy/multitenancy-specialist.md) | Infrastructure | `.infrastructure.multitenancy` |
| 32.x | [cache/cache-specialist.md](./cache/cache-specialist.md) | Infrastructure | `.infrastructure.cache` |

### Application Patterns (33.x, 40.x, 42.x–47.x) — 8 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 33.x | [patterns/cqrs-specialist.md](./patterns/cqrs-specialist.md) | Application | `.application.service.{moduleCode}` |
| 40.x | [patterns/resilience-specialist.md](./patterns/resilience-specialist.md) | Infrastructure | `.infrastructure.web.rest` |
| 42.x | [patterns/annotated-reactive-controller-specialist.md](./patterns/annotated-reactive-controller-specialist.md) | Presentation | `.rest.{moduleCode}` |
| 43.x | [patterns/search-criteria-specialist.md](./patterns/search-criteria-specialist.md) | Application | `.application.service.dto.{moduleCode}` |
| 44.x | [patterns/pagination-specialist.md](./patterns/pagination-specialist.md) | Application | `.application.{service,repository}` |
| 45.x | [patterns/crud-service-base-specialist.md](./patterns/crud-service-base-specialist.md) | Application | `.application.service.{moduleCode}.impl` |
| 46.x | [data-access/r2dbc-rowmapper-specialist.md](./data-access/r2dbc-rowmapper-specialist.md) | Application | `.application.repository.rowmapper.{moduleCode}` |
| 47.x | [patterns/viewmodel-specialist.md](./patterns/viewmodel-specialist.md) | Infrastructure | `.infrastructure.web.rest.{vm,mapper}.{moduleCode}` |

### Gateway, Search, Workflow, Cloud, Scheduling (35.x–38.x, 41.x) — 5 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 35.x | [gateway/gateway-specialist.md](./gateway/gateway-specialist.md) | Infrastructure | gateway module |
| 36.x | [search/elasticsearch-specialist.md](./search/elasticsearch-specialist.md) | Infrastructure | `.infrastructure.search` |
| 37.x | [workflow/workflow-dag-specialist.md](./workflow/workflow-dag-specialist.md) | Application | batch-workflow module |
| 38.x | [cloud/aws-specialist.md](./cloud/aws-specialist.md) | Infrastructure | `.infrastructure.cloud.aws` |
| 41.x | [scheduling/jobrunr-specialist.md](./scheduling/jobrunr-specialist.md) | Infrastructure | `.infrastructure.scheduling` |

### Infrastructure (70.x–77.x) — 8 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 70.x | [infrastructure/docker-specialist.md](./infrastructure/docker-specialist.md) | DevOps | `deploy/docker/` |
| 71.x | [infrastructure/docker-compose-specialist.md](./infrastructure/docker-compose-specialist.md) | DevOps | `deploy/docker-compose/` |
| 72.x | [infrastructure/consul-specialist.md](./infrastructure/consul-specialist.md) | Infrastructure | `src/main/resources/config/` |
| 73.x | [infrastructure/monitoring-specialist.md](./infrastructure/monitoring-specialist.md) | Infrastructure | `.infrastructure.config`, `deploy/monitoring/` |
| 74.x | [infrastructure/logging-specialist.md](./infrastructure/logging-specialist.md) | Infrastructure | `src/main/resources/logback-spring.xml` |
| 75.x | [infrastructure/spring-profiles-specialist.md](./infrastructure/spring-profiles-specialist.md) | Infrastructure | `src/main/resources/config/application-*.yml` |
| 76.x | [infrastructure/maven-multimodule-specialist.md](./infrastructure/maven-multimodule-specialist.md) | Build | `pom.xml` files |
| 77.x | [infrastructure/keycloak-specialist.md](./infrastructure/keycloak-specialist.md) | Infrastructure | `.infrastructure.security` |

### Cross-Cutting (78.x–81.x) — 4 specialists

| Pattern | File | Layer | Package |
|---------|------|-------|---------|
| 78.x | [cross-cutting/domain-events-specialist.md](./cross-cutting/domain-events-specialist.md) | Application | `.application.service`, `.infrastructure.kafka` |
| 79.x | [cross-cutting/auditing-specialist.md](./cross-cutting/auditing-specialist.md) | Domain + Application | `.domain`, `.application.service.helper` |
| 80.x | [cross-cutting/springdoc-specialist.md](./cross-cutting/springdoc-specialist.md) | Infrastructure | `.infrastructure.config` |
| 81.x | [cross-cutting/sse-specialist.md](./cross-cutting/sse-specialist.md) | Infrastructure | `.infrastructure.web.rest`, gateway module |

---

## Generic Best Practices — Java Language (60.x–63.x) — 4 specialists

> ⚡ **Generic**: Áp dụng cho MỌI variant. Khi conflict với project-specific → project-specific thắng.

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 60.x | [java-fundamentals-specialist.md](./language/java-fundamentals-specialist.md) | ALL | SOLID, modern Java 21+, generics, functional interfaces, virtual threads |
| 61.x | [java-concurrency-specialist.md](./language/java-concurrency-specialist.md) | Cross-cutting | CompletableFuture, structured concurrency, @Async, thread safety |
| 62.x | [java-code-quality-specialist.md](./language/java-code-quality-specialist.md) | ALL | Naming, clean code, static analysis, code review, Javadoc |
| 63.x | [java-design-patterns-specialist.md](./language/java-design-patterns-specialist.md) | ALL | GoF in Spring: Strategy, Template, Builder, Factory, Observer, Decorator, Adapter |

### Generic — Spring Framework Core (64.x–65.x) — 2 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 64.x | [spring-boot-configuration-specialist.md](./cross-cutting/spring-boot-configuration-specialist.md) | Infrastructure | @ConfigurationProperties, auto-config, bean lifecycle, conditional beans |
| 65.x | [spring-aop-specialist.md](./cross-cutting/spring-aop-specialist.md) | Cross-cutting | Aspects, pointcuts, custom annotations, AOP ordering, pitfalls |

### Generic — Architecture & API Design (67.x–68.x, 82.x) — 3 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 67.x | [api-design-governance-specialist.md](./presentation/api-design-governance-specialist.md) | Presentation | REST conventions, HTTP codes, RFC 7807, versioning, backward compat, gRPC |
| 68.x | [graphql-spring-specialist.md](./presentation/graphql-spring-specialist.md) | Presentation | Spring for GraphQL, schema-first, DataLoader N+1, subscriptions |
| 82.x | [architecture-patterns-specialist.md](./architecture/architecture-patterns-specialist.md) | ALL | Layered, Clean, Hexagonal, Feature-Slice, Modular Monolith, DDD, ArchUnit |

### Generic — Data & Persistence (83.x–84.x) — 2 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 83.x | [jpa-hibernate-specialist.md](./data-access/jpa-hibernate-specialist.md) | Application + Domain | Entity mapping, relationships, N+1, Specifications, Hibernate performance |
| 84.x | [transaction-management-specialist.md](./data-access/transaction-management-specialist.md) | Application | @Transactional propagation, isolation, pitfalls, TransactionTemplate |

### Generic — Integration (86.x–87.x) — 2 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 86.x | [http-client-patterns-specialist.md](./infrastructure/http-client-patterns-specialist.md) | Infrastructure | WebClient, RestClient, Feign, selection guide, timeout, logging |
| 87.x | [file-handling-specialist.md](./infrastructure/file-handling-specialist.md) | Infrastructure | Upload/download, storage abstraction, validation, large file handling |

### Generic — Security & Testing (89.x–90.x) — 2 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 89.x | [security-advanced-specialist.md](./infrastructure/security-advanced-specialist.md) | Infrastructure | OWASP A04-A10, secrets, CORS, API keys, headers, sanitization, rate limiting |
| 90.x | [testing-advanced-specialist.md](./quality/testing-advanced-specialist.md) | Test | WireMock, test data, ArchUnit, mutation testing, anti-patterns, Awaitility |

### Generic — Observability, Build, Distributed (92.x–94.x) — 3 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 92.x | [custom-observability-specialist.md](./cross-cutting/custom-observability-specialist.md) | Cross-cutting | Custom metrics, MDC, HealthIndicator, structured logging, OpenTelemetry |
| 93.x | [maven-advanced-specialist.md](./devops/maven-advanced-specialist.md) | Build | Annotation processors, dependency conflicts, vulnerability scan, optimization |
| 94.x | [distributed-patterns-specialist.md](./architecture/distributed-patterns-specialist.md) | Application | Saga, idempotency, distributed locks, outbox, schema evolution, DLQ |

### Generic — DevOps (95.x–96.x) — 2 specialists

| Pattern | File | Layer | Scope |
|---------|------|-------|-------|
| 95.x | [ci-cd-patterns-specialist.md](./devops/ci-cd-patterns-specialist.md) | DevOps | Pipeline design, environment promotion, feature flags, rollback |
| 96.x | [kubernetes-spring-specialist.md](./devops/kubernetes-spring-specialist.md) | DevOps | K8s manifests, ConfigMap/Secret, health probes, Helm, graceful shutdown |

---

## Source Path → Specialist Lookup

| Source Path | Layer | Specialist | Pattern |
|------------|-------|-----------|---------|
| `.domain.{moduleCode}/*` | Domain | java-domain (1.x), auditing (79.x), r2dbc-callback (34.x) | 1, 79, 34 |
| `.application.service.{moduleCode}/*Service.java` | Application | crud-service-base (45.x), java-reactive (14.x) | 45, 14 |
| `.application.service.{moduleCode}/impl/*` | Application | crud-service-base (45.x) | 45 |
| `.application.service.dto.{moduleCode}/*` | Application | java-dto (5.x), search-criteria (43.x) | 5, 43 |
| `.application.service.mapper.{moduleCode}/*` | Application | java-mapper (11.x) | 11 |
| `.application.repository.{moduleCode}/*` | Application | r2dbc-database-client (19.x), java-data-access (17.x) | 19, 17 |
| `.application.repository.rowmapper.{moduleCode}/*` | Application | r2dbc-rowmapper (46.x) | 46 |
| `.infrastructure.web.rest.vm.{moduleCode}/*` | Infrastructure | viewmodel (47.x) | 47 |
| `.infrastructure.web.rest.mapper.{moduleCode}/*` | Infrastructure | viewmodel (47.x) | 47 |
| `.infrastructure.config/*` | Infrastructure | java-di (22.x), spring-profiles (75.x), r2dbc-connection (18.x) | 22, 75, 18 |
| `.infrastructure.security/*` | Infrastructure | java-security (21.x), keycloak (77.x), oauth2 (39.x) | 21, 77, 39 |
| `.infrastructure.kafka/*` | Infrastructure | kafka (30.x), domain-events (78.x) | 30, 78 |
| `.rest.{moduleCode}/*` | Presentation | annotated-reactive-controller (42.x) | 42 |
| **BBN Source Paths** | | | |
| `.domain.entity/*` | Domain | spring-data-jdbc (50.x) | 50 |
| `.domain.event/*` | Domain | spring-modulith (52.x) | 52 |
| `.domain.valueobject/*` | Domain | spring-data-jdbc (50.x) | 50 |
| `.infrastructure.persistence/*` | Infrastructure | spring-data-jdbc (50.x), jdbcclient (51.x) | 50, 51 |
| `.adapter.gateway/*` | Adapter | jdbcclient (51.x), restclient (53.x) | 51, 53 |
| `.infrastructure.config/RestClient*` | Infrastructure | restclient (53.x) | 53 |
| `.infrastructure.kafka/Event*` | Infrastructure | spring-modulith (52.x) | 52 |
