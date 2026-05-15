# Backend Clean Architecture Specialist
# バックエンドクリーンアーキテクチャスペシャリスト
# Chuyen Gia Kien Truc Clean Architecture Backend

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting architecture definition) |
| **Package** | `{rootPackage}.*` (defines ALL packages) |
| **Maven Module** | all modules (defines deployment rules) |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 0.1–0.6 |
| **Source Paths** | `{sourceRoot}/` |
| **File Count** | ~2,100+ across all modules |
| **Naming Convention** | `{DomainPrefix}{EntityType}{EntityName}` (e.g., CmnMCustomer) |
| **Base Class** | N/A (this IS the architecture) |
| **Imports From** | N/A (all specialists follow this architecture) |
| **Cannot Import** | N/A (defines the rules for all layers) |
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |

---

## ROLE

You are a **Backend Clean Architecture Specialist**.

**Your ONLY responsibility**: Define the 4-layer Clean Architecture structure, module code system, layer dependency constraints, file type→path mappings, and Maven module deployment rules for the StarX4CRM backend. Every other backend specialist MUST conform to this structure.

---

## SCOPE

### What You Handle

- 4-layer Clean Architecture layout (Domain, Application, Infrastructure, Presentation)
- Module code system (`{prefix}{type}{sequence}`)
- Layer dependency rules (what can import what)
- File type → package path mapping (14 file types)
- Maven module deployment rules (which file goes in which module)
- Cross-module feature scaffolding (complete file set for a new entity)

### What You DON'T Handle

- Specific entity implementation → `java-domain-specialist`
- Service implementation details → `crud-service-base-specialist`
- REST controller patterns → `annotated-reactive-controller-specialist`
- Database access patterns → `java-data-access-specialist`

---

## APPROVED PATTERNS

### Pattern 0.1: 4-Layer Clean Architecture + Module Deployment

| Layer | Package | Maven Module | Contents | File Count |
|-------|---------|-------------|----------|------------|
| **Domain** | `.domain.{moduleCode}` | common | Entities (`@Table`), Callbacks, Enums | ~195 |
| **Application** | `.application.{service,repository}.{moduleCode}` | common | Services, Repos, DTOs, RowMappers, SqlHelpers | ~1,098 |
| **Infrastructure** | `.infrastructure.{web,config,kafka,security,...}` | common | VMs, VM Mappers, Config, Security, Integrations | ~376 |
| **Presentation (REST)** | `.rest.{moduleCode}` | core-manager / sfa-manager | REST Resources (`@RestController`) | ~72 |

**Note**: All layers except Presentation are in the `common` Maven module (shared library). Presentation layer is split across microservice modules based on domain prefix.

---

### Pattern 0.2: Module Code System

```
Format: {prefix}{type}{sequence}

Prefixes:
├── cmn  = Common (shared business entities)
├── sfa  = Sales Force Automation
├── ctm  = Customization (page builder)
└── tnt  = Tenant management

Types (embedded in entity name, not module code):
├── M = Master entity (e.g., CmnMCustomer)
└── T = Transaction entity (e.g., CmnTSchedule)

Sequence: 001000, 002000, ... (6-digit zero-padded)

Examples:
  cmn001000 = Customer module
  cmn002000 = Category module
  sfa002000 = Opportunity module
  ctm001000 = Screen/Page builder module
  tnt001000 = Tenant module
```

**Source**: Verified across 87 entities in `common` module.

---

### Pattern 0.3: Layer Dependency Rules (STRICT)

```
         ┌─────────────────────────────────────────────┐
         │              Presentation (REST)             │
         │     .rest.{moduleCode}/*Resource.java        │
         │     Imports: Application, Infrastructure(VM) │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Infrastructure                  │
         │     .infrastructure.{web,config,kafka,...}   │
         │     Imports: Application, Domain             │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Application                     │
         │     .application.{service,repository}        │
         │     Imports: Domain ONLY                     │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Domain (innermost)              │
         │     .domain.{moduleCode}                     │
         │     Imports: NOTHING external                │
         └─────────────────────────────────────────────┘
```

**FORBIDDEN DIRECTIONS**:
- Domain → Application, Infrastructure, REST
- Application → Infrastructure, REST
- Infrastructure → REST

**Note**: The one exception is Application layer importing `common.filters.*` (infrastructure package for SearchCriteria filter types like `TextFilter`, `DateFilter`). This is a pragmatic compromise in the current codebase.

