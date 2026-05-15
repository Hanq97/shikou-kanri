# Test Plan Micro-Agents

## Overview

10 micro-agents that generate the Test Plan document section-by-section.
Each agent loads its dedicated test-type specialist for domain knowledge.

**Workflow**: `commands/design/test.md`
**Master Specialist**: `_orchestrator.md` (global rules, loaded via specialist-load)
**Test-Type Specialists**: 11 files in `specialists/*/test-plan/`

---

## Agent Index

| Agent | File | Section | Specialist | Output |
|-------|------|---------|------------|--------|
| tp-00 | tp-00-document-info.md | 0. Thông tin tài liệu | Master only | ~30 lines |
| tp-01 | tp-01-test-strategy.md | 1. Chiến lược kiểm thử | tps-strategy | ~100 lines |
| tp-02 | tp-02-test-coverage.md | 2. Ma trận phủ kiểm thử | tps-coverage | ~170 lines |
| tp-03 | tp-03-unit-tests.md | 3. Kiểm thử đơn vị | tps-java-unit + tps-nextjs-unit | ~200 lines |
| tp-04 | tp-04-integration-tests.md | 4. Kiểm thử tích hợp | tps-java-integration + tps-nextjs-integration | ~200 lines |
| tp-05 | tp-05-e2e-tests.md | 5. Kiểm thử E2E | tps-nextjs-e2e | ~180 lines |
| tp-06 | tp-06-manual-tests.md | 6. Kiểm thử thủ công | tps-nextjs-manual | ~140 lines |
| tp-07 | tp-07-performance-tests.md | 7. Kiểm thử hiệu năng | tps-java-performance | ~170 lines |
| tp-08 | tp-08-security-tests.md | 8. Kiểm thử bảo mật | tps-java-security | ~170 lines |
| tp-09 | tp-09-execution-plan.md | 9. Kế hoạch thực thi | tps-execution | ~140 lines |

---

## Execution Order

Content sections first, then aggregate sections:

```
tp-00 → tp-03 → tp-04 → tp-05 → tp-06 → tp-07 → tp-08 → tp-02 → tp-01 → tp-09
```

**Why reordered**: tp-02 (Coverage Matrix), tp-01 (Strategy), and tp-09 (Execution Plan) need test IDs and counts from content sections tp-03→08.

---

## Test ID Formats

| Agent | ID Format | Example |
|-------|-----------|---------|
| tp-03 | UT-BE-[###], UT-FE-[###] | UT-BE-001, UT-FE-001 |
| tp-04 | IT-API-[###], IT-DB-[###] | IT-API-001, IT-DB-001 |
| tp-05 | E2E-[###] | E2E-001 |
| tp-06 | MT-UI-[###], MT-A11Y-[###] | MT-UI-001, MT-A11Y-001 |
| tp-08 | ST-AUTH-[###], ST-AUTHZ-[###], ST-INJ-[###], ST-XSS-[###] | ST-AUTH-001 |

---

## Specialist Mapping

### Per Tech-Stack (scope-aware loading)

| Stack | Specialist Path | Used By |
|-------|----------------|---------|
| Java (BE) | `specialists/java-springboot/test-plan/tps-java-unit.md` | tp-03 |
| Java (BE) | `specialists/java-springboot/test-plan/tps-java-integration.md` | tp-04 |
| Java (BE) | `specialists/java-springboot/test-plan/tps-java-performance.md` | tp-07 |
| Java (BE) | `specialists/java-springboot/test-plan/tps-java-security.md` | tp-08 |
| Next.js (FE) | `specialists/nextjs/test-plan/tps-nextjs-unit.md` | tp-03 |
| Next.js (FE) | `specialists/nextjs/test-plan/tps-nextjs-integration.md` | tp-04 |
| Next.js (FE) | `specialists/nextjs/test-plan/tps-nextjs-e2e.md` | tp-05 |
| Next.js (FE) | `specialists/nextjs/test-plan/tps-nextjs-manual.md` | tp-06 |
| Shared | `specialists/_shared/test-plan/tps-strategy.md` | tp-01 |
| Shared | `specialists/_shared/test-plan/tps-coverage.md` | tp-02 |
| Shared | `specialists/_shared/test-plan/tps-execution.md` | tp-09 |

---

## Related Files

- `commands/design/test.md` — Workflow orchestrating these agents
- `commands/design/test-flow.md` — Flow visualization
- `_orchestrator.md` — Master specialist (global rules, loaded via specialist-load)

---

*Test Plan Micro-Agents v1.0 | 10 agents + 11 specialists | EPS v3.2*
