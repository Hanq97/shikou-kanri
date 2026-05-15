# JdbcClient Specialist

**Stack**: Java 25 LTS + Spring Boot 3.4.x | **Variant**: Clean-Modulith (Blocking + Virtual Threads)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Clean-Modulith (Blocking)** variant.
> For reactive data access, see: `data-access/r2dbc-database-client-specialist.md`.
> For legacy JdbcTemplate, see: `data-access/java-jdbc-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Adapter (Driven) |
| **Package** | `{rootPackage}.adapter.gateway`, `{rootPackage}.infrastructure.persistence` |
| **Maven Module** | backbone |
| **Variant** | Clean-Modulith (Blocking + VT) |
| **Pattern Numbers** | 51.1–51.5 |
| **Source Paths** | `{sourceRoot}/adapter/gateway/`, `{sourceRoot}/infrastructure/persistence/` |
| **Naming Convention** | `*JdbcGateway.java`, `*Config.java` |
| **Base Class** | `JdbcClient` (Spring 6.1+) |
| **Imports From** | Domain (Entities), UseCase (Port interfaces) |
| **Cannot Import** | `infrastructure.*` directly (via DI only) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose

Generates complex SQL queries using Spring 6.1+ `JdbcClient` fluent API. Used in the **Hybrid Repository Pattern** alongside `CrudRepository`: simple CRUD via `CrudRepository`, advanced queries (FOR UPDATE, aggregation, custom SQL) via `JdbcClient`.

---

## Key Differences from JdbcTemplate

| Aspect | JdbcClient (BBN) | JdbcTemplate (Legacy) |
|--------|-----------------|----------------------|
| API Style | Fluent builder | Method calls |
| Parameters | Named (`:name`) | Positional (`?`) |
| Result Mapping | `.query(Class)` auto-mapping | Manual `RowMapper` |
| Spring Version | 6.1+ (2024+) | All versions |
| Type Safety | Better (generics) | Weak |

---

## Pattern 51.1: JdbcClient Bean Configuration

**Use Case**: `JdbcClient` bean — auto-configured by Spring Boot 3.2+.

```java
// Spring Boot 3.2+ auto-configures JdbcClient via JdbcClientAutoConfiguration.
// NO explicit @Bean needed — simply inject via constructor:
//
//   public LedgerJdbcGateway(JdbcClient jdbcClient) { ... }
//
// Only define explicit @Bean for non-Boot or multi-DataSource scenarios:

// infrastructure/persistence/JdbcClientConfig.java (OPTIONAL)
package {rootPackage}.infrastructure.persistence;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import javax.sql.DataSource;

@Configuration
public class JdbcClientConfig {

    @Bean
    public JdbcClient jdbcClient(DataSource dataSource) {
        return JdbcClient.create(dataSource);
    }
}
```

**Key Points**:
- **Spring Boot 3.2+ auto-configures `JdbcClient`** — explicit `@Bean` is usually unnecessary
- Single `JdbcClient` bean shared across all gateways
- Uses same `DataSource` as `CrudRepository` — same connection pool
- Factory method: `JdbcClient.create(DataSource)` or `JdbcClient.create(JdbcOperations)`

---

## Pattern 51.2: Hybrid Repository — CrudRepository + JdbcClient

**Use Case**: Gateway implementing port interface with dual data access.

```java
// adapter/gateway/LedgerJdbcGateway.java
package {rootPackage}.adapter.gateway;

import {rootPackage}.domain.entity.ApiCallLedger;
import {rootPackage}.infrastructure.persistence.LedgerCrudRepository;
import {rootPackage}.usecase.port.LedgerGateway;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class LedgerJdbcGateway implements LedgerGateway {

    private final LedgerCrudRepository crudRepository;
    private final JdbcClient jdbcClient;

    public LedgerJdbcGateway(LedgerCrudRepository crudRepository,
                             JdbcClient jdbcClient) {
        this.crudRepository = crudRepository;
        this.jdbcClient = jdbcClient;
    }

    // ===== Simple CRUD → CrudRepository =====

    @Override
    public ApiCallLedger save(ApiCallLedger ledger) {
        return crudRepository.save(ledger);
    }

    @Override
    public Optional<ApiCallLedger> findByCallId(UUID callId) {
        return crudRepository.findByCallId(callId);
    }

    @Override
    public Optional<ApiCallLedger> findBySourceSystemAndSourceId(
            String sourceSystem, String sourceId) {
        return crudRepository.findBySourceSystemAndSourceId(sourceSystem, sourceId);
    }

    // ===== Advanced SQL → JdbcClient =====

    @Override
    public List<ApiCallLedger> findPendingRetries(Instant now, int limit) {
        return jdbcClient.sql("""
                SELECT * FROM api_call_ledger
                WHERE state = :state
                AND scheduled_retry_at <= :now
                ORDER BY scheduled_retry_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT :limit
                """)
            .param("state", "RETRYING")
            .param("now", now)
            .param("limit", limit)
            .query(ApiCallLedger.class)
            .list();
    }

    @Override
    public int updateState(Long id, String newState, Instant now, Long expectedVersion) {
        return jdbcClient.sql("""
                UPDATE api_call_ledger
                SET state = :newState, updated_at = :now, version = version + 1
                WHERE id = :id AND version = :expectedVersion
                """)
            .param("newState", newState)
            .param("now", now)
            .param("id", id)
            .param("expectedVersion", expectedVersion)
            .update();
    }
}
```

**Key Points**:
- **Hybrid Pattern**: CrudRepository for simple CRUD, JdbcClient for complex SQL
- Gateway implements port interface (`LedgerGateway`) from UseCase layer
- `FOR UPDATE SKIP LOCKED` — concurrent retry processing without deadlocks
- Named parameters (`:name`) — readable and maintainable
- `.query(Class).list()` — auto-mapping to record fields by convention

---

## Pattern 51.3: Fluent Query API

**Use Case**: Various `JdbcClient` query patterns.

```java
// Single result
Optional<ApiCallLedger> ledger = jdbcClient.sql(
        "SELECT * FROM api_call_ledger WHERE call_id = :callId")
    .param("callId", callId)
    .query(ApiCallLedger.class)
    .optional();

