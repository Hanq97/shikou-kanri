# ASP.NET Core DI & Configuration Specialist — Generic
# ASP.NET Core DI設定スペシャリスト — 汎用
# Chuyen Gia DI & Cau Hinh ASP.NET Core — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10, Microsoft.Extensions.DependencyInjection
**Aspect**: Dependency Injection, Configuration, Options Pattern
**Purpose**: Consultation agent for /plan and /execute — DI and configuration patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure + Cross-cutting |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 65.1–65.7 |
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

**Your ONLY responsibility**: Enforce DI and configuration standards — IServiceCollection extension methods, lifetime management, Keyed Services, Options pattern with ValidateOnStart, IValidateOptions, and safe scope management for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 65.1: Add{Feature}Services() Extension Methods
> Source: E2 di, E1 dependency-injection

Group related service registrations into extension methods. Program.cs composes them — clean, bounded, reusable in tests.

```csharp
// DO — Extension method per feature [E2]
public static class OrderServiceCollectionExtensions
{
    public static IServiceCollection AddOrderServices(this IServiceCollection services)
    {
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IOrderValidationService, OrderValidationService>();
        return services;
    }
}

// DO — Clean Program.cs [E2]
builder.Services
    .AddUserServices()
    .AddOrderServices()
    .AddEmailServices()
    .AddPaymentServices();
```

```csharp
// DON'T — 200+ lines of registrations in Program.cs [E2]
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
// ... 150 more lines ...

// DON'T — Overly generic name [E2]
services.AddServices();  // What services?
```

| Convention | Use For |
|------------|---------|
| `Add{Feature}Services()` | General feature registration |
| `Add{Feature}()` | Short form when unambiguous |
| `Configure{Feature}()` | Primarily setting options |
| `Use{Feature}()` | Middleware (on IApplicationBuilder) |

### Pattern 65.2: Lifetime Management — Singleton / Scoped / Transient
> Source: E2 di, E1 dependency-injection

| Lifetime | Use When | Examples |
|----------|----------|----------|
| **Singleton** | Stateless, thread-safe, expensive | Config, HttpClient factories, caches |
| **Scoped** | Stateful per-request, DB contexts | DbContext, repositories, user context |
| **Transient** | Lightweight, cheap to create | Validators, short-lived helpers |

```csharp
// DO — Match lifetime to behavior [E2]
services.AddSingleton<IMjmlTemplateRenderer, MjmlTemplateRenderer>();  // Stateless
services.AddScoped<IUserRepository, UserRepository>();                   // Per-request
services.AddTransient<CreateUserRequestValidator>();                     // Cheap, short-lived

// DO — Register interfaces, not concrete types [E1]
services.AddScoped<IOrderService, OrderService>();
```

```csharp
// DON'T — Singleton with mutable state [E1]
services.AddSingleton<OrderService>();  // Has DbContext dependency!
```

### Pattern 65.3: Never Inject Scoped into Singleton
> Source: E2 di, E1 dependency-injection

A Singleton captures a Scoped service at construction — the Scoped service becomes a stale singleton.

```csharp
// DON'T — Singleton captures scoped service [E2]
public class CacheService  // Registered as Singleton
{
    private readonly IUserRepository _repo;  // Scoped — captured at startup, stale!
}

// DO — Use IServiceScopeFactory in singletons [E1]
public class OrderCache(IServiceScopeFactory scopeFactory)
{
    public async Task<Order?> GetAsync(Guid id)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Orders.FindAsync(id);
    }
}

// DO — Create scope in BackgroundService [E2]
public class GoodBackgroundService(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();
        // ...
    }
}
```

### Pattern 65.4: Options Pattern — Strongly-Typed Configuration
> Source: E2 config, E1 dependency-injection

Bind configuration sections to POCO classes. Always use `ValidateOnStart()` — fail fast.

```csharp
// DO — Options with validation [E2]
builder.Services.AddOptions<SmtpSettings>()
    .BindConfiguration(SmtpSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();  // CRITICAL — fail at startup, not at runtime

// DO — Settings class with SectionName constant [E2]
public class SmtpSettings
{
    public const string SectionName = "Smtp";

    [Required(ErrorMessage = "SMTP host is required")]
    public string Host { get; set; } = string.Empty;

    [Range(1, 65535)]
    public int Port { get; set; } = 587;

    public string? Username { get; set; }
    public bool UseSsl { get; set; } = true;
}
```

