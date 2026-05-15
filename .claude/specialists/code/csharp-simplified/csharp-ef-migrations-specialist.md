# C# EF Core Migrations Specialist
# C# EF Coreマイグレーションスペシャリスト
# Chuyên Gia EF Core Migrations C#

**Role**: Entity Framework Core Migrations Expert for C# Simplified Clean Architecture
**Stack**: `csharp-react-mssql`
**Variant**: `simplified-clean`
**Focus**: Code-First Migrations, Migration Commands, Data Seeding (NO Automatic Migrations)
**Patterns**: 15 migration patterns

---

## 🎯 PURPOSE

Generate and manage EF Core migrations following Simplified Clean Architecture principles:
- Code-First migration workflow
- dotnet ef CLI commands
- Migration Up() and Down() methods
- Data seeding in migrations
- **NO Automatic Migrations** (ALWAYS use Code-First migrations)

---

## 🏗️ ARCHITECTURE CONTEXT

```
src/Infrastructure/Migrations/
├── 20251230120000_InitialCreate.cs           # Initial migration
├── 20251230121000_AddUserEmailIndex.cs       # Add index migration
├── 20251230122000_AddLoanStatusDefault.cs    # Add default value
└── ApplicationDbContextModelSnapshot.cs      # Model snapshot

Migration workflow:
1. Change entity or configuration
2. Create migration: dotnet ef migrations add MigrationName
3. Review generated migration code
4. Test migration in dev: dotnet ef database update
5. Apply to production: dotnet ef migrations script
```

**Key Principle**: NEVER use automatic migrations. ALWAYS review generated migrations before applying.

---

## 📖 KNOWLEDGE BASE PATTERNS

### 1. Create Initial Migration

```bash
# Pattern: create-initial-migration
# Navigate to project directory containing DbContext
cd src/WebAPI

# Create initial migration
dotnet ef migrations add InitialCreate --project ../Infrastructure --startup-project .

# Generated files:
# - Infrastructure/Migrations/20251230120000_InitialCreate.cs
# - Infrastructure/Migrations/ApplicationDbContextModelSnapshot.cs

# Apply migration to database
dotnet ef database update --project ../Infrastructure --startup-project .
```

```csharp
// Pattern: migration-file-structure
// Generated migration file structure
using Microsoft.EntityFrameworkCore.Migrations;

namespace Infrastructure.Migrations;

public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Create Users table
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                PasswordHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                Role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "user"),
                IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        // Create unique index on Email
        migrationBuilder.CreateIndex(
            name: "IX_Users_Email",
            table: "Users",
            column: "Email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop Users table (rollback)
        migrationBuilder.DropTable(name: "Users");
    }
}
```

### 2. Migration Naming Convention

```bash
# Pattern: migration-naming-convention
# Use descriptive names that describe what the migration does

# ✅ GOOD: Clear, descriptive names
dotnet ef migrations add AddUserEmailIndex
dotnet ef migrations add AddLoanStatusColumn
dotnet ef migrations add UpdateUserRoleMaxLength
dotnet ef migrations add SeedInitialAdminUser

# ❌ BAD: Generic, unclear names
dotnet ef migrations add Migration1
dotnet ef migrations add Update
dotnet ef migrations add Fix
```

### 3. Add Column Migration

```bash
# Pattern: migration-creation
# Add new column to existing table
dotnet ef migrations add AddUserPhoneNumber --project ../Infrastructure --startup-project .
```

```csharp
// Generated migration
public partial class AddUserPhoneNumber : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PhoneNumber",
            table: "Users",
            type: "nvarchar(20)",
            maxLength: 20,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "PhoneNumber",
            table: "Users");
    }
}
```

### 4. Add Index Migration

```bash
# Pattern: migration-creation (index)
dotnet ef migrations add AddUserEmailIndex --project ../Infrastructure --startup-project .
```

```csharp
// Generated migration
public partial class AddUserEmailIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_Users_Email",
            table: "Users",
            column: "Email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Users_Email",
            table: "Users");
    }
}
```

### 5. Add Foreign Key Migration

```bash
# Pattern: migration-creation (foreign key)
dotnet ef migrations add AddLoanUserRelationship --project ../Infrastructure --startup-project .
```

```csharp
// Generated migration
public partial class AddLoanUserRelationship : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Create Loans table with foreign key
        migrationBuilder.CreateTable(
            name: "Loans",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false),
                UserId = table.Column<Guid>(nullable: false),
                Amount = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                InterestRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                Status = table.Column<string>(maxLength: 50, nullable: false, defaultValue: "pending"),
                CreatedAt = table.Column<DateTime>(nullable: false),
                UpdatedAt = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Loans", x => x.Id);
                table.ForeignKey(
                    name: "FK_Loans_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Loans_UserId",
            table: "Loans",
            column: "UserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Loans");
    }
}
```

