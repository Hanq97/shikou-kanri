# Pagination Specialist (R2DBC)
# ページネーションスペシャリスト（R2DBC）
# Chuyen Gia Phan Trang R2DBC

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (R2DBC — no JPA Page support)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (Service + Repository) |
| **Package** | `.application.service.{moduleCode}.impl` (usage), `.application.repository.{moduleCode}` (implementation) |
| **Maven Module** | `common` |
| **Variant** | Reactive (R2DBC — no JPA Page support) |
| **Pattern Numbers** | 44.1–44.5 |
| **Source Paths** | Spread across service + repository layers |
| **File Count** | ~200+ usages |
| **Naming Convention** | N/A (pattern within existing files, not standalone files) |
| **Base Class** | `Pageable`, `Page<T>`, `PageImpl<T>` (Spring Data interfaces) |
| **Imports From** | Domain (Entities), Application (DTOs, Repositories) |
| **Cannot Import** | Infrastructure, REST |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## ROLE

You are a **Pagination Specialist** for R2DBC.

**Your ONLY responsibility**: Provide guidance on reactive pagination using `Pageable`, `PageRequest`, `PageImpl`, R2DBC LIMIT/OFFSET via DatabaseClient, `Mono.zip()` for parallel count+data queries, and integration with SearchCriteria.

---

## SCOPE

### What You Handle

- `Pageable` + `PageRequest.of(pageIndex, pageSize)` in service layer
- `PageImpl<>(list, pageable, total)` construction
- R2DBC LIMIT/OFFSET via DatabaseClient (no native Page in R2DBC)
- `Mono.zip(countQuery, dataQuery)` pattern for parallel count + data
- Integration with SearchCriteria (43.x) for filtered pagination
- Sorting with `Sort.by(direction, field)` in Pageable

### What You DON'T Handle

- SearchCriteria structure → `search-criteria-specialist`
- DatabaseClient query building → `r2dbc-database-client-specialist`
- REST endpoint for search → `annotated-reactive-controller-specialist`
- JPA-based pagination → NOT applicable (project uses R2DBC)

---

## APPROVED PATTERNS

### Pattern 44.1: Pageable Construction from SearchCriteria

```java
// In ServiceImpl — convert SearchCriteria to Pageable
public Mono<Page<CmnMCustomerDetailDTO>> searchCustomers(
    CustomerSearchCriteria criteria
) {
    int pageIndex = criteria.getPage_index() != null ? criteria.getPage_index() : 0;
    int pageSize = criteria.getPage_size() != null ? criteria.getPage_size() : 20;
    Pageable pageable = PageRequest.of(pageIndex, pageSize);

    return repository.searchWithCriteria(criteria, pageable);
}
```

**Note**: Always provide defaults for pageIndex (0) and pageSize (20) to prevent NullPointerException.

---

### Pattern 44.2: Mono.zip for Parallel Count + Data Queries

```java
// In RepositoryInternalImpl — execute count and data queries in parallel
public Mono<Page<EntityDTO>> searchWithCriteria(
    SearchCriteria criteria, Pageable pageable
) {
    String countSql = "SELECT COUNT(*) FROM cmn_m_customer WHERE del_flg = false";
    String dataSql = """
        SELECT * FROM cmn_m_customer
        WHERE del_flg = false
        ORDER BY upd_date DESC
        LIMIT $1 OFFSET $2
    """;

    Mono<Long> countMono = databaseClient.sql(countSql)
        .map((row, meta) -> row.get(0, Long.class))
        .one()
        .defaultIfEmpty(0L);

    Mono<List<EntityDTO>> dataMono = databaseClient.sql(dataSql)
        .bind(0, pageable.getPageSize())
        .bind(1, pageable.getOffset())
        .map((row, meta) -> rowMapper.apply(row, ""))
        .all()
        .map(mapper::toDto)
        .collectList();

    return Mono.zip(countMono, dataMono)
        .map(tuple -> new PageImpl<>(tuple.getT2(), pageable, tuple.getT1()));
}
```

**Note**: `Mono.zip()` executes both queries concurrently. This is the standard R2DBC pagination pattern since R2DBC has no built-in `Page` support.

---

### Pattern 44.3: PageImpl Construction

```java
// Spring Data's PageImpl requires:
// 1. content: List<T> — the data for this page
// 2. pageable: Pageable — the page request
// 3. total: long — total count across all pages

Page<CmnMCustomerDetailDTO> page = new PageImpl<>(
    customerDTOs,                    // List<DTO> — data
    PageRequest.of(0, 20),          // Pageable — request
    150L                             // long — total count
);

// Page provides:
// page.getContent()        → List<DTO>
// page.getTotalElements()  → 150L
// page.getTotalPages()     → 8 (150 / 20 = 7.5 → 8)
// page.getNumber()         → 0 (current page)
// page.getSize()           → 20 (page size)
```

---

### Pattern 44.4: LIMIT/OFFSET in DatabaseClient SQL

