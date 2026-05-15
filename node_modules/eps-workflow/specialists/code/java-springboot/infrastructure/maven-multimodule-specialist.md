# Maven Multi-Module Build Specialist

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Build |
| **Package** | `pom.xml` (all modules) |
| **Maven Module** | all modules |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 76.1–76.4 |
| **Source Paths** | `backend/pom.xml`, `backend/*/pom.xml` |
| **File Count** | ~11 pom.xml files |
| **Naming Convention** | `pom.xml` |
| **Base Class** | N/A |
| **Imports From** | N/A (build) |
| **Cannot Import** | N/A (build) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: Maven Multi-Module Build System for 10-Module Microservices
**Domain**: Infrastructure / Build
**Pattern Range**: 76.1–76.4

---

## Description

StarX4CRM uses a Maven multi-module reactor with a shared parent POM. The parent
manages all dependency versions, plugin configurations, and build profiles.
Child modules inherit without repeating version declarations. The `jib` plugin
replaces `docker build` for reproducible, daemon-free image creation.

---

## Key Concepts

- **Parent POM**: Spring Boot 3.4.4 as ultimate parent; project parent adds enterprise deps
- **BOM imports**: Spring Cloud 2024.0.1, JHipster 8.10.0 via `<dependencyManagement>`
- **jib plugin**: builds OCI images without Docker daemon — CI-friendly
- **git-commit-id**: embeds commit SHA in `info.git.*` actuator endpoint
- **ArchUnit**: enforces architectural rules (e.g., domain must not import infrastructure)
- **Profiles**: `prod`, `api-docs`, `tls`, `zipkin` — activated via `-P` or env

---

## Pattern 76.1 — Root pom.xml Structure

```xml
<project>
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.4</version>
  </parent>

  <groupId>{rootPackage}</groupId>
  <artifactId>starx-4-crm</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>pom</packaging>

  <modules>
    <module>common</module>
    <module>gateway</module>
    <module>core-manager</module>
    <module>sfa-manager</module>
    <module>tenant-manager</module>
    <module>page-builder</module>
    <module>batch-common</module>
    <module>batch-core</module>
    <module>batch-tenant</module>
    <module>batch-workflow</module>
  </modules>

  <properties>
    <java.version>21</java.version>
    <spring-cloud.version>2024.0.1</spring-cloud.version>
    <jhipster-dependencies.version>8.10.0</jhipster-dependencies.version>
    <jib-maven-plugin.version>3.4.5</jib-maven-plugin.version>
    <archunit.version>1.4.0</archunit.version>
    <maven.compiler.release>21</maven.compiler.release>
  </properties>
</project>
```

---

## Pattern 76.2 — Dependency Management (BOM Imports)

```xml
<dependencyManagement>
  <dependencies>
    <!-- Spring Cloud BOM -->
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-dependencies</artifactId>
      <version>${spring-cloud.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>

    <!-- JHipster BOM -->
    <dependency>
      <groupId>tech.jhipster</groupId>
      <artifactId>jhipster-dependencies</artifactId>
      <version>${jhipster-dependencies.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>

    <!-- Internal common library -->
    <dependency>
      <groupId>{rootPackage}</groupId>
      <artifactId>common</artifactId>
      <version>${project.version}</version>
    </dependency>
  </dependencies>
</dependencyManagement>
```

---

## Pattern 76.3 — Plugin Configuration

```xml
<build>
  <plugins>
    <!-- Container image (no Docker daemon required) -->
    <plugin>
      <groupId>com.google.cloud.tools</groupId>
      <artifactId>jib-maven-plugin</artifactId>
      <version>${jib-maven-plugin.version}</version>
      <configuration>
        <from>
          <image>eclipse-temurin:21</image>
        </from>
        <to>
          <image>{app-prefix}/${project.artifactId}:${project.version}</image>
          <tags><tag>latest</tag></tags>
        </to>
        <container>
          <jvmFlags>
            <jvmFlag>-Xmx512m</jvmFlag>
            <jvmFlag>-Xms256m</jvmFlag>
            <jvmFlag>-XX:+AlwaysPreTouch</jvmFlag>
            <jvmFlag>-Djava.security.egd=file:/dev/./urandom</jvmFlag>
          </jvmFlags>
          <user>1001:1001</user>
        </container>
      </configuration>
    </plugin>

    <!-- Embed git metadata -->
    <plugin>
      <groupId>io.github.git-commit-id</groupId>
      <artifactId>git-commit-id-maven-plugin</artifactId>
      <executions>
        <execution>
          <goals><goal>revision</goal></goals>
        </execution>
      </executions>
      <configuration>
        <failOnNoGitDirectory>false</failOnNoGitDirectory>
        <generateGitPropertiesFile>true</generateGitPropertiesFile>
      </configuration>
    </plugin>

    <!-- Code style -->
    <plugin>
      <groupId>com.diffplug.spotless</groupId>
      <artifactId>spotless-maven-plugin</artifactId>
      <configuration>
        <java>
          <googleJavaFormat/>
          <removeUnusedImports/>
        </java>
      </configuration>
    </plugin>
  </plugins>
</build>
```

---

## Pattern 76.4 — Build Profiles

```xml
<profiles>
  <profile>
    <id>prod</id>
    <properties>
      <spring.profiles.active>prod</spring.profiles.active>
    </properties>
    <dependencies>
      <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
      </dependency>
    </dependencies>
  </profile>

  <profile>
    <id>api-docs</id>
    <dependencies>
      <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
      </dependency>
    </dependencies>
  </profile>

  <profile>
    <id>zipkin</id>
    <dependencies>
      <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-tracing-bridge-otel</artifactId>
      </dependency>
    </dependencies>
  </profile>
</profiles>
```

### ArchUnit Example (common test)

```java
@AnalyzeClasses(packages = "{rootPackage}.coremanager")
class ArchitectureTest {
    @ArchTest
    static final ArchRule domainMustNotDependOnInfra =
        noClasses().that().resideInAPackage("..domain..")
                   .should().dependOnClassesThat()
                   .resideInAPackage("..infrastructure..");
}
```

---

## Anti-Patterns

- DO NOT declare versions in child POMs — all versions go in parent `<dependencyManagement>`
- DO NOT skip `jib:build` in CI — `docker build` requires daemon socket mount
- DO NOT use `SNAPSHOT` versions in prod images — tag with git commit SHA
- DO NOT run `mvn install` in CI — use `mvn package` + `jib:build` instead
- DO NOT omit `<failOnNoGitDirectory>false</failOnNoGitDirectory>` — breaks builds in shallow clones

---

## Related Specialists

- `infrastructure/docker-specialist.md` — jib replaces the Dockerfile for CI builds
- `infrastructure/spring-profiles-specialist.md` — `-Pprod` sets `spring.profiles.active`
- `infrastructure/monitoring-specialist.md` — Prometheus registry pulled in via `prod` profile
