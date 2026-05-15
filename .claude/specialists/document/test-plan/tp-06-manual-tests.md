# Test Plan Micro-Agent: Manual Tests
# テスト計画マイクロエージェント：手動テスト
# Micro-Agent Kế Hoạch Kiểm Thử: Kiểm Thử Thủ Công

**Version**: 1.0.0
**Section**: 6. Kiểm thử thủ công (Manual Tests)
**Output Lines**: ~140 lines
**Purpose**: Generate manual test specifications for visual/UX and accessibility testing
**Specialist**: tps-nextjs-manual.md

---

## Responsibility

Generate Section 6 of Test Plan containing:
- 6.1 Kiểm thử giao diện (Visual/UX Tests) — MT-UI-[###]
- 6.2 Kiểm thử truy cập (Accessibility Tests) — MT-A11Y-[###]

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| SRS | `documents/features/{dir}/{feature}-*-srs.md` | YES |
| Frontend DD | `documents/features/{dir}/{feature}-*-frontend-detail-design.md` | Optional |
| Stack vars | Step 0.5 (STACK_UI_LIBRARY = Ant Design 5) | YES |
| context_level | Step 2 | YES |
| test_id_counters | From tp-05 (last E2E IDs) | YES |

---

## Specialist Loading

```pseudo
manual_spec = read_file("specialists/code/nextjs/test-plan/tps-nextjs-manual.md")
```

**WHY**: Manual tests are frontend-specific. Backend-only features may have minimal manual tests (API documentation review) but still need accessibility for any admin UI.

---

## RAG Integration

```pseudo
try:
    rag = HippoRAGService.getInstance(feature, branch)
    a11y_rag = await rag.getContext(
        "accessibility responsive testing ant design",
        { name: "tp-06" },
        { layers: ["eps"], topK: 2 })
except:
    a11y_rag = None  # non-blocking
```

**WHY**: RAG surfaces project-specific accessibility patterns and Ant Design customization.

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What screens/pages need visual testing? (from DD or SRS)
2. What responsive breakpoints to test? (Desktop 1920×1080, Tablet 768×1024, Mobile 375×667)
3. What accessibility requirements apply? (WCAG 2.1 AA)
4. What Ant Design 5 components need theme compliance check?
5. What NORMAL checks? (visual consistency, responsive layout, a11y compliance)
6. What ABNORMAL checks? (keyboard-only, screen reader, high contrast, zoom 200%)

**REASON**:
- IF frontend DD exists → derive screens from DD Section 3
- IF SRS only → derive screens from user stories
- IF scope == "backend" → minimal manual tests (API docs review, admin UI basics)
- ALWAYS include keyboard navigation and screen reader tests

**VALIDATE CONSTRAINTS**:
- [ ] MT-UI and MT-A11Y IDs are separate sequences
- [ ] At least 3 responsive breakpoints
- [ ] WCAG 2.1 AA referenced
- [ ] Vietnamese >= 60%

### Step 2: GENERATE SECTION

```markdown
## 6. Kiểm thử thủ công (Manual Tests)

### 6.1 Kiểm thử giao diện (Visual/UX Tests)

**Thư viện UI**: Ant Design 5
**Responsive breakpoints**: Desktop (1920×1080), Tablet (768×1024), Mobile (375×667)

| Test ID | Loại | Mô tả (Test Case) | Các bước (Steps) | Kết quả mong đợi | Ưu tiên |
|---------|------|-------------------|-----------------|-------------------|---------|
| MT-UI-001 | Normal | [Kiểm tra giao diện responsive] | [Thay đổi kích thước trình duyệt] | [Layout tự thích ứng] | P1 |
| MT-UI-002 | Normal | [Kiểm tra theme Ant Design] | [So sánh với design token] | [Đồng nhất màu sắc, spacing] | P1 |
| MT-UI-003 | Abnormal | [Zoom trình duyệt 200%] | [Ctrl + → 200%] | [Không cắt nội dung, có thể đọc] | P2 |

### 6.2 Kiểm thử truy cập (Accessibility Tests)

**Tiêu chuẩn**: WCAG 2.1 Level AA
**Công cụ hỗ trợ**: axe-core (tự động), NVDA (thủ công)

| Test ID | Loại | Mô tả (Test Case) | Công cụ | Tiêu chí | Ưu tiên |
|---------|------|-------------------|---------|----------|---------|
| MT-A11Y-001 | Normal | [Độ tương phản màu] | axe-core | Tỷ lệ ≥ 4.5:1 | P1 |
| MT-A11Y-002 | Normal | [Focus indicator] | Thủ công | Hiện rõ trên tất cả elements | P1 |
| MT-A11Y-003 | Abnormal | [Điều hướng bàn phím] | Thủ công | Tab order đúng, không trap | P1 |
| MT-A11Y-004 | Abnormal | [Screen reader NVDA] | NVDA | Nội dung đọc đúng, không bỏ sót | P2 |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: At least 3 responsive breakpoints tested?
**Q2**: MT-UI and MT-A11Y IDs are separate sequences?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code?

### Step 4: VALIDATION

- [ ] 2 sub-sections (6.1 Visual/UX, 6.2 Accessibility)
- [ ] Ant Design 5 theme compliance checked
- [ ] WCAG 2.1 Level AA referenced (not just A)
- [ ] axe-core mentioned for automated a11y scanning
- [ ] Keyboard navigation tested
- [ ] Screen reader (NVDA) tested
- [ ] Normal AND Abnormal present
- [ ] ≤ 140 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: Both Visual/UX and Accessibility sections present
- **Accuracy**: Breakpoints match project config, WCAG level correct
- **Normal/Abnormal**: Both compliance checks AND failure scenarios
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: Zero implementation code

---

*Test Plan Micro-Agent tp-06 | Manual Tests | EPS v3.2*
