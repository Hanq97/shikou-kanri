---
id: tps-java-reactive-performance
stack: java-reactive
type: performance
category: test-plan
subcategory: reactive
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E16]
---

# Performance Test Patterns for Java Reactive
# Java Reactiveのパフォーマンステストパターン

## SECTION 1: PATTERNS

### Virtual Time Testing
- `StepVerifier.withVirtualTime(() -> service.method())` — control time progression
- `.thenAwait(Duration.ofSeconds(30))` — advance time without waiting
- `.expectNextCount(N)` — verify element count within time window
- Test timeout behavior without real delays

### Backpressure Testing
- `StepVerifier.create(flux, StepVerifierOptions.create().initialRequest(0))` — manual demand
- `.thenRequest(N)` — request N elements at a time
- `.expectNextCount(N)` — verify bounded delivery
- Test `onBackpressureBuffer()`, `onBackpressureDrop()`, `onBackpressureLatest()`

### Latency & Throughput Assertions
- `Awaitility.await().atMost(Duration.ofMillis(500)).until(...)` — latency bound
- `Duration elapsed = Duration.between(start, end)` — measure execution time
- `assertThat(elapsed).isLessThan(Duration.ofSeconds(2))` — latency assertion
- `StepVerifier.create(flux).expectNextCount(1000).verifyComplete()` — throughput check

### BlockHound Integration
- `BlockHound.install()` — detect blocking calls in reactive pipeline
- `@BeforeAll static void installBlockHound()` — per-test-class setup
- `Schedulers.onSchedulerNonBlockingError(...)` — custom blocking violation handler
- Verify no `java.lang.Error: Blocking call!` during pipeline execution

### Memory & Resource Testing
- `reactor.test.publisher.TestPublisher` — simulate slow/fast producers
- Test that cancelled subscriptions release resources
- Verify no memory leaks in long-running Flux subscriptions
- `System.gc()` + weak reference check for leak detection

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Timeout behavior | StepVerifier.withVirtualTime | No real wait, deterministic |
| Backpressure compliance | Manual demand StepVerifier | Proves bounded consumption |
| API latency bound | Awaitility + Duration assertion | SLA enforcement |
| Blocking detection | BlockHound.install() | Reactive purity guarantee |
| Throughput validation | StepVerifier.expectNextCount | Verify element count at speed |
| Resource cleanup | TestPublisher + cancel | No resource leak on cancel |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `test_{method}_{performanceScenario}_{expectedOutcome}`
- Example: `test_streamEvents_withBackpressure_deliversWithinBound`

### Assertion Requirements
- Minimum 2 assertions per performance test
- Must verify: correctness + performance characteristic (latency/throughput/no-blocking)
- Backpressure tests must verify element count matches demand

### Coverage Targets
- Every Flux-returning method has backpressure test
- Critical paths have latency bound assertions
- BlockHound enabled for all reactive service tests
- Virtual time used for timeout/retry logic (no Thread.sleep)
