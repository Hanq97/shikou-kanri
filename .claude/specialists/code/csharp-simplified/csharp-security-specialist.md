# C# Security & Authentication Specialist
# C# セキュリティ & 認証スペシャリスト
# Chuyên Gia Bảo Mật & Xác Thực C#

**Stack**: csharp-react-mssql
**Variant**: simplified-clean (C# Simplified Clean Architecture)
**Category**: Security & Authentication
**Patterns**: 35
**Focus**: JWT Authentication, Authorization Policies, CORS, Security Best Practices

---

## 🏗️ ARCHITECTURE CONTEXT

**Security in Clean Architecture**:
```
Frontend (React):     Axios Interceptor (JWT token)
                             ↓
                      Authorization: Bearer <token>
                             ↓
WebAPI Layer:         JWT Middleware → [Authorize] ← WE ARE HERE
                             ↓
Service Layer:        Business logic (ClaimsPrincipal)
                             ↓
Repository Layer:     Data access
```

**Critical Constraints**:
- ✅ JWT Bearer tokens ONLY (NO session-based auth)
- ✅ HTTPS required in production
- ✅ Secure secrets (appsettings.json → Environment variables)
- ✅ Role-based and policy-based authorization
- ✅ CORS configured for React frontend
- ❌ NO session cookies
- ❌ NO wildcard CORS in production
- ❌ NO hardcoded secrets

---

## 📋 SECURITY PATTERNS (35 Patterns)

### 1. JWT Service Interface
**Pattern**: jwt-service-interface
**Usage**: Define JWT token generation and validation service

```csharp
// Services/Interfaces/IJwtService.cs
namespace Services.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
    string GenerateRefreshToken();
}
```

---

### 2. JWT Service Implementation
**Pattern**: jwt-service-implementation
**Usage**: Implement JWT token generation

```csharp
// Services/Implementations/JwtService.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Services.Interfaces;
using Domain.Entities;

namespace Services.Implementations;

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, user.Name),
            new Claim(JwtRegisteredClaimNames.Email, user.Email.Value),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    public string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}
```

---

### 3. JWT Configuration in appsettings.json
**Pattern**: jwt-configuration
**Usage**: Configure JWT settings

```json
// appsettings.json
{
  "Jwt": {
    "Key": "your-256-bit-secret-key-min-32-characters-long",
    "Issuer": "https://localhost:5001",
    "Audience": "https://localhost:3000"
  }
}
```

**Production**: Use environment variables or Azure Key Vault

---

### 4. JWT Authentication Middleware Setup
**Pattern**: jwt-authentication-middleware
**Usage**: Configure JWT authentication in Program.cs

```csharp
// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // For SignalR authentication
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
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

builder.Services.AddAuthorization();

var app = builder.Build();

// Use Authentication and Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.Run();
```

---

### 5. [Authorize] Attribute on Controller
**Pattern**: authorize-attribute-controller
**Usage**: Require authentication for controller actions

```csharp
// WebAPI/Controllers/UsersController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers;

[Authorize]  // ✅ Require authentication
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    // All actions require authentication
}
```

---

### 6. [AllowAnonymous] for Public Endpoints
**Pattern**: allow-anonymous
**Usage**: Allow unauthenticated access to specific endpoints

```csharp
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [AllowAnonymous]  // ✅ Public endpoint
    [HttpPost("login")]
    public async Task<ActionResult<TokenDto>> Login([FromBody] LoginDto dto)
    {
        // Login logic
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<TokenDto>> Register([FromBody] RegisterDto dto)
    {
        // Registration logic
    }
}
```

---

### 7. Role-Based Authorization
**Pattern**: role-based-authorization
**Usage**: Restrict access by user role

```csharp
[Authorize(Roles = "Admin")]
[HttpDelete("{id}")]
public async Task<IActionResult> DeleteUser(Guid id)
{
    // Only Admin can delete users
    await _userService.DeleteAsync(id, CancellationToken.None);
    return NoContent();
}

[Authorize(Roles = "Admin,Manager")]
[HttpGet("reports")]
public async Task<ActionResult<List<ReportDto>>> GetReports()
{
    // Admin or Manager can access reports
    var reports = await _reportService.GetAllAsync(CancellationToken.None);
    return Ok(reports);
}
```

---

### 8. Policy-Based Authorization
**Pattern**: policy-based-authorization
**Usage**: Define custom authorization policies

```csharp
// Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdminRole", policy =>
        policy.RequireRole("Admin"));

    options.AddPolicy("RequireEmailVerified", policy =>
        policy.RequireClaim("EmailVerified", "true"));

    options.AddPolicy("MinimumAge18", policy =>
        policy.Requirements.Add(new MinimumAgeRequirement(18)));
});

// Controller
[Authorize(Policy = "RequireAdminRole")]
[HttpGet("admin-dashboard")]
public IActionResult AdminDashboard()
{
    return Ok(new { Message = "Admin Dashboard" });
}
```

---

### 9. Custom Authorization Requirement
**Pattern**: custom-authorization-requirement
**Usage**: Create custom authorization logic

```csharp
// Authorization/MinimumAgeRequirement.cs
using Microsoft.AspNetCore.Authorization;

public class MinimumAgeRequirement : IAuthorizationRequirement
{
    public int MinimumAge { get; }

    public MinimumAgeRequirement(int minimumAge)
    {
        MinimumAge = minimumAge;
    }
}

// Authorization/MinimumAgeHandler.cs
public class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MinimumAgeRequirement requirement)
    {
        var birthDateClaim = context.User.FindFirst(c => c.Type == "BirthDate");

        if (birthDateClaim == null)
            return Task.CompletedTask;

        var birthDate = DateTime.Parse(birthDateClaim.Value);
        var age = DateTime.Today.Year - birthDate.Year;

        if (age >= requirement.MinimumAge)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

// Program.cs
builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();
```

---

### 10. CORS Configuration for React
**Pattern**: cors-configuration-react
**Usage**: Configure CORS for React frontend

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactCorsPolicy", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development: Allow localhost:3000
            policy.WithOrigins("http://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            // Production: Specific domain
            policy.WithOrigins("https://yourdomain.com")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

app.UseCors("ReactCorsPolicy");
```

---

### 11. Login Endpoint
**Pattern**: login-endpoint
**Usage**: Authenticate user and return JWT token

```csharp
[AllowAnonymous]
[HttpPost("login")]
public async Task<ActionResult<TokenDto>> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.ValidateCredentialsAsync(dto.Email, dto.Password, cancellationToken);

        if (user == null)
            return Unauthorized(new { Message = "Invalid email or password" });

        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        // Save refresh token
        await _userService.SaveRefreshTokenAsync(user.Id, refreshToken, cancellationToken);

        return Ok(new TokenDto
        {
            AccessToken = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { Message = "Login failed" });
    }
}
```

---

### 12. Register Endpoint
**Pattern**: register-endpoint
**Usage**: Create new user account

```csharp
[AllowAnonymous]
[HttpPost("register")]
public async Task<ActionResult<TokenDto>> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.CreateUserAsync(dto, cancellationToken);

        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        await _userService.SaveRefreshTokenAsync(user.Id, refreshToken, cancellationToken);

        return CreatedAtAction(nameof(GetProfile), new TokenDto
        {
            AccessToken = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        });
    }
    catch (BusinessException ex)
    {
        return BadRequest(new { Message = ex.Message });
    }
}
```

---

### 13. Refresh Token Endpoint
**Pattern**: refresh-token-endpoint
**Usage**: Refresh access token using refresh token

```csharp
[AllowAnonymous]
[HttpPost("refresh")]
public async Task<ActionResult<TokenDto>> Refresh([FromBody] RefreshTokenDto dto, CancellationToken cancellationToken)
{
    try
    {
        var user = await _userService.ValidateRefreshTokenAsync(dto.RefreshToken, cancellationToken);

        if (user == null)
            return Unauthorized(new { Message = "Invalid refresh token" });

        var newAccessToken = _jwtService.GenerateToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken();

        await _userService.SaveRefreshTokenAsync(user.Id, newRefreshToken, cancellationToken);

        return Ok(new TokenDto
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { Message = "Token refresh failed" });
    }
}
```

---

### 14. Get Current User from Claims
**Pattern**: get-current-user-claims
**Usage**: Access authenticated user information

```csharp
[Authorize]
[HttpGet("me")]
public async Task<ActionResult<UserDto>> GetProfile(CancellationToken cancellationToken)
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        return Unauthorized();

    var user = await _userService.GetByIdAsync(userId, cancellationToken);
    return Ok(user);
}
```

---

### 15. Password Hashing (BCrypt)
**Pattern**: password-hashing-bcrypt
**Usage**: Hash passwords securely

```csharp
// Install: dotnet add package BCrypt.Net-Next

