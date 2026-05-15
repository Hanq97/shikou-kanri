# Spring Data JDBC Specialist

**Stack**: Java 25 LTS + Spring Boot 3.4.x | **Variant**: Clean-Modulith (Blocking + Virtual Threads)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Clean-Modulith (Blocking)** variant.
> For reactive data access, see: `data-access/r2dbc-database-client-specialist.md`, `data-access/java-r2dbc-specialist.md`.
> For legacy JDBC Template, see: `data-access/java-jdbc-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain + Infrastructure |
| **Package** | `{rootPackage}.domain.entity`, `{rootPackage}.infrastructure.persistence` |
| **Maven Module** | backbone |
| **Variant** | Clean-Modulith (Blocking + VT) |
| **Pattern Numbers** | 50.1–50.5 |
| **Source Paths** | `{sourceRoot}/domain/entity/`, `{sourceRoot}/infrastructure/persistence/` |
| **Naming Convention** | Entity: `*.java` (record), Repository: `*CrudRepository.java` |
| **Base Class** | `CrudRepository<T, ID>` |
| **Imports From** | Domain (Entities, Value Objects) |
| **Cannot Import** | `adapter.*`, `usecase.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose

Generates Spring Data JDBC entities and repositories for BBN's blocking stack. Uses **immutable Java records** (not JPA `@Entity`), `@Id`-only annotation, convention-based column mapping, and `CrudRepository` for simple CRUD operations.

---

## Key Differences from JPA

| Aspect | Spring Data JDBC (BBN) | JPA (`@Entity`) |
|--------|----------------------|-----------------|
| Entity Type | Java `record` (immutable) | Mutable class with setters |
| Annotations | `@Id` only | `@Entity`, `@Table`, `@Column`, `@GeneratedValue` |
| Relationships | Aggregate root owns children | Lazy/Eager fetch, `@OneToMany` |
| Mapping | Convention-based (camelCase → snake_case) | Explicit `@Column` annotations |
| Identity | Explicit `@Id`, no auto-generation strategy annotation | `@GeneratedValue(strategy=...)` |
| Session/Cache | No session, no dirty checking | First-level cache, dirty checking |
| SQL | Direct SQL per operation | JPQL, Criteria API |

---

## Pattern 50.1: Domain Entity as Record

**Use Case**: Immutable domain entity with `@Id` for Spring Data JDBC.

```java
// domain/entity/ApiCallLedger.java
package {rootPackage}.domain.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import java.time.Instant;
import java.util.UUID;

public record ApiCallLedger(
    @Id Long id,
    UUID callId,
    String sourceSystem,
    String sourceId,
    String type,
    int tier,
    String state,
    String requestPayload,
    String responsePayload,
    int retryCount,
    Instant scheduledRetryAt,
    Instant createdAt,
    Instant updatedAt,
    @Version Long version
) {
    /**
     * Factory method for new entity (id=null triggers INSERT).
     */
    public static ApiCallLedger create(UUID callId, String sourceSystem, String sourceId,
                                        String type, int tier, String requestPayload) {
        return new ApiCallLedger(
            null, callId, sourceSystem, sourceId,
            type, tier, "RECEIVED", requestPayload,
            null, 0, null, Instant.now(), Instant.now(), null
        );
    }

    /**
     * Transition state — returns new record (immutable).
     */
    public ApiCallLedger withState(String newState) {
        return new ApiCallLedger(
            id, callId, sourceSystem, sourceId,
            type, tier, newState, requestPayload,
            responsePayload, retryCount, scheduledRetryAt,
            createdAt, Instant.now(), version
        );
    }
}
```

**Key Points**:
- `@Id` is the ONLY Spring Data annotation needed
- `@Version` enables optimistic locking
- `id=null` signals INSERT; non-null signals UPDATE (Spring Data JDBC convention)
- Immutable — state transitions return new record via `with*()` methods
- Convention mapping: `callId` → `call_id` column automatically

---

## Pattern 50.2: CrudRepository Interface

**Use Case**: Simple CRUD operations via Spring Data JDBC `CrudRepository`.

```java
// infrastructure/persistence/LedgerCrudRepository.java
package {rootPackage}.infrastructure.persistence;

import {rootPackage}.domain.entity.ApiCallLedger;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LedgerCrudRepository extends CrudRepository<ApiCallLedger, Long> {

    Optional<ApiCallLedger> findByCallId(UUID callId);

    Optional<ApiCallLedger> findBySourceSystemAndSourceId(String sourceSystem, String sourceId);
}
```

**Key Points**:
- Derived query methods work same as JPA (method name → SQL)
- No `@Query` needed for simple lookups — convention-based
- For complex queries (FOR UPDATE, aggregation), use `JdbcClient` — see `data-access/jdbcclient-specialist.md`

---

## Pattern 50.3: Value Object as Enum

**Use Case**: Domain value objects as Java enums with Spring Data JDBC.

