# C# SignalR Real-Time Communication Specialist
# C# SignalRリアルタイム通信スペシャリスト
# Chuyên Gia Giao Tiếp Thời Gian Thực SignalR C#

**Stack**: csharp-react-mssql
**Variant**: simplified-clean (C# Simplified Clean Architecture)
**Category**: Real-Time Communication
**Patterns**: 30
**Focus**: ASP.NET Core SignalR with Hub-based messaging

---

## 🏗️ ARCHITECTURE CONTEXT

**SignalR in Clean Architecture**:
```
Frontend (React):     SignalR Client Connection
                             ↓
WebAPI Layer:         NotificationHub (Hub class) ← WE ARE HERE
                             ↓
Service Layer:        IUserService, INotificationService
                             ↓
Repository Layer:     Data access
```

**Critical Constraints**:
- ✅ Hub with constructor injection ONLY
- ✅ WebSocket transport ONLY (NO long polling fallback)
- ✅ Group management for targeted messaging
- ✅ Connection lifecycle management (OnConnectedAsync, OnDisconnectedAsync)
- ✅ Async methods with CancellationToken
- ❌ NO session-based state (use Context.ConnectionId)
- ❌ NO polling mechanisms
- ❌ NO field injection

---

## 📋 SIGNALR PATTERNS (30 Patterns)

### 1. Hub Base Class
**Pattern**: hub-base-class
**Usage**: Create SignalR hub inheriting from Hub

```csharp
// WebAPI/Hubs/NotificationHub.cs
using Microsoft.AspNetCore.SignalR;
using Services.Interfaces;

namespace WebAPI.Hubs;

public class NotificationHub : Hub
{
    private readonly IUserService _userService;
    private readonly INotificationService _notificationService;

    // ✅ Constructor injection ONLY
    public NotificationHub(IUserService userService, INotificationService notificationService)
    {
        _userService = userService;
        _notificationService = notificationService;
    }

    // Hub methods defined below
}
```

---

### 2. Hub Configuration in Program.cs
**Pattern**: hub-configuration
**Usage**: Register SignalR services and map hub endpoint

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add SignalR services
builder.Services.AddSignalR();

var app = builder.Build();

// Map hub endpoint
app.MapHub<NotificationHub>("/hubs/notification");

app.Run();
```

**Endpoint**: `wss://localhost:5001/hubs/notification`

---

### 3. OnConnectedAsync (Connection Lifecycle)
**Pattern**: on-connected-async
**Usage**: Handle client connection events

```csharp
public override async Task OnConnectedAsync()
{
    var userId = Context.User?.Identity?.Name;

    if (!string.IsNullOrEmpty(userId))
    {
        // Add user to personal group
        await Groups.AddToGroupAsync(Context.ConnectionId, userId);

        // Notify others
        await Clients.Others.SendAsync("UserConnected", userId);
    }

    await base.OnConnectedAsync();
}
```

---

### 4. OnDisconnectedAsync (Connection Cleanup)
**Pattern**: on-disconnected-async
**Usage**: Handle client disconnection and cleanup

```csharp
public override async Task OnDisconnectedAsync(Exception? exception)
{
    var userId = Context.User?.Identity?.Name;

    if (!string.IsNullOrEmpty(userId))
    {
        // Remove from groups
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);

        // Notify others
        await Clients.Others.SendAsync("UserDisconnected", userId);
    }

    await base.OnDisconnectedAsync(exception);
}
```

---

### 5. Send to All Clients
**Pattern**: send-to-all-clients
**Usage**: Broadcast message to all connected clients

```csharp
public async Task BroadcastMessage(string message)
{
    await Clients.All.SendAsync("ReceiveMessage", new
    {
        User = Context.User?.Identity?.Name,
        Message = message,
        Timestamp = DateTime.UtcNow
    });
}
```

---

### 6. Send to Specific User
**Pattern**: send-to-user
**Usage**: Send message to specific user by userId

```csharp
public async Task SendMessageToUser(string userId, string message)
{
    await Clients.User(userId).SendAsync("ReceiveMessage", new
    {
        From = Context.User?.Identity?.Name,
        Message = message,
        Timestamp = DateTime.UtcNow
    });
}
```

---

### 7. Send to Group
**Pattern**: send-to-group
**Usage**: Send message to all clients in a group

```csharp
public async Task SendMessageToGroup(string groupName, string message)
{
    await Clients.Group(groupName).SendAsync("ReceiveMessage", new
    {
        Group = groupName,
        From = Context.User?.Identity?.Name,
        Message = message,
        Timestamp = DateTime.UtcNow
    });
}
```

---

### 8. Add to Group
**Pattern**: add-to-group
**Usage**: Add connection to a named group

```csharp
public async Task JoinGroup(string groupName)
{
    await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

    await Clients.Group(groupName).SendAsync("UserJoinedGroup", new
    {
        User = Context.User?.Identity?.Name,
        Group = groupName
    });
}
```

---

### 9. Remove from Group
**Pattern**: remove-from-group
**Usage**: Remove connection from a named group

```csharp
public async Task LeaveGroup(string groupName)
{
    await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

    await Clients.Group(groupName).SendAsync("UserLeftGroup", new
    {
        User = Context.User?.Identity?.Name,
        Group = groupName
    });
}
```

---

### 10. Send to Others (Exclude Caller)
**Pattern**: send-to-others
**Usage**: Send message to all except the caller

```csharp
public async Task NotifyOthers(string message)
{
    await Clients.Others.SendAsync("ReceiveNotification", new
    {
        From = Context.User?.Identity?.Name,
        Message = message
    });
}
```

---

### 11. Send to Caller
**Pattern**: send-to-caller
**Usage**: Send message back to the caller only

```csharp
public async Task EchoMessage(string message)
{
    await Clients.Caller.SendAsync("MessageEcho", new
    {
        Original = message,
        Timestamp = DateTime.UtcNow
    });
}
```

---

### 12. Hub Method with Return Value
**Pattern**: hub-method-return-value
**Usage**: Return data from hub method

```csharp
public async Task<int> GetActiveUsersCount()
{
    var count = await _userService.GetActiveUsersCountAsync(CancellationToken.None);
    return count;
}
```

---

### 13. Hub Method with Parameters
**Pattern**: hub-method-parameters
**Usage**: Accept parameters from client

```csharp
public async Task UpdateUserStatus(Guid userId, string status)
{
    await _userService.UpdateStatusAsync(userId, status, CancellationToken.None);

    // Notify all clients
    await Clients.All.SendAsync("UserStatusUpdated", new
    {
        UserId = userId,
        Status = status
    });
}
```

---

### 14. Error Handling in Hub Methods
**Pattern**: hub-error-handling
**Usage**: Handle exceptions in hub methods

```csharp
public async Task SendNotification(Guid userId, string message)
{
    try
    {
        var user = await _userService.GetByIdAsync(userId, CancellationToken.None);

        await Clients.User(userId.ToString()).SendAsync("ReceiveNotification", message);
    }
    catch (NotFoundException)
    {
        await Clients.Caller.SendAsync("Error", "User not found");
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", "Failed to send notification");
    }
}
```

---

### 15. Typed Hub (Strongly Typed Client Interface)
**Pattern**: typed-hub
**Usage**: Use interface for type-safe client methods

```csharp
// INotificationClient.cs
public interface INotificationClient
{
    Task ReceiveMessage(string user, string message);
    Task UserConnected(string userId);
    Task UserDisconnected(string userId);
}

// NotificationHub.cs
public class NotificationHub : Hub<INotificationClient>
{
    public async Task BroadcastMessage(string message)
    {
        await Clients.All.ReceiveMessage(Context.User?.Identity?.Name, message);
    }

    public override async Task OnConnectedAsync()
    {
        await Clients.Others.UserConnected(Context.User?.Identity?.Name);
        await base.OnConnectedAsync();
    }
}
```

---

### 16. Hub Context Injection (Send from Service)
**Pattern**: hub-context-injection
**Usage**: Send SignalR messages from services

```csharp
// Services/Implementations/NotificationService.cs
using Microsoft.AspNetCore.SignalR;
using WebAPI.Hubs;

public class NotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyUserAsync(Guid userId, string message, CancellationToken cancellationToken)
    {
        await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", message, cancellationToken);
    }
}
```

---

### 17. CORS Configuration for SignalR
**Pattern**: signalr-cors
**Usage**: Enable CORS for SignalR connections

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("SignalRCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000")  // React dev server
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();  // Required for SignalR
    });
});

