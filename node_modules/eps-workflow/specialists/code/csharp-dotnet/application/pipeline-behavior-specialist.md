# Pipeline Behavior Specialist — CQRS Variant
# パイプラインビヘイビアスペシャリスト
# Chuyen Gia Pipeline Behavior — CQRS

**Created**: 2026-03-21 | **Version**: 1.0
**Stack**: .NET 8+ | **Variant**: clean-cqrs
**Aspect**: Application Layer — MediatR Pipeline Behaviors (Cross-Cutting)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | clean-cqrs |
| **Pattern Numbers** | 12.1–12.4 |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

Enforce MediatR pipeline behavior patterns for clean-cqrs variant. Behaviors are cross-cutting middleware for the CQRS pipeline: validation, logging, performance monitoring.

---

## Patterns

### Pattern 12.1: Validation Behavior
> Source: E5 ddd-dotnet, E1-rules architecture

```csharp
// DO — Validate before handler executes [E5]
public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = (await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, ct))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count > 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

### Pattern 12.2: Logging Behavior
> Source: E5 ddd-dotnet

```csharp
// DO — Log request/response [E5]
public sealed class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        logger.LogInformation("Handling {RequestName}", requestName);

        var response = await next();

        logger.LogInformation("Handled {RequestName}", requestName);
        return response;
    }
}
```

### Pattern 12.3: Performance Behavior
> Source: E5 ddd-dotnet

```csharp
// DO — Warn on slow handlers [E5]
public sealed class PerformanceBehavior<TRequest, TResponse>(
    ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var response = await next();
        sw.Stop();

        if (sw.ElapsedMilliseconds > 500)
            logger.LogWarning("Long running: {RequestName} ({Elapsed}ms)",
                typeof(TRequest).Name, sw.ElapsedMilliseconds);

        return response;
    }
}
```

### Pattern 12.4: Registration Order
> Source: E5 ddd-dotnet

```csharp
// DO — Register behaviors in order (outer to inner) [E5]
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(PerformanceBehavior<,>));
});
// Execution order: Logging → Validation → Performance → Handler
```

---

*Pipeline Behavior Specialist v1.0 — CQRS*
*Sources: E5 ddd-dotnet, E1-rules architecture*
*Pattern range: 12.1–12.4*