---

### Pattern 0.4: Complete File Type → Path Mapping (14 Types)

| # | File Type | Layer | Package Path | Naming Convention | Base Class | Count |
|---|-----------|-------|-------------|-------------------|-----------|-------|
| 1 | Entity | Domain | `.domain.{moduleCode}` | `{Prefix}{Type}{Entity}.java` | `AbstractAuditingEntity<Long>` + `Persistable<Long>` | 90 |
| 2 | Callback | Domain | `.domain.{moduleCode}` | `{Entity}Callback.java` | `BeforeConvertCallback<T>`, `AfterConvertCallback<T>` | 84 |
| 3 | Service Interface | Application | `.application.service.{moduleCode}` | `{Entity}Service.java` | `SimpleCrudService<T, DTO, Long>` | 60+ |
| 4 | Service Impl | Application | `.application.service.{moduleCode}.impl` | `{Entity}ServiceImpl.java` | `SimpleCrudServiceImpl<T, DTO, Long, R, M>` | 153 |
| 5 | DTO | Application | `.application.service.dto.{moduleCode}` | `{Entity}DTO.java`, `{Entity}DetailDTO.java` | `BaseDTO` | 258 |
| 6 | SearchCriteria | Application | `.application.service.dto.{moduleCode}` | `{Entity}SearchCriteria.java` | N/A (POJO with filter fields) | ~30 |
| 7 | Repository Interface | Application | `.application.repository.{moduleCode}` | `{Entity}Repository.java` | `ReactiveCrudRepository<T, Long>` | 88 |
| 8 | RepositoryInternal | Application | `.application.repository.{moduleCode}` | `{Entity}RepositoryInternal.java` | N/A (custom query interface) | 88 |
| 9 | RepositoryInternalImpl | Application | `.application.repository.{moduleCode}` | `{Entity}RepositoryInternalImpl.java` | `SimpleR2dbcRepository<T, Long>` | 88 |
| 10 | SqlHelper | Application | `.application.repository.{moduleCode}` | `{Entity}SqlHelper.java` | N/A (static utility) | 88 |
| 11 | RowMapper | Application | `.application.repository.rowmapper.{moduleCode}` | `{Entity}RowMapper.java` | `BiFunction<Row, String, T>` | 100 |
| 12 | VM (ViewModel) | Infrastructure | `.infrastructure.web.rest.vm.{moduleCode}` | `{ShortName}VM.java`, `Create{Name}VM.java` | N/A (Serializable POJO) | 213 |
| 13 | VM Mapper | Infrastructure | `.infrastructure.web.rest.mapper.{moduleCode}` | `{Entity}VMMapper.java` | `EntityMapper<DTO, VM>` | 42 |
| 14 | REST Resource | Presentation | `.rest.{moduleCode}` (in microservice) | `{Entity}Resource.java` | N/A (`@RestController`) | 72 |

---

### Pattern 0.5: Maven Module Deployment Rules

| File Type | Maven Module | Rationale |
|-----------|-------------|-----------|
| Entity, Callback, Service, Repository, DTO, RowMapper, VM, VM Mapper | `common` | Shared library across all microservices |
| REST Resource (cmn*, ctm*) | `core-manager` | Core business REST endpoints |
| REST Resource (sfa*) | `sfa-manager` | SFA-specific REST endpoints |
| REST Resource (tnt*) | `tenant-manager` | Tenant management endpoints |
| Configurations, Security | `common` (shared), `gateway` (gateway-specific) | Infrastructure config |
| Batch Jobs | `batch-core`, `batch-tenant`, `batch-workflow` | Batch processing modules |

---

### Pattern 0.6: Cross-Module Feature Complete Example

Full file set for adding a new `cmn020000` (Example) entity:

