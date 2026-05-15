# R2DBC Entity Lifecycle Specialist

**Role**: R2DBC Callback & Entity Audit Expert
**Technology Stack**: Spring Data R2DBC, PostgreSQL R2DBC Driver
**Integration**: StarX4CRM Common Library (AbstractAuditingEntity)
**Version**: Spring Data R2DBC 3.x, Spring Boot 3.4.4

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Package** | `{rootPackage}.domain` (AbstractAuditingEntity), `{rootPackage}.domain.{moduleCode}` (entities) |
| **Maven Module** | `common` |
| **Variant** | Reactive (R2DBC) |
| **Pattern Numbers** | 34.1–34.4 |
| **Source Paths** | `{sourceRoot}/domain/AbstractAuditingEntity.java`, `{sourceRoot}/domain/{moduleCode}/` |
| **File Count** | ~100 entities + callbacks |
| **Naming Convention** | `{Prefix}{Type}{Name}.java` (e.g., `CmnMCustomer.java`) |
| **Base Class** | `AbstractAuditingEntity<Long>` (entities), `BeforeConvertCallback<T>` / `AfterConvertCallback<T>` / `AfterSaveCallback<T>` (callbacks) |
| **Imports From** | Domain only (self-contained) |
| **Cannot Import** | `application.*`, `infrastructure.*`, `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | dataAccess, asyncPattern |

---

## Expertise Areas

1. **AfterSaveCallback**: Post-save logic (cache invalidation, event publishing)
2. **AfterConvertCallback**: Post-read entity enrichment
3. **Persistable Pattern**: isPersisted() to distinguish INSERT vs UPDATE (no JPA proxies in R2DBC)
4. **AbstractAuditingEntity**: Shared audit base class for all domain entities
5. **Optimistic Locking**: @Version-based conflict detection with updCnt field
6. **Soft Delete**: delFlg + delDate + delUserId pattern

---

## Pattern Index

- [Pattern 34.1: AbstractAuditingEntity Base Class](#pattern-341-abstractauditingentity-base-class)
- [Pattern 34.2: Persistable isPersisted Pattern](#pattern-342-persistable-ispersisted-pattern)
- [Pattern 34.3: AfterSaveCallback Implementation](#pattern-343-aftersavecallback-implementation)
- [Pattern 34.4: AfterConvertCallback Implementation](#pattern-344-afterconvertcallback-implementation)

---

## Pattern 34.1: AbstractAuditingEntity Base Class

**Use Case**: Shared auditing, soft delete, and optimistic locking for all StarX4CRM entities.

```java
// Package: {rootPackage}.domain
// File: AbstractAuditingEntity.java
//
// NOTE: AbstractAuditingEntity implements Serializable (NOT Persistable).
// Individual entities implement Persistable<Long> separately.
@Data
public abstract class AbstractAuditingEntity<T> implements Serializable {

    // Audit fields (Japanese column names match DB schema)
    @CreatedDate
    @Column("ins_date")
    private Instant insDate;

    @Column("ins_user_id")
    private Long insUserId;

    @LastModifiedDate
    @Column("upd_date")
    private Instant updDate;

    @Column("upd_user_id")
    private Long updUserId;

    // Optimistic locking
    @Version
    @Column("upd_cnt")
    private Integer updCnt = 1;

    // Soft delete
    @Column("del_flg")
    private Boolean delFlg = false;

    @Column("del_date")
    private Instant delDate;

    @Column("del_user_id")
    private Long delUserId;

    /**
     * Call before insert. Sets insUserId, insDate (also set by @CreatedDate).
     */
    public void prepareForCreate(Long userId) {
        this.insUserId = userId;
        this.insDate = Instant.now();
    }

    /**
     * Call before update. Sets updUserId.
     * updDate set by @LastModifiedDate; updCnt incremented by @Version.
     */
    public void prepareForUpdate(Long userId) {
        this.updUserId = userId;
    }

    /**
     * Soft delete. Does NOT physically delete the row.
     */
    public void markAsDeleted(Long userId) {
        this.delFlg = true;
        this.delDate = Instant.now();
        this.delUserId = userId;
        prepareForUpdate(userId);
    }
}
```

**Domain Entity Example** (implements `Persistable<Long>` individually):
```java
// Package: {rootPackage}.domain.cmn001000
// File: CmnMCustomer.java
@Table("cmn_m_customer")
@Data
@EqualsAndHashCode(callSuper = true)
public class CmnMCustomer extends AbstractAuditingEntity<Long> implements Persistable<Long> {

    @Id
    @Column("customer_id")
    private Long customerId;

    @Column("tenant_id")
    private Long tenantId;

    @Column("customer_name")
    private String customerName;

