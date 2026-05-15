# Custom Observability Specialist — Generic
# カスタムオブザーバビリティスペシャリスト — 汎用
# Chuyên Gia Observability Tùy Chỉnh — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Cross-cutting |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 92.1–92.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*HealthIndicator.java`, `*Metrics.java` |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Application-level observability: custom Micrometer metrics, MDC propagation, custom health indicators, structured logging, and OpenTelemetry integration.

## Patterns

### Pattern 92.1: Custom Micrometer Metrics
```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final MeterRegistry meterRegistry;

    public OrderDTO createOrder(CreateOrderRequest request) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            OrderDTO result = processOrder(request);
            meterRegistry.counter("orders.created", "type", request.type().name()).increment();
            return result;
        } finally {
            sample.stop(meterRegistry.timer("orders.create.duration", "type", request.type().name()));
        }
    }
}

// Or use @Timed annotation (requires TimedAspect bean)
@Bean
public TimedAspect timedAspect(MeterRegistry registry) { return new TimedAspect(registry); }

@Timed(value = "orders.create.duration", extraTags = {"layer", "service"})
public OrderDTO createOrder(CreateOrderRequest request) { ... }
```
- `Counter` — things that only increase (orders created, errors)
- `Timer` — duration + count (request latency)
- `Gauge` — current value (queue depth, active connections)
- `DistributionSummary` — distribution of values (request sizes)

### Pattern 92.2: Metric Naming Convention
```
{application}.{domain}.{action}[.{detail}]
```
| Metric | Tags | Type |
|--------|------|------|
| `orders.created` | type=standard | Counter |
| `orders.create.duration` | type=standard, layer=service | Timer |
| `payments.failed` | reason=timeout, provider=stripe | Counter |
| `queue.depth` | queue=order-processing | Gauge |

- Use tags (NOT metric name) for dimensions — avoid metric name explosion
- Consistent tag keys across all metrics: `environment`, `instance`, `module`

### Pattern 92.3: MDC Propagation
```java
// Set in filter
@Component
public class RequestContextFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp,
                                     FilterChain chain) throws ServletException, IOException {
        String requestId = Optional.ofNullable(req.getHeader("X-Request-ID"))
            .orElse(UUID.randomUUID().toString());
        MDC.put("requestId", requestId);
        MDC.put("userId", extractUserId(req));
        try {
            resp.setHeader("X-Request-ID", requestId);
            chain.doFilter(req, resp);
        } finally {
            MDC.clear();
        }
    }
}

// Reactive MDC — Context propagation (Spring Boot 3.x)
// application.yml
spring.reactor.context-propagation: auto
```
- MDC values appear in every log line automatically
- For `@Async`: use `TaskDecorator` to copy MDC to worker thread
- For reactive: `spring.reactor.context-propagation=auto` (Boot 3.x)

### Pattern 92.4: Custom HealthIndicator
```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {
    private final PaymentGateway gateway;

    @Override
    public Health health() {
        try {
            gateway.ping(); // lightweight check
            return Health.up()
                .withDetail("provider", "stripe")
                .withDetail("latencyMs", gateway.lastPingMs())
                .build();
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("provider", "stripe")
                .build();
        }
    }
}
```
- Keep health checks under **250ms** — they're called frequently
- Business-level health: queue depth, cache hit ratio, circuit breaker state
- Map to Kubernetes probes: `/actuator/health/liveness`, `/actuator/health/readiness`

### Pattern 92.5: Structured Logging
```xml
<!-- logback-spring.xml — JSON in production -->
<springProfile name="prod">
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>requestId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
        </encoder>
    </appender>
</springProfile>
```
```java
// Key-value structured logging
log.info("Order created", kv("orderId", order.getId()), kv("total", order.getTotal()));
// Output: {"message":"Order created","orderId":123,"total":99.99,"requestId":"abc-123"}
```
- JSON format in production — human-readable in dev
- Correlation IDs (requestId, traceId) in every log line via MDC
- Log at service boundary only — not every intermediate method

### Pattern 92.6: OpenTelemetry Integration
```yaml
# application.yml — OTel with Spring Boot 3.x
management.tracing:
  sampling.probability: 1.0  # 100% in dev, lower in prod
management.otlp:
  tracing.endpoint: http://otel-collector:4318/v1/traces
  metrics.export.endpoint: http://otel-collector:4318/v1/metrics
```
- Micrometer Tracing → OTLP exporter — unified traces + metrics + logs
- Migration from Zipkin/Sleuth: replace `spring-cloud-sleuth` with `micrometer-tracing-bridge-otel`
- Auto-instrumented: RestTemplate, WebClient, JdbcTemplate, Kafka, Redis

## REJECTED Patterns
- ❌ Metric name explosion: `orders.created.type.standard` — use tags instead
- ❌ Health checks with side effects (writes, mutations)
- ❌ Health checks >250ms (blocks probe endpoints)
- ❌ `System.out.println` for logging
- ❌ String concatenation in log: `log.info("User " + id)` — use parameterized: `log.info("User {}", id)`

## Related Specialists
- `infrastructure/monitoring-specialist.md` — Prometheus/Grafana infrastructure (73.x)
- `infrastructure/logging-specialist.md` — Logback configuration (74.x)
- `cross-cutting/spring-aop-specialist.md` — @Timed via AOP (65.x)