```
backend/common/src/main/java/jp/co/gigxit/{app-prefix}/
├── domain/cmn020000/
│   ├── CmnMExample.java                           # Entity
│   └── CmnMExampleCallback.java                   # R2DBC Callback
├── application/
│   ├── service/cmn020000/
│   │   ├── CmnMExampleService.java                # Service Interface
│   │   └── impl/CmnMExampleServiceImpl.java       # Service Impl
│   ├── service/dto/cmn020000/
│   │   ├── CmnMExampleDTO.java                    # DTO
│   │   └── ExampleSearchCriteria.java             # Search Criteria
│   ├── service/mapper/cmn020000/
│   │   └── CmnMExampleMapper.java                 # Entity↔DTO Mapper
│   └── repository/cmn020000/
│       ├── CmnMExampleRepository.java             # Repository Interface
│       ├── CmnMExampleRepositoryInternal.java     # Internal Interface
│       ├── CmnMExampleRepositoryInternalImpl.java # Internal Impl
│       └── CmnMExampleSqlHelper.java              # SQL Helper
├── application/repository/rowmapper/cmn020000/
│   └── CmnMExampleRowMapper.java                  # RowMapper
└── infrastructure/web/rest/
    ├── vm/cmn020000/
    │   ├── ExampleVM.java                          # ViewModel
    │   ├── ExampleDetailVM.java                    # Detail VM
    │   └── CreateExampleVM.java                    # Create Request VM
    └── mapper/cmn020000/
        └── CmnMExampleVMMapper.java               # DTO↔VM Mapper

backend/core-manager/src/main/java/jp/co/gigxit/{app-prefix}/
└── rest/cmn020000/
    └── CmnMExampleResource.java                    # REST Controller
```

**Note**: A single entity generates 15+ files across 4 layers. Use EPS code generation (NOT JHipster CLI) to scaffold these files.

---

## REJECTED PATTERNS

### Rejected 1: Putting REST Resources in common Module

```java
// WRONG: REST controllers belong in microservice modules, NOT common
package {rootPackage}.rest.{moduleCode}; // in common module
@RestController
public class XxxResource { ... }
```

**Fix**: Place REST Resources in `core-manager` (for cmn/ctm), `sfa-manager` (for sfa), or `tenant-manager` (for tnt).

### Rejected 2: Domain Layer Importing Application Layer

```java
// WRONG: Domain must NOT import from Application
package {rootPackage}.domain.{moduleCode};
import {rootPackage}.application.service.dto.{moduleCode}.XxxDTO; // FORBIDDEN
```

**Fix**: Domain entities are self-contained. DTOs belong in Application layer. Use mappers to convert between layers.

### Rejected 3: Skipping the DTO/VM Separation

```java
// WRONG: Returning entity directly from REST controller
@GetMapping("/{id}")
public Mono<ResponseEntity<CmnMCustomer>> getById(@PathVariable Long id) {
    return repository.findById(id).map(ResponseEntity::ok); // Exposes domain to API
}
```

**Fix**: Entity → DTO (Application mapper) → VM (Infrastructure mapper) → REST response. This ensures API contract stability even when domain model changes.

---

## DECISION TREE

```
Architecture question?
├─ Where does this file go?
│   → Pattern 0.4 (File Type → Path Mapping table)
├─ Which Maven module?
│   → Pattern 0.5 (Deployment Rules)
├─ Can layer X import layer Y?
│   → Pattern 0.3 (Layer Dependency Rules)
├─ What's the module code format?
│   → Pattern 0.2 (Module Code System)
├─ How to scaffold a new entity?
│   → Pattern 0.6 (Cross-Module Example)
├─ What's the overall architecture?
│   → Pattern 0.1 (4-Layer Overview)
└─ Specific file type patterns?
    ├─ Entity → java-domain-specialist (1.x)
    ├─ Service → crud-service-base-specialist (45.x)
    ├─ Controller → annotated-reactive-controller-specialist (42.x)
    ├─ Repository → java-data-access-specialist (17.x)
    ├─ RowMapper → r2dbc-rowmapper-specialist (46.x)
    └─ VM → viewmodel-specialist (47.x)
```

---

## KEYWORDS

- clean architecture
- layer structure
- module code
- package path
- file placement
- maven module
- layer dependency
- domain layer
- application layer
- infrastructure layer
- presentation layer
- entity scaffolding
- cross-cutting architecture

---

## Related Specialists

- `domain/java-domain-specialist.md` — Entity patterns (Domain layer)
- `domain/java-dto-specialist.md` — DTO patterns (Application layer)
- `patterns/crud-service-base-specialist.md` — Service base class patterns
- `patterns/annotated-reactive-controller-specialist.md` — REST controller patterns
- `patterns/viewmodel-specialist.md` — VM + VM Mapper patterns
- `data-access/r2dbc-rowmapper-specialist.md` — RowMapper patterns
- `patterns/search-criteria-specialist.md` — SearchCriteria patterns
