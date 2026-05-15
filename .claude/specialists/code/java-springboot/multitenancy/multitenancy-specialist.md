# Multi-tenancy Specialist

**Role**: Multi-tenant Architecture Expert
**Technology Stack**: Spring WebFlux, R2DBC, Reactor Context, Keycloak
**Integration**: StarX4CRM Tenant Isolation Layer
**Version**: Spring Boot 3.4.4, R2DBC PostgreSQL 1.0.x

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure + Application |
| **Package** | `{rootPackage}.infrastructure.multitenancy`, `{rootPackage}.application.service` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 31.1–31.6 |
| **Source Paths** | `{sourceRoot}/infrastructure/multitenancy/` |
| **File Count** | ~10 multi-tenancy files |
| **Naming Convention** | `Tenant*Filter.java`, `TenantContextHolder.java`, `TenantAware*Factory.java` |
| **Base Class** | N/A (configuration + filters) |
| **Imports From** | Application (Services), Domain (Entities) |
| **Cannot Import** | `rest.*` (Presentation layer) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **Tenant Context**: Reactor Context propagation (NOT ThreadLocal in reactive!)
2. **Connection Routing**: AbstractRoutingConnectionFactory for schema switching
3. **Request Isolation**: TenantFilter for HTTP-level tenant extraction
4. **JWT Validation**: Per-tenant Keycloak realm JWT decoding
5. **Schema Management**: PostgreSQL schema per tenant (tenant_001, tenant_002)
6. **Dynamic Reload**: Runtime configuration updates without restart

---

## Pattern Index

