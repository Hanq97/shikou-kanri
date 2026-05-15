---
id: ts-java-reactive-performance
stack: java-reactive
type: performance
category: code-gen
subcategory: reactive
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E16]
---

# Code Generation Template: Java Reactive Performance Tests
# コード生成テンプレート：Java Reactiveパフォーマンステスト

## Template: Virtual Time Test

```java
package ${basePackage}.service;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Duration;

class ${ServiceName}TimeoutTest {

    @Test
    void ${methodName}_shouldTimeout_afterConfiguredDuration() {
        StepVerifier.withVirtualTime(() ->
            ${serviceName}.${methodName}(${input})
                .timeout(Duration.ofSeconds(${timeoutSeconds}))
        )
        .expectSubscription()
        .thenAwait(Duration.ofSeconds(${timeoutSeconds}))
        .expectError(java.util.concurrent.TimeoutException.class)
        .verify();
    }

    @Test
    void ${methodName}_shouldRetry_onTransientFailure() {
        StepVerifier.withVirtualTime(() ->
            ${serviceName}.${methodName}(${input})
                .retryWhen(reactor.util.retry.Retry.backoff(3, Duration.ofSeconds(1)))
        )
        .expectSubscription()
        .thenAwait(Duration.ofSeconds(7)) // 1 + 2 + 4 backoff
        .assertNext(result -> {
            // verify retry succeeded
        })
        .verifyComplete();
    }
}
```

## Template: Backpressure Test

```java
package ${basePackage}.service;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;
import reactor.test.StepVerifierOptions;

class ${ServiceName}BackpressureTest {

    @Test
    void ${methodName}_shouldRespectBackpressure() {
        Flux<${ElementType}> flux = ${serviceName}.${methodName}(${input});

        StepVerifier.create(flux, StepVerifierOptions.create().initialRequest(0))
            .expectSubscription()
            .thenRequest(${batchSize})
            .expectNextCount(${batchSize})
            .thenRequest(${batchSize})
            .expectNextCount(${batchSize})
            .thenCancel()
            .verify();
    }

    @Test
    void ${methodName}_shouldBufferOnBackpressure() {
        Flux<${ElementType}> flux = ${serviceName}.${methodName}(${input})
            .onBackpressureBuffer(${bufferSize});

        StepVerifier.create(flux, StepVerifierOptions.create().initialRequest(0))
            .expectSubscription()
            .thenRequest(1)
            .expectNextCount(1)
            .thenRequest(Long.MAX_VALUE)
            .thenConsumeWhile(e -> true)
            .verifyComplete();
    }
}
```

## Template: Latency Assertion Test

```java
package ${basePackage}.integration;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ${FeatureName}LatencyTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void ${methodName}_shouldRespondWithin${slaMs}ms() {
        Instant start = Instant.now();

        webTestClient.${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isOk();

        Duration elapsed = Duration.between(start, Instant.now());
        assertThat(elapsed).isLessThan(Duration.ofMillis(${slaMs}));
    }
}
```

## Template: BlockHound Verification

```java
package ${basePackage}.service;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import reactor.blockhound.BlockHound;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import reactor.test.StepVerifier;

class ${ServiceName}BlockingDetectionTest {

    @BeforeAll
    static void installBlockHound() {
        BlockHound.install();
    }

    @Test
    void ${methodName}_shouldNotBlock_onEventLoop() {
        Mono<${ReturnType}> result = ${serviceName}.${methodName}(${input})
            .subscribeOn(Schedulers.parallel());

        StepVerifier.create(result)
            .assertNext(r -> {
                // If BlockHound detects blocking, this test fails with:
                // java.lang.Error: Blocking call! ...
                assertThat(r).isNotNull();
            })
            .verifyComplete();
    }
}
```

## Template: Throughput Test

```java
package ${basePackage}.integration;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import java.time.Duration;

class ${FeatureName}ThroughputTest {

    @Test
    void ${methodName}_shouldProcess${count}Elements_within${seconds}Seconds() {
        Flux<${ElementType}> flux = ${serviceName}.${methodName}(${input});

        StepVerifier.create(flux)
            .expectNextCount(${count})
            .verifyComplete();
        // Implicit: StepVerifier default timeout = 10s
    }
}
```
