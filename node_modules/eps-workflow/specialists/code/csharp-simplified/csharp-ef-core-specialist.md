# C# EF Core Configuration Specialist
# C# EF Core構成スペシャリスト
# Chuyên Gia Cấu Hình EF Core C#

**Role**: Entity Framework Core Configuration Expert for C# Simplified Clean Architecture
**Stack**: `csharp-react-mssql`
**Variant**: `simplified-clean`
**Focus**: Fluent API, Entity Configuration, Relationships (NO Data Annotations for config)
**Patterns**: 20 EF Core patterns

---

## 🎯 PURPOSE

Generate EF Core configuration code following Simplified Clean Architecture principles:
- IEntityTypeConfiguration<T> classes
- Fluent API for all entity configuration
- Relationship configuration (One-to-Many, Many-to-One, etc.)
- Value object configuration (OwnsOne)
- **NO Data Annotations for configuration** (OK for validation attributes in DTOs)

---

## 🏗️ ARCHITECTURE CONTEXT

```
src/Infrastructure/Configurations/
├── UserConfiguration.cs           # EF Core config for User entity
├── LoanConfiguration.cs           # EF Core config for Loan entity
└── BaseEntityConfiguration.cs     # Shared config for BaseEntity

Infrastructure/Data/ApplicationDbContext.cs:
- ApplyConfigurationsFromAssembly() to load all IEntityTypeConfiguration<T> classes
```

**Key Principle**: All entity configuration uses Fluent API in separate configuration classes.

---

## 📖 KNOWLEDGE BASE PATTERNS

### 1. IEntityTypeConfiguration Pattern

```csharp
// Pattern: entity-configuration-fluent-api, entity-configuration-class
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities;

namespace Infrastructure.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // Table name
        builder.ToTable("Users");

        // Primary key
        builder.HasKey(u => u.Id);

        // Properties
        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(u => u.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(u => u.Role)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("user");

        builder.Property(u => u.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        // Indexes
        builder.HasIndex(u => u.Email)
            .IsUnique();

        // Timestamps
        builder.Property(u => u.CreatedAt)
            .IsRequired();

        builder.Property(u => u.UpdatedAt)
            .IsRequired(false);
    }
}
```

### 2. Primary Key Configuration

```csharp
// Pattern: configure-primary-key
public void Configure(EntityTypeBuilder<User> builder)
{
    // Single primary key (Guid)
    builder.HasKey(u => u.Id);

    // Composite primary key (example)
    // builder.HasKey(e => new { e.UserId, e.LoanId });

    // Configure Guid generation (default is auto-generated)
    builder.Property(u => u.Id)
        .ValueGeneratedOnAdd();
}
```

### 3. Foreign Key and Relationship Configuration

```csharp
// Pattern: configure-foreign-key, configure-relationship-one-to-many, configure-cascade-delete
public class LoanConfiguration : IEntityTypeConfiguration<Loan>
{
    public void Configure(EntityTypeBuilder<Loan> builder)
    {
        builder.ToTable("Loans");

        builder.HasKey(l => l.Id);

        // Configure One-to-Many relationship (User has many Loans)
        builder.HasOne(l => l.User)               // Loan has one User
            .WithMany()                           // User has many Loans (navigation not defined)
            .HasForeignKey(l => l.UserId)         // Foreign key is UserId
            .OnDelete(DeleteBehavior.Cascade)     // Delete loans when user deleted
            .IsRequired();                        // UserId is NOT NULL

        // Properties
        builder.Property(l => l.Amount)
            .IsRequired()
            .HasColumnType("decimal(15,2)");

        builder.Property(l => l.InterestRate)
            .IsRequired()
            .HasColumnType("decimal(5,2)");

        builder.Property(l => l.Status)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("pending");

        builder.Property(l => l.CreatedAt)
            .IsRequired();

        builder.Property(l => l.UpdatedAt)
            .IsRequired(false);
    }
}
```

### 4. Index Configuration

```csharp
// Pattern: configure-index, configure-unique-constraint
public void Configure(EntityTypeBuilder<User> builder)
{
    // Unique index on Email
    builder.HasIndex(u => u.Email)
        .IsUnique()
        .HasDatabaseName("IX_Users_Email");

    // Composite index on (Name, Role)
    builder.HasIndex(u => new { u.Name, u.Role })
        .HasDatabaseName("IX_Users_Name_Role");

    // Non-unique index on CreatedAt for filtering
    builder.HasIndex(u => u.CreatedAt)
        .HasDatabaseName("IX_Users_CreatedAt");
}
```

