---
id: ts-java-reactive-security
stack: java-reactive
type: security
category: code-gen
subcategory: reactive
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E10]
---

# Code Generation Template: Java Reactive Security Tests
# コード生成テンプレート：Java Reactiveセキュリティテスト

## Template: Endpoint Authorization Test

```java
package ${basePackage}.web.rest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ${ControllerName}SecurityTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @WithMockUser(roles = "${requiredRole}")
    void ${methodName}_withAuthorizedRole_returns${Expected}() {
        webTestClient.${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().${expectedStatus}();
    }

    @Test
    void ${methodName}_withoutAuth_returnsUnauthorized() {
        webTestClient.${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isUnauthorized();
    }

    @Test
    @WithMockUser(roles = "${insufficientRole}")
    void ${methodName}_withInsufficientRole_returnsForbidden() {
        webTestClient.${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isForbidden();
    }
}
```

## Template: JWT Mock Test

```java
package ${basePackage}.web.rest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.time.Instant;

import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.mockJwt;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ${ControllerName}JwtTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void ${methodName}_withValidJwt_returnsOk() {
        webTestClient
            .mutateWith(mockJwt().jwt(jwt -> jwt
                .subject("${userId}")
                .claim("tenant_id", "${tenantId}")
                .claim("preferred_username", "${username}")
            ).authorities(new SimpleGrantedAuthority("ROLE_${role}")))
            .${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    void ${methodName}_withExpiredJwt_returnsUnauthorized() {
        webTestClient
            .mutateWith(mockJwt().jwt(jwt -> jwt
                .subject("${userId}")
                .expiresAt(Instant.now().minusSeconds(3600))
            ))
            .${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isUnauthorized();
    }

    @Test
    void ${methodName}_withMissingTenantClaim_returnsForbidden() {
        webTestClient
            .mutateWith(mockJwt().jwt(jwt -> jwt
                .subject("${userId}")
                // No tenant_id claim
            ).authorities(new SimpleGrantedAuthority("ROLE_${role}")))
            .${httpMethod}().uri("${apiPath}")
            .exchange()
            .expectStatus().isForbidden();
    }
}
```

## Template: Method-Level Security Test

```java
package ${basePackage}.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import reactor.test.StepVerifier;

@SpringBootTest
class ${ServiceName}SecurityTest {

    @Autowired
    private ${ServiceName} ${serviceName};

    @Test
    @WithMockUser(roles = "ADMIN")
    void ${methodName}_withAdminRole_succeeds() {
        StepVerifier.create(${serviceName}.${methodName}(${input}))
            .assertNext(result -> {
                // verify operation succeeded
            })
            .verifyComplete();
    }

    @Test
    @WithMockUser(roles = "USER")
    void ${methodName}_withUserRole_throwsAccessDenied() {
        StepVerifier.create(${serviceName}.${methodName}(${input}))
            .expectError(AccessDeniedException.class)
            .verify();
    }
}
```
