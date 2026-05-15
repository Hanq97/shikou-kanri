# Java Reactive Specialist
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.{moduleCode}.impl` |
| **Maven Module** | common |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 14.1–14.N |
| **Source Paths** | `{sourceRoot}/application/service/{moduleCode}/impl/` |
| **File Count** | ~158 services |
| **Naming Convention** | `{Entity}Service.java` (interface), `{Entity}ServiceImpl.java` (implementation) |
| **Base Class** | `SimpleCrudServiceImpl<T, DTO, Long, R, M>` |
| **Imports From** | Domain (Entities), Application (DTOs, Repos) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | asyncPattern |

---

## Purpose
Generates reactive service patterns with Project Reactor operators, error handling, and backpressure control.

## Patterns

### Pattern 1: Reactive Service with Error Handling
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanService {
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Mono<LoanResponse> createLoan(CreateLoanRequest request) {
        return userRepository.findById(request.borrowerId())
            .switchIfEmpty(Mono.error(new EntityNotFoundException("User", request.borrowerId())))
            .flatMap(user -> validateBorrower(user, request))
            .flatMap(user -> {
                var loan = request.toEntity();
                return loanRepository.save(loan);
            })
            .doOnSuccess(loan -> eventPublisher.publishEvent(new LoanCreatedEvent(loan.getId())))
            .map(LoanMapper::toResponse)
            .onErrorResume(DataIntegrityViolationException.class,
                e -> Mono.error(new ConflictException("Duplicate loan request")));
    }

    private Mono<User> validateBorrower(User user, CreateLoanRequest request) {
        return loanRepository.countByBorrowerIdAndStatuses(
                user.getId(), List.of("ACTIVE", "APPROVED"))
            .flatMap(count -> {
                if (count >= 3) {
                    return Mono.error(new BusinessRuleException("Maximum 3 active loans"));
                }
                return Mono.just(user);
            });
    }
}
```

### Pattern 2: Parallel and Concurrent Operations
```java
public Mono<LoanDetailResponse> getLoanWithDetails(UUID loanId) {
    var loanMono = loanRepository.findById(loanId)
        .switchIfEmpty(Mono.error(new EntityNotFoundException("Loan", loanId)));

    var paymentsMono = paymentRepository.findByLoanId(loanId).collectList();
    var scheduleFlux = scheduleRepository.findByLoanId(loanId).collectList();

    return Mono.zip(loanMono, paymentsMono, scheduleFlux)
        .map(tuple -> new LoanDetailResponse(
            LoanMapper.toResponse(tuple.getT1()),
            tuple.getT2().stream().map(PaymentMapper::toResponse).toList(),
            tuple.getT3().stream().map(ScheduleMapper::toResponse).toList()
        ));
}

public Flux<LoanResponse> processMultipleLoans(List<UUID> loanIds) {
    return Flux.fromIterable(loanIds)
        .flatMap(id -> loanRepository.findById(id)
            .flatMap(this::processLoan)
            .onErrorResume(e -> {
                log.warn("Failed to process loan {}: {}", id, e.getMessage());
                return Mono.empty();
            }),
            5); // concurrency limit
}
```

### Pattern 3: Retry and Timeout Patterns
```java
public Mono<LoanResponse> approveLoanWithRetry(UUID loanId) {
    return loanRepository.findById(loanId)
        .switchIfEmpty(Mono.error(new EntityNotFoundException("Loan", loanId)))
        .flatMap(loan -> {
            if (!loan.getStatus().canTransitionTo(LoanStatus.APPROVED)) {
                return Mono.error(new BusinessRuleException(
                    "Cannot approve loan in status: " + loan.getStatus()));
            }
            loan.setStatus(LoanStatus.APPROVED);
            return loanRepository.save(loan);
        })
        .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
            .filter(e -> e instanceof OptimisticLockingFailureException)
            .onRetryExhaustedThrow((spec, signal) ->
                new ConflictException("Concurrent modification detected")))
        .timeout(Duration.ofSeconds(5))
        .map(LoanMapper::toResponse);
}
```

### Pattern 4: Caching with Reactor Cache
```java
@Service
@RequiredArgsConstructor
public class CachedLoanService {
    private final LoanRepository loanRepository;
    private final ReactiveRedisTemplate<String, LoanResponse> redisTemplate;

    public Mono<LoanResponse> getLoanCached(UUID loanId) {
        var cacheKey = "loan:" + loanId;
        return redisTemplate.opsForValue().get(cacheKey)
            .switchIfEmpty(
                loanRepository.findById(loanId)
                    .map(LoanMapper::toResponse)
                    .flatMap(response -> redisTemplate.opsForValue()
                        .set(cacheKey, response, Duration.ofMinutes(10))
                        .thenReturn(response))
            );
    }

    public Mono<Void> invalidateCache(UUID loanId) {
        return redisTemplate.delete("loan:" + loanId).then();
    }
}
```

### Pattern 5: Reactive Event Stream with Sinks
```java
@Service
public class LoanEventService {
    private final Sinks.Many<LoanEvent> sink = Sinks.many().multicast().onBackpressureBuffer(256);

    public void publishEvent(LoanEvent event) {
        sink.tryEmitNext(event);
    }

    public Flux<LoanEvent> subscribe() {
        return sink.asFlux();
    }

    public Flux<LoanEvent> subscribeByType(String eventType) {
        return sink.asFlux()
            .filter(event -> event.type().equals(eventType))
            .onBackpressureLatest();
    }

    public Flux<LoanEvent> subscribeWithReplay(int historySize) {
        return sink.asFlux()
            .cache(historySize);
    }
}

public record LoanEvent(UUID id, String type, UUID loanId, Object payload, LocalDateTime timestamp) {
    public static LoanEvent created(UUID loanId) {
        return new LoanEvent(UUID.randomUUID(), "LOAN_CREATED", loanId, null, LocalDateTime.now());
    }
    public static LoanEvent statusChanged(UUID loanId, LoanStatus newStatus) {
        return new LoanEvent(UUID.randomUUID(), "STATUS_CHANGED", loanId, newStatus, LocalDateTime.now());
    }
}
```

## Guidelines
- Use `Mono.zip()` for parallel independent operations
- Apply `flatMap` concurrency parameter to control parallelism
- Use `retryWhen(Retry.backoff())` for transient failures
- `switchIfEmpty()` for 404/not-found scenarios
- `onErrorResume()` for fallback logic
- `timeout()` on all external calls
- Use `Sinks.Many` for event broadcasting with backpressure
- Never subscribe inside a reactive chain (compose instead)
- Use `doOnSuccess/doOnError` for side effects (logging, metrics)

## REJECTED Patterns

- DO NOT call `.block()` in production code — only in tests or startup
- DO NOT use `Flux.toStream()` — breaks reactive backpressure
- DO NOT nest `subscribe()` inside reactive chains — compose with `flatMap`
- DO NOT ignore errors — always handle with `onErrorResume`/`onErrorReturn`

---

## Related Specialists

- `presentation/java-webflux-specialist.md` — WebFlux framework patterns (12.x)
- `data-access/java-r2dbc-specialist.md` — reactive database access (13.x)
- `patterns/crud-service-base-specialist.md` — reactive service base class (45.x)
