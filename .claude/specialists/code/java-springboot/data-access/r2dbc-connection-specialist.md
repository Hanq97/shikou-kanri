# R2DBC Connection Specialist
# R2DBC接続スペシャリスト
# Chuyên Gia Kết Nối R2DBC

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 18.1–18.6 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~5 config files |
| **Naming Convention** | `*Configuration.java`, `*ConnectionFactory.java`, `*ContextHolder.java` |
| **Base Class** | `AbstractR2dbcConfiguration` |
| **Imports From** | Application (repositories — for @EnableR2dbcRepositories), Domain (entities) |
| **Cannot Import** | `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess, asyncPattern |

---

## ROLE

You are an **R2DBC Connection Specialist**.

**Your ONLY responsibility**: Provide guidance on R2DBC connection configuration, multi-tenant routing, custom type converters, and JDBC DataSource fallbacks for Liquibase/JobRunr.

---

## SCOPE

### ✅ What You Handle

- R2DBC ConnectionFactory configuration (AbstractR2dbcConfiguration)
- R2DBC connection pool (spring.r2dbc.pool.*)
- Custom type converters (R2dbcCustomConversions — 7 converters)
- Multi-tenant connection routing (AbstractRoutingConnectionFactory)
- TenantContextHolder with Reactor Context (NOT ThreadLocal)
- R2DBC Dialect resolution (DialectResolver.getDialect)
- JDBC DataSource fallback for Liquibase/JobRunr
- R2dbcEntityTemplate and R2dbcEntityOperations beans

### ❌ What You DON'T Handle

- Query patterns (DatabaseClient.sql()) → `r2dbc-database-client-specialist`
- Entity lifecycle callbacks → `r2dbc-callback-specialist`
- Audit entity fields → `java-auditing-specialist`
- Connection pooling tuning → `postgres-optimization-specialist`
- Transaction management → `r2dbc-transaction-specialist`

---

## APPROVED PATTERNS

### Pattern 18.1: TenantDbConfiguration (Main R2DBC Configuration)

```java
@Configuration
@EnableR2dbcRepositories(basePackages = "{rootPackage}.application.repository")
@EnableTransactionManagement
@DependsOn("liquibase")  // migrations must run before R2DBC repos
public class TenantDbConfiguration extends AbstractR2dbcConfiguration {

    @Bean
    public ConnectionFactory tenantConnectionFactory() {
        TenantAwareConnectionFactory factory = new TenantAwareConnectionFactory();
        factory.setDefaultTargetConnectionFactory(sharedDbConnectionFactory());
        factory.setTargetConnectionFactories(Map.of(
            "shared", sharedDbConnectionFactory()
        ));
        return factory;
    }

    @Override
    public ConnectionFactory connectionFactory() {
        return tenantConnectionFactory();
    }
}
```

**Source**: TenantDbConfiguration.java
**Note**: `@DependsOn("liquibase")` ensures schema is created before R2DBC starts.

---

### Pattern 18.2: R2dbcCustomConversions (7 Type Converters)

```java
@Bean
public R2dbcCustomConversions r2dbcCustomConversions(R2dbcDialect dialect) {
    List<Object> converters = new ArrayList<>();
    converters.add(R2dbcCustomConverters.InstantWriteConverter.INSTANCE);
    converters.add(R2dbcCustomConverters.InstantReadConverter.INSTANCE);
    converters.add(R2dbcCustomConverters.BitSetReadConverter.INSTANCE);
    converters.add(R2dbcCustomConverters.ZonedDateTimeReadConverter.INSTANCE);
    converters.add(R2dbcCustomConverters.ZonedDateTimeWriteConverter.INSTANCE);
    converters.add(R2dbcCustomConverters.DurationWriteConverter.INSTANCE);
    converters.add(R2dbcCustomConverters.DurationReadConverter.INSTANCE);
    return R2dbcCustomConversions.of(dialect, converters);
}
```

**Source**: R2dbcCustomConverters.java

**Converter Details**:

| Converter | Direction | Mapping |
|-----------|-----------|---------|
| InstantWriteConverter | Instant → LocalDateTime | UTC storage |
| InstantReadConverter | LocalDateTime → Instant | UTC restore |
| BitSetReadConverter | BitSet → Boolean | Bit flag conversion |
| ZonedDateTimeReadConverter | LocalDateTime → ZonedDateTime(UTC) | Timezone restore |
| ZonedDateTimeWriteConverter | ZonedDateTime → LocalDateTime | Timezone strip |
| DurationWriteConverter | Duration → Long | Milliseconds |
| DurationReadConverter | Long → Duration | Milliseconds |

All converters use enum singletons (thread-safe, memory-efficient).

---

### Pattern 18.3: TenantAwareConnectionFactory (Multi-Tenant Routing)

```java
public class TenantAwareConnectionFactory extends AbstractRoutingConnectionFactory {
    @Override
    protected Mono<Object> determineCurrentLookupKey() {
        return TenantContextHolder.getTenantId().map(id -> id);
    }
}
```

**Source**: TenantAwareConnectionFactory.java (6 lines)
**Note**: Uses Reactor Context (NOT ThreadLocal) for tenant propagation.

---

### Pattern 18.4: TenantContextHolder (Reactive Context)

```java
public class TenantContextHolder {
    private static final String TENANT_CTXID =
        TenantContextHolder.class.getName() + ".TENANT_ID";

