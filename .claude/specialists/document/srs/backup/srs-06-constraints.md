# SRS Micro-Agent: Constraints

**Version**: 1.0.0
**Checkpoint**: C6
**Section**: 6. Constraints
**Output Lines**: ~150 lines
**Purpose**: Generate technical, business, and operational constraints

---

## Responsibility

Generate Section 6 (Constraints) of SRS document containing:
- Technical Constraints (CON-TECH-###)
- Business Constraints (CON-BIZ-###)
- Operational Constraints (CON-OPS-###)
- Each constraint with Description, Impact, Rationale, Mitigation

## Input Context

Required context loaded by orchestrator:
1. **Scope Level**: From Section 0 (Core/Full/Premium)
2. **Feature Code**: From environment variable `$FEATURE_CODE`
3. **Innovation Results**: From `innovation.md`
4. **Evidence Files**: From research phase
5. **Previous Sections**: Section 0-5 for context

## Constraint Count by Scope Level

| Scope Level | Constraint Count | Distribution |
|-------------|------------------|--------------|
| Core | 5-8 | 2-3 per category |
| Full | 10-15 | 3-5 per category |
| Premium | 15-20 | 5-7 per category |

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. **Purpose**: Define limitations and boundaries for implementation
2. **Detail Level**: HIGH-LEVEL constraints (WHAT limits exist, not HOW to implement)
3. **Scope Level**: Check from Section 0 → determine constraint count
4. **Categories**: All 3 categories must be present (TECH, BIZ, OPS)
5. **Evidence**: innovation.md, evidence files
6. **Length**: MAX 150 lines

**REASON** (Pattern Matching):
- Constraints define boundaries and limitations
- Each constraint has impact on implementation
- Focus on WHAT is limited, NOT HOW to work around it

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Purpose understood: Limitations and boundaries ✓
- [ ] Detail level: HIGH-LEVEL constraints ✓
- [ ] Language rules: Vietnamese-first ≥60% ✓
- [ ] Length target: ≤150 lines ✓
- [ ] Constraint count matches scope level ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/06-constraints.md`

Execute pseudo-code logic from template to generate section.

**Output Format:**

```markdown
## 6. Constraints

### 6.1 Technical Constraints

#### CON-TECH-001: [Constraint Title Vietnamese]
**Description:** [Mô tả giới hạn kỹ thuật Vietnamese]

**Impact:** [Ảnh hưởng đến hệ thống - performance, functionality, etc.]

**Rationale:** [Lý do tại sao constraint này tồn tại]

**Mitigation:** [Cách giảm thiểu impact - if applicable]

---

#### CON-TECH-002: [Next constraint...]
[...]

### 6.2 Business Constraints

#### CON-BIZ-001: [Business Constraint Title Vietnamese]
**Description:** [Mô tả giới hạn nghiệp vụ Vietnamese]

**Impact:** [Ảnh hưởng đến business operations]

**Rationale:** [Lý do nghiệp vụ hoặc quy định]

**Mitigation:** [Cách xử lý trong phạm vi cho phép]

---

[More business constraints...]

### 6.3 Operational Constraints

#### CON-OPS-001: [Operational Constraint Title Vietnamese]
**Description:** [Mô tả giới hạn vận hành Vietnamese]

**Impact:** [Ảnh hưởng đến deployment, maintenance, support]

**Rationale:** [Lý do vận hành hoặc infrastructure]

**Mitigation:** [Cách tối ưu trong giới hạn]

---

[More operational constraints...]
```

**Constraint Format Rules:**
- **ID**: CON-[TYPE]-[###] (types: TECH, BIZ, OPS)
- **Title**: Vietnamese, specific constraint
- **Description**: What is limited/constrained
- **Impact**: How it affects the system
- **Rationale**: Why this constraint exists
- **Mitigation**: How to reduce negative impact (optional)

**Examples of Valid Constraints:**

**Technical Constraints:**
```markdown
#### CON-TECH-001: Giới hạn technology stack
**Description:** Hệ thống phải sử dụng NestJS (backend), React (frontend), PostgreSQL (database) theo quy định của team architecture

**Impact:**
- Giới hạn framework choices
- Team phải có expertise với stack này
- Migration sang tech khác sẽ costly

**Rationale:**
- Đảm bảo consistency across platform
- Leverage existing team skills
- Reduce training costs

**Mitigation:**
- Sử dụng abstraction layers cho critical components
- Document migration path nếu cần thay đổi trong tương lai

---

#### CON-TECH-002: Browser compatibility
**Description:** Frontend phải hỗ trợ Chrome 90+, Firefox 88+, Safari 14+ (không hỗ trợ IE11)

**Impact:**
- Có thể exclude một phần users sử dụng legacy browsers
- Giảm complexity của polyfills

**Rationale:**
- Legacy browsers (IE11) chiếm <1% user base
- Modern browsers support tốt hơn cho SPA features

**Mitigation:**
- Show friendly message cho unsupported browsers
- Track browser usage analytics để adjust policy
```

**Business Constraints:**
```markdown
#### CON-BIZ-001: Compliance với Decree 94/2025
**Description:** Lending cap KHÔNG được vượt 100 triệu VND/borrower theo Decree 94/2025

**Impact:**
- Giới hạn investment amount per borrower
- Cần validation logic cho lending caps
- Reject transactions vượt cap

**Rationale:**
- Regulatory requirement (bắt buộc)
- Avoid legal penalties

**Mitigation:**
- Implement cap checks trước khi approve transactions
- Provide clear error messages cho users
- Support portfolio diversification features

---

#### CON-BIZ-002: Giới hạn ngân sách dự án
**Description:** Budget cho phase 1 implementation: 500 triệu VND (fixed)

**Impact:**
- Giới hạn scope features có thể implement
- Ưu tiên Must Have features only

**Rationale:**
- Budget allocated theo company fiscal plan
- ROI expectations từ stakeholders

**Mitigation:**
- Phân chia thành phases (v1.0, v1.1, v2.0)
- Identify MVP features cho phase 1
- Defer Could Have/Won't Have features sang phase sau
```

**Operational Constraints:**
```markdown
#### CON-OPS-001: Deployment windows
**Description:** Deployment chỉ được thực hiện 22:00-02:00 Thứ 7 (Saturday night)

**Impact:**
- Giới hạn deployment frequency (1 lần/tuần max)
- Delay urgent fixes nếu ngoài window
- Cần planning trước 48 hours

**Rationale:**
- Minimize impact on business hours
- Reduce user disruption
- Allow rollback time nếu có issues

**Mitigation:**
- Implement blue-green deployment cho zero-downtime
- Maintain hotfix process cho critical issues
- Use feature flags để deploy code trước, enable sau

---

#### CON-OPS-002: Support hours
**Description:** Customer support chỉ available 08:00-18:00 (Mon-Fri), KHÔNG có 24/7 support

**Impact:**
- Issues ngoài giờ không được xử lý realtime
- Cần automated monitoring và alerts
- Users phải wait đến ngày làm việc

**Rationale:**
- Cost optimization (24/7 support costly)
- Current user base chủ yếu active trong giờ hành chính

**Mitigation:**
- Implement comprehensive FAQ và self-service
- Automated incident detection và escalation
- On-call rotation cho P0 incidents only
```

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: Language Compliance?**
- [ ] ALL headings start with Vietnamese?
- [ ] Zero sentences start with English?
- **Fix**: Add Vietnamese first, move English to parentheses

**Q2: Completeness Check?**
- [ ] All 3 categories present (TECH, BIZ, OPS)?
- [ ] All constraints have Description?
- [ ] All constraints have Impact?
- [ ] All constraints have Rationale?
- [ ] Mitigation present (at least for major constraints)?
- **Fix**: Add missing fields

**Q3: Constraint Quality?**
- [ ] Each constraint is specific and measurable?
- [ ] Impact clearly states effect on system/business/operations?
- [ ] Rationale explains WHY constraint exists?
- **Fix**: Rewrite vague constraints

**Q4: Content Scope?**
- [ ] All constraints have unique IDs (CON-[TYPE]-[###])?
- [ ] Constraint count matches Scope Level?
- [ ] ≤150 lines total?
- **Fix**: Adjust constraint count, fix IDs

**SELF-FIX** (Iterative):
```
if violations_found:
  - Add Vietnamese to headings and sentences
  - Add missing categories (TECH/BIZ/OPS)
  - Complete all fields (Description, Impact, Rationale, Mitigation)
  - Make constraints specific and measurable
  - Re-check Q1-Q4
```

### Step 4: VALIDATION

**Automated Checks**:
```bash
# Language validator
node .claude/utils/language-validator.js [DOCUMENT] --min-ratio 0.60
```

**Manual Checks**:
- [ ] Constraint count trong range của Scope Level
- [ ] All 3 categories present (TECH, BIZ, OPS)
- [ ] All constraints have unique IDs (CON-[TYPE]-[###])
- [ ] All constraints have: Description, Impact, Rationale, Mitigation
- [ ] Language: Vietnamese-first

**If validation FAILS**: Regenerate Section 6 (max 3 attempts)
**If validation PASSES**: ✅ All sections complete - proceed to final document assembly

## Output Format

**Section structure** (150 lines max):
- 6.1 Technical Constraints (2-7 constraints depending on scope)
- 6.2 Business Constraints (2-7 constraints)
- 6.3 Operational Constraints (1-6 constraints)

**Constraint format**: ID, Title, Description, Impact, Rationale, Mitigation

## Quality Standards

- **Completeness**: All 3 categories present, all fields populated
- **Constraint Count**: Matches Scope Level
- **Language**: Vietnamese-first ≥60%
- **Specificity**: Each constraint clearly defined with measurable impact
- **Actionability**: Mitigation strategies provided where applicable

---

**Final Checkpoint**: All 7 sections (0-6) complete
**Next Step**: Final document validation and assembly