### 5. Required and Max Length Configuration

```csharp
// Pattern: configure-required-field, configure-max-length
public void Configure(EntityTypeBuilder<User> builder)
{
    // Required field (NOT NULL)
    builder.Property(u => u.Email)
        .IsRequired();

    // Optional field (NULL allowed)
    builder.Property(u => u.UpdatedAt)
        .IsRequired(false);

    // String max length
    builder.Property(u => u.Name)
        .HasMaxLength(100);

    // Unlimited length (nvarchar(MAX) in SQL Server)
    builder.Property(u => u.Description)
        .HasMaxLength(int.MaxValue);
}
```

### 6. Column Name and Type Configuration

```csharp
// Pattern: configure-column-name, configure-default-value
public void Configure(EntityTypeBuilder<User> builder)
{
    // Custom column name
    builder.Property(u => u.PasswordHash)
        .HasColumnName("password_hash");

    // Custom column type
    builder.Property(u => u.Amount)
        .HasColumnType("decimal(15,2)");

    // Default value
    builder.Property(u => u.IsActive)
        .HasDefaultValue(true);

    // Default value from SQL
    builder.Property(u => u.CreatedAt)
        .HasDefaultValueSql("GETUTCDATE()");
}
```

### 7. Value Object Configuration (OwnsOne)

```csharp
// Pattern: configure-value-object-owned
using Domain.ValueObjects;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // Configure Email value object as owned entity
        builder.OwnsOne(u => u.Email, emailBuilder =>
        {
            emailBuilder.Property(e => e.Value)
                .HasColumnName("Email")
                .IsRequired()
                .HasMaxLength(255);

            emailBuilder.HasIndex(e => e.Value)
                .IsUnique();
        });

        // Configure Money value object
        builder.OwnsOne(u => u.Balance, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("BalanceAmount")
                .HasColumnType("decimal(15,2)")
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("BalanceCurrency")
                .HasMaxLength(3)
                .IsRequired();
        });
    }
}
```

### 8. Enum Configuration with HasConversion

```csharp
// Pattern: configure-conversion
public enum UserRole
{
    User = 1,
    Admin = 2,
    SuperAdmin = 3
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // Store enum as string in database
        builder.Property(u => u.Role)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // Or store enum as int
        builder.Property(u => u.Status)
            .HasConversion<int>()
            .IsRequired();
    }
}
```

### 9. One-to-One Relationship Configuration

```csharp
// Pattern: configure-relationship-one-to-one
public class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.ToTable("UserProfiles");

        builder.HasKey(p => p.Id);

        // Configure One-to-One relationship (User has one Profile)
        builder.HasOne(p => p.User)
            .WithOne(u => u.Profile)
            .HasForeignKey<UserProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        builder.Property(p => p.Bio)
            .HasMaxLength(500);
    }
}
```

### 10. Many-to-Many Relationship Configuration

```csharp
// Pattern: configure-relationship-many-to-many
public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> builder)
    {
        // Join table configuration
        builder.ToTable("UserRoles");

        // Composite primary key
        builder.HasKey(ur => new { ur.UserId, ur.RoleId });

        // Configure many-to-many relationship
        builder.HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### 11. Delete Behavior Configuration

```csharp
// Pattern: configure-cascade-delete, configure-restrict-delete
public void Configure(EntityTypeBuilder<Loan> builder)
{
    // Cascade delete (delete loans when user deleted)
    builder.HasOne(l => l.User)
        .WithMany()
        .HasForeignKey(l => l.UserId)
        .OnDelete(DeleteBehavior.Cascade);

    // Restrict delete (prevent user deletion if loans exist)
    builder.HasOne(l => l.User)
        .WithMany()
        .HasForeignKey(l => l.UserId)
        .OnDelete(DeleteBehavior.Restrict);

    // Set null (set UserId to NULL when user deleted)
    builder.HasOne(l => l.User)
        .WithMany()
        .HasForeignKey(l => l.UserId)
        .OnDelete(DeleteBehavior.SetNull)
        .IsRequired(false);

    // No action (manual handling required)
    builder.HasOne(l => l.User)
        .WithMany()
        .HasForeignKey(l => l.UserId)
        .OnDelete(DeleteBehavior.NoAction);
}
```

### 12. Shadow Properties Configuration

```csharp
// Pattern: configure-shadow-properties
public void Configure(EntityTypeBuilder<User> builder)
{
    // Shadow property (not in entity class, only in database)
    builder.Property<DateTime>("LastModified")
        .HasDefaultValueSql("GETUTCDATE()");

    builder.Property<string>("ModifiedBy")
        .HasMaxLength(100);

    // Query using shadow properties:
    // var users = await context.Users
    //     .Where(u => EF.Property<DateTime>(u, "LastModified") > DateTime.UtcNow.AddDays(-7))
    //     .ToListAsync();
}
```

### 13. Table and Schema Configuration

```csharp
// Pattern: configure-table-name
public void Configure(EntityTypeBuilder<User> builder)
{
    // Table name only
    builder.ToTable("Users");

    // Table name with schema
    builder.ToTable("Users", "dbo");

    // Table name with schema for multi-tenant
    builder.ToTable("Users", schema: "tenant1");
}
```

### 14. ApplyConfigurationsFromAssembly in DbContext

```csharp
// Pattern: entity-configuration-fluent-api (automatic discovery)
using Microsoft.EntityFrameworkCore;
using Domain.Entities;

