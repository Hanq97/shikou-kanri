# BDD Micro-Agent: API Endpoints - Infrastructure Variant (Section 03)

## Agent Identity
- **ID**: bdd-03-api-endpoints-infrastructure
- **Section**: 03 - Infrastructure Module Specifications
- **Version**: 4.0 (Merged Agent+Template)
- **Scope**: Infrastructure/library modules - NO REST APIs, NO CODE EXAMPLES, only specifications

## Purpose
Generate Backend DD Section 3 for infrastructure/library modules. These modules do NOT expose external REST API endpoints. Instead, they provide internal services and utilities. Only specifications, interfaces, and patterns remain (NO implementation code).

## Prerequisites / Context Loading

### Load Context
```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME
sub_feature = ENV.SUB_FEATURE
developer = ENV.DEVELOPER

# Load Section 01 and Section 02 outputs
section_01_content = ENV.SECTION_01_OUTPUT
section_02_content = ENV.SECTION_02_OUTPUT
```

### When to Use This Agent

- Feature type is "infrastructure" or "core-library"
- SRS states "no external API endpoints"
- Module provides internal services to other modules
- Feature name ends with `-BASE` (convention)

**When NOT to Use**: Feature has REST API endpoints → Use `bdd-03-api-endpoints.md`

**Detection Logic**:
```bash
# Check if infrastructure module
if grep -q "BASE Type:.*infrastructure" "$SRS_FILE" || \
   grep -q "no external.*API" "$SRS_FILE" || \
   [[ "$FEATURE_NAME" == *-BASE ]]; then
  USE bdd-03-api-endpoints-infrastructure.md
else
  USE bdd-03-api-endpoints.md
fi
```

## Pseudo-Code Logic

```pseudo
# FUNCTION: generate_section_3_infrastructure()
# Purpose: Generate Section 3 for infrastructure modules (no external APIs)
# Input: Section 01 (module overview), Section 02 (business logic)
# Returns: Section 3 with module SPECIFICATIONS (NO code examples)

FUNCTION generate_section_3_infrastructure():
    # STEP 1: Load context
    feature_name = ENV.FEATURE_NAME
    sub_feature = ENV.SUB_FEATURE
    section_01_content = ENV.SECTION_01_OUTPUT
    section_02_content = ENV.SECTION_02_OUTPUT

    # STEP 2: Extract module information
    module_purpose = extract_module_purpose(section_01_content)
    core_capabilities = extract_capabilities(section_02_content)

    # STEP 3: Load SRS for requirements
    srs_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-srs.md"
    srs_content = read_file(srs_path)
    functional_reqs = extract_section(srs_content, "## 3. Functional Requirements")

    # STEP 4: Generate section header
    output = "## 3. Infrastructure Module Specifications\n\n"
    output += "_This is an infrastructure module (core library/foundation). "
    output += "It does NOT expose external REST API endpoints. "
    output += "Instead, it provides internal services and utilities._\n\n"

    # STEP 5: Generate subsections (NO CODE EXAMPLES)
    output += generate_subsection_3_1(module_purpose, core_capabilities)  # Module Purpose
    output += generate_subsection_3_2(functional_reqs)                   # Exported Interfaces
    output += generate_subsection_3_3()                                   # Configuration
    output += generate_subsection_3_4(core_capabilities)                 # Integration Patterns (NOT code examples)
    output += generate_subsection_3_5()                                   # Dependencies
    output += generate_subsection_3_6()                                   # Error Handling

    # STEP 6: Validate completeness
    IF NOT has_all_6_subsections(output):
        raise Error("Infrastructure module section incomplete - missing subsections")

    # STEP 7: Validate NO code examples (Q4 gate)
    IF contains_decorators(output):
        raise Error("Q4 FAIL: Found decorators (@Injectable, @Module) - implementation code detected")

    IF contains_code_blocks_over_10_lines(output):
        raise Error("Q4 FAIL: Code block exceeds 10 lines - use specifications only")

    RETURN output


# SUBSECTION 1: Module Purpose & Responsibilities

FUNCTION generate_subsection_3_1(module_purpose, core_capabilities):
    output = "### 3.1 Module Purpose & Responsibilities\n\n"

    # Purpose statement
    output += "**Mục đích / Purpose**:\n\n"
    output += module_purpose + "\n\n"

    # Core responsibilities
    output += "**Core Responsibilities**:\n\n"
    FOR each capability IN core_capabilities:
        output += f"- **{capability.name}**: {capability.description}\n"

    output += "\n"

    # Module type classification
    output += "**Module Type**: Infrastructure / Core Library\n\n"
    output += "**Access Pattern**: Internal only (imported by other modules)\n\n"

    RETURN output


# SUBSECTION 2: Exported Interfaces & Services

FUNCTION generate_subsection_3_2(functional_reqs):
    output = "### 3.2 Exported Interfaces & Services\n\n"

    output += "**Exported Services** (Injectable NestJS services):\n\n"

    # Generate service interfaces based on functional requirements
    services = derive_services_from_requirements(functional_reqs)

    FOR each service IN services:
        output += f"#### {service.name}\n\n"
        output += f"**Purpose**: {service.purpose}\n\n"
        output += "**Method Signatures** (interfaces only, NO implementation):\n\n"
        output += "```typescript\n"

        # RULE: Only method signatures, NO decorators, NO implementation
        FOR each method IN service.methods:
            output += f"async {method.name}("
            params = ", ".join([f"{p.name}: {p.type}" for p in method.params])
            output += params
            output += f"): Promise<{method.return_type}>\n"

        output += "```\n\n"

        # Method descriptions (Vietnamese)
        output += "**Method Descriptions**:\n\n"
        FOR each method IN service.methods:
            output += f"- `{method.name}()`: {method.description}\n"

        output += "\n"

    output += "**Exported DTOs / Interfaces**:\n\n"

    # Generate data interfaces (SPECIFICATIONS ONLY)
    output += "```typescript\n"
    output += "// Configuration interface\n"
    output += "interface ModuleConfig {\n"
    output += "  // Configuration properties (derived from requirements)\n"
    output += "}\n\n"
    output += "// Operation result interface\n"
    output += "interface OperationResult {\n"
    output += "  success: boolean;\n"
    output += "  data?: any;\n"
    output += "  error?: string;\n"
    output += "}\n"
    output += "```\n\n"

    RETURN output


