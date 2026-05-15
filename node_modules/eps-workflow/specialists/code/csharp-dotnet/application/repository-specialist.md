# Repository Specialist — Simplified Clean Variant
# リポジトリスペシャリスト
# Chuyen Gia Repository

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: simplified-clean
**Aspect**: Data Access — Repository Pattern (DDD aggregate persistence)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | simplified-clean |
| **Pattern Numbers** | 3.1–3.4 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

Enforce repository pattern for simplified-clean variant. Repositories persist aggregates (one per aggregate root). This is a DDD tactical pattern for aggregate boundaries, NOT a generic CRUD wrapper.

---

## Patterns

### Pattern 3.1: When to Use Repository (E-BD8)
> Source: E1 ddd, E1-rules architecture

| Use Repository When | Don't Use When |
|---------------------|----------------|
| DDD with aggregate roots | Simple CRUD without DDD |
| Aggregate boundary enforcement | Direct DbContext is sufficient |
| simplified-clean variant | no-repo, minimal-api, cqrs variants |

### Pattern 3.2: Repository Interface in Domain
> Source: E1 ddd

```csharp
// DO — Repository per aggregate root, defined in Domain [E1]
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct);
    Task AddAsync(Order order, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
```

### Pattern 3.3: EF Core Implementation in Infrastructure
> Source: E2 efcore-patterns

```csharp
// DO — Implementation uses DbContext internally [E2]
public sealed class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public async Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct)
        => await db.Orders.AsTracking()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id.Value, ct);

    public async Task AddAsync(Order order, CancellationToken ct)
        => await db.Orders.AddAsync(order, ct);

    public Task SaveChangesAsync(CancellationToken ct)
        => db.SaveChangesAsync(ct);
}
```

### Pattern 3.4: No Generic Repository
> Source: E1-rules architecture

```csharp
// DON'T — Generic repository wrapping EF [E1-rules]
public interface IRepository<T> { Task<T?> GetByIdAsync(Guid id); }
// Limits EF Core features (Include, projections, compiled queries)
```

---

*Repository Specialist v1.0 — Simplified Clean*
*Sources: E1 ddd, E2 efcore-patterns, E1-rules architecture*
*Pattern range: 3.1–3.4*
