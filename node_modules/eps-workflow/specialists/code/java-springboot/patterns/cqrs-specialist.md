# CQRS Specialist

**Role**: Command Query Responsibility Segregation Expert
**Technology Stack**: Spring WebFlux, R2DBC, Spring Boot
**Integration**: StarX4CRM Core-Manager / SFA-Manager Service Layer
**Version**: Spring Boot 3.4.4

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.{moduleCode}` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 33.1–33.3 |
| **Source Paths** | `{sourceRoot}/application/service/{moduleCode}/` |
| **File Count** | N/A (pattern applied to existing services) |
| **Naming Convention** | `{Entity}QueryService.java`, `{Entity}CommandService.java` |
| **Base Class** | N/A (interface separation pattern) |
| **Imports From** | Domain (Entities), Application (DTOs, Repositories) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Expertise Areas

1. **CQRS Lite**: Separate QueryService and CommandService at service layer (no separate event store)
2. **Query Optimization**: Read-optimized projections, joins, pagination
3. **Command Optimization**: Write-optimized, validation-heavy, event-publishing
4. **Interface Design**: Clear intent separation via naming and method signatures
5. **Registration Pattern**: Module-level CQRS for CRM entities

---

## Pattern Index

- [Pattern 33.1: QueryService vs CommandService Interfaces](#pattern-331-queryservice-vs-commandservice-interfaces)
- [Pattern 33.2: InformationQueryService Implementation](#pattern-332-informationqueryservice-implementation)
- [Pattern 33.3: InformationCommandService Implementation](#pattern-333-informationcommandservice-implementation)

---

## Pattern 33.1: QueryService vs CommandService Interfaces

**Use Case**: Explicit separation of read and write concerns at the interface level.

```java
// application/query/InformationQueryService.java
public interface InformationQueryService {

    /**
     * Search with filters, pagination, and sorting.
     * Returns lightweight list DTOs (no nested objects).
     */
    Mono<PageResponse<InformationListDto>> search(
        InformationSearchCriteria criteria,
        PageRequest pageRequest
    );

    /**
     * Get full detail with all nested relations.
     * Returns rich detail DTO for form display.
     */
    Mono<InformationDetailDto> getDetail(String informationId, String tenantId);

    /**
     * Get summary view for widgets/dashboards.
     */
    Mono<InformationSummaryDto> getSummary(String informationId, String tenantId);
}

// application/command/InformationCommandService.java
public interface InformationCommandService {

    /**
     * Create a new information record. Publishes InformationCreatedEvent.
     */
    Mono<InformationDetailDto> create(CreateInformationRequest request, String tenantId, Long userId);

    /**
     * Update existing record. Validates ownership, publishes InformationUpdatedEvent.
     */
    Mono<InformationDetailDto> update(
        String informationId,
        UpdateInformationRequest request,
        String tenantId,
        Long userId
    );

    /**
     * Soft delete. Sets delFlg=true, records delUserId, delDate.
     */
    Mono<Void> delete(String informationId, String tenantId, Long userId);
}
```

**Key Rule**: Query services never write. Command services never return search results.

---

## Pattern 33.2: InformationQueryService Implementation

**Use Case**: Read-optimized service with caching and flat projections.

```java
// application/query/InformationQueryServiceImpl.java
@Service
@RequiredArgsConstructor
@Slf4j
public class InformationQueryServiceImpl implements InformationQueryService {

    private final InformationRepository informationRepository;
    private final RedisCacheAsideService cacheService;

    @Override
    public Mono<PageResponse<InformationListDto>> search(
            InformationSearchCriteria criteria,
            PageRequest pageRequest) {
        // No caching for search (dynamic filters) — use direct DB with index
        return informationRepository.findByCriteria(criteria, pageRequest)
            .map(InformationMapper::toListDto)
            .collectList()
            .zipWith(informationRepository.countByCriteria(criteria))
            .map(tuple -> PageResponse.of(tuple.getT1(), tuple.getT2(), pageRequest));
    }

