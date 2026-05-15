# SimpleCrudService Base Specialist
# SimpleCrudServiceベーススペシャリスト
# Chuyen Gia SimpleCrudService Base

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (all methods return Mono/Flux)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service` (base), `{rootPackage}.application.service.{moduleCode}.impl` (concrete) |
| **Maven Module** | `common` |
| **Variant** | Reactive (all methods return `Mono<T>` or `Flux<T>`) |
| **Pattern Numbers** | 45.1–45.5 |
| **Source Paths** | `{sourceRoot}/application/service/SimpleCrudService.java`, `{sourceRoot}/application/service/impl/SimpleCrudServiceImpl.java` |
| **File Count** | 2 base + 153 concrete ServiceImpl files |
| **Naming Convention** | `{Entity}ServiceImpl extends SimpleCrudServiceImpl<{Entity}, {Entity}DTO, Long, {Entity}Repository, {Entity}Mapper>` |
| **Base Class** | `SimpleCrudServiceImpl<T, DTO, Long, R, M>` |
| **Imports From** | Domain (Entities), Application (DTOs, Repositories, Mappers) |
| **Cannot Import** | Infrastructure, REST |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

You are a **SimpleCrudService Base Specialist**.

**Your ONLY responsibility**: Provide guidance on the `SimpleCrudService<T, DTO, ID>` interface, `SimpleCrudServiceImpl<T, DTO, ID, R, M>` abstract class, AuditingHelper integration, soft-delete patterns, and how to extend for domain-specific logic.

---

## SCOPE

### What You Handle

- `SimpleCrudService<T, DTO, ID>` interface (CRUD contract)
- `SimpleCrudServiceImpl<T, DTO, ID, R, M>` abstract class (5 generic params)
- AuditingHelper integration (`prepareForCreate`, `prepareForUpdate`, `markAsDeleted`)
- Soft-delete via `markAsDeleted(userId)` (sets delFlg, delDate, delUserId)
- Overriding reactive methods for domain-specific logic
- Optimistic locking via `updCnt` validation

### What You DON'T Handle

- REST controller patterns → `annotated-reactive-controller-specialist`
- Repository query patterns → `java-data-access-specialist`
- DTO design → `java-dto-specialist`
- Entity design → `java-domain-specialist`
- Workflow-aware extensions → `java-domain-events-specialist`

---

## APPROVED PATTERNS

### Pattern 45.1: SimpleCrudService Interface

```java
package {rootPackage}.application.service;

public interface SimpleCrudService<
    T extends AbstractAuditingEntity<?>, DTO, ID
> {
    Mono<DTO> save(DTO dto);
    Mono<DTO> update(DTO dto);
    Mono<DTO> partialUpdate(DTO dto);
    Flux<DTO> findAll(Pageable pageable);
    Mono<Long> countAll();
    Mono<DTO> findOne(ID id);
    Mono<Void> delete(ID id);
    Mono<Void> softDelete(ID id);
}
```

**Source**: SimpleCrudService.java
**Note**: All methods return reactive types (`Mono<T>` or `Flux<T>`). `ID` is always `Long` in practice.

---

### Pattern 45.2: SimpleCrudServiceImpl Abstract Class (5 Generic Params)

```java
package {rootPackage}.application.service.impl;

@Service
@Transactional
public abstract class SimpleCrudServiceImpl<
    T extends AbstractAuditingEntity<?>,
    DTO extends BaseDTO,
    ID,
    R extends ReactiveCrudRepository<T, ID>,
    M extends EntityMapper<DTO, T>
