# Elasticsearch Specialist

**Role**: Full-Text Search & Analytics Expert
**Technology Stack**: Spring Data Elasticsearch 5.4, Elasticsearch 8.17
**Integration**: StarX4CRM Core-Manager / SFA-Manager Search Layer
**Version**: Spring Boot 3.4.4, Spring Data Elasticsearch 5.4.x

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Infrastructure |
| **Package** | `{rootPackage}.infrastructure.config`, `{rootPackage}.application.service` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 36.1–36.3 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/ElasticsearchConfiguration.java` |
| **File Count** | ~5 elasticsearch files |
| **Naming Convention** | `Elasticsearch*Configuration.java`, `*SearchService.java` |
| **Base Class** | N/A |
| **Imports From** | Application (Services, DTOs), Domain (Entities) |
| **Cannot Import** | `rest.*` (Presentation layer) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **Spring Data Elasticsearch 5.4**: Repository pattern, ElasticsearchOperations
2. **Custom Converters**: ZonedDateTime, Instant, LocalDate type converters
3. **ElasticsearchConfiguration**: URI-based configurable connection
4. **Index Mapping**: @Document, @Field annotations
5. **Query DSL**: Criteria API, NativeQuery, full-text search

---

## Pattern Index

- [Pattern 36.1: ElasticsearchConfiguration with Configurable URI](#pattern-361-elasticsearchconfiguration-with-configurable-uri)
- [Pattern 36.2: Custom Type Converters](#pattern-362-custom-type-converters)
- [Pattern 36.3: Search Repository & Query Patterns](#pattern-363-search-repository--query-patterns)

---

## Pattern 36.1: ElasticsearchConfiguration with Configurable URI

**Use Case**: Connect to Elasticsearch 8.x with externalized configuration.

```java
// config/ElasticsearchConfig.java
@Configuration
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Value("${spring.elasticsearch.uris:http://localhost:9200}")
    private String elasticsearchUri;

    @Value("${spring.elasticsearch.username:}")
    private String username;

    @Value("${spring.elasticsearch.password:}")
    private String password;

    @Override
    public ClientConfiguration clientConfiguration() {
        var builder = ClientConfiguration.builder()
            .connectedTo(elasticsearchUri.replace("http://", "").replace("https://", ""));

        if (elasticsearchUri.startsWith("https://")) {
            builder.usingSsl();
        }

        if (!username.isEmpty()) {
            builder.withBasicAuth(username, password);
        }

        return builder
            .withConnectTimeout(Duration.ofSeconds(5))
            .withSocketTimeout(Duration.ofSeconds(30))
            .build();
    }

    @Override
    protected List<ElasticsearchCustomConversions.Converter<?, ?>> converters() {
        return List.of(
            new ZonedDateTimeWritingConverter(),
            new ZonedDateTimeReadingConverter(),
            new InstantWritingConverter(),
            new InstantReadingConverter(),
            new LocalDateWritingConverter(),
            new LocalDateReadingConverter()
        );
    }
}
```

```yaml
# application.yml
spring:
  elasticsearch:
    uris: http://192.168.9.50:9200
    username: elastic
    password: ${ELASTICSEARCH_PASSWORD}
    connection-timeout: 5s
    socket-timeout: 30s
```

---

## Pattern 36.2: Custom Type Converters

**Use Case**: Serialize/deserialize Java 8+ date types to/from Elasticsearch string format.

```java
// config/converters/ZonedDateTimeWritingConverter.java
@WritingConverter
public class ZonedDateTimeWritingConverter
        implements Converter<ZonedDateTime, String> {

    private static final DateTimeFormatter FORMATTER =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

    @Override
    public String convert(ZonedDateTime source) {
        return source.format(FORMATTER);
    }
}

