# EF Core Specialist — Generic
# EF Coreスペシャリスト — 汎用
# Chuyen Gia EF Core — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: Entity Framework Core 8+, C# 12-14
**Aspect**: Data Access — DbContext, Queries, Migrations, Performance
**Purpose**: Consultation agent for /plan and /execute — EF Core patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 64.1–64.9 |
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

**Your ONLY responsibility**: Enforce EF Core data access standards — DbContext configuration, NoTracking by default, query projections, ExecuteUpdate/ExecuteDelete, compiled queries, interceptors, value converters, read/write separation, and migration workflow for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 64.1: DbContext Configuration — IEntityTypeConfiguration
> Source: E1 ef-core

Use `IEntityTypeConfiguration<T>` for entity configs. `ApplyConfigurationsFromAssembly` discovers them.

```csharp
// DO — DbContext with primary constructor [E1]
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}

// DO — Separate configuration per entity [E1]
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Total).HasPrecision(18, 2);
        builder.HasMany(o => o.Items).WithOne()
            .HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(o => o.CustomerId);
    }
}
```

### Pattern 64.2: NoTracking by Default
> Source: E2 efcore-patterns

Disable change tracking by default. Most queries are read-only. Opt-in to tracking for writes.

```csharp
// DO — NoTracking by default [E2]
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
    }
}

// DO — Explicit AsTracking() for writes [E2]
var order = await db.Orders.AsTracking()
    .FirstOrDefaultAsync(o => o.Id == orderId, ct);
order.Status = OrderStatus.Shipped;
await db.SaveChangesAsync(ct);

// DO — Explicit Update() when NoTracking [E2]
var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
order.Status = OrderStatus.Shipped;
db.Orders.Update(order);
await db.SaveChangesAsync(ct);
```

```csharp
// DON'T — Forget that NoTracking means SaveChanges does nothing [E2]
var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
order.Status = OrderStatus.Shipped;
await db.SaveChangesAsync(ct);  // Nothing happens! Entity not tracked
```

### Pattern 64.3: Query Projections — Avoid Over-Fetching
> Source: E1 ef-core, E2 database-performance

Use `.Select()` to project into DTOs. Only load columns you need. Never `SELECT *`.

```csharp
// DO — Project to DTO [E1]
public async Task<OrderResponse?> GetOrderAsync(Guid id, CancellationToken ct)
{
    return await db.Orders
        .Where(o => o.Id == id)
        .Select(o => new OrderResponse(
            o.Id, o.Total, o.CreatedAt,
            o.Items.Select(i => new OrderItemResponse(i.ProductName, i.Quantity, i.Price)).ToList()))
        .FirstOrDefaultAsync(ct);
}

// DO — Pagination with row limits [E2]
var items = await db.Orders
    .OrderByDescending(o => o.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(o => new OrderSummary(o.Id, o.CustomerName, o.Total))
    .ToListAsync(ct);
```

```csharp
// DON'T — Load all then filter in memory [E1]
var orders = await db.Orders.ToListAsync(ct);
var pending = orders.Where(o => o.Status == OrderStatus.Pending);

// DON'T — Return unbounded result sets [E2]
var all = await db.Orders.ToListAsync();  // No limit!
```

### Pattern 64.4: Read/Write Model Separation (CQRS)
> Source: E2 database-performance

Separate read models (projections, denormalized) from write models (commands, validation).

```csharp
// DO — Read store with projections [E2]
public interface IOrderReadStore
{
    Task<OrderDetail?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<OrderSummary>> ListAsync(int limit, Guid? cursor, CancellationToken ct);
    Task<bool> ExistsAsync(Guid id, CancellationToken ct);
}

// DO — Write store with commands [E2]
public interface IOrderWriteStore
{
    Task<Guid> CreateAsync(CreateOrderCommand command, CancellationToken ct);
    Task UpdateStatusAsync(Guid id, OrderStatus status, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}
```

