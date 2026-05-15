# BDD Micro-Agent: API Endpoints (Section 03)

## Agent Identity
- **ID**: bdd-03-api-endpoints
- **Section**: 03 - API Endpoints (Complete Specifications)
- **Output Lines**: 700-900 (depends on API count)
- **Version**: 4.0 (Merged Agent+Template)
- **Scope**: Complete API specifications with 9 subsections per endpoint (NO CODE)

## Purpose
Generate detailed API endpoint specifications for Backend Detail Design. This is the CORE agent that produces api-contracts.md with complete specifications for EACH API endpoint (9 subsections per endpoint).

## Prerequisites / Context Loading

### Load Context & API List

**CRITICAL: Frontend DD Section 5 is REQUIRED**

```pseudo
# Context from orchestrator
feature_name = ENV.FEATURE_NAME
sub_feature = ENV.SUB_FEATURE
developer = ENV.DEVELOPER

# CRITICAL: Read Frontend DD Section 5 for API list
fdd_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-frontend-detail-design.md"
fdd_content = file.read(fdd_path)
api_section = extract_section(fdd_content, "## 5. Data Integration")
api_list = extract_api_endpoints(api_section)  # Parse table

# Validate Frontend DD exists
IF NOT file_exists(fdd_path):
    raise Error("Frontend DD Section 5 is REQUIRED - API list needed")
```

### Load DD Context (INNOVATE_DD Decisions)

**CRITICAL: CLI Agent MUST read these files before generating content**

**Files to Read (in order)**:

1. **Decision Summary** (15KB - tóm tắt tất cả 108 decisions):
   ```bash
   Read .claude/memory-bank/[branch]/[feature]-[developer]/context.md
   ```

2. **Detailed DD Context** (5KB - chi tiết relevant sections):
   ```bash
   Read .claude/.tmp/dd-context/bdd-03-api-endpoints-dd-context.md
   ```

**DD Decisions to Apply for Section 3**:

| Decision | Confirmed Choice | Apply to |
|----------|------------------|----------|
| L3.5.1 | 18 RESTful endpoints across 5 groups | Endpoint structure |
| L3.5.2 | Pydantic Models với OpenAPI validation | DTO format |
| L3.5.3 | RFC 7807 Problem Details | Error responses |
| L3.5.4 | Cursor-Based pagination (max 100) | Pagination design |
| L3.1.1 | 19 event types across 5 categories | Event definitions |
| L3.2.1 | asyncio.Queue (maxsize=10000) | Queue design |

**ENFORCEMENT**: Content generated MUST match these decisions exactly.
If DD context file not found → Log warning, proceed with defaults.

## Pseudo-Code Logic

