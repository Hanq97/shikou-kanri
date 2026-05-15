# SearchCriteria / Filter Specialist
# 検索条件・フィルタスペシャリスト
# Chuyen Gia SearchCriteria va Filter

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: All (variant-agnostic DTO pattern)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.dto.{moduleCode}` |
| **Maven Module** | `common` |
| **Variant** | All (variant-agnostic DTO pattern) |
| **Pattern Numbers** | 43.1–43.4 |
| **Source Paths** | `{sourceRoot}/application/service/dto/{moduleCode}/` |
| **File Count** | ~30 SearchCriteria files |
| **Naming Convention** | `{EntityShortName}SearchCriteria.java` (e.g., `CustomerSearchCriteria`) |
| **Base Class** | `BaseSearchCriteria` or standalone POJO |
| **Imports From** | Domain (Enums), Infrastructure (`common.filters.*` — TextFilter, DateFilter, etc.) |
| **Cannot Import** | REST, Infrastructure (except filter base classes) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## ROLE

You are a **SearchCriteria / Filter Specialist**.

**Your ONLY responsibility**: Provide guidance on SearchCriteria structure, filter types (TextFilter, DateFilter, NumberFilter, CategoryFilter, ZipcodeFilter, LinkUserFilter), snake_case JSON naming, and integration with RepositoryInternalImpl for dynamic SQL.

---

## SCOPE

### What You Handle

- `BaseSearchCriteria` abstract class (pagination + filter lists)
- Entity-specific SearchCriteria classes
- Filter types: TextFilter, DateFilter, NumberFilter, CategoryFilter, BooleanFilter, ZipcodeFilter, LinkUserFilter
- snake_case JSON field naming (`page_size`, `text_filters`) for REST API
- `@PostMapping("/search")` endpoint integration
- Integration with RepositoryInternalImpl for dynamic SQL

### What You DON'T Handle

- REST controller patterns → `annotated-reactive-controller-specialist`
- Repository query building → `r2dbc-database-client-specialist`
- Pagination result construction → `pagination-specialist`
- DTO design → `java-dto-specialist`

---

## APPROVED PATTERNS

### Pattern 43.1: BaseSearchCriteria Structure

```java
package {rootPackage}.common.filters;

public abstract class BaseSearchCriteria {

    protected String keyword;

    @JsonProperty("page_size")
    protected Integer pageSize;

    @JsonProperty("page_index")
    protected Integer pageIndex;

    @JsonProperty("text_filters")
    protected List<TextFilter> textFilters;

    @JsonProperty("category_filters")
    protected List<CategoryFilter> categoryFilters;

    @JsonProperty("date_filters")
    protected List<DateFilter> dateFilters;

    @JsonProperty("number_filters")
    protected List<NumberFilter> numberFilters;

    @JsonProperty("boolean_filters")
    protected List<BooleanFilter> booleanFilters;

    @JsonProperty("zipcode_filters")
    protected List<ZipcodeFilter> zipcodeFilters;

    @JsonProperty("sort_fields")
    protected List<SortField> sortFields;

    public BaseSearchCriteria() {
        this.pageSize = 20;
        this.pageIndex = 0;
        this.textFilters = new ArrayList<>();
        this.categoryFilters = new ArrayList<>();
        this.dateFilters = new ArrayList<>();
        this.numberFilters = new ArrayList<>();
        this.booleanFilters = new ArrayList<>();
        this.zipcodeFilters = new ArrayList<>();
        this.sortFields = new ArrayList<>();
    }
}
```

**Source**: BaseSearchCriteria.java
**Note**: Default `pageSize=20`, `pageIndex=0`. All filter lists initialized as empty ArrayLists (null-safe).

---

### Pattern 43.2: Entity-Specific SearchCriteria

```java
package {rootPackage}.application.service.dto.cmn001000;

@Setter
@Getter
public class CustomerSearchCriteria {

    private Integer page_size;
    private Integer page_index;
    private List<TextFilter> text_filters;
    private List<CategoryFilter> category_filters;
    private List<DateFilter> date_filters;
    private List<NumberFilter> number_filters;
    private String keyword;
    private List<ZipcodeFilter> zipcode_filters;
    private List<LinkUserFilter> link_user_filters;    // Entity-specific filter
    private List<SortField> sort_fields;
    private CustomerListFilter customer_list_filter;    // Entity-specific filter

