# Java POJO Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Lightweight (JDBC Template)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Lightweight (JDBC Template)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive data access, see: `data-access/java-r2dbc-specialist.md`, `data-access/r2dbc-callback-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Package** | `{rootPackage}.domain.enumeration`, `{rootPackage}.domain.enums` |
| **Maven Module** | common |
| **Variant** | Lightweight (JDBC) |
| **Pattern Numbers** | 10.1–10.N |
| **Source Paths** | `{sourceRoot}/domain/enumeration/` |
| **File Count** | ~30 enums |
| **Naming Convention** | Plain Java enum/record classes |
| **Base Class** | N/A (plain Java) |
| **Imports From** | (nothing — Domain innermost) |
| **Cannot Import** | Application, Infrastructure, REST |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | entityCreation |

---

## Purpose
Generates plain Java records/POJOs for domain models without JPA annotations, optimized for JDBC mapping.

## Patterns

### Pattern 1: Domain Record
```java
public record Loan(
    UUID id,
    BigDecimal amount,
    BigDecimal interestRate,
    int durationMonths,
    LoanStatus status,
    UUID borrowerId,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public Loan {
        Objects.requireNonNull(amount, "Amount cannot be null");
        Objects.requireNonNull(status, "Status cannot be null");
        Objects.requireNonNull(borrowerId, "Borrower ID cannot be null");
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
    }

    public static Loan create(BigDecimal amount, BigDecimal interestRate,
                               int durationMonths, UUID borrowerId) {
        return new Loan(null, amount, interestRate, durationMonths,
            LoanStatus.PENDING, borrowerId, null, null);
    }
}
```

### Pattern 2: Builder Pattern for Complex Records
```java
public record User(
    UUID id,
    String email,
    String fullName,
    String passwordHash,
    UserRole role,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime lastLoginAt
) {
    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private UUID id;
        private String email;
        private String fullName;
        private String passwordHash;
        private UserRole role = UserRole.BORROWER;
        private boolean active = true;
        private LocalDateTime createdAt;
        private LocalDateTime lastLoginAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder passwordHash(String hash) { this.passwordHash = hash; return this; }
        public Builder role(UserRole role) { this.role = role; return this; }
        public Builder active(boolean active) { this.active = active; return this; }
        public Builder createdAt(LocalDateTime t) { this.createdAt = t; return this; }
        public Builder lastLoginAt(LocalDateTime t) { this.lastLoginAt = t; return this; }

        public User build() {
            return new User(id, email, fullName, passwordHash, role, active, createdAt, lastLoginAt);
        }
    }
}
```

### Pattern 3: Value Objects
```java
public record Money(BigDecimal amount, String currency) {
    public static final Money ZERO_JPY = new Money(BigDecimal.ZERO, "JPY");

    public Money {
        Objects.requireNonNull(amount);
        Objects.requireNonNull(currency);
        if (currency.length() != 3) {
            throw new IllegalArgumentException("Currency must be ISO 4217 code");
        }
    }

    public Money add(Money other) {
        assertSameCurrency(other);
        return new Money(amount.add(other.amount), currency);
    }

    public Money subtract(Money other) {
        assertSameCurrency(other);
        return new Money(amount.subtract(other.amount), currency);
    }

    public Money multiply(BigDecimal factor) {
        return new Money(amount.multiply(factor).setScale(2, RoundingMode.HALF_UP), currency);
    }

    private void assertSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Currency mismatch: %s vs %s".formatted(currency, other.currency));
        }
    }
}

public record DateRange(LocalDate start, LocalDate end) {
    public DateRange {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date must be after start date");
        }
    }

    public boolean contains(LocalDate date) {
        return !date.isBefore(start) && !date.isAfter(end);
    }

    public long days() { return ChronoUnit.DAYS.between(start, end); }
}
```

### Pattern 4: Request/Response POJOs
```java
public record CreateLoanRequest(
    UUID borrowerId,
    BigDecimal amount,
    BigDecimal interestRate,
    int durationMonths,
    String description
) {
    public Loan toDomain() {
        return Loan.create(amount, interestRate, durationMonths, borrowerId);
    }
}

public record LoanResponse(
    UUID id,
    BigDecimal amount,
    BigDecimal interestRate,
    int durationMonths,
    String status,
    String borrowerEmail,
    LocalDateTime createdAt
) {
    public static LoanResponse from(Loan loan, String borrowerEmail) {
        return new LoanResponse(
            loan.id(), loan.amount(), loan.interestRate(),
            loan.durationMonths(), loan.status().name(),
            borrowerEmail, loan.createdAt());
    }
}
```

### Pattern 5: Enum with Properties
```java
public enum LoanStatus {
    PENDING("Pending Review", false),
    APPROVED("Approved", false),
    ACTIVE("Active", true),
    OVERDUE("Overdue", true),
    COMPLETED("Completed", false),
    DEFAULTED("Defaulted", false);

    private final String displayName;
    private final boolean accruesInterest;

    LoanStatus(String displayName, boolean accruesInterest) {
        this.displayName = displayName;
        this.accruesInterest = accruesInterest;
    }

    public String getDisplayName() { return displayName; }
    public boolean accruesInterest() { return accruesInterest; }

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

## Guidelines
- Use Java `record` for all immutable data carriers
- Add compact constructors for validation
- Use static factory methods (`create()`, `from()`) over constructors
- Builder pattern only for records with 5+ fields
- Value Objects enforce invariants in constructor
- Domain records have `toDomain()`/`from()` conversion methods
- Enums carry behavior and properties relevant to business logic

## REJECTED Patterns

- DO NOT use mutable POJOs for data transfer — prefer Java records
- DO NOT add persistence annotations to POJOs — separate domain from data access
- DO NOT skip validation in constructors — enforce invariants early
- DO NOT use `null` for optional fields — use `Optional` or empty collections

---

## Related Specialists

- `domain/java-dto-specialist.md` — DTO records for service layer (5.x)
- `domain/java-domain-specialist.md` — entity classes vs POJOs (1.x)
- `application/java-mapper-specialist.md` — POJO↔entity mapping (11.x)
