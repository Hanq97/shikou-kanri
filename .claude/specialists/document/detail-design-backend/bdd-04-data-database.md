# BDD Micro-Agent: Data & Database (Section 04)

## Agent Identity
- **ID**: bdd-04-data-database
- **Section**: 04 - Data & Database Schema
- **Output Lines**: 700-900
- **Version**: 4.0 (Merged Agent+Template)
- **Scope**: Entity models, database schema, indexes, relationships

## Purpose
Generate database schema specifications for Backend Detail Design. This agent contains the complete pseudo-code logic for generating entity specifications, physical database schema, ERD diagrams, and migration strategy (NO TypeORM decorators, NO SQL DDL, NO interface/class definitions).

## Prerequisites / Context Loading

### Load Context
```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME
sub_feature = ENV.SUB_FEATURE
developer = ENV.DEVELOPER

# Read Basic Design for data model
bd_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-basic-design.md"
bd_content = file.read(bd_path)
data_model = extract_section(bd_content, "## 3. Data Design")
```

## Pseudo-Code Logic

```pseudo
# FUNCTION: generate_section_4()
# Purpose: Generate complete Section 4 with 5 subsections (SPECIFICATIONS ONLY)
# Input: Basic Design Section 4 (data model), Section 03 (entity needs)
# Returns: Section 4.1-4.5 (NO TypeScript code, NO decorators)

FUNCTION generate_section_4():
    # STEP 1: Load Basic Design data model
    feature_name = ENV.FEATURE_NAME
    sub_feature = ENV.SUB_FEATURE
    bd_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-basic-design.md"
    bd_content = read_file(bd_path)
    data_model = extract_section(bd_content, "## 4. Data Model")

    # STEP 2: Parse entities from Basic Design
    entities = parse_entities_from_basic_design(data_model)

    # STEP 3: Load Section 03 to infer database needs
    section_03_content = ENV.SECTION_03_OUTPUT
    database_needs = infer_database_needs(section_03_content)

    # STEP 4: Generate Section 4.1 (Entity Specifications - TABLE format only)
    section_4_1 = generate_section_4_1(entities)

    # STEP 5: Generate Section 4.2 (Database Schema - TABLE format only)
    section_4_2 = generate_section_4_2(entities)

    # STEP 6: Generate Section 4.3 (Entity Relationships - ERD + TABLE)
    section_4_3 = generate_section_4_3(entities)

    # STEP 7: Generate Section 4.4 (Entity-Table Mapping - TABLE only)
    section_4_4 = generate_section_4_4(entities)

    # STEP 8: Generate Section 4.5 (Data Migration Strategy - TEXT description)
    section_4_5 = generate_section_4_5()

    # STEP 9: Combine all subsections
    output = f"""## 4. Data & Database Design

{section_4_1}

---

{section_4_2}

---

{section_4_3}

---

{section_4_4}

---

{section_4_5}

---
"""

    # STEP 10: Validate NO code (Q4 gate)
    IF contains_decorators(output):
        raise Error("Q4 FAIL: Found decorators - implementation code detected")

    IF contains_interface_definitions(output):
        raise Error("Q4 FAIL: Found interface definitions - use tables only")

    RETURN output

# HELPER FUNCTIONS

FUNCTION generate_section_4_1(entities):
    output = """### 4.1 Entity Specifications

> **Mục đích**: Định nghĩa các entity theo góc nhìn business logic (KHÔNG phải code)

"""

    FOR each entity IN entities:
        output += f"""#### {entity.name} Entity

**Purpose** (Vietnamese): {entity.purpose}

**Fields Specification:**

| Field Name | Data Type | Required | Unique | Default | Business Rule | Description (VN) |
|------------|-----------|----------|--------|---------|---------------|------------------|
"""
        FOR each field IN entity.fields:
            required_str = "Yes" IF NOT field.optional ELSE "No"
            unique_str = "Yes" IF field.is_unique ELSE "No"
            default_val = field.default_value OR "-"
            rule = field.business_rule OR "-"

            output += f"| {field.name} | {field.type} | {required_str} | {unique_str} | {default_val} | {rule} | {field.description_vn} |\n"

        output += f"""
**Constraints** (Vietnamese):
"""
        FOR each constraint IN entity.constraints:
            output += f"- {constraint.description_vn}\n"

        output += "\n"

    output += """
**Notes**:
- Field names: camelCase (code) → snake_case (database)
- Entity names: PascalCase (code) → plural_snake_case (database)
- Implementation code in Specialists (`specialists/code/nestjs-blockchain/entities.md`)
"""

    RETURN output

FUNCTION generate_section_4_2(entities):
    output = """### 4.2 Database Schema Specifications

> **Mục đích**: Định nghĩa cấu trúc database (KHÔNG phải SQL DDL)

"""

    FOR each entity IN entities:
        table_name = convert_to_table_name(entity.name)  # e.g., "Loan" → "loans"

        output += f"""#### Table: `{table_name}`

**Purpose** (Vietnamese): {entity.purpose}

**Columns Specification:**

| Column Name | PostgreSQL Type | Constraints | Index Type | Description (VN) |
|-------------|-----------------|-------------|------------|------------------|
"""
        FOR each field IN entity.fields:
            column_name = convert_to_column_name(field.name)  # camelCase → snake_case
            db_type = map_to_db_type(field.type)
            constraints = infer_constraints_text(field)
            index_type = infer_index_type(field)

            output += f"| {column_name} | {db_type} | {constraints} | {index_type} | {field.description_vn} |\n"

        output += f"""
**Indexes Specification:**

| Index Name | Columns | Type | Purpose (VN) |
|------------|---------|------|--------------|
"""
        indexes = infer_table_indexes(entity)
        FOR each index IN indexes:
            output += f"| {index.name} | {index.columns} | {index.type} | {index.purpose_vn} |\n"

        output += "\n"

    output += """
**Notes**:
- SQL DDL implementation in migration files (NOT in design document)
- Index creation strategy: Concurrent creation for large tables
- Column defaults handled by ORM (TypeORM) or application code
"""

    RETURN output

FUNCTION generate_section_4_3(entities):
    output = """### 4.3 Entity Relationships

> **Mục đích**: Mô tả mối quan hệ giữa các entities (ERD + specification table)

**Entity Relationship Diagram:**

```mermaid
erDiagram
"""

    # Generate entity definitions (SIMPLIFIED - no full schema)
    FOR each entity IN entities:
        output += f"    {entity.name} {{\n"
        # Only show key fields (id, foreign keys)
        key_fields = filter_key_fields(entity.fields)
        FOR each field IN key_fields:
            output += f"        {field.type} {field.name}\n"
        output += "    }\n"

    # Generate relationships
    FOR each entity IN entities:
        FOR each relationship IN entity.relationships:
            cardinality = map_cardinality(relationship.type)
            output += f"    {entity.name} {cardinality} {relationship.target_entity} : {relationship.description}\n"

    output += """```

**Relationships Specification:**

| Source Entity | Target Entity | Type | Foreign Key (Source) | Description (VN) | Cascading Rule |
|---------------|---------------|------|----------------------|------------------|----------------|
"""

    FOR each entity IN entities:
        FOR each relationship IN entity.relationships:
            output += f"| {entity.name} | {relationship.target_entity} | {relationship.type} | {relationship.foreign_key} | {relationship.description_vn} | {relationship.cascade_rule} |\n"

    output += """
**Relationship Types:**
- **1:1 (One-to-One)**: Mỗi record ở Entity A liên kết với đúng 1 record ở Entity B
- **1:N (One-to-Many)**: 1 record ở Entity A liên kết với nhiều records ở Entity B
- **M:N (Many-to-Many)**: Nhiều records ở Entity A liên kết với nhiều records ở Entity B (cần junction table)

**Cascading Rules:**
- **CASCADE**: Xóa parent → Xóa tất cả children
- **SET NULL**: Xóa parent → Set foreign key = NULL ở children
- **RESTRICT**: Không cho xóa parent nếu còn children
- **NO ACTION**: Không action nào (check constraint at database level)
"""

    RETURN output

FUNCTION generate_section_4_4(entities):
    output = """### 4.4 Entity-Table Mapping

> **Mục đích**: Quy ước mapping giữa code và database

**Entity-Table Mapping:**

| Entity Name (Code) | Table Name (DB) | Primary Key Column | Auto-generated ID |
|--------------------|-----------------|--------------------|--------------------|
"""

    FOR each entity IN entities:
        table_name = convert_to_table_name(entity.name)
        pk_column = infer_primary_key_column(entity)
        auto_gen = "Yes (UUID)" IF entity.uses_uuid ELSE "Yes (SERIAL)" IF entity.uses_serial ELSE "No"

        output += f"| {entity.name} | {table_name} | {pk_column} | {auto_gen} |\n"

    output += """
**Naming Conventions:**

| Aspect | Code Convention | Database Convention | Example |
|--------|-----------------|---------------------|---------|
| Entity names | PascalCase | plural_snake_case | `LoanEntity` → `loans` |
| Field names | camelCase | snake_case | `userId` → `user_id` |
| Foreign keys | camelCase + Id | snake_case + _id | `lenderId` → `lender_id` |
| Junction tables | - | entity1_entity2 (sorted) | - → `loan_collaterals` |
| Enum values | UPPER_CASE | UPPER_CASE | `Status.ACTIVE` → `'ACTIVE'` |

**Data Type Mapping:**

| TypeScript Type | PostgreSQL Type | Size/Precision | Notes |
|-----------------|-----------------|----------------|-------|
| string | VARCHAR(255) | 255 chars | Adjust if needed (e.g., text for long content) |
| number (int) | INTEGER | 4 bytes | For whole numbers (-2B to +2B) |
| number (bigint) | BIGINT | 8 bytes | For large numbers |
| number (float) | DECIMAL(10,2) | 10 digits, 2 decimals | For currency (precise) |
| boolean | BOOLEAN | 1 byte | TRUE/FALSE |
| Date | TIMESTAMP | - | ISO 8601 format with timezone |
| string (UUID) | UUID | 16 bytes | For IDs (128-bit) |
| enum | VARCHAR(50) | 50 chars | Store enum value as string |
| object (JSON) | JSONB | Variable | For nested objects (indexed) |
| array | JSONB or separate table | - | Depends on query needs |

**Notes**:
- Use UUID for distributed systems (no collision)
- Use SERIAL/BIGSERIAL for simple auto-increment
- Use JSONB for flexible schemas (with GIN index for queries)
- Use separate tables for arrays requiring joins/filtering
"""

    RETURN output

FUNCTION generate_section_4_5():
    output = """### 4.5 Data Migration Strategy

> **Mục đích**: Chiến lược quản lý schema changes (KHÔNG phải migration code)

**Migration Approach:**

| Aspect | Strategy | Rationale (VN) |
|--------|----------|----------------|
| **Tool** | TypeORM Migrations | Version control cho schema, rollback support |
| **Versioning** | Timestamp-based | Thứ tự chronological, tránh conflicts |
| **Execution** | Automated (CI/CD) | Nhất quán, giảm human errors |
| **Rollback** | Down migrations | Undo changes nếu deployment fails |
| **Testing** | Staging environment | Test trước khi production |

**Migration Workflow:**

```mermaid
flowchart TD
    A[Schema Changes in Code] --> B[Generate Migration File]
    B --> C[Review Migration]
    C --> D[Test on Dev Database]
    D --> E{Tests Pass?}
    E -->|Yes| F[Commit Migration to Git]
    E -->|No| B
    F --> G[Deploy to Staging]
    G --> H[Run Migration on Staging DB]
    H --> I{Migration Success?}
    I -->|Yes| J[Deploy to Production]
    I -->|No| K[Rollback Migration]
    K --> L[Fix Issues]
    L --> B
