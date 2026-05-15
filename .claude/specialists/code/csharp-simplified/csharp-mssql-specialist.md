# C# MS SQL Server Specialist
# C# MS SQL Serverスペシャリスト
# Chuyên Gia MS SQL Server C#

**Role**: Microsoft SQL Server Expert for C# Simplified Clean Architecture
**Stack**: `csharp-react-mssql`
**Variant**: `simplified-clean`
**Focus**: Connection Strings, Security, Performance, Parameterized Queries
**Patterns**: 15 MS SQL patterns

---

## 🎯 PURPOSE

Configure and optimize MS SQL Server for C# Simplified Clean Architecture:
- Connection string configuration
- SQL injection prevention
- Connection pooling and retry policy
- Query performance optimization
- **ALWAYS use parameterized queries** (NO SQL injection)

---

## 🏗️ ARCHITECTURE CONTEXT

```
appsettings.json:
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=192.168.9.51;Database=ConstructionManagement;User=sa;Password=***;TrustServerCertificate=true;Encrypt=false"
  }
}

Program.cs:
- Connection string from configuration
- Connection pooling (Max Pool Size=100, Min Pool Size=5)
- Retry policy (maxRetryCount: 3, maxRetryDelay: 5s)
- Disable lazy loading
- Enable logging in development
```

**Key Principle**: ALWAYS use parameterized queries. NEVER concatenate user input in SQL strings.

---

## 📖 KNOWLEDGE BASE PATTERNS

### 1. Connection String Configuration

```json
// Pattern: connection-string-format
// appsettings.json (development)
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MyDatabase;Trusted_Connection=true;TrustServerCertificate=true;Encrypt=false"
  }
}

// appsettings.Production.json (production with SQL authentication)
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=192.168.9.51;Database=ConstructionManagement;User=sa;Password=Dmineps2023;TrustServerCertificate=true;Encrypt=false;Max Pool Size=100;Min Pool Size=5;Connection Timeout=30"
  }
}

// appsettings.json (production with Azure SQL)
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:myserver.database.windows.net,1433;Database=MyDatabase;User ID=myuser@myserver;Password=***;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  }
}
```

### 2. Connection String Security with User Secrets

```bash
# Pattern: connection-string-secrets
# Store connection string in User Secrets (development)

# Initialize user secrets
dotnet user-secrets init --project src/WebAPI

# Set connection string
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=DevDB;User=dev;Password=dev123;TrustServerCertificate=true" --project src/WebAPI

# List all secrets
dotnet user-secrets list --project src/WebAPI

# Remove a secret
dotnet user-secrets remove "ConnectionStrings:DefaultConnection" --project src/WebAPI

# Clear all secrets
dotnet user-secrets clear --project src/WebAPI
```

```csharp
// Access in Program.cs (automatically loaded in development)
var builder = WebApplication.CreateBuilder(args);

// Connection string loaded from:
// 1. User Secrets (development)
// 2. appsettings.json (all environments)
// 3. appsettings.{Environment}.json (environment-specific)
// 4. Environment variables (production)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
```

### 3. Connection Pooling Configuration

```csharp
// Pattern: connection-pooling, connection-timeout
using Microsoft.EntityFrameworkCore;
using Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    // Connection string with pooling parameters
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    // If not in connection string, add pooling parameters programmatically
    if (!connectionString.Contains("Max Pool Size"))
    {
        connectionString += ";Max Pool Size=100;Min Pool Size=5;Connection Timeout=30;Pooling=true";
    }

    options.UseSqlServer(connectionString, sqlOptions =>
    {
        // Retry policy for transient failures
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null);

        // Command timeout (seconds)
        sqlOptions.CommandTimeout(30);
    });

    // Disable lazy loading
    options.UseLazyLoadingProxies(false);

    // Enable logging in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
```

### 4. Connection Retry Policy

```csharp
// Pattern: connection-retry-policy
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        // Automatic retry for transient failures
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,                    // Retry up to 3 times
            maxRetryDelay: TimeSpan.FromSeconds(5),  // Max 5 seconds between retries
            errorNumbersToAdd: null);            // Use default transient error numbers

        // Transient errors that trigger retry (default):
        // - 1205: Deadlock victim
        // - 2: Connection timeout
        // - -2: Timeout expired
        // - 64: Communication link failure
        // - 233: Connection initialization error
    });
});
```