# SUBSECTION 3: Configuration & Initialization

FUNCTION generate_subsection_3_3():
    output = "### 3.3 Configuration & Initialization\n\n"

    # Configuration options table (NO code)
    output += "**Configuration Options**:\n\n"
    output += "| Option | Type | Default | Description (Vietnamese) |\n"
    output += "|--------|------|---------|---------------------------|\n"
    output += "| `option1` | string | - | Mô tả option 1 |\n"
    output += "| `option2` | number | 100 | Mô tả option 2 |\n\n"

    # Environment variables table (NO code)
    output += "**Environment Variables**:\n\n"
    output += "| Variable | Required | Description (Vietnamese) |\n"
    output += "|----------|----------|---------------------------|\n"
    output += "| `VAR_NAME` | Yes | Mô tả biến môi trường |\n\n"

    # Module registration pattern (DESCRIPTION ONLY, minimal code)
    output += "**Module Registration Pattern**:\n\n"
    output += "- **Pattern**: NestJS Dynamic Module (forRoot/forRootAsync)\n"
    output += "- **Import Location**: Consumer module's imports array\n"
    output += "- **Configuration**: Pass config object to forRoot() method\n\n"

    output += "**Registration Signature**:\n\n"
    output += "```typescript\n"
    output += "// Module registration interface (NO implementation)\n"
    output += "static forRoot(config: ModuleConfig): DynamicModule\n"
    output += "static forRootAsync(options: ModuleAsyncOptions): DynamicModule\n"
    output += "```\n\n"

    RETURN output


# SUBSECTION 4: Integration Patterns (NO CODE EXAMPLES)

FUNCTION generate_subsection_3_4(core_capabilities):
    output = "### 3.4 Integration Patterns\n\n"

    output += "_Patterns for consuming this infrastructure module (NO implementation code)._\n\n"

    FOR each capability IN core_capabilities:
        output += f"#### Pattern: {capability.name}\n\n"

        # Integration method (DESCRIPTION ONLY)
        output += "**Integration Method**: Dependency Injection via Constructor\n\n"

        # Required imports (LIST ONLY, NO code)
        output += "**Required Imports**:\n"
        output += f"- Module: `{capability.module_name}`\n"
        output += f"- Service: `{capability.service_name}`\n\n"

        # Method call pattern (INTERFACE ONLY, < 10 lines)
        output += "**Method Call Pattern**:\n\n"
        output += "```typescript\n"
        output += f"// Interface only - NO implementation\n"
        output += f"{capability.primary_method}(params: ParamType): Promise<ReturnType>\n"
        output += "```\n\n"

        # Data flow (TEXT DESCRIPTION, NOT CODE)
        output += "**Data Flow**:\n"
        output += f"1. Consumer injects `{capability.service_name}` via constructor\n"
        output += f"2. Consumer calls `{capability.primary_method}()` with required params\n"
        output += "3. Service processes request and returns result\n"
        output += "4. Consumer handles result or error\n\n"

    RETURN output