using BCrypt.Net;

public class UserService : IUserService
{
    public async Task<User> CreateUserAsync(RegisterDto dto, CancellationToken cancellationToken)
    {
        // Hash password
        var passwordHash = BCrypt.HashPassword(dto.Password, workFactor: 12);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Email = new Email(dto.Email),
            PasswordHash = passwordHash,
            Role = "User"
        };

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return user;
    }

    public async Task<User?> ValidateCredentialsAsync(string email, string password, CancellationToken cancellationToken)
    {
        var user = await _userRepository.FindByEmailAsync(email, cancellationToken);

        if (user == null)
            return null;

        // Verify password
        var isValid = BCrypt.Verify(password, user.PasswordHash);

        return isValid ? user : null;
    }
}
```

---

### 16. HTTPS Enforcement
**Pattern**: https-enforcement
**Usage**: Require HTTPS in production

```csharp
// Program.cs
var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();  // ✅ Redirect HTTP to HTTPS
    app.UseHsts();              // ✅ HTTP Strict Transport Security
}
```

---

### 17. Security Headers Middleware
**Pattern**: security-headers-middleware
**Usage**: Add security headers to responses

```csharp
// Program.cs
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Add("Referrer-Policy", "no-referrer");
    context.Response.Headers.Add("Content-Security-Policy", "default-src 'self'");

    await next();
});
```

---

### 18. Rate Limiting
**Pattern**: rate-limiting
**Usage**: Prevent abuse with rate limiting

```csharp
// Install: dotnet add package AspNetCoreRateLimit