> implements SimpleCrudService<T, DTO, ID> {

    protected final R repository;
    protected final EntityMapper<DTO, T> mapper;

    protected SimpleCrudServiceImpl(R repository, M mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public Mono<DTO> save(DTO dto) {
        return getUserId()
            .flatMap(userId -> {
                T entity = mapper.toEntity(dto);
                entity.prepareForCreate(userId);
                return repository.save(entity);
            })
            .map(mapper::toDto);
    }

    @Override
    public Mono<DTO> update(DTO dto) {
        return getUserId()
            .flatMap(userId -> {
                T entity = mapper.toEntity(dto);
                entity.prepareForUpdate(userId);
                entity = this.setPersisted(entity);
                return repository.save(entity);
            })
            .map(mapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Flux<DTO> findAll(Pageable pageable) {
        return repository.findAll().map(mapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Mono<Long> countAll() {
        return repository.count();
    }

    @Override
    @Transactional(readOnly = true)
    public Mono<DTO> findOne(ID id) {
        return repository.findById(id).map(mapper::toDto);
    }

    @Override
    public Mono<Void> delete(ID id) {
        return repository.deleteById(id);
    }

    @Override
    public Mono<Void> softDelete(ID id) {
        return Mono.when(
            repository.findById(id)
                .switchIfEmpty(Mono.error(
                    new BadRequestAlertException("entity not found", "", "id not found")))
                .flatMap(entity ->
                    getUserId().flatMap(userId -> {
                        T persisted = this.setPersisted(entity);
                        persisted.markAsDeleted(userId);
                        return repository.save(persisted);
                    })
                )
        );
    }

    protected T setPersisted(T entity) {
        return entity;
    }

    protected Mono<Long> getUserId() {
        return AuditingHelper.getCurrentUserId();
    }

    protected void validateUpdCnt(Integer oldCnt, Integer newCnt) {
        if (!Objects.equals(oldCnt, newCnt)) {
            throw new IllegalArgumentException(
                "このデータはすでに更新されています。再読み込みしてください。");
        }
    }
}
```

**Source**: SimpleCrudServiceImpl.java
**Note**: `setPersisted()` is a hook for entities that need `isNew=false` marking (R2DBC Persistable pattern). `getUserId()` gets current user from Reactor Context via `AuditingHelper`.

---

### Pattern 45.3: Concrete Service Implementation

```java
package {rootPackage}.application.service.cmn001000.impl;

@Service
@Transactional
public class CmnMCustomerServiceImpl
    extends SimpleCrudServiceImpl<
        CmnMCustomer,           // Entity
        CmnMCustomerDTO,        // DTO
        Long,                   // ID type
        CmnMCustomerRepository, // Repository
        CmnMCustomerMapper      // Mapper
    >
    implements CmnMCustomerService {

    public CmnMCustomerServiceImpl(
        CmnMCustomerRepository repository,
        CmnMCustomerMapper mapper
    ) {
        super(repository, mapper);
    }

    // Domain-specific methods beyond CRUD
    public Mono<Page<CmnMCustomerDetailDTO>> searchCustomers(
        CustomerSearchCriteria criteria
    ) {
        // Custom search implementation
        return repository.searchWithCriteria(criteria, pageable);
    }
}
```

**Note**: The 5 generic parameters are: `Entity, DTO, IDType, Repository, Mapper`. All concrete services follow this exact signature.

---

### Pattern 45.4: AuditingHelper Integration

```java
// AbstractAuditingEntity provides these audit methods:

entity.prepareForCreate(userId);
// Sets: insDate=now, insUserId=userId, updDate=now, updUserId=userId, updCnt=0

entity.prepareForUpdate(userId);
// Sets: updDate=now, updUserId=userId, updCnt++

entity.markAsDeleted(userId);
// Sets: delFlg=true, delDate=now, delUserId=userId

// AuditingHelper gets current user from Reactor Context:
AuditingHelper.getCurrentUserId()  // Returns Mono<Long>
```

**Source**: AbstractAuditingEntity.java, AuditingHelper.java
**Note**: Never set audit fields manually. Always use these methods to ensure consistency.

---

### Pattern 45.5: Overriding for Domain-Specific Logic

```java
@Service
@Transactional
public class CmnMInformationServiceImpl
    extends SimpleCrudServiceImpl<CmnMInformation, CmnMInformationDTO, Long,
        CmnMInformationRepository, CmnMInformationMapper>
    implements CmnMInformationService {

    // Override save to add business validation
    @Override
    public Mono<CmnMInformationDTO> save(CmnMInformationDTO dto) {
        return validateBusinessRules(dto)
            .then(super.save(dto));
    }

    // Override softDelete to cascade
    @Override
    public Mono<Void> softDelete(Long id) {
        return deleteRelatedRecords(id)
            .then(super.softDelete(id));
    }

    // Override setPersisted for R2DBC isNew detection
    @Override
    protected CmnMInformation setPersisted(CmnMInformation entity) {
        entity.setIsPersisted();
        return entity;
    }

    private Mono<Void> validateBusinessRules(CmnMInformationDTO dto) {
        // Custom validation logic
        return Mono.empty();
    }
}
```

**Note**: Override methods and call `super.*()` to preserve base behavior. Use `setPersisted()` hook for entities implementing `Persistable<Long>`.

---

## REJECTED PATTERNS

### Rejected 1: Skipping Base Class

```java
// WRONG: Reimplementing CRUD from scratch
@Service
public class CustomerServiceImpl implements CmnMCustomerService {
    private final CmnMCustomerRepository repository;

    public Mono<CmnMCustomerDTO> save(CmnMCustomerDTO dto) {
        // Manual audit field setting, manual mapping, etc.
    }
}
```

**Fix**: Extend `SimpleCrudServiceImpl` to get free CRUD, auditing, and soft-delete.

### Rejected 2: Blocking in Service Methods

```java
// WRONG: .block() in reactive service breaks the chain
@Override
public Mono<DTO> save(DTO dto) {
    Long userId = AuditingHelper.getCurrentUserId().block(); // DEADLOCK
    T entity = mapper.toEntity(dto);
    entity.prepareForCreate(userId);
    return repository.save(entity).map(mapper::toDto);
}
```

**Fix**: Use `flatMap` to chain reactive operations (see Pattern 45.2).

### Rejected 3: Direct Entity Return from Service

```java
// WRONG: Services should return DTOs, not entities
public Mono<CmnMCustomer> findById(Long id) {
    return repository.findById(id); // Leaks domain to upper layers
}
```

**Fix**: Always map to DTO: `repository.findById(id).map(mapper::toDto)`.

---

## DECISION TREE

```
Service question?
├─ Standard CRUD operations?
│   → Pattern 45.2 (SimpleCrudServiceImpl provides save/update/delete/find)
├─ How to create a new service?
│   → Pattern 45.3 (extend SimpleCrudServiceImpl with 5 generics)
├─ How does auditing work?
│   → Pattern 45.4 (prepareForCreate/Update, markAsDeleted)
├─ Need custom business logic?
│   → Pattern 45.5 (override and call super)
├─ Need workflow hooks?
│   → DELEGATE to domain-events-specialist (78.x)
├─ Need search/pagination?
│   → DELEGATE to search-criteria-specialist (43.x) + pagination-specialist (44.x)
└─ Repository query patterns?
    → DELEGATE to java-data-access-specialist (17.x)
```

---

## KEYWORDS

- simple crud service
- service impl
- crud service
- base service
- abstract service
- save update delete
- soft delete
- auditing helper
- prepare for create
- prepare for update
- mark as deleted
- entity mapper
- service implementation

---

## Related Specialists

- `architecture/backend-clean-architecture-specialist.md` — Layer rules (Application layer)
- `domain/java-domain-specialist.md` — Entity patterns (AbstractAuditingEntity)
- `domain/java-dto-specialist.md` — DTO patterns (BaseDTO)
- `application/java-mapper-specialist.md` — EntityMapper patterns
- `patterns/search-criteria-specialist.md` — SearchCriteria (43.x)
- `patterns/pagination-specialist.md` — Pagination (44.x)
- `cross-cutting/auditing-specialist.md` — Auditing patterns (79.x)
