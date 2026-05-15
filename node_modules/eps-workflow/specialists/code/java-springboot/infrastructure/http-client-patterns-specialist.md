# HTTP Client Patterns Specialist — Generic
# HTTPクライアントパターンスペシャリスト — 汎用
# Chuyên Gia HTTP Client — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 86.1–86.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*Client.java`, `*Adapter.java` |
| **Base Class** | N/A |
| **Imports From** | Application (interfaces) |
| **Cannot Import** | Presentation |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
HTTP client selection and configuration: WebClient (reactive), RestClient (blocking), Feign (declarative), with error handling and logging.

## Patterns

### Pattern 86.1: WebClient (Reactive)
```java
@Configuration
public class ApiClientConfig {
    @Bean
    public WebClient paymentClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://api.payment.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .filter(ExchangeFilterFunctions.basicAuthentication("user", "pass"))
            .build();
    }
}

@Service
@RequiredArgsConstructor
public class PaymentAdapter implements PaymentGateway {
    private final WebClient paymentClient;

    public Mono<PaymentResult> charge(ChargeRequest request) {
        return paymentClient.post()
            .uri("/charges")
            .bodyValue(request)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, resp ->
                resp.bodyToMono(ErrorResponse.class).map(PaymentException::new))
            .bodyToMono(PaymentResult.class)
            .timeout(Duration.ofSeconds(5))
            .retryWhen(Retry.backoff(3, Duration.ofMillis(500)));
    }
}
```

### Pattern 86.2: RestClient (Spring 6.1+ — Blocking)
```java
@Bean
public RestClient inventoryClient(RestClient.Builder builder) {
    return builder
        .baseUrl("https://api.inventory.com")
        .defaultHeader("X-API-Key", apiKey)
        .requestInterceptor((request, body, execution) -> {
            log.debug("Request: {} {}", request.getMethod(), request.getURI());
            return execution.execute(request, body);
        })
        .build();
}

public InventoryDTO checkStock(String sku) {
    return inventoryClient.get()
        .uri("/stock/{sku}", sku)
        .retrieve()
        .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
            throw new InventoryException("Stock check failed: " + response.getStatusCode());
        })
        .body(InventoryDTO.class);
}
```

### Pattern 86.3: Feign (Declarative — Microservices)
```java
@FeignClient(name = "user-service", fallbackFactory = UserClientFallback.class)
public interface UserClient {
    @GetMapping("/api/v1/users/{id}")
    UserDTO getUser(@PathVariable Long id);

    @PostMapping("/api/v1/users")
    UserDTO createUser(@RequestBody CreateUserRequest request);
}

@Component
public class UserClientFallback implements FallbackFactory<UserClient> {
    @Override
    public UserClient create(Throwable cause) {
        return new UserClient() {
            public UserDTO getUser(Long id) { return UserDTO.unknown(id); }
            public UserDTO createUser(CreateUserRequest req) { throw new ServiceUnavailableException(cause); }
        };
    }
}
```

### Pattern 86.4: Client Selection Guide
| Criteria | WebClient | RestClient | Feign |
|----------|-----------|------------|-------|
| Stack | Reactive (WebFlux) | Blocking (MVC) | Blocking (microservices) |
| Style | Fluent builder | Fluent builder | Declarative interface |
| Service discovery | Manual | Manual | Built-in (Eureka/Consul) |
| Circuit breaker | `retryWhen()` / Resilience4j | Manual / Resilience4j | `@FeignClient(fallback)` |
| Best for | Reactive pipelines | Simple HTTP calls | Microservice inter-calls |

### Pattern 86.5: Connection & Timeout Configuration
```java
// WebClient with connection pool
HttpClient httpClient = HttpClient.create()
    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
    .responseTimeout(Duration.ofSeconds(5))
    .doOnConnected(conn -> conn
        .addHandlerLast(new ReadTimeoutHandler(5))
        .addHandlerLast(new WriteTimeoutHandler(5)));

WebClient client = WebClient.builder()
    .clientConnector(new ReactorClientHttpConnector(httpClient))
    .build();
```
- Always set connect timeout (3-5s), read timeout (5-10s)
- Configure connection pool for high-throughput clients

### Pattern 86.6: Request/Response Logging
```java
// RestClient interceptor
.requestInterceptor((request, body, execution) -> {
    log.debug(">>> {} {} body={}", request.getMethod(), request.getURI(),
        new String(body, StandardCharsets.UTF_8));
    var response = execution.execute(request, body);
    log.debug("<<< {} {}", response.getStatusCode(), response.getStatusText());
    return response;
})
```
- Log at DEBUG level — never INFO in production (volume)
- Redact sensitive headers: `Authorization`, `X-API-Key`

## REJECTED Patterns
- ❌ `RestTemplate` — deprecated in favor of RestClient (Spring 6.1+)
- ❌ No timeout configuration — default is infinite on some clients
- ❌ Logging request/response bodies at INFO level in production
- ❌ Hardcoded URLs — externalize to `application.yml`

## Related Specialists
- `gateway/restclient-specialist.md` — BBN RestClient implementation (53.x)
- `patterns/resilience-specialist.md` — Circuit breaker on clients (40.x)
- `language/java-design-patterns-specialist.md` — Adapter pattern for clients (63.7)
