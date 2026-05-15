# Reactive Cache Specialist

**Role**: Reactive Cache-Aside Pattern Expert
**Technology Stack**: Spring Data Redis Reactive, Caffeine, AOP
**Integration**: StarX4CRM Core-Manager / SFA-Manager
**Version**: Spring Boot 3.4.4, Spring Data Redis 3.x

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.cache` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 32.1–32.5 |
| **Source Paths** | `{sourceRoot}/infrastructure/cache/` |
| **File Count** | ~5 cache files |
| **Naming Convention** | `*CacheService.java`, `Cache*Configuration.java` |
| **Base Class** | `ReactiveRedisTemplate<String, Object>` |
| **Imports From** | Application (Services), Domain (Entities) |
| **Cannot Import** | `rest.*` (Presentation layer) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **Cache-Aside Pattern**: ReactiveRedisTemplate getOrLoad() flow
2. **TTL Management**: Per-entity TTL strategy (default 5 min)
3. **Fallback Handling**: Redis failure → load from DB transparently
4. **AOP Invalidation**: @InvalidateUserCache annotation + aspect
5. **Domain Events**: UserUpdatedEvent for cross-service cache invalidation
6. **Caffeine Local Cache**: @Cacheable for hot reference data

---

## Pattern Index

- [Pattern 32.1: RedisCacheAsideService (getOrLoad)](#pattern-321-rediscacheasideservice-getorload)
- [Pattern 32.2: TTL Management](#pattern-322-ttl-management)
- [Pattern 32.3: Fallback on Redis Failure](#pattern-323-fallback-on-redis-failure)
- [Pattern 32.4: AOP Cache Invalidation](#pattern-324-aop-cache-invalidation)
- [Pattern 32.5: Caffeine Local Cache via @Cacheable](#pattern-325-caffeine-local-cache-via-cacheable)

---

## Pattern 32.1: RedisCacheAsideService (getOrLoad)

**Use Case**: Standard reactive cache-aside: check Redis first, load from DB on miss, cache result.

```java
// cache/RedisCacheAsideService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisCacheAsideService {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;
    private static final Duration DEFAULT_TTL = Duration.ofMinutes(5);

    /**
     * Cache-aside: get from Redis, or load from DB and cache the result.
     */
    public <T> Mono<T> getOrLoad(String key, Mono<T> loader, Duration ttl) {
        return redisTemplate.opsForValue()
            .get(key)
            .cast(Object.class)
            .<T>handle((value, sink) -> {
                if (value != null) {
                    log.trace("Cache HIT: key={}", key);
                    sink.next((T) value);
                }
            })
            .switchIfEmpty(
                loader
                    .flatMap(result -> redisTemplate.opsForValue()
                        .set(key, result, ttl)
                        .thenReturn(result))
                    .doOnNext(result -> log.trace("Cache MISS → loaded and cached: key={}", key))
            )
            .onErrorResume(ex -> {
                log.warn("Redis error for key={}, falling back to loader: {}", key, ex.getMessage());
                return loader; // Pattern 32.3 fallback
            });
    }

    public <T> Mono<T> getOrLoad(String key, Mono<T> loader) {
        return getOrLoad(key, loader, DEFAULT_TTL);
    }

    public Mono<Boolean> evict(String key) {
        return redisTemplate.delete(key).map(count -> count > 0);
    }

    public Mono<Boolean> evictByPattern(String pattern) {
        return redisTemplate.keys(pattern)
            .flatMap(redisTemplate::delete)
            .reduce(Long::sum)
            .map(count -> count > 0);
    }
}

// Usage in service
@Service
@RequiredArgsConstructor
public class UserQueryServiceImpl implements UserQueryService {
    private final UserRepository userRepository;
    private final RedisCacheAsideService cacheService;

    @Override
    public Mono<UserDetailDto> getUser(String userId, String tenantId) {
        String cacheKey = "user:" + tenantId + ":" + userId;
        return cacheService.getOrLoad(
            cacheKey,
            userRepository.findByIdAndTenantId(userId, tenantId).map(UserMapper::toDetailDto)
        );
    }
}
```

---

## Pattern 32.2: TTL Management

**Use Case**: Different TTL strategies by data volatility.

```java
// cache/CacheTtlConfig.java
public final class CacheTtlConfig {
    public static final Duration USER_TTL        = Duration.ofMinutes(5);
    public static final Duration CUSTOMER_TTL    = Duration.ofMinutes(10);
    public static final Duration CATEGORY_TTL    = Duration.ofHours(1);
    public static final Duration TENANT_CONFIG   = Duration.ofHours(6);
    public static final Duration PERMISSION_TTL  = Duration.ofMinutes(15);
    public static final Duration SESSION_TTL     = Duration.ofMinutes(30);

