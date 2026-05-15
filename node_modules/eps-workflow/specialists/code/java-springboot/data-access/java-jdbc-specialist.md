# Java JDBC Specialist
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
| **Pattern Numbers** | 8.1–8.N |
| **Source Paths** | N/A — variant not in current codebase |
| **File Count** | N/A |
| **Naming Convention** | `*JdbcRepository.java` |
| **Base Class** | `JdbcTemplate` |
| **Imports From** | Domain (Entities) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose
Generates JDBC Template-based data access with RowMappers, batch operations, and parameterized queries.

## Patterns

### Pattern 1: JDBC Template DAO
```java
@Repository
@RequiredArgsConstructor
public class LoanDao {
    private final JdbcTemplate jdbcTemplate;

    public Optional<Loan> findById(UUID id) {
        var sql = "SELECT * FROM loans WHERE id = ?";
        var results = jdbcTemplate.query(sql, new LoanRowMapper(), id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.getFirst());
    }

    public List<Loan> findByStatus(LoanStatus status, int limit, int offset) {
        var sql = """
            SELECT l.*, u.email as borrower_email, u.full_name as borrower_name
            FROM loans l
            JOIN users u ON l.borrower_id = u.id
            WHERE l.status = ?
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
            """;
        return jdbcTemplate.query(sql, new LoanWithBorrowerRowMapper(), status.name(), limit, offset);
    }

    public UUID insert(Loan loan) {
        var id = UUID.randomUUID();
        var sql = """
            INSERT INTO loans (id, amount, interest_rate, duration_months, status, borrower_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql, id, loan.amount(), loan.interestRate(),
            loan.durationMonths(), loan.status().name(), loan.borrowerId(), LocalDateTime.now());
        return id;
    }
}
```

### Pattern 2: RowMapper Implementation
```java
public class LoanRowMapper implements RowMapper<Loan> {
    @Override
    public Loan mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new Loan(
            rs.getObject("id", UUID.class),
            rs.getBigDecimal("amount"),
            rs.getBigDecimal("interest_rate"),
            rs.getInt("duration_months"),
            LoanStatus.valueOf(rs.getString("status")),
            rs.getObject("borrower_id", UUID.class),
            rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getTimestamp("updated_at") != null
                ? rs.getTimestamp("updated_at").toLocalDateTime() : null
        );
    }
}
```

### Pattern 3: Named Parameter Query
```java
@Repository
@RequiredArgsConstructor
public class LoanSearchDao {
    private final NamedParameterJdbcTemplate namedJdbc;

    public List<Loan> search(LoanSearchCriteria criteria) {
        var sql = new StringBuilder("SELECT * FROM loans WHERE 1=1");
        var params = new MapSqlParameterSource();

        if (criteria.status() != null) {
            sql.append(" AND status = :status");
            params.addValue("status", criteria.status().name());
        }
        if (criteria.minAmount() != null) {
            sql.append(" AND amount >= :minAmount");
            params.addValue("minAmount", criteria.minAmount());
        }
        if (criteria.borrowerId() != null) {
            sql.append(" AND borrower_id = :borrowerId");
            params.addValue("borrowerId", criteria.borrowerId());
        }

        sql.append(" ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        params.addValue("limit", criteria.limit());
        params.addValue("offset", criteria.offset());

        return namedJdbc.query(sql.toString(), params, new LoanRowMapper());
    }
}
```

### Pattern 4: Batch Insert
```java
public int[] batchInsertPayments(List<Payment> payments) {
    var sql = """
        INSERT INTO payments (id, loan_id, amount, status, paid_at)
        VALUES (?, ?, ?, ?, ?)
        """;
    return jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
        @Override
        public void setValues(PreparedStatement ps, int i) throws SQLException {
            var p = payments.get(i);
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, p.loanId());
            ps.setBigDecimal(3, p.amount());
            ps.setString(4, p.status().name());
            ps.setTimestamp(5, Timestamp.valueOf(p.paidAt()));
        }

        @Override
        public int getBatchSize() { return payments.size(); }
    });
}
```

### Pattern 5: Transaction with Callback
```java
@RequiredArgsConstructor
public class LoanTransactionDao {
    private final TransactionTemplate transactionTemplate;
    private final JdbcTemplate jdbcTemplate;

    public UUID createLoanWithPaymentSchedule(CreateLoanRequest request) {
        return transactionTemplate.execute(status -> {
            var loanId = UUID.randomUUID();
            jdbcTemplate.update(
                "INSERT INTO loans (id, amount, status, borrower_id) VALUES (?, ?, ?, ?)",
                loanId, request.amount(), "PENDING", request.borrowerId());

            var schedule = calculateSchedule(request.amount(), request.durationMonths());
            schedule.forEach(payment ->
                jdbcTemplate.update(
                    "INSERT INTO payment_schedule (id, loan_id, due_date, amount) VALUES (?, ?, ?, ?)",
                    UUID.randomUUID(), loanId, payment.dueDate(), payment.amount()));

            return loanId;
        });
    }
}
```

## Guidelines
- Use `JdbcTemplate` for simple queries, `NamedParameterJdbcTemplate` for dynamic filters
- Implement `RowMapper` as separate class for reuse
- Use `BatchPreparedStatementSetter` for bulk inserts
- Use `TransactionTemplate` for programmatic transaction control
- Prefer SQL text blocks (`"""`) for multi-line queries
- Always use parameterized queries (never concatenate values)
- Return `Optional` for single-row lookups

## REJECTED Patterns

- DO NOT use JDBC in the reactive variant — use `DatabaseClient` (R2DBC) instead
- DO NOT concatenate SQL parameters — always use parameterized queries
- DO NOT skip transaction management for multi-statement operations
- DO NOT use JdbcTemplate in services that return `Mono`/`Flux`

---

## Related Specialists

- `data-access/r2dbc-database-client-specialist.md` — reactive equivalent of JDBC patterns (19.x)
- `data-access/java-dao-specialist.md` — DAO pattern using JDBC (9.x)
- `data-access/java-data-access-specialist.md` — data access layer overview (17.x)
