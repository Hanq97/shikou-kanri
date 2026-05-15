# FDD Micro-Agent: Data Integration (Section 05) - v4.0
**Last Updated**: 2026-03-13

## Agent Identity
- **ID**: fdd-05-data-integration
- **Version**: 4.0 (Merged Agent+Template)
- **Section**: Section 5 - Data Integration
- **Output**: Section 5.1-5.4 (API endpoints, React Query specs, caching, error handling)
- **Language**: Vietnamese >=60%
- **Renamed From**: fdd-07-server-state.md

---

## Purpose

Generate **Section 5: Data Integration** for Frontend Detail Design document.

**CRITICAL**: This section defines **API requirements that Backend DD will implement**.

Backend Detail Design will:
1. Read this section to understand Frontend's API needs
2. Design API endpoints matching these specifications
3. Implement DTOs, controllers, services to fulfill requirements

**Output Structure**:
- **5.1**: API Endpoints Overview (method, path, purpose, caching)
- **5.2**: API Endpoint Details (request/response specs for each endpoint)
- **5.3**: React Query Configuration (query keys, stale time, cache time)
- **5.4**: Error Handling (error codes, HTTP status, user feedback)

**NO implementation code** - only specifications and API contracts.

---

## Prerequisites / Context Loading

**From Orchestrator (via environment)**:
```javascript
ENV = {
  FEATURE_NAME: "LND",        // Feature code
  SUB_FEATURE: "BASE",        // Sub-feature code
  DEVELOPER: "Developer Name",
  REASONING_JSON: {...},      // Reasoning output (if available)
  SECTION_00_OUTPUT: "...",   // Section 00 output (Document Info)
  SECTION_01_OUTPUT: "...",   // Section 01 output (Overview)
  SECTION_02_OUTPUT: "...",   // Section 02 output (Business Flow)
  SECTION_03_OUTPUT: "...",   // Section 03 output (Screen Design)
  SECTION_04_OUTPUT: "...",   // Section 04 output (State Management)
}
```

**Auto-Read Files**:
1. **Section 03 Output**: Screen Design (for component data needs)
2. **Section 04 Output**: State Management (for server state patterns)
3. **Basic Design**: `documents/features/[FEATURE]/[FEATURE]-[SUB]-basic-design.md`
   - Section 4: API Overview (for endpoint conventions)

**Context Loading Logic**:
```pseudo
FUNCTION load_context():
    context = {
        "feature": ENV["FEATURE_NAME"],
        "sub": ENV["SUB_FEATURE"],
        "reasoning": ENV["REASONING_JSON"]
    }

    # Load dependencies
    section_04 = READ_FILE(f"documents/features/{context.feature}/{context.sub}-frontend-detail-design.md")
    section_06 = READ_SECTION(section_04, "06")  # UI State section
    basic_design = READ_FILE(f"documents/features/{context.feature}/{context.sub}-basic-design.md")

    api_mappings = context.reasoning.apiMappings IF exists ELSE infer_from_screens(context.reasoning.screens)
    components = context.reasoning.components
    screens = context.reasoning.screens

    RETURN {context, api_mappings, components, screens, basic_design}
```

---

## Pseudo-Code Logic

