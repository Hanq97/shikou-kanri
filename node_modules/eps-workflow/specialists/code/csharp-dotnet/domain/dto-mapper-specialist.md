# DTO & Mapping Specialist — Clean Architecture
# DTOマッピングスペシャリスト — クリーンアーキテクチャ
# Chuyen Gia DTO & Mapping — Clean Architecture

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Clean Architecture)
**Technology**: C# 12-14, Records, Extension Methods
**Aspect**: DTO Design — Mapping, Serialization, API Contracts
**Purpose**: Consultation agent for /plan and /execute — DTO and mapping patterns for Clean Architecture

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Presentation |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 5.1–5.5 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | Domain |
| **Cannot Import** | Infrastructure |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

**Your ONLY responsibility**: Enforce DTO and mapping standards — explicit mapping methods (no AutoMapper), records for DTOs, separate request/response shapes, and System.Text.Json serialization for Clean Architecture .NET projects.

---

## Patterns

### Pattern 5.1: Records for DTOs
> Source: E2 csharp-coding-standards

Immutable records for request/response DTOs. Separate shapes for create, update, response.

```csharp
// DO — Separate request and response records [E2]
public sealed record CreateOrderRequest(string CustomerId, List<OrderItemRequest> Items);
public sealed record OrderItemRequest(string ProductId, int Quantity);

public sealed record OrderResponse(Guid Id, decimal Total, string Status, DateTimeOffset CreatedAt);
public sealed record OrderSummary(Guid Id, string CustomerName, decimal Total);
```

### Pattern 5.2: Explicit Mapping — No AutoMapper
> Source: E2 csharp-coding-standards, E1-rules architecture

Use extension methods or static methods for mapping. AutoMapper uses reflection, hides bugs at runtime.

```csharp
// DO — Extension method for mapping [E2]
public static class OrderMappings
{
    public static OrderResponse ToResponse(this Order order) => new(
        order.Id, order.Total.Amount, order.Status.ToString(), order.PlacedAt);

    public static OrderSummary ToSummary(this Order order) => new(
        order.Id, order.CustomerName, order.Total.Amount);
}

// Usage
var response = order.ToResponse();
var summaries = orders.Select(o => o.ToSummary()).ToList();
```

```csharp
// DON'T — AutoMapper / Mapster [E2]
services.AddAutoMapper(typeof(Program).Assembly);  // Reflection magic, runtime failures
var dto = _mapper.Map<OrderResponse>(order);  // What if a property is renamed?
```

### Pattern 5.3: EF Core Projections as Mapping
> Source: E2 database-performance

Use `.Select()` in queries to project directly to DTOs — most efficient mapping.

```csharp
// DO — Project in query [E2]
var response = await db.Orders
    .Where(o => o.Id == id)
    .Select(o => new OrderResponse(o.Id, o.Total, o.Status.ToString(), o.CreatedAt))
    .FirstOrDefaultAsync(ct);
```

### Pattern 5.4: System.Text.Json Conventions
> Source: E2 serialization

Use `System.Text.Json` (not Newtonsoft). Source generators for AOT. CamelCase by default in APIs.

```csharp
// DO — Configure JSON options [E2]
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
```

### Pattern 5.5: Request Validation Separate from Mapping
> Source: E1 error-handling

Validate at boundary (FluentValidation), map after validation passes.

```csharp
// DO — Validate then map [E1]
// 1. FluentValidation filter validates CreateOrderRequest
// 2. Handler maps request to domain command
// 3. Domain creates aggregate with invariants

// DON'T — Validate inside mapping
public static Order ToEntity(this CreateOrderRequest request)
{
    if (string.IsNullOrEmpty(request.CustomerId))  // Validation in mapper = wrong place
        throw new ArgumentException("CustomerId required");
}
```

---

*DTO & Mapping Specialist v1.0 — Clean Architecture*
*Sources: E2 csharp-coding-standards, E2 serialization, E2 database-performance*
*Pattern range: 5.1–5.5*
