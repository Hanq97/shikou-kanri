---
id: ts-java-reactive-integration
stack: java-reactive
type: integration
category: code-gen
subcategory: reactive
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E7]
---

# Code Generation Template: Java Reactive Integration Tests
# コード生成テンプレート：Java Reactive統合テスト

## Template: Full Context Integration Test

```java
package ${basePackage}.integration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@Testcontainers
class ${FeatureName}IntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private ${RepositoryName} ${repositoryName};

    @AfterEach
    void cleanup() {
        ${repositoryName}.deleteAll().block();
    }

    @Test
    void test_${useCase}_${fullFlow}_${expectedOutcome}() {
        // Arrange: create test data
        ${EntityType} entity = new ${EntityType}();
        entity.set${Field}(${testValue});
        ${repositoryName}.save(entity).block();

        // Act: call API
        webTestClient.${httpMethod}().uri("${apiPath}")
            .bodyValue(${requestDto})
            .exchange()
            // Assert: verify response
            .expectStatus().${expectedStatus}()
            .expectBody(${ResponseType}.class)
            .value(body -> {
                assertThat(body.${field}()).isEqualTo(${expected});
            });

        // Assert: verify side effects (DB persistence)
        ${repositoryName}.findById(${entityId}).block();
        assertThat(persisted).isNotNull();
        assertThat(persisted.${field}()).isEqualTo(${expected});
    }
}
```

## Template: Testcontainers PostgreSQL Setup

```java
package ${basePackage}.integration;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;

abstract class AbstractIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine")
        .withDatabaseName("${dbName}_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureR2dbc(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () ->
            "r2dbc:postgresql://" + postgres.getHost() + ":" + postgres.getFirstMappedPort() + "/" + postgres.getDatabaseName());
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
    }
}
```

## Template: Testcontainers Redis Setup

```java
import org.testcontainers.containers.GenericContainer;

abstract class AbstractCacheIntegrationTest extends AbstractIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7.4-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureRedis(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }
}
```

## Template: Testcontainers Kafka Setup

```java
import org.testcontainers.kafka.KafkaContainer;

abstract class AbstractKafkaIntegrationTest extends AbstractIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer("apache/kafka:3.9.0");

    @DynamicPropertySource
    static void configureKafka(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
}
```

## Template: WireMock for External Service

```java
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

class ${ExternalServiceName}IntegrationTest extends AbstractIntegrationTest {

    static WireMockServer wireMock = new WireMockServer(0);

    @BeforeAll
    static void startWireMock() {
        wireMock.start();
        WireMock.configureFor(wireMock.port());
    }

    @AfterAll
    static void stopWireMock() {
        wireMock.stop();
    }

    @Test
    void test_${method}_callsExternalService_${expectedOutcome}() {
        WireMock.stubFor(WireMock.get("${externalPath}")
            .willReturn(WireMock.aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(${responseJson})));

        webTestClient.${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isOk();
    }
}
```