```pseudo
# FUNCTION: generate_section_3()
# Purpose: Generate complete Section 3 with 9 subsections PER endpoint
# Input: Frontend DD Section 5, Section 01 (API list), Section 02 (logic flow)
# Returns: Section 3.1-3.X (one section per API endpoint)

FUNCTION generate_section_3():
    # STEP 1: Load Section 01 output (API list from Frontend DD)
    section_01_content = ENV.SECTION_01_OUTPUT
    api_list = extract_api_table(section_01_content)

    # VALIDATE: At least 1 API endpoint
    IF len(api_list) == 0:
        raise Error("No API endpoints found in Section 1.2. Generate Section 1 first.")

    # STEP 2: Load Frontend DD for detailed API specs
    feature_name = ENV.FEATURE_NAME
    sub_feature = ENV.SUB_FEATURE
    fdd_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-frontend-detail-design.md"
    fdd_content = read_file(fdd_path)
    fdd_api_details = extract_section(fdd_content, "## 5. Data Integration")

    # STEP 3: Load SRS for business rules
    srs_path = f"documents/features/{feature_name}/{feature_name}-{sub_feature}-srs.md"
    srs_content = read_file(srs_path)
    functional_reqs = extract_section(srs_content, "## 3. Functional Requirements")

    # STEP 4: Generate Section 3 for EACH API endpoint
    output = "## 3. API Endpoint Details (CORE SECTION)\n\n"
    section_num = 1

    FOR each api_endpoint IN api_list:
        section_id = f"3.{section_num}"

        # Generate 9 subsections for this endpoint
        endpoint_section = generate_endpoint_section(
            api_endpoint,
            section_id,
            fdd_api_details,
            functional_reqs
        )

        output += endpoint_section + "\n\n---\n\n"
        section_num += 1

    # STEP 5: Validate all endpoints have 9 subsections
    FOR each api_endpoint IN api_list:
        IF NOT has_all_9_subsections(endpoint_section):
            raise Error(f"Endpoint {api_endpoint.path} incomplete - missing subsections")

    RETURN output

# MAIN FUNCTION: Generate 9 subsections for one endpoint

FUNCTION generate_endpoint_section(endpoint, section_id, fdd_api_details, functional_reqs):
    # Extract endpoint details
    method = endpoint.method          # e.g., "POST"
    path = endpoint.path               # e.g., "/api/v1/loans"
    description = endpoint.description # e.g., "Create new loan application"

    # Generate 9 subsections
    subsection_1 = generate_subsection_3_X_1(endpoint, section_id, functional_reqs)
    subsection_2 = generate_subsection_3_X_2(endpoint, section_id)
    subsection_3 = generate_subsection_3_X_3(endpoint, section_id, fdd_api_details)  # DTOs
    subsection_4 = generate_subsection_3_X_4(endpoint, section_id)  # Method signatures
    subsection_5 = generate_subsection_3_X_5(endpoint, section_id, functional_reqs)  # Business rules
    subsection_6 = generate_subsection_3_X_6(endpoint, section_id)  # Data access
    subsection_7 = generate_subsection_3_X_7(endpoint, section_id)  # Auth/authz
    subsection_8 = generate_subsection_3_X_8(endpoint, section_id)  # Error scenarios
    subsection_9 = generate_subsection_3_X_9(endpoint, section_id)  # Performance

    # Combine all subsections
    output = f"""### {section_id} {method} {path}

{subsection_1}

{subsection_2}

{subsection_3}

{subsection_4}

{subsection_5}

{subsection_6}

{subsection_7}

{subsection_8}

{subsection_9}
"""

    RETURN output

# SUBSECTION GENERATORS

FUNCTION generate_subsection_3_X_1(endpoint, section_id, functional_reqs):
    output = f"""#### {section_id}.1 Endpoint Overview

- **Purpose**: {endpoint.description}
- **Business rules summary**: [Extract from SRS functional requirements]
- **Pre-conditions**:
  - User authenticated (if {endpoint.auth_required})
  - [Other pre-conditions from business rules]
- **Post-conditions**:
  - [What changes after successful execution]
  - [Side effects: events published, notifications sent]
- **References**:
  - SRS: [FR-XXX, FR-YYY]
  - Frontend DD: Section 5.1.{section_id.split('.')[-1]}
"""
    RETURN output

FUNCTION generate_subsection_3_X_2(endpoint, section_id):
    method_name = convert_to_method_name(endpoint.path)  # e.g., "/api/v1/loans" → "createLoan"

    output = f"""#### {section_id}.2 Processing Flow

**Request Flow:**

```
Client
  │
  └──> HTTP {endpoint.method} {endpoint.path}
       │
       ▼
  ┌─────────────┐
  │ Controller  │ → {method_name}()
  └──────┬──────┘
         │ 1. Validate DTO
         │ 2. Call Service
         ▼
  ┌─────────────┐
  │   Service   │ → {method_name}Service()
  └──────┬──────┘
         │ A. Business rules check
         │ B. Processing logic
         │ C. Repository call
         │ D. Side effects (events)
         ▼
  ┌─────────────┐
  │ Repository  │ → {method_name}Repository()
  └──────┬──────┘
         │ - Query database
         │ - Map to entities
         ▼
    [(Database)]
         │
         ▼
    Response DTO