    private CacheTtlConfig() {}
}

// Usage
cacheService.getOrLoad(
    "customer:" + tenantId + ":" + customerId,
    customerRepository.findById(customerId).map(CustomerMapper::toDto),
    CacheTtlConfig.CUSTOMER_TTL
);
```

---

## Pattern 32.3: Fallback on Redis Failure

**Use Case**: Redis outage must not bring down the application.

```java
// Inline in RedisCacheAsideService.getOrLoad():
.onErrorResume(RedisConnectionFailureException.class, ex -> {
    log.warn("Redis unavailable, bypassing cache for key={}", key);
    return loader;
})
.onErrorResume(QueryTimeoutException.class, ex -> {
    log.warn("Redis timeout, bypassing cache for key={}", key);
    return loader;
});
```

**Rule**: Cache failure is non-fatal. System degrades gracefully to direct DB access.

---

## Pattern 32.4: AOP Cache Invalidation

**Use Case**: Declarative cache invalidation via annotation, triggered on service method completion.

```java
// cache/InvalidateUserCache.java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface InvalidateUserCache {
    String userIdParam() default "userId";
}

// cache/CacheInvalidationAspect.java
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class CacheInvalidationAspect {

    private final RedisCacheAsideService cacheService;
    private final ApplicationEventPublisher eventPublisher;

    @Around("@annotation(invalidateUserCache)")
    public Object aroundInvalidateUserCache(
            ProceedingJoinPoint pjp,
            InvalidateUserCache invalidateUserCache) throws Throwable {

        Object result = pjp.proceed();

        // Extract userId from method argument by name
        var paramNames = ((MethodSignature) pjp.getSignature()).getParameterNames();
        var args = pjp.getArgs();
        String userId = null;
        for (int i = 0; i < paramNames.length; i++) {
            if (paramNames[i].equals(invalidateUserCache.userIdParam())) {
                userId = (String) args[i];
                break;
            }
        }

        if (userId != null) {
            final String uid = userId;
            if (result instanceof Mono<?> mono) {
                return mono.doOnSuccess(v -> publishInvalidation(uid));
            }
            publishInvalidation(uid);
        }
        return result;
    }

    private void publishInvalidation(String userId) {
        cacheService.evictByPattern("user:*:" + userId + "*")
            .subscribe(deleted -> log.debug("Evicted user cache for userId={}", userId));
        eventPublisher.publishEvent(new UserUpdatedEvent(userId));
    }
}

// Usage on service method
@InvalidateUserCache(userIdParam = "userId")
public Mono<UserDetailDto> updateUser(String userId, UpdateUserRequest request) {
    // ... update logic
}
```

---

## Pattern 32.5: Caffeine Local Cache via @Cacheable

**Use Case**: In-process cache for hot, rarely-changing reference data (master categories, permissions).

```java
// config/CaffeineConfig.java
@Configuration
@EnableCaching
public class CaffeineConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS)
            .maximumSize(500)
            .recordStats());
        return manager;
    }
}

// service/CategoryService.java
@Service
public class CategoryServiceImpl implements CategoryService {

    @Cacheable(value = "categories", key = "#tenantId")
    public List<CategoryDto> getAllCategories(String tenantId) {
        // Only called on cache miss; Caffeine holds result for 1 hour
        return categoryRepository.findAllByTenantId(tenantId)
            .stream().map(CategoryMapper::toDto).toList();
    }

    @CacheEvict(value = "categories", key = "#tenantId")
    public void invalidateCategoryCache(String tenantId) {
        log.debug("Evicted Caffeine category cache for tenant={}", tenantId);
    }
}
```

---

## Anti-Patterns

- NO `block()` inside reactive Redis calls — breaks reactive pipeline
- NO caching without TTL — leads to stale data accumulation
- NO caching full entity graphs — cache flat DTOs only
- NO sharing cache keys across tenants — always prefix with tenantId
- NO swallowing Redis errors silently — log and fall back

---

## Related Specialists

- `messaging/kafka-specialist.md` - UserUpdatedEvent published after Kafka consumer sync
- `multitenancy/multitenancy-specialist.md` - Cache keys must include tenantId prefix
- `data-access/r2dbc-callback-specialist.md` - AfterSaveCallback triggers cache invalidation
- `application/java-reactive-specialist.md` - Mono/Flux operators used in getOrLoad chain
