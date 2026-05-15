# .NET Testing Specialist — Generic
# .NETテストスペシャリスト — 汎用
# Chuyen Gia Testing .NET — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: xUnit v3, WebApplicationFactory, Testcontainers, Verify, FluentAssertions
**Aspect**: Testing — Integration Tests, Unit Tests, Snapshot Testing, BDD Patterns
**Purpose**: Consultation agent for /plan and /execute — testing patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 67.1–67.9 |
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

**Your ONLY responsibility**: Enforce testing standards — integration tests first, real databases via Testcontainers (no in-memory), AAA pattern, behavior over implementation, WebApplicationFactory, Verify snapshot testing, test naming conventions, and shared fixtures for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 67.1: Integration Tests First — WebApplicationFactory
> Source: E1 testing, E1-rules testing

Integration tests are the highest-value tests. A single `WebApplicationFactory` test covers routing, binding, validation, business logic, and persistence.

```csharp
// DO — Integration test with WebApplicationFactory [E1]
public class CreateOrderTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private readonly HttpClient _client = fixture.CreateClient();

    [Fact]
    public async Task CreateOrder_ReturnsCreated_WithValidRequest()
    {
        // Arrange
        var request = new CreateOrderRequest("customer-1", [new("product-1", 2)]);

        // Act
        var response = await _client.PostAsJsonAsync("/api/orders", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        Assert.NotEqual(Guid.Empty, order.Id);
    }

    [Fact]
    public async Task CreateOrder_ReturnsValidationProblem_WithEmptyItems()
    {
        // Arrange
        var request = new CreateOrderRequest("customer-1", []);

        // Act
        var response = await _client.PostAsJsonAsync("/api/orders", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```

### Pattern 67.2: Real Databases — Testcontainers (No In-Memory)
> Source: E1 testing, E1-rules testing, E2 testcontainers

Use Testcontainers to spin up real database instances. `UseInMemoryDatabase` hides real bugs (transactions, constraints, SQL generation).

```csharp
// DO — ApiFixture with Testcontainers [E1]
public class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:17")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }
}
```

```csharp
// DON'T — In-memory database [E1-rules]
services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));
// Hides: transactions, constraints, SQL translation, query behavior

// DON'T — Mocking database [E2]
var mockDb = new Mock<IDbConnection>();
mockDb.Setup(db => db.QueryAsync<Order>(It.IsAny<string>()))
    .ReturnsAsync(new[] { new Order { Id = 1 } });
// Doesn't test real SQL, gives false confidence
```

| Container | Usage |
|-----------|-------|
| `PostgreSqlContainer` | `new PostgreSqlBuilder().WithImage("postgres:17").Build()` |
| `MsSqlContainer` | `new MsSqlBuilder().WithImage("mcr.microsoft.com/mssql/server:2022-latest").Build()` |
| `RedisContainer` | `new RedisBuilder().WithImage("redis:7").Build()` |

### Pattern 67.3: AAA Pattern — Mandatory
> Source: E1 testing, E1-rules testing

Every test has three clearly separated sections: Arrange, Act, Assert. No mixing.

```csharp
// DO — Clear AAA separation [E1-rules]
[Fact]
public async Task CreateOrder_WithValidItems_ReturnsSuccessResult()
{
    // Arrange
    var clock = new FakeTimeProvider(new DateTimeOffset(2025, 1, 15, 0, 0, 0, TimeSpan.Zero));
    var service = new OrderService(db, clock);
    var request = new CreateOrderRequest("customer-1", [new("product-1", 2)]);

    // Act
    var result = await service.CreateAsync(request);

    // Assert
    Assert.True(result.IsSuccess);
    Assert.NotEqual(Guid.Empty, result.Value.Id);
    Assert.Equal(clock.GetUtcNow(), result.Value.CreatedAt);
}
```

### Pattern 67.4: Test Behavior, Not Implementation
> Source: E1 testing, E1-rules testing

Assert on observable outcomes (HTTP response, database state, published event), not which internal methods were called. Tests coupled to internals break on every refactor.

```csharp
// DO — Assert observable outcome [E1-rules]
var order = await db.Orders.FindAsync(orderId);
Assert.NotNull(order);
Assert.Equal(OrderStatus.Created, order.Status);
```

```csharp
// DON'T — Verify internal method calls [E1-rules]
mock.Verify(x => x.AddAsync(It.IsAny<Order>()), Times.Once);
mock.Verify(x => x.SaveChangesAsync(), Times.Once);
// Couples tests to implementation details
```

### Pattern 67.5: Test Naming Convention
> Source: E1 testing, E1-rules testing

Pattern: `MethodName_StateUnderTest_ExpectedBehavior`. One assertion concept per test.

```
CreateOrder_WithValidItems_ReturnsSuccessResult
CreateOrder_WithEmptyItems_ReturnsValidationError
GetOrder_WithNonExistentId_ReturnsNotFound
CancelOrder_WhenAlreadyShipped_ReturnsConflict
```

