# Java Router Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

> ℹ️ **Architecture Note**: StarX4CRM uses **annotated @RequestMapping** routing,
> NOT functional RouterFunction definitions.
> This specialist documents the functional routing alternative for future adoption.
> See: `patterns/annotated-reactive-controller-specialist.md` (Pattern 42.x) for the current pattern.
> See: `architecture/backend-clean-architecture-specialist.md` (Pattern 0.x) for architecture overview.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A — functional router pattern not used in StarX4CRM |
| **Maven Module** | N/A |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 16.1–16.N |
| **Source Paths** | N/A — alternative pattern not in use |
| **File Count** | N/A |
| **Naming Convention** | `{Entity}Router.java` |
| **Base Class** | `RouterFunction` |
| **Imports From** | Application (Services) |
| **Cannot Import** | Domain directly |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## Purpose
Generates functional router configurations with request predicates, filters, and nested routes.

## Patterns

### Pattern 1: Module Router with Nested Paths
```java
@Configuration
public class LoanRouter {
    @Bean
    public RouterFunction<ServerResponse> loanRoutes(LoanHandler handler) {
        return RouterFunctions.route()
            .path("/api/v1/loans", builder -> builder
                .nest(RequestPredicates.accept(MediaType.APPLICATION_JSON), nested -> nested
                    .GET("", handler::listLoans)
                    .GET("/{id}", handler::getLoanById)
                    .POST("", handler::createLoan)
                    .PUT("/{id}", handler::updateLoan)
                    .DELETE("/{id}", handler::deleteLoan)
                    .PATCH("/{id}/approve", handler::approveLoan)
                    .PATCH("/{id}/status", handler::updateStatus))
                .GET("/{id}/payments", handler::getLoanPayments)
                .GET("/stream", accept(MediaType.TEXT_EVENT_STREAM), handler::streamLoanEvents)
                .POST("/{id}/documents", contentType(MediaType.MULTIPART_FORM_DATA),
                    handler::uploadDocument))
            .build();
    }
}
```

### Pattern 2: Multiple Module Routers Composed
```java
@Configuration
public class ApiRouter {
    @Bean
    public RouterFunction<ServerResponse> apiRoutes(
            LoanHandler loanHandler,
            PaymentHandler paymentHandler,
            UserHandler userHandler) {
        return RouterFunctions.route()
            .path("/api/v1", api -> api
                .add(loanRoutes(loanHandler))
                .add(paymentRoutes(paymentHandler))
                .add(userRoutes(userHandler)))
            .build();
    }

    private RouterFunction<ServerResponse> loanRoutes(LoanHandler h) {
        return RouterFunctions.route()
            .path("/loans", b -> b
                .GET("", h::listLoans)
                .GET("/{id}", h::getLoanById)
                .POST("", h::createLoan))
            .build();
    }

    private RouterFunction<ServerResponse> paymentRoutes(PaymentHandler h) {
        return RouterFunctions.route()
            .path("/payments", b -> b
                .GET("", h::listPayments)
                .POST("", h::createPayment)
                .GET("/{id}", h::getPaymentById))
            .build();
    }

    private RouterFunction<ServerResponse> userRoutes(UserHandler h) {
        return RouterFunctions.route()
            .path("/users", b -> b
                .GET("/me", h::getCurrentUser)
                .PUT("/me", h::updateProfile))
            .build();
    }
}
```