```

**Migration Best Practices:**

**1. Backward Compatibility (Zero-Downtime Deployments):**

| Step | Action | Rationale |
|------|--------|-----------|
| Phase 1 | Add column as NULLABLE | Old code still works |
| Phase 2 | Backfill data | Populate new column |
| Phase 3 | Make NOT NULL | Enforce constraint |
| Phase 4 | Deploy new code | Use new column |
| Phase 5 | Drop old column (later) | Clean up after stable |

**2. Large Table Migrations:**

| Strategy | When to Use | Implementation |
|----------|-------------|----------------|
| Batching | >1M rows update | Update in chunks (10k rows/batch) |
| Concurrent indexing | Add index on large table | `CREATE INDEX CONCURRENTLY` (no lock) |
| Off-peak execution | Slow migrations | Schedule during low-traffic (3-5 AM) |
| Shadow columns | Risky changes | Add new column, dual-write, verify, switch |

**3. Data Integrity Checks:**

- Verify foreign key constraints before migration
- Check unique constraints (no duplicates)
- Validate data types (no truncation)
- Test rollback on staging first

**4. Rollback Strategy:**

| Scenario | Rollback Action | Prevention |
|----------|-----------------|------------|
| Migration fails | Run down migration | Test on staging first |
| Data corruption | Restore from backup + replay transactions | Use transactions |
| Performance issue | Revert code + migration | Load testing before production |

**Migration File Structure (Pseudo-code):**

```pseudo
# Migration: add_kyc_status_to_users
# Created: 2026-01-27
# Description: Add KYC verification status to users table

