# Query Handler Specialist — CQRS Variant
# クエリハンドラースペシャリスト
# Chuyen Gia Query Handler — CQRS

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: clean-cqrs
**Aspect**: Application Layer — Query Handlers (MediatR)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | clean-cqrs |
| **Pattern Numbers** | 11.1–11.4 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

Enforce query handler patterns for clean-cqrs variant. Queries read data. Use projections, NoTracking. Never modify state.

---

## Patterns

### Pattern 11.1: Query + Handler Structure
> Source: E5 ddd-dotnet, E2 database-performance

```csharp
// DO — Query with projections, NoTracking [E5]
public static class GetOrder
{
    public sealed record Query(Guid OrderId) : IRequest<Result<OrderResponse>>;

    internal sealed class Handler(AppDbContext db) : IRequestHandler<Query, Result<OrderResponse>>
    {
        public async Task<Result<OrderResponse>> Handle(Query request, CancellationToken ct)
        {
            var order = await db.Orders
                .Where(o => o.Id == request.OrderId)
                .Select(o => new OrderResponse(o.Id, o.Total, o.Status.ToString(), o.CreatedAt))
                .FirstOrDefaultAsync(ct);

            return order is not null
                ? Result.Success(order)
                : Result.Failure<OrderResponse>("Order not found");
        }
    }
}
```

### Pattern 11.2: List Queries with Pagination
> Source: E2 database-performance

```csharp
// DO — Always limit results [E2]
public static class ListOrders
{
    public sealed record Query(int Page = 1, int PageSize = 20) : IRequest<PagedList<OrderSummary>>;

    internal sealed class Handler(AppDbContext db) : IRequestHandler<Query, PagedList<OrderSummary>>
    {
        public async Task<PagedList<OrderSummary>> Handle(Query request, CancellationToken ct)
        {
            var query = db.Orders.OrderByDescending(o => o.CreatedAt)
                .Select(o => new OrderSummary(o.Id, o.CustomerName, o.Total));

            var total = await query.CountAsync(ct);
            var items = await query.Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize).ToListAsync(ct);

            return new PagedList<OrderSummary>(items, total, request.Page, request.PageSize);
        }
    }
}
```

### Pattern 11.3: Queries Never Modify State
> Source: E5 ddd-dotnet

```csharp
// DON'T — Query that modifies data [E5]
public async Task<OrderResponse> Handle(Query request, CancellationToken ct)
{
    var order = await db.Orders.FindAsync(request.Id);
    order.ViewCount++;  // Side effect in a query!
    await db.SaveChangesAsync(ct);
}
```

### Pattern 11.4: Compiled Queries for Hot Paths
> Source: E1 ef-core

```csharp
// DO — Compiled query for frequently accessed data [E1]
private static readonly Func<AppDbContext, Guid, CancellationToken, Task<OrderResponse?>> GetByIdCompiled =
    EF.CompileAsyncQuery((AppDbContext db, Guid id, CancellationToken ct) =>
        db.Orders.Where(o => o.Id == id)
            .Select(o => new OrderResponse(o.Id, o.Total, o.Status.ToString(), o.CreatedAt))
            .FirstOrDefault());
```

---

*Query Handler Specialist v1.0 — CQRS*
*Sources: E5 ddd-dotnet, E2 database-performance, E1 ef-core*
*Pattern range: 11.1–11.4*