### Pattern 64.5: ExecuteUpdateAsync / ExecuteDeleteAsync — Bulk Operations
> Source: E1 ef-core

Bypass change tracking for bulk updates/deletes. Better performance for batch operations.

```csharp
// DO — Bulk update without loading entities [E1]
await db.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Expired)
        .SetProperty(o => o.UpdatedAt, clock.GetUtcNow()), ct);

// DO — Bulk delete [E1]
await db.Orders
    .Where(o => o.Status == OrderStatus.Cancelled && o.CreatedAt < archiveCutoff)
    .ExecuteDeleteAsync(ct);
```

### Pattern 64.6: Interceptors — Audit Trails and Soft Deletes
> Source: E1 ef-core

Use `SaveChangesInterceptor` for cross-cutting concerns.

```csharp
// DO — Audit interceptor [E1]
public class AuditInterceptor(TimeProvider clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken ct = default)
    {
        var context = eventData.Context;
        if (context is null) return ValueTask.FromResult(result);
        var now = clock.GetUtcNow();
        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            { entry.Entity.CreatedAt = now; entry.Entity.UpdatedAt = now; }
            else if (entry.State == EntityState.Modified)
            { entry.Entity.UpdatedAt = now; }
        }
        return ValueTask.FromResult(result);
    }
}

// DO — Register interceptor via DI [E1]
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseNpgsql(connString)
        .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));
```

### Pattern 64.7: Compiled Queries — Hot Paths
> Source: E1 ef-core

Skip expression tree translation on frequent queries.

```csharp
// DO — Compiled async query [E1]
public static readonly Func<AppDbContext, Guid, CancellationToken, Task<Order?>> GetById =
    EF.CompileAsyncQuery((AppDbContext db, Guid id, CancellationToken ct) =>
        db.Orders.Include(o => o.Items).FirstOrDefault(o => o.Id == id));

// Usage
var order = await OrderQueries.GetById(db, orderId, ct);
```

### Pattern 64.8: Value Converters and Global Query Filters
> Source: E1 ef-core

Strongly-typed IDs, enum-as-string, soft delete filters.

```csharp
// DO — Strongly-typed ID converter [E1]
builder.Property(o => o.Id)
    .HasConversion(id => id.Value, value => new OrderId(value));

// DO — Enum as string [E1]
builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(50);

// DO — Soft delete filter [E1]
builder.HasQueryFilter(o => !o.IsDeleted);

// DO — Bypass when needed [E1]
var allOrders = await db.Orders.IgnoreQueryFilters().ToListAsync(ct);
```

### Pattern 64.9: Migration Workflow
> Source: E1 ef-core, E2 efcore-patterns

Migrations are code. Review them. Never auto-apply in production.

```bash
# DO — Create migration [E1]
dotnet ef migrations add AddOrderIndex \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api

# DO — Generate idempotent SQL for production [E1]
dotnet ef migrations script --idempotent --output migrations.sql
```

```csharp
// DON'T — Auto-migrate in production startup [E2]
app.Services.GetRequiredService<AppDbContext>().Database.MigrateAsync();  // Dangerous!

// DON'T — Edit migration files manually [E2]
// DON'T — Use lazy loading [E1]
options.UseLazyLoadingProxies();  // Causes N+1
```

| Scenario | Recommendation |
|----------|---------------|
| Standard CRUD | DbContext with projections |
| Bulk updates (100+ rows) | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` |
| Hot-path read query | Compiled query |
| Complex reporting | Raw SQL with `FromSqlInterpolated` or Dapper |
| Audit trails | `SaveChangesInterceptor` |
| Multi-tenancy | Global query filter |
| Soft deletes | Global query filter + interceptor |
| Strongly-typed IDs | Value converter |
| Production migration | Idempotent SQL script, never auto-migrate |

---

*EF Core Specialist v1.0 — Generic*
*Sources: E1 ef-core, E2 efcore-patterns, E2 database-performance, E5 data-dotnet*
*Pattern range: 64.1–64.9*