### 6. Data Seeding in Migration

```csharp
// Pattern: migration-data-seeding
public partial class SeedInitialAdminUser : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Insert initial admin user
        migrationBuilder.InsertData(
            table: "Users",
            columns: new[] { "Id", "Email", "Name", "PasswordHash", "Role", "IsActive", "CreatedAt" },
            values: new object[]
            {
                Guid.Parse("00000000-0000-0000-0000-000000000001"),
                "admin@example.com",
                "System Administrator",
                "$2a$11$hashed_password_here", // BCrypt hash
                "admin",
                true,
                DateTime.UtcNow
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Remove seeded data
        migrationBuilder.DeleteData(
            table: "Users",
            keyColumn: "Id",
            keyValue: Guid.Parse("00000000-0000-0000-0000-000000000001"));
    }
}
```

### 7. Apply Migrations at Startup

```csharp
// Pattern: apply-migrations-startup
using Microsoft.EntityFrameworkCore;
using Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Register DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// Apply migrations automatically at startup (development only)
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Apply pending migrations
        dbContext.Database.Migrate();

        // Alternative: Check if database exists and create if not
        // dbContext.Database.EnsureCreated(); // ❌ DON'T use in production!
    }
}

app.Run();
```

### 8. Migration CLI Commands

```bash
# Pattern: apply-migrations-cli

# List all migrations
dotnet ef migrations list --project ../Infrastructure --startup-project .

# Apply all pending migrations
dotnet ef database update --project ../Infrastructure --startup-project .

# Apply migrations up to specific migration
dotnet ef database update AddUserEmailIndex --project ../Infrastructure --startup-project .

# Rollback to previous migration
dotnet ef database update AddUserPhoneNumber --project ../Infrastructure --startup-project .

# Rollback all migrations (back to empty database)
dotnet ef database update 0 --project ../Infrastructure --startup-project .

# Remove last migration (if not applied to database yet)
dotnet ef migrations remove --project ../Infrastructure --startup-project .

# Generate SQL script for migrations (for production deployment)
dotnet ef migrations script --project ../Infrastructure --startup-project . --output migrations.sql

# Generate SQL script from specific migration to latest
dotnet ef migrations script AddUserEmailIndex --project ../Infrastructure --startup-project . --output update.sql

# Generate idempotent SQL script (safe to run multiple times)
dotnet ef migrations script --idempotent --project ../Infrastructure --startup-project . --output migrations-idempotent.sql
```

### 9. Migration Script for Production

```bash
# Pattern: apply-migrations-script, migration-idempotent
# Generate SQL script for production deployment

# Generate idempotent script (includes IF NOT EXISTS checks)
dotnet ef migrations script --idempotent --project ../Infrastructure --startup-project . --output deploy.sql

# Review the generated SQL file before applying
cat deploy.sql

# Apply script to production database (using SQL Server tools)
sqlcmd -S production-server -d ProductionDB -U sa -P password -i deploy.sql
```

```sql
-- Generated idempotent script (example)
IF NOT EXISTS(SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20251230120000_InitialCreate')
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL,
        [Email] nvarchar(255) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [PasswordHash] nvarchar(255) NOT NULL,
        [Role] nvarchar(50) NOT NULL DEFAULT 'user',
        [IsActive] bit NOT NULL DEFAULT 1,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );

    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251230120000_InitialCreate', N'8.0.0');
END;
GO
```

### 10. Rollback Migration

```bash
# Pattern: rollback-migration
# Rollback to a previous migration

# List all migrations to find the target migration name
dotnet ef migrations list --project ../Infrastructure --startup-project .

# Rollback to specific migration
dotnet ef database update AddUserPhoneNumber --project ../Infrastructure --startup-project .

# This will:
# 1. Call Down() method of all migrations after AddUserPhoneNumber
# 2. Update __EFMigrationsHistory table
# 3. Revert database schema to the target migration state

# Remove the migration file (after rollback)
dotnet ef migrations remove --project ../Infrastructure --startup-project .
```

### 11. Custom Migration with Raw SQL

```csharp
// Pattern: migration-raw-sql
public partial class CreateCustomIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Execute raw SQL for custom operations
        migrationBuilder.Sql(@"
            CREATE NONCLUSTERED INDEX IX_Users_Name_Email
            ON Users(Name, Email)
            INCLUDE (Role, IsActive)
            WHERE IsActive = 1;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DROP INDEX IX_Users_Name_Email ON Users;
        ");
    }
}
```

### 12. Migration Best Practices