UP migration (forward):
  STEP 1: ADD COLUMN kyc_status VARCHAR(50) NULL
  STEP 2: CREATE INDEX idx_users_kyc_status ON users(kyc_status)
  STEP 3: UPDATE users SET kyc_status = 'PENDING' WHERE kyc_status IS NULL
  STEP 4: ALTER COLUMN kyc_status SET NOT NULL
  STEP 5: ADD CHECK CONSTRAINT (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED'))

DOWN migration (rollback):
  STEP 1: DROP CHECK CONSTRAINT
  STEP 2: DROP INDEX idx_users_kyc_status
  STEP 3: DROP COLUMN kyc_status
```

**Initial Schema Setup (New Database):**

**Migration sequence:**
1. **001_create_core_tables.ts**: Users, roles, permissions
2. **002_create_business_tables.ts**: Domain entities (loans, investments, etc.)
3. **003_add_foreign_keys.ts**: Relationships between tables
4. **004_create_indexes.ts**: Performance indexes
5. **005_seed_initial_data.ts**: Default roles, system users (if needed)

**Notes**:
- Actual migration code in TypeORM migration files (NOT in design document)
- Implementation patterns in Specialists (`specialists/code/database/migrations.md`)
- Always test migrations on copy of production data (staging)
"""

    RETURN output

# UTILITY FUNCTIONS (for pseudo-code readability)

FUNCTION convert_to_table_name(entity_name):
    # "Loan" → "loans", "UserProfile" → "user_profiles"
    snake_case = to_snake_case(entity_name)
    RETURN pluralize(snake_case)

FUNCTION convert_to_column_name(field_name):
    # "userId" → "user_id"
    RETURN to_snake_case(field_name)

FUNCTION map_to_db_type(typescript_type):
    type_mapping = {
        "string": "VARCHAR(255)",
        "number": "INTEGER",
        "boolean": "BOOLEAN",
        "Date": "TIMESTAMP",
        "UUID": "UUID",
        "object": "JSONB"
    }
    RETURN type_mapping.get(typescript_type, "VARCHAR(255)")

FUNCTION infer_constraints_text(field):
    # Return constraints as TEXT (NOT SQL code)
    constraints = []

    IF field.is_primary_key:
        constraints.append("PRIMARY KEY")
    IF NOT field.optional:
        constraints.append("NOT NULL")
    IF field.is_unique:
        constraints.append("UNIQUE")
    IF field.has_default:
        constraints.append(f"DEFAULT {field.default_value}")

    RETURN ", ".join(constraints) OR "None"

FUNCTION infer_index_type(field):
    IF field.is_primary_key:
        RETURN "Primary Key"
    ELSE IF field.is_foreign_key:
        RETURN "Foreign Key Index"
    ELSE IF field.is_indexed:
        RETURN "B-tree Index"
    ELSE:
        RETURN "None"

FUNCTION map_cardinality(relationship_type):
    # Map relationship type to Mermaid ERD syntax
    cardinality_map = {
        "1:1": "||--||",
        "1:N": "||--o{",
        "M:N": "}o--o{"
    }
    RETURN cardinality_map.get(relationship_type, "||--o{")

FUNCTION filter_key_fields(fields):
    # Only return primary key and foreign key fields for ERD
    RETURN [f FOR f IN fields IF f.is_primary_key OR f.is_foreign_key]

# VALIDATION FUNCTIONS (Q4 Gate)

FUNCTION contains_decorators(output):
    decorators = ["@Entity", "@Column", "@PrimaryGeneratedColumn", "@ManyToOne", "@OneToMany"]
    FOR each decorator IN decorators:
        IF decorator IN output:
            RETURN True
    RETURN False

FUNCTION contains_interface_definitions(output):
    # Check for TypeScript interface/class definitions
    patterns = ["interface ", "class ", "export class", "export interface"]
    FOR each pattern IN patterns:
        IF pattern IN output:
            RETURN True
    RETURN False
```

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] All 5 subsections present (4.1-4.5)?
- [ ] Entities derived from Basic Design Section 4?
- [ ] Entity fields complete (all fields documented in tables)?
- [ ] ERD relationships documented with tables?