- [Pattern 31.1: TenantContextHolder with Reactor Context](#pattern-311-tenantcontextholder-with-reactor-context)
- [Pattern 31.2: TenantAwareConnectionFactory](#pattern-312-tenantawareconnectionfactory)
- [Pattern 31.3: TenantFilter for Request Isolation](#pattern-313-tenantfilter-for-request-isolation)
- [Pattern 31.4: TenantAwareJwtDecoder](#pattern-314-tenantawarejwtdecoder)
- [Pattern 31.5: TenantDbConfiguration](#pattern-315-tenantdbconfiguration)
- [Pattern 31.6: TenantConnectionFactoryReloader](#pattern-316-tenantconnectionfactoryreloader)

---

## Pattern 31.1: TenantContextHolder with Reactor Context

**Use Case**: Propagate tenant identity through reactive pipeline without ThreadLocal.

```java
// multitenancy/TenantContextHolder.java
public final class TenantContextHolder {

    public static final String TENANT_KEY = "TENANT_ID";
    public static final String TENANT_SCHEMA_KEY = "TENANT_SCHEMA";

    private TenantContextHolder() {}

    public static Mono<String> getCurrentTenant() {
        return Mono.deferContextual(ctx ->
            ctx.hasKey(TENANT_KEY)
                ? Mono.just(ctx.get(TENANT_KEY))
                : Mono.error(new TenantNotFoundException("No tenant in context"))
        );
    }

    public static Mono<String> getCurrentSchema() {
        return Mono.deferContextual(ctx ->
            ctx.hasKey(TENANT_SCHEMA_KEY)
                ? Mono.just(ctx.get(TENANT_SCHEMA_KEY))
                : Mono.error(new TenantNotFoundException("No tenant schema in context"))
        );
    }

    public static <T> Mono<T> withTenant(String tenantId, String schema, Mono<T> mono) {
        return mono.contextWrite(ctx -> ctx
            .put(TENANT_KEY, tenantId)
            .put(TENANT_SCHEMA_KEY, schema)
        );
    }
}
```

**Key Rule**: NEVER use `ThreadLocal` for tenant context in reactive code — subscriptions may switch threads. Always use `Reactor Context`.

---

## Pattern 31.2: TenantAwareConnectionFactory

**Use Case**: Route R2DBC connections to the correct PostgreSQL schema per tenant.

```java
// multitenancy/TenantAwareConnectionFactory.java
public class TenantAwareConnectionFactory extends AbstractRoutingConnectionFactory {

    private static final Logger log = LoggerFactory.getLogger(TenantAwareConnectionFactory.class);

    @Override
    protected Mono<Object> determineCurrentLookupKey() {
        return TenantContextHolder.getCurrentSchema()
            .cast(Object.class)
            .doOnNext(schema -> log.trace("Routing connection to schema: {}", schema))
            .onErrorResume(TenantNotFoundException.class, ex -> {
                log.warn("No tenant in context, using default schema");
                return Mono.just("public");
            });
    }
}

// config/R2dbcConfig.java
@Configuration
public class R2dbcConfig {

    @Bean
    public ConnectionFactory connectionFactory(TenantRegistry tenantRegistry) {
        var factory = new TenantAwareConnectionFactory();
        factory.setDefaultTargetConnectionFactory(defaultConnectionFactory());
        factory.setTargetConnectionFactories(tenantRegistry.getConnectionFactoryMap());
        factory.afterPropertiesSet();
        return factory;
    }
}
```

---

## Pattern 31.3: TenantFilter for Request Isolation

**Use Case**: Extract tenant from URL path and set into Reactor Context for downstream processing.

```java
// multitenancy/TenantFilter.java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class TenantFilter implements WebFilter {

    // URL pattern: /{tenantKey}/cmn/api/...
    private static final Pattern TENANT_PATH = Pattern.compile("^/([^/]+)/(?:cmn|sfa|tnt)/.*");
    private final TenantRegistry tenantRegistry;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        var path = exchange.getRequest().getPath().value();
        var matcher = TENANT_PATH.matcher(path);

        if (!matcher.matches()) {
            return chain.filter(exchange); // public or gateway route
        }

        var tenantKey = matcher.group(1);
        return tenantRegistry.findByKey(tenantKey)
            .flatMap(tenant -> chain.filter(exchange)
                .contextWrite(ctx -> ctx
                    .put(TenantContextHolder.TENANT_KEY, tenant.getTenantId())
                    .put(TenantContextHolder.TENANT_SCHEMA_KEY, tenant.getSchemaName())
                ))
            .switchIfEmpty(Mono.error(new TenantNotFoundException("Unknown tenant: " + tenantKey)));
    }
}
```

---

## Pattern 31.4: TenantAwareJwtDecoder

**Use Case**: Validate JWT against the correct Keycloak realm per tenant.

```java
// security/TenantAwareJwtDecoder.java
@Component
@RequiredArgsConstructor
public class TenantAwareJwtDecoder implements ReactiveJwtDecoder {

    private final TenantRegistry tenantRegistry;
    private final Map<String, NimbusReactiveJwtDecoder> decoderCache = new ConcurrentHashMap<>();

    @Override
    public Mono<Jwt> decode(String token) throws JwtException {
        return TenantContextHolder.getCurrentTenant()
            .flatMap(tenantId -> tenantRegistry.findById(tenantId))
            .flatMap(tenant -> {
                var decoder = decoderCache.computeIfAbsent(
                    tenant.getTenantId(),
                    id -> buildDecoder(tenant.getKeycloakIssuerUri())
                );
                return decoder.decode(token);
            });
    }

    private NimbusReactiveJwtDecoder buildDecoder(String issuerUri) {
        return NimbusReactiveJwtDecoder
            .withJwkSetUri(issuerUri + "/protocol/openid-connect/certs")
            .build();
    }
}
```

---

## Pattern 31.5: TenantDbConfiguration

**Use Case**: Per-tenant PostgreSQL connection configuration with schema isolation.

```java
// multitenancy/TenantDbConfiguration.java
@Component
@RequiredArgsConstructor
public class TenantDbConfiguration {

    @Value("${spring.r2dbc.url}")
    private String baseUrl; // jdbc:r2dbc:postgresql://host:5432/{app-prefix}

    @Value("${spring.r2dbc.username}")
    private String username;

    @Value("${spring.r2dbc.password}")
    private String password;

    public ConnectionFactory buildForTenant(TenantEntity tenant) {
        // Schema naming: tenant_001, tenant_002, ...
        var schemaName = "tenant_" + String.format("%03d", tenant.getSequenceNo());

        return ConnectionFactories.get(
            ConnectionFactoryOptions.builder()
                .from(ConnectionFactoryOptions.parse(baseUrl))
                .option(ConnectionFactoryOptions.USER, username)
                .option(ConnectionFactoryOptions.PASSWORD, password)
                .option(ConnectionFactoryOptions.DATABASE, "{app-prefix}")
                // Set search_path to tenant schema
                .option(Option.valueOf("schema"), schemaName)
                .build()
        );
    }

    // Schema format: tenant_001, tenant_002, ..., tenant_999
    public static String schemaName(int sequenceNo) {
        return "tenant_" + String.format("%03d", sequenceNo);
    }
}
```

---

## Pattern 31.6: TenantConnectionFactoryReloader

**Use Case**: Dynamically add/remove tenant connection factories without application restart.

```java
// multitenancy/TenantConnectionFactoryReloader.java
@Component
@RequiredArgsConstructor
@Slf4j
public class TenantConnectionFactoryReloader {

    private final TenantAwareConnectionFactory routingFactory;
    private final TenantDbConfiguration tenantDbConfig;
    private final TenantRegistry tenantRegistry;

    /**
     * Called when a new tenant is provisioned via tenants.lifecycle.events Kafka topic.
     */
    public Mono<Void> onTenantProvisioned(TenantProvisionedEvent event) {
        return tenantRegistry.findById(event.tenantId())
            .doOnNext(tenant -> {
                var cf = tenantDbConfig.buildForTenant(tenant);
                routingFactory.addTargetConnectionFactory(tenant.getSchemaName(), cf);
                log.info("Registered connection factory for tenant: {} (schema={})",
                    tenant.getTenantId(), tenant.getSchemaName());
            })
            .then();
    }

    /**
     * Called when a tenant is suspended or deleted.
     */
    public void onTenantRemoved(String tenantId) {
        tenantRegistry.findSchemaByTenantId(tenantId).ifPresent(schema -> {
            routingFactory.removeTargetConnectionFactory(schema);
            log.info("Removed connection factory for tenant: {} (schema={})", tenantId, schema);
        });
    }
}
```

---

## Anti-Patterns

- NO `ThreadLocal` for tenant context — thread switching in reactive breaks isolation
- NO hardcoded schema names — always derive from `TenantDbConfiguration.schemaName()`
- NO sharing a single R2DBC connection pool across tenants — use per-tenant factories
- NO JWT decoding without tenant context — results in wrong realm validation

---

## Related Specialists

- `messaging/kafka-specialist.md` - tenants.lifecycle.* events trigger reloader
- `gateway/gateway-specialist.md` - Tenant key extracted from URL at gateway level
- `data-access/r2dbc-callback-specialist.md` - Audit fields need tenant context
- `cache/cache-specialist.md` - Cache keys must be tenant-scoped