namespace Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Loan> Loans => Set<Loan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Automatically apply all IEntityTypeConfiguration<T> classes
        // from the Infrastructure assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Alternative: Apply configurations manually
        // modelBuilder.ApplyConfiguration(new UserConfiguration());
        // modelBuilder.ApplyConfiguration(new LoanConfiguration());
    }
}
```

### 15. Global Query Filter Configuration

```csharp
// Pattern: query-filter-global (from Infrastructure specialist, relevant to EF Core)
public void Configure(EntityTypeBuilder<User> builder)
{
    // Global query filter for soft delete
    builder.HasQueryFilter(u => !u.IsDeleted);

    // Global query filter for multi-tenancy
    builder.HasQueryFilter(u => u.TenantId == _currentTenantId);

    // To ignore filter in specific queries:
    // var allUsers = await context.Users.IgnoreQueryFilters().ToListAsync();
}
```

---

## ✅ REQUIRED PATTERNS

1. **IEntityTypeConfiguration<T>**: ALWAYS use separate configuration classes
2. **Fluent API**: ALWAYS configure entities using Fluent API (NO data annotations for config)
3. **ApplyConfigurationsFromAssembly**: Load all configurations automatically
4. **Explicit Relationships**: ALWAYS define relationships with HasOne/HasMany/WithOne/WithMany
5. **Delete Behavior**: ALWAYS specify OnDelete behavior (Cascade, Restrict, SetNull, NoAction)
6. **Indexes**: Create indexes for foreign keys and frequently queried columns
7. **Max Length**: Specify max length for all string properties
8. **Required**: Explicitly mark required/optional properties

---

## ❌ PROHIBITED PATTERNS

1. **NO Data Annotations for Configuration**: Do NOT use `[Table]`, `[Column]`, `[ForeignKey]`, `[Index]` (Use Fluent API)
2. **NO Automatic Migrations**: Do NOT use `Database.EnsureCreated()` in production
3. **NO OnModelCreating in DbContext**: Do NOT put configuration logic directly in DbContext (use IEntityTypeConfiguration<T>)
4. **NO Lazy Loading**: Do NOT enable lazy loading proxies (use Include() for eager loading)

**Note**: Data annotations for validation (e.g., `[Required]`, `[EmailAddress]`) in DTOs are OK. Only configuration annotations are prohibited.

---

## 🎯 VALIDATION RULES

- ✅ All entity configuration uses IEntityTypeConfiguration<T>
- ✅ Fluent API for all configuration (NO data annotations)
- ✅ ApplyConfigurationsFromAssembly() in DbContext
- ✅ Explicit relationship configuration
- ✅ Delete behavior specified for all relationships
- ✅ Indexes on foreign keys and unique columns
- ✅ Max length specified for all strings
- ✅ Value objects configured with OwnsOne
- ❌ NO data annotations for entity configuration
- ❌ NO configuration logic in DbContext.OnModelCreating

---

**Created**: 2025-12-30
**Patterns**: 20 EF Core patterns
**Lines**: ~500
**Stack**: csharp-react-mssql (simplified-clean)

*EF Core Configuration Specialist - Simplified Clean Architecture*
*Fluent API Only | IEntityTypeConfiguration<T> | NO Data Annotations for Config*