```pseudo
# ============================================================
# TEMPLATE: Section 05 - Data Integration
# PURPOSE: Generate API integration requirements for Backend DD
# INPUT: reasoning.json (apiMappings, components, screens)
# OUTPUT: Markdown section (200-400 lines)
# ============================================================

# STEP 1: GENERATE API ENDPOINTS OVERVIEW (5.1)
FUNCTION generate_api_overview(api_mappings, screens, feature, sub):
    output = []
    output.append("## 05. Quản lý Server State (Server State Management)\n\n")
    output.append("> **Lưu ý quan trọng:** Section này định nghĩa các API mà Frontend cần.\n")
    output.append("> Backend Detail Design sẽ sử dụng section này để thiết kế chi tiết API endpoints, DTOs, validation rules.\n\n")

    output.append("### 5.1 API Endpoints Required (Overview)\n\n")
    output.append("**API Endpoint Summary:**\n\n")
    output.append("| # | Method | Endpoint | Mô tả | Used By Component | Cache Strategy |\n")
    output.append("|---|--------|----------|-------|-------------------|----------------|\n")

    # Generate endpoint list
    endpoint_index = 1
    feature_path = feature.lower() + "-" + sub.lower()

    # Common CRUD endpoints
    output.append(f"| {endpoint_index} | GET | /api/v1/{feature_path} | Lấy danh sách với filter + pagination | [ListPage] | 5 min stale, 10 min cache |\n")
    endpoint_index += 1
    output.append(f"| {endpoint_index} | GET | /api/v1/{feature_path}/:id | Lấy chi tiết một item | [DetailPage] | 5 min stale, 10 min cache |\n")
    endpoint_index += 1
    output.append(f"| {endpoint_index} | POST | /api/v1/{feature_path} | Tạo mới item | [CreateModal] | Invalidate list cache |\n")
    endpoint_index += 1
    output.append(f"| {endpoint_index} | PUT | /api/v1/{feature_path}/:id | Cập nhật item | [EditModal] | Invalidate item + list |\n")
    endpoint_index += 1
    output.append(f"| {endpoint_index} | DELETE | /api/v1/{feature_path}/:id | Xóa item (soft delete) | [DeleteConfirm] | Invalidate list cache |\n")
    endpoint_index += 1

    # Business-specific endpoints from api_mappings
    FOR mapping IN api_mappings:
        IF mapping.method NOT IN ["GET", "POST", "PUT", "DELETE"]:  # PATCH, custom actions
            component = mapping.component OR infer_component(mapping, screens)
            cache_strategy = infer_cache_strategy(mapping)
            output.append(f"| {endpoint_index} | {mapping.method} | {mapping.endpoint} | {mapping.description_vi} | {component} | {cache_strategy} |\n")
            endpoint_index += 1

    output.append(f"\n**Total Endpoints:** {endpoint_index - 1} endpoints\n\n")

    RETURN "".join(output)

# STEP 2: GENERATE API ENDPOINT DETAILS (5.2)
FUNCTION generate_api_specifications(feature, sub, screens, api_mappings):
    output = []
    output.append("### 5.2 API Endpoint Details (Specifications)\n\n")

    feature_path = feature.lower() + "-" + sub.lower()

    # 5.2.1 GET List
    output.append(f"#### 5.2.1 GET /api/v1/{feature_path} - List với Pagination + Filters\n\n")
    output.append(f"**Mục đích:** Lấy danh sách {feature}-{sub} với phân trang, lọc, tìm kiếm, sắp xếp\n\n")
    output.append("**Query Parameters:**\n\n")
    output.append("| Parameter | Kiểu | Bắt buộc | Mặc định | Validation | Mô tả |\n")
    output.append("|-----------|------|----------|----------|------------|-------|\n")
    output.append("| page | number | Không | 1 | >= 1 | Số trang (1-indexed) |\n")
    output.append("| size | number | Không | 20 | 1-100 | Số items mỗi trang |\n")
    output.append("| search | string | Không | - | maxLength: 200 | Tìm kiếm theo tên/mô tả |\n")
    output.append("| status | string | Không | - | enum: [...] | Lọc theo trạng thái |\n")
    output.append("| sortBy | string | Không | createdAt | enum: [...] | Cột sắp xếp |\n")
    output.append("| sortDir | 'asc' \| 'desc' | Không | desc | - | Hướng sắp xếp |\n\n")

    # Request example
    output.append("**Request Example:**\n")
    output.append(f"```\nGET /api/v1/{feature_path}?page=1&size=20&status=active&sortBy=createdAt&sortDir=desc\n```\n\n")

    # Response format
    output.append("**Response Format (Success - 200 OK):**\n\n")
    output.append("```json\n")
    output.append("{\n")
    output.append("  \"items\": [\n")
    output.append("    {\n")
    output.append("      \"id\": \"123e4567-e89b-12d3-a456-426614174000\",\n")
    output.append("      \"name\": \"Example Item\",\n")
    output.append("      \"status\": \"active\",\n")
    output.append("      \"createdAt\": \"2025-01-01T10:00:00Z\"\n")
    output.append("    }\n")
    output.append("  ],\n")
    output.append("  \"pagination\": {\n")
    output.append("    \"total\": 150,\n")
    output.append("    \"page\": 1,\n")
    output.append("    \"size\": 20,\n")
    output.append("    \"totalPages\": 8,\n")
    output.append("    \"hasNext\": true,\n")
    output.append("    \"hasPrev\": false\n")
    output.append("  }\n")
    output.append("}\n")
    output.append("```\n\n")

    # Error responses
    output.append("**Error Responses:**\n\n")
    output.append("| HTTP Status | Error Code | Message | Frontend Handling |\n")
    output.append("|-------------|------------|---------|-------------------|\n")
    output.append("| 400 | ERR_INVALID_PARAMS | \"Invalid query parameters\" | Toast error + log |\n")
    output.append("| 401 | ERR_UNAUTHORIZED | \"Unauthorized\" | Redirect to login |\n")
    output.append("| 403 | ERR_FORBIDDEN | \"Insufficient permissions\" | Show 403 page |\n")
    output.append("| 500 | ERR_INTERNAL | \"Internal server error\" | Toast error + retry |\n\n")

    # 5.2.2 GET Detail
    output.append(f"#### 5.2.2 GET /api/v1/{feature_path}/:id - Chi tiết Item\n\n")
    output.append(f"**Mục đích:** Lấy chi tiết đầy đủ của một {feature}-{sub} item\n\n")
    output.append("**Path Parameters:**\n\n")
    output.append("| Parameter | Kiểu | Validation | Mô tả |\n")
    output.append("|-----------|------|------------|-------|\n")
    output.append(f"| id | UUID | Valid UUID v4 | ID của {feature}-{sub} |\n\n")

    output.append("**Response Format (Success - 200 OK):**\n\n")
    output.append("```json\n")
    output.append("{\n")
    output.append("  \"id\": \"123e4567-e89b-12d3-a456-426614174000\",\n")
    output.append("  \"name\": \"Example Item\",\n")
    output.append("  \"description\": \"Full detail view\",\n")
    output.append("  \"status\": \"active\",\n")
    output.append("  \"createdBy\": { \"id\": \"user-1\", \"name\": \"User A\", \"email\": \"usera@example.com\" },\n")
    output.append("  \"createdAt\": \"2025-01-01T10:00:00Z\",\n")
    output.append("  \"updatedAt\": \"2025-01-02T15:30:00Z\"\n")
    output.append("}\n")
    output.append("```\n\n")

    # 5.2.3 POST Create
    output.append(f"#### 5.2.3 POST /api/v1/{feature_path} - Tạo mới Item\n\n")
    output.append(f"**Mục đích:** Tạo mới một {feature}-{sub} item\n\n")
    output.append("**Request Body Example:**\n\n")
    output.append("```json\n")
    output.append("{\n")
    output.append("  \"name\": \"New Item\",\n")
    output.append("  \"description\": \"Item description\",\n")
    output.append("  \"status\": \"active\"\n")
    output.append("}\n")
    output.append("```\n\n")
    output.append("**Response Format (Success - 201 Created):**\n\n")
    output.append("Returns created object (same format as GET detail)\n\n")

    # 5.2.4 PUT Update
    output.append(f"#### 5.2.4 PUT /api/v1/{feature_path}/:id - Cập nhật Item\n\n")
    output.append(f"**Mục đích:** Cập nhật toàn bộ {feature}-{sub} item\n\n")
    output.append("**Request Body:** Same as POST create\n\n")
    output.append("**Response Format (Success - 200 OK):** Returns updated object\n\n")

    # 5.2.5 DELETE
    output.append(f"#### 5.2.5 DELETE /api/v1/{feature_path}/:id - Xóa Item\n\n")
    output.append(f"**Mục đích:** Xóa (soft delete) một {feature}-{sub} item\n\n")
    output.append("**Response Format (Success - 204 No Content):** No body\n\n")

    RETURN "".join(output)

