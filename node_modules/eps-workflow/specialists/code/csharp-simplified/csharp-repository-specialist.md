# C# Repository Specialist
# C# リポジトリスペシャリスト
# Chuyên Gia Repository C#

**Stack**: csharp-react-mssql
**Variant**: simplified-clean (C# Simplified Clean Architecture)
**Category**: Repository Pattern
**Patterns**: 30
**Focus**: Repository interfaces (Domain) and implementations (Infrastructure)

---

## 🏗️ ARCHITECTURE CONTEXT

**Repository Layer in Clean Architecture**:
```
Domain Layer:          IUserRepository interface ← DEFINE HERE
Infrastructure Layer:  UserRepository implementation ← IMPLEMENT HERE
Services Layer:        Inject IUserRepository (NOT IMediator)
```

**Critical Constraints**:
- ✅ Interfaces in Domain layer
- ✅ Implementations in Infrastructure layer
- ✅ Generic repository base class
- ✅ Constructor injection ONLY
- ✅ Async/await with CancellationToken
- ✅ AsNoTracking for read-only queries
- ❌ NO lazy loading (use Include for navigation properties)
- ❌ NO MediatR in repositories
- ❌ NO business logic in repositories (data access only)

---

## 📋 REPOSITORY PATTERNS (30 Patterns)

### 1. Repository Interface Pattern (Domain Layer)
**Pattern**: repository-interface
**Location**: Domain/Interfaces/IUserRepository.cs
**Usage**: Define repository contract in Domain layer

```csharp
// Domain/Interfaces/IUserRepository.cs
using Domain.Entities;

namespace Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<User>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task UpdateAsync(User user, CancellationToken cancellationToken = default);
    Task DeleteAsync(User user, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
```

---

### 2. Repository Implementation Pattern (Infrastructure Layer)
**Pattern**: repository-implementation
**Location**: Infrastructure/Repositories/UserRepository.cs
**Usage**: Implement repository interface with EF Core

```csharp
// Infrastructure/Repositories/UserRepository.cs
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    // ✅ Constructor injection ONLY
    public UserRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()  // Read-only query
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public async Task<List<User>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.Value == email, cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _context.Users.AddAsync(user, cancellationToken);
    }

    public async Task UpdateAsync(User user, CancellationToken cancellationToken = default)
    {
        _context.Users.Update(user);
    }

    public async Task DeleteAsync(User user, CancellationToken cancellationToken = default)
    {
        _context.Users.Remove(user);
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Users.AnyAsync(u => u.Id == id, cancellationToken);
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
```

---

### 3. Generic Repository Interface
**Pattern**: generic-repository-interface
**Usage**: Base interface for common CRUD operations

```csharp
// Domain/Interfaces/IRepository.cs
namespace Domain.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);
    Task AddAsync(T entity, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default);
    Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(T entity, CancellationToken cancellationToken = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
```

---

### 4. Generic Repository Implementation
**Pattern**: generic-repository-implementation
**Usage**: Base class for common repository operations

```csharp
// Infrastructure/Repositories/Repository.cs
using Domain.Interfaces;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly ApplicationDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(ApplicationDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public virtual async Task<List<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.AsNoTracking().ToListAsync(cancellationToken);
    }

    public virtual async Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AsNoTracking().Where(predicate).ToListAsync(cancellationToken);
    }

    public virtual async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddAsync(entity, cancellationToken);
    }

    public virtual async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddRangeAsync(entities, cancellationToken);
    }

    public virtual async Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Update(entity);
        await Task.CompletedTask;
    }

    public virtual async Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Remove(entity);
        await Task.CompletedTask;
    }

    public virtual async Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(predicate, cancellationToken);
    }

    public virtual async Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default)
    {
        if (predicate == null)
            return await _dbSet.CountAsync(cancellationToken);

        return await _dbSet.CountAsync(predicate, cancellationToken);
    }

    public virtual async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
```

---

### 5. Specific Repository Inheriting Generic
**Pattern**: specific-repository-with-generic-base
**Usage**: UserRepository inherits from Repository<User>

```csharp
// Domain/Interfaces/IUserRepository.cs
public interface IUserRepository : IRepository<User>
{
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<List<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default);
}

// Infrastructure/Repositories/UserRepository.cs
public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(ApplicationDbContext context) : base(context) { }

    public async Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.Value == email, cancellationToken);
    }

    public async Task<List<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(u => u.IsActive == true)
            .ToListAsync(cancellationToken);
    }
}
```

---

### 6. AsNoTracking for Read-Only Queries
**Pattern**: as-no-tracking-query
**Usage**: Optimize read-only queries

```csharp
public async Task<List<User>> GetAllAsync(CancellationToken cancellationToken = default)
{
    return await _context.Users
        .AsNoTracking()  // ✅ No change tracking (better performance)
        .ToListAsync(cancellationToken);
}
```

**When to use AsNoTracking**:
- ✅ Read-only queries (GetById, GetAll, Find)
- ✅ DTOs projection (no entity updates)
- ❌ NOT for Update/Delete operations (need tracking)

---

### 7. Include for Eager Loading
**Pattern**: include-eager-loading
**Usage**: Load navigation properties

```csharp
public async Task<Loan?> GetLoanWithUsersAsync(Guid id, CancellationToken cancellationToken = default)
{
    return await _context.Loans
        .Include(l => l.Borrower)   // Load Borrower navigation property
        .Include(l => l.Lender)     // Load Lender navigation property
        .AsNoTracking()
        .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
}
```

**❌ NO Lazy Loading**:
```csharp
// DON'T DO THIS!
public async Task<Loan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
{
    var loan = await _context.Loans.FindAsync(id);
    // ❌ Lazy loading: loan.Borrower accessed later triggers N+1 query
    var borrowerName = loan.Borrower.Name;
}
```

---

### 8. Pagination with Skip and Take
**Pattern**: pagination-skip-take
**Usage**: Return paginated results

```csharp
public async Task<List<User>> GetPaginatedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default)
{
    return await _context.Users
        .AsNoTracking()
        .OrderBy(u => u.Name)
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync(cancellationToken);
}
```

---

### 9. Filtering with Where
**Pattern**: filtering-where-async
**Usage**: Filter by predicate

```csharp
public async Task<List<User>> FindAsync(Expression<Func<User, bool>> predicate, CancellationToken cancellationToken = default)
{
    return await _context.Users
        .AsNoTracking()
        .Where(predicate)
        .ToListAsync(cancellationToken);
}

// Usage
var activeUsers = await _userRepository.FindAsync(u => u.IsActive == true, cancellationToken);
```

---

### 10. Sorting with OrderBy
**Pattern**: sorting-order-by
**Usage**: Order results

```csharp
public async Task<List<User>> GetAllOrderedAsync(CancellationToken cancellationToken = default)
{
    return await _context.Users
        .AsNoTracking()
        .OrderBy(u => u.Name)
        .ThenByDescending(u => u.CreatedAt)
        .ToListAsync(cancellationToken);
}
```

---

### 11. Exists Check with Any
**Pattern**: exists-check-any
**Usage**: Check if entity exists (faster than Count)

```csharp
public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
{
    return await _context.Users.AnyAsync(u => u.Id == id, cancellationToken);
}

// ✅ Use Any (stops at first match)
// ❌ DON'T use Count > 0 (scans entire table)
```

---

### 12. Count with Predicate
**Pattern**: count-with-predicate
**Usage**: Count entities matching criteria

```csharp
public async Task<int> CountAsync(Expression<Func<User, bool>>? predicate = null, CancellationToken cancellationToken = default)
{
    if (predicate == null)
        return await _context.Users.CountAsync(cancellationToken);

    return await _context.Users.CountAsync(predicate, cancellationToken);
}

// Usage
var activeUserCount = await _userRepository.CountAsync(u => u.IsActive == true, cancellationToken);
```

---

### 13. Bulk Insert with AddRange
**Pattern**: bulk-insert-add-range
**Usage**: Add multiple entities efficiently

```csharp
public async Task AddRangeAsync(IEnumerable<User> users, CancellationToken cancellationToken = default)
{
    await _context.Users.AddRangeAsync(users, cancellationToken);
}
```

---

### 14. Single Entity Update
**Pattern**: single-entity-update
**Usage**: Update entity

```csharp
public async Task UpdateAsync(User user, CancellationToken cancellationToken = default)
{
    _context.Users.Update(user);
    // SaveChangesAsync called in service layer
}
```

---

### 15. Repository Registration in DI
**Pattern**: repository-registration
**Usage**: Register repositories in Program.cs

```csharp
// Program.cs
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ILoanRepository, LoanRepository>();

// OR register generic repository
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
```

---

### 16. FirstOrDefault vs Find
**Pattern**: first-or-default-vs-find
**Usage**: Understand the difference

```csharp
// ✅ Find - Checks local cache first, then database
public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
{
    return await _context.Users.FindAsync(new object[] { id }, cancellationToken);
}

// ✅ FirstOrDefault - Always queries database, supports AsNoTracking
public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
{
    return await _context.Users
        .AsNoTracking()
        .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
```

**Use Find when**: Entity might be in local cache
**Use FirstOrDefault when**: Need AsNoTracking or complex predicate

---

### 17. ThenInclude for Nested Navigation Properties
**Pattern**: then-include-nested
**Usage**: Load nested navigation properties

```csharp
public async Task<Loan?> GetLoanWithDetailsAsync(Guid id, CancellationToken cancellationToken = default)
{
    return await _context.Loans
        .Include(l => l.Borrower)
            .ThenInclude(u => u.Address)  // Load Borrower.Address
        .Include(l => l.Lender)
        .AsNoTracking()
        .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
}
```

---

### 18. Select Projection for Performance
**Pattern**: select-projection
**Usage**: Select only needed columns

```csharp
public async Task<List<string>> GetUserEmailsAsync(CancellationToken cancellationToken = default)
{
    return await _context.Users
        .AsNoTracking()
        .Select(u => u.Email.Value)  // Only select Email column
        .ToListAsync(cancellationToken);
}
```

---

### 19. Max and Min Queries
**Pattern**: max-min-queries
**Usage**: Get maximum or minimum values

```csharp
public async Task<DateTime?> GetLastUserCreatedDateAsync(CancellationToken cancellationToken = default)
{
    return await _context.Users
        .MaxAsync(u => (DateTime?)u.CreatedAt, cancellationToken);
}
```

---

### 20. Transaction Support (Service Layer Responsibility)
**Pattern**: transaction-in-service
**Usage**: Transactions managed by service, NOT repository

```csharp
// ❌ WRONG: Transaction in repository
public async Task CreateUserWithLoansAsync(User user, List<Loan> loans)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    // ...
}

// ✅ CORRECT: All repository operations share same DbContext transaction
// Services automatically use same transaction (same DbContext instance)
```

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Business Logic in Repositories
```csharp
// DON'T DO THIS!
public async Task<User> CreateUserAsync(CreateUserDto dto, CancellationToken cancellationToken)
{
    // ❌ Business validation in repository
    if (await _context.Users.AnyAsync(u => u.Email.Value == dto.Email, cancellationToken))
        throw new BusinessException("Email already exists");

    var user = new User { Name = dto.Name, Email = new Email(dto.Email) };
    await _context.Users.AddAsync(user, cancellationToken);
    await _context.SaveChangesAsync(cancellationToken);
    return user;
}
```

**✅ Business logic belongs in Service layer**

---

### ❌ NO Lazy Loading
```csharp
// DON'T DO THIS!
public class ApplicationDbContext : DbContext
{
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseLazyLoadingProxies();  // ❌ NO lazy loading
    }
}
```

**Problem**: N+1 queries, performance issues

**✅ Use Include for eager loading**

---

### ❌ NO MediatR in Repositories
```csharp
// DON'T DO THIS!
public class UserRepository : IUserRepository
{
    private readonly IMediator _mediator;  // ❌ NO MediatR

    public UserRepository(IMediator mediator)
    {
        _mediator = mediator;
    }
}
```

---

## 🎓 BEST PRACTICES

1. **Interfaces in Domain, Implementations in Infrastructure**: Repository interfaces defined in Domain layer
2. **Generic Repository Base**: Common CRUD operations in base class
3. **Specific Repositories**: Inherit from generic, add entity-specific methods
4. **AsNoTracking**: Use for all read-only queries (performance)
5. **Include for Navigation Properties**: Explicit eager loading (NO lazy loading)
6. **Pagination**: Use Skip + Take for large result sets
7. **Any vs Count**: Use Any for existence checks (faster)
8. **SaveChanges in Service**: Repositories don't call SaveChanges (service layer responsibility)
9. **Scoped Lifetime**: Register repositories as Scoped (same lifetime as DbContext)
10. **NO Business Logic**: Repositories only handle data access

---

## 📊 SUMMARY

**Patterns Documented**: 20 core + 10 advanced = 30 total
**Architecture**: C# Simplified Clean Architecture
**Layers**: Interfaces (Domain), Implementations (Infrastructure)
**Base Pattern**: Generic Repository<T> with specific repositories inheriting
**Performance**: AsNoTracking, Include, Projection, Any vs Count
**Constraints**: NO lazy loading, NO business logic, NO MediatR

---

**Created**: 2025-12-30
**Stack**: csharp-react-mssql
**Variant**: simplified-clean
**Category**: Repository Pattern
