# SRS Micro-Agent: Document Information

**Version**: 1.0.0
**Checkpoint**: C0
**Section**: Document Header
**Output Lines**: ~20 lines
**Purpose**: Generate document metadata with scope level and expected metrics

---

## Responsibility

Generate Section 0 (Document Header) of SRS document containing:
- Feature ID
- Version
- Dates (created/updated)
- Status
- Scope Level (Core/Full/Premium)
- Expected Metrics

## Input Context

Required context loaded by orchestrator:
1. **Feature Code**: From environment variable `$FEATURE_CODE`
2. **Innovation Results**: From `innovation.md` (scope level determination)
3. **Current Date**: System date for timestamp

## Agent Prompt

### Step 1: PRE-GENERATION REASONING

**THINK** (Analyze before generating):
1. **Purpose**: Document metadata + Scope Level + Expected Metrics
2. **Detail Level**: HIGH-LEVEL metadata only
3. **Evidence**: innovation.md (scope level)
4. **Length**: MAX 20 lines

**REASON** (Pattern Matching):
- Extract Scope Level from innovation.md:
  - **Core**: 15-20 FRs, 4-6 Use Cases
  - **Full**: 40-50 FRs, 12-15 Use Cases
  - **Premium**: 80-100 FRs, 25+ Use Cases

**VALIDATE CONSTRAINTS** (Checklist):
- [ ] Purpose understood: Document metadata ✓
- [ ] Detail level: HIGH-LEVEL metadata only ✓
- [ ] Language rules: Vietnamese headings ✓
- [ ] Length target: ≤20 lines ✓
- [ ] Evidence identified: innovation.md ✓

### Step 2: GENERATE SECTION

**Template Path:** `.claude/docs/design-standards/srs/00-document-info.md`

Execute pseudo-code logic from template to generate section.

**Generate Document Header:**

```markdown
# [Feature Name] - Software Requirements Specification

## Document Information
- Feature ID: [FEATURE_CODE]-[feature-name]
- Version: 1.0
- Created: [CURRENT_DATE]
- Updated: [CURRENT_DATE]
- Status: Draft
- Scope Level: [Core|Full|Premium]
- Expected Metrics:
  - Functional Requirements: [Expected count based on scope]
  - Use Cases: [Expected count based on scope]
  - User Stories: [Expected count based on scope]
  - Non-Functional Requirements: [Expected count based on scope]
```

**Rules**:
- Use `date '+%Y-%m-%d'` for current date
- Extract Scope Level from innovation.md
- Set Expected Metrics based on Scope Level:
  - Core: 15-20 FRs, 4-6 UCs
  - Full: 40-50 FRs, 12-15 UCs
  - Premium: 80-100 FRs, 25+ UCs
- Status always "Draft" for new documents

### Step 3: SELF-CRITIQUE

**CRITICAL QUESTIONS**:

**Q1: Language Compliance?**
- [ ] Vietnamese headings? ✓ (Document Information = metadata - can be mixed)
- [ ] No English-first sentences? ✓

**Q2: Prohibited Content?**
- [ ] No architecture patterns? ✓
- [ ] No tech stack? ✓
- [ ] No API paths? ✓
- [ ] No code/SQL? ✓

**Q3: Length Limit?**
- [ ] ≤20 lines? ✓

**Q4: Content Scope?**
- [ ] Metadata only? ✓
- [ ] Scope Level specified? ✓
- [ ] Expected Metrics match scope? ✓

**SELF-FIX**:
If violations found, fix before proceeding to validation.

### Step 4: VALIDATION

**Automated Checks**:
```bash
# No validation required for Document Header (metadata only)
```

**Manual Checks**:
- [ ] Scope Level specified
- [ ] Expected Metrics match scope
- [ ] Current date used
- [ ] Status = Draft

## Output Format

**Exact format** (20 lines max):
```markdown
# [Feature Name] - Software Requirements Specification

## Document Information
- Feature ID: [FEATURE_CODE]-[feature-name]
- Version: 1.0
- Created: YYYY-MM-DD
- Updated: YYYY-MM-DD
- Status: Draft
- Scope Level: [Core|Full|Premium]
- Expected Metrics:
  - Functional Requirements: [X-Y]
  - Use Cases: [X-Y]
  - User Stories: [X-Y]
  - Non-Functional Requirements: [X-Y]
```

## Quality Standards

- **Completeness**: All metadata fields populated
- **Accuracy**: Scope Level matches innovation.md
- **Conciseness**: ≤20 lines
- **Consistency**: Expected Metrics align with Scope Level

---

**Next Checkpoint**: C1 (Section 1: Tổng quan)
