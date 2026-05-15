# API Design Governance Specialist — Generic
# API設計ガバナンススペシャリスト — 汎用
# Chuyên Gia Quản Trị Thiết Kế API — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 67.1–67.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | Application |
| **Cannot Import** | Domain, Infrastructure |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | errorPropagation |

---

## Purpose
REST API design governance: URL conventions, HTTP semantics, error format, versioning, backward compatibility, and pagination contracts.

## Patterns

### Pattern 67.1: REST URL Conventions
```
✅ GET    /api/v1/users           — list users
✅ GET    /api/v1/users/{id}      — get user
✅ POST   /api/v1/users           — create user
✅ PUT    /api/v1/users/{id}      — replace user
✅ PATCH  /api/v1/users/{id}      — partial update
✅ DELETE /api/v1/users/{id}      — delete user
✅ GET    /api/v1/users/{id}/orders — user's orders (hierarchical)

❌ GET /api/v1/getUserList        — action-based URL
❌ POST /api/v1/deleteUser/{id}   — wrong HTTP method
```
- Plural nouns for resources
- kebab-case for multi-word: `/api/v1/order-items`
- Max 3 nesting levels: `/users/{id}/orders/{orderId}/items`

### Pattern 67.2: HTTP Status Codes
| Code | When | Response Body |
|------|------|---------------|
| `200 OK` | GET/PUT/PATCH success | Resource or updated resource |
| `201 Created` | POST success | Created resource + `Location` header |
| `204 No Content` | DELETE success | Empty body |
| `400 Bad Request` | Validation failure | Problem Details (67.3) |
| `401 Unauthorized` | Missing/invalid auth | Problem Details |
| `403 Forbidden` | Insufficient permissions | Problem Details |
| `404 Not Found` | Resource doesn't exist | Problem Details |
| `409 Conflict` | Duplicate or version conflict | Problem Details |
| `422 Unprocessable` | Semantically invalid | Problem Details |
| `429 Too Many Requests` | Rate limit exceeded | `Retry-After` header |

- NEVER return `200` with error body — breaks client error handling

### Pattern 67.3: Error Response — RFC 7807 Problem Details
```java
// Enable in application.yml
spring.mvc.problem-details.enabled: true

// Global handler
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ProblemDetail handleNotFound(EntityNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        pd.setTitle("Resource Not Found");
        pd.setDetail(ex.getMessage());
        pd.setProperty("entityType", ex.getEntityType());
        return pd;
    }
}
```
- Consistent error format across ALL endpoints
- NEVER expose stack traces, internal paths, or SQL in error responses

### Pattern 67.4: API Versioning
- **URI path** (recommended): `/api/v1/users`, `/api/v2/users`
- Header: `Accept: application/vnd.myapp.v2+json`
- Query param: `/users?version=2` (least recommended)

Version when: changing field types, removing fields, changing response structure.

### Pattern 67.5: Backward Compatibility Rules
| Change Type | Breaking? | Action |
|------------|-----------|--------|
| Add optional field to response | ✅ Safe | Add freely |
| Add optional query parameter | ✅ Safe | Add freely |
| Add new endpoint | ✅ Safe | Add freely |
| Remove field from response | ❌ Breaking | New version |
| Rename field | ❌ Breaking | New version |
| Change field type | ❌ Breaking | New version |
| Add required field to request | ❌ Breaking | New version |

- `@Deprecated` on endpoint + document migration timeline
- Support old version for minimum 6 months after new version GA

### Pattern 67.6: Pagination Contract
```java
// Controller
@GetMapping("/users")
public Page<UserDTO> listUsers(@ParameterObject Pageable pageable) {
    return userService.findAll(pageable);
}
```
- **Offset-based**: `?page=0&size=20&sort=name,asc` — simple, Spring default
- **Cursor-based**: `?cursor=abc123&limit=20` — better for large datasets, no page-skip
- Response MUST include: `totalElements`, `totalPages`, `number`, `size`

### Pattern 67.7: gRPC Basics
```protobuf
service UserService {
    rpc GetUser (GetUserRequest) returns (UserResponse);
    rpc ListUsers (ListUsersRequest) returns (stream UserResponse);
}
```
- Use for internal service-to-service communication (higher throughput than REST)
- REST for external/public APIs, gRPC for internal microservices
- Error handling via `Status` codes (NOT_FOUND, PERMISSION_DENIED, etc.)

## REJECTED Patterns
- ❌ Action-based URLs: `/getUserList`, `/createUser`
- ❌ `200 OK` with error body
- ❌ Stack traces in error responses
- ❌ Breaking changes without version bump
- ❌ Unbounded collection endpoints (no pagination)
- ❌ `Map<String, Object>` as response — always typed DTOs

## Related Specialists
- `patterns/annotated-reactive-controller-specialist.md` — Endpoint implementation (42.x)
- `cross-cutting/springdoc-specialist.md` — Swagger/OpenAPI config (80.x)
- `presentation/graphql-spring-specialist.md` — GraphQL alternative (68.x)