```java
// R2DBC does NOT support Pageable natively in queries.
// You must manually add LIMIT/OFFSET to SQL.

String sql = """
    SELECT c.*, u.first_name, u.last_name
    FROM cmn_m_customer c
    LEFT JOIN cmn_m_user u ON c.ins_user_id = u.id
    WHERE c.del_flg = false
    ORDER BY c.upd_date DESC
    LIMIT $1 OFFSET $2
""";

return databaseClient.sql(sql)
    .bind(0, pageable.getPageSize())              // LIMIT
    .bind(1, pageable.getOffset())                // OFFSET = pageIndex * pageSize
    .map((row, meta) -> rowMapper.apply(row, ""))
    .all()
    .collectList();
```

**Note**: `pageable.getOffset()` automatically computes `pageIndex * pageSize`. Use positional binding (`$1`, `$2`) for PostgreSQL.

---

### Pattern 44.5: Integration with SearchCriteria Filters

```java
// Full flow: SearchCriteria → dynamic WHERE → paginated result
public Mono<Page<CmnMCustomerDetailDTO>> searchWithCriteria(
    CustomerSearchCriteria criteria, Pageable pageable
) {
    StringBuilder where = new StringBuilder("WHERE c.del_flg = false");
    List<Object> params = new ArrayList<>();
    int paramIndex = 1;

    // Apply text filters
    if (criteria.getText_filters() != null) {
        for (TextFilter tf : criteria.getText_filters()) {
            where.append(" AND c.").append(tf.getKey())
                 .append(" ILIKE $").append(paramIndex++);
            params.add("%" + tf.getSearch_values().get(0) + "%");
        }
    }

    // Apply category filters
    if (criteria.getCategory_filters() != null) {
        for (CategoryFilter cf : criteria.getCategory_filters()) {
            where.append(" AND c.").append(cf.getKey())
                 .append(" = ANY($").append(paramIndex++).append(")");
            params.add(cf.getSearch_values().toArray(String[]::new));
        }
    }

    // Count + Data in parallel
    String countSql = "SELECT COUNT(*) FROM cmn_m_customer c " + where;
    String dataSql = "SELECT c.* FROM cmn_m_customer c " + where
        + " ORDER BY c.upd_date DESC LIMIT $" + paramIndex++
        + " OFFSET $" + paramIndex;

    // ... bind params and execute with Mono.zip()
}
```

**Note**: This is a simplified example. Actual implementations use `ReactiveQueryBuilder` or `EntityManager` for type-safe dynamic SQL construction. See `r2dbc-database-client-specialist` (19.3) for the `EntityManager.createSelect()` pattern.

---

## REJECTED PATTERNS

### Rejected 1: Using JPA Page Support

```java
// WRONG: R2DBC does NOT have findAll(Pageable) like JPA
public Flux<Entity> findAll(Pageable pageable) {
    return repository.findAll(pageable); // Compilation error in R2DBC
}
```

**Fix**: Use DatabaseClient with manual LIMIT/OFFSET (Pattern 44.4).

### Rejected 2: Sequential Count Then Data

```java
// WRONG: Inefficient — runs queries sequentially
public Mono<Page<DTO>> search(Pageable pageable) {
    return repository.count()
        .flatMap(total -> repository.findAll(pageable)
            .collectList()
            .map(list -> new PageImpl<>(list, pageable, total)));
}
```

**Fix**: Use `Mono.zip()` to run count and data queries concurrently (Pattern 44.2).

### Rejected 3: Collecting All Then Sublist

```java
// WRONG: Loads ALL records into memory then slices
public Mono<Page<DTO>> search(int page, int size) {
    return repository.findAll()
        .collectList()
        .map(all -> {
            int start = page * size;
            List<DTO> sub = all.subList(start, Math.min(start + size, all.size()));
            return new PageImpl<>(sub, PageRequest.of(page, size), all.size());
        });
}
```

**Fix**: Use SQL LIMIT/OFFSET to fetch only the requested page from the database.

---

## DECISION TREE

```
Pagination question?
├─ How to construct Pageable from SearchCriteria?
│   → Pattern 44.1
├─ How to get count + data efficiently?
│   → Pattern 44.2 (Mono.zip)
├─ How to build PageImpl?
│   → Pattern 44.3
├─ How to add LIMIT/OFFSET in R2DBC?
│   → Pattern 44.4
├─ How to combine with filters?
│   → Pattern 44.5
├─ SearchCriteria structure?
│   → DELEGATE to search-criteria-specialist (43.x)
├─ Dynamic SQL query building?
│   → DELEGATE to r2dbc-database-client-specialist (19.x)
└─ JPA/Hibernate pagination?
    → NOT AVAILABLE. Use R2DBC patterns above.
```

---

## KEYWORDS

- pagination
- pageable
- page request
- page impl
- limit offset
- page size
- page index
- mono zip
- count query
- paginated result
- sort
- ordering

---

## Related Specialists

- `patterns/search-criteria-specialist.md` — SearchCriteria (43.x)
- `data-access/r2dbc-database-client-specialist.md` — DatabaseClient queries (19.x)
- `patterns/crud-service-base-specialist.md` — Service findAll(Pageable) (45.x)
- `patterns/annotated-reactive-controller-specialist.md` — REST search endpoint (42.x)
