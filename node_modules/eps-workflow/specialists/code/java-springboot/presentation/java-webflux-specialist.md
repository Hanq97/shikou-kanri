# Java WebFlux Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation + Application |
| **Package** | `{rootPackage}.rest.{moduleCode}` (annotated controllers) |
| **Maven Module** | core-manager / sfa-manager |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 12.1–12.N |
| **Source Paths** | `{sourceRoot}/rest/{moduleCode}/` |
| **File Count** | ~105 controllers |
| **Naming Convention** | `{DomainPrefix}{Entity}Resource.java` |
| **Base Class** | N/A (@RestController annotation) |
| **Imports From** | Application (Services, DTOs), Infrastructure (VMs, VM Mappers) |
| **Cannot Import** | Domain directly |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | asyncPattern |

---

## Purpose
Generates reactive REST endpoints using Spring WebFlux with functional and annotated styles.

## Patterns

### Pattern 1: Reactive Controller
```java
@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
public class LoanController {
    private final LoanService loanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<LoanResponse> create(@Valid @RequestBody Mono<CreateLoanRequest> request) {
        return request.flatMap(loanService::createLoan);
    }

    @GetMapping("/{id}")
    public Mono<LoanResponse> getById(@PathVariable UUID id) {
        return loanService.getLoanById(id)
            .switchIfEmpty(Mono.error(new EntityNotFoundException("Loan", id)));
    }

    @GetMapping
    public Flux<LoanResponse> search(
            @RequestParam(required = false) LoanStatus status,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return loanService.searchLoans(status, limit, offset);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<LoanResponse> streamLoans() {
        return loanService.streamNewLoans()
            .delayElements(Duration.ofMillis(100));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return loanService.deleteLoan(id);
    }
}
```

### Pattern 2: Functional Router
```java
@Configuration
public class LoanRouter {
    @Bean
    public RouterFunction<ServerResponse> loanRoutes(LoanHandler handler) {
        return RouterFunctions.route()
            .path("/api/v1/loans", builder -> builder
                .GET("", handler::listLoans)
                .GET("/{id}", handler::getLoanById)
                .POST("", handler::createLoan)
                .PATCH("/{id}/approve", handler::approveLoan)
                .DELETE("/{id}", handler::deleteLoan))
            .filter((request, next) -> {
                var start = System.currentTimeMillis();
                return next.handle(request)
                    .doOnSuccess(r -> log.info("{} {} took {}ms",
                        request.method(), request.path(),
                        System.currentTimeMillis() - start));
            })
            .build();
    }
}
```

### Pattern 3: WebFilter for Cross-Cutting
```java
@Component
@Order(1)
public class RequestLoggingFilter implements WebFilter {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        var request = exchange.getRequest();
        var requestId = UUID.randomUUID().toString().substring(0, 8);

        exchange.getResponse().getHeaders().add("X-Request-Id", requestId);

        return chain.filter(exchange)
            .contextWrite(Context.of("requestId", requestId))
            .doOnSuccess(v -> log.info("[{}] {} {} -> {}",
                requestId, request.getMethod(), request.getPath(),
                exchange.getResponse().getStatusCode()));
    }
}
```

### Pattern 4: Error Handling with WebExceptionHandler
```java
@Component
@Order(-2)
public class GlobalErrorHandler implements ErrorWebExceptionHandler {
    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        var response = exchange.getResponse();
        var errorResponse = switch (ex) {
            case EntityNotFoundException e -> {
                response.setStatusCode(HttpStatus.NOT_FOUND);
                yield new ErrorResponse("NOT_FOUND", e.getMessage());
            }
            case BusinessRuleException e -> {
                response.setStatusCode(HttpStatus.UNPROCESSABLE_ENTITY);
                yield new ErrorResponse("BUSINESS_RULE", e.getMessage());
            }
            default -> {
                response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
                yield new ErrorResponse("INTERNAL_ERROR", "Unexpected error");
            }
        };

        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        var bytes = objectMapper.writeValueAsBytes(errorResponse);
        var buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}
```

### Pattern 5: SSE and WebSocket Endpoint
```java
@RestController
@RequiredArgsConstructor
public class LoanEventController {
    private final Sinks.Many<LoanEvent> loanEventSink;

    @GetMapping(value = "/api/v1/loans/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<LoanEvent>> streamEvents() {
        return loanEventSink.asFlux()
            .map(event -> ServerSentEvent.<LoanEvent>builder()
                .id(event.id().toString())
                .event(event.type())
                .data(event)
                .build());
    }
}

@Configuration
public class WebSocketConfig {
    @Bean
    public HandlerMapping webSocketMapping(LoanWebSocketHandler handler) {
        var map = Map.of("/ws/loans", (WebSocketHandler) handler);
        var mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(map);
        mapping.setOrder(-1);
        return mapping;
    }
}
```

## Guidelines
- Return `Mono<T>` for single items, `Flux<T>` for collections
- Use `switchIfEmpty()` for 404 handling
- Use `TEXT_EVENT_STREAM_VALUE` for SSE endpoints
- Apply `WebFilter` for cross-cutting concerns (logging, auth headers)
- Use `Sinks.Many` for event broadcasting
- Functional routing for microservices, annotated for standard CRUD
- Never block in reactive handlers (no `.block()`, `.subscribe()` in controllers)

## REJECTED Patterns

- DO NOT call `.block()` inside reactive handlers — breaks the event loop
- DO NOT use `ThreadLocal` in WebFlux — use Reactor Context instead
- DO NOT use servlet filters — use `WebFilter` for reactive stack
- DO NOT mix blocking JDBC with WebFlux — use R2DBC exclusively

---

## Related Specialists

- `application/java-handler-specialist.md` — handler function patterns (15.x)
- `presentation/java-router-specialist.md` — functional routing (16.x)
- `patterns/annotated-reactive-controller-specialist.md` — annotated style (42.x)
