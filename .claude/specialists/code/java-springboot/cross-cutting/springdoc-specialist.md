# SpringDoc OpenAPI Specialist

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` + `gateway` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 80.1–80.2 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~2 OpenAPI config files |
| **Naming Convention** | `SpringdocConfiguration.java`, `OpenApiConfig.java` |
| **Base Class** | N/A |
| **Imports From** | N/A (config) |
| **Cannot Import** | N/A (config) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: SpringDoc OpenAPI 2.x — Profile-Gated API Documentation
**Domain**: Cross-Cutting / API Documentation
**Pattern Range**: 80.1–80.2

---

## Description

StarX4CRM exposes interactive API documentation via SpringDoc OpenAPI 2.8.6.
Documentation is only active under the `api-docs` profile (included in the `dev`
profile group). In `prod`, SpringDoc is fully disabled to avoid leaking internal
API structure and to reduce startup time.

---

## Key Concepts

- **Path**: `/v3/api-docs` (JSON), `/v3/api-docs.yaml` (YAML)
- **Swagger UI**: `/swagger-ui.html` — rendered from api-docs path
- **Actuator integration**: management endpoints visible in the spec
- **operationsSorter / tagsSorter**: `alpha` ordering for consistent navigation
- **Profile gate**: `springdoc.api-docs.enabled=false` in prod
- **Groups**: optional logical grouping by module (e.g., `core`, `sfa`)

---

## Pattern 80.1 — SpringDoc Configuration (api-docs profile)

```yaml
# application-api-docs.yml
springdoc:
  api-docs:
    path: /v3/api-docs
    enabled: true
  swagger-ui:
    enabled: true
    path: /swagger-ui.html
    operations-sorter: alpha
    tags-sorter: alpha
    display-request-duration: true
    try-it-out-enabled: true
  show-actuator: true
  packages-to-scan:
    - {rootPackage}
  paths-to-match:
    - /api/**
    - /management/**
```

Dependency (added via `api-docs` Maven profile):

```xml
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
  <version>2.8.6</version>
</dependency>
```

---

## Pattern 80.2 — OpenAPI Bean Customisation

```java
package {rootPackage}.coremanager.config;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.security.*;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("api-docs")
public class OpenApiConfiguration {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("StarX4CRM — Core Manager API")
                .description("Enterprise CRM Core Business API")
                .version("1.0.0")
                .contact(new Contact()
                    .name("StarX4CRM Team")
                    .email("dev@{app-prefix}.com"))
                .license(new License().name("Proprietary")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT token from Keycloak")));
    }

    // Logical group for customer module
    @Bean
    public GroupedOpenApi customerApi() {
        return GroupedOpenApi.builder()
            .group("customer")
            .pathsToMatch("/api/customers/**")
            .build();
    }

    // Logical group for SFA module
    @Bean
    public GroupedOpenApi sfaApi() {
        return GroupedOpenApi.builder()
            .group("sfa")
            .pathsToMatch("/api/sfa/**")
            .build();
    }
}
```

### Controller Annotation Example

```java
@RestController
@RequestMapping("/api/customers")
@Tag(name = "customer", description = "Customer management operations")
@RequiredArgsConstructor
public class CustomerRouter {

    private final CustomerHandler handler;

    @Operation(
        summary = "List customers",
        description = "Returns paginated customer list filtered by query parameters",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponse(responseCode = "200", description = "Success")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @GetMapping
    public Mono<ResponseEntity<Page<CustomerDTO>>> list(CustomerSearchCriteria criteria,
                                                        Pageable pageable) {
        return handler.list(criteria, pageable);
    }
}
```

---

## Prod Disable Configuration

```yaml
# application-prod.yml — explicit disable (defence in depth)
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

---

## Pattern 80.3 — Generic Controller Annotation Patterns (Variant: ALL)

### @Operation / @ApiResponse / @Schema — Universal Annotation Guide

```java
// ✅ Complete endpoint documentation pattern
@Operation(
    summary = "Create a new order",
    description = "Creates an order and returns the created resource with Location header",
    tags = {"orders"}
)
@ApiResponses({
    @ApiResponse(responseCode = "201", description = "Order created",
        content = @Content(schema = @Schema(implementation = OrderDTO.class)),
        headers = @Header(name = "Location", description = "URI of created order")),
    @ApiResponse(responseCode = "400", description = "Validation error",
        content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
    @ApiResponse(responseCode = "409", description = "Duplicate order",
        content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
})
@PostMapping
public ResponseEntity<OrderDTO> create(@Valid @RequestBody CreateOrderRequest request) { ... }
```

### @Schema on DTOs — Field-Level Documentation
```java
@Schema(description = "Order creation request")
public record CreateOrderRequest(
    @Schema(description = "Customer ID", example = "12345", requiredMode = REQUIRED)
    @NotNull Long customerId,

    @Schema(description = "Order items (1–100)", minLength = 1, maxLength = 100)
    @Size(min = 1, max = 100) List<OrderItemRequest> items,

    @Schema(description = "Delivery date", example = "2025-03-20", format = "date")
    @Future LocalDate deliveryDate,

    @Schema(description = "Priority level", defaultValue = "NORMAL", allowableValues = {"LOW", "NORMAL", "HIGH"})
    Priority priority
) {}
```

### @SecurityRequirement — Per-Endpoint Security
```java
// Public endpoint — no auth required
@Operation(summary = "Health check", security = {})
@GetMapping("/health")
public String health() { return "OK"; }

// Endpoint requiring specific scope
@Operation(summary = "Delete order",
    security = @SecurityRequirement(name = "bearerAuth", scopes = {"admin"}))
@DeleteMapping("/{id}")
public void delete(@PathVariable Long id) { ... }
```

### @Parameter — Query/Path Parameter Documentation
```java
@GetMapping
public Page<OrderDTO> search(
    @Parameter(description = "Filter by status", schema = @Schema(allowableValues = {"PENDING", "CONFIRMED", "SHIPPED"}))
    @RequestParam(required = false) String status,

    @Parameter(description = "Page number (0-based)", example = "0")
    @RequestParam(defaultValue = "0") int page,

    @Parameter(description = "Page size", example = "20", schema = @Schema(maximum = "100"))
    @RequestParam(defaultValue = "20") int size
) { ... }
```

### Hidden Endpoints & Deprecation
```java
// Hide from Swagger UI
@Operation(hidden = true)
@GetMapping("/internal/metrics")
public MetricsDTO internalMetrics() { ... }

// Mark as deprecated with migration guidance
@Operation(summary = "Get order by code", deprecated = true,
    description = "Use GET /orders/{id} instead. Will be removed in v3.0")
@GetMapping("/by-code/{code}")
public OrderDTO getByCode(@PathVariable String code) { ... }
```

---

## Anti-Patterns

- DO NOT enable `api-docs` in production — internal route structure becomes public
- DO NOT omit `@Profile("api-docs")` on `OpenApiConfiguration` — bean loaded in prod if profile not guarded
- DO NOT use `springdoc.show-actuator=true` in prod — exposes sensitive operational endpoints
- DO NOT skip `bearerAuth` security scheme — Swagger UI try-it-out won't send auth headers
- DO NOT use `packages-to-scan: "."` (root) — scans all classes and massively slows startup

---

## Related Specialists

- `infrastructure/spring-profiles-specialist.md` — `api-docs` profile and `dev` group composition
- `infrastructure/maven-multimodule-specialist.md` — `api-docs` Maven profile pulls in the dependency
- `infrastructure/keycloak-specialist.md` — JWT bearer format for Swagger UI try-it-out auth
