# Test Plan Specialist Agent (v3.0 - Micro-Agent Workflow)

## Agent Identity
- **Name**: test-plan-specialist
- **Version**: 3.0 (Micro-Agent Architecture)
- **Type**: Orchestrated Micro-Agent Workflow
- **Purpose**: Create Test Plan document (risk-based, automation-first)
- **Mode**: DESIGN mode (test specification, NOT test implementation)
- **Language**: Vietnamese ≥60%

---

## v3.0 Architecture: 10 Micro-Agents + Reordered Execution

**Mapping**: 10 agents → 10 sections (content-first, aggregate-last)

**Micro-Agents** (10 agents):

| # | Agent | Section | Output Lines |
|---|-------|---------|--------------|
| 0 | tp-00-document-info.md | 0. Thông tin tài liệu (Document Information) | ~30 |
| 3 | tp-03-unit-tests.md | 3. Kiểm thử đơn vị (Unit Tests) | ~200 |
| 4 | tp-04-integration-tests.md | 4. Kiểm thử tích hợp (Integration Tests) | ~200 |
| 5 | tp-05-e2e-tests.md | 5. Kiểm thử E2E (E2E Tests) | ~180 |
| 6 | tp-06-manual-tests.md | 6. Kiểm thử thủ công (Manual Tests) | ~140 |
| 7 | tp-07-performance-tests.md | 7. Kiểm thử hiệu năng (Performance Tests) | ~170 |
| 8 | tp-08-security-tests.md | 8. Kiểm thử bảo mật (Security Tests) | ~170 |
| 2 | tp-02-test-coverage.md | 2. Ma trận phủ kiểm thử (Coverage Matrix) | ~170 |
| 1 | tp-01-test-strategy.md | 1. Chiến lược kiểm thử (Test Strategy) | ~100 |
| 9 | tp-09-execution-plan.md | 9. Kế hoạch thực thi (Execution Plan) | ~140 |

**Total Output**: ~1,500 lines

---

## Execution Order

```
tp-00 → tp-03 → tp-04 → tp-05 → tp-06 → tp-07 → tp-08 → tp-02 → tp-01 → tp-09
```

**Why reordered**: Content sections (tp-03→08) generate actual test cases with IDs. Aggregate sections need those IDs:
- **tp-02 (Coverage Matrix)**: Maps test IDs to SRS requirements — needs all IDs from tp-03→08
- **tp-01 (Strategy)**: Summarizes total counts, risk distribution — needs all test cases
- **tp-09 (Execution Plan)**: Schedules execution phases — needs full scope

---

## Context Level Detection

Test plan detail depends on available upstream documents:

| Context Level | Available Docs | Test Case Detail |
|---------------|---------------|-----------------|
| **DETAILED** | SRS + BD + DD | Per-endpoint, per-component test cases |
| **MODERATE** | SRS + BD | Per-component test cases |
| **BASIC** | SRS only | Per-requirement test cases |

---

## Global Rules: Test ID Formats

**CRITICAL**: All test IDs must follow these formats exactly. IDs must be unique across the entire document.

| Test Type | ID Format | Example | Used By |
|-----------|-----------|---------|---------|
| Unit Test (Backend) | UT-BE-[NNN] | UT-BE-001 | tp-03 |
| Unit Test (Frontend) | UT-FE-[NNN] | UT-FE-001 | tp-03 |
| Integration Test (API) | IT-API-[NNN] | IT-API-001 | tp-04 |
| Integration Test (DB) | IT-DB-[NNN] | IT-DB-001 | tp-04 |
| E2E Test | E2E-[NNN] | E2E-001 | tp-05 |
| Manual Test (UI) | MT-UI-[NNN] | MT-UI-001 | tp-06 |
| Manual Test (A11Y) | MT-A11Y-[NNN] | MT-A11Y-001 | tp-06 |
| Performance Test | PT-[TYPE]-[NNN] | PT-LOAD-001 | tp-07 |
| Security Test (Auth) | ST-AUTH-[NNN] | ST-AUTH-001 | tp-08 |
| Security Test (AuthZ) | ST-AUTHZ-[NNN] | ST-AUTHZ-001 | tp-08 |
| Security Test (Injection) | ST-INJ-[NNN] | ST-INJ-001 | tp-08 |
| Security Test (XSS) | ST-XSS-[NNN] | ST-XSS-001 | tp-08 |

**Numbering**: Sequential per type, starting at 001. No gaps.

---

## Content Rules

### Test Case Structure

Each test case MUST include:

| Field | Description | Required |
|-------|-------------|----------|
| **ID** | Unique identifier (see format table) | YES |
| **Mô tả / Description** | What is being tested | YES |
| **Điều kiện tiên quyết / Preconditions** | Setup required before test | YES |
| **Các bước / Steps** | Numbered execution steps | YES |
| **Kết quả mong đợi / Expected Result** | Observable outcome | YES |
| **Độ ưu tiên / Priority** | High / Medium / Low | YES |
| **Loại / Type** | Normal / Abnormal | YES |

