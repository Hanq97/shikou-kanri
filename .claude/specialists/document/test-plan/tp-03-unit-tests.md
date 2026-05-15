# Test Plan Micro-Agent: Unit Tests
# テスト計画マイクロエージェント：ユニットテスト
# Micro-Agent Kế Hoạch Kiểm Thử: Kiểm Thử Đơn Vị

**Version**: 1.0.0
**Section**: 3. Kiểm thử đơn vị (Unit Tests)
**Output Lines**: ~200 lines
**Purpose**: Generate unit test specifications for backend services and frontend components
**Specialist**: tps-java-unit.md (BE) + tps-nextjs-unit.md (FE)

---

## Responsibility

Generate Section 3 of Test Plan containing:
- 3.1 Kiểm thử Backend (Backend Unit Tests) — service layer, business logic
- 3.2 Kiểm thử Frontend (Frontend Unit Tests) — components, hooks, utils

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| Backend DD | `documents/features/{dir}/{feature}-*-backend-detail-design.md` | Optional (DETAILED level) |
| Frontend DD | `documents/features/{dir}/{feature}-*-frontend-detail-design.md` | Optional (DETAILED level) |
| Basic Design | `documents/features/{dir}/{feature}-*-basic-design.md` | Optional (MODERATE level) |
| Stack vars | Step 0.5 (`STACK_ORM`, `STACK_FRONTEND_FRAMEWORK`) | YES |
| RAG code patterns | Step 0.6 (`TP_RAG_CODE`) | Optional (non-blocking) |
| context_level | Step 2 (`BASIC`/`MODERATE`/`DETAILED`) | YES |
| DESIGN_SCOPE | Step 0.9 from detail.md (if run) | Optional |

---

## Specialist Loading

```pseudo
# Load test-type specialists (scope-aware)
if scope != "frontend":
    java_unit_spec = read_file("specialists/code/java-springboot/test-plan/tps-java-unit.md")
if scope != "backend":
    nextjs_unit_spec = read_file("specialists/code/nextjs/test-plan/tps-nextjs-unit.md")
```

**WHY**: Backend-only features need only Java patterns. Frontend-only need only Next.js patterns. Full-stack loads both. Loading irrelevant specialist wastes context and may generate wrong test types.

---

## RAG Integration

**WHY**: Unit test plans must target ACTUAL services and components, not generic placeholders.
RAG `findByStereotype("Service")` returns real service classes from the codebase.
RAG `findByStereotype("Component")` returns real React components.
This grounds test cases in reality — testers can map specifications to actual code.

```pseudo
# Per-agent RAG queries (non-blocking)
try:
    rag = HippoRAGService.getInstance(feature, branch)

    # Backend: Find actual service classes to test
    be_services = await rag.findByStereotype("Service", { topK: 5 })
    be_repos = await rag.findByStereotype("Repository", { topK: 3 })

    # Frontend: Find actual components to test
    fe_components = await rag.findByStereotype("Component", { topK: 5 })
    fe_hooks = await rag.findByStereotype("Hook", { topK: 3 })

    # Stack specialists for testing patterns
    section_specialists = await rag.querySpecialists(
        ["java-testing", "unit-test", STACK_ORM], topK=2)
    fe_specialists = await rag.querySpecialists(
        ["nextjs-testing", "component-test", STACK_UI_LIBRARY], topK=2)
except:
    be_services = []; be_repos = []; fe_components = []; fe_hooks = []
    section_specialists = []; fe_specialists = []
```

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. What services/components need unit testing? (from DD or RAG stereotypes)
2. What is the context_level? BASIC → high-level per FR, MODERATE → per component, DETAILED → per method
3. What stack testing tools apply? (BE: JUnit5+Mockito+StepVerifier, FE: Vitest+RTL)
4. What business rules from SRS need test coverage?
5. What NORMAL patterns from specialist? (happy path, valid input)
6. What ABNORMAL patterns from specialist? (null, boundary, exception, timeout)

**REASON** (Pattern Matching with RAG + Specialist):
- IF be_services found via RAG → use actual service names (e.g., `CmnMCustomerService`)
- IF context_level == "DETAILED" and backend DD exists → extract method signatures from DD Section 2
- IF section_specialists found → apply testing patterns from specialist (AAA pattern, StepVerifier for reactive)
- IF context_level == "BASIC" → group test cases by FR-ID, not by service class
- IF context_level == "MODERATE" → group test cases by component (from BD), not per-method
- ALWAYS include ABNORMAL cases: for each normal test case, generate ≥1 abnormal counterpart

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Test ID format: `UT-BE-[###]` for backend, `UT-FE-[###]` for frontend
- [ ] No implementation code (no `@Test`, no `describe()`, no `import`)
- [ ] P0/P1/P2 priorities assigned to every test case
- [ ] Vietnamese >= 60%
- [ ] Output ≤ 200 lines
- [ ] Both normal AND abnormal test cases present

### Step 2: GENERATE SECTION

**IF context_level == "DETAILED" (DD exists)**:

```markdown
## 3. Kiểm thử đơn vị (Unit Tests)

### 3.1 Kiểm thử Backend (Backend Unit Tests)

**Công cụ**: JUnit 5 + Mockito + StepVerifier (Reactive)
**Mục tiêu coverage**: ≥ 70% business logic

#### [ServiceName] (từ DD Section 2)

| Test ID | Loại | Mô tả (Test Case) | Đầu vào (Input) | Kết quả mong đợi (Expected) | Ưu tiên |
|---------|------|-------------------|-----------------|------------------------------|---------|
| UT-BE-001 | Normal | [Tên test case tiếng Việt] | [Input mô tả] | [Expected mô tả] | P0 |
| UT-BE-002 | Abnormal | [Trường hợp lỗi/biên] | [Invalid input] | [Exception/Error expected] | P0 |

**Lưu ý kỹ thuật (Technical Notes)**:
- Sử dụng `StepVerifier` cho reactive service methods (Mono/Flux)
- Mock external dependencies với Mockito `@Mock`
- Business rules từ SRS: [BR-IDs liên quan]

### 3.2 Kiểm thử Frontend (Frontend Unit Tests)

**Công cụ**: Vitest + React Testing Library
**Mục tiêu coverage**: ≥ 60% components

#### [ComponentName] (từ DD Section 3)

| Test ID | Loại | Mô tả (Test Case) | Props/State | Hành vi mong đợi (Expected) | Ưu tiên |
|---------|------|-------------------|-------------|------------------------------|---------|
| UT-FE-001 | Normal | [Tên test case] | [Props mô tả] | [Expected behavior] | P0 |
| UT-FE-002 | Abnormal | [Missing props/error state] | [Error state] | [Fallback UI] | P1 |
```

**IF context_level == "MODERATE" (BD exists, no DD)**:

```markdown
## 3. Kiểm thử đơn vị (Unit Tests)

### 3.1 Kiểm thử Backend (Backend Unit Tests)

**Công cụ**: JUnit 5 + Mockito + StepVerifier (Reactive)

#### [Component/Module Name] (từ BD)

| Test ID | Loại | Mô tả (Test Case) | Thành phần | Ưu tiên |
|---------|------|-------------------|------------|---------|
| UT-BE-001 | Normal | [Test case grouped by component] | [Component name] | P0 |
| UT-BE-002 | Abnormal | [Error case per component] | [Component name] | P1 |

### 3.2 Kiểm thử Frontend (Frontend Unit Tests)

**Công cụ**: Vitest + React Testing Library

| Test ID | Loại | Mô tả (Test Case) | Thành phần | Ưu tiên |
|---------|------|-------------------|------------|---------|
| UT-FE-001 | Normal | [Test case per screen/module from BD] | [Screen name] | P0 |
| UT-FE-002 | Abnormal | [Error/empty state per screen] | [Screen name] | P1 |
```

**IF context_level == "BASIC" (SRS only)**:

```markdown
## 3. Kiểm thử đơn vị (Unit Tests)

### 3.1 Kiểm thử Backend (Backend Unit Tests)

**Công cụ**: JUnit 5 + Mockito + StepVerifier (Reactive)

| Test ID | Loại | Yêu cầu (Requirement) | Mô tả (Test Case) | Ưu tiên |
|---------|------|----------------------|-------------------|---------|
| UT-BE-001 | Normal | FR-XXX-001 | [Test case mapped to FR] | P0 |
| UT-BE-002 | Abnormal | FR-XXX-001 | [Error case for same FR] | P1 |

### 3.2 Kiểm thử Frontend (Frontend Unit Tests)

**Công cụ**: Vitest + React Testing Library

| Test ID | Loại | Yêu cầu (Requirement) | Mô tả (Test Case) | Ưu tiên |
|---------|------|----------------------|-------------------|---------|
| UT-FE-001 | Normal | FR-XXX-002 | [Test case mapped to FR] | P1 |
| UT-FE-002 | Abnormal | FR-XXX-002 | [Error case for same FR] | P1 |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1: Độ phủ kiểm thử (Coverage)?**
- [ ] All services from DD (or FRs from SRS) have at least 1 normal test case?
- [ ] All services from DD (or FRs from SRS) have at least 1 abnormal test case?
- [ ] P0 items from SRS have UT coverage?
- [ ] If RAG found services → actual service names used (not generic)?

**Q2: Định dạng Test ID (Format)?**
- [ ] Backend: `UT-BE-[###]` (sequential, zero-padded)?
- [ ] Frontend: `UT-FE-[###]` (sequential, zero-padded)?
- [ ] No duplicate IDs?
- [ ] "Loại" column present (Normal/Abnormal)?

**Q3: Tỷ lệ tiếng Việt >= 60%?**
- [ ] All headings Vietnamese-first: `[Tiếng Việt] ([English])`?
- [ ] Test case descriptions in Vietnamese?

**Q4: Không có code implementation?**
- [ ] Zero `@Test`, `@Mock`, `@ExtendWith` annotations?
- [ ] Zero `describe()`, `it()`, `expect()` calls?
- [ ] Zero `import` statements?
- [ ] Only specifications and tables?

**SELF-FIX**: If violations found, fix before proceeding.

### Step 4: VALIDATION

**Manual Checks**:
- [ ] 2 sub-sections present (3.1 Backend, 3.2 Frontend) — unless scope restricts
- [ ] Test ID format correct per sub-section
- [ ] Priorities assigned (P0/P1/P2)
- [ ] Stack tools mentioned (JUnit5+Mockito+StepVerifier for BE, Vitest+RTL for FE)
- [ ] context_level adapted (DETAILED = per-method, MODERATE = per-component, BASIC = per-FR)
- [ ] RAG services/components used if available
- [ ] Normal AND Abnormal test cases present in each sub-section
- [ ] ≤ 200 lines

---

## Output Format

See Step 2 templates above (context_level dependent).

---

## Quality Standards

- **Completeness**: Both 3.1 (Backend) and 3.2 (Frontend) present (scope-dependent)
- **Accuracy**: Test cases map to actual services/FRs, not invented names
- **Normal/Abnormal**: Every feature area has both happy-path AND error/edge test cases
- **Language**: Vietnamese-first ≥60%, English in parentheses
- **Prohibited**: Zero implementation code, zero test framework imports
- **RAG-grounded**: If RAG returned services/components, they appear in test tables

---

*Test Plan Micro-Agent tp-03 (EXEMPLAR) | Unit Tests | EPS v3.2*