### Pattern 3: Route-Level Filters
```java
@Configuration
public class SecuredLoanRouter {
    @Bean
    public RouterFunction<ServerResponse> securedRoutes(
            LoanHandler handler, AuthenticationFilter authFilter) {
        return RouterFunctions.route()
            .path("/api/v1/loans", builder -> builder
                .GET("", handler::listLoans)
                .GET("/{id}", handler::getLoanById)
                .filter(authFilter::authenticate)
                .POST("", handler::createLoan)
                .PATCH("/{id}/approve", handler::approveLoan)
                .filter(authFilter::requireAdmin))
            .build();
    }
}

@Component
public class AuthenticationFilter {
    public Mono<ServerResponse> authenticate(ServerRequest request,
            HandlerFunction<ServerResponse> next) {
        var token = request.headers().firstHeader("Authorization");
        if (token == null || !token.startsWith("Bearer ")) {
            return ServerResponse.status(HttpStatus.UNAUTHORIZED)
                .bodyValue(new ErrorResponse("UNAUTHORIZED", "Missing token"));
        }
        return next.handle(request);
    }

    public Mono<ServerResponse> requireAdmin(ServerRequest request,
            HandlerFunction<ServerResponse> next) {
        var role = request.headers().firstHeader("X-User-Role");
        if (!"ADMIN".equals(role)) {
            return ServerResponse.status(HttpStatus.FORBIDDEN)
                .bodyValue(new ErrorResponse("FORBIDDEN", "Admin access required"));
        }
        return next.handle(request);
    }
}
```

### Pattern 4: Request Predicates
```java
@Configuration
public class ConditionalRouter {
    @Bean
    public RouterFunction<ServerResponse> conditionalRoutes(LoanHandler handler) {
        var jsonPredicate = accept(MediaType.APPLICATION_JSON);
        var xmlPredicate = accept(MediaType.APPLICATION_XML);
        var adminHeader = RequestPredicates.headers(
            h -> "ADMIN".equals(h.firstHeader("X-User-Role")));

        return RouterFunctions.route()
            .path("/api/v1/loans", builder -> builder
                .GET("", jsonPredicate, handler::listLoansJson)
                .GET("", xmlPredicate, handler::listLoansXml)
                .DELETE("/{id}", adminHeader, handler::deleteLoan)
                .GET("/export",
                    RequestPredicates.queryParam("format", "csv"::equals),
                    handler::exportCsv))
            .build();
    }
}
```

### Pattern 5: Health and Actuator Routes
```java
@Configuration
public class HealthRouter {
    @Bean
    @Order(-1)
    public RouterFunction<ServerResponse> healthRoutes(
            DatabaseClient databaseClient, ReactiveRedisTemplate<String, String> redis) {
        return RouterFunctions.route()
            .GET("/health", request -> ServerResponse.ok()
                .bodyValue(Map.of("status", "UP", "timestamp", LocalDateTime.now())))
            .GET("/health/db", request ->
                databaseClient.sql("SELECT 1").fetch().one()
                    .flatMap(r -> ServerResponse.ok().bodyValue(Map.of("db", "UP")))
                    .onErrorResume(e -> ServerResponse.status(503)
                        .bodyValue(Map.of("db", "DOWN", "error", e.getMessage()))))
            .GET("/health/redis", request ->
                redis.getConnectionFactory().getReactiveConnection().ping()
                    .flatMap(pong -> ServerResponse.ok().bodyValue(Map.of("redis", "UP")))
                    .onErrorResume(e -> ServerResponse.status(503)
                        .bodyValue(Map.of("redis", "DOWN"))))
            .build();
    }
}
```

## Guidelines
- One router config per bounded context/module
- Compose routers via `add()` in a top-level `ApiRouter`
- Use `nest()` for shared predicates (content type, auth)
- Apply `filter()` for route-level security/logging
- Use `RequestPredicates` for content negotiation and conditional routing
- Order routes from most specific to least specific
- Health routes should be separate with `@Order(-1)` for priority
- Keep route definitions declarative - logic belongs in handlers

## REJECTED Patterns

- DO NOT define routes in handler classes — keep routing separate from logic
- DO NOT use wildcard routes without specific routes first — order matters
- DO NOT skip content-type predicates for POST/PUT routes
- DO NOT mix functional and annotated routing in the same module

---

## Related Specialists

- `application/java-handler-specialist.md` — handler functions referenced by routes (15.x)
- `patterns/annotated-reactive-controller-specialist.md` — annotated alternative (42.x)
- `architecture/backend-clean-architecture-specialist.md` — architecture rules (0.x)
