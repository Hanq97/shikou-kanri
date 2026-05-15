# C# Code Quality Specialist — Generic
# C#コード品質スペシャリスト — 汎用
# Chuyen Gia Chat Luong Code C# — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10
**Aspect**: Code Quality — API Design, Type Design, Analyzers, CRAP Analysis
**Purpose**: Consultation agent for /plan and /execute — code quality patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 62.1–62.7 |
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

**Your ONLY responsibility**: Enforce code quality standards — API design stability, type design for performance, CRAP analysis, naming conventions, sealed classes, analyzers, and interface segregation for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 62.1: Sealed Classes by Default
> Source: E2 csharp-type-design-performance, E1 coding-style

Seal all classes not explicitly designed for inheritance. Enables JIT devirtualization, communicates intent, prevents accidental breaking changes.

```csharp
// DO — Seal classes by default [E2]
public sealed class OrderProcessor
{
    public void Process(Order order) { }
}

// DO — Seal records (they are classes) [E2]
public sealed record OrderCreated(OrderId Id, CustomerId CustomerId);

// DO — internal by default, public only when needed [E1]
internal sealed class InternalHelper { }
```

```csharp
// DON'T — Leave unsealed without reason [E2]
public class OrderProcessor  // Can be subclassed — intentional?
{
    public virtual void Process(Order order) { }  // Virtual = slower
}

// DON'T — public by default [E1]
public class Helper { }  // Should be internal unless referenced externally
```

### Pattern 62.2: API Stability — Extend-Only Design
> Source: E2 csharp-api-design

Never remove or modify public APIs. Only extend. Deprecate before removing.

```csharp
// DO — Add overloads, never change existing signatures [E2]
public void Process(Order order, CancellationToken ct = default);  // NEW overload

// DO — Deprecation pattern [E2]
[Obsolete("Obsolete since v1.5.0. Use ProcessAsync instead.")]
public void Process(Order order) { }

public Task ProcessAsync(Order order, CancellationToken ct = default);  // Replacement
```

```csharp
// DON'T — Remove or rename public members [E2]
public void ProcessOrder(Order order);  // Was: Process() — breaks callers!

// DON'T — Add required parameters without defaults [E2]
public void Process(Order order, ILogger logger);  // Breaks all existing callers

// DON'T — Change return types [E2]
public Order? GetOrder(string id);  // Was: public Order GetOrder() — breaks callers
```

### Pattern 62.3: Interface Segregation
> Source: E2 csharp-api-design

Small, focused interfaces. Large interfaces cannot evolve without breaking implementors.

```csharp
// DO — Segregated interfaces [E2]
public interface IOrderReader
{
    Order? GetById(OrderId id);
    IReadOnlyList<Order> GetByCustomer(CustomerId id);
}

public interface IOrderWriter
{
    Task SaveAsync(Order order, CancellationToken ct);
}

// DO — Compose when needed
public interface IOrderRepository : IOrderReader, IOrderWriter { }
```

```csharp
// DON'T — Monolithic interface [E2]
public interface IOrderRepository
{
    Order? GetById(OrderId id);
    Task SaveAsync(Order order, CancellationToken ct);
    // Adding new methods breaks ALL implementations!
}
```

### Pattern 62.4: Type Design for Performance
> Source: E2 csharp-type-design-performance

Readonly structs for value types. Static pure functions for stateless logic. Defer enumeration.

```csharp
// DO — Readonly struct for small immutable values [E2]
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
}

public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }
}

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
// DON'T — Mutable struct (causes defensive copies) [E2]
public struct Point { public int X { get; set; } public int Y { get; set; } }

// DON'T — Instance method that could be static [E2]
public int Add(int a, int b) => a + b;  // Make static
```

### Pattern 62.5: Collection Return Types — Immutable Boundaries
> Source: E2 csharp-type-design-performance, E2 csharp-api-design

