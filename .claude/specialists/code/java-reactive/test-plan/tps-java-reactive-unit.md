---
id: tps-java-reactive-unit
stack: java-reactive
type: unit
category: test-plan
subcategory: reactive
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E6, E15]
---

# Unit Test Patterns for Java Reactive
# Java Reactiveのユニットテストパターン

## SECTION 1: PATTERNS

### Controller Slice Testing
- `@WebFluxTest(ControllerName.class)` — slice test, only web layer loaded
- `@Autowired WebTestClient` — non-blocking test client
- `@MockBean ServiceName` — mock service layer dependencies
- Response assertions: `.expectStatus()`, `.expectBody()`, `.value()`

### Service Testing with StepVerifier
- `@ExtendWith(MockitoExtension.class)` — isolated unit test
- `StepVerifier.create(mono)` — reactive assertion entry point
- `.expectNext(value)` — verify emitted values
- `.verifyComplete()` — verify terminal signal
- `.expectError(ExceptionType.class)` — verify error signal

### Repository Testing
- `@DataR2dbcTest` — slice test for R2DBC repositories
- `@Autowired R2dbcEntityTemplate` — test data setup
- Verify reactive return types (Mono/Flux)

### BlockHound Integration
- `BlockHound.install()` in `@BeforeAll` — detect blocking calls in reactive chains
- Fails test if any blocking operation detected in reactive thread

### Reactive Mock Patterns
- `given(service.method(any())).willReturn(Mono.just(result))` — mock Mono
- `given(service.list()).willReturn(Flux.just(item1, item2))` — mock Flux
- `Mono.error(new BusinessException())` — mock error signals

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Controller endpoint | @WebFluxTest + WebTestClient | Slice test, fast, web layer only |
| Service with DI | @ExtendWith(MockitoExtension) + StepVerifier | Isolated reactive verification |
| Repository query | @DataR2dbcTest + R2dbcEntityTemplate | Slice test for R2DBC |
| Multi-tenant logic | contextWrite(TenantContextHolder) | Reactor context propagation |
| Blocking detection | BlockHound.install() | Detect accidental blocking |
| Error handling | StepVerifier.expectError() | Verify reactive error signals |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `test_{method}_{scenario}_{expected}`
- Example: `test_findById_existingId_returnsCustomer`
- Alternative: `shouldReturn{Expected}When{Condition}`

### Assertion Requirements
- Minimum 2 assertions per test method
- Must verify both success path AND reactive signals
- StepVerifier must end with `.verifyComplete()` or `.verifyError()`

### Coverage Targets
- Line coverage: ≥80%
- Branch coverage: ≥60%
- Method coverage: ≥80%

### Anti-Patterns to Avoid
- `.block()` in test assertions (use StepVerifier instead)
- Ignoring `onError` signals
- Testing implementation details instead of behavior
- Missing timeout on StepVerifier (use `.verify(Duration.ofSeconds(5))`)