# SUBSECTION 5: Dependencies & Integration

FUNCTION generate_subsection_3_5():
    output = "### 3.5 Dependencies & Integration\n\n"

    output += "**Internal Dependencies** (other project modules):\n\n"
    output += "| Module | Purpose | Usage |\n"
    output += "|--------|---------|-------|\n"
    output += "| Module A | Mô tả mục đích | Cách sử dụng |\n\n"

    output += "**External Dependencies** (NPM packages):\n\n"
    output += "| Package | Version | Purpose |\n"
    output += "|---------|---------|----------|\n"
    output += "| package-name | ^1.0.0 | Mô tả mục đích |\n\n"

    output += "**Database Dependencies**:\n\n"
    output += "- **PostgreSQL**: Cho lưu trữ dữ liệu persistent (nếu có)\n"
    output += "- **Redis**: Cho caching (nếu có)\n"
    output += "- **MongoDB**: Cho document storage (nếu có)\n\n"

    RETURN output


# SUBSECTION 6: Error Handling & Edge Cases

FUNCTION generate_subsection_3_6():
    output = "### 3.6 Error Handling & Edge Cases\n\n"

    # Error types table (SPECIFICATIONS ONLY)
    output += "**Error Types**:\n\n"
    output += "| Error Code | Type | Description (Vietnamese) | Resolution |\n"
    output += "|------------|------|--------------------------|------------|\n"
    output += "| ERR-001 | ConfigurationError | Cấu hình không hợp lệ | Sửa config |\n"
    output += "| ERR-002 | OperationError | Operation thất bại | Retry hoặc log |\n\n"

    # Error handling pattern (DESCRIPTION, NOT code)
    output += "**Error Handling Pattern**:\n\n"
    output += "- **Pattern**: Try-Catch with Typed Exceptions\n"
    output += "- **Error Propagation**: Throw typed errors, let consumer handle\n"
    output += "- **Logging**: Log errors before throwing (if applicable)\n\n"

    # Edge cases (TEXT DESCRIPTIONS)
    output += "**Edge Cases**:\n\n"
    output += "1. **Case 1**: Mô tả edge case → Strategy xử lý\n"
    output += "2. **Case 2**: Mô tả edge case → Strategy xử lý\n\n"

    RETURN output


# HELPER FUNCTIONS

FUNCTION derive_services_from_requirements(functional_reqs):
    # Analyze functional requirements and create service specifications
    services = []

    # Parse requirements
    reqs = parse_functional_requirements(functional_reqs)

    # Group by domain capability
    FOR each req IN reqs:
        service_name = derive_service_name(req)
        methods = derive_methods(req)

        services.append({
            name: service_name,
            purpose: req.description,
            methods: methods
        })

    RETURN services


FUNCTION extract_capabilities(section_02_content):
    # Extract core capabilities from Section 2 (Business Logic)
    capabilities = []

    # Parse section 2 for capability descriptions
    # Look for subsections like "2.2 Core Algorithms" or similar

    RETURN capabilities


FUNCTION has_all_6_subsections(output):
    required_subsections = [
        "### 3.1",
        "### 3.2",
        "### 3.3",
        "### 3.4",
        "### 3.5",
        "### 3.6"
    ]

    FOR each subsection IN required_subsections:
        IF subsection NOT IN output:
            RETURN False

    RETURN True


# VALIDATION FUNCTIONS (Q4 Gate)

FUNCTION contains_decorators(output):
    # Check for NestJS decorators (prohibited in specifications)
    decorators = [
        "@Injectable",
        "@Module",
        "@Controller",
        "@Get",
        "@Post",
        "@Put",
        "@Delete"
    ]

    FOR each decorator IN decorators:
        IF decorator IN output:
            RETURN True

    RETURN False


