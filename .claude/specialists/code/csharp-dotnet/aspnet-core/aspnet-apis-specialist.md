# ASP.NET Core APIs Specialist — Generic
# ASP.NETコアAPIスペシャリスト — 汎用
# Chuyen Gia API ASP.NET Core — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10, Minimal APIs
**Aspect**: API Design — Minimal APIs, Error Handling, Versioning, Validation
**Purpose**: Consultation agent for /plan and /execute — ASP.NET Core API patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 63.1–63.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | csharp-dotnet-core |
| **Architecture** | ANY |
| **Implementation Patterns** | errorPropagation |

---

## ROLE

**Your ONLY responsibility**: Enforce ASP.NET Core API standards — Minimal API patterns, IEndpointGroup auto-discovery, TypedResults, ProblemDetails (RFC 9457), Result pattern, FluentValidation, and API versioning for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 63.1: IEndpointGroup Auto-Discovery (Mandatory)
> Source: E1 minimal-api

Every endpoint group implements `IEndpointGroup`. A single `app.MapEndpoints()` call discovers and registers all groups. Program.cs NEVER changes when adding endpoints.

```csharp
// DO — Interface for endpoint groups [E1]
public interface IEndpointGroup
{
    void Map(IEndpointRouteBuilder app);
}

// DO — Auto-discovery extension [E1]
public static class EndpointExtensions
{
    public static WebApplication MapEndpoints(this WebApplication app)
    {
        var groups = typeof(Program).Assembly
            .GetTypes()
            .Where(t => t.IsAssignableTo(typeof(IEndpointGroup))
                && !t.IsInterface && !t.IsAbstract)
            .Select(Activator.CreateInstance)
            .Cast<IEndpointGroup>();

        foreach (var group in groups)
            group.Map(app);

        return app;
    }
}

// DO — Program.cs — NEVER changes [E1]
var app = builder.Build();
app.MapEndpoints();
app.Run();
```

```csharp
// DO — One file per endpoint group [E1]
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
            .RequireAuthorization();

        group.MapGet("/{id:guid}", GetOrder)
            .WithName("GetOrder")
            .Produces<OrderResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}
```

```csharp
// DON'T — Endpoints scattered in Program.cs [E1]
app.MapGet("/orders", async (AppDbContext db) => await db.Orders.ToListAsync());
app.MapPost("/orders", async (Order order, AppDbContext db) => { /* ... */ });

// DON'T — Manual MapGroup calls in Program.cs (grows with every feature) [E1]
app.MapGroup("/api/orders").MapOrderEndpoints();
app.MapGroup("/api/products").MapProductEndpoints();
```

### Pattern 63.2: TypedResults for OpenAPI
> Source: E1 minimal-api

Use `TypedResults` (not `Results`) for compile-time type safety AND correct OpenAPI schema generation.

```csharp
// DO — TypedResults with union return type [E1]
private static async Task<Results<Ok<OrderResponse>, NotFound>> GetOrder(
    Guid id, ISender sender, CancellationToken ct)
{
    var result = await sender.Send(new GetOrder.Query(id), ct);
    return result.IsSuccess
        ? TypedResults.Ok(result.Value)
        : TypedResults.NotFound();
}

// DO — Created with location [E1]
private static async Task<Results<Created<OrderResponse>, ValidationProblem>> CreateOrder(
    CreateOrderRequest request, ISender sender, CancellationToken ct)
{
    var result = await sender.Send(new CreateOrder.Command(request), ct);
    return result.IsSuccess
        ? TypedResults.Created($"/api/orders/{result.Value.Id}", result.Value)
        : TypedResults.ValidationProblem(result.Errors);
}
```

```csharp
// DON'T — Untyped Results (no OpenAPI schema) [E1]
private static async Task<IResult> GetOrder(Guid id, AppDbContext db)
{
    var order = await db.Orders.FindAsync(id);
    return order is not null ? Results.Ok(order) : Results.NotFound();
}

// DON'T — Return domain entities directly [E1]
app.MapGet("/orders/{id}", async (Guid id, AppDbContext db) =>
    await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id));
```

### Pattern 63.3: Result Pattern for Expected Failures
> Source: E1 error-handling, E1-rules error-handling

Use Result/Result<T> for expected failures (not found, validation, conflict). Reserve exceptions for unexpected crashes only.

```csharp
// DO — Result pattern for business logic [E1]
public Result<Order> GetOrder(Guid id)
{
    var order = db.Orders.Find(id);
    return order is not null
        ? Result.Success(order)
        : Result.Failure<Order>($"Order {id} not found");
}

// DO — Typed error records [E1]
public abstract record Error(string Code, string Message);
public record NotFoundError(string Entity, object Id)
    : Error("not_found", $"{Entity} with ID {Id} was not found");
public record ValidationError(string Field, string Message)
    : Error("validation", Message);

// DO — Map errors to HTTP status codes [E1]
public static IResult ToHttpResult(this Error error) => error switch
{
    NotFoundError => TypedResults.Problem(title: error.Message, statusCode: 404),
    ValidationError => TypedResults.Problem(title: error.Message, statusCode: 400),
    ConflictError => TypedResults.Problem(title: error.Message, statusCode: 409),
    _ => TypedResults.Problem(title: error.Message, statusCode: 500)
};
```

