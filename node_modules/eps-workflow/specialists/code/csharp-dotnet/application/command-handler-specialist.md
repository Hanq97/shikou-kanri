# Command Handler Specialist — CQRS Variant
# コマンドハンドラースペシャリスト
# Chuyen Gia Command Handler — CQRS

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: clean-cqrs
**Aspect**: Application Layer — Command Handlers (MediatR)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | clean-cqrs |
| **Pattern Numbers** | 10.1–10.4 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

Enforce command handler patterns for clean-cqrs variant. Commands modify state. One handler per command. Returns Result.

---

## Patterns

### Pattern 10.1: Command + Handler Structure
> Source: E5 ddd-dotnet, E1 ddd

```csharp
// DO — Command as sealed record, Handler as nested class [E5]
public static class CreateOrder
{
    public sealed record Command(string CustomerId, List<OrderItemDto> Items) : IRequest<Result<OrderResponse>>;

    internal sealed class Handler(AppDbContext db, TimeProvider clock) : IRequestHandler<Command, Result<OrderResponse>>
    {
        public async Task<Result<OrderResponse>> Handle(Command request, CancellationToken ct)
        {
            var order = Order.Place(
                new CustomerId(Guid.Parse(request.CustomerId)),
                OrderNumber.Generate(),
                clock.GetUtcNow());

            foreach (var item in request.Items)
                order.AddLine(new ProductId(Guid.Parse(item.ProductId)), item.Quantity, new Money(item.Price, "USD"));

            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);
            return Result.Success(order.ToResponse());
        }
    }
}
```

### Pattern 10.2: One Handler Per Command
> Source: E5 ddd-dotnet

```csharp
// DO — Single responsibility [E5]
public static class ConfirmOrder { public sealed record Command(Guid OrderId) : IRequest<Result>; }
public static class CancelOrder { public sealed record Command(Guid OrderId, string Reason) : IRequest<Result>; }
// Each has its own Handler class
```

### Pattern 10.3: Commands Modify State
> Source: E5 ddd-dotnet

Commands change data. Queries read data. Never mix.

### Pattern 10.4: Register MediatR
> Source: E5 ddd-dotnet

```csharp
// DO — Register in Program.cs [E5]
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
```

---

*Command Handler Specialist v1.0 — CQRS*
*Sources: E5 ddd-dotnet, E1 ddd*
*Pattern range: 10.1–10.4*
