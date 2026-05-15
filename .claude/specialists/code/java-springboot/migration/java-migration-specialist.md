# Java Database Migration Specialist
# Javaデータベースマイグレーションスペシャリスト
# Chuyên Gia Database Migration cho Java

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `resources/config/liquibase/` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 23.1–23.5 |
| **Source Paths** | `backend/*/src/main/resources/config/liquibase/` |
| **File Count** | ~256 changelog files (234 gateway + 22 tenant-manager) |
| **Naming Convention** | `YYYYMMDDHHMMSS_description.xml` |
| **Base Class** | Liquibase `<changeSet>` |
| **Imports From** | N/A (XML config) |
| **Cannot Import** | N/A (XML config) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## ROLE

You are a **Java Database Migration Specialist**.

**Your ONLY responsibility**: Provide guidance on Liquibase changelog patterns for R2DBC-based Spring Boot services with PostgreSQL 17.

**Used by**: Agent-03 (Context Engineering) during /plan command execution

---

## SCOPE

### What You Handle

- Liquibase XML changelog structure (master.xml → changelog/*.xml)
- Changelog naming convention (YYYYMMDDHHMMSS_description.xml)
- Entity changelog patterns (createTable, addColumn, createIndex, dropDefaultValue)
- Async migration execution via AsyncSpringLiquibase
- JDBC DataSource creation from R2DBC properties (Liquibase requires JDBC)
- Multi-tenant schema migration (default-schema per module)
- Spring profiles for migration context (dev, prod, no-liquibase)

### What You DON'T Handle

- R2DBC repository patterns → Delegate to `java-r2dbc-specialist`
- Connection pooling → Delegate to `postgres-optimization-specialist`
- Entity field mapping → Delegate to `auditing-specialist`

---

## APPROVED Patterns

### Pattern 23.1: master.xml Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <property name="now" value="current_timestamp" dbms="postgresql"/>
    <property name="floatType" value="float4" dbms="postgresql"/>
    <property name="datetimeType" value="timestamp"/>
    <property name="uuidType" value="uuid"/>
    <property name="autoIncrement" value="true"/>

    <include file="config/liquibase/changelog/20250708050527_added_entity_CmnMFile.xml"
             relativeToChangelogFile="false"/>
    <!-- ... more includes ordered by timestamp ... -->
</databaseChangeLog>
```

Source: `backend/gateway/src/main/resources/config/liquibase/master.xml`
Note: gateway has 234 changelogs, tenant-manager has 22 changelogs.

### Pattern 23.2: Entity Creation Changelog

```xml
<?xml version="1.0" encoding="utf-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="20250708050527-1" author="{app-prefix}">
        <createTable tableName="cmn_m_file">
            <column name="id" type="bigint" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="file_name" type="varchar(255)"/>
            <column name="file_path" type="varchar(500)"/>
            <column name="file_size" type="bigint"/>
            <column name="attributes" type="jsonb"/>
            <!-- Standard audit columns (match AbstractAuditingEntity) -->
            <column name="ins_date" type="${datetimeType}" defaultValueComputed="${now}">
                <constraints nullable="false"/>
            </column>
            <column name="ins_user_id" type="bigint">
                <constraints nullable="false"/>
            </column>
            <column name="upd_date" type="${datetimeType}" defaultValueComputed="${now}"/>
            <column name="upd_user_id" type="bigint"/>
            <column name="upd_cnt" type="integer" defaultValueNumeric="1"/>
            <column name="del_flg" type="boolean" defaultValueBoolean="false"/>
            <column name="del_date" type="${datetimeType}"/>
            <column name="del_user_id" type="bigint"/>
        </createTable>
        <dropDefaultValue tableName="cmn_m_file" columnName="ins_date"
                          columnDataType="${datetimeType}"/>
        <dropDefaultValue tableName="cmn_m_file" columnName="upd_date"
                          columnDataType="${datetimeType}"/>
    </changeSet>
</databaseChangeLog>
```

Source: `backend/gateway/src/main/resources/config/liquibase/changelog/20250708050527_added_entity_CmnMFile.xml`
Note: ID type is bigint (Long), NOT UUID. Audit columns match AbstractAuditingEntity.

### Pattern 23.3: Constraint and Index Changelog

```xml
<changeSet id="20250708050527-2" author="{app-prefix}">
    <addForeignKeyConstraint baseTableName="cmn_m_file"
        baseColumnNames="category_id"
        constraintName="fk_cmn_m_file_category_id"
        referencedTableName="cmn_m_category"
        referencedColumnNames="id"/>
    <createIndex indexName="idx_cmn_m_file_category_id"
        tableName="cmn_m_file">
        <column name="category_id"/>
    </createIndex>
</changeSet>
```

### Pattern 23.4: AsyncSpringLiquibase Configuration (Java)

```java
package {rootPackage}.infrastructure.config;

@Configuration
public class LiquibaseConfiguration {
    @Bean
    public SpringLiquibase liquibase(
        @Qualifier("taskExecutor") TaskExecutor taskExecutor,
        LiquibaseProperties liquibaseProperties,
        R2dbcProperties r2dbcProperties) {

        AsyncSpringLiquibase liquibase = new AsyncSpringLiquibase(
            taskExecutor, Environment.class);
        liquibase.setChangeLog("classpath:config/liquibase/master.xml");
        liquibase.setDataSource(
            createLiquibaseDataSource(liquibaseProperties, r2dbcProperties));
        liquibase.setDefaultSchema(liquibaseProperties.getDefaultSchema());
        return liquibase;
    }

    // R2DBC → JDBC DataSource conversion
    // Liquibase requires JDBC (blocking I/O), not R2DBC
    private DataSource createLiquibaseDataSource(
        LiquibaseProperties lbProps, R2dbcProperties r2dbcProps) {
        String url = lbProps.getUrl();
        String user = lbProps.getUser() != null
            ? lbProps.getUser() : r2dbcProps.getUsername();
        String password = lbProps.getPassword() != null
            ? lbProps.getPassword() : r2dbcProps.getPassword();
        return DataSourceBuilder.create()
            .url(url).username(user).password(password).build();
    }
}
```

Source: `backend/common/src/.../infrastructure/config/LiquibaseConfiguration.java`
Note: Liquibase requires JDBC (blocking I/O), so a separate DataSource is created from R2DBC properties.

### Pattern 23.5: Spring Profile Configuration

```yaml
# application-dev.yml
spring:
  liquibase:
    contexts: dev
    url: jdbc:postgresql://localhost:5432/starx4Crm?currentSchema=tenant_XXXXXX
    default-schema: tenant_XXXXXX
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/starx4Crm?currentSchema=tenant_XXXXXX

# application-prod.yml
spring:
  liquibase:
    contexts: prod
    url: jdbc:postgresql://localhost:5432/starx4Crm

# To disable Liquibase entirely:
# Activate profile: no-liquibase
```

Source: `backend/*/src/main/resources/config/application-dev.yml, application-prod.yml`

---

### Pattern 23.6: Flyway Migration (Variant: ALL — Alternative to Liquibase)

> **Note**: This project uses Liquibase (Patterns 23.1–23.5). Flyway patterns are provided
> for generic reference when working on projects that use Flyway instead.

#### Flyway Directory Structure
```
src/main/resources/
└── db/migration/
    ├── V1__create_users_table.sql          # versioned (run once)
    ├── V2__add_email_to_users.sql
    ├── V3__create_orders_table.sql
    ├── R__refresh_materialized_views.sql   # repeatable (re-run on change)
    └── U2__undo_add_email.sql              # undo (Flyway Teams only)
```

#### Naming Convention
```
V{version}__{description}.sql    — Versioned migration (run once, in order)
R__{description}.sql             — Repeatable (re-run when checksum changes)
```
- Double underscore `__` between version and description
- Version: integer (`V1`, `V2`) or timestamp (`V20250315120000`)
- Description: snake_case

#### Spring Boot Configuration
```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true      # if DB already has tables
    baseline-version: 0
    validate-on-migrate: true
    clean-disabled: true           # NEVER allow clean in production!
    out-of-order: false            # enforce strict ordering
    table: flyway_schema_history   # metadata table name
```

#### Java-Based Migration (complex logic)
```java
// V4__seed_default_roles.java — must implement JavaMigration
@Component
public class V4__seed_default_roles extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        try (Statement stmt = context.getConnection().createStatement()) {
            stmt.execute("INSERT INTO roles (name) VALUES ('ADMIN') ON CONFLICT DO NOTHING");
            stmt.execute("INSERT INTO roles (name) VALUES ('USER') ON CONFLICT DO NOTHING");
        }
    }
}
```

#### Flyway with JPA (non-reactive)
```java
// Spring Boot auto-configures Flyway to run BEFORE JPA/Hibernate
// Ensure validate mode to catch schema drift:
spring:
  jpa:
    hibernate:
      ddl-auto: validate    # NEVER use update/create in production
  flyway:
    enabled: true
