# Test Plan Micro-Agent: Test Strategy
# テスト計画マイクロエージェント：テスト戦略
# Micro-Agent Kế Hoạch Kiểm Thử: Chiến Lược Kiểm Thử

**Version**: 1.0.0
**Section**: 1. Chiến lược kiểm thử (Test Strategy)
**Output Lines**: ~100 lines
**Purpose**: Generate test strategy with scope, approach, risk assessment, and tool overview
**Specialist**: tps-strategy.md

---

## Responsibility

Generate Section 1 of Test Plan containing:
- 1.1 Phạm vi (Scope) — In-scope / Out-of-scope features
- 1.2 Phương pháp kiểm thử (Test Approach) — Automation-first: Unit 70%, Integration 20%, E2E 10%
- 1.3 Đánh giá rủi ro (Risk Assessment) — Risk matrix

**Execution note**: Runs AFTER tp-03→08 content sections. Receives `section_summaries` with total test count and types.

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| Stack vars | Step 0.5 | YES |
| section_summaries | From content agents (tp-03→08) | YES (for total count) |
| test_id_counters | From content agents (tp-03→08) | YES (for test type breakdown) |
| context_level | Step 2 | YES |

---

## Specialist Loading

```pseudo
strategy_spec = read_file("specialists/code/_shared/test-plan/tps-strategy.md")
```

---

## RAG Integration

**WHY**: Past feature test strategies reveal recurring risks (e.g., "Keycloak SSO timeout" appeared in 3/5 features). Agent reuses these instead of inventing from scratch.

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    strategy_rag = await rag.getContext(
        f"test strategy risk assessment {feature}",
        { name: "tp-01" },
        { layers: ["design"], topK: 3 })
except:
    strategy_rag = None  # non-blocking
```

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What features are in-scope from SRS? (functional requirements list)
2. What is out-of-scope? (third-party services, existing unchanged features)
3. What are the top 3-5 risks for this feature?
4. What testing tools apply per stack? (from Step 0.5 stack vars)
5. What is the test pyramid ratio for this feature?

**REASON**:
- IF section_summaries available → calculate actual test distribution (unit/integration/e2e/manual)
- IF RAG found past strategies → reuse recurring risks
- IF scope == "backend" → emphasize API testing, reduce E2E scope
- IF scope == "frontend" → emphasize component testing, add accessibility scope

**VALIDATE CONSTRAINTS**:
- [ ] Risk matrix has >= 3 entries
- [ ] In-scope / Out-of-scope clearly separated
- [ ] Test pyramid ratios documented
- [ ] Vietnamese >= 60%

### Step 2: GENERATE SECTION

```markdown
## 1. Chiến lược kiểm thử (Test Strategy)

### 1.1 Phạm vi (Scope)

**Trong phạm vi (In Scope):**
- [Feature areas from SRS — Vietnamese descriptions]
- [Key functional requirements with FR-IDs]

**Ngoài phạm vi (Out of Scope):**
- [Third-party integrations not under test]
- [Existing features not modified]

### 1.2 Phương pháp kiểm thử (Test Approach)

**Chiến lược tự động hóa (Automation Strategy):**

| Loại kiểm thử | Tỷ lệ | Công cụ | Ghi chú |
|----------------|--------|---------|---------|
| Unit Tests | 70% | JUnit 5 + Mockito + StepVerifier (BE), Vitest + RTL (FE) | Tự động 100% |
| Integration Tests | 20% | WebTestClient + Testcontainers (BE), MSW (FE) | Tự động 100% |
| E2E Tests | 10% | Playwright | P0 flows tự động |
| Manual Tests | — | axe-core, NVDA | Visual, UX, A11Y |
| Performance | — | Gatling/k6 | Load, stress, soak |
| Security | — | OWASP ZAP | Auth, injection, OWASP Top 10 |

**Tổng hợp kiểm thử (Test Summary):**
- Tổng số test cases: [X] (từ section_summaries)
- Tự động: [Y] | Thủ công: [Z]

### 1.3 Đánh giá rủi ro (Risk Assessment)

| Lĩnh vực rủi ro (Risk Area) | Tác động (Impact) | Xác suất (Probability) | Giảm thiểu (Mitigation) |
|------|--------|-------------|------------|
| [Area 1] | Critical/High | High/Medium | [Mitigation strategy] |
| [Area 2] | High/Medium | Medium/Low | [Mitigation strategy] |
| [Area 3] | Medium | Medium | [Mitigation strategy] |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: Risk matrix has >= 3 entries with all 4 columns filled?
**Q2**: Scope clearly separates in-scope vs out-of-scope?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code?

### Step 4: VALIDATION

- [ ] 3 sub-sections present (1.1 Scope, 1.2 Approach, 1.3 Risk)
- [ ] Test pyramid ratios sum to ~100% for automated
- [ ] Risk matrix has ≥ 3 entries
- [ ] Stack tools correct (reactive stack, not servlet)
- [ ] section_summaries referenced for total count
- [ ] ≤ 160 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: All 3 sub-sections present
- **Accuracy**: Stack tools match project config, risk areas from SRS
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code

---

*Test Plan Micro-Agent tp-01 | Test Strategy | EPS v3.2*