# STEP 3: GENERATE REACT QUERY CONFIG (5.3)
FUNCTION generate_react_query_config(feature, sub):
    output = []
    output.append("### 5.3 React Query Configuration (Cache Strategy)\n\n")

    feature_key = feature.lower() + "-" + sub.lower()

    # Query keys
    output.append("**Query Keys Convention:**\n\n")
    output.append("| Query | Query Key | Purpose |\n")
    output.append("|-------|-----------|---------||\n")
    output.append(f"| List | `['{feature_key}', filters]` | List với filters (filters = object) |\n")
    output.append(f"| Detail | `['{feature_key}', id]` | Chi tiết một item |\n")
    output.append(f"| Stats | `['{feature_key}', 'stats', params]` | Thống kê/dashboard |\n")
    output.append(f"| Related | `['{feature_key}', id, 'related']` | Related data (documents, comments) |\n\n")

    # Cache configuration
    output.append("**Cache Configuration:**\n\n")
    output.append("| Query Type | Stale Time | Cache Time | Refetch On | Retry |\n")
    output.append("|------------|------------|------------|------------|-------|\n")
    output.append("| List | 5 minutes | 10 minutes | Window focus | 3 times |\n")
    output.append("| Detail | 5 minutes | 10 minutes | Window focus | 3 times |\n")
    output.append("| Stats | 1 minute | 5 minutes | Window focus | 2 times |\n")
    output.append("| Static data | Infinity | Infinity | Never | 1 time |\n\n")

    output.append("**Explanation:**\n")
    output.append("- **Stale Time**: Sau bao lâu data được coi là \"cũ\" (trigger background refetch)\n")
    output.append("- **Cache Time**: Sau bao lâu xóa data khỏi cache (khi không còn observer)\n")
    output.append("- **Refetch On**: Tự động refetch khi window focus, mount, reconnect\n")
    output.append("- **Retry**: Số lần retry khi API call thất bại\n\n")

    RETURN "".join(output)