```csharp
// DON'T — Vague names [E1]
[Fact] public async Task TestCreateOrder() { }  // What about it?
[Fact] public async Task CreateOrder_Works() { }  // "Works" is not a behavior
```

### Pattern 67.6: Verify Snapshot Testing
> Source: E1 testing

Use Verify for complex response objects where manual assertions would be fragile. First run creates `.verified.txt`, subsequent runs compare.

```csharp
// DO — Snapshot test for complex responses [E1]
[Fact]
public async Task GetOrder_MatchesSnapshot()
{
    // Arrange
    await SeedOrder(fixture);

    // Act
    var response = await _client.GetAsync("/api/orders/known-id");
    var content = await response.Content.ReadAsStringAsync();

    // Assert
    await Verify(content);
}
// Creates OrderTests.GetOrder_MatchesSnapshot.verified.txt
// Any response shape change fails the test — reviewer sees exact diff
```

### Pattern 67.7: Test Data Builders
> Source: E1 testing, E5 bdd-dotnet

Fluent builders for test data setup. Avoid complex Arrange sections with raw constructors.

```csharp
// DO — Builder pattern for test data [E1]
public class OrderBuilder
{
    private string _customerId = "default-customer";
    private List<OrderItem> _items = [new("product-1", 1, 9.99m)];
    private OrderStatus _status = OrderStatus.Pending;

    public OrderBuilder WithCustomer(string customerId) { _customerId = customerId; return this; }
    public OrderBuilder WithItems(params OrderItem[] items) { _items = [..items]; return this; }
    public OrderBuilder WithStatus(OrderStatus status) { _status = status; return this; }
    public Order Build() => Order.Create(_customerId, _items, _status);
}

// Usage
var order = new OrderBuilder()
    .WithCustomer("vip-customer")
    .WithStatus(OrderStatus.Confirmed)
    .Build();
```

### Pattern 67.8: Testing Time-Dependent Code
> Source: E1 testing

Use `TimeProvider` (.NET 8+) and `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing`.

```csharp
// DO — FakeTimeProvider for time control [E1]
[Fact]
public async Task ExpireOrders_MarksOldPendingOrdersAsExpired()
{
    // Arrange
    var clock = new FakeTimeProvider(new DateTimeOffset(2025, 6, 1, 0, 0, 0, TimeSpan.Zero));
    var order = Order.Create("customer-1", items, clock.GetUtcNow());
    db.Orders.Add(order);
    await db.SaveChangesAsync();

    clock.Advance(TimeSpan.FromDays(31));  // Time travel
    var handler = new ExpireOrders.Handler(db, clock);

    // Act
    await handler.Handle(new ExpireOrders.Command(), CancellationToken.None);

    // Assert
    var updated = await db.Orders.FindAsync(order.Id);
    Assert.Equal(OrderStatus.Expired, updated!.Status);
}
```

### Pattern 67.9: Shared Fixtures and Mocking Rules
> Source: E1-rules testing, E5 bdd-dotnet

Use `IClassFixture<T>` for expensive shared resources (DB containers). No mocking frameworks for things you own — use real or fake implementations. Reserve mocks for third-party boundaries.

```csharp
// DO — Shared fixture for expensive resources [E1-rules]
public class OrderTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    // ApiFixture starts container ONCE, reused across all tests in class
}

// DO — Fake implementation instead of mock [E5]
public class FakeClock : TimeProvider
{
    private DateTimeOffset _now;
    public FakeClock(DateTimeOffset start) => _now = start;
    public override DateTimeOffset GetUtcNow() => _now;
    public void Advance(TimeSpan duration) => _now += duration;
}

// DO — Override only external dependencies in tests [E1]
builder.ConfigureServices(services =>
{
    services.RemoveAll<IEmailSender>();
    services.AddSingleton<IEmailSender, TestEmailSender>();  // External boundary
});
```

```csharp
// DON'T — Mock internal interfaces [E1-rules]
var mockRepo = new Mock<IOrderRepository>();
// If you own IOrderRepository, use the real implementation with Testcontainers

// DON'T — Assertion-free tests [E1]
[Fact]
public async Task CreateOrder_Works()
{
    await service.CreateAsync(request);  // No assertion!
}
```

| Scenario | Recommendation |
|----------|---------------|
| API endpoint test | `WebApplicationFactory` integration test |
| Business logic isolation | Unit test with fakes/stubs |
| Database-dependent test | Testcontainers (real DB) |
| Complex response validation | Verify snapshot testing |
| Time-dependent logic | `FakeTimeProvider` |
| External API mock | `WireMock.Net` or `HttpMessageHandler` stub |
| Parameterized cases | `[Theory]` with `[InlineData]` or `[MemberData]` |
| Test data setup | Builder pattern |
| Shared expensive fixture | `IClassFixture<T>` with `IAsyncLifetime` |

---

*.NET Testing Specialist v1.0 — Generic*
*Sources: E1 testing, E1-rules testing, E2 testcontainers, E2 snapshot-testing, E5 bdd-dotnet*
*Pattern range: 67.1–67.9*
