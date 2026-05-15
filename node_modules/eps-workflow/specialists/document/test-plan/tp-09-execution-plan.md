# Test Plan Micro-Agent: Test Execution Plan
# テスト計画マイクロエージェント：テスト実行計画
# Micro-Agent Kế Hoạch Kiểm Thử: Kế Hoạch Thực Thi Kiểm Thử

**Version**: 1.0.0
**Section**: 9. Kế hoạch thực thi (Test Execution Plan)
**Output Lines**: ~140 lines
**Purpose**: Generate test execution schedule, environment, defect management, and exit criteria
**Specialist**: tps-execution.md
**Execution**: Runs AFTER tp-03→08 (needs total test count for scheduling)

---

## Responsibility

Generate Section 9 of Test Plan containing:
- 9.1 Lịch trình (Test Schedule) — Phase | Activity | Duration | Responsible
- 9.2 Môi trường (Test Environment) — Environment | Purpose | Config
- 9.3 Quản lý lỗi (Defect Management) — Severity levels, tracking
- 9.4 Tiêu chí hoàn thành (Exit Criteria) — Criteria | Threshold | Status

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| section_summaries | From content agents (tp-03→08) | YES |
| test_id_counters | From content agents (tp-03→08) | YES |
| context_level | Step 2 | YES |

**CRITICAL**: This agent runs AFTER all content sections (tp-03→08). It uses `section_summaries` for total test count to estimate schedule duration and resource allocation.

---

## Specialist Loading

```pseudo
execution_spec = read_file("specialists/code/_shared/test-plan/tps-execution.md")
```

---

## RAG Integration

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    exec_rag = await rag.getContext(
        "test execution environment schedule exit criteria",
        { name: "tp-09" },
        { layers: ["design"], topK: 2 })
except:
    exec_rag = None  # non-blocking
```

**WHY**: Past execution plans reveal realistic durations and common environment issues, improving schedule accuracy.

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. How many total test cases? (from section_summaries)
2. What is the test execution timeline? (based on test count)
3. What environments are needed? (Dev, Staging, Production)
4. What defect severity levels? (Critical, High, Medium, Low)
5. What exit criteria thresholds? (P0=100% pass, P1=95%, ≥80% coverage)
6. What CI/CD integration points? (PR → unit, merge → integration, release → E2E)

**REASON**:
- FROM section_summaries → calculate total test count, breakdown by type
- IF RAG found past execution plans → reuse realistic durations
- IF many test cases (>50) → longer schedule, more environment prep
- IF few test cases (<20) → shorter schedule, simpler environment
- ALWAYS include CI/CD pipeline integration

**VALIDATE CONSTRAINTS**:
- [ ] All 4 sub-sections present
- [ ] Exit criteria have numeric thresholds
- [ ] Schedule phases realistic
- [ ] Vietnamese >= 60%

### Step 2: GENERATE SECTION

```markdown
## 9. Kế hoạch thực thi (Test Execution Plan)

### 9.1 Lịch trình kiểm thử (Test Schedule)

| Giai đoạn (Phase) | Hoạt động (Activity) | Thời lượng | Trách nhiệm |
|-------------------|---------------------|------------|-------------|
| Chuẩn bị | Thiết lập môi trường, dữ liệu test | 1 ngày | DevOps + QA |
| Unit Testing | Thực hiện UT-BE + UT-FE | 2 ngày | Developer |
| Integration Testing | Thực hiện IT-API + IT-DB | 2 ngày | Developer + QA |
| E2E Testing | Thực hiện E2E scenarios | 1 ngày | QA |
| Manual Testing | Visual, UX, Accessibility | 1 ngày | QA |
| Performance Testing | Load, Stress, Soak | 1 ngày | DevOps + QA |
| Security Testing | Auth, OWASP, Pentest | 1 ngày | Security + QA |
| Báo cáo | Tổng hợp kết quả, sign-off | 0.5 ngày | QA Lead |

**Tích hợp CI/CD (CI/CD Integration)**:

| Trigger | Kiểm thử tự động | Bắt buộc |
|---------|------------------|---------|
| Pull Request | Unit Tests (UT-*) | ✅ Bắt buộc |
| Merge to dev | Integration Tests (IT-*) | ✅ Bắt buộc |
| Release branch | E2E + Performance | ✅ Bắt buộc |
| Pre-production | Security scan | ✅ Bắt buộc |

### 9.2 Môi trường kiểm thử (Test Environment)

| Môi trường | Mục đích | Cấu hình |
|-----------|---------|---------|
| Dev (Local) | Unit + Integration | Docker Compose, mock services |
| Staging | E2E + Performance + Security | K8s cluster, data subset, Keycloak SSO |
| Production | Smoke test sau deploy | K8s, full data, monitoring |

### 9.3 Quản lý lỗi (Defect Management)

**Phân loại mức độ nghiêm trọng (Severity Classification)**:

| Mức độ | Mô tả | SLA sửa lỗi | Ví dụ |
|--------|-------|-------------|-------|
| Critical (P0) | Chặn phát hành, mất dữ liệu | 4 giờ | Auth failure, data corruption |
| High (P1) | Ảnh hưởng chức năng chính | 1 ngày | API error, wrong calculation |
| Medium (P2) | Ảnh hưởng UX, có workaround | 3 ngày | UI misalignment, slow response |
| Low (P3) | Cosmetic, minor | Backlog | Typo, color mismatch |

**Công cụ theo dõi**: Jira / GitHub Issues

### 9.4 Tiêu chí hoàn thành (Exit Criteria)

| Tiêu chí | Ngưỡng (Threshold) | Bắt buộc |
|----------|-------------------|---------|
| P0 test pass rate | 100% | ✅ |
| P1 test pass rate | ≥ 95% | ✅ |
| Tổng coverage | ≥ 80% | ✅ |
| Không có lỗi P0 mở | 0 lỗi P0 | ✅ |
| Performance đạt SLA | P95 < 500ms, ≥ 2000 RPS | ✅ |
| Security scan pass | Không có Critical/High | ✅ |
| Manual test complete | 100% P0 + P1 completed | ✅ |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: All 4 sub-sections present?
**Q2**: Exit criteria have numeric thresholds (not vague)?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code?

### Step 4: VALIDATION

- [ ] 4 sub-sections (9.1 Schedule, 9.2 Environment, 9.3 Defect, 9.4 Exit Criteria)
- [ ] Schedule phases realistic for test count
- [ ] CI/CD integration points documented
- [ ] Environment matrix includes Dev + Staging minimum
- [ ] Defect severity has 4 levels with SLA
- [ ] Exit criteria have numeric thresholds
- [ ] Total test count from section_summaries referenced
- [ ] ≤ 140 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: All 4 sub-sections present
- **Accuracy**: Schedule proportional to test count
- **Normal/Abnormal**: N/A (aggregate section)
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code, no CI/CD pipeline YAML

---

*Test Plan Micro-Agent tp-09 | Test Execution Plan | EPS v3.2*
