# Spring Cloud Gateway Specialist

**Role**: API Gateway & Routing Expert
**Technology Stack**: Spring Cloud Gateway (WebFlux-based), Spring Security OAuth2
**Integration**: StarX4CRM Gateway Microservice
**Version**: Spring Cloud 2024.0.0, Spring Boot 3.4.4

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.config`, `{rootPackage}.infrastructure.web.filter` |
| **Maven Module** | `gateway` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 35.1–35.5 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/`, `{sourceRoot}/infrastructure/web/filter/` |
| **File Count** | ~15 gateway files |
| **Naming Convention** | `Gateway*Configuration.java`, `*Filter.java` |
| **Base Class** | N/A (Spring Cloud Gateway configuration) |
| **Imports From** | Application (Services), Domain (Entities) |
| **Cannot Import** | `rest.*` (Presentation layer — gateway routes, not REST controllers) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **Route Definitions**: Predicates, filters, StripPrefix, AddRequestHeader
2. **CORS**: Gateway-level CORS (downstream services do NOT configure CORS)
3. **Tenant Routing**: /{tenantKey}/cmn/api/... URL rewriting
4. **SSE Endpoint**: Server-Sent Events via Kafka consumer
5. **Security**: JWT relay, role-based route access
6. **Health & Management**: Actuator endpoints, readiness probes

---

## Pattern Index