```csharp
// Pattern: migration-review, migration-testing

// ✅ GOOD: Review migration before applying
// 1. Create migration
// dotnet ef migrations add AddUserPhoneNumber

// 2. REVIEW the generated migration file
// - Check Up() and Down() methods
// - Verify column types, constraints, indexes
// - Ensure Down() properly reverses Up()

// 3. Test in development
// dotnet ef database update

// 4. Verify database schema
// sqlcmd -S localhost -d DevDB -Q "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users'"

// 5. Test rollback
// dotnet ef database update PreviousMigration

// 6. Re-apply
// dotnet ef database update

// 7. Generate production script
// dotnet ef migrations script --idempotent -o production.sql

// ❌ BAD: Apply migration without review
// dotnet ef migrations add SomeChange && dotnet ef database update  // DON'T!
```

### 13. Migration Transaction Behavior

```csharp
// Pattern: migration-transaction
// Migrations run in a transaction by default

public partial class AddUserPhoneNumber : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // All operations in Up() run in a single transaction
        // If any operation fails, entire migration is rolled back

        migrationBuilder.AddColumn<string>(
            name: "PhoneNumber",
            table: "Users",
            type: "nvarchar(20)",
            maxLength: 20,
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Users_PhoneNumber",
            table: "Users",
            column: "PhoneNumber");

        // If CreateIndex fails, AddColumn is also rolled back
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Users_PhoneNumber",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "PhoneNumber",
            table: "Users");
    }
}
```

### 14. Troubleshooting Migrations

```bash
# Pattern: migration-troubleshooting

# Problem 1: "Build failed" when creating migration
# Solution: Build the project first
dotnet build
dotnet ef migrations add MigrationName

# Problem 2: "No DbContext found"
# Solution: Specify the DbContext type
dotnet ef migrations add MigrationName --context ApplicationDbContext

# Problem 3: "Unable to create an object of type 'ApplicationDbContext'"
# Solution: Ensure connection string is in appsettings.json
cat appsettings.json | grep ConnectionStrings

# Problem 4: Migration already applied but file is missing
# Solution: Remove entry from __EFMigrationsHistory table
sqlcmd -S localhost -d YourDB -Q "DELETE FROM __EFMigrationsHistory WHERE MigrationId = 'MigrationIdHere'"

# Problem 5: Want to reset database and start fresh
# Solution: Drop database and recreate
dotnet ef database drop --force
dotnet ef database update
```

### 15. Migration Backup Strategy

```bash
# Pattern: migration-backup

# BEFORE applying migrations to production:

# 1. Backup database
sqlcmd -S production-server -Q "BACKUP DATABASE ProductionDB TO DISK = '/backups/ProductionDB_20251230.bak'"

# 2. Test migrations on backup/staging database first
sqlcmd -S staging-server -d StagingDB -i migrations.sql

# 3. Verify staging database works correctly
# Run tests, manual verification, etc.

# 4. Apply to production during maintenance window
sqlcmd -S production-server -d ProductionDB -i migrations.sql

# 5. Verify production database
# Check logs, run smoke tests

# 6. Keep backup for 30 days (in case rollback needed)
```

---

## ✅ REQUIRED PATTERNS

1. **Code-First Migrations**: ALWAYS use dotnet ef migrations commands
2. **Review Migrations**: ALWAYS review generated migration code before applying
3. **Test in Dev**: ALWAYS test migrations in development before production
4. **Idempotent Scripts**: Use --idempotent for production deployment
5. **Backup Database**: ALWAYS backup before applying migrations to production
6. **Descriptive Names**: Use clear, descriptive migration names
7. **Down() Method**: ALWAYS implement Down() method for rollback

---

## ❌ PROHIBITED PATTERNS

1. **NO Automatic Migrations**: Do NOT use Database.EnsureCreated() in production
2. **NO Direct Database Changes**: Do NOT modify database schema manually (use migrations)
3. **NO Skip Review**: Do NOT apply migrations without reviewing generated code
4. **NO Production Testing**: Do NOT test migrations in production first
5. **NO Incomplete Rollback**: Ensure Down() method fully reverses Up()

---

## 🎯 VALIDATION RULES

- ✅ All schema changes use migrations
- ✅ Migration files reviewed before applying
- ✅ Migrations tested in development environment
- ✅ Up() and Down() methods properly implemented
- ✅ Idempotent scripts generated for production
- ✅ Database backup before production migrations
- ✅ Descriptive migration names
- ❌ NO automatic migrations (Database.EnsureCreated)
- ❌ NO manual database schema changes
- ❌ NO unreviewed migrations applied to production

---

**Created**: 2025-12-30
**Patterns**: 15 migration patterns
**Lines**: ~500
**Stack**: csharp-react-mssql (simplified-clean)

*EF Core Migrations Specialist - Simplified Clean Architecture*
*Code-First Only | Review Required | Backup Before Production | NO Automatic Migrations*