### 5. Parameterized Queries (SQL Injection Prevention)

```csharp
// Pattern: parameterized-queries, sql-injection-prevention
using Microsoft.EntityFrameworkCore;

public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    public UserRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    // ✅ CORRECT: Parameterized query
    public async Task<IEnumerable<User>> GetActiveUsersByRoleAsync(string role)
    {
        return await _context.Users
            .FromSqlRaw(
                "SELECT * FROM Users WHERE Role = {0} AND IsActive = 1",
                role)
            .ToListAsync();
    }

    // ✅ CORRECT: Multiple parameters
    public async Task<IEnumerable<User>> GetUsersByRoleAndStatusAsync(string role, bool isActive)
    {
        return await _context.Users
            .FromSqlRaw(
                "SELECT * FROM Users WHERE Role = {0} AND IsActive = {1}",
                role,
                isActive)
            .ToListAsync();
    }

    // ❌ WRONG: SQL injection vulnerability
    public async Task<IEnumerable<User>> GetUsersByRole_VULNERABLE(string role)
    {
        // NEVER do this! SQL injection vulnerability!
        var sql = $"SELECT * FROM Users WHERE Role = '{role}' AND IsActive = 1";
        return await _context.Users.FromSqlRaw(sql).ToListAsync();

        // Attack example: role = "admin' OR '1'='1"
        // Results in: SELECT * FROM Users WHERE Role = 'admin' OR '1'='1' AND IsActive = 1
        // Returns all users!
    }

    // ❌ WRONG: String concatenation
    public async Task<IEnumerable<User>> GetUsersByRole_VULNERABLE2(string role)
    {
        var sql = "SELECT * FROM Users WHERE Role = '" + role + "' AND IsActive = 1";
        return await _context.Users.FromSqlRaw(sql).ToListAsync();
    }
}
```

### 6. Query Performance with Indexes

```sql
-- Pattern: index-optimization
-- Create indexes for frequent WHERE clauses

-- Unique index on Email (created by EF Core configuration)
CREATE UNIQUE NONCLUSTERED INDEX IX_Users_Email
ON Users(Email);

-- Index on Role for filtering
CREATE NONCLUSTERED INDEX IX_Users_Role
ON Users(Role)
INCLUDE (IsActive, CreatedAt);

-- Composite index on (Role, IsActive)
CREATE NONCLUSTERED INDEX IX_Users_Role_IsActive
ON Users(Role, IsActive);

-- Index on foreign key (created automatically by EF Core)
CREATE NONCLUSTERED INDEX IX_Loans_UserId
ON Loans(UserId);

-- Find missing indexes (run this query to optimize)
SELECT
    migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) AS improvement_measure,
    'CREATE INDEX IX_' + OBJECT_NAME(mid.object_id, mid.database_id) + '_' + REPLACE(REPLACE(REPLACE(mid.equality_columns, ', ', '_'), '[', ''), ']', '') +
    ' ON ' + OBJECT_NAME(mid.object_id, mid.database_id) + ' (' + mid.equality_columns + ')' AS create_index_statement
FROM sys.dm_db_missing_index_details AS mid
CROSS APPLY sys.dm_db_missing_index_groups AS mig
CROSS APPLY sys.dm_db_missing_index_group_stats AS migs
WHERE migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) > 10
ORDER BY improvement_measure DESC;
```

### 7. Query Execution Plan Analysis

```sql
-- Pattern: query-execution-plan
-- Enable execution plan statistics
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Run your query
SELECT u.*, COUNT(l.Id) as LoanCount
FROM Users u
LEFT JOIN Loans l ON u.Id = l.UserId
WHERE u.IsActive = 1
GROUP BY u.Id, u.Email, u.Name, u.PasswordHash, u.Role, u.IsActive, u.CreatedAt, u.UpdatedAt;

-- Check execution plan in SQL Server Management Studio
-- Look for:
-- - Table scans (BAD - create index)
-- - Index scans (OK)
-- - Index seeks (GOOD)
-- - High cost operations

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
```

### 8. Least Privilege Principle

