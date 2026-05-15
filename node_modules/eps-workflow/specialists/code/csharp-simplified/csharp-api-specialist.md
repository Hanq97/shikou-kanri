# C# API Controller Specialist
# C# APIコントローラースペシャリスト
# Chuyên Gia API Controller C#

**Stack**: csharp-react-mssql
**Variant**: simplified-clean (C# Simplified Clean Architecture)
**Category**: API Controller
**Patterns**: 20
**Focus**: ASP.NET Core Web API controllers with service injection

---

## 🏗️ ARCHITECTURE CONTEXT

**API Layer in Clean Architecture**:
```
Controller (WebAPI):  Inject IUserService (NOT IMediator) ← WE ARE HERE
Service Layer:        Business logic
Repository Layer:     Data access
```

**Critical Constraints**:
- ✅ Inject IService (NOT IMediator)
- ✅ Constructor injection ONLY
- ✅ Async actions with CancellationToken
- ✅ Appropriate HTTP status codes (200, 201, 204, 400, 404, 500)
- ✅ ModelState validation
- ✅ CreatedAtAction for POST (201 with Location header)
- ❌ NO MediatR in controllers
- ❌ NO business logic in controllers (delegate to services)
- ❌ NO repository injection in controllers (inject services)

---

## 📋 API CONTROLLER PATTERNS (20 Patterns)

### 1. API Controller Attribute
**Pattern**: api-controller-attribute
**Usage**: Enable automatic model validation and binding

```csharp
// WebAPI/Controllers/UsersController.cs
using Microsoft.AspNetCore.Mvc;
using Services.Interfaces;
using Services.DTOs;

namespace WebAPI.Controllers;

[ApiController]  // ✅ Enables automatic model validation
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    // ✅ Constructor injection ONLY
    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // ... actions
}
```

**Benefits of [ApiController]**:
- Automatic model validation (400 Bad Request if ModelState invalid)
- Automatic HTTP 400 responses
- Binding source parameter inference ([FromBody], [FromQuery], etc.)

---

### 2. Route Attribute
**Pattern**: route-attribute
**Usage**: Define API route template

```csharp
[ApiController]
[Route("api/[controller]")]  // Route: /api/users
public class UsersController : ControllerBase
{
    // ...
}

// Alternative: explicit route
[Route("api/users")]
public class UsersController : ControllerBase
{
    // ...
}
```

---

### 3. HTTP GET Action (Get All)
**Pattern**: http-get-action, action-result-ok
**Usage**: Return list of resources

```csharp
[HttpGet]
public async Task<ActionResult<List<UserDto>>> GetAllAsync(CancellationToken cancellationToken)
{
    var users = await _userService.GetAllAsync(cancellationToken);
    return Ok(users);  // 200 OK
}

// Response: 200 OK
// Body: [{"id": "...", "name": "John", "email": "john@example.com"}, ...]
```

---

### 4. HTTP GET Action (Get By ID)
**Pattern**: http-get-by-id, action-result-not-found
**Usage**: Return single resource or 404

```csharp
[HttpGet("{id}")]
public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        return Ok(user);  // 200 OK
    }
    catch (NotFoundException)
    {
        return NotFound();  // 404 Not Found
    }
}

// Success: 200 OK with user data
// Not found: 404 Not Found
```

---

### 5. HTTP POST Action (Create)
**Pattern**: http-post-action, action-result-created-at-action
**Usage**: Create new resource, return 201 Created with Location header

```csharp
[HttpPost]
public async Task<ActionResult<UserDto>> CreateAsync([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(
            nameof(GetByIdAsync),  // Action name
            new { id = user.Id },  // Route values
            user);                 // Response body
    }
    catch (BusinessException ex)
    {
        return BadRequest(ex.Message);  // 400 Bad Request
    }
}

// Success: 201 Created
// Location: /api/users/{id}
// Body: {"id": "...", "name": "John", "email": "john@example.com"}
```

---

### 6. HTTP PUT Action (Update)
**Pattern**: http-put-action
**Usage**: Update existing resource

```csharp
[HttpPut("{id}")]
public async Task<ActionResult<UserDto>> UpdateAsync(Guid id, [FromBody] UpdateUserDto dto, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.UpdateAsync(id, dto, cancellationToken);
        return Ok(user);  // 200 OK
    }
    catch (NotFoundException)
    {
        return NotFound();  // 404 Not Found
    }
    catch (BusinessException ex)
    {
        return BadRequest(ex.Message);  // 400 Bad Request
    }
}

// Success: 200 OK with updated user data
// Not found: 404 Not Found
// Validation error: 400 Bad Request
```

---

### 7. HTTP DELETE Action
**Pattern**: http-delete-action, action-result-no-content
**Usage**: Delete resource, return 204 No Content

```csharp
[HttpDelete("{id}")]
public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
{
    try
    {
        await _userService.DeleteAsync(id, cancellationToken);
        return NoContent();  // 204 No Content
    }
    catch (NotFoundException)
    {
        return NotFound();  // 404 Not Found
    }
}

// Success: 204 No Content (no response body)
// Not found: 404 Not Found
```

---

### 8. FromBody Binding
**Pattern**: from-body-binding
**Usage**: Bind request body to DTO

```csharp
[HttpPost]
public async Task<ActionResult<UserDto>> CreateAsync([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
{
    // dto automatically bound from request JSON body
    var user = await _userService.CreateAsync(dto, cancellationToken);
    return CreatedAtAction(nameof(GetByIdAsync), new { id = user.Id }, user);
}
```

---

### 9. FromQuery Binding (Pagination)
**Pattern**: from-query-binding, pagination-query-params
**Usage**: Bind query parameters

```csharp
[HttpGet]
public async Task<ActionResult<PaginatedDto<UserDto>>> GetPaginatedAsync(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    CancellationToken cancellationToken = default)
{
    var result = await _userService.GetPaginatedAsync(pageNumber, pageSize, cancellationToken);
    return Ok(result);
}

// Request: GET /api/users?pageNumber=2&pageSize=20
```

---

### 10. ModelState Validation
**Pattern**: model-state-validation
**Usage**: [ApiController] automatically validates ModelState

```csharp
// With [ApiController], ModelState validation is automatic
[HttpPost]
public async Task<ActionResult<UserDto>> CreateAsync([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
{
    // NO NEED for manual validation check
    // if (!ModelState.IsValid) return BadRequest(ModelState);

    // [ApiController] automatically returns 400 if dto validation fails
    var user = await _userService.CreateAsync(dto, cancellationToken);
    return CreatedAtAction(nameof(GetByIdAsync), new { id = user.Id }, user);
}
```

---

### 11. Exception Handling with Try-Catch
**Pattern**: exception-handling-try-catch
**Usage**: Handle custom exceptions

```csharp
[HttpGet("{id}")]
public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        return Ok(user);
    }
    catch (NotFoundException ex)
    {
        return NotFound(ex.Message);  // 404 with error message
    }
    catch (Exception ex)
    {
        return StatusCode(500, "Internal server error");  // 500
    }
}
```

---

### 12. ProducesResponseType Attribute
**Pattern**: produces-response-type
**Usage**: Document API response types (OpenAPI/Swagger)

```csharp
[HttpGet("{id}")]
[ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        return Ok(user);
    }
    catch (NotFoundException)
    {
        return NotFound();
    }
}
```

---

### 13. Search with Query Parameters
**Pattern**: search-query-params
**Usage**: Search by query string

```csharp
[HttpGet("search")]
public async Task<ActionResult<List<UserDto>>> SearchAsync(
    [FromQuery] string? searchTerm,
    CancellationToken cancellationToken)
{
    if (string.IsNullOrWhiteSpace(searchTerm))
        return BadRequest("Search term is required");

    var users = await _userService.SearchUsersAsync(searchTerm, cancellationToken);
    return Ok(users);
}

// Request: GET /api/users/search?searchTerm=john
```

---

### 14. Custom Route Names
**Pattern**: custom-route-names
**Usage**: Named routes for CreatedAtAction

```csharp
[HttpGet("{id}", Name = "GetUserById")]  // Named route
public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    var user = await _userService.GetByIdAsync(id, cancellationToken);
    return Ok(user);
}

[HttpPost]
public async Task<ActionResult<UserDto>> CreateAsync([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
{
    var user = await _userService.CreateAsync(dto, cancellationToken);
    return CreatedAtRoute("GetUserById", new { id = user.Id }, user);  // Use named route
}
```

---

### 15. Async Actions with CancellationToken
**Pattern**: async-controller-actions
**Usage**: All actions must be async

```csharp
public async Task<ActionResult<List<UserDto>>> GetAllAsync(CancellationToken cancellationToken)
{
    var users = await _userService.GetAllAsync(cancellationToken);
    return Ok(users);
}
```

**Benefits**:
- Non-blocking I/O
- Better scalability
- Support request cancellation

---

### 16. Service Registration for Controllers
**Pattern**: controller-service-registration
**Usage**: Register services in Program.cs

```csharp
// Program.cs
builder.Services.AddControllers();

// Register services
builder.Services.AddScoped<IUserService, UserService>();
```

---

### 17. CORS Configuration
**Pattern**: cors-configuration
**Usage**: Enable CORS for cross-origin requests

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.MapControllers();
```

---

### 18. Bulk Operations
**Pattern**: bulk-operations
**Usage**: Create multiple resources

```csharp
[HttpPost("bulk")]
public async Task<ActionResult<List<UserDto>>> CreateBulkAsync(
    [FromBody] List<CreateUserDto> dtos,
    CancellationToken cancellationToken)
{
    try
    {
        var users = await _userService.CreateBulkAsync(dtos, cancellationToken);
        return Ok(users);  // 200 OK (not 201 for bulk)
    }
    catch (BusinessException ex)
    {
        return BadRequest(ex.Message);
    }
}
```

---

### 19. Filter by Status
**Pattern**: filter-by-status
**Usage**: Filter resources by property

```csharp
[HttpGet("active")]
public async Task<ActionResult<List<UserDto>>> GetActiveAsync(CancellationToken cancellationToken)
{
    var users = await _userService.GetActiveUsersAsync(cancellationToken);
    return Ok(users);
}

// Request: GET /api/users/active
```

---

### 20. HEAD Request for Existence Check
**Pattern**: head-request-exists
**Usage**: Check if resource exists without returning body

```csharp
[HttpHead("{id}")]
[HttpGet("{id}")]
public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        return Ok(user);
    }
    catch (NotFoundException)
    {
        return NotFound();
    }
}

