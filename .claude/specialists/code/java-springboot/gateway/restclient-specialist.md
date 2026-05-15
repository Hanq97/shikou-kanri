# RestClient Specialist

**Stack**: Java 25 LTS + Spring Boot 3.4.x | **Variant**: Clean-Modulith (Blocking + Virtual Threads)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Clean-Modulith (Blocking)** variant.
> For reactive HTTP client, see: `presentation/java-webflux-specialist.md` (WebClient).
> For API Gateway routing, see: `gateway/gateway-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Adapter (Driven) + Infrastructure |
| **Package** | `{rootPackage}.adapter.gateway`, `{rootPackage}.infrastructure.config` |
| **Maven Module** | backbone |
| **Variant** | Clean-Modulith (Blocking + VT) |
| **Pattern Numbers** | 53.1–53.5 |
| **Source Paths** | `{sourceRoot}/adapter/gateway/`, `{sourceRoot}/infrastructure/config/` |
| **Naming Convention** | `*RestGateway.java`, `*Config.java` |
| **Base Class** | `RestClient` (Spring 6.1+) |
| **Imports From** | Domain (Entities), UseCase (Port interfaces) |
| **Cannot Import** | `infrastructure.*` (except via DI) |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## Purpose

Generates blocking HTTP client code using Spring 6.1+ `RestClient` for outbound API calls. Replaces reactive `WebClient` — blocking is fine with Java 25 Virtual Threads. Each target system gets its own `RestClient` bean with dedicated auth interceptors.

---

## Key Differences from WebClient

| Aspect | RestClient (BBN) | WebClient (StarX4CRM) |
|--------|-----------------|----------------------|
| Style | Blocking (synchronous) | Reactive (Mono/Flux) |
| Threading | Virtual Threads handle concurrency | Event loop (Netty) |
| Error Handling | try/catch | `.onErrorResume()`, `.onStatus()` |
| Debugging | Normal stack traces | Async stack traces (hard to read) |
| Auth | Interceptor per builder | `ExchangeFilterFunction` |
| Dependency | `spring-boot-starter-web` | `spring-boot-starter-webflux` |

---

## Pattern 53.1: RestClient Bean Configuration

**Use Case**: Per-target-system RestClient beans with timeouts and base URL.

```java
// infrastructure/config/RestClientConfig.java
package {rootPackage}.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean("bravoRestClient")
    public RestClient bravoRestClient(
            RestClient.Builder builder,
            @Value("${backbone.bravo.base-url}") String baseUrl) {
        return builder
            .baseUrl(baseUrl)
            .requestFactory(timeoutFactory(5000, 10000))
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    @Bean("mesRestClient")
    public RestClient mesRestClient(
            RestClient.Builder builder,
            @Value("${backbone.mes.base-url}") String baseUrl) {
        return builder
            .baseUrl(baseUrl)
            .requestFactory(timeoutFactory(5000, 15000))
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    private SimpleClientHttpRequestFactory timeoutFactory(int connectMs, int readMs) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectMs);
        factory.setReadTimeout(readMs);
        return factory;
    }
}
```

**Key Points**:
- Separate beans per target system — different timeouts, base URLs, auth
- `SimpleClientHttpRequestFactory` for timeout configuration (alternative: use `spring.http.client.connect-timeout` / `read-timeout` global properties in Boot 3.4+)
- Virtual Threads handle blocking I/O — no need for async
- `RestClient.Builder` is auto-configured by Spring Boot (prototype-scoped — each injection gets a fresh clone)

---

## Pattern 53.2: Gateway Implementation with RestClient

**Use Case**: Adapter gateway implementing port interface using `RestClient`.

```java
// adapter/gateway/BravoRestGateway.java
package {rootPackage}.adapter.gateway;

import {rootPackage}.domain.entity.ApiCallLedger;
import {rootPackage}.usecase.port.TargetSystemGateway;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class BravoRestGateway implements TargetSystemGateway {

    private final RestClient restClient;
    private final BravoTokenProvider tokenProvider;

    public BravoRestGateway(@Qualifier("bravoRestClient") RestClient restClient,
                            BravoTokenProvider tokenProvider) {
        this.restClient = restClient;
        this.tokenProvider = tokenProvider;
    }

    @Override
    @CircuitBreaker(name = "bravo-adapter", fallbackMethod = "fallback")
    public TargetResponse forward(ApiCallLedger ledger) {
        var bravoRequest = new BravoRequest(
            ledger.type(), 1, ledger.requestPayload());

        var response = restClient.post()
            .uri("/api/BravoWebApi/execute")
            .header("Authorization", "Bearer " + tokenProvider.getToken())
            .body(bravoRequest)
            .retrieve()
            .body(BravoResponse[].class);

        return mapToTargetResponse(response);
    }

    private TargetResponse fallback(ApiCallLedger ledger, Throwable ex) {
        return TargetResponse.failure("bravo-adapter", ex.getMessage());
    }
}
```

**Key Points**:
- Implements `TargetSystemGateway` port interface (Clean Architecture)
- `@CircuitBreaker` from Resilience4j — blocking-compatible
- `@Qualifier` selects the correct RestClient bean
- `BravoTokenProvider` handles OAuth2 token refresh (119s expiry)

---

## Pattern 53.3: OAuth2 Token Provider

**Use Case**: Auto-refreshing OAuth2 token for target system auth.

```java
// adapter/gateway/BravoTokenProvider.java
package {rootPackage}.adapter.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;

@Component
public class BravoTokenProvider {

    private final RestClient tokenClient;
    private final String username;
    private final String password;

