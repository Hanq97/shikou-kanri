# Architecture Patterns Specialist — Generic
# アーキテクチャパターンスペシャリスト — 汎用
# Chuyên Gia Kiến Trúc Phần Mềm — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 82.1–82.8 |
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
Architecture styles selection guide: layered, clean, hexagonal, vertical slice, modular monolith, and DDD tactical patterns. ArchUnit rules catalog.

## Patterns

### Pattern 82.1: Layered Architecture (3-Tier)
```
Controller → Service → Repository
```
- **When**: Small/medium CRUD applications, small team
- **Trade-off**: Simple to understand, but layers become "pass-through" with no real logic
- **Risk**: Tends toward "big ball of mud" without discipline
- Dependencies: top-down only (Controller → Service → Repository, never reverse)

### Pattern 82.2: Clean Architecture
```
Domain (innermost) ← Application ← Infrastructure ← Presentation (outermost)
```
- **When**: Complex business logic, long-lived applications
- **Key rule**: Domain layer has ZERO framework imports (no @Entity, @Autowired, @Component)
- JPA entities SEPARATE from domain entities — use mappers
- Repository interfaces defined in domain, implemented in infrastructure
```java
// domain/ — pure Java, no Spring
public interface OrderRepository { Optional<Order> findById(OrderId id); }

// infrastructure/ — Spring implementation
@Repository
public class JpaOrderRepository implements OrderRepository { ... }
```

### Pattern 82.3: Hexagonal Architecture (Ports & Adapters)
```
         [Driving Adapter]         [Driven Adapter]
              ↓                         ↑
         [Primary Port]           [Secondary Port]
              ↓                         ↑
         ─────────── Application Core ───────────
```
- **Primary Ports** (driving): interfaces the app exposes (REST, CLI, messaging consumer)
- **Secondary Ports** (driven): interfaces the app needs (database, external API, messaging producer)
- **Adapters**: concrete implementations of ports
- **When**: Multiple input channels (REST + CLI + event consumer) or multiple output channels

### Pattern 82.4: Feature-Slice (Vertical Slice)
```
com.example/
├── user/
│   ├── UserController.java
│   ├── UserService.java
│   ├── UserRepository.java
│   └── UserDTO.java
├── order/
│   ├── OrderController.java
│   ├── OrderService.java
│   └── ...
└── shared/
    └── ... (cross-cutting only)
```
- **When**: Team ownership per feature, independent deployability desired
- Each feature contains ALL layers — self-contained vertical slice
- `shared/` only for truly cross-cutting (auth, logging, error handling)
- **Trade-off**: Reduces cross-team conflicts but may duplicate patterns

### Pattern 82.5: Modular Monolith
```java
@ApplicationModule(allowedDependencies = {"shared"})
package com.example.order;
```
- **When**: Preparing for microservices but not ready yet; want module isolation
- Spring Modulith enforces module boundaries at compile/test time
- Internal communication via `ApplicationEventPublisher` (not direct calls)
- Each module has its own aggregate roots, no shared entities

### Pattern 82.6: DDD Tactical Patterns
| Concept | Implementation | Rule |
|---------|---------------|------|
| **Aggregate Root** | Entity with lifecycle control | Only root has Repository interface |
| **Value Object** | Java `record` | Immutable, equality by value |
| **Domain Event** | Record implementing marker interface | Past-tense naming: `OrderCreated` |
| **Repository** | Interface in domain package | Only for aggregate roots |
| **Domain Service** | Stateless class in domain | Logic spanning multiple aggregates |
| **Factory Method** | Static `create()` on entity | Enforce invariants at creation |

```java
// Rich domain model — logic IN entity, not in service
public class Order {
    public void cancel(String reason) {
        if (this.status == SHIPPED) throw new OrderAlreadyShippedException();
        this.status = CANCELLED;
        this.cancelReason = reason;
        registerEvent(new OrderCancelledEvent(this.id, reason));
    }
}
```

### Pattern 82.7: Architecture Selection Guide

| Factor | Layered | Clean | Hexagonal | Feature-Slice | Modular Monolith |
|--------|---------|-------|-----------|---------------|-----------------|
| Team size | 1-3 | 3-10 | 3-10 | 5-20 | 5-20 |
| Complexity | Low | High | High | Medium | Medium-High |
| Business logic | Thin | Rich | Rich | Medium | Rich |
| Testability | Medium | High | High | Medium | High |
| Learning curve | Low | High | High | Low | Medium |
| Scalability prep | Low | Medium | Medium | High | High |

### Pattern 82.8: ArchUnit Rules Catalog
```java
@ArchTest
static final ArchRule layerDependency = layeredArchitecture()
    .consideringAllDependencies()
    .layer("Controller").definedBy("..web..")
    .layer("Service").definedBy("..service..")
    .layer("Repository").definedBy("..repository..")
    .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
    .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
    .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service");

@ArchTest
static final ArchRule noCircularDeps = slices()
    .matching("com.example.(*)..")
    .should().beFreeOfCycles();

@ArchTest
static final ArchRule servicesAnnotated = classes()
    .that().resideInAPackage("..service..")
    .and().areNotInterfaces()
    .should().beAnnotatedWith(Service.class);
```

## REJECTED Patterns
- ❌ God packages: `util/`, `common/` as dumping grounds
- ❌ Circular dependencies between modules/packages
- ❌ Leaky abstractions: controllers knowing SQL, services aware of HTTP
- ❌ Anemic domain models: entities as data bags, all logic in services
- ❌ Bidirectional imports between modules
- ❌ Choosing architecture before understanding domain complexity

## Related Specialists
- `architecture/backend-clean-architecture-specialist.md` — StarX4CRM-specific 4-layer (0.x)
- `cross-cutting/spring-modulith-specialist.md` — Spring Modulith implementation (52.x)
- `language/java-fundamentals-specialist.md` — SOLID principles (60.x)
- `quality/testing-advanced-specialist.md` — ArchUnit tests (90.3)
