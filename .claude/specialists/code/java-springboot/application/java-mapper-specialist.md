# Java Mapper Specialist
**Stack**: Java 21 + MapStruct 1.5+ + Spring Boot 3.4.4 | **Variant**: All (variant-agnostic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.mapper.{moduleCode}` |
| **Maven Module** | common |
| **Variant** | All (MapStruct mappers are variant-agnostic) |
| **Pattern Numbers** | 11.1–11.N |
| **Source Paths** | `{sourceRoot}/application/service/mapper/{moduleCode}/` |
| **File Count** | ~42 mapper interfaces |
| **Naming Convention** | `{Entity}Mapper.java` |
| **Base Class** | `EntityMapper<Entity, DTO>` (interface) |
| **Imports From** | Domain (Entities), Application (DTOs) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Framework** | java-spring-boot |
| **Architecture** | ANY |
| **Implementation Patterns** | N/A |

---

## Purpose
Generates MapStruct mapper interfaces for type-safe entity↔DTO conversion with compile-time code generation.

## Patterns

### Pattern 1: Basic Mapper Interface (Primary — config-based)
MapStruct generates the implementation class at compile time. The primary pattern in `common` module (108 files) uses a shared config class.
```java
package {rootPackage}.common.mapper;

import org.mapstruct.Mapper;

// PRIMARY pattern (108 files in common module)
@Mapper(config = EntityMapperConfig.class)
public interface CmnMCustomerMapper {
    CmnMCustomerDTO toDto(CmnMCustomer entity);
    CmnMCustomer toEntity(CmnMCustomerDTO dto);
}

// EntityMapperConfig centralizes: componentModel, unmappedTargetPolicy, etc.
// @MapperConfig(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
// public interface EntityMapperConfig {}
```

> **Note**: `tenant-manager` module (24 files) uses `@Mapper(componentModel = "spring")` directly instead of config class.

### Pattern 2: Field Mapping with @Mapping
Use when source/target field names differ or need transformation.
```java
@Mapper(config = EntityMapperConfig.class)
public interface CmnMCustomerMapper {
    @Mapping(source = "customerId", target = "id")
    @Mapping(source = "customerName", target = "name")
    CmnMCustomerDTO toDto(CmnMCustomer entity);

    @Mapping(source = "id", target = "customerId")
    @Mapping(source = "name", target = "customerName")
    CmnMCustomer toEntity(CmnMCustomerDTO dto);
}
```

### Pattern 3: Null-Value Strategy for Partial Updates
IGNORE null fields during update — prevents overwriting existing values with null.
```java
@Mapper(config = EntityMapperConfig.class)
public interface CmnMCustomerMapper {
    @BeanMapping(nullValuePropertyMappingStrategy =
        NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(CmnMCustomerDTO dto,
        @MappingTarget CmnMCustomer entity);
}
```

### Pattern 4: Collection Mapping
MapStruct auto-generates list mapping using the single-item mapper method.
```java
@Mapper(config = EntityMapperConfig.class)
public interface CmnMCustomerMapper {
    CmnMCustomerDTO toDto(CmnMCustomer entity);
    List<CmnMCustomerDTO> toDtoList(List<CmnMCustomer> entities);
}
```

### Pattern 5: Nested Object Mapping with `uses`
For entities with nested objects, reference other mappers via `uses`.
```java
@Mapper(config = EntityMapperConfig.class,
    uses = {CmnMAddressMapper.class, CmnMContactMapper.class})
public interface CmnMCustomerMapper {
    CmnMCustomerDTO toDto(CmnMCustomer entity);
    // MapStruct automatically delegates nested mapping to referenced mappers
}
```

### Pattern 6: Custom Mapping with Default Methods
For complex transformations not expressible with annotations.
```java
@Mapper(config = EntityMapperConfig.class)
public interface CmnMCustomerMapper {
    @Mapping(target = "fullName", source = ".", qualifiedByName = "toFullName")
    CmnMCustomerDTO toDto(CmnMCustomer entity);

    @Named("toFullName")
    default String toFullName(CmnMCustomer entity) {
        return entity.getLastName() + " " + entity.getFirstName();
    }
}
```

## Guidelines
- One mapper interface per entity (e.g., `CmnMCustomerMapper`)
- Use `@Mapper(config = EntityMapperConfig.class)` for common module (primary, 108 files)
- Use `@Mapper(componentModel = "spring")` only in tenant-manager (secondary, 24 files)
- Use `@MappingTarget` for updates (never create new entity for update)
- Use `NullValuePropertyMappingStrategy.IGNORE` for PATCH-style updates
- Keep mapper interfaces in `*.mapper` package alongside entity package
- Use `@Named` + `qualifiedByName` for custom transformation methods
- MapStruct is variant-agnostic — works with JPA, R2DBC, and JDBC entities

## REJECTED Patterns

- DO NOT write manual mapping code when MapStruct can generate it
- DO NOT use `@Mapper(componentModel = "spring")` in `common` module — use config-based mapping
- DO NOT map collections manually — let MapStruct handle `List`/`Set` mapping
- DO NOT skip `@MappingTarget` for update operations — creates unnecessary object allocation

---

## Related Specialists

- `domain/java-dto-specialist.md` — DTOs being mapped (5.x)
- `domain/java-domain-specialist.md` — entities being mapped (1.x)
- `patterns/viewmodel-specialist.md` — VM↔DTO mapping at controller layer (47.x)
