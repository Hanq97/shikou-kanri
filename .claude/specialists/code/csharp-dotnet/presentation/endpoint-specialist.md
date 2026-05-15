# Endpoint Specialist — Minimal API Variant
# エンドポイントスペシャリスト
# Chuyen Gia Endpoint — Minimal API

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: clean-minimal-api
**Aspect**: Presentation Layer — Minimal API Endpoints (IEndpointGroup)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | clean-minimal-api |
| **Pattern Numbers** | 15.1–15.5 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | errorPropagation |

---

## ROLE

Enforce Minimal API endpoint patterns for clean-minimal-api variant. IEndpointGroup auto-discovery, TypedResults, static handler methods, OpenAPI metadata.

---

## Patterns

### Pattern 15.1: IEndpointGroup per Feature
> Source: E1 minimal-api, E1-rules architecture

```csharp
// DO — One file per feature, IEndpointGroup [E1]
public sealed class OrderEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapPost("/", CreateOrder)
            .WithName("CreateOrder")
            .WithSummary("Create a new order")
            .Produces<OrderResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .RequireAuthorization("CanManageOrders");

        group.MapGet("/{id:guid}", GetOrder)
            .WithName("GetOrder")
            .Produces<OrderResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static async Task<Results<Created<OrderResponse>, ValidationProblem>> CreateOrder(
        CreateOrderRequest request, ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new CreateOrder.Command(request), ct);
        return result.IsSuccess
            ? TypedResults.Created($"/api/orders/{result.Value.Id}", result.Value)
            : TypedResults.ValidationProblem(result.Errors);
    }

    private static async Task<Results<Ok<OrderResponse>, NotFound>> GetOrder(
        Guid id, ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new GetOrder.Query(id), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : TypedResults.NotFound();
    }
}
```

### Pattern 15.2: Auto-Discovery — Program.cs Never Changes
> Source: E1 minimal-api

```csharp
// DO — Single line in Program.cs [E1]
app.MapEndpoints();  // Discovers all IEndpointGroup implementations
```

### Pattern 15.3: Static Handler Methods
> Source: E1 minimal-api

Handlers are `private static` methods in the endpoint class. Services injected as parameters.

### Pattern 15.4: TypedResults for OpenAPI
> Source: E1 minimal-api

```csharp
// DO — TypedResults with union return type [E1]
Task<Results<Ok<OrderResponse>, NotFound>>
Task<Results<Created<OrderResponse>, ValidationProblem>>

// DON'T — Untyped IResult [E1]
Task<IResult>  // No OpenAPI schema
```

### Pattern 15.5: [AsParameters] for Complex Queries
> Source: E1 minimal-api

```csharp
// DO — Record with [AsParameters] [E1]
public record ListOrdersQuery(int Page = 1, int PageSize = 20, string? Status = null);
group.MapGet("/", ([AsParameters] ListOrdersQuery query, ISender sender, CancellationToken ct) => ...);
```

---

*Endpoint Specialist v1.0 — Minimal API*
*Sources: E1 minimal-api, E1-rules architecture*
*Pattern range: 15.1–15.5*
