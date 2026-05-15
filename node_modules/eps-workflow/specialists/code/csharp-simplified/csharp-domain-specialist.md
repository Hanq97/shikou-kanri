# C# Domain Layer Specialist
# C# ドメイン層スペシャリスト
# Chuyên Gia Lớp Domain C#

**Role**: Domain Layer Expert for C# Simplified Clean Architecture
**Stack**: `csharp-react-mssql`
**Variant**: `simplified-clean`
**Focus**: Entities, Value Objects, Domain Validation (NO CQRS, NO MediatR)
**Patterns**: 20 domain patterns

---

## 🎯 PURPOSE

Generate domain layer code following Simplified Clean Architecture principles:
- Entities with strong encapsulation
- Immutable value objects
- Domain validation with guard clauses
- Repository interfaces (implementations in Infrastructure)
- **NO MediatR, NO CQRS, NO Domain Events**

---

## 🏗️ ARCHITECTURE CONTEXT

```
src/Domain/
├── Entities/
│   ├── BaseEntity.cs              # Abstract base with Id, timestamps
│   ├── User.cs                    # User aggregate root
│   └── Loan.cs                    # Loan entity
├── ValueObjects/
│   ├── Email.cs                   # Email value object
│   └── Money.cs                   # Money value object
└── Interfaces/
    ├── IUserRepository.cs         # Repository interface
    └── ILoanRepository.cs         # Repository interface
```

**Key Constraint**: Repository **interfaces** in Domain, **implementations** in Infrastructure.

---

## 📖 KNOWLEDGE BASE PATTERNS

### 1. Entity Base Class

```csharp
// Pattern: entity-base-class
public abstract class BaseEntity
{
    public Guid Id { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    protected BaseEntity()
    {
        Id = Guid.NewGuid();
        CreatedAt = DateTime.UtcNow;
    }

    public void MarkAsUpdated()
    {
        UpdatedAt = DateTime.UtcNow;
    }
}
```

### 2. Entity with Constructor Validation

```csharp
// Pattern: entity-constructor-validation
public class User : BaseEntity
{
    public string Email { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public string Role { get; private set; } = "user";
    public bool IsActive { get; private set; } = true;

    // Private constructor for EF Core
    private User() { }

    // Public factory method with validation
    public static User Create(string email, string name, string passwordHash, string role = "user")
    {
        Guard.Against.NullOrWhiteSpace(email, nameof(email));
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NullOrWhiteSpace(passwordHash, nameof(passwordHash));

        if (!IsValidEmail(email))
            throw new ArgumentException("Invalid email format", nameof(email));

        if (name.Length > 100)
            throw new ArgumentException("Name cannot exceed 100 characters", nameof(name));

        var user = new User
        {
            Email = email.ToLowerInvariant(),
            Name = name,
            PasswordHash = passwordHash,
            Role = role
        };

        return user;
    }

    // Business method (NOT property setter)
    public void Deactivate()
    {
        IsActive = false;
        MarkAsUpdated();
    }

    public void UpdateName(string newName)
    {
        Guard.Against.NullOrWhiteSpace(newName, nameof(newName));
        if (newName.Length > 100)
            throw new ArgumentException("Name cannot exceed 100 characters");

        Name = newName;
        MarkAsUpdated();
    }

    private static bool IsValidEmail(string email)
    {
        return email.Contains('@') && email.Length >= 5;
    }
}
```

### 3. Value Object Pattern

```csharp
// Pattern: value-object-pattern, value-object-immutability
public class Email : ValueObject
{
    public string Value { get; }

    private Email(string value)
    {
        Value = value;
    }

    public static Email Create(string value)
    {
        Guard.Against.NullOrWhiteSpace(value, nameof(value));

        if (!value.Contains('@'))
            throw new ArgumentException("Invalid email format");

        return new Email(value.ToLowerInvariant());
    }

    // Value object equality
    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Value;
    }

    // Implicit conversion
    public static implicit operator string(Email email) => email.Value;
}

// ValueObject base class
public abstract class ValueObject
{
    protected abstract IEnumerable<object> GetEqualityComponents();

    public override bool Equals(object? obj)
    {
        if (obj == null || obj.GetType() != GetType())
            return false;

        var other = (ValueObject)obj;
        return GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());
    }

    public override int GetHashCode()
    {
        return GetEqualityComponents()
            .Select(x => x?.GetHashCode() ?? 0)
            .Aggregate((x, y) => x ^ y);
    }
}
```

### 4. Money Value Object

