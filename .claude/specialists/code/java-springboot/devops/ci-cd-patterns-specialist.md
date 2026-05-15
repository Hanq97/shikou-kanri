# CI/CD Patterns Specialist — Generic
# CI/CDパターンスペシャリスト — 汎用
# Chuyên Gia CI/CD — Dùng Chung

**Stack**: Java 21+ / Spring Boot 3.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Package** | N/A (generic) |
| **Maven Module** | N/A |
| **Variant** | ALL |
| **Pattern Numbers** | 95.1–95.6 |
| **Source Paths** | N/A |
| **File Count** | N/A |
| **Naming Convention** | `.gitlab-ci.yml`, `.github/workflows/*.yml` |
| **Base Class** | N/A |
| **Imports From** | N/A |
| **Cannot Import** | N/A |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
CI/CD pipeline design, environment promotion, feature flags, database migration in CI, and rollback strategies for Spring Boot applications.

## Patterns

### Pattern 95.1: Multi-Stage Pipeline
```yaml
# .gitlab-ci.yml
stages: [lint, test, build, security, deploy]

lint:
  stage: lint
  script: mvn spotless:check checkstyle:check

test:
  stage: test
  script: mvn verify -T 1C
  artifacts:
    reports:
      junit: "**/target/surefire-reports/*.xml"
      coverage_report:
        coverage_format: cobertura
        path: "**/target/site/jacoco/jacoco.xml"

build:
  stage: build
  script: mvn package -DskipTests jib:build -Dimage=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

security:
  stage: security
  script: mvn dependency-check:check -DfailBuildOnCVSS=7

deploy-staging:
  stage: deploy
  script: kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  environment: staging
  when: manual
```
- Parallel stages where possible (lint + test can run simultaneously)
- Artifacts: JUnit reports, coverage, container image

### Pattern 95.2: Environment Promotion
```
dev → staging → production
 │       │          │
 │       │          └── Manual approval required
 │       └── Auto-deploy on merge to main
 └── Auto-deploy on push to feature branch
```
- Each environment has own `application-{env}.yml`
- Staging mirrors production config (same DB type, same infra)
- Production deploy requires explicit approval gate

### Pattern 95.3: Feature Flags
```java
// Togglz integration
@Bean
public FeatureProvider featureProvider() {
    return new EnumBasedFeatureProvider(AppFeatures.class);
}

public enum AppFeatures implements Feature {
    @Label("New checkout flow")
    NEW_CHECKOUT,

    @Label("AI recommendations")
    AI_RECOMMENDATIONS;
}

// Usage in service
if (featureManager.isActive(AppFeatures.NEW_CHECKOUT)) {
    return newCheckoutService.process(cart);
} else {
    return legacyCheckoutService.process(cart);
}
```
- Toggle features without deploy — useful for gradual rollout
- Alternatives: FF4j, LaunchDarkly, Spring Boot `@ConditionalOnProperty`
- Clean up: remove flag + old code path after 100% rollout

### Pattern 95.4: Database Migration in CI
```yaml
# Validate migration before deploy
migrate-check:
  stage: test
  script:
    - mvn flyway:validate  # or liquibase:validate
    - mvn flyway:info      # show pending migrations
  rules:
    - changes: ["**/db/migration/**", "**/liquibase/**"]
```
- Validate migrations in CI BEFORE deployment
- Never auto-apply migrations in production without review
- Backward-compatible migrations: add column → deploy code → remove old column

### Pattern 95.5: Rollback Strategies
| Strategy | How | Downtime | Complexity |
|----------|-----|----------|------------|
| **Blue/Green** | Two identical envs, swap traffic | Zero | High (2x infra) |
| **Canary** | Route % of traffic to new version | Zero | Medium |
| **Rolling** | Replace instances one by one | Zero | Low (K8s default) |
| **Recreate** | Stop old, start new | Yes | Lowest |

- Database rollback: NEVER `DROP COLUMN` in same release as code change
- Expand-contract pattern: (1) add new column → (2) deploy code using both → (3) remove old column

### Pattern 95.6: Build Artifact Management
```xml
<!-- Version: use CI commit SHA for traceability -->
<version>${revision}</version>  <!-- set via -Drevision=$CI_COMMIT_SHA -->
```
- Container tags: `$CI_COMMIT_SHA` (not `latest`) — immutable, traceable
- Maven: SNAPSHOT for development, RELEASE for production
- Artifact retention: keep last N releases, delete older

## REJECTED Patterns
- ❌ `latest` tag for production container images
- ❌ `-DskipTests` in CI pipeline
- ❌ Auto-deploy to production without approval
- ❌ Database `DROP COLUMN` in same release as code change
- ❌ Manual artifact versioning — automate via CI

## Related Specialists
- `infrastructure/docker-specialist.md` — Container build (70.x)
- `infrastructure/docker-compose-specialist.md` — Local multi-service (71.x)
- `devops/maven-advanced-specialist.md` — Build optimization (93.x)
