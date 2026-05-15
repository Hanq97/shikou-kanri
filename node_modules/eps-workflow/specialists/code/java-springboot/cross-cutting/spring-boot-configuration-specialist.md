# Spring Boot Configuration Specialist — Generic
# Spring Boot設定スペシャリスト — 汎用
# Chuyên Gia Cấu Hình Spring Boot — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 64.1–64.7 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `*Properties.java`, `*AutoConfiguration.java` |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
@ConfigurationProperties binding, auto-configuration mechanism, bean lifecycle, conditional beans, and property source hierarchy.

## Patterns

### Pattern 64.1: @ConfigurationProperties with Validation
```java
@ConfigurationProperties(prefix = "app.mail")
@Validated
public record MailProperties(
    @NotBlank String host,
    @Min(1) @Max(65535) int port,
    @NotBlank String from,
    @Valid RetryProperties retry
) {
    public record RetryProperties(@Min(1) int maxAttempts, @Min(100) long delayMs) {}
}

// Enable in @Configuration
@Configuration
@EnableConfigurationProperties(MailProperties.class)
public class MailConfig { ... }
```
- Constructor binding is default for records — no `@ConstructorBinding` needed (Boot 3.x)
- Always `@Validated` with JSR-380 annotations on properties

### Pattern 64.2: Custom Auto-Configuration
```java
@AutoConfiguration
@ConditionalOnClass(MailSender.class)
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(MailProperties.class)
public class MailAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public MailService mailService(MailProperties props) {
        return new DefaultMailService(props);
    }
}
```
- Register in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
- `@ConditionalOnMissingBean` allows users to override your default

### Pattern 64.3: Property Source Hierarchy (lowest → highest priority)
1. Default values in `@ConfigurationProperties`
2. `application.yml`
3. `application-{profile}.yml`
4. Environment variables (`APP_MAIL_HOST`)
5. Command-line arguments (`--app.mail.host=...`)
6. `@TestPropertySource` (tests only)

- Relaxed binding: `app.mail-host` = `app.mailHost` = `APP_MAIL_HOST`

### Pattern 64.4: Bean Lifecycle
| Phase | Mechanism | Use Case |
|-------|-----------|----------|
| After DI complete | `@PostConstruct` | Validate config, init resources |
| After all singletons | `SmartInitializingSingleton` | Cross-bean setup |
| App fully started | `ApplicationRunner` / `CommandLineRunner` | Startup tasks, data loading |
| Before shutdown | `@PreDestroy` | Close connections, flush buffers |
| Graceful shutdown | `server.shutdown=graceful` | Wait for in-flight requests |

```java
@Component
public class CacheWarmer implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) {
        log.info("Warming up cache...");
        cacheService.warmUp();
    }
}
```

### Pattern 64.5: Bean Scopes
| Scope | Lifecycle | Use Case |
|-------|-----------|----------|
| `singleton` (default) | One per ApplicationContext | Stateless services |
| `prototype` | New instance per injection | Stateful, non-shared objects |
| `request` | One per HTTP request | Request-scoped data |
| `session` | One per HTTP session | Session-scoped data |

- Inject prototype into singleton: use `@Scope(proxyMode = ScopedProxyMode.TARGET_CLASS)`
- Or use `ObjectProvider<T>` for lazy/optional resolution

### Pattern 64.6: Conditional Beans as Feature Toggles
```java
@Bean
@ConditionalOnProperty(name = "feature.new-search", havingValue = "true")
public SearchService newSearchService() { return new ElasticSearchService(); }

@Bean
@ConditionalOnProperty(name = "feature.new-search", havingValue = "false", matchIfMissing = true)
public SearchService legacySearchService() { return new SqlSearchService(); }
```

### Pattern 64.7: Configuration Metadata for IDE Support
```json
// META-INF/additional-spring-configuration-metadata.json
{
  "properties": [{
    "name": "app.mail.host",
    "type": "java.lang.String",
    "description": "SMTP server hostname"
  }]
}
```
- Enables IDE autocomplete for custom properties
- `spring-boot-configuration-processor` generates metadata from `@ConfigurationProperties`

## REJECTED Patterns
- ❌ `@Value("${...}")` for complex config — use `@ConfigurationProperties`
- ❌ Hardcoded config values in Java code — externalize to YAML
- ❌ `@Autowired` on `@ConfigurationProperties` class
- ❌ Mutable `@ConfigurationProperties` with setters — use records or `@ConstructorBinding`

## Related Specialists
- `di/java-di-specialist.md` — @Autowired, @Qualifier (22.x)
- `infrastructure/spring-profiles-specialist.md` — YAML profile management (75.x)
- `cross-cutting/spring-aop-specialist.md` — Cross-cutting via aspects (65.x)
