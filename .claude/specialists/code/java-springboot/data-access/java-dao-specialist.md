# Java DAO Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Lightweight (JDBC Template)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Lightweight (JDBC Template)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive data access, see: `data-access/java-r2dbc-specialist.md`, `data-access/r2dbc-callback-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | N/A — Lightweight variant not in use |
| **Maven Module** | N/A |
| **Variant** | Lightweight (JDBC) |
| **Pattern Numbers** | 9.1–9.N |
| **Source Paths** | N/A — variant not in current codebase |
| **File Count** | N/A |
| **Naming Convention** | `*Dao.java`, `*DaoImpl.java` |
| **Base Class** | N/A |
| **Imports From** | Domain (Entities) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose
Generates Data Access Object interfaces and implementations with consistent CRUD contracts.

## Patterns

### Pattern 1: DAO Interface
```java
public interface BaseDao<T, ID> {
    Optional<T> findById(ID id);
    List<T> findAll(int limit, int offset);
    ID insert(T entity);
    int update(T entity);
    int deleteById(ID id);
    long count();
}

public interface LoanDao extends BaseDao<Loan, UUID> {
    List<Loan> findByBorrowerId(UUID borrowerId, int limit, int offset);
    List<Loan> findByStatus(LoanStatus status);
    int updateStatus(UUID id, LoanStatus newStatus);
    long countByBorrowerIdAndStatus(UUID borrowerId, LoanStatus status);
}
```

### Pattern 2: DAO Implementation
```java
@Repository
@RequiredArgsConstructor
public class JdbcLoanDao implements LoanDao {
    private final JdbcTemplate jdbc;
    private final LoanRowMapper rowMapper = new LoanRowMapper();

    @Override
    public Optional<Loan> findById(UUID id) {
        var results = jdbc.query("SELECT * FROM loans WHERE id = ?", rowMapper, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.getFirst());
    }

    @Override
    public List<Loan> findAll(int limit, int offset) {
        return jdbc.query(
            "SELECT * FROM loans ORDER BY created_at DESC LIMIT ? OFFSET ?",
            rowMapper, limit, offset);
    }

    @Override
    public UUID insert(Loan loan) {
        var id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO loans (id, amount, interest_rate, duration_months, status, borrower_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            """, id, loan.amount(), loan.interestRate(), loan.durationMonths(),
            loan.status().name(), loan.borrowerId());
        return id;
    }

    @Override
    public int update(Loan loan) {
        return jdbc.update("""
            UPDATE loans SET amount = ?, interest_rate = ?, status = ?, updated_at = NOW()
            WHERE id = ?
            """, loan.amount(), loan.interestRate(), loan.status().name(), loan.id());
    }

    @Override
    public int deleteById(UUID id) {
        return jdbc.update("DELETE FROM loans WHERE id = ?", id);
    }

    @Override
    public long count() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM loans", Long.class);
    }

    @Override
    public int updateStatus(UUID id, LoanStatus newStatus) {
        return jdbc.update(
            "UPDATE loans SET status = ?, updated_at = NOW() WHERE id = ?",
            newStatus.name(), id);
    }

    @Override
    public long countByBorrowerIdAndStatus(UUID borrowerId, LoanStatus status) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM loans WHERE borrower_id = ? AND status = ?",
            Long.class, borrowerId, status.name());
    }
}
```

### Pattern 3: Pagination Result Wrapper
```java
public record PageResult<T>(
    List<T> items,
    long totalCount,
    int page,
    int pageSize
) {
    public int totalPages() {
        return (int) Math.ceil((double) totalCount / pageSize);
    }

    public boolean hasNext() {
        return page < totalPages() - 1;
    }
}

// Usage in DAO:
public PageResult<Loan> findPaged(int page, int pageSize) {
    var offset = page * pageSize;
    var items = jdbc.query(
        "SELECT * FROM loans ORDER BY created_at DESC LIMIT ? OFFSET ?",
        rowMapper, pageSize, offset);
    var total = jdbc.queryForObject("SELECT COUNT(*) FROM loans", Long.class);
    return new PageResult<>(items, total, page, pageSize);
}
```

### Pattern 4: Aggregate Queries
```java
public record LoanStats(
    long totalLoans,
    BigDecimal totalAmount,
    BigDecimal averageAmount,
    Map<LoanStatus, Long> statusCounts
) {}

public LoanStats getStatsByBorrower(UUID borrowerId) {
    var stats = jdbc.queryForMap("""
        SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount,
               COALESCE(AVG(amount), 0) as avg_amount
        FROM loans WHERE borrower_id = ?
        """, borrowerId);

    var statusCounts = jdbc.query("""
        SELECT status, COUNT(*) as cnt FROM loans
        WHERE borrower_id = ? GROUP BY status
        """, (rs, i) -> Map.entry(
            LoanStatus.valueOf(rs.getString("status")),
            rs.getLong("cnt")),
        borrowerId).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

    return new LoanStats(
        (long) stats.get("total"),
        (BigDecimal) stats.get("total_amount"),
        (BigDecimal) stats.get("avg_amount"),
        statusCounts);
}
```

### Pattern 5: Exists and Conditional Operations
```java
public boolean existsById(UUID id) {
    return jdbc.queryForObject(
        "SELECT EXISTS(SELECT 1 FROM loans WHERE id = ?)", Boolean.class, id);
}

public int softDelete(UUID id) {
    return jdbc.update(
        "UPDATE loans SET deleted_at = NOW(), status = 'CANCELLED' WHERE id = ? AND deleted_at IS NULL",
        id);
}

public int updateIfStatus(UUID id, LoanStatus expectedStatus, LoanStatus newStatus) {
    return jdbc.update("""
        UPDATE loans SET status = ?, updated_at = NOW()
        WHERE id = ? AND status = ?
        """, newStatus.name(), id, expectedStatus.name());
}
```

## Guidelines
- Define `BaseDao<T, ID>` interface for consistent CRUD contract
- Domain-specific DAOs extend `BaseDao` with custom methods
- One DAO per aggregate root (not per table)
- Use `PageResult` record instead of Spring's `Page`
- Return `int` from update/delete (affected rows count)
- Use `Optional` for nullable single-row results
- Keep SQL in the DAO layer only (services should not know SQL)

## REJECTED Patterns

- DO NOT use DAO pattern in reactive variant — use R2DBC repositories instead
- DO NOT add business logic in DAO methods — keep pure data access
- DO NOT skip connection pooling configuration for JDBC DAOs
- DO NOT return entities without using RowMapper — avoid manual `rs.get` calls

---

## Related Specialists

- `data-access/java-jdbc-specialist.md` — JdbcTemplate patterns (8.x)
- `data-access/r2dbc-database-client-specialist.md` — reactive equivalent (19.x)
- `data-access/java-repository-specialist.md` — JPA repository alternative (3.x)