```

**Processing Steps:**
1. **Input Validation**: Validate request DTO against rules (required fields, formats, ranges)
2. **Business Rules**: Apply business logic (e.g., age >= 18, amount within limits)
3. **Data Operation**: {infer_data_operation(endpoint.method)} operation on database
4. **Side Effects**: Emit events to message queue (async), send notifications
5. **Response**: Return success DTO with created/updated entity data
"""
    RETURN output

FUNCTION generate_subsection_3_X_3(endpoint, section_id, fdd_api_details):
    # CRITICAL: DTOs as interfaces ONLY - NO decorators
    request_dto_name = f"{capitalize(endpoint.resource_name)}RequestDto"
    response_dto_name = f"{capitalize(endpoint.resource_name)}ResponseDto"

    output = f"""#### {section_id}.3 DTOs Specification

> **CRITICAL**: DTOs defined as TypeScript interfaces (NO decorators like @IsString, @Min, @Max)

**Request DTO:**

```typescript
interface {request_dto_name} {{
  // [Extract fields from Frontend DD Section 5]
  // Example fields (replace with actual):
  field1: string;    // Description, constraints: min 1, max 255 chars
  field2: number;    // Description, constraints: min 1000000, max 500000000
  field3?: boolean;  // Optional field
}}
```

**Response DTO:**

```typescript
interface {response_dto_name} {{
  id: string;           // UUID
  // [Mirror request fields]
  field1: string;
  field2: number;
  field3?: boolean;
  // Additional response fields
  status: string;       // Enum: PENDING, ACTIVE, REJECTED
  createdAt: Date;      // ISO 8601 timestamp
  updatedAt: Date;
}}
```

**Validation Rules** (applied in middleware, NOT in DTO):

| Field | Type | Required | Constraints | Error Message (Vietnamese) |
|-------|------|----------|-------------|---------------------------|
| field1 | string | Yes | min: 1, max: 255 | "Trường field1 bắt buộc, tối đa 255 ký tự" |
| field2 | number | Yes | min: 1000000, max: 500000000 | "Số tiền phải từ 1,000,000 đến 500,000,000" |
| field3 | boolean | No | - | - |

**Enum Definitions:**

```typescript
enum ResourceStatus {{
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED'
}}
```
"""
    RETURN output

FUNCTION generate_subsection_3_X_4(endpoint, section_id):
    method_name = convert_to_method_name(endpoint.path)
    controller_class = f"{capitalize(endpoint.resource_name)}Controller"
    service_class = f"{capitalize(endpoint.resource_name)}Service"
    repository_class = f"{capitalize(endpoint.resource_name)}Repository"

    output = f"""#### {section_id}.4 Method Signatures

> **CRITICAL**: Method signatures ONLY (NO implementation code)

**Controller:**

```typescript
// HTTP {endpoint.method} handler
async {method_name}(
  user: UserEntity,              // Authenticated user (from middleware)
  dto: {capitalize(endpoint.resource_name)}RequestDto   // Request body
): Promise<{capitalize(endpoint.resource_name)}ResponseDto>
```

**Service:**

```typescript
// Business logic orchestration
async {method_name}Service(
  userId: string,
  dto: {capitalize(endpoint.resource_name)}RequestDto
): Promise<{capitalize(endpoint.resource_name)}Entity>
```

**Repository:**

```typescript
// Data persistence
async {method_name}Repository(
  entity: {capitalize(endpoint.resource_name)}Entity
): Promise<{capitalize(endpoint.resource_name)}Entity>
```

**Layer Responsibilities:**
- **Controller**: HTTP handling, DTO validation, response formatting
- **Service**: Business rules, transaction management, side effects
- **Repository**: Database operations, query building, entity mapping
"""
    RETURN output

FUNCTION generate_subsection_3_X_5(endpoint, section_id, functional_reqs):
    output = f"""#### {section_id}.5 Business Rules Details

**Business Rules:**

| Rule ID | Rule Description | Formula/Logic | Exception if Fail |
|---------|------------------|---------------|-------------------|
| BR-{section_id}-001 | [Rule 1 from SRS] | [Formula or logic expression] | ValidationException: "Lỗi validation" |
| BR-{section_id}-002 | [Rule 2 from SRS] | [Formula or logic expression] | BusinessRuleException: "Vi phạm quy tắc nghiệp vụ" |
| BR-{section_id}-003 | [Rule 3 from SRS] | [Formula or logic expression] | EligibilityException: "Không đủ điều kiện" |

**Rule Execution Order:**
1. **Input Validation** → Validate DTO structure and types
2. **Business Rule 1** → [Description]
3. **Business Rule 2** → [Description]
4. **Business Rule 3** → [Description]
5. **Persist** → Save to database if all rules pass

**Example Business Rule Implementation** (pseudo-code):

```pseudo
# RULE: Age requirement
IF user.age < 18:
    throw EligibilityException("Phải từ 18 tuổi trở lên")

# RULE: Amount range
IF NOT (1000000 <= dto.amount <= 500000000):
    throw ValidationException("Số tiền phải từ 1,000,000 đến 500,000,000")

# RULE: Status check
IF user.kyc_status != "VERIFIED":
    throw BusinessRuleException("Phải hoàn thành KYC trước")
