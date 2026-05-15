# Java Service Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Standard (JPA)** variant.
> StarX4CRM uses the **Reactive (R2DBC/WebFlux)** variant.
> For reactive patterns, see: `presentation/java-webflux-specialist.md`, `data-access/java-r2dbc-specialist.md`, `application/java-handler-specialist.md`, `presentation/java-router-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.{moduleCode}.impl` |
| **Maven Module** | common |
| **Variant** | Standard (JPA) |
| **Pattern Numbers** | 2.1–2.N |
| **Source Paths** | N/A — Standard variant. See `application/java-reactive-specialist.md` (14.x) for actual reactive services |
| **File Count** | N/A |
| **Naming Convention** | `{Entity}ServiceImpl.java` |
| **Base Class** | N/A (standard variant) |
| **Imports From** | Domain (Entities) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Generates Spring service layer with transactional boundaries, business logic orchestration, and proper error handling.

## Patterns

### Pattern 1: Service with Transaction Management
```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoanService {
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public LoanResponse createLoan(CreateLoanRequest request) {
        var borrower = userRepository.findById(request.borrowerId())
            .orElseThrow(() -> new EntityNotFoundException("User", request.borrowerId()));

        var loan = new Loan();
        loan.setAmount(request.amount());
        loan.setInterestRate(request.interestRate());
        loan.setBorrower(borrower);
        loan.setStatus(LoanStatus.PENDING);

        var saved = loanRepository.save(loan);
        eventPublisher.publishEvent(new LoanCreatedEvent(saved.getId()));
        return LoanMapper.toResponse(saved);
    }
}
```

### Pattern 2: Specification-based Filtering
```java
public Page<LoanResponse> searchLoans(LoanSearchCriteria criteria, Pageable pageable) {
    Specification<Loan> spec = Specification.where(null);

    if (criteria.status() != null) {
        spec = spec.and((root, query, cb) ->
            cb.equal(root.get("status"), criteria.status()));
    }
    if (criteria.minAmount() != null) {
        spec = spec.and((root, query, cb) ->
            cb.greaterThanOrEqualTo(root.get("amount"), criteria.minAmount()));
    }
    if (criteria.borrowerId() != null) {
        spec = spec.and((root, query, cb) ->
            cb.equal(root.get("borrower").get("id"), criteria.borrowerId()));
    }

    return loanRepository.findAll(spec, pageable).map(LoanMapper::toResponse);
}
```

### Pattern 3: Business Rule Validation
```java
@Transactional
public LoanResponse approveLoan(UUID loanId, UUID approverId) {
    var loan = loanRepository.findById(loanId)
        .orElseThrow(() -> new EntityNotFoundException("Loan", loanId));

    if (!loan.getStatus().canTransitionTo(LoanStatus.APPROVED)) {
        throw new BusinessRuleException(
            "Cannot approve loan in status: " + loan.getStatus());
    }

    var approver = userRepository.findById(approverId)
        .orElseThrow(() -> new EntityNotFoundException("User", approverId));

    if (approver.getRole() != UserRole.ADMIN) {
        throw new AccessDeniedException("Only admins can approve loans");
    }

    loan.setStatus(LoanStatus.APPROVED);
    loan.setApprovedBy(approver);
    loan.setApprovedAt(LocalDateTime.now());

    return LoanMapper.toResponse(loanRepository.save(loan));
}
```

### Pattern 4: Batch Processing
```java
@Transactional
@Scheduled(cron = "0 0 1 * * *")
public void processOverdueLoans() {
    var cutoffDate = LocalDate.now().minusDays(30);
    var overdueLoans = loanRepository
        .findByStatusAndDueDateBefore(LoanStatus.ACTIVE, cutoffDate);

    overdueLoans.forEach(loan -> {
        loan.setStatus(LoanStatus.OVERDUE);
        eventPublisher.publishEvent(new LoanOverdueEvent(loan.getId()));
    });

    loanRepository.saveAll(overdueLoans);
    log.info("Processed {} overdue loans", overdueLoans.size());
}
```

### Pattern 5: Retry and Idempotency
```java
@Transactional
@Retryable(retryFor = OptimisticLockingFailureException.class, maxAttempts = 3)
public PaymentResponse processPayment(ProcessPaymentRequest request) {
    var existingPayment = paymentRepository
        .findByIdempotencyKey(request.idempotencyKey());
    if (existingPayment.isPresent()) {
        return PaymentMapper.toResponse(existingPayment.get());
    }

    var loan = loanRepository.findByIdWithLock(request.loanId())
        .orElseThrow(() -> new EntityNotFoundException("Loan", request.loanId()));

    var payment = new Payment();
    payment.setAmount(request.amount());
    payment.setLoan(loan);
    payment.setIdempotencyKey(request.idempotencyKey());

    loan.addPayment(payment);
    return PaymentMapper.toResponse(paymentRepository.save(payment));
}
```

## Guidelines
- Class-level `@Transactional(readOnly = true)`, method-level `@Transactional` for writes
- Use constructor injection via `@RequiredArgsConstructor`
- Throw domain-specific exceptions (`EntityNotFoundException`, `BusinessRuleException`)
- Publish events for cross-cutting concerns
- Use `Specification` for dynamic queries
- Add `@Retryable` for optimistic locking scenarios
- Return DTO/Response objects, never entities

## REJECTED Patterns

- DO NOT inject repositories directly from controllers — always go through service layer
- DO NOT return entities from services — return DTOs via mapper
- DO NOT use `@Transactional` with blocking calls in reactive variant — use `@Transactional` with R2DBC only
- DO NOT call `.block()` in service methods — keep the reactive chain intact

---

## Related Specialists

- `patterns/crud-service-base-specialist.md` — SimpleCrudServiceImpl base class (45.x)
- `application/java-mapper-specialist.md` — entity↔DTO mapping (11.x)
- `domain/java-domain-specialist.md` — entity classes consumed by services (1.x)
