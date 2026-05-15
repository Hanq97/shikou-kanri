# Test Plan Micro-Agent: Document Information
# テスト計画マイクロエージェント：ドキュメント情報
# Micro-Agent Kế Hoạch Kiểm Thử: Thông Tin Tài Liệu

**Version**: 1.0.0
**Section**: 0. Thông tin tài liệu (Document Information)
**Output Lines**: ~30 lines
**Purpose**: Generate test plan document header with metadata and references
**Specialist**: Master spec only (_orchestrator.md)

---

## Responsibility

Generate Section 0 (Document Information) containing:
- Feature ID, version, dates
- References to SRS, BD, DD (if exist)
- Coverage target
- Document scope (context_level)

---

## Input Context

| Input | Source | Required |
|-------|--------|----------|
| Feature context | `context.md` | YES |
| SRS file path | Step 2 file discovery | YES |
| BD/DD file paths | Step 2 file discovery | Optional |
| context_level | Step 2 | YES |
| DESIGN_SCOPE | Step 0.9 (if run) | Optional |

---

## Specialist Loading

```pseudo
# No test-type specialist needed — metadata section
# Global rules (Test ID format, content rules) are in _orchestrator.md
# Loaded by test.md Step 1 via specialist-load --type document --category test-plan --name _orchestrator
```

---

## RAG Integration

**No RAG** — metadata section sourced from context.md and file paths.

---

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK**:
1. What feature is being tested? (from context.md)
2. What upstream documents exist? (SRS, BD, DD — determines context_level)
3. What is the scope? (backend/frontend/fullstack)
4. Use current system date for Created/Updated

**VALIDATE CONSTRAINTS**:
- [ ] Feature ID present
- [ ] Version = 1.0
- [ ] Current date used
- [ ] References list all existing documents

### Step 2: GENERATE SECTION

```markdown
# [Feature Name] - Kế Hoạch Kiểm Thử (Test Plan)

## Thông tin tài liệu (Document Information)

| Mục (Item) | Nội dung (Content) |
|------------|---------------------|
| Feature ID | [FEATURE_CODE]-[feature-name] |
| Phiên bản (Version) | 1.0 |
| Ngày tạo (Created) | YYYY-MM-DD |
| Ngày cập nhật (Updated) | YYYY-MM-DD |
| Mức độ chi tiết (Context Level) | [BASIC/MODERATE/DETAILED] |
| Phạm vi (Scope) | [Backend / Frontend / Full-stack] |
| Mục tiêu phủ (Coverage Target) | ≥ 80% |

### Tài liệu tham chiếu (References)

| Tài liệu | Đường dẫn | Trạng thái |
|-----------|-----------|------------|
| SRS | [path] | ✅ Có |
| Basic Design | [path or N/A] | [✅ Có / ❌ Không] |
| Backend Detail Design | [path or N/A] | [✅ Có / ❌ Không] |
| Frontend Detail Design | [path or N/A] | [✅ Có / ❌ Không] |
| API Contracts | [path or N/A] | [✅ Có / ❌ Không] |
```

### Step 3: SELF-CRITIQUE (Q1-Q4)

**Q1**: Feature ID matches context.md?
**Q2**: All existing documents listed in references?
**Q3**: Vietnamese >= 60%?
**Q4**: No implementation code?

### Step 4: VALIDATION

- [ ] Feature ID present and correct
- [ ] Current date used (not hardcoded)
- [ ] Context level stated
- [ ] All references accurately reflect file existence
- [ ] ≤ 80 lines

---

## Output Format

See Step 2 template above.

---

## Quality Standards

- **Completeness**: All metadata fields filled
- **Accuracy**: File paths verified, context level correct
- **Language**: Vietnamese-first ≥60%
- **Prohibited**: No implementation code, no invented file paths

---

*Test Plan Micro-Agent tp-00 | Document Info | EPS v3.2*