```csharp
// DON'T — Manual IConfiguration access [E2]
public class MyService(IConfiguration config)
{
    var host = config["Smtp:Host"];  // No validation, no strong typing!
}

// DON'T — Forget ValidateOnStart [E2]
builder.Services.AddOptions<Settings>()
    .ValidateDataAnnotations();  // Missing ValidateOnStart — validates only on first access!
```

### Pattern 65.5: IOptions vs IOptionsSnapshot vs IOptionsMonitor
> Source: E2 config

| Interface | Lifetime | Reloads on Change | Use Case |
|-----------|----------|-------------------|----------|
| `IOptions<T>` | Singleton | No | Static config, read once |
| `IOptionsSnapshot<T>` | Scoped | Yes (per request) | Web apps needing fresh config |
| `IOptionsMonitor<T>` | Singleton | Yes (with callback) | Background services, real-time |

```csharp
// DO — IOptions for static config [E2]
public sealed class EmailService(IOptions<SmtpSettings> options)
{
    private readonly SmtpSettings _settings = options.Value;
}

// DO — IOptionsMonitor for background services [E2]
public class BackgroundWorker(IOptionsMonitor<WorkerSettings> monitor) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await DoWorkAsync();
            await Task.Delay(monitor.CurrentValue.PollingInterval, ct);
        }
    }
}
```

### Pattern 65.6: IValidateOptions<T> for Complex Validation
> Source: E2 config

For cross-property or conditional validation, implement `IValidateOptions<T>`.

```csharp
// DO — Complex validator [E2]
public class SmtpSettingsValidator : IValidateOptions<SmtpSettings>
{
    public ValidateOptionsResult Validate(string? name, SmtpSettings options)
    {
        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.Host))
            failures.Add("Host is required");

        // Cross-property validation
        if (!string.IsNullOrEmpty(options.Username) && string.IsNullOrEmpty(options.Password))
            failures.Add("Password is required when Username is specified");

        // Conditional validation
        if (options.UseSsl && options.Port == 25)
            failures.Add("Port 25 is not used with SSL. Use 465 or 587");

        return failures.Count > 0
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
}

// DO — Register validator [E2]
builder.Services.AddSingleton<IValidateOptions<SmtpSettings>, SmtpSettingsValidator>();
```

```csharp
// DON'T — Throw in IValidateOptions [E2]
public ValidateOptionsResult Validate(string? name, Settings options)
{
    if (options.Value < 0)
        throw new ArgumentException("Negative!");  // WRONG — breaks validation chain
}

// DON'T — Validate in constructor [E2]
public MyService(IOptions<Settings> options)
{
    if (string.IsNullOrEmpty(options.Value.Required))
        throw new ArgumentException("Missing!");  // Too late — should fail at startup
}
```

### Pattern 65.7: Keyed Services (.NET 8+)
> Source: E1 dependency-injection, E2 di-advanced

Register multiple implementations of the same interface, resolved by key.

```csharp
// DO — Keyed service registration [E1]
services.AddKeyedScoped<INotificationService, EmailNotificationService>("email");
services.AddKeyedScoped<INotificationService, SmsNotificationService>("sms");
services.AddKeyedScoped<INotificationService, PushNotificationService>("push");

// DO — Resolve via attribute [E1]
public sealed class OrderHandler([FromKeyedServices("email")] INotificationService notifier)
{
    public async Task Handle(CreateOrder.Command cmd, CancellationToken ct)
    {
        await notifier.SendAsync(notification, ct);
    }
}

// DO — Resolve via IServiceProvider [E1]
public sealed class NotificationRouter(IServiceProvider provider)
{
    public INotificationService GetService(string channel)
        => provider.GetRequiredKeyedService<INotificationService>(channel);
}

// DO — Decorator pattern with Scrutor [E1]
services.AddScoped<IOrderService, OrderService>();
services.Decorate<IOrderService, LoggingOrderService>();
```

| Scenario | Recommendation |
|----------|---------------|
| Stateless service | Scoped (default) or Transient |
| Configuration / cache | Singleton |
| DbContext | Scoped (AddDbContext) |
| Multiple implementations | Keyed Services (.NET 8+) |
| Cross-cutting behavior | Decorator pattern (Scrutor) |
| Convention-based registration | Scrutor scan |
| Runtime selection | Factory delegate |
| Strongly-typed config | `AddOptions<T>().BindConfiguration().ValidateOnStart()` |

---

*ASP.NET Core DI & Configuration Specialist v1.0 — Generic*
*Sources: E2 di, E2 di-advanced, E2 config, E2 config-advanced, E1 dependency-injection*
*Pattern range: 65.1–65.7*
