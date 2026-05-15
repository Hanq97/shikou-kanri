# Java Domain Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Standard (JPA)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive patterns, see: `presentation/java-webflux-specialist.md`, `data-access/java-r2dbc-specialist.md`, `application/java-handler-specialist.md`, `presentation/java-router-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Package** | `{rootPackage}.domain.{moduleCode}` |
| **Maven Module** | common |
| **Variant** | All (Domain layer is variant-agnostic) |
| **Pattern Numbers** | 4.1–4.N |
| **Source Paths** | `{sourceRoot}/domain/{moduleCode}/` |
| **File Count** | ~100 entities |
| **Naming Convention** | `{DomainPrefix}{Type}{Entity}.java` (e.g., `CmnMCustomer.java`) |
| **Base Class** | `AbstractAuditingEntity<Long>` |
| **Imports From** | (nothing — innermost layer) |
| **Cannot Import** | Application, Infrastructure, REST |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | entityCreation |

---

## Purpose
Generates JPA entity classes with proper annotations, relationships, audit fields, and domain logic.

## Patterns

### Pattern 1: Base Entity with Audit
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
```

### Pattern 2: Entity with Relationships
```java
@Entity
@Table(name = "loans")
public class Loan extends BaseEntity {
    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private LoanStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    private User borrower;

    @OneToMany(mappedBy = "loan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Payment> payments = new ArrayList<>();

    public void addPayment(Payment payment) {
        payments.add(payment);
        payment.setLoan(this);
    }
}
```

### Pattern 3: Value Object as Embeddable
```java
@Embeddable
public record Money(
    @Column(nullable = false) BigDecimal amount,
    @Column(nullable = false, length = 3) String currency
) {
    public Money {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
    }

    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Currency mismatch");
        }
        return new Money(this.amount.add(other.amount), this.currency);
    }
}
```

### Pattern 4: Enum with Business Logic
```java
public enum LoanStatus {
    PENDING, APPROVED, ACTIVE, OVERDUE, COMPLETED, DEFAULTED;

    public boolean canTransitionTo(LoanStatus target) {
        return switch (this) {
            case PENDING -> target == APPROVED;
            case APPROVED -> target == ACTIVE;
            case ACTIVE -> target == COMPLETED || target == OVERDUE;
            case OVERDUE -> target == COMPLETED || target == DEFAULTED;
            default -> false;
        };
    }
}
```

### Pattern 5: Entity Lifecycle Callbacks
```java
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.BORROWER;

    @PrePersist
    void prePersist() {
        this.email = this.email.toLowerCase().trim();
    }

    @PreUpdate
    void preUpdate() {
        if (this.role == UserRole.ADMIN && this.email == null) {
            throw new IllegalStateException("Admin must have email");
        }
    }
}
```

## Guidelines
- Use `UUID` as primary key type with `GenerationType.UUID`
- Always extend `BaseEntity` for audit fields
- Use `FetchType.LAZY` for all `@ManyToOne` and `@OneToMany`
- Prefer Java records for Value Objects with `@Embeddable`
- Keep domain logic in entities (DDD rich domain model)
- Use `@Version` for optimistic locking
- Validate state transitions within the entity

## REJECTED Patterns

- DO NOT use JPA `@Entity` in R2DBC variant — use `@Table` from Spring Data R2DBC
- DO NOT add business logic to DTOs — domain logic belongs in entities
- DO NOT use `@ManyToOne`/`@OneToMany` — R2DBC has no join annotations (use manual SQL joins)
- DO NOT skip `AbstractAuditingEntity` base class — all entities must extend it

---

## Related Specialists

- `cross-cutting/auditing-specialist.md` — AbstractAuditingEntity base class (79.x)
- `data-access/r2dbc-callback-specialist.md` — AfterConvertCallback for persisted flag (34.x)
- `application/java-mapper-specialist.md` — entity-to-DTO mapping (11.x)
