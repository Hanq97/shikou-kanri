# Entity Auditing Specialist

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Package** | `{rootPackage}.domain` (AbstractAuditingEntity) |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 79.1–79.4 |
| **Source Paths** | `{sourceRoot}/domain/AbstractAuditingEntity.java` |
| **File Count** | 1 base class + ~87 entities |
| **Naming Convention** | `AbstractAuditingEntity.java` |
| **Base Class** | `AbstractAuditingEntity<Long>` |
| **Imports From** | (nothing — Domain is innermost layer) |
| **Cannot Import** | `application.*`, `infrastructure.*`, `rest.*` |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

**Title**: AbstractAuditingEntity — Timestamps, Soft Delete, and Optimistic Locking
**Domain**: Cross-Cutting / Auditing
**Pattern Range**: 79.1–79.4

---

## Description

All StarX4CRM persistent entities extend `AbstractAuditingEntity<T>`, which provides
creation/update timestamps, user attribution, soft delete fields, and an optimistic
locking version counter. The `Persistable<ID>` interface tells Spring Data R2DBC
whether to INSERT or UPDATE without an extra SELECT round-trip.

---

## Key Concepts

- **`@CreatedDate` / `@LastModifiedDate`**: populated by Spring Data auditing
- **`@Version` (`updCnt`)**: starts at 1 on insert; auto-incremented by R2DBC on update
- **Soft delete**: `delFlg`, `delDate`, `delUserId` — records are never physically removed
- **`isPersisted()`**: returns `true` when `insDate` is already set (avoids SELECT before INSERT)
- **`prepareForCreate` / `prepareForUpdate`**: explicit user attribution (no AuditorAware magic)

---

## Pattern 79.1 — AbstractAuditingEntity

```java
package {rootPackage}.common.domain;

import org.springframework.data.annotation.*;
import org.springframework.data.domain.Persistable;
import java.io.Serializable;
import java.time.Instant;

@SuppressWarnings("java:S2160")
public abstract class AbstractAuditingEntity<T extends Serializable>
        implements Persistable<T> {

    // ── Timestamps ────────────────────────────────────────────────────────────
    @CreatedDate
    private Instant insDate;

    @LastModifiedDate
    private Instant updDate;

    // ── User attribution ──────────────────────────────────────────────────────
    private Long insUserId;
    private Long updUserId;

    // ── Soft delete ───────────────────────────────────────────────────────────
    private Boolean delFlg = Boolean.FALSE;
    private Instant delDate;
    private Long    delUserId;

    // ── Optimistic locking ────────────────────────────────────────────────────
    @Version
    private Integer updCnt = 1;  // starts at 1; R2DBC increments on UPDATE

    // ── Persistable contract ──────────────────────────────────────────────────
    @Transient
    private boolean persisted;

    @Override
    @Transient
    public boolean isNew() {
        return !persisted || getId() == null;
    }

    // Persistence marking handled by R2DBC AfterConvertCallback
    // See r2dbc-callback-specialist.md Pattern 34.x for implementation
    // AfterConvertCallback<T> sets persisted=true after database read
    // AfterSaveCallback<T> sets persisted=true after database save

    // getters / setters omitted for brevity — use Lombok @Data or generate
}
```

---

## Pattern 79.2 — Concrete Entity Example

```java
@Table("cmn_m_customer")
@Data
@EqualsAndHashCode(callSuper = false)
public class CmnMCustomer extends AbstractAuditingEntity<Long> {

    @Id
    private Long customerId;

    @NotNull
    @Size(max = 200)
    private String customerName;

    private String customerCode;

    private String address;

    @Override
    public Long getId() {
        return customerId;
    }
}
```

---

## Pattern 79.3 — prepareForCreate / prepareForUpdate Helpers

These helpers are called from service methods before saving:

```java
// In AbstractAuditingEntity
public void prepareForCreate(Long userId) {
    this.insUserId = userId;
    this.updUserId = userId;
    this.delFlg    = Boolean.FALSE;
    // insDate/updDate set automatically by @CreatedDate / @LastModifiedDate
}

public void prepareForUpdate(Long userId) {
    this.updUserId = userId;
    // updDate set automatically by @LastModifiedDate
}

public void markAsDeleted(Long userId) {
    this.delFlg    = Boolean.TRUE;
    this.delDate   = Instant.now();
    this.delUserId = userId;
    this.updUserId = userId;
}
```

### Service Usage

```java
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerService {

    private final CmnMCustomerRepository repository;

    public Mono<CmnMCustomer> create(CmnMCustomer entity, Long userId) {
        entity.prepareForCreate(userId);
        return repository.save(entity);
    }

    public Mono<CmnMCustomer> update(CmnMCustomer entity, Long userId) {
        entity.prepareForUpdate(userId);
        return repository.save(entity);
    }

    public Mono<Void> softDelete(Long id, Long userId) {
        return repository.findById(id)
            .doOnNext(e -> e.markAsDeleted(userId))
            .flatMap(repository::save)
            .then();
    }
}
```

---

## Pattern 79.4 — R2DBC Auditing Enablement

```java
@Configuration
@EnableR2dbcAuditing
public class DatabaseConfiguration {
    // No AuditorAware bean needed — user attribution is explicit via prepareForCreate()
}
```

### Liquibase Column Baseline

```sql
-- All audited tables include these columns
ALTER TABLE cmn_m_customer ADD COLUMN ins_date    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cmn_m_customer ADD COLUMN upd_date    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cmn_m_customer ADD COLUMN ins_user_id BIGINT;
ALTER TABLE cmn_m_customer ADD COLUMN upd_user_id BIGINT;
ALTER TABLE cmn_m_customer ADD COLUMN del_flg     BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE cmn_m_customer ADD COLUMN del_date    TIMESTAMPTZ;
ALTER TABLE cmn_m_customer ADD COLUMN del_user_id BIGINT;
ALTER TABLE cmn_m_customer ADD COLUMN upd_cnt     INTEGER     NOT NULL DEFAULT 1;
```

---

## Anti-Patterns

- DO NOT use `@CreatedBy` / `@LastModifiedBy` with `AuditorAware` — reactive context makes SecurityContext unreliable; use explicit `prepareForCreate(userId)` instead
- DO NOT start `updCnt` at 0 — Spring Data R2DBC treats 0 as "new entity" and may INSERT instead of UPDATE
- DO NOT physically DELETE audited rows — always soft-delete with `delFlg=true`
- DO NOT omit R2DBC callback registration for `markPersisted()` — causes redundant SELECT on every save (see r2dbc-callback-specialist.md)
- DO NOT expose `delFlg=true` rows in query results — add `WHERE del_flg = false` to all repository queries

---

## Related Specialists

- `data-access/java-r2dbc-specialist.md` — R2DBC repository conventions that inherit from this base
- `cross-cutting/domain-events-specialist.md` — domain events triggered after create/update/delete
- `domain/java-domain-specialist.md` — full entity class conventions
