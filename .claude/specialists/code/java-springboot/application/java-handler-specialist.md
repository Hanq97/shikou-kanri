# Java Handler Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

> ℹ️ **Architecture Note**: StarX4CRM uses **annotated @RestController** pattern,
> NOT functional handlers (HandlerFunction/ServerRequest/ServerResponse).
> This specialist documents the functional routing alternative for cases where
> teams choose to adopt functional reactive endpoints in future modules.
> See: `patterns/annotated-reactive-controller-specialist.md` (Pattern 42.x) for the current pattern.
> See: `architecture/backend-clean-architecture-specialist.md` (Pattern 0.x) for architecture overview.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | N/A — functional handler pattern not used in StarX4CRM |
| **Maven Module** | N/A |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 15.1–15.N |
| **Source Paths** | N/A — alternative pattern not in use |
| **File Count** | N/A |
| **Naming Convention** | `{Entity}Handler.java` |
| **Base Class** | `HandlerFunction` |
| **Imports From** | Application (Services) |
| **Cannot Import** | Domain directly |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## Purpose
Generates WebFlux handler functions for functional routing with request validation and response building.

## Patterns

### Pattern 1: CRUD Handler
```java
@Component
@RequiredArgsConstructor
public class LoanHandler {
    private final LoanService loanService;
    private final Validator validator;

    public Mono<ServerResponse> createLoan(ServerRequest request) {
        return request.bodyToMono(CreateLoanRequest.class)
            .flatMap(this::validate)
            .flatMap(loanService::createLoan)
            .flatMap(response -> ServerResponse.status(HttpStatus.CREATED)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(response));
    }

    public Mono<ServerResponse> getLoanById(ServerRequest request) {
        var id = UUID.fromString(request.pathVariable("id"));
        return loanService.getLoanById(id)
            .flatMap(response -> ServerResponse.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(response))
            .switchIfEmpty(ServerResponse.notFound().build());
    }

    public Mono<ServerResponse> listLoans(ServerRequest request) {
        var status = request.queryParam("status")
            .map(LoanStatus::valueOf)
            .orElse(null);
        var limit = request.queryParam("limit")
            .map(Integer::parseInt)
            .orElse(20);
        var offset = request.queryParam("offset")
            .map(Integer::parseInt)
            .orElse(0);

        return ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(loanService.searchLoans(status, limit, offset), LoanResponse.class);
    }

    public Mono<ServerResponse> deleteLoan(ServerRequest request) {
        var id = UUID.fromString(request.pathVariable("id"));
        return loanService.deleteLoan(id)
            .then(ServerResponse.noContent().build());
    }
}
```

### Pattern 2: Validation in Handler
```java
private <T> Mono<T> validate(T body) {
    var violations = validator.validate(body);
    if (!violations.isEmpty()) {
        var errors = violations.stream()
            .map(v -> new FieldError(v.getPropertyPath().toString(), v.getMessage()))
            .toList();
        return Mono.error(new ValidationException(errors));
    }
    return Mono.just(body);
}

public Mono<ServerResponse> updateLoan(ServerRequest request) {
    var id = UUID.fromString(request.pathVariable("id"));
    return request.bodyToMono(UpdateLoanRequest.class)
        .flatMap(this::validate)
        .flatMap(req -> loanService.updateLoan(id, req))
        .flatMap(response -> ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(response))
        .onErrorResume(ValidationException.class, e ->
            ServerResponse.badRequest()
                .bodyValue(new ValidationErrorResponse("VALIDATION_ERROR", e.getErrors())));
}
```

### Pattern 3: File Upload Handler
```java
public Mono<ServerResponse> uploadDocument(ServerRequest request) {
    var loanId = UUID.fromString(request.pathVariable("id"));
    return request.multipartData()
        .flatMap(parts -> {
            var filePart = (FilePart) parts.getFirst("file");
            if (filePart == null) {
                return Mono.error(new BadRequestException("File is required"));
            }
            return filePart.content()
                .reduce(DataBuffer::write)
                .flatMap(buffer -> {
                    var bytes = new byte[buffer.readableByteCount()];
                    buffer.read(bytes);
                    DataBufferUtils.release(buffer);
                    return loanService.uploadDocument(loanId, filePart.filename(), bytes);
                });
        })
        .flatMap(doc -> ServerResponse.status(HttpStatus.CREATED)
            .bodyValue(doc));
}
```

### Pattern 4: Streaming Response Handler
```java
public Mono<ServerResponse> streamLoanEvents(ServerRequest request) {
    var loanId = request.queryParam("loanId")
        .map(UUID::fromString)
        .orElse(null);

    Flux<ServerSentEvent<LoanEvent>> events = loanEventService.subscribe()
        .filter(event -> loanId == null || event.loanId().equals(loanId))
        .map(event -> ServerSentEvent.<LoanEvent>builder()
            .id(event.id().toString())
            .event(event.type())
            .data(event)
            .retry(Duration.ofSeconds(5))
            .build());

    return ServerResponse.ok()
        .contentType(MediaType.TEXT_EVENT_STREAM)
        .body(events, new ParameterizedTypeReference<ServerSentEvent<LoanEvent>>() {});
}
```

### Pattern 5: Composed Error Handling
```java
public Mono<ServerResponse> approveLoan(ServerRequest request) {
    var id = UUID.fromString(request.pathVariable("id"));
    var approverId = request.headers().firstHeader("X-User-Id");

    if (approverId == null) {
        return ServerResponse.status(HttpStatus.UNAUTHORIZED)
            .bodyValue(new ErrorResponse("UNAUTHORIZED", "User ID header required"));
    }

    return loanService.approveLoan(id, UUID.fromString(approverId))
        .flatMap(response -> ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(response))
        .onErrorResume(EntityNotFoundException.class, e ->
            ServerResponse.notFound().build())
        .onErrorResume(BusinessRuleException.class, e ->
            ServerResponse.unprocessableEntity()
                .bodyValue(new ErrorResponse("BUSINESS_RULE", e.getMessage())))
        .onErrorResume(AccessDeniedException.class, e ->
            ServerResponse.status(HttpStatus.FORBIDDEN)
                .bodyValue(new ErrorResponse("FORBIDDEN", e.getMessage())));
}
```

## Guidelines
- Each handler method returns `Mono<ServerResponse>`
- Use `bodyToMono()` for request deserialization
- Use `pathVariable()` and `queryParam()` for URL parameters
- Apply validation before service call
- Use `switchIfEmpty(ServerResponse.notFound().build())` for 404
- Chain `onErrorResume()` for typed error handling
- Use `ParameterizedTypeReference` for generic response types
- Keep handlers thin - delegate to service layer

## REJECTED Patterns

- DO NOT add routing logic in handlers — routing belongs in router config
- DO NOT use `@RequestBody` in handlers — use `request.bodyToMono()`
- DO NOT return raw objects — always wrap in `ServerResponse`
- DO NOT mix handler functions with annotated controllers in the same module

---

## Related Specialists

- `presentation/java-router-specialist.md` — router config that references handlers (16.x)
- `patterns/annotated-reactive-controller-specialist.md` — annotated alternative (42.x)
- `presentation/java-webflux-specialist.md` — WebFlux framework foundation (12.x)
