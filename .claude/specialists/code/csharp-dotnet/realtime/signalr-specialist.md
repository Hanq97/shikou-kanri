# SignalR Specialist — Generic
# SignalRスペシャリスト — 汎用
# Chuyen Gia SignalR — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: ASP.NET Core SignalR, WebSockets, C# 12-14
**Aspect**: Real-time Communication — Hubs, Groups, Strongly-Typed Clients, Scaling
**Purpose**: Consultation agent for /plan and /execute — SignalR patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation + Infrastructure |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 14.1–14.6 |
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

**Your ONLY responsibility**: Enforce SignalR real-time communication standards — strongly-typed hubs, group management, authentication, scaling with Redis backplane, and proper connection lifecycle for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 14.1: Strongly-Typed Hub
> Source: Microsoft docs (.NET 8+ SignalR)

Define a client interface. Use `Hub<T>` for compile-time safety on server-to-client calls.

```csharp
// DO — Client interface
public interface IOrderClient
{
    Task OrderStatusChanged(Guid orderId, string status);
    Task OrderCreated(OrderNotification notification);
    Task ReceiveMessage(string user, string message);
}

// DO — Strongly-typed hub
public sealed class OrderHub : Hub<IOrderClient>
{
    public async Task JoinOrderGroup(Guid orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order:{orderId}");
    }

    public async Task LeaveOrderGroup(Guid orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order:{orderId}");
    }
}
```

```csharp
// DON'T — Untyped hub with magic strings
public class OrderHub : Hub
{
    public async Task NotifyStatusChange(Guid orderId, string status)
    {
        await Clients.Group($"order:{orderId}")
            .SendAsync("OrderStatusChanged", orderId, status);  // Magic string!
    }
}
```

### Pattern 14.2: Sending from Outside the Hub (IHubContext)
> Source: Microsoft docs

Inject `IHubContext<THub, TClient>` to send messages from services, handlers, or background workers.

```csharp
// DO — Inject typed hub context
public sealed class OrderService(
    AppDbContext db,
    IHubContext<OrderHub, IOrderClient> hubContext)
{
    public async Task UpdateStatusAsync(Guid orderId, OrderStatus status, CancellationToken ct)
    {
        // Update DB...
        await db.SaveChangesAsync(ct);

        // Notify connected clients in the order group
        await hubContext.Clients.Group($"order:{orderId}")
            .OrderStatusChanged(orderId, status.ToString());
    }
}
```

### Pattern 14.3: Authentication and Authorization
> Source: Microsoft docs

SignalR uses the same auth as ASP.NET Core. Token sent via query string for WebSocket.

```csharp
// DO — Require auth on hub
app.MapHub<OrderHub>("/hubs/orders")
    .RequireAuthorization();

// DO — Access user in hub
public sealed class OrderHub : Hub<IOrderClient>
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        await base.OnConnectedAsync();
    }
}

// DO — JWT via query string (WebSocket limitation)
builder.Services.AddAuthentication().AddJwtBearer(options =>
{
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});
```

### Pattern 14.4: Registration and Configuration
> Source: Microsoft docs

```csharp
// DO — Register SignalR with options
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 64 * 1024;  // 64KB
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// DO — Map hub endpoint
app.MapHub<OrderHub>("/hubs/orders");
```

### Pattern 14.5: Scaling with Redis Backplane
> Source: Microsoft docs

For multi-server deployments, use Redis backplane so messages reach clients on any server.

```csharp
// DO — Redis backplane for multi-server
builder.Services.AddSignalR()
    .AddStackExchangeRedis(builder.Configuration.GetConnectionString("Redis")!,
        options => options.Configuration.ChannelPrefix = RedisChannel.Literal("MyApp"));
```

### Pattern 14.6: Connection Lifecycle
> Source: Microsoft docs

Handle connect/disconnect for tracking online users.

```csharp
// DO — Track connections
public sealed class OrderHub : Hub<IOrderClient>
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        // Add to user-specific group, log connection
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Clean up: remove from groups, update online status
        await base.OnDisconnectedAsync(exception);
    }
}
```

| Scenario | Recommendation |
|----------|---------------|
| Real-time notifications | SignalR Hub with groups |
| Server-to-client push | `IHubContext<THub, TClient>` from services |
| Authentication | Same as ASP.NET Core, token via query string for WS |
| Multi-server | Redis backplane |
| User-specific messages | `Clients.User(userId)` or user groups |
| Group messages | `Clients.Group(groupName)` |
| Connection tracking | `OnConnectedAsync` / `OnDisconnectedAsync` |

---

*SignalR Specialist v1.0 — Generic*
*Sources: Microsoft docs (SignalR .NET 8+)*
*Pattern range: 14.1–14.6*
