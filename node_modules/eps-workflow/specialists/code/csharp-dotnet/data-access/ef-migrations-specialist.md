# EF Core Migrations Specialist — Generic
# EF Coreマイグレーションスペシャリスト — 汎用
# Chuyen Gia Migration EF Core — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: Entity Framework Core 8+, dotnet-ef CLI
**Aspect**: Database Migrations — Schema Management, Deployment, Safety
**Purpose**: Consultation agent for /plan and /execute — EF Core migration patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 64.51–64.56 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | csharp-dotnet-core |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## ROLE

**Your ONLY responsibility**: Enforce EF Core migration standards — CLI workflow, never edit manually, dedicated migration service, ExecutionStrategy for transient failures, idempotent scripts for production, and Aspire integration for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 64.51: CLI Workflow — Create, Remove, Apply, Script
> Source: E2 efcore-patterns, E1 ef-core

Always use EF Core CLI commands. Never manually edit, delete, or rename migration files.

```bash
# DO — Create migration [E2]
dotnet ef migrations add AddOrderIndex \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api

# DO — Remove last migration (if not applied) [E2]
dotnet ef migrations remove \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api

# DO — Apply to dev database [E2]
dotnet ef database update \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api

# DO — Generate idempotent SQL for production [E1]
dotnet ef migrations script --idempotent \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api \
    --output migrations.sql

# DO — Rollback to specific migration [E2]
dotnet ef database update PreviousMigrationName
```

```bash
# DON'T — Delete migration files directly [E2]
rm Migrations/20240101_AddCustomerTable.cs

# DON'T — Rename migration files [E2]
# DON'T — Copy migrations between projects [E2]
```

### Pattern 64.52: Review Before Apply
> Source: E1 ef-core

Migrations are code. Review for data loss, index strategy, constraint names.

```csharp
// DO — Review generated migration [E1]
// Check: Does it drop columns? Add indexes on frequently queried columns?
// Check: Are foreign key names sensible?
// Check: Is the Down() method correct?
protected override void Up(MigrationBuilder migrationBuilder)
{
    // Custom SQL is OK in Up()/Down()
    migrationBuilder.Sql("CREATE INDEX IX_Orders_Status ON Orders (Status) WHERE Status != 5");
}
```

### Pattern 64.53: Dedicated Migration Service (Aspire)
> Source: E2 efcore-patterns

Separate migration execution from app startup. Migrations run first, then exit.

```csharp
// DO — MigrationWorker as BackgroundService [E2]
public class MigrationWorker(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime lifetime,
    ILogger<MigrationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try
        {
            using var scope = serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var strategy = db.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                var pending = await db.Database.GetPendingMigrationsAsync(ct);
                if (pending.Any())
                {
                    logger.LogInformation("Applying {Count} migrations...", pending.Count());
                    await db.Database.MigrateAsync(ct);
                }
            });
        }
        finally
        {
            lifetime.StopApplication();  // Exit after migration
        }
    }
}
```

```csharp
// DO — AppHost: API waits for migration completion [E2]
var migrations = builder.AddProject<Projects.MyApp_MigrationService>("migrations")
    .WaitFor(db).WithReference(db);

var api = builder.AddProject<Projects.MyApp_Api>("api")
    .WaitForCompletion(migrations)  // Key: waits for migrations to finish
    .WithReference(db);
```

### Pattern 64.54: ExecutionStrategy for Transient Failures
> Source: E2 efcore-patterns

Wrap operations in `CreateExecutionStrategy()` for automatic retry on transient failures.

```csharp
// DO — ExecutionStrategy with transaction [E2]
var strategy = db.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    try
    {
        // Operations...
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
});
```

### Pattern 64.55: Production Deployment — Never Auto-Migrate
> Source: E1 ef-core, E2 efcore-patterns

```csharp
// DON'T — Auto-migrate on app startup [E2]
app.Services.GetRequiredService<AppDbContext>().Database.MigrateAsync();

// DO — Use idempotent SQL scripts applied by DBA/CI pipeline [E1]
// DO — Or use dedicated migration service (Pattern 64.53)
```

### Pattern 64.56: Multiple DbContexts
> Source: E2 efcore-patterns

```bash
# DO — Specify context when multiple exist [E2]
dotnet ef migrations add InitialCreate \
    --context ApplicationDbContext \
    --project src/MyApp.Infrastructure

dotnet ef migrations add InitialCreate \
    --context IdentityDbContext \
    --project src/MyApp.Infrastructure
```

---

*EF Core Migrations Specialist v1.0 — Generic*
*Sources: E2 efcore-patterns (migrations section), E1 ef-core*
*Pattern range: 64.51–64.56*
