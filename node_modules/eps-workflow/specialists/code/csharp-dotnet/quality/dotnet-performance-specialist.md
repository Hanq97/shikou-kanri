# .NET Performance Specialist — Generic
# .NETパフォーマンススペシャリスト — 汎用
# Chuyen Gia Hieu Nang .NET — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10, BenchmarkDotNet
**Aspect**: Performance — Type Design, Memory, Caching, Hot Paths, Async Patterns
**Purpose**: Consultation agent for /plan and /execute — performance patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 69.1–69.8 |
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

**Your ONLY responsibility**: Enforce performance standards — sealed classes for JIT devirtualization, readonly structs, Span<T>/Memory<T>/ArrayPool, FrozenDictionary, ValueTask for hot paths, static pure functions, compiled queries, HybridCache, CancellationToken propagation, and IReadOnlyList API boundaries for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 69.1: Sealed Classes — JIT Devirtualization
> Source: E2 csharp-type-design-performance, E1-rules performance

Seal all classes not designed for inheritance. JIT can devirtualize method calls on sealed types.

```csharp
// DO — Sealed by default [E2]
public sealed class OrderProcessor
{
    public void Process(Order order) { }
}

public sealed record OrderCreated(OrderId Id, CustomerId CustomerId);
```

```csharp
// DON'T — Unsealed without reason [E2]
public class OrderProcessor  // Can be subclassed — intentional?
{
    public virtual void Process(Order order) { }  // Virtual = slower
}
```

### Pattern 69.2: Readonly Structs — No Defensive Copies
> Source: E2 csharp-type-design-performance

Structs should be `readonly` when immutable. Prevents compiler-generated defensive copies.

```csharp
// DO — Readonly record struct for value objects [E2]
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
}

public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency) { Amount = amount; Currency = currency; }
}
```

```csharp
// DON'T — Mutable struct (causes defensive copies) [E2]
public struct Point { public int X { get; set; } public int Y { get; set; } }
```

| Use Struct When | Use Class When |
|-----------------|----------------|
| Small (<=16 bytes) | Larger objects |
| Short-lived | Long-lived |
| Value semantics | Identity semantics |
| Immutable | Mutable state |

### Pattern 69.3: Span<T> / Memory<T> / ArrayPool
> Source: E2 csharp-type-design-performance, E1-rules performance

Use `Span<T>` for synchronous operations, `Memory<T>` for async. Rent from `ArrayPool` for large buffers.

```csharp
// DO — Span for zero-allocation parsing [E2]
public static int ParseInt(ReadOnlySpan<char> text) => int.Parse(text);

// DO — Slice without allocation [E2]
ReadOnlySpan<char> span = "Hello, World!".AsSpan();
var hello = span[..5];  // No allocation

// DO — Stack allocation for small buffers [E2]
Span<byte> buffer = stackalloc byte[256];

// DO — ArrayPool for large buffers [E1-rules]
var buffer = ArrayPool<byte>.Shared.Rent(4096);
try
{
    // Use buffer...
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);
}

// DO — Memory<T> for async operations [E2]
public async Task WriteAsync(ReadOnlyMemory<byte> data)
{
    await _stream.WriteAsync(data);
}
```

### Pattern 69.4: FrozenDictionary — Static Lookup (.NET 8+)
> Source: E2 csharp-type-design-performance

Use `FrozenDictionary` for read-only lookup data initialized at startup. Fastest lookup for static data.

```csharp
// DO — FrozenDictionary for static lookup [E2]
private static readonly FrozenDictionary<string, Handler> Handlers =
    new Dictionary<string, Handler>
    {
        ["create"] = new CreateHandler(),
        ["update"] = new UpdateHandler(),
    }.ToFrozenDictionary();
```

### Pattern 69.5: ValueTask for Hot Paths
> Source: E2 csharp-type-design-performance, E1-rules performance

Use `ValueTask<T>` for high-throughput paths that often complete synchronously (cached results). Use `Task<T>` for general-purpose code.

```csharp
// DO — ValueTask for cached paths [E2]
public ValueTask<User?> GetUserAsync(UserId id)
{
    if (_cache.TryGetValue(id, out var user))
        return ValueTask.FromResult<User?>(user);  // No allocation
    return new ValueTask<User?>(FetchUserAsync(id));
}

// DO — Task for always-async operations [E2]
public Task<Order> CreateOrderAsync(CreateOrderCommand cmd) =>
    _repository.CreateAsync(cmd);  // Always hits DB
```

