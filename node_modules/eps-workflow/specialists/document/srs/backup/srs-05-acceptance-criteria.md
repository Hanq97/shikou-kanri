# SRS Micro-Agent: Acceptance Criteria (OPTIONAL)

**Version**: 2.0.0 (OPTIONAL SECTION)
**Checkpoint**: C5 (OPTIONAL)
**Section**: 5. Acceptance Criteria
**Output Lines**: ~150 lines (if used)
**Purpose**: Standalone acceptance criteria with traceability matrix (rarely used)

---

## ⚠️ IMPORTANT: This Section is OPTIONAL

**Default behavior (RECOMMENDED):**
- ✅ **SKIP Section 5** entirely
- ✅ All AC are INLINE in Section 4 (see srs-04-user-stories.md)
- ✅ Traceability implicit via AC-{US#}.{seq} IDs

**When to use Section 5:**
- ❌ NEVER if Section 4 has inline AC (default v2.0 format)
- ✅ ONLY if project explicitly requires separate AC traceability matrix
- ✅ ONLY if compliance/audit requires standalone AC section
- ✅ ONLY if regulatory requirements mandate AC separation

**⭐ Default action:** SKIP this section, continue to Section 6 (Constraints)

---

## Responsibility (If Section 5 is Used)

Generate Section 5 (Acceptance Criteria) containing:
- Standalone Acceptance Criteria with Given-When-Then format
- AC IDs: AC-[###] (not AC-{US#}.{seq})
- Traceability matrix (FR → US → AC)
- Link each AC back to User Story

## Input Context

Required context loaded by orchestrator:
1. **User Stories**: From Section 4 (WITHOUT inline AC)
2. **Functional Requirements**: From Section 2
3. **Scope Level**: From Section 0

## AC Count by Scope Level

| Scope Level | US Count | AC Count (≥2 per US) |
|-------------|----------|----------------------|
| Core | 10-15 | 20-30 |
| Full | 30-40 | 60-80 |
| Premium | 60-80 | 120-160 |

## Agent Prompt

### Step 1: PRE-GENERATION CHECK

**⚠️ CRITICAL CHECK:**
```bash
# Check if Section 4 has inline AC
if grep -q "AC-[0-9]\{3\}\.[0-9]" [SECTION_4_OUTPUT]; then
  echo "ERROR: Section 4 already has inline AC (v2.0 format)"
  echo "SKIP Section 5 - inline AC is the recommended format"
  exit 0  # Skip Section 5
fi
```

**If Section 4 does NOT have inline AC:**
- Proceed with standalone Section 5 generation
- Use AC-[###] format (NOT AC-{US#}.{seq})
- Create traceability matrix

**THINK** (Analyze before generating):
1. **Purpose**: Standalone Acceptance Criteria + Traceability
2. **Detail Level**: Testable criteria with Given-When-Then
3. **Evidence**: User Stories from Section 4
4. **Length**: MAX 150 lines

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Section 4 does NOT have inline AC ✓
- [ ] Compliance/audit requires standalone AC ✓
- [ ] Language rules: Vietnamese-first ≥60% ✓
- [ ] Length target: ≤150 lines ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/05-acceptance-criteria.md`

Execute pseudo-code logic from template to generate section.

**Output Format:**

```markdown
## 5. Acceptance Criteria

### 5.1 Acceptance Criteria Definitions

#### AC-001: [Criteria Title Vietnamese]
**User Story:** US-LNDR-001
**Related FRs:** FR-LDR-INVS-001, FR-LDR-INVS-002

**Criteria:**
GIVEN [ngữ cảnh/trạng thái ban đầu Vietnamese]
WHEN [hành động được thực hiện Vietnamese]
THEN [kết quả mong đợi Vietnamese]
AND [các kết quả bổ sung nếu có]

---

#### AC-002: [Next criteria...]
**User Story:** US-LNDR-001
**Related FRs:** FR-LDR-INVS-001

**Criteria:**
GIVEN [context]
WHEN [action]
THEN [outcome]

---

[More ACs...]

### 5.2 Traceability Matrix

| FR ID | US ID | AC IDs | Verification Method |
|-------|-------|--------|---------------------|
| FR-LDR-INVS-001 | US-LNDR-001 | AC-001, AC-002 | Unit + Integration Tests |
| FR-LDR-INVS-002 | US-LNDR-001 | AC-001, AC-003 | Unit + Integration Tests |
| FR-LDR-INVS-003 | US-LNDR-002 | AC-004, AC-005 | Integration Tests |
| ... | ... | ... | ... |

**Coverage Statistics:**
- Total FRs: [X]
- Total USs: [Y]
- Total ACs: [Z]
- Coverage: [Z/Y ratio] ACs per US (target: ≥2.0)
```

**AC Format Rules:**
- **ID**: AC-[###] (sequential numbering, NOT AC-{US#}.{seq})
- **Title**: Vietnamese, specific criterion
- **User Story**: Link back to US-[ROLE]-[###]
- **Related FRs**: List of FR IDs from Section 2
- **Criteria**: GIVEN-WHEN-THEN format (Vietnamese-first)

**Example Complete AC:**

```markdown
#### AC-015: Validate lending cap theo Decree 94
**User Story:** US-LNDR-005
**Related FRs:** FR-LDR-INVS-008, FR-LDR-RISK-001

**Criteria:**
GIVEN tôi là Lender với verified account
  AND tôi đã đầu tư 80 triệu VND vào 1 borrower
WHEN tôi cố gắng đầu tư thêm 30 triệu VND vào cùng borrower đó
THEN hệ thống reject investment request
  AND hiển thị error message "Vượt quá lending cap (100 triệu/borrower theo Decree 94/2025)"
  AND log rejection event for audit
```

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: Duplicate Check?**
- [ ] Section 4 does NOT have inline AC?
- [ ] NO AC-{US#}.{seq} IDs in Section 4?
- **Fix**: If Section 4 has inline AC, ABORT Section 5

**Q2: Language Compliance?**
- [ ] ALL headings start with Vietnamese?
- [ ] GIVEN-WHEN-THEN in Vietnamese?
- **Fix**: Add Vietnamese first

**Q3: AC Quality?**
- [ ] All ACs use GIVEN-WHEN-THEN format?
- [ ] All ACs are testable and specific?
- [ ] All ACs linked to User Stories?
- [ ] All ACs linked to FRs?
- **Fix**: Rewrite vague ACs, add links

**Q4: Traceability Matrix?**
- [ ] All FRs from Section 2 covered?
- [ ] All USs from Section 4 covered?
- [ ] Coverage ratio ≥2.0 ACs per US?
- **Fix**: Add missing traceability entries

**SELF-FIX** (Iterative):
```
if violations_found:
  - Ensure NO overlap with Section 4 inline AC
  - Add Vietnamese to GIVEN-WHEN-THEN
  - Link all ACs to USs and FRs
  - Complete traceability matrix
  - Re-check Q1-Q4
```

### Step 4: VALIDATION

**Automated Checks**:
```bash
# Language validator
node .claude/utils/language-validator.js [DOCUMENT] --min-ratio 0.60

# Check for duplicate AC (inline vs standalone)
if grep -q "AC-[0-9]\{3\}\.[0-9]" [SECTION_4_OUTPUT]; then
  echo "ERROR: Section 4 has inline AC - Section 5 conflicts"
  exit 1
fi
```

**Manual Checks**:
- [ ] Verify Section 4 does NOT have inline AC (if using Section 5)
- [ ] AC count ≥ (US count × 2)
- [ ] All ACs use GIVEN-WHEN-THEN format
- [ ] All ACs linked to User Stories
- [ ] All ACs linked to FRs
- [ ] Traceability matrix complete (all FRs/USs covered)
- [ ] Vietnamese-first language

**If validation FAILS**: Regenerate Section 5 (max 3 attempts)
**If validation PASSES**: ✅ Continue to Section 6

## Output Format

**Section structure** (150 lines max):
- 5.1 Acceptance Criteria Definitions (100-120 lines)
  - AC-001 through AC-XXX
  - Each AC: Title, User Story, Related FRs, GIVEN-WHEN-THEN
- 5.2 Traceability Matrix (30-50 lines)
  - Table: FR ID → US ID → AC IDs → Verification Method
  - Coverage statistics

## Quality Standards

- **Completeness**: All USs from Section 4 have ≥2 ACs
- **Traceability**: All FRs and USs covered in matrix
- **Language**: Vietnamese-first ≥60%
- **Testability**: All ACs specific and testable with GIVEN-WHEN-THEN
- **NO Duplication**: Section 4 must NOT have inline AC if Section 5 exists

---

**⚠️ REMINDER:** This section is OPTIONAL. Default v2.0 format uses inline AC in Section 4.

**Next Checkpoint**: C6 (Section 6: Constraints)
