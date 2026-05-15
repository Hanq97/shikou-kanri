# DDD Patterns Specialist — Clean Architecture
# DDDパターンスペシャリスト — クリーンアーキテクチャ
# Chuyen Gia DDD Patterns — Clean Architecture

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Clean Architecture)
**Technology**: C# 12-14, Domain-Driven Design
**Aspect**: DDD — Bounded Contexts, Domain Services, Specifications, Anti-Corruption Layer
**Purpose**: Consultation agent for /plan and /execute — advanced DDD patterns for Clean Architecture

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 70.1–70.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | None |
| **Cannot Import** | Application, Infrastructure, Presentation |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

**Your ONLY responsibility**: Enforce advanced DDD standards — bounded context boundaries, domain services for cross-aggregate logic, specification pattern, anti-corruption layers, aggregate size limits, and eventual consistency for Clean Architecture .NET projects.

---

## Patterns

### Pattern 70.1: Bounded Context Boundaries
> Source: E5 ddd-dotnet, E1 ddd

Each bounded context has its own domain model. No sharing of entities across contexts.

```csharp
// DO — Separate models per context [E5]
// Orders context:
namespace Orders.Domain { public sealed class Customer { public CustomerId Id; public string Name; } }

// Shipping context:
namespace Shipping.Domain { public sealed class Customer { public CustomerId Id; public Address ShippingAddress; } }

// Same real-world concept, different model per context
```

### Pattern 70.2: Domain Services — Cross-Aggregate Logic
> Source: E1 ddd, E5 ddd-dotnet

When logic doesn't belong to a single aggregate, use a domain service. Stateless, takes aggregates as parameters.

```csharp
// DO — Domain service for cross-aggregate operation [E1]
public sealed class TransferService
{
    public Result Transfer(Account source, Account destination, Money amount)
    {
        var debitResult = source.Debit(amount);
        if (debitResult.IsFailure) return debitResult;

        destination.Credit(amount);
        return Result.Success();
    }
}
```

### Pattern 70.3: Specification Pattern
> Source: E5 ddd-dotnet

Encapsulate query criteria in reusable specifications.

```csharp
// DO — Specification as expression [E5]
public sealed class ActiveOrderSpec : ISpecification<Order>
{
    public Expression<Func<Order, bool>> ToExpression() =>
        order => order.Status != OrderStatus.Cancelled && order.Status != OrderStatus.Expired;
}

// Usage
var activeOrders = await db.Orders.Where(new ActiveOrderSpec().ToExpression()).ToListAsync(ct);
```

### Pattern 70.4: Aggregate Size — Keep Small
> Source: E1 ddd

Small aggregates = fewer concurrency conflicts, faster loads. Reference other aggregates by ID, not navigation.

```csharp
// DO — Reference by ID [E1]
public sealed class OrderLine
{
    public ProductId ProductId { get; private set; }  // ID reference, not Product navigation
    public int Quantity { get; private set; }
    public Money UnitPrice { get; private set; }
}

// DON'T — Large aggregate with navigation properties
public sealed class Order
{
    public Customer Customer { get; set; }  // Full entity loaded — too large
    public List<Product> Products { get; set; }  // Violates aggregate boundary
}
```

### Pattern 70.5: Eventual Consistency Between Aggregates
> Source: E1 ddd, E5 ddd-dotnet

Cross-aggregate consistency via domain events, not transactions spanning multiple aggregates.

```csharp
// DO — Domain event for cross-aggregate side effects [E1]
// Order aggregate raises OrderPlaced
// InventoryReduction handler subscribes and reduces stock

// DON'T — Single transaction across aggregates
using var tx = await db.Database.BeginTransactionAsync();
order.Confirm();
inventory.Reduce(order.Items);  // Different aggregate in same transaction = contention
```

### Pattern 70.6: Anti-Corruption Layer
> Source: E5 ddd-dotnet

Translate external models at the boundary. Don't let external types leak into domain.

```csharp
// DO — ACL translates external to domain [E5]
public sealed class PaymentGatewayAdapter : IPaymentService
{
    private readonly StripeClient _stripe;

    public async Task<PaymentResult> ChargeAsync(Money amount, CancellationToken ct)
    {
        var stripeResult = await _stripe.ChargeAsync(new StripeChargeRequest
        {
            Amount = (long)(amount.Amount * 100),
            Currency = amount.Currency.ToLower()
        });

        return stripeResult.Success
            ? PaymentResult.Success(new PaymentId(stripeResult.Id))
            : PaymentResult.Failure(stripeResult.ErrorMessage);
    }
}
```

---

*DDD Patterns Specialist v1.0 — Clean Architecture*
*Sources: E5 ddd-dotnet, E1 ddd, E1-rules architecture*
*Pattern range: 70.1–70.6*
