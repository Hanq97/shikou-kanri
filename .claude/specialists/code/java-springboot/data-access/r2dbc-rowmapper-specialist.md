# R2DBC RowMapper Specialist
# R2DBC RowMapperスペシャリスト
# Chuyen Gia RowMapper R2DBC

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.repository.rowmapper.{moduleCode}` |
| **Maven Module** | `common` |
| **Variant** | Reactive (R2DBC) |
| **Pattern Numbers** | 46.1–46.5 |
| **Source Paths** | `{sourceRoot}/application/repository/rowmapper/{moduleCode}/` |
| **File Count** | 100 RowMapper + 88 SqlHelper files |
| **Naming Convention** | `{Entity}RowMapper.java`, `{Entity}SqlHelper.java` |
| **Base Class** | `implements BiFunction<Row, String, {Entity}>` |
| **Imports From** | Domain (Entities) |
| **Cannot Import** | Application (Services), Infrastructure, REST |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | dataAccess, asyncPattern |

---

## ROLE

You are an **R2DBC RowMapper Specialist**.

**Your ONLY responsibility**: Provide guidance on `BiFunction<Row, String, Entity>` RowMapper patterns, `ColumnConverter` helper usage, `SqlHelper` static column lists, `@Service` annotation on RowMappers, and integration with `RepositoryInternalImpl`.

---

## SCOPE

### What You Handle

- `BiFunction<Row, String, Entity>` interface (R2DBC RowMapper contract)
- `@Service` annotation on RowMapper (Spring-managed beans)
- `ColumnConverter` helper usage for type-safe column extraction
- `SqlHelper` static utility for SELECT column lists
- Integration with `RepositoryInternalImpl` and `DatabaseClient`

### What You DON'T Handle

- DatabaseClient query execution → `r2dbc-database-client-specialist`
- Entity definition → `java-domain-specialist`
- Repository interface patterns → `java-data-access-specialist`
- Transaction management → `r2dbc-transaction-specialist`

---

## APPROVED PATTERNS

### Pattern 46.1: Standard RowMapper with ColumnConverter

```java
package {rootPackage}.application.repository.rowmapper.cmn001000;

/**
 * Converter between {@link Row} to {@link CmnMCustomer},
 * with proper type conversions.
 */
@Service
public class CmnMCustomerRowMapper
    implements BiFunction<Row, String, CmnMCustomer> {

    private final ColumnConverter converter;

    public CmnMCustomerRowMapper(ColumnConverter converter) {
        this.converter = converter;
    }

    @Override
    public CmnMCustomer apply(Row row, String prefix) {
        CmnMCustomer entity = new CmnMCustomer();
        entity.setId(converter.fromRow(row, prefix + "_customer_id", Long.class));
        entity.setInsDate(converter.fromRow(row, prefix + "_ins_date", Instant.class));
        entity.setInsUserId(converter.fromRow(row, prefix + "_ins_user_id", Long.class));
        entity.setUpdDate(converter.fromRow(row, prefix + "_upd_date", Instant.class));
        entity.setUpdUserId(converter.fromRow(row, prefix + "_upd_user_id", Long.class));
        entity.setDelDate(converter.fromRow(row, prefix + "_del_date", Instant.class));
        entity.setDelUserId(converter.fromRow(row, prefix + "_del_user_id", Long.class));
        entity.setDelFlg(converter.fromRow(row, prefix + "_del_flg", Boolean.class));
        entity.setUpdCnt(converter.fromRow(row, prefix + "_upd_cnt", Integer.class));
        entity.setCustomerCode(converter.fromRow(row, prefix + "_customer_code", String.class));
        entity.setCustomerName(converter.fromRow(row, prefix + "_customer_name", String.class));
        entity.setAdditionData(converter.fromRow(row, prefix + "_addition_data", Json.class));
        return entity;
    }
}
```

**Source**: CmnMCustomerRowMapper.java
**Note**: Every RowMapper follows this exact structure. The `prefix` parameter enables JOINed queries where the same entity appears with different table aliases.

---

### Pattern 46.2: ColumnConverter Helper

```java
// ColumnConverter provides null-safe type conversion from R2DBC Row
converter.fromRow(row, "column_name", Long.class)     // Long (nullable)
converter.fromRow(row, "column_name", String.class)    // String (nullable)
converter.fromRow(row, "column_name", Instant.class)   // Instant (nullable)
converter.fromRow(row, "column_name", Boolean.class)   // Boolean (nullable)
converter.fromRow(row, "column_name", Integer.class)   // Integer (nullable)
converter.fromRow(row, "column_name", Json.class)      // JSONB (PostgreSQL)
```

**Note**: `ColumnConverter` wraps `row.get(column, type)` with null-safety and type conversion. All column names use snake_case matching PostgreSQL columns. The `prefix` is prepended for JOIN disambiguation.

---

### Pattern 46.3: SqlHelper Static Utility

```java
package {rootPackage}.application.repository.cmn001000;

/**
 * Provides SQL column lists and table references for CmnMCustomer queries.
 */
public class CmnMCustomerSqlHelper {