// Program.cs
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "*",
            Limit = 100,
            Period = "1m"
        }
    };
});

builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

var app = builder.Build();

app.UseIpRateLimiting();
```

---

### 19. CSRF Protection (Anti-Forgery Tokens)
**Pattern**: csrf-protection
**Usage**: Protect against CSRF attacks

```csharp
// Program.cs
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
});

// Controller
[HttpPost]
[ValidateAntiForgeryToken]
public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
{
    // Protected action
}
```

---

### 20. API Key Authentication
**Pattern**: api-key-authentication
**Usage**: Authenticate using API keys

```csharp
// Middleware/ApiKeyMiddleware.cs
public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private const string API_KEY_HEADER = "X-API-Key";

    public ApiKeyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IConfiguration configuration)
    {
        if (!context.Request.Headers.TryGetValue(API_KEY_HEADER, out var extractedApiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("API Key missing");
            return;
        }

        var apiKey = configuration["ApiKey"];

        if (!apiKey.Equals(extractedApiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Invalid API Key");
            return;
        }

        await _next(context);
    }
}

// Program.cs
app.UseMiddleware<ApiKeyMiddleware>();
```

---

### 21. Input Validation and Sanitization
**Pattern**: input-validation-sanitization
**Usage**: Validate and sanitize user input

```csharp
// DTOs with Data Annotations
public record CreateUserDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    [RegularExpression(@"^[a-zA-Z\s]+$", ErrorMessage = "Name can only contain letters and spaces")]
    public string Name { get; init; }

    [Required]
    [EmailAddress]
    public string Email { get; init; }

    [Required]
    [StringLength(100, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
        ErrorMessage = "Password must contain uppercase, lowercase, number, and special character")]
    public string Password { get; init; }
}
```

---

### 22. SQL Injection Prevention
**Pattern**: sql-injection-prevention
**Usage**: Use parameterized queries (EF Core handles this)

```csharp
// ✅ EF Core automatically parameterizes queries
var user = await _context.Users
    .Where(u => u.Email.Value == email)  // ✅ Safe - parameterized
    .FirstOrDefaultAsync();

