# Domain Event Pattern Specialist

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Infrastructure |
| **Package** | `{rootPackage}.application.event`, `{rootPackage}.infrastructure.kafka.consumer` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 78.1–78.3 |
| **Source Paths** | `{sourceRoot}/application/event/`, `{sourceRoot}/infrastructure/kafka/consumer/` |
| **File Count** | ~10 event classes |
| **Naming Convention** | `*Event.java`, `*EventPublisher.java`, `*EventListener.java` |
| **Base Class** | `ApplicationEvent` |
| **Imports From** | Domain (domain events), Application (event DTOs) |
| **Cannot Import** | `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | entityCreation |

---

**Title**: Decoupled Domain Events via ApplicationEventPublisher and AOP
**Domain**: Cross-Cutting / Domain Events
**Pattern Range**: 78.1–78.3

---

## Description

StarX4CRM uses Spring's `ApplicationEventPublisher` to fire domain events after state
transitions without coupling the publishing service to its consumers. An AOP aspect
intercepts service method returns and publishes structured events. Consumers handle
cache invalidation, audit trails, notifications, and denormalisation asynchronously.

---

## Key Concepts

- **ApplicationEventPublisher**: Spring's built-in synchronous event bus (no extra infra)
- **Domain event record**: immutable value object carrying entity ID and operation type
- **AOP interception**: `@AfterReturning` on service methods — zero coupling to domain logic
- **@TransactionalEventListener**: consumer runs after the outer transaction commits
- **@Async consumers**: offload notification/cache work to executor thread pool
- **Operation enum**: CREATE / UPDATE / DELETE for discriminated handling

---

## Pattern 78.1 — Domain Event Definition

```java
package {rootPackage}.common.domain.event;

public enum DomainOperation { CREATE, UPDATE, DELETE }

// Generic base event
public record DomainEvent<ID>(
    ID entityId,
    String entityType,
    DomainOperation operation,
    String performedBy,
    java.time.Instant occurredAt
) {}

// Typed convenience alias
public record UserUpdatedEvent(
    Long userId,
    DomainOperation operation,
    String performedBy
) {
    public static UserUpdatedEvent of(Long id, DomainOperation op, String by) {
        return new UserUpdatedEvent(id, op, by);
    }
}
```

---

## Pattern 78.2 — AOP Event Publisher

```java
package {rootPackage}.common.aop;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class UserServiceEventAspect {

    private final ApplicationEventPublisher eventPublisher;

    // Fires after createUser(UserDTO dto, String performedBy) returns successfully
    @AfterReturning(
        pointcut = "execution(* {rootPackage}.coremanager.application.UserService.createUser(..))",
        returning = "result"
    )
    public void onUserCreated(JoinPoint jp, Object result) {
        if (result instanceof UserDTO dto) {
            eventPublisher.publishEvent(
                UserUpdatedEvent.of(dto.id(), DomainOperation.CREATE, resolvePerformedBy(jp))
            );
        }
    }

    @AfterReturning(
        pointcut = "execution(* {rootPackage}.coremanager.application.UserService.updateUser(..))",
        returning = "result"
    )
    public void onUserUpdated(JoinPoint jp, Object result) {
        if (result instanceof UserDTO dto) {
            eventPublisher.publishEvent(
                UserUpdatedEvent.of(dto.id(), DomainOperation.UPDATE, resolvePerformedBy(jp))
            );
        }
    }

    @AfterReturning(
        pointcut = "execution(* {rootPackage}.coremanager.application.UserService.deleteUser(..))"
    )
    public void onUserDeleted(JoinPoint jp) {
        Long userId = (Long) jp.getArgs()[0];
        eventPublisher.publishEvent(
            UserUpdatedEvent.of(userId, DomainOperation.DELETE, resolvePerformedBy(jp))
        );
    }

    private Mono<String> resolvePerformedBy(JoinPoint jp) {
        // Reactive context — SecurityContextHolder does NOT work in WebFlux
        return ReactiveSecurityContextHolder.getContext()
            .map(ctx -> ctx.getAuthentication().getName())
            .defaultIfEmpty("system");
    }
}
```

> **Reactive Warning**: DO NOT use `@AfterReturning` on methods returning `Mono`/`Flux`.
> The Mono hasn't executed yet when the advice runs. Use `doOnNext()` / `doOnSuccess()` in the reactive pipeline instead,
> or use `@TransactionalEventListener` with `@Async` for decoupled event handling.

---

## Pattern 78.3 — Event Consumers

```java
@Component
@Slf4j
public class UserEventConsumers {

    private final UserCacheService cache;
    private final NotificationService notifications;

    // Cache invalidation — runs after TX commit
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public Mono<Void> invalidateCache(UserUpdatedEvent event) {
        log.debug("Invalidating cache for user {}", event.userId());
        cache.evict(event.userId());
    }

    // Async notification — does not block the originating request
    @Async
    @EventListener
    public Mono<Void> sendNotification(UserUpdatedEvent event) {
        if (event.operation() == DomainOperation.CREATE) {
            notifications.sendWelcome(event.userId());
        }
    }

    // Audit trail — unconditional
    @EventListener
    public Mono<Void> recordAudit(UserUpdatedEvent event) {
        log.info("AUDIT userId={} op={} by={}", event.userId(), event.operation(), event.performedBy());
    }
}
```

### Async Executor Configuration

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean(name = "eventExecutor")
    public Executor taskExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("event-");
        executor.initialize();
        return executor;
    }
}
```

---

## Anti-Patterns

- DO NOT use `ApplicationEventPublisher` to replace transactional outbox for cross-service events — use Kafka for that
- DO NOT annotate consumers with `@Async` AND `@TransactionalEventListener` together — incompatible lifecycle
- DO NOT throw exceptions in `@EventListener` — failure propagates back to the publisher's thread
- DO NOT embed business logic in AOP aspects — keep them as thin publishers only
- DO NOT publish events in `@AfterThrowing` — only publish on successful state change
- DO NOT use `SecurityContextHolder.getContext()` in WebFlux — use `ReactiveSecurityContextHolder.getContext()` with Reactor Context propagation
- DO NOT fire events synchronously in AOP — if the intercepted service returns `Mono`, the AOP aspect must subscribe to the `Mono` to trigger event publishing

---

## Related Specialists

- `cross-cutting/auditing-specialist.md` — audit trail can consume domain events
- `application/java-service-specialist.md` — service methods targeted by AOP pointcuts
- `cross-cutting/sse-specialist.md` — domain events can bridge to Kafka for SSE delivery