```
"""
    RETURN output

FUNCTION generate_subsection_3_X_6(endpoint, section_id):
    data_operation = infer_data_operation(endpoint.method)  # POST → INSERT, GET → SELECT

    output = f"""#### {section_id}.6 Data Access

**Database Operations:**

| Operation | Table(s) | Query Type | Transaction Required | Lock Type |
|-----------|----------|------------|---------------------|-----------|
| {data_operation} | {endpoint.resource_name}_table | {data_operation} | Yes | Optimistic/Pessimistic |

**Query Pattern:**

```sql
-- Example query (abstract, NO actual SQL in final document)
-- {data_operation} on {endpoint.resource_name}_table
-- Filters: [List filters from business rules]
-- Joins: [If needed, list related tables]
-- Indexes used: [List indexes from Section 4.2]
```

**Entity Mapping:**

| DTO Field | Entity Property | Database Column | Transformation |
|-----------|----------------|-----------------|----------------|
| field1 | entityField1 | column_field_1 | Direct mapping |
| field2 | entityField2 | column_field_2 | Number formatting |

**Transaction Scope:**
- **Begin**: At service method entry
- **Operations**: All database operations within this endpoint
- **Commit**: On successful completion (all rules passed)
- **Rollback**: On any exception (validation, business rule, database)

**Isolation Level**: READ_COMMITTED (default) or SERIALIZABLE (if data consistency critical)
"""
    RETURN output

FUNCTION generate_subsection_3_X_7(endpoint, section_id):
    output = f"""#### {section_id}.7 Authentication & Authorization

**Authentication:**
- **Required**: {endpoint.auth_required}
- **Method**: JWT token in Authorization header (`Bearer <token>`)
- **Token Validation**: Call auth-service for validation (< 100ms SLA)
- **Cache**: Validated tokens cached for 5 minutes (reduce auth-service load)

**Authorization:**

| Resource Action | Required Roles | Permissions | Additional Checks |
|-----------------|---------------|-------------|-------------------|
| {endpoint.method} {endpoint.path} | {infer_roles(endpoint.method)} | {infer_permissions(endpoint.method)} | [e.g., Owner check, status check] |

**Guard Logic** (pseudo-code):

```pseudo
# STEP 1: Authentication
token = request.headers["Authorization"]
IF NOT token:
    throw UnauthorizedException("Missing token")

user = validate_token_with_auth_service(token)
IF NOT user:
    throw UnauthorizedException("Invalid token")

# STEP 2: Authorization
required_roles = {infer_roles(endpoint.method)}
IF user.role NOT IN required_roles:
    throw ForbiddenException("Insufficient permissions")

# STEP 3: Additional checks (if applicable)
IF resource_owner_check_required:
    IF resource.owner_id != user.id:
        throw ForbiddenException("Not resource owner")
