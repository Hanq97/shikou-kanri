# Spring Modulith Specialist

**Stack**: Java 25 LTS + Spring Boot 3.4.x | **Variant**: Clean-Modulith (Blocking + Virtual Threads)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Clean-Modulith (Blocking)** variant.
> For reactive domain events via AOP, see: `cross-cutting/domain-events-specialist.md`.
> For Kafka messaging, see: `messaging/kafka-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain + Infrastructure |
| **Package** | `{rootPackage}.domain.event`, `{rootPackage}.infrastructure.kafka` |
| **Maven Module** | backbone |
| **Variant** | Clean-Modulith (Blocking + VT) |
| **Pattern Numbers** | 52.1–52.5 |
| **Source Paths** | `{sourceRoot}/domain/event/`, `{sourceRoot}/infrastructure/kafka/` |
| **Naming Convention** | `*Event.java`, `*Config.java`, `*ModuleTest.java` |
| **Dependencies** | `spring-modulith-starter-core`, `spring-modulith-events-kafka`, `spring-modulith-starter-jdbc`, `spring-modulith-starter-test` |
| **Imports From** | Domain (Events), Infrastructure (Kafka config) |
| **Cannot Import** | `adapter.*` (violates Clean Architecture dependency rule) |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## Purpose

Manages Spring Modulith module boundaries, event externalization to Kafka, and module integration testing for BBN's Clean Architecture. Replaces manual AOP-based domain events with Spring Modulith's built-in event publication + transactional outbox.

---

## Key Differences from AOP Domain Events

| Aspect | Spring Modulith (BBN) | AOP Events (StarX4CRM) |
|--------|----------------------|------------------------|
| Event Publishing | `ApplicationEventPublisher.publishEvent()` in UseCase | AOP `@AfterReturning` aspect |
| Externalization | `@Externalized` → Kafka (automatic) | Manual `KafkaTemplate.send()` |
| Outbox | Built-in `event_publication` table | No outbox (fire-and-forget) |
| Delivery | At-least-once (transactional outbox) | At-most-once (AOP fires before commit) |
| Module Boundaries | `@ApplicationModule` enforced | Convention-based (no enforcement) |
| Testing | `@ApplicationModuleTest` + `Scenario` API | Standard `@SpringBootTest` |

---

## Pattern 52.1: Module Structure with @ApplicationModule

**Use Case**: Define module boundaries for Clean Architecture layers.

```java
// domain/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {}  // domain depends on NOTHING
)
package {rootPackage}.domain;

// usecase/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {"domain"}  // usecase depends only on domain
)
package {rootPackage}.usecase;

// adapter/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {"domain", "usecase"}
)
package {rootPackage}.adapter;

// infrastructure/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {"domain", "usecase", "adapter"}
)
package {rootPackage}.infrastructure;
```

**Key Points**:
- `@ApplicationModule` enforces dependency rules at test-time (via `ApplicationModules.verify()`)
- Clean Architecture: `domain ← usecase ← adapter ← infrastructure`
- Violations cause test failure — not runtime errors

---

## Pattern 52.2: Domain Event with @Externalized

**Use Case**: Publish domain events that auto-externalize to Kafka topics.

```java
// domain/event/LedgerCreatedEvent.java
package {rootPackage}.domain.event;

import org.springframework.modulith.events.Externalized;
import java.time.Instant;
import java.util.UUID;

@Externalized("backbone.events::#{#this.callId()}")
public record LedgerCreatedEvent(
    UUID callId,
    String type,
    int tier,
    String sourceSystem,
    Instant createdAt
) {}

// domain/event/LedgerCompletedEvent.java
@Externalized("backbone.events::#{#this.callId()}")
public record LedgerCompletedEvent(
    UUID callId,
    String state,
    String responsePayload,
    Instant completedAt
) {}
```

**Key Points**:
- `@Externalized("topic::routingKey")` — topic name + SpEL routing key
- Routing key `#{#this.callId()}` ensures same `callId` always goes to same partition
- Events are first saved to `event_publication` table (transactional outbox)
- Then asynchronously published to Kafka by Spring Modulith
- Guarantees **at-least-once delivery** — events survive application crashes

---

## Pattern 52.3: Publishing Events from UseCase

**Use Case**: UseCase publishes domain events via `ApplicationEventPublisher`.

```java
// usecase/ingest/IngestUseCase.java
package {rootPackage}.usecase.ingest;

import {rootPackage}.domain.event.LedgerCreatedEvent;
import {rootPackage}.usecase.port.LedgerGateway;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IngestUseCase {

    private final LedgerGateway ledgerGateway;
    private final ApplicationEventPublisher eventPublisher;

    public IngestUseCase(LedgerGateway ledgerGateway,
                         ApplicationEventPublisher eventPublisher) {
        this.ledgerGateway = ledgerGateway;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ApiCallLedger ingest(IngestCommand command) {
        // 1. Check idempotency
        var existing = ledgerGateway.findBySourceSystemAndSourceId(
            command.sourceSystem(), command.sourceId());
        if (existing.isPresent()) {
            return existing.get();
        }

        // 2. Create ledger entry
        var ledger = ApiCallLedger.create(
            UUID.randomUUID(), command.sourceSystem(), command.sourceId(),
            command.type(), classifyTier(command.type()), command.payload());
        var saved = ledgerGateway.save(ledger);

        // 3. Publish domain event (auto-externalized to Kafka)
        eventPublisher.publishEvent(new LedgerCreatedEvent(
            saved.callId(), saved.type(), saved.tier(),
            saved.sourceSystem(), saved.createdAt()));

        return saved;
    }
}
```