var app = builder.Build();

app.UseCors("SignalRCorsPolicy");
app.MapHub<NotificationHub>("/hubs/notification");
```

---

### 18. Authentication for SignalR
**Pattern**: signalr-authentication
**Usage**: Require authentication for hub connections

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Read token from query string for SignalR
                var accessToken = context.Request.Query["access_token"];

                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

// Hub with [Authorize]
[Authorize]
public class NotificationHub : Hub
{
    // Only authenticated users can connect
}
```

---

### 19. Hub Filters
**Pattern**: hub-filters
**Usage**: Apply filters to hub methods

```csharp
public class LoggingHubFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        Console.WriteLine($"Calling hub method: {invocationContext.HubMethodName}");

        try
        {
            return await next(invocationContext);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in {invocationContext.HubMethodName}: {ex.Message}");
            throw;
        }
    }
}

// Register filter
builder.Services.AddSignalR(options =>
{
    options.AddFilter<LoggingHubFilter>();
});
```

---

### 20. Connection State Management
**Pattern**: connection-state-management
**Usage**: Track connection state

```csharp
public class NotificationHub : Hub
{
    private static readonly ConcurrentDictionary<string, string> _connections = new();

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.Identity?.Name;
        _connections.TryAdd(Context.ConnectionId, userId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _connections.TryRemove(Context.ConnectionId, out _);

        await base.OnDisconnectedAsync(exception);
    }

    public async Task<List<string>> GetOnlineUsers()
    {
        return _connections.Values.Distinct().ToList();
    }
}
```