    private volatile String cachedToken;
    private volatile Instant expiresAt = Instant.MIN;

    public BravoTokenProvider(
            RestClient.Builder builder,
            @Value("${backbone.bravo.base-url}") String baseUrl,
            @Value("${backbone.bravo.username}") String username,
            @Value("${backbone.bravo.password}") String password) {
        this.tokenClient = builder.baseUrl(baseUrl).build();
        this.username = username;
        this.password = password;
    }

    public synchronized String getToken() {
        if (cachedToken == null || Instant.now().isAfter(expiresAt)) {
            refreshToken();
        }
        return cachedToken;
    }

    private void refreshToken() {
        var response = tokenClient.post()
            .uri("/token")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body("grant_type=password&username=" + username + "&password=" + password)
            .retrieve()
            .body(TokenResponse.class);

        this.cachedToken = response.accessToken();
        // Bravo token expires in 119s — refresh at 100s for safety margin
        this.expiresAt = Instant.now().plusSeconds(100);
    }

    record TokenResponse(String accessToken, int expiresIn) {}
}
```

**Key Points**:
- Thread-safe with `synchronized` + `volatile` (sufficient with VT)
- Proactive refresh before expiry (100s < 119s actual expiry)
- Separate `RestClient` for token endpoint (no auth header)

---

## Pattern 53.4: MES Gateway with Basic Auth

**Use Case**: MES target system with different auth mechanism.

```java
// adapter/gateway/MesRestGateway.java
package {rootPackage}.adapter.gateway;

import {rootPackage}.domain.entity.ApiCallLedger;
import {rootPackage}.usecase.port.TargetSystemGateway;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Base64;

@Component
public class MesRestGateway implements TargetSystemGateway {

    private final RestClient restClient;
    private final MesTokenProvider tokenProvider;

    public MesRestGateway(@Qualifier("mesRestClient") RestClient restClient,
                          MesTokenProvider tokenProvider) {
        this.restClient = restClient;
        this.tokenProvider = tokenProvider;
    }

    @Override
    @CircuitBreaker(name = "mes-adapter", fallbackMethod = "fallback")
    public TargetResponse forward(ApiCallLedger ledger) {
        var endpoint = resolveEndpoint(ledger.type());

        var response = restClient.post()
            .uri(endpoint)
            .header("Authorization", "Bearer " + tokenProvider.getToken())
            .body(ledger.requestPayload())
            .retrieve()
            .body(MesResponse.class);

        if (response.code() != 0) {
            return TargetResponse.failure("mes-adapter", response.msg());
        }
        return TargetResponse.success("mes-adapter", response.data());
    }

    private String resolveEndpoint(String type) {
        return switch (type) {
            case "PROD_OUTPUT" -> "/node-sdk/production/dayRepSum/create";
            case "STOCK_ISSUE" -> "/node-sdk/MaterialOutboundTernService/create";
            case "MATERIAL_FULL" -> "/material/saveBatch";
            default -> throw new UnsupportedOperationException("Unknown MES type: " + type);
        };
    }

    private TargetResponse fallback(ApiCallLedger ledger, Throwable ex) {
        return TargetResponse.failure("mes-adapter", ex.getMessage());
    }

    record MesResponse(int code, String msg, Object data) {}
}
```

---

## Pattern 53.5: Error Handling with RestClient

**Use Case**: Structured error handling for RestClient calls.

```java
// Common error handling pattern
var response = restClient.post()
    .uri("/api/endpoint")
    .body(request)
    .retrieve()
    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
        var body = new String(res.getBody().readAllBytes());
        throw new TargetSystemClientException(
            "Client error from " + systemName + ": " + res.getStatusCode() + " - " + body);
    })
    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
        throw new TargetSystemServerException(
            "Server error from " + systemName + ": " + res.getStatusCode());
    })
    .body(ResponseType.class);
```

**Key Points**:
- `.onStatus(Predicate<HttpStatusCode>, ErrorHandler)` — lambda params are `(HttpRequest req, ClientHttpResponse res)`
- The handler throws `IOException` — wrap in domain-specific exceptions
- Client errors (4xx) → don't retry (bad request)
- Server errors (5xx) → let circuit breaker/retry handle it
- Blocking exceptions propagate normally — no reactive error operators needed

---

## Guidelines

- Use ONE `RestClient` bean per target system — different config, auth, timeouts
- Use `@Qualifier` to inject the correct RestClient in gateway beans
- Use `@CircuitBreaker` on all external calls — blocking-compatible with Resilience4j
- Use separate `TokenProvider` for each target system with different auth flows
- Enable Virtual Threads: `spring.threads.virtual.enabled=true` — blocking is fine
- Do NOT use `WebClient` — RestClient is Spring 6.1+'s recommended blocking HTTP client

## REJECTED Patterns

- DO NOT use `WebClient` in blocking code — use `RestClient` instead
- DO NOT use `RestTemplate` — superseded by `RestClient` (formally `@Deprecated` in Spring Framework 7.x)
- DO NOT share one RestClient across target systems — different auth/timeouts per system
- DO NOT block on `Mono`/`Flux` — if you're blocking, use RestClient natively
- DO NOT use `@LoadBalanced` with RestClient for BBN — no service discovery (direct URLs)

---

## Related Specialists

- `patterns/resilience-specialist.md` — Circuit breaker and retry configuration (40.x)
- `data-access/spring-data-jdbc-specialist.md` — Domain entities used in gateway calls (50.x)
- `presentation/java-webflux-specialist.md` — Reactive WebClient for StarX4CRM (12.x)
- `gateway/gateway-specialist.md` — Spring Cloud Gateway (API Gateway level) (35.x)
