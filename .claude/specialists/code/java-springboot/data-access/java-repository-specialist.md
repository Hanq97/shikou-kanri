# Java Repository Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Standard (JPA)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive patterns, see: `presentation/java-webflux-specialist.md`, `data-access/java-r2dbc-specialist.md`, `application/java-handler-specialist.md`, `presentation/java-router-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.repository.{moduleCode}` |
| **Maven Module** | common |
| **Variant** | Standard (JPA) |
| **Pattern Numbers** | 3.1–3.N |
| **Source Paths** | N/A — Standard variant. See `data-access/java-r2dbc-specialist.md` (13.x) for actual reactive repos |
| **File Count** | N/A |
| **Naming Convention** | `{Entity}Repository.java` |
| **Base Class** | `JpaRepository<T, Long>` |
| **Imports From** | Domain (Entities) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose
Generates Spring Data JPA repositories with custom queries, projections, and specifications.

## Patterns

### Pattern 1: Repository with Custom Queries
```java
@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID>,
        JpaSpecificationExecutor<Loan> {

    @Query("SELECT l FROM Loan l JOIN FETCH l.borrower WHERE l.id = :id")
    Optional<Loan> findByIdWithBorrower(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM Loan l WHERE l.id = :id")
    Optional<Loan> findByIdWithLock(@Param("id") UUID id);

    List<Loan> findByStatusAndDueDateBefore(LoanStatus status, LocalDate date);

    @Query("SELECT l FROM Loan l WHERE l.borrower.id = :userId ORDER BY l.createdAt DESC")
    Page<Loan> findByBorrowerId(@Param("userId") UUID userId, Pageable pageable);
}
```

### Pattern 2: Projection Interface
```java
public interface LoanSummary {
    UUID getId();
    BigDecimal getAmount();
    LoanStatus getStatus();
    LocalDateTime getCreatedAt();

    @Value("#{target.borrower.email}")
    String getBorrowerEmail();
}

@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID> {
    @Query("SELECT l FROM Loan l WHERE l.status = :status")
    List<LoanSummary> findSummariesByStatus(@Param("status") LoanStatus status);
}
```

### Pattern 3: Native Query for Performance
```java
@Query(value = """
    SELECT l.id, l.amount, l.status, u.email as borrower_email
    FROM loans l
    JOIN users u ON l.borrower_id = u.id
    WHERE l.status = :status
    AND l.created_at >= :since
    ORDER BY l.amount DESC
    LIMIT :limit
    """, nativeQuery = true)
List<Object[]> findTopLoansByStatus(
    @Param("status") String status,
    @Param("since") LocalDateTime since,
    @Param("limit") int limit);
```

### Pattern 4: Custom Repository Implementation
```java
public interface LoanRepositoryCustom {
    List<Loan> findWithDynamicFilters(LoanFilter filter);
}

@RequiredArgsConstructor
public class LoanRepositoryImpl implements LoanRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public List<Loan> findWithDynamicFilters(LoanFilter filter) {
        var cb = entityManager.getCriteriaBuilder();
        var cq = cb.createQuery(Loan.class);
        var root = cq.from(Loan.class);
        var predicates = new ArrayList<Predicate>();

        if (filter.minAmount() != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), filter.minAmount()));
        }
        if (filter.status() != null) {
            predicates.add(cb.equal(root.get("status"), filter.status()));
        }

        cq.where(predicates.toArray(new Predicate[0]));
        cq.orderBy(cb.desc(root.get("createdAt")));

        return entityManager.createQuery(cq)
            .setMaxResults(filter.limit())
            .getResultList();
    }
}
```

### Pattern 5: Bulk Operations
```java
@Modifying
@Query("UPDATE Loan l SET l.status = :newStatus WHERE l.status = :oldStatus AND l.dueDate < :date")
int bulkUpdateStatus(
    @Param("oldStatus") LoanStatus oldStatus,
    @Param("newStatus") LoanStatus newStatus,
    @Param("date") LocalDate date);

@Modifying
@Query("DELETE FROM Payment p WHERE p.loan.id = :loanId AND p.status = 'CANCELLED'")
int deleteCancelledPayments(@Param("loanId") UUID loanId);
```

## Guidelines
- Extend both `JpaRepository` and `JpaSpecificationExecutor`
- Use `@Query` with JPQL for join fetches and complex queries
- Use native queries only for performance-critical paths
- Always use `@Param` for named parameters
- Use `@Lock` for pessimistic locking scenarios
- Projections for read-only data (avoid loading full entities)
- `@Modifying` for UPDATE/DELETE queries with `clearAutomatically = true` if needed

## REJECTED Patterns

- DO NOT use JPA repositories in R2DBC variant — use `ReactiveCrudRepository` or `DatabaseClient`
- DO NOT add business logic in repositories — keep them pure data access
- DO NOT use JPQL in R2DBC variant — use native SQL via `DatabaseClient`
- DO NOT skip pagination for list queries — always use `Pageable`

---

## Related Specialists

- `data-access/r2dbc-database-client-specialist.md` — DatabaseClient patterns (19.x)
- `data-access/r2dbc-rowmapper-specialist.md` — RowMapper patterns (46.x)
- `data-access/java-data-access-specialist.md` — data access layer overview (17.x)
