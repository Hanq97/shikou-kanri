# Test Plan Micro-Agent: E2E Tests
# テスト計画マイクロエージェント：E2Eテスト
# Micro-Agent Kế Hoạch Kiểm Thử: Kiểm Thử End-to-End

**Version**: 1.0.0
**Section**: 5. Kiểm thử End-to-End (E2E Tests)
**Output Lines**: ~180 lines
**Purpose**: Generate E2E test specifications for critical user flows with Gherkin scenarios
**Specialist**: tps-nextjs-e2e.md

---

## Responsibility

Generate Section 5 of Test Plan containing:
- 5.1 Luồng người dùng quan trọng (Critical User Flows) — E2E-[###]
- 5.2 Kịch bản Gherkin (Gherkin Scenarios) — Feature/Scenario/Given-When-Then

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| SRS User Stories | SRS Section 4 (if present) | YES |
| Stack vars | Step 0.5 | YES |
| context_level | Step 2 | YES |
| test_id_counters | From tp-04 (last IT IDs) | YES |

---

## Specialist Loading

```pseudo
e2e_spec = read_file("specialists/code/nextjs/test-plan/tps-nextjs-e2e.md")
```

**WHY**: E2E tests are always frontend-facing (even for backend-only features, E2E may cover API-level flows). Playwright specialist provides POM and multi-browser patterns.

---

## RAG Integration

**WHY**: RAG surfaces critical user stories and screen flows from SRS/BD, ensuring E2E tests cover the most important business journeys.

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    e2e_rag = await rag.getContext(
        f"e2e test critical flows {feature}",
        { name: "tp-05" },
        { layers: ["design", "code"], topK: 3 })
except:
    e2e_rag = None  # non-blocking
```

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What are the critical user flows from SRS? (P0 user stories)
2. What are the primary happy-path journeys? (login → action → verify)
3. What are the key abnormal flows? (login fail, session expire, slow network)
4. What Keycloak SSO prerequisites apply?
5. What browsers should be tested? (Chromium, Firefox, WebKit)

**REASON**:
- IF SRS has user stories → derive E2E flows from each P0 story
- IF RAG found past E2E patterns → reuse flow structures
- IF scope == "backend" → E2E covers API-level flows (no browser)
- IF scope includes frontend → full browser E2E with Playwright
- ALWAYS include at least 1 abnormal flow per critical journey

**VALIDATE CONSTRAINTS**:
- [ ] Test IDs: `E2E-[###]`
- [ ] Gherkin format: Given-When-Then
- [ ] No implementation code (no Playwright API)
- [ ] Vietnamese >= 60%

### Step 2: GENERATE SECTION

```markdown
## 5. Kiểm thử End-to-End (E2E Tests)

### 5.1 Luồng người dùng quan trọng (Critical User Flows)

**Công cụ**: Playwright + Page Object Model
**Điều kiện tiên quyết**: Đăng nhập SSO Keycloak

| Test ID | Loại | Luồng (Flow) | Các bước (Steps) | Kết quả mong đợi | Ưu tiên |
|---------|------|-------------|-----------------|-------------------|---------|
| E2E-001 | Normal | [Tên luồng chính] | [Login → Action → Verify] | [Expected outcome] | P0 |
| E2E-002 | Abnormal | [Luồng lỗi] | [Action with invalid state] | [Error handling] | P0 |

**Yêu cầu trình duyệt (Browser Requirements)**:
- Chromium (chính / primary)
- Firefox (phụ / secondary)
- WebKit (bổ sung / tertiary)

### 5.2 Kịch bản Gherkin (Gherkin Scenarios)

**Feature**: [Tên tính năng]

**Scenario**: [Kịch bản bình thường — Normal]
- Given [Điều kiện tiên quyết — Precondition]
- When [Hành động — Action]
- Then [Kết quả — Expected result]

**Scenario**: [Kịch bản lỗi — Abnormal]
- Given [Điều kiện tiên quyết]
- When [Hành động gây lỗi — Error-triggering action]
- Then [Xử lý lỗi — Error handling behavior]
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: All P0 user stories from SRS have E2E coverage?
**Q2**: Gherkin scenarios follow Given-When-Then format + include abnormal flows?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code (no Playwright API calls)?

### Step 4: VALIDATION

- [ ] 2 sub-sections (5.1 Critical Flows, 5.2 Gherkin)
- [ ] Playwright referenced (NOT Cypress)
- [ ] Keycloak SSO login as prerequisite
- [ ] Page Object Model mentioned
- [ ] Multi-browser testing specified
- [ ] Normal AND Abnormal flows present
- [ ] ≤ 180 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: Critical flows cover all P0 user stories
- **Accuracy**: Flows match SRS user stories and screen navigation
- **Normal/Abnormal**: Every critical flow has happy-path AND failure scenario
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code (no `test()`, `page.goto()`, `expect()`)

---

*Test Plan Micro-Agent tp-05 | E2E Tests | EPS v3.2*