```csharp
// DON'T — Exceptions for expected outcomes [E1-rules]
public Order GetOrder(Guid id)
{
    return db.Orders.Find(id)
        ?? throw new NotFoundException($"Order {id} not found");  // Expected failure!
}

// DON'T — Bare strings or ad-hoc JSON for errors [E1-rules]
return Results.BadRequest("Something went wrong");
return Results.BadRequest(new { error = "Invalid input" });
```

### Pattern 63.4: ProblemDetails (RFC 9457) — Always
> Source: E1 error-handling, E1-rules error-handling

Every API error returns ProblemDetails. Global exception handler catches unexpected crashes.

```csharp
// DO — Result to ProblemDetails mapping [E1]
public static class ResultExtensions
{
    public static IResult ToProblemDetails(this Result result, int statusCode = 400)
    {
        return TypedResults.Problem(
            title: "One or more errors occurred",
            statusCode: statusCode,
            extensions: new Dictionary<string, object?>
            {
                ["errors"] = result.Errors
            });
    }
}

// DO — Global exception handler [E1-rules]
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(exception, "Unhandled exception for {Method} {Path}",
            context.Request.Method, context.Request.Path);

        var problem = new ProblemDetails
        {
            Title = "An unexpected error occurred",
            Status = StatusCodes.Status500InternalServerError,
            Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1"
        };

        context.Response.StatusCode = problem.Status.Value;
        await context.Response.WriteAsJsonAsync(problem);
    });
});
```

### Pattern 63.5: FluentValidation with Endpoint Filters
> Source: E1 error-handling

Validate at the boundary. Use FluentValidation + generic endpoint filter.

```csharp
// DO — Validator [E1]
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty().WithMessage("Customer ID is required");
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item is required");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId).NotEmpty();
            item.RuleFor(x => x.Quantity).GreaterThan(0);
        });
    }
}

// DO — Generic validation filter [E1]
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

```csharp
// DON'T — Validate deep inside business logic [E1-rules]
public class OrderService
{
    public Result<Order> Create(CreateOrderRequest request)
    {
        if (string.IsNullOrEmpty(request.CustomerId))  // Too late! Validate at boundary
            return Result.Failure<Order>("Customer ID required");
    }
}
```

### Pattern 63.6: API Versioning — URL Segment
> Source: E1 api-versioning

Version from day one. URL segment (`/api/v1/orders`) is default — discoverable and cache-friendly.

```csharp
// DO — Setup with Asp.Versioning [E1]
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// DO — Version the entire group [E1]
app.MapGroup("/api/v{version:apiVersion}/orders")
    .WithApiVersionSet(v1)
    .WithTags("Orders")
    .MapOrderEndpointsV1();

// DO — Deprecate with timeline [E1]
var v1 = app.NewApiVersionSet()
    .HasDeprecatedApiVersion(new ApiVersion(1, 0))
    .HasApiVersion(new ApiVersion(2, 0))
    .Build();
```

```csharp
// DON'T — Version individual endpoints [E1]
app.MapGet("/api/v1/orders", ListOrdersV1);
app.MapGet("/api/v2/orders/{id}", GetOrderV2);  // V2 only for this one?

// DON'T — Query string versioning (not cache-friendly) [E1]
GET /api/orders?api-version=2.0
```

### Pattern 63.7: Parameter Binding and OpenAPI Metadata
> Source: E1 minimal-api

Use `[AsParameters]` for complex queries. Enrich OpenAPI with `.WithName()`, `.WithSummary()`, `.WithDescription()`.

```csharp
// DO — Complex query with [AsParameters] [E1]
public record ListOrdersQuery(int Page = 1, int PageSize = 20, string? Status = null);

group.MapGet("/", ([AsParameters] ListOrdersQuery query, ISender sender, CancellationToken ct) =>
    sender.Send(query, ct));

// DO — OpenAPI metadata on endpoints [E1]
group.MapPost("/", CreateOrder)
    .WithName("CreateOrder")
    .WithSummary("Create a new order")
    .WithDescription("Creates a new order for the specified customer.")
    .Produces<OrderResponse>(StatusCodes.Status201Created)
    .ProducesValidationProblem()
    .ProducesProblem(StatusCodes.Status500InternalServerError);

// DO — Rate limiting on group [E1]
var group = app.MapGroup("/api/orders")
    .WithTags("Orders")
    .RequireRateLimiting("api");

// DO — Output caching [E1]
group.MapGet("/{id:guid}", GetOrder).CacheOutput("ByIdCache");
```

| Scenario | Recommendation |
|----------|---------------|
| New HTTP API | `IEndpointGroup` + `app.MapEndpoints()` auto-discovery |
| OpenAPI docs | `TypedResults` + `.WithName()` + `.WithSummary()` |
| Request validation | FluentValidation endpoint filter |
| Auth | `.RequireAuthorization("PolicyName")` on group |
| Rate limiting | `AddRateLimiter` + `.RequireRateLimiting()` |
| Caching | `AddOutputCache` + `.CacheOutput()` |
| Complex queries | `[AsParameters]` with a record type |

---

*ASP.NET Core APIs Specialist v1.0 — Generic*
*Sources: E1 minimal-api, E1 error-handling, E1 api-versioning, E1-rules error-handling*
*Pattern range: 63.1–63.7*
