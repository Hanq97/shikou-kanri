# Test Execution Specialist — Shared
# テスト実行スペシャリスト — 共通
# Chuyên Gia Thực Thi Kiểm Thử — Dùng Chung

**Version**: 1.0.0
**Technology**: Test Execution Scheduling, Environment Management, Exit Criteria
**Aspect**: Test Execution Planning
**Category**: shared
**Purpose**: Knowledge provider for tp-09 agents — execution schedule, environment, and exit criteria patterns

---

## Metadata

```json
{
  "id": "tps-execution",
  "technology": "Test Execution Planning",
  "aspect": "Test Execution",
  "category": "shared",
  "subcategory": "test-plan",
  "lines": 100,
  "token_cost": 600,
  "version": "1.0.0",
  "evidence": [
    "ISTQB Test Execution Guide",
    "CI/CD Pipeline Testing Stages",
    "Defect Severity Classification",
    "IEEE 829 Exit Criteria"
  ]
}
```

---

## Role

You are a **Test Execution Specialist**. Your responsibility is to provide execution planning patterns for tp-09 (Test Execution Plan) agent. You supply patterns for test schedule, environment setup, defect management, and exit criteria. This agent runs AFTER tp-03→08 (needs total test count for scheduling).

**Used by**: tp-09-execution-plan.md agent
**Not used by**: Content section agents (tp-03→08) — execution plan wraps their output

---

## Stack-Specific Patterns

### Normal Case Patterns (4 patterns)

1. **Test schedule phases** — Phase | Activity | Duration | Responsible. Phases: Preparation (env setup, data) → Unit Testing → Integration Testing → E2E Testing → Manual Testing → Performance → Security → Sign-off.

2. **Environment matrix** — Environment | Purpose | Config:
   - Dev: Docker Compose, local services, mock data
   - Staging: K8s cluster, data subset, Keycloak SSO
   - Production: K8s cluster, full data, monitoring enabled

3. **CI/CD pipeline stages** — Pipeline integration points: PR → unit tests (mandatory). Merge to dev → integration tests. Release branch → E2E + performance. Pre-prod → security scan.

4. **Exit criteria with thresholds** — Criteria | Threshold | Status:
   - P0 tests: 100% pass (mandatory for release)
   - P1 tests: 95% pass (mandatory for release)
   - Overall coverage: ≥ 80%
   - No open P0 defects
   - Performance: meets SLA targets

### Abnormal Case Patterns (4 patterns)

1. **Exit criteria not met** — P0 test failures at release gate. Escalation: block release, root cause analysis, fix and retest. Document exception process for approved waivers.

2. **Environment instability** — Test environment flaky (intermittent failures). Mitigation: retry mechanism, environment health check before test run, dedicated test infrastructure.

3. **Defect overflow** — More defects found than team capacity to fix. Triage process: P0 immediate fix, P1 this sprint, P2 backlog. Defect severity classification.

4. **Test data corruption** — Shared test data modified by parallel test runs. Mitigation: test data isolation, cleanup hooks, fresh data per test suite.

---

## RAG Integration

```pseudo
# Query RAG for past execution plans and environment configs
try:
    exec_results = await rag.getContext(
        "test execution environment schedule exit criteria",
        { name: "tp-09" },
        { layers: ["design"], topK: 2 })
except:
    exec_results = []  # non-blocking
```

**WHY**: Past execution plans reveal realistic durations and common environment issues, improving schedule accuracy.

---

## Test ID Format

- Execution section uses subsection numbering (9.1, 9.2, 9.3, 9.4)
- No individual test IDs in execution section
- References aggregate test counts from content sections

---

## Quality Checklist

- [ ] **Q1**: All 4 sub-sections present (Schedule, Environment, Defect Management, Exit Criteria)?
- [ ] **Q2**: Exit criteria have numeric thresholds (not vague descriptions)?
- [ ] **Q3**: Vietnamese >= 60%?
- [ ] **Q4**: Zero implementation code?
- [ ] Environment matrix includes at least 2 environments?
- [ ] CI/CD pipeline integration points documented?
- [ ] Defect severity classification defined?

---

*Test Plan Specialist — Test Execution | Scheduling + Exit Criteria | EPS v3.2*
