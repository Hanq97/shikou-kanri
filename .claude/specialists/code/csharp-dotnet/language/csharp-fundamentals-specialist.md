# C# Fundamentals Specialist — Generic
# C#基礎スペシャリスト — 汎用
# Chuyên Gia C# Cơ Bản — Dùng Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10
**Aspect**: C# Language Fundamentals
**Purpose**: Consultation agent for /plan and /execute — modern C# patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 60.1–60.9 |
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

**Your ONLY responsibility**: Enforce modern C# coding standards — immutability, type safety, pattern matching, async patterns, and composition over inheritance for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 60.1: Immutability by Default — Records
> 📌 Source: E2 csharp-coding-standards

Use `record` types for DTOs, messages, events. Use `readonly record struct` for value objects.

```csharp
// ✅ DO — Immutable DTO [E2]
public record CustomerDto(string Id, string Name, string Email);

// ✅ DO — Record with validation [E2]
public record EmailAddress
{
    public string Value { get; init; }
    public EmailAddress(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.Contains('@'))
            throw new ArgumentException("Invalid email", nameof(value));
        Value = value;
    }
}

// ✅ DO — Value object as readonly record struct [E2]
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
}

public readonly record struct Money(decimal Amount, string Currency);
```

```csharp
// ❌ DON'T — Mutable class for DTO [E2]
public class CustomerDto
{
    public string Id { get; set; }  // Mutable — avoid
    public string Name { get; set; }
}

// ❌ DON'T — Class for value object [E2]
public class Money { public decimal Amount { get; set; } }  // Use readonly record struct
```

### Pattern 60.2: Primary Constructors + Sealed Classes
> 📌 Source: E1 coding-style

```csharp
// ✅ DO — Primary constructor for DI [E1]
public sealed class OrderService(IDbContext db, TimeProvider clock)
{
    public async Task<Order> CreateAsync(CreateOrderRequest request, CancellationToken ct)
    {
        var order = new Order(OrderId.New(), request.ProductId, clock.GetUtcNow());
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order;
    }
}

// ✅ DO — sealed by default [E1]
// JIT devirtualization + communicates intent
public sealed class CustomerRepository { }
```

```csharp
// ❌ DON'T — Old-style constructor with field assignments [E1]
public class OrderService
{
    private readonly IDbContext _db;
    public OrderService(IDbContext db) { _db = db; }
}
```

### Pattern 60.3: Pattern Matching — Switch Expressions
> 📌 Source: E2 csharp-coding-standards

```csharp
// ✅ DO — Switch expression with property patterns [E2]
public decimal CalculateDiscount(Order order) => order switch
{
    { Total: > 1000m } => order.Total * 0.15m,
    { Total: > 500m } => order.Total * 0.10m,
    { Total: > 100m } => order.Total * 0.05m,
    _ => 0m
};

// ✅ DO — Null-safe pattern matching [E2]
public decimal GetDiscount(Customer? customer) => customer switch
{
    null => 0m,
    { IsVip: true } => 0.20m,
    { OrderCount: > 10 } => 0.10m,
    _ => 0.05m
};
```

### Pattern 60.4: Nullable Reference Types
> 📌 Source: E2 csharp-coding-standards, E1 coding-style

Enable in `.csproj`: `<Nullable>enable</Nullable>` — mandatory.

```csharp
// ✅ DO — Guard clause with ThrowIfNull (C# 11+) [E2]
public void ProcessOrder(Order? order)
{
    ArgumentNullException.ThrowIfNull(order);
    // order is non-nullable from here
}

// ✅ DO — Explicit nullability in return type [E2]
public string? FindUserName(string userId)
{
    var user = _repository.Find(userId);
    return user?.Name;
}
```

### Pattern 60.5: Async/Await — CancellationToken Required
> 📌 Source: E2 csharp-coding-standards, E1 coding-style

```csharp
// ✅ DO — Always accept CancellationToken [E2]
public async Task<Order> GetOrderAsync(string orderId, CancellationToken ct = default)
{
    return await _repository.GetAsync(orderId, ct);
}

// ✅ DO — ValueTask for hot-path, often-sync methods [E2]
public ValueTask<Order?> GetCachedOrderAsync(string orderId, CancellationToken ct)
{
    if (_cache.TryGetValue(orderId, out var order))
        return ValueTask.FromResult<Order?>(order);
    return GetFromDatabaseAsync(orderId, ct);
}

// ✅ DO — IAsyncEnumerable for streaming [E2]
public async IAsyncEnumerable<Order> StreamOrdersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var order in _repository.StreamAllAsync(ct))
        yield return order;
}
```

```csharp
// ❌ DON'T — Block on async [E2]
var result = GetOrderAsync(id).Result;  // Deadlock risk
var result2 = GetOrderAsync(id).GetAwaiter().GetResult();  // Same
```

### Pattern 60.6: Composition Over Inheritance
> 📌 Source: E2 csharp-coding-standards-composition

Avoid abstract base classes. Use interfaces + composition. Use static helpers for shared logic.

```csharp
// ✅ DO — Interface + composition [E2]
public interface IOrderValidator
{
    Result<Order, OrderError> Validate(Order order);
}

public sealed class OrderService(IOrderValidator validator, IOrderRepository repo)
{
    public async Task<Result<Order, OrderError>> SubmitAsync(Order order, CancellationToken ct)
    {
        var validation = validator.Validate(order);
        if (!validation.IsSuccess) return validation;
        await repo.SaveAsync(order, ct);
        return validation;
    }
}
```

```csharp
// ❌ DON'T — Deep inheritance [E2]
public abstract class BaseService<T> { }
public abstract class BaseOrderService : BaseService<Order> { }
public class OrderService : BaseOrderService { }  // 3 levels deep
```

### Pattern 60.7: Banned Patterns
> 📌 Source: E2 csharp-coding-standards-anti-patterns, E1 coding-style

| Banned | Use Instead | Why |
|--------|------------|-----|
| `AutoMapper` / `Mapster` | Explicit mapping extension methods | Reflection magic, runtime failures [E2] |
| `DateTime.Now` | `TimeProvider` (.NET 8+) | Testability [E1] |
| `new HttpClient()` | `IHttpClientFactory` | Socket exhaustion [E1] |
| Implicit conversions on value objects | Explicit conversion only | Silent bugs [E2] |
| Block-scoped namespaces | File-scoped namespaces | Wasted indentation [E1] |
| `public` by default | `internal` by default | Minimize API surface [E1] |

### Pattern 60.8: File Organization
> 📌 Source: E1 coding-style

```
- File-scoped namespaces always
- One type per file. File name = type name
- Member order: constants → fields → constructors → properties → public methods → private methods
- Records for DTOs: public sealed record CreateOrderRequest(...)
```

### Pattern 60.9: API Boundaries — Return Types
> 📌 Source: E2 csharp-coding-standards-performance

```csharp
// ✅ DO — Return IReadOnlyList<T> from API boundaries [E2]
public IReadOnlyList<OrderDto> GetOrders() => _orders.AsReadOnly();

// ✅ DO — Accept abstractions [E2]
public void ProcessItems(IEnumerable<Item> items) { }

// ✅ DO — FrozenDictionary for static lookup (.NET 8+) [E2]
private static readonly FrozenDictionary<string, Handler> Handlers =
    new Dictionary<string, Handler> { ... }.ToFrozenDictionary();
```

---

*C# Fundamentals Specialist v1.0 — Generic*
*Sources: E2 csharp-coding-standards (5 files), E1 coding-style rules*
*Pattern range: 60.1–60.9*
