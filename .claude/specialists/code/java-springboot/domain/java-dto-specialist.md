# Java DTO Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Standard (JPA)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive DTO patterns, see: `application/java-reactive-specialist.md`.
> Note: Record/validation patterns are variant-agnostic and apply to both.

> 📌 **StarX4CRM Note**: The project uses a two-layer mapping pattern:
> - `*DTO.java` in `application/service/dto/{moduleCode}/` for service layer (entity↔DTO via MapStruct)
> - `Create*VM.java`, `Update*VM.java` in `infrastructure/web/rest/vm/{moduleCode}/` for REST layer (DTO↔ViewModel)
> See: `patterns/viewmodel-specialist.md` (Pattern 47.x) for details.
> See: `architecture/backend-clean-architecture-specialist.md` (Pattern 0.x) for architecture overview.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.dto.{moduleCode}` |
| **Maven Module** | common |
| **Variant** | Standard (JPA) |
| **Pattern Numbers** | 5.1–5.N |
| **Source Paths** | `{sourceRoot}/application/service/dto/{moduleCode}/` |
| **File Count** | ~100+ DTOs |
| **Naming Convention** | `{Entity}DTO.java` |
| **Base Class** | N/A |
| **Imports From** | Domain (Enums only) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## Purpose
Generates request/response DTOs using Java records with validation annotations and mapper methods.

## Patterns

### Pattern 1: Request DTO with Validation
```java
public record CreateLoanRequest(
    @NotNull(message = "Borrower ID is required")
    Long borrowerId,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1000", message = "Minimum loan amount is 1000")
    @DecimalMax(value = "1000000", message = "Maximum loan amount is 1000000")
    BigDecimal amount,

    @NotNull(message = "Interest rate is required")
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "0.30")
    BigDecimal interestRate,

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Minimum duration is 1 month")
    @Max(value = 60, message = "Maximum duration is 60 months")
    Integer durationMonths,

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    String description
) {}
```

### Pattern 2: Response DTO
```java
public record LoanResponse(
    Long id,
    BigDecimal amount,
    BigDecimal interestRate,
    Integer durationMonths,
    LoanStatus status,
    String borrowerEmail,
    String borrowerName,
    LocalDateTime createdAt,
    LocalDateTime approvedAt,
    List<PaymentResponse> recentPayments
) {}
```

### Pattern 3: Search Criteria DTO
```java
public record LoanSearchCriteria(
    @Nullable LoanStatus status,
    @Nullable @DecimalMin("0") BigDecimal minAmount,
    @Nullable @DecimalMax("10000000") BigDecimal maxAmount,
    @Nullable Long borrowerId,
    @Nullable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
    @Nullable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
) {}
```

### Pattern 4: Mapper Utility
```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LoanMapper {
    public static LoanResponse toResponse(Loan loan) {
        return new LoanResponse(
            loan.getId(),
            loan.getAmount(),
            loan.getInterestRate(),
            loan.getDurationMonths(),
            loan.getStatus(),
            loan.getBorrower().getEmail(),
            loan.getBorrower().getFullName(),
            loan.getCreatedAt(),
            loan.getApprovedAt(),
            loan.getPayments().stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .limit(5)
                .map(PaymentMapper::toResponse)
                .toList()
        );
    }

    public static Loan toEntity(CreateLoanRequest request, User borrower) {
        var loan = new Loan();
        loan.setAmount(request.amount());
        loan.setInterestRate(request.interestRate());
        loan.setDurationMonths(request.durationMonths());
        loan.setDescription(request.description());
        loan.setBorrower(borrower);
        loan.setStatus(LoanStatus.PENDING);
        return loan;
    }
}
```

### Pattern 5: Nested and Composed DTOs
```java
public record BatchRequest(
    @NotEmpty(message = "IDs list cannot be empty")
    @Size(max = 100, message = "Batch size cannot exceed 100")
    List<Long> ids,

    @NotNull(message = "Action is required")
    BatchAction action
) {}

public record BatchResponse(
    int totalProcessed,
    int successCount,
    int failureCount,
    List<BatchItemResult> results
) {
    public record BatchItemResult(Long id, boolean success, String message) {}
}

public record ErrorResponse(int status, String message, LocalDateTime timestamp) {}

public record ValidationErrorResponse(int status, List<FieldError> errors) {
    public record FieldError(String field, String message) {}
}
```

## Guidelines
- Use Java `record` for all DTOs (immutable by default)
- Apply Bean Validation annotations on request records
- Response records should have flat structure (avoid nesting entities)
- Mapper classes are `final` with private constructor
- Use `@Nullable` from Spring for optional search fields
- Keep request/response separate (never reuse for both)
- Limit nested collection sizes in responses

## REJECTED Patterns

- DO NOT embed domain entities inside DTOs — use flat field mapping
- DO NOT use the same DTO for request and response — separate them
- DO NOT add business logic to DTOs — they are pure data carriers
- DO NOT use mutable classes for DTOs — prefer Java records

---

## Related Specialists

- `application/java-mapper-specialist.md` — entity↔DTO mapping with MapStruct (11.x)
- `patterns/search-criteria-specialist.md` — search/filter DTOs (43.x)
- `patterns/viewmodel-specialist.md` — controller-layer VM separate from service DTO (47.x)
