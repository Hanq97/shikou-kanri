# Controller Specialist — Simplified/No-Repo/CQRS Variants
# コントローラースペシャリスト
# Chuyen Gia Controller

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: simplified-clean, clean-no-repo, clean-cqrs
**Aspect**: Presentation Layer — API Controllers (non-Minimal API variants)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | simplified-clean, clean-no-repo, clean-cqrs |
| **Pattern Numbers** | 4.1–4.5 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | errorPropagation |

---

## ROLE

Enforce controller patterns for variants that use Controllers (not Minimal API). Thin controllers that delegate to services/handlers and map Results to HTTP responses.

---

## Patterns

### Pattern 4.1: Thin Controller — Delegate to Service/Handler
> Source: E1-rules error-handling

```csharp
// DO — Controller delegates to service, maps Result to HTTP [E1-rules]
[ApiController]
[Route("api/[controller]")]
public sealed class OrdersController(OrderService service) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value)
            : result.ToProblemDetails();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await service.GetAsync(id, ct);
        return result.IsSuccess ? Ok(result.Value) : NotFound();
    }
}
```

### Pattern 4.2: CQRS Variant — ISender (MediatR)
> Source: E5 ddd-dotnet

```csharp
// DO — Controller with MediatR for CQRS variant [E5]
[ApiController]
[Route("api/[controller]")]
public sealed class OrdersController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var result = await sender.Send(new CreateOrder.Command(request), ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value)
            : result.ToProblemDetails();
    }
}
```

### Pattern 4.3: ProblemDetails for All Errors
> Source: E1 error-handling

```csharp
// DO — Always return ProblemDetails [E1]
return TypedResults.Problem(title: "Order not found", statusCode: 404);
return TypedResults.ValidationProblem(validationResult.ToDictionary());
```

### Pattern 4.4: CancellationToken on Every Action
> Source: E1-rules performance

```csharp
// DO — Accept CancellationToken [E1-rules]
public async Task<IActionResult> Get(Guid id, CancellationToken ct)

// DON'T — Missing CancellationToken
public async Task<IActionResult> Get(Guid id)
```

### Pattern 4.5: Authorization on Controllers
> Source: E1 authentication

```csharp
// DO — Explicit auth [E1]
[Authorize(Policy = "CanManageOrders")]
[HttpPost]
public async Task<IActionResult> Create(...)
```

---

*Controller Specialist v1.0*
*Sources: E1 error-handling, E1-rules error-handling, E5 ddd-dotnet, E1 authentication*
*Pattern range: 4.1–4.5*