// GET /api/users/{id} → Returns user data
// HEAD /api/users/{id} → Returns only headers (200 or 404)
```

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO MediatR Injection
```csharp
// DON'T DO THIS!
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;  // ❌ NO IMediator

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _mediator.Send(new GetUserByIdQuery(id), cancellationToken);  // ❌ NO MediatR
        return Ok(user);
    }
}
```

**✅ Inject IService instead**:
```csharp
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;  // ✅ Inject IService

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    public async Task<ActionResult<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);  // ✅ Service call
        return Ok(user);
    }
}
```

---

### ❌ NO Business Logic in Controllers
```csharp
// DON'T DO THIS!
[HttpPost]
public async Task<ActionResult<UserDto>> CreateAsync([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
{
    // ❌ Business validation in controller
    if (await _userRepository.AnyAsync(u => u.Email.Value == dto.Email, cancellationToken))
        return BadRequest("Email already exists");

    var user = new User { Name = dto.Name, Email = new Email(dto.Email) };
    await _userRepository.AddAsync(user, cancellationToken);
    await _userRepository.SaveChangesAsync(cancellationToken);

    return CreatedAtAction(nameof(GetByIdAsync), new { id = user.Id }, user);
}
```

**✅ Delegate to service**:
```csharp
[HttpPost]
public async Task<ActionResult<UserDto>> CreateAsync([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.CreateAsync(dto, cancellationToken);  // ✅ Service handles business logic
        return CreatedAtAction(nameof(GetByIdAsync), new { id = user.Id }, user);
    }
    catch (BusinessException ex)
    {
        return BadRequest(ex.Message);
    }
}
```

---

### ❌ NO Repository Injection in Controllers
```csharp
// DON'T DO THIS!
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;  // ❌ NO repository in controller

    public UsersController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }
}
```

**✅ Inject IService instead**

---

## 🎓 BEST PRACTICES

1. **[ApiController] Attribute**: Enable automatic model validation and binding
2. **Inject IService (NOT IMediator)**: Controllers inject service interfaces
3. **Async Actions**: All actions must be async with CancellationToken
4. **Appropriate Status Codes**: Use 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 404 (Not Found)
5. **CreatedAtAction for POST**: Return 201 Created with Location header
6. **NoContent for DELETE**: Return 204 No Content (no response body)
7. **Exception Handling**: Catch NotFoundException → 404, BusinessException → 400
8. **NO Business Logic**: Delegate all business logic to services
9. **NO Repository Injection**: Controllers inject services, NOT repositories
10. **ProducesResponseType**: Document API responses for OpenAPI/Swagger

---

## 📊 SUMMARY

**Patterns Documented**: 20 total
**Architecture**: C# Simplified Clean Architecture
**Injection**: IService (NOT IMediator, NOT IRepository)
**Status Codes**: 200, 201, 204, 400, 404, 500
**Attributes**: [ApiController], [Route], [HttpGet], [HttpPost], [HttpPut], [HttpDelete]
**Binding**: [FromBody], [FromQuery], [FromRoute]
**Best Practices**: Async actions, Exception handling, CreatedAtAction, ProducesResponseType

---

**Created**: 2025-12-30
**Stack**: csharp-react-mssql
**Variant**: simplified-clean
**Category**: API Controller
