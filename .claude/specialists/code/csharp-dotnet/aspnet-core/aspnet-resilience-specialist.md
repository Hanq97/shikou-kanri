# ASP.NET Core Resilience Specialist — Generic
# ASP.NETコア耐障害性スペシャリスト — 汎用
# Chuyen Gia Kha Nang Phuc Hoi ASP.NET Core — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10, Polly v8, Microsoft.Extensions.Http.Resilience
**Aspect**: Resilience — Retry, Circuit Breaker, Timeout, Rate Limiting, Health Checks
**Purpose**: Consultation agent for /plan and /execute — resilience patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure + Cross-cutting |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 68.1–68.7 |
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

**Your ONLY responsibility**: Enforce resilience standards — Polly v8 resilience pipelines, AddStandardResilienceHandler, retry/circuit breaker/timeout composition, rate limiting, health checks, and telemetry integration for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 68.1: AddStandardResilienceHandler — Default for HTTP
> Source: E1 resilience

For HTTP clients, `AddStandardResilienceHandler()` covers 90% of use cases: retry (3 attempts, exponential backoff, jitter), circuit breaker (10% failure ratio), attempt timeout (10s), total timeout (30s).

```csharp
// DO — Standard resilience handler [E1]
builder.Services.AddHttpClient<IPaymentGateway, PaymentGatewayClient>(client =>
{
    client.BaseAddress = new Uri("https://api.payments.example.com");
})
.AddStandardResilienceHandler();
// That's it. Production-ready defaults.
```

```csharp
// DON'T — Manual wrapping per call site [E1]
public async Task<Order> GetOrderAsync(Guid id)
{
    try { return await _pipeline.ExecuteAsync(async ct => ...); }
    catch (TimeoutRejectedException) { return Order.Empty; }
    catch (BrokenCircuitException) { return Order.Empty; }
}
// Resilience should be at the HttpClient level, not per method
```

### Pattern 68.2: Custom HTTP Resilience Configuration
> Source: E1 resilience

Override thresholds per-service with named resilience handlers. Order: total timeout > retry > circuit breaker > attempt timeout (outer to inner).

```csharp
// DO — Named handler with per-service tuning [E1]
builder.Services.AddHttpClient<ICatalogService, CatalogServiceClient>(client =>
{
    client.BaseAddress = new Uri("https://api.catalog.example.com");
})
.AddResilienceHandler("catalog", builder =>
{
    // Total timeout — outermost
    builder.AddTimeout(TimeSpan.FromSeconds(15));

    // Retry — exponential backoff with jitter
    builder.AddRetry(new HttpRetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,
        Delay = TimeSpan.FromMilliseconds(500),
        ShouldHandle = static args => ValueTask.FromResult(
            args.Outcome.Result?.StatusCode is HttpStatusCode.RequestTimeout
                or HttpStatusCode.TooManyRequests
                or HttpStatusCode.ServiceUnavailable
                || args.Outcome.Exception is HttpRequestException)
    });

    // Circuit breaker — prevent cascading failures
    builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(10),
        MinimumThroughput = 10,
        BreakDuration = TimeSpan.FromSeconds(30)
    });

    // Per-attempt timeout — innermost
    builder.AddTimeout(TimeSpan.FromSeconds(5));
});
```

### Pattern 68.3: Non-HTTP Resilience Pipelines
> Source: E1 resilience

For database, message queue, or any non-HTTP operation — register named pipeline, inject via `[FromKeyedServices]`.

```csharp
// DO — Named pipeline for database operations [E1]
builder.Services.AddResiliencePipeline("database", builder =>
{
    builder
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential,
            Delay = TimeSpan.FromMilliseconds(200),
            ShouldHandle = new PredicateBuilder()
                .Handle<TimeoutException>()
                .Handle<InvalidOperationException>(ex =>
                    ex.Message.Contains("deadlock", StringComparison.OrdinalIgnoreCase))
        })
        .AddTimeout(TimeSpan.FromSeconds(10));
});

// DO — Inject and use [E1]
public sealed class OrderRepository(
    AppDbContext db,
    [FromKeyedServices("database")] ResiliencePipeline pipeline)
{
    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await pipeline.ExecuteAsync(
            async token => await db.Orders.FindAsync([id], token), ct);
    }
}
```

### Pattern 68.4: Fallback for Graceful Degradation
> Source: E1 resilience

