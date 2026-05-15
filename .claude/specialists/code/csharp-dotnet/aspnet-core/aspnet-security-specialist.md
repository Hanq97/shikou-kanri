# ASP.NET Core Security Specialist — Generic
# ASP.NETコアセキュリティスペシャリスト — 汎用
# Chuyen Gia Bao Mat ASP.NET Core — Dung Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET 8-10, JWT, OAuth2/OIDC
**Aspect**: Security — Authentication, Authorization, OWASP, Secrets, CORS
**Purpose**: Consultation agent for /plan and /execute — security patterns applicable to any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure + Cross-cutting |
| **Namespace** | N/A (generic) |
| **Project Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 66.1–66.7 |
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

**Your ONLY responsibility**: Enforce security standards — JWT authentication, policy-based authorization, OWASP Top 10 compliance, secrets management, CORS configuration, input validation, and data protection for any .NET project regardless of architecture or variant.

---

## Patterns

### Pattern 66.1: JWT Bearer Authentication
> Source: E1 authentication

Use JWT for APIs. Validate issuer, audience, lifetime, and signing key. Never disable validation parameters.

```csharp
// DO — Secure JWT configuration [E1]
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Convert.FromBase64String(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.FromMinutes(1)  // Default 5 min is too generous
        };
    });

builder.Services.AddAuthorization();
```

```csharp
// DON'T — Disabled validation [E1]
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = false,      // Anyone can issue tokens
    ValidateAudience = false,    // Token works for any app
    ValidateLifetime = false,    // Expired tokens accepted
};

// DON'T — Short signing key [E1-rules]
IssuerSigningKey = new SymmetricSecurityKey("short-key"u8.ToArray());  // < 256 bits
```

### Pattern 66.2: Policy-Based Authorization
> Source: E1 authentication

Policies over role strings. Policies are testable, composable, and more expressive.

```csharp
// DO — Define policies [E1]
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"))
    .AddPolicy("CanManageOrders", policy => policy
        .RequireAuthenticatedUser()
        .RequireClaim("permission", "orders:write"))
    .AddPolicy("MinimumAge", policy => policy
        .AddRequirements(new MinimumAgeRequirement(18)));

// DO — Custom requirement + handler [E1]
public class MinimumAgeRequirement(int minimumAge) : IAuthorizationRequirement
{
    public int MinimumAge => minimumAge;
}

public class MinimumAgeHandler(TimeProvider clock)
    : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, MinimumAgeRequirement requirement)
    {
        var dob = context.User.FindFirst("date_of_birth");
        if (dob is not null && DateOnly.TryParse(dob.Value, out var date)
            && date.AddYears(requirement.MinimumAge) <= DateOnly.FromDateTime(clock.GetUtcNow().DateTime))
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}

// DO — Protect endpoints [E1]
app.MapGroup("/api/admin")
    .RequireAuthorization("AdminOnly");

group.MapPost("/", CreateOrder)
    .RequireAuthorization("CanManageOrders");
```

```csharp
// DON'T — Magic role strings everywhere [E1]
[Authorize(Roles = "Admin,SuperAdmin,Manager")]  // Hard to refactor, not testable

// DON'T — Unmarked endpoints [E1-rules]
app.MapGet("/orders", GetOrders);  // No auth — inherits whatever global default is
```

### Pattern 66.3: Secrets Management
> Source: E1 security-scan, E1-rules security

Never hardcode secrets. Use user-secrets (dev), Key Vault / env vars (prod).

```csharp
// DO — Configuration-based secrets [E1-rules]
var connectionString = builder.Configuration.GetConnectionString("OrdersDb");
builder.Configuration.AddAzureKeyVault(vaultUri, credential);
```

```bash
# DO — User secrets for development [E1-rules]
dotnet user-secrets set "Jwt:Key" "your-256-bit-secret-base64"
dotnet user-secrets set "ConnectionStrings:OrdersDb" "Server=localhost;..."
```