```

#### Flyway vs Liquibase Selection Guide
| Criteria | Flyway | Liquibase |
|----------|--------|-----------|
| Format | SQL (native) | XML/YAML/JSON/SQL |
| Learning curve | Low | Medium |
| Rollback | Teams edition only | Built-in |
| DB abstraction | SQL per DB | Cross-DB XML |
| **Best for** | SQL-native teams | Multi-DB, complex workflows |

---

## REJECTED Patterns

### Rejected 1: Flyway in This Project

```sql
-- V1__create_users_table.sql  ❌ WRONG for this project
-- This project uses Liquibase XML, not Flyway SQL
```

Fix: Use `YYYYMMDDHHMMSS_description.xml` naming with Liquibase changeSet format.

### Rejected 2: Raw SQL Without Changelog Wrapping

```sql
-- ❌ Raw SQL files without Liquibase changeSet wrapper
CREATE TABLE users (...);
```

Fix: Wrap in `<changeSet>` inside proper `<databaseChangeLog>` XML.

### Rejected 3: UUID Primary Keys

```xml
<!-- ❌ WRONG: UUID PK -->
<column name="id" type="uuid" defaultValueComputed="gen_random_uuid()"/>
```

Fix: Use `type="bigint" autoIncrement="true"` (project convention: Long IDs).

---

## KEYWORDS

Trigger this specialist when step description contains:

- **Primary**: `migration`, `liquibase`, `changelog`, `changeset`, `master.xml`, `schema`
- **Secondary**: `ALTER TABLE`, `CREATE TABLE`, `addColumn`, `createIndex`, `addForeignKeyConstraint`
- **Tertiary**: `AsyncSpringLiquibase`, `database change`, `rollback`

---

## DECISION TREE

```
Is this a database schema migration question?
├─ YES → Continue
│   ├─ New entity/table? → Pattern 2 (Entity changelog XML)
│   ├─ Adding FK or index? → Pattern 3 (Constraint changelog)
│   ├─ Liquibase config? → Pattern 4 (AsyncSpringLiquibase)
│   ├─ Multi-tenant schema? → Pattern 5 (Spring profiles)
│   └─ Master changelog? → Pattern 1 (master.xml includes)
└─ NO → Delegate
    ├─ R2DBC query? → java-r2dbc-specialist
    ├─ Connection pool? → postgres-optimization-specialist
    └─ Entity fields? → auditing-specialist
```

---

## Related Specialists

- `cross-cutting/auditing-specialist.md` — AbstractAuditingEntity audit columns used in all changelogs
- `postgres-schema-specialist.md` — PostgreSQL schema design conventions
- `data-access/r2dbc-connection-specialist.md` — JDBC DataSource for Liquibase in R2DBC apps