// ❌ NEVER use raw SQL with string interpolation
// var user = await _context.Users.FromSqlRaw($"SELECT * FROM Users WHERE Email = '{email}'");  // ❌ VULNERABLE
```

---

### 23. XSS Protection
**Pattern**: xss-protection
**Usage**: Encode output to prevent XSS

```csharp
// Frontend React automatically escapes JSX
// Backend: Return JSON (ASP.NET Core auto-encodes)

[HttpGet("{id}")]
public async Task<ActionResult<UserDto>> GetUser(Guid id)
{
    var user = await _userService.GetByIdAsync(id, CancellationToken.None);
    return Ok(user);  // ✅ JSON serialization auto-encodes
}
```

---

### 24. Secrets Management (Environment Variables)
**Pattern**: secrets-management-env-vars
**Usage**: Store secrets in environment variables

```csharp
// appsettings.json (NO secrets here!)
{
  "Jwt": {
    "Key": "",  // ❌ Leave empty
    "Issuer": "https://localhost:5001",
    "Audience": "https://localhost:3000"
  }
}

// Program.cs
var jwtKey = builder.Configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");

if (string.IsNullOrEmpty(jwtKey))
    throw new InvalidOperationException("JWT_KEY environment variable not set");
```

---

### 25. Logging Security Events
**Pattern**: logging-security-events
**Usage**: Log authentication and authorization events

```csharp
public class JwtService : IJwtService
{
    private readonly ILogger<JwtService> _logger;

    public string GenerateToken(User user)
    {
        _logger.LogInformation("JWT token generated for user: {UserId}", user.Id);

        // Token generation logic
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var principal = /* validation logic */;
            _logger.LogInformation("JWT token validated successfully");
            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("JWT token validation failed: {Error}", ex.Message);
            return null;
        }
    }
}
```

---

### 26. Account Lockout After Failed Attempts
**Pattern**: account-lockout
**Usage**: Lock account after failed login attempts

```csharp
public class UserService : IUserService
{
    public async Task<User?> ValidateCredentialsAsync(string email, string password, CancellationToken cancellationToken)
    {
        var user = await _userRepository.FindByEmailAsync(email, cancellationToken);

        if (user == null)
            return null;

        if (user.IsLockedOut && user.LockoutEnd > DateTime.UtcNow)
        {
            _logger.LogWarning("Login attempt for locked account: {Email}", email);
            return null;
        }

        var isValid = BCrypt.Verify(password, user.PasswordHash);

        if (!isValid)
        {
            user.FailedLoginAttempts++;

            if (user.FailedLoginAttempts >= 5)
            {
                user.IsLockedOut = true;
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(30);
                _logger.LogWarning("Account locked due to failed attempts: {Email}", email);
            }

            await _userRepository.SaveChangesAsync(cancellationToken);
            return null;
        }

        // Reset on successful login
        user.FailedLoginAttempts = 0;
        user.IsLockedOut = false;
        user.LockoutEnd = null;
        await _userRepository.SaveChangesAsync(cancellationToken);

        return user;
    }
}
```

---

### 27. Email Verification
**Pattern**: email-verification
**Usage**: Require email verification before activation

```csharp
public async Task<User> CreateUserAsync(RegisterDto dto, CancellationToken cancellationToken)
{
    var user = new User
    {
        Id = Guid.NewGuid(),
        Email = new Email(dto.Email),
        PasswordHash = BCrypt.HashPassword(dto.Password),
        EmailVerified = false,
        EmailVerificationToken = Guid.NewGuid().ToString()
    };

    await _userRepository.AddAsync(user, cancellationToken);
    await _emailService.SendVerificationEmailAsync(user.Email.Value, user.EmailVerificationToken, cancellationToken);

    return user;
}

