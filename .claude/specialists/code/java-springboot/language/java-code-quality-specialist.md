# Java Code Quality Specialist — Generic
# Javaコード品質スペシャリスト — 汎用
# Chuyên Gia Chất Lượng Code Java — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 62.1–62.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | See Pattern 62.1 |
| **Base Class** | N/A |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Naming conventions, clean code practices, static analysis configuration, and code review standards for any Java/Spring Boot project.

## Patterns

### Pattern 62.1: Naming Conventions
| Element | Convention | Example | Anti-pattern |
|---------|-----------|---------|-------------|
| Class | PascalCase noun | `OrderService` | `OrderMgr`, `Helper` |
| Interface | PascalCase noun | `PaymentGateway` | `IPaymentGateway` |
| Method | camelCase verb | `calculateTotal()` | `total()`, `calc()` |
| Boolean method | `is/has/can/should` | `isActive()` | `active()` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` | `maxRetryCount` |
| Package | lowercase only | `com.example.order` | `com.example.Order` |
| Test method | `should_X_When_Y` | `should_ThrowException_When_InvalidInput` | `test1()` |

- Avoid vague names: `Manager`, `Helper`, `Utils`, `data`, `info`, `temp`
- No single-letter variables except loop counters and lambdas
- No Hungarian notation (`strName`, `iCount`)

### Pattern 62.2: Method Design
- Methods under **20 lines** — extract if longer
- Maximum **3 parameters** — use parameter object beyond that
- Guard clauses (early return) for edge cases — avoid deep nesting
- No magic numbers/strings — extract to named constants or enums
```java
// ❌ Magic number
if (retryCount > 3) { ... }

// ✅ Named constant
private static final int MAX_RETRIES = 3;
if (retryCount > MAX_RETRIES) { ... }
```

### Pattern 62.3: Clean Code Anti-Patterns
| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **God Class** | 500+ lines, 10+ dependencies | Split by responsibility |
| **Feature Envy** | Method uses another class's data more than its own | Move method to that class |
| **Long Parameter List** | 4+ parameters | Create parameter object (record) |
| **Primitive Obsession** | `String email`, `String phone` everywhere | Create `Email`, `Phone` value objects |
| **Dead Code** | Unused imports, unreachable branches, commented code | Delete it |
| **Shotgun Surgery** | One change requires editing 5+ files | Extract shared logic |

### Pattern 62.4: Static Analysis Tools
```xml
<!-- pom.xml — quality plugins -->
<plugin>
    <groupId>com.diffplug.spotless</groupId> <!-- code formatting -->
    <artifactId>spotless-maven-plugin</artifactId>
</plugin>
<plugin>
    <groupId>org.apache.maven.plugins</groupId> <!-- style rules -->
    <artifactId>maven-checkstyle-plugin</artifactId>
</plugin>
<plugin>
    <groupId>org.apache.maven.plugins</groupId> <!-- bug detection -->
    <artifactId>maven-pmd-plugin</artifactId>
</plugin>
```
- SonarQube for quality gate (coverage, duplication, complexity)
- Run in CI pipeline — fail build on quality gate failure

### Pattern 62.5: Code Review Checklist
1. **Security**: SQL injection? XSS? Hardcoded secrets? Input validation?
2. **Performance**: N+1 queries? Unbounded collections? Blocking in reactive?
3. **Readability**: Clear names? Small methods? No dead code?
4. **Testing**: Tests for new code? Edge cases covered? Assertions meaningful?
5. **Error handling**: Exceptions caught at right level? No swallowed exceptions?
6. **SOLID**: Single responsibility? Depends on abstractions?

### Pattern 62.6: Javadoc Standards
- **Public API**: Javadoc mandatory on all public classes and methods
- **Internal code**: Comments only where logic is non-obvious
- Use `@param`, `@return`, `@throws` — not prose descriptions
- No trivial comments: `/** Gets the name. */ getName()` — adds nothing
```java
/**
 * Calculates compound interest with monthly compounding.
 *
 * @param principal initial amount, must be positive
 * @param rate annual interest rate (e.g., 0.05 for 5%)
 * @param months number of compounding periods
 * @return total amount after compounding
 * @throws IllegalArgumentException if principal or rate is negative
 */
public BigDecimal calculateCompoundInterest(BigDecimal principal, double rate, int months) { ... }
```

## REJECTED Patterns
- ❌ Vague class names: `Utils`, `Helper`, `Manager`, `Handler` (as catch-all)
- ❌ Commented-out code in production — delete, use git history
- ❌ `System.out.println` — use SLF4J
- ❌ Swallowing exceptions: `catch (Exception e) { }` — at minimum log
- ❌ `@SuppressWarnings` without justification comment

## Related Specialists
- `architecture/backend-clean-architecture-specialist.md` — Project-specific naming (0.x)
- `language/java-fundamentals-specialist.md` — SOLID principles (60.x)
- `devops/maven-advanced-specialist.md` — Build quality plugins (93.x)