### Q2: Consistency?
- [ ] Entities in Section 4.1 match tables in Section 4.2?
- [ ] Entity relationships in ERD match foreign keys in table?
- [ ] Field mappings consistent (camelCase → snake_case)?
- [ ] No code, only specifications?

### Q3: Vietnamese ≥60%?
- [ ] Field descriptions in Vietnamese
- [ ] Table purposes in Vietnamese
- [ ] Strategy rationales in Vietnamese
- [ ] Technical terms in English OK

### Q4: No Prohibited Content?
- [ ] **ZERO** TypeORM decorators (@Entity, @Column, @PrimaryGeneratedColumn, @ManyToOne)?
- [ ] **ZERO** TypeScript interface/class definitions?
- [ ] **ZERO** SQL DDL statements (CREATE TABLE, ALTER TABLE, CREATE INDEX)?
- [ ] **ZERO** migration class implementations?
- [ ] **ONLY** specification tables, ERD diagrams, text descriptions?

## Output Format

**Format**: Markdown section (700-900 lines)

```markdown
## 4. Data & Database Design

### 4.1 Entity Specifications
[Field specification tables per entity - NO interfaces]

### 4.2 Database Schema Specifications
[Column specification tables per table - NO SQL DDL]

### 4.3 Entity Relationships
[Mermaid ERD + relationship specification table]

### 4.4 Entity-Table Mapping
[Naming conventions, data type mapping tables]

### 4.5 Data Migration Strategy
[Migration workflow, best practices, rollback strategy]

---
```

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Basic Design not found** | Not created yet | Create Basic Design first |
| **Entity has decorators** | Prohibited content | Remove @Entity, @Column, @OneToMany, etc. |
| **SQL DDL present** | Prohibited content | Remove CREATE TABLE, use descriptive tables |
| **Interface definitions found** | Prohibited content | Use specification tables instead |
| **Migration code present** | Prohibited content | Remove migration class code |