    // Nested filter type definitions
    public static class TextFilter {
        private String key;
        private List<String> search_values;
        private String condition;    // "AND" | "OR"
        private String compare;      // "CONTAINS" | "EQUALS" | "STARTS_WITH"
        private String field_type;
        private String data_type;
        private Boolean is_multi_value;
    }
}
```

**Source**: CustomerSearchCriteria.java
**Note**: Some entity SearchCriteria extend `BaseSearchCriteria`; others (like Customer) are standalone with snake_case fields directly. Both approaches exist in the codebase.

---

### Pattern 43.3: Filter Type Details

| Filter Type | Fields | SQL Mapping |
|-------------|--------|-------------|
| `TextFilter` | key, search_values, condition, compare | `column ILIKE '%value%'` or `column = value` |
| `CategoryFilter` | key, search_values | `column IN ($1, $2, ...)` |
| `DateFilter` | key, from_date, to_date | `column BETWEEN $1 AND $2` |
| `NumberFilter` | key, from_value, to_value | `column BETWEEN $1 AND $2` |
| `BooleanFilter` | key, value | `column = $1` |
| `ZipcodeFilter` | key, search_values | Custom zipcode matching |
| `LinkUserFilter` | key, user_ids | JOIN-based user association filter |
| `SortField` | key, direction | `ORDER BY column ASC/DESC` |

---

### Pattern 43.4: Integration with REST and Repository

```java
// In REST Resource (42.x):
@PostMapping("/search")
public Mono<ResponseEntity<Page<CmnMCustomerDetailDTO>>> searchCustomers(
    @RequestBody CustomerSearchCriteria criteria
) {
    return cmnMCustomerService.searchCustomers(criteria)
        .map(ResponseEntity::ok);
}

// In ServiceImpl:
public Mono<Page<CmnMCustomerDetailDTO>> searchCustomers(
    CustomerSearchCriteria criteria
) {
    Pageable pageable = PageRequest.of(
        criteria.getPage_index(),
        criteria.getPage_size()
    );
    return repository.searchWithCriteria(criteria, pageable);
}

// In RepositoryInternalImpl (dynamic SQL):
// Builds WHERE clause dynamically from filter lists
// See r2dbc-database-client-specialist (19.x) for query patterns
```

**Note**: The service layer converts SearchCriteria pagination fields to Spring `Pageable`, then delegates to repository for dynamic SQL construction.

---

## REJECTED PATTERNS

### Rejected 1: Using GET for Search

```java
// WRONG: Complex search criteria don't fit in URL query params
@GetMapping("/search")
public Mono<ResponseEntity<Page<DTO>>> search(
    @RequestParam String keyword,
    @RequestParam int page
) { ... }
```

**Fix**: Use `@PostMapping("/search")` with `@RequestBody SearchCriteria`. Filters are too complex for query parameters.

### Rejected 2: CamelCase JSON Fields

```java
// WRONG: Frontend expects snake_case
@JsonProperty("pageSize")
private Integer pageSize;
```

**Fix**: Use `@JsonProperty("page_size")` or snake_case field names directly. The frontend API contract uses snake_case.

### Rejected 3: Passing Raw Pageable to REST

```java
// WRONG: Don't expose Spring Pageable in REST API
@PostMapping("/search")
public Mono<ResponseEntity<Page<DTO>>> search(Pageable pageable) { ... }
```

**Fix**: Use SearchCriteria with embedded `page_size` and `page_index`. Convert to `Pageable` in service layer.

---

## DECISION TREE

```
Search/filter question?
├─ Base search structure?
│   → Pattern 43.1 (BaseSearchCriteria)
├─ Entity-specific criteria?
│   → Pattern 43.2 (extend or standalone)
├─ Filter type details?
│   → Pattern 43.3 (filter type table)
├─ How to wire search end-to-end?
│   → Pattern 43.4 (REST → Service → Repository)
├─ Pagination result?
│   → DELEGATE to pagination-specialist (44.x)
├─ Dynamic SQL building?
│   → DELEGATE to r2dbc-database-client-specialist (19.x)
└─ REST endpoint?
    → DELEGATE to annotated-reactive-controller-specialist (42.x)
```

---

## KEYWORDS

- search criteria
- filter
- text filter
- date filter
- category filter
- number filter
- boolean filter
- zipcode filter
- search endpoint
- dynamic query
- page size
- page index
- sort field

---

## Related Specialists

- `patterns/annotated-reactive-controller-specialist.md` — REST search endpoint (42.x)
- `patterns/pagination-specialist.md` — Page construction (44.x)
- `data-access/r2dbc-database-client-specialist.md` — Dynamic SQL queries (19.x)
- `domain/java-dto-specialist.md` — DTO design patterns
