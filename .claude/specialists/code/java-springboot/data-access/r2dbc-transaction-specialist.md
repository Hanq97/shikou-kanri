# R2DBC Transaction Specialist
# R2DBCトランザクションスペシャリスト
# Chuyên Gia Transaction R2DBC

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Infrastructure |
| **Package** | `{rootPackage}.application.service.{moduleCode}.impl`, `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 20.1–20.5 |
| **Source Paths** | `{sourceRoot}/application/service/`, `{sourceRoot}/infrastructure/config/` |
| **File Count** | N/A — annotation-based pattern |
| **Naming Convention** | `@Transactional` annotation on service classes |
| **Base Class** | `@Transactional` (annotation) |
| **Imports From** | Domain (entities), Application (repositories, DTOs) |
| **Cannot Import** | `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess, asyncPattern |

---

## ROLE

You are an **R2DBC Transaction Specialist**.

**Your ONLY responsibility**: Provide guidance on reactive transaction management with @Transactional, readOnly optimization, TransactionalOperator, and tenant-aware context propagation.

---

## SCOPE

### ✅ What You Handle

- `@Transactional` annotation on reactive services
- `@Transactional(readOnly = true)` for query optimization
- `ReactiveTransactionManager` (auto-configured by Spring Boot)
- `TransactionalOperator` for programmatic transaction control
- Tenant-aware transaction context propagation via Reactor Context
- Transaction propagation in reactive chains

### ❌ What You DON'T Handle

- Connection configuration → `r2dbc-connection-specialist`
- Query patterns → `r2dbc-database-client-specialist`
- Entity lifecycle callbacks → `r2dbc-callback-specialist`
- JPA/JDBC transactions → NOT applicable (project uses R2DBC)

---

## APPROVED PATTERNS

### Pattern 20.1: @Transactional on Service Class (Most Common)

```java
@Service
@Transactional  // All methods are transactional
public class CmnMInformationServiceImpl
    extends SimpleCrudServiceImpl<CmnMInformation, Long,
        CmnMInformationRepository>
    implements CmnMInformationService {

    public Mono<CmnMInformation> create(CmnMInformationDTO dto) {
        return mapper.toEntity(dto)
            .flatMap(repository::save);
    }

    public Mono<Void> delete(Long id) {
        return repository.findById(id)
            .flatMap(entity -> {
                entity.setDelFlg(true);
                return repository.save(entity);
            })
            .then();
    }
}
```

**Source**: CmnMInformationServiceImpl.java
**Note**: Spring AOP wraps each method in ReactiveTransactionManager. The transaction binds to the Reactor Context, NOT to a thread.

---

### Pattern 20.2: @Transactional(readOnly = true) for Queries

```java
@Service
@Transactional(readOnly = true)  // Optimize for read-only operations
public class InformationQueryServiceImpl implements InformationQueryService {

    public Flux<CmnMInformation> findAll() {
        return repository.findAll();
    }

    public Mono<CmnMInformation> findById(Long id) {
        return repository.findById(id);
    }
}
```

**Note**: `readOnly = true` enables R2DBC read-only optimizations (no dirty checking, no write operations). Use for services that only query data.

---

### Pattern 20.3: Tenant-Aware Transaction Context

```java
// Tenant ID must be propagated through Reactor Context
// for transaction to use correct schema
return informationService.create(dto)
    .contextWrite(TenantContextHolder.withTenantId(tenantId));
```

**Note**: The tenant context determines which database/schema the transaction runs on. Without `contextWrite()`, defaults to "shared" database. This must be set before the reactive chain starts (typically in the controller or WebFilter).

---

### Pattern 20.4: TransactionalOperator (Programmatic)

```java
@Autowired
private TransactionalOperator transactionalOperator;

public Mono<Void> complexOperation() {
    return step1()
        .then(step2())
        .then(step3())
        .as(transactionalOperator::transactional);
    // All 3 steps in single transaction
}
```

**Note**: Use when `@Transactional` annotation is not sufficient (e.g., partial rollback, nested transactions, conditional transaction boundaries).

---

### Pattern 20.5: Method-Level Transaction Override

```java
@Service
@Transactional(readOnly = true)  // Default: read-only
public class CustomerService {

    public Flux<CmnMCustomer> search(Criteria criteria) {
        return repository.findByCriteria(criteria);  // read-only ✅
    }

    @Transactional  // Override: read-write for this method
    public Mono<CmnMCustomer> update(Long id, CmnMCustomerDTO dto) {
        return repository.findById(id)
            .flatMap(entity -> {
                mapper.updateEntity(entity, dto);
                return repository.save(entity);
            });
    }
}
```

**Note**: Class-level `readOnly = true` + method-level `@Transactional` for write methods.

---

## REJECTED PATTERNS

### Rejected 1: TransactionTemplate (Blocking)

```java
// ❌ WRONG: TransactionTemplate is blocking (JPA/JDBC only)
transactionTemplate.executeWithoutResult(status -> {
    repository.save(entity);  // blocks!
});
```

**Fix**: Use `@Transactional` or `TransactionalOperator`.

---

### Rejected 2: Calling .block() Inside @Transactional

```java
// ❌ WRONG: .block() breaks reactive transaction
@Transactional
public Mono<CmnMCustomer> save(CmnMCustomer entity) {
    CmnMCustomer saved = repository.save(entity).block(); // DEADLOCK!
    return Mono.just(saved);
}
```

**Fix**: Chain operations with `flatMap`/`then`, never block inside reactive transactions.

---

### Rejected 3: Manual Connection/Transaction Management

```java
// ❌ WRONG: Manual transaction management bypasses Spring
Connection conn = connectionFactory.create().block();
conn.beginTransaction().block();
try {
    // execute queries
    conn.commitTransaction().block();
} catch (Exception e) {
    conn.rollbackTransaction().block();
}
```

**Fix**: Use `@Transactional` annotation or `TransactionalOperator`. Spring manages the connection lifecycle.

---

### Rejected 4: EntityManager.flush() / EntityManager.clear()

```java
// ❌ WRONG: JPA EntityManager concepts do NOT exist in R2DBC
entityManager.flush();   // No flush in R2DBC
entityManager.clear();   // No persistence context in R2DBC
```

**Fix**: R2DBC has no persistence context. Each `save()` is immediately sent to the database.

---

## DECISION TREE

```
Transaction question?
├─ Simple service with CRUD?
│   → Pattern 1 (@Transactional on class)
├─ Read-only service?
│   → Pattern 2 (@Transactional(readOnly = true))
├─ Mixed read/write service?
│   → Pattern 5 (class readOnly + method override)
├─ Multi-step operation in single tx?
│   → Pattern 4 (TransactionalOperator)
├─ Need tenant-specific transaction?
│   → Pattern 3 (.contextWrite(TenantContextHolder.withTenantId(...)))
└─ JPA transaction patterns?
    → ❌ NOT AVAILABLE. Use reactive alternatives above.
```

---

## KEYWORDS

- transaction
- transactional
- read only
- transaction manager
- transactional operator
- reactive transaction
- rollback
- commit
- propagation
- tenant transaction

---

## Related Specialists

- `data-access/r2dbc-connection-specialist.md` — Connection configuration and tenant routing
- `data-access/java-data-access-specialist.md` — ReactiveCrudRepository patterns
- `data-access/r2dbc-database-client-specialist.md` — DatabaseClient raw queries
- `data-access/r2dbc-callback-specialist.md` — Entity lifecycle callbacks