## Notes

**Key Principle**: Describe database design, NOT implement it.

**Allowed**:
- Entity field specification **tables**
- Database schema specification **tables**
- ERD diagrams (Mermaid, simplified)
- Naming convention **tables**
- Migration workflow diagrams (Mermaid)
- Strategy description **tables**

**Prohibited**:
- TypeScript interfaces/classes
- TypeORM decorators (@Entity, @Column)
- SQL DDL statements (CREATE TABLE, CREATE INDEX)
- Migration code implementations
- Any code blocks > 10 lines

**Output Size**: ~600-700 lines

**Where to find implementation code**:
- Entity implementation: `specialists/code/nestjs-blockchain/entities.md`
- Migration code: `specialists/code/database/migrations.md`
- TypeORM patterns: `specialists/code/nestjs-blockchain/typeorm-patterns.md`

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (bdd-04) and template (04) into single file
- Removed JIT template loading (dead path)
- Pseudo-code logic now embedded directly in agent
- Removed Template Version Compatibility, Best Practices, Integration with Orchestrator sections
- Removed Critical Prohibited Content section (covered by Q4 and Notes)

**v3.1 (2026-01-27)**:
- Updated to use Template v2.0 (NO CODE philosophy)
- Removed code examples, only specifications and tables
- Strengthened Q4 validation (no decorators, no implementation code)
- Templates expanded from stubs to full specifications

**v3.0 (2025-12-13)**:
- Migrated to JIT template loading pattern
- Implements 04-data-database.md template
- Added Q1-Q4 validation from template
- Removed embedded logic (now in template)
- Agent size reduced to ~250 lines (from ~561 lines in v2.0)

---

*BDD Micro-Agent: Data & Database - v4.0*
*Merged Agent+Template | NO CODE | Specifications Only*