# STEP 4: GENERATE CACHE INVALIDATION (5.4)
FUNCTION generate_cache_invalidation(feature, sub):
    output = []
    output.append("### 5.4 Cache Invalidation (Mutation Side Effects)\n\n")

    feature_key = feature.lower() + "-" + sub.lower()

    output.append("**Invalidation Strategy:**\n\n")
    output.append("| Mutation | Invalidate Queries | Refetch | Optimistic Update |\n")
    output.append("|----------|-------------------|---------|-------------------|\n")
    output.append(f"| create{feature}{sub} | `['{feature_key}']` (all lists) | Yes | Append to list |\n")
    output.append(f"| update{feature}{sub} | `['{feature_key}', id]` + `['{feature_key}']` | Yes | Update in place |\n")
    output.append(f"| delete{feature}{sub} | `['{feature_key}']` (all lists) | Yes | Remove from list |\n")
    output.append(f"| [action] | `['{feature_key}', id]` + related | Yes | Update status |\n\n")

    output.append("**Explanation:**\n")
    output.append("- **Invalidate**: Mark queries as stale (trigger background refetch)\n")
    output.append("- **Refetch**: Immediately refetch queries (for critical updates)\n")
    output.append("- **Optimistic Update**: Update UI before API response (rollback on error)\n\n")

    RETURN "".join(output)

