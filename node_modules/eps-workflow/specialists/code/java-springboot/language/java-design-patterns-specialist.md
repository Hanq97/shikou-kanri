# Java Design Patterns Specialist — Generic
# Javaデザインパターンスペシャリスト — 汎用
# Chuyên Gia Design Patterns Java — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 63.1–63.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
GoF Design Patterns implemented using Spring Boot mechanisms — when and why to apply each pattern.

## Patterns

### Pattern 63.1: Strategy — Runtime Algorithm Selection
```java
// Interface
public interface PricingStrategy {
    BigDecimal calculate(Order order);
    boolean supports(CustomerType type);
}

// Multiple implementations as @Component
@Component public class StandardPricing implements PricingStrategy { ... }
@Component public class VipPricing implements PricingStrategy { ... }

// Inject all — select at runtime
@Service
@RequiredArgsConstructor
public class PricingService {
    private final List<PricingStrategy> strategies;

    public BigDecimal calculatePrice(Order order) {
        return strategies.stream()
            .filter(s -> s.supports(order.getCustomerType()))
            .findFirst()
            .orElseThrow(() -> new UnsupportedOperationException("No strategy"))
            .calculate(order);
    }
}
```
**When**: Multiple algorithms for same operation, selected by condition at runtime. Replaces if/else or switch chains.

### Pattern 63.2: Template Method — Workflow Skeleton
```java
public abstract class AbstractImportService<T> {
    // Template method — defines workflow
    public final ImportResult importData(InputStream input) {
        List<T> records = parse(input);        // step 1 — subclass implements
        List<T> validated = validate(records);  // step 2 — subclass implements
        int saved = save(validated);            // step 3 — common logic
        return new ImportResult(saved, records.size() - saved);
    }

    protected abstract List<T> parse(InputStream input);
    protected abstract List<T> validate(List<T> records);

    protected int save(List<T> records) { /* common save logic */ }
}
```
**When**: Multiple services share same workflow but differ in specific steps.

### Pattern 63.3: Builder — Complex Object Construction
```java
// ✅ Lombok @Builder for DTOs with 4+ fields
@Builder
public record SearchCriteria(String keyword, LocalDate from, LocalDate to,
                              List<String> categories, Pageable pageable) {}

// ✅ Step Builder for enforcing required fields
SearchCriteria criteria = SearchCriteria.builder()
    .keyword("java")
    .from(LocalDate.now().minusDays(30))
    .build();
```
**When**: Object construction with 4+ fields. Avoids telescoping constructors.

### Pattern 63.4: Factory — Spring Bean Creation
```java
@Configuration
public class StorageConfig {
    @Bean
    @ConditionalOnProperty(name = "storage.type", havingValue = "s3")
    public StorageService s3Storage() { return new S3StorageService(); }

    @Bean
    @ConditionalOnProperty(name = "storage.type", havingValue = "local", matchIfMissing = true)
    public StorageService localStorage() { return new LocalStorageService(); }
}
```
**When**: Object creation depends on configuration or runtime conditions. Prefer Spring DI over manual `new`.

### Pattern 63.5: Observer — Event-Driven Decoupling
```java
// Publisher — fire and forget
@Service
@RequiredArgsConstructor
public class OrderService {
    private final ApplicationEventPublisher publisher;

    @Transactional
    public Order createOrder(CreateOrderRequest req) {
        Order order = orderRepository.save(mapToOrder(req));
        publisher.publishEvent(new OrderCreatedEvent(order.getId()));
        return order;
    }
}

// Listener — separate concern
@Component
public class NotificationListener {
    @TransactionalEventListener(phase = AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        emailService.sendConfirmation(event.getOrderId());
    }
}
```
**When**: Decouple side effects (notifications, audit, cache invalidation) from main business logic.

### Pattern 63.6: Decorator — Transparent Enhancement
```java
// Base interface
public interface UserService { UserDTO findById(Long id); }

// Core implementation
@Service @Primary
public class UserServiceImpl implements UserService { ... }

// Decorator — adds caching
@Service
public class CachingUserService implements UserService {
    private final UserService delegate;
    private final Cache cache;

    @Override
    public UserDTO findById(Long id) {
        return cache.get(id, () -> delegate.findById(id));
    }
}
```
**When**: Add cross-cutting concern (caching, logging, retry) without modifying original class.

### Pattern 63.7: Adapter — External API Isolation
```java
// Project-owned interface
public interface PaymentGateway {
    PaymentResult charge(Money amount, PaymentMethod method);
}

// Adapter for external API — only this changes when API changes
@Component
public class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient client;

    @Override
    public PaymentResult charge(Money amount, PaymentMethod method) {
        StripeCharge charge = client.charges().create(mapToStripeRequest(amount, method));
        return mapToPaymentResult(charge);
    }
}
```
**When**: Isolate external/third-party APIs. When external API changes → only adapter changes.

## REJECTED Patterns
- ❌ Singleton via manual `getInstance()` — use Spring `@Component` (singleton by default)
- ❌ Excessive Factory pattern — if only one implementation exists, inject directly
- ❌ Deep Decorator chains (3+ levels) — hard to debug, use AOP instead (65.x)
- ❌ Observer with tight coupling — if listener needs data from publisher, pass via event object

## Related Specialists
- `di/java-di-specialist.md` — DI mechanics: @Autowired, @Qualifier (22.x)
- `cross-cutting/spring-aop-specialist.md` — AOP as alternative to Decorator (65.x)
- `language/java-fundamentals-specialist.md` — SOLID principles driving pattern selection (60.x)