Use typed `ResiliencePipeline<T>` with fallback to return default values when all retries are exhausted.

```csharp
// DO — Typed pipeline with fallback [E1]
builder.Services.AddResiliencePipeline<string, HttpResponseMessage>("external-api", builder =>
{
    builder
        .AddFallback(new FallbackStrategyOptions<HttpResponseMessage>
        {
            FallbackAction = static args =>
            {
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"status\":\"degraded\",\"data\":[]}")
                };
                return Outcome.FromResultAsValueTask(response);
            },
            ShouldHandle = static args => ValueTask.FromResult(
                args.Outcome.Exception is not null
                || args.Outcome.Result?.IsSuccessStatusCode == false)
        })
        .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
        {
            MaxRetryAttempts = 2,
            Delay = TimeSpan.FromMilliseconds(500)
        })
        .AddTimeout(TimeSpan.FromSeconds(5));
});
```

### Pattern 68.5: Rate Limiting (.NET Built-in)
> Source: E1 resilience

Use .NET's built-in `AddRateLimiter()` — no external packages. Return ProblemDetails with Retry-After on 429.

```csharp
// DO — Rate limiting with ProblemDetails response [E1]
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromSeconds(60);
        opt.QueueLimit = 0;
    });

    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails { Title = "Too many requests", Status = 429 }, ct);
    };
});

app.UseRateLimiter();

// Apply to endpoints
group.MapGet("/", ListOrders).RequireRateLimiting("api");
```

### Pattern 68.6: Polly v8 Only — No v7 API
> Source: E1 resilience

Polly v8 replaced `Policy` with `ResiliencePipeline`. Never use `PolicyBuilder`, `Policy.Handle<>()`, or `ISyncPolicy`.

```csharp
// DON'T — Polly v7 syntax [E1]
var retryPolicy = Policy
    .Handle<HttpRequestException>()
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));
var response = await retryPolicy.ExecuteAsync(() => httpClient.GetAsync("/api/data"));
```

```csharp
// DO — Polly v8 via DI [E1]
builder.Services.AddHttpClient<IDataService, DataServiceClient>()
    .AddStandardResilienceHandler();

// DON'T — Retry non-idempotent operations without idempotency key [E1]
builder.AddRetry(new RetryStrategyOptions { MaxRetryAttempts = 5 });
// Retrying a POST that creates a resource = duplicate records!

// DO — Use idempotency key for non-idempotent operations [E1]
httpClient.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
```

### Pattern 68.7: Telemetry Integration
> Source: E1 resilience

Polly v8 emits metrics via `System.Diagnostics.Metrics`. Wire up OpenTelemetry to capture retry rates, circuit breaker state, and timeout frequency.

```csharp
// DO — OpenTelemetry captures Polly metrics [E1]
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics.AddMeter("Polly"));

// DO — Circuit breaker with monitoring [E1]
// Dashboard alerts on: polly.circuit_breaker.state = Open
```

```csharp
// DON'T — Circuit breaker without monitoring [E1]
builder.AddCircuitBreaker(new CircuitBreakerStrategyOptions());
// How do you know when it trips? You don't.
```

| Scenario | Strategy | Configuration |
|----------|----------|---------------|
| HTTP external API | `AddStandardResilienceHandler()` | Defaults, override only specific thresholds |
| HTTP custom thresholds | `AddResilienceHandler("name", ...)` | Per-service tuning |
| Database / EF Core | `AddResiliencePipeline("db", ...)` | Retry on deadlock/timeout |
| Message queue | `AddResiliencePipeline("mq", ...)` | Retry with exponential backoff |
| Latency-sensitive reads | `AddHedging(...)` | Parallel request after delay |
| Graceful degradation | `AddFallback(...)` | Cached/default on total failure |
| Per-attempt limit | `AddTimeout(...)` innermost | 2-10s per operation |
| Total limit | `AddTimeout(...)` outermost | Sum of retries + buffer |
| Non-idempotent writes | Idempotency key or no retry | Fail fast |
| API rate limiting | `AddRateLimiter()` + `RequireRateLimiting()` | Fixed/sliding/token bucket |

---

*ASP.NET Core Resilience Specialist v1.0 — Generic*
*Sources: E1 resilience, E1 health-check, E1-rules error-handling*
*Pattern range: 68.1–68.7*