- [Pattern 35.1: Route Definitions with Filters](#pattern-351-route-definitions-with-filters)
- [Pattern 35.2: CORS Configuration at Gateway](#pattern-352-cors-configuration-at-gateway)
- [Pattern 35.3: Tenant-Aware Routing](#pattern-353-tenant-aware-routing)
- [Pattern 35.4: SSE Endpoint via Kafka](#pattern-354-sse-endpoint-via-kafka)
- [Pattern 35.5: Security & Health Configuration](#pattern-355-security--health-configuration)

---

## Pattern 35.1: Route Definitions with Filters

**Use Case**: Route requests from API gateway to downstream microservices.

```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: core-manager
          uri: lb://core-manager
          predicates:
            - Path=/{tenantKey}/cmn/api/**
          filters:
            - StripPrefix=1   # removes /{tenantKey} prefix before forwarding
            - AddRequestHeader=X-Tenant-Key, {tenantKey}
            - name: CircuitBreaker
              args:
                name: coreManagerCB
                fallbackUri: forward:/fallback/core-manager

        - id: sfa-manager
          uri: lb://sfa-manager
          predicates:
            - Path=/{tenantKey}/sfa/api/**
          filters:
            - StripPrefix=1
            - AddRequestHeader=X-Tenant-Key, {tenantKey}

        - id: tenant-manager
          uri: lb://tenant-manager
          predicates:
            - Path=/tnt/api/**
          filters:
            - AddRequestHeader=X-Internal-Request, true

        - id: page-builder
          uri: lb://page-builder
          predicates:
            - Path=/{tenantKey}/ctm/api/**
          filters:
            - StripPrefix=1
```

```java
// config/GatewayRoutesConfig.java (programmatic alternative)
@Configuration
public class GatewayRoutesConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("core-manager", r -> r
                .path("/{tenantKey}/cmn/api/**")
                .filters(f -> f
                    .stripPrefix(1)
                    .addRequestHeader("X-Tenant-Key", "{tenantKey}")
                    .retry(config -> config.setRetries(2).setStatuses(HttpStatus.SERVICE_UNAVAILABLE))
                )
                .uri("lb://core-manager"))
            .build();
    }
}
```

---

## Pattern 35.2: CORS Configuration at Gateway

**Use Case**: Single CORS policy at gateway — downstream services must NOT add CORS headers.

```java
// config/CorsConfig.java
@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:3000",       // local dev
            "https://*.{app-prefix}.com"      // production
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
```

**Rule**: Downstream services (core-manager, sfa-manager) must NOT have `@CrossOrigin` or CORS filter — only the gateway manages this.

---

## Pattern 35.3: Tenant-Aware Routing

**Use Case**: Extract tenantKey from URL, validate tenant, forward X-Tenant headers.

```java
// filter/TenantValidationGatewayFilter.java
@Component
@RequiredArgsConstructor
public class TenantValidationGatewayFilter implements GlobalFilter, Ordered {

    private static final Pattern TENANT_PATTERN = Pattern.compile("^/([^/]+)/(?:cmn|sfa|tnt|ctm)/.*");
    private final TenantRegistryClient tenantRegistryClient;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        var path = exchange.getRequest().getPath().value();
        var matcher = TENANT_PATTERN.matcher(path);

        if (!matcher.matches()) {
            return chain.filter(exchange);
        }

        var tenantKey = matcher.group(1);
        return tenantRegistryClient.validateTenant(tenantKey)
            .flatMap(tenant -> {
                var mutatedRequest = exchange.getRequest().mutate()
                    .header("X-Tenant-Id", tenant.getTenantId())
                    .header("X-Tenant-Schema", tenant.getSchemaName())
                    .header("X-Tenant-Key", tenantKey)
                    .build();
                return chain.filter(exchange.mutate().request(mutatedRequest).build());
            })
            .onErrorResume(TenantNotFoundException.class, ex -> {
                exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
                return exchange.getResponse().setComplete();
            });
    }

    @Override
    public int getOrder() {
        return -100; // before security filter
    }
}
```

---

## Pattern 35.4: SSE Endpoint via Kafka

**Use Case**: Push real-time notifications to browser clients via Server-Sent Events.

```java
// sse/NotificationSseController.java
@RestController
@RequiredArgsConstructor
@Slf4j
public class NotificationSseController {

    private final NotificationSseService sseService;

    /**
     * SSE stream: GET /{tenantKey}/sse/notifications
     * Client subscribes; Kafka events forwarded in real time.
     */
    @GetMapping(value = "/{tenantKey}/sse/notifications",
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<NotificationDto>> streamNotifications(
            @PathVariable String tenantKey,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        log.debug("SSE connection: tenantKey={}, userId={}", tenantKey, userId);

        return sseService.subscribe(tenantKey, userId)
            .map(event -> ServerSentEvent.<NotificationDto>builder()
                .id(event.getId())
                .event("notification")
                .data(event)
                .build())
            .doOnCancel(() -> log.debug("SSE disconnected: userId={}", userId));
    }
}

// sse/NotificationSseService.java
@Service
@RequiredArgsConstructor
public class NotificationSseService {

    // Kafka consumer (gateway-sse-group) → broadcast via Sinks
    private final Map<String, Sinks.Many<NotificationDto>> userSinks = new ConcurrentHashMap<>();

    public Flux<NotificationDto> subscribe(String tenantKey, String userId) {
        Sinks.Many<NotificationDto> sink = userSinks.computeIfAbsent(
            tenantKey + ":" + userId,
            k -> Sinks.many().multicast().onBackpressureBuffer()
        );
        return sink.asFlux()
            .doFinally(signal -> userSinks.remove(tenantKey + ":" + userId));
    }

    @KafkaListener(topics = "notifications.user", groupId = "gateway-sse-group")
    public void onNotification(ConsumerRecord<String, NotificationDto> record) {
        String key = record.key(); // format: "{tenantKey}:{userId}"
        var sink = userSinks.get(key);
        if (sink != null) {
            sink.tryEmitNext(record.value());
        }
    }
}
```

---

## Pattern 35.5: Security & Health Configuration

**Use Case**: JWT relay to downstream, allow actuator endpoints without auth.

```java
// security/GatewaySecurityConfig.java
@Configuration
@EnableWebFluxSecurity
public class GatewaySecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(auth -> auth
                .pathMatchers("/actuator/**", "/fallback/**").permitAll()
                .pathMatchers("/tnt/api/public/**").permitAll()
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtDecoder(tenantAwareJwtDecoder()))
            )
            .build();
    }
}
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,gateway
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true  # /actuator/health/liveness, /actuator/health/readiness
```

---

## Anti-Patterns

- NO CORS configuration in downstream microservices — gateway owns it
- NO tenant lookup in every downstream service — extract from X-Tenant headers forwarded by gateway
- NO blocking SSE handler — must use Flux/reactive streams
- NO skipping circuit breaker on external dependencies — wrap all lb:// routes

---

## Related Specialists

- `multitenancy/multitenancy-specialist.md` - Tenant extraction and schema routing
- `messaging/kafka-specialist.md` - Kafka consumer for SSE notification bridge
- `security/java-security-specialist.md` - JWT configuration and OAuth2 resource server
- `patterns/resilience-specialist.md` - Circuit breaker on gateway routes
