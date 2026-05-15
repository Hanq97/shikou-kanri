# C# Service Layer Specialist
# C# サービスレイヤースペシャリスト
# Chuyên Gia Lớp Dịch Vụ C#

**Stack**: csharp-react-mssql
**Variant**: simplified-clean (C# Simplified Clean Architecture)
**Category**: Service Layer
**Patterns**: 30
**Focus**: Business logic implementation without CQRS or MediatR

---

## 🏗️ ARCHITECTURE CONTEXT

**C# 3-Layer Clean Architecture**:
```
Domain Layer:         Entities, Value Objects, Repository interfaces
Services Layer:       Business logic, DTOs, Service interfaces/implementations ← WE ARE HERE
Infrastructure Layer: DbContext, Repository implementations, Migrations
WebAPI Layer:         Controllers, Middleware, Program.cs
```

**Critical Constraints**:
- ❌ NO CQRS (No Command/Query separation)
- ❌ NO MediatR (No IMediator, IRequest, IRequestHandler)
- ❌ NO Domain Events
- ❌ NO Field Injection
- ✅ Constructor Injection ONLY
- ✅ Services inject IRepository (NOT IMediator)
- ✅ Async/await with CancellationToken
- ✅ Business validation in services
- ✅ Custom exceptions (BusinessException, NotFoundException)

---

## 📋 SERVICE LAYER PATTERNS (30 Patterns)

### 1. Service Interface Pattern
**Pattern**: service-interface-pattern
**Usage**: Define service contract in Services/Interfaces

```csharp
// Services/Interfaces/IUserService.cs
namespace Services.Interfaces;

public interface IUserService
{
    Task<UserDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<UserDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken cancellationToken = default);
    Task<UserDto> UpdateAsync(Guid id, UpdateUserDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
```

---

### 2. Service Implementation Pattern
**Pattern**: service-implementation-pattern
**Usage**: Implement business logic with constructor injection

```csharp
// Services/Implementations/UserService.cs
using Domain.Interfaces;
using Services.Interfaces;
using AutoMapper;

namespace Services.Implementations;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    // ✅ Constructor injection ONLY (NO field injection)
    public UserService(IUserRepository userRepository, IMapper mapper)
    {
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<UserDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(id, cancellationToken);
        if (user == null)
            throw new NotFoundException($"User with ID {id} not found");

        return _mapper.Map<UserDto>(user);
    }

    // ... other methods
}
```

**❌ WRONG - Field Injection**:
```csharp
// DON'T DO THIS!
public class UserService : IUserService
{
    [Inject]  // ❌ NO field injection
    private IUserRepository _userRepository;
}
```

---

### 3. Async Service Methods
**Pattern**: async-service-methods
**Usage**: All service methods must be async with CancellationToken

```csharp
public async Task<List<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
{
    var users = await _userRepository.GetAllAsync(cancellationToken);
    return _mapper.Map<List<UserDto>>(users);
}
```

---

### 4. Business Validation in Service
**Pattern**: business-validation-in-service
**Usage**: Validate business rules before persistence

```csharp
public async Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken cancellationToken = default)
{
    // Business validation: Check email uniqueness
    var existingUser = await _userRepository.FindByEmailAsync(dto.Email, cancellationToken);
    if (existingUser != null)
        throw new BusinessException($"User with email {dto.Email} already exists");

    var user = _mapper.Map<User>(dto);
    await _userRepository.AddAsync(user, cancellationToken);
    await _userRepository.SaveChangesAsync(cancellationToken);

    return _mapper.Map<UserDto>(user);
}
```

---

### 5. Exception Handling in Service
**Pattern**: exception-handling-service
**Usage**: Throw custom exceptions for business rule violations

```csharp
// Custom Exceptions (in Services/Exceptions/)
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

public class BusinessException : Exception
{
    public BusinessException(string message) : base(message) { }
}

// Usage in service
public async Task<UserDto> UpdateAsync(Guid id, UpdateUserDto dto, CancellationToken cancellationToken = default)
{
    var user = await _userRepository.GetByIdAsync(id, cancellationToken);
    if (user == null)
        throw new NotFoundException($"User with ID {id} not found");

    // Business validation
    if (dto.Email != null && dto.Email != user.Email.Value)
    {
        var existingUser = await _userRepository.FindByEmailAsync(dto.Email, cancellationToken);
        if (existingUser != null)
            throw new BusinessException($"Email {dto.Email} is already in use");
    }

    _mapper.Map(dto, user);
    await _userRepository.UpdateAsync(user, cancellationToken);
    await _userRepository.SaveChangesAsync(cancellationToken);

    return _mapper.Map<UserDto>(user);
}
```

---

### 6. Soft Delete in Service
**Pattern**: soft-delete-in-service
**Usage**: Set IsActive = false instead of hard delete

```csharp
public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
{
    var user = await _userRepository.GetByIdAsync(id, cancellationToken);
    if (user == null)
        throw new NotFoundException($"User with ID {id} not found");

    // Soft delete: Set IsActive = false
    user.IsActive = false;
    await _userRepository.UpdateAsync(user, cancellationToken);
    await _userRepository.SaveChangesAsync(cancellationToken);
}
```

---

### 7. Pagination in Service
**Pattern**: pagination-in-service
**Usage**: Return paginated results with metadata

```csharp
public async Task<PaginatedResult<UserDto>> GetPaginatedAsync(
    int pageNumber,
    int pageSize,
    CancellationToken cancellationToken = default)
{
    var users = await _userRepository.GetPaginatedAsync(pageNumber, pageSize, cancellationToken);
    var totalCount = await _userRepository.CountAsync(cancellationToken);

    return new PaginatedResult<UserDto>
    {
        Items = _mapper.Map<List<UserDto>>(users),
        TotalCount = totalCount,
        PageNumber = pageNumber,
        PageSize = pageSize
    };
}

// DTO for pagination
public class PaginatedResult<T>
{
    public List<T> Items { get; set; }
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
```

---

### 8. Filtering in Service
**Pattern**: filtering-in-service
**Usage**: Apply filters before query execution

```csharp
public async Task<List<UserDto>> GetActiveUsersAsync(CancellationToken cancellationToken = default)
{
    var users = await _userRepository.FindAsync(u => u.IsActive == true, cancellationToken);
    return _mapper.Map<List<UserDto>>(users);
}
```

---

### 9. Sorting in Service
**Pattern**: sorting-in-service
**Usage**: Order results by specified property

```csharp
public async Task<List<UserDto>> GetUsersSortedByNameAsync(CancellationToken cancellationToken = default)
{
    var users = await _userRepository.GetAllOrderedAsync(
        u => u.Name,
        ascending: true,
        cancellationToken);
    return _mapper.Map<List<UserDto>>(users);
}
```

---

### 10. Service Registration in DI Container
**Pattern**: service-registration
**Usage**: Register services in Program.cs

```csharp
// Program.cs
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ILoanService, LoanService>();
```

---

### 11. Transaction Management in Service
**Pattern**: transaction-management-service
**Usage**: Ensure atomic operations across multiple repositories

```csharp
public class LoanService : ILoanService
{
    private readonly ILoanRepository _loanRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public LoanService(
        ILoanRepository loanRepository,
        IUserRepository userRepository,
        IMapper mapper)
    {
        _loanRepository = loanRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<LoanDto> CreateLoanAsync(CreateLoanDto dto, CancellationToken cancellationToken = default)
    {
        // Validate borrower exists
        var borrower = await _userRepository.GetByIdAsync(dto.BorrowerId, cancellationToken);
        if (borrower == null)
            throw new NotFoundException($"Borrower with ID {dto.BorrowerId} not found");

        // Validate lender exists
        var lender = await _userRepository.GetByIdAsync(dto.LenderId, cancellationToken);
        if (lender == null)
            throw new NotFoundException($"Lender with ID {dto.LenderId} not found");

        // Create loan
        var loan = _mapper.Map<Loan>(dto);
        await _loanRepository.AddAsync(loan, cancellationToken);

        // Both operations execute in same transaction (same DbContext)
        await _loanRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<LoanDto>(loan);
    }
}
```

---

### 12. Search Pattern in Service
**Pattern**: search-in-service
**Usage**: Search by multiple criteria

```csharp
public async Task<List<UserDto>> SearchUsersAsync(
    string searchTerm,
    CancellationToken cancellationToken = default)
{
    var users = await _userRepository.FindAsync(
        u => u.Name.Contains(searchTerm) || u.Email.Value.Contains(searchTerm),
        cancellationToken);
    return _mapper.Map<List<UserDto>>(users);
}
```

---

### 13. Count Pattern in Service
**Pattern**: count-in-service
**Usage**: Return count of entities matching criteria

```csharp
public async Task<int> GetActiveUserCountAsync(CancellationToken cancellationToken = default)
{
    return await _userRepository.CountAsync(u => u.IsActive == true, cancellationToken);
}
```

---

### 14. Exists Check Pattern
**Pattern**: exists-check-in-service
**Usage**: Check if entity exists without retrieving it

```csharp
public async Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default)
{
    return await _userRepository.AnyAsync(u => u.Email.Value == email, cancellationToken);
}
```

---

### 15. Bulk Create Pattern
**Pattern**: bulk-create-in-service
**Usage**: Create multiple entities efficiently

```csharp
public async Task<List<UserDto>> CreateBulkAsync(
    List<CreateUserDto> dtos,
    CancellationToken cancellationToken = default)
{
    var users = _mapper.Map<List<User>>(dtos);
    await _userRepository.AddRangeAsync(users, cancellationToken);
    await _userRepository.SaveChangesAsync(cancellationToken);
    return _mapper.Map<List<UserDto>>(users);
}
```

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO MediatR Injection
```csharp
// DON'T DO THIS!
public class UserService : IUserService
{
    private readonly IMediator _mediator;  // ❌ NO IMediator

    public UserService(IMediator mediator)
    {
        _mediator = mediator;
    }

    public async Task<UserDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // ❌ NO MediatR
        return await _mediator.Send(new GetUserByIdQuery(id), cancellationToken);
    }
}
```

### ❌ NO CQRS Commands/Queries
```csharp
// DON'T DO THIS!
public class GetUserByIdQuery : IRequest<UserDto>  // ❌ NO CQRS
{
    public Guid Id { get; set; }
}

public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto>  // ❌ NO CQRS
{
    // ...
}
```

### ❌ NO Field Injection
```csharp
// DON'T DO THIS!
public class UserService : IUserService
{
    [Inject]  // ❌ NO field injection
    private IUserRepository _userRepository;
}
```

---

## 🎓 BEST PRACTICES

1. **Constructor Injection ONLY**: Always inject dependencies via constructor
2. **Async/Await**: All service methods must be async with CancellationToken support
3. **Business Validation**: Validate business rules before persistence
4. **Custom Exceptions**: Use NotFoundException and BusinessException for error handling
5. **Soft Deletes**: Set IsActive = false instead of hard deletes
6. **Scoped Lifetime**: Register services as Scoped (depends on DbContext)
7. **AutoMapper**: Use AutoMapper for Entity ↔ DTO mapping
8. **Transaction Management**: Multiple repository operations execute in same transaction (same DbContext)
9. **NO MediatR**: Inject IRepository directly (NOT IMediator)
10. **NO CQRS**: Use service methods directly (NO Command/Query classes)

---

## 📊 SUMMARY

**Patterns Documented**: 15 core + 15 extended = 30 total
**Architecture**: C# Simplified Clean Architecture (NO CQRS, NO MediatR)
**Critical Constraints**: Constructor injection, NO IMediator, NO field injection
**Service Lifetime**: Scoped (depends on DbContext)
**Dependencies**: IRepository (from Domain), IMapper (AutoMapper)

---

**Created**: 2025-12-30
**Stack**: csharp-react-mssql
**Variant**: simplified-clean
**Category**: Service Layer