[AllowAnonymous]
[HttpGet("verify-email")]
public async Task<IActionResult> VerifyEmail([FromQuery] string token, CancellationToken cancellationToken)
{
    var user = await _userService.VerifyEmailAsync(token, cancellationToken);

    if (user == null)
        return BadRequest("Invalid verification token");

    return Ok(new { Message = "Email verified successfully" });
}
```

---

### 28. Two-Factor Authentication (2FA)
**Pattern**: two-factor-authentication
**Usage**: Add 2FA with TOTP

```csharp
// Install: dotnet add package Otp.NET

using OtpNet;

public class TwoFactorService : ITwoFactorService
{
    public string GenerateSecret()
    {
        var secret = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(secret);
    }

    public string GenerateQrCodeUri(string email, string secret)
    {
        return $"otpauth://totp/MyApp:{email}?secret={secret}&issuer=MyApp";
    }

    public bool ValidateCode(string secret, string code)
    {
        var totp = new Totp(Base32Encoding.ToBytes(secret));
        return totp.VerifyTotp(code, out _, new VerificationWindow(2, 2));
    }
}
```

---

### 29. Password Reset Flow
**Pattern**: password-reset-flow
**Usage**: Implement secure password reset

```csharp
[AllowAnonymous]
[HttpPost("forgot-password")]
public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken cancellationToken)
{
    var user = await _userService.GeneratePasswordResetTokenAsync(dto.Email, cancellationToken);

    if (user != null)
    {
        await _emailService.SendPasswordResetEmailAsync(user.Email.Value, user.PasswordResetToken, cancellationToken);
    }

    // Always return success to prevent email enumeration
    return Ok(new { Message = "If email exists, reset link has been sent" });
}

[AllowAnonymous]
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto, CancellationToken cancellationToken)
{
    var success = await _userService.ResetPasswordAsync(dto.Token, dto.NewPassword, cancellationToken);

    if (!success)
        return BadRequest("Invalid or expired reset token");

    return Ok(new { Message = "Password reset successfully" });
}
```

---

### 30. Session Management (Refresh Token Storage)
**Pattern**: session-management-refresh-token
**Usage**: Store and validate refresh tokens

```csharp
// Domain/Entities/RefreshToken.cs
public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRevoked { get; set; }
}

// Service
public async Task SaveRefreshTokenAsync(Guid userId, string token, CancellationToken cancellationToken)
{
    var refreshToken = new RefreshToken
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Token = token,
        ExpiresAt = DateTime.UtcNow.AddDays(30),
        CreatedAt = DateTime.UtcNow,
        IsRevoked = false
    };

    await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
    await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
}
```

---

### 31. Logout (Revoke Refresh Token)
**Pattern**: logout-revoke-token
**Usage**: Invalidate refresh token on logout

```csharp
[Authorize]
[HttpPost("logout")]
public async Task<IActionResult> Logout([FromBody] LogoutDto dto, CancellationToken cancellationToken)
{
    await _userService.RevokeRefreshTokenAsync(dto.RefreshToken, cancellationToken);

    return Ok(new { Message = "Logged out successfully" });
}