```csharp
// DON'T — ValueTask for always-async operations [E2]
public ValueTask<Order> CreateOrderAsync();  // Just use Task

// DON'T — Await ValueTask more than once [E2]
var vt = GetUserAsync(id);
var user1 = await vt;
var user2 = await vt;  // UNDEFINED BEHAVIOR
```

### Pattern 69.6: Static Pure Functions
> Source: E2 csharp-type-design-performance

Static methods with no side effects are faster (no vtable lookup) and more testable.

```csharp
// DO — Static pure function [E2]
public static class OrderCalculator
{
    public static Money CalculateTotal(IReadOnlyList<OrderItem> items)
    {
        var total = items.Sum(i => i.Price * i.Quantity);
        return new Money(total, "USD");
    }
}
```

```csharp
// DON'T — Instance method that could be static [E2]
public int Add(int a, int b) => a + b;  // Make static
```

### Pattern 69.7: CancellationToken Propagation + Async All The Way
> Source: E1-rules performance

Always propagate `CancellationToken`. Never `.Result` or `.Wait()` on async code.

```csharp
// DO — Propagate CancellationToken [E1-rules]
public Task<Order?> GetOrderAsync(Guid id, CancellationToken ct) =>
    db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
```

```csharp
// DON'T — Drop CancellationToken [E1-rules]
public Task<Order?> GetOrderAsync(Guid id, CancellationToken ct) =>
    db.Orders.FirstOrDefaultAsync(o => o.Id == id);  // ct silently ignored!

// DON'T — Sync-over-async [E1-rules]
var result = GetOrderAsync(id).Result;  // Thread pool starvation + deadlock
var result2 = GetOrderAsync(id).GetAwaiter().GetResult();  // Same
```

### Pattern 69.8: HybridCache + Compiled Queries
> Source: E1-rules performance

Use `HybridCache` (stampede protection, L1+L2) over manual `IMemoryCache`. Use compiled queries for hot-path EF Core queries.

```csharp
// DO — HybridCache with stampede protection [E1-rules]
var order = await cache.GetOrCreateAsync(
    $"order:{id}",
    async ct => await db.Orders.FindAsync([id], ct),
    cancellationToken: ct);

// DO — Compiled query for hot paths [E1-rules]
private static readonly Func<AppDbContext, Guid, CancellationToken, Task<Order?>> GetById =
    EF.CompileAsyncQuery((AppDbContext db, Guid id, CancellationToken ct) =>
        db.Orders.FirstOrDefault(o => o.Id == id));
```

```csharp
// DON'T — Manual cache-aside without stampede protection [E1-rules]
if (!memoryCache.TryGetValue(key, out var order))
{
    order = await db.Orders.FindAsync(id);  // N concurrent requests = N DB queries
    memoryCache.Set(key, order, TimeSpan.FromMinutes(5));
}

// DON'T — DateTime.Now/UtcNow [E1-rules]
var now = DateTime.UtcNow;  // Untestable, use TimeProvider

// DON'T — new HttpClient() [E1-rules]
var client = new HttpClient();  // Socket exhaustion, use IHttpClientFactory
```

| Pattern | Benefit |
|---------|---------|
| `sealed class` | JIT devirtualization |
| `readonly record struct` | No defensive copies, value semantics |
| Static pure functions | No vtable, testable, thread-safe |
| Defer `.ToList()` | Single materialization |
| `ValueTask` for hot paths | Avoid Task allocation |
| `Span<T>` for bytes | Stack allocation, no copying |
| `ArrayPool<T>` for large buffers | Avoid GC pressure |
| `IReadOnlyList<T>` return | Immutable API contract |
| `FrozenDictionary` | Fastest lookup for static data |
| `HybridCache` | Stampede protection, L1+L2 |
| Compiled queries | Skip expression tree translation |
| `CancellationToken` propagation | Don't waste server resources |

---

*.NET Performance Specialist v1.0 — Generic*
*Sources: E2 csharp-type-design-performance, E1-rules performance*
*Pattern range: 69.1–69.8*