    @Column("customer_code")
    private String customerCode;

    // Persistable support - set by AfterConvertCallback
    @Transient
    private boolean persisted = false;

    @Override
    public Long getId() {
        return customerId;
    }

    @Override
    public boolean isNew() {
        return !persisted;
    }
}
```

---

## Pattern 34.2: Persistable isPersisted Pattern

**Use Case**: R2DBC has no JPA proxy — must explicitly signal new vs existing entity to Spring Data.

```java
// CRITICAL: Without Persistable, Spring Data R2DBC uses id==null to detect new entity.
// When ID is pre-generated (UUID), it will ALWAYS try INSERT (id is not null but entity is new).
// When loading from DB, it will also have id, so Spring thinks it's new → double INSERT.

// Solution: set persisted=true in AfterConvertCallback (after loading from DB).
// Leave persisted=false for new entities (created in application code).

// Wrong way (Spring assumes entity is new if id != null is pre-assigned):
var customer = new CmnMCustomer();
customer.setCustomerId(UUID.randomUUID().toString()); // id set, Spring thinks it's new ✓
customer.prepareForCreate(userId); // persisted=false, isNew()=true ✓

// Risky way (loading from query result without callback):
// Spring Data would call isNew() → persisted=false → tries INSERT on existing record!
// This is prevented by AfterConvertCallback (Pattern 34.4)
```

---

## Pattern 34.3: AfterSaveCallback Implementation

**Use Case**: Execute logic after a successful entity save (cache invalidation, downstream events).

```java
// callback/CustomerAfterSaveCallback.java
@Component
@RequiredArgsConstructor
@Slf4j
public class CustomerAfterSaveCallback implements AfterSaveCallback<CmnMCustomer> {

    private final RedisCacheAsideService cacheService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public Publisher<CmnMCustomer> onAfterSave(
            CmnMCustomer entity,
            OutboundRow row,
            SqlIdentifier table) {
        return Mono.fromRunnable(() -> {
                // Evict customer cache after every save
                cacheService.evict("customer:" + entity.getTenantId() + ":" + entity.getCustomerId())
                    .subscribe();

                // Publish domain event for downstream consumers
                if (entity.isNew()) {
                    eventPublisher.publishEvent(
                        new CustomerCreatedEvent(entity.getCustomerId(), entity.getTenantId()));
                } else {
                    eventPublisher.publishEvent(
                        new CustomerUpdatedEvent(entity.getCustomerId(), entity.getTenantId()));
                }

                log.debug("AfterSave: customer={}, isNew={}",
                    entity.getCustomerId(), entity.isNew());
            })
            .thenReturn(entity);
    }
}
```

---

## Pattern 34.4: AfterConvertCallback Implementation

**Use Case**: Mark entity as persisted after loading from DB, preventing accidental re-INSERT.

```java
// callback/CustomerAfterConvertCallback.java
@Component
public class CustomerAfterConvertCallback implements AfterConvertCallback<CmnMCustomer> {

    @Override
    public Publisher<CmnMCustomer> onAfterConvert(
            CmnMCustomer entity,
            SqlIdentifier table) {
        // Mark as existing — isNew() returns false → Spring will use UPDATE
        entity.setPersisted(true);
        return Mono.just(entity);
    }
}
```

**Auditing Configuration**:
```java
// config/R2dbcAuditingConfig.java
@Configuration
@EnableR2dbcAuditing
public class R2dbcAuditingConfig {

    @Bean
    public ReactiveAuditorAware<String> auditorAware() {
        return () -> ReactiveSecurityContextHolder.getContext()
            .map(ctx -> ctx.getAuthentication())
            .filter(auth -> auth != null && auth.isAuthenticated())
            .map(auth -> auth.getName())
            .defaultIfEmpty("system");
    }
}
```

---

## Anti-Patterns

- NO using `@GeneratedValue` for String IDs in R2DBC — generate UUID in application code
- NO forgetting `AfterConvertCallback` — entity loaded from DB will have `isNew()=true` without it
- NO calling `prepareForUpdate()` on new entities — `updCnt` starts at null for inserts
- NO physical DELETE — always use `softDelete()` method
- NO mixing auditing fields: insDate/updDate are from `@CreatedDate`/`@LastModifiedDate`, insUserId/updUserId are set via `prepareForCreate/Update`

---

## Related Specialists

- `data-access/java-r2dbc-specialist.md` - R2DBC repository queries
- `application/java-reactive-specialist.md` - Mono/Flux used in callbacks (Publisher return)
- `cache/cache-specialist.md` - Cache eviction in AfterSaveCallback
- `multitenancy/multitenancy-specialist.md` - tenantId is always set before save