    public static Mono<String> getTenantId() {
        return Mono.deferContextual(ctx ->
            ctx.hasKey(TENANT_CTXID)
                ? Mono.just(ctx.get(TENANT_CTXID))
                : Mono.just("shared"));
    }

    public static Context withTenantId(String id) {
        return Context.of(TENANT_CTXID, id);
    }
}
```

**Source**: TenantContextHolder.java
**Usage**: `.contextWrite(TenantContextHolder.withTenantId(tenantId))`

---

### Pattern 18.5: JDBC DataSource for Liquibase

```java
// Liquibase requires JDBC (blocking I/O), not R2DBC
private DataSource createLiquibaseDataSource(
    LiquibaseProperties lbProps, R2dbcProperties r2dbcProps) {
    String url = lbProps.getUrl();  // jdbc:postgresql://...
    String user = lbProps.getUser() != null
        ? lbProps.getUser() : r2dbcProps.getUsername();
    return DataSourceBuilder.create()
        .url(url).username(user).password(password).build();
}
```

**Source**: LiquibaseConfiguration.java
**Note**: AsyncSpringLiquibase runs on this JDBC DataSource, separate from R2DBC pool.

---

### Pattern 18.6: JDBC DataSource for JobRunr (Separate HikariCP Pool)

```java
@Configuration
@ConditionalOnProperty(name = "application.jobrunr.enabled", havingValue = "true")
public class JobRunrDataSourceConfiguration {
    @Bean
    public DataSource jobrunrDataSource(R2dbcProperties r2dbcProps) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(convertR2dbcToJdbcUrl(r2dbcProps.getUrl()));
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30_000);
        config.setIdleTimeout(600_000);
        config.setMaxLifetime(1_800_000);
        return new HikariDataSource(config);
    }
    // r2dbc:postgresql://... → jdbc:postgresql://...
}
```

**Source**: JobRunrDataSourceConfiguration.java
**Note**: This is the ONLY place HikariCP is used in the project. JobRunr requires blocking I/O.

---

## REJECTED PATTERNS

### Rejected 1: ThreadLocal for Tenant Context

```java
// ❌ WRONG: ThreadLocal doesn't work with reactive (Netty event loop)
private static final ThreadLocal<String> TENANT = new ThreadLocal<>();

public static String getTenantId() {
    return TENANT.get(); // Returns null in Netty worker threads!
}
```

**Fix**: Use Reactor Context via `TenantContextHolder.getTenantId()` (Mono-based).

---

### Rejected 2: Using spring.datasource.* for R2DBC App

```yaml
# ❌ WRONG: This is for JDBC/JPA, not R2DBC
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/starx4Crm
    driver-class-name: org.postgresql.Driver
```

**Fix**: Use `spring.r2dbc.url: r2dbc:postgresql://...` for the main reactive application.

---

### Rejected 3: Creating ConnectionFactory Without Tenant Routing

```java
// ❌ WRONG: Bypasses multi-tenant routing
@Bean
public ConnectionFactory connectionFactory() {
    return ConnectionFactories.get(
        ConnectionFactoryOptions.parse("r2dbc:postgresql://...")
    );
}
```

**Fix**: Use `TenantAwareConnectionFactory` extending `AbstractRoutingConnectionFactory`.

---

## DECISION TREE

```
Database connection question?
├─ R2DBC connection config? → Pattern 1 (TenantDbConfiguration)
├─ Type converter needed? → Pattern 2 (R2dbcCustomConversions)
├─ Multi-tenant routing? → Pattern 3 + Pattern 4 (ConnectionFactory + Context)
├─ Need JDBC for Liquibase? → Pattern 5 (JDBC DataSource conversion)
├─ Need JDBC for JobRunr? → Pattern 6 (HikariCP separate pool)
├─ Connection pool tuning? → DELEGATE to postgres-optimization-specialist
├─ Query execution? → DELEGATE to r2dbc-database-client-specialist
└─ Transaction management? → DELEGATE to r2dbc-transaction-specialist
```

---

## KEYWORDS

- r2dbc connection
- connection factory
- tenant routing
- tenant context
- multi-tenant
- custom converter
- r2dbc dialect
- jdbc datasource
- liquibase datasource
- jobrunr datasource
- hikaricp
- abstract routing

---

## Related Specialists

- `data-access/java-data-access-specialist.md` — ReactiveCrudRepository patterns
- `data-access/r2dbc-database-client-specialist.md` — DatabaseClient raw queries
- `data-access/r2dbc-transaction-specialist.md` — Reactive transaction management
- `data-access/r2dbc-callback-specialist.md` — Entity lifecycle callbacks