```csharp
// Pattern: value-object-pattern with business logic
public class Money : ValueObject
{
    public decimal Amount { get; }
    public string Currency { get; }

    private Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public static Money Create(decimal amount, string currency = "USD")
    {
        if (amount < 0)
            throw new ArgumentException("Amount cannot be negative");

        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("Currency is required");

        return new Money(amount, currency.ToUpperInvariant());
    }

    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Cannot add money with different currencies");

        return new Money(Amount + other.Amount, Currency);
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }
}
```

### 5. Repository Interface in Domain

```csharp
// Pattern: repository-interface-in-domain
// ✅ Interface in Domain layer
// ❌ Implementation in Infrastructure layer
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    void Update(User user);
    void Delete(User user);
}
```

### 6. Aggregate Root with Navigation Properties

```csharp
// Pattern: aggregate-root-pattern, entity-navigation-properties
public class Loan : BaseEntity
{
    public Guid UserId { get; private set; }
    public decimal Amount { get; private set; }
    public decimal InterestRate { get; private set; }
    public string Status { get; private set; } = "pending"; // pending, approved, rejected

    // Navigation property
    public User User { get; private set; } = null!;

    private Loan() { }

    public static Loan Create(Guid userId, decimal amount, decimal interestRate)
    {
        Guard.Against.Default(userId, nameof(userId));

        if (amount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(amount));

        if (interestRate < 0 || interestRate > 100)
            throw new ArgumentException("Interest rate must be between 0 and 100", nameof(interestRate));

        var loan = new Loan
        {
            UserId = userId,
            Amount = amount,
            InterestRate = interestRate,
            Status = "pending"
        };

        return loan;
    }

    public void Approve()
    {
        if (Status != "pending")
            throw new InvalidOperationException("Only pending loans can be approved");

        Status = "approved";
        MarkAsUpdated();
    }

    public void Reject()
    {
        if (Status != "pending")
            throw new InvalidOperationException("Only pending loans can be rejected");

        Status = "rejected";
        MarkAsUpdated();
    }
}
```

### 7. Guard Clauses

```csharp
// Pattern: guard-clauses (using Ardalis.GuardClauses)
public static class Guard
{
    public static class Against
    {
        public static void NullOrWhiteSpace(string value, string parameterName)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException($"{parameterName} cannot be null or whitespace", parameterName);
        }

        public static void Default<T>(T value, string parameterName) where T : struct
        {
            if (EqualityComparer<T>.Default.Equals(value, default(T)))
                throw new ArgumentException($"{parameterName} cannot be default value", parameterName);
        }

        public static void Null<T>(T value, string parameterName) where T : class
        {
            if (value == null)
                throw new ArgumentNullException(parameterName);
        }
    }
}
```

---

## ✅ REQUIRED PATTERNS

1. **Constructor Injection**: ALWAYS use constructor for dependencies (NO field/setter injection)
2. **Private Setters**: Entity properties have private setters, modified via methods
3. **Factory Methods**: Use static `Create()` methods for entity creation
4. **Guard Clauses**: Validate all inputs with guard clauses
5. **Immutable Value Objects**: Value objects have no public setters
6. **Repository Interfaces**: Define in Domain layer, implement in Infrastructure

---

## ❌ PROHIBITED PATTERNS

1. **NO MediatR**: Do NOT use `IMediator`, `IRequest<T>`, `IRequestHandler<T, R>`
2. **NO CQRS**: Do NOT create Command/Query classes
3. **NO Domain Events**: Do NOT use `IDomainEvent`, `INotificationHandler`
4. **NO Field Injection**: Do NOT use `[Inject]` or field injection
5. **NO Data Annotations**: Do NOT use `[Table]`, `[Column]` (use Fluent API in Infrastructure)

---

## 🎯 VALIDATION RULES

- ✅ All entities inherit from `BaseEntity`
- ✅ Private constructors + public factory methods
- ✅ Guard clauses for validation
- ✅ Private setters on entity properties
- ✅ Business methods for state changes
- ✅ Repository interfaces defined in Domain
- ❌ NO MediatR references
- ❌ NO CQRS patterns
- ❌ NO Domain Events
- ❌ NO Data Annotations on entities

---

**Created**: 2025-12-30
**Patterns**: 20 domain patterns
**Lines**: ~200
**Stack**: csharp-react-mssql (simplified-clean)

*Domain Layer Specialist - Simplified Clean Architecture*
*NO CQRS | NO MediatR | Constructor Injection Only*