---

### 21. Streaming from Server to Client
**Pattern**: server-to-client-streaming
**Usage**: Stream data to clients

```csharp
public async IAsyncEnumerable<int> StreamCounter(int count, [EnumeratorCancellation] CancellationToken cancellationToken)
{
    for (int i = 0; i < count; i++)
    {
        cancellationToken.ThrowIfCancellationRequested();

        yield return i;

        await Task.Delay(1000, cancellationToken);
    }
}
```

---

### 22. Streaming from Client to Server
**Pattern**: client-to-server-streaming
**Usage**: Receive stream from client

```csharp
public async Task UploadStream(IAsyncEnumerable<string> stream)
{
    await foreach (var item in stream)
    {
        Console.WriteLine($"Received: {item}");

        await Clients.Caller.SendAsync("StreamProgress", item);
    }

    await Clients.Caller.SendAsync("StreamComplete");
}
```

---

### 23. Hub Method Naming Convention
**Pattern**: hub-method-naming
**Usage**: Use clear method names for client invocation

```csharp
public class NotificationHub : Hub
{
    // ✅ Good: Clear action names
    public async Task SendMessage(string message) { }
    public async Task JoinRoom(string roomName) { }
    public async Task LeaveRoom(string roomName) { }

    // ❌ Bad: Vague names
    public async Task Do(string action) { }
    public async Task Process(object data) { }
}
```

---

### 24. Hub Method Authorization
**Pattern**: hub-method-authorization
**Usage**: Apply authorization to specific hub methods

```csharp
public class NotificationHub : Hub
{
    [Authorize(Roles = "Admin")]
    public async Task BroadcastToAll(string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", message);
    }

    [Authorize]
    public async Task SendMessage(string message)
    {
        await Clients.Others.SendAsync("ReceiveMessage", Context.User?.Identity?.Name, message);
    }
}
```

---

### 25. Hub Options Configuration
**Pattern**: hub-options-configuration
**Usage**: Configure SignalR hub options

```csharp
// Program.cs
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
    options.MaximumReceiveMessageSize = 32 * 1024;  // 32 KB
});
```

---

### 26. Transient Error Handling
**Pattern**: transient-error-handling
**Usage**: Handle transient connection errors

```csharp
public class NotificationHub : Hub
{
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception != null)
        {
            // Log exception
            Console.WriteLine($"Disconnected with error: {exception.Message}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
```

---

### 27. Hub Method Progress Reporting
**Pattern**: hub-method-progress
**Usage**: Report progress during long operations

