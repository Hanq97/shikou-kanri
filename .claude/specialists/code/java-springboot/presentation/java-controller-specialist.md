# Java Controller Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Standard (JPA)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive patterns, see: `presentation/java-webflux-specialist.md`, `data-access/java-r2dbc-specialist.md`, `application/java-handler-specialist.md`, `presentation/java-router-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | `{rootPackage}.rest.{moduleCode}` |
| **Maven Module** | core-manager / sfa-manager |
| **Variant** | Standard (JPA) |
| **Pattern Numbers** | 1.1–1.N |
| **Source Paths** | N/A — Standard variant not in use. StarX4CRM uses annotated reactive controllers (Pattern 42.x) |
| **File Count** | N/A |
| **Naming Convention** | `{DomainPrefix}{Entity}Resource.java` |
| **Base Class** | N/A |
| **Imports From** | Application (Services, DTOs), Infrastructure (VMs, VM Mappers) |
| **Cannot Import** | Domain directly |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Generates REST controllers with proper request/response handling, validation, pagination, and OpenAPI documentation.

## Patterns

### Pattern 1: CRUD Controller
```java
@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "Loan management endpoints")
public class LoanController {
    private final LoanService loanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new loan request")
    public LoanResponse create(@Valid @RequestBody CreateLoanRequest request) {
        return loanService.createLoan(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get loan by ID")
    public LoanResponse getById(@PathVariable UUID id) {
        return loanService.getLoanById(id);
    }

    @GetMapping
    @Operation(summary = "Search loans with filters")
    public Page<LoanResponse> search(
            @Valid LoanSearchCriteria criteria,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return loanService.searchLoans(criteria, pageable);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a pending loan")
    public LoanResponse approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return loanService.approveLoan(id, principal.getId());
    }
}
```

### Pattern 2: File Upload Endpoint
```java
@PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
@Operation(summary = "Upload loan document")
public DocumentResponse uploadDocument(
        @PathVariable UUID id,
        @RequestPart("file") MultipartFile file,
        @RequestPart("metadata") @Valid DocumentMetadata metadata) {
    if (file.getSize() > 10_000_000) {
        throw new FileTooLargeException("Max file size is 10MB");
    }
    return loanService.uploadDocument(id, file, metadata);
}
```

### Pattern 3: Async Response with SSE
```java
@GetMapping(value = "/{id}/status-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
@Operation(summary = "Stream loan status updates")
public SseEmitter streamStatus(@PathVariable UUID id) {
    var emitter = new SseEmitter(30_000L);
    loanService.registerStatusListener(id, emitter);
    emitter.onCompletion(() -> loanService.removeStatusListener(id));
    emitter.onTimeout(emitter::complete);
    return emitter;
}
```

### Pattern 4: Batch Operations
```java
@PostMapping("/batch")
@PreAuthorize("hasRole('ADMIN')")
@Operation(summary = "Process batch of loan actions")
public BatchResponse processBatch(@Valid @RequestBody BatchRequest request) {
    if (request.ids().size() > 100) {
        throw new BadRequestException("Batch size cannot exceed 100");
    }
    return loanService.processBatch(request);
}
```

### Pattern 5: Error Response Structure
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException ex) {
        return new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            LocalDateTime.now()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ValidationErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
        return new ValidationErrorResponse(HttpStatus.BAD_REQUEST.value(), errors);
    }

    @ExceptionHandler(BusinessRuleException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ErrorResponse handleBusinessRule(BusinessRuleException ex) {
        return new ErrorResponse(422, ex.getMessage(), LocalDateTime.now());
    }
}
```

## Guidelines
- Use `@Valid` for request body validation
- Return proper HTTP status codes (`201` for creation, `204` for delete)
- Use `@PageableDefault` for pagination defaults
- Apply `@PreAuthorize` for method-level security
- Use `@AuthenticationPrincipal` to access current user
- Document with OpenAPI `@Operation` and `@Tag`
- Keep controllers thin - delegate to service layer

## REJECTED Patterns

- DO NOT name controller classes `*Controller.java` — StarX4CRM uses `*Resource.java`
- DO NOT return entity objects directly — return DTOs or VMs
- DO NOT use `@Autowired` — use constructor injection
- DO NOT use blocking calls in controller methods — return `Mono`/`Flux`

---

## Related Specialists

- `patterns/annotated-reactive-controller-specialist.md` — reactive controller patterns (42.x)
- `patterns/viewmodel-specialist.md` — DTO↔VM mapping at controller boundary (47.x)
- `domain/java-exception-specialist.md` — error handling (7.x)