```

**Roles:**
- **USER**: Authenticated user (basic access)
- **ADMIN**: Administrator (full access)
- **[CUSTOM_ROLE]**: [Description]

**Permissions:**
- **READ**: View data
- **WRITE**: Create/update data
- **DELETE**: Delete data
"""
    RETURN output

FUNCTION generate_subsection_3_X_8(endpoint, section_id):
    output = f"""#### {section_id}.8 Error Scenarios

**Error Codes:**

| HTTP Status | Error Code | Error Message (Vietnamese) | User Action | Retry? |
|-------------|------------|---------------------------|-------------|--------|
| 400 | VALIDATION_ERROR | "Dữ liệu không hợp lệ: [field]" | Fix input, resubmit | No |
| 401 | UNAUTHORIZED | "Chưa đăng nhập hoặc token hết hạn" | Re-login | Yes |
| 403 | FORBIDDEN | "Không có quyền truy cập" | Contact admin | No |
| 404 | NOT_FOUND | "{Resource} không tồn tại" | Check ID, retry | No |
| 409 | CONFLICT | "Dữ liệu đã tồn tại (duplicate)" | Use existing or update | No |
| 422 | BUSINESS_RULE_FAILED | "Vi phạm quy tắc nghiệp vụ: [rule]" | Fix data, resubmit | No |
| 500 | INTERNAL_SERVER_ERROR | "Lỗi hệ thống, vui lòng thử lại sau" | Retry later | Yes |
| 503 | SERVICE_UNAVAILABLE | "Dịch vụ tạm thời không khả dụng" | Retry later | Yes |

**Error Response Format:**

```typescript
interface ErrorResponseDto {{
  statusCode: number;       // HTTP status code
  errorCode: string;         // Application error code
  message: string;           // Vietnamese error message for user
  details?: object;          // Additional details (validation errors, field-level errors)
  timestamp: Date;           // Error timestamp
  path: string;              // Request path
  requestId: string;         // Unique request ID for tracing
}}
```

**Example Error Response:**

```json
{{
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": {{
    "field1": "Trường field1 bắt buộc",
    "field2": "Số tiền phải từ 1,000,000 đến 500,000,000"
  }},
  "timestamp": "2025-12-13T10:30:00Z",
  "path": "/api/v1/{endpoint.resource_name}",
  "requestId": "req-123abc"
}}
```
"""
    RETURN output

FUNCTION generate_subsection_3_X_9(endpoint, section_id):
    output = f"""#### {section_id}.9 Performance Requirements

**Performance Targets:**

| Metric | Target | Measurement Method | Actions if Exceeded |
|--------|--------|-------------------|---------------------|
| Response Time (p50) | < 200ms | Application monitoring | Optimize query, add cache |
| Response Time (p95) | < 500ms | Application monitoring | Review slow queries, add indexes |
| Response Time (p99) | < 1000ms | Application monitoring | Alert, investigate bottleneck |
| Throughput | {endpoint.rate_limit} req/min | Rate limiter | Throttle, queue excess requests |
| Error Rate | < 1% | Application monitoring | Alert, rollback if spike |

**Caching Strategy:**

| Data Type | Cache Location | TTL | Invalidation Trigger |
|-----------|---------------|-----|---------------------|
| [Frequently accessed data] | Redis | 5 minutes | On update/delete |
| [User session data] | Redis | 30 minutes | On logout |
| [Static reference data] | Redis | 1 hour | On admin update |

**Rate Limiting:**
- **Limit**: {endpoint.rate_limit} requests per minute per user
- **Algorithm**: Token bucket or sliding window
- **Response**: HTTP 429 (Too Many Requests) when exceeded
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Query Optimization:**
- **Indexes**: [List indexes from Section 4.2 needed for this endpoint]
- **Joins**: Minimize JOINs, use eager loading for related entities
- **Pagination**: Limit result sets (default: 20, max: 100 items per page)
- **Query Plan**: Analyze slow queries (> 100ms), optimize with EXPLAIN

**Scalability Considerations:**
- **Horizontal Scaling**: Stateless design, session in Redis (not in-memory)
- **Database Connection Pool**: Reuse connections, pool size = (core_count * 2 + 1)
- **Async Processing**: Long-running tasks (> 3s) moved to message queue
"""
    RETURN output

# UTILITY FUNCTIONS

FUNCTION infer_data_operation(http_method):
    IF http_method == "GET":
        RETURN "SELECT"
    ELSE IF http_method == "POST":
        RETURN "INSERT"
    ELSE IF http_method == "PUT" OR http_method == "PATCH":
        RETURN "UPDATE"
    ELSE IF http_method == "DELETE":
        RETURN "DELETE"
    ELSE:
        RETURN "UNKNOWN"

FUNCTION infer_roles(http_method):
    IF http_method == "GET":
        RETURN ["USER", "ADMIN"]
    ELSE IF http_method IN ["POST", "PUT", "PATCH", "DELETE"]:
        RETURN ["USER", "ADMIN"]  # Or ["ADMIN"] for admin-only operations
    ELSE:
        RETURN ["USER"]

FUNCTION infer_permissions(http_method):
    IF http_method == "GET":
        RETURN ["READ"]
    ELSE IF http_method == "POST":
        RETURN ["WRITE"]
    ELSE IF http_method IN ["PUT", "PATCH"]:
        RETURN ["WRITE"]
    ELSE IF http_method == "DELETE":
        RETURN ["DELETE"]
    ELSE:
        RETURN ["READ"]

FUNCTION convert_to_method_name(path):
    # /api/v1/loans → createLoan, updateLoan, etc.
    resource = path.split("/")[-1]
    RETURN f"handle{capitalize(resource)}"

FUNCTION capitalize(text):
    RETURN text[0].upper() + text[1:]
```

## Validation (Q1-Q4)

