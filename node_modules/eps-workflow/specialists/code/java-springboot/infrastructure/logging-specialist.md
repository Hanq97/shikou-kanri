# Logging Configuration Specialist

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.logging`, `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 74.1–74.3 |
| **Source Paths** | `{sourceRoot}/infrastructure/logging/`, `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~3 logging files |
| **Naming Convention** | `LoggingAspect*.java`, `*Configuration.java` |
| **Base Class** | `LoggingAspectConfiguration` |
| **Imports From** | Application (services for aspects) |
| **Cannot Import** | `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Logback with Spring Profiles, Async Appenders, and Logstash
**Domain**: Infrastructure / Logging
**Pattern Range**: 74.1–74.3

---

## Description

StarX4CRM uses Logback as the logging backend, configured through Spring Boot's
`logback-spring.xml`. Profiles control verbosity: `dev` uses a colorised console
appender while `prod` switches to async file appenders with Logstash JSON encoding
for log aggregation pipelines.

---

## Key Concepts

- **`logback-spring.xml`**: Spring-aware Logback config (supports `<springProfile>`)
- **CRLF converter**: strips carriage returns to prevent log injection
- **Console appender**: colored output for developer workstations
- **Async appender**: wraps file appender to prevent I/O blocking on request threads
- **Logstash encoder**: JSON output compatible with ELK/OpenSearch pipelines
- **Per-package levels**: application code at INFO, noisy frameworks at WARN

---

## Pattern 74.1 — logback-spring.xml Base Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration scan="true" scanPeriod="30 seconds">

  <!-- Custom CRLF converter to prevent log injection -->
  <conversionRule
    conversionWord="crlf"
    converterClass="{rootPackage}.common.logging.CRLFLogConverter"/>

  <property name="APP_NAME"     value="${spring.application.name:-{app-prefix}}"/>
  <property name="LOG_FILE"     value="${LOG_FILE:-logs/${APP_NAME}.log}"/>
  <property name="LOG_LEVEL"    value="${LOG_LEVEL_ROOT:-INFO}"/>

  <!-- ===== DEV PROFILE ===== -->
  <springProfile name="dev">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%clr(%d{yyyy-MM-dd HH:mm:ss.SSS}){faint} %clr(%5p) %clr(${PID:- }){magenta} %clr(---){faint} %clr([%15.15t]){faint} %clr(%-40.40logger{39}){cyan} %clr(:){faint} %crlf(%m)%n%wEx</pattern>
      </encoder>
    </appender>

    <root level="${LOG_LEVEL}">
      <appender-ref ref="CONSOLE"/>
    </root>
  </springProfile>

</configuration>
```

---

## Pattern 74.2 — Production Async File Appender

```xml
  <!-- ===== PROD PROFILE ===== -->
  <springProfile name="prod">
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
      <file>${LOG_FILE}</file>
      <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <fileNamePattern>${LOG_FILE}.%d{yyyy-MM-dd}.gz</fileNamePattern>
        <maxHistory>30</maxHistory>
        <totalSizeCap>3GB</totalSizeCap>
      </rollingPolicy>
      <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <customFields>{"app":"${APP_NAME}","env":"prod"}</customFields>
      </encoder>
    </appender>

    <!-- Async wrapper: queue size 512, never blocks request thread -->
    <appender name="ASYNC_FILE" class="ch.qos.logback.classic.AsyncAppender">
      <appender-ref ref="FILE"/>
      <queueSize>512</queueSize>
      <discardingThreshold>0</discardingThreshold>
      <neverBlock>true</neverBlock>
    </appender>

    <root level="${LOG_LEVEL}">
      <appender-ref ref="ASYNC_FILE"/>
    </root>
  </springProfile>
```

---

## Pattern 74.3 — Per-Package Log Levels

```xml
  <!-- Application code -->
  <logger name="{rootPackage}" level="INFO"/>

  <!-- Noisy framework packages — suppress to WARN -->
  <logger name="org.springframework"            level="WARN"/>
  <logger name="org.hibernate"                  level="WARN"/>
  <logger name="io.r2dbc"                       level="WARN"/>
  <logger name="reactor.netty"                  level="WARN"/>
  <logger name="io.netty"                       level="WARN"/>
  <logger name="org.apache.kafka"               level="WARN"/>
  <logger name="com.netflix"                    level="WARN"/>
  <logger name="org.springdoc"                  level="WARN"/>
  <logger name="liquibase"                      level="INFO"/>

  <!-- SQL debug — enable only temporarily -->
  <!-- <logger name="io.r2dbc.postgresql.QUERY" level="DEBUG"/> -->
```

### CRLFLogConverter.java

```java
package {rootPackage}.common.logging;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

public class CRLFLogConverter extends MessageConverter {
    @Override
    public String convert(ILoggingEvent event) {
        return event.getFormattedMessage()
                    .replace("\r", "\\r")
                    .replace("\n", "\\n");
    }
}
```

---

## Anti-Patterns

- DO NOT use synchronous file appender in prod — blocks request threads under load
- DO NOT set root level to `DEBUG` in prod — extreme volume, PII exposure risk
- DO NOT log raw user input without CRLF stripping — log injection vulnerability
- DO NOT use `<scan="false">` — config changes require restart instead of hot-reload
- DO NOT omit `totalSizeCap` — disk fills silently on long-running instances

---

## Related Specialists

- `infrastructure/spring-profiles-specialist.md` — profile activation controlling appender selection
- `infrastructure/monitoring-specialist.md` — trace IDs injected into MDC by Micrometer tracing
- `infrastructure/docker-specialist.md` — `LOG_FILE` environment variable override per container