```sql
-- Pattern: least-privilege-principle
-- Create dedicated database user with minimal permissions

-- Create SQL login (server-level)
CREATE LOGIN app_user WITH PASSWORD = 'StrongPassword123!';

-- Create database user (database-level)
USE ConstructionManagement;
CREATE USER app_user FOR LOGIN app_user;

-- Grant minimal permissions (read/write data only, NO schema changes)
ALTER ROLE db_datareader ADD MEMBER app_user;  -- SELECT
ALTER ROLE db_datawriter ADD MEMBER app_user;  -- INSERT, UPDATE, DELETE

-- DO NOT grant:
-- - db_owner (full control)
-- - db_ddladmin (schema changes)
-- - db_securityadmin (security changes)

-- Update connection string to use app_user
-- Server=192.168.9.51;Database=ConstructionManagement;User=app_user;Password=StrongPassword123!
```

### 9. Encrypted Connections

```json
// Pattern: connection-encryption, encrypted-connections
// Development (local SQL Server, no encryption)
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=DevDB;Trusted_Connection=true;TrustServerCertificate=true;Encrypt=false"
  }
}

// Production (Azure SQL or remote SQL Server, encrypted)
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:myserver.database.windows.net,1433;Database=MyDatabase;User ID=myuser;Password=***;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  }
}

// Parameters explained:
// - Encrypt=True: Enable SSL/TLS encryption
// - TrustServerCertificate=False: Validate server certificate (production)
// - TrustServerCertificate=True: Skip certificate validation (dev only)
```

### 10. Password Hashing (Application-Level)

```csharp
// Pattern: password-hashing
// NEVER store passwords in plain text in database

using BCrypt.Net;

public class PasswordService
{
    // Hash password before storing
    public string HashPassword(string plainPassword)
    {
        // BCrypt automatically generates salt
        return BCrypt.HashPassword(plainPassword, workFactor: 11);
    }

    // Verify password during login
    public bool VerifyPassword(string plainPassword, string hashedPassword)
    {
        return BCrypt.Verify(plainPassword, hashedPassword);
    }
}

// Usage in UserService
public async Task<User> CreateUserAsync(string email, string plainPassword)
{
    var passwordHash = _passwordService.HashPassword(plainPassword);

    var user = User.Create(email, "User Name", passwordHash, "user");
    await _userRepository.AddAsync(user);
    await _unitOfWork.SaveChangesAsync();

    return user;
}
```

### 11. Batch Operations for Performance

```csharp
// Pattern: batch-operations
public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    // ✅ GOOD: Bulk insert with AddRange
    public async Task AddManyAsync(IEnumerable<User> users)
    {
        await _context.Users.AddRangeAsync(users);
        // Call SaveChangesAsync once after all adds
    }

    // ❌ BAD: Multiple SaveChanges calls
    public async Task AddManySlowly(IEnumerable<User> users)
    {
        foreach (var user in users)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync(); // SLOW! One DB round-trip per user
        }
    }

    // ✅ GOOD: Bulk update
    public async Task UpdateManyAsync(IEnumerable<User> users)
    {
        _context.Users.UpdateRange(users);
        // Call SaveChangesAsync once
    }

    // ✅ GOOD: Bulk delete
    public void DeleteMany(IEnumerable<User> users)
    {
        _context.Users.RemoveRange(users);
        // Call SaveChangesAsync once
    }
}
```

### 12. Query Optimization with Explicit Columns

```csharp
// Pattern: query-performance
public class UserRepository : IUserRepository
{
    // ✅ GOOD: Select specific columns
    public async Task<IEnumerable<UserDto>> GetActiveUsersAsync()
    {
        return await _context.Users
            .Where(u => u.IsActive)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                Role = u.Role
                // PasswordHash NOT included (security + performance)
            })
            .AsNoTracking()
            .ToListAsync();
    }

    // ❌ BAD: Select all columns (including PasswordHash)
    public async Task<IEnumerable<User>> GetActiveUsers_Inefficient()
    {
        return await _context.Users
            .Where(u => u.IsActive)
            .ToListAsync(); // Returns all columns, including sensitive data
    }
}
```

### 13. Existence Check Optimization

```csharp
// Pattern: query-performance (existence checks)
public class UserRepository : IUserRepository
{
    // ✅ GOOD: Use Any() for existence check (fast)
    public async Task<bool> ExistsByEmailAsync(string email)
    {
        return await _context.Users
            .AnyAsync(u => u.Email == email.ToLowerInvariant());
        // Generates: SELECT CASE WHEN EXISTS(SELECT 1 FROM Users WHERE Email = @p0) THEN 1 ELSE 0 END
    }

    // ❌ BAD: Use Count() for existence check (slow)
    public async Task<bool> ExistsByEmail_Inefficient(string email)
    {
        var count = await _context.Users
            .CountAsync(u => u.Email == email.ToLowerInvariant());
        return count > 0;
        // Generates: SELECT COUNT(*) FROM Users WHERE Email = @p0
        // Scans entire result set, slower than EXISTS
    }
}
```

