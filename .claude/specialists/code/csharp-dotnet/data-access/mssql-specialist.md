# MSSQL / Database Performance Specialist — Generic
# MSSQLデータベース性能スペシャリスト — 汎用
# Chuyen Gia MSSQL & Hieu Nang Database — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: EF Core 8+, SQL Server / PostgreSQL, Dapper
**Aspect**: Database Performance — N+1 Prevention, Query Optimization, CQRS Data Layer
**Purpose**: Consultation agent for /plan and /execute — database performance patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 64.81–64.86 |
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

**Your ONLY responsibility**: Enforce database performance standards — avoid N+1, AsNoTracking for reads, always apply row limits, SQL joins (never application-side), read/write separation, Dapper for complex queries, and parameterized SQL for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 64.81: Avoid N+1 Queries
> Source: E2 database-performance

```csharp
// DON'T — N+1: fetches orders, then queries each order's items [E2]
var orders = await db.Orders.ToListAsync();
foreach (var order in orders)
{
    var items = await db.OrderItems.Where(i => i.OrderId == order.Id).ToListAsync();
}

// DO — Single query with Include [E2]
var orders = await db.Orders.AsNoTracking().Include(o => o.Items).ToListAsync();

// DO — Batch query with Dapper (2 queries, no N+1) [E2]
const string sql = """
    SELECT id, customer_id, total FROM orders WHERE customer_id = @CustomerId;
    SELECT oi.* FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id WHERE o.customer_id = @CustomerId;
    """;
using var multi = await connection.QueryMultipleAsync(sql, new { CustomerId = customerId });
var orders = (await multi.ReadAsync<OrderRow>()).ToList();
var items = (await multi.ReadAsync<OrderItemRow>()).ToList();
```

### Pattern 64.82: Always Apply Row Limits
> Source: E2 database-performance

Never return unbounded result sets. Every read method must have a limit.

```csharp
// DO — Required limit parameter [E2]
Task<IReadOnlyList<OrderSummary>> GetByCustomerAsync(
    CustomerId customerId, int limit, OrderId? cursor = null, CancellationToken ct = default);

// DO — Cursor-based pagination with raw SQL [E2]
const string sql = """
    SELECT id, customer_id, total, status, created_at
    FROM orders
    WHERE customer_id = @CustomerId
    AND (@Cursor IS NULL OR created_at < (SELECT created_at FROM orders WHERE id = @Cursor))
    ORDER BY created_at DESC
    LIMIT @Limit
    """;

// DO — EF Core pagination [E2]
var items = await db.Orders.AsNoTracking()
    .OrderByDescending(o => o.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(o => new OrderSummary(o.Id, o.Total, o.Status))
    .ToListAsync(ct);
```

```csharp
// DON'T — Unbounded query [E2]
var all = await db.Orders.ToListAsync();  // No limit!
```

### Pattern 64.83: Never Application-Side Joins
> Source: E2 database-performance

Joins must happen in SQL, not in C#.

```csharp
// DON'T — Application join [E2]
var customers = await db.Customers.ToListAsync();
var orders = await db.Orders.ToListAsync();
var result = customers.Select(c => new {
    Customer = c,
    Orders = orders.Where(o => o.CustomerId == c.Id).ToList()  // O(n*m)!
});

// DO — SQL join [E2]
var result = await db.Customers.AsNoTracking()
    .Include(c => c.Orders).ToListAsync();

// DO — Dapper explicit join [E2]
const string sql = """
    SELECT c.id, c.name, COUNT(o.id) as order_count
    FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.id, c.name
    """;
```

### Pattern 64.84: Read/Write Store Pattern
> Source: E2 database-performance

Separate interfaces for read (projections, denormalized) and write (commands, validation).

```csharp
// DO — Read store: multiple projections, no tracking [E2]
public interface IUserReadStore
{
    Task<UserProfile?> GetByIdAsync(UserId id, CancellationToken ct);
    Task<IReadOnlyList<UserSummary>> GetAllAsync(int limit, UserId? cursor, CancellationToken ct);
    Task<bool> EmailExistsAsync(EmailAddress email, CancellationToken ct);
}

// DO — Write store: commands, minimal returns [E2]
public interface IUserWriteStore
{
    Task<UserId> CreateAsync(CreateUserCommand command, CancellationToken ct);
    Task UpdateAsync(UserId id, UpdateUserCommand command, CancellationToken ct);
    Task DeleteAsync(UserId id, CancellationToken ct);
}
```

### Pattern 64.85: Dapper for Complex Queries
> Source: E2 database-performance

Use Dapper when EF Core's LINQ-to-SQL generates suboptimal queries or for complex reporting.

```csharp
// DO — Dapper for complex reporting [E2]
const string sql = """
    SELECT
        o.status,
        COUNT(*) as count,
        SUM(o.total) as total_revenue,
        AVG(o.total) as avg_order_value
    FROM orders o
    WHERE o.created_at >= @StartDate AND o.created_at < @EndDate
    GROUP BY o.status
    ORDER BY total_revenue DESC
    """;
var stats = await connection.QueryAsync<OrderStats>(sql, new { StartDate = start, EndDate = end });
```

### Pattern 64.86: Query Splitting for Multiple Collections
> Source: E2 efcore-patterns

Use `AsSplitQuery()` when loading entities with multiple navigation collections to avoid cartesian explosion.

```csharp
// DO — Split query for multiple collections [E2]
var order = await db.Orders
    .AsNoTracking()
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .AsSplitQuery()  // Generates 3 separate queries instead of cartesian join
    .FirstOrDefaultAsync(o => o.Id == id, ct);
```

| Scenario | Recommendation |
|----------|---------------|
| Simple CRUD | EF Core with projections |
| Complex reporting | Dapper with raw SQL |
| Multiple collections | `AsSplitQuery()` |
| Hot-path reads | Compiled queries or Dapper |
| Bulk operations | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` |
| Full-text search | Raw SQL or dedicated search engine |
| Read-heavy workload | NoTracking by default |
| Unbounded queries | Always `.Take(limit)` |

---

*MSSQL / Database Performance Specialist v1.0 — Generic*
*Sources: E2 database-performance, E2 efcore-patterns, E1 ef-core*
*Pattern range: 64.81–64.86*