```java
// domain/valueobject/LedgerState.java
package {rootPackage}.domain.valueobject;

public enum LedgerState {
    RECEIVED, QUEUED, PROCESSING, SENT, ACK, NACK, RETRYING, DLQ;

    public boolean isTerminal() {
        return this == ACK || this == DLQ;
    }

    public boolean canRetry() {
        return this == NACK || this == RETRYING;
    }
}

// domain/valueobject/TierType.java
public enum TierType {
    TIER1(1), TIER2(2);

    private final int value;
    TierType(int value) { this.value = value; }
    public int value() { return value; }
}

// domain/valueobject/RetryPolicy.java
public record RetryPolicy(
    int maxRetries,
    long initialDelayMs,
    double multiplier
) {
    public static final RetryPolicy TIER1 = new RetryPolicy(3, 1000, 2.0);
    public static final RetryPolicy TIER2 = new RetryPolicy(5, 1000, 2.0);
}
```

**Key Points**:
- Enums map to VARCHAR by default in Spring Data JDBC
- Records as value objects — immutable, no `@Id`
- Value objects embedded in entity via fields (no `@Embedded` needed for simple types)

---

## Pattern 50.4: Aggregate Root with Children

**Use Case**: Spring Data JDBC aggregate — root entity owns child entities.

```java
// domain/entity/ApiCallLedger.java (with children)
public record ApiCallLedger(
    @Id Long id,
    UUID callId,
    String type,
    String state,
    // ... other fields
    List<StateHistory> stateHistory  // Owned by aggregate root
) {
    public ApiCallLedger addHistory(String fromState, String toState) {
        var history = new StateHistory(null, fromState, toState, Instant.now());
        var newHistory = new ArrayList<>(this.stateHistory);
        newHistory.add(history);
        return new ApiCallLedger(id, callId, type, state, /* ... */ newHistory);
    }
}

// domain/entity/StateHistory.java
public record StateHistory(
    @Id Long id,
    String fromState,
    String toState,
    Instant changedAt
) {}
```

**Key Points**:
- Child `List<StateHistory>` is part of the aggregate — saved/deleted with root
- Foreign key `api_call_ledger` column auto-inferred in `state_history` table
- Spring Data JDBC **deletes all children and re-inserts** on aggregate save (no merge)
- For independent entities, use separate repositories — NOT aggregate children

---

## Pattern 50.5: Custom Table/Column Mapping

**Use Case**: Override convention mapping when column names differ from field names.

```java
// NOTE: NamingStrategy (camelCase → snake_case) is auto-configured by Spring Boot.
// Only override if you need custom naming logic:
//
// @Configuration
// public class JdbcConfig extends AbstractJdbcConfiguration {
//     @Bean @Override
//     public NamingStrategy namingStrategy() { return new CustomNamingStrategy(); }
// }

// Use @Table and @Column ONLY for specific overrides when convention doesn't match:
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.relational.core.mapping.Column;

@Table("type_tier_mapping")
public record TypeTierMapping(
    @Id Long id,
    @Column("api_type") String type,
    @Column("tier_level") int tier
) {}
```

---

## Guidelines

- Use Java `record` for ALL entities — immutable by default
- `@Id` is the ONLY required annotation; convention handles the rest
- `id=null` → INSERT, `id!=null` → UPDATE (no separate `isNew()` needed)
- Use `@Version` for optimistic locking on concurrent updates
- Use `with*()` methods for state transitions (returns new record)
- **Always use the return value of `save()`** — with immutable records, the returned instance has the generated `id` and incremented `version`
- Use `CrudRepository` for simple CRUD; `JdbcClient` for complex SQL
- Use `@MappedCollection(idColumn = "...", keyColumn = "...")` on child collections when FK/ordering column names differ from convention
- Do NOT use `@Entity`, `@Table`, `@Column` unless naming diverges from convention
- Do NOT use `@GeneratedValue` — Spring Data JDBC handles auto-increment via `id=null`

## REJECTED Patterns

- DO NOT use JPA annotations (`@Entity`, `@OneToMany`, `@ManyToOne`) — Spring Data JDBC doesn't support them
- DO NOT use mutable entity classes with setters — use records
- DO NOT use `@Transient` — use a separate projection record instead
- DO NOT model bidirectional relationships — Spring Data JDBC uses unidirectional aggregate ownership
- DO NOT use `EntityManager` or `Session` — they don't exist in Spring Data JDBC
- DO NOT discard the return value of `repository.save(entity)` — the returned record has the generated ID and incremented version
- DO NOT use large child collections in aggregates — Spring Data JDBC deletes all and re-inserts on every save

---

## Related Specialists

- `data-access/jdbcclient-specialist.md` — Complex queries with `JdbcClient` fluent API (51.x)
- `data-access/java-jdbc-specialist.md` — Legacy `JdbcTemplate` patterns (8.x)
- `data-access/r2dbc-database-client-specialist.md` — Reactive equivalent (19.x)
- `cross-cutting/spring-modulith-specialist.md` — Module boundaries and event externalization (52.x)