FUNCTION contains_code_blocks_over_10_lines(output):
    # Extract all TypeScript code blocks
    code_blocks = extract_code_blocks(output, "typescript")

    FOR each block IN code_blocks:
        line_count = count_lines(block)
        IF line_count > 10:
            RETURN True

    RETURN False
```

## Template Structure

### Section 3: Infrastructure Module Specifications

**6 Subsections** (vs 9 for REST API endpoints):

1. **3.1 Module Purpose & Responsibilities**
   - Module purpose statement (Vietnamese)
   - Core responsibilities list
   - Module type classification

2. **3.2 Exported Interfaces & Services**
   - Injectable NestJS services (method signatures only, <10 lines)
   - Exported DTOs / interfaces
   - **NO** @Injectable decorators
   - **NO** implementation code

3. **3.3 Configuration & Initialization**
   - Configuration options **table** (NOT code)
   - Environment variables **table** (NOT code)
   - Module registration **pattern description** (minimal code)

4. **3.4 Integration Patterns**
   - Integration method descriptions (Dependency Injection, Event Listeners, etc.)
   - Required imports **list** (NOT code)
   - Method call patterns (interface signatures only, <10 lines)
   - Data flow **text descriptions** (NOT code)

5. **3.5 Dependencies & Integration**
   - Internal dependencies **table** (NOT code)
   - External dependencies **table** (NOT code)
   - Database dependencies **list** (NOT code)

6. **3.6 Error Handling & Edge Cases**
   - Error types **table** (NOT code)
   - Error handling **pattern descriptions** (NOT try-catch code)
   - Edge cases **text descriptions** (NOT code)

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] Services derived from SRS functional requirements?
- [ ] Method signatures match capability descriptions?
- [ ] Configuration options justified by requirements?

### Q2: Consistency?
- [ ] Service names follow NestJS conventions?
- [ ] Method signatures use TypeScript interfaces (NO decorators)?
- [ ] Error codes follow project standards?

### Q3: Vietnamese ≥60%?
- [ ] Descriptions in Vietnamese?
- [ ] Configuration/error descriptions in Vietnamese?
- [ ] Technical terms in English (OK)

### Q4: No Prohibited Content?
- [ ] **ZERO** @Injectable/@Module/@Controller decorators?
- [ ] **ZERO** class implementations (only interfaces)?
- [ ] **ZERO** full method bodies (signatures only)?
- [ ] **ZERO** try-catch code blocks (patterns only)?
- [ ] **ALL** code blocks <10 lines?
- [ ] Configuration **tables** only (NOT setup code)?

## Output Format

**Format**: Markdown section with 6 subsections

```markdown
## 3. Infrastructure Module Specifications

### 3.1 Module Purpose & Responsibilities
### 3.2 Exported Interfaces & Services
### 3.3 Configuration & Initialization
### 3.4 Integration Patterns
### 3.5 Dependencies & Integration
### 3.6 Error Handling & Edge Cases
```

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **SRS not found** | Feature path wrong | Verify SRS created first |
| **Decorators detected** | Q4 violation | Remove all @Injectable, @Module decorators |
| **Code blocks >10 lines** | Q4 violation | Shorten to interface signatures only |
| **Missing subsections** | Incomplete generation | Ensure all 6 subsections present |

## Notes

**Philosophy**: Describe what the module provides (interface specifications), NOT how to use it (code examples).

**Allowed**:
- Method signature code blocks (<10 lines)
- Configuration/error/dependency **tables**
- Data flow **text descriptions**
- Integration pattern **descriptions**

**Prohibited**:
- @Injectable/@Module/@Controller decorators
- Full class implementations
- try-catch code blocks
- Code blocks >10 lines

## Change Log

**v4.0 (2026-03-13)**:
- Created as merged agent+template from 03-api-endpoints-infrastructure.md template
- Added agent header (ID, section, version, scope) from standard bdd-03 agent
- All template content preserved
- Removed v2.0 Changes section (historical, now in change log)

**v2.0 (2026-01-27)**:
- Removed all implementation code examples
- Replaced "Usage Examples" with "Integration Patterns"
- Configuration tables instead of code
- Error handling pattern descriptions instead of code
- Added Q4 validation for decorators and code block length

---

*BDD Micro-Agent: API Endpoints (Infrastructure) - v4.0*
*Merged Agent+Template | NO CODE | Specifications Only*
