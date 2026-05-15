# Java Exception Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Standard (JPA)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> Note: Exception class hierarchy is variant-agnostic and applies to both.

> 📌 **StarX4CRM Note**: WebFlux uses `ErrorWebExceptionHandler` for global error handling.
> The `@ControllerAdvice` pattern works with annotated reactive controllers but
> the handler chain differs from servlet-based Spring MVC.
> Package: `{rootPackage}.infrastructure.common.exception`
> See: `architecture/backend-clean-architecture-specialist.md` (Pattern 0.x) for architecture overview.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.common.exception` |
| **Maven Module** | common |
| **Variant** | Standard (JPA) |
| **Pattern Numbers** | 7.1–7.N |
| **Source Paths** | `{sourceRoot}/infrastructure/common/exception/` |
| **File Count** | ~15 exception classes |
| **Naming Convention** | `*Exception.java`, `*ExceptionHandler.java` |
| **Base Class** | N/A |
| **Imports From** | Domain (Exceptions), Application (DTOs) |
| **Cannot Import** | REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | errorPropagation |

---

## Purpose
Generates exception hierarchy, global error handling, and error response structures.

## Patterns

### Pattern 1: Exception Hierarchy
```java
public abstract class BaseException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus httpStatus;

    protected BaseException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public String getErrorCode() { return errorCode; }
    public HttpStatus getHttpStatus() { return httpStatus; }
}

public class EntityNotFoundException extends BaseException {
    public EntityNotFoundException(String entity, Object id) {
        super("%s not found with id: %s".formatted(entity, id),
              "NOT_FOUND", HttpStatus.NOT_FOUND);
    }
}

public class BusinessRuleException extends BaseException {
    public BusinessRuleException(String message) {
        super(message, "BUSINESS_RULE_VIOLATION", HttpStatus.UNPROCESSABLE_ENTITY);
    }
}

public class ConflictException extends BaseException {
    public ConflictException(String message) {
        super(message, "CONFLICT", HttpStatus.CONFLICT);
    }
}
```

### Pattern 2: Global Exception Handler
```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ErrorResponse> handleBaseException(BaseException ex) {
        log.warn("Business exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        var response = new ErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            ex.getHttpStatus().value(),
            LocalDateTime.now()
        );
        return ResponseEntity.status(ex.getHttpStatus()).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(
            MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
        var response = new ValidationErrorResponse("VALIDATION_ERROR", errors);
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        var response = new ErrorResponse(
            "ACCESS_DENIED", ex.getMessage(), 403, LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        var response = new ErrorResponse(
            "INTERNAL_ERROR", "An unexpected error occurred", 500, LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
```

### Pattern 3: Error Response Records
```java
public record ErrorResponse(
    String errorCode,
    String message,
    int status,
    LocalDateTime timestamp
) {}

public record ValidationErrorResponse(
    String errorCode,
    List<FieldError> fieldErrors
) {
    public record FieldError(String field, String message) {}
}
```

### Pattern 4: Domain-Specific Exceptions
```java
public class LoanStateTransitionException extends BusinessRuleException {
    public LoanStateTransitionException(LoanStatus from, LoanStatus to) {
        super("Cannot transition loan from %s to %s".formatted(from, to));
    }
}

public class InsufficientCreditException extends BusinessRuleException {
    public InsufficientCreditException(int score, int required) {
        super("Credit score %d below required minimum %d".formatted(score, required));
    }
}

public class DuplicateResourceException extends ConflictException {
    public DuplicateResourceException(String entity, String field, Object value) {
        super("%s with %s '%s' already exists".formatted(entity, field, value));
    }
}
```

### Pattern 5: Exception with Context Data
```java
public class ValidationException extends BaseException {
    private final List<String> violations;

    public ValidationException(List<String> violations) {
        super("Validation failed: " + String.join("; ", violations),
              "VALIDATION_FAILED", HttpStatus.BAD_REQUEST);
        this.violations = List.copyOf(violations);
    }

    public List<String> getViolations() { return violations; }
}

// Handler for ValidationException with extra context
@ExceptionHandler(ValidationException.class)
public ResponseEntity<Map<String, Object>> handleValidationException(ValidationException ex) {
    var body = Map.of(
        "errorCode", ex.getErrorCode(),
        "message", ex.getMessage(),
        "violations", ex.getViolations(),
        "timestamp", LocalDateTime.now()
    );
    return ResponseEntity.badRequest().body(body);
}
```

## Guidelines
- Create `BaseException` with `errorCode` and `httpStatus` fields
- Use sealed class hierarchy if limiting exception types
- Always log at appropriate level (warn for business, error for unexpected)
- Never expose stack traces or internal details in responses
- Use `String.formatted()` for exception messages
- Return immutable copies of collections in exceptions
- Map specific exceptions to specific HTTP status codes

## REJECTED Patterns

- DO NOT expose internal stack traces in API responses — return structured error DTOs
- DO NOT use generic HTTP 500 for all errors — map to specific status codes
- DO NOT swallow exceptions silently — always log before handling
- DO NOT throw checked exceptions in reactive chains — wrap in `Mono.error()`

---

## Related Specialists

- `domain/java-validation-specialist.md` — validation errors feeding into exception handler (6.x)
- `patterns/annotated-reactive-controller-specialist.md` — `@RestControllerAdvice` in reactive (42.x)
- `patterns/resilience-specialist.md` — circuit breaker error handling (40.x)