**Key Points**:
- Event is published within `@Transactional` — saved to `event_publication` atomically
- No direct Kafka dependency in UseCase — only `ApplicationEventPublisher`
- Spring Modulith handles Kafka externalization asynchronously after commit

---

## Pattern 52.4: Event Externalization Configuration

**Use Case**: Configure Spring Modulith to externalize `@Externalized` events to Kafka.

```java
// infrastructure/kafka/EventExternalizationConfig.java
package {rootPackage}.infrastructure.kafka;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.modulith.events.EventExternalizationConfiguration;

@Configuration
public class EventExternalizationConfig {

    @Bean
    EventExternalizationConfiguration eventExternalizationConfiguration() {
        return EventExternalizationConfiguration.externalizing()
            .select(EventExternalizationConfiguration.annotatedAsExternalized())
            .build();
    }
}
```

```xml
<!-- pom.xml dependencies -->
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-starter-core</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-events-kafka</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-starter-jdbc</artifactId>
    <!-- Uses JDBC for event_publication table (not JPA) -->
</dependency>
```

**Key Points**:
- `spring-modulith-events-kafka` (runtime scope) auto-configures Kafka externalization
- `spring-modulith-starter-jdbc` stores event publication log in `event_publication` table
- Table requires `spring.modulith.events.jdbc.schema-initialization.enabled=true` in `application.yml`
- `EventExternalizationConfiguration` bean is optional — default already selects `@Externalized` events
- No manual `KafkaTemplate` needed for domain events

---

## Pattern 52.5: Module Structure Verification & Integration Testing

**Use Case**: Verify module boundaries and test event publication chains.

```java
// test/ModuleStructureTest.java
package {rootPackage};

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModuleStructureTest {

    @Test
    void verifyModuleStructure() {
        // Fails if any module violates @ApplicationModule(allowedDependencies)
        ApplicationModules.of(BackboneApplication.class).verify();
    }

    @Test
    void printModuleArrangement() {
        var modules = ApplicationModules.of(BackboneApplication.class);
        modules.forEach(System.out::println);
    }
}

// test/integration/EventExternalizationTest.java
package {rootPackage}.integration;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.Scenario;
import {rootPackage}.domain.event.LedgerCreatedEvent;

@ApplicationModuleTest
class EventExternalizationTest {

    @Test
    void ledgerCreation_publishes_event(Scenario scenario) {
        scenario.stimulate(() -> ingestUseCase.ingest(testCommand()))
            .andWaitForEventOfType(LedgerCreatedEvent.class)
            .toArriveAndVerify(event -> {
                assertThat(event.callId()).isNotNull();
                assertThat(event.tier()).isEqualTo(1);
                assertThat(event.type()).isEqualTo("PROD_OUTPUT");
            });
    }
}
```

**Key Points**:
- `ApplicationModules.verify()` validates ALL module dependency rules
- `@ApplicationModuleTest` bootstraps only the target module in `STANDALONE` mode (default); use `mode = BootstrapMode.DIRECT_DEPENDENCIES` to include dependencies
- `Scenario` API tests async event publication chains
- Tests run with Testcontainers for PostgreSQL + Kafka

---

## Guidelines

- Use `@ApplicationModule` on `package-info.java` for every Clean Architecture layer
- Use `@Externalized` ONLY for events that need Kafka externalization (Lakehouse, audit)
- Use plain `ApplicationEventPublisher` for intra-process events (no `@Externalized`)
- Publish events within `@Transactional` — outbox guarantees delivery
- Do NOT use `@Externalized` for Cold Lane Kafka messages — use direct `KafkaTemplate` for operational messages needing partition control
- Always run `ApplicationModules.verify()` in CI — catches dependency violations early

## REJECTED Patterns

- DO NOT use AOP `@AfterReturning` for domain events — Spring Modulith replaces this
- DO NOT use `KafkaTemplate` for domain events — use `@Externalized` instead
- DO NOT publish events outside `@Transactional` — breaks outbox guarantee
- DO NOT add `@Externalized` to ALL events — only events that need external consumers
- DO NOT use `@ApplicationModuleTest` without Testcontainers — needs real DB for event_publication

---

## Related Specialists

- `data-access/spring-data-jdbc-specialist.md` — Entity patterns for domain layer (50.x)
- `messaging/kafka-specialist.md` — Direct Kafka usage for Cold Lane messages (30.x)
- `gateway/restclient-specialist.md` — Blocking HTTP client for gateway adapters (53.x)
- `cross-cutting/domain-events-specialist.md` — Legacy AOP-based events for StarX4CRM (78.x)
