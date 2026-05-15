# Testing Advanced Specialist — Generic
# テスト上級スペシャリスト — 汎用
# Chuyên Gia Testing Nâng Cao — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 90.1–90.8 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*Test.java`, `*IT.java` |
| **Base Class** | N/A |
| **Imports From** | ALL (test scope) |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Advanced testing: contract testing (WireMock), test data management, ArchUnit, mutation testing, anti-patterns, and async testing.

## Patterns

### Pattern 90.1: Contract Testing with WireMock
```java
@WireMockTest(httpPort = 8089)
class PaymentClientTest {
    @Test
    void should_ReturnPaymentResult_When_ChargeSucceeds(WireMockRuntimeInfo wm) {
        stubFor(post(urlEqualTo("/charges"))
            .withRequestBody(matchingJsonPath("$.amount"))
            .willReturn(okJson("""
                {"transactionId": "tx-123", "status": "SUCCESS"}
                """)));

        PaymentResult result = paymentClient.charge(new ChargeRequest(100));
        assertThat(result.status()).isEqualTo("SUCCESS");

        verify(postRequestedFor(urlEqualTo("/charges")));
    }

    @Test
    void should_HandleTimeout_When_ServiceSlow(WireMockRuntimeInfo wm) {
        stubFor(post("/charges").willReturn(ok().withFixedDelay(6000)));
        assertThatThrownBy(() -> paymentClient.charge(new ChargeRequest(100)))
            .isInstanceOf(TimeoutException.class);
    }
}
```
- WireMock for external service simulation — predictable, fast tests
- Fault injection: `withFixedDelay()`, `withFault(Fault.CONNECTION_RESET_BY_PEER)`

### Pattern 90.2: Test Data Management
```java
// ObjectMother — predefined test objects
public class OrderMother {
    public static Order activeOrder() {
        return Order.builder().id(1L).status(ACTIVE).total(Money.of(100)).build();
    }
    public static Order cancelledOrder() {
        return activeOrder().toBuilder().status(CANCELLED).build();
    }
}

// TestDataBuilder — fluent customization
public class OrderBuilder {
    private OrderStatus status = ACTIVE;
    private Money total = Money.of(100);
    public OrderBuilder withStatus(OrderStatus s) { this.status = s; return this; }
    public OrderBuilder withTotal(BigDecimal amount) { this.total = Money.of(amount); return this; }
    public Order build() { return new Order(null, status, total); }
}

// @Sql for database state
@Test
@Sql("/test-data/orders.sql")
@Sql(statements = "DELETE FROM orders", executionPhase = AFTER_TEST_METHOD)
void should_FindActiveOrders() { ... }
```

### Pattern 90.3: Architecture Testing with ArchUnit
```java
@AnalyzeClasses(packages = "com.example", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    @ArchTest
    static final ArchRule noCircularDeps = slices()
        .matching("com.example.(*)..")
        .should().beFreeOfCycles();

    @ArchTest
    static final ArchRule servicesShouldNotDependOnControllers = noClasses()
        .that().resideInAPackage("..service..")
        .should().dependOnClassesThat().resideInAPackage("..controller..");

    @ArchTest
    static final ArchRule repositoriesShouldBeInterfaces = classes()
        .that().haveNameMatching(".*Repository")
        .should().beInterfaces();

    @ArchTest
    static final ArchRule noFieldInjection = noFields()
        .should().beAnnotatedWith(Autowired.class)
        .because("Use constructor injection");
}
```
- Run as regular JUnit test — fails build on architecture violation
- 30+ useful rules: layer deps, naming, annotations, cyclic deps, field injection

### Pattern 90.4: Mutation Testing with PIT
```xml
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <configuration>
        <targetClasses><param>com.example.service.*</param></targetClasses>
        <mutationThreshold>80</mutationThreshold>
        <outputFormats><param>HTML</param></outputFormats>
    </configuration>
</plugin>
```
- PIT mutates production code → checks if tests catch mutations
- `mutationThreshold=80` — fail if <80% mutants killed
- Focus on service/domain layer — skip DTOs, config

### Pattern 90.5: Test Anti-Patterns
| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Logic in tests** | if/else in test method | Each scenario = separate test |
| **Test interdependence** | Test B depends on Test A running first | Each test independent, own setup |
| **Over-mocking** | Mock everything, test nothing real | Mock only external boundaries |
| **Thread.sleep** | Flaky, slow | Use Awaitility (90.7) |
| **@DirtiesContext** | Rebuilds Spring context every time | Fix root cause of context pollution |
| **Shared mutable state** | Static fields modified by tests | Test-local state, `@BeforeEach` reset |
| **Catching exceptions** | `try { code(); fail(); } catch {}` | `assertThatThrownBy(() -> ...)` |

### Pattern 90.6: Test Naming & Organization
```java
@Nested
@DisplayName("OrderService.createOrder")
class CreateOrder {
    @Test
    @DisplayName("should create order when valid request")
    void should_CreateOrder_When_ValidRequest() { ... }

    @Test
    @DisplayName("should throw when customer not found")
    void should_ThrowNotFoundException_When_CustomerNotFound() { ... }

    @ParameterizedTest
    @ValueSource(doubles = {0, -1, -100})
    @DisplayName("should reject non-positive amounts")
    void should_RejectOrder_When_AmountNotPositive(double amount) { ... }
}
```
- Test pyramid target: unit (70%) / integration (20%) / E2E (10%)
- `@Nested` for grouping by method under test
- `@ParameterizedTest` to eliminate duplication

### Pattern 90.7: Async Testing with Awaitility
```java
@Test
void should_ProcessEventAsync() {
    eventPublisher.publish(new OrderCreatedEvent(orderId));

    await().atMost(5, SECONDS)
           .pollInterval(100, MILLISECONDS)
           .untilAsserted(() -> {
               Order order = orderRepository.findById(orderId).orElseThrow();
               assertThat(order.getStatus()).isEqualTo(PROCESSING);
           });
}
```
- NEVER `Thread.sleep()` in tests — non-deterministic, slow
- Awaitility polls with assertion — fast when condition met early

### Pattern 90.8: Fault Simulation
```java
// WireMock fault injection
stubFor(get("/api/users/1").willReturn(
    aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

// Testcontainers network failure
toxiProxy.getProxy("postgres", 5432).toxics()
    .timeout("pg-timeout", ToxicDirection.DOWNSTREAM, 0);
```

## REJECTED Patterns
- ❌ `Thread.sleep()` in tests
- ❌ `@SpringBootTest` for unit tests — too heavy
- ❌ `System.out.println` instead of assertions
- ❌ Assertions in `catch` blocks
- ❌ Testing implementation details instead of behavior

## Related Specialists
- `testing/java-testing-specialist.md` — JUnit, Mockito, Testcontainers basics (24.x)
- `architecture/architecture-patterns-specialist.md` — ArchUnit overview (82.8)
