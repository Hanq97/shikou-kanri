# Maven Advanced Specialist — Generic
# Maven上級スペシャリスト — 汎用
# Chuyên Gia Maven Nâng Cao — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Build |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 93.1–93.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `pom.xml` |
| **Base Class** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Annotation processor ordering, dependency conflict resolution, vulnerability scanning, build optimization, and scope correctness.

## Patterns

### Pattern 93.1: Annotation Processor Ordering
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <parameters>true</parameters> <!-- Enables -parameters flag for Spring -->
        <annotationProcessorPaths>
            <!-- ORDER MATTERS: Lombok MUST come before MapStruct -->
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>${lombok.version}</version>
            </path>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok-mapstruct-binding</artifactId>
                <version>0.2.0</version>
            </path>
            <path>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct-processor</artifactId>
                <version>${mapstruct.version}</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```
- `-parameters` flag: enables parameter name reflection (Spring `@RequestParam`, `@PathVariable`)
- Lombok generates getters/setters → MapStruct reads them → ORDER critical

### Pattern 93.2: Dependency Conflict Resolution
```bash
# Diagnose conflicts
mvn dependency:tree -Dincludes=com.fasterxml.jackson
mvn dependency:analyze  # find unused/undeclared deps

# Find convergence issues
mvn enforcer:enforce
```
```xml
<!-- maven-enforcer-plugin -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <dependencyConvergence/> <!-- fail if version conflicts -->
                    <requireMavenVersion><version>[3.8,)</version></requireMavenVersion>
                    <requireJavaVersion><version>[21,)</version></requireJavaVersion>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```
- `<exclusions>` to resolve conflicts: exclude transitive dep, declare explicit version
- BOM import order matters: first BOM wins for version management

### Pattern 93.3: Vulnerability Scanning
```xml
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS> <!-- fail on HIGH+ -->
        <suppressionFile>owasp-suppressions.xml</suppressionFile>
    </configuration>
</plugin>
```
```bash
mvn dependency-check:check  # scan for known CVEs
```
- Run in CI pipeline — block merge if CVSS ≥7 (HIGH)
- Suppress false positives in `owasp-suppressions.xml` with justification
- Alternative: Snyk CLI (`snyk test --maven`)

### Pattern 93.4: Build Optimization
```bash
# Parallel build — use all cores
mvn -T 1C clean verify

# Skip tests during rapid iteration (NOT in CI)
mvn -DskipTests package

# Maven Daemon — persistent JVM, faster startup
mvnd clean verify
```
- `-T 1C` — 1 thread per CPU core, parallel module builds
- Maven Daemon (`mvnd`): 2-10x faster on multi-module projects
- Build cache: `org.apache.maven.extensions:maven-build-cache-extension`

### Pattern 93.5: Scope Correctness
| Scope | When | Example |
|-------|------|---------|
| `compile` (default) | Runtime + compile | Spring Boot starters |
| `provided` | Container supplies at runtime | `servlet-api`, `lombok` |
| `runtime` | Not needed at compile time | JDBC drivers, SLF4J implementations |
| `test` | Test only | JUnit, Mockito, Testcontainers |
| `import` | BOM import only | Spring Boot BOM |

```xml
<!-- ❌ Wrong: Lombok at compile scope (generates at compile, not needed at runtime) -->
<dependency><groupId>org.projectlombok</groupId><scope>compile</scope></dependency>

<!-- ✅ Correct -->
<dependency><groupId>org.projectlombok</groupId><scope>provided</scope></dependency>
```
- NEVER use `LATEST` or `RELEASE` as version — pin all versions
- Use `${property}` for version management across modules

### Pattern 93.6: Effective POM Debugging
```bash
# See final merged POM (all parent/BOM resolution applied)
mvn help:effective-pom -Doutput=effective-pom.xml

# See effective settings
mvn help:effective-settings

# Understand version mediation (why this version was chosen)
mvn dependency:tree -Dverbose
```
- Maven nearest-wins strategy: closest declaration in dependency tree wins
- BOM `<dependencyManagement>` overrides transitive versions

## REJECTED Patterns
- ❌ `LATEST` or `RELEASE` as dependency version
- ❌ Ignoring dependency convergence warnings
- ❌ `-DskipTests` in CI pipeline
- ❌ Not pinning plugin versions (causes non-reproducible builds)
- ❌ `<scope>system</scope>` — use repository instead

## Related Specialists
- `infrastructure/maven-multimodule-specialist.md` — Module structure (76.x)
- `language/java-code-quality-specialist.md` — Quality plugins (62.4)
