# Java R2DBC Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.repository.{moduleCode}` |
| **Maven Module** | common |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 13.1–13.N |
| **Source Paths** | `{sourceRoot}/application/repository/{moduleCode}/` |
| **File Count** | ~95 repositories (triple-layer: Repository + Internal + InternalImpl) |
| **Naming Convention** | `{Entity}Repository.java`, `{Entity}RepositoryInternal.java`, `{Entity}RepositoryInternalImpl.java` |
| **Base Class** | `ReactiveCrudRepository<T, Long>` |
| **Imports From** | Domain (Entities) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess, asyncPattern |

---

## Purpose
Generates reactive database access using R2DBC with Spring Data R2DBC repositories and DatabaseClient.

## Patterns

### Pattern 1: R2DBC Repository
```java
@Repository
public interface LoanRepository extends ReactiveCrudRepository<Loan, UUID> {

    Flux<Loan> findByStatus(LoanStatus status);

    Flux<Loan> findByBorrowerIdOrderByCreatedAtDesc(UUID borrowerId);

    @Query("SELECT * FROM loans WHERE status = :status AND amount >= :minAmount ORDER BY created_at DESC LIMIT :limit")
    Flux<Loan> findByStatusAndMinAmount(
        @Param("status") String status,
        @Param("minAmount") BigDecimal minAmount,
        @Param("limit") int limit);

    @Query("SELECT COUNT(*) FROM loans WHERE borrower_id = :borrowerId AND status IN (:statuses)")
    Mono<Long> countByBorrowerIdAndStatuses(
        @Param("borrowerId") UUID borrowerId,
        @Param("statuses") Collection<String> statuses);

    @Modifying
    @Query("UPDATE loans SET status = :newStatus, updated_at = NOW() WHERE id = :id AND status = :expectedStatus")
    Mono<Integer> updateStatusConditional(
        @Param("id") UUID id,
        @Param("expectedStatus") String expectedStatus,
        @Param("newStatus") String newStatus);
}
```

### Pattern 2: DatabaseClient for Complex Queries
```java
@Repository
@RequiredArgsConstructor
public class LoanSearchRepository {
    private final DatabaseClient databaseClient;

    public Flux<Loan> search(LoanSearchCriteria criteria) {
        var sql = new StringBuilder("SELECT * FROM loans WHERE 1=1");
        var binds = new HashMap<String, Object>();

        if (criteria.status() != null) {
            sql.append(" AND status = :status");
            binds.put("status", criteria.status().name());
        }
        if (criteria.minAmount() != null) {
            sql.append(" AND amount >= :minAmount");
            binds.put("minAmount", criteria.minAmount());
        }
        if (criteria.borrowerId() != null) {
            sql.append(" AND borrower_id = :borrowerId");
            binds.put("borrowerId", criteria.borrowerId());
        }

        sql.append(" ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        binds.put("limit", criteria.limit());
        binds.put("offset", criteria.offset());

        var spec = databaseClient.sql(sql.toString());
        binds.forEach(spec::bind);

        return spec.map((row, metadata) -> new Loan(
                row.get("id", UUID.class),
                row.get("amount", BigDecimal.class),
                row.get("interest_rate", BigDecimal.class),
                row.get("duration_months", Integer.class),
                LoanStatus.valueOf(row.get("status", String.class)),
                row.get("borrower_id", UUID.class),
                row.get("created_at", LocalDateTime.class),
                row.get("updated_at", LocalDateTime.class)
            )).all();
    }
}
```

### Pattern 3: R2DBC Entity Mapping
```java
@Table("loans")
public class Loan {
    @Id
    private UUID id;

    @Column("amount")
    private BigDecimal amount;

    @Column("interest_rate")
    private BigDecimal interestRate;

    @Column("duration_months")
    private int durationMonths;

    @Column("status")
    private LoanStatus status;

    @Column("borrower_id")
    private UUID borrowerId;

    @CreatedDate
    @Column("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column("updated_at")
    private LocalDateTime updatedAt;

    // Getters and setters
}

@Configuration
@EnableR2dbcAuditing
public class R2dbcConfig extends AbstractR2dbcConfiguration {
    @Override
    public ConnectionFactory connectionFactory() {
        return ConnectionFactories.get("r2dbc:postgresql://localhost:5432/${DATABASE_NAME}");
    }

    @Bean
    public ReactiveAuditorAware<String> auditorAware() {
        return () -> ReactiveSecurityContextHolder.getContext()
            .map(ctx -> ctx.getAuthentication().getName())
            .defaultIfEmpty("system");
    }
}
```

