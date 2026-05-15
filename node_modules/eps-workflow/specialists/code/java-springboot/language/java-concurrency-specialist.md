# Java Concurrency Specialist — Generic
# Java並行処理スペシャリスト — 汎用
# Chuyên Gia Đồng Thời Java — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Cross-cutting |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 61.1–61.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | asyncPattern |

---

## Purpose
Thread safety, CompletableFuture composition, structured concurrency, and @Async patterns for non-reactive Java applications.

## Patterns

### Pattern 61.1: CompletableFuture Composition
```java
// ✅ Parallel calls with combine
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> userService.find(id), ioExecutor);
CompletableFuture<List<Order>> ordersFuture = CompletableFuture.supplyAsync(() -> orderService.findByUser(id), ioExecutor);

UserProfile profile = userFuture.thenCombine(ordersFuture, UserProfile::new)
    .orTimeout(5, TimeUnit.SECONDS)
    .exceptionally(ex -> UserProfile.fallback(id))
    .join();
```
- Always specify custom executor for blocking I/O — NEVER use common ForkJoinPool
- Always add `orTimeout()` or `completeOnTimeout()` to prevent hangs
- Handle failures via `exceptionally()` or `handle()`

### Pattern 61.2: Structured Concurrency (Java 21 Preview)
```java
// ✅ Cancel remaining tasks on first failure
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> user = scope.fork(() -> fetchUser(id));
    Subtask<Account> account = scope.fork(() -> fetchAccount(id));
    scope.join().throwIfFailed();
    return new UserAccount(user.get(), account.get());
}
```
- Use `ShutdownOnFailure` when ALL results required
- Use `ShutdownOnSuccess` when FIRST result sufficient

### Pattern 61.3: @Async Configuration
```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean
    public TaskExecutor taskExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        return executor;
    }
}
```
- Methods MUST be `public` — proxy-based
- NEVER call @Async method on `this` — proxy bypass, runs synchronously
- For security context: wrap with `DelegatingSecurityContextAsyncTaskExecutor`
- Default `SimpleAsyncTaskExecutor` creates unbounded threads → OOM risk

### Pattern 61.4: Thread Safety
```java
// ✅ Atomic check-then-act
private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();
sessions.computeIfAbsent(userId, k -> createSession(k)); // atomic

// ✅ Volatile for shared flags
private volatile boolean running = true;
```
- `ConcurrentHashMap` over `HashMap` for shared mutable maps
- `AtomicInteger`, `AtomicLong`, `LongAdder` for counters
- Prefer immutable objects over synchronization
- Never synchronize on non-final objects

### Pattern 61.5: Concurrent Collections
| Need | Use |
|------|-----|
| Concurrent read-write map | `ConcurrentHashMap` |
| Frequent iteration, rare write | `CopyOnWriteArrayList` |
| Producer-consumer | `LinkedBlockingQueue` |
| Priority tasks | `PriorityBlockingQueue` |
| Sorted concurrent | `ConcurrentSkipListMap` |

### Pattern 61.6: Deadlock Prevention
- Consistent lock ordering: always acquire locks in same order (e.g., by ID)
- Use `tryLock(timeout)` with `ReentrantLock` instead of `synchronized`
- Avoid nested `synchronized` blocks
- Minimize lock scope — hold locks for shortest time possible

## REJECTED Patterns
- ❌ `Thread.sleep()` in production code — use `ScheduledExecutorService`
- ❌ `synchronized` on Spring beans — use proper concurrent data structures
- ❌ Common ForkJoinPool for blocking I/O
- ❌ Default `SimpleAsyncTaskExecutor` in production
- ❌ `ThreadLocal` with virtual threads — use `ScopedValue`
- ❌ Calling `@Async` method via `this` (self-invocation)

## Related Specialists
- `application/java-reactive-specialist.md` — Mono/Flux concurrency (14.x) — different paradigm
- `language/java-fundamentals-specialist.md` — Virtual threads overview (60.7)
- `architecture/distributed-patterns-specialist.md` — Distributed locking (94.3)