```csharp
// DON'T — Hardcoded secrets [E1-rules]
var conn = "Server=prod;Password=hunter2";  // Ends up in git history!

// DON'T — Secrets in appsettings.json (committed to repo) [E1-rules]
{ "Jwt": { "Key": "super-secret-key" } }
```

### Pattern 66.4: OWASP Top 10 — Input Validation & Injection Prevention
> Source: E1 security-scan, E1-rules security

Validate at system boundaries. Use parameterized queries — never string concatenation for SQL.

```csharp
// DO — Parameterized queries [E1-rules]
db.Database.SqlQuery<Order>($"SELECT * FROM Orders WHERE Id = {id}");
// EF Core interpolation is parameterized — safe

// DO — LINQ preferred [E1-rules]
var orders = await db.Orders.Where(o => o.CustomerId == customerId).ToListAsync();
```

```csharp
// DON'T — String concatenation SQL [E1-rules]
db.Database.ExecuteSqlRaw("SELECT * FROM Orders WHERE Id = '" + id + "'");

// DON'T — Insecure deserialization [E1]
JsonConvert.DeserializeObject<T>(json, new JsonSerializerSettings
    { TypeNameHandling = TypeNameHandling.All });  // Use System.Text.Json instead

// DON'T — MD5/SHA1 for security [E1]
MD5.Create().ComputeHash(data);  // Use SHA256 minimum
```

### Pattern 66.5: CORS — Explicit Origins Only
> Source: E1 security-scan, E1-rules security

Never wildcard in production. Explicit origins, methods, headers.

```csharp
// DO — Explicit origins [E1-rules]
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!)
              .AllowCredentials()
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization");
    });
});
```

```csharp
// DON'T — Wildcard in production [E1-rules]
policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();

// DON'T — Wildcard with credentials [E1]
policy.AllowAnyOrigin().AllowCredentials();  // Browsers block this, signals misunderstanding
```

### Pattern 66.6: Data Protection & PII in Logs
> Source: E1 security-scan, E1-rules security

Log identifiers, not identity data. Use Data Protection API for encryption at rest. HTTPS everywhere.

```csharp
// DO — Log identifiers only [E1]
logger.LogInformation("Order {OrderId} placed by customer {CustomerId}",
    order.Id, order.CustomerId);

// DO — HTTPS + HSTS [E1-rules]
app.UseHsts();
app.UseHttpsRedirection();
```

```csharp
// DON'T — PII in logs [E1]
logger.LogInformation("Order placed by {Email} for {CreditCard}",
    order.CustomerEmail, order.PaymentCard);

// DON'T — Return full entity with sensitive fields [E1]
return TypedResults.Ok(user);  // Includes PasswordHash! Use DTO instead
```

### Pattern 66.7: 6-Layer Security Scan Checklist
> Source: E1 security-scan

| Layer | What | Tool/Method |
|-------|------|-------------|
| 1. Packages | Known CVEs | `dotnet list package --vulnerable --include-transitive` |
| 2. Secrets | Hardcoded secrets in source | Pattern scan (.cs, .json, .yml, .config) |
| 3. OWASP | Injection, XSS, deserialization | Code pattern analysis |
| 4. Auth | Missing [Authorize], weak JWT config | Configuration review |
| 5. CORS | Wildcard origins, overly broad | Policy review |
| 6. Data | PII in logs, unencrypted sensitive data | Log and response review |

| Scenario | Layers | Notes |
|----------|--------|-------|
| Pre-release | All 6 | Non-negotiable before production |
| New endpoint | 3, 4, 5 | OWASP, auth, CORS |
| Auth changes | 4 | Deep auth review |
| Config changes | 2 | Secrets detection |
| Logging changes | 6 | PII check |

---

*ASP.NET Core Security Specialist v1.0 — Generic*
*Sources: E1 authentication, E1 security-scan, E1-rules security*
*Pattern range: 66.1–66.7*