```csharp
public async Task ProcessLargeDataset(int recordCount)
{
    for (int i = 0; i < recordCount; i++)
    {
        // Process record
        await Task.Delay(100);

        // Report progress
        var progress = (i + 1) * 100 / recordCount;
        await Clients.Caller.SendAsync("Progress", progress);
    }

    await Clients.Caller.SendAsync("ProcessComplete");
}
```

---

### 28. Hub with Cancellation Token
**Pattern**: hub-cancellation-token
**Usage**: Support cancellation in hub methods

```csharp
public async Task LongRunningOperation(CancellationToken cancellationToken)
{
    for (int i = 0; i < 100; i++)
    {
        cancellationToken.ThrowIfCancellationRequested();

        await Task.Delay(1000, cancellationToken);

        await Clients.Caller.SendAsync("Progress", i + 1, cancellationToken);
    }
}
```

---

### 29. Hub Unit of Work Pattern
**Pattern**: hub-unit-of-work
**Usage**: Use DbContext in hub with proper scoping

```csharp
public class NotificationHub : Hub
{
    private readonly IServiceScopeFactory _scopeFactory;

    public NotificationHub(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task SendAndSaveNotification(Guid userId, string message)
    {
        using var scope = _scopeFactory.CreateScope();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        await notificationService.CreateNotificationAsync(userId, message, CancellationToken.None);

        await Clients.User(userId.ToString()).SendAsync("ReceiveNotification", message);
    }
}
```

---

### 30. Hub Diagnostics and Logging
**Pattern**: hub-diagnostics
**Usage**: Add logging for debugging

```csharp
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}, User: {User}",
            Context.ConnectionId, Context.User?.Identity?.Name);

        await base.OnConnectedAsync();
    }

    public async Task SendMessage(string message)
    {
        _logger.LogInformation("Message from {User}: {Message}",
            Context.User?.Identity?.Name, message);

        await Clients.All.SendAsync("ReceiveMessage", message);
    }
}
```

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Long Polling Fallback
```csharp
// DON'T DO THIS!
builder.Services.AddSignalR(options =>
{
    options.Transports = HttpTransportType.WebSockets | HttpTransportType.LongPolling;  // ❌ NO long polling
});
```

**✅ Use WebSocket only**:
```csharp
builder.Services.AddSignalR(options =>
{
    options.Transports = HttpTransportType.WebSockets;  // ✅ WebSocket only
});
```

---

### ❌ NO Field Injection
```csharp
// DON'T DO THIS!
public class NotificationHub : Hub
{
    [Inject]
    private IUserService _userService;  // ❌ NO field injection
}
```

**✅ Use constructor injection**

---

### ❌ NO Session-Based State
```csharp
// DON'T DO THIS!
public class NotificationHub : Hub
{
    public async Task SaveState(string key, string value)
    {
        Context.Items[key] = value;  // ❌ NO session state
    }
}
```

**✅ Use external state store (Redis, Database)**

---

## 🎓 BEST PRACTICES

1. **Constructor Injection ONLY**: Inject services via constructor
2. **WebSocket Transport**: Disable long polling for real-time performance
3. **Connection Lifecycle**: Implement OnConnectedAsync and OnDisconnectedAsync
4. **Group Management**: Use groups for targeted messaging
5. **Authentication**: Use JWT Bearer tokens via query string
6. **CORS Configuration**: AllowCredentials() required for SignalR
7. **Error Handling**: Catch exceptions and send error messages to caller
8. **Logging**: Log connection events and method invocations
9. **Typed Hubs**: Use IClientProxy<T> for type safety
10. **Hub Context**: Inject IHubContext<THub> in services for background messaging

---

## 📊 SUMMARY

**Patterns Documented**: 30 total
**Architecture**: C# Simplified Clean Architecture + SignalR
**Focus**: Real-time bidirectional communication (WebSocket)
**Key Features**: Hub methods, Groups, Typed hubs, Streaming
**Best Practices**: Constructor injection, WebSocket only, JWT auth, CORS

---

**Created**: 2025-12-30
**Stack**: csharp-react-mssql
**Variant**: simplified-clean
**Category**: Real-Time Communication
