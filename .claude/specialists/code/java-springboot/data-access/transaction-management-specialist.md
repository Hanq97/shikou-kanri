# Transaction Management Specialist — Generic
# トランザクション管理スペシャリスト — 汎用
# Chuyên Gia Quản Lý Transaction — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 84.1–84.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | Domain, Infrastructure (TransactionManager) |
| **Cannot Import** | Presentation |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose
@Transactional semantics: propagation, isolation, pitfalls, programmatic transactions, and read-only optimization.

## Patterns

### Pattern 84.1: @Transactional Basics
```java
@Service
@Transactional(readOnly = true) // Class-level default: read-only
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;

    // Inherits class-level readOnly = true
    public Optional<OrderDTO> findById(Long id) { ... }

    @Transactional // Override: read-write for mutations
    public OrderDTO createOrder(CreateOrderRequest request) { ... }

    @Transactional
    public void cancelOrder(Long id) { ... }
}
```
- `@Transactional` on **service layer ONLY** — never on controllers, never on repositories
- Class-level `readOnly = true` + method-level override for writes

### Pattern 84.2: Propagation Levels
| Propagation | Behavior | Use Case |
|-------------|----------|----------|
| `REQUIRED` (default) | Join existing or create new | Standard business operations |
| `REQUIRES_NEW` | Always create new, suspend existing | Audit logging that must persist even if parent rolls back |
| `NESTED` | Nested within existing (savepoint) | Partial rollback within larger transaction |
| `NOT_SUPPORTED` | Suspend existing, run without tx | Read-only cache lookups |
| `MANDATORY` | Must run within existing tx | Helper methods that should never be called standalone |

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void logAuditEvent(AuditEvent event) {
    // Persists even if calling transaction rolls back
    auditRepository.save(event);
}
```

### Pattern 84.3: Isolation Levels
| Isolation | Prevents | Performance | Use When |
|-----------|----------|-------------|----------|
| `READ_COMMITTED` (default) | Dirty reads | Good | Most cases |
| `REPEATABLE_READ` | Dirty + non-repeatable reads | Medium | Financial calculations |
| `SERIALIZABLE` | All anomalies | Poor | Critical consistency (rare) |

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void transferFunds(Long fromId, Long toId, BigDecimal amount) { ... }
```
- Default `READ_COMMITTED` is sufficient for 95% of cases
- Higher isolation = more locks = more contention = worse throughput

### Pattern 84.4: Common Pitfalls
| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Self-invocation** | `this.save()` bypasses proxy | Inject self or extract to another service |
| **Checked exceptions** | Don't trigger rollback by default | `@Transactional(rollbackFor = Exception.class)` |
| **Long transactions** | Lock contention, timeout | Keep transactions short; no external HTTP calls inside tx |
| **Missing @Transactional** | No transaction boundary | Always annotate service methods that modify data |
| **@Transactional on private** | Ignored — proxy-based | Must be `public` |

```java
// ❌ Self-invocation — @Transactional ignored
public void processOrder(Long id) {
    this.updateStatus(id, PROCESSING); // proxy bypassed!
}

// ✅ Fix: inject self or move to separate service
@Lazy @Autowired private OrderService self;
public void processOrder(Long id) {
    self.updateStatus(id, PROCESSING); // goes through proxy
}
```

### Pattern 84.5: Programmatic Transactions
```java
@RequiredArgsConstructor
public class BatchProcessor {
    private final TransactionTemplate txTemplate;

    public void processBatch(List<Item> items) {
        for (Item item : items) {
            txTemplate.executeWithoutResult(status -> {
                try {
                    processItem(item);
                } catch (Exception e) {
                    status.setRollbackOnly(); // rollback this item only
                    log.warn("Failed to process {}", item.getId(), e);
                }
            });
        }
    }
}
```
- Use when: per-item transactions in batch, conditional rollback, timeout per operation
- `TransactionTemplate` is thread-safe and reusable

### Pattern 84.6: Read-Only Optimization
```java
@Transactional(readOnly = true)
public List<OrderDTO> searchOrders(SearchCriteria criteria) { ... }
```
- `readOnly = true` tells Hibernate to:
  - Skip dirty checking (no snapshot comparison)
  - Set flush mode to `NEVER` (no automatic writes)
  - Hint to JDBC driver for read-only connection (connection pooling optimization)
- **Performance impact**: 10-30% improvement on read-heavy workloads

## REJECTED Patterns
- ❌ `@Transactional` on controller methods
- ❌ `@Transactional` on `private` methods (proxy ignored)
- ❌ HTTP calls inside transaction boundary
- ❌ Catching exceptions without re-throwing (hides rollback need)
- ❌ `@Transactional` on repository methods (Spring Data handles it)

## Related Specialists
- `data-access/r2dbc-transaction-specialist.md` — Reactive transactions (20.x)
- `data-access/jpa-hibernate-specialist.md` — JPA entity patterns (83.x)
- `architecture/distributed-patterns-specialist.md` — Saga for distributed tx (94.1)
