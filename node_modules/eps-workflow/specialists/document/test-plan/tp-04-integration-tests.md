# Test Plan Micro-Agent: Integration Tests
# テスト計画マイクロエージェント：統合テスト
# Micro-Agent Kế Hoạch Kiểm Thử: Kiểm Thử Tích Hợp

**Version**: 1.0.0
**Section**: 4. Kiểm thử tích hợp (Integration Tests)
**Output Lines**: ~200 lines
**Purpose**: Generate integration test specifications for API endpoints and database operations
**Specialist**: tps-java-integration.md (BE) + tps-nextjs-integration.md (FE)

---

## Responsibility

Generate Section 4 of Test Plan containing:
- 4.1 Kiểm thử API (API Integration Tests) — IT-API-[###]
- 4.2 Kiểm thử Database (Database Integration Tests) — IT-DB-[###]

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| Backend DD | `documents/features/{dir}/{feature}-*-backend-detail-design.md` | Optional (DETAILED) |
| API Contracts | `documents/features/{dir}/{feature}-*-api-contracts.md` | Optional |
| Stack vars | Step 0.5 | YES |
| context_level | Step 2 | YES |
| test_id_counters | From tp-03 (last UT IDs) | YES |

---

## Specialist Loading

```pseudo
# Load test-type specialists (scope-aware)
if scope != "frontend":
    java_int_spec = read_file("specialists/code/java-springboot/test-plan/tps-java-integration.md")
if scope != "backend":
    nextjs_int_spec = read_file("specialists/code/nextjs/test-plan/tps-nextjs-integration.md")
```

**WHY**: Backend integration tests focus on WebTestClient + R2DBC + Testcontainers. Frontend integration tests focus on MSW + Redux. Loading both for fullstack features ensures complete coverage.

---

## RAG Integration

**WHY**: `findByStereotype("Controller")` returns actual REST controllers with their endpoints. Test plan specifies tests per real endpoint, not generic.

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    controllers = await rag.findByStereotype("Controller", { topK: 5 })
    repositories = await rag.findByStereotype("Repository", { topK: 5 })
    specialists = await rag.querySpecialists(
        ["java-testing", "r2dbc", "integration"], topK=2)
except:
    controllers = []; repositories = []; specialists = []
```

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What API endpoints need integration testing? (from DD or RAG controllers)
2. What database operations need verification? (from DD or RAG repositories)
3. What HTTP status codes should each endpoint return? (normal + abnormal)
4. What is the reactive testing stack? (WebTestClient, NOT MockMvc)
5. What NORMAL patterns? (valid request → expected response)
6. What ABNORMAL patterns? (400, 401, 403, 404, 409, 500, timeout, cross-tenant)

**REASON**:
- IF controllers found via RAG → use actual controller/endpoint names
- IF DD exists → extract endpoints from Section 3 (Endpoints)
- IF API Contracts exist → map contract to test cases
- IF context_level == "BASIC" → test per FR-ID, not per endpoint
- IF context_level == "MODERATE" → test per component from BD
- ALWAYS include abnormal HTTP status tests (at least 400, 401, 404)

**VALIDATE CONSTRAINTS**:
- [ ] Test IDs: `IT-API-[###]` and `IT-DB-[###]`
- [ ] No implementation code
- [ ] Priorities assigned
- [ ] Vietnamese >= 60%
- [ ] Both normal AND abnormal present

### Step 2: GENERATE SECTION

**IF context_level == "DETAILED"**:

```markdown
## 4. Kiểm thử tích hợp (Integration Tests)

### 4.1 Kiểm thử API (API Integration Tests)

**Công cụ**: WebTestClient + @SpringBootTest(webEnvironment = RANDOM_PORT)
**Stack**: Reactive (NOT MockMvc)

#### [ControllerName] (từ DD Section 3)

| Test ID | Loại | Endpoint | Method | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|----------|--------|-------------------|-------------------|---------|
| IT-API-001 | Normal | /api/v1/[resource] | POST | [Tạo mới hợp lệ] | 201 Created + body | P0 |
| IT-API-002 | Abnormal | /api/v1/[resource] | POST | [Thiếu trường bắt buộc] | 400 Bad Request | P0 |
| IT-API-003 | Abnormal | /api/v1/[resource] | GET | [Không tìm thấy ID] | 404 Not Found | P1 |
| IT-API-004 | Abnormal | /api/v1/[resource] | POST | [Không có token] | 401 Unauthorized | P0 |

### 4.2 Kiểm thử Database (Database Integration Tests)

**Công cụ**: @DataR2dbcTest + Testcontainers (PostgreSQL 17)
**Stack**: R2DBC (NOT JPA)

| Test ID | Loại | Thao tác (Operation) | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|---------------------|-------------------|-------------------|---------|
| IT-DB-001 | Normal | INSERT | [Tạo entity hợp lệ] | Record tạo thành công | P0 |
| IT-DB-002 | Abnormal | INSERT | [Vi phạm unique constraint] | DataIntegrityViolation | P1 |
```

**IF context_level == "MODERATE"**:

```markdown
## 4. Kiểm thử tích hợp (Integration Tests)

### 4.1 Kiểm thử API (API Integration Tests)

**Công cụ**: WebTestClient (Reactive)

| Test ID | Loại | Module | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|--------|-------------------|-------------------|---------|
| IT-API-001 | Normal | [Module from BD] | [API call hợp lệ] | Success response | P0 |
| IT-API-002 | Abnormal | [Module from BD] | [Invalid request] | Error response | P1 |

### 4.2 Kiểm thử Database (Database Integration Tests)

**Công cụ**: @DataR2dbcTest + Testcontainers

| Test ID | Loại | Module | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|--------|-------------------|-------------------|---------|
| IT-DB-001 | Normal | [Module] | [DB operation] | Success | P0 |
| IT-DB-002 | Abnormal | [Module] | [Constraint violation] | Error | P1 |
```

**IF context_level == "BASIC"**:

```markdown
## 4. Kiểm thử tích hợp (Integration Tests)

### 4.1 Kiểm thử API (API Integration Tests)

**Công cụ**: WebTestClient (Reactive)

| Test ID | Loại | Yêu cầu | Mô tả (Test Case) | Kết quả mong đợi | Ưu tiên |
|---------|------|---------|-------------------|-------------------|---------|
| IT-API-001 | Normal | FR-XXX-001 | [API integration per FR] | Success | P0 |
| IT-API-002 | Abnormal | FR-XXX-001 | [Error case per FR] | Error response | P1 |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: All controllers from DD (or FRs from SRS) have at least 1 normal + 1 abnormal API test?
**Q2**: Test IDs follow `IT-API-[###]` and `IT-DB-[###]`?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code?

### Step 4: VALIDATION

- [ ] 2 sub-sections (4.1 API, 4.2 Database) — unless scope restricts
- [ ] WebTestClient referenced (NOT MockMvc) — reactive stack
- [ ] R2DBC referenced (NOT JPA) — `@DataR2dbcTest`
- [ ] Testcontainers PostgreSQL 17 mentioned
- [ ] Abnormal HTTP statuses covered (400, 401, 403, 404 minimum)
- [ ] Normal AND Abnormal present
- [ ] ≤ 200 lines

---

## Output Format

See Step 2 templates above (context_level dependent).

---

## Quality Standards

- **Completeness**: Both 4.1 (API) and 4.2 (Database) present
- **Accuracy**: Endpoints/operations map to actual DD or FRs
- **Normal/Abnormal**: Every endpoint has happy-path AND error status tests
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code
- **Stack-correct**: WebTestClient (NOT MockMvc), R2DBC (NOT JPA)

---

*Test Plan Micro-Agent tp-04 | Integration Tests | EPS v3.2*
