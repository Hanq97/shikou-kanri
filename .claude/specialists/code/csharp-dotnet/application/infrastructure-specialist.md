# Infrastructure Layer Specialist — Clean Architecture
# インフラ層スペシャリスト — クリーンアーキテクチャ
# Chuyen Gia Tang Infrastructure — Clean Architecture

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Clean Architecture)
**Technology**: C# 12-14, EF Core, DI Extensions
**Aspect**: Infrastructure Layer — DI Registration, Project Structure, Dependency Direction
**Purpose**: Consultation agent for /plan and /execute — infrastructure layer patterns for Clean Architecture

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 19.1–19.5 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | Domain, Application |
| **Cannot Import** | Presentation |
| **Framework** | csharp-dotnet-core |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

**Your ONLY responsibility**: Enforce infrastructure layer standards — feature folders over layer folders, Add{Feature}Services extensions, dependency direction (inward only), DbContext as Unit of Work, and Clean Architecture project organization for .NET projects.

---

## Patterns

### Pattern 19.1: Feature Folders Over Layer Folders
> Source: E1-rules architecture, E2 project-structure

Vertical slices keep related code together.

```
# DO — Feature folders [E1-rules]
Features/
  Orders/
    CreateOrder.cs
    GetOrder.cs
    OrderEndpoints.cs
  Products/
    CreateProduct.cs
    ProductEndpoints.cs

# DON'T — Layer folders [E1-rules]
Controllers/
  OrdersController.cs
Services/
  OrderService.cs
Repositories/
  OrderRepository.cs
```

### Pattern 19.2: Clean Architecture Project Structure
> Source: E2 project-structure

```
MyApp.slnx
├── src/
│   ├── MyApp.Domain/           # Entities, Value Objects, Domain Events, Interfaces
│   ├── MyApp.Application/      # Use cases, Commands, Queries, DTOs
│   ├── MyApp.Infrastructure/   # EF Core, External Services, Implementations
│   └── MyApp.Api/              # Endpoints, Middleware, Program.cs
├── tests/
│   ├── MyApp.Domain.Tests/
│   ├── MyApp.Application.Tests/
│   └── MyApp.Api.Tests/        # Integration tests
└── MyApp.ServiceDefaults/      # Aspire shared config (optional)
```

### Pattern 19.3: Dependency Direction — Inward Only
> Source: E1-rules architecture

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                         (implements domain interfaces)
```

```csharp
// DO — Infrastructure implements domain interface [E1-rules]
// Domain defines: public interface IOrderRepository { Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct); }
// Infrastructure implements: public sealed class EfOrderRepository(AppDbContext db) : IOrderRepository { }

// DON'T — Domain references infrastructure [E1-rules]
// Domain should never know about EF Core, HTTP, or external services
```

### Pattern 19.4: Add{Feature}Services Registration
> Source: E2 di, E1-rules architecture

Group registrations per feature/layer. Program.cs composes them.

```csharp
// DO — Infrastructure registration [E2]
public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(config.GetConnectionString("Default")));

        services.AddScoped<IOrderRepository, EfOrderRepository>();
        services.AddSingleton<IEmailService, SmtpEmailService>();

        return services;
    }
}

// DO — Clean Program.cs [E2]
builder.Services
    .AddApplicationServices()
    .AddInfrastructureServices(builder.Configuration);
```

### Pattern 19.5: DbContext Is the Unit of Work
> Source: E1-rules architecture

Don't wrap DbContext. It already implements UoW + Repository internally.

```csharp
// DO — Inject DbContext directly [E1-rules]
public sealed class OrderService(AppDbContext db)
{
    public Task<Order?> GetAsync(Guid id, CancellationToken ct) =>
        db.Orders.FindAsync([id], ct).AsTask();
}

// DON'T — Generic repository wrapping EF [E1-rules]
public interface IRepository<T> { Task<T?> GetByIdAsync(Guid id); }
```

---

*Infrastructure Layer Specialist v1.0 — Clean Architecture*
*Sources: E2 di, E2 project-structure, E1-rules architecture*
*Pattern range: 19.1–19.5*
