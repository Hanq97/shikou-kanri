# Java Fundamentals Specialist — Generic
# Java基礎スペシャリスト — 汎用
# Chuyên Gia Java Cơ Bản — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 60.1–60.9 |
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
SOLID principles, modern Java 21+ features, generics, and functional programming patterns applicable to any Java/Spring Boot project.

## Patterns

### Pattern 60.1: SOLID — Single Responsibility
- Each class has ONE reason to change
- Service classes under 200 lines; split when multiple concerns emerge
- Flag God classes: if a class name contains "And", "Manager", "Handler" with mixed responsibilities

### Pattern 60.2: SOLID — Open/Closed & Liskov Substitution
- Extend behavior via new implementations, not modifying existing code
- Flag growing if/else/switch chains → use Strategy pattern (63.1)
- Subtypes MUST honor parent contracts; no exception-throwing overrides
- Flag `instanceof` checks before calling methods → redesign hierarchy

### Pattern 60.3: SOLID — Interface Segregation & Dependency Inversion
- Split interfaces with 10+ methods into role-specific ones
- Depend on abstractions: no `new ConcreteClass()` in service/business logic
- Flag `UnsupportedOperationException` in implementations → interface too fat

### Pattern 60.4: Modern Java — Records
```java
// ✅ Immutable DTO — prefer over Lombok @Data
public record CustomerDTO(Long id, String name, String email) {}

// ✅ Value Object with validation
public record Money(BigDecimal amount, Currency currency) {
    public Money { // compact constructor
        if (amount.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("Negative");
    }
}
```

### Pattern 60.5: Sealed Classes & Pattern Matching
```java
// ✅ Closed type hierarchy — compiler enforces exhaustiveness
public sealed interface PaymentResult permits Success, Failure, Pending {}
public record Success(String transactionId) implements PaymentResult {}
public record Failure(String errorCode, String message) implements PaymentResult {}
public record Pending(String trackingId) implements PaymentResult {}

// ✅ Pattern matching in switch (Java 21)
return switch (result) {
    case Success s -> ResponseEntity.ok(s.transactionId());
    case Failure f -> ResponseEntity.badRequest().body(f.message());
    case Pending p -> ResponseEntity.accepted().body(p.trackingId());
};
```

### Pattern 60.6: Text Blocks & Optional
```java
// ✅ Text blocks for SQL/JSON
String sql = """
    SELECT u.id, u.name FROM users u
    WHERE u.status = :status AND u.created_at > :since
    ORDER BY u.name
    """;

// ✅ Optional — return-only, chain with map/flatMap
public Optional<CustomerDTO> findByEmail(String email) { ... }
customer.map(CustomerDTO::name).orElseThrow(() -> new NotFoundException("Customer"));
```
- NEVER use Optional as field, parameter, or collection element
- NEVER call `get()` without `isPresent()` — use `orElseThrow()`

### Pattern 60.7: Virtual Threads (Java 21+)
```java
// ✅ I/O-bound work — one virtual thread per task
var executor = Executors.newVirtualThreadPerTaskExecutor();
executor.submit(() -> callExternalApi(request));
```
- Use for I/O-bound operations (HTTP calls, DB queries, file I/O)
- Do NOT pool virtual threads (they're lightweight, ~1KB each)
- Do NOT block inside `synchronized` blocks (pins carrier thread)
- Replace `ThreadLocal` with `ScopedValue` for virtual thread context

### Pattern 60.8: Generics Best Practices
- `? extends T` for producers (read), `? super T` for consumers (write) — PECS
- Type-safe generic service: `interface CrudService<T, ID>`
- Avoid raw types — always parameterize

### Pattern 60.9: Functional Interfaces
```java
// ✅ Predicate composition for filtering
Predicate<Order> isActive = order -> order.getStatus() == ACTIVE;
Predicate<Order> isHighValue = order -> order.getTotal().compareTo(threshold) > 0;
List<Order> result = orders.stream().filter(isActive.and(isHighValue)).toList();
```
- Prefer method references over lambdas when clearer: `Order::getTotal`
- `List.of()`, `Set.of()`, `Map.of()` for immutable collections
- `.toList()` (Java 16+) over `collect(Collectors.toList())`

## REJECTED Patterns
- ❌ `new ConcreteClass()` in service/business layer — violates DIP
- ❌ `Optional` as method parameter or field
- ❌ `Optional.get()` without guard — use `orElseThrow()`
- ❌ Raw types (`List` instead of `List<String>`)
- ❌ Pooling virtual threads
- ❌ `@Data` on JPA entities (breaks equals/hashCode)

## Related Specialists
- `di/java-di-specialist.md` — DI mechanics (22.x)
- `domain/java-domain-specialist.md` — Entity design (1.x)
- `language/java-design-patterns-specialist.md` — GoF patterns (63.x)
- `language/java-concurrency-specialist.md` — Thread patterns (61.x)
