# .NET Aspire Specialist — Generic
# .NET Aspireスペシャリスト — 汎用
# Chuyen Gia .NET Aspire — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: .NET Aspire, AppHost, ServiceDefaults, OpenTelemetry
**Aspect**: Cloud-Native Orchestration — AppHost, Service Discovery, Integration Testing
**Purpose**: Consultation agent for /plan and /execute — .NET Aspire patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 71.1–71.7 |
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

**Your ONLY responsibility**: Enforce .NET Aspire standards — AppHost orchestration, ServiceDefaults for shared config, service discovery, Aspire integrations (Postgres/Redis/RabbitMQ), integration testing with `Aspire.Hosting.Testing`, and dashboard observability for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 71.1: AppHost Configuration
> Source: E1 aspire

Aspire manages local development: starting services, databases, and brokers together.

```csharp
// DO — AppHost/Program.cs [E1]
var builder = DistributedApplication.CreateBuilder(args);

// Infrastructure resources
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .AddDatabase("myappdb");

var redis = builder.AddRedis("redis").WithRedisInsight();
var rabbitmq = builder.AddRabbitMQ("messaging").WithManagementPlugin();

// Application projects with references
var api = builder.AddProject<Projects.MyApp_Api>("api")
    .WithReference(postgres)
    .WithReference(redis)
    .WithReference(rabbitmq)
    .WithExternalHttpEndpoints();

var worker = builder.AddProject<Projects.MyApp_Worker>("worker")
    .WithReference(postgres)
    .WithReference(rabbitmq);

builder.Build().Run();
```

### Pattern 71.2: ServiceDefaults — Shared Baseline
> Source: E1 aspire, E2 aspire-service-defaults

One project configures OpenTelemetry, health checks, service discovery, and resilience for all services.

```csharp
// DO — ServiceDefaults/Extensions.cs [E1]
public static class Extensions
{
    public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
    {
        builder.ConfigureOpenTelemetry();
        builder.AddDefaultHealthChecks();
        builder.Services.AddServiceDiscovery();

        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });

        return builder;
    }
}

// DO — Use in every project [E1]
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<AppDbContext>("myappdb");  // Aspire integration
var app = builder.Build();
app.MapDefaultEndpoints();  // Health check endpoints
```

```csharp
// DON'T — Skip service defaults [E1]
builder.Services.AddOpenTelemetry()...  // Manual config per project
builder.Services.AddHealthChecks()...

// DON'T — Hardcode connection strings [E1]
options.UseNpgsql("Host=localhost;...");  // Use Aspire integration instead
```

### Pattern 71.3: Service Discovery
> Source: E1 aspire

Use `https+http://service-name` for service-to-service communication. Aspire resolves it.

```csharp
// DO — AppHost: configure references [E1]
var orderApi = builder.AddProject<Projects.OrderApi>("order-api");
var paymentApi = builder.AddProject<Projects.PaymentApi>("payment-api")
    .WithReference(orderApi);

// DO — In PaymentApi: use service discovery URL [E1]
builder.Services.AddHttpClient<OrderClient>(client =>
{
    client.BaseAddress = new Uri("https+http://order-api");
});
```

### Pattern 71.4: Integration Testing with Aspire
> Source: E2 aspire-integration-testing

Use `Aspire.Hosting.Testing` to start real infrastructure for tests. Dynamic ports, health check waiting.

```csharp
// DO — Aspire test fixture [E2]
public sealed class AspireAppFixture : IAsyncLifetime
{
    private DistributedApplication? _app;

    public async Task InitializeAsync()
    {
        var builder = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.MyApp_AppHost>();
        _app = await builder.BuildAsync();
        await _app.StartAsync();
        // Wait for health checks...
    }

    public HttpClient CreateHttpClient(string resourceName)
    {
        return _app!.CreateHttpClient(resourceName);
    }

    public async Task DisposeAsync()
    {
        if (_app is not null) await _app.DisposeAsync();
    }
}

// DO — Disable file watchers in test [E2]
[ModuleInitializer]
internal static void Initialize()
{
    Environment.SetEnvironmentVariable("DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE", "false");
}
```

### Pattern 71.5: Migration Service with WaitForCompletion
> Source: E2 efcore-patterns

Dedicated migration service runs first, then exits. API waits for completion.

```csharp
// DO — AppHost migration ordering [E2]
var migrations = builder.AddProject<Projects.MyApp_MigrationService>("migrations")
    .WaitFor(db).WithReference(db);

var api = builder.AddProject<Projects.MyApp_Api>("api")
    .WaitForCompletion(migrations)  // Waits for migration to finish
    .WithReference(db);
```

### Pattern 71.6: Solution Structure
> Source: E1 aspire

```
MyApp.slnx
├── MyApp.AppHost/               # Aspire orchestrator
│   └── Program.cs
├── MyApp.ServiceDefaults/       # Shared service configuration
│   └── Extensions.cs
├── src/
│   ├── MyApp.Api/               # Web API
│   └── MyApp.Worker/            # Background worker
└── tests/
    └── MyApp.Api.Tests/
```

### Pattern 71.7: Aspire Is Not for Production Deployment
> Source: E1 aspire

```
# DON'T — Deploy AppHost to Kubernetes [E1]
# Aspire = local dev orchestration

# DO — Use Aspire for local dev, deploy with:
# - Docker Compose
# - Kubernetes
# - Azure Container Apps
# Production gets separate deployment config
```

| Scenario | Recommendation |
|----------|---------------|
| Local dev with multiple services | Aspire AppHost |
| Single project local dev | `dotnet run`, Aspire optional |
| Shared config (telemetry, health) | ServiceDefaults project |
| Database for local dev | `AddPostgres()` / `AddSqlServer()` |
| Service discovery | Built-in `https+http://service-name` |
| Integration tests | `Aspire.Hosting.Testing` |
| Production deployment | Docker / K8s / Azure Container Apps |
| Local observability | Aspire dashboard (auto-configured) |

---

*.NET Aspire Specialist v1.0 — Generic*
*Sources: E1 aspire, E2 aspire-configuration, E2 aspire-integration-testing, E2 aspire-service-defaults*
*Pattern range: 71.1–71.7*