public async Task RevokeRefreshTokenAsync(string token, CancellationToken cancellationToken)
{
    var refreshToken = await _refreshTokenRepository.FindByTokenAsync(token, cancellationToken);

    if (refreshToken != null)
    {
        refreshToken.IsRevoked = true;
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
    }
}
```

---

### 32. Resource-Based Authorization
**Pattern**: resource-based-authorization
**Usage**: Authorize based on resource ownership

```csharp
[Authorize]
[HttpPut("{id}")]
public async Task<ActionResult<UserDto>> UpdateUser(Guid id, [FromBody] UpdateUserDto dto, CancellationToken cancellationToken)
{
    var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // Users can only update their own profile (unless Admin)
    if (id != currentUserId && !User.IsInRole("Admin"))
        return Forbid();

    var user = await _userService.UpdateAsync(id, dto, cancellationToken);
    return Ok(user);
}
```

---

### 33. Audit Logging
**Pattern**: audit-logging
**Usage**: Log security-related actions

```csharp
public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; }
    public string Resource { get; set; }
    public DateTime Timestamp { get; set; }
    public string IpAddress { get; set; }
}

public class AuditService : IAuditService
{
    public async Task LogAsync(string action, string resource, Guid? userId, string ipAddress, CancellationToken cancellationToken)
    {
        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Resource = resource,
            Timestamp = DateTime.UtcNow,
            IpAddress = ipAddress
        };

        await _auditRepository.AddAsync(log, cancellationToken);
        await _auditRepository.SaveChangesAsync(cancellationToken);
    }
}
```

---

### 34. Content Security Policy (CSP)
**Pattern**: content-security-policy
**Usage**: Configure CSP headers

```csharp
// Program.cs
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://localhost:5001; " +
        "frame-ancestors 'none';");

    await next();
});
```

---

### 35. Secure Cookie Configuration
**Pattern**: secure-cookie-configuration
**Usage**: Configure secure cookies

```csharp
// Program.cs
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;  // ✅ Prevent XSS
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;  // ✅ HTTPS only
    options.Cookie.SameSite = SameSiteMode.Strict;  // ✅ CSRF protection
    options.ExpireTimeSpan = TimeSpan.FromHours(1);
    options.SlidingExpiration = true;
});
```

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Session-Based Authentication
```csharp
// DON'T DO THIS!
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginDto dto)
    {
        // ❌ Session-based auth
        HttpContext.Session.SetString("UserId", user.Id.ToString());
        return Ok();
    }
}
```

**✅ Use JWT tokens instead**

---

### ❌ NO Wildcard CORS in Production
```csharp
// DON'T DO THIS!
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()  // ❌ Security risk
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

**✅ Specify exact origins**

---

### ❌ NO Hardcoded Secrets
```csharp
// DON'T DO THIS!
var jwtKey = "my-super-secret-key-12345";  // ❌ Hardcoded secret
```

**✅ Use configuration or environment variables**

---

## 🎓 BEST PRACTICES

1. **JWT Tokens**: 24-hour expiration, secure 256-bit key
2. **Password Hashing**: BCrypt with work factor 12
3. **HTTPS Only**: Enforce in production
4. **CORS**: Specific origins, AllowCredentials for SignalR
5. **Role-Based + Policy-Based**: Combine for flexibility
6. **Input Validation**: Data annotations on DTOs
7. **Secrets Management**: Environment variables or Azure Key Vault
8. **Logging**: Log all authentication/authorization events
9. **Rate Limiting**: Prevent brute force attacks
10. **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP

---

## 📊 SUMMARY

**Patterns Documented**: 35 total
**Architecture**: C# Simplified Clean Architecture + JWT Security
**Focus**: JWT Authentication, Authorization, CORS, Security Best Practices
**Key Features**: Role-based auth, Policy-based auth, Refresh tokens, 2FA
**Best Practices**: BCrypt, HTTPS, Secure headers, Audit logging

---

**Created**: 2025-12-30
**Stack**: csharp-react-mssql
**Variant**: simplified-clean
**Category**: Security & Authentication