Return `IReadOnlyList<T>` from API boundaries. Use `FrozenDictionary` for static lookup data (.NET 8+).

```csharp
// DO — Return immutable collection from API boundary [E2]
public IReadOnlyList<Order> GetOrders() => _orders.ToList();

// DO — FrozenDictionary for static lookup (.NET 8+) [E2]
private static readonly FrozenDictionary<string, Handler> Handlers =
    new Dictionary<string, Handler>
    {
        ["create"] = new CreateHandler(),
        ["update"] = new UpdateHandler(),
    }.ToFrozenDictionary();

// DO — Defer enumeration, single materialization [E2]
public IReadOnlyList<Order> GetActiveOrders()
{
    return _orders
        .Where(o => o.IsActive)
        .OrderBy(o => o.CreatedAt)
        .ToList();  // Single materialization at the end
}
```

```csharp
// DON'T — Return mutable collection [E2]
public List<Order> GetOrders() => _orders;  // Caller can modify!

// DON'T — Multiple ToList() calls [E2]
items.Where(...).ToList().OrderBy(...).ToList();  // Two materializations
```

| Scenario | Return Type |
|----------|-------------|
| API boundary | `IReadOnlyList<T>`, `IReadOnlyCollection<T>` |
| Static lookup | `FrozenDictionary<K,V>`, `FrozenSet<T>` |
| Internal building | `List<T>`, return as readonly |
| Single item or none | `T?` (nullable) |
| Lazy, zero or more | `IEnumerable<T>` |

### Pattern 62.6: CRAP Score Analysis
> Source: E2 crap-analysis

CRAP Score = Complexity x (1 - Coverage)^2. Use OpenCover format + ReportGenerator for Risk Hotspots.

```
CRAP Score Thresholds:
  < 5   = Low risk — well-tested, maintainable
  5-30  = Medium — acceptable, watch complexity
  > 30  = High risk — needs tests or refactoring
```

```xml
<!-- DO — coverage.runsettings with OpenCover (required for CRAP) [E2] -->
<Configuration>
  <Format>cobertura,opencover</Format>
  <Exclude>[*.Tests]*,[*.Benchmark]*,[*.Migrations]*</Exclude>
  <ExcludeByAttribute>Obsolete,GeneratedCodeAttribute,CompilerGeneratedAttribute,ExcludeFromCodeCoverageAttribute</ExcludeByAttribute>
  <ExcludeByFile>**/obj/**/*,**/*.g.cs,**/*.designer.cs,**/Migrations/**/*</ExcludeByFile>
  <SkipAutoProps>true</SkipAutoProps>
</Configuration>
```

| Metric | New Code | Legacy Code |
|--------|----------|-------------|
| Line Coverage | 80%+ | 60%+ (improve gradually) |
| Branch Coverage | 60%+ | 40%+ (improve gradually) |
| Maximum CRAP | 30 | Document exceptions |

### Pattern 62.7: API Surface Testing
> Source: E2 csharp-api-design

Prevent accidental breaking changes with automated API approval tests using PublicApiGenerator + Verify.

```csharp
// DO — API approval test [E2]
[Fact]
public Task ApprovePublicApi()
{
    var api = typeof(MyLibrary.PublicClass).Assembly.GeneratePublicApi();
    return Verify(api);
}
// Creates .verified.txt — any API change fails the test
// Reviewer must explicitly approve changes in PR diff
```

```
PR Review Checklist (API changes) [E2]:
  - No removed public members (use [Obsolete] instead)
  - No changed signatures (add overloads instead)
  - No new required parameters (use defaults)
  - API approval test updated (.verified.txt reviewed)
  - Wire format changes are opt-in (read-side first)
  - Breaking changes documented (release notes, migration guide)
```

---

*C# Code Quality Specialist v1.0 — Generic*
*Sources: E2 csharp-api-design, E2 csharp-type-design-performance, E2 crap-analysis, E1 coding-style*
*Pattern range: 62.1–62.7*
