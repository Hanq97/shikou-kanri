---
id: ts-java-reactive-multitenant
stack: java-reactive
type: multitenant
category: code-gen
subcategory: reactive
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E15]
---

# Code Generation Template: Java Reactive Multi-Tenant Tests
# コード生成テンプレート：Java Reactiveマルチテナントテスト

## Template: Tenant Context Propagation Test

```java
package ${basePackage}.multitenant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ${ServiceName}TenantTest {

    @Mock
    private ${RepositoryName} ${repositoryName};

    @InjectMocks
    private ${ServiceName} ${serviceName};

    @Test
    void ${methodName}_shouldReturnOnlyTenantData_whenTenantContextSet() {
        String tenantId = "tenant-A";

        given(${repositoryName}.findByTenantId(tenantId))
            .willReturn(Flux.just(${tenantAEntity1}, ${tenantAEntity2}));

        StepVerifier.create(
            ${serviceName}.${methodName}()
                .contextWrite(ctx -> ctx.put(TenantContextHolder.TENANT_KEY, tenantId))
        )
        .assertNext(result -> {
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        })
        .assertNext(result -> {
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        })
        .verifyComplete();
    }
}
```

## Template: Tenant Isolation Integration Test

```java
package ${basePackage}.integration.multitenant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ${FeatureName}TenantIsolationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private ${RepositoryName} ${repositoryName};

    @AfterEach
    void cleanup() {
        ${repositoryName}.deleteAll().block();
    }

    @Test
    void test_${method}_asTenantA_returnsOnlyTenantAData() {
        // Arrange: insert data for both tenants
        ${repositoryName}.save(${tenantAEntity}).block();
        ${repositoryName}.save(${tenantBEntity}).block();

        // Act: query as tenant-A
        webTestClient.get().uri("${apiPath}")
            .header("X-Tenant-ID", "tenant-A")
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(${ResponseType}.class)
            .value(list -> {
                // Assert: only tenant-A data returned
                assertThat(list).hasSize(1);
                assertThat(list.get(0).getTenantId()).isEqualTo("tenant-A");
            });
    }

    @Test
    void test_${method}_crossTenantAccess_returnsForbidden() {
        ${repositoryName}.save(${tenantAEntity}).block();

        webTestClient.get().uri("${apiPath}/${tenantAEntityId}")
            .header("X-Tenant-ID", "tenant-B")
            .exchange()
            .expectStatus().isForbidden();
    }

    @ParameterizedTest
    @ValueSource(strings = {"tenant-A", "tenant-B", "tenant-C"})
    void test_${method}_eachTenantSeesOwnData(String tenantId) {
        // Arrange
        ${EntityType} entity = new ${EntityType}();
        entity.setTenantId(tenantId);
        entity.set${Field}(${testValue});
        ${repositoryName}.save(entity).block();

        // Act & Assert
        webTestClient.get().uri("${apiPath}")
            .header("X-Tenant-ID", tenantId)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(${ResponseType}.class)
            .value(list -> {
                assertThat(list).allMatch(e -> e.getTenantId().equals(tenantId));
            });
    }
}
```

## Template: Tenant-Aware Cache Test

```java
package ${basePackage}.integration.multitenant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

class ${FeatureName}TenantCacheTest extends AbstractCacheIntegrationTest {

    @Autowired
    private ReactiveRedisTemplate<String, String> redisTemplate;

    @Test
    void test_cache_tenantIsolation_separateKeys() {
        String keyA = "tenant-A:${entityType}:1";
        String keyB = "tenant-B:${entityType}:1";

        StepVerifier.create(
            redisTemplate.opsForValue().set(keyA, ${valueA})
                .then(redisTemplate.opsForValue().set(keyB, ${valueB}))
                .then(redisTemplate.opsForValue().get(keyA))
        )
        .assertNext(value -> {
            assertThat(value).isEqualTo(${valueA});
        })
        .verifyComplete();
    }
}
```