# STEP 5: GENERATE ERROR HANDLING (5.5)
FUNCTION generate_error_handling():
    output = []
    output.append("### 5.5 Error Handling (HTTP Status & Error Codes)\n\n")

    output.append("**Error Response Format (Standard):**\n\n")
    output.append("```json\n")
    output.append("{\n")
    output.append("  \"error\": \"ERR_CODE\",\n")
    output.append("  \"message\": \"Human-readable error message\",\n")
    output.append("  \"statusCode\": 400,\n")
    output.append("  \"timestamp\": \"2025-01-01T10:00:00Z\",\n")
    output.append("  \"path\": \"/api/v1/feature\",\n")
    output.append("  \"fields\": {\n")
    output.append("    \"fieldName\": \"Field-specific error message\"\n")
    output.append("  }\n")
    output.append("}\n")
    output.append("```\n\n")

    output.append("**Error Code Mapping:**\n\n")
    output.append("| HTTP Status | Error Code | Error Category | Frontend Handling | User Feedback |\n")
    output.append("|-------------|------------|----------------|-------------------|---------------|\n")
    output.append("| 400 | ERR_VALIDATION | Validation error | Show inline field errors | Highlight invalid fields |\n")
    output.append("| 401 | ERR_UNAUTHORIZED | Authentication | Redirect to login | \"Phiên đăng nhập hết hạn\" |\n")
    output.append("| 403 | ERR_FORBIDDEN | Authorization | Show 403 page | \"Không có quyền truy cập\" |\n")
    output.append("| 404 | ERR_NOT_FOUND | Not found | Show 404 page / Toast | \"Không tìm thấy\" |\n")
    output.append("| 409 | ERR_CONFLICT | Duplicate / Conflict | Toast error | \"Dữ liệu đã tồn tại\" |\n")
    output.append("| 422 | ERR_BUSINESS_RULE | Business logic | Toast error with details | Show business rule message |\n")
    output.append("| 429 | ERR_RATE_LIMIT | Too many requests | Toast + disable button | \"Quá nhiều request, thử lại sau\" |\n")
    output.append("| 500 | ERR_INTERNAL | Server error | Toast + Retry button | \"Lỗi hệ thống, vui lòng thử lại\" |\n")
    output.append("| 503 | ERR_SERVICE_UNAVAILABLE | Service down | Show maintenance page | \"Hệ thống đang bảo trì\" |\n\n")

    output.append("**Retry Strategy:**\n\n")
    output.append("| Error Type | Retry | Backoff | Max Retries |\n")
    output.append("|------------|-------|---------|-------------|\n")
    output.append("| Network error (no response) | Yes | Exponential (1s, 2s, 4s) | 3 |\n")
    output.append("| 5xx Server errors | Yes | Exponential (2s, 4s, 8s) | 3 |\n")
    output.append("| 4xx Client errors | No | - | 0 |\n")
    output.append("| 429 Rate limit | Yes | Linear (delay from header) | 2 |\n\n")

    RETURN "".join(output)

# STEP 6: GENERATE OPTIMISTIC UPDATES (5.6)
FUNCTION generate_optimistic_updates():
    output = []
    output.append("### 5.6 Optimistic Updates (Instant UI Feedback)\n\n")

    output.append("**Optimistic Update Pattern:**\n\n")
    output.append("| Action | Optimistic Behavior | Rollback Trigger | Rollback Behavior |\n")
    output.append("|--------|---------------------|------------------|-------------------|\n")
    output.append("| Create | Append to list (temp ID) | API error | Remove from list |\n")
    output.append("| Update | Update in place | API error | Revert to old value |\n")
    output.append("| Delete | Remove from list | API error | Restore to list |\n")
    output.append("| Toggle status | Update status | API error | Revert status |\n")
    output.append("| Reorder | Update order | API error | Revert order |\n")
    output.append("| Increment | Increase count | API error | Decrease count |\n\n")

    output.append("**Implementation Notes:**\n")
    output.append("- **Temp ID**: Use `temp-${Date.now()}` for optimistic creates\n")
    output.append("- **Animation**: Fade out for delete, highlight for update\n")
    output.append("- **Rollback**: Smooth animation to avoid jarring UX\n")
    output.append("- **Error Toast**: Show specific error message on rollback\n\n")

    RETURN "".join(output)

# STEP 7: GENERATE BACKGROUND SYNC (5.7)
FUNCTION generate_background_sync():
    output = []
    output.append("### 5.7 Background Sync & Polling\n\n")

    output.append("**Background Refetch Strategy:**\n\n")
    output.append("| Query Type | Refetch Interval | Refetch On | Purpose |\n")
    output.append("|------------|------------------|------------|---------||\n")
    output.append("| List (active) | 30 seconds | Window focus | Keep list fresh |\n")
    output.append("| Detail (active) | 1 minute | Window focus | Update detail view |\n")
    output.append("| Stats/Dashboard | 10 seconds | Window focus | Real-time stats |\n")
    output.append("| Notifications | 5 seconds | Always | Real-time alerts |\n\n")

    output.append("**Polling Configuration:**\n\n")
    output.append("| Scenario | Polling | Stop Condition | Fallback |\n")
    output.append("|----------|---------|----------------|----------|\n")
    output.append("| Waiting for async task | 2s interval | Task complete / 2 min timeout | Show timeout error |\n")
    output.append("| Real-time updates | 5s interval | User navigates away | - |\n")
    output.append("| Dashboard stats | 10s interval | User inactive > 5 min | Pause polling |\n\n")

    RETURN "".join(output)

