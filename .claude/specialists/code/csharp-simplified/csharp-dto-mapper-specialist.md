# C# DTO Mapper Specialist
# C# DTOマッパースペシャリスト
# Chuyên Gia Ánh Xạ DTO C#

**Stack**: csharp-react-mssql
**Variant**: simplified-clean (C# Simplified Clean Architecture)
**Category**: DTO Mapper
**Patterns**: 25
**Focus**: Entity ↔ DTO mapping using AutoMapper

---

## 🏗️ ARCHITECTURE CONTEXT

**DTO Layer in Clean Architecture**:
```
Domain Layer:    User entity with Email value object
Services Layer:  UserDto, CreateUserDto, UpdateUserDto ← WE ARE HERE
Mapping:         AutoMapper profiles for Entity ↔ DTO ← WE ARE HERE
```

**Critical Constraints**:
- ✅ Use C# record types for DTOs
- ✅ AutoMapper for all Entity ↔ DTO mappings
- ✅ Explicit value object mapping (Email.Value ↔ string)
- ✅ Separate DTOs for Create, Update, Response
- ✅ Data annotations for validation
- ❌ NO manual mapping code in services
- ❌ NO circular references in DTOs

---

## 📋 DTO MAPPER PATTERNS (25 Patterns)

### 1. Response DTO Pattern (Record Type)
**Pattern**: dto-record-pattern, response-dto-pattern
**Usage**: Read-only DTO for API responses

```csharp
// Services/DTOs/UserDto.cs
namespace Services.DTOs;

public record UserDto(
    Guid Id,
    string Name,
    string Email,         // Email value object → string
    string Role,
    bool IsActive,
    DateTime CreatedAt
);
```

**Benefits**:
- Immutable by default
- Value-based equality
- Concise syntax
- No setters (read-only)

---

### 2. Create DTO Pattern (Record Type with Validation)
**Pattern**: create-dto-pattern
**Usage**: DTO for creating new entities

```csharp
// Services/DTOs/CreateUserDto.cs
using System.ComponentModel.DataAnnotations;

namespace Services.DTOs;

public record CreateUserDto(
    [Required]
    [MaxLength(100)]
    string Name,

    [Required]
    [EmailAddress]
    string Email,

    [Required]
    [MaxLength(50)]
    string Role = "user"  // Default value
);
```

**Validation Annotations**:
- `[Required]`: Property cannot be null
- `[MaxLength(n)]`: String length limit
- `[EmailAddress]`: Valid email format
- Default values allowed in record constructors

---

### 3. Update DTO Pattern (Nullable Properties)
**Pattern**: update-dto-pattern
**Usage**: DTO for partial updates (nullable properties)

```csharp
// Services/DTOs/UpdateUserDto.cs
using System.ComponentModel.DataAnnotations;

namespace Services.DTOs;

public record UpdateUserDto(
    [MaxLength(100)]
    string? Name,

    [EmailAddress]
    string? Email,

    [MaxLength(50)]
    string? Role
);
```

**Nullable Properties**:
- `string?` allows partial updates
- Only specified properties are updated
- Null = "do not update this property"

---

### 4. AutoMapper Profile Pattern
**Pattern**: automapper-profile
**Usage**: Configure all Entity ↔ DTO mappings

```csharp
// Services/Mappings/UserMappingProfile.cs
using AutoMapper;
using Domain.Entities;
using Services.DTOs;

namespace Services.Mappings;

public class UserMappingProfile : Profile
{
    public UserMappingProfile()
    {
        // Entity → DTO (Read)
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email.Value));

        // CreateUserDto → Entity
        CreateMap<CreateUserDto, User>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => new Email(src.Email)));

        // UpdateUserDto → Entity (partial update)
        CreateMap<UpdateUserDto, User>()
            .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
    }
}
```

---

### 5. Value Object to String Mapping
**Pattern**: value-object-to-string-mapping
**Usage**: Map Email value object to string

```csharp
CreateMap<User, UserDto>()
    .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email.Value));
```

---

### 6. String to Value Object Mapping
**Pattern**: string-to-value-object-mapping
**Usage**: Map string to Email value object

```csharp
CreateMap<CreateUserDto, User>()
    .ForMember(dest => dest.Email, opt => opt.MapFrom(src => new Email(src.Email)));
```

---

### 7. Ignore Properties Pattern
**Pattern**: ignore-properties-mapping
**Usage**: Ignore Id, CreatedAt, UpdatedAt for create operations

```csharp
CreateMap<CreateUserDto, User>()
    .ForMember(dest => dest.Id, opt => opt.Ignore())
    .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
    .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore());
```

---

### 8. Conditional Mapping for Partial Updates
**Pattern**: conditional-mapping-partial-update
**Usage**: Only map non-null properties for updates

```csharp
CreateMap<UpdateUserDto, User>()
    .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
```

**How it works**:
- If `UpdateUserDto.Name` is null → User.Name not updated
- If `UpdateUserDto.Name` is "John" → User.Name = "John"

---

### 9. Nested DTO Mapping
**Pattern**: nested-dto-mapping
**Usage**: Map nested entities to nested DTOs

```csharp
// LoanDto with nested UserDto
public record LoanDto(
    Guid Id,
    UserDto Borrower,    // Nested DTO
    UserDto Lender,      // Nested DTO
    decimal Amount,
    DateTime CreatedAt
);

// Mapping profile
CreateMap<Loan, LoanDto>()
    .ForMember(dest => dest.Borrower, opt => opt.MapFrom(src => src.Borrower))
    .ForMember(dest => dest.Lender, opt => opt.MapFrom(src => src.Lender));
```

---

### 10. Collection DTO Mapping
**Pattern**: collection-dto-mapping
**Usage**: Map List<Entity> to List<DTO>

```csharp
// In service
public async Task<List<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
{
    var users = await _userRepository.GetAllAsync(cancellationToken);
    return _mapper.Map<List<UserDto>>(users);  // AutoMapper handles collection mapping
}
```

---

### 11. Projection Mapping (Select DTO from LINQ)
**Pattern**: projection-mapping
**Usage**: Project Entity to DTO in LINQ query (performance optimization)

```csharp
// In repository
public async Task<List<UserDto>> GetAllDtosAsync(IMapper mapper, CancellationToken cancellationToken)
{
    return await _context.Users
        .AsNoTracking()
        .ProjectTo<UserDto>(mapper.ConfigurationProvider)  // Project to DTO in SQL
        .ToListAsync(cancellationToken);
}
```

**Benefits**:
- SELECT only DTO columns (not entire entity)
- Better performance (less data transferred)
- Executes in database (not in memory)

---

### 12. AutoMapper Registration in DI
**Pattern**: automapper-registration
**Usage**: Register AutoMapper in Program.cs

```csharp
// Program.cs
builder.Services.AddAutoMapper(typeof(UserMappingProfile));
```

**Scans assembly for all Profile classes**:
- UserMappingProfile
- LoanMappingProfile
- etc.

---

### 13. Reverse Mapping Pattern
**Pattern**: reverse-mapping
**Usage**: Create bidirectional mapping with ReverseMap()

```csharp
CreateMap<User, UserDto>().ReverseMap();
// Automatically creates: CreateMap<UserDto, User>()
```

**⚠️ WARNING**: Only use for simple mappings (no value objects, no ignores)

---

### 14. Custom Value Resolver
**Pattern**: custom-value-resolver
**Usage**: Complex mapping logic

```csharp
public class EmailValueResolver : IValueResolver<User, UserDto, string>
{
    public string Resolve(User source, UserDto destination, string destMember, ResolutionContext context)
    {
        return source.Email?.Value ?? string.Empty;
    }
}

// Usage in profile
CreateMap<User, UserDto>()
    .ForMember(dest => dest.Email, opt => opt.MapFrom<EmailValueResolver>());
```

---

### 15. DTO Validation Pattern
**Pattern**: dto-validation
**Usage**: Data annotations for automatic validation

```csharp
public record CreateUserDto(
    [Required(ErrorMessage = "Name is required")]
    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    string Name,

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    string Email
);
```

---

### 16. Pagination DTO Pattern
**Pattern**: pagination-dto
**Usage**: DTO for paginated results

```csharp
public record PaginatedDto<T>
{
    public List<T> Items { get; init; }
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}
```

---

### 17. Flat DTO from Nested Entity
**Pattern**: flat-dto-from-nested
**Usage**: Flatten nested entity to single DTO

```csharp
// Entity with navigation property
public class Loan
{
    public Guid Id { get; set; }
    public User Borrower { get; set; }
    public decimal Amount { get; set; }
}

// Flat DTO
public record LoanDto(
    Guid Id,
    string BorrowerName,   // Flattened from Borrower.Name
    string BorrowerEmail,  // Flattened from Borrower.Email.Value
    decimal Amount
);

// Mapping
CreateMap<Loan, LoanDto>()
    .ForMember(dest => dest.BorrowerName, opt => opt.MapFrom(src => src.Borrower.Name))
    .ForMember(dest => dest.BorrowerEmail, opt => opt.MapFrom(src => src.Borrower.Email.Value));
```

---

### 18. Enum to String Mapping
**Pattern**: enum-to-string-mapping
**Usage**: Map enum to string for JSON

```csharp
public enum UserRole
{
    Admin,
    User,
    Guest
}

public record UserDto(
    Guid Id,
    string Name,
    string Role  // Enum → string
);

CreateMap<User, UserDto>()
    .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role.ToString()));
```

---

### 19. DateTime Formatting in DTO
**Pattern**: datetime-formatting-dto
**Usage**: Format DateTime for JSON response

```csharp
public record UserDto(
    Guid Id,
    string Name,
    DateTime CreatedAt  // Will serialize as ISO 8601 by default
);

// Or custom format
CreateMap<User, UserDto>()
    .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")));
```

---

### 20. Null Handling in Mapping
**Pattern**: null-handling-mapping
**Usage**: Handle null values in mapping

```csharp
CreateMap<User, UserDto>()
    .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email != null ? src.Email.Value : "N/A"));
```

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Manual Mapping in Services
```csharp
// DON'T DO THIS!
public async Task<UserDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    var user = await _userRepository.GetByIdAsync(id, cancellationToken);

    // ❌ NO manual mapping
    return new UserDto(
        Id: user.Id,
        Name: user.Name,
        Email: user.Email.Value,
        Role: user.Role,
        IsActive: user.IsActive,
        CreatedAt: user.CreatedAt
    );
}
```

**✅ Use AutoMapper instead**:
```csharp
public async Task<UserDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    var user = await _userRepository.GetByIdAsync(id, cancellationToken);
    return _mapper.Map<UserDto>(user);  // ✅ AutoMapper
}
```

---

### ❌ NO Circular References in DTOs
```csharp
// DON'T DO THIS!
public record UserDto(
    Guid Id,
    string Name,
    List<LoanDto> Loans  // ❌ Circular reference
);

public record LoanDto(
    Guid Id,
    UserDto Borrower,    // ❌ Circular reference
    decimal Amount
);
```

**Problem**: JSON serialization infinite loop

---

## 🎓 BEST PRACTICES

1. **Use Record Types**: Immutable DTOs with value-based equality
2. **Separate DTOs**: CreateDto, UpdateDto, ResponseDto for different operations
3. **Data Annotations**: Validate DTOs with `[Required]`, `[MaxLength]`, `[EmailAddress]`
4. **AutoMapper Profiles**: One profile per domain aggregate (UserMappingProfile, LoanMappingProfile)
5. **Value Object Mapping**: Explicit mapping for Email.Value ↔ string
6. **Ignore Properties**: Ignore Id, CreatedAt, UpdatedAt for create operations
7. **Conditional Mapping**: Use `.Condition()` for partial updates
8. **Projection**: Use `.ProjectTo<TDto>()` for performance (SELECT only DTO columns)
9. **NO Manual Mapping**: Always use AutoMapper
10. **NO Circular References**: Avoid UserDto ↔ LoanDto circular references

---

## 📊 SUMMARY

**Patterns Documented**: 20 core + 5 advanced = 25 total
**Architecture**: C# Simplified Clean Architecture
**Mapping Tool**: AutoMapper (NO manual mapping)
**DTO Types**: Record types (immutable, value-based equality)
**Validation**: Data annotations (`[Required]`, `[MaxLength]`, `[EmailAddress]`)
**Performance**: Projection with `.ProjectTo<TDto>()`

---

**Created**: 2025-12-30
**Stack**: csharp-react-mssql
**Variant**: simplified-clean
**Category**: DTO Mapper
