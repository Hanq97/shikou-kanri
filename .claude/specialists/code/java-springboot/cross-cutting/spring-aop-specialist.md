# Spring AOP Specialist — Generic
# Spring AOPスペシャリスト — 汎用
# Chuyên Gia Spring AOP — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Cross-cutting |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 65.1–65.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*Aspect.java` |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Aspect-Oriented Programming with Spring: aspects, pointcuts, custom annotations, ordering, and common pitfalls.

## Patterns

### Pattern 65.1: @Aspect Fundamentals
```java
@Aspect
@Component
@Slf4j
public class PerformanceAspect {

    @Around("execution(* com.example.service.*.*(..))")
    public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.nanoTime();
        try {
            return joinPoint.proceed();
        } finally {
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            log.info("{}.{} took {}ms", joinPoint.getTarget().getClass().getSimpleName(),
                joinPoint.getSignature().getName(), elapsed);
        }
    }
}
```
- `@Aspect` + `@Component` — both required
- `@Around` is most powerful — controls execution, can skip `proceed()`
- `@Before`/`@After` for simpler cases (no control over return value)

### Pattern 65.2: Pointcut Expressions
```java
// Match all public methods in service package
@Pointcut("execution(public * com.example.service.*.*(..))")
public void serviceLayer() {}

// Match methods annotated with custom annotation
@Pointcut("@annotation(com.example.annotation.Timed)")
public void timedMethods() {}

// Combine pointcuts
@Around("serviceLayer() && timedMethods()")
public Object aroundTimedService(ProceedingJoinPoint pjp) throws Throwable { ... }
```
| Expression | Matches |
|-----------|---------|
| `execution(* com.example.service.*.*(..))` | All methods in service package |
| `within(com.example.web..*)` | All types in web package and subpackages |
| `@annotation(Timed)` | Methods annotated with @Timed |
| `@within(RestController)` | Methods in classes annotated with @RestController |
| `args(String, ..)` | Methods with first param String |

### Pattern 65.3: Custom Annotations for Cross-Cutting
```java
// Define annotation
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int maxRequests() default 100;
    int windowSeconds() default 60;
}

// Use in aspect
@Around("@annotation(rateLimit)")
public Object enforceRateLimit(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
    String key = pjp.getSignature().toShortString();
    if (rateLimiter.isExceeded(key, rateLimit.maxRequests(), rateLimit.windowSeconds())) {
        throw new RateLimitExceededException(key);
    }
    return pjp.proceed();
}

// Apply anywhere
@RateLimit(maxRequests = 10, windowSeconds = 60)
public void submitOrder(OrderRequest request) { ... }
```

### Pattern 65.4: Aspect Ordering
```java
@Aspect @Order(1) // runs first (outermost)
public class SecurityAspect { ... }

@Aspect @Order(2) // runs second
public class LoggingAspect { ... }

@Aspect @Order(3) // runs third (innermost, closest to target)
public class PerformanceAspect { ... }
```
- Lower `@Order` value = higher priority = runs first on entry, last on exit
- Execution order: Security → Logging → Performance → **target** → Performance → Logging → Security

### Pattern 65.5: AOP Pitfalls
| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Self-invocation** | `this.method()` bypasses proxy | Inject self: `@Lazy private MyService self; self.method()` |
| **Private methods** | Spring AOP is proxy-based | Only `public` methods are intercepted |
| **Final classes/methods** | CGLIB cannot proxy | Remove `final` or use interface-based proxy |
| **Performance** | Aspect on hot path adds overhead | Profile before applying; avoid `@Around` on simple methods |
| **Exception swallowing** | Catching in `@Around` hides errors | Always re-throw or log + re-throw |

### Pattern 65.6: AOP vs Interceptors vs Filters
| Mechanism | Scope | Use Case |
|-----------|-------|----------|
| **Servlet Filter** | HTTP request/response | Authentication, CORS, compression |
| **HandlerInterceptor** | Spring MVC pre/post handler | Logging, locale, tenant context |
| **AOP @Aspect** | Any Spring bean method | Business cross-cutting: audit, rate limit, retry |

- Filters: earliest in chain, sees raw request
- Interceptors: after DispatcherServlet, has HandlerMethod info
- AOP: anywhere in bean graph, not limited to web layer

## REJECTED Patterns
- ❌ AOP on private methods — Spring AOP cannot intercept
- ❌ Heavy logic in aspects — keep aspects thin, delegate to services
- ❌ `@Aspect` without `@Component` — won't be discovered
- ❌ Catching exceptions in `@Around` without re-throwing

## Related Specialists
- `infrastructure/logging-specialist.md` — Logging aspect example (74.x)
- `language/java-design-patterns-specialist.md` — Decorator as alternative (63.6)
- `cross-cutting/spring-boot-configuration-specialist.md` — Conditional aspect activation (64.6)