# STEP 8: ASSEMBLE COMPLETE OUTPUT
FUNCTION main():
    data = load_context()
    output = []

    # Generate all sections
    output.append(generate_api_overview(data.api_mappings, data.screens, data.context.feature, data.context.sub))
    output.append(generate_api_specifications(data.context.feature, data.context.sub, data.screens, data.api_mappings))
    output.append(generate_react_query_config(data.context.feature, data.context.sub))
    output.append(generate_cache_invalidation(data.context.feature, data.context.sub))
    output.append(generate_error_handling())
    output.append(generate_optimistic_updates())
    output.append(generate_background_sync())

    result = "".join(output)

    # Validation
    errors = validate_output(result, data)
    IF errors:
        RAISE Error(f"Validation failed: {', '.join(errors)}")

    RETURN result
```

---

## Validation (Q1-Q4)

```pseudo
FUNCTION validate_output(output, data):
    errors = []

    # Q1: Evidence-Based?
    IF "5.1 API Endpoints Required" NOT IN output:
        errors.append("Missing API endpoints overview")
    IF "5.2 API Endpoint Details" NOT IN output:
        errors.append("Missing API specifications")
    IF "5.3 React Query Configuration" NOT IN output:
        errors.append("Missing React Query config")

    # Q2: Consistency?
    crud_operations = ["GET list", "GET detail", "POST create", "PUT update", "DELETE"]
    FOR operation IN crud_operations:
        IF operation NOT IN output.lower():
            errors.append(f"Missing {operation} endpoint specification")

    # Q3: Vietnamese >=60%?
    vietnamese_ratio = calculate_vietnamese_ratio(output)
    IF vietnamese_ratio < 0.60:
        errors.append(f"Vietnamese ratio {vietnamese_ratio:.0%} < 60%")

    # Q4: No Prohibited Content?
    prohibited_patterns = ["useQuery", "useMutation", "queryClient", "axios.get", "axios.post", "async function", "const "]
    FOR pattern IN prohibited_patterns:
        IF pattern IN output:
            errors.append(f"Contains prohibited implementation code: {pattern}")

    RETURN errors
```

---

## Output Format

**Generated Markdown** (300-500 lines) containing sections 5.1-5.7 as specified in pseudo-code above.

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| **Section 03 not found** | Screen Design missing | Generate Section 03 first |
| **No endpoints derived** | Screen Design incomplete | Check Section 03 has CRUD screens |
| **Vietnamese < 60%** | Too much English | Add more Vietnamese descriptions |

---

## Notes

- **State Management Separation**: Server State (React Query) vs UI State (Redux Toolkit) vs Form State (React Hook Form) vs URL State (React Router searchParams)
- **React Query Benefits**: Automatic caching, background sync, optimistic updates, request deduplication, retry logic, DevTools
- **Technology Stack**: React Query (TanStack Query) v5.x, Axios v1.x
- **Cache Strategy**: Stale-while-revalidate pattern
- **Length**: 200-400 lines
- **Language**: Vietnamese >=60% (descriptions, table content), English (technical terms, API paths)
- **Line Width**: <=150 characters
- **Schema Format**: JSON examples for request/response bodies

---

## Change Log

**v4.0 (2026-03-13)**:
- Merged agent (fdd-05-data-integration.md) + template (05-data-integration.md) into single file
- Removed JIT template loading (dead path)
- Inlined all pseudo-code logic from template
- Added subsections 5.5 (Error Handling), 5.6 (Optimistic Updates), 5.7 (Background Sync)

**v3.0 (2025-12-12)**:
- Renamed from fdd-07-server-state.md -> fdd-05-data-integration.md
- Switched to JIT template loading pattern
- Updated to match new 05-data-integration.md template
- Added 4 subsections (5.1-5.4) structure
- Enhanced validation (Q1-Q4)

---

*FDD Micro-Agent: Data Integration - v4.0*
*P2P Insurance & Lending Platform*
*React 18.x + React Query + Axios*