// List result
List<ApiCallLedger> ledgers = jdbcClient.sql(
        "SELECT * FROM api_call_ledger WHERE state = :state ORDER BY created_at DESC")
    .param("state", "DLQ")
    .query(ApiCallLedger.class)
    .list();

// Single value (count, sum)
long count = jdbcClient.sql(
        "SELECT COUNT(*) FROM api_call_ledger WHERE state = :state")
    .param("state", "PROCESSING")
    .query(Long.class)
    .single();

// Update/Delete (returns affected row count)
int updated = jdbcClient.sql(
        "UPDATE api_call_ledger SET state = :newState WHERE state = :oldState AND updated_at < :cutoff")
    .param("newState", "DLQ")
    .param("oldState", "RETRYING")
    .param("cutoff", Instant.now().minus(Duration.ofHours(24)))
    .update();
```

**Key Points**:
- `.optional()` — 0 or 1 row
- `.single()` — exactly 1 row (throws if 0 or >1)
- `.list()` — 0 or more rows
- `.update()` — INSERT/UPDATE/DELETE, returns affected count
- Auto-mapping works with records when column names match (snake_case → camelCase)

---

## Pattern 51.4: Custom RowMapper (When Auto-Mapping Fails)

**Use Case**: Explicit mapping for complex queries with joins or computed columns.

```java
// When auto-mapping doesn't work (joins, aliases, computed columns)
var results = jdbcClient.sql("""
        SELECT l.*, COUNT(sh.id) as history_count
        FROM api_call_ledger l
        LEFT JOIN state_history sh ON sh.api_call_ledger = l.id
        WHERE l.state = :state
        GROUP BY l.id
        """)
    .param("state", "DLQ")
    .query((rs, rowNum) -> new LedgerWithHistoryCount(
        rs.getLong("id"),
        rs.getObject("call_id", UUID.class),
        rs.getString("type"),
        rs.getString("state"),
        rs.getInt("history_count")
    ))
    .list();

// Projection record for the query result
record LedgerWithHistoryCount(Long id, UUID callId, String type, String state, int historyCount) {}
```

**Key Points**:
- Use lambda RowMapper for joins, aggregations, computed columns
- Create projection records for custom result shapes
- Prefer auto-mapping (`.query(Class)`) when column names match

---

## Pattern 51.5: Batch Operations

**Use Case**: Bulk insert/update with JdbcClient.

```java
// Iterative inserts using JdbcClient — NOT true batch (each call = 1 DB round-trip)
// True batch support planned for Spring Framework 7.1.x
public void batchInsertHistory(List<StateHistory> histories, Long ledgerId) {
    for (var history : histories) {
        jdbcClient.sql("""
                INSERT INTO state_history (api_call_ledger, from_state, to_state, changed_at)
                VALUES (:ledgerId, :fromState, :toState, :changedAt)
                """)
            .param("ledgerId", ledgerId)
            .param("fromState", history.fromState())
            .param("toState", history.toState())
            .param("changedAt", history.changedAt())
            .update();
    }
}

// For high-volume batch, fall back to JdbcTemplate.batchUpdate()
public int[] batchInsertHistoryBulk(List<StateHistory> histories, Long ledgerId) {
    return jdbcTemplate.batchUpdate(
        "INSERT INTO state_history (api_call_ledger, from_state, to_state, changed_at) VALUES (?, ?, ?, ?)",
        new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                var h = histories.get(i);
                ps.setLong(1, ledgerId);
                ps.setString(2, h.fromState());
                ps.setString(3, h.toState());
                ps.setTimestamp(4, Timestamp.from(h.changedAt()));
            }
            @Override
            public int getBatchSize() { return histories.size(); }
        });
}
```

**Key Points**:
- JdbcClient loop is simple and readable for small batches (<50 rows)
- For high-volume (>100 rows), use `JdbcTemplate.batchUpdate()` for performance
- Both approaches work with Virtual Threads

---

## Guidelines

- Use `JdbcClient` for ALL complex SQL (joins, aggregation, FOR UPDATE, raw SQL)
- Use `CrudRepository` for simple CRUD (save, findById, delete)
- Prefer named parameters (`:name`) over positional (`?`)
- Use `.query(Class)` auto-mapping when column names follow convention
- Use lambda RowMapper for joins and computed columns
- Create projection records for custom query results
- Always use `FOR UPDATE SKIP LOCKED` for concurrent processing queries

## REJECTED Patterns

- DO NOT use `JdbcClient` for simple CRUD — use `CrudRepository` instead
- DO NOT use positional `?` parameters — use named `:param` for readability
- DO NOT use `JdbcTemplate` for new code — use `JdbcClient` (unless batch needed)
- DO NOT mix reactive `DatabaseClient` with `JdbcClient` — pick one per project variant
- DO NOT use `JdbcClient` for DDL operations — use Liquibase/Flyway migrations

---

## Related Specialists

- `data-access/spring-data-jdbc-specialist.md` — CrudRepository and entity patterns (50.x)
- `data-access/java-jdbc-specialist.md` — Legacy JdbcTemplate patterns (8.x)
- `data-access/r2dbc-database-client-specialist.md` — Reactive DatabaseClient equivalent (19.x)
- `cross-cutting/spring-modulith-specialist.md` — Module boundaries for gateway layer (52.x)