### Q1: Evidence-Based?
- [ ] All API endpoints from Section 1.2 have Section 3.X entries?
- [ ] Each endpoint has ALL 9 subsections (3.X.1-3.X.9)?
- [ ] DTOs extracted from Frontend DD Section 5?
- [ ] Business rules extracted from SRS Section 3?

### Q2: Consistency?
- [ ] API endpoints match Section 1.2 exactly (method, path)?
- [ ] DTOs defined as interfaces (NO decorators @IsString, @Min, @Max)?
- [ ] Method signatures only (NO implementation bodies)?
- [ ] All error codes follow standard format?

### Q3: Vietnamese ≥60%?
- [ ] Calculate Vietnamese character ratio ≥ 60%
- [ ] Error messages in Vietnamese
- [ ] Business rule descriptions in Vietnamese
- [ ] Technical code (DTOs, signatures) in English OK

### Q4: No Prohibited Content?
- [ ] Zero TypeORM decorators (@Entity, @Column, @IsString, @Min, @Max)
- [ ] Zero SQL DDL (CREATE TABLE, CREATE INDEX)
- [ ] Zero implementation code (method bodies)
- [ ] Zero Guard/Interceptor implementations (only describe)
- [ ] All code blocks <10 lines (interface signatures only)
- [ ] Only specifications and contracts

## Output Format

**Format**: Markdown section (700-900 lines, depends on API count)

```markdown
## 3. API Endpoints

### 3.1 [API 1 Name] (e.g., POST /api/v1/loans)
#### 3.1.1 Overview
#### 3.1.2 Processing Flow
#### 3.1.3 Request/Response DTOs
#### 3.1.4 Service Method Signatures
#### 3.1.5 Business Rules
#### 3.1.6 Data Access Patterns
#### 3.1.7 Authentication & Authorization
#### 3.1.8 Error Scenarios
#### 3.1.9 Performance Requirements

---

### 3.2 [API 2 Name]
[Repeat 9 subsections...]
```

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Frontend DD not found** | Not created yet | Create Frontend DD first |
| **Frontend DD Section 5 missing** | Incomplete Frontend DD | Complete Frontend DD Section 5 (Data Integration) |
| **API mismatch** | Manual edit | Re-read Frontend DD Section 5 |
| **DTOs have decorators** | Prohibited content | Remove all @Entity, @Column, @IsString, etc. |
| **Method implementation present** | Prohibited content | Keep signatures only, remove method bodies |

## Notes

**CORE Section**: This is the most critical section - most complex and detailed.

**9 Subsections per Endpoint**:
1. Endpoint Overview - Purpose, pre/post conditions
2. Processing Flow - Request flow diagram
3. DTOs Specification - Request/response interfaces (NO decorators)
4. Method Signatures - Controller/Service/Repository signatures (NO implementation)
5. Business Rules Details - Rules from SRS with formulas
6. Data Access - Database operations, transactions
7. Authentication & Authorization - JWT, roles, permissions
8. Error Scenarios - Error codes, messages (Vietnamese)
9. Performance Requirements - Response time, caching, rate limiting

**Output Size**: ~800+ lines (depends on endpoint count)
- For 5 endpoints: ~4,000 lines (800 per endpoint)
- For 10 endpoints: ~8,000 lines

**API Contracts Extraction**:
- Agent 03 also extracts `api-contracts.md` from this section
- API Contracts = consumer-friendly version of Section 3
- Format: OpenAPI-style, all endpoints, all error codes

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (bdd-03) and template (03) into single file
- Removed JIT template loading (dead path)
- Pseudo-code logic now embedded directly in agent
- Removed Template Version Compatibility, Best Practices, Integration with Orchestrator sections
- Removed Critical Prohibited Content section (covered by Q4)

**v3.1 (2026-01-27)**:
- Updated to use Template v2.0 (NO CODE philosophy)
- Strengthened Q4 validation (no decorators, 10-line limit)
- Added infrastructure template support (03-api-endpoints-infrastructure.md v2.0)
- Removed code examples from output specifications

**v3.0 (2025-12-13)**:
- Migrated to JIT template loading pattern
- Implements 03-api-endpoints.md template
- Added Q1-Q4 validation from template
- Added Frontend DD Section 5 dependency check
- Removed embedded logic (now in template)
- Agent size reduced to ~300 lines (from ~1000 lines in v2.0)

---

*BDD Micro-Agent: API Endpoints - v4.0*
*Merged Agent+Template | NO CODE | Specifications Only*
