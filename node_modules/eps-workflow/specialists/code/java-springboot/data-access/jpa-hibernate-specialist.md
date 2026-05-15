# JPA/Hibernate Specialist — Generic
# JPA/Hibernateスペシャリスト — 汎用
# Chuyên Gia JPA/Hibernate — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Domain |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 83.1–83.8 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `{Entity}.java`, `{Entity}Repository.java` |
| **Base Class** | N/A |
| **Imports From** | Domain |
| **Cannot Import** | Presentation |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess |

---

## Purpose
JPA entity design, relationship mapping, fetch strategies, N+1 prevention, Specifications, and Hibernate performance tuning.

## Patterns

### Pattern 83.1: Entity Mapping
```java
@Entity
@Table(name = "orders", indexes = @Index(name = "idx_order_status", columnList = "status"))
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String customerName;

    @Enumerated(EnumType.STRING) // NEVER ORDINAL
    @Column(nullable = false)
    private OrderStatus status;

    @Embedded
    private Money totalAmount;
}
```
- Always explicit `@Table`, `@Column` — don't rely on defaults
- `@Enumerated(STRING)` — ordinal breaks when enum order changes
- `@Embedded`/`@Embeddable` for value objects

### Pattern 83.2: Relationship Mapping
```java
// ✅ Bidirectional @OneToMany with helper methods
@Entity
public class Order {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<OrderItem> items = new HashSet<>(); // Set, not List

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }
    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }
}

@Entity
public class OrderItem {
    @ManyToOne(fetch = FetchType.LAZY) // ALWAYS LAZY
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
}
```
- `mappedBy` on inverse side (the "one" in OneToMany)
- `orphanRemoval = true` deletes unreferenced children
- Use `Set` not `List` for `@ManyToMany` to avoid duplicates

### Pattern 83.3: Fetch Strategy
- **Default ALL to LAZY** — override `@ManyToOne`/`@OneToOne` (JPA defaults EAGER)
```java
@ManyToOne(fetch = FetchType.LAZY) // Override JPA EAGER default
private Customer customer;
```
- Disable open-in-view: `spring.jpa.open-in-view=false`
- `@BatchSize(size = 20)` on collections for batch fetching

### Pattern 83.4: N+1 Prevention
```java
// ✅ JOIN FETCH in JPQL
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.status = :status")
List<Order> findByStatusWithItems(@Param("status") OrderStatus status);

// ✅ @EntityGraph — named or ad-hoc
@EntityGraph(attributePaths = {"items", "customer"})
List<Order> findByStatus(OrderStatus status);

// ✅ DTO projection — best for read-only
@Query("SELECT new com.example.dto.OrderSummary(o.id, o.status, COUNT(i)) " +
       "FROM Order o LEFT JOIN o.items i GROUP BY o.id, o.status")
List<OrderSummary> findOrderSummaries();
```

### Pattern 83.5: Entity Design Best Practices
```java
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Order {
    // equals/hashCode on business key, NOT generated ID
    @NaturalId
    @Column(unique = true, nullable = false)
    private String orderNumber;

    @Version // Optimistic locking
    private Long version;

    @CreatedDate private Instant createdAt;
    @LastModifiedDate private Instant updatedAt;

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Order other && orderNumber.equals(other.orderNumber));
    }
    @Override
    public int hashCode() { return Objects.hash(orderNumber); }

    @Override
    public String toString() {
        return "Order{id=%d, orderNumber='%s'}".formatted(id, orderNumber);
        // ⚠️ NEVER include lazy collections in toString
    }
}
```

### Pattern 83.6: JPA Specifications (Dynamic Queries)
```java
public class OrderSpecifications {
    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
    public static Specification<Order> createdAfter(LocalDate date) {
        return (root, query, cb) -> cb.greaterThan(root.get("createdAt"), date);
    }
}
// Usage: compose dynamically
orderRepository.findAll(hasStatus(ACTIVE).and(createdAfter(lastMonth)), pageable);
```

### Pattern 83.7: Hibernate Performance
- Batch inserts: `spring.jpa.properties.hibernate.jdbc.batch_size=50`
- `StatelessSession` for bulk operations (skip dirty checking, caching)
- Second-level cache: `@Cacheable` on entities, configure with Caffeine/Redis
- `hibernate.order_inserts=true` + `hibernate.order_updates=true`

### Pattern 83.8: Repository Patterns
```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    boolean existsByOrderNumber(String orderNumber); // prefer over findBy for existence
    Optional<Order> findByOrderNumber(String orderNumber); // Optional for single result
    @Modifying @Query("UPDATE Order o SET o.status = :status WHERE o.id IN :ids")
    int bulkUpdateStatus(@Param("ids") List<Long> ids, @Param("status") OrderStatus status);
}
```

## REJECTED Patterns
- ❌ `FetchType.EAGER` on any relationship
- ❌ `spring.jpa.open-in-view=true` in production
- ❌ `equals/hashCode` on generated `@Id` field
- ❌ Lazy collections in `toString()`
- ❌ `@Enumerated(EnumType.ORDINAL)`
- ❌ `List` for `@ManyToMany` — use `Set`
- ❌ `ddl-auto: create` or `update` in production

## Related Specialists
- `data-access/r2dbc-database-client-specialist.md` — R2DBC alternative (19.x)
- `data-access/transaction-management-specialist.md` — @Transactional patterns (84.x)
- `domain/java-domain-specialist.md` — Project-specific entity design (1.x)