// config/converters/ZonedDateTimeReadingConverter.java
@ReadingConverter
public class ZonedDateTimeReadingConverter
        implements Converter<String, ZonedDateTime> {

    @Override
    public ZonedDateTime convert(String source) {
        return ZonedDateTime.parse(source, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }
}

// config/converters/InstantWritingConverter.java
@WritingConverter
public class InstantWritingConverter implements Converter<Instant, String> {
    @Override
    public String convert(Instant source) {
        return source.toString(); // ISO-8601
    }
}

// config/converters/InstantReadingConverter.java
@ReadingConverter
public class InstantReadingConverter implements Converter<String, Instant> {
    @Override
    public Instant convert(String source) {
        return Instant.parse(source);
    }
}

// config/converters/LocalDateWritingConverter.java
@WritingConverter
public class LocalDateWritingConverter implements Converter<LocalDate, String> {
    @Override
    public String convert(LocalDate source) {
        return source.toString(); // yyyy-MM-dd
    }
}

// config/converters/LocalDateReadingConverter.java
@ReadingConverter
public class LocalDateReadingConverter implements Converter<String, LocalDate> {
    @Override
    public LocalDate convert(String source) {
        return LocalDate.parse(source);
    }
}
```

---

## Pattern 36.3: Search Repository & Query Patterns

**Use Case**: Full-text customer search with tenant isolation.

```java
// search/CustomerSearchDocument.java
@Document(indexName = "customers")
@Setting(settingPath = "/es/customer-settings.json")
@Data
public class CustomerSearchDocument {

    @Id
    private String id;

    @Field(type = FieldType.Keyword)
    private String tenantId;

    @Field(type = FieldType.Keyword)
    private String customerId;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String customerName;

    @Field(type = FieldType.Keyword)
    private String customerCode;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String email;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Date, format = DateFormat.date_time)
    private Instant createdAt;

    @Field(type = FieldType.Boolean)
    private Boolean deleted = false;
}

// search/CustomerSearchRepository.java
public interface CustomerSearchRepository
        extends ElasticsearchRepository<CustomerSearchDocument, String> {

    List<CustomerSearchDocument> findByTenantIdAndDeletedFalse(String tenantId);
}

// search/CustomerSearchService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerSearchService {

    private final ElasticsearchOperations esOperations;
    private final CustomerSearchRepository searchRepository;

    /**
     * Full-text search with tenant isolation.
     */
    public SearchHits<CustomerSearchDocument> search(
            String tenantId,
            String keyword,
            PageRequest pageRequest) {

        var query = NativeQuery.builder()
            .withQuery(q -> q
                .bool(b -> b
                    .must(m -> m.term(t -> t.field("tenantId").value(tenantId)))
                    .must(m -> m.term(t -> t.field("deleted").value(false)))
                    .should(s -> s.multiMatch(mm -> mm
                        .query(keyword)
                        .fields("customerName^3", "customerCode^2", "email")
                        .type(TextQueryType.BestFields)
                        .fuzziness("AUTO")
                    ))
                )
            )
            .withPageable(pageRequest)
            .withHighlightQuery(HighlightQuery.of(h -> h
                .fields(Map.of(
                    "customerName", HighlightField.of(hf -> hf),
                    "email", HighlightField.of(hf -> hf)
                ))
            ))
            .build();

        return esOperations.search(query, CustomerSearchDocument.class);
    }

    /**
     * Index a customer after save (triggered by AfterSaveCallback or Kafka event).
     */
    public void indexCustomer(CmnMCustomer customer) {
        var doc = CustomerSearchDocument.builder()
            .id(customer.getTenantId() + "_" + customer.getCustomerId())
            .tenantId(customer.getTenantId())
            .customerId(customer.getCustomerId())
            .customerName(customer.getCustomerName())
            .customerCode(customer.getCustomerCode())
            .email(customer.getEmail())
            .status(customer.getStatus())
            .createdAt(customer.getInsDate())
            .deleted(Boolean.TRUE.equals(customer.getDelFlg()))
            .build();

        // NOTE: searchRepository.save(doc) is synchronous (Spring Data ES).
        // In a reactive pipeline, use reactiveElasticsearchClient or trigger indexing
        // outside the reactive chain (e.g., from AfterSaveCallback or Kafka consumer).
        searchRepository.save(doc);
    }
}
```

---

## Anti-Patterns

- NO using `@Query` with raw JSON strings for complex queries — use NativeQuery builder
- NO storing tenant data without `tenantId` field in the document — every document must be tenant-scoped
- NO missing custom converters for date types — Elasticsearch rejects Java ZonedDateTime directly
- NO using synchronous `save()` in reactive pipeline — use reactive Elasticsearch client if needed

---

## Related Specialists

- `data-access/r2dbc-callback-specialist.md` - AfterSaveCallback triggers Elasticsearch indexing
- `messaging/kafka-specialist.md` - CustomerUpdatedEvent Kafka message triggers ES re-indexing
- `multitenancy/multitenancy-specialist.md` - tenantId mandatory filter in all ES queries
- `patterns/pagination-specialist.md` - PageRequest passed to search queries