    /**
     * Returns all columns for SELECT with table alias prefix.
     * Used by RepositoryInternalImpl for dynamic queries.
     */
    public static List<Expression> getColumns(Table table, String columnPrefix) {
        List<Expression> columns = new ArrayList<>();
        columns.add(Column.aliased("customer_id", table, columnPrefix + "_customer_id"));
        columns.add(Column.aliased("ins_date", table, columnPrefix + "_ins_date"));
        columns.add(Column.aliased("ins_user_id", table, columnPrefix + "_ins_user_id"));
        columns.add(Column.aliased("upd_date", table, columnPrefix + "_upd_date"));
        columns.add(Column.aliased("upd_user_id", table, columnPrefix + "_upd_user_id"));
        columns.add(Column.aliased("del_date", table, columnPrefix + "_del_date"));
        columns.add(Column.aliased("del_user_id", table, columnPrefix + "_del_user_id"));
        columns.add(Column.aliased("del_flg", table, columnPrefix + "_del_flg"));
        columns.add(Column.aliased("upd_cnt", table, columnPrefix + "_upd_cnt"));
        columns.add(Column.aliased("customer_code", table, columnPrefix + "_customer_code"));
        columns.add(Column.aliased("customer_name", table, columnPrefix + "_customer_name"));
        columns.add(Column.aliased("addition_data", table, columnPrefix + "_addition_data"));
        // ... all entity columns
        return columns;
    }
}
```

**Source**: CmnMCustomerSqlHelper.java
**Note**: `Column.aliased(dbColumn, table, alias)` creates `table.db_column AS alias`. The alias must match the prefix pattern used in the RowMapper.

---

### Pattern 46.4: Integration with RepositoryInternalImpl

```java
class CmnMCustomerRepositoryInternalImpl
    extends SimpleR2dbcRepository<CmnMCustomer, Long> {

    private final DatabaseClient db;
    private final CmnMCustomerRowMapper rowMapper;

    CmnMCustomerRepositoryInternalImpl(
        R2dbcEntityTemplate template,
        CmnMCustomerRowMapper rowMapper, // Injected as @Service bean
        R2dbcEntityOperations entityOperations,
        R2dbcConverter converter
    ) {
        super(/* ... */);
        this.db = template.getDatabaseClient();
        this.rowMapper = rowMapper;
    }

    public Flux<CmnMCustomer> findByCriteria(Criteria criteria) {
        // SqlHelper provides column list, RowMapper maps result
        Table table = Table.aliased("cmn_m_customer", "c");
        List<Expression> columns = CmnMCustomerSqlHelper.getColumns(table, "c");

        return db.sql(/* SELECT columns FROM table WHERE criteria */)
            .map((row, meta) -> rowMapper.apply(row, "c"))
            .all();
    }
}
```

**Note**: RowMapper is injected as a Spring bean (not instantiated manually). The `prefix` argument ("c") matches the table alias used in `SqlHelper.getColumns()`.

---

### Pattern 46.5: Custom RowMapper for JOIN Queries

```java
// For queries joining multiple tables, use multiple RowMappers
public Flux<CustomerWithOwner> findCustomersWithOwner() {
    String sql = """
        SELECT c.customer_id AS c_customer_id, c.customer_name AS c_customer_name,
               u.id AS u_id, u.first_name AS u_first_name
        FROM cmn_m_customer c
        LEFT JOIN cmn_m_user u ON c.ins_user_id = u.id
    """;

    return db.sql(sql)
        .map((row, meta) -> {
            CmnMCustomer customer = customerRowMapper.apply(row, "c");
            CmnMUser user = userRowMapper.apply(row, "u");
            return new CustomerWithOwner(customer, user);
        })
        .all();
}
```

**Note**: The `prefix` parameter enables reuse of the same RowMapper across different queries with different table aliases. `"c"` for customer table, `"u"` for user table.

---

## REJECTED PATTERNS

### Rejected 1: JPA ResultSetExtractor / RowMapper

```java
// WRONG: JDBC RowMapper does NOT work with R2DBC
public class CustomerMapper implements RowMapper<CmnMCustomer> {
    @Override
    public CmnMCustomer mapRow(ResultSet rs, int rowNum) { ... }
}
```

**Fix**: Use `BiFunction<Row, String, Entity>` (R2DBC Row, not JDBC ResultSet).

### Rejected 2: Manual Row.get Without ColumnConverter

```java
// WRONG: Not null-safe, no type conversion
@Override
public CmnMCustomer apply(Row row, String prefix) {
    CmnMCustomer entity = new CmnMCustomer();
    entity.setId(row.get("customer_id", Long.class)); // May throw on null
    entity.setName(row.get("customer_name", String.class));
    return entity;
}
```

**Fix**: Use `ColumnConverter.fromRow()` for null-safe extraction with type conversion.

### Rejected 3: Instantiating RowMapper Manually

```java
// WRONG: RowMapper should be Spring-managed
CmnMCustomerRowMapper mapper = new CmnMCustomerRowMapper(converter);
```

**Fix**: RowMappers are `@Service` beans. Inject them via constructor injection in RepositoryInternalImpl.

---

## DECISION TREE

```
RowMapper question?
├─ How to create a RowMapper?
│   → Pattern 46.1 (BiFunction<Row, String, Entity>)
├─ How to extract columns safely?
│   → Pattern 46.2 (ColumnConverter.fromRow)
├─ How to define column lists?
│   → Pattern 46.3 (SqlHelper.getColumns)
├─ How to use in RepositoryInternalImpl?
│   → Pattern 46.4 (inject @Service bean)
├─ How to handle JOINs?
│   → Pattern 46.5 (prefix-based disambiguation)
├─ DatabaseClient query execution?
│   → DELEGATE to r2dbc-database-client-specialist (19.x)
└─ Entity definition?
    → DELEGATE to java-domain-specialist (1.x)
```

---

## KEYWORDS

- row mapper
- rowmapper
- bifunction
- column converter
- sql helper
- row mapping
- result mapping
- prefix
- table alias
- column aliased

---

## Related Specialists

- `data-access/r2dbc-database-client-specialist.md` — DatabaseClient queries (19.x)
- `data-access/java-data-access-specialist.md` — Repository patterns (17.x)
- `domain/java-domain-specialist.md` — Entity structure
- `architecture/backend-clean-architecture-specialist.md` — File placement rules (0.x)