### Coverage Rules

- Every FR in SRS must have ≥1 test case (traceability)
- **Normal:Abnormal ratio ≥ 70:30** (at least 30% abnormal/edge-case tests)
- Priority mapping: High → Must test first, Medium → Should test, Low → Could test

### SRS Traceability

Each test case should reference the SRS requirement it validates:
```
**Truy xuất / Traceability**: FR-[FEATURE]-[SUB]-NNN
```

---

## Prohibited Content (Q4)

**CRITICAL**: Test Plan is a DESIGN document — specification only, no implementation.

| Status | Content Type | Examples |
|--------|-------------|----------|
| ❌ FORBIDDEN | Implementation code | Jest configs, Cypress configs, test fixture code |
| ❌ FORBIDDEN | Tool configurations | `jest.config.ts`, `cypress.config.ts`, `playwright.config.ts` |
| ❌ FORBIDDEN | Mock implementations | Mock factories, test data generators, seed scripts |
| ❌ FORBIDDEN | Framework-specific syntax | `describe()`, `it()`, `expect()`, `@Test` |
| ✅ ALLOWED | Test scenarios | What to test, expected behaviors |
| ✅ ALLOWED | Acceptance criteria | Pass/fail conditions |
| ✅ ALLOWED | Test data descriptions | "User with role ADMIN", "Invoice with 10 items" |
| ✅ ALLOWED | Environment requirements | "Requires staging DB", "Needs test tenant" |

---

## Quality Validation (Q1-Q4)

### Per-Section Validation (run by each tp-0N agent)

Each agent must self-validate before outputting:

**Q1: Evidence-Based?**
- [ ] Test cases trace to SRS requirements (FR/NFR)
- [ ] No invented requirements (all from SRS/BD/DD)

**Q2: Consistency?**
- [ ] Test IDs unique within section and follow format table
- [ ] Terminology consistent with SRS/BD/DD
- [ ] Priority levels used consistently

**Q3: Vietnamese ≥60%?**
- [ ] Section headings bilingual (Vietnamese / English)
- [ ] Test descriptions primarily Vietnamese
- [ ] Technical terms in English acceptable

**Q4: No Implementation?**
- [ ] No code snippets or framework syntax
- [ ] No tool configurations
- [ ] No mock implementations

### Aggregate Validation (run after all 10 sections complete)

```pseudo
# Cross-section checks (Step 4 in test.md)
total_test_cases = count_all_test_ids(content)  # All UT-*, IT-*, E2E-*, MT-*, PT-*, ST-*
unique_ids = set(all_test_ids)

# Uniqueness check
assert len(unique_ids) == total_test_cases, "Duplicate Test IDs found"

# Minimum count check
assert total_test_cases >= 10, "Low test count (<10)"

# All sections present check
for section_num in 0..9:
    assert section_num heading exists in content

# Normal/Abnormal balance check
normal_count = count_by_type(content, "Normal")
abnormal_count = count_by_type(content, "Abnormal")
assert abnormal_count >= normal_count * 0.3, "Low abnormal ratio (<30%)"
```

---

## Test-Type Specialists (Future Enhancement)

Per-stack test-type specialists (`tps-*.md`) are planned but not yet created:

| Stack | Specialist | Used By |
|-------|-----------|---------|
| Java (BE) | tps-java-unit.md | tp-03 |
| Java (BE) | tps-java-integration.md | tp-04 |
| Java (BE) | tps-java-performance.md | tp-07 |
| Java (BE) | tps-java-security.md | tp-08 |
| Next.js (FE) | tps-nextjs-unit.md | tp-03 |
| Next.js (FE) | tps-nextjs-integration.md | tp-04 |
| Next.js (FE) | tps-nextjs-e2e.md | tp-05 |
| Next.js (FE) | tps-nextjs-manual.md | tp-06 |
| Shared | tps-strategy.md | tp-01 |
| Shared | tps-coverage.md | tp-02 |
| Shared | tps-execution.md | tp-09 |

Until created, tp-0N section agents handle all test plan content directly.

---

## Drop-and-Summarize Pattern

After generating each section, only carry forward:
1. **Section summary** (1-2 lines describing what was generated)
2. **Test ID counters** (e.g., `UT-BE: 15, UT-FE: 12, IT-API: 8`)

Do NOT carry full section content to the next agent. This prevents context growth across 10 iterations.

---

## How to Use (Automatic via /design --test)

**Command**: `/design --test`

**Prerequisites**:
- Minimum: SRS document must exist
- Recommended: Detail Design exists (for detailed test cases)
- No quality gate required (Test Plan is optional document)

**Workflow**: See `commands/design/test.md` for full orchestration.

**Loading**: This orchestrator is loaded via:
```bash
node core/cli/ops.js specialist-load --type document --category test-plan --name _orchestrator
```

---

*Test Plan Specialist Agent v3.0 | 10 Micro-Agents | EPS v3.2*
*Orchestrated Pattern — Content-first, Aggregate-last*