### 14. Monitoring and Diagnostics

```sql
-- Pattern: monitoring-diagnostics

-- Check active connections
SELECT
    DB_NAME(dbid) as DatabaseName,
    COUNT(dbid) as NumberOfConnections,
    loginame as LoginName
FROM sys.sysprocesses
WHERE dbid > 0
GROUP BY dbid, loginame
ORDER BY NumberOfConnections DESC;

-- Check long-running queries
SELECT
    r.session_id,
    r.start_time,
    r.status,
    r.command,
    SUBSTRING(t.text, (r.statement_start_offset/2)+1,
        ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(t.text)
            ELSE r.statement_end_offset
        END - r.statement_start_offset)/2) + 1) AS query_text,
    r.total_elapsed_time/1000 as elapsed_seconds
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id > 50
ORDER BY r.total_elapsed_time DESC;

-- Check database size
EXEC sp_spaceused;
```

### 15. Transaction Management

```csharp
// Pattern: transaction-management
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        await _context.Database.CommitTransactionAsync(cancellationToken);
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        await _context.Database.RollbackTransactionAsync(cancellationToken);
    }
}

// Usage in service
public async Task TransferLoanAsync(Guid fromUserId, Guid toUserId, Guid loanId)
{
    await _unitOfWork.BeginTransactionAsync();

    try
    {
        var loan = await _unitOfWork.Loans.GetByIdAsync(loanId);
        if (loan == null) throw new NotFoundException("Loan not found");

        if (loan.UserId != fromUserId)
            throw new InvalidOperationException("Loan does not belong to source user");

        loan.UpdateUserId(toUserId);
        _unitOfWork.Loans.Update(loan);

        await _unitOfWork.SaveChangesAsync();
        await _unitOfWork.CommitTransactionAsync();
    }
    catch
    {
        await _unitOfWork.RollbackTransactionAsync();
        throw;
    }
}
```

---

## ✅ REQUIRED PATTERNS

1. **Parameterized Queries**: ALWAYS use `{0}`, `{1}` parameters in FromSqlRaw
2. **Connection Pooling**: Configure Max Pool Size, Min Pool Size, Connection Timeout
3. **Retry Policy**: Enable retry on failure for transient errors
4. **User Secrets**: Use dotnet user-secrets for development connection strings
5. **Encrypted Connections**: Use Encrypt=True for production
6. **Least Privilege**: Use dedicated database user with minimal permissions
7. **Password Hashing**: Use BCrypt or similar for password storage
8. **Index Optimization**: Create indexes on foreign keys and WHERE columns

---

## ❌ PROHIBITED PATTERNS

1. **NO SQL Injection**: Do NOT concatenate user input in SQL strings
2. **NO Plain Text Passwords**: Do NOT store passwords without hashing
3. **NO Hardcoded Credentials**: Do NOT commit connection strings to source control
4. **NO Excessive Permissions**: Do NOT use 'sa' or db_owner in production
5. **NO Unencrypted Connections**: Do NOT use Encrypt=false in production

---

## 🎯 VALIDATION RULES

- ✅ All queries use parameterized syntax (`{0}`, `{1}`)
- ✅ Connection string in User Secrets or environment variables
- ✅ Connection pooling configured (Max/Min Pool Size)
- ✅ Retry policy enabled
- ✅ Indexes created on foreign keys and frequent WHERE columns
- ✅ Passwords hashed with BCrypt or similar
- ✅ Dedicated database user with minimal permissions
- ❌ NO SQL injection vulnerabilities
- ❌ NO plain text passwords in database
- ❌ NO hardcoded credentials in code

---

**Created**: 2025-12-30
**Patterns**: 15 MS SQL patterns
**Lines**: ~600
**Stack**: csharp-react-mssql (simplified-clean)

*MS SQL Server Specialist - Simplified Clean Architecture*
*Parameterized Queries Only | Connection Pooling | Retry Policy | NO SQL Injection*
