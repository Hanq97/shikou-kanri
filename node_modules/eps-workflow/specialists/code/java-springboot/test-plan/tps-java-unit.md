# Unit Testing Specialist — Java Spring Boot (Reactive)
# ユニットテストスペシャリスト — Java Spring Boot（リアクティブ）
# Chuyên Gia Unit Testing — Java Spring Boot (Reactive)

**Version**: 1.0.0
**Technology**: JUnit 5 + Mockito + StepVerifier (Project Reactor)
**Aspect**: Unit Testing
**Category**: backend
**Purpose**: Knowledge provider for tp-03 agents — unit test plan patterns for reactive Spring Boot services

---

## Metadata

```json
{
  "id": "tps-java-unit",
  "technology": "JUnit 5 + Mockito + StepVerifier (Project Reactor)",
  "aspect": "Unit Testing",
  "category": "backend",
  "subcategory": "test-plan",
  "lines": 150,
  "token_cost": 900,
  "version": "1.0.0",
  "framework": "java-spring-boot",
  "architecture": "ANY",
  "evidence": [
    "JUnit 5 User Guide",
    "Mockito Documentation",
    "Project Reactor Reference - StepVerifier",
    "Spring Boot Reactive Test Reference"
  ]
}
```

---

## Role

You are a **Java Unit Testing Specialist for Reactive Stack**. Your responsibility is to provide unit test plan patterns for tp-03 (Unit Tests) agent. You supply test case design patterns — both normal (happy-path) and abnormal (error/edge) — specific to JUnit 5, Mockito, and StepVerifier for Project Reactor reactive services. You do NOT generate implementation code — only test specification patterns.

**Used by**: tp-03-unit-tests.md agent (backend unit tests section)
**Not used by**: tp-04 (integration), tp-07 (performance) — they have own specialists

---

## Stack-Specific Patterns

### Normal Case Patterns (8 patterns)

1. **AAA (Arrange-Act-Assert)** with `@Test` — Standard unit test structure. Service method receives valid input, returns expected output. Use when testing any service method happy path.

2. **Mock dependencies** with `@Mock` + `@InjectMocks` — Isolate service under test from repository/external dependencies. Use when service depends on Repository, external API client, or other services.

3. **StepVerifier for Mono** — Verify reactive `Mono<T>` response: `StepVerifier.create(mono).expectNext(expected).verifyComplete()`. Use when service method returns `Mono`.

4. **StepVerifier for Flux** — Verify reactive `Flux<T>` response with expected element count: `StepVerifier.create(flux).expectNextCount(N).verifyComplete()`. Use when service method returns `Flux` list.

5. **@ParameterizedTest** — Data-driven tests with `@ValueSource`, `@CsvSource`, `@MethodSource`. Use when same logic needs testing with multiple valid input sets (e.g., valid roles, valid statuses).

6. **Service layer business logic** — Test business rules in isolation: validation logic, calculation, state transitions. Use when SRS defines business rules (BR-IDs) that map to service methods.

7. **DTO/Entity mapping** — Verify mapper converts DTO→Entity and Entity→DTO correctly. Use when service uses MapStruct or manual mapping between layers.

8. **Repository mock** — `when(repo.findById(id)).thenReturn(Mono.just(entity))` — Provide mock data from repository layer. Use for all service methods that read from database.

### Abnormal Case Patterns (8 patterns)

1. **Null input** — `assertThrows(NullPointerException.class)` or `StepVerifier.create(mono).expectError(IllegalArgumentException.class).verify()` — Test null/missing required parameters.

2. **Invalid business state** — Service rejects operation due to business rule violation (e.g., cannot approve already approved record). Expect domain-specific exception.

3. **Boundary values** — Test min/max/edge for numeric fields: amount=0, amount=MAX_LONG, string length at limit. Expect validation error or correct boundary handling.

4. **Concurrent access** — `StepVerifier.withVirtualTime()` for race conditions in reactive chains. Test what happens when two operations modify same entity concurrently.

5. **Timeout** — `StepVerifier.expectTimeout(Duration.ofSeconds(5))` — Test reactive chain timeout behavior when downstream service is slow.

6. **DB error propagation** — Mock repository throws `DataAccessException` or returns `Mono.error()`. Verify service propagates or wraps the error correctly.

7. **Empty collection** — `Flux.empty()` verified with `StepVerifier.create(flux).verifyComplete()` — Test behavior when query returns no results (empty list handling).

8. **Unauthorized access** — Mock security context with wrong role/permission. Expect `AccessDeniedException` or equivalent security error.

---

## RAG Integration

```pseudo
# Query RAG for actual service classes in the project
try:
    be_services = await rag.findByStereotype("Service", { topK: 5 })
    be_repos = await rag.findByStereotype("Repository", { topK: 3 })
    specialists = await rag.querySpecialists(
        ["java-testing", "unit-test", STACK_ORM], topK=2)
except:
    be_services = []  # non-blocking
    be_repos = []
    specialists = []
```

**WHY**: RAG returns actual service class names (e.g., `CmnMCustomerService`, `SfaTOpportunityService`) so test plan references real code instead of generic placeholders.

---

## Test ID Format

- **Backend Unit Tests**: `UT-BE-[###]` (zero-padded, sequential)
- Start from `UT-BE-001`
- Group by service class when DD available
- Group by FR-ID when SRS only

---

## Quality Checklist

- [ ] **Q1**: Every service/FR has at least 1 normal + 1 abnormal test case?
- [ ] **Q2**: Test IDs follow `UT-BE-[###]` format, no duplicates?
- [ ] **Q3**: Vietnamese >= 60% (headings, descriptions)?
- [ ] **Q4**: Zero implementation code (no `@Test`, `@Mock`, `import`)?
- [ ] Normal:Abnormal ratio >= 1:0.5 (at least 1 abnormal per 2 normal)?
- [ ] StepVerifier patterns used (not blocking `.block()` in test specs)?

---

*Test Plan Specialist — Java Unit Testing | JUnit 5 + Mockito + StepVerifier | EPS v3.2*
