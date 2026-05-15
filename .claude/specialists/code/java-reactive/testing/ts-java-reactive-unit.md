---
id: ts-java-reactive-unit
stack: java-reactive
type: unit
category: code-gen
subcategory: reactive
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E6, E15]
---

# Code Generation Template: Java Reactive Unit Tests
# コード生成テンプレート：Java Reactiveユニットテスト

## Template: Controller Test

```java
package ${basePackage}.web.rest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@WebFluxTest(${ControllerName}.class)
class ${ControllerName}Test {

    @Autowired
    private WebTestClient webTestClient;

    @MockitoBean
    private ${ServiceName} ${serviceName};

    @Test
    void ${methodName}_shouldReturn${Expected}() {
        given(${serviceName}.${serviceMethod}(any()))
            .willReturn(Mono.just(${expectedResult}));

        webTestClient.${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().${expectedStatus}()
            .expectBody(${ResponseType}.class)
            .value(body -> {
                assertThat(body.${field}()).isEqualTo(${expected});
            });
    }

    @Test
    void ${methodName}_shouldReturnNotFound_whenNotExists() {
        given(${serviceName}.${serviceMethod}(any()))
            .willReturn(Mono.empty());

        webTestClient.${httpMethod}().uri("${apiPath}/${invalidId}")
            .exchange()
            .expectStatus().isNotFound();
    }
}
```

## Template: Service Test with StepVerifier

```java
package ${basePackage}.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ${ServiceName}Test {

    @Mock
    private ${RepositoryName} ${repositoryName};

    @InjectMocks
    private ${ServiceName} ${serviceName};

    @Test
    void ${methodName}_shouldReturn${Expected}_when${Condition}() {
        given(${repositoryName}.${repoMethod}(any()))
            .willReturn(Mono.just(${mockEntity}));

        StepVerifier.create(${serviceName}.${methodName}(${input}))
            .assertNext(result -> {
                assertThat(result).isNotNull();
                assertThat(result.${field}()).isEqualTo(${expected});
            })
            .verifyComplete();
    }

    @Test
    void ${methodName}_shouldReturnEmpty_when${NotFoundCondition}() {
        given(${repositoryName}.${repoMethod}(any()))
            .willReturn(Mono.empty());

        StepVerifier.create(${serviceName}.${methodName}(${input}))
            .verifyComplete();
    }
}
```

## Template: Repository Test with @DataR2dbcTest

```java
package ${basePackage}.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.r2dbc.DataR2dbcTest;
import org.springframework.r2dbc.core.DatabaseClient;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

@DataR2dbcTest
class ${RepositoryName}Test {

    @Autowired
    private ${RepositoryName} ${repositoryName};

    @Autowired
    private DatabaseClient databaseClient;

    @Test
    void ${methodName}_shouldPersistAndRetrieve() {
        ${EntityType} entity = new ${EntityType}();
        entity.set${Field}(${testValue});

        StepVerifier.create(
            ${repositoryName}.save(entity)
                .then(${repositoryName}.findById(entity.getId()))
        )
        .assertNext(found -> {
            assertThat(found).isNotNull();
            assertThat(found.${field}()).isEqualTo(${testValue});
        })
        .verifyComplete();
    }
}
```

## Template: BlockHound Setup

```java
import reactor.blockhound.BlockHound;
import org.junit.jupiter.api.BeforeAll;

class ${TestClassName} {

    @BeforeAll
    static void installBlockHound() {
        BlockHound.install();
    }

    // All tests in this class are protected by BlockHound
    // Any blocking call will throw: java.lang.Error: Blocking call!
}
```
