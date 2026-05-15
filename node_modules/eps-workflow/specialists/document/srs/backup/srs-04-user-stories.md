# SRS Micro-Agent: User Stories with Inline Acceptance Criteria

**Version**: 2.0.0 (NEW FORMAT - Inline AC)
**Checkpoint**: C4
**Section**: 4. User Stories
**Output Lines**: ~400 lines
**Purpose**: Generate user stories with inline acceptance criteria (AC)

---

## Responsibility

Generate Section 4 (User Stories) of SRS document containing:
- User Stories with "As a...I want...So that..." format
- Inline Acceptance Criteria (AC) for each story
- Format: US-[ROLE]-[###] with AC-{US#}.{seq}
- Priority, Related FRs for each story

**⭐ NEW in v2.0:** Acceptance Criteria are INLINE within each User Story (NO separate Section 5)

## Input Context

Required context loaded by orchestrator:
1. **Scope Level**: From Section 0 (Core/Full/Premium)
2. **Feature Code**: From environment variable `$FEATURE_CODE`
3. **Functional Requirements**: From Section 2 (for FR linkage)
4. **Innovation Results**: From `innovation.md`
5. **Evidence Files**: From research phase

## US Count by Scope Level

| Scope Level | US Count | AC per US | Total Lines |
|-------------|----------|-----------|-------------|
| Core | 10-15 stories | ≥2 | ~150-250 |
| Full | 30-40 stories | ≥2 | ~300-400 |
| Premium | 60-80 stories | ≥2 | ~600-800 |

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. **Purpose**: User Stories + Inline Acceptance Criteria
2. **Detail Level**: User-facing functionality (WHAT users can do)
3. **Scope Level**: Check from Section 0 → determine US count
4. **Evidence**: Functional Requirements (Section 2) for FR linkage
5. **Key Change**: AC now INLINE với each User Story (NO separate Section 5)
6. **Length**: MAX 400 lines

**REASON** (Pattern Matching):
- User Stories describe user goals and benefits
- Each US must link to FRs from Section 2
- Acceptance Criteria define DONE criteria for each story
- AC IDs follow `AC-{US#}.{seq}` format (e.g., AC-001.1, AC-001.2)

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Purpose understood: User stories with inline AC ✓
- [ ] Detail level: User-facing functionality ✓
- [ ] Language rules: Vietnamese-first ≥60% ✓
- [ ] AC format: Inline with AC-{US#}.{seq} IDs ✓
- [ ] Length target: ≤400 lines ✓
- [ ] US count matches scope level ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/04-user-stories.md`

Execute pseudo-code logic from template to generate section.

**Output Format (v2.0 - Inline AC):**

```markdown
## 4. User Stories

### 4.1 [User Role 1 - e.g., Lender]

#### US-LNDR-001: [Story Title Vietnamese]
**As a** Lender
**I want** [goal Vietnamese - what user wants to do]
**So that** [benefit Vietnamese - why it matters]
**Priority**: Must Have | Should Have | Could Have | Won't Have
**Related FRs**: FR-LDR-INVS-001, FR-LDR-INVS-002

**Acceptance Criteria:**
- **AC-001.1**: GIVEN [ngữ cảnh/trạng thái ban đầu], WHEN [hành động], THEN [kết quả mong đợi]
- **AC-001.2**: GIVEN [context], WHEN [action], THEN [outcome]
- **AC-001.3**: GIVEN [context], WHEN [action], THEN [outcome]

---

#### US-LNDR-002: [Next story...]
**As a** Lender
**I want** [goal]
**So that** [benefit]
**Priority**: Must Have
**Related FRs**: FR-LDR-INVS-003

**Acceptance Criteria:**
- **AC-002.1**: GIVEN [context], WHEN [action], THEN [outcome]
- **AC-002.2**: GIVEN [context], WHEN [action], THEN [outcome]

---

[More stories for this role...]

### 4.2 [User Role 2 - e.g., Borrower]

#### US-BRRW-001: [Story title...]
**As a** Borrower
**I want** [goal]
**So that** [benefit]
**Priority**: Must Have
**Related FRs**: FR-BRW-LOAN-001, FR-BRW-LOAN-002

**Acceptance Criteria:**
- **AC-003.1**: GIVEN [context], WHEN [action], THEN [outcome]
- **AC-003.2**: GIVEN [context], WHEN [action], THEN [outcome]

---

[More stories...]
```

**US Format Rules:**
- **ID**: US-[ROLE]-[###] (role codes: LNDR, BRRW, ADMIN, etc.)
- **Title**: Vietnamese, user goal-focused
- **As a**: User role (Vietnamese or English)
- **I want**: User goal (Vietnamese-first)
- **So that**: Business value/benefit (Vietnamese-first)
- **Priority**: MoSCoW method (Must/Should/Could/Won't)
- **Related FRs**: List of FR IDs from Section 2

**⭐ NEW: Inline AC Format Rules (v2.0):**
- **AC ID**: `AC-{US#}.{seq}` format
  - Example: US-LNDR-001 has AC-001.1, AC-001.2, AC-001.3
  - Example: US-LNDR-002 has AC-002.1, AC-002.2
- **Minimum**: Each US must have ≥2 inline ACs
- **Format**: GIVEN-WHEN-THEN (Gherkin syntax)
- **Location**: Directly under each User Story (inline)
- **NO Section 5**: All AC are inline in Section 4

**Example Complete User Story:**

```markdown
#### US-LNDR-005: Xem thống kê đầu tư
**As a** Lender (Người cho vay)
**I want** xem báo cáo chi tiết về portfolio đầu tư của tôi
**So that** tôi có thể đánh giá hiệu quả đầu tư và đưa ra quyết định informed

**Priority**: Should Have

**Related FRs**: FR-LDR-RPRT-001, FR-LDR-RPRT-002, FR-LDR-RPRT-003

**Acceptance Criteria:**
- **AC-005.1**: GIVEN tôi đã đầu tư vào ≥1 loan, WHEN tôi truy cập dashboard, THEN hệ thống hiển thị tổng số tiền đầu tư, số loan đang active, và expected return
- **AC-005.2**: GIVEN tôi chọn timeframe (7 days/30 days/90 days), WHEN tôi xem performance chart, THEN hệ thống hiển thị biểu đồ ROI theo thời gian đã chọn
- **AC-005.3**: GIVEN portfolio của tôi có ≥5 loans, WHEN tôi xem diversification breakdown, THEN hệ thống hiển thị phân bổ theo risk grade với % allocation
```

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: All USs have inline AC?**
- [ ] Every User Story has ≥2 Acceptance Criteria INLINE?
- [ ] AC IDs follow `AC-{US#}.{seq}` format?
- [ ] NO standalone ACs (all inline)?
- **Fix**: Add inline AC to stories missing them, fix AC IDs

**Q2: Language Compliance?**
- [ ] ALL headings start with Vietnamese?
- [ ] "I want" and "So that" in Vietnamese?
- **Fix**: Add Vietnamese first, move English to parentheses

**Q3: US Format Compliance?**
- [ ] All USs have "As a [role], I want [goal], So that [benefit]" structure?
- [ ] All USs have unique IDs (US-[ROLE]-[###])?
- [ ] All USs have Priority (Must/Should/Could/Won't)?
- [ ] All USs linked to FRs (Related FRs field)?
- **Fix**: Add missing fields, fix format

**Q4: Length Limit?**
- [ ] US count matches Scope Level?
- [ ] Total ≤400 lines (or ≤800 for Premium)?
- **Fix**: Adjust US count

**Q5: AC Quality?**
- [ ] All ACs use GIVEN-WHEN-THEN format?
- [ ] All ACs are testable and specific?
- [ ] NO vague criteria (e.g., "system works well")?
- **Fix**: Rewrite vague ACs with specific outcomes

**SELF-FIX** (Iterative):
```
if violations_found:
  - Add inline AC to stories missing them (≥2 per US)
  - Fix AC IDs to AC-{US#}.{seq} format
  - Add Vietnamese to "I want" and "So that"
  - Ensure all USs linked to FRs
  - Rewrite vague ACs with specific GIVEN-WHEN-THEN
  - Re-check Q1-Q5
```

### Step 4: VALIDATION

**Automated Checks**:
```bash
# Language validator
node .claude/utils/language-validator.js [DOCUMENT] --min-ratio 0.60
```

**Manual Checks**:
- [ ] US count in scope range
- [ ] All USs: "As a [role], I want [goal], So that [benefit]"
- [ ] All USs have unique IDs (US-[ROLE]-[###])
- [ ] All USs have Priority
- [ ] All USs linked to FRs
- [ ] **⭐ All USs have ≥2 inline ACs** (NEW)
- [ ] **⭐ AC IDs: `AC-{US#}.{seq}` format** (NEW)
- [ ] All ACs use GIVEN-WHEN-THEN format
- [ ] Vietnamese-first language

**If validation FAILS**: Regenerate Section 4 (max 3 attempts)
**If validation PASSES**: ✅ Continue to Section 5 (OPTIONAL - usually SKIP)

## Output Format

**Section structure** (400 lines max for Full scope):
- Grouped by User Roles (4.1, 4.2, 4.3...)
- Each User Role contains multiple User Stories
- Each User Story contains:
  - US header with ID and title
  - As a / I want / So that
  - Priority
  - Related FRs
  - **⭐ Inline Acceptance Criteria** (NEW - ≥2 per US)

**User Role Grouping:**
- 4.1 Lender (LNDR)
- 4.2 Borrower (BRRW)
- 4.3 Administrator (ADMIN)
- 4.4 System (SYS) - for automated processes

## Quality Standards

- **Completeness**: All USs have As a/I want/So that, Priority, Related FRs, and ≥2 inline ACs
- **US Count**: Matches Scope Level
- **AC Format**: All ACs use GIVEN-WHEN-THEN format with AC-{US#}.{seq} IDs
- **Language**: Vietnamese-first ≥60%
- **Traceability**: All USs linked to FRs from Section 2
- **Testability**: All ACs are specific and testable
- **⭐ NO Section 5**: All AC are inline (NEW - v2.0 format)

---

**Next Checkpoint**: C5 (Section 5: OPTIONAL - Usually SKIP)
**Recommended Action**: ✅ SKIP Section 5, continue to Section 6 (Constraints)