    @Override
    public Mono<InformationDetailDto> getDetail(String informationId, String tenantId) {
        String cacheKey = "info:" + tenantId + ":" + informationId;
        return cacheService.getOrLoad(
            cacheKey,
            informationRepository.findDetailById(informationId, tenantId)
                .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
                .map(InformationMapper::toDetailDto),
            Duration.ofMinutes(5)
        );
    }

    @Override
    public Mono<InformationSummaryDto> getSummary(String informationId, String tenantId) {
        return informationRepository.findById(informationId)
            .filter(i -> i.getTenantId().equals(tenantId))
            .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
            .map(InformationMapper::toSummaryDto);
    }
}
```

---

## Pattern 33.3: InformationCommandService Implementation

**Use Case**: Write-optimized service with validation, audit, and event publishing.

```java
// application/command/InformationCommandServiceImpl.java
@Service
@RequiredArgsConstructor
@Slf4j
public class InformationCommandServiceImpl implements InformationCommandService {

    private final InformationRepository informationRepository;
    private final InformationValidator validator;
    private final RedisCacheAsideService cacheService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public Mono<InformationDetailDto> create(
            CreateInformationRequest request,
            String tenantId,
            Long userId) {
        return validator.validateCreate(request, tenantId)
            .then(Mono.defer(() -> {
                var entity = InformationMapper.fromCreateRequest(request);
                entity.setTenantId(tenantId);
                entity.prepareForCreate(userId); // sets insUserId, insDate
                return informationRepository.save(entity);
            }))
            .doOnNext(saved -> {
                eventPublisher.publishEvent(new InformationCreatedEvent(saved.getId(), tenantId));
                log.info("Created information: id={}, tenantId={}", saved.getId(), tenantId);
            })
            .map(InformationMapper::toDetailDto);
    }

    @Override
    @InvalidateCache(keyPattern = "info:{tenantId}:{informationId}")
    public Mono<InformationDetailDto> update(
            String informationId,
            UpdateInformationRequest request,
            String tenantId,
            Long userId) {
        return informationRepository.findByIdAndTenantId(informationId, tenantId)
            .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
            .flatMap(existing -> {
                InformationMapper.applyUpdate(existing, request);
                existing.prepareForUpdate(userId); // sets updUserId, updDate, increments updCnt
                return informationRepository.save(existing);
            })
            .flatMap(saved -> {
                cacheService.evict("info:" + tenantId + ":" + informationId).subscribe();
                return informationRepository.findDetailById(informationId, tenantId);
            })
            .map(InformationMapper::toDetailDto);
    }

    @Override
    public Mono<Void> delete(String informationId, String tenantId, Long userId) {
        return informationRepository.findByIdAndTenantId(informationId, tenantId)
            .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
            .flatMap(existing -> {
                existing.setDelFlg(true);
                existing.setDelDate(Instant.now());
                existing.setDelUserId(userId);
                return informationRepository.save(existing);
            })
            .doOnNext(deleted -> cacheService.evict("info:" + tenantId + ":" + informationId).subscribe())
            .then();
    }
}
```

**Router Registration** (functional endpoints):
```java
// router/InformationRouter.java
@Configuration
public class InformationRouter {

    @Bean
    public RouterFunction<ServerResponse> informationRoutes(
            InformationQueryHandler queryHandler,
            InformationCommandHandler commandHandler) {
        return route()
            .GET("/api/informations", queryHandler::search)
            .GET("/api/informations/{id}", queryHandler::getDetail)
            .POST("/api/informations", commandHandler::create)
            .PUT("/api/informations/{id}", commandHandler::update)
            .DELETE("/api/informations/{id}", commandHandler::delete)
            .build();
    }
}
```

---

## Anti-Patterns

- NO mixing search logic in CommandService — breaks read optimization
- NO returning mutable entities from QueryService — always map to DTOs
- NO calling CommandService from QueryService or vice versa — use events
- NO skipping validation in CommandService — always validate before write

---

## Related Specialists

- `application/java-handler-specialist.md` - Handler functions delegate to Query/CommandService
- `presentation/java-router-specialist.md` - RouterFunction wires handlers
- `cache/cache-specialist.md` - QueryService uses cache-aside; CommandService evicts
- `data-access/r2dbc-callback-specialist.md` - prepareForCreate/prepareForUpdate audit methods
