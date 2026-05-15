# Application Service Specialist — Simplified/No-Repo/Minimal-API Variants
# アプリケーションサービススペシャリスト
# Chuyen Gia Application Service

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: simplified-clean, clean-no-repo, clean-minimal-api
**Aspect**: Application Layer — Service Classes (non-CQRS)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | simplified-clean, clean-no-repo, clean-minimal-api |
| **Pattern Numbers** | 2.1–2.4 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

Enforce application service patterns for non-CQRS variants. Services orchestrate domain logic, receive commands/queries, and return Results.

---

## Patterns

### Pattern 2.1: Service Structure
> Source: E1-rules architecture, E2 csharp-coding-standards

```csharp
// DO — Sealed service with primary constructor, returns Result [E1-rules]
public sealed class OrderService(AppDbContext db, TimeProvider clock)
{
    public async Task<Result<OrderResponse>> CreateAsync(CreateOrderRequest request, CancellationToken ct)
    {
        var order = Order.Place(new CustomerId(request.CustomerId), OrderNumber.Generate(), clock.GetUtcNow());
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return Result.Success(order.ToResponse());
    }

    public async Task<Result<OrderResponse>> GetAsync(Guid id, CancellationToken ct)
    {
        var order = await db.Orders.Where(o => o.Id == id)
            .Select(o => new OrderResponse(o.Id, o.Total, o.Status.ToString(), o.CreatedAt))
            .FirstOrDefaultAsync(ct);
        return order is not null ? Result.Success(order) : Result.Failure<OrderResponse>("Not found");
    }
}
```

### Pattern 2.2: One Service Per Aggregate
> Source: E1-rules architecture

```csharp
// DO — OrderService handles Order aggregate operations
// DO — ProductService handles Product aggregate operations
// DON'T — One mega-service for everything
```

### Pattern 2.3: Register as Scoped
> Source: E2 di

```csharp
services.AddScoped<OrderService>();
services.AddScoped<ProductService>();
```

### Pattern 2.4: Service Calls Domain, Not Vice Versa
> Source: E1-rules architecture

Service orchestrates: validate -> domain operation -> persist -> return result.

---

*Application Service Specialist v1.0*
*Sources: E1-rules architecture, E2 csharp-coding-standards*
*Pattern range: 2.1–2.4*