### Pattern 4: Transactional Reactive Operations
```java
@Service
@RequiredArgsConstructor
public class LoanService {
    private final LoanRepository loanRepository;
    private final PaymentRepository paymentRepository;
    private final TransactionalOperator transactionalOperator;

    public Mono<LoanResponse> createLoanWithSchedule(CreateLoanRequest request) {
        return transactionalOperator.transactional(
            loanRepository.save(request.toEntity())
                .flatMap(loan -> {
                    var payments = generateSchedule(loan);
                    return paymentRepository.saveAll(payments)
                        .collectList()
                        .thenReturn(loan);
                })
                .map(LoanMapper::toResponse)
        );
    }

    public Mono<Void> transferAndComplete(UUID loanId, UUID fromAccount, UUID toAccount) {
        return transactionalOperator.transactional(
            loanRepository.findById(loanId)
                .flatMap(loan -> {
                    loan.setStatus(LoanStatus.COMPLETED);
                    return loanRepository.save(loan);
                })
                .then()
        );
    }
}
```

### Pattern 5: Reactive Connection Pool Config
```java
@Configuration
public class R2dbcPoolConfig {
    @Bean
    public ConnectionFactory connectionFactory(R2dbcProperties properties) {
        return ConnectionFactoryBuilder.of(properties)
            .configure(options -> options
                .option(PoolingConnectionFactoryProvider.MAX_SIZE, 20)
                .option(PoolingConnectionFactoryProvider.INITIAL_SIZE, 5)
                .option(PoolingConnectionFactoryProvider.MAX_IDLE_TIME, Duration.ofMinutes(5))
                .option(PoolingConnectionFactoryProvider.MAX_LIFE_TIME, Duration.ofMinutes(30))
                .option(PoolingConnectionFactoryProvider.ACQUIRE_RETRY, 3))
            .build();
    }

    @Bean
    public R2dbcCustomConversions r2dbcCustomConversions(ConnectionFactory factory) {
        var dialect = DialectResolver.getDialect(factory);
        var converters = List.of(
            new LoanStatusReadConverter(),
            new LoanStatusWriteConverter()
        );
        return R2dbcCustomConversions.of(dialect, converters);
    }
}

@ReadingConverter
public class LoanStatusReadConverter implements Converter<String, LoanStatus> {
    @Override
    public LoanStatus convert(String source) {
        return LoanStatus.valueOf(source);
    }
}
```

## Guidelines
- Use `ReactiveCrudRepository` for basic CRUD
- Use `DatabaseClient` for dynamic/complex queries
- Use `@Table` and `@Column` annotations (not JPA annotations)
- Wrap multi-statement operations with `TransactionalOperator`
- Configure connection pool sizes for production
- Register custom converters for enum and value types
- Use `@EnableR2dbcAuditing` for automatic timestamps
- Never call `.block()` in reactive chains

## REJECTED Patterns

- DO NOT use JPA annotations (`@Entity`, `@ManyToOne`) — R2DBC uses `@Table`, `@Column`
- DO NOT call `.block()` on repository results — keep reactive chain
- DO NOT skip `@EnableR2dbcAuditing` — required for timestamp auto-population
- DO NOT use `@GeneratedValue` — R2DBC uses database-side sequences

---

## Related Specialists

- `data-access/r2dbc-database-client-specialist.md` — DatabaseClient for complex queries (19.x)
- `data-access/r2dbc-connection-specialist.md` — connection pool configuration (18.x)
- `data-access/r2dbc-transaction-specialist.md` — transaction management (20.x)
