# Endpoint Filter Specialist — Minimal API Variant
# エンドポイントフィルタースペシャリスト
# Chuyen Gia Endpoint Filter — Minimal API

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: clean-minimal-api
**Aspect**: Presentation Layer — Endpoint Filters (Cross-Cutting for Minimal APIs)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | clean-minimal-api |
| **Pattern Numbers** | 15.51–15.54 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

Enforce endpoint filter patterns for clean-minimal-api variant. Filters are the Minimal API equivalent of action filters. Use for validation, logging, and other cross-cutting concerns.

---

## Patterns

### Pattern 15.51: Generic Validation Filter
> Source: E1 error-handling, E1 minimal-api

```csharp
// DO — Generic validation filter with FluentValidation [E1]
public class ValidationFilter<TRequest> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var validator = context.HttpContext.RequestServices.GetService<IValidator<TRequest>>();
        if (validator is null) return await next(context);

        var request = context.Arguments.OfType<TRequest>().FirstOrDefault();
        if (request is null) return await next(context);

        var result = await validator.ValidateAsync(request);
        if (!result.IsValid)
            return TypedResults.ValidationProblem(result.ToDictionary());

        return await next(context);
    }
}

// DO — Apply to endpoint [E1]
group.MapPost("/", CreateOrder)
    .AddEndpointFilter<ValidationFilter<CreateOrderRequest>>();
```

### Pattern 15.52: Apply Filter to Group
> Source: E1 minimal-api

```csharp
// DO — Group-level filter affects all endpoints [E1]
var group = app.MapGroup("/api/orders")
    .WithTags("Orders")
    .AddEndpointFilter<LoggingFilter>();
```

### Pattern 15.53: Logging Filter
> Source: E1 minimal-api

```csharp
// DO — Request logging filter [E1]
public class LoggingFilter(ILogger<LoggingFilter> logger) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var path = context.HttpContext.Request.Path;
        logger.LogInformation("Handling {Method} {Path}", context.HttpContext.Request.Method, path);
        var result = await next(context);
        logger.LogInformation("Handled {Path} -> {StatusCode}",
            path, context.HttpContext.Response.StatusCode);
        return result;
    }
}
```

### Pattern 15.54: Filter vs Pipeline Behavior
> Source: E1 minimal-api, E5 ddd-dotnet

| Concern | Minimal API | CQRS |
|---------|-------------|------|
| Validation | Endpoint filter | MediatR pipeline behavior |
| Logging | Endpoint filter | MediatR pipeline behavior |
| Auth | `.RequireAuthorization()` | Same |
| Rate limiting | `.RequireRateLimiting()` | Same |

---

*Endpoint Filter Specialist v1.0 — Minimal API*
*Sources: E1 minimal-api, E1 error-handling*
*Pattern range: 15.51–15.54*
